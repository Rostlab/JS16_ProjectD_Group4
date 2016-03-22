"use strict";

const cfg       = require('../core/config'),
      debug     = require('../core/debug')('crawler/twitter', true),
      Twit      = require('twit'),
      Tweet     = require('../models/tweet');

var twitter = module.exports = {};

// init twitter API client
const client = new Twit(cfg.twitter);

twitter.saveTweet = function(characterID, tweet) {
    return Tweet.addIfNotExists({
        character: characterID,
        uid:       tweet.id,
        text:      tweet.text,
        lang:      tweet.lang,
        retweeted: tweet.retweet_count,
        favorited: tweet.favorite_count,
        created:   tweet.created_at
    });
};

// Returns a Promise for an array of Tweets
twitter.getTweetsList = function(ids) {
    if (Array.isArray(ids)) {
        ids = ids.toString();
    }

    return new Promise(function(resolve, reject) {
        client.get('statuses/lookup', {
            id:               ids,
            include_entities: false,
            trim_user:        true
        }, function(err, data, resp) {
            if (!!err) {
                reject({err: err, headers: resp.headers});
                return;
            }
            resolve(data);
        });
    });
};

const codeRateLimited = 88;

twitter.retryIfRateLimited = function(err, callback) {
    // check if it was because of rate-limiting
    // if yes, wait for time stated in header
    if (!!err && !!err.headers && !!err.err) {
        if (err.err.code === codeRateLimited) {
            var reset = err.headers['x-rate-limit-reset'];
            if (!!reset) {
                // determine wait time in seconds
                var timeout = (reset - Math.floor(new Date() / 1000));

                // Add 5 seconds extra because auf async clock etc
                timeout += 5;

                debug.warn("Rate-Limited. Timeout: "+timeout+"s [" + new Date(reset*1000) + "]");
                setTimeout(callback, timeout*1000);
                return true;
            }
        } else if(err.err.statusCode === 500) {
            debug.warn("500 Internal Error. Wait 5s");
            setTimeout(callback, 5*1000);
            return true;
        } else if(err.err.statusCode === 503) {
            debug.warn("503 Unavailable. Wait 5s");
            setTimeout(callback, 5*1000);
            return true;
        }
    }
    return false;
};

function fetchTweets(character, maxID) {
    return new Promise(function(resolve, reject) {
        client.get('search/tweets', {
            q:                '"'+character.name+'"',
            include_entities: false,
            count:            100,
            max_id:           maxID
        }, function(err, data, resp) {
            if (!!err) {
                reject({err: err, headers: resp.headers});
                return;
            }

            const tweets = data.statuses;

            if (typeof tweets !== "object" || tweets.length < 1) {
                resolve({found: 0, inserted: 0, maxID: null});
                return;
            }

            Promise.all(tweets.map(function(tweet) {
                return twitter.saveTweet(character.id, tweet);
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
twitter.crawl = function(character, full) {
    return new Promise(function(resolve, reject) {
        var maxID    = null,
            inserted = null,
            found    = null,
            totalIns = 0,
            totalFnd = 0;
        (function loop() {
            fetchTweets(character, maxID).then(function(res) {
                maxID     = res.maxID;
                found     = res.found;
                inserted  = res.inserted;
                totalFnd += found;
                totalIns += inserted;

                if ((!full && inserted > 0) || (!!full && found >= 99)) {
                    loop();
                } else {
                    resolve({found: totalFnd, inserted: totalIns, maxID: maxID});
                }
            }, function(err) {
                if (!twitter.retryIfRateLimited(err, loop)) {
                    // otherwise stuff went wrong
                    reject(err);
                }
            });
        })();
    });
};

twitter.streamTweets = function(query) {
    client.stream('statuses/filter', {
        track: query
    }, function(stream) {
        stream.on('data', twitter.saveTweet);

        // Handle errors
        stream.on('error', debug.error);
    });
};
