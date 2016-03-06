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

got.fetchCharacters(function(status, characters) {
    console.log("status", status);

    for (var i = 0; i < characters.length; i++) {
        Character.addIfNotExists({
            "_id":  character._id,
            "name": character.name,
            "slug": slug(character.name, {lower: true})
        });
    };
}, function(err) {
    console.log("Fetch Error:", err);
});

//twitter.fetchTweets("tyrion lannister", null, 50);

// TODO: mongoose.disconnect();
