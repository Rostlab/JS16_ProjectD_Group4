"use strict";

const fs = require('fs');
const express = require('express');

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

// init express application
const app = express();
const router = express.Router();

// register routes
router.get('/', function(req, res) {
  res.end('Yippeeee!');
});

// serve static content from /public dir
const oneDay = 86400000;
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

// start server
app.use(router);
app.listen(cfg.port);
console.log('server running on port ' + cfg.port);
