/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var placesTextBundle;
var gBookmarkPage;
var gBookmarkFolderChooser;

[
	[
	    "chromeWindow", 
		function () {	
		    var w = window.QueryInterface(Ci.nsIInterfaceRequestor)
		                        .getInterface(Ci.nsIWebNavigation)
		                        .QueryInterface(Ci.nsIDocShellTreeItem)
		                        .rootTreeItem
		                        .QueryInterface(Ci.nsIInterfaceRequestor)
		                        .getInterface(Ci.nsIDOMWindow); 
		
		    return w;	
	    }
	],
	[
        "gPagePreview",
		function () {
			return chromeWindow.gPagePreview;
		}
	],
    [
        "gChromePageHelper",
        function () {
            return chromeWindow.gChromePageHelper;
        }
    ],
    [
        "gBookmarkManager",
        function () {
            return chromeWindow.gBookmarkManager;
        }
    ],
	[
	   "gPromptService",
	   function () {
	   	   return chromeWindow.gPromptService;
	   }	   
	],	
    [
        "browser_",
        function () {
            return chromeWindow.browser_;
        }
    ],	
	[
	   "Controls",
	   function () {
	   	   return chromeWindow.Controls;
	   }
	], 
    [
       "PlacesUtils",
       function () {
           return chromeWindow.PlacesUtils;
       }
    ],
].forEach(function (service) {
  let [name, getter] = service;
  window.__defineGetter__(name, function () {
  	delete window[name];
    window[name] = getter();
    return window[name];
  });
});

function BookmarkGrid(gridContainer, gridElem){	
    this.deck_ = gridContainer;
    this.gridElem_ = gridElem;
	this.numCols_ = -1;
	gridElem.addEventListener("click", this, false);
	
	var self = this;
	this.gridElem_.addEventListener("overflow", function (evt) {
	    self.numCols_ = -1;
	    gBookmarkPage.update();
    }, false);	
}

BookmarkGrid.prototype.handleEvent = function (evt) {
	var target = evt.target;
	if (target.disabled) {
		return;
	}
	
	if (this.state_ == "navigate") {
		this.handleNavigate(target);		
	} else if (this.state_ == "select") {
		this.handleSelect(target);
	}
}

BookmarkGrid.prototype.handleSelect = function(elem) {
	gBookmarkPage.fillEditItem(elem);
}

BookmarkGrid.prototype.handleNavigate = function (elem) {
	if (elem.type == "upfolder") {
        gBookmarkPage.upFolder();
		return;	
	}
    
    if (elem.type == "folder") {
		gBookmarkPage.openSubFolder(elem.resultNode);
		return;    
    }

	if (elem.type == "bookmark") {
		PlacesUtils.history.markPageAsFollowedBookmark(Utils.newURI(elem.resultNode.uri));
		gChromePageHelper.replaceTab(elem.resultNode.uri, window.top);
		return
	}
}

BookmarkGrid.prototype.setFolder = function(folderId, canGoUp){
    this.flush();
    this.create(folderId, canGoUp);
	this.folderId_ = folderId;
}

BookmarkGrid.prototype.flush = function(){
    if (this.gridElem_.lastChild && this.gridElem_.lastChild.localName == "rows") {
        this.gridElem_.removeChild(this.gridElem_.lastChild);
    }
}

BookmarkGrid.prototype.create = function(folderId, canGoUp){
    var items = gBookmarkManager.fetchBookmarks(folderId);

    this.deck_.selectedIndex = BookmarkPage.CONTENT_GRID_INDEX;  
	this.updateCols();

    var r = Math.ceil((items.length + 1) / this.numCols_);
    var rows = document.createElement("rows");
	
    for (var i = 0, j = canGoUp ? 0 : -1; i < r; i++) {
        var row = document.createElement("row");
        for (var k = 0; k < this.numCols_; k++, j++) {
			if (j == -1) {
				row.appendChild(this.makeItem("UP_FOLDER"));
			} else {
				row.appendChild(this.makeItem(items[j]));
			}
            
        }
        rows.appendChild(row);
    }    

    this.gridElem_.appendChild(rows);
}

BookmarkGrid.prototype.setState = function (state) {
	var up = this.gridElem_.querySelector("[type=upfolder]");
	switch (state) {
		case "select":
              if (up) {
			     up.disabled = true;
              }
		      break;
		
		case "navigate":
              if (up) {
                 up.disabled = false;
              }
		      break;
            
		default:
            throw "Unexpected state: " + state;
	}
	
	
	this.state_ = state;
	this.gridElem_.setAttribute("state", state);
}

BookmarkGrid.prototype.makeItem = function (resultNode) {	
	var elem = document.createElement("placesgriditem")
	
	if (resultNode == null) {
		elem.setAttribute("type", "spacer");
		return elem;
	}
	
	elem.grid_ = this;
	elem.setAttribute("tooltip", "places-bookmark-item-tooltip");
	
	if (resultNode == "UP_FOLDER") {
		elem.id = "node-up-folder";
        elem.setAttribute("type", "upfolder");
        elem.setAttribute("title", placesTextBundle.getString("places.upFolder"));		
		return elem;	
	}
	
	elem.resultNode = resultNode;
	elem.id = "node-" + resultNode.itemId;
	
	if (PlacesUtils.nodeIsFolder(resultNode)) {		
		elem.setAttribute("type", "folder");
		elem.setAttribute("title", resultNode.title.slice(0, 300));
		return elem;
	}
	
    if (PlacesUtils.nodeIsDynamicContainer(resultNode)) {
        elem.setAttribute("type", "dfolder");
        elem.setAttribute("title", resultNode.title.slice(0, 300));
        return elem;
    }
	
    if (PlacesUtils.nodeIsBookmark(resultNode)) {
        elem.setAttribute("type", "bookmark");
        elem.setAttribute("title", resultNode.title.slice(0, 300));
		elem.setAttribute("url", resultNode.uri);

        var loaded = false;
        gPagePreview.getPreview(resultNode.uri, function(imageURI){
            loaded = true;
            elem.setAttribute("src", imageURI && imageURI.spec || BookmarkGrid.FAILED_PREVIEW);
        });
        if (!loaded) { // callback above will fire synchronously if we have a preview image 
            elem.setAttribute("src", BookmarkGrid.LOADING_PREVIEW);
        }
        return elem;
    }
	

    elem.setAttribute("type", "unknown");
	return elem;
}

BookmarkGrid.prototype.updateCols = function(){

    var testItem = document.createElementNS(NS.html, "span");
    testItem.className = "places-grid-dimensions";
    document.lastChild.appendChild(testItem);
    
    var testItemStyle = document.defaultView.getComputedStyle(testItem, null);
    
    // TODO assumes PX values for CSS styles
    var MIN_COL_WIDTH = parseInt(testItemStyle.getPropertyValue("width")) +
                        parseInt(testItemStyle.getPropertyValue("padding-left")) +
                        parseInt(testItemStyle.getPropertyValue("padding-right"));
                        
    var LR_MARGIN_TOTAL = parseInt(testItemStyle.getPropertyValue("margin-left")) +
                          parseInt(testItemStyle.getPropertyValue("margin-right"));                         
    
    document.lastChild.removeChild(testItem);

    var cols;
    var W = window.innerWidth - LR_MARGIN_TOTAL;
    var n = Math.floor(W / MIN_COL_WIDTH);
    var w = (W / n) + "px";
    
    if (n == this.numCols_) {
		return;
    }
	
    this.numCols_ = n;
	
    if (this.gridElem_.firstChild) {
        cols = this.gridElem_.firstChild;
        while (cols.hasChildNodes()) {
            cols.removeChild(cols.lastChild);
        }            
    } else {
        cols = document.createElement("columns");
        cols.setAttribute("equalsize", "always")
        this.gridElem_.appendChild(cols);
    }
    
    var i, col;
    for (i = 0; i < this.numCols_; i++) {
        if (cols.childNodes.length <= i) {
            col = document.createElement("column");
            cols.appendChild(col);
        } else {
            col = cols.childNodes.item(i);
        }
		
        col.style.width = w;
        col.setAttribute("flex", 1);
    }
}

BookmarkGrid.prototype.getFolderId = function() {
	return this.folderId_;
}

BookmarkGrid.FAILED_PREVIEW  = "chrome://polo/skin/places/images/default.png";
BookmarkGrid.LOADING_PREVIEW = "chrome://polo/skin/places/images/loading.gif";


function BookmarkPage() {

    this.page_ = document.getElementById("places-box");
	this.page_ = document.getElementById("places-box");
	
	var gridElem = document.getElementById("places-grid");
	var deck = gridElem.parentNode;
    
	this.grid_ = new BookmarkGrid(deck, gridElem);
	this.gridElem_ = gridElem;
	this.deck_ = deck;
	
	this.toolbarButtonSet_ = document.getElementById("places-toolbar-buttonset");
	
	this.currentActionTitle_ = document.getElementById("places-current-action-title");
	this.locationText_ = document.getElementById("places-fldr-location");
	
	this.uriRow_ = document.getElementById("places-edit-uri-row");
	
	this.editName_  = document.getElementById("places-edit-name");
	this.editUri_ = document.getElementById("places-edit-uri");
	
	this.openPagesContainer_ = document.getElementById("places-open-pages-list");
    
	this.config_ = "navigate"
	this.toolbarButtonSet_.setAttribute("buttonset", "add-bookmark add-folder manage close");
	
	function saveOnEnter() {
		if (gBookmarkPage.config_ == "edit-item" || 
		    gBookmarkPage.config_ == "add-bookmark" ||
			gBookmarkPage.config_ == "add-folder") {
			gBookmarkPage.saveButtonPressed();
		}
	}	

	onInput(this.editName_, saveOnEnter);
	onInput(this.editUri_, saveOnEnter, function () {
        window.setTimeout(function () {
	        var e = this.openPagesContainer_.querySelector("[selected]");
	        if (e) {
	            var snapshot = e.snapshot;
	            if (this.editUri_.value != snapshot.uri.spec) {
	                e.removeAttribute("selected", false);               
	            }
	        }
			
	        e = this.openPagesContainer_.querySelector("[url=\"" + this.editUri_.value + "\"]");
	        if (e) {
	            e.setAttribute("selected", true);
	        }			
		}.bind(this), 0);
	}.bind(this));
	
	this.openPagesContainer_.addEventListener("click", function (evt) {
		var snapshot = evt.target.snapshot;
		if (!snapshot) {
			return;
		}
		
		var e = this.openPagesContainer_.querySelector("[selected]");
		if (e) {
			e.removeAttribute("selected", false);
		}
		
		evt.target.setAttribute("selected", true);
		this.editName_.value = snapshot.title; 
		this.editUri_.value = snapshot.uri.spec;
	}.bind(this), false);
	
	this.configure("browse");
}

BookmarkPage.prototype.setActiveFolderId = function(folderId) {
	var resultNode = gBookmarkManager.getResultNodeForId(folderId);
	this.parentFolders_ = [];
	this.currentFolder_ = resultNode;
	this.grid_.setState("navigate");
	this.update();
}

BookmarkPage.prototype.openSubFolder = function(resultNode) {
	this.parentFolders_.push(this.currentFolder_);
	this.currentFolder_ = resultNode;
    this.update();
}

BookmarkPage.prototype.upFolder = function () {
	if (this.parentFolders_.length) {
	    this.currentFolder_ = this.parentFolders_.pop();
	    this.update();
	}
}

BookmarkPage.prototype.startSelect = function () {
	this.configure("select");
}

BookmarkPage.prototype.endSelect = function () {
    this.configure("browse");
	this.update();
}


BookmarkPage.prototype.deleteSelection = function () {
	
	var bookmark = this.editItem_.type == "bookmark";
	var title = bookmark ? placesTextBundle.getString("places.del.bookmark.title") : placesTextBundle.getString("places.del.folder.title");
	var body = bookmark ? placesTextBundle.getString("places.del.bookmark.body") : placesTextBundle.getString("places.del.folder.body"); 
	
    if (!gPromptService.confirm(null, title, body)) {
        return;
	}
    
	PlacesUtils.bookmarks.removeItem(this.editItem_.resultNode.itemId);

    this.configure('browse');
    gBookmarkPage.update(); // TODO: overkill?
}

BookmarkPage.prototype.showAddBookmark = function () {
    this.configure("add-bookmark");    
    
	this.editItem_ = null;
    this.editName_.value = "";
    this.editUri_.value = "";
	
	this.updateOpenPages();
	
    gBookmarkFolderChooser.updateFolders( 
		this.currentFolder_.itemId, 
        []
    );	
}

BookmarkPage.prototype.editNameFocussed = function () {
	if (this.editName_._initialText == this.editName_.value) {
		this.editName_.selectionStart = 0;
		this.editName_.selectionEnd = this.editName_.value.length
	};
}

BookmarkPage.prototype.showAddFolder= function () {
    this.configure("add-folder");    
    
    this.editItem_ = null;
	this.editName_._initialText = placesTextBundle.getString("places.default.new.folder");
    this.editName_.value = this.editName_._initialText;
    this.editUri_.value = "";
    gBookmarkFolderChooser.updateFolders( 
        this.currentFolder_.itemId, 
        []
    );  
}

BookmarkPage.prototype.updateOpenPages = function () {
    var snapshot = browser_.getSnapshots(document);
    var box = this.openPagesContainer_;
    while (box.lastChild) {
        box.removeChild(box.lastChild);
    }
    
    for (var i = 0; i < snapshot.length; i++) {
        var d = snapshot[i];
        if (d.uri.scheme == "about") {
			continue;
		}
		
		if (browser_.isURIBlackListed(d.uri)) {
		    continue;
		}
		
        var elem = document.createElement("places-snapshot");
		d.canvas.className = "places-grid-item-preview";
        
        elem.setAttribute("title", d.title);
        elem.setAttribute("url", d.uri.spec);
		
		window.setTimeout(function (d, elem) {
			elem.setAttribute("src", d.canvas.toDataURL("image/jpeg", ""));
		}, 0, d, elem);

		elem.snapshot = d;
        box.appendChild(elem);
    }
}

BookmarkPage.prototype.validateURI = function () {
    try {
        return gURIFixup.createFixupURI(this.editUri_.value, 0);
    } catch (ex) {
        gPromptService.alert(
               null, 
               placesTextBundle.getString("places.validation.err.badurl.title"), 
               placesTextBundle.getString("places.validation.err.badurl.message"));
        return null;
    }	
}

BookmarkPage.prototype.validateFolder = function () {	
    var dest = gBookmarkFolderChooser.getSelectedResultNode();
	
    var resultNode = gBookmarkFolderChooser.getSelectedResultNode();
    if (resultNode == null) {
        gPromptService.alert(
               null, 
               placesTextBundle.getString("places.validation.err.nofolder.title"), 
               placesTextBundle.getString("places.validation.err.nofolder.message"));        
        return null;
    }
    
    if (resultNode == "dontselectmebro") {
        gPromptService.alert(
               null, 
               placesTextBundle.getString("places.validation.err.badmove.title"), 
               placesTextBundle.getString("places.validation.err.badmove.message"));
        return null;
    }
    
    return resultNode;
}

BookmarkPage.prototype.validateFolderName = function () {
	var v = this.editName_.value;
    if (!v) {
        gPromptService.alert(
               null, 
               placesTextBundle.getString("places.validation.err.foldername.title"), 
               placesTextBundle.getString("places.validation.err.foldername.message"));
        
        return null;
    }   
    return v;
}

BookmarkPage.prototype.saveAddBookmark = function () {
	var uri = this.validateURI();
	if (!uri) {
		return;
	}
	
	var dest = this.validateFolder();
	if (!dest) {
		return;
	}

	PlacesUtils.bookmarks.insertBookmark(
	   dest.itemId, 
	   uri, 
	   PlacesUtils.bookmarks.DEFAULT_INDEX, 
	   this.editName_.value || uri.spec
    );
    
    this.editItem_ = null;
    
    this.configure('browse');
    this.update(); // TODO overkill 		
}

BookmarkPage.prototype.saveAddFolder = function () {    
    var dest = this.validateFolder();
    if (!dest) {
        return;
    }

    var name = this.validateFolderName();   
    if (!name) {
        return;
    }
	
	PlacesUtils.bookmarks.createFolder(dest.itemId, name, PlacesUtils.bookmarks.DEFAULT_INDEX);
    
    this.configure('browse');
    this.update(); // TODO overkill         
}

		
BookmarkPage.prototype.fillEditItem = function(item) {	
    
    var resultNode = item.resultNode;
	
	this.editItem_ = item;
	this.editName_.value = resultNode.title;
	this.editName_._initialText = resultNode.title;
	
	if (item.type == "bookmark") {		
		this.editUri_.value = resultNode.uri;
	}
	
	this.configure("edit-item");
    gBookmarkFolderChooser.updateFolders( 
		this.currentFolder_.itemId, 
        [this.editItem_.resultNode.itemId]
    );	
}


BookmarkPage.prototype.saveEditItem = function() {
	var resultNode = this.editItem_.resultNode;
	var changed = false;
	var uri;
	
	if (this.editItem_.type == "bookmark") {
		if (this.editUri_.value != resultNode.uri) {    
		    uri = this.validateURI();
		    if (!uri) {
		        return;
		    }
			
			PlacesUtils.bookmarks.changeBookmarkURI(resultNode.itemId, uri);
			changed = true;
		}
	}
	
    
    var dest = this.validateFolder();
    if (!dest) {
        return;
    }
    if (dest.itemId != this.currentFolder_.itemId) {        
        PlacesUtils.bookmarks.moveItem(resultNode.itemId, dest.itemId, PlacesUtils.bookmarks.DEFAULT_INDEX);
        changed = true;
    }
	
	if (this.editName_.value != resultNode.title) {
		var name;
		if (this.editItem_.type == "folder") {
		    name = this.validateFolderName();   
		    if (!name) {
		        return;
		    }			
		} else {
			name = this.editName_.value || uri.spec;
		}
		
		PlacesUtils.bookmarks.setItemTitle(resultNode.itemId, name);
		changed = true;
	}	
	
	this.editItem_ = null;
	
    this.configure('browse');
    changed && this.update(); // TODO overkill	
}

BookmarkPage.prototype.formatFolderPath = function (resultNode) {
    var A = [];
    var id = resultNode.itemId;
	do {
		if (id == PlacesUtils.bookmarks.bookmarksMenuFolder) {
			A.push(""); // blank out "Bookmarks Menu"
		} else {
            A.push(PlacesUtils.bookmarks.getItemTitle(id));			
		}
        id = PlacesUtils.bookmarks.getFolderIdForItem(id);
    } while(id != PlacesUtils.placesRootId);
    
	A.reverse();	
    return A.join(" > "); 
}

BookmarkPage.prototype.update = function () {
	this.locationText_.value = this.formatFolderPath(this.currentFolder_); 
	this.grid_.setFolder(this.currentFolder_.itemId, this.parentFolders_.length == 0);
	this.forceHackUpdateOnBrowse_ = null;
}


BookmarkPage.prototype.cancelButtonPressed = function () {	
    switch (this.config_) {
        case "select":
        case "add-bookmark":
        case "add-folder":
        case "edit-item":
		    this.endSelect();
            break;

        case "browse":
        default:
            throw "unexpected: " + this.config_;
    }
}

BookmarkPage.prototype.saveButtonPressed = function () {  
    switch (this.config_) {
        case "add-folder":
            this.saveAddFolder();
            break;
            
        case "add-bookmark":
		    this.saveAddBookmark();
            break;
            
        case "edit-item":
		    this.saveEditItem();
            break;

        case "browse":
        case "select":
        default:
            throw "unexpected: " + this.config_;
    }
}

BookmarkPage.prototype.forceHackUpdateOnBrowse = function () {
	this.forceHackUpdateOnBrowse_ = true;
}

BookmarkPage.prototype.configure = function (config) {
	var set = function (index, buttonSet, locationTextHidden, actionTitle) {		
		
		this.deck_.selectedIndex = index;
		this.toolbarButtonSet_.setAttribute("buttonset", buttonSet);
        this.currentActionTitle_.hidden = !locationTextHidden;
        this.locationText_.hidden = locationTextHidden;
		if (actionTitle) {
			this.currentActionTitle_.value = actionTitle;
		}
		
	};
	
    switch (config) {			
		case "browse":
		    set.call(this, BookmarkPage.CONTENT_GRID_INDEX, "add-bookmark add-folder select", false, false);
            if (this.forceHackUpdateOnBrowse_) {
                this.update();
            }			
			this.grid_.setState("navigate");
			break;
			
		case "select":
		    set.call(this, BookmarkPage.CONTENT_GRID_INDEX, "cancel", false, true);
			if (this.forceHackUpdateOnBrowse_) {
				this.update();
			}
		    this.grid_.setState("select");
			break;
			
		case "add-bookmark":
            set.call(this, BookmarkPage.EDIT_UI_INDEX, "save-bookmark cancel", true, placesTextBundle.getString("places.addBookmarkLabel"));
			this.uriRow_.hidden = false;
			this.openPagesContainer_.hidden = false;
		    break;
			
        case "add-folder":
            set.call(this, BookmarkPage.EDIT_UI_INDEX, "save-folder cancel", true, placesTextBundle.getString("places.addFolderLabel"));
			this.uriRow_.hidden = true;
			this.openPagesContainer_.hidden = true;
            break;
            
        case "edit-item":
		    var isBookmark = this.editItem_.type == "bookmark";
			if (isBookmark) {
				set.call(this, BookmarkPage.EDIT_UI_INDEX, "del-bookmark save-bookmark cancel", true, placesTextBundle.getString("places.editBookmarkLabel"));
			} else {
				set.call(this, BookmarkPage.EDIT_UI_INDEX, "del-folder save-folder cancel", true, placesTextBundle.getString("places.editFolderLabel"));
			}
			this.uriRow_.hidden = !isBookmark;
			this.openPagesContainer_.hidden = true;                  
            break;

		default:
			throw "unexpected: " + config;
	}  

	this.config_ = config;
}

var Tooltip = {
	fill: function(tooltipElement) {
		Tooltip.title_.value = tooltipElement.getAttribute("title");
		Tooltip.url_.hidden = tooltipElement.type != "bookmark";
		Tooltip.url_.value = tooltipElement.getAttribute("url");
	}
}

BookmarkPage.EMPTY_GRID_INDEX = 0;

BookmarkPage.CONTENT_GRID_INDEX = 1;

BookmarkPage.EDIT_UI_INDEX = 2;

BookmarkPage.DEFAULT_FOLDER = "chrome://polo/skin/places/images/folder.png";

BookmarkPage.DEFAULT_BOOKMARK = "chrome://polo/skin/places/images/default.png";


function BookmarkFolderChooser() {	
    this.tree_ = document.getElementById("places-fldr-tree");	
}

BookmarkFolderChooser.prototype.getSelectedResultNode = function () {
	if (this.tree_.currentIndex == -1) {
		return null;
	}
    var selection = this.tree_.contentView.getItemAtIndex(this.tree_.currentIndex);
	if (selection) {
		if (selection.dontselectmebro) {
			return "dontselectmebro";
		}
		
		return selection.resultNode;
	}

    return null;
}

BookmarkFolderChooser.prototype.updateFolders = function (selectedId, disabledIds) {   
	this.excludedIds_ = disabledIds;
	this.rebuildTree(selectedId);
}

BookmarkFolderChooser.prototype.clearTree = function () {
	var root = this.tree_.lastElementChild;
    while (root.lastChild) {
        root.removeChild(root.lastChild);
    }
}

BookmarkFolderChooser.prototype.rebuildTree = function (selectedId) {
    this.clearTree();
    this.buildTree(this.tree_.lastElementChild, gBookmarkManager.getResultNodeForId(PlacesUtils.bookmarks.bookmarksMenuFolder));
	this.selectFolder(selectedId);
}

BookmarkFolderChooser.prototype.selectFolder = function (selectedId) {
	// sigh. window.setTimeout or this.tree_.view.getIndexOfItem doesn't work sometimes.
    window.setTimeout(function (){
	    var selectedTreeItem = document.getElementById("treeItem-" + selectedId);
	    var el = selectedTreeItem;
	    while (el.localName != "tree") {
	        if (el.localName == "treeitem") {
	            el.setAttribute("open", true);
	        }
	        el = el.parentNode;
	    }
	    
	    this.tree_.view.selection.select(this.tree_.view.getIndexOfItem(selectedTreeItem));
		var p = selectedTreeItem.parentNode;
	}.bind(this), 0)
}

BookmarkFolderChooser.prototype.buildTree = function(parentContainer, resultNode, disabled) {
	
	/**
	 * Build the entry for this folder
	 */
	var cell = document.createElement("treecell");
	cell.setAttribute("label", resultNode.title);
	
	var row = document.createElement("treerow");
	row.appendChild(cell);
	
	var rootItem = document.createElement("treeitem");
    rootItem.id = "treeItem-" + resultNode.itemId;
	rootItem.resultNode = resultNode;
	rootItem.appendChild(row);
	
	var container = document.createElement("treechildren");	

    if (disabled || (this.excludedIds_.indexOf(resultNode.itemId) != -1)) {
		row.setAttribute("properties" , "invalid-move-dest");
		rootItem.dontselectmebro = true;
		disabled = true;
	}
	
	// iterate the child items now
	var items = gBookmarkManager.fetchBookmarks(resultNode.itemId, "folders");	
	for (var i = 0; i < items.length; i++) {
		var resultNode = items[i];
		if (PlacesUtils.nodeIsFolder(resultNode)) {
			this.buildTree(container, resultNode, disabled);
			continue;
		}
		
		// a leaf...
	    cell = document.createElement("treecell");
	    cell.setAttribute("label", resultNode.title);

	    row = document.createElement("treerow");
	    row.appendChild(cell);
	    
	    item = document.createElement("treeitem");
	    item.id = "treeItem-" + resultNode.itemId;
	    item.resultNode = items[i];
	    item.appendChild(row);
		
        if (disabled || (this.excludedIds_.indexOf(resultNode.itemId) != -1)) {
            row.setAttribute("properties" , "invalid-move-dest");
            item.dontselectmebro = true;
        }
        		
		
		container.appendChild(item);
	}
	
	if (container.childNodes.length) {
	    rootItem.setAttribute("container", "true")	
	    rootItem.appendChild(container);		
	}
	
	// Things get way less hairy if the bad folders aren't available at all
	// Stupid trees.  
	if (!rootItem.dontselectmebro) {
        parentContainer.appendChild(rootItem);	
	}
}


var gBookmarksObservers = {
	onBeginUpdateBatch: function() {
		// This method is notified when a batch of changes are about to occur.
		// Observers can use this to suspend updates to the user-interface, for example
		// while a batch change is occurring.
		this.inBatch_ = true;
	},

	onEndUpdateBatch: function() {
    	this.inBatch_ = false;
	},

	onItemAdded: function(id, folder, index) {
        if (folder != gBookmarkPage.grid_.getFolderId()) {
			return;
	   	}
        
		if (gBookmarkPage.config_ == "browse") {
			gBookmarkPage.update();
		} else if (gBookmarkPage.config_ == "select") {
			gBookmarkPage.update();
		} else {
			gBookmarkPage.forceHackUpdateOnBrowse(true);
		}
	},
	
	onBeforeItemRemoved: function(id, type) {
	},
	
	onItemRemoved: function(id, folder, index) {
	},

	onItemChanged: function(id, property, isAnnotationProperty, value) {
		// isAnnotationProperty is a boolean value that is true of the changed property is an annotation.
		// You can access a bookmark item's annotations with the <code>nsIAnnotationService</code>.
	},

	onItemVisited: function(id, visitID, time) {
		// The visit id can be used with the History service to access other properties of the visit.
		// The time is the time at which the visit occurred, in microseconds.
	},

	onItemMoved: function(id, oldParent, oldIndex, newParent, newIndex) {
    	// oldParent and newParent are the ids of the old and new parent folders of the moved item.
	},
	
    QueryInterface: function(iid) {
	    if (iid.equals(Ci.nsINavBookmarkObserver) ||
	        iid.equals(Ci.nsISupports)) {
	      return this;
	    }
	    throw Cr.NS_ERROR_NO_INTERFACE;
    },
}

function onInput(elem, cb, onkeypress) {
    elem.addEventListener("keypress", function (evt) {
        switch (evt.keyCode) {
            case KeyEvent.DOM_VK_ESCAPE:
                break;
            case KeyEvent.DOM_VK_RETURN:
				cb();
				return;
                break;
        }
		
		if (onkeypress) { 
		    onkeypress(evt); 
	    }
    }, false);
}


function places_onload(){	
    Tooltip.title_ = document.getElementById("places-bookmark-item-tooltip-title");
    Tooltip.url_ = document.getElementById("places-bookmark-item-tooltip-url");
	
	gBookmarkPage = new BookmarkPage();
	gBookmarkFolderChooser = new BookmarkFolderChooser();
	
	placesTextBundle = document.getElementById("places-stringbundle-main");
	
	window.setTimeout(gBookmarkPage.setActiveFolderId.bind(gBookmarkPage), 0, PlacesUtils.bookmarks.bookmarksMenuFolder);
	
	PlacesUtils.bookmarks.addObserver(gBookmarksObservers, false);	
}

function places_onunload() {
}
