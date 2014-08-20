module.exports = function(cfg) {
    cfg = cfg || {};
    
    /** CONSTANTS **/
    var DEF = require('./constants');
    
    /** GLOBAL CONFIG **/
    var CFG = require('./cfg').init(cfg);
    
    /** AUGMENTS **/
    require('./augments-ecma')();

    /** HELPERS **/
    var error = require('./error');
    
    /** BEGIN KASKADE **/
    var Kaskade = new Function();
    var $k = new Kaskade();
    
    Kaskade.prototype.constructor = Kaskade;
    
    //@error:1000
    Kaskade.prototype.server = require('./server');
    
    //@error:2000
    Kaskade.prototype.data = require('./data');
    //Kaskade.prototype.data = require('./data');
    
    return $k;
};
