const cfg   = require('../core/config'),
      https = require('https');

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

// Returns a Promise (resolved with JSON)
exports.crawl = function(character) {
    const searchURL = 'https://mobile.twitter.com/search?q=';
    var url = searchURL +
            character.name.split(' ').join('+') +
            '&s=typd&x=13&y=16';

    (function loop(url, i) {
        get(url).then(function(res) {
            i++;
            var next = res.match(/search\?q=(.+)"> Load older Tweets/);
            if (next.length >= 2) {
                console.log(i, matchIDs(res));

                loop(searchURL + next[1], i);
            } else {
                console.log("OOOOOPS!!", i, res)
            }
        }, console.log);
    })(url, 0);
};
