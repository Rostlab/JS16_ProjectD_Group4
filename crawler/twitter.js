const cfg       = require('../core/config'),
      debug     = require('../core/debug')('crawler/twitter', true),
      sentiment = require('../crawler/sentiment'),
      twitter   = require('twitter'),
      Tweet     = require('../models/tweet');

var exports = module.exports = {};

// init twitter API client
const client = new twitter(cfg.twitter);

exports.saveTweet = function(characterID, tweet) {
    return Tweet.addIfNotExists({
        character: characterID,
        uid:       tweet.id,
        text:      tweet.text,
        lang:      tweet.lang,
        retweets:  tweet.retweet_count,
        favorites: tweet.favorite_count,
        sentiment: sentiment(tweet.text),
        created:   tweet.created_at
    });
};

// Returns a Promise for an array of Tweets
exports.getTweetsList = function(ids) {
    if (Array.isArray(ids)) {
        ids = ids.toString();
    }

    return new Promise(function(resolve, reject) {
        client.get('statuses/lookup', {
            id:               ids,
            include_entities: false,
            trim_user:        true
        }, function(err, data, resp) {
            if (err !== null) {
                reject({err: err, headers: resp.headers});
                return;
            }
            resolve(data);
        });
    });
};

const codeRateLimited = 88;
const codeUnavailable = 503;

exports.retryIfRateLimited = function(err, callback) {
    // check if it was because of rate-limiting
    // if yes, wait for time stated in header
    if (!!err && !!err.headers && err.err.length === 1) {
        if (err.err[0].code === codeRateLimited) {
            var reset = err.headers['x-rate-limit-reset'];
            if (!!reset) {
                // determine wait time in seconds
                var timeout = (reset - Math.floor(new Date() / 1000));

                // Add 5 seconds extra because auf async clock etc
                timeout += 5;

                debug.log("RL TIMEOUT", timeout+"s [" + new Date(reset*1000) + "]");
                setTimeout(callback, timeout*1000);
                return true;
            }
        } else if(err.err[0].code === codeUnavailable) {
            debug.log("503 UNAVAILABLE. Wait 10s");
            setTimeout(callback, 10*1000);
            return true;
        }
    }
    return false;
};

function fetchTweets(characterID, query, maxID) {
    return new Promise(function(resolve, reject) {
        client.get('search/tweets', {
            q:                query,
            include_entities: false,
            count:            100,
            max_id:           maxID
        }, function(err, data, resp) {
            if (err !== null) {
                reject({err: err, headers: resp.headers});
                return;
            }

            const tweets = data.statuses;

            if (typeof tweets !== "object" || tweets.length < 1) {
                resolve({found: 0, inserted: 0, maxID: null});
                return;
            }

            const ps = Promise.all(tweets.map(function(tweet) {
                return exports.saveTweet(characterID, tweet);
            })).then(function(res) {
                var found    = res.length,
                    inserted = 0;
                res.forEach(function(r) {
                    if(!!r.upserted) {
                        inserted++;
                    }
                });

                const oldestStatus = data.statuses[data.statuses.length - 1];

                resolve({
                    found:    found,
                    inserted: inserted,
                    maxID:    oldestStatus.id_str
                });
            }, reject);
        });
    });
}

// 2nd param (optional): Full crawl or just update?
exports.crawl = function(character, full) {
    return new Promise(function(resolve, reject) {
        var maxID    = null,
            inserted = null,
            found    = null,
            totalIns = 0,
            totalFnd = 0;
        (function loop() {
            fetchTweets(character.id, character.name, maxID).then(function(res) {
                maxID     = res.maxID;
                found     = res.found;
                inserted  = res.inserted;
                totalFnd += found;
                totalIns += inserted;

                if (((!full && inserted > 0) || (!!full && found >= 99)) && totalFnd < 1000) { // TODO: remove totalFnd limit
                    loop();
                } else {
                    resolve({found: totalFnd, inserted: totalIns, maxID: maxID});
                }
            }, function(err) {
                if (!exports.retryIfRateLimited(err, loop)) {
                    // otherwise stuff went wrong
                    reject(err);
                }
            });
        })();
    });
};

exports.streamTweets = function(query) {
    client.stream('statuses/filter', {
        track: query
    }, function(stream) {
        stream.on('data', saveTweet);

        // Handle errors
        stream.on('error', debug.error);
    });
};
