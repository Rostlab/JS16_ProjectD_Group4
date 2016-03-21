"use strict";

const cfg          = require('../core/config'),
      debug        = require('../core/debug')('crawler/blacklist', true);

var blacklist = module.exports = {};

function hasSpace(str) {
    return str.indexOf(' ') >= 0;
}

blacklist.filter = function(name) {
    name = name.trim();

    // 4 chars or less is really too generic
    if (name.length < 5) {
        return true;
    }

    // whitelist is a... whitelist?!
    if (cfg.whitelist.indexOf(name) > -1) {
        return false;
    }

    // likewise anything on the blacklist should be filtered
    if (cfg.blacklist.indexOf(name) > -1) {
        return true;
    }

    // everything below might be very wrong
    // let's apply some black magic and hope for the best

    if (name.length < 7 || !hasSpace(name)) {
        debug.warn("filtered unclassified:", name);
        return true;
    }

    var words = name.split(' ');
    var l3 = 0;
    var l4 = 0;
    var l5 = 0;
    for (var i = 0; i < words.length; i++) {
        switch(words[i].length) {
            case 0:
            case 1:
            case 2:
                continue;
            case 3:
                l3++;
                break;
            case 4:
                l4++;
                break;
            case 5:
                l5++;
                break;
            default: // > 5
                return false;
        }
    }
    var l4p = l4+l5;
    var l3p = l4p + l3;
    if (l4p >= 2 || l3p >= 3) {
        return false;
    }

    debug.warn("filtered unclassified:", name);
    return true;
};
