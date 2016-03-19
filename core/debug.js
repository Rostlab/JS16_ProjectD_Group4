"use strict";

function discard() {}

module.exports = function(prefix, enabled) {
    var logger = {};

    function log() {
        var args = Array.prototype.slice.call(arguments);
        console.log("["+prefix+"]", ...args);
    }

    function info() {
        var args = Array.prototype.slice.call(arguments);
        console.info("["+prefix+"][INFO]", ...args);
    }

    function warn() {
        var args = Array.prototype.slice.call(arguments);
        console.warn("["+prefix+"][WARN]", ...args);
    }

    function error() {
        var args = Array.prototype.slice.call(arguments);
        console.error("["+prefix+"][ERROR]", ...args);
    }

    function time(label) {
        console.time("["+prefix+"]"+label);
    }

    function timeEnd(label) {
        console.timeEnd("["+prefix+"]"+label);
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
