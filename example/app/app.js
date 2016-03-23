"use strict";

const express  = require('express'),
      exphbs   = require('express-handlebars');

// gotsentimental package
const gotsent = require('../../');

const cfg = require('./config.json');

// adjust config by passing an object with attributes that should be overwritten
gotsent.cfg.extend(cfg.gotsent);

// initialize the gotsentimental package
gotsent.init();

// load controllers
const ctrData = require('./controllers/data');

// init express application
const app = express();
app.engine('.html', exphbs({extname: '.html'}));
app.set('view engine', '.html');

// register routes
app.get('/', function(req, resp) {

    // get top lists

    // those are async funcs to we have to wait until the Promises are resolved.
    // but we can do it in parallel and sync them with Promise.all:
    var ps = [];
    ps[0] = gotsent.mostPopular();
    ps[1] = gotsent.mostHated();
    ps[2] = gotsent.mostDiscussed();

    // wait for all Promises to be resolved
    Promise.all(ps).then(function(results) {
        // use the results of all 3 Promises
        resp.render("top", {
            mostPopular:   results[0],
            mostHated:     results[1],
            mostDiscussed: results[2]
        });
    })
});
app.use('/csv/:slug.csv', ctrData);

app.use('/chart.css', gotsent.css.serve);
app.use('/chart.js', gotsent.js.serve);

// serve static content from /assets dir
const oneDay = 86400000;
app.use('/assets', express.static(__dirname + '/assets', { maxAge: oneDay }));

app.get('/:slug', function(req, res) {
    res.render("chart");
});

// start server
app.listen(cfg.port);
console.log('server running on port ' + cfg.port);
