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

function retryIfRateLimited(err, callback) {
    // check if it was because of rate-limiting
    // if yes, wait for time stated in header
    if(!!err && !!err.headers && err.err.length === 1 &&
       (err.err[0].code === twitter.codeRateLimited)) {

        var reset = err.headers['x-rate-limit-reset'];
        if (!!reset) {
            // determine wait time in seconds
            var timeout = (reset - Math.floor(new Date() / 1000));

            // Add 5 seconds extra because auf async clock etc
            timeout += 5;

            debug.log("RL TIMEOUT", timeout+"s [" + new Date(reset*1000) + "]");
            setTimeout(callback, timeout*1000);
            return true
        }
        return false
    }
}

function saveIDs(characterID, ids) {
    return new Promise(function(resolve, reject) {
        twitter.getTweetsList(ids).then(function(tweets) {
             // currently DB stuff still async
            resolve(true);

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

                debug.log(characterID, {found: found, inserted: inserted}, tweets[tweets.length-1].created_at);
            }, debug.error);
        }, function(err) {
            function retry() {
                saveIDs(characterID, ids).then(resolve, reject);
            }
            if (!retryIfRateLimited(err, retry)) {
                // otherwise stuff went wrong
                reject(err);
            }
        }).catch(reject);
    });
}

// Returns a Promise (resolved with JSON)
exports.crawl = function(character) {
    const searchURL = 'https://mobile.twitter.com/search?q=';
    const nextRe    = /search\?q=(.+)"> Load older Tweets/;

    var url = searchURL + character.name.split(' ').join('+') + '&s=typd';
    var ids = [];

    (function loop() {
        get(url).then(function(res) {
            var next = res.match(nextRe);
            if (next) {
                url = searchURL + next[1];
                ids = ids.concat(matchIDs(res));
                if (ids.length >= 100) {
                    var save = ids.splice(0,100);
                    saveIDs(character.id, save).then(function(res) {
                        loop();
                    }, function(err) {
                        debug.error("saveIDs.error", err);
                    });
                } else {
                    loop();
                }
            } else {
                debug.error("OOOOOPS!!", i, url);
                debug.log(res);
            }
        }, debug.error);
    })();
};
