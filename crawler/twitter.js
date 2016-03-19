const cfg       = require('../core/config'),
      sentiment = require('../crawler/sentiment'),
      twitter   = require('twitter'),
      Tweet     = require('../models/tweet');

var exports   = module.exports = {};

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
}

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
}

exports.codeRateLimited = 88;

exports.fetchTweets = function(characterID, query, maxID) {
    //console.log('DEBUG:', 'twitter.fetchTweets', query, maxID);
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
};

exports.streamTweets = function(query) {
    client.stream('statuses/filter', {
        track: query
    }, function(stream) {
        stream.on('data', saveTweet);

        // Handle errors
        stream.on('error', function(error) {
            console.log(error);
        });
    });
};
