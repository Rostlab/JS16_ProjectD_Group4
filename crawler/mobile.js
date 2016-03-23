"use strict";

const cfg       = require('../core/config'),
      debug     = require('../core/debug')('crawler/mobile', true),
      request   = require('request'),
      Agent     = require('agentkeepalive').HttpsAgent,
      twitter   = require('../crawler/twitter'),
      Character = require('../models/character');

var mobile = module.exports = {};

var requestAgent = new Agent({
    keepAlive: true,
    maxFreeSockets: 10,
    timeout: 20000,
    keepAliveTimeout: 10000
});

// get returns a Promise for the content of the given URL
// HTTPS only.
function get(url, retries) {
    return new Promise(function(resolve, reject) {
        request({
            url: url,
            gzip: true,
            agent: requestAgent,
            timeout: cfg.twitter.timeout
        }, function (err, resp, body) {
            if (!!err) {
                debug.error(url, err);
                reject(err);
            } else if (resp.statusCode === 200) {
                resolve(body);
            } else {
                retries = (!retries) ? 0 : retries;
                if (resp.statusCode >= 500 && retries < 10) {
                    debug.warn("Retry because of Server Error", resp.statusCode);
                    ++retries;
                    setTimeout(function() {
                        get(url, retries).then(resolve, reject);
                    }, (retries*retries)*1000);
                } else {
                    reject({
                        status: resp.statusCode,
                        body:   body
                    });
                }
            }
        });
    });
}

// matchIDs extracts the Tweet IDs from the HTML source and returns an array
function matchIDs(str) {
    const re = /<div class="tweet-text" data-id="([0-9]+)">/g;

    var ids = [];
    var match;
    while ((match = re.exec(str))) {
        ids.push(match[1]);
    }
    return ids;
}

// saveIDs retrieves the Tweets with the given IDs via the REST API and saves
// the Tweets to DB.
function saveIDs(characterID, ids) {
    return new Promise(function(resolve, reject) {
        if (ids.length < 1) {
            resolve({saved: Promise.resolve(null)});
            return;
        }
        twitter.getTweetsList(ids).then(function(tweets) {
            // save all Tweets to DB and resolves with a Promise for stats
            resolve({saved: saveTweets(characterID, tweets)});
        }, function(err) {
            // retry on rate-limitation (or service unavailable)
            function retry() {
                saveIDs(characterID, ids).then(resolve, reject);
            }
            if (!twitter.retryIfRateLimited(err, retry)) {
                reject(err); // otherwise stuff went wrong
            }
        }).catch(reject);
    });
}

// saveTweets saves all Tweets to DB and resolves with a Promise for stats
function saveTweets(characterID, tweets) {
    return new Promise(function(resolve, reject) {
        Promise.all(tweets.map(function(tweet) {
            return twitter.saveTweet(characterID, tweet);
        })).then(function(res) {
            var found    = res.length,
                inserted = 0;
            for (var i = 0; i < found; i++) {
                if(!!res[i].upserted) {
                    inserted++;
                }
            }
            resolve({
                found:    found,
                inserted: inserted,
                oldest:   tweets[tweets.length-1].created_at
            });
        }, reject);
    });
}

// formatDate formats date(strings) like 2014-02-26 23:08:31
function formatDate(date) {
    return new Date(date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

// printRes pretty prints the saved stats
function printRes(name, res) {
    debug.log(
        name,
        "found:", res.found,
        "inserted:", res.inserted,
        formatDate(res.oldest)
    );
}

// Returns a Promise (resolved with JSON)
mobile.crawl = function(character, full) {
    const searchURL = 'https://mobile.twitter.com/search?q=';
    const nextRe    = /search\?q=(.+)"> Load older Tweets/;
    const doneRe    = /<div class="noresults"> No results for/;

    return new Promise(function(resolve, reject) {
        // relaxed search
        // var url = searchURL + character.name.split(' ').join('+') + '&s=typd';

        // strict search
        var url = searchURL + '"' + character.name + '"&s=sprv';
        var ids = [];
        var found = 0, inserted = 0;

        (function loop(wait) {
            // get mobile search result
            get(url).then(function(res) {
                // do more result pages exist?
                var next = res.match(nextRe);
                if (next) {
                    url = searchURL + next[1];
                    ids = ids.concat(matchIDs(res));

                    // make blocks of 100 IDs
                    if (ids.length >= 100) {
                        // wait until to previous DB write is done
                        wait.then(function(stats) {
                            var save = ids.splice(0,100);

                            if (stats !== null) {
                                found    += stats.found;
                                inserted += stats.inserted;
                                printRes(character.name, stats);

                                if (!full && stats.inserted === 0) {
                                    resolve({found: found, inserted: inserted});
                                    return;
                                }
                            }

                            // save new IDs block
                            saveIDs(character.id, save).then(function(res) {
                                loop(res.saved);
                            });
                        });
                    } else {
                        loop(wait);
                    }

                // this is the last results page
                } else if (res.match(doneRe)) {
                    if (ids.length === 0) {
                        resolve({found: found, inserted: inserted});
                        return;
                    }

                    // save remaining IDs
                    saveIDs(character.id, ids).then(function(res) {
                        res.saved.then(function(stats) {
                            if (stats !== null) {
                                found    += stats.found;
                                inserted += stats.inserted;
                                printRes(character.name, stats);
                            }
                            resolve({found: found, inserted: inserted});
                        });
                    }, function(err) {
                        debug.error("saveIDs.done", err);
                    });
                } else {
                    debug.error("unknown response:", url, res);
                    saveIDs(character.id, ids);
                    reject(res);
                }
            }, reject);
        })(Promise.resolve(null));
    });
};

// Returns Promise for sync
mobile.crawlAll = function(full) {
    // Crawl Twitter REST API for each Character in DB
    return Character.list().then(function(characters) {
        return new Promise(function(resolve, reject) {
            (function iterCrawl(i) {
                try {
                mobile.crawl(characters[i], full).then(function(res) {
                    debug.info("MCRWLD", characters[i].name, res);
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve(true);
                    }
                }, function(err) {
                    debug.error("MCRWL FAILED", characters[i].name, err);
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve(true);
                    }
                });
                } catch(err) {
                    debug.error(err);
                }
            })(0);
        });
    }, debug.error);
};
