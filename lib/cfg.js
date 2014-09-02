var self = module.exports;

self = (function(){
    self.debug = true;
    self.prefix = '/kaskade';
    self.ssl = false;
        /*{
            key: {PEM},
            cert: {PEM}
        }*/
    self.port = 80;
    self.host = '0.0.0.0';
    self.onConnectionClose = new Function();
    
    self.redis = false;
        /*{
            host: {String},
            port: {Number},
            options: {Object}
         }*/
    
    self.init = function(cfg){
        for(var c in cfg){
            if(c in this)
                this[c] = cfg[c];
        }
    };
    
})();