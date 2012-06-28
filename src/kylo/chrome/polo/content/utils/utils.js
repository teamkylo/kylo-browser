/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

var NS = {
    xul: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
    html: "http://www.w3.org/1999/xhtml",
    svg: 'http://www.w3.org/2000/svg',
    
    zui: 'http://ns.hcrest.com/ZUIExtensions/1.0',
    xlink: 'http://www.w3.org/1999/xlink',
};

[
  [
    "gHistSvc",
    "@mozilla.org/browser/nav-history-service;1",
    [Ci.nsINavHistoryService, Ci.nsIBrowserHistory]
  ],
  [
    "gURIFixup",
    "@mozilla.org/docshell/urifixup;1",
    [Ci.nsIURIFixup]
  ],
  [
    "gPrefService",
    "@mozilla.org/preferences-service;1",
    [Ci.nsIPrefService, Ci.nsIPrefBranch2]
  ],
  [
    "gContentPrefService",
    "@mozilla.org/content-pref/service;1",
    [Ci.nsIContentPrefService]
  ],
  [
    "gObserverService",
    "@mozilla.org/observer-service;1",
    [Ci.nsIObserverService]
  ],
  [
    "gIOService",
    "@mozilla.org/network/io-service;1",
    [Ci.nsIIOService]
  ],  
  [
    "gPromptService",
    "@mozilla.org/embedcomp/prompt-service;1",
    [Ci.nsIPromptService]
  ]
].forEach(function (service) {
  let [name, contract, ifaces] = service;
  window.__defineGetter__(name, function () {
    delete window[name];
    window[name] = Cc[contract].getService(ifaces.splice(0, 1)[0]);
    if (ifaces.length)
      ifaces.forEach(function (i) { return window[name].QueryInterface(i); });
    return window[name];
  });
}); 

Function.prototype.bind = function(obj) {
    var method = this;
    if (arguments.length > 1) {
        var extra = Array.slice(arguments, 1);
        return function() {
            return method.apply(obj, extra.concat(Array.slice(arguments)));
        };        
    }
    
    return function() {
        return method.apply(obj, arguments);
    };    
}

var EventUtility = {
	clickNHold: function (target, delay, shortListener, longListener) {
		var timeout = null;

		target.addEventListener("mousedown", function (evt) {
			timeout = window.setTimeout(function () {
				timeout = null;
				longListener({type: "short", target: target});
			}, delay);
		}, false);
		
		target.addEventListener("mouseout", function (evt) {
			if (timeout) {
				window.clearTimeout(timeout);
				timeout= null;
			}
        }, false);
		
        target.addEventListener("mouseup", function (evt) {
	        if (timeout != null) {
	            window.clearTimeout(timeout);
	            shortListener({type: "short", target: target});
	        }
        }, false);
	}
}

var Utils = {
    newURI: function (spec, charset, base) {
        return gIOService.newURI(spec, charset || null, base || null);  
    },
    
    newFileURI: function (file) {
        return gIOService.newFileURI(file);  
    },
    
    getURL: function (url, cb, config) {
        var req = new XMLHttpRequest();
  
        req.open('GET', url, true);
		if (config && config.mimeType != null) {
			req.overrideMimeType(config.mimeType);
		}    
        req.onreadystatechange = function (evt) {
            if (req.readyState == 4) {
                var failed;
                if (url.indexOf("http") == 0) {
                    failed = req.status != 200;
                } else {
                    failed = req.status != 0;
                }
                if (failed) {
                    cb({failed: true, result: null});    
                } else {
                    cb({failed: false, result: req.responseText});
                }
            }
        }
		
		// bypass cache by default
		if (!config || config.bypassCache != false) {
	        req.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE;
		}
		
        req.send(null);
    },
    
    jsonAdapter: function (cb, config) {
        return function (evt) {
            if (evt.failed) {
                cb(evt);
            } else {
                var result;
                try {
					var json = evt.result;
					if (config && config.useSandBoxEval) {
						var sb = new Cu.Sandbox(config.sandboxOrigin);
						sb.json = json;
					    result = Cu.evalInSandbox("JSON.parse(JSON.stringify(eval(json)));", sb);
					} else {
	                    result = JSON.parse(json);
					}
                } catch (ex) {
                    cb({failed: true, errorMessage: "Failed parsing JSON", result: null, responseText: evt.result});
                    return;                    
                }
                cb({failed: false, result: result});                
            }              
        }
    },
    
    getJSONFromURL: function (url, cb, config) {
		if (config) {
			if (!("mineType" in config)) {
				config.mimeType = "application/json"
			}
		}
        Utils.getURL(url, Utils.jsonAdapter(cb, config), config || {
			mimeType: "application/json"
		});
    },
    
//    getFile: function (file, cb) {
//        
//        var fileURI = gIOService.newFileURI(file);
//        var channel = gIOService.newChannelFromURI(fileURI);
//        
//        var streamLoader = Cc["@mozilla.org/network/stream-loader;1"].createInstance(Ci.nsIStreamLoader);
//        streamLoader.init({
//             onStreamComplete: function(aLoader, aContext, aStatus, aLength, aResult) {
//                 debug('aStatus: ' + (aStatus));
//                 cb({failed: false, result: aResult});
//             }             
//        });
//        channel.asyncOpen(streamLoader, channel);        
//        
//    },
//    
//    getJSONFromFile: function (file, cb) {
//        Utils.getURL(file, Utils.jsonAdapter(cb));
//    },
    
    /**
     * @param {string} str to hash
     * @param {string} algorithm one of {MD2, MD5, SHA1, SHA256, SHA384, SHA512} see https://developer.mozilla.org/en/nsICryptoHash#Hash_Algorithms
     * @param {string} format one of {base64, hex, binary}}
     * @return {string}
     */
    hash: function (str, algorithm, format) {  
        var converter =
          Cc["@mozilla.org/intl/scriptableunicodeconverter"].
            createInstance(Ci.nsIScriptableUnicodeConverter);
        
        // we use UTF-8 here, you can choose other encodings.
        converter.charset = "UTF-8";
        // result is an out parameter,
        // result.value will contain the array length
        var result = {};
        // data is an array of bytes
        var data = converter.convertToByteArray(str, result);
        var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
        ch.init(ch[algorithm || "SHA1"]);
        ch.update(data, data.length);
		
		return Utils.formatHash(ch, format);
    },
	
	
	hashFile: function (path, algorithm, format) {
		var file;
		if (path instanceof Ci.nsILocalFile) {
			file = path;
		} else {
			file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			file.initWithPath(path);			
		}
		
		var istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
		istream.init(file, 0x01, 0444, 0);       // open for reading
		
        var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);		
        ch.init(ch[algorithm || "SHA1"]);
		
		// this tells updateFromStream to read the entire file
		const PR_UINT32_MAX = 0xffffffff;
		ch.updateFromStream(istream, PR_UINT32_MAX);
		
        return Utils.formatHash(ch, format);
	},
	
    hashFileAsych: function (path, algorithm, format, cb, readSize) {
        var file;
        if (path instanceof Ci.nsILocalFile) {
            file = path;
        } else {
            file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
            file.initWithPath(path);            
        }
        
        var istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
        istream.init(file, 0x01, 0444, 0);       // open for reading
        
        var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);       
        ch.init(ch[algorithm || "SHA1"]);
		
		(function () {
            ch.updateFromStream(istream, 16 * 1024);
			if (istream.available()) {
				window.setTimeout(arguments.callee, 0);
			} else {
				cb(Utils.formatHash(ch, format));
			}
		})();
    },	
	    
	formatHash: function (ch, format) {
		switch (format) {
			 case "hex":
		        return Array.map(ch.finish(false), function (charr) {
		            return ("0" + charr.charCodeAt(0).toString(16)).slice(-2);
		        }).join("");
				
             case "binary":
                return ch.finish(false);
			
			case "base64":
            default:
                return ch.finish(true);
		}
	},
	
	formatVersion: function (version) {
	    // Expect version numbers in the format: Major.Minor.Build
	    var parts = version.split(".");
	    var out = [];
	    for (var i=0; i<3; i++) {
	        out[i] = parts[i] || "0";
	    }
	    return out.join(".");
	},
	
}

function debug(str) {
	if (arguments.length) {
		str = Array.map(arguments, function (val) {
			if (val === undefined) {
				return "undefined";
			}
			
			if (val === null) {
				return "null";
			}
			
			return val;
		}).join("  ");
	} else {
		if (str === undefined) {
			str = "undefined";
		}
		
		if (str === null) {
			str = "null";
		}		
	}
	
	debug.console.logStringMessage(str);	
}

function debugObj(obj, labell) {
	var a = [];
	for (var i in obj) {
		var prop = obj[i];
		a[a.length] = i + ": " + ((typeof prop == "function") ? "[function]" : prop);
	}
	
	if (labell) {
    	debug.console.logStringMessage(labell + ":\n  - " + a.join("\n  - "));    	
	} else if (a.length) {
	    debug.console.logStringMessage(a.join("\n"));
	} else {
	    debug.console.logStringMessage("{}");
	}
}

debug.ifaces = function (obj, str) {
    var ifaces = [];    
    for (var iface in Ci) {
        try {
            obj.QueryInterface(Ci[iface]);
            ifaces.push(iface);
        } catch (ex)  {
            continue;   
        }
    }
    
    if (str) {
        return ifaces.join(str === true  ? "," : str);
    }
    return ifaces;
}

debug.console = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);

