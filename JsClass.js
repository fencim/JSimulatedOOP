/*
Copyright 2013 LN(Lucman and Nawal) Enterprise Solution

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Implemented Functions:
-Include
-getURLParameter  
-Logger
	-Log
	-Debug
	-Warning
	-Error
-__FILE__
-__LINE__
-__DIR__
*/

var _ = _ || {};
_.AttachEvent = function AttachEvent(element, type, handler) {
	if (element.addEventListener) {
        element.addEventListener(type, handler, false);
    }
    else if (element.attachEvent) {
        element.attachEvent('on' + type, handler)
    } else {
        element['on' + type] = handler;
    }
};
_.DettachEvent = function(el, ev, fn) {
	if (!el) return false;
  	if (window.removeEventListener)  { // Standard
    	el.removeEventListener(ev, fn, false)
  	} else if (window.detachEvent) { // IE
    	var iefn = function() { 
    		fn.call(el); 
    	};
    	el.detachEvent('on' + ev, iefn)
  	} else { return false };
};
var Include = _.Include = (function(){
	var scripts = [];
	var curr = 0;
	var currScriptElem = null;
	var loadTimeout = null;
	var busy = false;
	var inited = false;
	var head = null;
	_.AttachEvent(window, 'load', init);	
	
 
	function init(){
		head = document.getElementsByTagName('head')[0];
		inited = true;
		next();
	};
 
	function next(e){
		busy = true;
		if(e){
			window.clearTimeout(loadTimeout);
			_.DettachEvent(e.target, 'load', next);
			//e.target.removeEventListener('load',next);
			var callbacks = scripts[curr-1].callbacks;
			scripts[curr-1].loaded = true; 
			if(callbacks.length > 0){
				var i = callbacks.length;
				while(i--){
					callbacks[i]();
				}
			}		
		}
		if(scripts.length > curr){
			var currentScript = scripts[curr].path;
			curr++;
			var script;
			if(currentScript.indexOf('.css') > 0){
				script = document.createElement("link");
		        script.setAttribute("type", "text/css");
		        script.setAttribute("rel", "stylesheet");
		        script.setAttribute("href", currentScript);
			} else {
				script = document.createElement('script');
				var suffix = currentScript.substring(currentScript.lastIndexOf('.')+1);
				var type;
				switch(suffix){
					case 'js': type ='text/javascript';break;
					case 'rb': type ='text/ruby';break;
					case 'py': type ='text/python';break;
					case 'php': type ='text/php';break;
					default: type = 'text/javascript';
				}	 
				script.setAttribute('type', type);
				script.setAttribute('src', currentScript);
			}		
			_.AttachEvent(script, 'load', next );	
			currScriptElem = script;
			Log("loading.." + scripts.length + "-" + curr +" "+ currentScript)
			loadTimeout = window.setTimeout(skip,10000);
			head.appendChild(script);
 
		} else {
			busy = false;
			if(e && _.Ready){
				_.Ready("idle");
			}			
		}
	};
 
	function skip(){
		_.DettachEvent(currScriptElem, 'load', next);
		//currScriptElem.removeEventListener('load',next);
		head.removeChild(currScriptElem);
		next();
	};
 	function include(scriptPath,optCallback){		
		var dup = false;
		var i = scripts.length;
		while (i--) {
			if(scripts[i].path == scriptPath){
				dup = true;
				if (optCallback) {
					if(scripts[i].loaded){
						optCallback();
					} else {
						scripts[i].callbacks.unshift(optCallback);
					}
				}
				break;
			}
		} 
		if(!dup){
			var cbs = [];
			if(optCallback) cbs.unshift(optCallback);
			scripts.push({path:scriptPath,callbacks:cbs,loaded:false});
		}
 
		if(!busy && inited) next();
	};
	for (var nIndex = 0; nIndex < arguments.length; nIndex++) {
		include(arguments[nIndex]);
	};			
	return include
})();

_.getURLParameter = function (name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}

_.__DEBUG__ = _.getURLParameter("debug") == "true";
_.__LOG_LEVEL__ = _.getURLParameter("log");
_.__LOG_LEVEL__ = (_.__LOG_LEVEL__ != "null") ? parseInt(_.__LOG_LEVEL__) : 0;

_.LOG_LEVELS = { ERROR: 1, DEBUG : 2, WARNING : 4, INFO : 8 };

_.__LOG_LEVEL__ = _.__DEBUG__ ? (_.__LOG_LEVEL__|_.LOG_LEVELS.DEBUG) : _.__LOG_LEVEL__;

_.logger = function(log) { console.log(log); };

function Log(msg,level){
	var level = level || "INFO";
	if((_.__LOG_LEVEL__ & _.LOG_LEVELS[level]) || (typeof level === 'number' && (_.__LOG_LEVEL__ & level))){
		var now = new Date();
		var log = "[" + now.toTimeString().slice(0,8) + "." + now.getMilliseconds() +"] ";
		var caller = arguments.callee.caller;
		if(caller){
			log += "[" + (caller.name || "anonymous") + "] "; 
		}
		caller = null;
		log += msg;
		_.logger(log);
		log = null;
		now = null;		
	}
};

var Trace = Log;

function Debug(msg){
	Log(msg, "DEBUG");
}
function Warning(msg){
	Log(msg, "WARNING");
}

var origError = Error || function(){};
Error = function(msg){
	Log(msg, "ERROR");
	if(this.__proto__){
		this.__proto__ = origError.prototype;	
	}
	return new origError(msg + '\r\nLine:' + __LINE().slice(0,-1).slice(0, 3).join(':'));
};
/*_.defineProperty = function(obj, propName, descriptor){
	if (!(/MSIE (\d+\.\d+);/.test(navigator.userAgent))){
		return Object.defineProperty(obj, propName, descriptor);
	}	
}*/
var __LINE = (function(){
	var scriptSource = function() {
	    var scripts = document.getElementsByTagName('script');
	    return  scripts[scripts.length - 1].src;
	};
	var stackAvailable = !!((new origError()).stack); 
  	function getLine(stack){
	  	var error = (new origError());
	  	var line = error.stack.split("\n")[3 + (stack || 0)];
	  	var fileArr = (line.indexOf('@') > 0) ? line.split("@") : line.split("(");
	  	var fileName = fileArr[fileArr.length - 1];
	  	fileArr = null;
	  	line = null;
	  	error = null;
	  	if (fileName.indexOf(' ') >= 0) {
	  		fileName = fileName.substr(fileName.lastIndexOf(' ') + 1);
	  	}
	  	if((fileName.indexOf('file:///') == 0)){
	  		fileName = fileName.substr(('file:///').length);	
	  	}
	    return fileName.split(":");
  	};
  	Object.defineProperty(window, "__FILE__", 
		{	
			get : function() {
				if(stackAvailable) {
					return getLine().slice(0,-1).slice(0, 2).join(':');	
				}
				else {
					return scriptSource();
				}				  	
			}
		}
	);
  	Object.defineProperty(window, "__LINE__", 
		{	
			get : function() {
  				return getLine().slice(2,-1).join();
  			}
		}
	);
  	Object.defineProperty(window, "__DIR__", 
		{	
			get : function() {
			  	var path = getLine().slice(0,-1).slice(0, 2).join(':');
			  	return path.substr(0, path.lastIndexOf('/') + 1);  	
  			}
		}
	);
  	return getLine;
})();

/*
Implemented Functions:
-Namespacing
-Using function  
-Class Encapsulation (support static, private, protected, public acccess modifiers)
	-Inheritance (Multiple)
	-Casting Classes from JsClass to JsClass
	-Property Referencing
	-Method/Event Delegation
	-Class Destroy
	-Class Instance Extension from External Source File
*/
//Namespace: Object Namespacing
/*IE Support Dependencies*/
if ( typeof Object.getPrototypeOf !== "function" ) {
  if ( typeof "test".__proto__ === "object" ) {
    Object.getPrototypeOf = function(object){
      return object.__proto__;
    };
  } else {
    Object.getPrototypeOf = function(object){
      return object.constructor.prototype;
    };
  }
}
if(typeof Array.prototype.indexOf !== 'function') {
	Array.prototype.indexOf = function(item){
		
		var index = 0;
		while(index < this.length) {
			if(this[index] === item) return index;
		}
		return -1; 
	};
}
/*IE SUpport*/

var Namespace = function(ns, nsObj, callback) {
	if (!ns || (typeof ns !== 'string')) {
		throw new Error('Supplied namespace is not valid');
	}	
	var names = ns.split('.');
	var top = (names[0] != 'this' || !names.splice(0,1)) ? window : nsObj;
	var name = '';
	var _ns = '';
	for (var i = 0; i < names.length - 1; i++) {
		name = names[i];
		_ns += ((_ns ? '.' :'') + name);
		top = top[name] = top[name] || (nsObj && (top[name] || {}));
		if(!top) {
			throw new Error('Supplied namespace does not exist');	
		}
		top.Namespace = _ns;
	}			
	name = names[names.length-1];
	if (top.hasOwnProperty(name)) {
		return top[name];				
	}
	else{
		(top[name] = nsObj || {}).Namespace = ns;
	}	
	if(callback && typeof callback === 'function'){
		callback.call(nsObj, ns);
	}
	return nsObj;
};
function Using(nameSpace) {
	return (function(/*arg0,arg1,...*/) {
			for (var nArg = 0; nArg < arguments.length; nArg++) {
				var constructor = arguments[nArg];
				var name = JsClass.getFnName(constructor);
				if(typeof constructor !== 'function') {
					new constructor();
				} 
				else if (name.length == 0) {
					constructor.bind((typeof nameSpace === 'string') ? Namespace(nameSpace) : nameSpace)();
					continue;		
				}
				if (typeof nameSpace === 'string') {
					Namespace((nameSpace + ('.' + name)), constructor);
				}
				else if(nameSpace) {
					nameSpace[name] = constructor;			
				}
			};			
		});
};

//JsClass
var JsClass = (function(){
	var Core;	
	var Consts = {
		ReserveFields : ['$','base','Fields','_self','StaticFields','Implements','Inherits'],
		ReserveMethods : ['$', 'Is', 'Prop', '$private'],
		AccessModifiers : {
			'public' : 0,
			'private' : 1,
			'protected' : 3,
			'static' : 4,
			'override' : 8,
			'overload' : 16
		}
	};	
	// var _privates = {};
	var _scope_counter = {};
	function _scope($_this, $key){
		$key = $key || ('$this');
		var $THIS;			
		if($_this){
			$THIS = window[$key];
			window[$key] = $_this;								
			return (function($THIS, $key){
				var $_THIS = $THIS;
				return function(scope, thisArg, args) {
					var ret;
					if(typeof scope === 'function'){						
						ret = scope.apply(thisArg, args);							
					}	
					window[$key] = $_THIS;
					if($_THIS === undefined){
						delete window[$key];
					}		
					$_THIS = null;
					return ret;		
				}; 
			})($THIS, $key);				
		}
		else{
			return false;
		}
	};	
	var _ = function JsClass(){		
		var arg0 = arguments[0],
			args = arguments, className = '', instanceFields, staticFields, constructor;
		if(arg0 instanceof Array){
			arg0 = (args = arg0)[0];			
		}
		if(typeof arg0 === 'function'){
			className = arg0.name || _.getFnName(arg0);
			constructor = arg0;			
		} 
		else if (typeof arg0 === 'string') {
			className = arg0;
			constructor = function(){};
		}
		if (className.length == 0) {
			throw new Error('Class Name is not defined');;
		}
		staticFields = args[1] || {};
		var body = function body(){
			Core.$(this);
			var ClassDec = Object.getPrototypeOf(this).constructor;	
			
			var $privates = { _self : this };
			var prop = { prototype : this };
			Core.Prop(prop, '$privates', 
				null, 
				function(val){}, 
				function(){ return $privates; }, 
				'protected');
			delete prop.prototype;
			prop = null;

			var Implements = ClassDec.Inherits || ClassDec.Implements || [];
			var hasBase  = ((Implements) instanceof Array) || ((Implements) instanceof Object);		
			var inherits = (Implements instanceof Array) ? Implements : [Implements];			
			if(hasBase){
				for(var i=0; i < inherits.length;i++){				
					var base = (inherits[i] instanceof Array) ? inherits[i][0] : inherits[i];
					var args =!(inherits[i] instanceof Array) ? [] : inherits[i][1];
					var passArgs = [];
					var counter = 0;
					for (var j = 0; j < args.length; j++) {
						var arg = args[j];
						if(typeof arg === 'string'){
							if((arg.substr(0, 1) == "{") && (arg.substr(arg.length-1) == "}")){
								var ndex = parseInt(arg.substr(1, arg.length - 2));
								arg = !isNaN(ndex) ? arguments[ndex] : arguments[counter++]; 
							}else if((arg.substr(0, 5) == "eval(") && (arg.substr(arg.length-1) == ")")) {
								arg = eval(arg.substr(5, arg.length - 6));						 
							}
						}
						passArgs[0] =  arg;
					};
					_scope(base)(base.$constructor, this, passArgs);									
				};			
			};			
			_scope(ClassDec)(ClassDec.$constructor, this, arguments);				
			if(this.base){
				for (var nBase = this.base.length - 1; nBase >= 0; nBase--) {
					var base = this.base[nBase];
					var afterConstruct = this.As(base).afterConstruct;
					if((typeof afterConstruct === 'function')){
						_scope(base)(afterConstruct, this);
					};
					afterConstruct = null;											
				};	
			};										
		};
		var Constructor = (new Function('body','return function '+ className +'(){body.apply(this, arguments);};'))(body);
		
		Constructor.$constructor = constructor;
		
		var base = function base() {};
		var commonProps = function(){};
		commonProps.prototype = new base();

		var $commonProps = commonProps.prototype;
		var $base = base.prototype; 

		Constructor.prototype = new commonProps();
		Constructor.prototype.constructor = Constructor;
		Core.$(Constructor);
		Core.Prop(Constructor, 'self', null, function(){}, undefined ,'protected');
		var StaticObject = { prototype : Constructor };
		for(var key in staticFields){
			var propName = key;
			var access_modifier = Consts.AccessModifiers.public;
			var isStatic = false;
			if(propName.indexOf('$') > 0) {
				var identifers = propName.split('$');
				propName = 	identifers[identifers.length-1];
				for (var nId = identifers.length - 1; nId >= 0; nId--) {
					 access_modifier |= Consts.AccessModifiers[identifers[nId]];
				};
				isStatic = access_modifier & Consts.AccessModifiers.static;								
			} else if (['Implements', 'Inherits'].indexOf(propName) >= 0) {
				isStatic = true;
				Constructor[propName] = staticFields[key];
				continue;
			}
			if(typeof staticFields[key] === 'function'){ if (propName == 'constructor') continue;
				if (isStatic) {					
					Core.method(StaticObject, propName, staticFields[key], access_modifier);						
				}
				else {
					Core.method(Constructor, propName, staticFields[key], access_modifier);
				}				
			}
			else if (isStatic) {
				Constructor[propName] = staticFields[key];
			}else {
				Core.Prop(Constructor, propName, staticFields[key], access_modifier);
			}  						
		}
		delete StaticObject.prototype;
		StaticObject = null;
		var parents = [];
		Core.extend(
			$commonProps,
			{ base : parents },
			{
				toString : function(){
					return ((this.Namespace || Object.getPrototypeOf(this).constructor.Namespace || "") + "{") + Object.keys(this).toString() + "}";
				},
				toLocaleString: function(){
					return this.Namespace || Object.getPrototypeOf(this).constructor.Namespace || Object.keys(this).toString();
				},
				Is : Core.Is,
				As : Core.As,
				ExtendObject : _.ExtendObject,
				destroy : _.Destroyer				
			});		
		var Implements = Constructor.Inherits || Constructor.Implements || [];
		var hasBase  = ((Implements) instanceof Array) || ((Implements) instanceof Object);		
		var inherits = (Implements instanceof Array) ? Implements : [Implements];					
		if(hasBase){
			for(var i=0; i < inherits.length;i++){				
				var base = (inherits[i] instanceof Array) ? inherits[i][0] : inherits[i];	
				Implements = base.Inherits || base.Implements || null;
				if (Implements instanceof Array) {
					for (var nBaseNdx = 0; nBaseNdx < Implements.length; nBaseNdx++) {
						if(inherits.indexOf(Implements[nBaseNdx]) < 0) {
							inherits.splice(i + nBaseNdx, 0, Implements[nBaseNdx]);
						}
					};
					base = (inherits[i] instanceof Array) ? inherits[i][0] : inherits[i];				
				}	
				for(var key in base.prototype){
					if (constructor.prototype.hasOwnProperty(key) || $base.hasOwnProperty(key)) {
						continue;
					}
					var descriptor = Object.getOwnPropertyDescriptor(base.prototype, key);
					if(descriptor && (descriptor.set || descriptor.get)) {
						Object.defineProperty($base, key, {
							set : descriptor.set,
							get : descriptor.get,
							enumerable : true,
							configurable : true
						});						
					}else {
						//$base[key] = base.prototype[key];
					}
					descriptor = null;
				}
				for(var key in base){
					if (Constructor.hasOwnProperty(key)) {
						continue;
					}
					var descriptor = Object.getOwnPropertyDescriptor(base, key);
					if(descriptor && (descriptor.set || descriptor.get)) {
						Object.defineProperty(Constructor, key, {
							set : descriptor.set,
							get : descriptor.get,
							enumerable : true,
							configurable : true
						});						
					}
					descriptor = null;
				}
				parents.push(base);
				base = null;																					
			};			
		};
		$base = null;
		parents = null;
		return Constructor;
	};
	_.getFnName = function getFnName(fn) {
	    return fn.name || (fn.toString().match(/function (.+?)\(/)||[,''])[1];
	};
	var cls2type = {},
	_push = Array.prototype.push,
	_slice = Array.prototype.slice,
	_indexOf = Array.prototype.indexOf,
	_toString = Object.prototype.toString,
	_hasOwn = Object.prototype.hasOwnProperty,
	_trim = String.prototype.trim;	
	var rawTypes = ("Boolean Number String Function Array Date RegExp Object").split(" ");
	for(var nType = 0; nType < rawTypes.length; nType++) {
		var n = rawTypes[nType];
		cls2type["[object "+ n +"]"] = n.toLowerCase();
	};
	Core = {
		$: (function(){
			var $ = 1;
			var dict = {};
			return function(obj, keep){
				if((typeof obj === 'string') && (dict[obj])){
					return dict[obj];
				}else{
					if(obj && (typeof obj !== 'undefined')) {
						if (!obj.$ && !keep) {
							obj.$ = obj.$ || ("$"+($++));	
						}
						else if(keep === true){
							obj.$ = obj.$ || ("$"+($++));
							dict[obj.$] = obj;
						}else{
							return false;	
						}																		
					}						
				}				
				return obj;
			}
		})(),
		Is: function(type){ 
			if(this instanceof type){
				return true;
			}
			var base = (this.base); 
			if (base instanceof Array) {
				for(var i in base){
					var bs = base[i];
					if((bs instanceof type) || (type === bs)){
						i = null; bs = null;
						return true;
					}						
				}
			} 
			return false;
		},
		As : function(inhertedOf){
			if(!inhertedOf) {//Copy
				return _scope(Object.getPrototypeOf(this).constructor)(
					function(){
						var as = {};
						for(key in this) {
							as[key] = this[key];
						}
						as.__proto__ = this.__proto__;//Ignore Not so Important
						as.Is = function(type){
							return (type === _.Alias) || Core.Is.call(this); 
						};
						return as;
					},
					this
				);				
			}
			else if(typeof inhertedOf !== 'function'){
				throw new Error("Cast Error: Invalid JsClass Type");
			}
			if(inhertedOf === Object.getPrototypeOf(this).constructor){
				return this;
			}
			var base = this.base;
			for(i in base){
				var bs = base[i];
				var priv = _scope(Object.getPrototypeOf(this).constructor)(Object.getOwnPropertyDescriptor(this,'$privates').get,this);
				if((bs instanceof inhertedOf) || (inhertedOf === bs)){					
					return (priv[bs.$] || (priv[bs.$] = (new _.Alias(this, bs))));
				}						
			}
			return null;			
		},
		Prop : function(constructor, name, val, setterCallback, getterCallback, access_modifier){
			var setterProp, getterProp;
			var proto = constructor.prototype 
				|| (getterCallback && constructor) 
				|| (function(){ 
					throw new Error('Invalid Reference Object');
				})();
			if(proto.hasOwnProperty(name)) {
				return;
			};
			setterProp = (function(propName, $hash_callBack, access_mod){
				return function $propSetter(val){					
					if((access_mod & Consts.AccessModifiers.private) && (window['$this'] !== Object.getPrototypeOf(this).constructor)) {
						throw new Error("Cannot Access Private Property");
					}else if ((access_mod & Consts.AccessModifiers.protected)  && (window['$this'] !== Object.getPrototypeOf(this).constructor)) {
						if(this.base && (this.base.indexOf(window['$this']) < 0)) {
							throw new Error("Cannot Access Protected Property");
						}
					};
					if(typeof $hash_callBack === 'function') {
						$hash_callBack(propName, val);
					}
					else {
						var priv = _scope(Object.getPrototypeOf(this).constructor)(Object.getOwnPropertyDescriptor(this,'$privates').get,this);						
						var oldVal = priv['_' + propName];
						priv['_' + propName] = val;
						//observable
						var delegates = priv['d_' + propName];
						for (var i = 0;(delegates instanceof Array) && (i < delegates.length); i++) {
							(delegates[i]).call(this, val, propName, oldVal);
						};	
						oldVal = null;						
					}	
					priv = null;				 					
				};
			})(name, setterCallback, access_modifier);
			getterProp = (function(propName, $hash_callBack, defaultVal, access_mod){
				return function $propGetter(){
					if((access_mod === 'private') && (window['$this'] !== Object.getPrototypeOf(this).constructor)) {
						throw new Error("Cannot Access Private Property");
					}else if ((access_mod == 'protected')  && (window['$this'] !== Object.getPrototypeOf(this).constructor)) {
						if(this.base && (this.base.indexOf(window['$this']) < 0)) {
							throw new Error("Cannot Access Protected Property");
						}
					}
					var descriptor;
					if(typeof $hash_callBack === 'function'){
						return $hash_callBack(propName);						
					}
					else if (descriptor = Object.getOwnPropertyDescriptor(this,'$privates')) {
						return ((_scope(Object.getPrototypeOf(this).constructor)(descriptor.get,this))['_' + propName]) || defaultVal;
					}					
				}	
			})(name, getterCallback, val, access_modifier);
			Object.defineProperty(proto, name, {
				set : setterProp,
				get : getterProp,
				enumerable : true,
				configurable : true
			});
			setterProp = null;
			getterProp = null;
			proto = null;			
		},
		observe: function observe(object, propName, callback, mArgs){
			if(!object || !(object instanceof Object)){
				throw new Error("Invalid Object for referencing");
			}
			if( !propName || (undefined === object[propName]) ){
				throw new Error("Invalid Object Property for referencing");
			}
			if(!callback || (typeof callback !== 'function')){
				throw new Error("Invalid Callback for referencing");
			}
			Debug("Bind " + propName + " " + (typeof object[propName]));
			if((typeof object[propName]) === 'function'){
				Debug("Binding method?");
			}
			var setter;
			var privates;
			var proto = Object.getPrototypeOf(object);
			var commonProto = Object.getPrototypeOf(proto);
			var leafProto = (commonProto && Object.getPrototypeOf(commonProto)) || commonProto;
			var leafDesc;
			var descriptor = Object.getOwnPropertyDescriptor(proto, propName);			
			if((setter = (descriptor && descriptor.set) 
				|| ((leafDesc = Object.getOwnPropertyDescriptor(leafProto, propName)) && (setter = leafDesc.set))) 
				&& (privates = object.$privates)) {
				var bindSetter;
				proto = null; commonProto = null; leafProto = null; leafDesc = null; descriptor = null;
				bindSetter = (function(obj, propName, callback){
					var oldVal = obj[propName];
					return function observer(val) {
						_scope((obj && obj.constructor) || obj)(
							callback, obj, [oldVal, val, propName]
						);												
						oldVal = val;
					};
				})(object, propName, callback);				
				setter._delegates = (privates['d_' + propName]) || (privates['d_' + propName] = []);
				Core.method.prototype.push.call(setter, bindSetter);
				delete setter._delegates;
				return callback;
			}
		},
		method : (function(){
			function SimulateMethod(constructor, name, func, access){
				var m = (function(f, accs){
						var method = function Method() {
							if((accs & Consts.AccessModifiers.private) && (window['$this'] !== Object.getPrototypeOf(this).constructor)) {
								throw new Error("Cannot Access Private Property");
							}else if ((accs & Consts.AccessModifiers.protected)  && (window['$this'] !== Object.getPrototypeOf(this).constructor)) {
								if(this.base && (this.base.indexOf(window['$this']) < 0)) {
									throw new Error("Cannot Access Protected Property");
								}
							};									
							var scope_base = _scope((function(ThisArg, n, m){								
								return (function(){
									var ret;
									if (Object.getPrototypeOf(this).base instanceof Array){										
										for (var nBase = 0; nBase < Object.getPrototypeOf(this).base.length; nBase++) {
											if(Object.getPrototypeOf(this).base[nBase].prototype.hasOwnProperty(n)) {
												var bMethod = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this).base[nBase].prototype,n).get;
												bMethod = (bMethod && bMethod(true)) || Object.getPrototypeOf(this).base[nBase].prototype[n];
												if(bMethod === m){
													return ret;
												}
												if(typeof bMethod === 'function'){
													ret = bMethod.apply(this, arguments)
												}
											}
										};
									}
									return ret;
								}).bind(ThisArg);								
							})(this, name, f),'base');
							var ThisClass =  (!this.prototype && Object.getPrototypeOf(this).constructor) || this;
							var ret = _scope(ThisClass)(f, this.self || this, arguments);
							scope_base(); scope_base = null;
							var descriptor = Object.getOwnPropertyDescriptor(this, '$privates');
							var priv = _scope(ThisClass)((descriptor && descriptor.get) || function(){} ,this);
							if(priv) {
								var delegates = priv['d_' + name]; 
								if(!(arguments.callee.caller) || !(delegates) || (delegates.indexOf(arguments.callee.caller) < 0)) {		
									for (var i = 0;(delegates instanceof Array) && (i < delegates.length); i++) {
										if(delegates[i] !== arguments.callee) {		
											var bMethod = delegates[i];									
											_scope(ThisClass)(bMethod, this, arguments);
											if(bMethod.callCount) {
												bMethod.callCount--;
												if(bMethod.callCount <= 0) {
													delegates.splice(delegates.indexOf(bMethod), 1);
													i--;
												}
											}
											bMethod = null;
										}
										else {
											_scope(ThisClass)(f, this.self, arguments);
											f.apply(this.self, arguments);
										}					
									};
								}	
								delegates = null;
								priv = null;	
							}
							ThisClass = null;							
							return ret;		
						};
						return (function(m,n){
							return function(dontbind){
								var boundedM;
								var privM = Object.getOwnPropertyDescriptor(this, '$privates');
								var priv;
								if(privM) {
									priv = _scope(Object.getPrototypeOf(this).constructor)(privM.get,this);	
								}								
								if(priv){
									boundedM = !dontbind ? m.bind(this) : m;
									if(boundedM.__proto__){
										boundedM.__proto__ = SimulateMethod.prototype;	
									}else {
										boundedM.push = SimulateMethod.prototype.push.bind(boundedM);
									}									
									boundedM._delegates = (priv['d_' + n]) || (priv['d_' + n] = []);	
								} else if (Object.getPrototypeOf(this).constructor == this) {
									boundedM = !dontbind ? m.bind(this) : m;
								} else if (dontbind){
									return f;
								} else if (Object.getPrototypeOf(this).constructor != this) {
									return m;
								} 
								else {
									boundedM = (function(){
										Debug('Method ' + n + 'lost!');
									});
								}								
								priv = null;
								return boundedM;
							};
						})(method, name);
					})(func, access); 	
				Object.defineProperty(constructor.prototype, name, {
					get :  m, 
					enumerable : true,
					configurable : true
				});
				return m;
			};
			SimulateMethod.prototype = {
				push : function pushMethod(callBack, ThisArg, counter){
					if(typeof callBack !== 'function') return false;  
					this._delegates = this._delegates || [];
					if(this._delegates.indexOf(callBack) < 0) {
						var bMethod = ThisArg ? callBack.bind(ThisArg) : callBack;
						this._delegates.push(bMethod);
						if((typeof counter != 'undefined') && counter){
							bMethod.callCount = counter;
						}
						return bMethod;			
					}
					return false;
				},
				pop : function popMethod(){
					return ((this._delegates instanceof Array) && this._delegates.pop());
				},
				remove : function removeMethod(method){
					if (this._delegates instanceof Array) {
						var nIndex = this._delegates.indexOf(method);
						return (nIndex >= 0) && ((this._delegates.splice(nIndex,1))[0]);
					} 
					return false;;
				},
				bindThis : function bindMethod(callBack, ThisArg){
					return function $bound_this(){
						return callBack.apply(ThisArg, arguments);
					};
				},
				destroy : function destroyMethod(){
					var delegates = this._delegates;
					while((delegates instanceof Array) && delegates.pop()){	};
					delegates = null;
				},
				__proto__ : Object
			};
			return SimulateMethod;
		})(),
		defineProp : function(obj, prop, setter, getter) {
			Object.defineProperty(obj, prop, 
				{	
					get : setter ,
					set : setter,
					enumerable : true,
					configurable : true
				}
			);
		},
		//From jQuery
		isFunction: function( obj ) {
			return Core.type(obj) === "function";
		},
		isArray: Array.isArray || function( obj ) {
			return Core.type(obj) === "array";
		},
		isWindow: function( obj ) {
			return obj != null && obj == obj.window;
		},
		isNumeric: function( obj ) {
			return !isNaN( parseFloat(obj) ) && isFinite( obj );
		},
		type: function( obj ) {
			return obj == null ?
				String( obj ) :
				cls2type[ _toString.call(obj) ] || "object";
		},
		isPlainObject: function( obj ) {
			if ( !obj || Core.type(obj) !== "object" || obj.nodeType || Core.isWindow( obj ) ) {
				return false;
			}
			try {
				// Not own constructor property must be Object
				if ( obj.constructor &&
					!_hasOwn.call(obj, "constructor") &&
					!_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
					return false;
				}
			} catch ( e ) {
				return false;
			}
			var key;
			for ( key in obj ) {}
			return key === undefined || _hasOwn.call( obj, key );
		},
		isEmptyObject: function( obj ) {
			var name;
			for ( name in obj ) {
				return false;
			}
			return true;
		},		
		extend: function() {
			var options, name, src, copy, copyIsArray, clone,
				target = arguments[0] || {},
				i = 1,
				length = arguments.length,
				deep = false;
			// Handle a deep copy situation
			if ( typeof target === "boolean" ) {
				deep = target;
				target = arguments[1] || {};
				// skip the boolean and the target
				i = 2;
			}
			// Handle case when target is a string or something (possible in deep copy)
			if ( typeof target !== "object" && !Core.isFunction(target) ) {
				target = {};
			}
			// extend jQuery itself if only one argument is passed
			if ( length === i ) {
				target = this;
				--i;
			}
			for ( ; i < length; i++ ) {
				// Only deal with non-null/undefined values
				if ( (options = arguments[ i ]) != null ) {
					// Extend the base object
					for ( name in options ) {
						src = target[ name ];
						copy = options[ name ];
						// Prevent never-ending loop
						if ( target === copy ) {
							continue;
						}
						// Recurse if we're merging plain objects or arrays
						if ( deep && copy && ( Core.isPlainObject(copy) || (copyIsArray = Core.isArray(copy)) ) ) {
							if ( copyIsArray ) {
								copyIsArray = false;
								clone = src && Core.isArray(src) ? src : [];
							} else {
								clone = src && Core.isPlainObject(src) ? src : {};
							}
							// Never move original objects, clone them
							target[ name ] = Core.extend( deep, clone, copy );
						// Don't bring in undefined values
						} else if ( copy !== undefined ) {
							target[ name ] = copy;
						}
					}
				}
			}
			// Return the modified object
			return target;
		} 
		//From jQuery
	};
	Core.extend(_, Core);	
	function _extend(){		
		var stack = {};
		return function(extension, src) {
			var object = null;
			if (Core.isPlainObject(extension) && (typeof src === 'string')) {
				var filename = src.substring(src.lastIndexOf('/'));
				var extItem;
				for(var extendUrl in stack) {
					if(extendUrl.indexOf(filename) >= 0) {
						extItem = stack[extendUrl];
						break;
					}
				}
				if(!extItem) {
					throw new Error('No Extentsion');
					return;
				}
				object = extItem.obj;
				delete extItem.obj;
				if (extension) {
					var ThisObject = { prototype : object };							
					for (var key in extension) {
						var propName = key;
						var access_modifier = Consts.AccessModifiers.public;
						if(propName.indexOf('$') > 0) {
							var identifers = propName.split('$');
							propName = 	identifers[identifers.length-1];
							for (var nId = identifers.length - 1; nId >= 0; nId--) {
								 access_modifier |= Consts.AccessModifiers[identifers[nId]];
							};
						}						
						if(typeof extension[key] === 'function'){
							var m = object[propName];									
							if(m && m.push) {
								m.push(extension[key], object);
							}else{
								Core.method(ThisObject, propName, extension[key], access_modifier);
							}
						}else {
							object[propName] = extension[key];
						} 
					}					
				}
				if(extItem.callback) {
					extItem.callback();
					delete extItem.callback;
				}
				extItem.data = extension;
				return;
			}
			else if ((typeof extension === 'string') && this.Is && !src ) {
				object = this;
				src = extension;
			}
			else if (extension.Is && (typeof src === 'string')) {
				object = extension;
			}
			else {
				if (extension && extension.Is && !src) {
					for (var srcExt in stack) {
						if(stack[srcExt].obj === extension) {
							return srcExt;
						}
					}
				}
				return false;
			}
			if(stack[src] && stack[src].data) {
				return function returnCallBack (callBack) {
					if (typeof callBack === 'function') {
						stack[src].obj = object;
						stack[src].callback = callBack;
						_.ExtendObject(stack[src].data, src);
					}
				};					
				return;
			}
			stack[src] = { obj : object };				
			Include(src, undefined, true);
			return (function(extendItem){
				return function returnCallBack (callBack) {
					if (typeof callBack === 'function') {
						extendItem.callback = callBack;
					}
				};	
			})(stack[src]);
		}	
	};
	_.ExtendObject = _extend();
	_.Destroyer = function(){
		if(arguments.length > 0){
			if (!arguments[0]) return false;
			return _.Destroyer.call(arguments[0]);
		}					
		return _scope(Object.getPrototypeOf(this).constructor)(function(){
			var ret;
			if(this.Is){
				if(!(this.Is(_.Alias))) {
					var base = (this.base); 
					Object.getPrototypeOf(this).hasOwnProperty('onDestroy') && this.onDestroy();
					if (base instanceof Array) {
						for (var i = base.length - 1; i >= 0; i--) {
							var bs = base[i];
							var descriptor = Object.getOwnPropertyDescriptor(bs.prototype,'onDestroy');
							var onDestroy = (descriptor && descriptor.get) || undefined; 
							descriptor = null;
							if(typeof onDestroy === 'function'){
								onDestroy.call(this)//Get Bounded Method
									.call(this);	//Invoke Method
							}
							bs = null;	
							onDestroy = null;					
						}
					}			
					var priv = this.$privates;
					for (var key in priv) {
						if(key.indexOf('d_') == 0) {
							priv[key].splice(0, priv[key].length);
						} 
						delete priv[key];				
					};	
				}				
				else {//Alias
					delete this.self[Object.getPrototypeOf(this).constructor.$];
					delete this.Is;
				}
			}			
			if(Object.getPrototypeOf(this) && (Object.getPrototypeOf(this).name) && (Object.getPrototypeOf(this).name != "Empty")) {
				//Object.getPrototypeOf(this) = null;	
			}			
			for(var key in this){				
				ret = (delete this[key]) || ret;				
			}		
			return ret;
		}, this);
	};	
	_.Alias = function AliasClass(obj, type, destroyTimeout){
		if((typeof type !== 'function') || !type.prototype || !type.prototype.Is) {
			throw new Error("Type is not JsClasss");
		}
		return (_scope(Object.getPrototypeOf(obj).constructor)(function(base){
			var aliasConstructor = function alias_constructor(){};
			aliasConstructor.prototype = base.prototype;
			var alias = new aliasConstructor();
			delete alias.$privates;
			var descriptorPriv = Object.getOwnPropertyDescriptor(this, '$privates');
			Object.defineProperty(alias, '$privates', {
				get : descriptorPriv.get,
				enumerable : true,
				configurable : true
			});
			var descriptorSelf = Object.getOwnPropertyDescriptor(this, 'self');
			if(descriptorSelf) {
				Object.defineProperty(alias, 'self', {
					get : descriptorSelf.get,
					enumerable : true,
					configurable : true
				});	
			}						
			alias.Is = function(type){
				return (type === _.Alias) || _.Is.call(this); 
			};
			return alias;
		}, obj, [type]));	
	};
	return _;
})();	
