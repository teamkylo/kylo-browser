/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var scrollPos = 0;

/**
 * Controls is the class which deals with all the functions and 
 * interactions with the control bar.   
 * @name Controls
 * @constuctor
 */
function Controls() {
	this.body_ = document.getElementById("controlsOverlay");
	this.topBar_ = document.getElementById("topBar");
    this.controlsBar_ = document.getElementById("controlsBar");
    this.controlsTrigger_ = document.getElementById("controlsTrigger");	
    this.overscanBottom_ = document.getElementById("overscan-bottom");
	this.overscanDeck_ = document.getElementById("overscanDeck");	
	this.pageTitle_ = document.getElementById("titleLabel");
	this.pageIcon_ = document.getElementById("icon");
	this.pageURL_ = document.getElementById("urlEntryLabel");
	this.titleBox_ = document.getElementById("titleBox");
	this.stopReload_ = document.getElementById("stopReloadDeck");
	
	
	this.backBtn_ = document.getElementById("backButton");
	this.forwardBtn_ = document.getElementById("forwardButton");
	
	this.panelBtns_ = {};
	
	// Top bar
	this.panelBtns_.tabs = this.topBar_;
	this.panelBtns_.keyboard = document.getElementById("keyboardButton");
	this.panelBtns_.zoom = document.getElementById("zoomButton");
	this.panelBtns_.tools = document.getElementById("toolsMenuButton");
	  
	// Bottom bar
	this.panelBtns_.keyboard_url = this.pageURL_;
	//this.panelBtns_.keyboard_search = document.getElementById("searchButton");
	
	for (var pnl in this.panelBtns_) {
		this.panelBtns_[pnl].addEventListener("click", this.handlePanelButton.bind(this, pnl), false);
	}
    
	this.openPanel_ = null;
	

	EventUtility.clickNHold(document.getElementById("homeButton"), gPrefService.getIntPref("controls.clickNHoldDelay.home"), this.goHome.bind(this), this.setCurrentPageAsHomepage.bind(this));

    var placesButton = document.getElementById("favoritesButton");	
    EventUtility.clickNHold(placesButton, gPrefService.getIntPref("controls.clickNHoldDelay.bookmarks"), function () {
		browser_.switchOrCreate("about:places");
		// OH HAI GUYZ! I made opening bookmarks cause panels to close
		controls_.closePanel();
        controls_.focusOut();
	}, this.setCurrentPageAsBookmark.bind(this));
	
	// Pan & Zoom
	document.getElementById("panLeft").addEventListener("command", this.scrollLeft.bind(this), false);
	document.getElementById("panRight").addEventListener("command", this.scrollRight.bind(this), false);
	document.getElementById("zoomIn").addEventListener("command", this.zoomInIncrement.bind(this), false);
	document.getElementById("zoomOut").addEventListener("command", this.zoomOutIncrement.bind(this), false);
	document.getElementById("zoomReset").addEventListener("command", this.handleZoomReset.bind(this), false);

    // Tabs
    document.getElementById("newTabButton").addEventListener("command", this.addTab.bind(this), false);
    	
	this.browserDeck_ = document.getElementById("browserDeck");	
	gObserverService.addObserver(this, "Browser:DocumentLoadCompleted", false);
	
	var links = document.querySelectorAll("#tools-menu button[href]");
	for (var i  = 0; i < links.length; i++) {
	    links.item(i).addEventListener("command", function() {
            browser_.switchOrCreate(this.getAttribute("href"));
        }, false);
	}
	
	//Listeners and variables for hiding controls  -
	this.focusTimer_ = null;
	this.controlsLocked_ = false;
	this.collapseState_ = "UP_COMPLETED";
	this.controlsHeight_ = this.controlsBar_.clientHeight - 15;
	this.autoHideListenersSet_ = false;
	
	var prefs = gPrefService.getBranch("controls.");
	this.autoHide_ = prefs.getBoolPref("autoHide");
	this.autoHideDelay_ = prefs.getIntPref("autoHideDelay");	
	this.autoHideShow_ = prefs.getIntPref("autoHideShow");
	this.autoHideStyle_ = prefs.getCharPref("autoHideStyle");
	
	if (this.autoHide_) {
		this.registerAutoHideListeners();
	}
	
	this.addPrefListener(prefs);
}

/**
 * Adds a preference observer to the "controls." branch of the preferences.  
 * Deals mainly w/ autohide functionality.
 * @name addPrefListener
 * @param {Object} controlsPrefs The controls branch of the prefs system. 
 */
Controls.prototype.addPrefListener = function (controlsPrefs) {
    var self = this;
	controlsPrefs.QueryInterface(Ci.nsIPrefBranch2);
    controlsPrefs.addObserver("", {
            observe: function(subject, topic, pref)  {
                if (topic != "nsPref:changed") {
                    return;
                }
                
                switch (pref) {
                    case "autoHideDelay":
                    case "autoHideShow":
                       this[pref + "_"] = controlsPrefs.getIntPref(pref);
                       return;
					   
					case "autoHideStyle":
					   this.autoHideStyle_ = controlsPrefs.getCharPref(pref);
					   return;
                       
                    case "autoHide":
					   try {
	                       this.autoHide_ = controlsPrefs.getBoolPref("autoHide");
						   if (this.autoHide_) {
						   	   this.registerAutoHideListeners();
							   this.focusOut();
						   } else {
						   	   this.unregisterAutoHideListeners();
							   this.setCollapsed(false, true);
						   }
					   } catch(e){
					       debug(e)
					   }
                       break;
                }
            }.bind(this)
    }, false);	
}

/**
 * Registers listeners for all the elements that would trigger an 
 * auto hide of the control bar to occur.
 * @name registerAutoHideListeners 
 */
Controls.prototype.registerAutoHideListeners = function () {
	// Only register the listener once
	if (this.autoHideListenersSet_) return;
	
	this.controlsTrigger_.addEventListener("mouseover", this, false);
	this.overscanBottom_.addEventListener("mouseover", this, false);
	this.controlsBar_.addEventListener("mouseover", this, false);
	this.browserDeck_.addEventListener("mouseover", this, false);
	
	this.autoHideListenersSet_ = true;
}

/**
 * Unregisters listeners for all the elements that would trigger an 
 * auto hide of the control bar to occur.
 * @name unregisterAutoHideListeners 
 */
Controls.prototype.unregisterAutoHideListeners = function () {
	// Only unregister once
	if (!this.autoHideListenersSet_) return;
	
	this.controlsTrigger_.removeEventListener("mouseover", this, false);
	this.overscanBottom_.removeEventListener("mouseover", this, false);
	this.controlsBar_.removeEventListener("mouseover", this, false);
	this.browserDeck_.removeEventListener("mouseover", this, false);
	
	this.autoHideListenersSet_ = false;
}

/**
 * Handles the events registered to trigger auto hide actions
 * @name handleEvent
 * @param {Object} evt
 */
Controls.prototype.handleEvent = function (evt) {
    switch (evt.currentTarget) {
        case this.controlsTrigger_:
        case this.overscanBottom_:
        case this.controlsBar_:
            this.focusIn();
            break;
            
        case this.browserDeck_:
            this.focusOut();
            break;    
    }		
}

/**
 * Locks the control bar in the visible position
 * @name lockControls
 */
Controls.prototype.lockControls = function () {
	this.controlsLocked_ = true;
}

/**
 * Unlocks the control bar so it may be hidden
 * @name unlockControls
 */
Controls.prototype.unlockControls = function () {
	this.controlsLocked_ = false;
}

/**
 * Allows the control bar to be hidden if auto hide is enabled because the mouse has
 * left the control bar and entered the browser area.
 * @name focusOut
 */
Controls.prototype.focusOut = function () {	
    if (!this.autoHide_ ||
	    this.controlsLocked_ ||    
		this.collapseState_.indexOf("DOWN") > -1) {
        return;
    }
	var prevState = this.collapseState_;
	this.collapseState_ = "DOWN_STARTED";
	
    if (this.focusTimer_) {
        window.clearTimeout(this.focusTimer_ );
        this.focusTimer_  = null;
    }
	
	this.focusTimer_ = window.setTimeout(function () {
		this.setCollapsed(true);
	}.bind(this), prevState.indexOf("COMPLETED") > -1 ? this.autoHideDelay_ : 0);
	
};

/**
 * Shows the control bar if auto hide is enabled because the mouse has
 * entered the trigger, control bar, or bottom overscan.
 * @name focusIn
 */
Controls.prototype.focusIn = function () {
    if (!this.autoHide_ || 
	    this.overscanDeck_.selectedIndex != 0 ||
		this.collapseState_.indexOf("UP") > -1) {
        return;
    }
	var prevState = this.collapseState_;
	this.collapseState_ = "UP_STARTED";
	 
	if (this.focusTimer_) {
		window.clearTimeout(this.focusTimer_);
		this.focusTimer_ = null;
	} 
	
	this.focusTimer_ = window.setTimeout(function () {
		this.setCollapsed(false);
	}.bind(this), prevState.indexOf("COMPLETED") > -1 ? this.autoHideShow_ : 0);
};

/**
 * Sets the control bar to be collapsed or shown and handles the sliding up
 * and sliding down when a pref is changed.
 * @name setCollapsed
 * @param {Bool} isCollapsed Set bar collapsed or shown 
 * @param {Bool} skipAnimation Skip animation for showing the bar
 */
Controls.prototype.setCollapsed = function (isCollapsed, skipAnimation) {
    if (this.focusTimer_) {
        window.clearTimeout(this.focusTimer_);
        this.focusTimer_ = null;
    }
	
    if (this.autoHideStyle_ == "snap" || skipAnimation) {
		if (!isCollapsed) {
	        document.getElementById("icon").hidden = false;
	        document.getElementById("titleLabel").hidden = false;
	        document.getElementById("showTabsButton").hidden = false;
		}
        this.controlsTrigger_.hidden = !isCollapsed;
        this.controlsBar_.style.marginBottom = (isCollapsed ? -this.controlsHeight_ : 0) + "px";
        this.controlsBar_.hidden = isCollapsed;
        this.collapseState_ = (isCollapsed ? "DOWN" : "UP") + "_COMPLETED";
        
        return;
    }
    
    if (this.autoHideStyle_ == "slide") {
        if (isCollapsed) {
            this.slideDown();
        } else {
            this.slideUp();
        }
    }
}

/**
 * Slide the control bar down if set to auto hide
 * @name slideDown
 */
Controls.prototype.slideDown = function () {
    if (this.controlsLocked_) return;
    if (this.collapseState_ == "DOWN_ANIMATING") return;
    var numFrames = 1;
    var distance = 15;
    var time = 25;
    var margin = parseInt(this.controlsBar_.style.marginBottom) || 0;
    function doSlide(late) {
        if (this.collapseState_.indexOf("UP") > -1) {
            window.clearInterval(intervalId);
            return;
        }
        if (late > 0) {
            var offset = Math.round(late/time);
            numFrames += offset;
        }
        margin -= numFrames * distance;
        if (margin <= -70) {
			//images with opacity and text seem to appear at a higher z-index
			// than the overscan elements.
			// We hide these elements as our control bar drops
            document.getElementById("icon").hidden = true;
            document.getElementById("titleLabel").hidden = true;
            document.getElementById("showTabsButton").hidden = true;
        }
        if (margin <= -this.controlsHeight_) {
            this.controlsBar_.hidden = true;
            this.controlsBar_.style.marginBottom = (-this.controlsHeight_)+"px";
            this.controlsTrigger_.hidden = false;
            window.clearInterval(intervalId);
            this.collapseState_ = "DOWN_COMPLETED";
            return;
        }
        this.controlsBar_.style.marginBottom = margin.toFixed(4)+"px";
    }
    if (margin > -this.controlsHeight_) {
       this.collapseState_ = "DOWN_ANIMATING";
       var intervalId = window.setInterval(doSlide.bind(this), time);
    } else {
        this.controlsBar_.hidden = true;
        this.controlsTrigger_.hidden = false;       
        this.collapseState_ = "DOWN_COMPLETED";
    }
}

/**
 * Slide the control bar up if set to auto hide
 * @name slideDown
 */
Controls.prototype.slideUp = function () {
    if (this.collapseState_ == "UP_ANIMATING") return;
    var numFrames = 1;
    var distance = 15;
    var time = 25;
    var margin = parseInt(this.controlsBar_.style.marginBottom) || 0;
    function doSlide(late) {
        if (this.collapseState_.indexOf("DOWN") > -1) {
            window.clearInterval(intervalId);
            return;
        }
        
        if (late > 0) {
            var offset = Math.round(late/time);
            numFrames += offset;
        }
        margin += numFrames * distance;
        if (margin >= -70) {
            document.getElementById("titleLabel").hidden = false;
            document.getElementById("icon").hidden = false;
            document.getElementById("showTabsButton").hidden = false;
        }
        if (margin >= 0) {
            this.controlsBar_.style.marginBottom = "0px";
            window.clearInterval(intervalId);   
            this.collapseState_ = "UP_COMPLETED";
            return; 
        }
        this.controlsBar_.style.marginBottom = margin.toFixed(4)+"px";
    }
    
    this.controlsTrigger_.hidden = true;
    this.controlsBar_.hidden = false;
    
    if (margin < 0) {
       this.collapseState_ = "UP_ANIMATING";
       var intervalId = window.setInterval(doSlide.bind(this), time);
    } else {
        this.collapseState_ = "UP_COMPLETED";
    }   
}

/**
 * Handle the click event registered on the various panel buttons to open the given panel
 * @name handlePanelButton
 * @param {Object} panel the panel to open
 */
Controls.prototype.handlePanelButton = function(panel) {
	// We're going to get the name of panel and make sure it's the only one showing
	if (this.isPanelOpen(panel)) {
		return this.closePanel(panel);
	}
	
	// Not open, so make sure it's the only open panel
    this.openPanel(panel);
}

/**
 * Open the given panel, making sure that only one panel is open at a time.
 * @name openPanel
 * @param {Object} panel the panel to open
 * @param {Function} callback the callback function to call when the panel has been opened 
 */
Controls.prototype.openPanel = function (panel, callback) {
    // TODO: make browser_.openSwitchPanel/closeSwitchPanel => gTabPanel.open/close
    // then clean this up
    
    if (panel && panel == this.openPanel_) {
        // Panel is already open - so exit
        return;
    }
    
    if (this.openPanel_) {
        switch (this.openPanel_) {
            case "tabs":
                browser_.closeSwitchPanel();
                break;
            case "zoom":
                gZoomWidget.close();
                break;
            case "tools":
                gToolsMenu.close();
                break;
            case "keyboard":
            case "keyboard_url":
            case "keyboard_search":
                gKeyboardOverlay.close();
                break;
        }   
        
        if (this.panelBtns_[this.openPanel_]) {
            this.panelBtns_[this.openPanel_].removeAttribute("open");
        }           
        
        this.openPanel_ = null;
    }
    
    this.lockControls();
    this.setCollapsed(false);
    
    switch (panel) {
        case "tabs":
            browser_.openSwitchPanel();
            break;
            
                    
        case "zoom":
            gZoomWidget.open();
            break;
            
        case "tools":
            gToolsMenu.open();
            break;
            
//        case "places":
//            gBookmarkManager.open();
//          break;
            
        case "keyboard":
            gKeyboardOverlay.open("EMBEDDED");
            this.setVisible(false);
            break;
            
        case "keyboard_url":
            this.setVisible(false);
            gKeyboardOverlay.open("URL_EMBED", function (uri) {
                if (callback) {
                    return callback(uri);
                }
                if (!uri) {
                    return;                 
                }
                this.panelBtns_.keyboard_url.value = uri;
                var URI = gURIFixup.createFixupURI(uri, 0);
                gHistSvc.markPageAsTyped(URI);          
                browser_.loadURL(URI.spec);
            }.bind(this), this.panelBtns_.keyboard_url.value);
            break;
            
        case "keyboard_search":
            this.setVisible(false);
            gKeyboardOverlay.open("SEARCH_EMBED", function (result) {
                if (callback) {
                    return callback(result);
                }
                if(!result) return;
                browser_.createNewBrowser(true, result);
            }.bind(this), i18nStrings_["browser"].getString("browser.defaultSearchText"), true);
            break;
    }       

    this.openPanel_ = panel;
    
    if (this.panelBtns_[panel]) {
       this.panelBtns_[panel].setAttribute("open", "true"); 
    }
}

/**
 * Closes the given panel
 * @name closePanel
 * @param {Object} panel the panel to close
 */
Controls.prototype.closePanel = function(panel) {
    if (!this.openPanel_) {
	   // Don't close if there's nothing to close
		return;
	}
	
	if (panel && panel != this.openPanel_) {
		// If a panel is specified, only close if it's open
		return;
	}
	
    switch (this.openPanel_) {
        case "tabs":
            browser_.closeSwitchPanel();
			break;
        case "zoom":
            gZoomWidget.close();
			break;
        case "tools":
            gToolsMenu.close();
			break;
        case "keyboard":
        case "keyboard_url":
        case "keyboard_search":
            gKeyboardOverlay.close();
			break;
    }	
	
	this.notifyPanelClosed(this.openPanel_);
}

/**
 * Unlocks the controls and handles the special keyboard case (keyboard covers the controls)
 * and sets the visual state of the panel button that opened the panel
 * @name notifyPanelClosed
 * @param {Object} panel The panel that was closed
 */
Controls.prototype.notifyPanelClosed = function (panel) {
	if (panel == this.openPanel_) {
		this.unlockControls();
	    if (this.openPanel_ == "keyboard" || this.openPanel_ == "keyboard_url" || this.openPanel_ == "keyboard_search") {
	        // Special "panel" - actually a hidden box
	        this.setVisible(true);
	    }
				
		this.openPanel_ = null;
		
		if (this.panelBtns_[panel]) {
		    this.panelBtns_[panel].removeAttribute("open");
		}
	}
}

/**
 * Returns the open/closed state of the given panel
 * @name isPanelOpen
 * @param {Object} panel The panel to check the state of.
 * @returns {Bool} the open state of the panel
 */
Controls.prototype.isPanelOpen = function (panel) {
	return panel && this.openPanel_ == panel;
}

/**
 * Sets the visibility of the entire control bar.
 * @name setVisible
 * @param {Bool} isVisible Flag to hide/show the bar. 
 */
Controls.prototype.setVisible = function (isVisible) {
	this.body_.hidden = !isVisible;
	
    // TODO craptastic workaround for panels not re-anchoring when element's visibility changes.
    window.innerHeight++; 
    window.innerHeight--;
}

/**
 * Returns the visibility state of the control bar.
 * @name isVisible
 * @returns {Bool} the visibility state of the control bar.
 */
Controls.prototype.isVisible = function () {
	return !this.body_.hidden;
}

/**
 * Utility function to set the current browser's location to the 
 * home page in the prefs.
 * @name goHome
 * @param {Object} evt the button click event of the home button
 */
Controls.prototype.goHome = function (evt) {
    return browser_.getCurrentBrowserObject().goHome();
}

/**
 * Asks the user if they are sure they want to close the application,
 * and if they want to ignore the message in the future.
 * @name confirmClose 
 */
Controls.prototype.confirmClose = function () {
	var confirmPref = gPrefService.getBranch("controls.").getBoolPref("promptOnExit");	

	if (confirmPref == false) {
		window.close();
		return;
	}

	var title = i18nStrings_["alerts"].getString("alerts.exitTitle");
	var text = i18nStrings_["alerts"].getString("alerts.exitText");
	var checkMsg = i18nStrings_["alerts"].getString("alerts.exitCheckbox");
	var checkState = { value: false }

	if (gPromptService.confirmCheck(window, title, text, checkMsg, checkState)) {
		if (checkState.value) {
			gPrefService.getBranch("controls.").setBoolPref("promptOnExit", false);
		}
		window.close();
	}
}

/**
 * Minimizes the application and handles a special case for macs
 * since it can't handle minimizing a full screen window.
 * @name handleMinimize
 */
Controls.prototype.handleMinimize = function () {
	if (platform_ == "osx") {
	    if (mouseevttool_) {
            browser_.clearMouseEventToolFullScreenMode();
	    }
		window.fullScreen = false;		
	}
	window.minimize();
}

/**
 * TODO: Documentation
 */
Controls.prototype.handlePrint = function () {
	if (mouseevttool_) {
	   browser_.clearMouseEventToolCallback();
	}
	PrintUtils.print();
	if (mouseevttool_) {
	   browser_.resetMouseEventToolCallback();
	}
}

/**
 * Observer for document load events, sets the state of
 * controls and sets the zoom level based on type of navigation
 * @name observe
 * @param {Object} browser the browser whose document created the topic change
 * @param {Object} topic the notification topic
 * @param {Object} data data about the document change
 */
Controls.prototype.observe = function(browser, topic, data) {
    if (topic != "Browser:DocumentLoadCompleted") {
        throw "Unexpected topic: " + topic;
    }

    browser = browser.wrappedJSObject;

    window.setTimeout(function () {
        this.setBackEnabled(browser, browser.browser_.canGoBack);
        this.setForwardEnabled(browser, browser.browser_.canGoForward);
    }.bind(this),0);

};

/**
 * Sets the active browser member variable after a browser switch
 * has happened.
 * @name activeBrowserChanged
 * @param {Object} browser the new active browser
 */
Controls.prototype.activeBrowserChanged = function (browser) {
    this.activeBrowser_ = browser;
}

/**
 * Scrolls the content left
 * @name scrollLeft
 */
Controls.prototype.scrollLeft = function (){
	var scrollMaxX = browser_.getCurrentBrowser().contentWindow.scrollMaxX;
	if(scrollMaxX == 0) return;
	scrollPos = scrollPos - 15;
	if (scrollPos < 0) scrollPos = 0;
	var doc = this.getContentWindow();
    var ypos = browser_.getCurrentBrowser().contentWindow.wrappedJSObject.window.pageYOffset;
	doc.scroll(scrollPos, ypos);
};

/**
 * Scrolls the content right
 * @name scrollRight
 */
Controls.prototype.scrollRight = function (){
	var scrollMaxX = browser_.getCurrentBrowser().contentWindow.scrollMaxX;
	if (scrollPos > scrollMaxX) return;
	scrollPos = scrollPos + 15;
	var doc = this.getContentWindow();
    var ypos = browser_.getCurrentBrowser().contentWindow.wrappedJSObject.window.pageYOffset;
	doc.scroll(scrollPos, ypos);
};

/**
 * Zooms the the content in, called on the "+" icon of the 
 * zoom panel
 * @name zoomInIncrement
 */
Controls.prototype.zoomInIncrement = function (){
	browser_.getCurrentBrowserObject().zoomIn(.5);
};

/**
 * Zooms the the content out, called on the "-" icon of the 
 * zoom panel
 * @name zoomOutIncrement
 */
Controls.prototype.zoomOutIncrement = function (){
	browser_.getCurrentBrowserObject().zoomOut(.5);
};

/**
 * Sets the current page as the homepage when the home button is held for 
 * 2 seconds.
 * @name setCurrentPageAsHomepage
 */
Controls.prototype.setCurrentPageAsHomepage = function () {
	this.setHomePageTimeoutId_ = null;
	if (gPromptService.confirm(window, i18nStrings_["alerts"].getString("alerts.homePageTitle"), i18nStrings_["alerts"].getString("alerts.homePageText"))) {
		gBrowser.setHomepage(browser_.getCurrentBrowser().currentURI.spec);
	}
};

/**
 * Sets the current page as a bookmark in the default folder when the bookmark button is held for 
 * 2 seconds.
 * @name setCurrentPageAsBookmark
 */
Controls.prototype.setCurrentPageAsBookmark = function() {
    var nb = getNotificationBox();
	
    var b = browser_.getCurrentBrowser();
	var msg;
    if (!gBookmarkManager.isBookmarked(b.currentURI)) {
		gBookmarkManager.close();
		gBookmarkManager.addBookmark(PlacesUtils.bookmarks.bookmarksMenuFolder, b.currentURI, b.contentDocument.title);
        msg = i18nStrings_.alerts.getString("alerts.pageBookmarked");        	
	} else {
		msg = i18nStrings_.alerts.getString("alerts.pageAlreadyBookmarked");
	}
	
    var oldBar = nb.getNotificationWithValue("page-bookmarked");
    if (oldBar) {
        nb.removeNotification(oldBar);
    }	
	
    var newBar = nb.appendNotification(
	   msg,
	   "page-bookmarked",
       null,
	   nb.PRIORITY_INFO_MEDIUM,
	   []
    );

	window.setTimeout(function () {
        nb.removeNotification(newBar);
	}, gPrefService.getIntPref("controls.clickNHoldDelay.bookmarks.notificationDur"));
}

/**
 * Returns the current browser's content window object
 * @name getContentWindow
 * @returns {Window} the content window.
 */
Controls.prototype.getContentWindow = function () {
    // TODO this method is redundant because window.content === browser_.getCurrentBrowser().contentWindow
	return browser_.getCurrentBrowser().contentWindow;
};

/** 
 * Button handler for reset button on the zoom widget.  Resets the zoom level
 * and closes the panel.
 * @name handleZoomReset
 */ 
Controls.prototype.handleZoomReset = function () {
	browser_.getCurrentBrowserObject().restoreZoomLevel(true);
	this.closePanel("zoom");
	this.focusOut();
}

/**
 * Enables the back button if the browser's window has history associated with it,
 * otherwise disables the button.
 * @name setBackEnabled 
 * @param {Object} browser the browser containing the window w/ history.
 * @param {Object} e Flag to enable/disable
 */
Controls.prototype.setBackEnabled = function(browser, e) {
    if (this.activeBrowser_ !== browser) {
        return;
    }
    
	if (e === false) {
		this.backBtn_.setAttribute("disabled", "true");
	} else {
		this.backBtn_.removeAttribute("disabled");
	}	
};

/**
 * Enables the forward button if the browser's window has history associated with it,
 * otherwise disables the button.
 * @name setForwardEnabled 
 * @param {Object} browser the browser containing the window w/ history.
 * @param {Bool} e Flag to enable/disable
 */
Controls.prototype.setForwardEnabled = function(browser, e) {
    if (this.activeBrowser_ !== browser) {
        return;
    }
        
	if (e === false) {
		this.forwardBtn_.setAttribute("disabled", "true");
	} else {
		this.forwardBtn_.removeAttribute("disabled");
	}	
};

/**
 * Set the loading icon if the window is currently loading content.
 * @name setLoading
 * @param {Object} browser The browser containing the window loading content.
 * @param {Bool} loading The flag to set the loading icon or not.
 */
Controls.prototype.setLoading = function (browser, loading) {
    if (this.activeBrowser_ !== browser) {
        return;
    }
    
	this.body_.setAttribute("loading", loading ? "true" : "false");
    this.stopReload_.selectedIndex = loading ? 1 : 0;
}

/**
 * Sets the title of the loaded page.
 * @name setTitle
 * @param {Object} browser The browser containing the window loading content.
 * @param {String} title The title of the loaded page to set in the controls.
 */
Controls.prototype.setTitle = function (browser, title) {
    if (this.activeBrowser_ !== browser) {
        return;
    }    
    
    if (!title) {
        if (!browser.originalURI_ || browser.originalURI_.spec == "about:blank") {
            title = i18nStrings_["browser"].getString("browser.blankUrlTitle");
        }
    }
    
    this.pageTitle_.value = title;
    document.title = title + " - Kylo";
}

/**
 * Sets the favicon of the loaded page.
 * @name setIcon
 * @param {Object} browser The browser containing the window loading content.
 * @param {String} icon The url of the favicon to set in the controls.
 */
Controls.prototype.setIcon = function (browser, icon) {
    if (this.activeBrowser_ !== browser) {
        return;
    }
        
    this.pageIcon_.src = icon || Controls.DEFAULT_FAVICON;
}

/**
 * Sets the url label of the loaded page.
 * @name setURLLabel
 * @param {Object} browser The browser containing the window loading content.
 * @param {String} urlLabel The url of the page to set in the controls.
 */
Controls.prototype.setURLLabel = function (browser, urlLabel) {
    if (this.activeBrowser_ !== browser) {
        return;
    }
        
	if (urlLabel == "about:blank") {
	    this.pageURL_.value = i18nStrings_["browser"].getString("browser.newUrlText");
	} else {
	    this.pageURL_.value = urlLabel;
	}
}

/**
 * Gets the base uri of the current url
 * @name getBaseURI
 * @param {String} The base uri of the current url 
 */
function getBaseURI(uri) {
    return uri ? uri.replace(/(^[a-z]+:\/\/[^\/]+).*/, "$1") : uri;
}

/**
 * Creates a new browser with a blank page and opens the keyboard for the 
 * user to enter a new url to go to.
 * @name addTab
 * @param {evt} The click event fired from the new tab button. 
 */
Controls.prototype.addTab = function (evt) {
    evt && evt.stopPropagation();   
    var browser = browser_.createNewBrowser(true);
    browser.loadURLNoFocus("about:blank");
    
    // TODO consolidate this better w/ the other "OPEN" 
    // case in openPanel for edit location
	this.openPanel("keyboard_url", function (uri) {
        if ((uri == this.pageURL_.value) || !uri ) {
            browser_.closeTab(browser);
            return;
        }
        var URI = gURIFixup.createFixupURI(uri, 0);
        gHistSvc.markPageAsTyped(URI);          
        browser_.loadURL(uri);
    }.bind(this));  
};

//Default favicon
Controls.DEFAULT_FAVICON = "chrome://mozapps/skin/places/defaultFavicon.png";

//Errored favicon
Controls.ERRORED_FAVICON = Controls.DEFAULT_FAVICON;

// Default about page favicon
Controls.DEFAULT_ABOUT_FAVICON = "chrome://polo/skin/hcrestlabs.ico";
