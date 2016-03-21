"use strict";

function discard() {}

module.exports = function(prefix, enabled) {
    var logger = {};

    function log() {
        var args = Array.prototype.slice.call(arguments);
        console.log("[\x1b[36m"+prefix+"\x1b[0m]", ...args);
    }

    function info() {
        var args = Array.prototype.slice.call(arguments);
        console.info("[\x1b[36m"+prefix+"\x1b[0m][\x1b[32mINFO\x1b[0m]", ...args);
    }

    function warn() {
        var args = Array.prototype.slice.call(arguments);
        console.warn("[\x1b[36m"+prefix+"\x1b[0m][\x1b[33mWARN\x1b[0m]", ...args);
    }

    function error() {
        var args = Array.prototype.slice.call(arguments);
        console.error("[\x1b[36m"+prefix+"\x1b[0m][\x1b[31mERROR\x1b[0m]", ...args);
    }

    function time(label) {
        console.time("[\x1b[36m"+prefix+"\x1b[0m] "+label);
    }

    function timeEnd(label) {
        console.timeEnd("[\x1b[36m"+prefix+"\x1b[0m] "+label);
    }

    logger.disable = function() {
        logger.log = logger.info = logger.warn = logger.error = logger.time =
            logger.timeEnd = logger.assert = logger.trace = discard;
    };

    logger.enable = function() {
        logger.log     = log;
        logger.info    = info;
        logger.warn    = warn;
        logger.error   = error;
        logger.time    = time;
        logger.timeEnd = timeEnd;
        logger.assert  = console.assert;
        logger.trace   = console.trace;
    };

    if (enabled) {
        logger.enable();
    }

    return logger;
};
