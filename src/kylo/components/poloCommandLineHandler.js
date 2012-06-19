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

Cu["import"]("resource://gre/modules/XPCOMUtils.jsm");

var DEBUG = false;
if (DEBUG) {    
    function debug() {
        debug.consoleService.logStringMessage(Array.join(arguments, "  "));  
    }
    
    debug.consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
} else {
    function debug() {};
}

function PoloCommandLine() {
	this.wrappedJSObject = this;
}

PoloCommandLine.prototype = {
	/**
	 * @interface nsICommandLineHandler
	 */	
    handle: function(cmdLine) {
		debug(" == Handling CLI ==");
        for (var i = 0; i < cmdLine.length; i++) {
			var arg = cmdLine.getArgument(i);
			debug("   -- ", i, arg);
		}
		
		
		// try and get a handle on the polo chrome window if not in first launch
	    var win;
		var firstLaunch = (cmdLine.state == Ci.nsICommandLine.STATE_INITIAL_LAUNCH);
	    try {
            var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
			win = windowMediator.getMostRecentWindow("poloContent");
			if (!win) {
				if (!firstLaunch) {
					throw "Could not find poloContent window!!!";
				}		  	
			} else {
				cmdLine.preventDefault = true;
			}	        
	    } catch (e) {
			return;
		}
		
		var toOpen = [];
		var opts = [];
		
		// support Polo.exe -options to bring up settings
		if (cmdLine.handleFlag("options", false)) {
			var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
			toOpen.push(ios.newURI("about:settings", null, null));
		}
		
		// support -debug to enable debug tools
        if (cmdLine.handleFlag("debug", false)) {
            if (firstLaunch) {
                opts.push("debug=");
            } else {
                win.gDebugTools.enable();
            }
        }
		
		/**
		 * Support firefox style launching of -url foo, -new-tab foo and -new-window foo
		 * Open all as new tabs in Polo
		 */
		function gather(param) {
			var arg;
	        try {
	            while (arg = cmdLine.handleFlagWithParam(param, false)) {
	                toOpen.push(this.resolveURI(cmdLine, arg));
	            }
	        } catch (ex) {
	            debug(ex);
	        }			
		}
		
		gather.call(this, "url");
		gather.call(this, "new-tab");
		gather.call(this, "new-window");
		
		var arg;
		var i;
		try {
			// handle -tab @i,url
			// i is a tab index and can be negative.
			while (arg = cmdLine.handleFlagWithParam("tab", false)) {
	            var splits = arg.split(",");
	            if (splits.length == 2 && 
				    splits[0][0] == "@" && 
					!isNaN(i = splits[0].slice(1))) {
					i = parseInt(i);
					var urlpart = this.resolveURI(cmdLine, splits[1]);
					if (firstLaunch) {
						toOpen.splice(i, 0, urlpart);
					} else {
		                win.CLIHelper.openInTab(i, urlpart);					
					}
				}
			}
        } catch (ex) {
            debug(ex);
        }
		
        try {			
		    // handle -focus url or -focus @idx
			// bring url or tab index to front 
            while (arg = cmdLine.handleFlagWithParam("focus", false)) {
			    if (arg[0] == "@") {
					i = parseInt(arg.slice(1));
					if (!isNaN(i) && !firstLaunch) {
						win.CLIHelper.focusTabIndex(i);
					}
					continue;
				}
				
                if (firstLaunch) {
					var uri = this.resolveURI(cmdLine, arg);
					if (!toOpen.some(uri.equals, uri)) {
						toOpen.push(uri);						
					}
                } else {
                    win.CLIHelper.focus(this.resolveURI(cmdLine, arg));                  
                }
            }
        } catch (ex) {
            debug(ex);
        }

		/**
		 * Open the remaining args as urls, to support:
		 * Polo.exe www.google.com www.hulu.com www.yahoo.com
		 */
	    for (i = 0; i < cmdLine.length; i++) {
	        var arg = cmdLine.getArgument(i);
			if (!arg) {
				continue;				
			}

            if (arg == "-app") { //ignore -app application.ini
				i++;
                continue;               
            }
			
	        if (arg[0] == '-') { // all special args e.g. -jsconsole
				debug("  -- skip", arg);
		        continue;	  	
	        }
            
			// probably a url.
			toOpen.push(this.resolveURI(cmdLine, arg));	
	    }
		
		if (firstLaunch) {
			/**
			 * Save these urls here. Polo will pick these up on startup
			 */
			this.toOpenOnStartup_ = toOpen;
			this.startupOpts_ = opts;
		} else {
			toOpen.map(win.CLIHelper.open, win.CLIHelper);
		}
		debug(" == Done Handling CLI ==")
    },
	
	getStartupURIs: function () {
		var v = this.toOpenOnStartup_;
		this.toOpenOnStartup_ = null;
		return v;
	},
	
	getStartupOptions: function () {
	    var v = this.startupOpts_;
	    this.startupOpts_ = null;
	    return v;
	},
	
	resolveURI: function (cmdLine, uri) {
		var resolvedURI = cmdLine.resolveURI(uri);
		
		if (!(resolvedURI instanceof Ci.nsIFileURL)) {
			return resolvedURI; 
		}
		
		if (resolvedURI.file.exists()) {
			return resolvedURI;
		}
        
		try {
			var fixup = Cc["@mozilla.org/docshell/urifixup;1"].getService(Ci.nsIURIFixup);
            return fixup.createFixupURI(uri, 0);
        } catch (e) {
            debug(e);
        }

        return resolvedURI;		
	},

    // QI
    QueryInterface: XPCOMUtils.generateQI([Ci.nsICommandLineHandler]),

	// XPCOMUtils factory
	classDescription: "Polo Command Line Handler",
    contractID: "@hcrest.com/polo/final-clh;1",
	classID: Components.ID("{d8d2dd60-2afb-11df-8a39-0800200c9a66}"),
    _xpcom_categories: [{ category: "command-line-handler", entry: "x-default" }],
};

var components = [PoloCommandLine];

const NSGetFactory = XPCOMUtils.generateNSGetFactory(components);

