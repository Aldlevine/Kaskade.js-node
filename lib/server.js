var self = module.exports;
var CFG = require('./cfg');
var uuid = require('node-uuid');
var RSA = require('node-rsa');
var error = require('./error');

//@error:1010
module.exports.create = function create() {
    self.clients = {};
    
    self.express = require('express');
    self.app = self.express();
    if(CFG.ssl && CFG.ssl.key && CFG.ssl.cert){
        var options = {
            key: CFG.ssl.key,
            cert: CFG.ssl.cert
        };
        self.http = require('https');
        self.server = self.http.createServer(options,self.app);
    }else{
        self.http = require('http');
        self.server = self.http.createServer(self.app);
    }
    
    self.sockjs = require('sockjs');
    self.prefix = CFG.prefix;
    
    self.sock = self.sockjs.createServer();
    self.sock.on('connection', function(conn) {
        self.clients[conn.id] = conn;

        conn.execute = (function(name, params) {
            var id = uuid.v1();
                        
            var obj = {
                type : 'execute',
                data : {
                    id: id,
                    name : name,
                    params : params
                }
            };
            var msg = JSON.stringify(obj);
            this.write(msg);
        }).bind(conn);

        conn.on('data', function(data) {
            self.parseData(conn, data);
        });

        conn.on('close', function() {
            delete self.clients[conn.id];
        });
        
        /*(function swapKeys(){
            var decryptor = new RSA();
            decryptor.generateKeyPair();
            var pub = decryptor.getPublicPEM();
            
            var obj = {
                type: 'key',
                data: {
                    key: pub
                }
            };
            var msg = JSON.stringify(obj);
            conn.decryptor = decryptor;
            conn.write(msg); 
        })();*/

    });
    
    //self.app = self.express();
    //self.server = self.http.createServer(self.app);
    self.sock.installHandlers(self.server, {prefix: self.prefix});
    
    (function bundleClient(){
        var fs = require('fs');
        var browserify = require('browserify');
        var b  = browserify({
            entries: __dirname + '/client/kaskade-client.js',
            standalone: 'kaskade',
            debug: true 
        });
        b.plugin('minifyify', {output: __dirname + '/client/client-bundle.map.json', map: 'kaskade.map'});
        
        b.bundle().pipe(fs.createWriteStream(__dirname + '/client/client-bundle.js'));
    })();
    
    return self.app; 
}; 

//@error:1020
module.exports.listen = function (){
    self.server.listen(CFG.port, CFG.host);
    
    if (CFG.ssl) {
        self.app.use(function(req, res, next) {
            if (!req.secure) {
                return res.redirect(['https://', req.get('Host'), req.url].join(''));
            }
            next();
        });
    }

    
    self.app.get('/kaskade.js', function(req, res){
        res.sendFile(__dirname + '/client/client-bundle.js');
    });
    if(CFG.debug){
        self.app.get('/kaskade.map', function(req, res){
            res.sendFile(__dirname + '/client/client-bundle.map.json');
        });
    }
};

//@error:1030
module.exports.parseData = function parseData(conn, json){
    var obj = JSON.parse(json);
    var type = obj.type;
    var data = obj.data;
    
    if(type == 'execute'){
        var name = data.name;
        var params = data.params;
        var id = data.id;
        
        self.execute(conn, name, params, function(response){
            self.respond(conn, id, response);
        });
    }
};

//@error:1040
module.exports.method = function method(name, definition){
    method.stack = method.stack || {};
    method.stack[name] = definition;
};

//@error:1050
module.exports.execute = function execute(conn, name, params, done){
    if(self.method.stack && self.method.stack[name] instanceof Function)
        self.method.stack[name](conn, params, done);
    else
        error(1050, 'Client attempted to execute method "'+name+'" which is not registered on the server');
};

//@error:1060
module.exports.respond = function respond(conn, id, response){
    var obj = {
        type: 'response',
        data: {
            id: id,
            params: response
        }
    };
    var json = JSON.stringify(obj);
    conn.write(json);
};