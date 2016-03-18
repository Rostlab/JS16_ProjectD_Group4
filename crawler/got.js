const cfg = require('../core/config'),
    https = require('https');

var exports = module.exports = {};

// Make an API GET request and return response as JSON
// Returns a Promise (resolved with JSON)
function apiGet(path) {
    return new Promise(function(resolve, reject) {
        var req = https.request({
            hostname: cfg.api.host,
            path:     cfg.api.prefix + path,
            method:  'GET'
        }, function(res) {
            var data = '';

            res.on('data', function(chunk) {
                data += chunk;
            });

            res.on('end', function() {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject({
                        status: statusCode,
                        data:   data
                    });
                }
            });
        });

        req.on('error', function(err) {
            reject(err);
        });

        req.end();
    });
}

// Get all episodes as JSON
// Returns a Promise (resolved with JSON)
exports.fetchEpisodes = function() {
    return apiGet('episodes');
};

// Get all characaters as JSON
// Returns a Promise (resolved with JSON)
exports.fetchCharacters = function() {
    return apiGet('characters');
};
