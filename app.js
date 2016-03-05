"use strict";

const cfg      = require('./core/config'),
      express  = require('express'),
      exphbs   = require('express-handlebars'),
      mongoose = require('mongoose');

// connect to mongodb
mongoose.connect(cfg.mongodb.uri);

// init express application
const app = express();
app.engine('.html', exphbs({defaultLayout: 'main', extname: '.html'}));
app.set('view engine', '.html');

// register routes
app.get('/', function(req, res) {
    res.render("home");
});

// serve static content from /public dir
const oneDay = 86400000;
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

// start server
app.listen(cfg.port);
console.log('server running on port ' + cfg.port);
