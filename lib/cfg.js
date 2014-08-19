var self = module.exports;

self = (function(){
    self.debug = true;
    
    
    self.init = function(cfg){
        for(var c in cfg){
            if(c in this)
                this[c] = cfg[c];
        }
    };
    
})();