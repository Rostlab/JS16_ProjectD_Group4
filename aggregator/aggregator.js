"use strict";

const cfg       = require('../core/config'),
      debug     = require('../core/debug')('aggregator/aggregator', true),
      Character = require('../models/character'),
      Tweet     = require('../models/tweet'),
      sentiment = require('../aggregator/sentiment'),
      fs        = require('fs'),
      mkdirp    = require('mkdirp');

var aggregator = module.exports = {};

// write data string to file
// creates parent dir if necessary
function writeFile(dir, file, data) {
    new Promise(function(resolve, reject) {
        // write CSV file to disk
        mkdirp(dir, function(err) {
            if (!!err) {
                debug.warn(err);
            }

            const filename = dir+file+'.csv';
            fs.writeFile(filename, data, function(err) {
                if (!!err) {
                    reject(err);
                    return;
                }
                //debug.info("wrote", filename);
                resolve();
            });
        });
    });
    return Promise.resolve();
}

const csvHeader = 'date,pos,neg\n';

// formats bucket to CSV and either writes it to disk or returns the data string
function genCSV(dir, file, bucket, dateFunc, write) {
    if (bucket.length < 1) {
        // nothing to do here!
        return ((write) ? Promise.resolve() : "");
    }

    // CSV header
    let out = ((write) ? csvHeader : "");

    // CSV row for every date
    for (var key in bucket) {
        const date = dateFunc(key); // get date string from key
        out += date + "," + bucket[key][0] + "," + bucket[key][1] + "\n";
    }

    return ((write) ? writeFile(dir, file, out) : out);
}

function saveYear(slug, curYear, year) {
    const dir  = cfg.csvpath+slug+'/';
    const file = curYear;

    return genCSV(dir, file, year, function(key) {
        // calculate missing date information from bucket key
        const month = ~~(key / 31) + 1; // bithacks ftw
        const day   = key%31 + 1;

        // return date string
        return curYear + '-' +
            ((month > 9) ? month : '0'+month) + '-' +
            ((day   > 9) ? day   : '0'+day);
    }, false);
}

function saveMonth(slug, curYear, curMonth, month) {
    curMonth++;
    const _month = ((curMonth > 9) ? curMonth : '0'+curMonth);
    const dir    = cfg.csvpath+slug+'/';
    const file   = curYear+'-'+_month;

    return genCSV(dir, file, month, function(key) {
        // calculate missing date information from bucket key
        const day   = ~~(key / 24) + 1; // bithacks ftw
        const hour  = key%24;

        // return date string
        return curYear + '-' + _month  + '-' +
            ((day   > 9) ? day   : '0'+day) + 'T' +
            ((hour  > 9) ? hour  : '0'+hour);
    }, true);
}

aggregator.analyzeCharacter = function(id, slug) {
    return new Promise(function(resolve, reject) {
        //const start = new Date();

        // data buckets
        let year  = []; // day in year
        let month = []; // hour in month

        // current indices
        let curYear, curMonth;

        // aggregates
        let pos = 0, neg = 0, total = 0;

        // output buffer for overall file
        // We append here when saving the year bucket
        let overall = csvHeader;

        // Promises for sync
        let ps = [];

        function aggregate(tweet) {
            total++;

            // Skip non-English tweets
            if(tweet.lang !== "en") {
                return;
            }

            // calculate sentiment for tweet
            const sent = sentiment(tweet.text);

            if(sent === 0) {
                return;
            }

            // tweet date
            const created = tweet.created;

            // year
            const twtYear = created.getUTCFullYear();

            // month [0-11]
            const twtMonth = created.getUTCMonth();

            // day in year [0 - 371]
            // our "year" has 12*31 days. it doesn't matter that not all of
            // these dates actually exist.
            const _twtDay = created.getUTCDate() - 1; // [0-30], shifted to 0
            const twtDay = (twtMonth * 31) + _twtDay;

            // hour in month [0-731]
            const _twtHour = created.getUTCHours(); // [0-23]
            const twtHour = (_twtDay * 24) + _twtHour;

            // figure out which buckets have to be emptied before we can
            // process this tweet
            if (curYear !== twtYear) {
                if (year.length > 0) {
                    // save buckets

                    // we write one overal file instead of files per year
                    overall += saveYear(slug, curYear, year);

                    if (month.length > 0) {
                        ps.push(saveMonth(slug, curYear, curMonth, month));
                    }

                    // reset buckets
                    year  = [];
                    month = [];
                }

                // update indices
                curYear   = twtYear;
                curMonth  = twtMonth;

            } else if (curMonth !== twtMonth) {
                // save bucket
                if (month.length > 0) {
                    ps.push(saveMonth(slug, curYear, curMonth, month));

                    // reset bucket
                    month = [];
                }

                // update index
                curMonth  = twtMonth;
            }

            if(typeof year[twtDay] === 'undefined') {
                year[twtDay] = [0, 0];
            }
            if(typeof month[twtHour] === 'undefined') {
                month[twtHour] = [0, 0];
            }

            if (sent > 0) {
                pos++;
                year[twtDay][0]++;
                month[twtHour][0]++;
            } else if (sent < 0) {
                neg++;
                year[twtDay][1]++;
                month[twtHour][1]++;
            }
        }

        function save() {
            // save buckets
            if (year.length > 0) {
                // we write one overal file instead of files per year
                overall += saveYear(slug, curYear, year);

                if (month.length > 0) {
                    ps.push(saveMonth(slug, curYear, curMonth, month));
                }
            }

            if (pos+neg > 0) {
                // write buffered overall CSV
                ps.push(writeFile(cfg.csvpath, slug, overall));
            }

            // TODO: better scoring
            let popularity = pos-neg;
            let heat       = total;

            // Update DB
            ps.push(Character.update(
                { _id: id },
                { $set: {
                    total:      total,
                    positive:   pos,
                    negative:   neg,
                    popularity: popularity,
                    heat:       heat,
                    updated:    Date.now()
                }}
            ));

            resolve(Promise.all(ps));
        }

        // stream tweets from DB and process stream
        const stream = Tweet.find({ character: id }).sort({ created: 1 }).lean().stream();
        stream.on('data', aggregate);
        stream.on('error', reject);
        stream.on('close', save);
    });
};
