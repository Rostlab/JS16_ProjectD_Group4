"use strict";

const cfg        = require('../core/config'),
      debug      = require('../core/debug')('crawler/mobile', true),
      request    = require('request'),
      Agent      = require('agentkeepalive').HttpsAgent,
      cache      = require('../crawler/cache'),
      twitter    = require('../crawler/twitter'),
      Character  = require('../models/character'),
      aggregator = require('../aggregator/aggregator');

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
        function retry() {
            ++retries;
            setTimeout(function() {
                get(url, retries).then(resolve).catch(reject);
            }, (retries*retries)*1000);
        }

        request({
            url: url,
            gzip: true,
            agent: requestAgent,
            timeout: cfg.twitter.timeout
        }, function (err, resp, body) {
            if (!!err) {
                retries = (!retries) ? 0 : retries;
                if (retries < cfg.crawler.retries) {
                    debug.warn("Retry because of Connection Error", url, err);
                    retry();
                } else {
                    err.url = url;
                    reject(err);
                }
            } else if (resp.statusCode === 200) {
                resolve(body);
            } else {
                retries = (!retries) ? 0 : retries;
                if (retries< cfg.crawler.retries) {
                    if (resp.statusCode >= 500) {
                        debug.warn("Retry because of Server Error", resp.statusCode);
                        retry();
                        return;
                    } else if (resp.statusCode === 429) {
                        debug.warn("Too Many Requests - Retry ...");
                        retry();
                        return;
                    }
                }
                reject({
                    status: resp.statusCode,
                    body:   body
                });
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
function saveIDs(characterName, ids) {
    return new Promise(function(resolve, reject) {
        if (ids.length < 1) {
            resolve({saved: Promise.resolve(null)});
            return;
        }
        twitter.getTweetsList(ids).then(function(tweets) {
            // save all Tweets to DB and resolves with a Promise for stats
            resolve({saved: saveTweets(characterName, tweets)});
        }).catch(function(err) {
            // retry on rate-limitation (or service unavailable)
            function retry() {
                saveIDs(characterName, ids).then(resolve).catch(reject);
            }
            if (!twitter.retryIfRateLimited(err, retry)) {
                reject(err); // otherwise stuff went wrong
            }
        });
    });
}

// saveTweets saves all Tweets to DB and resolves with a Promise for stats
function saveTweets(characterName, tweets) {
    return new Promise(function(resolve, reject) {
        Promise.all(tweets.map(function(tweet) {
            return twitter.saveTweet(characterName, tweet);
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
        }).catch(reject);
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

    // Number of Tweets after which retry with another "until:(lastDay)" query
    // when the history ends. For some popular characters the history ends early.
    const retryThreshold = 3000;

    return new Promise(function(resolve, reject) {
        // relaxed search
        // var url = searchURL + character.name.split(' ').join('+') + '&s=typd';

        // strict search
        let url = searchURL + '"' + character.name + '"&s=sprv';
        let ids = [];
        let found = 0, inserted = 0;
        let retries = 0;
        let lastDay = null;

        // if we already have the maxID, then there are no new results
        function tryCache() {
            // JavaScript is really really broken...
            const maxID  = Math.max.apply(Math, ids);
            const cached = cache.maxID[character.name];

            if (maxID === cached) {
                resolve({found: found, inserted: inserted});
                return true;
            }

            cache.maxID[character.name] = maxID;
            return false;
        }

        (function loop(wait) {
            // get mobile search result
            get(url).then(function(res) {
                // do more result pages exist?
                var next = res.match(nextRe);
                if (!!next || (++retries)*retryThreshold <= found) {
                    // next request url
                    if (next) {
                        url = searchURL + next[1];
                    } else {
                        const newQuery = '"' + character.name + '" until:' +
                            new Date(lastDay).toISOString().slice(0,10) + '&s=sprv';
                        debug.log("History ended. Retry with new query: " + newQuery);
                        url = searchURL + newQuery;

                        // set lastDay to previous day to avoid days with empty results
                        const oneDay = 86400000;
                        lastDay = new Date(new Date(lastDay).getTime() - oneDay);
                    }

                    // is this the first iteration?
                    const first = (ids.length === 0);

                    ids = ids.concat(matchIDs(res));

                    // check if the cache first before saving
                    if (first && !full && ids.length > 0 && tryCache()) {
                        return true;
                    }

                    // make blocks of 100 IDs
                    if (ids.length >= 100) {
                        // wait until to previous DB write is done
                        wait.then(function(stats) {
                            var save = ids.splice(0,100);

                            // not executed during the first save
                            if (stats !== null) {
                                found    += stats.found;
                                inserted += stats.inserted;
                                printRes(character.name, stats);

                                lastDay = stats.oldest;

                                if (!full && stats.inserted === 0) {
                                    resolve({found: found, inserted: inserted});
                                    return;
                                }
                            }

                            // save new IDs block
                            saveIDs(character.name, save).then(function(res) {
                                loop(res.saved);
                            }).catch(reject);
                        }).catch(reject);
                    } else {
                        loop(wait);
                    }

                // this is the last results page
                } else if (res.match(doneRe)) {
                    // is this the first iteration?
                    const first = (ids.length === 0);

                    ids = ids.concat(matchIDs(res));

                    // check if the cache first before saving
                    if (first && !full && ids.length > 0 && tryCache()) {
                        return true;
                    }

                    if (ids.length === 0) {
                        resolve({found: found, inserted: inserted});
                        return;
                    }

                    // save remaining IDs
                    saveIDs(character.name, ids).then(function(res) {
                        res.saved.then(function(stats) {
                            if (stats !== null) {
                                found    += stats.found;
                                inserted += stats.inserted;
                                printRes(character.name, stats);
                            }
                            resolve({found: found, inserted: inserted});
                        }).catch(reject);
                    }).catch(reject);
                } else {
                    debug.error("unknown response:", url, res);
                    saveIDs(character.name, ids);
                    reject(res);
                }
            }).catch(reject);
        })(Promise.resolve(null));
    });
};

function analyzeCharacter(character) {
    return aggregator.analyzeCharacter(character.name, character.slug).then(function() {
        debug.log("Wrote CSVs for", character.name);
        return true;
    }, function(err) {
        debug.err("FAILED to write CSVs for", character.name, err);
        return true;
    });
}

function shuffleArray(array) {
    let i = array.length;
    while (--i) {
        let j    = ~~(Math.random() * (i+1));
        let tmp  = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
    return array;
}

// Returns Promise for sync
mobile.crawlAll = function(full) {
    // we don't care when the cache is available - or if it is ever available
    if (full !== true) {
        cache.fill();
    }

    // write CSV on every first run - the algo might have changed or we might be
    // in the "cloud" and don't have persistent memory.
    const forceWrite = (cache.cold && full !== true);

    // Crawl Twitter REST API for each Character in DB
    return Character.list().then(function(characters) {
        return new Promise(function(resolve, reject) {
            // randomize crawl order... just in case.
            characters = shuffleArray(characters);

            const total = characters.length;
            (function iterCrawl(i, wait) {
                let character = characters[i];
                mobile.crawl(character, full).then(function(res) {
                    debug.info("["+(i+1)+"/"+total+"] MCRWLD", character.name, res);
                    wait.then(function() {
                        // only write CSV when we have to
                        if (forceWrite || res.inserted > 0) {
                            wait = analyzeCharacter(character);
                        }

                        if (++i < total) {
                            iterCrawl(i, wait);
                        } else {
                            cache.cold = false;
                            resolve(wait);
                        }
                    });

                }).catch(function(err) {
                    debug.error("["+(i+1)+"/"+total+"] MCRWL FAILED", character.name, err);
                    wait.then(function() {
                        wait = analyzeCharacter(character);
                        if (++i < total) {
                            iterCrawl(i, wait);
                        } else {
                            resolve(wait);
                        }
                    });
                });
            })(0, Promise.resolve());
        });
    }).catch(debug.error);
};
