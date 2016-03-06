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
// TODO: callbacks
model.addIfNotExists = function(character) {
    model.update(
        { _id: character._id },
        { $setOnInsert: character },
        { upsert: true },
        function(err, res) {
            if (err != null) {
                console.log("DEBUG: update character", character.name, "FAILED:", err);
            } else {
                console.log("DEBUG: update character", character.name, res);
            }
        }
    );
};

// Call function for each character in DB
//  callback: function(character)
//  onErr:    function(err)
model.forEach = function(callback, onErr) {
    model.find({}, function(err, characters) {
        if (err !== null) {
            if (!!onErr) {
                onErr(err);
            }
            return;
        }
        characters.forEach(callback);
    });
};

module.exports = model;
