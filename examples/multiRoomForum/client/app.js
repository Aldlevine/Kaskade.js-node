var collections = require('./collections');
var classes = require('./classes');

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
    
    createRoomForm: new classes.CreateRoomForm()
    
});
