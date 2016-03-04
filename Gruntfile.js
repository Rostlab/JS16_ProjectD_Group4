module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      all: [
        'app.js',
        'Gruntfile.js',
        'config/config.json',
        'controllers/*.js',
        'models/*.js'
      ],
      options: {
        curly: true,
        esversion: 6,
        eqeqeq: true,
        eqnull: true,
        node: true
    },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('test', ['jshint']);
};

