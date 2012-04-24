/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

pref("polo.swupdate.url", "https://update.kylo.tv/swupdate?v=$version&vdr=$vendor");
pref("polo.swupdate.vendor", "kylo");

pref("controls.autoHide", false);
pref("polo.defaultZoomLevel", "1");
pref("controls.promptOnExit", true);

pref("browser.startup.homepage", "http://connect.kylo.tv/");
pref("browser.startup.firstrun", true);
pref("browser.startup.firstrun.location", "http://connect.kylo.tv/firstrun/?v=$version&vdr=$vendor");
pref("browser.startup.firstrun.upgrade", "http://connect.kylo.tv/firstrun/?v=$version&u=$previousVersion&vdr=$vendor");
pref("browser.startup.restoreTabs", false);

pref("browser.tabs.savedSession", "");

pref("polo.help.urls.pointer", "http://hillcrestlabs.com");
pref("polo.help.urls.pctotv", "http://connect.kylo.tv/pctotv");
pref("polo.help.urls.support", "http://connect.kylo.tv/support");

/* default search */
pref("polo.defaultSearchEngine", "google");

/* default skin */
pref("general.skins.selectedSkin", "classic/1.0");

/* user agent */
pref("general.useragent.compatMode.firefox", true);

/* locale */
pref("general.useragent.locale", "en-US");

/* If you provide a url here, the html content will be pulled in to the about page under the Kylo logo */
pref("about.brandingURL", "");
//pref("about.brandingURL", "http://connect.kylo.tv/about.html");

/* bookmarks */
pref("bookmarks.default.0.url", "http://connect.kylo.tv");
pref("bookmarks.default.0.title", "Kylo Directory");
pref("bookmarks.default.1.url", "http://connect.kylo.tv/blog");
pref("bookmarks.default.1.title", "Kylo Blog");
pref("bookmarks.default.2.url", "http://connect.kylo.tv/pctotv");
pref("bookmarks.default.2.title", "Connect your computer to your TV");
pref("bookmarks.default.3.url", "http://connect.kylo.tv/feedback");
pref("bookmarks.default.3.title", "User Feedback");
pref("bookmarks.localBookmarksAdded", false);
