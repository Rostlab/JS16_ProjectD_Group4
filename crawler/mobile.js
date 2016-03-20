const cfg     = require('../core/config'),
      debug   = require('../core/debug')('crawler/mobile', true),
      https   = require('https'),
      twitter = require('../crawler/twitter');

var exports = module.exports = {};

function get(url) {
    return new Promise(function(resolve, reject) {
        var req = https.get(url, function(res) {
            var data = '';

            res.on('data', function(chunk) {
                data += chunk;
            });

            res.on('end', function() {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject({
                        status: res.statusCode,
                        data:   data
                    });
                }
            });
        });

        req.on('error', function(err) {
            reject(err);
        });

        req.end();
    });
}

function matchIDs(str) {
    const re = /<div class="tweet-text" data-id="([0-9]+)">/g;

    var ids = [];
    var match;
    while ((match = re.exec(str))) {
        ids.push(match[1]);
    }
    return ids;
}

function formatDate(date) {
    return new Date(date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

function saveIDs(characterID, ids) {
    return new Promise(function(resolve, reject) {
        twitter.getTweetsList(ids).then(function(tweets) {
             // currently DB stuff still async
            resolve(true);

            const ps = Promise.all(tweets.map(function(tweet) {
                return twitter.saveTweet(characterID, tweet);
            })).then(function(res) {
                var found    = res.length,
                    inserted = 0;
                res.forEach(function(r) {
                    if(!!r.upserted) {
                        inserted++;
                    }
                });

                debug.info(
                    characterID,
                    { found: found, inserted: inserted },
                    formatDate(tweets[tweets.length-1].created_at)
                );
            }, debug.error);
        }, function(err) {
            function retry() {
                saveIDs(characterID, ids).then(resolve, reject);
            }
            if (!twitter.retryIfRateLimited(err, retry)) {
                // otherwise stuff went wrong
                reject(err);
            }
        }).catch(reject);
    });
}

// Returns a Promise (resolved with JSON)
exports.crawl = function(character) {
    const searchURL = 'https://mobile.twitter.com/search?q=';
    const nextRe    = /search\?q=(.+)"> Load older Tweets/;
    const doneRe    = /<div class="noresults"> No results for/;

    return new Promise(function(resolve, reject) {
        var url = searchURL + character.name.split(' ').join('+') + '&s=typd';
        var ids = [];
        var found = 0;

        (function loop() {
            get(url).then(function(res) {
                var next = res.match(nextRe);
                if (next) {
                    url = searchURL + next[1];
                    ids = ids.concat(matchIDs(res));
                    if (ids.length >= 100) {
                        found += 100;
                        var save = ids.splice(0,100);
                        saveIDs(character.id, save).then(function(res) {
                            loop();
                        }, function(err) {
                            debug.error("saveIDs.next", err);
                        });
                    } else {
                        loop();
                    }
                } else if (res.match(doneRe)) {
                    found += ids.length;
                    saveIDs(character.id, ids).then(function(res) {
                        resolve(found);
                    }, function(err) {
                        debug.error("saveIDs.done", err);
                    });
                } else {
                    debug.error("unknown response:", url, res);
                    found += ids.length;
                    saveIDs(character.id, ids);
                    reject(res);
                }
            }, reject);
        })();
    });
};
