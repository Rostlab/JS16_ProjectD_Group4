const mongoose = require('mongoose');

// to consider:
// - tweet can mention more than one character
// - number of retweets and favorites can change
// => tweets inserted once for each character, maybe with different scoring

const tweetSchema = mongoose.Schema({
    // character id from character Schema
    character: {type: mongoose.Schema.Types.ObjectId, ref: 'Character'},

    //character name: {type: String, required:true},
    name:{type: String, required: true},

    // unique tweet ID (from twitter)
    uid: {type: String, required: true},

    // text
    text: {type: String, required: true},

    // language of tweet text
    lang: {type: String, default: "en"},

    // retweet count
    retweets: {type: Number, default: 0},

    // favorite count
    favorites: {type: Number,default: 0},

    // sentiment score for tweet's text
    sentiment: {type: Number, default: 0},

    // date when tweet was created
    created: {type: Date, required: true},

    // date when document was last updated
    updated: {type: Date, default: Date.now}
});

var model = mongoose.model('Tweet', tweetSchema);

// Add tweet to DB only if does not exist in the DB yet
// Returns a Promise
model.addIfNotExists = function(tweet) {
    return model.update(
        { uid: tweet.uid },
        { $setOnInsert: tweet },
        { upsert: true }
    );
};

module.exports = model;
