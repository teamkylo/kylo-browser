/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

Cu["import"]("resource://httpheaderext/httpHeaderExtPrefs.jsm");

var UserAgentTab = {
    load: function () {
        var ret = HttpHeaderExtPrefs.readRules(false);
        var uas = ret[0];
        var rules = ret[1];
        var listbox = document.getElementById("user-agent-listbox");
        
        while (listbox.lastChild) {
            listbox.removeChild(listbox.lastChild);
        }
        
        var menu = document.getElementById("user-agent-list");
        var dropdownlist = document.getElementById("user-agent-popup");
        while (dropdownlist.lastChild) {
            dropdownlist.removeChild(dropdownlist.lastChild);
        }
        
        var i;
        var elems = [];
        for (i in uas) {
            var ua = uas[i];
            var e = document.createElement("menuitem");
            e.setAttribute("label", ua.name);
            e.setAttribute("value", ua.key);
            e.ua_ = ua;
            e._sortKey = ua.name.toLowerCase();
            elems[elems.length] = e;
        }
        
        elems.sort(UserAgentTab.sortComparator);        
        elems.map(dropdownlist.appendChild, dropdownlist);
        menu.selectedIndex = 0;
        
        UserAgentTab.uastrings_ = document.getElementById("uastrings");
        for (i = 0; i < rules.length; i++) {
            var rule = rules[i];
            var name = rule.cond_text;
            
            rule.editText = name;
            
            var listitem = document.createElement("richlistitem");
            listitem.className = "user-agent-listitem";

            var ruleElem = document.createElement("description");
            ruleElem.setAttribute("value", name + " - [" + rule.ua.name + "]");
            
            var spacer = document.createElement("spacer");
            spacer.setAttribute("flex", 1);
            
            var button = document.createElement("button");
            button.type_ = "delete";
            button.setAttribute("label", UserAgentTab.uastrings_.getString("useragent.deleteLabel"));

            listitem.appendChild(ruleElem);
            listitem.appendChild(spacer);
            listitem.appendChild(button);
            
            listitem.deleteBtn_ = button;
            listitem.rule_ = rule;
            
            listbox.appendChild(listitem);
        }
        
        button = document.createElement("button");
        button.type_ = "save";
        button.setAttribute("label", UserAgentTab.uastrings_.getString("useragent.saveLabel"));     
        UserAgentTab.saveBtn_ = button;  
        
        UserAgentTab.textBox_ = document.getElementById("user-agent-textbox");
        UserAgentTab.uaMenu_ = menu;
        UserAgentTab.listBox_ = listbox;
		
		UserAgentTab.addRestoreDefaultsIntegration();
    },
	
	addRestoreDefaultsIntegration: function () {
		RestoreDefaults.items.siteCompatibility = function () {
			HttpHeaderExtPrefs.restoreDefaults();
			UserAgentTab.load();
		}
	},
    
    sortComparator: function (x,y) {
        x = x._sortKey;
        y = y._sortKey;
        
        if (x > y) {
            return 1;
        }
        
        if (x == y) {
            return 0;
        }
        
        return -1;
    },
    
    chooseOpenSite: function () {
        Settings.showOpenTabChooser(
            UserAgentTab.uastrings_.getString("useragent.chooseOpenSiteTitle"),
            UserAgentTab.uastrings_.getString("useragent.chooseOpenSiteButtonLabel"),
            UserAgentTab.uastrings_.getString("useragent.cancelLabel"),       
            function (ok, item) {
                if (ok && item) {
                    var domain = item.uri.host;
                    domain = domain.replace(/^www\./, "");
                    UserAgentTab.textBox_.value = domain;
                    UserAgentTab.textBoxChanged();
                }
            }
        );
    },
    
    addSite: function () {
        var hostName = this.textBox_.value;
        hostName = hostName.replace(/^https?\:\/\//, "");
        hostName = hostName.replace(/^www\./, "");
        
        for (var i = 0, cn = this.listBox_.childNodes; i < cn.length; i++) {
            var li = cn.item(i);
            if (li.rule_.cond_text == hostName) {
				if (this.confirmEditExistingRule()) {
		            if (!HttpHeaderExtPrefs.modifyAltUAForHost(li.rule_.key, hostName, this.uaMenu_.selectedItem.ua_)) {
		                this.showBadHostName();
						return;
		            }

                    this.textBox_.value = "";
                    this.load();
				}					
                return;
            }    
        }
        
        if (!HttpHeaderExtPrefs.addAltUAForHost(hostName, this.uaMenu_.selectedItem.ua_)) {
            this.showBadHostName();
            return; 
        }
        this.textBox_.value = "";
        this.load();
    },
    
    oncommand: function (evt) {
        if (evt.target.type_ == "delete") {
            var li = evt.target.parentNode;
            HttpHeaderExtPrefs.deleteRule(li.rule_.key);
            this.load();
            return;
        }
        
        if (evt.target.type_ == "save") {
            var li = evt.target.parentNode;
            if (!HttpHeaderExtPrefs.modifyAltUAForHost(li.rule_.key, this.textBox_.value, this.uaMenu_.selectedItem.ua_)) {
                this.showBadHostName();
                return; 
            }
            this.textBox_.value = "";
            UserAgentTab.load();
            return;
        }       
    },
	
	confirmEditExistingRule: function () {
        return gPromptService.confirm(
          getChromeWin(), 
          UserAgentTab.uastrings_.getString("useragent.editUAForDomain.title"), 
          UserAgentTab.uastrings_.getString("useragent.editUAForDomain.msg")
       );
	},
    
    showBadHostName: function () {
        gPromptService.alert(
		  getChromeWin(), 
		  UserAgentTab.uastrings_.getString("useragent.invalidDomainName.title"), 
		  UserAgentTab.uastrings_.getString("useragent.invalidDomainName.msg")
	   );
    },
    
    ruleSelected: function (evt) {
        var e = this.listBox_.selectedItem;
        e.insertBefore(this.saveBtn_, e.deleteBtn_);
        this.saveBtn_.disabled = true;
        
        this.textBox_.value = e.rule_.editText;
        this.uaMenu_.value = e.rule_.ua.key;
    },
    
    uaSelected: function (evt) {
        this.updateSaveBtn();
    },
    
    textBoxChanged: function (evt) {
        this.updateSaveBtn();
    },
    
    updateSaveBtn: function () {
        if (this.listBox_ && this.listBox_.selectedItem) {
            var e = this.listBox_.selectedItem;
            var disabled = (this.textBox_.value == e.rule_.editText) && 
                           (this.uaMenu_.value == e.rule_.ua.key);
            
            this.saveBtn_.disabled = disabled;          
        }
    }
}

window.addEventListener("load", UserAgentTab.load, false);
