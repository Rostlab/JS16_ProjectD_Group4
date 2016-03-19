const fs = require('fs');

// read config
var cfg;
try {
    console.log("Parsing config...");
    cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch (e) {
    if (e.code === 'ENOENT') {
        console.log('Error: Config file not found!');
    } else {
        console.log('Error:', e);
    }
    process.exit(1);
}

module.exports = cfg;
