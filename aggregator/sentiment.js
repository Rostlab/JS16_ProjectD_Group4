const polarity = require('polarity');

function tokenize(value) {
    return value.toLowerCase().match(/\S+/g);
}

module.exports = function(text) {
    return polarity(tokenize(text)).polarity;
};
