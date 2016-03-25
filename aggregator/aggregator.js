"use strict";

const cfg       = require('../core/config'),
      debug     = require('../core/debug')('aggregator/aggregator', true),
      Character = require('../models/character'),
      Tweet     = require('../models/tweet'),
      sentiment = require('../aggregator/sentiment'),
      fs        = require('fs'),
      mkdirp    = require('mkdirp');

var aggregator = module.exports = {};

function writeCSV(slug, bucket) {
    return new Promise(function(resolve, reject) {
        const keys = Object.keys(bucket);
        if (keys.length < 1) {
            // nothing to do here!
            resolve();
            return;
        }

        // CSV header
        let out = 'date,pos,neg\n';

        // CSV row for every day
        for (var i = 0; i < keys.length; i++) {
            const key = keys[i];
            out += key + "," + bucket[key][0] + "," + bucket[key][1] + "\n";
        }

        // write CSV file to disk
        mkdirp(cfg.csvpath, function(err) {
            if (!!err) {
                debug.warn(err);
            }

            fs.writeFile(cfg.csvpath+slug+'.csv', out, function(err) {
                debug.info("wrote", cfg.csvpath+slug+'.csv');
                if (!!err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}

// ToDO:
//  - optimize sentiment analysis
//  - sort into buckets
//  - write CSV from buckets

aggregator.analyzeCharacter = function(id, slug) {
    return new Promise(function(resolve, reject) {
        const start = new Date();

        Tweet.find({ character: id }).sort({ created: 1 }).then(function(tweets) {
            let pos = 0, neg = 0, total = 0;

            // data bucket
            let bucket = {};

            for (var i = 0; i < tweets.length; i++) {
                const tweet = tweets[i];

                // tweet date
                const created = tweet.created;

                // year
                const twtYear = created.getUTCFullYear();

                // month
                const twtMonth = created.getUTCMonth();

                // day in year.
                // actually our "year" has 12*31 days. it doesn't matter that
                // not all of these days actually exist.
                const _twtDay = created.getUTCDate();
                const twtDay = (twtMonth * 31) + _twtDay;

                // hour in month
                const _twtHour = created.getUTCHours();
                const twtHour = (_twtDay * 24) + _twtHour;

                // minute of the day
                const twtMinute = (_twtHour * 60) + created.getUTCMinutes();


                const key = "" + twtYear + "-" +
                            ((twtMonth > 8) ? (twtMonth+1) : "0"+(twtMonth+1)) +
                             "-" + ((_twtDay > 8) ? (_twtDay+1) : "0"+(_twtDay));

                // calculate sentiment for tweet
                const sent = sentiment(tweet.text);
                total++;

                if(sent !== 0) {
                    if(!bucket[key]) {
                        bucket[key] = [0, 0];
                    }

                    if (sent > 0) {
                        pos++;
                        bucket[key][0]++;
                    } else if (sent < 0) {
                        neg++;
                        bucket[key][1]++;
                    }
                }
            }

            writeCSV(slug, bucket).then(console.log).catch(debug.error);

            // TODO: better scoring
            let popularity = pos-neg;
            let heat       = total;

            // Update DB
            Character.update(
                { _id: id },
                { $set: {
                    total:      total,
                    popularity: popularity,
                    heat:       heat,
                    updated:    Date.now()
                }},
                console.log
            );

            const time = new Date().getTime() - start.getTime();
            resolve({ "pos": pos, "neg": neg, "total": total, "time": time+"ms" });
        }).catch(reject);
    });
};
