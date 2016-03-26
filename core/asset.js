"use strict";

const path  = require('path');

module.exports = function(filename) {
    return String(path.resolve(__dirname, '..', filename));
};
