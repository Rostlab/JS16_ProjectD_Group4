// TODO: merge this into app.js
"use strict";

const cfg = require('./core/config'),
    twitter = require('./crawler/twitter'),
    got = require('./crawler/got'),
    Character = require('./models/character'),
    mongoose = require('mongoose'),
    slug = require('slug');

// connect to mongodb
mongoose.connect(cfg.mongodb.uri);
var db = mongoose.connection;
db.on('error', function(err) {
    console.log('connection error', err);
});
db.once('open', function() {
    console.log('connected.');
});

// TODO: fetch and add episodes when the API is ready

var i = 0;
got.fetchCharacters(function(status, characters) {
    console.log("status", status);


    function tweet_get(id, name, i) {
        console.log('Current CHAR:' + characters[i].name);
        twitter.fetchTweets(id, name, null, 180);

        setTimeout(function() {
//            twitter.fetchTweets(id, name, null, 180);

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
            "_id": character._id,
            "name": character.name,
            "slug": slug(character.name, {lower: true})
        });
    });
}, function(err) {
    console.log("Fetch Error:", err);
});
