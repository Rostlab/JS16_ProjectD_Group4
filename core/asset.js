"use strict";

const fs    = require('fs'),
      path  = require('path'),
      debug = require('../core/debug')('core/config', true);

function serve(p, req, res) {
    fs.readFile(p, function (err, data) {
        if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
        }
        res.writeHead(200);
        res.end(data);
    });
}

module.exports = function(filename) {
    var p = String(path.resolve(__dirname, '..', filename));
    return {
        "path": p,
        "serve": function(req, res) {
            serve(p, req, res);
        }
    };
};
