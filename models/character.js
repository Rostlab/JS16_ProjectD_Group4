"use strict";

const mongoose = require('mongoose'),
      db       = require('../core/db');

const characterSchema = mongoose.Schema({
    // character name
    name: {type: String, required: true, unique: true},

    // slug for character (unique ID for URL generated from name)
    // let's pray that there are no collisions for now
    slug: {type: String, required: true, unique: true},

    // total number of tweets
    total: {type: Number, default: 0},

    // total number of positive tweets
    positive: {type: Number, default: 0},

    // total number of negative tweets
    negative: {type: Number, default: 0},

    // how much is this character discussed lately?
    heat: {type: Number, default: 0},

    // current score (use something like distance weighting)
    popularity: {type: Number, default: 0},

    // date when document was last updated
    updated: {type: Date, default: null}
});

var model = db.model('CharacterSentiment', characterSchema);

// Add character to DB only if does not exist in the DB yet
// Returns a Promise
model.addIfNotExists = function(character) {
    return model.update(
        { name: character.name },
        { $setOnInsert: character },
        { upsert: true }
    );
};

model.byName = function(characterName) {
    return model.findOne({ name: characterName });
};

// Call function for each character in DB
//  callback: function(character)
// Returns a Promise
model.forEach = function(callback) {
    return new Promise(function(resolve, reject) {
        model.find({}).exec().then(function(characters) {
            var ps = characters.map(callback);
            Promise.all(ps).then(resolve, reject);
        }, reject);
    });
};

// Returns a Promise for an array of all characters in DB
model.list = function() {
    return model.find({}).exec();
};

module.exports = model;
