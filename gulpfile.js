var gulp = require("gulp");
var jshint = require("gulp-jshint");
var cache = require("gulp-cached");
var jasmine = require("gulp-jasmine");
var symlink = require("gulp-symlink");

var jshintConfig = {
    curly: true,
    esversion: 6,
    eqeqeq: true,
    eqnull: true,
    node: true
};

var jasmineOpts = {};
jasmineOpts.config = {
    "spec_dir": "spec",
    "spec_files": [
        "**/*[sS]pec.js"
    ],
    "helpers": [
        "helpers/**/*.js"
    ],
    "stopSpecOnExpectationFailure": false,
    "random": false
};

gulp.task("lint", function() {
    return gulp.src("./*.js")
        .pipe(cache("linting"))
        .pipe(jshint(jshintConfig))
        .pipe(jshint.reporter("jshint-stylish"))
        .pipe(jshint.reporter("fail", {
            ignoreWarnings: false
        }));
});

gulp.task("test", ["lint"], function() {
    return gulp.src("./spec/*.js")
        .pipe(jasmine(jasmineOpts));
});

gulp.task('hook', function() {
    return gulp.src(".pre-commit")
        .pipe(symlink(".git/hooks/pre-commit"));
});
