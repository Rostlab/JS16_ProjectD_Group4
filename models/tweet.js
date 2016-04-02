"use strict";

const mongoose = require('mongoose'),
      db       = require('../core/db');

// to consider:
// - tweet can mention more than one character
// - number of retweets and favorites can change
// => tweets inserted once for each character, maybe with different scoring

const tweetSchema = new mongoose.Schema({
    // character name. don't point fingers at us, not our idea...
    character: { type: String, required: true, index: true },

    // unique tweet ID (from twitter)
    uid: { type: String, required: true },

    // text
    text: { type: String, required: true },

    // language of tweet text
    lang: { type: String, default: "en" },

    // retweet count
    retweeted: { type: Number, default: 0 },

    // favorite count
    favorited: { type: Number, default: 0 },

    // date when tweet was created
    created: { type: Date, required: true, index: true }
});

tweetSchema.index({character: 1, uid: 1}, {unique: true});

var model = db.model('Tweet', tweetSchema);

// Add tweet to DB only if does not exist in the DB yet
// Returns a Promise
model.addIfNotExists = function(tweet) {
    return model.update(
        { character: tweet.character, uid: tweet.uid },
        { $setOnInsert: tweet },
        { upsert: true }
    );
};

model.findByCharacterName = function(characterName) {
    return model.find({ character: characterName });
};

module.exports = model;
