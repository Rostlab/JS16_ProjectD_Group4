const cfg     = require('../core/config'),
      debug   = require('../core/debug')('crawler/mobile', true),
      https   = require('https'),
      twitter = require('../crawler/twitter');

var exports = module.exports = {};

function get(url) {
    return new Promise(function(resolve, reject) {
        var req = https.get(url, function(res) {
            var data = '';

            res.on('data', function(chunk) {
                data += chunk;
            });

            res.on('end', function() {
                if (res.statusCode === 200) {
                    resolve(data);
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

function matchIDs(str) {
    const re = /<div class="tweet-text" data-id="([0-9]+)">/g;

    var ids = [];
    var match;
    while (match = re.exec(str)) {
        ids.push(match[1]);
    }
    return ids;
};

function saveIDs(characterID, ids) {
    twitter.getTweetsList(ids).then(function(tweets) {
        const ps = Promise.all(tweets.map(function(tweet) {
            return twitter.saveTweet(characterID, tweet);
        })).then(function(res) {
            var found    = res.length,
                inserted = 0;
            res.forEach(function(r) {
                if(!!r.upserted) {
                    inserted++;
                }
            });

            debug.log(characterID, {found: found, inserted: inserted});
        }, debug.error);
    });
}

// Returns a Promise (resolved with JSON)
exports.crawl = function(character) {
    const searchURL = 'https://mobile.twitter.com/search?q=';
    var url = searchURL + character.name.split(' ').join('+') + '&s=typd';

    (function loop(url, i) {
        get(url).then(function(res) {
            var next = res.match(/search\?q=(.+)"> Load older Tweets/);
            if (next) {
                var ids = matchIDs(res);
                saveIDs(character.id, ids);

                loop(searchURL + next[1], ++i);
            } else {
                debug.error("OOOOOPS!!", i, url);
                debug.log(res);
            }
        }, debug.error);
    })(url, 0);
};
