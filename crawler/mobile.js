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

// Returns a Promise (resolved with JSON)
exports.crawl = function(character) {
    var url = 'https://mobile.twitter.com/search?q=' +
            character.name.split(' ').join('+') +
            '&s=typd&x=13&y=16';

    (function loop(url, i) {
        get(url).then(function(res) {
            i++;
            var ex = res.match(/search\?q=(.+)"> Load older Tweets/);
            if (ex.length >= 2) {
                console.log(i)
                var url = 'https://mobile.twitter.com/search?q=' + ex[1];
                loop(url, i);
            } else {
                console.log("OOOOOPS!!", i, res)
            }
        }, console.log);
    })(url, 0);
};
