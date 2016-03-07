module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      all: [
        'app.js',
        'config.json',
        'Gruntfile.js',
        'crawler/*.js',
        'controllers/*.js',
        'models/*.js',
        'public/js/*.js'
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

