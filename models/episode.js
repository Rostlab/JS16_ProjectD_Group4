const mongoose = require('mongoose');

const episodeSchema = mongoose.Schema({
    // overall episode number
    total: {type: Number, required: true, unique: true},

    // episode number in season
    nr: {type: Number, required: true},

    // season this episode belongs to
    season: Number,

    // episode title
    title: String,

    // date when the episode (first) aired
    aired: {type: Date, required: true},

    // date when document was last updated
    updated: {type: Date, default: Date.now}
});

var model = mongoose.model('Episode', episodeSchema);

// Add episode to DB only if does not exist in the DB yet
// Returns a Promise
model.addIfNotExists = function(episode) {
    return model.update(
        { total: episode.total },
        { $setOnInsert: episode },
        { upsert: true }
    );
};

// Call function for each episode in DB
//  callback: function(episode)
//  onErr:    function(err)
model.forEach = function(callback, onErr) {
    model.find({}, function(err, episodes) {
        if (err !== null) {
            if (!!onErr) {
                onErr(err);
            }
            return;
        }
        episodes.forEach(callback);
    });
};

module.exports = model;

