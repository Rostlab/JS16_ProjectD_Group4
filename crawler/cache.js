"use strict";

const debug = require('../core/debug')('crawler/cache', true),
      Tweet = require('../models/tweet');

var cache = module.exports = {};

// has the crawler never completed before?
cache.cold = true;

// cache for the maxID for each character
cache.maxID = [];

cache.fill = function() {
    // some of the uids are wrong since strcmp("9" > "11111")
    // we correct that at runtime :)
    Tweet.aggregate([
        { $group: {
            _id: "$character",
            uid: { $max: "$uid" }
        }}
    ], function (err, results) {
        if (!!err) {
            debug.error(err);
            return;
        }

        for (var i = 0; i < results.length; i++) {
            const entry = results[i];
            // don't overwrite values set by the crawler
            if (cache.maxID.indexOf(entry._id) === -1) {
                cache.maxID[entry._id] = +entry.uid;
            }
        }
    });
};
