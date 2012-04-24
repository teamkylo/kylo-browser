/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var EXPORTED_SYMBOLS = [ "HttpHeaderExtPrefs" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;


var DEBUG = false;
if (DEBUG) {    
    function debug() {
        debug.consoleService.logStringMessage(Array.join(arguments, "  "));  
    }
    
    debug.consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
} else {
    function debug() {};
}


/**
 * Handles reading and writing configuration from prefs
 */
var HttpHeaderExtPrefs = {
    init: function () {
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
        var xulRuntime = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);
        
        this.uaPrefs_ = prefs.getBranch(this.UA_BRANCH + xulRuntime.OS + ".");
        this.rulesPrefs_ = prefs.getBranch(this.RULES_BRANCH);
        
        prefs.QueryInterface(Ci.nsIPrefBranch);
        this.referrerResetList_ = prefs.getCharPref(this.DEFAULT_REFERRER_RESET_LIST);
        
        this.os_ = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);     
    },
    
    readRules: function () {
        
        if (!this.uaPrefs_) {
            this.init();
        }
        
        var userAgents = {};
        var rules = [];

        var keys, count = {};
        
        /**
         * Get a list of user agents
         */
        keys = this.uaPrefs_.getChildList("", count);
        keys.sort();
        for (var i = keys.length - 1; i >= 0; i--){
            var m = keys[i].match(/(\d+)\.name$/);
            if (!m) {
                continue;
            }
			var key = m[1];
			userAgents[key] = {
				type: "preset",
				value: this.uaPrefs_.getCharPref(key + ".value"),
				name: this.uaPrefs_.getCharPref(key + ".name"),
				key: key
			}
        };
		
        /**
         * Get a list of rules
         */
        keys = this.rulesPrefs_.getChildList("", count);
		var fkeys = [];
		
        for (var i = keys.length - 1; i >= 0; i--){
            var m = keys[i].match(/(\d+)\.cond$/);
            if (m) {
                fkeys[fkeys.length] = m[1];
            }
		}
		fkeys.sort();
		
		for (var i = 0; i < fkeys.length; i++){
            var base = fkeys[i];
            var text = this.rulesPrefs_.getCharPref(base + ".cond");
            var ua = this.rulesPrefs_.getCharPref(base + ".ua");
			
			var type;
			if (this.rulesPrefs_. getPrefType(base + ".cond.type") == Ci.nsIPrefBranch.PREF_STRING) {
				type = this.rulesPrefs_.getCharPref(base + ".cond.type");
			} else {
				type = "simple-domain";
			}
			
			var cond;			
			if (type == "simple-domain") {				
				cond = new RegExp("\\b" + text.replace(/\./g, "\\.") + "$");
			} else if (type == "regex-domain") {
				cond = new RegExp(text);
			} else {
				continue
			}
			
			if (ua in userAgents) {
				ua = userAgents[ua];
			} else {
				ua = {
					type: "custom",
					value: ua
				}
			}

			if (this.rulesPrefs_.getPrefType(base + "nukeRefererFrom") == Ci.nsIPrefBranch.PREF_STRING) {
				var referrerResetList = this.rulesPrefs_.getCharPref(base + "nukeRefererFrom");
				if (referrerResetList == "default") {
					referrerResetList = referrerResetList;
				} else {
					referrerResetList = referrerResetList.split("|");
				}
			} else {
				referrerResetList = null;
			}
			
		
            rules[rules.length] = {
				cond: cond,
				cond_text: text,
                ua: ua,
                referrerResetList: referrerResetList,
                key: base
            };
        };
        
        return [userAgents, rules];
    },
    
    getNextKey: function (branch) {
        var count = {};
        var keys = branch.getChildList("", count);
        var max = 0;
        for (var i = keys.length - 1; i >= 0; i--) {
            var key = keys[i].match(/^(\d+)/)[1];
            max = Math.max(parseInt(key), max);
        }

        return max + 1;
    },
    
    /**
     * Builds a regex string that would match hostName and any child domain
     * @param {Object} hostName
     * @return false if hostName is invalid
     */
    modifyAltUAForHost: function (key, hostName, ua) {
        if (hostName.length == 0 || /[^a-zA-Z0-9-.]+/.test(hostName)) {
            return false;
        }

		var base = key + ".";
        this.rulesPrefs_.setCharPref(base + "cond", hostName);
		this.rulesPrefs_.setCharPref(base + "cond.type", "simple-domain");
        this.rulesPrefs_.setCharPref(base + "ua", ua.key);
        this.rulesPrefs_.setCharPref(base + "nukeRefererFrom", "default");
        
        this.notify();
        return true;        
    },
	
	addAltUAForHost: function (hostName, ua) {
        var key = this.getNextKey(this.rulesPrefs_);	
		return this.modifyAltUAForHost(key, hostName, ua);
	},
    
    deleteRule: function (key) {
        this.rulesPrefs_.deleteBranch(key);     
        this.notify();
    },
    
    notify: function () {
        this.os_.notifyObservers(null, "http-header-ext-rules-changed", "");			
    },

    restoreDefaults: function () {
        var count = {};
        var keys = this.rulesPrefs_.getChildList("", count);
        for (var j = 0; j < keys.length; j++) {
            var k = keys[j];
            if (this.rulesPrefs_.prefHasUserValue(k)) {
                this.rulesPrefs_.clearUserPref(k);
            } 
        }
		this.notify();
    },
    
    UA_BRANCH: "headers.ua.",
    
    RULES_BRANCH: "headers.rewrite.",
    
    DEFAULT_REFERRER_RESET_LIST: "headers.nukeRefererFrom.default", 
}
