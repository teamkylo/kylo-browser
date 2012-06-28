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

Components.utils["import"]("resource://gre/modules/AddonManager.jsm");
Components.utils["import"]("resource://gre/modules/Services.jsm");

/**
 * LayoutManager Handles all layout changes to the Kylo application, like changing 
 * the overscan settings and handling resize events, etc.
 * @name LayoutManager
 * @constuctor
 */
function LayoutManager() {
    document.addEventListener("resize", this, false);
    this.layoutDeck_ = document.getElementById("overscanDeck");
    this.contentBox_ = document.getElementById("content-box");
    this.browserDeck_ = document.getElementById("browserDeck");
    
    this.prevBrowserWidth_ = this.browserDeck_.clientWidth;
    this.prevBrowserHeight_ = this.browserDeck_.clientHeight; 
    
    this.controls_ = document.getElementById("controlsOverlay");
    
    this.spacers_ = {
        top: document.getElementById("overscan-top"),
        left: document.getElementById("overscan-left"),
        bottom: document.getElementById("overscan-bottom"),
        right: document.getElementById("overscan-right"),       
    }
    
    this.selectedTheme_ = null;
    this.selectedThemeResolution_ = null;
    this.themes720_ = {};
    this.themes1080_ = {};
    
    var root = document.getElementById("overscan-adjust");
    var btns = root.getElementsByTagName("button");
    var f = this.buttonEvent.bind(this);
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("command", f, false);
    }

    var arrows = root.querySelectorAll(".overscan-arrow");
    for (var i = 0; i < arrows.length; i++) {
        var arrow = arrows.item(i);
        arrow.addEventListener("mouseover", function (evt) {
            var border = evt.currentTarget.id.match(/overscan-arrow-(\w+)-\w+/)[1];
            root.setAttribute("highlight", border);
        }, false);
        arrow.addEventListener("mouseout", function (evt) {
            root.removeAttribute("highlight");
        }, false);
    }
    
    document.getElementById("overscan-reset").addEventListener("mouseover", function (evt) {
        root.setAttribute("highlight", "top right bottom left");
    }, false);
    document.getElementById("overscan-reset").addEventListener("mouseout", function (evt) {
        root.removeAttribute("highlight");
    }, false);
    
    document.getElementById("overscan-max").addEventListener("mouseover", function (evt) {
        root.setAttribute("highlight", "top right bottom left");
    }, false);
    document.getElementById("overscan-max").addEventListener("mouseout", function (evt) {
        root.removeAttribute("highlight");
    }, false);

    this.initPrefs();
    
    window.setTimeout(this.checkOnStartup.bind(this), 150);
}

/**
 * Initializes the preferences associated with layout funcitons like
 * overscan, and adds an observer to listen for all changes to these preferences.
 * @name initPrefs
 */
LayoutManager.prototype.initPrefs = function () {
    this.prefs_ = gPrefService.getBranch("layout.");
    this.adjustIncrement_ = this.prefs_.getIntPref("overscan.adjustIncrement");
    this.prefs_.QueryInterface(Ci.nsIPrefBranch2);  
    this.prefs_.addObserver("", this, false); 
    
    this.updateOverscan();
}

/**
 * Observer for layout prefs branch.  Reacts to changes
 * in overscan for the four padding spacers around the browser.
 * @name observe
 * @param {Object} subject The subject of the pref change
 * @param {Object} topic The topic of the pref change
 * @param {Object} pref The pref that was changed
 */
LayoutManager.prototype.observe = function (subject, topic, pref)  {
    if (topic != "nsPref:changed") {
        return;
    }
    
    switch (pref) {
        case "overscan.adjustIncrement":
            this.adjustIncrement_ = this.prefs_.getIntPref("overscan.adjustIncrement");
            return;
           
        case "overscan.bottom":
        case "overscan.left":
        case "overscan.right":
        case "overscan.top":
            // update only if not in overscan adjust mode
            // do a delayed update to coalesce multiple changes. 
            if (this.layoutDeck_.selectedIndex != 1 && !this.overscanUpdate_) {
                this.overscanUpdate_ = window.setTimeout(function () {
                    this.overscanUpdate_ = null;
                    this.updateOverscan();
                    this.forceResizeEvent();                    
                }.bind(this), 100);             
            }
            return;
    }
}

/**
 * Updates the height/width of the appropriate spacers on the sides
 * of the browser.
 * @name updateOverscan
 */
LayoutManager.prototype.updateOverscan = function () {
    // First check if we have a user value, otherwise calculate the default
    // overscan size by percentage
    
    if (!this.prefs_.prefHasUserValue("overscan.top")) {
        var p = this.prefs_.getIntPref("overscan.default.percent");
        
        var w = window.screen.width;
        var h = window.screen.height;
        
        var rl = (w * p)/200;
        var tb = (h * p)/200;
        
        this.prefs_.setIntPref("overscan.top", tb);
        this.prefs_.setIntPref("overscan.bottom", tb);
        this.prefs_.setIntPref("overscan.right", rl);
        this.prefs_.setIntPref("overscan.left", rl);
    }
    
    for (var id in this.spacers_) {
        // need a minimum overscan of 1px so that panels don't anchor on the wrong
        // screen when using dual monitors
        var max = this.prefs_.getIntPref("overscan.max." + id);
        var val = Math.max(1, Math.min(this.prefs_.getIntPref("overscan." + id), max));
                 
        var attr = (id == "top" || id == "bottom") ? "height" : "width";
        this.spacers_[id].setAttribute(attr, val);
    }   
}

/**
 * This changes the size of the browser and then changes it back
 * to force a resize event to be fired.  This is necessary to make
 * XUL panels update their position when their anchor elements have
 * changed.
 * @name forceResizeEvent
 */
LayoutManager.prototype.forceResizeEvent = function () {
    window.innerWidth--;
    window.innerWidth++;
}

/**
 * Checks the full screen preferencen and sets the kylow window state
 * accordingly.  Also sets the fullscreen mode for MouseEventTool for MouseEventTool to hanlde
 * Mac's full screen issues
 * @name checkFullScreen
 */
LayoutManager.prototype.checkFullScreen = function () {
    window.fullScreen = this.prefs_.getBoolPref("fullScreen");
    if (platform_ == "osx" && mouseevttool_) {
        browser_.setMouseEventToolFullScreenMode();
    }
    
}

/**
 * On browser startup, this checks the resolution to show a message
 * if you are over 720p and performs the initial resize
 * @name checkOnStartup
 */
LayoutManager.prototype.checkOnStartup = function () { 
    this.checkFullScreen();
    this.resize();
    //TODO: Horrible hack for Mac not being able to minimize when fullscreen
    if (platform_ == "osx" || platform_ == "x11") {      
        document.getElementById("polo-main").addEventListener("click", this.checkFullScreen.bind(this), false);
    }    
    
    var self = this;
    AddonManager.getAddonsByTypes(["theme"], 
    function (themeList) {
       for (var i=0, j=themeList.length; i<j; i++) {
           var m = themeList[i].name.match(/\[(\d+)\]/i);
           if (m) {
               var name = themeList[i].name.replace(m[0], "");
               if (m[1] == "720") {
                   self.themes720_[name] = themeList[i];
               } else if (m[1] == "1080") {
                   self.themes1080_[name] = themeList[i];
               }
           }
           if (themeList[i].isActive) {
               // Found the current theme
               self.selectedTheme_ = themeList[i];
               if (m) {
                   self.selectedThemeResolution_ = m[1];
               }
           }
       }
       self.checkResolution();
    });  
}

/**
 * Checks your screen resolution and displays a message if are less than
 * 720 or greater than 1080
 * @name checkResolution
 */
LayoutManager.prototype.checkResolution = function () {
   var resolutionConstraints = {
       "720"  : {"minW": 1280, "maxW": 1500, "minH": 720, "maxH": 1024},
       // 1080 screens sometimes have built in overscan compensation, trigger at a lower number.
       "1080" : {"minW": 1500, "maxW": 0,    "minH": 850, "maxH": 0},
   };
   
   var themeSize = this.selectedThemeResolution_ || "720";
   
   // First check if the screen is smaller than the current optimal resolution
   if (window.screen.width < resolutionConstraints[themeSize].minW || 
       window.screen.height < resolutionConstraints[themeSize].minH) {
           if (themeSize == "720") {
               // Theme size is already 720, so just show a message telling the user
               // to consider increasing their screen size.
               this.showMinimumNotMet();
           } else {
               // Try to get a 720 version of the current theme
               var suggestedTheme_ = this.themes720_[this.selectedTheme_.name.replace("[" + themeSize + "]", "")];
               if (!suggestedTheme_) {
                   // Just grab the first 720 theme in the list
                   for (var theme in this.themes720_) {
                       suggestedTheme_ = theme;
                       break;
                   }
               }
               
               if (suggestedTheme_) {
                   this.showThemeSuggestion(suggestedTheme_);
               }
           }
           return;
    }
    
    // Check if the screen size is higher than the current optimal resolution, 
    // but only if our theme is specifically targeted for 720
    if (this.selectedThemeResolution_ == "720" &&
        (window.screen.width > resolutionConstraints[themeSize].maxW ||
        window.screen.height > resolutionConstraints[themeSize].maxH)) {
            // Try to get a 1080 version of the current theme
           var suggestedTheme_ = this.themes1080_[this.selectedTheme_.name.replace("[" + themeSize + "]", "")];
           if (!suggestedTheme_) {
               // Just grab the first 1080 theme in the list
               for (var theme in this.themes1080_) {
                   suggestedTheme_ = theme;
                   break;
               }
           }
           
           if (suggestedTheme_) {
               this.showThemeSuggestion(suggestedTheme_);
           }   
           return;
    }    
}

/**
 * Query the prefs system to see if the resolution dialog has been shown for this resolution
 * @name isDialogShownForCurrentScreen
 * @returns {Bool} Result of query
 */
LayoutManager.prototype.isDialogShownForCurrentScreen = function () {
    var key = "layout.resolution.issues.displayed." + this.selectedTheme_.id + "." + window.screen.width + "x" + window.screen.height;   
    return gPrefService.getPrefType(key) != Ci.nsIPrefBranch.PREF_INVALID;
}

/**
 * Sets the pref stating if the resolution check dialog has been shown for this screen
 * @name setDialogShownForCurrentScreen
 */
LayoutManager.prototype.setDialogShownForCurrentScreen = function () {
    var key = "layout.resolution.issues.displayed." + this.selectedTheme_.id + "."  + window.screen.width + "x" + window.screen.height;
    gPrefService.setBoolPref(key, true)
}

/**
 * Shows a dialog message if the minimum resolution is not met (720)
 * @name showMinimumNotSet
 */
LayoutManager.prototype.showMinimumNotMet = function () {
    if (this.isDialogShownForCurrentScreen()) {
        return;
    }
    window.setTimeout(function () {
        gPromptService.alert(window, i18nStrings_["alerts"].getString("alerts.screenResTitle"), i18nStrings_["alerts"].getString("alerts.screenResLessThanMinimumText"));
        this.setDialogShownForCurrentScreen();
    }.bind(this), 1000);
}

/**
 * Shows a message if the current resolution is beyond the constraints of our current
 * theme, and we have a second theme to suggest.
 * @name showThemeSuggestion
 */
LayoutManager.prototype.showThemeSuggestion = function (suggestedTheme) {
    if (this.isDialogShownForCurrentScreen(suggestedTheme.id)) {
        return;
    }
    if (!suggestedTheme) {
        return;
    }
    window.setTimeout(function () {
        var title = i18nStrings_["alerts"].getString("alerts.screenResTitle");
        var text = i18nStrings_["alerts"].getString("alerts.screenResMismatchText");
        var checkMsg = i18nStrings_["alerts"].getString("alerts.screenResMismatchCheckbox");
        var checkState = {value:false}; 
        if (gPromptService.confirmCheck(window, title, text, checkMsg, checkState)) {
            suggestedTheme.userDisabled = false;
                        
            // Restart the app
            let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].
                             createInstance(Ci.nsISupportsPRBool);
            Services.obs.notifyObservers(cancelQuit, "quit-application-requested",
                                         "restart");
            if (cancelQuit.data)
              return; // somebody canceled our quit request
    
            let appStartup = Cc["@mozilla.org/toolkit/app-startup;1"].
                             getService(Ci.nsIAppStartup);
            appStartup.quit(Ci.nsIAppStartup.eAttemptQuit |  Ci.nsIAppStartup.eRestart);
        }
		if (checkState.value) {
			this.setDialogShownForCurrentScreen(suggestedTheme.id);
		}                    
        
    }.bind(this), 1000);
}

/**
 * Moves the appliation to the given screen in a multiple monitor system
 * @param {Object} screen The screen to move the application to
 */
LayoutManager.prototype.moveToScreen = function (screen) {
    window.fullScreen = false;
    if (platform_ == "osx") {
        window.moveTo(screen.left + 30, screen.top + 30);
    } else {
        window.moveTo(screen.left, screen.top);
    }
    window.fullScreen = true;
}

/**
 * Returns the ScreenHelper object for utility funcitons
 * @param {Function} cb
 * @returns {ScreenHelper} ScreenHelper object
 */
LayoutManager.prototype.getScreenHelper = function (cb) {
    window.setTimeout(function () {
        var mgr = new ScreenHelper();
        mgr.load(function () {
            cb(mgr);
        });
    });
}

/**
 * Button handler for various buttons in the Screen adjustment page from settings
 * Handles overscan adjustment, cancel, reset, and accept buttons
 * @name buttonEvent
 * @param {Object} evt The button press event
 */
LayoutManager.prototype.buttonEvent = function (evt) {
    var v, h;
    var delta = this.adjustIncrement_;
    
    var self = this;
    function adjust(border, val) {
        var max = self.prefs_.getIntPref("overscan.max." + border);
        // need a minimum overscan of 1px so that panels don't anchor on the wrong
        // screen when using dual monitors
        val = Math.max(1, Math.min(val, max));
        if (val != self.adjust_[border]) { 
            self.spacers_[border].setAttribute((border == "top" || border == "bottom") ? "height" : "width", val);
            self.adjust_[border] = val;
        }
    }
    
    function persist() {
        for (var id in self.spacers_) {
            self.prefs_.setIntPref("overscan." + id, self.adjust_[id]);
        }
    }
    
    switch (evt.currentTarget.id) {
            
        case "overscan-cancel":
            adjust("bottom", this.prefs_.getIntPref("overscan.bottom"));
            adjust("left", this.prefs_.getIntPref("overscan.left"));
            adjust("right", this.prefs_.getIntPref("overscan.right"));
            adjust("top", this.prefs_.getIntPref("overscan.top"));
            this.exitAdjustMode();  
            break

            
        case "overscan-reset":
            if (evt.ctrlKey) {
                if (evt.shiftKey) {
                    adjust("bottom", this.prefs_.getIntPref("overscan.max.bottom"));
                    adjust("left", this.prefs_.getIntPref("overscan.max.left"));
                    adjust("right", this.prefs_.getIntPref("overscan.max.right"));
                    adjust("top", this.prefs_.getIntPref("overscan.max.top"));                                  
                } else {
                    adjust("bottom", 0);
                    adjust("left", 0);
                    adjust("right", 0);
                    adjust("top", 0);                   
                }
            } else {
                var def = gPrefService.getDefaultBranch("layout.overscan.");
                
                var p = def.getIntPref("default.percent");
        
                var w = window.screen.width;
                var h = window.screen.height;
        
                var rl = (w * p)/200;
                var tb = (h * p)/200;
                
                adjust("bottom", tb);
                adjust("left", rl);
                adjust("right", rl);
                adjust("top", tb);                
            }
            break;      
            
        case "overscan-max":
            adjust("bottom", 0);
            adjust("left", 0);
            adjust("right", 0);
            adjust("top", 0);
            break;
            
        case "overscan-exit-mode":
            persist();                    
            this.exitAdjustMode();
            return;
            
        default:
            var m = evt.currentTarget.id.match(/overscan-arrow-(\w+)-\w+/);
            if (!m) {
                break;
            }
            
            var border = m[1];
            if (evt.currentTarget.id.match(/-more/)) {
                adjust(border, this.adjust_[border] + delta);
            } else {
                adjust(border, this.adjust_[border] - delta);
            }
            break;            
    }

    // TODO: remove this hack... 
    document.getElementById("overscan-counter").value = Math.random();
}

/**
 * Puts the application into adustment mode by changing the main 
 * layout deck to view the adjustment screen.  Sets the overscan spacers
 * as well.
 * @name enterAdjustMode
 */
LayoutManager.prototype.enterAdjustMode = function () {
    this.layoutDeck_.selectedIndex = 1;    
    for (var i in this.spacers_) {
        this.spacers_[i].setAttribute("active", true);
    }
    
    this.adjust_ = {};
    for (var id in this.spacers_) {
        this.adjust_[id] = this.prefs_.getIntPref("overscan." + id);
    }
}

/**
 * Takes the application out of adustment mode by changing the main 
 * layout deck to view the browsers/chrome.
 * @name enterAdjustMode
 */
LayoutManager.prototype.exitAdjustMode = function () {
    this.layoutDeck_.selectedIndex = 0;    
    for (var i in this.spacers_) {
        this.spacers_[i].removeAttribute("active");
    }
    
    this.adjust_ = null;
    var stack = document.getElementById("overscan-stack");
//    stack.removeChild(stack.firstChild); // discard the canvas
    
    this.resize();
}

/**
 * Handles a window resize event.
 * @name handleEvent
 * @param {Object} evt The fired resize event
 */
LayoutManager.prototype.handleEvent = function (evt) {
    this.resize();
}

/**
 * Resize the controls and menus when a window resize event is fired.
 * @name resize
 */
LayoutManager.prototype.resize = function () {
    // Resize control bar  
    document.getElementById("controlsOverlay").style.width = this.contentBox_.clientWidth + "px";

    // Resizing global panels
    if (this.prevBrowserWidth_ != this.browserDeck_.clientWidth ||
        this.prevBrowserHeight_ != this.browserDeck_.clientHeight) {
        
        this.prevBrowserHeight_ = this.browserDeck_.clientHeight;
        this.prevBrowserWidth_ = this.browserDeck_.clientWidth;
        
        gZoomWidget.resize(this.browserDeck_.clientWidth, this.browserDeck_.clientHeight);
        gToolsMenu.resize(this.browserDeck_.clientWidth, this.browserDeck_.clientHeight);
    }
}

/**
 * Returns the bounding rect of the application bounding box
 * @name getContentBounds
 * @returns {TextRectangle} The bounding rectangle object
 */
LayoutManager.prototype.getContentBounds = function () {
    return this.contentBox_.getBoundingClientRect();
}

/**
 * Returns the width of the applications content viewing area.
 * @name getInnerWidth
 * @reutrns {Number} clientWidth of the content area.
 */
LayoutManager.prototype.getInnerWidth = function () {
    return this.contentBox_.clientWidth;
}

/**
 * Returns the height of the applications content viewing area.
 * @name getInnerHeight
 * @reutrns {Number} clientHeight of the content area.
 */
LayoutManager.prototype.getInnerHeight = function () {
    return this.contentBox_.clientHeight;
}

/**
 * Sets width and height on a panel after content area size has changed.
 * @name sizePopupToContentArea
 */
LayoutManager.prototype.sizePopupToContentArea = function (pnl, useMaxWidth, useMaxHeight) {
    pnl.style[useMaxWidth ? "maxWidth" : "width"] = this.getInnerWidth() + "px";
    var h = this.getInnerHeight();
    h -= this.controls_.clientHeight;
    
    pnl.style[useMaxHeight ? "maxHeight" : "height"] = h + "px";    
}

/**
 * ScreenHelper provides utility functions for dealing with the screen the application
 * is displayed on, as well as the overscan settings and handling resize events, etc.
 * @name LayoutManager
 * @constuctor
 */
function ScreenHelper() {
    this.screens_ = [];
}

/**
 * Returns the screen array
 * @name getScreens
 * @returns {Array} The array of screen objects
 */
ScreenHelper.prototype.getScreens = function () {    
    return this.screens_;
}

/**
 * Returns the index of the screen the application is currently displayed on.
 * @name getCurrentScreenIndex
 * @returns {Number} The index of the current screen.
 */
ScreenHelper.prototype.getCurrentScreenIndex = function () {
    return this.indexOfScreen(window.screen);
}

/**
 * Load the windowWatcher service and the screenCrawler xul window.   
 * @name load
 * @returns {Array} The array of screen objects
 */
ScreenHelper.prototype.load = function (cb) {
    this.cb_ = cb;
    var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);    
    this.window_ = ww.openWindow(window, "screenCrawler.xul", "screen-crawler-" + Date.now(), "chrome", {
        wrappedJSObject: this        
    });
    window.focus();
}

/**
 * Sets the crawler member variable and starts the crawling process.  This is called when the crawler
 * window has been initialized
 * @name crawlerLoaded
 * @param {Object} crawler
 */
ScreenHelper.prototype.crawlerLoaded = function (crawler) {
    this.crawler_ = crawler;
    this.beginCrawl();
}

/**
 * Begins crawling at the first position checked by the crawler window.
 * When crawling has completed, screen names are assigned and screens are 
 * returned to the caller. 
 * @name beginCrawl
 */
ScreenHelper.prototype.beginCrawl = function () {
    this.crawl(0, 0, function (success) {
        this.window_.close();
        this.screens_ = this.screens_.filter(function (screen) {
            return screen.width > 0 &&  screen.height > 0;
        });
        this.screens_.sort(function (x, y) {
            var t = x.left - y.left
            if (t == 0) {
                return x.top - y.top;
            }
            return t;
        });
        this.screens_.map(function (screen, i) {
            screen.name = i18nStrings_["browser"].getString("browser.screen") + (i + 1) + " (" + screen.width + "x" + screen.height + ")"; 
        });
        this.cb_ && this.cb_(this.screens_);
    }.bind(this));
}

/**
 * Returns the screen for the given index
 * @name indexOfScreen
 * @param {Number} x The index of the screen to return
 * @returns {Number} The index of the screen or -1 if not found
 */
ScreenHelper.prototype.indexOfScreen = function (x) {
    for (var i = 0; i < this.screens_.length; i++) {
        if (this.isScreensEqual(x, this.screens_[i])) {
            return i;
        }
    }
    
    return -1;
}

/**
 * Recursively positions the crawler window at the given locations
 * and determines if the position exists to determine where the screens
 * are located.
 * @name crawl
 * @param {Number} top The location of where to position the top of the crawler 
 * @param {Number} left The location of where to position the left side of the crawler
 * @param {Function} cb The callback function when the crawl completes
 */
ScreenHelper.prototype.crawl = function (top, left, cb) {
    this.crawler_.reposition(top, left, function () {
        var currentScreen = this.crawler_.getCurrentScreen();
        
        var index = this.indexOfScreen(currentScreen);
        if (index >= 0) {
            // already seen this screen..
            return cb(false);
        }
        
        this.screens_.push(this.duplicate(currentScreen));
    
        /**
         * x marks the places we try to visit 
         *              x          x          x
         *              ------------------------
         *             x|                      |x
         *              |                      |
         *             x|                      |x
         *              |                      |
         *             x|                      |x
         *              ------------------------                                
         *              x          x          x
         */
        
        let [dw, dh] = this.crawler_.getSize();
        
        var top = currentScreen.top;
        var left = currentScreen.left;
        var height = currentScreen.height;
        var width = currentScreen.width;
        
        var positions = [       
            top - dh,            left,
            top - dh,            left + width / 2,
            top - dh,            left + width,
            
            top,                 left + width,
            top + height / 2,    left + width,
            top + height,        left + width,
            
            top + height,        left,
            top + height,        left + width / 2,
            top + height,        left + width,          
            
            top,                 left -dw,
            top + height / 2,    left -dw,
            top + height,        left -dw,
        ];
        
        var f = (function () {
            if (positions.length == 0) {
                return cb(true);
            }
            var top = positions.pop()
            var left = positions.pop();
            
            this.crawl(left, top, f);
        }).bind(this);
        f();
    }.bind(this));
}

/**
 * Duplicates a given xpcom object for storage
 * @name duplicate
 * @param {Object} xpcobj The object to duplicate
 * @returns {Object} The duplicated object
 */
ScreenHelper.prototype.duplicate = function (xpcobj) {
    var jsobj = {};
    for (var i in xpcobj) {
        jsobj[i] = xpcobj[i];
    }
    return jsobj;
}

/**
 * Determines if two given screens are equal
 * @name isScreensEqual
 * @param {Object} a Screen a
 * @param {Object} b Screen b
 * @returns {Bool} True if screens are equal, false otherwise
 */
ScreenHelper.prototype.isScreensEqual = function (a, b) {
    return a.top == b.top &&
           a.left == b.left &&
           a.width == b.width &&
           a.height == b.height
}

/**
 * Sets the screen index and switches the application to the screen at that 
 * index.
 * @name setScreenIndex
 * @param {Object} idx The index of the screen to move the application to
 * 
 */
ScreenHelper.prototype.setScreenIndex = function (idx) {
    var screen = this.screens_[idx];
    gLayoutManager.moveToScreen(screen);
}
