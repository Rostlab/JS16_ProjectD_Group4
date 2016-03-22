"use strict";

const cfg        = require('../core/config'),
      debug      = require('../core/debug')('core/db', true),
      mongoose   = require('mongoose');

var db = module.exports = mongoose.createConnection();

function nop() { }


db.connect = function() {
    db.connect = nop;

    db.open(cfg.mongodb.uri);
    db.once('open', function () {
        debug.info('connected.');
    });
};
