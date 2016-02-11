process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var args        = require('yargs').argv;
var browserSync = require('browser-sync');
var config      = require('./gulp.config')();
var del         = require('del');
var gulp        = require('gulp');
var path        = require('path');
var _           = require('lodash');
var $           = require('gulp-load-plugins')({lazy: true});
var url         = require('url');
var proxy       = require('proxy-middleware');
var proxyOptions = url.parse('http://localhost:9000/api');

proxyOptions.route = '/api';

var colors      = $.util.colors;
var envenv      = $.util.env;
var port        = process.env.PORT || config.defaultPort;

/**
 * yargs variables can be passed in to alter the behavior, when present.
 * Example: gulp serve-dev
 *
 * --verbose  : Various tasks will produce more output to the console.
 * --nosync   : Don't launch the browser with browser-sync when serving code.
 * --debug    : Launch debugger with node-inspector.
 * --debug-brk: Launch debugger and break on 1st line with node-inspector.
 */

/**
 * List the available gulp tasks
 */
gulp.task('help', $.taskListing);
gulp.task('default', ['help']);

/**
 * Alias tasks
 */
gulp.task('server', ['serve-dev']);
gulp.task('server-prod', ['serve-build']);
gulp.task('check', ['vet']);

/**
 * vet the code and create coverage report
 * @return {Stream}
 */
gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS');

    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reporter('fail'))
        .pipe($.jscs());
});

/**
 * Compile sass to css
 * @return {Stream}
 */
gulp.task('styles', ['clean-styles'], function() {
    log('Compiling Sass --> CSS');

    return gulp
        .src(config.sass)
        .pipe($.plumber()) // exit gracefully if something fails after this
        .pipe($.sass())
        .pipe($.autoprefixer({browsers: ['last 2 version', '> 1%']}))
        .pipe(gulp.dest(config.temp));
});

/**
 * Copy fonts
 * @return {Stream}
 */
gulp.task('fonts', ['clean-fonts'], function() {
    log('Copying fonts');

    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'assets/fonts'));
});

/**
 * Copy root files
 * @return {Stream}
 */
gulp.task('root-files', function() {
    log('Copying root files');

    return gulp
        .src(config.rootFiles)
        .pipe(gulp.dest(config.build));
});

/**
 * Compress images
 * @return {Stream}
 */
gulp.task('images', ['clean-images'], function() {
    log('Compressing and copying images');

    return gulp
        .src(config.images)
        .pipe($.imagemin({optimizationLevel: 4}))
        .pipe(gulp.dest(config.build + 'assets/images'));
});

/**
 * Wire-up the bower dependencies
 * @return {Stream}
 */
gulp.task('wiredep', function() {
    log('Wiring the bower dependencies into the html');

    var wiredep = require('wiredep').stream;
    var options = config.getWiredepDefaultOptions();

    // Inject scripts
    var injectScripts = gulp.src(config.js);

    return gulp
        .src(config.html)
        .pipe($.clipEmptyFiles())
        .pipe(wiredep(options))
        .pipe($.inject(injectScripts, {read: false}))
        .pipe(inject(config.js, '', config.jsOrder))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles', 'fileinclude'], function() {
    log('Wire up css into the html, after files are ready');

    return gulp
        .src(config.html)
        .pipe(inject(config.css))
        .pipe(gulp.dest(config.client));
});

gulp.task('fileinclude', function() {
    log('Including files');

    var htmlFiles = $.filter(['*.html', '!src/templates']);

    return gulp.src(config.html)
        .pipe($.fileInclude({basepath: config.htmlTemplatesBase}))
        .pipe(htmlFiles)
        .pipe(gulp.dest(config.temp));
});

/**
 * ZIP compress build directory
 */
gulp.task('zip', ['build'], function() {
    log('Zipping build folder into ' + config.zip);

    return gulp.src('./build/**/*')
    .pipe($.zip(config.zip))
    .pipe(gulp.dest('./'));
});

/**
 * Build everything
 * This is separate so we can run tests on
 * optimize before handling image or fonts
 */
gulp.task('build', ['optimize', 'images', 'fonts', 'root-files'], function() {
    log('Building everything');

    var msg = {
        title: 'gulp build',
        subtitle: 'Deployed to the build folder',
        message: 'Run `gulp serve-build` or `gulp zip`'
    };
    del(config.temp);
    log(msg);
    notify(msg);
});

/**
 * Optimize all files, move to a build folder,
 * and inject them into the new index.html
 * @return {Stream}
 */

gulp.task('optimize', ['clean-code', 'inject', 'vet', 'fileinclude'], function() {
    log('Optimizing the js, css, and html');

    // Filters are named for the gulp-useref path
    var cssFilter = $.filter('**/*.css', {restore: true});
    var jsAppFilter = $.filter(config.optimized.app, {restore: true});
    var jsLibFilter = $.filter(config.optimized.lib, {restore: true});
    var notHtmlFilter = $.filter(['**/*', '!**/*.html'], {restore: true});

    return gulp
        .src(config.temp + '*.html')
        .pipe($.plumber())
        
        // Gather all assets from the html with useref
        // <!-- build:js/css path/file.ext-->
        .pipe($.useref({searchPath: './'}))

        // Get the css
        .pipe(cssFilter)
        .pipe($.cssnano())
        .pipe(cssFilter.restore)

        // Get the custom javascript
        .pipe(jsAppFilter)
        .pipe($.uglify())
        .pipe(getHeader())
        .pipe(jsAppFilter.restore)

        // Get the vendor javascript
        .pipe(jsLibFilter)
        .pipe($.uglify()) // another option is to override wiredep to use min files
        .pipe(jsLibFilter.restore)

        // Take inventory of the file names for future rev numbers
        .pipe(notHtmlFilter)
        .pipe($.rev())
        .pipe(notHtmlFilter.restore)

        // Replace the file names in the html with rev numbers
        .pipe($.revReplace())
        .pipe(gulp.dest(config.build));
});

/**
 * Remove all files from the build, temp, and reports folders
 */
gulp.task('clean', function() {
    var delconfig = [].concat(config.build, config.temp, config.report);
    log('Cleaning: ' + $.util.colors.blue(delconfig));
    return del(delconfig);
});

/**
 * Remove all fonts from the build folder
 */
gulp.task('clean-fonts', function() {
    return clean(config.build + 'fonts/**/*.*');
});

/**
 * Remove all images from the build folder
 */
gulp.task('clean-images', function() {
    return clean(config.build + 'images/**/*.*');
});

/**
 * Remove all styles from the build and temp folders
 */
gulp.task('clean-styles', function() {
    var files = [].concat(
        config.temp + '**/*.css',
        config.build + 'styles/**/*.css'
    );
    return clean(files);
});

/**
 * Remove all js and html from the build and temp folders
 */
gulp.task('clean-code', function() {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + 'js/**/*.js'
    );
    return clean(files);
});

/**
 * serve the dev environment
 * --debug-brk or --debug
 * --nosync
 */
gulp.task('serve-dev', ['inject', 'fileinclude'], function() {
    serve(true /*isDev*/);
});

/**
 * serve the build environment
 * --debug-brk or --debug
 * --nosync
 */
gulp.task('serve-build', ['build'], function() {
    serve(false /*isDev*/);
});

/**
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function() {
    var msg = 'Bumping versions';
    var type = args.type;
    var version = args.ver;
    var options = {};
    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);

    return gulp
        .src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

/**
 * Optimize the code and re-load browserSync
 */
gulp.task('browserSyncReload', ['optimize'], browserSync.reload);

////////////////

/**
 * When files change, log it
 * @param  {Object} event - event that fired
 */
function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

/**
 * Delete all files in a given path
 * @param  {Array}   path - array of paths to delete
 */
function clean(path) {
    log('Cleaning: ' + $.util.colors.blue(path));
    return del(path);
}

/**
 * Inject files in a sorted sequence at a specified inject label
 * @param   {Array} src   glob pattern for source files
 * @param   {String} label   The label name
 * @param   {Array} order   glob pattern for sort order of the files
 * @returns {Stream}   The stream
 */
function inject(src, label, order) {
    var options = {read: false};
    if (label) {
        options.name = 'inject:' + label;
    }

    return $.inject(orderSrc(src, order), options);
}

/**
 * Order a stream
 * @param   {Stream} src   The gulp.src stream
 * @param   {Array} order Glob array pattern
 * @returns {Stream} The ordered stream
 */
function orderSrc (src, order) {
    //order = order || ['**/*'];
    return gulp.src(src)
        .pipe($.if(order, $.order(order)));
}

/**
 * serve the code
 * --debug-brk or --debug
 * --nosync
 * @param  {Boolean} isDev - dev or build mode
 * @param  {Boolean} specRunner - server spec runner html
 */
function serve(isDev, specRunner) {
    var debugMode = '--debug';
    var nodeOptions = getNodeOptions(isDev);

    nodeOptions.nodeArgs = [debugMode + '=5858'];

    if (args.verbose) {
        console.log(nodeOptions);
    }

    startBrowserSync(isDev, specRunner);
}

function getNodeOptions(isDev) {
    return {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server]
    };
}

//function runNodeInspector() {
//    log('Running node-inspector.');
//    log('Browse to http://localhost:8080/debug?port=5858');
//    var exec = require('child_process').exec;
//    exec('node-inspector');
//}

/**
 * Start BrowserSync
 * --nosync will avoid browserSync
 */
function startBrowserSync(isDev, specRunner) {
    if (args.nosync || browserSync.active) {
        return;
    }

    log('Starting BrowserSync on port ' + port);

    // If build: watches the files, builds, and restarts browser-sync.
    // If dev: watches sass, compiles it to css, browser-sync handles reload
    if (isDev) {
        gulp.watch([config.sassFiles, config.html, config.htmlTemplates, config.js], ['inject'])
            .on('change', changeEvent);
    } else {
        gulp.watch([config.sass, config.js, config.html], ['browserSyncReload'])
            .on('change', changeEvent);
    }

    var options = {
        port: 8000,
        open: false,
        files: isDev ? [
            config.client + '**/*.*'
        ] : [],
        ghostMode: { // these are the defaults t,f,t,t
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'info',
        logPrefix: 'ixu',
        notify: true,
        reloadDelay: 1000,
        server: {
            baseDir: isDev ? ['./.tmp', './src/', './', '!./src/*.html'] : ['./build'],
            middleware: [proxy(proxyOptions)]
        }
    } ;
    if (specRunner) {
        options.startPath = config.specRunnerFile;
    }

    browserSync(options);
}

/**
 * Format and return the header for files
 * @return {String}           Formatted file header
 */
function getHeader() {
    var pkg = require('./package.json');
    var template = ['/**',
        ' * <%= pkg.name %> - <%= pkg.description %>',
        ' * @authors <%= pkg.authors %>',
        ' * @version v<%= pkg.version %>',
        ' * @link <%= pkg.homepage %>',
        ' * @license <%= pkg.license %>',
        ' */',
        ''
    ].join('\n');
    return $.header(template, {
        pkg: pkg
    });
}

/**
 * Log a message or series of messages using chalk's blue color.
 * Can pass in a string, object or array.
 */
function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}

/**
 * Show OS level notification using node-notifier
 */
function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'gulp.png'),
        icon: path.join(__dirname, 'gulp.png')
    };
    _.assign(notifyOptions, options);
    notifier.notify(notifyOptions);
}

module.exports = gulp;
