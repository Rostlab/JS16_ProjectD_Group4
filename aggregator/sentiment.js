"use strict";

const cfg      = require('../core/config'),
      polarity = require('polarity');

function tokenize(value) {
    return value.toLowerCase().match(/\S+/g);
}

module.exports = function(text) {
    polarity.inject(cfg.sentimentlist);
    return polarity(tokenize(text)).polarity;
};
