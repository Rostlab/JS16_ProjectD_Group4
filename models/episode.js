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

var exports = module.exports = mongoose.model('Episode', episodeSchema);

// Add episode to DB only if does not exist in the DB yet
// TODO: callbacks
exports.addIfNotExists = function(episode) {
    exports.update(
        { total: episode.total },
        { $setOnInsert: episode },
        { upsert: true },
        function(err, res) {
            if (err != null) {
                console.log("DEBUG: update episode", episode.total, "FAILED:", err);
            } else {
                console.log("DEBUG: update episode", episode.total, res);
            }
        }
    );
};

// Call function for each episode in DB
//  callback: function(episode)
//  onErr:    function(err)
exports.forEach = function(callback, onErr) {
    exports.find({}, function(err, episodes) {
        if (err !== null) {
            if (!!onErr) {
                onErr(err);
            }
            return;
        }
        episodes.forEach(callback);
    });
};
