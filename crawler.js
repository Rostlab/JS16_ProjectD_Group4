// TODO: merge this into app.js
"use strict";

const twitter = require('./crawler/twitter'),
      got     = require('./crawler/got');


//twitter.fetchTweets("tyrion lannister", null, 50);
got.fetchCharacters(function(status, characters) {
    console.log(status);
    console.log(characters);
}, function(err) {
    console.log(err);
});
