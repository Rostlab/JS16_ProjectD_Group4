const mongoose = require('mongoose');

const characterSchema = mongoose.Schema({
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

module.exports = mongoose.model('Character', character);
