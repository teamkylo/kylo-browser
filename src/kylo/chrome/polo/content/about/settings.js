/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var chromeWin_;
var i18nStrings_;
    
function getChromeWin() {
    var w = window.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIWebNavigation)
                        .QueryInterface(Ci.nsIDocShellTreeItem)
                        .rootTreeItem
                        .QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIDOMWindow); 

    return w;
}

function makeURI(aURL, aOriginCharset, aBaseURI) {  
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                             .getService(Components.interfaces.nsIIOService);
    return ioService.newURI(aURL, aOriginCharset, aBaseURI);
}

var ScreenManager = {
    init: function () {
		if (getChromeWin().platform_ == "x11") {
		    document.getElementById("screen-index").disabled = true;
			document.getElementById("screen-change-refresh-settings").disabled = true;
			return;	
		}
        ScreenManager.radio_ = document.getElementById("screen-index");
		this.load();
    },
    
    load: function () {
        getChromeWin().gLayoutManager.getScreenHelper (function (helper) {
            this.helper_ = helper;
            
            var screens = helper.getScreens();
            this.initialScreenIndex_ = helper.getCurrentScreenIndex();
			
			while (ScreenManager.radio_.lastChild) {
				ScreenManager.radio_.removeChild(ScreenManager.radio_.lastChild);
			}
            
            for (var i = 0; i < screens.length; i++) {
                var elem = document.createElement("radio");
                elem.setAttribute("value", i);
                elem.setAttribute("label", screens[i].name);
                ScreenManager.radio_.appendChild(elem);
            }
            
            ScreenManager.radio_.value = this.initialScreenIndex_;
        }.bind(this));		
    },
	
	selectedScreenChanged: function () {
		
		if (this.radio_.value == this.initialScreenIndex_) {
			return;
		}
		
		if (!this.confirmMessageBox_) {
			this.confirmMessageBox_ = document.getElementById("screen-change-message");
			this.confirmMessageLine1_ = this.confirmMessageBox_.firstChild.firstChild;
			this.confirmMessageLine2_ = this.confirmMessageBox_.firstChild.lastChild;
		}
		
		this.confirmMessageLine1_.value = i18nStrings_.getString("settings.confirmChanges");
		
		this.timeLeft_ = 15;
		this.countDownInterval_ = window.setInterval(ScreenManager.countDown, 1000);
		this.countDown();
		
		this.helper_.setScreenIndex(this.radio_.value);
		this.confirmMessageBox_.hidden = false;
		this.radio_.disabled = true;
	},
	
	countDown: function () {
		if (ScreenManager.timeLeft_ > 0) {
			var string = i18nStrings_.getString("settings.revertOneLine");
			string = string.replace("xx", ScreenManager.timeLeft_--);
			ScreenManager.confirmMessageLine2_.value = string;			
			return;
		}
		
		ScreenManager.cancelChange();
	},
	
	cancelChange: function () {
		this.helper_.setScreenIndex(this.initialScreenIndex_);
		this.reset();
	},
	
    confirmChange: function () {
        this.reset();
    },
	
	reset: function () {
		if (this.countDownInterval_) {
			window.clearInterval(this.countDownInterval_);
			this.countDownInterval_ = null;
		}
        this.confirmMessageBox_.hidden = true;
		this.radio_.disabled = false;
        this.load();
	},
	
    adjustOverscan: function () {
        getChromeWin().gLayoutManager.enterAdjustMode();        
    },
}

var NetworkSettings = {
    
    init: function () {
        this.pref_ = gPrefService.getBranch("network.proxy.");
        
        this.type_ = document.getElementById("proxy_type");
        this.host_ = document.getElementById("proxy_host");
        this.port_ = document.getElementById("proxy_port");
        
        this.type_.addEventListener("command", this, false);
        
        this.type_.value = this.pref_.getIntPref("type")
        if (this.type_.value == 1) {
            this.host_.removeAttribute("disabled");
            this.port_.removeAttribute("disabled");
        } else {
            this.host_.setAttribute("disabled","true");
            this.port_.setAttribute("disabled","true");
        }        
		
        this.pref_.QueryInterface(Ci.nsIPrefBranch2); 
        this.pref_.addObserver("", this, false);      
		
    },
    
    handleEvent: function (evt) {
        this.pref_.setIntPref("type", evt.target.value);
		if (this.type_.value == 1) {
			this.host_.removeAttribute("disabled");
			this.port_.removeAttribute("disabled");
		} else {
            this.host_.setAttribute("disabled","true");
            this.port_.setAttribute("disabled","true");
		}
    },
    
    inputChanged: function (pref) {
        if (this.type_.value != 1) {
            this.type_.value = 1;
        }
        
        var shareWith = ["ssl", "ftp", "socks", "gopher"];
       
        
        if (pref == "host") {
            for (var i = 0; i < shareWith.length; i++) {
            	this.pref_.setCharPref(shareWith[i], this.host_.value);
            }
        } else if (pref == "port") {
            for (var i = 0; i < shareWith.length; i++) {
                this.pref_.setIntPref(shareWith[i] + "_port", this.port_.value);
            }            
        }
    },
    
    observe: function(subject, topic, pref)  {
        if (topic != "nsPref:changed" || pref != "type") {
            return;
        }
        
        this.type_.value = this.pref_.getIntPref("type")
    },
    
}

/**
  * browser.download.folderList - int
  *   Indicates the location users wish to save downloaded files too.
  *   It is also used to display special file labels when the default
  *   download location is either the Desktop or the Downloads folder.
  *   Values:
  *     0 - The desktop is the default download location.
  *     1 - The system's downloads folder is the default download location.
  *     2 - The default download locat 
  * browser.download.dir - local file handle
  *   A local folder the user may have selected for downloaded files to be
  *   saved. Migration of other browser settings may also set this path.
  *   This folder is enabled when folderList equals 2.
  */
var DownloadSettings = {
    init: function () {
        this.pref_ = gPrefService.getBranch("browser.download.");
        this.fileField_ = document.getElementById("downloadsDir");
        
        this.pref_.QueryInterface(Ci.nsIPrefBranch2);
        this.pref_.addObserver("", this, false);
        
        this.loadPref();
    },
    
    loadPref: function (retry) {
        var folderList = this.pref_.getIntPref("folderList");
        var dir;
        
        switch (folderList) {
            case 0:
                dir = MozSettingsUtils._getDownloadsFolder("Desktop");
                this.fileField_.label = i18nStrings_.getString("settings.desktop");
                break;
                
            case 1:
                dir = MozSettingsUtils._getDownloadsFolder("Downloads");
                if (MozSettingsUtils._getDownloadsFolder("Desktop").equals(dir)) {
                    this.fileField_.label = i18nStrings_.getString("settings.desktop");
                } else {
                    this.fileField_.label = i18nStrings_.getString("settings.downloads");
                }
                break;
            
            case 2:
                dir = this.pref_.getComplexValue("dir", Ci.nsILocalFile);
                this.fileField_.label = dir.path;
                break;
                
            default:
                return;
        }
        
        this.fileField_.image = this.getIcon(dir);       
        
        this.dir_ = dir;
        this.folderList_ = folderList;
    },
    
    getIcon: function (file) {
        var fph = gIOService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
        var spec = fph.getURLSpecFromFile(file);
        return "moz-icon://" + spec + "?size=32";
    },
    
    chooseFolder: function () {
		if (chromeWin_.mouseevttool_) {
			chromeWin_.browser_.clearMouseEventToolCallback();
		}
        var result = MozSettingsUtils.chooseFolder(
            this.folderList_, 
            this.dir_, 
            MozSettingsUtils._getDownloadsFolder("Downloads")
        );
		if (chromeWin_.mouseevttool_) {
			chromeWin_.browser_.resetMouseEventToolCallback();
		}
        if (result) {
            if (result.equals(MozSettingsUtils._getDownloadsFolder("Desktop"))) {
                this.pref_.setIntPref("folderList", 0);
                return;
            } 
            if (result.equals(MozSettingsUtils._getDownloadsFolder("Downloads"))) {
                this.pref_.setIntPref("folderList", 1);
                return;
            } 
                
            this.pref_.setIntPref("folderList", 2);
            this.pref_.setComplexValue("dir", Ci.nsILocalFile, result);
        }        
    },
    
    observe: function(subject, topic, pref)  {
        if (topic != "nsPref:changed" ||
            (pref != "folderList" && pref != "dir")) {
            return;
        }

        this.loadPref();
    },    
    
}

var RestoreDefaults = {
    restore: function (evt) {
        try {
            Settings.pretendBusy(evt.target);
            window.setTimeout(function () {
            	for (var i in this.items) {
            	    this.items[i]();
            	}                
            }.bind(this), 0)
        } catch (e) {
        	debug(e);
        }
    },
    
    
    items: {
        prefs: function () {
            var items = [	     
                "browser.startup.homepage",
                "browser.startup.restoreTabs",
				"polo.defaultZoomLevel",
				"polo.defaultSearchEngine",
                "polo.showSysReq",
                "controls.promptOnExit",
                
                "browser.download.folderList",
                "browser.download.dir",

                "javascript.enabled",

                "network.proxy.type",
                "network.proxy.http",
                "network.proxy.ssl",
                "network.proxy.ssl_port",
                "network.proxy.ftp",
                "network.proxy.ftp_port",
                "network.proxy.socks",
                "network.proxy.socks_port",
                "network.proxy.gopher",
                "network.proxy.gopher_port",

                "font.minimum-size.x-western"
            ];
            
            var root = gPrefService.getBranch("");
            for (var i = 0; i < items.length; i++) {
				try {
					var k = items[i];
	                if (root.prefHasUserValue(k)) {
	                    root.clearUserPref(k);
	                }
				} catch (ex) {
				    // ignore	
				}
            }
        },
		
        branches: function () {
            var items = [        
                "layout.overscan",
				"layout.resolution.issues",
                "controls.",
				"keyboard.",
				"polo.update."
            ];
            
            for (var i = 0; i < items.length; i++) {
                try {
					var count = {};
					var branch = gPrefService.getBranch(items[i]);
                    var keys = branch.getChildList("", count);
					for (var j = 0; j < keys.length; j++) {
						var k = keys[j];
						if (branch.prefHasUserValue(k)) {
	                        branch.clearUserPref(k);
						} 
					}
                } catch (ex) {
					debug(ex);
                    // ignore   
                }				                   
            }
        },		
    }    
}

var FontSettings = {
    BRANCH: "font.minimum-size.",
    KEY: "x-western",
    
    applySetting: function () {
        this.pref_.setIntPref(FontSettings.KEY, this.menu_.value == "off" ? 0 : this.menu_.value);
    },
    
    applyPref: function () {
        this.menu_.value = this.pref_.getIntPref(FontSettings.KEY) || "off";        
    },
    
    observe: function(subject, topic, pref)  {
        if (topic != "nsPref:changed" || pref != FontSettings.KEY) {
            return;
        }

        this.applyPref();
    },    
    
    init: function () {
        this.pref_ = gPrefService.getBranch(FontSettings.BRANCH);        
        this.pref_.QueryInterface(Ci.nsIPrefBranch2); 
        this.pref_.addObserver("", this, false);
        
        this.menu_ = document.getElementById("font-size");
        
        this.applyPref();
    }
}

var ZoomSettings  = {

	setDefaultZoom: function () {
		var radioGroup = document.getElementById("default-zoom");
		gPrefService.getBranch("polo.").setCharPref("defaultZoomLevel", radioGroup.value);
		// This is duplicated when the setting change is observed, but this is visually
		// better because it shows instantly.
		chromeWin_.browser_.getCurrentBrowserObject().setZoomLevel(radioGroup.value);
	},
	
	observe: function (subject, topic, pref) {
        if (topic != "nsPref:changed" || pref != "defaultZoomLevel") {
            return;
        }
		this.applyPref();
	},

	applyPref: function () {
        document.getElementById("default-zoom").value = this.pref_.getCharPref("defaultZoomLevel");        
	},

	init: function () {
		this.pref_ = gPrefService.getBranch("polo.");
		this.pref_.QueryInterface(Ci.nsIPrefBranch2);
		this.pref_.addObserver("", this, false);
		
		this.applyPref();
	}
}

var SearchSettings  = {

    setDefaultSearch: function () {
        var menu = document.getElementById("searchMenu");
        gPrefService.getBranch("polo.").setCharPref("defaultSearchEngine", menu.value);
        //chromeWin_.gKeyboardOverlay.setSearchEngine(radioGroup.value);
    },
    
    observe: function (subject, topic, pref) {
        if (topic != "nsPref:changed" || pref != "defaultSearchEngine") {
            return;
        }
        this.applyPref();
    },

    applyPref: function () {
        document.getElementById("searchMenu").value = this.pref_.getCharPref("defaultSearchEngine");        
    },

    init: function () {
        this.pref_ = gPrefService.getBranch("polo.");
        this.pref_.QueryInterface(Ci.nsIPrefBranch2);
        this.pref_.addObserver("", this, false);
        
        this.applyPref();
    }
}

var StartupSettings = {
	BRANCH: "browser.startup.",
	KEY: "homepage",
	
	applyPref: function () {
		var uri = Utils.newURI(this.pref_.getCharPref(StartupSettings.KEY));
		
		this.urlField_.value = uri.spec;
		this.icon_.setAttribute("src", PlacesUtils.favicons.getFaviconImageForPage(uri).spec || getChromeWin().Controls.ERRORED_FAVICON);
	},
	
	observe: function (subject, topic, pref) {
        if (topic != "nsPref:changed" || pref != StartupSettings.KEY) {
            return;
        }
		
		this.applyPref();
	},
	
	init: function () {
		this.urlField_ = document.getElementById("hp_url");
		this.icon_ = document.getElementById("hp_icon");
		
		this.pref_ = gPrefService.getBranch(StartupSettings.BRANCH);
		this.pref_.QueryInterface(Ci.nsIPrefBranch2);
		this.pref_.addObserver("", this, false);
		
		this.applyPref();
	}
}

var ThemeSettings = {
    refresh: function () {
        var self = this; 
        // Clear existing theme list
        while (self._listBox.lastChild) {
            self._listBox.removeChild(self._listBox.lastChild);
        }
        // Reload available themes
        AddonManager.getAddonsByTypes(["theme"], function(addonsList) {
            for (var i=0, j=addonsList.length; i<j; i++) {
                var item = self.createItem(addonsList[i]);
                if (addonsList[i].isActive &&
                    self._listBox.hasChildNodes()) {
                    self._listBox.insertBefore(item, self._listBox.firstChild);
                } else {
                    self._listBox.appendChild(item);
                }
            }
        });        
    },
    
    promptRestartToApply: function (aAddon) {
        if (this.isPrompting_) {
            // already prompting
            return;
        }
        this.isPrompting_ = true;
        
        let bodyString = aAddon.pendingOperations & AddonManager.PENDING_UNINSTALL ? 
                                "settings.addons.promptRestartBodyUninstall" : 
                                "settings.addons.promptRestartBody"; 
        if (gPromptService.confirm(window, 
                                   i18nStrings_.getString("settings.addons.promptRestartTitle"), 
                                   i18nStrings_.getString(bodyString).replace("%S", 
                                        document.getElementById("brandStrings").getString("brandShortName"))
                                   )) {
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
        } else {
            // We should undo the last change  
            if (aAddon.pendingOperations & AddonManager.PENDING_UNINSTALL) {
                debug("cancelling uninstall: " + aAddon.pendingOperations);
              aAddon.cancelUninstall();
            } else if (aAddon.pendingOperations & AddonManager.PENDING_ENABLE) {
              aAddon.userDisabled = true;
            } else if (aAddon.pendingOperations & AddonManager.PENDING_DISABLE) {
              aAddon.userDisabled = false;
            }  
        }
        
        this.isPrompting_ = false;
    },
    
    createItem: function (data) {
        var item = document.createElement("richlistitem");
        
        item.setAttribute("class", "themeItem");
        item.setAttribute("name", data.name);
        item.setAttribute("value", data.id);
        
        // Store a copy of the addon data on the matching element
        item.mAddon = data;
        
        this._addons[data.id] = item;
        
        return item;
    },
    
    init: function () {
        this._listBox = document.getElementById("themeList");
        this._addons = {};
        
        var self = this;
        ["onEnabling", "onEnabled", "onDisabling", "onDisabled", "onUninstalling",
         "onUninstalled", "onInstalled", "onOperationCancelled",
         "onUpdateAvailable", "onUpdateFinished", "onCompatibilityUpdateAvailable",
         "onPropertyChanged"].forEach(function(aEvent) {
          self[aEvent] = function(aAddon) {
              debug("event: " + aEvent + ", addon: " + aAddon.name + ", isActive: " + aAddon.isActive);
              if (self._addons[aAddon.id] &&
                  self._addons[aAddon.id][aEvent]) {
                  self._addons[aAddon.id][aEvent].apply(self._addons[aAddon.id], Array.splice(arguments, 0));
              }
          };
        });        
        // Listen for events from the AddonManager
        AddonManager.addAddonListener(this);            
    },
    
    shutdown: function () {
        AddonManager.removeAddonListener(this);
    },
}

var Settings = {
    
    sanitize: function (evt) {
        Settings.pretendBusy(evt.target);
        Sanitizer.sanitize();
    },
    
    pretendBusy: function (btn) {
        // Pretend to be busy for some time
        var lbl = btn.label;
        btn.label = i18nStrings_.getString("settings.pleaseWait");
        window.setTimeout(function () {
            btn.label = lbl;
            btn.disabled = false;
        }, 5000);
        btn.disabled = true;        
    },
	
	syncFocusLockPref: function (elem) {
		gPrefService.setBoolPref("keyboard.autolaunch.focusLock", elem.value);
	},
	
	showOpenTabChooser: function (title, ok, cancel, cb) {

        var okBtn = document.getElementById("tab-chooser-ok");
		var cancelBtn = document.getElementById("tab-chooser-cancel");
		document.getElementById("tab-chooser-title").value = title;
		okBtn.label = ok;
		cancelBtn.label = cancel;
		
        var data = chromeWin_.browser_.getSnapshots(document);
        
        var box = document.getElementById("tab-chooser-box");
		var empty = document.getElementById("tab-chooser-empty");
        while (box.lastChild) {
            box.removeChild(box.lastChild);
        }
        
		Settings.tabChooserCb_ = cb;
		
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
			if (d.uri.scheme == "about") {
				continue;
			}
			
            if (chromeWin_.browser_.isURIBlackListed(d.uri)) {
                continue;
            }
			
            var elem = document.createElement("browser-snapshot");
            elem.appendChild(d.canvas);
            elem.setAttribute("title", d.title);
            elem.setAttribute("uri", d.uri.spec);
            elem.title = d.title;
            elem.uri = d.uri;
            
            box.appendChild(elem);
        }
//		
//		if (box.childNodes.length === 0) {
//			box.hidden = true;
//			empty.hidden = false;
//			okBtn.disabled = true;
//		} else {
//            box.hidden = false;
//            empty.hidden = true;
//			okBtn.disabled = false;			
//		}
        
        var panel = document.getElementById("tab-chooser");
        if (!panel.listenersAdded_) {
            panel.listenersAdded_ = true;
            okBtn.addEventListener("command", function (evt) {
                panel.hidePopup();
				
				if (Settings.tabChooserCb_) {
					var cb = Settings.tabChooserCb_;
					Settings.tabChooserCb_= null;
					cb(true, box.currentItem);
				}
            }, false);
            cancelBtn.addEventListener("command", function () {
                panel.hidePopup();
                if (Settings.tabChooserCb_) {
                    var cb = Settings.tabChooserCb_;
                    Settings.tabChooserCb_= null;
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
	},
    
    showHomepageChooser: function () {		
        Settings.showOpenTabChooser(
		    i18nStrings_.getString("settings.selectOpenPage"),
		    i18nStrings_.getString("settings.setHomepage"),
		    i18nStrings_.getString("settings.cancel"),		
			function (ok, item) {
				if (ok && item) {
					gPrefService.getBranch("").setCharPref("browser.startup.homepage", item.uri.spec);
				}
			}
		);          	
    },
	
	checkLocation: function () {
		
		var m = (window.top ? window.top.location : window.location).toString().match(/t=([^&]+)/)
		if (!m) {
			return;
		}
		switch (m[1]) {
            case "content":
                document.getElementById("settingsTabBox").selectedIndex = 1;
                break;
							             
            case "privacy":
                document.getElementById("settingsTabBox").selectedIndex = 2;
                break;
                                         
            case "network":
                document.getElementById("settingsTabBox").selectedIndex = 3;
                break;  				  
						
			case "display":
                document.getElementById("settingsTabBox").selectedIndex = 4;
                break;	
				
			default:
			    if (!isNaN(m[1])) {
					document.getElementById("settingsTabBox").selectedIndex = parseInt(m[1]);
				} 
                break;
		}
	},
	
	handleTabChange: function (evt) {
	    if (evt.type != "select") return;
	    if (evt.target.id != "tabPanels") return;
	    switch (evt.target.selectedPanel.id) {
	        case "themeTabPanel":
	           ThemeSettings.refresh();
               break;
	        default:
	           break;
	    }
	},
    
    onload: function () {
		
		i18nStrings_ = document.getElementById("strings");
		document.title = i18nStrings_.getString("settings.title");
		
        var buttons = document.documentElement.querySelectorAll("button[type=restore-pref]");
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons.item(i);
            btn.addEventListener("command", function (evt) {
                var pref = evt.currentTarget.getAttribute("pref");
                if (pref) {
                    gPrefService.getBranch("").clearUserPref(pref);
                } 
            }, false);
        }
        
        
        var tabbox = document.getElementById("settingsTabBox");
        tabbox.addEventListener("select", this.handleTabChange, false);
        
        
        chromeWin_ = getChromeWin();
        
		Components.utils["import"]("resource://gre/modules/PlacesUtils.jsm");
		Components.utils["import"]("resource://gre/modules/AddonManager.jsm");
		Components.utils["import"]("resource://gre/modules/Services.jsm");
		
		ScreenManager.init();
        NetworkSettings.init();
        DownloadSettings.init();
        FontSettings.init();
		StartupSettings.init();
		ZoomSettings.init();
		SearchSettings.init();
		ThemeSettings.init();
		
		Settings.checkLocation();		
		
		this._loaded = true;
    },
    
    shutdown: function () {
        if (this._loaded) {
            ThemeSettings.shutdown();
        }
    }
};


/**
 * KW 08/14/11: Changing from setting onload in XUL to doing it in JavaScript so
 * we can symmetrically listen for load and unload events.
 */
//window.addEventListener("load", Settings.onload(), true);
window.addEventListener("unload", Settings.shutdown(), false);
