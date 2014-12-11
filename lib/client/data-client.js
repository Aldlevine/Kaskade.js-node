var self = module.exports;
var DEF = require('../constants');
var connection = require('./connection');

self.Collection = (function(){
    var Collection = function(cfg){
        var collection = this;
        var cfg = cfg || {};
        
        collection.name = cfg.name;
        collection.keyField = cfg.keyField;
        collection.observers = {};
        collection.observerCallbacks = {};
        collection.records = {};
        
        Collection.collections[collection.name] = collection;
    };
    
    Collection.collections = {};
    
    Collection.prototype.select = function(query, done){
        var collection = this;
        var params = {
            name: collection.name,
            query: query
        };
        connection.execute(DEF.SRV_COL_SELECT, params, function(records){
            var obj = {};
            var keyField = collection.keyField;
            records.reduce(function(o, record){
                record = new self.Record(record, collection.keyField);
                var key = record[keyField];
                o[key] = record;
                return o;
            }, obj);
            done(obj);
        });
    };
    
    Collection.prototype.observe = function(query, callback){
        var collection = this;
        var params = {
            name: collection.name,
            query: query
        };
        connection.execute(DEF.SRV_COL_OBSERVE, params, function(ret){
            var observerId = ret.observerId;
            collection.observerCallbacks[observerId] = callback;
            connection.execute(DEF.SRV_COL_SELECT, params, function(records){
                var obj = {};
                var keyField = collection.keyField;
                records.reduce(function(o, record){
                    var key = record[keyField];
                    if(!collection.records[key]){
                        record = new self.Record(record, collection.keyField);
                        collection.records[key] = record;
                    }
                    o[key] = collection.records[key];
                    return o;
                }, obj);
                collection.observers[observerId] = obj;
                collection.observerCallbacks[observerId]('init', obj, obj);
            });
        });
    };
    
    Collection.prototype.insert = function(record){
        var collection = this;
        var params = {
            name: collection.name,
            method: 'insert',
            record: record
        };
        connection.execute(DEF.SRV_COL_MUTATE, params);
    };
    
    Collection.prototype.update = function(query, update){
        var collection = this;
        var params = {
            name: collection.name,
            method: 'update',
            query: query,
            update: update
        };
        connection.execute(DEF.SRV_COL_MUTATE, params);
    };
    
    Collection.prototype.remove = function(query){
        var collection = this;
        var params = {
            name: collection.name,
            method: 'remove',
            query: query
        };
        connection.execute(DEF.SRV_COL_MUTATE, params);
    };
    
    Collection.prototype.__handleMutation = function(method, observerId, record){
        var collection = this;
        var records = collection.records;
        var observer = collection.observers[observerId];
        var callback = collection.observerCallbacks[observerId];
        var keyField = collection.keyField;
        
        callback = callback instanceof Function ? callback : new Function();
        //record = new self.Record(record, collection.keyField);
        switch(method){
            case 'insert':
                var key = record[keyField];
                if(!records[key]){
                    record = new self.Record(record, collection.keyField);
                    records[key] = record;
                }
                observer[key] = records[key];
                //Notify Listeners
                callback('insert', records[key], observer);
                break;
            case 'update':
                var key = record[keyField];
                if(records[key]){
                    for(var f in record){
                        if(records[key][f] !== record[f])
                            records[key][f] = record[f];
                    }
                }else{
                    record = new self.Record(record, collection.keyField);
                    records[key] = record;
                }
                if(observer[key]){
                    for(var f in record){
                        if(observer[key][f] !== record[f])
                            observer[key][f] = record[f];
                    }
                }else{
                    if(!(record instanceof self.Record))
                        record = new self.Record(record, collection.keyField);
                    observer[key] = record;
                    callback('insert', records[key], observer);
                }
                //Notify Listeners
                callback('update', records[key], observer);
                break;
            case 'negate':
                var key = record[keyField];
                var record = records[key];
                delete observer[key];
                callback('negate', record, observer);
                break;
            case 'remove':
                var key = record[keyField];
                var record = records[key];
                delete records[key];
                delete observer[key];
                //Notify Listeners
                callback('remove', record, observer);
                break;
        };
        
    };
    
    return Collection;
    
})();
connection.method(DEF.CON_COL_MUTATE, function(params){
    var collection = self.Collection.collections[params.name];
    var method = params.method;
    var observerId = params.observerId;
    var record = params.record;
    
    collection.__handleMutation(method, observerId, record);
});

self.Record = (function(){
    
    var Record = function(cfg, keyField){
        var record = this;
        record.$trackers = {};
        record.$keyField = keyField;
        for(var c in cfg){
            (function(c){
                record[c] = cfg[c];
                record['__'+c+'__'] = cfg[c];
                Object.defineProperty(record, c, {
                    get: function(){
                        return record['__'+c+'__'];
                    },
                    set: function(value){
                        record['__'+c+'__'] = value;
                        if(record.$trackers[c]){
                            for(var i=0, len=record.$trackers[c].length; i<len; i++){
                                record.$trackers[c][i](record, record[c], c);
                            }
                        }
                    }
                });
                Object.defineProperty(record, '__'+c+'__', {
                    enumerable: false
                });
            })(c);
        }
    };
    
    Record.prototype.constructor = Record;
    
    Record.prototype.$track = function(property, callback){
        if(callback instanceof Function){
            var record = this;
            record.$trackers[property] = record.$trackers[property] || [];
            record.$trackers[property].add(callback);
        }
    };
    
    return Record;
    
})();
