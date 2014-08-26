/**
 *

SQLQueryParser:
    table: table-name
    db: mysql-instance
    auth(conn, record, done(err, authorized)): If authorized, message should get pushed to user, else not
    preParser(conn, query, done(err, query)): Modifies query before running
    
SQLMutationParser:
    table: table-name
    keyField: primary-key
    db: mysql-instance
    insertPreParser(conn, record, done(err, record)): Modifies record before insert
    updatePreparser(conn, query, update, done(err, query, update)): Modifies query and update before running update
    removePreParser(conn, query, done): Modifies query before remove 

 *
 */

var self = module.exports;

var queryToSQL = function(query){
    var str = ' ';
    if(Object.keys(query).length)
        str += ' WHERE ';
    for(var f in query){
        if(query.hasOwnProperty(f)){
            if(! (query[f] instanceof Array) )
                str += f+'="'+query[f]+'" ';
            else
                str += f+' IN ("'+query[f].join('","')+'") ';
            str += 'AND ';
        }
    }
    str = str.replace(/AND $/, '');
    return str;
};

var testToSQL = function(query, record){
    var str = ' WHERE ';
    if(Object.keys(query).length){
        str += '(';
        for(var f in query){
            if(query.hasOwnProperty(f)){
                if(! (query[f] instanceof Array) )
                    str += f+'="'+query[f]+'" ';
                else
                    str += f+' IN ("'+query[f].join('","')+'") ';
                str += 'AND ';
            }
        }
        str += ') AND ';
    }
    
    str += '(';
    for(var f in record){
        if(record.hasOwnProperty(f)){
            str += f+'="'+record[f]+'" ';
            str += 'AND ';
        }
    }
    str = str.replace(/AND $/, '');
    str += ')';
    return str;
};

self.SQLQueryParser = (function(){
    
    var SQLQueryParser = function(cfg){
        var cfg = cfg || {};
        var sqlQueryParser = this;
        sqlQueryParser.table = cfg.table;
        sqlQueryParser.fields = cfg.fields || ['*'];
        sqlQueryParser.db = cfg.db;
        sqlQueryParser.auth = cfg.auth || function(conn, record, done){return done(null, true);};
        sqlQueryParser.preParser = cfg.preParser || function(conn, query, done){return done(null, query);};
    };
    
    SQLQueryParser.prototype.test = function(conn, query, record, done){
        var sqlQueryParser = this;
        if( !(query instanceof Object && record instanceof Object) )
            return done('Cannot parse non-obects as queries');
        
        sqlQueryParser.preParser(conn, query, function(err, query){
            if(err) return done(err);
            
            sqlQueryParser.auth(conn, record, function(err, auth){
                if(err) return done(err);
                if(!auth) return done(null, false);
                
                var testQuery = 'select 1 from '+sqlQueryParser.table+' '+testToSQL(query, record)+' limit 1';
                
                sqlQueryParser.db.query(
                    testQuery,
                    function(err, result){
                        if(err) return done(err);
                        return done(null, result.length);
                    }
                );
            });
        });
    };
    
    SQLQueryParser.prototype.constructor = SQLQueryParser;
    
    SQLQueryParser.prototype.select = function(conn, query, done){
        var sqlQueryParser = this;
        
        sqlQueryParser.preParser(conn, query, function(err, query){
            var fields = sqlQueryParser.fields.join(', ');
            
            sqlQueryParser.db.query(
                'SELECT '+fields+' FROM '+sqlQueryParser.table+' '+queryToSQL(query),
                function(err, records){
                    if(err) return done(err);
                    return done(null, records);
                }
            );
            
        });
    };
    
    return SQLQueryParser;
    
})();


self.SQLMutationParser = (function(){
    
    var SQLMutationParser = function(cfg){
        var cfg = cfg || {};
        var sqlMutationParser = this;
        sqlMutationParser.table = cfg.table;
        sqlMutationParser.fields = cfg.fields || ['*'];
        sqlMutationParser.keyField = cfg.keyField || 'id';
        sqlMutationParser.db = cfg.db;
        sqlMutationParser.insertPreParser = cfg.insertPreParser || function(conn, record, done){return done(null, record);};
        sqlMutationParser.updatePreParser = cfg.updatePreParser || function(conn, query, update, done){return done(null, query, update);};
        sqlMutationParser.removePreParser = cfg.removePreParser || function(conn, query, done){return done(null, query);};
    };
    
    SQLMutationParser.prototype.constructor = SQLMutationParser;
    
    SQLMutationParser.prototype.insert = function(conn, record, done){
        var sqlMutationParser = this;
        
        sqlMutationParser.insertPreParser(conn, record, function(err, record){
            if(err) return done(err);
            if(!record) return done(null, null);
            
            sqlMutationParser.db.query(
                'INSERT INTO '+sqlMutationParser.table+' SET ?',
                record,
                function(err, result){
                    if(err) return done(err);
                    var insertId = result.insertId;
                    var fields = sqlMutationParser.fields.join(', ');
                    
                    sqlMutationParser.db.query(
                        'SELECT '+fields+' FROM '+sqlMutationParser.table+' WHERE '+sqlMutationParser.keyField+'=?',
                        [insertId],
                        function(err, result){
                            if(err) return done(err);
                            if(!result[0]) return done('Cannot insert');
                            return done(null, result[0]);
                        }
                    );
                }
            );
            
        });
        
    };
    
    SQLMutationParser.prototype.update = function(conn, query, update, done){
        var sqlMutationParser = this;
        
        sqlMutationParser.updatePreParser(conn, query, update, function(err, query, update){
            if(err) return done(err);
            if(!query || !update) return done(null, []);
            
            var sqlQuery = queryToSQL(query);
            
            sqlMutationParser.db.query(
                'SELECT '+sqlMutationParser.keyField+' FROM '+sqlMutationParser.table+' '+sqlQuery,
                function(err, ids){                    
                    if(err) return done(err);
                    if(!ids.length) return done(null, []);
                    
                    sqlMutationParser.db.query(
                        'UPDATE '+sqlMutationParser.table+' SET ? '+sqlQuery,
                        update,
                        function(err, result){
                            if(err) return done(err);
                            var upd_ids = ids.map(function(el){
                                return el[sqlMutationParser.keyField];
                            });
                            var fields = sqlMutationParser.fields.join(', ');
                            
                            sqlMutationParser.db.query(
                                'SELECT '+fields+' FROM '+sqlMutationParser.table+' WHERE '+sqlMutationParser.keyField+' IN (?)',
                                [upd_ids],
                                function(err, records){
                                    if(err) return done(err);
                                    return done(null, records);
                                }
                            );
                            
                        }
                    );
                }
            );
        });
    };
    
    
    SQLMutationParser.prototype.remove = function(conn, query, done){
        var sqlMutationParser = this;
        
        sqlMutationParser.removePreParser(conn, query, function(err, query){
            if(err) return done(err);
            var sqlQuery = queryToSQL(query);
            var fields = sqlMutationParser.fields.join(', ');
            
            sqlMutationParser.db.query(
                'SELECT '+fields+' FROM '+sqlMutationParser.table+' '+sqlQuery,
                function(err, records){
                    if(err) return done(err);
                    return done(null, records, function(){
                        sqlMutationParser.db.query(
                            'DELETE FROM '+sqlMutationParser.table+' '+sqlQuery,
                            function(err, result){
                                if(err) return done(err);
                            }
                        );
                    });
                }
            );
            
        });
        
    };
    
    return SQLMutationParser;
    
})();
