const mongoose = require('mongoose');

// to consider:
// - tweet can mention more than one character
// - number of retweets and favorites can change
// => tweets inserted once for each character, maybe with different scoring

const tweetSchema = mongoose.Schema({
    // for which character?
    character: {type: mongoose.Schema.Types.ObjectId, ref: 'Character'},

    // unique tweet ID (from twitter)
    uid: {type: string, required: true},

    // text
    text: {type: String, required: true},

    // language of tweet text
    lang: {type: String, default: "en"},

    // retweet count
    retweets: {type: Number, default: 0},

    // sentiment score for tweet's text
    sentiment: {type: Number, default: 0},

    // date when tweet was created
    created: {type: Date, required: true},

    // date when document was last updated
    updated: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Tweet', tweetSchema);
