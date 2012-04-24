/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

// http://www.woodmann.com/fravia/sources/WINUSER.H
var VK_MAP = {
	BKSP: 		0x08,
	TAB: 		0x09,
	ENTER: 		0x0D,	
	SHIFT:		0x10,
	SPACE:		0x20,
}

function KeyStrokeGeneratorWin32() {
	try {
		this.sendKeys_ = Components.classes["@hcrest.com/sendKeys;1"].getService(Components.interfaces.ISendKeys);
	} catch (ex) {
		//nothing
	}
}

KeyStrokeGeneratorWin32.prototype.generate = function (msg) {
	var vk = 0;
	if (typeof msg == "string") {
	    msg = [msg];
	}
	for (var i=0, j=msg.length; i<j; i++) {
        if (msg[i].length == 1) {
            this.sendKeys_.char_down(msg[i]);
            this.sendKeys_.char_up(msg[i]);
            return;
        }
        
        if (msg[i] in VK_MAP) {
            vk = VK_MAP[msg[i]];
            this.sendKeys_.key_down(vk);  
            this.sendKeys_.key_up(vk);  
        }       
    }	
}

KeyStrokeGeneratorWin32.prototype.generateCombo = function (msg) {
    var vk = 0;
    if (typeof msg == "string") {
        msg = [msg];
    }
    for (var i=0, j=msg.length; i<j; i++) {
        if (msg[i].length == 1) {
            this.sendKeys_.char_down(msg[i]);
            return;
        }
        
        if (msg[i] in VK_MAP) {
            vk = VK_MAP[msg[i]];
            this.sendKeys_.key_down(vk);  
        }       
    }
    
    for (--i; i>=0; i--) {
        if (msg[i].length == 1) {
            this.sendKeys_.char_up(msg[i]);
            return;
        }
        
        if (msg[i] in VK_MAP) {
            vk = VK_MAP[msg[i]];
            this.sendKeys_.key_up(vk);  
        }       
    }  
}
