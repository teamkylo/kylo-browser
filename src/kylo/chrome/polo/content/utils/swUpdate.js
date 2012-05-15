/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var SWUpdate = {
	
	STATE_IDLE: 0,
	
	STATE_DOWNLOADING: 1,
	
	STATE_VERIFYING: 2,
	
	STATE_INSTALLING: 3,
    
    init: function(){
		
		this.state_  = SWUpdate.STATE_IDLE;
		/**
		 * Information about an update being downloaded..
		 */
		this.descriptor_ = null;
		this.targetFile_ = null;
		this.listeners_ = [];
    },
    
    checkAndPrompt: function(){
        window.setTimeout(function(){
            SWUpdate.check(function(evt){
                if (evt.failed) {
                    // fail silenty;
                    return;
                }
                
                var available = evt.result.available;
                if (available) {
                    var annoyingKey = "polo.update.skipped." + evt.result.currentVersion + "->" + evt.result.descriptor.version;
                    if (gPrefService.getPrefType(annoyingKey) != Ci.nsIPrefBranch.PREF_INVALID) {
                        // already said no for this upgrade.
                        return;
                    }
                    
                    var title = i18nStrings_["alerts"].getString("alerts.updateTitle");
                    var text = i18nStrings_["alerts"].getString("alerts.updateText");
                    var checkMsg = i18nStrings_["alerts"].getString("alerts.updateCheckbox");
                    var checkState = { value: false }
                    
                    if (gPromptService.confirmCheck(window, title, text, checkMsg, checkState)) {
                        browser_.createNewBrowser(true, "about:");
                    }
                    
                    if (checkState.value) {
                        gPrefService.setBoolPref(annoyingKey, true);
                    }
                }
            });
        }, 1000);
    },
    
    check: function(cb){
        var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
        var vendor = gPrefService.getCharPref("polo.swupdate.vendor");
        var url = gPrefService.getCharPref("polo.swupdate.url")
            .replace("$vendor", encodeURIComponent(vendor))
            .replace("$version", encodeURIComponent(appInfo.version));
            
        Utils.getJSONFromURL(url, function(evt){
            if (evt.failed) { 
                return cb({ failed: true, errorMessage: "Could not reach server" });
            }
            
            var result = evt.result;
            var osResult;
            
			if (platform_ == "osx") {
                osResult = result.osx;
            } else if (platform_ == "win32") {
                osResult = result.win32;
            } else {
				//TODO: Linux update n/a right now.
				osResult = {};
			}
			
			// Strip off the last version chunk (revision number)
			v1 = Utils.formatVersion(osResult.newest.version);
			
			// Strip off the last version chunk (revision number)
			v2 = Utils.formatVersion(appInfo.version);	
			
		    // Now we'll start comparing versions and making sure the new one is greater
		    var vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);

            if (osResult.newest && (vc.compare(v1, v2) > 0)) {
                cb({failed: false, result: { available: true, descriptor: osResult.newest, currentVersion: appInfo.version } });
            } else {
                cb({ failed: false, result: { available: false, descriptor: null }});
            }
        });
    },
	
	isIdle: function () {
		return this.state_ == SWUpdate.STATE_IDLE;
	},
	
	update: function (descriptor) {
		switch (this.state_) {
			case SWUpdate.STATE_IDLE:
			     this.descriptor_ = descriptor;
			     this.download();				 	
			     break;
				 
            case SWUpdate.STATE_DOWNLOADING:
			default:
                 throw "Unexpected";
                 break;
		}
	},
	
	addListener: function (listener) {
		this.listeners_.push(listener);
	},

    removeListener: function (listener) {
		var i = this.listeners_.indexOf(listener);
		if (i > -1) {
			this.listeners_.splice(i, 0, 1);
		}
    },
	
	notify: function (evt) {
		this.listeners_.map(function (l) {
			try {
				l(evt);
			} catch (ex) {
			}
		});
	},
	
	reset: function () {
		this.state_ = SWUpdate.STATE_IDLE;
        this.descriptor_ = null;
        this.targetFile_ = null;
	},
	
	downloadFinished: function (failed) {
		if (failed) {
			this.notify({type: "download-failed"});
			this.reset();
			this.showDownloadFailed();
			return;
		}
		
		
		this.notify({type: "download-finishing"});
		this.install();
	},
	
    download: function() {    
		var descriptor = this.descriptor_;
        var sourceURI = Utils.newURI(descriptor.url);
        var targetFile = this.getSaveLocation(descriptor);
		var download;
		
		if (targetFile.exists()) {
			try {
				targetFile.remove(false);
			} catch (ex) {
				this.downloadFinished(true);
				return;
			}				
		}
		
        var wbp = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);
        wbp.persistFlags = Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES | Ci.nsIWebBrowserPersist.PERSIST_FLAGS_BYPASS_CACHE;
        wbp.saveURI(sourceURI, null, null, null, null, targetFile);
        wbp.progressListener = {
            onSecurityChange: function(prog, req, state){},
            onProgressChange: function(prog, req, progCur, progMax, tProg, tProgMax){
				SWUpdate.notify({type: "download-progress", progCur: progCur, progMax: progMax});
			},
            onStateChange: function(prog, req, flags, status) {
				var wpl = Ci.nsIWebProgressListener;
				if (flags & wpl.STATE_IS_REQUEST) {
					if (flags & wpl.STATE_STOP) {
						wbp.progressListener = null;
						SWUpdate.downloadFinished(status > Cr.NS_OK);
					}
				}
			},
			onStatusChange: function (prog, req, status, message) {
			},
        };
		
		this.targetFile_ = targetFile;
		this.state_ = SWUpdate.STATE_DOWNLOADING;
		this.notify({type: "download-started"})
    },
	
    install: function(){
		try {
			if (gPrefService.getBoolPref("polo.swupdate.hash.check.enabled")) {
				if (!this.descriptor_.hash) {
					throw "Descriptor doesn't define a hash to verify";
				}
				
				if (this.descriptor_.size != this.targetFile_.fileSize) {
					throw "File size does not match";
				}
				
				if (["MD2", "MD5", "SHA1", "SHA256", "SHA384", "SHA512"].indexOf(this.descriptor_.hash.method) == -1) {
					throw "Descriptor specifies an invalid hashing method";
				}

                if (Utils.hashFile(this.targetFile_, this.descriptor_.hash.method, "hex") != this.descriptor_.hash.value) {
                    throw "Hash does not match";
                }				
			}
		} catch (ex) {
            this.notify({type: "download-invalid"})
            this.reset();
            this.showHashCheckFailed();
            return;
		}
		
		this.showInstallStarting();
        this.targetFile_.launch();
		
		// quit!        
        Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup).quit(Ci.nsIAppStartup.eForceQuit);            
    },
    
    getSaveLocation: function(descriptor){
        var dirs = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
        var file = dirs.get("ProfD", Ci.nsILocalFile);
		if (platform_ == "osx") {
        	file.append("kylo-setup_" + descriptor.version.replace(/[^0-9]+/g, "_") + ".dmg")
		} else if (platform_ == "win32") {
        	file.append("kylo-setup_" + descriptor.version.replace(/[^0-9]+/g, "_") + ".exe")
		} else {
			//TODO: Linux file name here
			file = "";
		}
        return file;
    },
	
	getDescriptor: function () {
	   return this.descriptor_;
	},
	
	showInstallStarting: function () {
        var title = i18nStrings_.alerts.getString("alerts.updateTitle");
        var text = i18nStrings_.alerts.getString("alerts.installText");
		gPromptService.alert(window, title, text);		
	},
		    
    showDownloadFailed: function () {
		var title = i18nStrings_.alerts.getString("alerts.updateTitle");
        var text = i18nStrings_.alerts.getString("alerts.downloadFailed");
        gPromptService.alert(window, title, text);        
    },		
    
    showHashCheckFailed: function () {
        var title = i18nStrings_.alerts.getString("alerts.updateTitle");
		var text = i18nStrings_.alerts.getString("alerts.dowloadFileInvalid");
        gPromptService.alert(window, title, text);        
    },
    	
//	tagFileToDelete: function (tag, file) {
//		gPrefService.getBranch("polo.swupdate.files_to_delete").setComplexValue(tag || Math.random(), Ci.nsILocalFile, file);
//	},
//	
//	cleanTaggedFiles: function () {
//
//		var count = {};
//		var prefs = gPrefService.getBranch("polo.swupdate.files_to_delete");
//        var keys = prefs.getChildList("", count);
//        for (var i = keys.length - 1; i >= 0; i--) {
//			var k = keys[i];
//			try {
//	            var file = prefs.getComplexValue(k, Ci.nsILocalFile);
//				file.remove(false);
//			} catch (ex) {
//				// ignore;
//			} 
//			prefs.clearUserPref(k);
//		}		
//	},
	
	/***
	 * Deletes any setup files
	 */
	cleanSetupFiles: function () {
        var dirs = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
        var profd = dirs.get("ProfD", Ci.nsIFile);		
		var iter = profd.directoryEntries;
		while (iter.hasMoreElements()) {
			var file = iter.getNext();
		    try {       
				file.QueryInterface(Ci.nsILocalFile);
				if (file.leafName.match(/^kylo-setup_(.+)\.(exe|dmg)$/)) {
					file.remove(false);
				}
		    } catch (ex) {
		        // ignore
		    }
		}
	}
}

