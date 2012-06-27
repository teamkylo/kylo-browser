/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 *
 * @author bdyer
 */

/**
 * Browser is the class that contains the browser element for each "tab" and all the 
 * methods to go along with dealing with the browser.
 * @name Browser
 * @constuctor
 */
function Browser(idx, deck) {
    this.browserIndex_ = idx;
    var notification = document.createElement("notificationbox");
    notification.id ="notificationbox-" + idx;
    notification.className = "appearance-clear";
    
    var el = document.createElement("browser");
    var browserId = "browser-"+idx;
    el.setAttribute("id", browserId);

    el.setAttribute("type", "content-targetable");
    el.setAttribute("autoscroll", "false");
    el.setAttribute("flex", "1");
    el.setAttribute("tooltip", "html-tooltip");
    
    notification.appendChild(el);
    deck.appendChild(notification);
    
    this.title_ = "";
    this.bookmarkTitle_ = null;
    this.icon_ = null;
    this.browser_ = el;
    
    this.giveBrowserFocusOnLoadComplete_ = true;

    this.browser_.addEventListener("mousedown", this.handleBrowserMousedown.bind(this), false);
    this.browser_.addEventListener("mouseup", this.handleBrowserClick.bind(this), false);
    this.browser_.addEventListener("command", this.handleBrowserCommand.bind(this), false);
    
    this.browser_.addEventListener("DOMContentLoaded", this.contentLoaded.bind(this), true);
    this.browser_.addEventListener("DOMTitleChanged", this.titleChanged.bind(this), true);
    this.browser_.addEventListener("DOMLinkAdded", this.linkAdded.bind(this), true);
           
    this.browser_.webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_LOCATION |
                                            //Ci.nsIWebProgress.NOTIFY_SECURITY |
                                            Ci.nsIWebProgress.NOTIFY_STATE_NETWORK);
    this.browser_.sessionHistory.addSHistoryListener(this);
    
    this.numNetworkRequests_ = 0;
    this.navigation_ = "NEW";
    this.zoomLevel_ = null;
    this.longClickLink_ = "";
    this.longClickTimeout_ = "";
    
    
    // stop about:blank from loading
    this.browser_.stop();
}

/**
 * Returns the markupDocumentViewer for this browser.
 * @name getMarkupDocumentViewer
 * @returns {markupDocumentViewer} the document object of the browser.
 */
Browser.prototype.getMarkupDocumentViewer = function () {
    var navigator1 = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
    var docShell = navigator1.QueryInterface(Ci.nsIDocShell);
    var docviewer = docShell.contentViewer.QueryInterface(Ci.nsIMarkupDocumentViewer);
    var doc = this.browser_.markupDocumentViewer;
    return doc; 
};

/**
 * Returns the zoom level for this browser
 * @name getZoomLevel
 * @returns {Number} The current zoom level
 */
Browser.prototype.getZoomLevel = function() {
    return this.getMarkupDocumentViewer().fullZoom;
}

/**
 * Sets the zoom level for the current browser and updates
 * the zoom widget as well
 * @name setZoomLevel
 * @param {Number} zoom The zoom level to set the browser to
 */
Browser.prototype.setZoomLevel = function(zoom) {
    zoom = parseFloat(zoom).toFixed(2);
    this.getMarkupDocumentViewer().fullZoom = zoom;
    
    if (zoom == this.zoomLevel_) {
        return;
    }
    
    // Start by setting this null - the "unset" state
    this.zoomLevel_ = null;
    
    // See if we should store our zoom level for the last URI loaded
    if (this.browser_.currentURI && this.browser_.currentURI.spec.indexOf("about:") != 0) {
        var defaultZoom = parseFloat(gPrefService.getBranch("polo.").getCharPref("defaultZoomLevel"));
        if (zoom != defaultZoom) {
            this.zoomLevel_ = zoom;
            try {
                PlacesUtils.annotations.setPageAnnotation(this.browser_.currentURI, "polo/panZoomLevel", JSON.stringify({zoom: this.zoomLevel_}), 0, Ci.nsIAnnotationService.EXPIRE_NEVER);
            } catch(e) {
                debug(e);
            }
        }
    }
    
    // Update the zoom widget if it's open and we're the selected browser object
    if (controls_.isPanelOpen("zoom") && browser_.getCurrentBrowserObject() == this) {
        gZoomWidget.setZoom(this.zoomLevel_);
    }
}

/**
 * Sets the zoom level to the last user-set state, or if reset = true, then to the
 * default zoom level
 * @name restoreZoomLevel
 * @param {Boolean} reset Reset to the default zoom level or not (default) 
 */
Browser.prototype.restoreZoomLevel = function(reset) {
    var zoom = this.zoomLevel_;
    if (this.zoomLevel_ === null || reset) {
        zoom = 1;
        if (this.getURL().indexOf("about:") != 0) {
            zoom = gPrefService.getBranch("polo.").getCharPref("defaultZoomLevel");
        }
    }
    this.setZoomLevel(zoom);
}

/**
 * Zooms the content in by the given amount or by the default .1 (1 < zoom < 2);
 * @name zoomIn 
 * @param {Number} amt (optional) the amount to increment the zoom.
 */
Browser.prototype.zoomIn = function (amt) {
    var increment = amt || .1;
    var doc = this.getMarkupDocumentViewer();
    var zoom = doc.fullZoom;
    if (zoom + increment >= 2) {
        zoom = 2;
        this.setZoomLevel(zoom);
        return;
    }
    if (zoom == 1) {
        scrollPos = 0;
    }
    zoom = zoom + increment;
    this.setZoomLevel(zoom);
};

/**
 * Zooms the content out by the given amount or by the default .1 (1 < zoom < 2);
 * @name zoomOut 
 * @param {Number} amt (optional) the amount to decrement the zoom.
 */
Browser.prototype.zoomOut = function (amt) {
    var increment = amt || .1;
    var doc = this.getMarkupDocumentViewer();
    var zoom = doc.fullZoom;
    if ((zoom - increment) <= 1) {
        zoom = 1;
        this.setZoomLevel(zoom);
        return;
    }
    if (zoom == 1) {
        scrollPos = 0;
    }
    zoom = zoom - increment;
    this.setZoomLevel(zoom);
};

/**
 * Loads the home page from the preferences into the browser.
 * @name goHome
 */
Browser.prototype.goHome = function () {
    var url;
	
    try {
        url = gPrefService.getBranch("browser.startup.").getCharPref("homepage");
    } catch (ex) {
        url = "about:blank";
    }
    
    this.loadURL(url);    
}

/**
 * Loads the given uri into the current browser
 * @name loadURL
 * @param {String} uri The page to load into the browser 
 */
Browser.prototype.loadURL = function (uri) {
    this.giveBrowserFocusOnLoadComplete_ = true;
    this.browser_.loadURI(uri);
}

Browser.prototype.loadURLNoFocus = function (uri) {
    this.giveBrowserFocusOnLoadComplete_ = false;
    this.browser_.loadURI(uri);
}

Browser.prototype.handleBrowserMousedown = function (evt) {
    if (evt.target.hasAttribute("href")) {
        this.longClickLink_ = evt.target.href;
        this.longClickTimeout_ = window.setTimeout(function () {
           if (this.longClickLink_ == "") return;
           browser_.createNewBrowser(true, this.longClickLink_);
           window.clearTimeout(this.longClickTimeout_);
        }.bind(this), 1000);
    }
}

/**
 * Mouseup event listener on the browser element that will
 * close any open panels if the click is not on a text field
 * or text area.
 * @name handleBrowserClick
 * @param {Object} evt The click event
 */
Browser.prototype.handleBrowserClick = function (evt) {
    if (evt.button == "0") {     
        if (this.longClickTimeout_) {
            this.longClickLink_ = "";
            window.clearTimeout(this.longClickTimeout_);
        } 
        if (!gKeyboardAutoLauncher.handle(evt.target)) {
            controls_.closePanel();
            controls_.focusOut();
        }
        return false;
    }
} 

/**
 * Command event listener for the browser element for handling the 
 * bad cert error buttons.
 * @name handleBrowserCommand
 * @param {Object} evt The command event
 */
Browser.prototype.handleBrowserCommand = function (evt) {
    if (!evt.isTrusted) {
        return;
    }
    
    var button = evt.originalTarget;
    var doc = button.ownerDocument;
    var uri = doc.documentURI;
    
    // TODO extern mozilla code
    if (/about:certerror\?e=nssBadCert/.test(uri)) {
        switch (button.id) {
            case "getMeOutOfHereButton":
                this.goHome();
                break;
                
            case "exceptionDialogButton":
                var params = { exceptionAdded : false, handlePrivateBrowsing : true };
                
                try {
                  switch (gPrefService.getIntPref("browser.ssl_override_behavior")) {
                    case 2 : // Pre-fetch & pre-populate
                      params.prefetchCert = true;
                    case 1 : // Pre-populate
                      params.location = doc.location.href;
                  }
                } catch (e) {
                  Components.utils.reportError("Couldn't get ssl_override pref: " + e);
                }
                
                window.openDialog('chrome://pippki/content/exceptionDialog.xul',
                                  '','chrome,centerscreen,modal', params);
                
                // If the user added the exception cert, attempt to reload the page
                if (params.exceptionAdded) {
                    doc.location.reload();   
                }            
                break;
        }
    } 
    
}

/**
 * Updates various fields displaying information about the current browser
 * on the control bar (Title, favicon, url, loading state, etc);
 * Called when the current browser changes.
 * @name updateControls
 */
Browser.prototype.updateControls = function () {
    var title = this.getTitle();
    if (gPrefService.getBranch("polo.pages.").getBoolPref("use_bookmark_titles")) {
        var bmkTitle = this.getBookmarkTitle();
        title = bmkTitle || title;
    }    
    controls_.setTitle(this, title);
    controls_.setIcon(this, this.icon_);
    controls_.setURLLabel(this, this.browser_.currentURI.spec);
    controls_.setLoading(this, this.loading_);
    controls_.setBackEnabled(this, this.browser_.canGoBack);
    controls_.setForwardEnabled(this, this.browser_.canGoForward);    
}

/**
 * Returns the XUL browser element
 * @name getBrowserElement
 * @returns {XUL browser} The browser element associated with this class
 */
Browser.prototype.getBrowserElement = function () {
    return this.browser_;
}

/**
 * Returns the box where the dropdown notifications are shown for things like
 * remembering passwords, etc.
 * @name getNotificationBoxElement
 * @returns {XUL box} The notification box element 
 */
Browser.prototype.getNotificationBoxElement = function () {
    return this.browser_.parentNode;
}

/**
 * Returns the title and uri of the currently displayed page
 * @name getDisplayTitleURI
 * @returns {Array} The title and the uri of the current page
 */
Browser.prototype.getDisplayTitleURI = function () {
    var uri = this.originalURI_;
    
    var spec;
    if (!uri || !uri.spec) {
        return [i18nStrings_["browser"].getString("browser.blankUrlTitle"), gIOService.newURI("about:blank", null, null)];
    } 
    
    if (uri.spec == "about:blank") {
        return [i18nStrings_["browser"].getString("browser.blankUrlTitle"), uri];        
    }
    
    var title = this.getTitle();
    if (gPrefService.getBranch("polo.pages.").getBoolPref("use_bookmark_titles")) {
        var bmkTitle = this.getBookmarkTitle();
        title = bmkTitle || title;
    }
    if (this.loading_ && !title) {
        return [i18nStrings_["browser"].getString("browser.loadingUrlTitle"), uri];
    }
    
    return [title || "", uri];    
}

/**
 * Returns the title of the current page
 * @name getTitle
 * @returns {String} The title of the page
 */
Browser.prototype.getTitle = function () {
    return this.title_ || this.browser_.contentTitle || null;
};

/**
 * Returns the title stored with the associated URI in the Bookmarks DB.
 * @name getBookmarkTitle
 * @returns {String} The title associated with the bookmark 
 */
Browser.prototype.getBookmarkTitle = function () {
    if (this.bookmarkTitle_ !== null) {
        return this.bookmarkTitle_;
    }
    
    if (this.originalURI_) {
        var bmk = PlacesUtils.getMostRecentBookmarkForURI(this.originalURI_); 
        if (bmk > -1) {
            this.bookmarkTitle_ = PlacesUtils.bookmarks.getItemTitle(bmk);
            return this.bookmarkTitle_;
        }
    }    
    
    return "";
}

/**
 * Returns the favicon for this browser's page
 * @name getIcon
 * @returns {String} URL of the favicon 
 */
Browser.prototype.getIcon = function () {
    return this.icon_ || null;
}

/**
 * Returns the url of the page being displayed in this browser.
 * @name getURL
 * @returns {String} The url of the browsers page.
 */
Browser.prototype.getURL = function () {
    return this.browser_.currentURI.spec || null;
}

/**
 * Returns the QI for history and progress listener interfaces
 * @name QueryInterface
 * @param {Object} aIID The id of the interface.
 */
Browser.prototype.QueryInterface = function(aIID) {
    if (aIID.equals(Ci.nsISHistoryListener) ||
        aIID.equals(Ci.nsIWebProgressListener) ||
        aIID.equals(Ci.nsISupportsWeakReference) ||
        aIID.equals(Ci.nsISupports)) {
        return this;
    }
    throw Components.results.NS_NOINTERFACE;
}

/**
 * Function that does the work to see if our contentTitle had changed, fires necessary events,
 * handles bookmark title override.
 * @name handleDocumentTitleUpdate() 
 */
Browser.prototype.handleDocumentTitleUpdate = function () {
    var title = this.browser_.contentTitle;
    
    if (gPrefService.getBranch("polo.pages.").getBoolPref("use_bookmark_titles")) {
        var bmkTitle = this.getBookmarkTitle();
        title = bmkTitle || title;
    }
    
    controls_.setTitle(this, title);
    
    if (this.title_ != this.browser_.contentTitle) {
        this.title_ = this.browser_.contentTitle;
        
        browser_.notifyDocumentTitleChanged(this);
    }
}

/**
 * Callback for DOMContent listener.  Called when the page's content has been loaded.
 * Sets the title member variable and sets the title in the controls.
 * @name contentLoaded 
 * @param {Object} evt The DOMContentLoaded event
 */
Browser.prototype.contentLoaded = function (evt) {
    // duplicates titleChanged?
    window.setTimeout(function () {
        this.handleDocumentTitleUpdate();
    }.bind(this),0);
}

/**
 * Callback for the title changed event.  Sets the title member variable and
 * and sets the title in the control bar.
 * @name titleChanged
 * @param {Object} evt The Title changed event.
 */
Browser.prototype.titleChanged = function (evt) {
    // make sure it's the root document that changed and not an iframe
    if (this.browser_ == evt.currentTarget) {       
        this.handleDocumentTitleUpdate();
    }
}

/**
 * Callback for the DOMLinkAdded event, sets the icon member variable to 
 * the href of the target.
 * @name linkAdded
 * @param {Object} evt The DOMLinkAdded event
 */
Browser.prototype.linkAdded = function (evt) {
    var link = evt.originalTarget;
    if ( /\bicon\b/i.test(link.rel)) {
        this.icon_ = link.href;
    }
}

/**
 * This is called when the progress listener gets an event that the currnet page starts loading.
 * updates the state of the controls and notifies observers a document load has begun.
 * @name beginPageLoad
 * @param {String} uri the uri that has started loading
 * @param {String} originalURI the original uri of loading page (unresolved)
 */
Browser.prototype.beginPageLoad = function (uri, originalURI) {    
    this.originalURI_ = originalURI; // i.e. about:help instead of file://c:/Program Files/Polo/blah/blah/blah
    
    this.loading_ = true;
    this.icon_ = null;
    this.bookmarkTitle_ = null;
    
    if (!this.lastURI_  || (this.lastURI_.host != uri.host)) {
        controls_.setIcon(this, PlacesUtils.favicons.getFaviconImageForPage(uri).spec);
    }    
    
    controls_.setLoading(this, true);
    controls_.setTitle(this, i18nStrings_["browser"].getString("browser.loadingUrlTitle"));
    
    var json = JSON.stringify({
        navigation: this.navigation_, 
        URI: uri.spec,
        lastURI: this.lastURI_ ? this.lastURI_.spec : null 
    });

    gObserverService.notifyObservers({wrappedJSObject: this}, "Browser:DocumentLoadStarted", json);
}

/**
 * This is called when the web progress listener gets an event telling us the page
 * has stopped loading.  Notifies listeners and updates the state of the controls.
 * @name endPageLoad
 * @param {String} uri The uri of the page that is loading
 * @param {Bool} success Flag for success/failure of page load.
 */
Browser.prototype.endPageLoad = function (uri, success) {
    this.loading_ = false;
    controls_.setLoading(this, false);

    this.loadFavIcon(uri);
    
    var json = JSON.stringify({
        navigation: this.navigation_, 
        success: success,
        URI: uri.spec, 
        lastURI: this.lastURI_ ? this.lastURI_.spec : null
    });
    
    
    if (success) {
        this.lastURI_ = uri;        
    }

    gObserverService.notifyObservers({wrappedJSObject: this}, "Browser:DocumentLoadCompleted", json);
    browser_.notifyDocumentLoadCompleted(this); 
    
    if (this.giveBrowserFocusOnLoadComplete_) {
	   this.browser_.contentWindow.focus();
    }
    this.giveBrowserFocusOnLoadComplete_ = true;
}

/**
 * Figures out and loads the favicon into the places database and sets the icon in the 
 * control bar 
 * @name loadFavIcon
 * @param {Object} uri The uri of the favicon if it exists.
 */
Browser.prototype.loadFavIcon = function (uri) {
    // Note: do no use the url of the site in case of about:neterror
    //       https://bugzilla.mozilla.org/show_bug.cgi?id=453442
    var icon;
    if (this.icon_) {
        icon = this.icon_;
    } else {
        var docURI = this.browser_.contentDocument.documentURIObject;
        if (docURI.scheme == "about") {
            icon = Controls.DEFAULT_ABOUT_FAVICON;
        } else if (docURI.scheme == "http" || docURI.scheme == "https" ) {
            icon = docURI.prePath + "/favicon.ico"
        } else {
            icon = Controls.DEFAULT_FAVICON;
        }
        this.icon_ = icon;
    }
    
    PlacesUtils.favicons.setAndLoadFaviconForPage(uri, Utils.newURI(icon), false);    
    controls_.setIcon(this, icon);
}

/**
 * Implementation of the state change method from the nsIWebProgress interface.  Tells us 
 * when pages have started/stopped loading, etc.
 * @name onStateChange
 * @interface nsIWebProgress
 */
Browser.prototype.onStateChange = function(aProgress, aRequest, aFlag, aStatus) {
    
    // TODO show loading image when page is requesting data... for late images and ajax requests
    
    // filter out events from images/iframes etc
    if (aProgress.DOMWindow != this.browser_.contentWindow) {
        return;
    }

    var w = Ci.nsIWebProgressListener;
    if (aFlag & w.STATE_IS_NETWORK) {
        
        if (aFlag & w.STATE_START) {
            this.beginPageLoad(aRequest.QueryInterface(Ci.nsIChannel).URI, aRequest.originalURI);
            return;
        }
        
        if (aFlag & w.STATE_STOP) {                                                                    
            this.endPageLoad(aRequest.QueryInterface(Ci.nsIChannel).URI, Components.isSuccessCode(aStatus));
            return;
        }
    }
}

/**
 * Implemntation of hte onLocationChange method from the nsIWebProgress interface.    
 * This fires when the location bar changes i.e load event is confirmed or when the user switches tabs
 * @name onLocationChange
 * @param {Object} aProgress 
 * @param {Object} aRequest
 * @param {Object} aURI
 * @interface nsIWebProgress
 */
Browser.prototype.onLocationChange = function(aProgress, aRequest, aURI, aFlags) {
    if (aProgress.DOMWindow == this.browser_.contentWindow) {
        controls_.setURLLabel(this, this.browser_.currentURI.spec);
        
        // See if we can restore the zoom level for the new URI from a saved annotation
        var saveData = null;
        try {
            saveData = PlacesUtils.annotations.getPageAnnotation(aURI, "polo/panZoomLevel");
            saveData = JSON.parse(saveData);
        } catch(e) {
            // Annotation doesn't exist
        }
        
        if (saveData) {
            this.zoomLevel_ = parseFloat(saveData.zoom).toFixed(2);
            this.getMarkupDocumentViewer().fullZoom = this.zoomLevel_;  
            if (controls_.isPanelOpen("zoom") && browser_.getCurrentBrowserObject() == this) {
                gZoomWidget.setZoom(this.zoomLevel_);
            }    
        } else {
            this.restoreZoomLevel(true);
        }               
        
    }
}


/**
 * Nothing to do here, just here for interface completion
 * @interface nsIWebProgress
 */
Browser.prototype.onProgressChange = function(browser, progress, request, curSelf, maxSelf, curTotal, maxTotal) { };

/**
 * Nothing to do here, just here for interface completion 
 * @interface nsIWebProgress
 */
Browser.prototype.onStatusChange = function(aWebProgress, aRequest, aStatus, aMessage) { };

/**
 * Nothing to do here, just here for interface completion
 * @interface nsIWebProgress
 */
Browser.prototype.onSecurityChange = function(aWebProgress, aRequest, aState) { };

/**
 * Sets the navigation member variable to reflect the history state, 
 * used for setting correct state in control bar
 * @name OnHistoryGoBack
 * @interface nsISHistoryListener
 */
Browser.prototype.OnHistoryGoBack = function(aURI) {
    this.navigation_ = "BACK";
    return true;
}


/**
 * Sets the navigation member variable to reflect the history state, 
 * used for setting correct state in control bar
 * @name OnHistoryGoForward
 * @interface nsISHistoryListener
 */
Browser.prototype.OnHistoryGoForward = function(aURI) {
    this.navigation_ = "FORWARD";
    return true;
}


/**
 * Sets the navigation member variable to reflect the history state, 
 * used for setting correct state in control bar
 * @name OnHistoryGotoIndex
 * @interface nsISHistoryListener
 */
Browser.prototype.OnHistoryGotoIndex = function(aIndex, aURI) {
    this.navigation_ = "JUMP";
    return true;
}


/**
 * Sets the navigation member variable to reflect the history state, 
 * used for setting correct state in control bar
 * @name OnHistoryNewEntry
 * @interface nsISHistoryListener
 */
Browser.prototype.OnHistoryNewEntry = function(aURI) {
    this.navigation_ = "NEW";
}


/**
 * No-op here, not used.  Here for interface completeness.
 * @interface nsISHistoryListener
 */
Browser.prototype.OnHistoryPurge = function(aParam) {
    return true;
}


/**
 * Sets the navigation member variable to reflect the history state, 
 * used for setting correct state in control bar
 * @name OnHistoryReload
 * @interface nsISHistoryListener
 */
Browser.prototype.OnHistoryReload = function(aURI, aFlags) {
    this.navigation_ = "RELOAD";
    return true;
}

/**
 * Creates (if needed) and renders the page into a canvas element to be shown
 * as a screenshot.
 * @name renderCanvas
 * @param {Number} w The width to use in the canvas element
 * @param {Number} h The height to use in the canvas element 
 * @param {Object} canvas The canvas, if it exists.  Otherwise one will be created.
 * @returns {Object} The rendered canvas element.
 */
Browser.prototype.renderCanvas = function (w, h, canvas) {
    if (!canvas) {
        canvas = document.createElementNS(NS.html, "canvas");
    }
    
    PagePreview.capture(this.browser_.contentWindow, canvas, w, h);    

    return canvas;
}