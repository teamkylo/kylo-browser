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

var chromeWin_;

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

function getChromeWin() {
    if (!chromeWin_) {
        chromeWin_ = window.QueryInterface(Ci.nsIInterfaceRequestor)
                            .getInterface(Ci.nsIWebNavigation)
                            .QueryInterface(Ci.nsIDocShellTreeItem)
                            .rootTreeItem
                            .QueryInterface(Ci.nsIInterfaceRequestor)
                            .getInterface(Ci.nsIDOMWindow);
    }
    
    return chromeWin_;
}

function Add() {
	this.bmsvc_ = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
	this.folderPanel_ = document.getElementById("folder-chooser");
	this.tree_ = document.getElementById("folderTree");
	this.folderBox_ = document.getElementById("folderTreeBox");
	this.tree_.addEventListener("select", this.handleItemClick.bind(this), false);
	this.name_ = document.getElementById("nameField");
    this.url_ = document.getElementById("urlField");  
	this.folderIds_ = [];
	this.mainBox_ = document.getElementById("mainBox");
	this.selectedFolder_ = null;
	this.newFolderGroup_ = document.getElementById("folderNameEntry");
	this.folderName_ = document.getElementById("folderNameField");
	this.folderButton_ = document.getElementById("folderButton");
	this.folderButton_.addEventListener("command", this.chooseFolder.bind(this), false);
	document.getElementById("cancelButton").addEventListener("command", this.close.bind(this), false);
    document.getElementById("saveButton").addEventListener("command", this.save.bind(this), false);
    document.getElementById("openPageButton").addEventListener("command", this.chooseOpen.bind(this), false);
    document.getElementById("closeFolderPanel").addEventListener("command", this.closeFolder.bind(this), false);
	document.getElementById("chooseFolderButton").addEventListener("command", this.pickFolder.bind(this), false);
	document.getElementById("newFolderButton").addEventListener("command", this.showNewFolderDialog.bind(this), false);
	document.getElementById("deleteFolderButton").addEventListener("command", this.removeFolder.bind(this), false);
	document.getElementById("folderOkay").addEventListener("command", this.createNewFolder.bind(this), false);
	document.getElementById("folderCancel").addEventListener("command", this.closeNewFolder.bind(this), false);
}

Add.prototype.close = function () {
	var idx = getChromeWin().browser_.getBrowserIndexForDocument(document);
	getChromeWin().browser_.closeTab(idx);
}

Add.prototype.showNewFolderDialog = function () {
	this.newFolderGroup_.hidden = false;
	this.folderBox_.hidden = true;
	this.folderName_.focus();
	this.folderName_.select();
}

Add.prototype.closeNewFolder = function () {
	this.newFolderGroup_.hidden = true;
	this.folderBox_.hidden = false;
}

Add.prototype.createNewFolder = function () {
    var menuFolder = this.selectedFolder_ || this.bmsvc_.bookmarksMenuFolder;
    var newFolderId = this.bmsvc_.createFolder(menuFolder, this.folderName_.value || "New Folder", this.bmsvc_.DEFAULT_INDEX);
	this.chooseFolder();
	this.closeNewFolder();
}

Add.prototype.removeFolder = function () {
    this.bmsvc_.removeFolderChildren(this.selectedFolder_);
	this.bmsvc_.removeFolder(this.selectedFolder_);
	this.chooseFolder();
}

Add.prototype.pickFolder = function(){
	if (this.selectedFolder_ == null ) {
		getChromeWin().gPromptService.alert(getChromeWin(), "No folder selected", "Please choose a folder or press cancel.");
	} else {
		this.folderButton_.label = document.getElementById(this.selectedFolder_).getAttribute("label");
		this.selectedFolder_ = null;
		this.closeFolder();
	}
}

Add.prototype.save = function () {
	var ioSvc = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);  
    var uri = ioSvc.newURI(this.url_.value, null, null);  
	getChromeWin().gBookmarkManager.addBookmark(this.selectedFolder_, uri, this.name_.value);
	this.close();

}

Add.prototype.handleItemClick = function (evt) {
	var selection = this.tree_.contentView.getItemAtIndex(this.tree_.currentIndex);	
	var id = selection.id;
	this.selectedFolder_ = id.split("-")[1];
}

Add.prototype.clearTree = function () {
	while (this.tree_.lastElementChild) {
		this.tree_.removeChild(this.tree_.lastElementChild);
	}
	var cols = document.createElement("treecols");
	var col = document.createElement("treecol");
	col.setAttribute("id", "folderCol");
	col.setAttribute("flex", "1");
	col.setAttribute("label", "Folders");
	col.setAttribute("primary", "true");
	cols.appendChild(col);
	this.tree_.appendChild(cols);
}

Add.prototype.makeTree = function(items, container) {
	if (container && this.folderIds_.length == 0) return;
	if (!container) container = this.tree_;
	container.setAttribute("container", items.length == 0 ? false : true);
    var treeKids = document.createElement("treechildren");
	treeKids.setAttribute("id", "children-"+container.id);
	container.appendChild(treeKids);

	for (var i = 0; i < items.length; i++) {
		
		this.folderIds_.push(items[i].itemId);
		
		var treeItem = document.createElement("treeitem");
		treeItem.setAttribute("id", "treeItem-"+items[i].itemId);
		
		var row = document.createElement("treerow");
		row.setAttribute("id", "row-"+i);
		
		var cell = document.createElement("treecell");
		cell.setAttribute("label", items[i].title);
		cell.setAttribute("id", items[i].itemId);
		row.appendChild(cell);
		treeItem.appendChild(row);
		treeKids.appendChild(treeItem);
	}
	var next = this.folderIds_.shift();
	var items = getChromeWin().gBookmarkManager.fetchBookmarks(next, "folders");
    this.makeTree(items, document.getElementById("treeItem-"+next));
}

Add.prototype.chooseFolder = function () {
    this.clearTree();
    var items = getChromeWin().gBookmarkManager.fetchBookmarks(getChromeWin().PlacesUtils.bookmarks.bookmarksMenuFolder, "folders");
	this.makeTree(items);
	this.folderPanel_.hidden = false;
	this.mainBox_.hidden = true;
}

Add.prototype.closeFolder = function () {
	this.folderPanel_.hidden = true;
	this.mainBox_.hidden = false;
}

Add.prototype.chooseOpen = function () {
	showOpenTabChooser("Choose open page:", "OK", "Cancel", function(success, item){
	   document.getElementById("nameField").value = item.title;
	   document.getElementById("urlField").value = item.uri.spec;
	   var canvas = item.firstElementChild; 
	   document.getElementById("canvasBox").appendChild(canvas);
	});
		
}

function showOpenTabChooser(title, ok, cancel, cb) {

    var okBtn = document.getElementById("tab-chooser-ok");
    var cancelBtn = document.getElementById("tab-chooser-cancel");
    document.getElementById("tab-chooser-title").value = title;
    okBtn.label = ok;
    cancelBtn.label = cancel;
    
    var data = getChromeWin().browser_.getSnapshots(document);
    var box = document.getElementById("tab-chooser-box");
    var empty = document.getElementById("tab-chooser-empty");
    while (box.lastChild) {
        box.removeChild(box.lastChild);
    }
    
    Add.tabChooserCb_ = cb;
    
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        var elem = document.createElement("browser-snapshot");
        elem.appendChild(d.canvas);
        elem.setAttribute("title", d.title);
        elem.setAttribute("uri", d.uri.spec);
        elem.title = d.title;
        elem.uri = d.uri;
        
        box.appendChild(elem);
    }
    var panel = document.getElementById("tab-chooser");
    if (!panel.listenersAdded_) {
        panel.listenersAdded_ = true;
        okBtn.addEventListener("command", function (evt) {
            panel.hidePopup();
            
            if (Add.tabChooserCb_) {
                var cb = Add.tabChooserCb_;
                Add.tabChooserCb_= null;
                cb(true, box.currentItem);
            }
        }, false);
        cancelBtn.addEventListener("command", function () {
            panel.hidePopup();
            if (Add.tabChooserCb_) {
                var cb = Add.tabChooserCb_;
                Add.tabChooserCb_= null;
                cb(false);
            }
        }, false);
        
        window.addEventListener("resize", function () {
            panel.style.width = window.innerWidth + "px";
            panel.style.height = window.innerHeight + "px";             
        }, false);
    }
    
    panel.style.width = window.innerWidth + "px";
    panel.style.height = window.innerHeight + "px";
    panel.openPopup(document.getElementById("bottom-anchor"), "before_start", 0, 0, false, false);          
}    

function onload() {
	new Add();
}
