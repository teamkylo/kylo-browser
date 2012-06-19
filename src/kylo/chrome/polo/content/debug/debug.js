/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var gDebugTools = {
    enabled: false,
    
    enable: function () {
        debug("enabling debug tools!");
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        document.addEventListener("keydown", this, false);    
    },
    
    disable: function () {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        document.removeEventListener("keydown", this, false);        
    },
    
    handleEvent: function (evt) {
        var modKey = evt.ctrlKey;
        if (platform_ == "osx") {
            modKey = evt.metaKey;
        }
        if (!modKey) {
            return;
        }
        
        if (!this.prefs_) {
            this.prefs_ = gPrefService.getBranch("debug.");
        }   
        switch (evt.keyCode) {
            case 112: // F1
            case 113: // F2
            case 114: // F3
            case 115: // F4     
                var json = this.prefs_.prefHasUserValue("evalbox.json") && this.prefs_.getCharPref("evalbox.json");
                if (json) {
                    var snippets = JSON.parse(json);
                    var i = Number(evt.keyCode) - 112;
                    if (snippets[i]) {
                        debug("Eval result:\n" + eval(snippets[i]));
                    }
                }
                break;
                
            case 116: // F5
                var params = {curWidth: window.innerWidth,
                              curHeight: window.innerHeight,
                              newRes: null};
                
                window.openDialog("chrome://polo/content/debug/resolutionDialog.xul", "resbox", "chrome,centerscreen,resizable=no,modal=yes", params);
                
                if (params.newRes && params.newRes.match(/^\d+x\d+$/)) {
                    var wh = params.newRes.split("x");
                    window.innerWidth = parseInt(wh[0]);
                    window.innerHeight = parseInt(wh[1]);
                }
                
                break;
            
            case 117: // F6
                break;
                
            case 118: // F7
                if (this.prefs_.getBoolPref("evalbox.enabled")) {
                    var json = this.prefs_.prefHasUserValue("evalbox.json") ? this.prefs_.getCharPref("evalbox.json") : "[\"alert('hello');\"]";
                    var params = {src: JSON.parse(json)};
                    window.openDialog("chrome://polo/content/debug/evalBox.xul", "evalbox", "chrome,resizable=yes,modal=yes", params);
                
                    if (params.src) {
                        this.prefs_.setCharPref("evalbox.json", JSON.stringify(params.src));
                        try {
                            debug("Eval result:\n" + eval(params.src[0]));
                        } catch (ex) {
                            debugObj(ex);
                        }
                    }   
                }
                break;
                
            case 119: // F8
                var winopts = "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar";
                window.open("chrome://global/content/console.xul", "_blank", winopts);
                break;      
                
            case 120: // F9
                //debug("Starting Venkman");
                //start_venkman();        
                break;
    
            case 121: // F10
                /*
                window.openDialog("chrome://chromelist/content/chromelist.xul",
                                  "chrome-browser", "resizable,dialog=no,status",
                                  {url: "chrome://"});
                */        
                break;          
                
            case 122: // F11
                var pref = gPrefService.getBranch("layout.");
                var fs = pref.getBoolPref("fullScreen");
                window.fullScreen = !fs; 
                pref.setBoolPref("fullScreen", window.fullScreen);
                break;
                
            case 123: // F12
                /*
                debug("Starting DOM Inspector");
                window.open("chrome://inspector/content/inspector.xul", "", "resizable,chrome");
                */              
                break;          
    
        }        
    }
}
