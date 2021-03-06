"use strict";

const cfg        = require('./core/config'),
      db         = require('./core/db'),
      debug      = require('./core/debug')('main', true),
      asset      = require('./core/asset'),
      got        = require('./crawler/got'),
      mobile     = require('./crawler/mobile'),
      twitter    = require('./crawler/twitter'),
      Character  = require('./models/character'),
      aggregator = require('./aggregator/aggregator'),
      episodes   = require('./aggregator/episodes');

/**
 * gotsentimental - GoT Twitter Sentiment Analysis
 * @exports gotsentimental
 */
var pkg = module.exports = {};

/**
 * Object containing the package configuration.
 * The config can be changed by directly overwriting attributes or using
 * cfg.extend(object).
 * See defaults.json for default values.
 * @type {Object}
 * @property {function} extend  Merge object into config
 */
pkg.cfg = cfg;

/**
 * Initilaize the package.
 * Opens the MongoDB connection and initializes the Twitter client.
 */
pkg.init = function() {
    db.connect();
    twitter.connect();
};

/**
 * Close any open resources like the database connection.
 */
pkg.shutdown = function() {
    db.close();
};


/**
 * Update data by crawling for new tweets and generating new CSV files.
 * @param {boolean} [full=false]  full rebuild or incremental update
 * @return {Promise<Object>}      A promise to the update results
 */
pkg.update = function(full) {
    return new Promise(function(resolve, reject) {
        const ep = episodes.update().then(function(res) {
            debug.info("Episodes updated");
            return true;
        }).catch(debug.error);

        got.updateCharacters().then(function(res) {
            debug.info("Characters updated", res);

            mobile.crawlAll(full).then(function(res) {
                debug.info("Crawling completed");

                // make sure that the episodes update also completed (haha)
                ep.then(function() {
                    debug.info("Update complete!");
                    resolve(res);
                }).catch(reject);

            }).catch(debug.error);

            // twitter.crawlAll().then(function(res) {
            //     debug.info("ACRAWL FINISHED: ", res);
            // }).catch(debug.eror);
        }).catch(debug.error);
    });
};

/**
 * Update data for given character by crawling for new tweets and generating
 * new CSV files.
 * @param {string}  name          Name of the character
 * @param {boolean} [full=false]  full rebuild or incremental update
 * @return {Promise<Object>}      A promise to the update results
 */
pkg.updateCharacter = function(name, full) {
    return new Promise(function(resolve, reject) {
        Character.byName(name).then(function(character) {
            debug.info("Loaded", name);

            mobile.crawl(character, full).then(function(res) {
                debug.info("MCRAWL FINISHED: ", res);

                aggregator.analyzeCharacter(character).then(function() {
                    debug.log("Wrote CSVs for", name);
                    resolve();
                }).catch(function(err) {
                    debug.error("FAILED to write CSVs for", name, err);
                    reject();
                });
            }, reject);
        }, reject);
    });
};

var run = false;
var ploop = null; // not to be confused with 'poop'
function loop() {
    ploop = pkg.update(false).then(function() {
        return scheduleUpdate();
    }).catch(function(err) {
        debug.error("FAILED update:", err);
        return scheduleUpdate();
    });
}

function scheduleUpdate() {
    ploop = null;
    if (!run) {
        return null;
    }
    const wait = (+cfg.crawler.loopwait_s)*1000;
    debug.info(
        "Scheduling next incremental update at" +
        new Date((new Date()).getTime() + wait).toString()
    );
    return setTimeout(loop, wait);
}

/**
 * Start the update loop.
 * Waits the amount of secunds set in the config after completing one
 * iteration before starting the next incremental update.
 */
pkg.startUpdateLoop = function() {
    if (run) {
        debug.warn("Update loop already running! Aborting.");
        return;
    }
    debug.info("Starting update loop...");
    run = true;
    loop();
};

/**
 * Stop the update loop.
 * Waits for the current update to complete, if one is running.
 * @return {Promise} A promise which resolves when the loop is stopped.
 */
pkg.stopUpdateLoop = function() {
    run = false;
    if (ploop === null) {
        debug.info("Stopped update loop");
        return Promise.resolve();
    }
    debug.info("Waiting for current update to finish...");
    return new Promise(function(resolve, reject) {
        ploop.then(function() {
            debug.info("Stopped update loop");
            resolve();
        });
    });
};

/**
 * @typedef Character
 * @type Object
 * @property {string} name        name of the character
 * @property {string} slug        human-readale URL-identifier for the character
 * @property {number} total       total number of tweets in database
 * @property {number} positive    total number of positive tweets in database
 * @property {number} negative    total number of negative tweets in database
 * @property {number} heat        how controverse is the character
 * @property {number} popularity  how much is the character is discussed
 * @property {Date}   updated     date when the document was last updated
 */

/**
 * Get a character by name.
 * @param  {string} name          Name of the character
 * @return {Promise<Character>} A promise to the token.
 */
pkg.character = function(name) {
    return Character.byName(name);
};

/**
 * Get the most popular Characters
 * @param  {number} [n=10]                Number of Characters to return
 * @return {Promise<Array.<Character>>}   A promise to the array of characters
 */
pkg.mostPopular = function(n) {
    if(n === undefined) {
        n = 10;
    }
    return Character.find().sort({popularity:-1}).limit(n).exec();
};

/**
 * Get the most hated characters.
 * @param  {number} [n=10]                Number of characters to return
 * @return {Promise<Array.<Character>>}   A promise to the array of characters
 */
pkg.mostHated = function(n) {
    if(n === undefined) {
        n = 10;
    }
    return Character.find().sort({popularity:1}).limit(n).exec();
};

/**
 * Get the most discussed characters.
 * @param  {number} [n=10]                Number of characters to return
 * @return {Promise<Array.<Character>>}   A promise to the array of characters
 */
pkg.mostDiscussed = function(n) {
    if(n === undefined) {
        n = 10;
    }
    return Character.find().sort({heat:-1}).limit(n).exec();
};

// currently unexported
function startStream(n) {
    if(n === undefined) {
        n = 200;
    }
    pkg.mostDiscussed(n).then(function(res) {
        twitter.streamTweets(res);
    });
}

/**
 * Absolute path to the Chart CSS file.
 * It should be served with e.g. express' sendFile.
 * @type {string}
 */
pkg.css = asset('public/chart.css');

/**
 * Absolute path to the Chart JS file.
 * It should be served with e.g. express' sendFile.
 * @type {string}
 */
pkg.js = asset('public/chart.js');

/**
 * Get stats about tweets in database.
 * The returned Object has the following attributes:
 *  total (total number of tweets),
 *  positive (total number of positive tweets),
 *  negative (total number of negative tweets).
 * @return {Promise<Object>} A promise to the stats Object.
 */
pkg.stats = function() {
    return new Promise(function(resolve, reject) {
        Character.aggregate([
            { $group: {
                _id:      null,
                total:    { $sum: "$total" },
                positive: { $sum: "$positive" },
                negative: { $sum: "$negative" }
            }}
        ], function (err, results) {
            if (!!err) {
                reject(err);
                return;
            }
            const result = results[0];
            resolve({
                total:    result.total,
                positive: result.positive,
                negative: result.negative
            });
        });
    });
};
