module.exports = function() {
    var client = './src/';
    var root = './';
    var temp = './.tmp/';
    var wiredep = require('wiredep');
    var bowerFiles = wiredep({devDependencies: true}).js;
    var bower = {
        json: require('./bower.json'),
        directory: './vendor/',
        ignorePath: '../'
    };
    var nodeModules = 'node_modules';

    var config = {
        /**
         * File paths
         */
        // all javascript that we want to vet
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        build: './build/',
        zip: 'static_site.zip',
        client: client,
        css: temp + 'main.css',
        fonts: [bower.directory + '**/*.{eot,svg,ttf,woff,woff2}', client + 'assets/fonts/**/*.*'],
        html: client + '*.html',
        htmlTemplatesBase: client + 'templates/',
        htmlTemplates: client + '/templates/**/*.tpl.html',
        images: client + 'assets/images/**/*.*',
        index: client + 'index.html',
        // app js, with no specs
        js: [
            client + 'scripts/**/*.js',
            '!' + client + 'scripts/**/*.spec.js',
            '!' + client + 'scripts/**/*.module.js'
        ],
        jsOrder: [
            '**/util/*.js',
            '**/app.module.js',
            '**/*.module.js',
            '**/*.js'
        ],
        sass: root + 'sass/main.scss',
        sassFiles: root + 'sass/**/*.scss',
        rootFiles: [],
        root: root,
        source: 'src/',
        temp: temp,

        /**
         * optimized files
         */
        optimized: {
            app: ['**/app.js', '**/home.js'],
            lib: ['**/lib.js']
        },

        /**
         * browser sync
         */
        browserReloadDelay: 1000,
        defaultPort: '8000',

        /**
         * Bower and NPM files
         */
        bower: bower,
        packages: [
            './package.json',
            './bower.json'
        ]
    };

    /**
     * wiredep and bower settings
     */
    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };
        return options;
    };

    return config;
};
