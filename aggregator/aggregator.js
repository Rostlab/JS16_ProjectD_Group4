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
    const keys = Object.keys(bucket);
    if (keys.length < 1) {
        // nothing to do here!
        return ((write) ? Promise.resolve() : "");
    }

    // CSV header
    let out = ((write) ? csvHeader : "");

    // CSV row for every date
    for (var i = 0; i < keys.length; i++) {
        const key  = keys[i];
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

        Tweet.find({ character: id }).sort({ created: 1 }).then(function(tweets) {

            // data buckets
            let year  = {}; // day in year
            let month = {}; // hour in month

            // number of items in each bucket
            let nYear = 0, nMonth = 0;

            // current indices
            // ALL INDICES EXCEPT curYear START WITH 0!
            let curYear, curMonth, curDay, curHour;

            // aggregates
            let pos = 0, neg = 0, total = 0;

            // output buffer for overall file
            // We append here when saving the year bucket
            let overall = csvHeader;

            // Promises for sync
            let ps = [];

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
                const _twtDay = created.getUTCDate() - 1; // must start with 0
                const twtDay = (twtMonth * 31) + _twtDay;

                // hour in month
                const _twtHour = created.getUTCHours();
                const twtHour = (_twtDay * 24) + _twtHour;

                // figure out which buckets have to be emptied before we can
                // process this tweet
                if (curYear !== twtYear) {
                    if (nYear > 0) {
                        // save buckets

                        // we write one overal file instead of files per year
                        overall += saveYear(slug, curYear, year);

                        if (nMonth > 0) {
                            ps.push(saveMonth(slug, curYear, curMonth, month)[0]);
                        }

                        // reset buckets
                        year  = {};
                        month = {};
                        nYear = nMonth = 0;
                    }

                    // update indices
                    curYear   = twtYear;
                    curMonth  = twtMonth;
                    curDay    = twtDay;
                    curHour   = twtHour;
                } else if (curMonth !== twtMonth) {
                    // save bucket
                    if (nMonth > 0) {
                        ps.push(saveMonth(slug, curYear, curMonth, month)[0]);

                        // reset bucket
                        month  = {};
                        nMonth = 0;
                    }

                    // update indices
                    curMonth  = twtMonth;
                    curDay    = twtDay;
                    curHour   = twtHour;
                }

                // calculate sentiment for tweet
                const sent = sentiment(tweet.text);
                total++;

                if(sent !== 0) {
                    nYear++;
                    nMonth++;

                    if(!year[curDay]) {
                        year[curDay] = [0, 0];
                    }
                    if(!month[curHour]) {
                        month[curHour] = [0, 0];
                    }

                    if (sent > 0) {
                        pos++;
                        year[curDay][0]++;
                        month[curHour][0]++;
                    } else if (sent < 0) {
                        neg++;
                        year[curDay][1]++;
                        month[curHour][1]++;
                    }
                }
            }

            // save buckets
            if (nYear > 0) {
                // we write one overal file instead of files per year
                overall += saveYear(slug, curYear, year);

                if (nMonth > 0) {
                    ps.push(saveMonth(slug, curYear, curMonth, month)[0]);
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

            //const time = new Date().getTime() - start.getTime();
            //const stats = { "pos": pos, "neg": neg, "total": total, "time": time+"ms" };

            resolve(Promise.all(ps));
        }).catch(reject);
    });
};
