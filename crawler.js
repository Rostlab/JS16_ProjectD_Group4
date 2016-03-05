// TODO: merge this into app.js
"use strict";

const twitter = require('./crawler/twitter');
      //got     = require('./crawler/got');

twitter.fetchTweets("tyrion lannister", null, 10);
