var eventEmitter = require('./eventEmitter');
var db = require('./db');
var getUserId = require('./get-user-id');


var self = module.exports;

module.exports = function($k){
    
    eventEmitter.on('connection_closed', function(conn){
        db.query(
            'DELETE FROM connections_users WHERE connection_id=?',
            [conn.id],
            function(err, result){
                if(err) console.log(err);
            }
        );
    });
    
    var SQLQueryParser = $k.data.SQLParser.SQLQueryParser;
    var SQLMutationParser = $k.data.SQLParser.SQLMutationParser;
    
    
    var Rooms = new $k.data.Collection({
       name: 'Rooms',
       queryParser: new SQLQueryParser({
           table: 'rooms',
           db: db
       }),
       mutationParser: new SQLMutationParser({
           table: 'rooms',
           keyField: 'room_id',
           db: db,
           insertPreParser: function(conn, record, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id)
                        record.user_id = user_id;
                    return done(null, record);
                });
            },
            updatePreParser: function(conn, query, update, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id){
                        query.user_id = user_id;
                        update.user_id = user_id;
                    }
                    return done(null, query, update);
                });
            },
            removePreParser: function(conn, query, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id)
                        query.user_id = user_id;
                    return done(null, query);
                });
            }
       })
    });
    
    
    var Messages = new $k.data.Collection({
        name: 'Messages',
        queryParser: new SQLQueryParser({
            table: 'messages',
            db: db
        }),
        mutationParser: new SQLMutationParser({
            table: 'messages',
            keyField: 'message_id',
            db: db,
            insertPreParser: function(conn, record, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id)
                        record.user_id = user_id;
                    return done(null, record);
                });
            },
            updatePreParser: function(conn, query, update, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id){
                        query.user_id = user_id;
                        update.user_id = user_id;
                    }
                    return done(null, query, update);
                });
            },
            removePreParser: function(conn, query, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id)
                        query.user_id = user_id;
                    return done(null, query);
                });
            }
        })
    });
    
    
    
    var Users = new $k.data.Collection({
        name: 'Users',
        queryParser: new SQLQueryParser({
            table: 'users',
            fields: ['user_id','email','first_name','last_name','created_at'],
            db: db
        }),
        mutationParser: new SQLMutationParser({
            table: 'users',
            fields: ['user_id','email','first_name','last_name','created_at'],
            keyField: 'user_id',
            db: db,
            insertPreParser: function(conn, record, done){
                getUserId(conn, function(err, user_id){
                    if(conn) return done('Attempt to create user from connection.');
                    return done(null, record);
                });
            },
            updatePreParser: function(conn, query, update, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id){
                        query.user_id = user_id;
                        update.user_id = user_id;
                    }
                    return done(null, query, update);
                });
            },
            removePreParser: function(conn, query, done){
                getUserId(conn, function(err, user_id){
                    if(err) return done(err);
                    if(user_id)
                        query.user_id = user_id;
                    return done(null, query);
                });
            }
        })
    });
    
    return {
        Rooms: Rooms,
        Messages: Messages,
        Users: Users
    };
    
};
