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
gotsent.startUpdateLoop();

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
    ps[0] = gotsent.stats();
    ps[1] = gotsent.mostPopular();
    ps[2] = gotsent.mostHated();
    ps[3] = gotsent.mostDiscussed();

    // wait for all Promises to be resolved
    Promise.all(ps).then(function(results) {
        // use the results of all 4 Promises
        resp.render("top", {
            stats:         results[0],
            mostPopular:   results[1],
            mostHated:     results[2],
            mostDiscussed: results[3]
        });
    })
});

// serve required static files (chart.css, chart.js and CSV folder)
app.get('/assets/chart.css', function(req,res) {
    res.sendFile(gotsent.css);
});
app.get('/assets/chart.js', function(req,res) {
    res.sendFile(gotsent.js);
});
const oneHour = 3600000;
app.use('/csv', express.static(__dirname + '/csv', { maxAge: oneHour }));

// serve static content from /assets dir
const oneDay = 24 * oneHour;
app.use('/assets', express.static(__dirname + '/assets', { maxAge: oneDay }));

app.get('/:slug', function(req, res) {
    res.render("chart", {slug: req.params.slug});
});

// start server
app.listen(cfg.port);
console.log('server running on port ' + cfg.port);
