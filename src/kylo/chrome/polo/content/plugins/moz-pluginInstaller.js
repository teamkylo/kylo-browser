var gMissingPluginInstaller = null;

function start_missing_plugin_installer() {

function makeBundle() {
    var set = document.createElement("stringbundleset");
    var bundle = document.createElement("stringbundle");
    bundle.setAttribute("src", "chrome://polo/locale/moz/moz-browser.properties");
    
    set.appendChild(bundle);
    document.documentElement.appendChild(bundle);
    return bundle;
}

var gNavigatorBundle = makeBundle(); 

function BrowserOpenAddonsMgr(page) {
    switch (page) {
        case "plugins":
            browser_.switchOrCreate("about:addons");
            break;
			
        default:
            break;
    }
}

/**
 * Fake gBrowser
 */
var gBrowser = {
    getBrowserForDocument: function (doc) {
        return browser_.getBrowserForDocument(doc);
    },
    
    getNotificationBox: function (doc) {
        return getNotificationBox(doc);
    },
    
    getSelectedBrowser: function () {
        return browser_.getCurrentBrowser();  
    },
	
	loadOneTab: function (url) {
		return browser_.createNewBrowser(true, url).getBrowserElement();
	}
}


/**
 * Given a starting docshell and a URI to look up, find the docshell the URI
 * is loaded in. 
 * @param   aDocument
 *          A document to find instead of using just a URI - this is more specific. 
 * @param   aDocShell
 *          The doc shell to start at
 * @param   aSoughtURI
 *          The URI that we're looking for
 * @returns The doc shell that the sought URI is loaded in. Can be in 
 *          subframes.
 */
function findChildShell(aDocument, aDocShell, aSoughtURI) {
  aDocShell.QueryInterface(Components.interfaces.nsIWebNavigation);
  aDocShell.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
  var doc = aDocShell.getInterface(Components.interfaces.nsIDOMDocument);
  if ((aDocument && doc == aDocument) || 
      (aSoughtURI && aSoughtURI.spec == aDocShell.currentURI.spec))
    return aDocShell;

  var node = aDocShell.QueryInterface(Components.interfaces.nsIDocShellTreeNode);
  for (var i = 0; i < node.childCount; ++i) {
    var docShell = node.getChildAt(i);
    docShell = findChildShell(aDocument, docShell, aSoughtURI);
    if (docShell)
      return docShell;
  }
  return null;
}


/**
 * Utils.newURI is compatible w/ mozilla's makeURI
 */
var makeURI = Utils.newURI;

function missingPluginInstaller(){
}

missingPluginInstaller.prototype.installSinglePlugin = function(aEvent){
  var missingPluginsArray = {};

  var pluginInfo = getPluginInfo(aEvent.target);
  missingPluginsArray[pluginInfo.mimetype] = pluginInfo;

  if (missingPluginsArray) {
    window.openDialog("chrome://mozapps/content/plugins/pluginInstallerWizard.xul",
                      "PFSWindow", "chrome,centerscreen,resizable=yes",
                      {plugins: missingPluginsArray, browser: gBrowser.selectedBrowser});
  }

  aEvent.stopPropagation();
}

missingPluginInstaller.prototype.managePlugins = function(aEvent){
  BrowserOpenAddonsMgr("plugins");
  aEvent.stopPropagation();
}

missingPluginInstaller.prototype.newMissingPlugin = function(aEvent){
  // Since we are expecting also untrusted events, make sure
  // that the target is a plugin
  if (!(aEvent.target instanceof Components.interfaces.nsIObjectLoadingContent))
    return;

  // For broken non-object plugin tags, register a click handler so
  // that the user can click the plugin replacement to get the new
  // plugin. Object tags can, and often do, deal with that themselves,
  // so don't stomp on the page developers toes.

  if (aEvent.type != "PluginBlocklisted" &&
      aEvent.type != "PluginOutdated" &&
      !(aEvent.target instanceof HTMLObjectElement)) {
    aEvent.target.addEventListener("click",
                                   gMissingPluginInstaller.installSinglePlugin,
                                   true);
  }

  let hideBarPrefName = aEvent.type == "PluginOutdated" ?
                  "plugins.hide_infobar_for_outdated_plugin" :
                  "plugins.hide_infobar_for_missing_plugin";
  try {
    if (gPrefService.getBoolPref(hideBarPrefName))
      return;
  } catch (ex) {} // if the pref is missing, treat it as false, which shows the infobar

  var browser = gBrowser.getBrowserForDocument(aEvent.target.ownerDocument
                                                     .defaultView.top.document);
  if (!browser.missingPlugins)
    browser.missingPlugins = {};

  var pluginInfo = getPluginInfo(aEvent.target);

  browser.missingPlugins[pluginInfo.mimetype] = pluginInfo;

  var notificationBox = gBrowser.getNotificationBox(browser);

  // Should only display one of these warnings per page.
  // In order of priority, they are: outdated > missing > blocklisted

  // If there is already an outdated plugin notification then do nothing
  if (notificationBox.getNotificationWithValue("outdated-plugins"))
    return;
  var blockedNotification = notificationBox.getNotificationWithValue("blocked-plugins");
  var missingNotification = notificationBox.getNotificationWithValue("missing-plugins");
  var priority = notificationBox.PRIORITY_WARNING_MEDIUM;
  
  function showBlocklistInfo() {
    var formatter = Cc["@mozilla.org/toolkit/URLFormatterService;1"].
                    getService(Ci.nsIURLFormatter);
    var url = formatter.formatURLPref("extensions.blocklist.detailsURL");
    gBrowser.loadOneTab(url, {inBackground: false});
    return true;
  }
  
  function showOutdatedPluginsInfo() {
    gPrefService.setBoolPref("plugins.update.notifyUser", false);
    var formatter = Cc["@mozilla.org/toolkit/URLFormatterService;1"].
                    getService(Ci.nsIURLFormatter);
    var url = formatter.formatURLPref("plugins.update.url");
    gBrowser.loadOneTab(url, {inBackground: false});
    return true;
  }
  
  function showPluginsMissing() {
    // get the urls of missing plugins
    var missingPluginsArray = gBrowser.selectedBrowser.missingPlugins;
    if (missingPluginsArray) {
      window.openDialog("chrome://mozapps/content/plugins/pluginInstallerWizard.xul",
                        "PFSWindow", "chrome,centerscreen,resizable=yes",
                        {plugins: missingPluginsArray, browser: gBrowser.selectedBrowser});
    }
  }

  if (aEvent.type == "PluginBlocklisted") {
    if (blockedNotification || missingNotification)
      return;

    let iconURL = "chrome://mozapps/skin/plugins/pluginBlocked-16.png";
    let messageString = gNavigatorBundle.getString("blockedpluginsMessage.title");
    let buttons = [{
      label: gNavigatorBundle.getString("blockedpluginsMessage.infoButton.label"),
      accessKey: gNavigatorBundle.getString("blockedpluginsMessage.infoButton.accesskey"),
      popup: null,
      callback: showBlocklistInfo
    }, {
      label: gNavigatorBundle.getString("blockedpluginsMessage.searchButton.label"),
      accessKey: gNavigatorBundle.getString("blockedpluginsMessage.searchButton.accesskey"),
      popup: null,
      callback: showOutdatedPluginsInfo
    }];

    notificationBox.appendNotification(messageString, "blocked-plugins",
                                       iconURL, priority, buttons);
  }
  else if (aEvent.type == "PluginOutdated") {
    // Cancel any notification about blocklisting/missing plugins
    if (blockedNotification)
      blockedNotification.close();
    if (missingNotification)
      missingNotification.close();

    let iconURL = "chrome://mozapps/skin/plugins/pluginOutdated-16.png";
    let messageString = gNavigatorBundle.getString("outdatedpluginsMessage.title");
    let buttons = [{
      label: gNavigatorBundle.getString("outdatedpluginsMessage.updateButton.label"),
      accessKey: gNavigatorBundle.getString("outdatedpluginsMessage.updateButton.accesskey"),
      popup: null,
      callback: showOutdatedPluginsInfo
    }];

    notificationBox.appendNotification(messageString, "outdated-plugins",
                                       iconURL, priority, buttons);
  }
  else if (aEvent.type == "PluginNotFound") {
    if (missingNotification)
      return;

    // Cancel any notification about blocklisting plugins
    if (blockedNotification)
      blockedNotification.close();

    let iconURL = "chrome://mozapps/skin/plugins/pluginGeneric-16.png";
    let messageString = gNavigatorBundle.getString("missingpluginsMessage.title");
    let buttons = [{
      label: gNavigatorBundle.getString("missingpluginsMessage.button.label"),
      accessKey: gNavigatorBundle.getString("missingpluginsMessage.button.accesskey"),
      popup: null,
      callback: showPluginsMissing
    }];
  
    notificationBox.appendNotification(messageString, "missing-plugins",
                                       iconURL, priority, buttons);
  }
}

missingPluginInstaller.prototype.newDisabledPlugin = function(aEvent){
  // Since we are expecting also untrusted events, make sure
  // that the target is a plugin
  if (!(aEvent.target instanceof Components.interfaces.nsIObjectLoadingContent))
    return;

  aEvent.target.addEventListener("click",
                                 gMissingPluginInstaller.managePlugins,
                                 true);
}

missingPluginInstaller.prototype.refreshBrowser = function(aEvent) {
  // browser elements are anonymous so we can't just use target.
  var browser = aEvent.originalTarget;
  var notificationBox = gBrowser.getNotificationBox(browser);
  var notification = notificationBox.getNotificationWithValue("missing-plugins");

  // clear the plugin list, now that at least one plugin has been installed
  browser.missingPlugins = null;
  if (notification) {
    // reset UI
    notificationBox.removeNotification(notification);
  }
  // reload the browser to make the new plugin show.
  browser.reload();
}


function getPluginInfo(pluginElement)
{
  var tagMimetype;
  var pluginsPage;
  if (pluginElement instanceof HTMLAppletElement) {
    tagMimetype = "application/x-java-vm";
  } else {
    if (pluginElement instanceof HTMLObjectElement) {
      pluginsPage = pluginElement.getAttribute("codebase");
    } else {
      pluginsPage = pluginElement.getAttribute("pluginspage");
    }

    // only attempt if a pluginsPage is defined.
    if (pluginsPage) {
      var doc = pluginElement.ownerDocument;
      var docShell = findChildShell(doc, gBrowser.selectedBrowser.docShell, null);
      try {
        pluginsPage = makeURI(pluginsPage, doc.characterSet, docShell.currentURI).spec;
      } catch (ex) { 
        pluginsPage = "";
      }
    }

    tagMimetype = pluginElement.QueryInterface(Components.interfaces.nsIObjectLoadingContent)
                               .actualType;

    if (tagMimetype == "") {
      tagMimetype = pluginElement.type;
    }
  }

  return {mimetype: tagMimetype, pluginsPage: pluginsPage};
}

gMissingPluginInstaller = new missingPluginInstaller();

var browserDeck = document.getElementById("browserDeck");
browserDeck.addEventListener("PluginNotFound",      gMissingPluginInstaller.newMissingPlugin, true, true);
browserDeck.addEventListener("PluginBlocklisted",   gMissingPluginInstaller.newMissingPlugin, true, true);
browserDeck.addEventListener("PluginOutdated",      gMissingPluginInstaller.newMissingPlugin, true, true);
browserDeck.addEventListener("PluginDisabled",      gMissingPluginInstaller.newDisabledPlugin, true, true);
browserDeck.addEventListener("NewPluginInstalled",  gMissingPluginInstaller.refreshBrowser, false);

};
