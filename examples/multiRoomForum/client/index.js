module.exports = function(){
    
    var App = require('./app');
    
    kaskade.connection.connect({onopen: function(){
        kaskade.Template.parseTemplates(document.documentElement);
        kaskade.BindingManager.parseBindings(App, document.documentElement);
        kaskade.Routine.init();
    }});
    
};
