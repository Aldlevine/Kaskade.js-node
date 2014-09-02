var kaskade = require('../../../lib/client/kaskade-client');
var collections = require('./collections');
var dialog = require('./dialog');

var classes = module.exports = (function() {

    collections.Users.observe({},new Function());

    var classes = {};

    /** MESSAGE **/
    classes.Message = new kaskade.Class({
        user_id: '',
        data: ''
    }, function() {
        var message = this;
        
        message.user = kaskade.Hash.observeKey(collections.Users, message.user_id);
        //message.user = kaskade.Hash.observe(collections.Users.records[message.user_id]);
    });

    /** MESSAGE-FORM **/
    classes.MessageForm = new kaskade.Class({
        template: 'MessageForm',
        
        data : '',
        submit : function(e) {
            var messageForm = this;

            room_id = this.$parent.room_id;

            collections.Messages.insert({
                room_id : room_id,
                data : messageForm.data
            });
            
            messageForm.data = '';
            
            if (e.preventDefault)
                e.preventDefault();
            e.returnValue = false;
        }
    });

    /** CREATE-ROOM-FORM **/
    classes.CreateRoomForm = new kaskade.Class({
        template : 'CreateRoomForm',
        title : '',
        submit : function(e) {
            var createRoomForm = this;
            var title = createRoomForm.title;
            collections.Rooms.insert({
                title : title
            });
            createRoomForm.title = '';
            if (e.preventDefault)
                e.preventDefault();
            e.returnValue = false;
        }
    });
    
    /** ROOM **/
    classes.Room = new kaskade.Class({
        template: 'Room',
        
        room_id : '',
        user_id: '',
        title : '',
        //user : new kaskade.Hash(),
        //messages : new kaskade.List(),
        created_at : '',
        //messageForm : new classes.MessageForm(),
        isOpen: false,
        
        open : function() {
            var room = this;
            room.messages = kaskade.List.observe(collections.Messages, {
                room_id : room.room_id
            }, {
                typeFunction : function() {
                    return classes.Message;
                },
                sortingFunction : function(a, b) {
                    if (a.created_at < b.created_at)
                        return 1;
                    if (a.created_at > b.created_at)
                        return -1;
                    return 0;
                }
            });
            
            room.$root.openRoom = room;

        }
    }, function() {
        var room = this;
        room.user = kaskade.Hash.observe(collections.Users[room.user_id]);
        room.messages = new kaskade.List([]);
        room.messageForm = new classes.MessageForm();

    });

    /** LOGIN **/
    function log_in(email, password, currentUser) {
        kaskade.execute('log_in', {
            email : email,
            password : password
        }, function(ret) {
            if (ret.status == 'error')
                return dialog(ret.message);
            if (ret.status == 'success') {
                currentUser.user_id = ret.user.user_id;
                currentUser.email = ret.user.email;
                currentUser.first_name = ret.user.first_name;
                currentUser.last_name = ret.user.last_name;
                currentUser.created_at = ret.user.created_at;
                currentUser.logged_in = true;
            }
        });
    };

    /** LOGIN-FORM **/
    classes.LoginForm = new kaskade.Class({
        template : 'LoginForm',

        email : '',
        password : '',
        submit : function(e) {
            var loginForm = this;
            var email = loginForm.email;
            var password = loginForm.password;

            log_in(email, password, loginForm.$root.currentUser);
            
            if (e.preventDefault)
                e.preventDefault();
            e.returnValue = false;
        }
    });

    /** SIGNUP-FORM **/
    classes.SignupForm = new kaskade.Class({
        template : 'SignupForm',

        email : '',
        first_name : '',
        last_name : '',
        password : '',
        password_conf : '',

        submit : function(e) {
            var signupForm = this;
            var email = signupForm.email;
            var first_name = signupForm.first_name;
            var last_name = signupForm.last_name;
            var password = signupForm.password;
            var password_conf = signupForm.password_conf;

            if (password != password_conf)
                return dialog('Password and confirmation do not match');

            kaskade.execute('create_user', {
                email : email,
                first_name : first_name,
                last_name : last_name,
                password : password
            }, function(ret) {
                if (ret.status == 'error')
                    return dialog(ret.message);
                if (ret.status == 'success')
                    log_in(email, password, signupForm.$root.currentUser);
            });
            
            if (e.preventDefault)
                e.preventDefault();
            e.returnValue = false;
        }
    });

    /** SPLASH **/
    classes.Splash = new kaskade.Class({
        template : 'Splash',

        login : true,
        loginForm : new classes.LoginForm(),
        signupForm : new classes.SignupForm(),

        setLogin : function() {
            var splash = this;
            splash.login = true;
        },

        setSignup : function() {
            var splash = this;
            splash.login = false;
        }
    });

    return classes;

})();
