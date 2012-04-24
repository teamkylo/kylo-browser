/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var UDLR = {
    BRANCH: "controls.",
    ENABLED_KEY: "enableUDLR",
    SPEED_KEY: "UDLRSpeed",
    
    _pref: null,
    _udlrtool: null,
    
    setEnabled: function (bEnabled) {
        UDLR._pref.setBoolPref(UDLR.ENABLED_KEY, bEnabled);
    },
    
    isEnabled: function () {
        return UDLR._pref.getBoolPref(UDLR.ENABLED_KEY);
    },
    
    setSpeed: function (sSpeed) {
        UDLR._pref.setCharPref(UDLR.SPEED_KEY, sSpeed);
    },
    
    getSpeed: function () {
        return UDLR._pref.getCharPref(UDLR.SPEED_KEY);
    },
    
    _applyPref: function () {
        var enabled = UDLR._pref.getBoolPref(UDLR.ENABLED_KEY);

        if (enabled == true) {
            UDLR._udlrtool.EnableUDLR();
        } else {
            UDLR._udlrtool.DisableUDLR();
        }
        
        var speed = UDLR._pref.getCharPref(UDLR.SPEED_KEY);
        
        if (speed == "slow") {
            UDLR._udlrtool.SetSpeed(2, 7);
        } else if (speed == "medium") {
            UDLR._udlrtool.SetSpeed(3, 10);
        } else if (speed == "fast") {
            UDLR._udlrtool.SetSpeed(5, 15);
        }        
    },    
    
    observe: function (subject, topic, pref) {
        if (topic != "nsPref:changed" || (( pref != UDLR.ENABLED_KEY) && pref != UDLR.SPEED_KEY)) {
            return;
        }

        UDLR._applyPref();
    },
    
    init: function () {
        UDLR._udlrtool = Cc["@hcrest.com/UDLRTool;1"].createInstance(Ci.IUDLRTool);
        
        UDLR._pref = gPrefService.getBranch(UDLR.BRANCH);
        UDLR._pref.QueryInterface(Ci.nsIPrefBranch2);
        UDLR._pref.addObserver("", UDLR, false);
        
        UDLR._applyPref();
    }    
};

function onload() {
    UDLR.init();
}

window.addEventListener("load", onload, false);
