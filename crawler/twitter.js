const cfg  = require('../core/config'),
      twit = require('twitter');

var exports = module.exports = {};

// init twitter API client
const twitter = new twit(cfg.twitter);


var d = new Date();
cald = d.setDate(d.getDate() - 4);
var tillDate = d.getDate();

//Fetch the tweets using twitter api and display in console
exports.fetchTweets = function(query, maxID, i) {
    console.log('DEBUG:', 'twitter.fetchTweets', query, maxID, i);
    twitter.get('search/tweets', {
        q: query,
        include_entities: false,
        count: 100,
        max_id: maxID
    }, function(err, data, resp) {
        if (err !== null) {
            console.log("Error:", err);
            return;
        }

        if (typeof data.statuses !== "object" || data.statuses.length < 1) {
            console.log("No data!");
            return;
        }

        const oldestStatus = data.statuses[data.statuses.length-1];
        const oldestID_str = oldestStatus.id_str;
        const oldestID = parseInt(oldestID_str);

        console.log(maxID, oldestID_str, oldestID, oldestStatus.created_at, '\n');

        /*
        data.statuses[0].created_at.split(' ').splice(1, 2).join(' ');
        var split = data.statuses[0].created_at.split(' ');
        var year = split[split.length - 1];
        var date_calc = split[split.length - 4];
        //console.log(date_calc);
        //console.log(year, data.search_metadata.count);

        try {
            var_max_id = data.statuses[99].id;
        } catch (err) {}
        //console.log(" printing id :"+data.statuses[i].id);

        for (var count = 0; count < data.search_metadata.count; count++) {
            console.log(data.statuses[count].lang,
                data.statuses[count].created_at,
                data.statuses[count].id,
                data.statuses[count].text,
                data.statuses[count].retweet_count,
                data.statuses[count].favorite_count);

            //simple json record
            var document = {
                "lang": data.statuses[count].lang,
                "created_at": data.statuses[count].created_at,
                "id": data.statuses[count].id,
                "text": data.statuses[count].text,
                "retweet_count": data.statuses[count].retweet_count,
                "favorite_count": data.statuses[count].favorite_count
            };
              //insert record
                if (err) throw err;
                db.collection('got_db').insert(document, function(err, records) {
                console.log("Record added");
              });
        }

        console.log(date_calc, till_date);
        if (date_calc == till_date) {} else {
            fetchTweets(i + 1);
        }*/

        if (i > 1) {
            exports.fetchTweets(query, oldestID, i-1);
        }
    });
};
