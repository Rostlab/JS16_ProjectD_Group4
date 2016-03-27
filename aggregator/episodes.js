"use strict";

const cfg       = require('../core/config'),
      debug     = require('../core/debug')('aggregator/episodes', true),
      got       = require('../crawler/got'),
      fs        = require('fs'),
      mkdirp    = require('mkdirp');

var episodes = module.exports = {};

episodes.update = function() {
    return new Promise(function(resolve, reject) {
        got.fetchEpisodes().then(function(eps) {
            // CSV header
            var out = "date,code,title\n";

            // sort chronological
            eps.sort(function(a,b) {
                return (a.totalNr < b.totalNr) ? -1 : 1;
            });

            // entry for each episode
            for (var i = 0; i < eps.length; i++) {
                const ep = eps[i];
                const date   = ep.airDate.slice(0,10);
                const season = ep.season, nr = ep.nr;
                const code   = "S" + ((season > 9) ? season : "0"+season) +
                               "E" + ((nr > 9) ? nr : "0"+nr);

                out += date + "," + code + ",\"" + ep.name + "\"\n";
            }

            // write CSV file to disk
            mkdirp(cfg.csvpath, function(err) {
                if (!!err) {
                    debug.warn(err);
                }

                fs.writeFile(cfg.csvpath+'episodes.csv', out, function(err) {
                    if (!!err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        }).catch(reject);
    });
};
