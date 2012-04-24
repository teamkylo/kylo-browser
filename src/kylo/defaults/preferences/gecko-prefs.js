/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

pref("toolkit.defaultChromeURI", "chrome://polo/content/polo.xul");
pref("toolkit.singletonWindowType", "poloContent");
//pref("browser.chromeURL", "chrome://polo/content/polo.xul");
pref("browser.link.open_newwindow.restriction", 0);
pref("browser.link.open_newwindow", 1);

/* cache prefs */
pref("browser.cache.memory.enable", true);

// SSL error page behaviour
pref("browser.ssl_override_behavior", 2);
pref("browser.xul.error_pages.expert_bad_cert", false);
pref("security.alternate_certificate_error_page", "certerror");

// enable xul error pages
pref("browser.xul.error_pages.enabled", true);

// Add crash protection to plugins
pref("dom.ipc.plugins.enabled", true);
pref("dom.ipc.plugins.enabled.npswf32.dll", true);
pref("dom.ipc.plugins.enabled.npctrl.dll", true);
pref("dom.ipc.plugins.enabled.npqtplugin.dll", true);
pref("dom.ipc.plugins.java.enabled", false);

// Disable HW acceleration
pref("gfx.direct2d.disabled", true);
pref("layers.acceleration.disabled", true);

/* password manager */
pref("signon.rememberSignons", true);
pref("signon.expireMasterPassword", false);
pref("signon.SignonFileName", "signons.txt");

/* autocomplete */
pref("browser.formfill.enable", true);

/* spellcheck */
pref("layout.spellcheckDefault", 1);

/// BEGIN DOWNLOAD MANAGER =================================================
// https://developer.mozilla.org/en/XULRunner_tips
// To use the unknown-content-type and file-downloads dialogs from a <browser> element, you need to add the following prefs:
pref("browser.download.useDownloadDir", true);
pref("browser.download.folderList", 1);
pref("browser.download.manager.showAlertOnComplete", true);
pref("browser.download.manager.showAlertInterval", 2000);
pref("browser.download.manager.retention", 2);
pref("browser.download.manager.showWhenStarting", true);
pref("browser.download.manager.useWindow", true);
pref("browser.download.manager.closeWhenDone", true);
pref("browser.download.manager.openDelay", 0);
pref("browser.download.manager.focusWhenStarting", false);
pref("browser.download.manager.flashCount", 2);
/// END DOWNLOAD MANAGER =================================================

//
pref("alerts.slideIncrement", 1);
pref("alerts.slideIncrementTime", 10);
pref("alerts.totalOpenTime", 4000);
pref("alerts.height", 50);


// =======================================================================
// Plugin Finder Service 
pref("pfs.datasource.url", "https://pfs.mozilla.org/plugins/PluginFinderService.php?mimetype=%PLUGIN_MIMETYPE%&appID=%APP_ID%&appVersion=%APP_VERSION%&clientOS=%CLIENT_OS%&chromeLocale=%CHROME_LOCALE%&appRelease=%APP_RELEASE%");


// BEGIN EXTENSIONS ======================================================
pref("xpinstall.dialog.confirm", "chrome://mozapps/content/xpinstall/xpinstallConfirm.xul");
pref("xpinstall.dialog.progress.skin", "chrome://mozapps/content/extensions/extensions.xul?type=themes");
pref("xpinstall.dialog.progress.chrome", "chrome://mozapps/content/extensions/extensions.xul?type=extensions");
pref("xpinstall.dialog.progress.type.skin", "Extension:Manager-themes");
pref("xpinstall.dialog.progress.type.chrome", "Extension:Manager-extensions");

// Dynamic Skin Switching
pref("extensions.dss.enabled", false);
pref("extensions.dss.switchPending", false);

pref("extensions.ignoreMTimeChanges", false);
pref("extensions.logging.enabled", false);

// URL for the "Get Add-Ons" link in the addon manager
/** Set to dummy URL to prevent errors thrown in extensions.js **/
pref("extensions.webservice.discoverURL", "http://addons.kylo.tv");

// Webservice URL to pull an add-on by ID
//pref("extensions.getAddons.get.url", "http://addons.kylo.tv");

// Webservice URL to search for addons by keyword
//pref("extensions.getAddons.search.url", "http://addons.kylo.tv");

// URL for addon search webpage - shows up as "See all XX results" link at bottom of search results
//pref("extensions.getAddons.search.browseURL", "http://addons.kylo.tv");

// Allows addon search results to cache - need it set explicitly or else it throws an error in extensions.js
pref("extensions.getAddons.cache.enabled", false);

// Webservice URL to check for updates to addons
//pref("extensions.update.url", "http://addons.kylo.tv");
pref("extensions.update.enabled", false);
pref("extensions.update.autoUpdateDefault", false);
// END EXTENSIONS ========================================================