var mysql = require('./node-modules/mysql');
var db = mysql.createConnection({
    host: 'localhost',
    user: 'kaskade',
    password: 'SECRET',
    database: 'kaskade_chat_example'
});

var getUserId = function(conn, done){
    var conn_id = conn ? conn.id : null;
    if(!conn_id) return done(null, null);
    db.query(
        'SELECT user_id FROM users WHERE conn_id=? LIMIT 1',
        [conn_id],
        function(err, result){
            if(err) return done(err);
            if(result.length < 1) return done('No matching user');
            return done(null, result[0].user_id);
        }
    );
};


var self = module.exports;

module.exports = function($k){
    
    var SQLQueryParser = $k.data.SQLParser.SQLQueryParser;
    var SQLMutationParser = $k.data.SQLParser.SQLMutationParser;
    
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
            db: db
        }),
        mutationParser: new SQLMutationParser({
            table: 'users',
            keyField: 'user_id',
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
    
    return {
        Messages: Messages,
        Users: Users
    };
    
};
