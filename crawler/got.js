"use strict";

const cfg       = require('../core/config'),
      blacklist = require('../crawler/blacklist'),
      Character = require('../models/character'),
      http      = require('http'),
      https     = require('https'),
      slug      = require('slug');

var got = module.exports = {};

// Make an API GET request and return response as JSON
// Returns a Promise (resolved with JSON)
function apiGet(path) {
    return new Promise(function(resolve, reject) {
        var proto = (cfg.api.https) ? https : http;
        var req = proto.request({
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
                        status: res.statusCode,
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
got.fetchEpisodes = function() {
    return apiGet('episodes');
};

// Get all characaters as JSON
// Returns a Promise (resolved with JSON)
got.fetchCharacters = function() {
    return apiGet('characters');
};

// TODO: fetch and add episodes when the API is ready
function saveCharacter(character) {
    if (blacklist.filter(character.name)) {
        return;
    }

    // TODO: skip if created / updated date < last checked date
    return Character.addIfNotExists({
        "_id":        character._id,
        "name":       character.name,
        "slug":       slug(character.name, {lower: true}), // TODO
        "total":      0,
        "positive":   0,
        "negative":   0,
        "popularity": 0,
        "heat":       0
    });
}

got.updateCharacters = function() {
    return new Promise(function(resolve, reject) {
        // Fetch characters from API and then save each to DB
        got.fetchCharacters().then(function(characters) {
            return Promise.all(characters.map(saveCharacter));
        }).then(function(res) {
            var total = res.length, filtered = 0, found = 0, inserted = 0;
            if (Array.isArray(res)) {
                for (var i = 0; i < total; i++) {
                    if (res[i] === undefined) {
                        filtered++;
                        continue;
                    }
                    found++;
                    if(!!res[i].upserted) {
                        inserted++;
                    }
                }
            }
            resolve({
                total:    total,
                filtered: filtered,
                found:    found,
                inserted: inserted,
            });
        }).catch(reject);
    });
};
