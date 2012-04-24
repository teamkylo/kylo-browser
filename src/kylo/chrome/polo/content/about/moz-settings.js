

var MozSettingsUtils = {
  /**
   * Displays a file picker in which the user can choose the location where
   * downloads are automatically saved, updating preferences and UI in
   * response to the choice, if one is made.
   */
  chooseFolder: function (folderListPref, currentDirPref, defDownloads)
  {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    const nsILocalFile = Components.interfaces.nsILocalFile;

    var fp = Components.classes["@mozilla.org/filepicker;1"]
                       .createInstance(nsIFilePicker);

    var title = "Chose Download Folder Location";

    fp.init(window, title, nsIFilePicker.modeGetFolder);
    fp.appendFilters(nsIFilePicker.filterAll);

    // First try to open what's currently configured
    if (currentDirPref && currentDirPref.exists()) {
      fp.displayDirectory = currentDirPref;
    } // Try the system's download dir
    else if (defDownloads && defDownloads.exists()) {
      fp.displayDirectory = defDownloads;
    } // Fall back to Desktop
    else {
      fp.displayDirectory = this._indexToFolder(0);
    }

    if (fp.show() == nsIFilePicker.returnOK) {
      return fp.file.QueryInterface(nsILocalFile);
    }
  },

  /**
   * Returns the textual path of a folder in readable form.
   */
  _getDisplayNameOfFile: function (aFolder)
  {
    // TODO: would like to add support for 'Downloads on Macintosh HD'
    //       for OS X users.
    return aFolder ? aFolder.path : "";
  },

  /**
   * Returns the Downloads folder.  If aFolder is "Desktop", then the Downloads
   * folder returned is the desktop folder; otherwise, it is a folder whose name
   * indicates that it is a download folder and whose path is as determined by
   * the XPCOM directory service via the download manager's attribute 
   * defaultDownloadsDirectory.
   *
   * @throws if aFolder is not "Desktop" or "Downloads"
   */
  _getDownloadsFolder: function (aFolder)
  {
    switch(aFolder)
    {
      case "Desktop":
        var fileLoc = Components.classes["@mozilla.org/file/directory_service;1"]
                                    .getService(Components.interfaces.nsIProperties);
        return fileLoc.get("Desk", Components.interfaces.nsILocalFile);
      break;
      case "Downloads":
        var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
                                .getService(Components.interfaces.nsIDownloadManager);
        return dnldMgr.defaultDownloadsDirectory;
      break;
    }
    throw "ASSERTION FAILED: folder type should be 'Desktop' or 'Downloads'";
  },

  /**
   * Determines the type of the given folder.
   *
   * @param   aFolder
   *          the folder whose type is to be determined
   * @returns integer
   *          0 if aFolder is the Desktop or is unspecified,
   *          1 if aFolder is the Downloads folder,
   *          2 otherwise
   */
  _folderToIndex: function (aFolder)
  {
    if (!aFolder || aFolder.equals(this._getDownloadsFolder("Desktop")))
      return 0;
    else if (aFolder.equals(this._getDownloadsFolder("Downloads")))
      return 1;
    return 2;
  },

  /**
   * Converts an integer into the corresponding folder.
   *
   * @param   aIndex
   *          an integer
   * @returns the Desktop folder if aIndex == 0,
   *          the Downloads folder if aIndex == 1,
   *          the folder stored in browser.download.dir
   */
  _indexToFolder: function (aIndex)
  {
    switch (aIndex) {
      case 0:
        return this._getDownloadsFolder("Desktop");
      case 1:
        return this._getDownloadsFolder("Downloads");
    }
//    var currentDirPref = document.getElementById("browser.download.dir");
//    return currentDirPref.value;
    throw "unimplemented"
  },
}