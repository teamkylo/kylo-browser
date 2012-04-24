/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var gBookmarkManager;

function BookmarkManager(){
    
    try {
        if (gPrefService.getBranch("polo.").getBoolPref("places.ui.enableRemoveAll")) {
            var button = document.createElement("button");
            button.setAttribute("label", "Remove All");
            button.addEventListener("command", function(){
                gBookmarkManager.resetBookmarks();
            }, false);
            
            var cur = document.getElementById("places-current-page-bookmark");
            cur.parentNode.insertBefore(button, cur);
        }
    } 
    catch (ex) {
        debug(ex)
        // ignore
    }
    
    this.rootFolder_  = [
       
    ]
}

BookmarkManager.prototype.observe = function(subject, topic, data){
    if (topic != "Browser:DocumentLoadStarted") {
        throw "Unexpected topic: " + topic;
    }
};

BookmarkManager.prototype.invalidate = function(){}

BookmarkManager.prototype.close = function(){}

BookmarkManager.prototype.isBookmarked = function(uri){
    var result = PlacesUtils.bookmarks.getBookmarkedURIFor(uri);
    return result != null;
}

/**
 * 
 * @param {Object} folderId -- id of folder bookmark is being inserted into. e.g. PlacesUtils.bookmarks.bookmarksMenuFolder 
 * @param {Object} uri -- nsIURI
 * @param {Object} title -- string text
 * 
 * @return bookmark id
 */
BookmarkManager.prototype.addBookmark = function(folderId, uri, title){
    var bookmarks = PlacesUtils.bookmarks;
    var bookmarkId = bookmarks.insertBookmark(folderId, uri, bookmarks.DEFAULT_INDEX, title || uri.spec);
    this.invalidate();
	
	return bookmarkId
};

BookmarkManager.prototype.getResultNodeForId = function (folderId) {
	var parentFolderId = PlacesUtils.bookmarks.getFolderIdForItem(folderId);
	return this.fetchBookmarks(parentFolderId, function (node) {
		return node.itemId == folderId
	})[0];	
}

BookmarkManager.prototype.fetchBookmarks = function(folderId, filter){

    var options = PlacesUtils.history.getNewQueryOptions();
    options.queryType = options.QUERY_TYPE_BOOKMARKS;
    options.sortingMode = Ci.nsINavHistoryQueryOptions.SORT_BY_DATEADDED_ASCENDING;
    var query = PlacesUtils.history.getNewQuery();
    query.setFolders([folderId], 1);
    
    result = PlacesUtils.history.executeQuery(query, options);
    root = result.root;
    root.containerOpen = true;
    items = [];
	
	if (filter == null) {
		filter = BookmarkManager.filters.xxxx;
	} else if (filter in BookmarkManager.filters){
		filter = BookmarkManager.filters[filter];
	} else if (!(typeof filter  == "function")) {
		throw "unexpected filter: " + filter;
	}
    
    for (var i = 0; i < root.childCount; i++) {
        var node = root.getChild(i);
		
		if (filter.call(this, node)) {
			items.push(node);	
		}        
    }
    root.containerOpen = false;
    
    return items;
}

BookmarkManager.filters = {
	xxxx: function (node) {
        switch (node.type) {
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_URI:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER:
                return true;
            
            default:    
                return false; 
        }		
	},
	
	folders: function (node) {
        switch (node.type) {
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER:
                return true;
            
            default:    
                return false; 
        }       
		
	},
	
    all: function (node) {
        switch (node.type) {
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_URI:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_VISIT:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_FULL_VISIT:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_HOST:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_REMOTE_CONTAINER:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_QUERY:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_SEPARATOR:
            case Ci.nsINavHistoryResultNode.RESULT_TYPE_DAY:    
                return true;
				
            default:            
                return false; 
        }       
    },	
}

BookmarkManager.QI = function () {
    switch (node.type) {
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_URI:
            node.QueryInterface(Ci.nsINavHistoryResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_VISIT:
            node.QueryInterface(Ci.nsINavHistoryVisitResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_FULL_VISIT:
            node.QueryInterface(Ci.nsINavHistoryFullVisitResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_HOST:
            node.QueryInterface(Ci.nsINavHistoryContainerResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_REMOTE_CONTAINER:
            node.QueryInterface(Ci.nsINavHistoryContainerResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_QUERY:
            node.QueryInterface(Ci.nsINavHistoryQueryResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER:
            node.QueryInterface(Ci.nsINavHistoryQueryResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_SEPARATOR:
            node.QueryInterface(Ci.nsINavHistoryResultNode);
            break;
            
        case Ci.nsINavHistoryResultNode.RESULT_TYPE_DAY:    
            node.QueryInterface(Ci.nsINavHistoryContainerResultNode);
            break;      
    }   
}


BookmarkManager.prototype.dump = function(folderId){
    try {
        folderId = folderId || PlacesUtils.bookmarks.unfiledBookmarksFolder;
        var title = PlacesUtils.bookmarks.getItemTitle(folderId);
        
        var options = PlacesUtils.history.getNewQueryOptions();
        options.queryType = options.QUERY_TYPE_BOOKMARKS;
        var query = PlacesUtils.history.getNewQuery();
        query.setFolders([folderId], 1);
        
        result = PlacesUtils.history.executeQuery(query, options);
        root = result.root;
        root.containerOpen = true;
        items = [];
        
        var ttt = "itemId type title icon uri".split(" ");
        for (var i = 0; i < root.childCount; i++) {
            var child = root.getChild(i);
            var str = "";
            for (var j = 0; j < ttt.length; j++) {
                if (j) {
                    str += ", ";
                }
                var id = ttt[j];
                str += id + ": " + child[id];
            }
            items.push(str);
        }
        
        root.containerOpen = false;
        debug(root);
        debug("Folder: " + title + "\n" + (items.length ? "Contents:\n" + items.join("\n") : "Contents: None"))
        
    } 
    catch (ex) {
        debugObj(ex);
    }
}


BookmarkManager.prototype.deleteByURI = function(uri){
    uri = PlacesUtils.bookmarks.getBookmarkedURIFor(uri);
    if (uri) {
        var result = PlacesUtils.bookmarks.getBookmarkIdsForURI(uri, {});
        for (var i = 0; i < result.length; i++) {
            this.deleteItem(result[i]);
        }
        this.invalidate();
    }
}

BookmarkManager.prototype.deleteAll = function(){
    var folderId = PlacesUtils.bookmarks.unfiledBookmarksFolder;
    var title = PlacesUtils.bookmarks.getItemTitle(folderId);
    
    var options = PlacesUtils.history.getNewQueryOptions();
    options.queryType = options.QUERY_TYPE_BOOKMARKS;
    var query = PlacesUtils.history.getNewQuery();
    query.setFolders([folderId], 1);
    
    result = PlacesUtils.history.executeQuery(query, options);
    root = result.root;
    root.containerOpen = true;
    
    ids = [];
    for (var i = 0; i < root.childCount; i++) {
        ids.push(root.getChild(i).itemId);
    }
    
    root.containerOpen = false;
    
    ids.map(PlacesUtils.bookmarks.removeItem, PlacesUtils.bookmarks);
}

BookmarkManager.prototype.resetBookmarks = function(){
    if (!confirm("Delete All Bookmarks", "Select OK to Remove All bookmarks")) {
        return;
    }
    
    gBookmarkManager.deleteAll();
    gBookmarkManager.populateDefaults();
    gBookmarkManager.invalidate();
}

/**
 * Adds bookmarks for the users Music, Movies and Photos directories.
 * @name addLocalBookmarks
 */
BookmarkManager.prototype.addLocalBookmarks = function () {
    var dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
    var desktopFile = dirService.get("Desk", Ci.nsIFile); // returns an nsIFile object
    var desktopDir = desktopFile.path;
    var picsDir;
    var vidDir;
    var musicDir;
    if (platform_ == "osx") {
        picsDir = "file://"+desktopDir.replace("Desktop", "Pictures");
        vidDir = "file://"+desktopDir.replace("Desktop", "Movies");
        musicDir = "file://"+desktopDir.replace("Desktop", "Music");
    } else {
        if (navigator.userAgent.indexOf("NT 6.") > 0) { //7 or Vista
            picsDir = "file:///"+desktopDir.replace("Desktop", "Pictures");
            vidDir = "file:///"+desktopDir.replace("Desktop", "Videos");
            musicDir = "file:///"+desktopDir.replace("Desktop", "Music");
        } else if(navigator.userAgent.indexOf("NT 5.")) { //XP
            picsDir = "file:///"+desktopDir.replace("Desktop", "My Documents\\My Pictures");
            vidDir = "file:///"+desktopDir.replace("Desktop", "My Documents\\My Videos");
            musicDir = "file:///"+desktopDir.replace("Desktop", "My Documents\\My Music");
        }
    }
    this.addBookmark(PlacesUtils.bookmarks.bookmarksMenuFolder, Utils.newURI(picsDir), "My Pictures");
    this.addBookmark(PlacesUtils.bookmarks.bookmarksMenuFolder, Utils.newURI(vidDir), "My Movies");
    this.addBookmark(PlacesUtils.bookmarks.bookmarksMenuFolder, Utils.newURI(musicDir), "My Music");
	gPrefService.setBoolPref("bookmarks.localBookmarksAdded", true);
}
    

BookmarkManager.prototype.populateDefaults = function(){
	var prefs = gPrefService.getBranch("bookmarks.");
	var count = 0;
	while (prefs.getPrefType("default."+count+".url") != Ci.nsIPrefBranch.PREF_INVALID) {
		var url = prefs.getCharPref("default."+count+".url");
		var title = prefs.getCharPref("default."+count+".title");
		if (url && title) {
			this.addBookmark(PlacesUtils.bookmarks.bookmarksMenuFolder, Utils.newURI(url), title);
		}
		count++;
	}
	
	gPrefService.setCharPref("polo.bookmarks.upgrade", "v2");
	
    this.addLocalBookmarks();
}

function upgradeBookmarks() {
	window.setTimeout(function () {
        var bookmarks = gBookmarkManager.fetchBookmarks(PlacesUtils.bookmarks.unfiledBookmarksFolder);
        bookmarks.map(function(resultNode) {
            PlacesUtils.bookmarks.moveItem(resultNode.itemId, PlacesUtils.bookmarks.bookmarksMenuFolder, PlacesUtils.bookmarks.DEFAULT_INDEX);
        });
        gPrefService.setCharPref("polo.bookmarks.upgrade", "v2");
	}, 0);
}

function start_places_manager() {
    gBookmarkManager = new BookmarkManager();	
}
