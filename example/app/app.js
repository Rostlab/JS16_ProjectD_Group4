"use strict";

const express  = require('express'),
      exphbs   = require('express-handlebars');

const gotsent = require('../../');

const cfg = require('./config.json');

gotsent.cfg.extend(cfg.gotsent);
gotsent.init();

// load controllers
const ctrData = require('./controllers/data');

// init express application
const app = express();
app.engine('.html', exphbs({defaultLayout: 'main', extname: '.html'}));
app.set('view engine', '.html');

// register routes
app.get('/', function(req, res) {
    res.render("home");
});
app.use('/csv/:slug.csv', ctrData);

// serve static content from /assets dir
const oneDay = 86400000;
app.use('/assets', express.static(__dirname + '/assets', { maxAge: oneDay }));

app.get('/:slug', function(req, res) {
    res.render("chart");
});

// start server
app.listen(cfg.port);
console.log('server running on port ' + cfg.port);
