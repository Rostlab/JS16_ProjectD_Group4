// TODO: merge this into app.js
"use strict";

const cfg       = require('./core/config'),
      debug     = require('./core/debug')('crawler', true),
      twitter   = require('./crawler/twitter'),
      got       = require('./crawler/got'),
      Character = require('./models/character'),
      mongoose  = require('mongoose'),
      slug      = require('slug');

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
        }).then(resolve, reject);
    });
}

// 2nd param (optional): Full crawl or just update?
function crawlTweets(character, full) {
    return new Promise(function(resolve, reject) {
        var maxID    = null,
            inserted = null,
            found    = null,
            totalIns = 0,
            totalFnd = 0;
        (function loop() {
            twitter.fetchTweets(character.id, character.name, maxID).then(function(res) {
                maxID     = res.maxID;
                found     = res.found;
                inserted  = res.inserted;
                totalFnd += found;
                totalIns += inserted;

                if (((!full && inserted > 0) || (!!full && found >= 99)) && totalFnd < 1000) { // TODO: remove totalFnd limit
                    loop();
                } else {
                    resolve({found: totalFnd, inserted: totalIns, maxID: maxID});
                }
            }, function(err) {
                // check if it was because of rate-limiting
                // if yes, wait for time stated in header
                if(!!err && !!err.headers && err.err.length === 1 &&
                   (err.err[0].code === twitter.codeRateLimited)) {

                    var reset = err.headers['x-rate-limit-reset'];
                    if (!!reset) {
                        // determine wait time in seconds
                        var timeout = (reset - Math.floor(new Date() / 1000));

                        // Add 5 seconds extra because auf async clock etc
                        timeout += 5;

                        debug.log("RL TIMEOUT", timeout+"s [" + new Date(reset*1000) + "]");
                        setTimeout(loop, timeout*1000);
                    } else {
                        reject(err.err);
                    }

                // otherwise stuff went wrong
                } else {
                    reject(err);
                }
            });
        })();
    });
}

updateCharacters().then(function() {
    debug.log("Characters updated");

    // Crawl Twitter for each Character in DB
    Character.list().then(function(characters) {
        return new Promise(function(resolve, reject) {
            // stats
            var found    = 0,
                inserted = 0;

            (function iterCrawl(i) {
                crawlTweets(characters[i]).then(function(res) {
                    debug.log("CRWLD", characters[i].name, res);
                    found    += res.found;
                    inserted += res.inserted;
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve({found: found, inserted: inserted});
                    }
                }, function(err) {
                    debug.error("FAILED CRWL", characters[i].name, err);
                    if (++i < characters.length) {
                        iterCrawl(i);
                    } else {
                        resolve({found: found, inserted: inserted});
                    }
                });
            })(0);
        });
    }).then(function(res) {
        debug.log("FULL CRAWL: ", res);
        mongoose.disconnect();
    }).catch(console.log);
}, function(err) {
    debug.error("updating Characters: ", err);
    mongoose.disconnect();
});
