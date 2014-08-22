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
            records.reduce(function(o, v){
                var key = v[keyField];
                o[key] = v;
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
                records.reduce(function(o, v){
                    var key = v[keyField];
                    collection.records[key] = v;
                    o[key] = v;
                    return o;
                }, obj);
                collection.observers[observerId] = obj;
                collection.observerCallbacks[observerId]('init', obj);
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
        
        switch(method){
            case 'insert':
                var key = record[keyField];
                records[key] = record;
                observer[key] = record;
                //Notify Listeners
                callback('insert', record);
                break;
            case 'update':
                var key = record[keyField];
                records[key] = record;
                observer[key] = record;
                //Notify Listeners
                callback('update', record);
                break;
            case 'remove':
                var key = record[keyField];
                delete records[key];
                delete observer[key];
                //Notify Listeners
                callback('remove', record);
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
