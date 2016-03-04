module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      all: [
	'app.js',
	'Gruntfile.js',
	'config/config.json',
        'controllers/*.js',
	'models/*.js',
      ]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('test', ['jshint']);
};

