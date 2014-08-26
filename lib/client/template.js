var self = module.exports;

self.Template = (function(){
    
    var Template = function(cfg){
        var template = this;
        var cfg = cfg || {};
        
        template.id = cfg.id;
        template.html = cfg.html;
    };
    
    Template.stack = {};
    
    Template.render = function(id){
        if(Template.stack[id] && Template.stack[id] instanceof Template)
            return Template.stack[id].render();
    };
    
    Template.parseTemplates = function(element){
        var element = element || document;
        var nodes = element.querySelectorAll('script[type="template"]');
        nodes = [].splice.call(nodes, 0);
        
        for(var i=0, len=nodes.length; i<len; i++){
            var node = nodes[i];
            var id = node.id;
            var html = '';
            if(node.textContent)
                html = node.textContent;
                
            Template.stack[id] = new Template({
                id: id,
                html: html
            });            
        }
    };
    
    
    Template.prototype.constructor = Template;
    
    Template.prototype.render = function(){
        var template = this;
        var temp = document.createElement('ELEMENT');
        temp.innerHTML = template.html;
        var frag = document.createDocumentFragment();
        
        while(temp.firstChild){
            frag.appendChild(temp.firstChild);
        }
        
        return frag;
    };
    
    
    return Template;
})();

self.BindingManager = (function(){
    var BindingManager = function(context, element, bindings){
        var bindingManager = this;
        bindingManager.context = context;
        bindingManager.element = element;
        bindingManager.bindings = {};
        bindingManager.block = false;
        
        for(var b in bindings){
            (function(b){
                if(/:/.test(bindings[b])){
                    bindingManager.bindings[b] = {};
                    var splitBindings = bindings[b].split(/,/);
                    for(var i=0, len=splitBindings.length; i<len; i++){
                        var splitBinding = splitBindings[i].split(/:| /).filter(function(el){return el.length;});
                        var type = splitBinding[0];
                        var bindingString = splitBinding[1];
                        var compiledBinding = self.BindingManager.compileBindingString(context, bindingString);
                        bindingManager.bindings[b][type] = compiledBinding;
                        bindingManager.bindings[b].typedBinding = true;
                    }
                }else{
                    var compiledBinding = self.BindingManager.compileBindingString(context, bindings[b]);
                    //var boundContext = compiledBinding.boundContext;
                    //var property = compiledBinding.property;
                    
                    bindingManager.bindings[b] = compiledBinding;
                }
            })(b);
        }
        
        for(var b in bindingManager.bindings){
            (function(b){
                
                if(b in self.Bindings){
                    if(bindingManager.bindings[b].typedBinding){
                        for(var t in bindingManager.bindings[b]){
                            (function(t){
                                if(t !== 'typedBinding'){
                                    var boundContext = bindingManager.bindings[b][t].boundContext;
                                    var property = bindingManager.bindings[b][t].property;
                                    self.Bindings[b].init.call(bindingManager, element, boundContext, boundContext[property], property, t);
                                    if(boundContext.$track instanceof Function){
                                        boundContext.$track(property, function(context, value, property){
                                            self.Bindings[b].update.call(bindingManager, element, context, value, property, t);
                                        });
                                    }
                                }
                            })(t);
                        }
                    }
                    else{
                        var boundContext = bindingManager.bindings[b].boundContext;
                        var property = bindingManager.bindings[b].property;
                        self.Bindings[b].init.call(bindingManager, element, boundContext, boundContext[property], property);
                        if(boundContext.$track instanceof Function){
                            boundContext.$track(property, function(context, value, property){
                                self.Bindings[b].update.call(bindingManager, element, context, value, property);
                            });
                        }
                    }
                }
                
            })(b);
        }
    };
    
    BindingManager.parseBindings = function(context, element){
        while(element){
            var dataset = element.dataset;
            var bindings = {};
            
            for(var d in dataset){
                if(/^k./.test(d)){
                    var binding = d.replace(/^k./, '');//.toLowerCase();
                    bindings[binding] = dataset[d];
                }
            }
            var nextElement = element.nextSibling;
            var bindingManager = BindingManager.processBindings(context, element, bindings);
            
            if(!bindingManager.block){
                BindingManager.parseBindings(context, element.firstChild);
            }
            element = nextElement;
        }
    };
    
    BindingManager.processBindings = function(context, element, bindings){
        return new BindingManager(context, element, bindings);
    };
    
    BindingManager.compileBindingString = function(context, bindingString){
        var keyPath = bindingString.split(/\.|\[|\]/).filter(function(el){return el.length;});
        var lastIndex = Math.max(bindingString.lastIndexOf('.'), bindingString.lastIndexOf('['));
        var ctxPath = bindingString.substring(0, lastIndex);
        
        var boundContext = (new Function('context', 'if(context){with(context){return '+ctxPath+'}} return '+ctxPath))(context) || context;
        var property = keyPath.pop();
        
        return {
            boundContext: boundContext || {},
            property: property || ''
        };
    };
    
    BindingManager.prototype.constructor = BindingManager;
    
    return BindingManager;
})();


self.Bindings = {}; 



//IF
self.Bindings.if = {};
self.Bindings.if.init = function(element, context, value, property, type){
    var bindingManager = this;
    bindingManager.block = true;
    bindingManager.ifPlaceHolder = document.createTextNode('');
    bindingManager.ifElement = element;
    bindingManager.ifInDOM = true;
    bindingManager.ifChildrenBound = false;
    element.parentNode.insertBefore(bindingManager.ifPlaceHolder, element);
    if(!value){
        element.parentNode.removeChild(element);
        bindingManager.ifInDOM = false;
    }else{
        self.BindingManager.parseBindings(bindingManager.context, element.firstChild);
        bindingManager.ifChildrenBound = true;
    }
};
self.Bindings.if.update = function(element, context, value, property, type){
    var bindingManager = this;
    if(value && !bindingManager.ifInDOM){
        bindingManager.ifPlaceHolder.parentNode.insertBefore(
            bindingManager.ifElement,
            bindingManager.ifPlaceHolder.nextSibling
        );
        bindingManager.ifInDOM = true;
        
        if(!bindingManager.ifChildrenBound){
            self.BindingManager.parseBindings(bindingManager.context, bindingManager.ifElement.firstChild);
            bindingManager.ifChildrenBound = true;
        }
        
    }else if(!value && bindingManager.ifInDOM){
        bindingManager.ifElement.parentNode.removeChild(bindingManager.ifElement);
        bindingManager.ifInDOM = false;
    }
};



//UNLESS
self.Bindings.unless = {};
self.Bindings.unless.init = function(element, context, value, property, type){
    var bindingManager = this;
    bindingManager.block = true;
    bindingManager.unlessPlaceHolder = document.createTextNode('');
    bindingManager.unlessElement = element;
    bindingManager.unlessInDOM = true;
    bindingManager.unlessChildrenBound = false;
    element.parentNode.insertBefore(bindingManager.unlessPlaceHolder, element);
    if(value){
        element.parentNode.removeChild(element);
        bindingManager.unlessInDOM = false;
    }else{
        self.BindingManager.parseBindings(bindingManager.context, element.firstChild);
        bindingManager.unlessChildrenBound = true;
    }
};
self.Bindings.unless.update = function(element, context, value, property, type){
    var bindingManager = this;
    if(!value && !bindingManager.unlessInDOM){
        bindingManager.unlessPlaceHolder.parentNode.insertBefore(
            bindingManager.unlessElement,
            bindingManager.unlessPlaceHolder.nextSibling
        );
        bindingManager.unlessInDOM = true;
        
        if(!bindingManager.unlessChildrenBound){
            self.BindingManager.parseBindings(bindingManager.context, bindingManager.unlessElement.firstChild);
            bindingManager.unlessChildrenBound = true;
        }
        
    }else if(value && bindingManager.unlessInDOM){
        bindingManager.unlessElement.parentNode.removeChild(bindingManager.unlessElement);
        bindingManager.unlessInDOM = false;
    }
};



//HTML
self.Bindings.html = {};
self.Bindings.html.init = 
self.Bindings.html.update = function(element, context, value, property, type){
    element.innerHTML = context[property];
};



//EVENT
self.Bindings.event = {};
self.Bindings.event.init = function(element, context, value, property, type){
    (function(element, context, value, property, type){
        element.addEventHandler(type, function(event){
            value.call(context, event, element, context);
        });
    })(element, context, value, property, type);
};
self.Bindings.event.update = new Function();



//CLICK
self.Bindings.click = {};
self.Bindings.click.init = function(element, context, value, property, type){
    (function(element, context, value, property, type){
        element.addEventHandler('click', function(event){
            value.call(context, event, element, context);
        });
    })(element, context, value, property, type);
};
self.Bindings.click.update = new Function();



//VALUE
self.Bindings.value = {};
self.Bindings.value.init = function(element, context, value, property, type){
    var bindingManager = this;
    var events = bindingManager.bindings.valueEvents || ['keyup', 'input', 'change'];
    element.value = value;
    element.addEventHandler(events, function(event){
        if(context[property] != element.value)
            context[property] = element.value;
    });
};
self.Bindings.value.update = function(element, context, value, property, type){
    if(element.value != context[property])
        element.value = context[property];
};


//RENDER
self.Bindings.render = {};
self.Bindings.render.init = 
self.Bindings.render.update = function(element, context, value, property, type){
    var bindingManager = this;
    bindingManager.block = true;
    
    var templateId = context[property];
    var frag = self.Template.render(templateId);
    
    var boundContext = bindingManager.bindings.context ? bindingManager.bindings.context.boundContext : null || null;
    var boundProperty = bindingManager.bindings.context ? bindingManager.bindings.context.property : null || null;
    
    var templateContext = context;
    if(boundContext)
        var templateContext = boundContext[boundProperty];
    
    self.BindingManager.parseBindings(templateContext, frag.firstChild);
    element.parentNode.replaceChild(frag, element);
};



//LIST
self.Bindings.list = {};
self.Bindings.list.init = function(element, context, value, property, type){
    var bindingManager = this;
    bindingManager.block = true;
    
    if(bindingManager.bindings.template)
        bindingManager.listTemplateId = bindingManager.bindings.template.property;
    
    if(bindingManager.bindings.templateAccessor)
        bindingManager.listTemplateAccessor = bindingManager.bindings.templateAccessor.property;
        
    bindingManager.listElements = [];
    bindingManager.listPlaceholder = document.createTextNode('');
    
    var items = context[property];
    
    element.parentNode.replaceChild(bindingManager.listPlaceholder, element);
    
    var listFrag = document.createDocumentFragment();
    
    for(var i=0, len=items.length; i<len; i++){
        var templateId = bindingManager.listTemplateId;
        if(items[i][bindingManager.listTemplateAccessor])
            templateId = items[i][bindingManager.listTemplateAccessor];
        
        var frag = self.Template.render(templateId);
        self.BindingManager.parseBindings(items[i], frag.firstChild);
        bindingManager.listElements.push( [].slice.call(frag.childNodes, 0) );
        listFrag.appendChild(frag);
    }
    bindingManager.listPlaceholder.parentNode.insertBefore( listFrag, bindingManager.listPlaceholder.nextSibling );
};
self.Bindings.list.update = function(element, context, value, property, type){
    var bindingManager = this;
    switch(property){
        case 'init':
            for(var i=0, len=bindingManager.listElements.length; i<len; i++){
                for(var j=0, jlen=bindingManager.listElements[i].length; j<jlen; j++){
                    bindingManager.listElements[i][j].parentNode.removeChild(bindingManager.listElements[i][j]);
                }
            }
            bindingManager.listElements = [];
            var items = value;
            var listFrag = document.createDocumentFragment();
            
            for(var i=0, len=items.length; i<len; i++){
                var templateId = bindingManager.listTemplateId;
                if(items[i][bindingManager.listTemplateAccessor])
                    templateId = items[i][bindingManager.listTemplateAccessor];
                
                var frag = self.Template.render(templateId);
                self.BindingManager.parseBindings(items[i], frag.firstChild);
                bindingManager.listElements.push( [].slice.call(frag.childNodes, 0) );
                listFrag.appendChild(frag);
            }
            
            bindingManager.listPlaceholder.parentNode.insertBefore( listFrag, bindingManager.listPlaceholder.nextSibling );
            break;
        case 'insert':
            var index = context.items.indexOf(value);
            var afterEl = bindingManager.listElements[index-1] ? bindingManager.listElements[index-1].last() : undefined;
                        
            var templateId = bindingManager.listTemplateId;
            if(value[bindingManager.listTemplateAccessor])
                templateId = value[bindingManager.listTemplateAccessor];
                
            var frag = self.Template.render(templateId);
                self.BindingManager.parseBindings(value, frag.firstChild);
            
            if(index > bindingManager.listElements.length)
                bindingManager.listElements.push( [].slice.call(frag.childNodes, 0) );
            else
                bindingManager.listElements.splice(index, 0, [].slice.call(frag.childNodes, 0) );
            
            if(afterEl)
                afterEl.parentNode.insertBefore(frag, afterEl.nextSibling);
            else
                bindingManager.listPlaceholder.parentNode.insertBefore( frag, bindingManager.listPlaceholder.nextSibling );
                
            break;
        case 'remove':
            var index = context.items.indexOf(value);
            var nodes = bindingManager.listElements[index] || null;
            
            if(nodes){
                for(var i in nodes){
                    nodes[i].parentNode.removeChild(nodes[i]);
                }
                bindingManager.listElements.splice(index, 1);
            }
            
            break;
        case 'move':
            var sorted = context.items;
            var unsorted = value;
            
            var listElements = bindingManager.listElements;
            var sortedListElements = [];
            var listFrag = document.createDocumentFragment();
            
            for(var i=0, len=sorted.length; i<len; i++){
                var oldIndex = unsorted.indexOf(sorted[i]);
                sortedListElements[i] = listElements[oldIndex];
                var frag = document.createDocumentFragment();
                for(var j=0, jlen=sortedListElements[i].length; j<jlen; j++){
                    frag.appendChild(sortedListElements[i][j]);
                }
                listFrag.appendChild(frag);
            }
            bindingManager.listElements = sortedListElements;
            bindingManager.listPlaceholder.parentNode.insertBefore( listFrag, bindingManager.listPlaceholder.nextSibling );
            break;
    }
};
