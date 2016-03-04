const mongoose = require('mongoose');

const episodeSchema = mongoose.Schema({
    // overall episode number
    total: Number,

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

module.exports = mongoose.model('Episode', episodeSchema);
