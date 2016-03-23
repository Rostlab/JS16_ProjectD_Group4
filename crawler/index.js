// TODO: merge this into app.js
"use strict";

const cfg        = require('./core/config'),
      debug      = require('./core/debug')('crawler', true),
      blacklist  = require('./crawler/blacklist'),
      got        = require('./crawler/got'),
      mobile     = require('./crawler/mobile'),
      twitter    = require('./crawler/twitter'),
      Character  = require('./models/character'),
      aggregator = require('./aggregator/aggregator'),
      mongoose   = require('mongoose'),
      slug       = require('slug');

// connect to mongodb
mongoose.connect(cfg.mongodb.uri);
var db = mongoose.connection;
db.on('error', function (err) {
    debug.error('connection error', err);
});
db.once('open', function () {
    debug.info('connected.');
});

// TODO: fetch and add episodes when the API is ready
function saveCharacter(character) {
    if (blacklist.filter(character.name)) {
        return;
    }

    // TODO: skip if created / updated date < last checked date
    return Character.addIfNotExists({
        "_id":  character._id,
        "name": character.name,
        "slug": slug(character.name, {lower: true})
    });
}

function updateCharacters() {
    return new Promise(function(resolve, reject) {
        // Fetch characters from API and then save each to DB
        got.fetchCharacters().then(function(characters) {
            return Promise.all(characters.map(saveCharacter));
        }).then(function(res) {
            var total = res.length, filtered = 0, found = 0, inserted = 0;
            if (Array.isArray(res)) {
                for (var i = 0; i < total; i++) {
                    if (res[i] === undefined) {
                        filtered++;
                        continue;
                    }
                    found++;
                    if(!!res[i].upserted) {
                        inserted++;
                    }
                }
            }
            resolve({
                total: total,
                filtered: filtered,
                found: found,
                inserted: inserted,
            });
        }, reject);
    });
}

// Returns Promise for sync
function crawlAPI(full) {
    // Crawl Twitter REST API for each Character in DB
    return Character.list().then(function(characters) {
        return new Promise(function(resolve, reject) {
            // stats
            var found    = 0,
                inserted = 0;

            (function iterCrawl(i) {
                try {
                twitter.crawl(characters[i], full).then(function(res) {
                    debug.log("ACRWLD", characters[i].name, res);
                    found    += res.found;
                    inserted += res.inserted;
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve({found: found, inserted: inserted});
                    }
                }, function(err) {
                    debug.error("FAILED ACRWL", characters[i].name, err);
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve({found: found, inserted: inserted});
                    }
                });
                } catch(err) {
                    debug.error(err);
                }
            })(0);
        });
    });
}

// Returns Promise for sync
function crawlMobile(full) {
    // Crawl Twitter REST API for each Character in DB
    return Character.list().then(function(characters) {
        return new Promise(function(resolve, reject) {
            (function iterCrawl(i) {
                try {
                mobile.crawl(characters[i], full).then(function(res) {
                    debug.info("MCRWLD", characters[i].name, res);
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve(true);
                    }
                }, function(err) {
                    debug.error("FAILED MCRWL", characters[i].name, err);
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve(true);
                    }
                });
                } catch(err) {
                    debug.error(err);
                }
            })(0);
        });
    });
}

// aggregator.analyzeCharacter("56ea4cff8c27d7c637505d96");

updateCharacters().then(function(res) {
    debug.info("Characters updated", res);

    const full = true;

    crawlMobile(full).then(function(res) {
        debug.info("MCRAWL FINISHED: ", res);
        mongoose.disconnect();
    }).catch(debug.error);

    // crawlAPI().then(function(res) {
    //     debug.info("ACRAWL FINISHED: ", res);
    //     mongoose.disconnect();
    // }).catch(debug.eror);
}, function(err) {
    debug.error("Updating Characters: ", err);
    mongoose.disconnect();
});


