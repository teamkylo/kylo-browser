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
 * Called by DownloadManagerUI / moz-downloadManagerUI.js /
 * @name Downloads
 */
var Downloads = {
    /**
     * Shows the downloads screen when a download starts.
     * @name show
     */
    show: function () {
        browser_.switchOrCreate("about:downloads");
    },
    
    /**
     * Returns the Browser currently showing the downloads page.
     * @name getVisibleBrowser
     * @reutns {Browser} The browser displaying the downloads page.
     */
    getVisibleBrowser: function () {
        return browser_.getBrowserForURI("about:downloads");
    },
        
    /**
     * Returns true if the downloads page is being displayed,
     * false otherwise.
     * @name isVisible
     * @return {Bool} true if downloads is visible, false otherwise.
     */
    isVisible: function () {
        return this.getVisibleBrowser() != null;
    }
}

/**
 * Utility object.
 * @name gBrowser
 */
var gBrowser = {
    /**
     * Sets the homepage pref to the given url.  
     * @name setHomepage
     * @param {String} url the URL of the new homepage. 
     */
    setHomepage: function (url) {
        gPrefService.getBranch("browser.startup.").setCharPref("homepage", url);
    }
}

/**
 * Utility functions for handling interaction with the tools menu.
 * @name gToolsMenu
 */
var gToolsMenu = {
    /**
     * Sets a couple of member variables for the tools panel and the 
     * anchor for the tools panel
     * @name init
     */
    init: function () {
        this.panel_ = document.getElementById("tools-menu");
        this.panelAnchor_ = document.getElementById("controlsOverlay");
    },
    
    /**
     * Opens the tools panel
     * @name open
     */
    open: function () {
        if (this.panel_.state != "open") {
            this.panel_.openPopup(this.panelAnchor_, "before_end", 0, 0, false, false);
        }
    },  
    
    /**
     * Closes the tools panel
     * @name close
     */
    close: function () {
        if (this.panel_.state == "open") {
            this.panel_.hidePopup();
        }
    },
    
    /**
     * Resizes the tools panel to the given width and height.
     * @param {Number} w The new width of the panel
     * @param {Number} h The new height of the panel
     */
    resize: function (w, h) {
        this.panel_.setAttribute("width", w);
        this.panel_.setAttribute("height", h);       
    },  
    
    /**
     * Closes the panel if htere is a click that is not on any
     * of the tools buttons or the panel background.  Releases 
     * the lock on the control bar so that it may be hidden.
     * @param {Object} evt The click event
     */
    handleMenuClick: function (evt) {
        if (evt.target.id == "menu-buttonGroup") {
            return;
        } else {
            controls_.closePanel('tools'); 
            controls_.focusOut();
        }
    }
}

/**
 * gHomeChooser - may need to die. When homepage != default, 
 * we show this when they click the home button. It provides two
 * options: 1) the default homepage and 2) the user's homepage.
 */
var gHomeChooser = {
    init: function () {
        this.panel_ = document.getElementById("homepage-chooser-menu");
		this.panelAnchor_ = document.getElementById("controlsOverlay");
        this.buttonGroup_ = document.getElementById("homepage-chooser-buttonGroup");
        
        this.panel_.addEventListener("click", this, false);
        this.buttonGroup_.addEventListener("click", this, false);
    },
    
    handleEvent: function (evt) {
        controls_.closePanel("homechooser");
		
        // catch clicks off the items to close
        if (evt.currentTarget == this.panel_) {
            return;
        }
        
        browser_.loadURL(evt.target.uri);
    },
    
    update: function () {       
        var homepageURI = gPrefService.getCharPref("browser.startup.homepage");     
        if (this.buttonGroup_.firstChild && 
		    this.buttonGroup_.firstChild._url == homepageURI) {
            return;
        }
        
        while (this.buttonGroup_.lastChild) {
            this.buttonGroup_.removeChild(this.buttonGroup_.lastChild);
        }
    
        var home = document.createElement("placesgriditem")
        home.id = "homepagechoose-custom-home-option";
        home.uri = homepageURI;
        home.setAttribute("type", "bookmark");
        home.setAttribute("title", homepageURI.replace(/[^:\/]*:\/\/|www\.|\/.*$/ig, ""));
        home.setAttribute("src", "chrome://polo/skin/places/images/default.png");
        
        var defaultURI = gPrefService.getDefaultBranch("browser.startup.").getCharPref("homepage");
        var portal = document.createElement("placesgriditem")
        portal.id = "homepagechoose-default-home-option";
        portal.uri = defaultURI
        portal.setAttribute("type", "bookmark");
        portal.setAttribute("title", "Kylo Home");
        portal.setAttribute("src", "chrome://polo/skin/places/images/default.png");
        
        gPagePreview.getPreview(homepageURI, function(imageURI){
            home.setAttribute("src", imageURI && imageURI.spec || "chrome://polo/skin/places/images/default.png");
        });
        
        gPagePreview.getPreview(defaultURI, function(imageURI){
            portal.setAttribute("src", imageURI && imageURI.spec || "chrome://polo/skin/places/images/default.png");
        });
        
        this.buttonGroup_.appendChild(home);
        this.buttonGroup_.appendChild(portal);      
    },
    
    resize: function (w, h) {
        this.panel_.setAttribute("width", w);
        this.panel_.setAttribute("height", h);       
    },  
    
    open: function () {     
        this.update();      
        this.panel_.openPopup(this.panelAnchor_, "before_end", 0, 0, false, false);  
    },
    
    close: function () {
        if (this.panel_.state == "open") {
            this.panel_.hidePopup();
        }
    },
}

/**
 * Handles the interactions with the zoom panel.
 * @name gZoomWidget
 */
var gZoomWidget = {
    /**
     * Sets member variables for the panels and anchors, as well
     * as the button elements and settings.  
     * @name init 
     */
    init: function () {
        this.panel_ = document.getElementById("panZoomPanel");
        this.zoomVeil_ = document.getElementById("zoomVeil");
        this.anchorTop_ = document.getElementById("anchor-top");
        
        this.zoomInBtn_ = document.getElementById("zoomIn");
        this.zoomOutBtn_ = document.getElementById("zoomOut");
        this.zoomResetBtn_ = document.getElementById("zoomReset");
        
		this.resetTooltip_ = i18nStrings_["browser"].getString("browser.zoomReset");
		 
		this.setDefaultZoomLevel(gPrefService.getCharPref("polo.defaultZoomLevel"));
		
        this.zoomVeil_.setAttribute("os", platform_);
        this.setZoom(this.defaultZoom_);
		
    },
	
    /**
     * Sets the default zoom leve in this class when it is changed in settings,
     * and sets the tooltip for the restore button the zoom reset button.
     * @name setDefaultZoomLevel
     * @param {Number} level The new zoom level
     */
	setDefaultZoomLevel: function (level) {
		this.defaultZoom_ = Math.round(parseFloat(level) * 100) / 100;
		this.zoomResetBtn_.setAttribute("tooltiptext", this.resetTooltip_.replace(/\{zoomLevel\}/g, (this.defaultZoom_ * 100) + "%"));
	},
    
    /**
     * Opens the zoom panel.
     * @name open
     */
    open: function () {
        if (this.panel_.state != "open") {  
            this.defaultZoom_ = Math.round(parseFloat(gPrefService.getCharPref("polo.defaultZoomLevel")) * 100) / 100;
            this.panel_.openPopup(this.anchorTop_, "after_start", 0, 0, false, false);
            this.setZoom(browser_.getCurrentBrowserObject().getMarkupDocumentViewer().fullZoom);
        }
    },
    
    /**
     * Closes the panel and notifies the Controls class the panel was closed.
     * @name close
     * @param {Bool} doNotify True to notify the controls, false otherwise.
     */
    close: function (doNotify) {
        if (this.panel_.state == "open") {
            this.panel_.hidePopup();
        }
		if (doNotify) {
			controls_.notifyPanelClosed("zoom");
		}
    },
    
    /**
     * Resizes the zoom panel
     * @name resize
     * @param {Number} w The new width of the zoom panel 
     * @param {Number} h The new height of the zoom panel.
     */
    resize: function (w, h) {
        this.zoomVeil_.setAttribute("width", w);
        this.zoomVeil_.setAttribute("height", h);       
    },
    
    /**
     * Sets the state of the zoom buttons based on the
     * current zoom level.
     * @name setZoom
     * @param {Number} zoom The current zoom level
     */
    setZoom: function (zoom) {
        zoom = Math.round(parseFloat(zoom) * 100) / 100;
        if (zoom >= 2) {
            this.zoomInBtn_.setAttribute("disabled", true);
        } else {
            this.zoomInBtn_.removeAttribute("disabled");
        }
        
        if (zoom <= 1) {
            this.zoomOutBtn_.setAttribute("disabled", true);
        } else {
            this.zoomOutBtn_.removeAttribute("disabled");
        }

        if (zoom == this.defaultZoom_) {
            this.zoomResetBtn_.setAttribute("disabled", true);
        } else {
            this.zoomResetBtn_.removeAttribute("disabled");
        }
    }
}

/**
 * This class displays the bigger tooltips instead of the standard
 * browser tooltips so they are easier to read from a distance.
 * @name HTMLTooltip  
 */
var HTMLTooltip = {
    
    /**
     * Gets the tooltip element and sets some margins for future 
     * calculation.
     * @name init 
     */
    init: function () {
        this.tooltip_ = document.getElementById("html-tooltip");
        var style = window.getComputedStyle(this.tooltip_, null);
        HTMLTooltip.marginTop_ = Number(style.marginTop.replace("px", "")) || 0;
        HTMLTooltip.marginRight_ = Number(style.marginRight.replace("px", "")) || 0;
        HTMLTooltip.marginBottom_ = Number(style.marginBottom.replace("px", "")) || 0;
        HTMLTooltip.marginLeft_ = Number(style.marginLeft.replace("px", "")) || 0;
    },
    
    /**
     * Fills in the text for the larger toolip
     * @name fill
     * @param {Object} tipElement The HTML element for the tooltip
     * @param {Object} evt The mouseover event
     */
    fill: function (tipElement, evt) {
      // TODO STOLEN FROM browser.js        
      var retVal = false;
      if (tipElement.namespaceURI == "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul")
        return retVal;
    
      var XLinkNS = "http://www.w3.org/1999/xlink";
    
    
      var titleText = null;
      var XLinkTitleText = null;
      var direction = tipElement.ownerDocument.dir;
    
      while (!titleText && !XLinkTitleText && tipElement) {
        if (tipElement.nodeType == Node.ELEMENT_NODE) {
          titleText = tipElement.getAttribute("title");
          XLinkTitleText = tipElement.getAttributeNS(XLinkNS, "title");
          var defView = tipElement.ownerDocument.defaultView;
          // XXX Work around bug 350679:
          // "Tooltips can be fired in documents with no view".
          if (!defView)
            return retVal;
          direction = defView.getComputedStyle(tipElement, "")
            .getPropertyValue("direction");
        }
        tipElement = tipElement.parentNode;
      }
      
      var tipNode = this.tooltip_;
      tipNode.style.direction = direction;
      
      for each (var t in [titleText, XLinkTitleText]) {
        if (t && /\S/.test(t)) {
    
          // Per HTML 4.01 6.2 (CDATA section), literal CRs and tabs should be
          // replaced with spaces, and LFs should be removed entirely.
          // XXX Bug 322270: We don't preserve the result of entities like &#13;,
          // which should result in a line break in the tooltip, because we can't
          // distinguish that from a literal character in the source by this point.
          t = t.replace(/[\r\t]/g, ' ');
          t = t.replace(/\n/g, '');
    
          tipNode.setAttribute("label", t);
          retVal = true;
        }
      }
      
      if (retVal) {
          this.adjustPosition(this.tooltip_, evt);
      }
    
      return retVal;
    },

    /**
     * Adjusts the position of the tooltip, accounting for tooltip size
     * and where the placement is in regard to the edges of the screen.
     * @name adjustPosition
     * @param {Object} tooltip The tooltip element
     * @param {Object} evt The mouseover event.
     */
    adjustPosition: function (tooltip, evt) {
        window.setTimeout(function () {            
            var b = tooltip.getBoundingClientRect();
            var B = gLayoutManager.getContentBounds();
            
            var top = null;
            var left = null;
            
            var cursorSize = 32;
              
            if (b.left < B.left) {
                // tooltip is off screen to the left
                left = B.left;
            } else if (b.right > B.right) {
                // tooltip is off screen to the right
                left = B.right - b.width - (HTMLTooltip.marginLeft_ + HTMLTooltip.marginRight_);
            }
            
            if (b.top < B.top) {
                // tooltip is off screen to the top
                top = B.top;
            } else if (b.bottom > B.bottom) {
                // tooltip is off screen to the bottom
                top = B.bottom - b.height - (HTMLTooltip.marginTop_ + HTMLTooltip.marginBottom_);
            }
  
            if (left || top) {
                var x = (left || b.left) + window.mozInnerScreenX;
                var y = (top || b.top) + window.mozInnerScreenY;          
                if (evt.clientX + window.mozInnerScreenX + cursorSize >= (x + HTMLTooltip.marginLeft_) && 
                    evt.clientX + window.mozInnerScreenX <= (x + b.width) &&
                    evt.clientY + window.mozInnerScreenY + cursorSize >= (y + HTMLTooltip.marginTop_) &&
                    evt.clientY + window.mozInnerScreenY <= (y + b.height)) {
                    // Cursor is over tooltip
                    if (evt.clientY <= b.height) {
                        // Can't move up anymore, go down
                        y += (evt.clientY + window.mozInnerScreenY) - (y + HTMLTooltip.marginTop_);
                    } else {
                        // Move tooltip up
                        y -= (y + b.height + HTMLTooltip.marginTop_) - (evt.clientY + window.mozInnerScreenY);
                    }
                }
                tooltip.moveTo(x, y);
            }
        }, 0);        
    },
}

/**
 * Utilites to show the highlight panels over the control buttons when
 * you mouseover entries in the help screens.
 * @name Help
 */
var Help = {
    
    /**
     * Gets the panel element and stores it in a member variable.
     * @name init
     */
    init: function () {
        this.pnl_ = document.getElementById("help-overlay");    
    },
    
    /**
     * Shows and locks the control bar and calls the function to overylay 
     * the transparent hint panel over the given control.
     * @name showHint
     * @param {String} hint The control to highlight
     */
    showHint: function (hint) {   
        controls_.lockControls(); 
        controls_.setCollapsed(false, true);
        //TODO: Hack return for linux not being able to draw transparent panels.    
        if (platform_ == "x11") return;
        switch (hint) {
            case "sidebar":
                return this.overlay("sidebarButton");
            
            case "panzoom":
                return this.overlay("zoomButton");               
                
            case "pagelist":
                return this.overlay("titleBox");               

            case "addressbar":
                return this.overlay("urlEntryLabel");               
                
            case "bookmarks":
                return this.overlay("favoritesButton");               
                
            case "keyboard":
                return this.overlay("keyboardButton");               
                
            case "search":
                return this.overlay("searchButton");               
                
            case "menu":
                return this.overlay("toolsMenuButton");               
            
			case "home":
                return this.overlay("homeButton");               
                
            default:
                return;
        }
    },
    
    /**
     * Positions and opens the help panel over the given element.
     * @name overlay
     * @param {Object} id The id of the XUL element to highlight.
     */
    overlay: function (id) {
        var elem = document.getElementById(id);        
        var box = elem.getBoundingClientRect();
        this.pnl_.width = box.width;
        // need at least 3px from bottom edge of screen or the panel will move away...
        var h = Math.min(box.height, window.innerHeight - 3 - box.top);
        this.pnl_.height = h; // small height offset to make panel fit along the bottom of the screen
        this.pnl_.openPopup(elem, "before_start", 0, this.pnl_.height, false, false);        
        this.throb(0);
    },
    
    /**
     * Varies the opacity of the panel in order to draw attention
     * to the element being highlighted
     * @name throb
     * @param {Number} rads Value to seed the calculation for the opacity level 
     */
    throb: function (rads) {
        var opacity = 0.66 + 0.33 * Math.abs(Math.cos(rads));
        Help.pnl_.style.opacity = opacity.toFixed(2);
        Help.timeout_ = window.setTimeout(function () {
            Help.throb(rads + Math.PI / (2 * 30));
        }, 1000 / 30);
    },
    
    /**
     * Closes the panel and unlocks the control panel so it can be hidden.
     * @name clearHint 
     */
    clearHint: function (hint) {
        controls_.unlockControls();
        window.clearTimeout(this.timeout_);
        document.getElementById("help-overlay").hidePopup();
    }
}

/**
 * Helper functions for command line utilities.
 * @name CLIHelper
 */
var CLIHelper = {
    
    /**
     * Opens a new browser window with the given uri
     * @name open
     * @param {String} uri The uri to open in the new browser 
     */
    open: function (uri) {
        browser_.createNewBrowser(true, uri.spec);
    },
    
    /**
     * Switches to the Browser with the given uri, or creates one 
     * if it is not contained in the list of current browsers.
     * @name focus
     * @param {Object} uri The uri to display
     */
    focus: function (uri) {
        browser_.switchOrCreate(uri.spec);
    },
    
    /**
     * Displays the Browser at the given index in the browser list.
     * @name focusTabIndex
     * @param {Object} tabIdx The index of the browser to show.
     */
    focusTabIndex: function (tabIdx) {
        if (tabIdx < 0) {
            tabIdx = browser_.browsers_.length + tabIdx;
        }
        if (tabIdx >= 0 && tabIdx < browser_.browsers_.length) {
            browser_.setCurrentBrowser(tabIdx);
        }
    },
    
    /**
     * Opens the given uri in the browser at the given uri.
     * @name openInTab
     * @param {Object} tabIdx The index of the browser to use.
     * @param {Object} uri The URI to open.
     */
    openInTab: function (tabIdx, uri) {
        if (tabIdx < 0) {
            tabIdx = browser_.browsers_.length + tabIdx;
        }
        
        
        if (tabIdx < 0 || tabIdx >= browser_.browsers_.length) {
            browser_.createNewBrowser(true, uri);
        } else {
            browser_.setCurrentBrowser(tabIdx);
            browser_.loadURL(uri.spec);
        }
    }
}

/**
 * Helper functions for chrome pages (usu. about:* pages) to access browser manager
 * level utilites.
 * @name gChromePageHelper
 */
var gChromePageHelper = {
    
    /**
     * Closes a chrome page, if last page, create a new tab w/ the home page and kills the chrome page.
     * @name closePage
     * @param {Object} win The window used to find the correct Browser to close.
     */
    closePage: function (win) {
        var i = browser_.getBrowserIndexForDocument(win.document);
        if (i == -1) {
            return;
        }
        
        if (browser_.browsers_.length > 1) {
            browser_.closeTab(i);
            return;
        }
        
        this.replaceTab(null, win);
    },
    
    /**
     * Replace the content of the browser containing the given window object
     * withe the given uri.
     * @name replaceTab
     * @param {Object} uri The URI to replace the current page with
     * @param {Object} win the window object to find the correct Browser instance
     * to load the uri into.
     */
    replaceTab: function (uri, win) {
        // TODO use loadURIWithFlags to clear histry and use the existing tab?? 

        var browser = browser_.createNewBrowser(true, uri);
        if (uri == null) {
            browser.goHome();
        }        
        browser_.closeTab(browser_.getBrowserIndexForDocument(win.document));       
    }
}