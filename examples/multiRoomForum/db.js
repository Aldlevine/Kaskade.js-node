var mysql = require('./node-modules/mysql');

module.exports = mysql.createConnection({
    host: 'localhost',
    user: 'kaskade',
    password: 'SECRET',
    database: 'kaskade_multi_room_forum_example'
});