var fs = require('fs');
var eventEmitter = require('./eventEmitter');

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

var app = $k.server.create();

app.get('/', function(req, res){
    res.sendFile(__dirname + '/views/index.html');
});

var collections = require('./collection')($k);
require('./methods')($k);

$k.server.listen();

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
