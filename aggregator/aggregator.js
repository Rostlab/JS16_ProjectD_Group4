"use strict";

const cfg       = require('../core/config'),
      debug     = require('../core/debug')('aggregator/aggregator', true),
      Character = require('../models/character'),
      Tweet     = require('../models/tweet'),
      sentiment = require('../aggregator/sentiment'),
      fs        = require('fs'),
      mkdirp    = require('mkdirp');

var aggregator = module.exports = {};

const csvHeader = 'date,pos,neg\n';

function writeCSV(dir, file, bucket, dateFunc) {
    return new Promise(function(resolve, reject) {
        const keys = Object.keys(bucket);
        if (keys.length < 1) {
            // nothing to do here!
            resolve();
            return;
        }

        // CSV header
        let out = csvHeader;

        // CSV row for every day
        for (var i = 0; i < keys.length; i++) {
            const key  = keys[i];
            const date = dateFunc(key); // get date string from key
            out += date + "," + bucket[key][0] + "," + bucket[key][1] + "\n";
        }

        // write CSV file to disk
        mkdirp(dir, function(err) {
            if (!!err) {
                debug.warn(err);
            }

            const filename = dir+file+'.csv';
            fs.writeFile(filename, out, function(err) {
                debug.info("wrote", filename);
                if (!!err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}

function saveYear(slug, curYear, year) {
    const dir  = cfg.csvpath+slug+'/';
    const file = ''+curYear;

    return writeCSV(dir, file, year, function(key) {
        // calculate missing date information from bucket key
        const month = ~~(key / 31) + 1; // bithacks ftw
        const day   = key%31 + 1;

        // return date string
        return '' + curYear + '-' +
            ((month > 9) ? month : '0'+month) + '-' +
            ((day   > 9) ? day   : '0'+day);
    });
}

function saveMonth(slug, curYear, curMonth, month) {
    curMonth++;
    const _month = ((curMonth > 9) ? curMonth : '0'+curMonth);
    const dir    = cfg.csvpath+slug+'/'+curYear+'/';
    const file   = ''+_month;

    return writeCSV(dir, file, month, function(key) {
        // calculate missing date information from bucket key
        const day   = ~~(key / 24) + 1; // bithacks ftw
        const hour  = key%24;

        // return date string
        return '' + curYear + '-' + _month  + '-' +
            ((day   > 9) ? day   : '0'+day) + 'T' +
            ((hour  > 9) ? hour  : '0'+hour);
    });
}

function saveDay(slug, curYear, curDay, day) {
    // estimated number of bugs: > 9000
    // i'm really really sorry for that code :(
    const __month = ~~(curDay / 31) + 1; // bithacks ftw
    const __day   = curDay%31 + 1;
    const _month  = ((__month > 9) ? __month : '0'+__month);
    const _day    = ((__day   > 9) ? __day   : '0'+__day);

    const dir     = cfg.csvpath+slug+'/'+curYear+'/'+_month+'/';
    const file    = ''+_day;

    return writeCSV(dir, file, day, function(key) {
        // calculate missing date information from bucket key
        const hour   = ~~(key / 60); // bithacks ftw
        const minute = key%60;

        // return date string
        return '' + curYear + '-' + _month + '-' + _day + 'T' +
            ((hour   > 9) ? hour   : '0'+hour) + ':' +
            ((minute > 9) ? minute : '0'+minute);
    });

    // congratz, you just saved the day! <3
}

// ToDO:
//  - optimize sentiment analysis
//  - keep track of inserted items and skip save
//  - write overall file

aggregator.analyzeCharacter = function(id, slug) {
    return new Promise(function(resolve, reject) {
        //const start = new Date();

        Tweet.find({ character: id }).sort({ created: 1 }).then(function(tweets) {

            // data buckets
            let year  = {}; // day in year
            let month = {}; // hour in month
            let day   = {}; // minute in day

            // current indices
            // ALL INDICES EXCEPT curYear START WITH 0!
            let curYear, curMonth, curDay, curHour, curMinute;

            // aggregates
            let pos = 0, neg = 0, total = 0;

            // output buffer for overall file
            // Currently basically all years combined.
            // We therefore just append the buffer when saving a year.
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

                // minute of the day
                const twtMinute = (_twtHour * 60) + created.getUTCMinutes();

                // figure out which buckets have to be emptied before we can
                // process this tweet
                if (curYear !== twtYear) {
                    if (curYear !== undefined) {
                        // save buckets
                        ps.push(saveYear(slug, curYear, year));
                        ps.push(saveMonth(slug, curYear, curMonth, month));
                        ps.push(saveDay(slug, curYear, curDay, day));

                        // reset buckets
                        year  = {};
                        month = {};
                        day   = {};
                    }

                    curYear   = twtYear;
                    curMonth  = twtMonth;
                    curDay    = twtDay;
                    curHour   = twtHour;
                    curMinute = twtMinute;
                } else if (curMonth !== twtMonth) {
                    // save buckets
                    ps.push(saveMonth(slug, curYear, curMonth, month));
                    ps.push(saveDay(slug, curYear, curDay, day));

                    // reset buckets
                    month = {};
                    day   = {};

                    curMonth  = twtMonth;
                    curDay    = twtDay;
                    curHour   = twtHour;
                    curMinute = twtMinute;
                } else if (curDay !== twtDay) {
                    // save buckets
                    ps.push(saveDay(slug, curYear, curDay, day));

                    // reset buckets
                    day = {};

                    curMonth  = twtMonth;
                    curDay    = twtDay;
                    curHour   = twtHour;
                    curMinute = twtMinute;
                }

                // calculate sentiment for tweet
                const sent = sentiment(tweet.text);
                total++;

                if(sent !== 0) {
                    if(!year[curDay]) {
                        year[curDay] = [0, 0];
                    }
                    if(!month[curHour]) {
                        month[curHour] = [0, 0];
                    }
                    if(!day[curMinute]) {
                        day[curMinute] = [0, 0];
                    }


                    if (sent > 0) {
                        pos++;
                        year[curDay][0]++;
                        month[curHour][0]++;
                        day[curMinute][0]++;
                    } else if (sent < 0) {
                        neg++;
                        year[curDay][1]++;
                        month[curHour][1]++;
                        day[curMinute][1]++;
                    }
                }
            }

            // save buckets
            ps.push(saveYear(slug, curYear, year));
            ps.push(saveMonth(slug, curYear, curMonth, month));
            ps.push(saveDay(slug, curYear, curDay, day));

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
