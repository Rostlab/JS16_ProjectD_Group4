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

var i = 0;
var countIter = 180;
got.fetchCharacters(function(status, characters) {
    console.log("status", status);


    function tweet_get(id, name, i) {
        console.log('Current CHAR:' + characters[i].name);
        countIter =  twitter.fetchTweets(id, name, null, countIter);

        setTimeout(function() {
            if (i < characters.length - 1) {
                i++;
                tweet_get(characters[i]._id, characters[i].name, i);
            }
        }, 900000);
    };

    tweet_get(characters[i]._id, characters[i].name, i);

    characters.forEach(function(character) {
        // TODO: skip if created / updated date < last checked date
        Character.addIfNotExists({
            "_id":  character._id,
            "name": character.name,
            "slug": slug(character.name, {lower: true})
        }).then(function(res) {
            console.log("DEBUG: update character", character.name, res);
        }).catch(function(err) {
            console.log("DEBUG: update character", character.name, "FAILED:", err);
        });
    });
}, function(err) {
    console.log("Fetch Error:", err);
});

//twitter.fetchTweets("tyrion lannister", null, 50);

// TODO: mongoose.disconnect();
