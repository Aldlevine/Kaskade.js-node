module.exports = (function(){
    /** CONSTANTS **/
    var DEF = require('../constants');
    
    /** AUGMENTS **/
    require('../augments-ecma')();
    require('../augments-html')(); 
    
    /** BEGIN KASKADE **/
    var Kaskade = new Function();
    var $k = new Kaskade();
    
    Kaskade.prototype.constructor = Kaskade;
    
    var connection = require('./connection');
    Kaskade.prototype.connection = connection;
    Kaskade.prototype.method = connection.method;
    Kaskade.prototype.execute = connection.execute;
    
    Kaskade.prototype.data = require('./data-client');
    
    Kaskade.prototype.Class = require('./reactive').Class;
    Kaskade.prototype.Hash = require('./reactive').Hash;
    Kaskade.prototype.List = require('./reactive').List;
    Kaskade.prototype.Routine = require('./reactive').Routine;
    
    Kaskade.prototype.Template = require('./template').Template;
    Kaskade.prototype.BindingManager = require('./template').BindingManager;
    
    return $k;
})();