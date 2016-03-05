"use strict";

const fs       = require('fs'),
      express  = require('express'),
      exphbs   = require('express-handlebars'),
      mongoose = require('mongoose');

// read config
var cfg;
try {
    cfg = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));
} catch (e) {
    if (e.code === 'ENOENT') {
        console.log('Error: Config file not found!');
    } else {
        console.log('Error:', e);
    }
    process.exit(1);
}
GLOBAL.cfg = cfg;

// connect to mongodb
mongoose.connect(cfg.mongodb.uri);

// init express application
const app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

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
