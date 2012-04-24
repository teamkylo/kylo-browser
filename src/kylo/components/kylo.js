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

function Kylo() {
    this.wrappedJSObject = this;
    this.win = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("poloContent");
}

Kylo.prototype = {
    openKeyboard: function () {
		this.win.controls_.openPanel("keyboard");
    },

	closeKeyboard: function () {
        this.win.controls_.closePanel("keyboard");
	},
	
	getZoomLevel: function () {
	    return this.win.browser_.getCurrentBrowserObject().getZoomLevel();
	},
	
	setZoomLevel:  function(zoom) {
	    this.win.browser_.getCurrentBrowserObject().setZoomLevel(zoom);
	},
	
	resetZoomLevel:  function() {
        this.win.browser_.getCurrentBrowserObject().setZoomLevel(1);
    },
	
	openTab: function (url) {
		var b = this.win.browser_.createNewBrowser(true, url);
		return b.browser_.contentWindow.wrappedJSObject;
	},
	
	closeTab: function (doc) {
        var idx = this.win.browser_.getBrowserIndexForDocument(doc);
		if (idx != -1) {
	        this.win.browser_.closeTab(idx);
		} else {
			//nothing
		}
	},
	
	/* nsISecurityCheckedComponent */
	canCreateWrapper: function (aIID) {
	    return "allAccess";
	},
	
	canCallMethod: function (aIID, methodName) {
	    return "allAccess";
	},
	
	canGetProperty: function (aIID, propertyName) {
	    switch (propertyName) {
	       case "searchFlags":
	       case "resolver":
	           return "allAccess";
	   }
	
	   return "noAccess";
	},
	
	canSetProperty: function (aIID, propertyName) {
	    if (propertyName == "searchFlags") {
	        return "allAccess";
	    }
	
	    return "noAccess";
	},

	
	/* nsIClassInfo */
	flags: Ci.nsIClassInfo.DOM_OBJECT,
	classDescription: "Kylo External API",
	getInterfaces: function getInterfaces(count) {
		var interfaceList = [Ci.nsIClassInfo, Ci.nsISecurityCheckedComponent];
		count.value = interfaceList.length;
		return interfaceList;
	},
	
	getHelperForLanguage: function getHelperForLanguage(count) {
	    return null;
	},
	
	// QI
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIClassInfo, Ci.nsISecurityCheckedComponent]),

    // XPCOMUtils factory
    contractID: "@hcrest.com/kylo-ext-api;1",
    classID: Components.ID("{b91a2950-82c2-11df-8395-0800200c9a66}"),
	_xpcom_categories: [{ category: "JavaScript global property",
                        entry: "kylo"}]
}

var components = [Kylo];

const NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
