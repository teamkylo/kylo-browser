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

var SWUpdate;
var debug;

var descriptor_;
var layout_;

var strbundle_;
var updateDeck_;
var downloadMeter_;
var checkingMeter_;
var updateButton_;

function swUpdateProgress(evt) {
	switch (evt.type) {
		case "download-started":
            setLayout("download-starting");
            break;
		
		case "download-progress":  
		    setLayout("downloading");
			downloadMeter_.value = evt.progCur;
			downloadMeter_.max = evt.progMax; 
	        break;
			
        case "download-finishing":
		    setLayout("download-finishing");
            break;
			
        case "download-failed":
        case "download-invalid":
		    setLayout("download-failed");
            break;
			
	}
}

function doUpdate(){
    SWUpdate.update(descriptor_);
}  

function setLayout(layout) {
	if (layout_ == layout) {
		return;
	}
	
	switch (layout) {
		case "checking":
		    updateDeck_.selectedIndex = 0;
		    downloadMeter_.hidden = true;
		    checkingMeter_.hidden = false;
			downloadMeter_.mode = "undetermined";
		    break;
			
		case "uptodate":
            updateDeck_.selectedIndex = 1;
            downloadMeter_.hidden = true;
            checkingMeter_.hidden = false;
            break;
			
        case "available":
            downloadMeter_.hidden = true;
            checkingMeter_.hidden = false;
            updateDeck_.selectedIndex = 2;
		    updateButton_.disabled = false;
		    updateButton_.label = strbundle_.getString("about.downloadNow");
            break;
			
        case "downloading":
            updateDeck_.selectedIndex = 2;
            downloadMeter_.hidden = false;
            checkingMeter_.hidden = false;
			downloadMeter_.mode = "determined";
		    updateButton_.disabled = true;
		    updateButton_.label = strbundle_.getString("about.downloading");			
            break;

        case "download-starting":
        case "download-finishing":
            updateDeck_.selectedIndex = 2;
            downloadMeter_.hidden = false;
            checkingMeter_.hidden = false;
            downloadMeter_.mode = "undetermined";
            updateButton_.disabled = true;
            updateButton_.label = strbundle_.getString("about.downloadNow");         
            break;
			
        case "download-failed":
            downloadMeter_.hidden = true;
            checkingMeter_.hidden = false;
            updateDeck_.selectedIndex = 2;
            updateButton_.disabled = false;
            updateButton_.label = strbundle_.getString("about.downloadAgain");        
            break;
			
			
        case "check-failed":
            updateDeck_.selectedIndex = 3;
            downloadMeter_.hidden = true;
            checkingMeter_.hidden = true;
            break;			
	}	
	
	layout_ = layout;
}

function doCheck() {
    setLayout("checking");
    var win = getChromeWin();
    win.SWUpdate.check(function (evt) {
        if (evt.failed) {
           return setLayout("check-failed");
        }
		
        if (evt.result.available) {
			setLayout("available");
			descriptor_ = evt.result.descriptor;
			setLatestVersionText(descriptor_.version);	
		} else {
			setLayout("uptodate");
			descriptor = null;
		}
    });     
	
}

function setLatestVersionText(version) {
	var latestVersion = strbundle_.getString("about.latestVersion");	
	// TODO better i18n formatting
    document.getElementById("latestVersion").value = latestVersion + ": "+ version;
}

function getChromeWin() {
    var w = window.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIWebNavigation)
                        .QueryInterface(Ci.nsIDocShellTreeItem)
                        .rootTreeItem
                        .QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIDOMWindow); 

    return w;
}

function getAboutText() {
    var aboutURL = getChromeWin().gPrefService.getCharPref("about.brandingURL");
    if (!aboutURL || aboutURL == "") {
    	//get acutal version here, and use it.
	    var currentVersion = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).version;
	    document.getElementById("version").innerHTML= strbundle_.getString("about.version") + currentVersion;
        document.getElementById("defaultText").hidden = false;
        return;
    }
    Utils.getURL(aboutURL, function (evt) {
        var response = evt.result;
        document.getElementById("insertionPoint").innerHTML = response;
    });
}


function onload() {
	strbundle_ = document.getElementById("strings");
	updateDeck_ = document.getElementById("theDeck");
	downloadMeter_ = document.getElementById("downloadMeter");
	checkingMeter_ = document.getElementById("checkingMeter");
	updateButton_ = document.getElementById("updateButton");	
	
	debug = getChromeWin().debug;
	SWUpdate = getChromeWin().SWUpdate;
	
	if (getChromeWin().platform_ == "osx") {
		downloadMeter_.setAttribute("os", "mac");
	} else {
		downloadMeter_.setAttribute("os", "win32");
	}
	
    getAboutText();
	SWUpdate.addListener(swUpdateProgress);
	if (SWUpdate.isIdle()) {
		doCheck();		
	} else {
		// update is already go
        setLatestVersionText(SWUpdate.getDescriptor().version);
		// set this as the initial state and wait for progress events..
		swUpdateProgress({type: "download-started"});
	}
}

function onunload() {
	SWUpdate.removeListener(swUpdateProgress);
}
