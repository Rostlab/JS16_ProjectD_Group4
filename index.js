"use strict";

const cfg        = require('./core/config'),
      db         = require('./core/db'),
      debug      = require('./core/debug')('main', true),
      asset      = require('./core/asset'),
      got        = require('./crawler/got'),
      mobile     = require('./crawler/mobile'),
      twitter    = require('./crawler/twitter'),
      Character  = require('./models/character'),
      aggregator = require('./aggregator/aggregator');

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
    //pkg.update();
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
        got.updateCharacters().then(function(res) {
            debug.info("Characters updated", res);

            mobile.crawlAll(full).then(function(res) {
                resolve(res);
            }, reject);

            // twitter.crawlAll().then(function(res) {
            //     debug.info("ACRAWL FINISHED: ", res);
            // }).catch(debug.eror);

            // TODO: Analyze all
        }, reject);
    });
};

/**
 * Update data for given character by crawling for new tweets and generating
 * new CSV files.
 * @param {string}  id            ID of the character
 * @param {boolean} [full=false]  full rebuild or incremental update
 * @return {Promise<Object>}      A promise to the update results
 */
pkg.updateCharacter = function(id, full) {
    return new Promise(function(resolve, reject) {
        Character.byID(id).then(function(character) {
            debug.info("Loaded", character.name);

            mobile.crawl(character, full).then(function(res) {
                debug.info("MCRAWL FINISHED: ", res);

                aggregator.analyzeCharacter(id).then(resolve, reject);
            }, reject);
        }, reject);
    });
};

/**
 * @typedef Character
 * @property {string} name        name of the character
 * @property {string} slug        human-readale URL-identifier for the character
 * @property {string} _id         unique ID
 * @property {number} total       total number of tweets in database
 * @property {number} heat        how controverse is the character
 * @property {number} popularity  how much is the character is discussed
 * @property {Date}   updated     date when the document was last updated
 */

/**
 * Consume a token
 * @param  {string} id          ID of the character
 * @return {Promise<Character>} A promise to the token.
 */
pkg.character = function(id) {
    return Character.byID(id);
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

/**
 * The Chart CSS file
 * @property {string}   path   Absolute path to file
 * @property {function} serve  HTTP handler to serve file
 */
pkg.css = asset('public/chart.css');

/**
 * The Chart JS file
 * @property {string}   path   Absolute path to file
 * @property {function} serve  HTTP handler to serve file
 */
pkg.js = asset('public/chart.js');

