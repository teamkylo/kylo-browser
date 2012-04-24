# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
# Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
# trademarks of Hillcrest Laboratories, Inc.

from common import build_util
from common.build_prefs import Settings
from win32.stub import build_stub
import _winreg
import errno
import os
import re
import shutil

def relPath(*args):
    rel = os.path.join(*args)
    return os.path.abspath(os.path.join(module_path, rel))

module_path = os.path.dirname(relPath.func_code.co_filename)

def buildComponent(component, componentDir=None):
    """ Build the component. Return a pair of paths
        (pathToBinary, pathToXPTFile)"""
    logger = build_util.getLogger('build_components')
    # Save current working directory to set it back later
    prevDir = os.getcwd()
    # Component Directory
    if componentDir is None:
        componentDir = os.path.join(Settings.prefs.src_dir, "xpcom", component)

    os.chdir(componentDir)
    logger.info("Making build and bin dirs for component %s"%component)
    buildDir = os.path.join(componentDir, "build")
    binDir = os.path.join(componentDir, "bin")
    
    for dir in [buildDir, binDir]:
        try:
            os.mkdir(dir)
        except OSError, err:
            if err.errno == errno.EEXIST:
                logger.warning("Couldn't make %s because it exists."%dir)
                logger.warning("Deleting %s"%dir)
                shutil.rmtree(dir)
                logger.warning("Trying to make %s again"%dir)
                os.mkdir(dir)
            else:
                raise
        
    logger.info("Changing working directory to %s"%buildDir)
    os.chdir(buildDir)
    # Run cmake on the component directory to generate the sln file
    build_util.runSubprocess([os.path.normpath(Settings.config.get("env","CMAKE")), '..', '-DGECKO:STRING=%s' % Settings.config.get('Build', 'gecko'), '-G', 'Visual Studio 10'], logger)
    slnfile = os.path.normpath(os.path.join(buildDir, "%s.sln"%component))

    # Run devenv (or VCExpress) on the new sln file
    build_util.runSubprocess([os.path.normpath(Settings.config.get("env","DEVENV")), slnfile, '/build', 'Release|win32'], logger)
    binaryPath = os.path.join(buildDir, 'Release/%s.dll'%component)
    xptPath = os.path.join(componentDir, 'I%s.xpt'%component)
    
    for path in [binaryPath, xptPath]:
        shutil.copy2(path, binDir)
    
    binaryPath = os.path.join(binDir, '%s.dll'%component)
    xptPath = os.path.join(binDir, 'I%s.xpt'%component)
    
    os.chdir(prevDir)
    return (binaryPath, xptPath)

def cleanComponent(component, componentDir=None):
    logger = build_util.getLogger('build_components')
    logger.info("Cleaning component %s"%component)
    
    if componentDir is None:
        componentDir = os.path.join(Settings.prefs.src_dir, "xpcom", component)
    
    buildDir = os.path.join(componentDir, "build")
    binDir = os.path.join(componentDir, "bin")
    
    # Delete the xpt and auto-gen header and cmake header rule file
    for ext in ['xpt', 'h', 'h.rule']:
        delPath = os.path.join(componentDir, 'I%s.%s'%(component, ext))
        logger.info("Removing %s"%delPath)
        try:
            os.remove(delPath)
        except OSError, err:
            if err.errno != errno.ENOENT:
                raise
          
    # Delete the left over xpidl stuff  
    delPath = os.path.join(componentDir, "xpidl_debug")
    logger.info("Removing %s"%delPath)
    try:
        os.remove(delPath)
    except OSError, err:
        if err.errno != errno.ENOENT:
            raise
            
    # Delete the build and bin dirs
    for dir in [buildDir, binDir]:
        logger.info("Deleting %s"%dir)
        try:
            shutil.rmtree(dir)
        except OSError, err:
            if err.errno != errno.ENOENT:
                raise

def buildApp():
    # ----------------------
    # Under Windows, we're just going to grab the xulrunner-stub.exe and run Resource Hacker
    # to rename it to "Kylo", set the icon, and set some version info, etc.
    reshack_temp_dir = os.path.join(Settings.prefs.build_dir, "stub")
    if not os.path.exists(reshack_temp_dir):
        os.makedirs(reshack_temp_dir)
    
    build_stub.main(Settings.config.get('App','Version'), 
                    Settings.config.get('App','BuildID'), 
                    temp_dir = reshack_temp_dir, 
                    stub_dir = os.path.join(Settings.prefs.build_dir, "application"))
    
    # ----------------------
    # We also need mozilla DLLS
    for lib in ["mozcrt19.dll", "mozutils.dll"]:
        f = os.path.join(Settings.prefs.xul_dir, lib)
        if (os.path.isfile(f)):
            shutil.copy2(f, os.path.join(Settings.prefs.build_dir, "application"))

    # ----------------------
    # Now let's grab the XULRunner directory and drop it in to our working application directory
    xulrunner_dir = os.path.join(Settings.prefs.build_dir, "application", "xulrunner")
    if not os.path.exists(xulrunner_dir):
        os.makedirs(xulrunner_dir)
        
    build_util.syncDirs(Settings.prefs.xul_dir, xulrunner_dir, exclude=["xulrunner-stub.exe"])

def buildInstaller():
    """ Build the installer"""
    
    logger = build_util.getLogger('build_Installer')
    
    makensis = os.path.normpath(Settings.config.get("env","NSIS"))
    
    nsi_file = os.path.normpath(os.path.join(module_path, "installer", "kylo.nsi"))
           
    # We have potentially two different version numbers: one alphanumeric (infoversion) 
    # and one with just digits (ie. 1.0.1b.1000, 1.0.1.1000).
    # This is because NSIS does not accept version strings with letters, but Mozilla does.    
    
    def replVersion(m):
        return m.group(1)
    
    infoversion = Settings.config.get("App", "Version")
    version = re.sub("(\d+)[a-zA-z]+\d*",replVersion,infoversion)    
    versionInts = [int(x) for x in version.split(".")]
    
    nsis_defs = {
        "APP_DIR": Settings.prefs.kylo_build_dir,
        "BUILD_ID": Settings.config.get("App", "BuildID"),
        "VERSION": version,
        "INFO_VERSION": infoversion,
        "VERSION_MAJOR": versionInts[0],
        "VERSION_MINOR": versionInts[1],
        "FILE_VERSION": version,
        "OUT_FILE_DIR": Settings.prefs.dist_dir,
        "LOCALE": "en-US",
    }
    
    # Create dist_dir if it doesn't exist
    if not os.path.exists(Settings.prefs.dist_dir):
        logger.info("Creating dist directory: %s", Settings.prefs.dist_dir)
        os.makedirs(Settings.prefs.dist_dir)
    
    args= [makensis] + ["/D%s=%s" % (k,v) for (k,v) in nsis_defs.iteritems()] +  [nsi_file]
    logger.debug("Running: **" + " ".join(args))
    build_util.runSubprocess(args, logger)

