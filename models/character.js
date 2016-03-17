const mongoose = require('mongoose');

const characterSchema = mongoose.Schema({
    // character ID (from API)
    _id: {type: String, required: true, unique: true},

    // character name
    name: {type: String, required: true},

    // slug for character (unique ID for URL generated from name)
    // let's pray that there are no collisions for now
    slug: {type: String, required: true, unique: true},

    // total number of tweets
    total: {type: Number, default: 0},

    // how much is this character discussed lately?
    heat: {type: Number, default: 0},

    // current score (use something like distance weighting)
    popularity: {type: Number, default: 0},

    // date when document was last updated
    updated: {type: Date, default: Date.now}
});

var model = mongoose.model('Character', characterSchema);

// Add character to DB only if does not exist in the DB yet
// Returns a Promise
model.addIfNotExists = function(character) {
    return model.update(
        { _id: character._id },
        { $setOnInsert: character },
        { upsert: true }
    );
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

module.exports = model;
