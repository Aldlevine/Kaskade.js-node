var self = module.exports;

self = (function(){
    self.debug = true;
    self.prefix = '/kaskade';
    self.ssl = false;
    self.port = 80;
    self.host = '0.0.0.0';
    
    self.init = function(cfg){
        for(var c in cfg){
            if(c in this)
                this[c] = cfg[c];
        }
    };
    
})();