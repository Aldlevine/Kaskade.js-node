var self = module.exports;
var CON = require('./constants');
var server = require('./server');
var error = require('./error');

//@error:2010
self.Collection = (function(){
    var Collection = function(cfg){
        cfg = cfg || {};
        var collection = this;
        
        collection.name = cfg.name || '';
        
        collection.insertHandler = cfg.insertHandler || new Function();
        collection.removeHandler = cfg.removeHandler || new Function();
        collection.updateHandler = cfg.updateHandler || new Function();
        collection.findHandler = cfg.findHandler || new Function();
        /* All handlers take args (conn, params, done) */
        
        collection.keyField = cfg.keyField || '';
        
        collection.maps = [];
        
        self.Collection.collections[collection.name] = collection;
    };
    
    Collection.collections = {};
    
    Collection.prototype.constructor = Collection;
    
    Collection.prototype.insert = function(conn, params, done){
        var collection = this;
        collection.insertHandler(conn, params, function(err, record){
            if(err) return done({err:err});
            //INSERT MAPPING CODE HERE
            
            return done(record);
        });
    };
    
    Collection.prototype.remove = function(conn, params, done){
        var collection = this;
        collection.removeHandler(conn, params, function(err, record){
            if(err) return done({err:err});
            
            //INSERT MAPPING CODE HERE
            return done(record);
        });
    };
    
    Collection.prototype.update = function(conn, params, done){
        var collection = this;
        collection.updateHandler(conn, params, function(err, record){
            if(err) return done({err:err});
            
            //INSERT MAPPING CODE HERE
            return done(record);
        });
    };
    
    Collection.prototype.find = function(conn, params, done){
        var collection = this;
        collection.findHandler(conn, params, function(err, records){
            if(err) return done({err:err});
            
            //INSERT MAPPING CODE HERE
            return done(records);
        });
    };
    
    Collection.prototype.findOne = function(conn, params, done){
        var collection = this;
        collection.findHandler(conn, params, function(err, record){
            if(err) return done({err:err});
            
            //INSERT MAPPING CODE HERE
            return done(records[0]);
        });
    };
    
    return Collection;
})();

server.method(CON.EX_COL_MUTATE, function(conn, data, done){
    var name = data.name;
    var mutation = data.mutation;
    var params = data.params;
    var collection = self.Collection.collections[name];
    if(collection){
        switch(mutation){
            case CON.EX_COL_INSERT:
                collection.insert(conn, params, done);
                break;
            case CON.EX_COL_REMOVE:
                collection.remove(conn, params, done);
                break;
            case CON.EX_COL_UPDATE:
                collection.update(conn, params, done);
                break;
            case CON.EX_COL_FIND:
                collection.find(conn, params, done);
                break;
            case CON.EX_COL_FINDONE:
                collection.findOne(conn, params, done);
                break;
        }
    }
    else
        error(2010, 'Collection "'+name+'" does not exist');
});


//@error:2020
self.Map = (function(){
    
    var Map = function (cfg){
        cfg = cfg || {};
        var map = this;
        
        map.name = cfg.name || '';
        map.collections = cfg.collections || {};
        /*
         * #{name}: {
         *     criteria: function(conn, params, record, done)
         * },...
         * First Collection is the key collection, it's keyField is the identifier.
         */
        map.recordHandler = cfg.recordHandler || new Function();
        map.updateHandler = cfg.updateHandler || new Function();
        /* Handlers have args (record) */
        map.authHandler = cfg.authHandler || function(conn,rec,done){done(true);};
       
        for(var col in map.collections){
            if(self.Collection.collections[col])
                self.Collection.collections[col].maps.push(this);
        }
        
        map.subscriptions = [];
        self.Map.maps[this.name] = this;
    };
    
    Map.maps = {};
    
    Map.prototype.constructor = Map;
    
    Map.prototype.insert = function(record){
        var map = this;
        map.recordHandler(record, function(record){
            for(var i=0, len=map.subscriptions.length; i<len; i++){
                map.authHandler(map.subscriptions[i].connection, record, function(bool){
                    map.subscriptions[i].insert(record);
                });
            }
        });
    };
    
    Map.prototype.remove = function(record){
        var map = this;
        map.recordHandler(record, function(record){
            for(var i=0, len=map.subscriptions.length; i<len; i++){
                map.authHandler(map.subscriptions[i].connection, record, function(bool){
                    map.subscriptions[i].remove(record);
                });
            }
        });
    };
    
    Map.prototype.update = function(record){
        var map = this;
        map.updateHandler(record, function(records){
            for(var i=0, len=map.subscriptions.length; i<len; i++){
                
                for(var j=0, len=records.length; j<0; j++){
                    map.authHandler(map.subscriptions[i].connection, records[j], function(bool){
                        map.subscriptions[i].update(records[j]);
                    });
                }
                
            }
        });
    };
})();





//@error:2030
self.Subscription = (function(){
    
    var Subscription = function(cfg){
        cfg = cfg || {};
        subscription = this;
        
        subscription.connection = cfg.connection;
    };
    
    Subscription.prototype.insert = function(record){};
    Subscription.prototype.remove = function(record){};
    Subscription.prototype.update = function(record){};
    
})();