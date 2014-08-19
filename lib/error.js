module.exports = (function(){
    var events = require('events');
    var eventEmitter = new events.EventEmitter();
    eventEmitter.on('error', function(e){
        console.log(e);
    });
    
    return function(code, message){
        var error = new Error('Kaskade ('+code+') : '+message);
        eventEmitter.emit('error', error);
    };
})();