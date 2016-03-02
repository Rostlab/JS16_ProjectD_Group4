'use strict';

// config
const PORT = 1337;

// load required packages
const express = require('express');

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
app.listen(PORT);
console.log('server running on port ' + PORT);
