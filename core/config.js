const fs    = require('fs'),
      debug = require('../core/debug');

// read config
var cfg;
try {
    cfg = JSON.parse(fs.readFileSync('defaults.json', 'utf8'));
} catch (e) {
    if (e.code === 'ENOENT') {
        debug.log('Error: defaults.json not found!');
    } else {
        debug.log('Error:', e);
    }
    process.exit(1);
}

module.exports = cfg;
