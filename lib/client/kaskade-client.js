module.exports = (function(){
    /** CONSTANTS **/
    var CONST = require('../constants');
    
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
    
    return $k;
})();