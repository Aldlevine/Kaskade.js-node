var self = module.exports;
var CON = require('../constants');
var connection = require('./connection');

self.Collection = (function(){
    var Collection = function(cfg){
        cfg = cfg || {};
        var collection = this;
        
        collection.name = cfg.name || '';
    };
    
    Collection.prototype.constructor = Collection;
    
    Collection.prototype.insert = function(params){
        var obj = {
            name: this.name,
            mutation: CON.EX_COL_INSERT,
            params: params || {}
        };
        connection.execute(CON.EX_COL_MUTATE, obj, function(params){
            console.log(params);
        });
    };
    
    Collection.prototype.remove = function(params){
        var obj = {
            name: this.name,
            mutation: CON.EX_COL_REMOVE,
            params: params || {}
        };
        connection.execute(CON.EX_COL_MUTATE, obj, function(params){
            
        });
    };
    
    Collection.prototype.update = function(params){
        var obj = {
            name: this.name,
            mutation: CON.EX_COL_UPDATE,
            params: params || {}
        };
        connection.execute(CON.EX_COL_MUTATE, obj, function(params){
            
        });
    };
    
    Collection.prototype.find = function(params){
        var obj = {
            name: this.name,
            mutation: CON.EX_COL_FIND,
            params: params || {}
        };
        connection.execute(CON.EX_COL_MUTATE, obj, function(params){
            
        });
    };
    
    Collection.prototype.findOne = function(params){
        var obj = {
            name: this.name,
            mutation: CON.EX_COL_FINDONE,
            params: params || {}
        };
        connection.execute(CON.EX_COL_MUTATE, obj, function(params){
            
        });
    };
    
    return Collection;
})();