var self = module.exports;
var data = require('./data-client');

var DependencyTracker = (function(){
    
    var DependencyTracker = function(){
        var dependencyTracker = this;
        dependencyTracker.deps = [];
    };
    
    DependencyTracker.stack = [];
    DependencyTracker.pushToAll = function(dep){
        for(var i=0, len=DependencyTracker.stack.length; i<len; i++)
            DependencyTracker.stack[i].add(dep);
    };
    
    DependencyTracker.prototype.constructor = DependencyTracker;
    
    DependencyTracker.prototype.begin = function(){
        var dependencyTracker = this;
        DependencyTracker.stack.add(dependencyTracker);
    };
    
    DependencyTracker.prototype.add = function(dep){
        var dependencyTracker = this;
        dependencyTracker.deps.add(dep);
    };
    
    DependencyTracker.prototype.complete = function(){
        var dependencyTracker = this;
        DependencyTracker.stack.remove(dependencyTracker);
        return dependencyTracker.deps;
    };
    
    return DependencyTracker;
    
})();


self.Class = (function(){
    
    var Class = function(proto, init){
        var proto = proto || {};
        var init = init || new Function();
        
        var _Class = function(cfg){
            var _class = this;
            
            _class.$trackers = {};
                        
            for(var c in cfg){
                (function(c){
                    if(!( /^__.+__$/.test(c) || /^\$/.test(c) )){
                        _class[c] = cfg[c];
                        /*_class['__'+c+'__'] = cfg[c];
                        
                        Object.defineProperty(_class, c, {
                            get: function(){
                                DependencyTracker.pushToAll({context:_class, property:c});
                                return _class['__'+c+'__'];
                            },
                            set: function(value){
                                _class['__'+c+'__'] = value;
                                if(_class.$trackers[c]){
                                    for(var i=0, len=_class.$trackers[c].length; i<len; i++){
                                        _class.$trackers[c][i](_class, _class['__'+c+'__'], c);
                                    }
                                }
                            }
                        });*/
                        
                    }
                })(c);
            }
            
            init.call(_class);
            
            for(var c in _class){
                (function(c){
                    if(!( /^__.+__$/.test(c) || /^\$/.test(c) )){
                        _class['__'+c+'__'] = _class[c];
                        
                        Object.defineProperty(_class, c, {
                            get: function(){
                                DependencyTracker.pushToAll({context:_class, property:c});
                                return _class['__'+c+'__'];
                            },
                            set: function(value){
                                _class['__'+c+'__'] = value;
                                if(_class.$trackers[c]){
                                    for(var i=0, len=_class.$trackers[c].length; i<len; i++){
                                        _class.$trackers[c][i](_class, _class['__'+c+'__'], c);
                                    }
                                }
                            }
                        });
                        
                    }
                })(c);
            }
            
            
            for(var c in _class){
                if(_class[c])
                    _class[c].$parent = _class;
            }
            
        };
        
        _Class.observe = function(record){
            var _class = new _Class(record);
            for(var f in record){
                (function(f){
                    if( !(/^__.+__$/.test(f) || /^\$/.test(f)) ){
                        record.$track(f, function(record, value, field){
                            _class[field] = value;
                        });
                    }
                })(f);
            }
            return _class;
        };
        
        _Class.observeKey = function(collection, key){
            var query = [];
            query[collection.keyField] = key;
            collection.observe(query, new Function());
            var record = collection.records[key];
            
            return _Class.observe(record);
        };
            
        _Class.prototype.constructor = _Class;
        
        for(var p in proto){
            _Class.prototype[p] = proto[p];
        }
        
        _Class.prototype.$track = function(prop, callback){
            if(callback instanceof Function){
                var _class = this;
                _class.$trackers[prop] = _class.$trackers[prop] || [];
                _class.$trackers[prop].push(callback);
            }
        };
        
        Object.defineProperty(_Class.prototype, '$parents', {
            get: function(){
                var $parents = [];
                var $parent = this.$parent;
                while($parent){
                    $parents.push($parent);
                    $parent = $parent.$parent;
                }
                return $parents;
            }
        });
        
        Object.defineProperty(_Class.prototype, '$root', {
            get: function(){
                return this.$parents.last();
            }
        });
        
        return _Class;
        
    };
    
    return Class;
    
})();


self.Hash = self.Class();


self.List = (function(){
    
    var List = function(cfg){
        var list = this;
        var cfg = cfg || {};
        list.$trackers = [];
        list.sortingFunction = cfg.sortingFunction || function(a,b){return 0;};
        list.typeFunction = cfg.typeFunction || function(record){return self.Hash;};
        list.onInit = cfg.init || new Function();
        
        list.__items__ = [];
        Object.defineProperty(list, 'items', {
            get: function(){
                DependencyTracker.pushToAll({context: list, property: 'items'});
                return list.__items__;
            },
            set: function(value){
                list.__items__ = [];
                list.init(value);
            }
        });
    };
    
    List.observe = function(collection, query, cfg){
        var list = new List(cfg);
        collection.observe(query, function(method, record){
            switch(method){
                case 'init':
                    list.init(record);
                    for(var i=0, len=list.$trackers.length; i<len; i++){
                        list.$trackers[i](list, list.items, 'init');
                    }
                    break;
                case 'insert':
                    list.add(record);
                    break;
                case 'update':
                    list.sort(list.sortingFunction);
                    break;
                case 'negate':
                case 'remove':
                    var key = record.$keyField;
                    for(var i=0, len=list.items.length; i<len; i++){
                        if(list.items[i][key] == record[key]){
                            list.remove( list.items[i] );
                            break;
                        }
                    }
                    break;
                    
            }
        });
        return list;
    };
    
    List.prototype.constructor = List;
    
    List.prototype.init = function(items){
        var list = this;
        var items = items || [];
        for(var i in items){
            (function(i){
                var item;
                if(items[i] instanceof data.Record)
                    item = list.typeFunction.call(list, items[i]).observe(items[i]);
                else
                    item = items[i];
                item.$parent = list;
                list.items.push(item);
            })(i);
        }
        list.items.sort(list.sortingFunction);
        //Notify trackers
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, items, 'init');
        }
        list.onInit.call(list, list.items);
    };
    
    List.prototype.add = function(item){
        var list = this;
        if(item instanceof data.Record)
            item = list.typeFunction.call(list, item).observe(item);
        item.$parent = list;
        list.items.push(item);
        list.items.sort(list.sortingFunction);
        //Notify trackers
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, item, 'insert');
        }
    };
    
    List.prototype.sort = function(sortingFunction){
        var list = this;
        var unsorted = list.items.clone();
        list.sortingFunction = sortingFunction || list.sortingFunction;
        list.items.sort(list.sortingFunction);
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, unsorted, 'move');
        }
    };
    
    List.prototype.remove = function(item){
        var list = this;
        //Notify trackers
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, item, 'remove');
        }
        list.items.remove(item);
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, item, 'remove');
        }
    };
    
    List.prototype.push = function(item){
        var list = this;
        if(item instanceof data.Record)
            item = list.typeFunction.call(list, item).observe(item);
        item.$parent = list;
        list.items.push(item);
        //Notify trackers
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, item, 'insert');
        }
    };
    
    List.prototype.pop = function(){
        var list = this;
        var item = list.items.pop();
        //Notify trackers
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, item, 'remove');
        }
        return item;
    };
    
    List.prototype.unshift = function(item){
        var list = this;
        if(item instanceof data.Record)
            item = list.typeFunction.call(list, item).observe(item);
        item.$parent = list;
        list.items.unshift(item);
        //Notify trackers
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, item, 'insert');
        }
        return item;
    };
    
    List.prototype.shift = function(){
        var list = this;
        var item = list.items.shift();
        //Notify trackers
        for(var i=0, len=list.$trackers.length; i<len; i++){
            list.$trackers[i](list, item, 'remove');
        }
        return item;
    };
    
    List.prototype.$track = function(property, callback){
        var list = this;
        if(callback instanceof Function)
            this.$trackers.push(callback);
    };
    
    Object.defineProperty(List.prototype, '$parents', {
        get: function(){
            var $parents = [];
            var current = this;
            while(current.$parent){
                $parents.unshift(current.$parent);
                current = current.$parent;
            }
            return $parents;
        }
    });
    
    Object.defineProperty(List.prototype, '$root', {
        get: function(){
            return this.$parents.last();
        }
    });
    
    return List;
    
})();


self.Routine = (function(){
    
    var Routine = function(callback){
        var routine = this;
        routine.$trackers = [];
        routine.callback = callback.bind(routine);
        routine.__value__ = null;
        
        Object.defineProperty(routine, 'value', {
            get: function(){
                DependencyTracker.pushToAll({context: routine, property: 'value'});
                return routine.__value__;
            },
            set: function(value){
                routine.__value__ = value;
            }
        });
        
        self.Routine.stack.add(routine);
    };
    
    Routine.prototype.constructor = Routine;
    
    Routine.stack = [];
    
    Routine.init = function(){
        for(var i in Routine.stack)
            Routine.stack[i].init();
    };
    
    Routine.prototype.init = function(){
        var routine = this;
        var dependencyTracker = new DependencyTracker();
        dependencyTracker.begin();
        routine.value = routine.callback();
        var dependencies = dependencyTracker.complete();
        
        for(var i=0, len=dependencies.length; i<len; i++){
            var context = dependencies[i].context;
            var property = dependencies[i].property;
            context.$track(property, function(){
                routine.value = routine.callback();
                for(var i=0, len=routine.$trackers.length; i<len; i++){
                    routine.$trackers[i](routine, routine.value, 'value');
                }
            });
        }
        for(var i=0, len=routine.$trackers.length; i<len; i++){
            routine.$trackers[i](routine, routine.value, 'value');
        }
        
    };
    
    Routine.prototype.$track = function(property, callback){
        var routine = this;
        if(callback instanceof Function)
            routine.$trackers.add(callback);
    };
    
    Object.defineProperty(Routine.prototype, '$parents', {
        get: function(){
            var $parents = [];
            var current = this;
            while(current.$parent){
                $parents.unshift(current.$parent);
                current = current.$parent;
            }
            return $parents;
        }
    });
    
    Object.defineProperty(Routine.prototype, '$root', {
        get: function(){
            return this.$parents.last();
        }
    });
    
    return Routine;
    
})();
