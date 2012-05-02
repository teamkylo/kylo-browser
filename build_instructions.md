Building Kylo from Source
==============================

What You Will Need
------------------------------

**REQUIRED**
  * [Python 2.7.3](http://www.python.org/download/releases/2.7.3/)
    
    Our build script is written in Python. The standard process is to run the build script after each testable code change. This will sync your changes from the SRC directory to the build/dist directories. 
    
  * [XULRunner runtime 10.0.2](http://code.kylo.tv/xulrunner)

    Kylo is built on top of the XULRunner runtime. Many lighter-weight XULRunner applications rely on XULRunner being installed as a separately installed program. Kylo, however, uses a local copy of the runtime. This is more similar to how Firefox is constructed with it's own embedded copy of XULRunner. See the [*Deploying XULRunner* note on developer.mozilla.org](https://developer.mozilla.org/en/XULRunner/Deploying_XULRunner_1.8) for more information. Currently, we run off a [patched version](http://code.kylo.tv/xulrunner) of the XULRunner runtime in order to fix a crash bug. Please see the [*XULRunner*](#xulrunner) note below.
    
**OPTIONAL**
  * [Gecko SDK](http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/10.0.2/)

    The Kylo source code comes with two pre-built XPCOM components - [[MouseEventTool|About-MouseEventTool]] and [[SendKeys|About-SendKeys]]. If you want to make changes to their source code, you'll need to recompile. Mozilla XPCOM components are built against the [Gecko SDK](https://developer.mozilla.org/en/Gecko_SDK) (sometimes called the XULRunner SDK). You'll need to download the Gecko SDK and copy it into the Kylo source tree. Please see the [*Gecko SDK*](#geckosdk) note below.

    >*Note: The version numbers of the Gecko SDK and XULRunner runtimes need to match! Until the [patch](https://bugzilla.mozilla.org/show_bug.cgi?id=721817) is resolved, the supported version number is __10.0.2__*

**Windows XP/Vista/7** (*Please note that only Windows 7 builds have been tested so far*)
  * [Visual C++ Express 10.0](http://www.microsoft.com/visualstudio/en-us/products/2010-editions/visual-cpp-express)
  * __Win7 only__: [Windows 7 SDK](http://www.microsoft.com/download/en/details.aspx?id=3138)
  * [CMAKE 2.8.8](http://www.cmake.org/cmake/resources/software.html)

    If you want to make code changes to the XPCOM components written in C++ (ie. MouseEventTool), you'll need to compile your changes against the Gecko SDK. CMake files are provide if you choose to have the appropriate solution files generated for you.

  * [Resource Hacker 3.6.0](http://www.angusj.com/resourcehacker/)

    If you use a custom XULRunner runtime build, or want to change versions, you'll probably want Resource Hacker. Rather than build a custom XULRunner for Kylo, we use Mozilla's recommended method of repurposing the xulrunner-stub.exe file provided in their official releases. This requires the ability to modify the executable - adding the icon asset, changing the name, and adjusting the attached descriptive data. The build script will run Resource Hacker for you to automate this process. Read [Mozilla's tips page](https://developer.mozilla.org/en/XULRunner_tips) for more information.  
 
  * [NSIS 2.4.6](http://nsis.sourceforge.net/Download)

    Have this on hand if you want to build an installer. The build script will take care of this process as well.
    
**Mac OS X**
  * *TBD* - Sorry, there's still a lot of work to be done here. Using the supplied build script to compile for Mac is not currently supported. This should be resolved shortly...

********************************************************************************
<a id="xulrunner" />**XULRunner**  
Currently, Kylo requires a custom build of the XULRunner runtime. This is due to a bug in the "rapid release" versions (I think going back to v5.0). Without this custom release, Kylo will crash when loading Flash, Silverlight, or Quicktime
content (possibly other plugins as well). It has to do with some IPC stuff - when Mozilla started allowing plugins to run in separate threads to prevent crashing the whole browser when a plugin died. 

[The bug details are here](https://bugzilla.mozilla.org/show_bug.cgi?id=721817)

Until that patch gets accepted in their release branch, we'll be hosting the most recent supported XULRunner with our patch on our own servers. We'll also include the pre-Resource Hacker'ed version of the xulrunner-stub (see below).

You should unzip/tar it on top of your Kylo source install directory, and it will create the following directory structure:

    kylo-browser/ (Path to Kylo source install directory)
      src/
        extern/
          xulrunner/
            versions/
              10.0.2/
                runtime/
                  win32/
                    components/
                    dictionaries/
                    *.dll
                    *.manifest
                    etc... 


<a id="geckosdk" />**Gecko SDK**  
>*Note: The Gecko SDK is also called the XULRunner SDK, so you'll see places both on mozilla's servers and our directory structure where the Gecko SDK is located under "xulrunner".*

Once you've downloaded the appropriate version of the Gecko SDK, you'll need to put it in a directory where the build process can find it.

Assuming you've grabbed the Windows v10.0.2 release of the SDK, your directory structure should look like this:

    kylo-browser/ [Kylo Source Package install location]
      src/
        extern/
          xulrunner/
            versions/
              10.0.2/
                runtime/ <-------| Already here from xulrunner runtime install
                  ...  
                sdk/ <-----------| Create these directories and copy everything
                  win32/ <-------| from "xulrunner-sdk" into the new win32 directory
                    bin/  
                    host/  
                    idl/  
                    include/
                    lib/  
                    sdk/  

********************************************************************************


Configure Your Build
------------------------------

XULRunner applications typically store their settings in a file called application.ini that lives at the root. This is a standard config file format - name value pairs grouped by section, like so:

    [Section1]  
    parameter1Name=parameter1Value  
    parameter2Name=parameter2Value

The build script uses a couple configuration files in the same format to generate the build. Any section/parameters in the build scripts that match runtime settings will override those in the application.ini.

The build configuration files are:  
`/kylo-browser/tools/build/[platform os]/[platform os].platform.conf`
`/kylo-browser/tools/conf/kylo.conf`  
    
Simple documentation is provided within each config file.

`*.platform.conf`:  
  This config file stores the locations of various build tools. You'll want to make sure the paths line up to what you have installed.

`kylo.conf`:  
  This is the master config file for the Kylo build. The file provided matches settings for the production release of Kylo. If you want to change these values it's best to create a copy of the file. You will be passing this config file to the build script on the command line, so you can name it whatever you like. You can also provide more than one config file at a time.
    
In addition, the application.ini file is included in the list of config files. 

The config files are read in the following order. Each subsequent file will override values of the previous.

`*.platform.conf` <- `application.ini` <- `kylo.conf` [<- `*.conf`] 


Run the Build
------------------------------

To run Kylo builds, you'll be using our custom Python script: `build_kylo.py`

From the command line:  

    $ cd [\path\to\kylo-browser]\tools\build  
    $ build_kylo.py --skip-compile --skip-app --skip-installer -v -R 1000 ..\conf\kylo.conf  
    
This will use the pre-compiled XPCOM binaries and Kylo app executable and build a "portable" version of Kylo in the build directory.

**Rundown of the command line optons:**

  * `--skip-compile`    
      This prevents the build script from trying to compile the XPCOM components. Run this option if you don't have the Gecko SDK or build tools installed (Visual Studio, CMAKE, etc.)

  * `--skip-app`        
      This avoids the process of creating the `Kylo.exe` executable on Windows. If you're using the [patched version of XULRunner](http://code.kylo.tv/xulrunner), `Kylo.exe` is provided for you. 

  * `--skip-installer`  
      This skips the NSIS/DMG installer process. **TODO:** Make this default.

  * `-v`
      Verbose flag. Prints output to the console.

  * `-R 1000`           
      Sets the revision number. See the [note on version numbers](#R) below.

  * `..\conf\Kylo.conf` 
      This is the default config file. You can modify this file or create your own. You can also pass in multiple configuration files.

To see what all the options do:  

    $ build_kylo.py --help

The standard process is to make your changes to the JS/XUL and then build with the compile, installer, and app options turned **OFF**. This will recreate the omni.jar package of JS/XUL with your included updates. If you want a hierarchical
layout of source instead of the compressed omni package, run `build_kylo.py` with the `--skip-omni` option.

Running `build_kylo.py` without any options and only the configuration file provided will perform all build operations in the following order:

1. Create the build and dist directories
2. Compile components selected in the `[components]` directive of the *.conf file
3. Compile components in the extensions selected in the `[extensions]` directive
4. Sync JS/XUL, components, extensions into the build directory
5. Compress the JS/XUL into the omni.jar (omni.jar/omni.ja is a Mozilla construct - feel free to look this up in [developer.mozilla.org](https://developer.mozilla.org/en/Mozilla/About_omni.ja_(formerly_omni.jar))
6. "Build" the Kylo executable (run reshacker to create `Kylo.exe` from `xulrunner-stub.exe`)
7. Run NSIS, create the Kylo installer


********************************************************************************
<a id="R" />_**A Quick Note on Version Numbers**_  
The -R/--revision option affects Kylo's version number. The revision number is the fourth number in the full version (ie. 1.0.1.76141). This has previously mapped to an internal revision number matching a Perforce changelist. For local builds, you can choose to provide a custom value or exclude the -R option. Without specifying a revision number, the version number will be only three parts (ie. 1.0.1). You will likely be asked to upgrade after running Kylo. You can ignore this message for development purposes.   
********************************************************************************

Test Your Build
------------------------------

The Kylo build process creates a "portable" package under the `build\[OS]\[App Name]\application` directory. On standard Windows builds using the default config file, the path looks like this:

    kylo-browser/ [Kylo Source Package install location]
      build/
        win32/
          kylo/
            application/
              components/
              extensions/
              xulrunner/
              Kylo.exe
              ...

You can run the `Kylo.exe` file out of this directory. XULRunner apps have a couple flags that might be handy for development purposes. You can append this flags to the `Kylo.exe` like so:

    $ cd [path\to\kylo-browser]\build\win32\kylo\application
    $ Kylo.exe -ProfileManager -jsconsole

Options:

  * `-ProfileManager`
    This will launch a window allowing you to create, delete, and run different profiles. All XULRunner applications (including Firefox) create a profile in the user directory to store preferences and the like. The usefulness of the `-ProfileManager` option comes in to play when you want to "start fresh" after making some code changes. This lets you delete the current profile, create a new one, and run Kylo again. To do this manually, you would need to delete the user profile directory.

>*Note: Looks like this feature may finally be on it's way out. [Mozilla has an alternate method](https://developer.mozilla.org/en/Profile_Manager).*

  * `-jsconsole`
    This will launch the error console along with Kylo. This is useful to see various error messages. Due to the full-screen nature of Kylo, the console window may be hidden. You'll have to alt-tab to move it into view.

For more options, see Mozilla's notes on [command line options](https://developer.mozilla.org/en/Command_Line_Options)

Success!(?)
------------------------------
After all this, you should have Kylo building and running. If you run into any problems, check out our [forum](http://kylo.tv/community) or if it's real bad, submit an [issue](http://github.com/teamkylo/kylo-browser/issues/new). 

From here, there's lots more you could do...

  * Create a new theme
  * Build new extensions
  * Fix some [bugs](https://github.com/teamkylo/kylo-browser/issues?state=open)

Remember to keep an eye on our [developer site](http://code.kylo.tv), [TeamKylo blog](http://team.kylo.tv), [wiki](http://github.com/teamkylo/kylo-browser/wiki) and [community forums](http://kylo.tv/community).

Enjoy!

*********************************
This page hosted on the [kylo-browser wiki](http://github.com/teamkylo/kylo-browser/wiki/Build-Instructions)

Copyright 2012 Hillcrest Labs