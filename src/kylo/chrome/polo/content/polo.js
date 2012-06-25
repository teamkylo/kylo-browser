/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var browser_;
var controls_;
var mouseevttool_;
var i18nStrings_ = [];
var platform_ = "";

//Map for mouse events coming from MouseEventTool
var EventMap = {
    MOUSE_MOVE: 512,
    LEFT_DOWN: 513,
    LEFT_UP: 514,
    MIDDLE_DOWN: 519,
    MIDDLE_UP : 520,
    RIGHT_DOWN: 516,
    RIGHT_UP: 517,
    MOUSE_WHEEL: 522
};

/**
 * Implements nsIBrowserDOMWindow interface and 
 * opens any pages that would normally open in a new
 * window (usu. via javascript) into a new tab.
 * @name BrowserMonitor
 */
function BrowserMonitor() {};

/**
 * Return the Query Interface for nsIBrowserDOMWindow instance
 */
BrowserMonitor.prototype.QueryInterface = function(aIID) {
    if (aIID.equals(Ci.nsIBrowserDOMWindow) || aIID.equals(Ci.nsISupports)) {
        return this;
    }
    throw Components.results.NS_NOINTERFACE;
}

/**
 * Forces any new pages opened in a new window (popups, etc) into a new tab
 * as we only want one kylo window open
 * @name openURI
 * @returns a nsiDOMWindow instance which is the window of the new Browser(the new tab)
 */ 
BrowserMonitor.prototype.openURI = function(aURI, aOpener, aWhere, aContext) {
    
    // don't spawn windows for a preview creator
    if (gPagePreview.isPreviewContentWindow(aOpener)) {
        return null;
    }
     
    var browser = browser_.createNewBrowser(true);
    var newWindow = browser.getBrowserElement().docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
    var aNotifyBox = browser.getNotificationBoxElement();
    var priority = aNotifyBox.PRIORITY_INFO_HIGH;
    var aText = i18nStrings_["browser"].getString("browser.popupNotificationText");
    var aName = "You're looking at a popup";
    var aButtons = [
            // "Yes" button
            {
                label: i18nStrings_["browser"].getString("browser.keepButtonLabel"),
                accessKey: "K",
                popup: null,
                callback: function(aNotificationBar, aButton) {
                    aNotifyBox.removeNotification(newBar);
                }
            },
            {
                label: i18nStrings_["browser"].getString("browser.closePopupButtonLabel"),
                accessKey: "C",
                popup: null,
                callback: function(aNotificationBar, aButton) {
                    // TODO this alwayss closes the last tab... not good if new tabs
                    //      have been opened since notification was shown
                    browser_.closeTab(browser_.browsers_.length - 1);
                    return true;
                }
            }
        ];
    var newBar = aNotifyBox.appendNotification(
                            aText, aName,
                            "chrome://mozapps/skin/passwordmgr/key.png",
                            priority, aButtons);
    return newWindow;
}

/**
 * No-op here since we don't use the FF tabbrowser
 */
BrowserMonitor.prototype.isTabContentWindow = function(aWindow) {}

/**
 * BrowserManager is the main class which controls instances of the 
 * Browser class.
 * @name BrowserManager
 * @constuctor
 */
function BrowserManager() {
    this.mouseevttoolObjCallback_;
    this.getPlatform();
    this.setupTools();
    this.browserDeck_ = document.getElementById("browserDeck");
    this.tabButton_ = document.getElementById("titleBox");
    this.switcher_ = document.getElementById("tabSwitcher");
    this.closeBar_ = document.getElementById("closeBar"); 
    this.tabListBox_ = document.getElementById("tab-listbox");
        
    this.currentBrowser_ = null;
    this.currentBrowserIdx_;
    this.browsers_ = []; 
    this.clickX_;
    this.clickY_;
    this.mouseDown_ = false;
            
    this.uriBlackList_ = {};
            
    window.QueryInterface(Ci.nsIDOMChromeWindow).browserDOMWindow = new BrowserMonitor();
    
    document.getElementById("zoomVeil").addEventListener("DOMMouseScroll", this.handleScroll.bind(this), false);
    
    window.addEventListener("keydown", this.monitorKeys.bind(this), false);
    window.addEventListener("AppCommand", this.handleAppCommandEvent.bind(this), true);
    
    this.tabListBox_.addEventListener("select", this.tabListItemSelected.bind(this), false);
    this.closeBar_.addEventListener("click", this.closeTabList.bind(this), false);

    var poloPrefs = gPrefService.getBranch("polo.");
    poloPrefs.QueryInterface(Ci.nsIPrefBranch2);
    poloPrefs.addObserver("", { 
        observe: function(subject, topic, pref) {
            if (topic != "nsPref:changed" || pref != "defaultZoomLevel") {
                return;
            }
            var zoomLevel = parseFloat(poloPrefs.getCharPref("defaultZoomLevel"));
			gZoomWidget.setDefaultZoomLevel(zoomLevel);   
            browser_.updateZoomLevels(zoomLevel);
        }
        
    }, false);
}

/**
 * Sets up instances of MouseEventTool and UDLRTool and performs mappings for 
 * virtual keys to be handled by the mouseevttool callbacks.
 * @name setupTools
 */
BrowserManager.prototype.setupTools = function () {
    this.mouseevttoolObjCallback_ = {
        MouseEvent: function(eventType, mouseX, mouseY, deltaX, deltaY, deltaScroll) {
            if (this.mouseDown_ && eventType == EventMap.MOUSE_MOVE) {
                browser_.dragBrowser(deltaX, deltaY);
            } else if (eventType == EventMap.MIDDLE_UP) {
                if (controls_.isPanelOpen("zoom")) {
                    controls_.closePanel("zoom");
                    controls_.focusOut();
                } else {
                    controls_.openPanel("zoom");
                }
            } else if (eventType == EventMap.RIGHT_UP) {
            } else if (eventType == EventMap.RIGHT_DOWN) { 
                //window.focus();
            } else if (eventType == EventMap.LEFT_DOWN) {
                this.mouseDown_ = true;
            } else if (eventType == EventMap.LEFT_UP) {
                this.mouseDown_ = false;
            }
        }.bind(this)
    }
    try {
        
        var cursorPrefs = gPrefService.getBranch("polo.cursor.");
        cursorPrefs.QueryInterface(Ci.nsIPrefBranch2);
        
        mouseevttool_ = Cc["@hcrest.com/MouseEventTool;1"].createInstance(Ci.IMouseEventTool);
        
        mouseevttool_.objCallback = this.mouseevttoolObjCallback_;        
        
        //right click mapping   
        if (cursorPrefs.getBoolPref("goBackOnRightClick")) {
            mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONDOWN, Ci.IMouseEventTool.VK_NO_EVENT);
            mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONUP, Ci.IMouseEventTool.VK_BROWSER_BACK);
        } else {
            mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONDOWN, Ci.IMouseEventTool.VK_NO_EVENT);
            mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONUP, Ci.IMouseEventTool.VK_NO_EVENT);            
        }
        
        //middle click mapping
        mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_MBUTTONDOWN, Ci.IMouseEventTool.VK_NO_EVENT);
        mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_MBUTTONUP, Ci.IMouseEventTool.VK_NO_EVENT);
        cursorPrefs.addObserver("", {
                observe: function(subject, topic, pref)  {
                    if (topic != "nsPref:changed") {
                        return;
                    }
                    
                    switch (pref) {
                        case "goBackOnRightClick":
                            if (cursorPrefs.getBoolPref("goBackOnRightClick")) {
                                mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONDOWN, Ci.IMouseEventTool.VK_NO_EVENT);
                                mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONUP, Ci.IMouseEventTool.VK_BROWSER_BACK);
                            } else {
                                mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONDOWN, Ci.IMouseEventTool.VK_NO_EVENT);
                                mouseevttool_.RemapButton("xulrunner", Ci.IMouseEventTool.WM_RBUTTONUP, Ci.IMouseEventTool.VK_NO_EVENT);
                            }
                            break;
                    }  
                }
        }, false);
    } catch (e) {
        debug(e);

        var showSysReq = gPrefService.getBoolPref("polo.showSysReq")
        if (showSysReq == false) {
            return;
        } else {
            var title = i18nStrings_["alerts"].getString("alerts.mouseevttoolFailTitle");
            var text = i18nStrings_["alerts"].getString("alerts.mouseevttoolFailText");
            var checkMsg = i18nStrings_["alerts"].getString("alerts.mouseevttoolCheckboxText");
            var checkState = { value: false }
            window.setTimeout(function(){
                if (gPromptService.confirmCheck(window, title, text, checkMsg, checkState)) {
                    browser_.loadURL("http://connect.kylo.tv/sysreq");
                }
                
                if (checkState.value) {
                    gPrefService.setBoolPref("polo.showSysReq", false);
                }
            }, 1000);
            }
    }
}

/**
 * Determines the platform Kylo is running on.
 * @name getPlatform
 */
BrowserManager.prototype.getPlatform = function () {
    if ((navigator.appVersion.indexOf("Mac") != -1)) {
        platform_ = "osx";
    } else if (navigator.appVersion.indexOf("X11") != -1) {
        platform_ = "x11";
    } else {
        platform_ = "win32";
    }
}

/**
 * Udates the default zoom level of all the currently open browsers.
 * Called from the settings page when the default zoom level is changed.
 * @name updateZoomLevels
 */
BrowserManager.prototype.updateZoomLevels = function(zoom){
	for (var x = 0; x < this.browsers_.length; x++) {
	    // Skip applying default zoom to "about:" pages
	    if (this.browsers_[x].url_.indexOf("about:") != 0) {
    		this.browsers_[x].setZoomLevel(zoom);
	    }
	}
}

/**
 * Clears flag for MouseEventTool on the OSX platform to ensure full screen window mode
 * @name clearMouseEventToolFullScreenMode
 */
BrowserManager.prototype.clearMouseEventToolFullScreenMode = function () {
    mouseevttool_.HackForceFullScreen(false);
}

/**
 * Sets flag for MouseEventTool on the OSX platform to ensure full screen window mode.  Called on startup if 
 * running on OSX
 * @name setMouseEventToolFullScreenMode
 */
BrowserManager.prototype.setMouseEventToolFullScreenMode = function () {
    mouseevttool_.HackForceFullScreen(true);
}

/**
 * Clears the callback for MouseEventTool when a dialog is shown so 
 * mouse events are not processed and queued.
 * @name clearMouseEventToolCallback
 */
BrowserManager.prototype.clearMouseEventToolCallback = function () {
    mouseevttool_.objCallback = null;
}

/** 
 * Resets the MouseEventTool callback when the blocking dialog is closed
 * @name resetMouseEventToolCallback
 */
BrowserManager.prototype.resetMouseEventToolCallback = function () {
    mouseevttool_.objCallback = this.mouseevttoolObjCallback_; 

}

/**
 * Listens for browser back/forward in win32 or command + [/] for OSX
 * to go back and forward in history.
 * @name monitorKeys
 * @param evt the keypress event being listened for
 */
BrowserManager.prototype.monitorKeys = function (evt) {
    var modKey = evt.ctrlKey;
    if (platform_ == "osx") {
        modKey = evt.metaKey;
    }
    
    if (!modKey) {
        if (evt.keyCode == 166) { // VK_BROWSER_BACK
            browser_.getCurrentBrowser().goBack();
        } else if (evt.keyCode == 167) { //VK_BROWSER_FORWARD
            browser_.getCurrentBrowser().goForward();
        } else if (evt.keyCode == 8 //VK_BACK (backspace) 
                    && !KeyboardAutoLauncher.isEditableNode(evt.target)) {
            if (evt.shiftKey) {
                browser_.getCurrentBrowser().goForward();    
            } else {            
                browser_.getCurrentBrowser().goBack();
            }
        } else if (evt.keyCode == 112) { // VK_F1
            browser_.switchOrCreate("about:help");
        } else if (evt.keyCode == 113) { // VK_F2
            browser_.switchOrCreate("about:settings");
        } else if (evt.keyCode == 114) { // VK_F3
            browser_.switchOrCreate("about:downloads");
        } else if (evt.keyCode == 115) { // VK_F4
            browser_.switchOrCreate("about:places");
        } else if (evt.keyCode == 116) { // VK_F5
            browser_.getCurrentBrowser().reload();
        }
        
        return;
    }
        
    switch (evt.keyCode) {
        
        // Windows Back/Forward
        case 37: //VK_LEFT
            if (platform_ == "win32") {
                browser_.getCurrentBrowser().goBack();
            }
            break;
        case 39: //VK_RIGHT
            if (platform_ == "win32") {
                browser_.getCurrentBrowser().goForward();
            }
            break;
            
        // Mac OSX Back/Forward
        case 219: // [
            if (platform_ == "osx") {
                browser_.getCurrentBrowser().goBack();
            }
            break;
        case 221: // ]
            if (platform_ == "osx") {
                browser_.getCurrentBrowser().goForward();
            }
            break;
                                
        case 84:
        case 78:
            //Ctrl+t opens a new tab
            //Ctrl+n opens a new page (does the same thing... using "page" lingo for tabs in Kyloland)
            controls_.addTab();
            break;    
        case 75:
            //Ctrl+k opens keyboard
            if (controls_.isPanelOpen("keyboard")) {
                controls_.closePanel("keyboard");
            } else {
                controls_.openPanel("keyboard");
            }
            break;
        case 76:
            //Ctrl+l opens url keyboard
            if (controls_.isPanelOpen("keyboard_url")) {
                controls_.closePanel("keyboard_url");
            } else {
                controls_.openPanel("keyboard_url");
            }
            break;
        case 72:
            //Ctrl+h goes home
		    browser_.getCurrentBrowserObject().goHome();
            break;
        case 107:
        case 61:  // osx
            //Ctrl++ zooms in
            browser_.getCurrentBrowserObject().zoomIn();
            break;
        case 109: 
            //Ctrl+- zooms out
            browser_.getCurrentBrowserObject().zoomOut();
            break;
        case 48:
            //Ctrl+0 resets zoom level
            browser_.getCurrentBrowserObject().restoreZoomLevel(true);
            break;
        case 77: 
            //Ctrl+m minimizes
            controls_.handleMinimize();
            break;
        case 74:
            //Ctrl+j opens downloads
            browser_.switchOrCreate("about:downloads");
            break;            
        case 79:
            //Ctrl+o opens settings
            browser_.switchOrCreate("about:settings");
            break;
        case 66:
            //Ctrl+b opens bookmarks
            browser_.switchOrCreate("about:places");
            break;
        case 82: 
            //Ctrl+r reloads the page
            if (evt.shiftKey) {
                // Ctrl+Shift+r ignores cache
                browser_.getCurrentBrowser().reloadWithFlags(Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
            } else {
                browser_.getCurrentBrowser().reload();
            }
            break;
        case 116:
            //Ctrl+F5 forces refresh
            browser_.getCurrentBrowser().reloadWithFlags(Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
            break;
        case 81:
            //Ctrl+q quits
            controls_.confirmClose();
            break;
        
    }
}

/**
 * Handles app commands (special commands sent by media keyboards, remotes, etc.)
 * @name handleAppCommandEvent
 * @param evt the AppCommand event
 */
BrowserManager.prototype.handleAppCommandEvent = function (evt) {
  evt.stopPropagation();
  switch (evt.command) {
      case "Back":
        browser_.getCurrentBrowser().goBack();
        break;
      case "Forward":
        browser_.getCurrentBrowser().goForward();
        break;
      case "Reload":
        browser_.getCurrentBrowser().reload();
        break;
      case "Stop":
        browser_.getCurrentBrowser().stop();
        break;
      case "Search":
        if (controls_.isPanelOpen("keyboard_url")) {
            controls_.closePanel("keyboard_url");
        } else {
            controls_.openPanel("keyboard_url");
        }
        break;
      case "Bookmarks":
        browser_.switchOrCreate("about:places");
        break;
      case "Home":
        browser_.getCurrentBrowserObject().goHome();
        break;
      default:
        break;
  }
}

/**
 * Zooms the current page in or out depending on scrollwheel
 * rolled away from the body (zoom in) or towards the body (zoom out).
 * Called when scrollwheel is rolled in scroll mode.
 * @name handleScroll
 * @param evt the DOMScrollWheel event
 */
BrowserManager.prototype.handleScroll = function (evt) {
    if (!controls_.isPanelOpen("zoom")) return;
    if (evt.detail > 0) {
        this.getCurrentBrowserObject().zoomOut();
    } else {
        this.getCurrentBrowserObject().zoomIn();
    }
    evt.stopPropagation();
    evt.preventDefault();
};

/**
 * When in zoom mode, this function calculates the scroll position based on 
 * the mouse move event and drags the browser window to the correct place.
 * @name dragBrowser
 * @param deltaX The distance in the x axis the mouse has moved
 * @param deltaY The distance in the y axis the mouse has moved
 */
BrowserManager.prototype.dragBrowser = function (deltaX, deltaY) {
    if (controls_.isPanelOpen("zoom") && this.mouseDown_) {             
        var browserWin = this.getCurrentBrowser().contentWindow;
        
        var zoom = this.getCurrentBrowserObject().getMarkupDocumentViewer().fullZoom.toFixed(1);
                
        var dx = deltaX - (deltaX * (zoom / 10));
        var dy = deltaY - (deltaY * (zoom / 10));
        
        if (zoom == "1.0") {
            browserWin.scrollBy(-deltaX, -deltaY);
        } else {
            browserWin.scrollBy(-dx, -dy);
        }   
    }
};

/**
 * Loads the given url into the current browser
 * @name loadURL
 * @param url The url to load
 */
BrowserManager.prototype.loadURL = function (url) {
    this.browsers_[this.currentBrowserIdx_].loadURL(url);
};

/**
 * Returns the current XUL browser element
 * @name getCurrentBrowser
 * @param url The url to load
 */
BrowserManager.prototype.getCurrentBrowser = function () {
    return this.browsers_[this.currentBrowserIdx_].getBrowserElement();
};

/**
 * Returns the Browser class instance for the current browser
 * @name getCurrentBrowserObject
 * @returns {Browser} Browser class instance
 */
BrowserManager.prototype.getCurrentBrowserObject = function () {
    return this.browsers_[this.currentBrowserIdx_];
};

/**
 * Sets the current browser to the tab the user selected from the tab
 * list
 * @name tabLIstItemSelected
 */
BrowserManager.prototype.tabListItemSelected = function (evt) {
    if (this.switcher_.hidden) return;
    if (this.tabListBox_.selectedIndex != this.currentBrowserIdx_) {
        this.setCurrentBrowser(this.tabListBox_.selectedIndex);
    }
    controls_.closePanel("tabs");
    controls_.focusOut();
};

/**
 * Closes the tab switcher widget
 * @name closeTabList
 */
BrowserManager.prototype.closeTabList = function (evt) {
    if (this.switcher_.hidden) return;
    controls_.closePanel("tabs");
    controls_.focusOut();   
}

/**
 * Sets the current browser and related variables when the browser is changed
 * by opening a new tab or a different tab is selected.
 * @name setCurrentBrowser
 * @param {Number} idx The index of the browser to be set
 * @param {Bool} updateSwitchPanel Flag to update the ui of the tabSwitcher panel
 */
BrowserManager.prototype.setCurrentBrowser = function (idx, updateSwitchPanel) {
    
    if (idx instanceof Browser) {
        idx = this.browsers_.indexOf(idx);
    }
    // TODO ???? if (idx != this.currentBrowserIdx_) {return;}
    
    var oldBrowser = this.currentBrowser_;
    if (oldBrowser) {
        oldBrowser.getBrowserElement().setAttribute("type", "content-targetable");
    }
        
    this.currentBrowserIdx_ = idx;
    this.browserDeck_.selectedIndex = idx;    
    this.currentBrowser_ = this.browsers_[this.currentBrowserIdx_];
    this.currentBrowser_.lastSelectedTimeStamp_ = Date.now();
    this.currentBrowser_.getBrowserElement().setAttribute("type", "content-primary");
    
        
    controls_.activeBrowserChanged(this.currentBrowser_);
    this.currentBrowser_.updateControls();
    
    if (updateSwitchPanel !== false) {
        // TODO asynch?        
        window.setTimeout(function () {
            this.tabListBox_.suppressOnSelect = true;
            this.tabListBox_.selectedIndex = idx;
            this.tabListBox_.suppressOnSelect = false;
            if (this.isSwitchPanelOpen()) {
                this.tabListBox_.scrollToIndex(idx);
            }
        }.bind(this), 100);        
    }
};

/**
 * Retuns browser for a given index
 * @name getBrowser
 * @param idx Index of the browser to return
 * @returns {Browser} Browser class instance
 */
BrowserManager.prototype.getBrowser = function (idx) {
    return this.browsers_[idx];
};

/**
 * Retuns browser for a given XUL browser element 
 * @name getBrowserByElement
 * @param element XUL browser element of the browser to return
 * @returns {Browser} Browser class instance
 */
BrowserManager.prototype.getBrowserByElement = function (element) {
    for (var i = 0; i < this.browsers_.length; i++) {
        if (this.browsers_[i].browser_ === element) {
            return this.browsers_[i];
        }
    }
    return null;
};

/**
 * Creates a new Browser intance and loads a given url if supplied.
 * Browsers instances are stored in the browsers_ array.
 * @name createNewBrowser
 * @param {Bool} focus Flag to give the new browser focus or not
 * @param {String} url The url to load in the new browser
 * @returns {Browser} The newly created Browser instance
 */
BrowserManager.prototype.createNewBrowser = function (focus, url) {
    var idx = this.browsers_.length;
    var browser = new Browser(idx, this.browserDeck_);
    this.browsers_[idx] = browser;
    if (focus == true) {
        this.setCurrentBrowser(idx, false);
    } 

    
    if (this.isSwitchPanelOpen()) {
        this.addTabListItem(browser);  
    }
    
    if (url) {
        this.loadURL(url);
    }
    
    return browser;
};

/**
 * Returns the state of the tab switcher panel
 * @name isSwitchPanelOpen
 * @returns {Bool} hidden property of the XUL panel
 */
BrowserManager.prototype.isSwitchPanelOpen = function () {
    return !this.switcher_.hidden;
}

/**
 * Opens the tab switcher panel
 * @name openSwitchPanel
 */
BrowserManager.prototype.openSwitchPanel = function () {
    if(this.switcher_.hidden){
        this.makeTabList();
        this.setCurrentBrowser(this.currentBrowserIdx_);
        this.switcher_.hidden = false;
        this.closeBar_.hidden = false;
        this.tabButton_.hidden = true;
    }
}

/**
 * Closes the tab switcher panel
 * @name openSwitchPanel
 */
BrowserManager.prototype.closeSwitchPanel = function () {
    if (!this.switcher_.hidden) {
        this.switcher_.hidden = true;
        this.closeBar_.hidden = true;
        this.tabButton_.hidden = false;
    }
}

/**
 * Creates a XUL richlistitem element for the tab switcher panel.
 * @name createListItem
 * @param b the browser instance for the given index i
 * @param i the index of the tab being created in teh browsers_ array
 * @returns {richlistitems} el The created XUL richlistitem
 */
BrowserManager.prototype.createListItem = function (b, i) {
    // TODO put this junk in a binding
    var el = document.createElement("richlistitem");
    
    el.setAttribute("type", "tabswitch");
    el.value = b;
    
    var icn = document.createElement("image");
    icn.setAttribute("class", "item-icon");
    el.appendChild(icn);
    
    var vbox = document.createElement("vbox");
    el.appendChild(vbox);
    
    vbox.setAttribute("flex", 1);

    var title = document.createElement("description");
    title.setAttribute("crop", "end");
    title.className = "item-title";
    vbox.appendChild(title);
    
    var uri = document.createElement("description");
    uri.setAttribute("crop", "center");
    uri.className = "item-uri";
    vbox.appendChild(uri);
    
    var closeBtn = document.createElement("button");
	closeBtn.className = "closeBtn";
    closeBtn.setAttribute("tooltiptext", i18nStrings_["browser"].getString("browser.closePageButtonLabel"));    
    // TODO register events at tabList level, listeners may not get cleaned up.
    // Note: this is a mousedown vs command so that the down event can be consumed before
    //       reaching the richlistbox which will fire a "selected" event
    closeBtn.addEventListener("mousedown", this.handleCloseTab.bind(this), true);
    el.appendChild(closeBtn);
    
    // These values get updated in the notify methods above when the browser updates 
    let [titleText, currentURI] = b.getDisplayTitleURI();    
    title.setAttribute("value",titleText);
    uri.setAttribute("value", currentURI.spec);
    icn.setAttribute("src", b.getIcon() || Controls.DEFAULT_FAVICON);
    icn.setAttribute("onerror", "this.src = Controls.ERRORED_FAVICON;");
    
    
    el.browser = b;
    el.favIcon =  icn;
    el.title = title;
    el.uri = uri;
    el.closeBtn = closeBtn;
    
    
    return el;    
}

/**
 * Returns the richlistitem for the given Browser instance
 * @name findSwitchPanelListItem
 * @param browser Browser instance to find the corresponding tablist item
 * @returns {richlistitem} item The XUL richlistitem for the Browser instance
 */
BrowserManager.prototype.findSwitchPanelListItem = function (browser) {
    var item = this.tabListBox_.childNodes.item(browser.browserIndex_);
    
    if (!item) {
        throw "Could not find item for browser: " + browser.getBrowserElement().id;
    }
    
    if (item.browser !== browser) {
        throw "Tab list items not in synch!!! " + browser.getBrowserElement().id;
    }
    
    return item;
}

/**
 * Adds a tablist item to the tab switcher panel ui
 * @name addTabListItem
 * @param browser The Browser insance for the list item being added.
 */
BrowserManager.prototype.addTabListItem = function (browser) {    
    var el = this.createListItem(browser, this.browsers_.length - 1);
    this.tabListBox_.appendChild(el);
    if (this.tabListBox_.childNodes.length == 1) {
        // enable the close button
        this.tabListBox_.firstChild.closeBtn.disabled = false;
    }
}

/**
 * Removes a tablist item from the tab switcher panel ui
 * @name removeTabListItem
 * @param idx the index of item to remove
 */
BrowserManager.prototype.removeTabListItem = function (idx) {
    var item = this.tabListBox_.childNodes.item(idx);
    this.tabListBox_.removeChild(item);
    if (this.tabListBox_.childNodes.length == 1) {
        // disable the close btn
        this.tabListBox_.firstChild.closeBtn.disabled = true;   
    }
}

/**
 * Perform action on the corresponding tablist item when the browser's 
 * document has completed loading (set favicon, etc)
 * @name notifyDocumentLoadCompleted
 * @param browser The Browser instance which document has finished loading
 */
BrowserManager.prototype.notifyDocumentLoadCompleted = function (browser) {
    if (!this.isSwitchPanelOpen()) {
        return;   
    }
    
    var el = this.findSwitchPanelListItem(browser);
    if (el) {
        el.favIcon.src = browser.getIcon();
    }
}

/**
 * Perform action on the corresponding tablist item when the browser's 
 * document's title has changed
 * @name notifyDocumentTitleChanged
 * @param browser The Browser instance which document's title has changed
 */
BrowserManager.prototype.notifyDocumentTitleChanged = function (browser) {
    if (!this.isSwitchPanelOpen()) {
        return;   
    }
    
    var el = this.findSwitchPanelListItem(browser);
    if (el) {
        let [title, uri] = browser.getDisplayTitleURI();
        el.title.value = title;
        el.uri.value = uri.spec;
    }    
}

/**
 * Creates the tab switcher panel ui, adding the richlistitems, calling
 * the methods above to make the list items, etc.
 * @name makeTabList
 */
BrowserManager.prototype.makeTabList = function () {
    while(this.tabListBox_.lastChild) {
        this.tabListBox_.removeChild(this.tabListBox_.lastChild);   
    }
    this.tabListBox_.clearSelection();
    this.tabListBox_.hidden = true;
            
    for (var i = 0, j = this.browsers_.length; i < j; i++ ) {
        var b = this.browsers_[i];    
        try {
            var listItem = this.createListItem(b, i);
            if (j == 1) {
                listItem.closeBtn.setAttribute("disabled","true");
            }
            this.tabListBox_.appendChild(listItem);
        } catch (e) {
            debug(e);
        }
    }

    this.tabListBox_.hidden = false;    
};

/**
 * Gets the browser screenshots as canvas tags
 * @name getSnapshots
 * @param doc The document to be rendered
 */
BrowserManager.prototype.getSnapshots = function (doc) {
    var A = [];
    for (var i = 0; i < this.browsers_.length; i++ ) {
        var b = this.browsers_[i];
        let [titleText, uri] = b.getDisplayTitleURI();
        A.push({
            canvas: b.renderCanvas(PagePreview.DEFAULT_WIDTH, PagePreview.DEFAULT_HEIGHT, doc ? doc.createElementNS(NS.html, "canvas") : null),
            title: titleText,
            uri : uri
        });
    }
    
    return A;
}

/**
 * Handler for the close button on a tablist item.  Closes the tab and 
 * eats the event
 * @name handleCloseTab
 * @param evt The click event on the tablist item's close button
 */
BrowserManager.prototype.handleCloseTab = function (evt) {
    this.closeTab(evt.currentTarget.parentNode.browser.browserIndex_);
    evt.preventDefault();
    evt.stopPropagation();
}

/**
 * Closes the tab at the given index/Browser instances
 * @name closeTab
 * @param idx Browser instance or index for the tab to close
 */
BrowserManager.prototype.closeTab = function (idx) {
    if (this.browsers_.length == 1) {
        return;
    }
    
    if (idx instanceof Browser) {
        idx = this.browsers_.indexOf(idx);
    } else {
        idx = parseInt(idx);   
    }

    if (this.isSwitchPanelOpen()) {
        this.removeTabListItem(idx);  
    }
        
    var elToRemove = document.getElementById("notificationbox-"+idx);
    this.browsers_.splice(idx, 1);
    this.browserDeck_.removeChild(elToRemove);

    for(var i = 0; i < this.browsers_.length; i++) {
        var B = this.browsers_[i];
        B.browserIndex_ = i;
        
        var b = B.getBrowserElement();
        b.parentNode.id = "notificationbox-"+i;
        b.id = "browser-"+i;
    } 

    // did we close the current tab?
    if (idx == this.currentBrowserIdx_) {   
        var B = this.browsers_.reduce(function (prev, cur) {
            return (prev.lastSelectedTimeStamp_ > cur.lastSelectedTimeStamp_) ? prev : cur;
        });
        this.setCurrentBrowser(B);
        return;
    }
    
    // update the currentBrowserIdx_ / deck onyl if we removed a Browser before it 
    if (idx < this.currentBrowserIdx_) {
        this.browserDeck_.selectedIndex = --this.currentBrowserIdx_;
    }    

};

/**
 * Initializes the browser and loads the appropriate tabs
 * @name initBrowser
 */
BrowserManager.prototype.initBrowser = function () {
    /**
     *  We might be opening the following set of tabs:
     *      1a) New install - firstrun screen as tab
     *      - OR -
     *      1b) Upgrade - firstrun/upgrade diff screen as tab
     *
     *      And either...
     *
     *      2a) Tabs saved from previous session - restored tabs
     *      - AND/OR -
     *      2b) Tabs opened from command line - CLI tabs
     *
     *      ... or...
     *
     *      3) Home page - show if no saved/CLI tabs 
     */ 
    
    var startupPrefs = gPrefService.getBranch("browser.startup.");
    var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
    var vendor = gPrefService.getCharPref("polo.swupdate.vendor");
    var homepageURI = startupPrefs.getCharPref("homepage");
    PlacesUtils.history.addVisit(Utils.newURI(homepageURI), Date.now() * 1000, null, PlacesUtils.history.TRANSITION_TYPED, false, 0);
    
    // First check for saved tabs to restore
    var restoreTabs = startupPrefs.getBoolPref("restoreTabs"); 
    
    if (restoreTabs) {
        var savedTabs = {index: 0, tabs: [homepageURI]};
        if (gPrefService.getPrefType("browser.tabs.savedSession") != Ci.nsIPrefBranch.PREF_INVALID) {
            var sessionJSON = gPrefService.getCharPref("browser.tabs.savedSession");
            if (sessionJSON != "") {
                var o = JSON.parse(sessionJSON);
                if (Array.isArray(o)) {
                    savedTabs.tabs = o;
                } else {
                    if (o.index !== null) {
                        savedTabs.index = o.index;
                    }
                    if (Array.isArray(o.tabs)) {
                        savedTabs.tabs = o.tabs;
                    }
                }
            }
        }
        
        for (var i=0, j=savedTabs.tabs.length; i<j; i++) {
            this.createNewBrowser(true, savedTabs.tabs[i]);
        }
        
        this.setCurrentBrowser(savedTabs.index);
    }
    
    // Clear out the previous saved session
    if (gPrefService.prefHasUserValue("browser.tabs.savedSession")) {
        gPrefService.clearUserPref("browser.tabs.savedSession");
    }
    
    // Get urls and options from command line
    var clh = Cc["@hcrest.com/polo/final-clh;1"].getService(Ci.nsICommandLineHandler);
    
    // Check for command line options
    var cliOpts = clh.wrappedJSObject.getStartupOptions();
    for (var i=0, j=cliOpts.length; i<j; i++) {
        let [opt, val] = cliOpts[i].split('=');
        switch (opt) {
            case "debug":
                gDebugTools.enable();
                break;
                
            default:
                debug("unexpected command line option: " + opt);
                break;
        }
    }
    
    // Check for command line tabs
    var cliURIs = clh.wrappedJSObject.getStartupURIs();
    
    for (var i=0, j=cliURIs.length; i<j; i++) {
        this.createNewBrowser(true, cliURIs[i].spec);
    }      
    
    // Reset the lastRunVersion
    var previousVersion = null;    
    if (startupPrefs.getPrefType("lastRunVersion") != Ci.nsIPrefBranch.PREF_INVALID) {
        previousVersion = startupPrefs.getCharPref("lastRunVersion") || null;
    }        
    startupPrefs.setCharPref("lastRunVersion", appInfo.version);  
        
        
    // Tack on the upgrade page if we just upgraded from a previous version
    if (previousVersion && (previousVersion != appInfo.version)) {
        // Handle upgrade stuff
        this.handleVersionUpdate(previousVersion);
        
        // See if we have a special upgrade page to go to
        if (startupPrefs.getPrefType("firstrun.upgrade") != Ci.nsIPrefBranch.PREF_INVALID &&
            startupPrefs.getCharPref("firstrun.upgrade") != "") {
                
            var upgradeURI = Utils.newURI(startupPrefs.getCharPref("firstrun.upgrade")
                .replace("$version", encodeURIComponent(appInfo.version))
                .replace("$previousVersion", encodeURIComponent(previousVersion))
                .replace("$vendor", encodeURIComponent(vendor)));
            
            // Add this URL to our blacklist to prevent saving this tab
            this.uriBlackList_[upgradeURI.spec] = true;
                
            this.createNewBrowser(true, upgradeURI.spec);
            
            // We have our upgrade page - no need to show home page
            return;
        }
    }
    
    // Tack on the firstrun page if this is the first launch of Kylo
    if (startupPrefs.getBoolPref("firstrun")) {
        // Reset the firstrun flag
        startupPrefs.setBoolPref("firstrun", false);
        
        // Handle firstrun stuff
        gBookmarkManager.populateDefaults();
        
        // See if we have a special firstrun page to go to
        if (startupPrefs.getPrefType("firstrun.location") != Ci.nsIPrefBranch.PREF_INVALID &&
            startupPrefs.getCharPref("firstrun.location") != "") {
                
            var firstrunURI = Utils.newURI(startupPrefs.getCharPref("firstrun.location")
                .replace("$version", encodeURIComponent(appInfo.version))
                .replace("$vendor", encodeURIComponent(vendor)));
            
            // Add this URL to our blacklist to prevent saving this tab
            this.uriBlackList_[firstrunURI.spec] = true;
            
            this.createNewBrowser(true, firstrunURI.spec);
            
            // We have our firstrun page - no need to show home page
            return;
        }
    }
    
    // Now see if we want to load the homepage
    if (!restoreTabs && cliURIs.length == 0) {
        this.createNewBrowser(true, homepageURI);
    }  
};

/**
 * Handle a version update
 * @name handleVersionUpdate
 * @param fromVersion Version string for previously launched instance
 */
BrowserManager.prototype.handleVersionUpdate = function (fromVersion) {
    // Remove setup files in our profile directory
    SWUpdate.cleanSetupFiles();
    
    // make sure the pref exists; was introduced in mothra
    if (gPrefService.getPrefType("keyboard.autolaunch.open") == Ci.nsIPrefBranch.PREF_BOOL) {
        if (gPrefService.prefHasUserValue("keyboard.autolaunch.open")) {
            gPrefService.setBoolPref("keyboard.autolaunch.focusLock", gPrefService.getBoolPref("keyboard.autolaunch.open"));
        }
    }
    
    // See if we need to upgrade bookmarks to push them all into the main bookmark folder
    if (gPrefService.getCharPref("polo.bookmarks.upgrade") == "-1") {
        upgradeBookmarks();
    }        

    // Handle new feature - bookmarked "My Videos", "My Pictures", "My Music" folders...
    if (!gPrefService.getBoolPref("bookmarks.localBookmarksAdded")) {
        gBookmarkManager.addLocalBookmarks();
    }
}

/**
 * Get the index of a browser for the given document
 * @name getBrowserIndexForDocument
 * @param doc Document to get the browser for.
 */
BrowserManager.prototype.getBrowserIndexForDocument = function (doc) {
    for (var i = 0; i < this.browsers_.length; i++) {
        if (this.browsers_[i].browser_.contentDocument == doc) {
            return i;
        }
    }
    return -1;
}

/**
 * Get the XUL browser element for the given document
 * @name getBrowserElementForDocument 
 * @param doc Document to get the browser element for.
 */
BrowserManager.prototype.getBrowserElementForDocument = function (doc) {
    var b = this.browsers_[this.getBrowserIndexForDocument(doc)];
    return b ? b.getBrowserElement()  : null;
}

/**
 * Get the Browser instance for the given uri
 * @name getBrowserForURI
 * @param uriString URI to get the Browser instance for.
 */
BrowserManager.prototype.getBrowserForURI = function (uriString) {
    var uri = Utils.newURI(uriString);
    for (var i = 0; i < this.browsers_.length; i++) {
        var b = this.browsers_[i];
        if (uri.equals(b.originalURI_)) {
            return b;
        }
    }
    return null;
}

/**
 * Checks to see if a given URI (nsIURI) is blacklisted (prevent saving tabs, using as homepage, etc.)
 * @name isURIBlackListed
 * @param uri nsIURI to look up in our blacklist
 */
BrowserManager.prototype.isURIBlackListed = function (uri) {
    return this.uriBlackList_[uri.spec];
}

/**
 * For a given link, switches to the tab containing that link
 * or creates a new tab if the link does not exist in the current
 * tab list.
 * @name switchOrCreate
 * @param link The url to switch to or create.
 */
BrowserManager.prototype.switchOrCreate = function (link) {
    var b = this.getBrowserForURI(link);
    if (b) {
        this.setCurrentBrowser(b);
    } else {
        this.createNewBrowser(true, link);
    }    
}

/**
 * Global function, used by the login manager prompter service.
 */
function getNotificationBox(win) {
    
    if (win) {
        var b = browser_.getBrowserElementForDocument(win.document);
        if (b) {
            return b.parentNode;
        }
    }
    var b = browser_.getCurrentBrowser();
    if (b) {
        return b.parentNode;
    }
    
    return null;
}

/**
 * Registers stylesheets with mozilla's stylesheet service (for using custom cursor)
 */
function registerStyleSheets() {
    var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
    sss.loadAndRegisterSheet(Utils.newURI("chrome://global/skin/html.css"), Ci.nsIStyleSheetService.AGENT_SHEET);
}

/**
 * Onload handler, starts services and gets app up and running.
 */
function app_onload() {
    
    // spawn the login manager.
    Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
    i18nStrings_["browser"] = document.getElementById("strings");
    i18nStrings_["alerts"] = document.getElementById("alertStrings");
    gLayoutManager = new LayoutManager();
    controls_ = new Controls();
    
    start_page_preview();
    start_places_manager()
    start_keyboard();
    
    browser_ = new BrowserManager();
    browser_.initBrowser();

    start_missing_plugin_installer();
    registerStyleSheets();
    
	gHomeChooser.init();
    gZoomWidget.init();
    gToolsMenu.init();
    Help.init();
    HTMLTooltip.init();
    SWUpdate.init();

    SWUpdate.checkAndPrompt();
    
    window.setTimeout(function () {
        var fullScreen = gPrefService.getBoolPref("layout.fullScreen");
        window.fullScreen = fullScreen;
    }, 100);
    //TODO: Horrible hack for Mac not being able to minimize when fullscreen
    if (platform_ == "osx" || platform_ == "x11") {      
        document.getElementById("polo-main").addEventListener("click", gLayoutManager.checkFullScreen.bind(gLayoutManager), false);
    }
}

/**
 * Unload handler, saves open tabs and closes all windows associated w/ the app.
 */
function app_unload() {
    // See if we should be saving tabs
    if (gPrefService.getBoolPref("browser.startup.restoreTabs")) {
        var tabs = [];
        var index = 0;
        for (var i = 0; i < browser_.browsers_.length; i++) {
            // TODO: TERRIBLE naming convention!!!!!
            // for reference: var tabURI = BrowserManager.ListOfTabs[i].<browser>element.currentURI;
            var tabURI = Utils.newURI(browser_.browsers_[i].getURL());
            if (browser_.isURIBlackListed(tabURI)) {
                continue;
            }
            tabs.push(tabURI.spec);
            if (browser_.browsers_[i].browserIndex_ == browser_.currentBrowserIdx_) {
                index = tabs.length - 1;
            }
        }
    	gPrefService.setCharPref("browser.tabs.savedSession", JSON.stringify({"index": index, "tabs": tabs}));
    }

    // forces all extra windows to close.. there to make the jsconsole window die
    Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup).quit(Ci.nsIAppStartup.eAttemptQuit);
}
