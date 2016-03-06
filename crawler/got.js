const cfg = require('../core/config'),
    https = require('https');

var exports = module.exports = {};

// Make an API GET request and return response as JSON
//  onSuccess: function(status, jsonResponse)
//  onErr:     function(err)
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
            onSuccess(res.statusCode, JSON.parse(data));
        });
    });

    // add onErr callback, if exists
    if (!!onErr) {
        req.on('error', onErr);
    }

    req.end();
}

// Get all characaters as JSON
//  onSuccess: function(status, characters)
//  onErr:     function(err)
exports.fetchCharacters = function(onSuccess, onErr) {
    apiGet('characters', onSuccess, onErr);
};
