"use strict";

const cfg        = require('./core/config'),
      db         = require('./core/db'),
      debug      = require('./core/debug')('main', true),
      aggregator = require('./aggregator/aggregator');

var pkg = module.exports = {};

pkg.cfg = cfg;
pkg.init = function() {
    db.connect();
};

pkg.init();

