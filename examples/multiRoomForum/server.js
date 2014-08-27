var fs = require('fs');
var eventEmitter = require('./eventEmitter');
var browserify = require('browserify');
var sass = require('node-sass');
var bourbon = require('node-bourbon');

var SASS_COMPILE_ON_SERVE = false;

/** INIT KASKADE **/
var $k = require('../../index')({
    debug: true,
    ssl: {
        key: fs.readFileSync(__dirname + '/key.pem'),
        cert: fs.readFileSync(__dirname + '/cert.pem')
    },
    port:443,
    onConnectionClose: function(conn){
        eventEmitter.emit('connection_closed', conn);
    }
});

/** CREATE SERVER **/
var app = $k.server.create();

/** SET UP COLLECTIONS AND METHODS **/
require('./collection')($k);
require('./methods')($k);

/** BUNDLE CLIENT JS **/
(function bundleClient(){
    var b  = browserify({
        entries: __dirname + '/client/index.js',
        standalone: 'initiaizeApp',
        debug: true 
    });
    b.plugin('minifyify', {output: __dirname + '/client/index-bundle.map.json', map: 'index-bundle.map'});
    
    b.bundle().pipe(
        fs.createWriteStream(__dirname + '/client/index-bundle.js')
        .on('finish', function(){
            console.log('Finished Bundling JS');
        })
    );
    
    
})();

/** RENDER SCSS **/
(function renderSCSS(){
    
    if(SASS_COMPILE_ON_SERVE){
        app.use(
            sass.middleware({
                src: __dirname + '/client/css',
                file: __dirname + '/client/css',
                includePaths: bourbon.includePaths,
                outputStyle: 'compressed',
                debug: true
            })
        );
    }else{
        var css = sass.renderSync({
            file: __dirname + '/client/css/index.scss',
            includePaths: bourbon.includePaths,
            outputStyle: 'compressed'
        });
        
        fs.writeFile(__dirname + '/client/css/index.css', css, function(err){
            if(err) return console.log(err);
            console.log('Finished Compiling CSS');
        });
    }
})();

/** SETUP URL PATHS **/
app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/views/index.html');
});
app.get('/index.js', function(req, res){
    res.sendFile(__dirname + '/client/index-bundle.js');
});
app.get('/index-bundle.map', function(req, res){
    res.sendFile(__dirname + '/client/index-bundle.map.json');
});
app.get('/index.css', function(req, res){
    res.sendFile(__dirname + '/client/css/index.css');
});

/** LISTEN **/
$k.server.listen();

/** SETUP HTTP REDIRECT **/
(function http_redirect(){
    var express = require('express');
    var app = express();

    app.use(function(req, res, next) {
        if (!req.secure) {
            return res.redirect(['https://', req.get('Host'), req.url].join(''));
        }
        next();
    }); 

    app.listen(80);
})();
