/* global require, console */

'use strict';

/* global require */
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var beautify = require('gulp-js-beautify');
var karma = require('gulp-karma');
var mocha = require('gulp-mocha');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var gulpFilter = require('gulp-filter');
var nodemon = require('gulp-nodemon');
var winston = require('winston');
var fs = require('fs');
var sass = require('gulp-sass');
var connect = require('gulp-connect');
var colors = require('colors');
var minifyCSS = require('gulp-minify-css');
var watch = require('gulp-watch');
var webdriverUpdate = require('gulp-protractor').webdriver_update;
var protractor = require('gulp-protractor').protractor;
// var lr = require('tiny-lr');
// var server = lr();
//
var gm = require('gm');
var _ = require('lodash');
var exec = require('child_process').exec;

var defaults = {};

// Set up logger.
function makeLogger(level) {
  return new(winston.Logger)({
    transports: [
      new(winston.transports.Console)({
        level: level
      }),
    ]
  });
}
var logger = makeLogger('info');

defaults.clientScripts = [
  'client/app/**/*.js'
];

defaults.serverScripts = [
  'server/app.js',
  'server/lib/**/*.js'
];

defaults.allScripts = defaults.clientScripts.concat(defaults.serverScripts);

defaults.clientTestScripts = [
  // app and test code
  'client/app/**/*.js'
];

defaults.serverTestScripts = [
  'server/lib/**/*.test.js'
];

defaults.serverE2ETestScripts = [
  'server/lib/**/*-scenarios.js'
];

// Makes a task that runs or watches client-side tests using Karma.
function makeKarmaTask(action, options) {
  options = options || {};
  var files = options.vendor || [];
  files = files.concat(options.files || defaults.clientTestScripts);

  logger.debug('Setting up a karma task to run on the following files:');
  files.forEach(function (file) {
    logger.debug('  ', file);
  });

  return function () {
    // Be sure to return the stream
    return gulp.src(files)
      .pipe(karma({
        configFile: options.karmaConf || 'client/testing/karma.conf.js',
        action: action
      }))
      .on('error', function (err) {
        // Make sure failed tests cause gulp to exit non-zero
        throw err;
      });
  };
}

// Makes a task that runs Karma.
exports.karma = function (options) {
  options = options || {};
  return makeKarmaTask('run', options);
};

// Makes a task that runs Karma in watch mode.
exports.karmaWatch = function (options) {
  options = options || {};
  return makeKarmaTask('watch', options);
};

// Makes a task that runs Mocha. (Use this for server-side tests.)
exports.mocha = function (options) {
  options = options || {};
  var files = options.files || defaults.serverTestScripts;
  return function () {
    gulp.src(files)
      .pipe(mocha({
        reporter: 'nyan'
      })).on('error', function (err) {
        console.log("Errrr", err);
      })
      .on('end', function () {
        console.log('Donnnn');
      });
  };
};

exports.webdriverUpdate = function () {
  return webdriverUpdate;
}

// Makes a task that runs or watches client-side tests using Karma.
exports.protractor = function (options) {
  options = options || {};
  var files = options.vendor || [];
  files = files.concat(options.files || defaults.serverE2ETestScripts);

  logger.debug('Setting up a protractor task to run on the following files:');
  files.forEach(function (file) {
    logger.debug('  ', file);
  });

  return function (cb) {
    // Be sure to return the stream
    return gulp.src(files)
      .pipe(protractor({
        configFile: options.protractorConf ||
          'client/testing/protractor.conf.js',
        args: ["--baseUrl", options.baseUrl]
      }))
      .on('error', function (err) {
        // Make sure failed tests cause gulp to exit non-zero
        throw err;
      })
      .on('end', function () {
        console.log('Donnnn');
      });
  };
};

// Makes a task that runs JSHint on all script files.
exports.jshint = function (options) {
  options = options || {};
  return function () {
    gulp.src(options.files || defaults.allScripts)
      .pipe(jshint())
      .pipe(jshint.reporter('default'));
  };
};

// Makes a task that runs JSBeautify on all script and test files.
exports.beautify = function (options) {
  options = options || {};
  var jsBeautifyConfigFile = options.configFile || '.jsbeautifyrc';
  var jsBeautifyConfig = JSON.parse(fs.readFileSync(jsBeautifyConfigFile));
  var files = options.files || defaults.allScripts;
  return function () {
    files.forEach(function (path) {
      var dir = path.split('/')[0];
      gulp.src([path])
        .pipe(beautify(jsBeautifyConfig))
        .pipe(gulp.dest(dir));
    });
  };
};

// Makes a task that runs JSBeautify on all script and test files.
exports.concatAndUglify = function (options) {
  options = options || {};
  var name = options.name || 'all';
  var distFolder = options.dest || 'client/dist';
  var filter = gulpFilter(function (file) {
    return !/\.test\.js$/.test(file.path);
  });
  return function () {
    gulp.src(options.files || defaults.clientScripts)
      .pipe(filter)
      .pipe(concat(name + '.js'))
      .pipe(gulp.dest(distFolder))
      .pipe(rename(name + '.min.js'))
      .pipe(uglify())
      .pipe(gulp.dest(distFolder));
  };
};

// Makes a task that runs the server in dev mode.
exports.nodemon = function (options) {
  options = options || {};

  // if (options.workingDirectory) {
  //   process.chdir(options.workingDirectory);
  // }

  var nodemonOptions = {
    script: 'server/app.js',
    ext: 'html js css',
    ignore: ['ignored.js']
  };
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      nodemonOptions[key] = options[key];
    }
  }
  return function () {
    nodemon(nodemonOptions)
      .on('change', options.onChange || ['lint'])
      .on('restart', function () {
        logger.info('--- Restarted the server ---');
      });
  };
};

// Sets log level for the task setup process.
exports.setLogLevel = function (level) {
  logger = makeLogger(level);
};

// Watch and compile sass: requires a source and destination
exports.sass = function (options) {
  options = options || {};
  var source = options.source || ['./test-data/scss/**/*.scss',
    './test-data/scss/*.scss'
  ];
  var destination = options.destination || './www/css';

  console.log('[SASS] recompiling'.yellow);
  gulp.src(source)
    .pipe(watch())
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(minifyCSS())
    .pipe(gulp.dest(destination))
    .pipe(connect.reload());
  console.log('[CSS] minifying'.yellow);
};

// Start a connect server and setup live reload
exports.connectWatch = function (options) {
  options = options || {};
  var root = options.root || 'www';
  var port = options.port || 3000;
  var livereload = options.livereload || true;
  // Files to watch for live re-load
  var glob = options.glob || ['./www/**/*.html', './www/**/*.js'];

  connect.server({
    root: root,
    port: port,
    livereload: livereload
  });

  console.log('[CONNECT] Listening on port 3000'.yellow.inverse);

  // Watch HTML and JS
  console.log('[CONNECT] Watching HTML and JS files for live-reload'.blue);
  watch({
    glob: glob
  })
    .pipe(connect.reload());
};

// Generate resized and renamed icons and places them in
// appropriate platform directory.
//
// params can contain an 'iconSrc' property, which will default
// to 'icon.png' when omitted.
//
// params also can contain a 'platforms' property, containing
// the names of the platforms you want to generate icons for.
// Defaults to ['android', 'ios'] when omitted.
//
exports.cordovaIcons = function (params) {
  params = params || {};
  var iconSrc = params.iconSrc || 'icon.png';
  var platforms = params.platforms || ['android', 'ios'];
  var project = params.project;


  var androidPath = 'platforms/android/res/';

  var androidSizes = [{
    name: 'drawable-ldpi/icon.png',
    size: 36
  }, {
    name: 'drawable-mdpi/icon.png',
    size: 48
  }, {
    name: 'drawable-hdpi/icon.png',
    size: 72
  }, {
    name: 'drawable-xhdpi/icon.png',
    size: 96
  }, {
    name: 'drawable/icon.png',
    size: 96
  }];

  var iosSizes = [{
    name: 'icon-29.png',
    size: 29
  }, {
    name: 'icon-40.png',
    size: 40
  }, {
    name: 'icon-40@2x.png',
    size: 80
  }, {
    name: 'icon-50.png',
    size: 50
  }, {
    name: 'icon-50@2x.png',
    size: 100
  }, {
    name: 'icon-57.png',
    size: 57
  }, {
    name: 'icon-57@2x.png',
    size: 114
  }, {
    name: 'icon-60.png',
    size: 60
  }, {
    name: 'icon-60@2x.png',
    size: 120
  }, {
    name: 'icon-72x.png',
    size: 72
  }, {
    name: 'icon-72@2x.png',
    size: 144
  }, {
    name: 'icon-76x.png',
    size: 76
  }, {
    name: 'icon-76@2x.png',
    size: 156
  }, {
    name: 'icon-small.png',
    size: 30
  }, {
    name: 'icon-small@2x.png',
    size: 60
  }, {
    name: 'icon.png',
    size: 58
  }, {
    name: 'icon@2x.png',
    size: 116
  }, {
    name: 'store-1024.png',
    size: 1024
  }, ];

  return function () {

    function resizeFunc(path) {
      return function (img) {
        gm(iconSrc)
          .resize(img.size, img.size)
          .write(path + img.name, function (err) {
            if (err) {
              console.log('✗', '\'' + path + img.name + '\'');
              console.log(err);
            } else {
              console.log('✓', '\'' + path + img.name + '\'');
            }
          });
      };
    }

    if (platforms.indexOf('ios') > -1) {
      if (!project) {
        throw 'No project specified';
      }
      var iosPath = 'platforms/ios/' + project + '/Resources/icons/';
      _.each(iosSizes, resizeFunc(iosPath));
    }

    if (platforms.indexOf('android') > -1) {
      _.each(androidSizes, resizeFunc(androidPath));
    }
  };
};
