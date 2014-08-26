var self = module.exports;
var crypto = require('crypto');
var db = require('./db');
var getUserId = require('./get-user-id');

var oops_message = 'Oops, something went wrong!';

var generate_hash = function(message, salt){
    return crypto.createHash('sha1').update(message + salt).digest('base64');
};

module.exports = function($k){
    
    var collections = require('./collection')($k);
    
    $k.server.method('logged_in', function(conn, params, done){
        collections.Users.select(null, {conn_id:conn.id}, function(records){
            if(records.length) return done({loggedIn:true});
            return done({loggedIn:false});
        });
    });
    
    $k.server.method('log_in', function(conn, params, done){
        var email = params.email;
        var password = params.password;
        
        var incorrect_message = 'Email or password is incorrect';
        
        db.query(
            'SELECT password_salt FROM users WHERE email=? LIMIT 1;',
            [email],
            function(err, result){
                if(err) return done({
                    status: 'error',
                    message: oops_message
                });
                if(!result.length) return done({
                    status: 'error',
                    message: incorrect_message
                });
                var password_salt = result[0].password_salt;
                var password_hash = generate_hash(password, password_salt);
                
                var query = {
                    email: email,
                    password_hash: password_hash
                };
                
                collections.Users.select(null, query, function(records){
                    if(!records.length) return done({
                        status: 'error',
                        message: incorrect_message
                    });
                    var user_id = records[0].user_id;
                    
                    db.query(
                        'INSERT INTO connections_users SET ?',
                        {user_id: user_id, connection_id: conn.id},
                        function(err, result){
                            if(err) return done({
                                status: 'error',
                                message: oops_message
                            });
                            
                            return done({
                                status: 'success',
                                user: records[0]
                            });
                        }
                    );
                    
                });
            }
        );

    });
    
    $k.server.method('log_out', function(conn, params, done){
        getUserId(conn, function(err, user_id){
            db.query(
                'DELETE FROM connections_users WHERE user_id=?',
                [user_id],
                function(err, result){
                    if(err || !result.affectedRows) return done({
                        status: 'error',
                        message: oops_message
                    });
                    return done({status: 'success'});
                }
            );
        });
    });
    
    $k.server.method('create_user', function(conn, params, done){
        var email = params.email;
        var first_name = params.first_name;
        var last_name = params.last_name;
        var password = params.password;
        
        var password_salt = crypto.randomBytes(16).toString('base64');
        var password_hash = generate_hash(password, password_salt);
        
        var record = {
            email: email,
            first_name: first_name,
            last_name: last_name,
            password_hash: password_hash,
            password_salt: password_salt
        };
        
        collections.Users.select(null, {email:record.email}, function(records){
            if(records.length){
                return done({
                    status: 'error',
                    message: 'Email already used'
                });
            }
            collections.Users.insert(null, record, function(record){
                if(record){
                    var ret = {
                        status: 'success',
                        user: record
                    };
                    done(ret);
                }
            });
        });
    });
    
};
