const cfg = require('../core/config'),
    https = require('https');

var exports = module.exports = {};

function apiGet(path, onSuccess, onErr) {
    var req = https.request({
        host: cfg.api.host,
        path: cfg.api.prefix + path,
        method: 'GET'
    }, function(res) {
        var data = '';

        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function() {
            onSuccess(res.statusCode, JSON.parse(data))
        });
    });

    // add onErr callback, if exists
    if (!!onErr) {
        req.on('error', onErr);
    }

    req.end();
}

exports.fetchCharacters = function(onSuccess, onErr) {
    apiGet('characters', onSuccess, onErr);
}
