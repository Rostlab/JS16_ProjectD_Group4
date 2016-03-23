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

var pkg = module.exports = {};

pkg.cfg = cfg;

pkg.init = function() {
    db.connect();
    twitter.connect();
    //pkg.update();
};

pkg.shutdown = function() {
    db.close();
};

pkg.update = function(full) {
    got.updateCharacters().then(function(res) {
        debug.info("Characters updated", res);

        mobile.crawlAll(full).then(function(res) {
            debug.info("MCRAWL FINISHED: ", res);
        }, debug.error);

        // twitter.crawlAll().then(function(res) {
        //     debug.info("ACRAWL FINISHED: ", res);
        // }).catch(debug.eror);

        // TODO: Analyze all
    }, function(err) {
        debug.error("Updating Characters: ", err);
    });
};

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

pkg.character = function(id) {
    return Character.byID(id);
};

pkg.mostPopular = function(n) {
    if(n === undefined) {
        n = 10;
    }
    return Character.find().sort({popularity:-1}).limit(n).exec;
};

pkg.mostHated = function(n) {
    if(n === undefined) {
        n = 10;
    }
    return Character.find().sort({popularity:1}).limit(n).exec;
};

pkg.mostDiscussed = function(n) {
    if(n === undefined) {
        n = 10;
    }
    return Character.find().sort({heat:-1}).limit(n).exec;
};

pkg.css = asset('public/chart.css');
pkg.js = asset('public/chart.js');

/*
(function test() {
    pkg.cfg.extend(require('./config.json'));
    pkg.init();

    pkg.updateCharacter("56ea4cfe8c27d7c6375059a1", false).then(function(res) {
        debug.log(res);
        pkg.shutdown();
    }, function(err) {
        debug.error(err);
        pkg.shutdown();
    });
})();
*/
