const retext    = require('retext'),
      sentiment = require('retext-sentiment');

const processor = retext().use(sentiment);

module.exports = function(text) {
    var sentimentScore = 0;
    processor.process(text, function (err, file) {
        sentimentScore = file.data.retext.tree.data.polarity;
    });
    return sentimentScore;
};
