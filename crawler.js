// TODO: merge this into app.js
"use strict";

const cfg       = require('./core/config'),
      twitter   = require('./crawler/twitter'),
      got       = require('./crawler/got'),
      Character = require('./models/character'),
      mongoose  = require('mongoose'),
      slug      = require('slug');

// connect to mongodb
mongoose.connect(cfg.mongodb.uri);
var db = mongoose.connection;
db.on('error', function (err) {
    console.log('connection error', err);
});
db.once('open', function () {
    console.log('connected.');
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

updateCharacters().then(function() {
    console.log("Characters updated");

    var i = 0;
    // Fetch Tweets for each character
    Character.forEach(function(character) {
        return new Promise(function(resolve, reject) {
            var maxID    = null,
                found    = null,
                totalIns = 0,
                totalFnd = 0;
            function loop() {
                console.log("loop", character.name)
                twitter.fetchTweets(character.id, character.name, maxID).then(function(res) {
                    maxID = res.maxID;
                    found = res.found;
                    totalFnd += res.found;
                    totalIns += res.inserted;
                    console.log("RES", maxID, found, totalFnd, totalIns);
                    if (found >= 99 && totalFnd < 1000) {
                        loop();
                    } else {
                        resolve({found: totalFnd, inserted: totalIns, maxID: maxID});
                    }
                }, function(err) {
                    if(!!err && !!err.headers && err.err.length == 1 && (err.err[0].code === twitter.codeRateLimited)) {

                        var reset = err.headers['x-rate-limit-reset'];
                        if (!!reset) {
                            console.log("TIMEOUT", reset);
                            setTimeout(loop, reset);
                        } else {
                            reject(err.err);
                        }
                    } else {
                        reject(err);
                    }
                });
            }

            //console.log("Updating tweets for ", character.name);
            loop();
        });
    }).then(function(res) {
        //console.log("TWITSUC: ", res);
        mongoose.disconnect();
    }, function(err) {
        //console.log("TWITERR: ", err);
        mongoose.disconnect();
    });
}, function(err) {
    console.log("ERROR while updating Characters: ", err);
    mongoose.disconnect();
});
