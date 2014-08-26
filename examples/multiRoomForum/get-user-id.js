var db = require('./db');

module.exports = function(conn, done){
    var conn_id = conn ? conn.id : null;
    if(!conn_id) return done(null, null);
    db.query(
        'SELECT user_id FROM connections_users WHERE connection_id=? LIMIT 1',
        [conn_id],
        function(err, result){
            if(err) return done(err);
            if(!result.length) return done('No matching user');
            console.log(result);
            return done(null, result[0].user_id);
        }
    );
};