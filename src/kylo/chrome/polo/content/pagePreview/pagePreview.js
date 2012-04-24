/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

/***
 * Service that handles generation of preview images for a given website url.
 * @class PagePreview
 * @author <a href="mailto:kzubair@hcrest.com">Khalid Zubair</a>
 */
function PagePreview() {
    
    PagePreview.init();
        
    this.freeGenerators_ = [];
	this.backgroundBrowsers_ = [];
    for (var i = 0; i < PagePreview.NUM_GENERATORS; i++) {
        this.freeGenerators_[i] = new PreviewCreator();
		this.backgroundBrowsers_[i] = this.freeGenerators_[i].getBrowserElement();
    }
    
    this.canvas_ = document.createElementNS(NS.html, "canvas");
    this.busyGenerators_ = [];
    this.queue_ = [];
    
    this.active_ = {};
    
//    window.setTimeout(this.clearOldFiles.bind(this), PagePreview.CLEAN_INIT_INTERVAL);
    gObserverService.addObserver(this, "Browser:DocumentLoadCompleted", false);
}

PagePreview.prototype.observe = function(browserObject, topic, json) {
	var ACTIVE_PAGE_CAPTURE_DELAY = 5000; 
	
    if (topic != "Browser:DocumentLoadCompleted") {
        throw "Unexpected topic: " + topic;
    }
    
    var browser = browserObject.wrappedJSObject.getBrowserElement();
    var uri = browser.currentURI;
    var result = PlacesUtils.bookmarks.getBookmarkIdsForURI(uri, {});
    if (!result || !result.length) {
        return;
    }
    
    window.setTimeout(function () {
        // silently update the preview
        new PreviewGrabber(browser, uri, PagePreview.SIZES, 
                function () {},
                function () {}
        ).generate();
    }, ACTIVE_PAGE_CAPTURE_DELAY);    
};

/**
 * Gets a preview image nsiURL for the website at url. The callback is not
 * returned until the preview image has been written to disk.
 * @param url string or nsiURL of website to preview
 * @param width optional width of image
 * @param height optional height of image
 * @param cb callback function called back with a nsiURL to the image.
 */
PagePreview.prototype.getPreview = function (url, width, height, cb) {
    if (typeof url == "string") {
        url = gURIFixup.createFixupURI(url, 0);
    }
    
    if (arguments.length == 2) {
        cb = width;
        width = PagePreview.DEFAULT_WIDTH;
        height = PagePreview.DEFAULT_HEIGHT;
    }
    
    var key = "pagePreview/" + width + "x" + height;
    var hasAnno = PlacesUtils.annotations.pageHasAnnotation(url, key);
    
    if (hasAnno) {
        cb(PlacesUtils.annotations.getAnnotationURI(url, key));
        return;            
    }
    
    if (url.spec in this.active_) {
        var prev = this.active_[url.spec];
        this.active_[url.spec] = function (success) {
            prev(success);
            cb(success ? PlacesUtils.annotations.getAnnotationURI(url, key) : null);
        }
        return;
    }
    
    var self = this;
    this.active_[url.spec] = function (success) {
        delete self.active_[url.spec];
        cb(success ? PlacesUtils.annotations.getAnnotationURI(url, key) : null);
    }
    
    
    var b = browser_.getBrowserForURI(url.spec);
    if (b) {
        this.generatePreviewsFromActiveBrowser(b.getBrowserElement(), url);
        return;
    }
                
    this.generatePreviews(url);
}

PagePreview.prototype.generatePreviews = function (url) {
    var gen = this.freeGenerators_.pop();
    if (gen) {
        this.busyGenerators_.push(gen);
        gen.generate(url, PagePreview.SIZES,
            function () {
                this.dequeue(gen);
                this.active_[url.spec](true);
            }.bind(this),
            function () {
				this.dequeue(gen);
                this.active_[url.spec](false);
            }.bind(this)
        );
    } else {
        this.queue_.push(arguments);
    }
}

PagePreview.prototype.dequeue = function (gen) {
    var idx = this.busyGenerators_.indexOf(gen);
    if (this.busyGenerators_[idx] !== gen) {
        throw "baaah";
    }
    this.busyGenerators_.splice(idx, 1);
    this.freeGenerators_.push(gen);
    
    if (this.queue_.length) {
        this.generatePreviews.apply(this, this.queue_.shift())   
    } else {
        // free-up the page.
        gen.discard();
    }
}

PagePreview.prototype.generatePreviewsFromActiveBrowser = function (browser, url) {
    new PreviewGrabber(browser, url, PagePreview.SIZES, 
            function () {
                this.active_[url.spec](true);
            }.bind(this),
            function () {
                this.generatePreviews(url)
            }.bind(this)
    ).generate();
}

PagePreview.prototype.isPreviewContentWindow = function (win) {
	if (win == null) {
		return false;
	}

	for (var i = 0; i < this.backgroundBrowsers_.length; i++) {
		var el = this.backgroundBrowsers_[i];
		if (el.contentWindow == win) {
			return true;
		}
	}
	
	return false;
}

PagePreview.capture = function (pageWin, canvas,  w, h) {
    
    canvas.style.width = w + "px";  
    canvas.style.height = h + "px";  
    canvas.width = w;  
    canvas.height = h;
    
    var W = PagePreview.PAGE_WIDTH;
    var H = PagePreview.PAGE_HEIGHT;
    
    var pageW = pageWin.innerWidth + pageWin.scrollMaxX;
    var pageH = pageWin.innerHeight + pageWin.scrollMaxY;
    
    if (W > pageW) {
        W = pageW;     
        H *= pageW / W;
    }
    
    var scale = w / W;
    
    var dh = 0;    
    if (H > pageH) {
        dh = (H - pageH);
        H = pageH;
    }
        
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);    
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);    
    
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(0, dh / 2);
         
    ctx.drawWindow(pageWin, 0, 0, W, H, "black")
    ctx.restore();
    
    return canvas;  
}

PagePreview.init = function () {
    if (PagePreview.init_) {
        return;
    }
    PagePreview.init_ = true;
    var p = gPrefService.getBranch("pagePreview.");
    PagePreview.NUM_GENERATORS = p.getIntPref("numGenerators");
    
    // TODO deprecated
    PagePreview.DIR_NAME = p.getCharPref("dir");
    
    /**
     * How long to keep a screenshot of a  site.
     * TODO deprecated
     */
    PagePreview.CACHE_DUR = p.getIntPref("cache.dur"); 
    
    /**
     * How long to delay flushing old cached images on initial startup.
     * TODO deprecated
     */
    PagePreview.CACHE_FLUSH_STARTUP_DELAY = p.getIntPref("cache.flush.init");
    
    /**
     * Interval to flush cached images while running.
     * TODO deprecated
     */
    PagePreview.CACHE_FLUSH_REPEAT_DUR = p.getIntPref("cache.flush.repeat");
    
    /**
     * Use some computed CSS magic to get preview sizes
    */
    var pp = document.createElementNS(NS.html, "span");
    pp.className = "page-preview-dimensions";
    
    document.lastChild.appendChild(pp);
    
    var ppCss = document.defaultView.getComputedStyle(pp, null);
    PagePreview.DEFAULT_WIDTH = parseInt(ppCss.getPropertyValue("width")) || 160;
    PagePreview.DEFAULT_HEIGHT = parseInt(ppCss.getPropertyValue("height")) || 90; 
                                          
    document.lastChild.removeChild(pp);
     
    PagePreview.SIZES = [[PagePreview.DEFAULT_WIDTH, PagePreview.DEFAULT_HEIGHT]];
    PagePreview.PAGE_WIDTH = 1280;
    PagePreview.PAGE_HEIGHT = 720;
}


/***
 * Single worker unit that generates an image for a url.
 * @class PagePreview
 * @author <a href="mailto:kzubair@hcrest.com">Khalid Zubair</a>
 */
function PreviewCreator() {
    
    this.active_ = false;
    
    this.canvas_ = document.createElementNS(NS.html, "canvas");
    
    this.browser_ = document.createElement("browser");
    this.browser_.id = "_preview-creator-" + PreviewCreator.count++;
    this.browser_.width = 1;
    this.browser_.height = 1;
    this.browser_.setAttribute("type", "content-targetable");
    //this.browser_.contentDocument.stop(); // stop about:blank 
    
    this.browser_.style.overflow = "hidden";
    
    this.browser_.hidden = false;
    PreviewCreator.g.appendChild(this.browser_);
    
//  this.browser_.docShell.allowJavascript = false;
//  this.browser_.docShell.allowPlugins = false;
//  this.browser_.docShell.allowAuth = false;
//  this.browser_.docShell.isOffScreenBrowser = true; 
    
    
//  this.browser_.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);

    this.browser_.addEventListener("load", this, true);     
}

PreviewCreator.prototype.getBrowserElement = function () {
	return this.browser_;
}

PreviewCreator.prototype.handleEvent = function (evt) {
    if (this.active_ &&
        evt.type == "load" &&
        evt.target == this.browser_.contentDocument) {

        this.documentLoaded();  
    }
}

PreviewCreator.prototype.documentLoaded = function () {
    // note: we can't capture during this event, something about the canvas
    //       not being able to. have to do it in another event loop
    var i = 0;
    var f = (function () {
        // make sure page hasn't changed.
        if (!this.url_.equals(this.browser_.currentURI)) {
            debug("[PreviewCreator] Navigated away while loading page, loaded [", this.url_ && this.url_.spec, "] now on [", this.browser_.currentURI && this.browser_.currentURI.spec, "]");
        }

        var size = this.sizes_[i++];
        this.capture(size[0], size[1]);
        this.annotate()
        
        if (i < this.sizes_.length) {
            // yield before doing next one
            window.setTimeout(f, 0);
        } else {                
            window.clearTimeout(this.timerId_);
            // setPageAnnotation seems to require some time before being done. 
            this.taskTimerId_ = window.setTimeout(function () {                              
                var f = this.success_;
                
                this.timerId_ = null;
                this.taskTimerId_ = null;
                this.url_ = null;
                this.sizes_  = null;
                this.success_ = null;
                this.fail_ = null;                
                this.active_ = false;
                
                f();      
            }.bind(this), 0);
        }
    }.bind(this));
    
    this.taskTimerId_ = window.setTimeout(f, 0);
}

PreviewCreator.prototype.abort = function (msg) {
	
	//debug(" *** Failed grabbing preview (" + msg + ") for ", this.url_.spec);
	
    window.clearTimeout(this.taskTimerId_);
    var f = this.fail_;
    
    this.timerId_ = null;
    this.taskTimerId_ = null;
    this.url_ = null;
    this.sizes_  = null;
    this.success_ = null;
    this.fail_ = null;                
    this.active_ = false;
    
    f();      
}

PreviewCreator.prototype.capture = function (w, h) {
    return PagePreview.capture(this.browser_.contentWindow, this.canvas_, w, h);    
}

PreviewCreator.prototype.annotate = function (cb) {
    var canvas = this.canvas_;
    var base64 = canvas.toDataURL("image/jpeg", "").slice("data:image/jpeg;base64,".length);
    var binary = window.atob(base64);
    
    var bytes = new Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
    	bytes[i] = binary.charCodeAt(i);
    }

    var key = "pagePreview/" + canvas.width + "x" + canvas.height;
    
    PlacesUtils.annotations.removePageAnnotation(this.url_, key);
    PlacesUtils.annotations.setPageAnnotationBinary(this.url_, key, bytes, bytes.length, "image/jpeg", 0, Ci.nsIAnnotationService.EXPIRE_WEEKS);
}  

PreviewCreator.prototype.generate = function (url, sizes, success, fail) {
    if (this.active_) {
        throw "i'm busy!";
    }
    
    this.timerId_ = window.setTimeout(function () {
        if (this.url_ === url) {
            this.abort("Page took too long to load");
        }
    }.bind(this), 60000);// TODO timer val
    
    this.active_ = true;

    this.url_ = url;
    this.sizes_  = sizes;    
    this.success_ = success;
    this.fail_ = fail;
	
	try {
	    this.browser_.loadURI(url.spec);
	} catch (ex) {
		this.abort("Failed loading URI\n" + ex);
	}
}

PreviewCreator.prototype.reset = function () {
    this.timerId_ = null;
    this.taskTimerId_ = null;
    this.url_ = null;
    this.sizes_  = null;
    this.success_ = null;
    this.fail_ = null;
                
    this.active_ = false;    
}

PreviewCreator.prototype.discard = function () {
    this.browser_.loadURI("about:blank")    
}

PreviewCreator.count = 0;

PreviewCreator.g = null;


function PreviewGrabber(browser, url, sizes, success, fail) {
    this.canvas_ = document.createElementNS(NS.html, "canvas");    
    this.browser_ = browser;
    this.sizes_ = sizes;
    this.url_ = url;
    
    this.success_ = success;
    this.fail_ = fail;    

}

PreviewGrabber.prototype.generate = function () {
    // TODO handle case when doc is not loaded yet.
           
    var i = 0;
    var f = (function () {
        // make sure page hasn't changed.
        if (!this.url_.equals(this.browser_.currentURI)) {
            window.setTimeout(this.fail_, 0);
            return;
        }
       
        var size = this.sizes_[i++];
        this.capture(size[0], size[1]);
        this.annotate()
        	
        if (i < this.sizes_.length) {
            // yield before doing next one
            window.setTimeout(f, 0);
        } else {
            // setPageAnnotation seems to require some time before being done. 
            window.setTimeout(this.success_, 0);
        }
    }.bind(this));
    
    window.setTimeout(f, 0);
}

PreviewGrabber.prototype.capture = PreviewCreator.prototype.capture;

PreviewGrabber.prototype.annotate = PreviewCreator.prototype.annotate;


/**
 * App Init
 */
function start_page_preview() {
    try {
		Components.utils["import"]("resource://gre/modules/PlacesUtils.jsm");
        // TODO extern this to a XPCOM component
        PreviewCreator.g = document.getElementById("preview-browsers");     
        gPagePreview = new PagePreview();
    } catch(ex) {
        debug(ex)
    }
};
