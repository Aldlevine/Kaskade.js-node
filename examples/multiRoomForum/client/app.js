var collections = require('./collections');
var classes = require('./classes');
var dialog = require('./dialog');

var App = window.App = module.exports = new kaskade.Hash({
    
    currentUser: new kaskade.Hash({
        user_id: '',
        email: '',
        first_name: '',
        last_name: '',
        logged_in: false
    }),
    
    splash: new classes.Splash(),
    
    openRoom: false,
      
    closeRoom: function(){
        var app = this;
        app.openRoom = false;
    },
    
    rooms: kaskade.List.observe(collections.Rooms, {}, {
        typeFunction: function(item){return classes.Room;},
        sortingFunction: function(a, b){
            if(a.created_at > b.created_at) return -1;
            if(a.created_at < b.created_at) return 1;
            return 0;
        }
    }),
    
    createRoomForm: new classes.CreateRoomForm(),
    
    headerTitle: new kaskade.Routine(function(){
        var headerTitle = this;
        if(headerTitle.$parent.openRoom)
            return headerTitle.$parent.openRoom.title;
        return 'Multi Room Forum';
    }),
    
    logout: function(){
        var app = this;
        kaskade.execute('log_out', {},
        function(ret) {
            if (ret.status == 'error')
                return dialog(ret.message);
            if (ret.status == 'success') {
                app.currentUser.user_id = '';
                app.currentUser.email = '';
                app.currentUser.first_name = '';
                app.currentUser.last_name = '';
                app.currentUser.created_at = '';
                app.currentUser.logged_in = false;
                
                app.splash.loginForm.email = '';
                app.splash.loginForm.password = '';
                
                app.openRoom = false;
            }
        });
    }
    
});
