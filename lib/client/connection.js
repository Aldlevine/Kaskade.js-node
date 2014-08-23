/** SOCKJS **/
var SockJS = require('./sockjs-client');
var uuid = require('node-uuid');
var self = module.exports;

self.connect = function connect(url) {
    var self = this;
    url = url || '/kaskade';

    self.open = false;

    self.sockjs = new SockJS(url);

    self.sockjs.onopen = function() {
        self.open = true;
        self.send.processQueue();
    };
    self.sockjs.onmessage = function(e) {
        self.parseMessage(e.data);
    };
    self.sockjs.onclose = function() {
        self.open = false;
    };
};

/** @function send
 *  Executes the sockjs send command when open, or queues commands when not yet open
 */
self.send = function send(message) {
    if (self.open)
        self.sockjs.send(message);
    else {
        send.queue = send.queue || [];
        send.queue.push(message);
    }
};
self.send.processQueue = function() {
    if (self.queue) {
        while (self.queue.length) {
            self(self.queue.shift());
        }
    }
};

/** @function method
 *  Creates and keeps references to all konnekt client/server methods
 *  @param {String} name
 *  @param {Function} definition
 *      @param {Object} parameters
 *      @param {Function} done(return_value)
 */
self.method = function method(name, definition) {
    method.stack = method.stack || {};
    method.stack[name] = definition;
};

/** @function exec
 *  Executes a method registered on the server
 *  @param {String} name
 *  @param {Object} params
 *  @param {Function} done(params)
 */
self.execute = function execute(name, params, done) {
    var id = uuid.v1();
        
    var obj = {
        type : 'execute',
        data : {
            id : id,
            name : name,
            params : params
        }
    };
    var msg = JSON.stringify(obj);

    execute.return_stack = self.return_stack || {};
    execute.return_stack[id] = done;

    self.send(msg);
};

/** @function parseMessage
 *  Parses the data from a socket message
 */
self.parseMessage = function(msg) {
    var obj = JSON.parse(msg);
    var type = obj.type;
    var data = obj.data;

    if (type == 'response') {
        
        var id = data.id;
        var params = data.params;
        if (self.execute.return_stack[id] instanceof Function) {
            self.execute.return_stack[id](params);
            delete self.execute.return_stack[id];
        }
    } else if (type == 'execute') {
                
        var name = data.name;
        var params = data.params;
        if (self.method.stack[name] instanceof Function)
            self.method.stack[name](params);
    }
}; 