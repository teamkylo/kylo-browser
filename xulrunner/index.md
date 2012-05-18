---
layout: page
title: "XULRunner"
header: "Download the XULRunner Package"
description: "XULRunner runtime with patch"
---
{% include JB/setup %}

### Kylo runs on Mozilla
Kylo is built on the [Gecko SDK](https://developer.mozilla.org/en/Gecko_SDK) and requires the [XULRunner](https://developer.mozilla.org/en/XULRunner) runtime to operate.

Currently, there is a [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=721817) in the Mozilla codebase that causes Kylo to crash when certain plugins are running. We have compiled a version of the XULRunner runtime with a patch and provide the package for distribution here under the terms of the [MPL](http://www.mozilla.org/MPL).

The latest version of XULRunner supported by Kylo is 12.0. 

<i class="icon-download-alt"></i> [kylo-browser_xulrunner-12.0.en-US.win32%2Bpatch_721817.zip](http://files.kylo.tv/kylo-browser_xulrunner-12.0.en-US.win32%2Bpatch_721817.zip)

Unzip this to your top source directory (ie. kylo-browser). This will merge with your existing directory structure and add the xulrunner runtime to appropriate locations. See the [build documentation](https://github.com/teamkylo/kylo-browser/wiki/Build-Instructions) for more information.

This zip file also includes the Kylo.exe executable that was created from xulrunner-stub.exe using [Resource Hacker](http://www.angusj.com/resourcehacker/).


#### Patched XULRunner Versions
* [XULRunner 12.0](http://files.kylo.tv/kylo-browser_xulrunner-12.0.en-US.win32%2Bpatch_721817.zip)
* [XULRunner 10.0.2](http://files.kylo.tv/kylo-browser_xulrunner-10.0.2.en-US.win32%2Bpatch_721817.zip)
