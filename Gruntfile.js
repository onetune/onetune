module.exports = function(grunt) {
  var config = {}
  grunt.initConfig({
    watch: {
        src: {
            files: ['frontend/scripts/*', '!frontend/scripts/app.min.js'],
            tasks: ['concat', 'uglify']
        },
        backend: {
            files: ['routes/*', 'sites/*', 'db/*', 'config/*', 'auth/*', 'admin/*'],
            options: {
              livereload: true
            }
        },
        less: {
            files: ['frontend/styles/*.less'],
            tasks: ['less'],
            options: {
              livereload: false
            }
        },
        css: {
            files: ['frontend/css/main.css'],
            options: {
              livereload: true
            }
        },
        options: {
            livereload: true
        }
    },
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: [
          'frontend/scripts/translations.js',
          'frontend/scripts/idbpolyfill.js',
          'frontend/scripts/idbstore.js',
          'frontend/scripts/underscore.js',
          'frontend/scripts/browser.js',
          'frontend/scripts/helpers.js',
          'frontend/scripts/underscore.js',
          'frontend/scripts/helpers.js',
          'frontend/scripts/fetchFeeds.js',
          'frontend/scripts/navigation.js',
          'frontend/scripts/notifications.js',
          'frontend/scripts/sockets.js',
          'frontend/scripts/templates.js',
          'frontend/scripts/player.js',
          'frontend/scripts/search.js',
          'frontend/scripts/add-tracks.js',
          'frontend/scripts/import.js',
          'frontend/scripts/errors.js',
          'frontend/scripts/recognition.js',
          'frontend/scripts/swfobject.js',
          'frontend/scripts/libdom.js',
          'frontend/scripts/library.js',
          'frontend/scripts/UI.js',
          'frontend/scripts/pubsub.js',
          'frontend/scripts/local.js',
          'frontend/scripts/remote.js',
          'frontend/scripts/queues.js',
          'frontend/scripts/radio-client.js',
          'frontend/scripts/report.js',
          'frontend/scripts/sync.js',
          'frontend/scripts/tracklist.js',
          'frontend/scripts/one.js',
          'frontend/scripts/songpicker.js',
          'frontend/scripts/userpage.js',
          'frontend/scripts/submit.js',
          'frontend/scripts/homepage.js',
          'frontend/scripts/itunes-colors.js',
          'frontend/scripts/colors.js',
          'frontend/scripts/homeView.js'
        ],
        dest: 'frontend/scripts/app.js'
      }
    },
    less: {
      production: {
        options: {
          compress: true,
          sourceMap: true
        },
        files: {
            "frontend/css/main.css": "frontend/styles/main.less"
        }
      }
    },
    nodemon: {
      dev: {
        script: 'app.js',
        ignoredFiles: ['README.md', 'node_modules/**'],
        watchedFolders: ['routes', 'sites', 'db', 'config', 'auth'],
        watchedExtensions: ['js', 'html']
      }
    },
    concurrent: {
      target: {
        tasks: ['watch', 'nodemon'],
        options: {
          logConcurrentOutput: true
        },
        cwd: __dirname
      }
    },
    uglify: {
      target: {
        files: {
          'frontend/scripts/app.min.js': ['frontend/scripts/app.js']
        }
      }
    },
    sshexec: {
    }
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-ssh');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.registerTask('minify', ['concat', 'uglify'])
  grunt.registerTask('css', ['less']);
  grunt.registerTask('default', ['concurrent']);
  grunt.registerTask('dev-deploy', ['sshexec:main']);
  grunt.registerTask('dev-soft-deploy', ['sshexec:soft_main']);
  grunt.registerTask('deploy', ['sshexec:supporter1', 'sshexec:supporter2']);
  grunt.registerTask('soft-deploy', ['sshexec:soft_supporter1', 'sshexec:soft_supporter2']);
};
