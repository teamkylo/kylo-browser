/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

pref("dom.disable_window_move_resize", true);
pref("layout.fullScreen", true);


pref("layout.overscan.adjustIncrement", 3);

pref("layout.overscan.max.bottom", 47);
pref("layout.overscan.max.left", 90);
pref("layout.overscan.max.right", 90);
pref("layout.overscan.max.top", 47);

pref("layout.overscan.bottom", 36);
pref("layout.overscan.left", 64);
pref("layout.overscan.right", 64);
pref("layout.overscan.top", 36);

pref("polo.bookmarks.upgrade", "-1");

pref("pagePreview.numGenerators", 3);
pref("pagePreview.dir", "previewCache");
// two weeks
pref("pagePreview.cache.dur", 1209600000);
// 10 minutes
pref("pagePreview.cache.flush.init", 600000);
// 24h
pref("pagePreview.cache.flush.repeat", 86400000);

 
// pref("controls.promptOnExit", true); in distro-prefs.js
pref("controls.autoHide", false);
pref("controls.autoHideDelay", 3000);
pref("controls.autoHideShow", 250);
pref("controls.autoHideStyle", "slide");

pref("controls.clickNHoldDelay.home", 1000);
pref("controls.clickNHoldDelay.bookmarks", 1000);
pref("controls.clickNHoldDelay.bookmarks.notificationDur", 7500);


pref("keyboard.autolaunch.zoom", true);
pref("keyboard.autolaunch.open", true);
pref("keyboard.autolaunch.focusLock", true);


pref("keyboard.tlds", "com net org");

pref("polo.linux.alert", true);

pref("polo.places.ui.enableRemoveAll", false);

pref("polo.swupdate.hash.check.enabled", true);

// controls which bits of private data to clear. by default we clear them all.
pref("privacy.sanitize.promptOnSanitize", false);
pref("privacy.item.cache", true);
pref("privacy.item.cookies", true);
pref("privacy.item.offlineApps", true);
pref("privacy.item.history", true);
pref("privacy.item.formdata", true);
pref("privacy.item.downloads", true);
pref("privacy.item.passwords", true);
pref("privacy.item.sessions", true);
pref("privacy.item.geolocation", true);
pref("privacy.item.siteSettings", true);

pref("polo.cursor.goBackOnRightClick", true);
pref("polo.showSysReq", true);
