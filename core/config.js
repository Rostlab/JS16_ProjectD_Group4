"use strict";

const fs    = require('fs'),
      path  = require('path'),
      debug = require('../core/debug')('core/config', true);

const cfgPath = path.resolve(__dirname, '../defaults.json');

// read config
var cfg;
try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
} catch (e) {
    if (e.code === 'ENOENT') {
        debug.error('defaults.json not found!');
    } else {
        debug.error(e);
    }
    process.exit(1);
}

// removes duplicate items from given array (nice, eh?)
function deduplicate(a) {
    var res = [];
    var key = {};
    a.map(function(v) {
        key[v] = key[v] || res.push(v);
    });
    return res;
}

// extend base object with ext object
// leaf attribute are overwritten, arrays appended (duplicate free).
// no new properties are added
function extend(base, ext) {
    for (var attr in base) {
        if (ext.hasOwnProperty(attr)) {
            // Objects and Arrays
            if (typeof base[attr] === 'object') {
                if (Array.isArray(base[attr])) {
                    if (!Array.isArray(ext[attr])) {
                        throw 'Value for ' + attr + ' not an Array: ' + ext;
                    }
                    base[attr] = deduplicate(base[attr].concat(ext[attr]));
                } else {
                    if (typeof ext[attr] !== 'object') {
                        throw 'Value for ' + attr + ' not an Object: ' + ext;
                    }
                    extend(base[attr], ext[attr]);
                }

            // Value
            } else {
                base[attr] = ext[attr];
            }
        }
    }
}

// let user overwrite cfg defaults
cfg.extend = function(json) {
    if (typeof json !== 'object') {
        throw 'Not JSON: ' + json;
    }
    extend(cfg, json);
};

module.exports = cfg;
