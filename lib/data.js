var self = module.exports;
var DEF = require('./constants');
var server = require('./server');
var error = require('./error');
var uuid = require('node-uuid');

/**
 *  Receives query from client
 *      Query gets registered as an observer
 *      Sends query to query parser
 *      Query parser returns collection
 *      Collection is returned to client
 * 
 *  Receives mutation from client
 *      Mutation sent to mutation parser
 *      Record passed to query parser
 *          Query parser determines runs record match against all observing queries
 *          Matched observers are passed the record change to propagate to their client
 **/

//@error:2010
self.Collection = (function(){
    
    var Collection = function(cfg){
        var collection = this;
        var cfg = cfg || {};
        
        collection.name = cfg.name;
        collection.queryParser = cfg.queryParser || new self.QueryParser();
        collection.mutationParser = cfg.mutationParser || new self.MutationParser();
        collection.observers = {};
        
        collection.__eventEmitter = new (require('events').EventEmitter)();
        collection.__eventEmitter.setMaxListeners(0);
        
        Collection.collections[collection.name] = collection;
    };
    
    Collection.collections = {};
    
    /**
     *  @function 
     */
    Collection.prototype.select = function(conn, query, done){
        var collection = this;
        collection.queryParser.select(conn, query, function(err, cursor){
            if(err) return error(2010, 'Error parsing query.');
            done(cursor);
        });
    };
    
    /**
     *   @function
     */
    Collection.prototype.observe = function(conn, query, done){
        var collection = this;
        var observerId = uuid.v1();
        
        var callback = function(method, record){
            collection.queryParser.test(conn, query, record, function(err, bool){
                if(err) return error(2020, err);
                if(bool){
                    var params = {
                        name: collection.name,
                        observerId: observerId,
                        method: method,
                        record: record
                    };
                    if(conn.execute instanceof Function)
                        conn.execute(DEF.CON_COL_MUTATE, params);
                }else if(!bool && method == 'update'){
                    var params = {
                        name: collection.name,
                        observerId: obeserverId,
                        method: 'negate',
                        record: record
                    };
                    if(conn.execute instanceof Function)
                        conn.execute(DEF.CON_COL_MUTATE, params);
                }
            });
        };
        
        collection.observers[conn.id] = collection.observers[conn.id] || {};
        collection.observers[conn.id][observerId] = callback;
        collection.__eventEmitter.on('mutation', callback);
        done(observerId);
    };
    
    /**
     *  @function 
     */
    Collection.prototype.insert = function(conn, record, done){
        var collection = this;
        var done = done || new Function();
        collection.mutationParser.insert(conn, record, function(err, record){
            if(err){ return error(2030, err); }
            done(record);
            collection.__eventEmitter.emit('mutation', 'insert', record);
        });
    };
    
    Collection.prototype.update = function(conn, query, update, done){
        var collection = this;
        var done = done || new Function();
        collection.mutationParser.update(conn, query, update, function(err, records){
            if(err){ return error(2040, err); }
            done(records);
            records.forEach(function(record){
                collection.__eventEmitter.emit('mutation', 'update', record);
            });
        });
    };
    
    Collection.prototype.remove = function(conn, query, done){
        var collection = this;
        var done = done || Function(); 
        collection.mutationParser.remove(conn, query, function(err, records, ready){
            if(err){ return error(2050, err); }
            done(records);
            records.forEach(function(record){
                collection.__eventEmitter.emit('mutation', 'remove', record);
            });
            ready();
        });
    };
    
    return Collection;
    
})();
server.method(DEF.SRV_COL_SELECT, function(conn, params, done){
    var colName = params.name;
    var query = params.query;
    var collection = self.Collection.collections[colName];
    if(collection){
        collection.select(conn, query, function(records){
            done(records);
        });
    }
});
server.method(DEF.SRV_COL_OBSERVE, function(conn, params, done){
    var colName = params.name;
    var query = params.query;
    var collection = self.Collection.collections[colName];
    if(collection){
        collection.observe(conn, query, function(observerId){
            done({observerId: observerId});
        });
    }
});
server.method(DEF.SRV_COL_MUTATE, function(conn, params, done){
    var colName = params.name;
    var method = params.method;
    var collection = self.Collection.collections[colName];
    if(collection){
        switch(method){
            case 'insert':
                var record = params.record;
                collection.insert(conn, record);
                break;
            case 'update':
                var query = params.query;
                var update = params.update;
                collection.update(conn, query, update);
                break;
            case 'remove':
                var query = params.query;
                collection.remove(conn, query);
                break;
        }
    }
});



self.QueryParser = (function(){
    
    var QueryParser = function(cfg){
        var cfg = cfg || {};
        var queryParser = this;
        queryParser.select = cfg.select || function(conn, query, done){return done(null, []);};
    };
    
    QueryParser.prototype.test = function(conn, query, record, done){
        if( !(query instanceof Object && record instanceof Object) )
            return done('Cannot parse non-obects as queries');
        for(var f in query){
            if(! (f in record) ) return done(null, false);
            else if(query[f] instanceof Array && query[f].indexOf(record[f]) < 0 ) return done(null, false);
            else if(!(query[f] instanceof Array) && query[f] != record[f]) return done(null, false);
        }
        return done(null, true);
    };
    
    return QueryParser;
    
})();

self.MutationParser = (function(){
    
    var MutationParser = function(cfg){
        var mutationParser = this;
        var cfg = cfg || {};
        mutationParser.insert = cfg.insert || function(conn, record, done){return done(null, record);};
        mutationParser.remove = cfg.remove || function(conn, query, done){return done(null, []);};
        mutationParser.update = cfg.update || function(conn, query, update, done){return done(null, []);};
    };
    
    return MutationParser;
    
})();

self.SQLParser = require('./sql-query');

/*
 * QUERIES
 * 

    Collection.select({
        field:abc,
        field:[a,b,c]
    });
    
    Collection.observe({
        field:abc,
        field:[a,b,c]
    });
    
    Collection.insert({
        field:a,
        field:b,
        field:c
    });
    
    Collection.update({
        field:abc,
        field:[a,b,c]
    },{
        field:a,
        field:b,
        field:c
    });
    
    Collection.remove({
        field:abc,
        field:[a,b,c]
    });

 * 
 *  
 */