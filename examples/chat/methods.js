var self = module.exports;

module.exports = function($k){
    
    var collections = require('./collection')($k);
    
    $k.server.method('logged_in', function(conn, params, done){
        collections.Users.select(null, {conn_id:conn.id}, function(records){
            if(records.length) return done({loggedIn:true});
            return done({loggedIn:false});
        });
    });
    
    $k.server.method('log_in', function(conn, params, done){
        var name = params.name;
        var password = params.password;
        collections.Users.select(null, {name:name,password:password}, function(records){
            if(!records.length) return done({status:'error',message:'Invalid name or password'});
            var user_id = records[0].user_id;
            collections.Users.update(null, {user_id:user_id}, {conn_id:conn.id}, function(records){
                if(!records.length) return done({status:'error',message:'Oops, something went wrong...'});
                delete records[0].conn_id;
                delete records[0].password;
                return done({
                    status: 'success',
                    user: records[0]
                });
            });
        });
    });
    
    $k.server.method('log_out', function(conn, params, done){
        collections.Users.update(null, {conn_id:conn.id}, {conn_id:''}, function(records){
            if(!records.length) return done({status:'error', message:'Could not log out'});
            return done({status:'success'});
        });
    });
    
    $k.server.method('create_user', function(conn, params, done){
        var name = params.name;
        var password = params.password;
        var record = {
            name: name,
            password: password,
            conn_id: conn.id
        };
        
        collections.Users.select(null, {name:record.name}, function(records){
            if(records.length){
                return done({
                    status: 'error',
                    message: 'Username already taken'
                });
            }
            collections.Users.insert(null, record, function(record){
                if(record){
                    delete record.password;
                    delete record.conn_id;
                    
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
