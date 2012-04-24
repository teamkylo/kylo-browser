/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Alerts Service.
 *
 * The Initial Developer of the Original Code is Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Mark Finkle <mfinkle@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

// -----------------------------------------------------------------------
// Download Manager UI
// -----------------------------------------------------------------------

function DownloadManagerUI() { }

DownloadManagerUI.prototype = {
    classDescription: "Download Manager UI",
    contractID: "@mozilla.org/download-manager-ui;1",
    classID: Components.ID("{a3a63df5-c019-11de-8a39-0800200c9a66}"),
  
    show: function show(aWindowContext, aID, aReason) {
        if (!aReason)
            aReason = Ci.nsIDownloadManagerUI.REASON_USER_INTERACTED;

        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        let browser = wm.getMostRecentWindow("poloContent");
        if (browser) {
            browser.Downloads.show();
        }
    },

    get visible() {
        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        let browser = wm.getMostRecentWindow("navigator:browser");

        if (browser) {
            return browser.Downloads.isVisible();
        }
        return false;
    },

    getAttention: function getAttention() {
        this.show(null, null, null);
    },
    
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIDownloadManagerUI])
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([DownloadManagerUI]);