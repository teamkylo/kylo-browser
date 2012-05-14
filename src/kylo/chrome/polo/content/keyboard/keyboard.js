/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

//Utility function to get the document of the current browser.
function getMarkupDocumentViewer() {
	var navigator1 = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
	var docShell = navigator1.QueryInterface(Ci.nsIDocShell);
	var docviewer = docShell.contentViewer.QueryInterface(Ci.nsIMarkupDocumentViewer);
	var doc = browser_.getCurrentBrowser().markupDocumentViewer;
	return doc;	
}

//Global variable for the keyboard overlay panel 
var gKeyboardOverlay;

//Global variable for the class responsible for auto launching the keyboard
//(usu. when an editable node is clicked)
var gKeyboardAutoLauncher;

//Global variable for the search/autocomplete module.
var searchAutoComplete;

/**
 * Processes key events and generates key strokes.
 * @class Keyboard
 * @author <a href="mailto:kzubair@hcrest.com">Khalid Zubair</a>
 * @param url The XUL box containing the url entry keyboard
 * @param embed The XUL box containing the standard keyboard
 * @param keyStrokeGenerator The interface to the XPCOM keystroke generator component
 */
function Keyboard(url, embed, keyStrokeGenerator) {
	this.keyStrokeGenerator_ = keyStrokeGenerator;
	
    function get(clazz) {
        return Array.slice(url.getElementsByClassName(clazz), 0).concat(Array.slice(embed.getElementsByClassName(clazz), 0)); 
    }
	
	this.keys_ = get("kb-input"), 0;
	var A, f;

	A = this.keys_;
	f = this.inputEvent.bind(this);
	for (var i = 0; i < A.length; i++) {
		A[i].addEventListener("mousedown", f, false); 
	}	
	
	A = get("kb-fixed-input");
	f = this.inputEvent2.bind(this);
	for (var i = 0; i < A.length; i++) {
		A[i].addEventListener("mousedown", f, false);
	}
	
    A = get("kb-fixed-input-repeat");
    f = this.inputEvent3.bind(this);
    for (var i = 0; i < A.length; i++) {
        A[i].addEventListener("command", f, false);
		A[i].addEventListener("mouseup", f, false);
    } 
	
	this.buttonRepeatState_ = "off";  
	this.buttonRepeatTimeout_ = null;    			
	
	this.controlBtns_ = {};
	A = get("kb-control");
	f = this.controlEvent.bind(this);
	for (var i = 0; i < A.length; i++) {
		var b = A[i];
		b.addEventListener("mouseup", f, false);
		this.controlBtns_[b.id] = b;
	}
	
	this.keySets_ = Keyboard.KEY_SETS;
	this.states_ = Keyboard.STANDARD_STATES;
	this.transitions_ = Keyboard.STANDARD_KEYSET_TRANSITIONS;
	
	this.setKeySet("LOWER");
	this.state_ = "sLOWER";
	
	this.tlds_ = gPrefService.getBranch("keyboard.").getCharPref("tlds").split(/\s+/).map(function (domain) { return "." + domain} );
}

/**
 * Sets the keys displayed in the keyboard to the set passed in.
 * @name setKeySet
 * @param {String} keySetId The id of the set to switch to.
 */
Keyboard.prototype.setKeySet = function(keySetId) {
	var keySet = Keyboard.KEY_SETS[keySetId];
	for (var i = 0; i < this.keys_.length; i++) {
		this.keys_[i].label = keySet[i]; 
	}
	this.keySetId_ = keySetId; 
}

/**
 * Event listener for the alpha keys (a-z).  Sends the value
 * of the character to the keystroke generator component.
 * @name inputEvent
 * @param {Object} evt The keypress event
 */
Keyboard.prototype.inputEvent = function (evt) {
	var val = evt.currentTarget.label;	
	this.keyStrokeGenerator_.generate(val);
	
    if (!isNaN(parseInt(val))) {
        // Numbers get handled in a special case - don't change state
        return;
    }	
	
	this.transition("KEY");
}

/**
 * Event listener for the fixed input keys (bksp, /, ., etc).  Sends the value
 * of the character to the keystroke generator component.
 * @name inputEvent2
 * @param {Object} evt The keypress event
 */
Keyboard.prototype.inputEvent2 = function (evt) {
	var val = evt.currentTarget.getAttribute("keyseq");
	this.keyStrokeGenerator_.generate(val);
	this.transition("KEY");
}

/**
 * Event listener for the backspace button that can be held down
 * to repeat the backspace action.  Sets repeat state and calls
 * inputEvent2 to send the keypress to the generator component.
 * @name inputEvent3
 * @param {Object} evt The keypress event
 */
Keyboard.prototype.inputEvent3 = function(evt){
	if (evt.type == "command") {
		if (this.buttonRepeatState_ == "off") {
			this.buttonRepeatState_ = "press";	    
			this.inputEvent2(evt);
			this.buttonRepeatTimeout_ = window.setTimeout(function () {
				if (this.buttonRepeatState_ == "press") {
				    this.buttonRepeatState_ = "hold";
				}
			}.bind(this), 1000);
		}
		if (this.buttonRepeatState_ == "hold") {
			this.inputEvent2(evt);
		}
		return;
	}
	
	if (evt.type == "mouseup") {
		this.buttonRepeatState_ = "off";
		window.clearTimeout(this.buttonRepeatTimeout_);
	}
}

/**
 * Event hanlder for all of the keys that control the keyboard ui.
 * E.g. caps lock, special characters, tld switcher, etc.  Transitions
 * the keyboard to the correct set of keys based on the button pressed.
 * @name controlEvent
 * @param {Object} evt The keypress event
 */
Keyboard.prototype.controlEvent = function (evt) {
	switch (evt.currentTarget.id) {
		case "kb-caps":
			this.transition("CAPS");
			break;

		case "kb-shift":
			this.transition("SHIFT");
			break;

		case "kb-punct":
			this.transition("PUNCT");
			break;

		case "kb-intl":
			this.transition("INTL");
			break;

        case "kb-abc":
            this.transition("ABC");
            break;
			
		case "kb-.com":
            var b = evt.currentTarget;
            
            if (b.prevSeq) {
                for (var i = 0; i < b.prevSeq.length; i++) {
                    this.keyStrokeGenerator_.generate("BKSP");
                }
                window.clearTimeout(b.timeout);
            }
            
            var seq = b.seq || ".com";
            for (var i = 0; i < seq.length; i++) {
            	this.keyStrokeGenerator_.generate(seq[i]);
            }
            
            b.prevSeq = seq;
            b.timeout = window.setTimeout(function () {
                b["label"] = ".com";
                b.seq = null;
                b.timeout = null;
                b.prevSeq = null; 
                b.className = b.className.replace("kb-key-large-special", "kb-key-large");
            }, 3000);
            
            var A = this.tlds_;           
            b.seq = A[(A.indexOf(seq) + 1 + A.length) % A.length];
            b["label"] = b.seq;
            if (b.className.indexOf("kb-key-large-special") == -1) {
                b.className = b.className.replace("kb-key-large", "kb-key-large-special");
            }
			break;			
						
		default:
			return;
	}
}

/**
 * Transitions the keyboard to the new keyset and state based on a 
 * control button that was clicked.
 * @name transition
 * @param {String} keyType The keyset to show on the keyboard UI.
 */
Keyboard.prototype.transition = function (keyType) {
	var transitions = this.transitions_[this.state_];
	var newState = transitions[keyType];

	if (this.state_ == newState) {
		return;
	}
	
	var stateInfo = this.states_[newState];
	
	let [keyset, selected, hidden] = stateInfo;
	
	for (id in this.controlBtns_) {
	    this.controlBtns_[id].setAttribute("selected", selected.indexOf(id) != -1);
	    this.controlBtns_[id].hidden = hidden.indexOf(id) != -1;
	}
	
	this.setKeySet(keyset);
    	
	this.state_ = newState;
}

/**
 * Map of the sets of keys for display on the keyboard UI.
 */
Keyboard.KEY_SETS = {
	LOWER: 			"qwertyuiopasdfghjklzxcvbnm",
	UPPER: 			"QWERTYUIOPASDFGHJKLZXCVBNM",
	INTL_LOWER: 	"àáâãäåçèéêëìíîïñòóôøšùúüýž",
	INTL_UPPER: 	"ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔØŠÙÚÜÝŽ",
	PUNCT: 			"1234567890&?!;,'\"#$%_-+*()",
	PUNCT2:         "1234567890€£¥<>{}[]~=\\^|¡¿",
}

/**
 * Map of the states the keyboard could have, and the associated CSS classes
 * for the selected and hiden button states.
 */
Keyboard.STANDARD_STATES = {
				 // [keyset, selected, hidden]
	sLOWER: 		["LOWER", [], ["kb-intl","kb-abc"]],
	sUPPER: 	 	["UPPER", ["kb-shift"], ["kb-intl", "kb-abc"]],
	sUPPER_S: 		["UPPER", ["kb-caps"], ["kb-intl", "kb-abc"]],
	sPUNCT: 	 	["PUNCT", [], ["kb-punct","kb-abc"]],
	sPUNCT_S: 	 	["PUNCT2", ["kb-shift"], ["kb-punct","kb-abc"]],
	sINTL_LOWER: 	["INTL_LOWER", [], ["kb-punct","kb-intl"]],
	sINTL_UPPER: 	["INTL_UPPER", ["kb-shift"], ["kb-punct","kb-intl"]],
	sINTL_UPPER_S:	["INTL_UPPER", ["kb-shift"], ["kb-punct","kb-intl"]],
}

/**
 * Table to lookup keyset on button presses.  The "rows" correspond to
 * the current state and the "columns" correspond to actions.  The "key"
 * action is triggered for every "input" type key press.
 * TRANSITIONS[currentKeyset][event] => newKeyset
 */
Keyboard.STANDARD_KEYSET_TRANSITIONS = {
    sLOWER: {
    	CAPS: 	"sUPPER_S",
    	SHIFT: 	"sUPPER",      	
    	INTL: 	"sINTL_LOWER", 
    	PUNCT:	"sPUNCT", 
    	ABC:    "sLOWER",
    	KEY: 	"sLOWER"
    },
    sUPPER: {
    	CAPS: 	"sUPPER_S",
    	SHIFT: 	"sLOWER",      	
    	INTL: 	"sINTL_UPPER", 
    	PUNCT:	"sPUNCT", 
    	ABC:    "sLOWER",
    	KEY: 	"sLOWER"
    },
    sUPPER_S: {
    	CAPS: 	"sLOWER",
    	SHIFT: 	"sLOWER",      	
    	INTL: 	"sINTL_UPPER_S", 
    	PUNCT:	"sPUNCT", 
    	ABC:    "sLOWER",
    	KEY: 	"sUPPER_S"
    },
    sPUNCT: {
    	CAPS: 	"sPUNCT_S",
    	SHIFT: 	"sPUNCT_S",      	
    	INTL: 	"sINTL_LOWER", 
    	PUNCT:	"sLOWER", 
    	ABC:    "sLOWER",
		KEY:    "sLOWER"
    },
    sPUNCT_S: {
    	CAPS: 	"sPUNCT",
    	SHIFT: 	"sPUNCT",      	
    	INTL: 	"sINTL_UPPER_S", 
    	PUNCT:	"sLOWER", 
    	ABC:    "sUPPER",
		KEY:    "sLOWER"
    },
    
    sINTL_LOWER: {
    	CAPS: 	"sINTL_UPPER_S",
    	SHIFT: 	"sINTL_UPPER",      	
    	INTL: 	"sLOWER", 
    	PUNCT:	"sPUNCT", 
    	ABC:    "sLOWER",
    	KEY: 	"sLOWER"
    },
    sINTL_UPPER: {
    	CAPS: 	"sINTL_UPPER_S",
    	SHIFT: 	"sINTL_LOWER",      	
    	INTL: 	"sLOWER", 
    	PUNCT:	"sPUNCT", 
    	ABC:    "sUPPER",
    	KEY: 	"sLOWER"
    },
    sINTL_UPPER_S: {
    	CAPS: 	"sINTL_LOWER",
    	SHIFT: 	"sINTL_LOWER",      	
    	INTL: 	"sLOWER", 
    	PUNCT:	"sPUNCT", 
    	ABC:    "sUPPER",
    	KEY: 	"sINTL_UPPER_S"
    },    
}

/**
 * Positions and shows the keyboard panel.
 * @class KeyboardOverlay
 * @author <a href="mailto:kzubair@hcrest.com">Khalid Zubair</a>
 * @param url The XUL box containing the url entry keyboard
 * @param embed The XUL box containing the standard keyboard
 * @param keyStrokeGenerator The interface to the XPCOM keystroke generator component
 */ 
function KeyboardOverlay(url, embed, keyboard) {
	this.keyboard_ = keyboard;
	
	this.embedUrlGroup_ = url;
	this.embedGroup_ = embed;
	
	this.mainKeys_ = document.getElementById("kb-movable");
	
	this.textInputRow_ = document.getElementById("kb-textInputRow");
	this.urlInputRow_ = document.getElementById("kb-urlInputRow");	
	
	this.urlEntryField_ = document.getElementById("kb-urlInput");
	this.urlEntryField_.addEventListener("click", this.setURLText.bind(this), false); 
    this.embedContainer_ = document.getElementById("kb-embed");
    this.embedInsertionPoint_ = document.getElementById("kb-action-pad").previousSibling;
    this.urlSideBox_ = document.getElementById("kb-url-sidebox");
	
	this.anchorBottom_ = document.getElementById("anchor-bottom");
	
	document.addEventListener("keydown", function (evt) {
            if (evt.keyCode == KeyEvent.DOM_VK_TAB) {
                gKeyboardAutoLauncher.releaseFocusLock();
            }
        }, false);
		
	this.urlEntryField_.addEventListener("keyup", function (evt) {
			if (typeof(videoSearch) == "undefined") return;
			videoSearch.keyboardTextChanged(gKeyboardOverlay.urlEntryField_.value);
        }, false);
	this.mode_ = "HIDDEN";
	
	this.actionButtons_ = {};
	var A = Array.slice(this.embedUrlGroup_.getElementsByClassName("kb-actions"), 0).concat(Array.slice(embed.getElementsByClassName("kb-actions"), 0)); 
	for (var i = 0; i < A.length; i++) {
	    var e = A[i];
		e.addEventListener("command", this, false);
		this.actionButtons_[e.getAttribute("action")] = e;
	}
	
	document.getElementById("kb-embed-url-top").addEventListener("click", this, false);
	
}

/**
 * Sets the text inside the url entry field to the current url when you click the
 * field so you can edit the current url you are viewing.
 * @name setURLText
 * @param {Object} evt The click event.
 */
KeyboardOverlay.prototype.setURLText = function (evt) {
	if (this.urlEntryField_.value ==  i18nStrings_["browser"].getString("browser.defaultURLText")) {
		this.urlEntryField_.value = browser_.getCurrentBrowser().contentWindow.location;
		this.urlEntryField_.select();
	}
}

/**
 * Returns the string representing the type of keyboard 
 * that is being displayed.
 * @name getKeyboardInfo
 * @returns {String} The type of keyboard being displayed
 */
KeyboardOverlay.prototype.getKeyboardInfo = function () {
	return this.type_;
}

/**
 * Inserts the set of keys to the appropriate place in the regular embedded keyboard.
 * @name configureEmbedded 
 */
KeyboardOverlay.prototype.configureEmbedded = function () {
	this.embedContainer_.insertBefore(this.mainKeys_, this.embedInsertionPoint_);
}

/**
 * Inserts the set of keys to the appropriate place in the url entry keyboard.
 * @name configureEmbedUrl
 */
KeyboardOverlay.prototype.configureEmbedUrl = function (layout) {
	document.getElementById("kb-keyboard-container").appendChild(this.mainKeys_);
}

/**
 * Opens or closes the keyboard depending on the current state.
 * @name toggleKeyboard
 */
KeyboardOverlay.prototype.toggleKeyboard = function () {
    if (this.mode_ == "EMBEDDED") {
        this.close();
    } else {
        this.open("EMBEDDED");
    }
}

/**
 * Opens the keyboard in the configuration of the given type.  
 * @name open
 * @param {String} type The type of keyboard to open (URL or SEARCH)
 * @param {Function} cb Callback function to be called when keyboard finishes opening
 * @param {String} initialValue The text to be shown in the url bar when the keyboard
 * first opens
 * @param {Bool} selected True if the text is to be selected upon opening, false otherwise.
 */
KeyboardOverlay.prototype.open = function (type, cb, initialValue, selected) {
	this.type_ = type;

	if (type === "URL_EMBED" || type === "SEARCH_EMBED") {
        if (this.mode_ == "EMBEDDED") {
            this.closeEmbed(false);
        }

		this.configureEmbedUrl(type);
		this.openEmbedUrl(type);
		if (type === "URL_EMBED") {
			this.urlEntryField_.value = i18nStrings_["browser"].getString("browser.defaultURLText");
			this.urlEntryField_.select();
            this.urlEntryField_.showHistoryPopup();						
		} else {
            //nothing
		}
		this.callback_ = cb;
		return;
	} else if (type != "EMBEDDED") {
	    throw "Unexpected: " + type; 
	}
	
	if (this.mode_ == "EMBEDDED") {
	    return;
	} else if (this.mode_ == "PANEL") {
	    this.closePanel();
	}
	this.configureEmbedded();   	
	this.openEmbed();
}

/**
 * Opens the embedded configuration of the keyboard.
 * @name openEmbed
 */
KeyboardOverlay.prototype.openEmbed = function () {
    this.mode_ = "EMBEDDED";
    this.embedContainer_.hidden = false;
}

/**
 * Opens the url configuration of the keyboard.
 * @name openEmbedUrl
 * @param {String} type, the type of keyboard being opened
 */
KeyboardOverlay.prototype.openEmbedUrl = function (type) {
    this.mode_ = type;
    this.embedUrlGroup_.hidden = false;
}

/**
 * Closes the url configuration of the keyboard.
 * @name closeEmbedUrl
 * @param {String} type The type of the keyboard to close.
 */
KeyboardOverlay.prototype.closeEmbedUrl = function (type) {
    this.mode_ = "HIDDEN";
    this.embedUrlGroup_.hidden = true;
	
	if (this.callback_) {
		this.callback_(null);
		this.callback_ = null;
	}
	controls_.notifyPanelClosed("keyboard_"+type);
    gKeyboardAutoLauncher.releaseFocusLock();
	if (typeof(videoSearch) == "undefined") return;
	videoSearch.clearSearch();
}

/**
 * Closes the embed configuration of the keyboard.
 * @name closeEmbed
 */
KeyboardOverlay.prototype.closeEmbed = function (animate) {
    this.mode_ = "HIDDEN";
    this.embedContainer_.hidden = true;
    
	controls_.notifyPanelClosed("keyboard");
    gKeyboardAutoLauncher.releaseFocusLock();
}

/**
 * Event handler for the enter button, handles executing a search if the text in the
 * url field is not a url, also closes the kebyoard after executing.
 * @name submit
 */
KeyboardOverlay.prototype.submit = function () {
	if (this.urlEntryField_.value.indexOf(" ") >= 0 &&
	    this.urlEntryField_.value.indexOf("://") == -1) {
		// TODO Total hack - handling hitting "enter" on search keyboard from physical keyboard
		var searchTerms = encodeURIComponent(this.urlEntryField_.value);
		var engine = gPrefService.getCharPref("polo.defaultSearchEngine");
		switch (engine) {
			case "google":
				this.sendurl("http://www.google.com/search?q="+searchTerms);
				break;
			case "bing":
			   	this.sendurl("http://www.bing.com/search?q="+searchTerms);	
				break;
			case "yahoo":
				this.sendurl("http://www.search.yahoo.com/search?p="+searchTerms);
				break;
			case "ask":
				this.sendurl("http://www.ask.com/web?q="+searchTerms);
				break;
			case "truveo":
				this.sendurl("http://www.truveo.com/search?query="+searchTerms);
				break;
		}
		return;
	}
	if (this.callback_) {
		var cb = this.callback_;
		this.callback_ = null;
		var v;
		if (this.type_ == "URL_EMBED") {
			v = this.urlEntryField_.value;
		}
		this.close();
		cb(v);
	} else {
		this.close();	
	}
}

/**
 * Closes the keyboard and restores the zoom level since the content
 * will zoom to the input area when you click on it.
 * @name close
 */
KeyboardOverlay.prototype.close = function () {    
	if (this.mode_ == "HIDDEN") {
		return;
	}
    if (this.mode_ == "EMBEDDED") {
        this.closeEmbed();           
    } else if (this.mode_ == "URL_EMBED") {
		this.closeEmbedUrl("url");
	} else if (this.mode_ == "SEARCH_EMBED") {
		this.closeEmbedUrl("search");
	}
    
    gKeyboardAutoLauncher.zoomOut();
}

/**
 * Clears the currently selected text field.  
 * @name clear
 */
KeyboardOverlay.prototype.clear = function () {
	var elem = document.commandDispatcher.focusedElement;
	var type = elem && elem.type && elem.type.toLowerCase();
	if (KeyboardAutoLauncher.isEditableNode(elem)) {
		elem.value = "";
	}	
}

/**
 * Cycles through the input elements on a given page
 * @name cycleInputElement
 * @param {Object} elem The current focused element
 * @param {Object} delta how many inputs to move across
 */
KeyboardOverlay.prototype.cycleInputElement = function (elem, delta) {
    var inputs = elem.ownerDocument.querySelectorAll(KeyboardAutoLauncher.editableNodeSelector);
    for (var i = 0; i < inputs.length; i++) {
        var e = inputs.item(i);        
        if (e === elem) {            
            i = (i + delta + inputs.length) % inputs.length;
        	gKeyboardAutoLauncher.changeFocus(inputs[i]);
            return;  
        }                
    }
} 

/**
 * Sends the url in the url keyboard to the callback registered.  Opens
 * the url in the current browser.
 * @name sendurl
 * @param {String} url The url eneterd in the keyboard text field.
 */
KeyboardOverlay.prototype.sendurl = function (url) {
    url = url.replace(/\{([^\}]*)\}/g, 
        function ($0,$1) {
            var el = document.getElementById($1);
            if (el) {
                return encodeURIComponent(el.value);
            } else {
                return "";
            }            
        });
        
    if (this.callback_) {
        var cb = this.callback_;
        this.callback_ = null;
        this.close();
        cb(url);
    } else {
        this.close(); 
    }
}

/**
 * Event handler for the action buttons on the keyboard (submit, close, tab, etc).
 * Parses the button pressed and calls the correct funtion.
 * @name handleEvent
 * @param {Object} evt The command event when the button is pressed
 */
KeyboardOverlay.prototype.handleEvent = function (evt) {
	switch (evt.currentTarget.getAttribute("action")) {
		case "submit":
			this.submit();
			break;
			
		case "sendurl":
		    var url = evt.currentTarget.getAttribute("urlformat");
		    this.sendurl(url);
		    break;
			
		case "close":
			this.close();
			break;
			
		case "clear":
			this.clear();
			break;
			
		case "tab":
            gKeyboardAutoLauncher.releaseFocusLock();
            this.keyboard_.keyStrokeGenerator_.generate("TAB");
            window.setTimeout(function () {
                gKeyboardAutoLauncher.lockFocus(document.commandDispatcher.focusedElement);                
            }, 0);
		    break;
		      
        case "shift_tab":
            gKeyboardAutoLauncher.releaseFocusLock();
            this.keyboard_.keyStrokeGenerator_.generateCombo(["SHIFT","TAB"]);
            window.setTimeout(function () {
                gKeyboardAutoLauncher.lockFocus(document.commandDispatcher.focusedElement);                
            }, 0);
            break;				
			
		default:
            debug('Unknown Action: ' + (evt.currentTarget.getAttribute("action")));
			return;
	}
}	

/**
 * Hooks into system events to decide when to launch the keyboard.
 * @class KeyboardAutoLauncher
 * @author <a href="mailto:kzubair@hcrest.com">Khalid Zubair</a> 
 */
function KeyboardAutoLauncher() {
	gObserverService.addObserver(this, "Browser:DocumentLoadStarted", false);
	this.registerPrefListener();
}

/**
 * Listener for pref service changes.  Listens for keyboard related settings changes
 * and sets variables accordingly.
 * @name registerPrefListener
 */
KeyboardAutoLauncher.prototype.registerPrefListener = function () {
    this.prefs_ = gPrefService.getBranch("keyboard.autolaunch.");
    this.zoom_ = this.prefs_.getBoolPref("zoom");		
	this.open_ = this.prefs_.getBoolPref("open");
	this.focusLock_ = this.prefs_.getBoolPref("focusLock");
	
    this.prefs_.QueryInterface(Ci.nsIPrefBranch2);
    this.prefs_.addObserver("", {
            observe: function(subject, topic, pref)  {
                if (topic != "nsPref:changed") {
                    return;
                }
                
				switch (pref) {
					case "zoom":
					case "open":
					case "focusLock":
					   this[pref + "_"] = this.prefs_.getBoolPref(pref);
					   break;
				}
            }.bind(this)
		}, false);					
}

/**
 * Listens for browser load events and closes the keyboard when a load 
 * occurs.
 * @name observe
 * @param {String} subject pref branch
 * @param {String} topic Name of the event
 * @param {String} data The body of the event.
 */
KeyboardAutoLauncher.prototype.observe= function(subject, topic, data) {
    if (topic != "Browser:DocumentLoadStarted") {
        throw "Unexpected topic: " + topic;
    }
    
    gKeyboardOverlay.close();
};

/**
 * Zooms the content in when an editable node is clicked, given the setting
 * to auto-zoom is set to true.  
 * @name handle
 * @param {Object} elem The element clicked on.
 */
KeyboardAutoLauncher.prototype.handle = function (elem) {
    if (KeyboardAutoLauncher.isEditableNode(elem)) {
        this.open_ && controls_.openPanel("keyboard");
        this.focusLock_ && this.lockFocus(elem);
		  
        if (this.zoom_ && (window.content.location + "").indexOf("about:") != 0) {
			this.zoomNode(elem);
		}
		return true;
    }
    
    this.zoomOut();
    
    return false;
}

/**
 * Zooms in on the currently focused element in the document.
 * @name zoomFucussed
 */
KeyboardAutoLauncher.prototype.zoomFocussed = function () {
	this.zoomNode(document.commandDispatcher.focusedElement);
}

/**
 * Handles changes in focus for input elements, releases focus lock
 * and then changes focus to the next element.
 * @name changeFocus
 * @param {Object} elem The element currently focused.
 */
KeyboardAutoLauncher.prototype.changeFocus = function (elem) {
    if (this.focussedElem_) {
        this.releaseFocusLock();
    }
    this.lockFocus(elem);
    elem.focus();
}

/**
 * Locks focus on the currently selected input element.  This is due 
 * to flash objects sometimes stealing focus from text fields, which makes
 * the keyboard impossible to use in some circumstances.
 * @param {Object} element The currently focused element.
 */
KeyboardAutoLauncher.prototype.lockFocus = function (element) {
    if (this.focussedElem_) {
        this.releaseFocusLock();
    }
    var self = this;
    this.focussedElem_ = element;
    this.focussedElemRefocusListener_ = function (evt) {
        self.refocusTimeOut_ = window.setTimeout(function () {
            self.refocusTimeOut_ = null;
            element.focus();
          
        }, 250); // TODO timer value
    }
    
    element.addEventListener("blur", this.focussedElemRefocusListener_, false);
}

/**
 * Releases the focus lock on the currently selected input element. 
 * Usually done when the keyboard is closed or when input fields change.
 * @name releaseFocusLock
 */
KeyboardAutoLauncher.prototype.releaseFocusLock = function () {
    if (!this.focussedElem_) {
        return;
    }

    this.focussedElem_.removeEventListener("blur", this.focussedElemRefocusListener_, false);
    this.refocusTimeOut_ && window.clearTimeout(this.refocusTimeOut_);
    this.refocusTimeOut_ = null;
   
    this.focussedElem_ = null;
    this.focussedElemRefocusListener_ = null;
}

/**
 * Tests the given element to determine if the node is an HTML input node
 * (can be typed in).  
 * @name isEditableNode.
 * @param {Object} elem The element clicked on.
 * @returns {Bool} true if node is editable, false otherwise.
 */
KeyboardAutoLauncher.isEditableNode = function (elem) {
    
    if (!elem) {
        return false;
    }

    if (elem.namespaceURI == null || elem.namespaceURI == NS.html) {
        var type;
        return (elem.nodeName == "TEXTAREA") ||
               (elem.nodeName == "INPUT" && 
                        (type = (elem.type && elem.type.toLowerCase())) &&
                        (type == "text" || type =="search" || type =="password"));        
    }
    
    if (elem.namespaceURI == NS.xul) {
		switch (elem.localName) {
			case "textbox":
			case "textarea":
                return true;
				
			case "setting":
			    switch (elem.getAttribute("type")) {
					case "string":
					case "integer":
				        return true;
				}
		}
    }
    
    return false;
}

/**
 * List of editable nodes.
 */
KeyboardAutoLauncher.editableNodeSelector = "input:not([type]), input[type='text'], input[type='password'], input[type='search'], textarea";

/**
 * Calculates where the page should be zoomed in to when you 
 * click an editable node and the keyboard is shown.  Sets the 
 * zoom level and scrolls to the appropraite position.
 * @name zoomNode
 * @param {Object} aNode The node to zoom to.
 */
KeyboardAutoLauncher.prototype.zoomNode = function (aNode)  {
	
	// what's the viewport like ?
    var viewportWidth = gLayoutManager.getInnerWidth();
    var viewportHeight = gLayoutManager.getInnerHeight();

//    var targetForWidth = tweakTargetForWidth(aNode);
    var targetForWidth = aNode;
    // retrieve the size of the element
    var w = targetForWidth.clientWidth + 16; // don't forget the scrollbars
    // compute the zoom factor we need to make it fit the best
    // into the viewport
    
    var ratio = viewportWidth / w;
    var maxRatio = 1.5;
    
    var docViewer = getMarkupDocumentViewer();
    
    var ratio = (maxRatio > 0) ? Math.min(maxRatio, ratio) : ratio;
    // apply zoom factor
    docViewer.fullZoom = ratio;
    // compute the element's position
    var position = this.getElementPosition(aNode);
    
    var offset = (viewportWidth - aNode.clientWidth * ratio) / (ratio * 2);
    if (offset > 0) {
	    position.x -= offset;    	
    }
    position.y -= aNode.clientHeight * 1.5;
    
    // warning, do we need to tweak a bit  
    // scroll to that position
    window.content.scrollTo(position.x, position.y);
    
    // save a ref to the zoomed node
    this.zoomedElem_ = aNode;
}

/**
 * Zoom out of editable node
 * @name zoomOut
 */
KeyboardAutoLauncher.prototype.zoomOut = function () {
    // restore zoom level of browser
    if (this.zoomedElem_) {
        controls_.restorePanZoomLevel();
        this.zoomedElem_ = null;
    }
}

/**
 * Returns the x and y postition of a given element.
 * @name getElementPosition
 * @param {Object} aElement Element to get the position of.
 * @returns {Object} object containing the x and y positoin of the element.
 */
KeyboardAutoLauncher.prototype.getElementPosition = function (aElement) {
    var x = 0, y = 0;
    var target = aElement;
    while (target) {
      x += target.offsetLeft;
      y += target.offsetTop;
      target = target.offsetParent;
    }
    return {x: x, y:y};	
}

/**
 * Initiates KeyboardOverlay and KeyboardAutoLauncher, called on app startup.
 * @name start_keyboard
 */
function start_keyboard() {
	try {
		var url = document.getElementById("kb-embed-url");
		var embed = document.getElementById("kb-embed");
		gKeyboardOverlay = new KeyboardOverlay(url, embed, new Keyboard(url, embed, new KeyStrokeGeneratorWin32()));
		gKeyboardAutoLauncher = new KeyboardAutoLauncher();
	} catch (ex) {
		debug(ex);
	}
}
