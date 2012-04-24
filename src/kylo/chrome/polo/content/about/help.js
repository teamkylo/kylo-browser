/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

var chromeWin_;
    
function getChromeWin() {
    if (!chromeWin_) {
        chromeWin_ = window.QueryInterface(Ci.nsIInterfaceRequestor)
                            .getInterface(Ci.nsIWebNavigation)
                            .QueryInterface(Ci.nsIDocShellTreeItem)
                            .rootTreeItem
                            .QueryInterface(Ci.nsIInterfaceRequestor)
                            .getInterface(Ci.nsIDOMWindow); 
    }
    return chromeWin_;
}

function setCapHeight() {
	
	var tabboxHeight = document.getElementById("tabPanels").clientHeight;
	var tabHeight = document.getElementById("controlsTab").clientHeight;
	var cap = document.getElementById("tabCap");
	var tabs = document.getElementById("tabs");
	if (!cap) {
		cap = document.createElement("image");
		cap.id = "tabCap";
		tabs.appendChild(cap);
	}
	var height = tabboxHeight - (tabHeight * 3) + 10;
	cap.setAttribute("style", "min-height: "+height+"px");
	
}

function onload() {
   
    var nodes = document.querySelectorAll("[hint]");
    var a= []
    var currentNode_ = null;
    for (var i = 0; i < nodes.length; i++) {
        
        /**
         * HTML / XUL has a strange behavior related to event bubling where 
         * mousing over child elements fires a mouseout on the parent element.
         * All the extra junk below is to handle that.
         * Reference: http://www.quirksmode.org/js/events_mouse.html#mouseover
         */        
        nodes[i].addEventListener("mouseover", function (evt) {
            if (currentNode_ == evt.currentTarget) {
                return;
            }

            currentNode_ = evt.currentTarget;
            getChromeWin().Help.showHint(evt.currentTarget.getAttribute("hint"));
        }, false);
        
        nodes[i].addEventListener("mouseout", function (evt) {
            if (evt.relatedTarget) {
                var n = evt.relatedTarget;
                while (n.parentNode) {
                    if (n === currentNode_) {;
                        return;
                    }
                    n = n.parentNode;   
                }
            }
            
            currentNode_ = null;
            getChromeWin().Help.clearHint(evt.target.getAttribute("hint"));
        }, false);      
    }
	
	document.getElementById("loop-link").addEventListener("click", function() {
	   getChromeWin().browser_.loadURL(getChromeWin().gPrefService.getCharPref("polo.help.urls.pointer"));	
	}, false);
	 
	document.getElementById("pctotv-link").addEventListener("click", function() {
	   getChromeWin().browser_.loadURL(getChromeWin().gPrefService.getCharPref("polo.help.urls.pctotv"));
	}, false);
	document.getElementById("support-link").addEventListener("click", function() {
       getChromeWin().browser_.loadURL(getChromeWin().gPrefService.getCharPref("polo.help.urls.support"));
    }, false);	
}
