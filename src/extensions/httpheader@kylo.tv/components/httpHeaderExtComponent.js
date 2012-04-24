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

var DEBUG = true;
if (DEBUG) {	
	function debug() {
	    debug.consoleService.logStringMessage(Array.join(arguments, "  "));  
	}
	
	debug.consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
} else {
	function debug() {};
}
   
var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);

/**
 * Component to modify HTTP Request headers.
 *   - Changes UserAgent on a per-domain basis
 * @author Khalid Zubair (kzubair@hcrest.com)
 */
function HttpHeaderExt() {	

}

HttpHeaderExt.prototype = {
	
	init: function () {
        var ret = HttpHeaderExtPrefs.readRules();
        this.userAgents_ = ret[0];
        this.rules_ = ret[1];
	},
	
    /**
     * Listens for "http-on-modify-request" events and changes the User-Agent and Refer headers
     * based on configured prefs
     * @interface nsIObserver
     */ 
    observe: function(subject, topic, data) {
		try {
		
			if (topic == "profile-after-change") {
				Cu["import"]("resource://httpheaderext/httpHeaderExtPrefs.jsm");
				
				this.init();			
                this.registerChangeListener();
                
                var os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
                os.addObserver(this, "http-on-modify-request", false);						
			}
			
			if (topic == "http-on-modify-request") {
				var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);	        
				var host = httpChannel.originalURI.host;
				for (var i = 0; i < this.rules_.length; i++){
					var rule = this.rules_[i];		
					if (!rule.cond.test(host)) {
						continue;
					}

					httpChannel.setRequestHeader("User-Agent", rule.ua.value, false);
									
					if (httpChannel.referrer && rule.referrerResetList) {
						// null out the referrer if it's on our list
						var referrer = httpChannel.referrer.spec
						var D = rule.referrerResetList;
						for (var j = D.length - 1; j >= 0; j--) {
							if (referrer.indexOf(D) != -1) {
								httpChannel.referrer = null;
								break;
							}
						};
					}
					return;
				};
			}
			
		} catch (ex) {
		  	Cu.reportError(ex);
		}

    },
	
	registerChangeListener: function () {
		var self = this;
        var o = {
	        observe: function(subject, topic, pref) {
				self.init();
			}
		};
        var os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        os.addObserver(o, "http-header-ext-rules-changed", false);
	},


    // QI
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),

    // XPCOMUtils factory
    classDescription: "HTTP Header Tweaker",
    contractID: "@hcrest.com/http-header-ext;1",
    classID: Components.ID("{b211f230-3d9b-11df-9879-0800200c9a66}"),
};


const NSGetFactory = XPCOMUtils.generateNSGetFactory([HttpHeaderExt]);


