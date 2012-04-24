/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

Components.utils["import"]("resource://gre/modules/XPCOMUtils.jsm");
const Cc = Components.classes;
const Ci = Components.interfaces;

function AboutHandlerFactory(v) {
    let [pageName, uri, classId] = v;    
    var f = new Function();
    f.prototype = {
        newChannel : function(aURI) {
            if(!aURI.spec == "about:" + pageName) return;
            var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
            var channel = ios.newChannel(uri, null, null);
            channel.originalURI = aURI;
            return channel;
        },
        getURIFlags: function(aURI) {
            return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT;
        },
    
        classDescription: "about:" + pageName + " Page",
        classID: Components.ID(classId),
        contractID: "@mozilla.org/network/protocol/about;1?what=" + pageName,
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule])
    }; 
    return f;
}

var modules = [
    ["",            "chrome://polo/content/about/about.xul",            "{a3a63df9-c019-11de-8a39-0800200c9a66}"],
    ["credits",     "chrome://polo/content/about/credits.xul",          "{fd359cd0-88ad-4d84-bd5b-f8cef41fc2b6}"],
    ["settings",    "chrome://polo/content/about/settingsFrame.xul",    "{a3a63df7-c019-11de-8a39-0800200c9a66}"],
	["addons",      "chrome://polo/content/about/addonmgr.xul",         "{6d06a3d6-b5e1-4c27-bf04-a1c8c5dc9081}"],
    ["certerror",   "chrome://polo/content/about/moz-certError.xhtml",  "{02deaab0-fa48-11de-8a39-0800200c9a66}"],
    ["downloads",   "chrome://polo/content/about/downloads.xul",        "{a3a63df0-c019-11de-8a39-0800200c9a66}"],
    ["help",        "chrome://polo/content/about/help.xul",             "{a3a63df6-c019-11de-8a39-0800200c9a66}"],
	["places",      "chrome://polo/content/about/placesFrame.xul",      "{a6141445-07c3-411a-b25a-574bbd0d04ff}"],
	
    // ===============                        
    ["dodo",        "http://en.wikipedia.org/wiki/dodo",            "{53bb3420-d942-11de-8a39-0800200c9a66}"],
    ["ninjas",      "http://en.wikipedia.org/wiki/ninjas",          "{a3a63df3-c019-11de-8a39-0800200c9a66}"],
    ["polo",        "http://en.wikipedia.org/wiki/polo",            "{a3a63df2-c019-11de-8a39-0800200c9a66}"],
].map(AboutHandlerFactory);

const NSGetFactory = XPCOMUtils.generateNSGetFactory(modules);

