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

function addCharacter(character) {
    Character.update(
        { _id: character._id },
        { $setOnInsert: {
            "_id":  character._id,
            "name": character.name,
            "slug": slug(character.name, {lower: true})
        } },
        { upsert: true },
        function(err, res) {
            if (err != null) {
                console.log("update character", character.name, "FAILED:", err);
            } else {
                console.log("update character", character.name, res);
            }
        }
    );
}

got.fetchCharacters(function(status, characters) {
    console.log("status", status);

    for (var i = 0; i < characters.length; i++) {
        addCharacter(characters[i]);
    };
}, function(err) {
    console.log("Fetch Error:", err);
});

//twitter.fetchTweets("tyrion lannister", null, 50);

// TODO: mongoose.disconnect();
