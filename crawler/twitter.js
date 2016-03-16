const    cfg  = require('../core/config'),
        twit  = require('twitter'),
    TweetSch  = require('../models/tweet');

var exports   = module.exports = {};
var retext    = require('retext');
var inspect   = require('unist-util-inspect');
var sentiment = require('retext-sentiment');
var sentimentScore;
var queryStr;

// init twitter API client
const twitter = new twit(cfg.twitter);

const express = require('express'),
       exphbs = require('express-handlebars'),
     mongoose = require('mongoose');

// connect to mongodb
mongoose.connect(cfg.mongodb.uri);
var db = mongoose.connection;

db.on('error', function(err) {
    console.log('connection error', err);
});
db.once('open', function() {
    console.log('connected.');
});

//Sentiment
function findSentiment(tweet1) {
    retext().use(sentiment).use(function() {
        return function(cst) {
            sentimentScore = inspect(cst.data.polarity);
        };
    }).process(tweet1);
    return sentimentScore;
}

//Save Data
function errCheck(err, data) {
    if (err) {
        console.log(err);
    } else {
        console.log('Saved : ', data);
    }
}

//Fetch the tweets using twitter api and display in console
exports.fetchTweets = function(id, query, maxID, i) {
    console.log('DEBUG:', 'twitter.fetchTweets', query, maxID, i);
    queryStr = query;

    twitter.get('search/tweets', {
        q: query,
        include_entities: false,
        count: 100,
        max_id: maxID
    }, function(err, data, resp) {
        if (err !== null) {
            console.log("Error:", err);
            return;
        }

        if (typeof data.statuses !== "object" || data.statuses.length < 1) {
            console.log("No data!");
            return i;
        }

        for (var count = 0; count < data.statuses.length; count++) {
            sentimentScore = findSentiment(data.statuses[count].text);

            var result;
            //simple json record
            var document = new TweetSch({
                character: id,
                name: query,
                uid : data.statuses[count].id,
                text: data.statuses[count].text,
                lang: data.statuses[count].lang,
                retweets: data.statuses[count].retweet_count,
                favorite_count: data.statuses[count].favorite_count,
                sentiment: sentimentScore,
                created: data.statuses[count].created_at,
                updated: Date.now()
            });

            //insert record
            document.save(errCheck(err, data));
        }

        const oldestStatus = data.statuses[data.statuses.length - 1];
        const oldestID_str = oldestStatus.id_str;
        const oldestID = parseInt(oldestID_str);
        console.log(maxID, oldestID_str, oldestID, oldestStatus.created_at, '\n');

        if (i > 1 && data.statuses.length !== 0) {
            if (maxID !== oldestID) {
                exports.fetchTweets(id, query, oldestID, i - 1);
            } else {
                console.log('No more data');
                return;
            }
        }
    });
};

exports.streamTweets = function(query) {
    twitter.stream('statuses/filter', {
        track: query
    }, function(stream) {
        stream.on('data', function(tweet) {
            sentimentScore1 = findSentiment(tweet.text);

            var document1 = new TweetSch({
                character: query,
                uid : tweet.id,
                text: tweet.text,
                lang: tweet.lang,
                retweets: tweet.retweet_count,
                favorite_count: tweet.favorite_count,
                sentiment: sentimentScore1,
                created: tweet.created_at,
                updated: Date.now()
            });

            //insert record
            document1.save(errCheck(err, data));
        });

        // Handle errors
        stream.on('error', function(error) {
            console.log(error);
        });
    });
};
