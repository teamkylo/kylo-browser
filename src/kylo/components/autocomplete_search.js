/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

const SEARCH_ENGINE_PREF = "polo.defaultSearchEngine";
const XPCOM_SHUTDOWN_TOPIC = "xpcom-shutdown";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu["import"]("resource://gre/modules/XPCOMUtils.jsm");

const STRING_BUNDLE = "chrome://polo/locale/components/xxsearchautocomplete.properties";

// Implements nsIAutoCompleteResult
function XXAutoCompleteResult(searchString, searchResult,
                                  defaultIndex, errorDescription,
                                  results, comments) {
  this._searchString = searchString;
  this._searchResult = searchResult;
  this._defaultIndex = defaultIndex;
  this._errorDescription = errorDescription;
  this._results = results;
  this._comments = comments;
}

XXAutoCompleteResult.prototype = {
  _searchString: "",
  _searchResult: 0,
  _defaultIndex: 0,
  _errorDescription: "",
  _results: [],
  _comments: [],

  /**
   * The original search string
   */
  get searchString() {
    return this._searchString;
  },

  /**
   * The result code of this result object, either:
   *         RESULT_IGNORED   (invalid searchString)
   *         RESULT_FAILURE   (failure)
   *         RESULT_NOMATCH   (no matches found)
   *         RESULT_SUCCESS   (matches found)
   */
  get searchResult() {
    return this._searchResult;
  },

  /**
   * Index of the default item that should be entered if none is selected
   */
  get defaultIndex() {
    return this._defaultIndex;
  },

  /**
   * A string describing the cause of a search failure
   */
  get errorDescription() {
    return this._errorDescription;
  },

  /**
   * The number of matches
   */
  get matchCount() {
    return this._results.length;
  },

  /**
   * Get the value of the result at the given index
   */
  getValueAt: function(index) {
    return this._results[index];
  },

  /**
   * Get the comment of the result at the given index
   */
  getCommentAt: function(index) {
    return this._comments[index];
  },

  /**
   * Get the style hint for the result at the given index
   */
  getStyleAt: function(index) {
  	if (!this._results[index]) {
		return "empty";
	}
	
  	return "auto_search";
  },

  /**
   * Get the image for the result at the given index
   * The return value is expected to be an URI to the image to display
   */
  getImageAt : function (index) {
    return "";
  },

  /**
   * Remove the value at the given index from the autocomplete results.
   * If removeFromDb is set to true, the value should be removed from
   * persistent storage as well.
   */
  removeValueAt: function(index, removeFromDb) {
    this._results.splice(index, 1);
    this._comments.splice(index, 1);
  },
  
  getLabelAt: function(index) { return this._results[index]; }

};


// Implements nsIAutoCompleteSearch
function XXAutoCompleteSearch() {
	this._init();
}

XXAutoCompleteSearch.prototype = {
  _init: function() {
    this._addObservers();
    this._loadEnginePref();
  },
  
  get _strings() {
    if (!this.__strings) {
      var sbs = Cc["@mozilla.org/intl/stringbundle;1"].
                getService(Ci.nsIStringBundleService);

      this.__strings = sbs.createBundle(STRING_BUNDLE);
    }
    return this.__strings;
  },
  __strings: null,  
  
  /**
   * Search engine preference.
   */
  _loadEnginePref: function XXX_loadEnginePref() {
    var prefService = Cc["@mozilla.org/preferences-service;1"].
                      getService(Ci.nsIPrefService);
	prefService.QueryInterface(Ci.nsIPrefBranch2);
	this._engine = prefService.getCharPref(SEARCH_ENGINE_PREF);
  },
  _engine: "google",
  
  _engines: {
    google: {
		"q": "http://www.google.com/search?q={searchTerms}",
		"n": "xxsearchautocomplete.google"
		},		
    bing: {
		"q": "http://www.bing.com/search?q={searchTerms}",
		"n": "xxsearchautocomplete.bing"
		},
    yahoo: {
		"q": "http://www.search.yahoo.com/search?p={searchTerms}",
		"n": "xxsearchautocomplete.yahoo"
		},
    ask: {
		"q": "http://www.ask.com/web?q={searchTerms}",
		"n": "xxsearchautocomplete.ask"
		},
    truveo: {
		"q": "http://www.truveo.com/search?query={searchTerms}",
		"n": "xxsearchautocomplete.truveo"
		}
  }, 
  
  _addObservers: function XXX_addObservers() {
    var prefService2 = Cc["@mozilla.org/preferences-service;1"].
                       getService(Ci.nsIPrefBranch2);
    prefService2.addObserver(SEARCH_ENGINE_PREF, this, false);

    var os = Cc["@mozilla.org/observer-service;1"].
             getService(Ci.nsIObserverService);
    os.addObserver(this, XPCOM_SHUTDOWN_TOPIC, false);
  },

  _removeObservers: function XXX_removeObservers() {
    var prefService2 = Cc["@mozilla.org/preferences-service;1"].
                       getService(Ci.nsIPrefBranch2);
    prefService2.removeObserver(SEARCH_ENGINE_PREF, this);

    var os = Cc["@mozilla.org/observer-service;1"].
             getService(Ci.nsIObserverService);
    os.removeObserver(this, XPCOM_SHUTDOWN_TOPIC);
  },   	
  
  /**
   * nsIObserver
   */
  observe: function XXX_observe(aSubject, aTopic, aData) {     
    switch (aTopic) {
      case "nsPref:changed":
        this._loadEnginePref();
        break;
      case XPCOM_SHUTDOWN_TOPIC:
        this._removeObservers();
        break;
    }
  },  
  
  /*
   * Search for a given string and notify a listener (either synchronously
   * or asynchronously) of the result
   *
   * @param searchString - The string to search for
   * @param searchParam - An extra parameter
   * @param previousResult - A previous result to use for faster searchinig
   * @param listener - A listener to notify when the search is complete
   */
  startSearch: function(searchString, searchParam, result, listener) {
  	var result = null;
	if (!searchString ||
	    !searchString.replace(/\s/g,"") ||
		((searchString.indexOf(".") > -1 ||
		searchString.indexOf("//") > -1) && searchString.indexOf(" ") == -1) ) {
       newResult = new XXAutoCompleteResult(searchString, 
           Ci.nsIAutoCompleteResult.RESULT_SUCCESS,0,"",[""],[null]);			
    } else {
	   var eng = this._engines[this._engine]
	   var searchQuery = eng.q.replace("{searchTerms}", encodeURIComponent(searchString));	  
       newResult = new XXAutoCompleteResult(searchString, 
	       Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", 
		   [searchQuery], 
		   [this._strings.GetStringFromName(eng.n)]);		
	} 
    listener.onSearchResult(this, newResult);	
  },

  /**
   * Ends the search result gathering process. Part of nsIAutoCompleteSearch
   * implementation.
   */
  stopSearch: function() {	
  },
  
   QueryInterface: function(aIID) {
    if (!aIID.equals(Ci.nsIAutoCompleteSearch) && !aIID.equals(Ci.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;		
    return this;
  }  
  
};

// Module
function XXAutoCompleteSearchModule() {}

XXAutoCompleteSearchModule.prototype = {
	
	classID: Components.ID("{ED696C78-AA6A-11DF-8ED3-3018E0D72085}"), 
	contractID: "@mozilla.org/autocomplete/search;1?name=xxsearch-autocomplete",
	
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch, Ci.nsIAutoCompleteResult, Ci.nsISupports]),
	
	_xpcom_factory: {
		singleton: null,
		createInstance: function (aOuter, aIID) {
		    if (aOuter != null)
		  	  	throw Cr.NS_ERROR_NO_AGGREGATION;
		    if (this.singleton == null)
		    	this.singleton = new XXAutoCompleteSearch();
		    return this.singleton.QueryInterface(aIID);
		}
	}
	
};

// Module initialization
const NSGetFactory = XPCOMUtils.generateNSGetFactory([XXAutoCompleteSearchModule]);