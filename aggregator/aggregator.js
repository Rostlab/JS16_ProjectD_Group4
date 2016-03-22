"use strict";

const cfg       = require('../core/config'),
      debug     = require('../core/debug')('aggregator/aggregator', true),
      Tweet     = require('../models/tweet'),
      sentiment = require('../aggregator/sentiment');

var aggregator = module.exports = {};

// ToDO:
//  - optimize sentiment analysis
//  - sort into buckets
//  - write CSV from buckets
//  - update Character in DB

aggregator.analyzeCharacter = function(id) {
    const start = new Date();
    Tweet.find({ character: id }).then(function(tweets) {
        let pos = 0, neg = 0, total = 0;

        for (var i = 0; i < tweets.length; i++) {
            const tweet = tweets[i];
            const sent  = sentiment(tweet.text);

            total++;
            if (sent > 0) {
                pos++;
            } else if (sent < 0) {
                neg++;
            }
        }

        const time = new Date().getTime() - start.getTime();
        debug.log("pos:", pos, " neg:", neg, " total:", total, ' ', time + "ms");
    });
};
