/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var UDLRSettings = {
    BRANCH: "controls.",
    UDLRKEY: "enableUDLR",
    UDLRSPEED: "UDLRSpeed",

    
    setUDLRSpeed: function () {
        var value = this.radioGroup_.value;
        this.pref_.setCharPref(UDLRSettings.UDLRSPEED, value);
    },

    enableUDLR: function () {
        var value = this.checkBox_.checked;
        this.pref_.setBoolPref(UDLRSettings.UDLRKEY, value);
    },
    
    applyPref: function () {
        var e = this.pref_.getBoolPref(UDLRSettings.UDLRKEY);
        this.checkBox_.checked = e;
        if (e == true) {
            this.radioGroup_.disabled = false;
        } else {
            this.radioGroup_.disabled = true;
        }
        
        var s = this.pref_.getCharPref(UDLRSettings.UDLRSPEED);
        this.radioGroup_.value = s;

    },
    
    observe: function (subject, topic, pref) {
        if (topic != "nsPref:changed" || (( pref != UDLRSettings.UDLRKEY) && pref != UDLRSettings.UDLRSPEED)) {
            return;
        }

        this.applyPref();
    },
    
    init: function () {
        this.pref_ = gPrefService.getBranch(UDLRSettings.BRANCH);
        this.pref_.QueryInterface(Ci.nsIPrefBranch2);
        this.pref_.addObserver("", this, false);
        
        this.radioGroup_ = document.getElementById("UDLRSpeed");
        this.checkBox_ = document.getElementById("UDLREnabled");
        
        this.applyPref();
    }
}

function onload() {
    UDLRSettings.init();
}

window.addEventListener("load", onload, false);
