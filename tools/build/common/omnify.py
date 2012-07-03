# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
# Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
# trademarks of Hillcrest Laboratories, Inc.
#
#  omnify.py
#  Kylo
#
#  Created by Kit Wood on 11/10/11.
#  Copyright (c) 2011 Hillcrest Labs, Inc.. All rights reserved.
#
#  Process for creating omni.jar
#  Pulling ideas from:
#    http://blog.mozilla.com/mwu/2010/08/13/omnijar-how-does-it-work/
#    https://developer.mozilla.org/index.php?title=en/About_omni.jar
#    http://blog.mozilla.com/tglek/2010/09/14/firefox-4-jar-jar-jar/

from common import build_util
from common import optimizejars
from common.build_prefs import Settings
import os
import sys
import shutil
import re
import zipfile

def addToZip(zip, zip_path, path, exclude=[]):
    abs_path = os.path.abspath(path)
    abs_zip_path = os.path.split(os.path.abspath(zip_path))[0]
    rel_path = os.path.relpath(abs_path, abs_zip_path)
    
    if os.path.isfile(path):
        __addFileToZip(zip, abs_path, rel_path, exclude)
    elif os.path.isdir(path):
        for root, dirs, files in os.walk(path):
            for f in files:
                abs_path = os.path.abspath(os.path.join(root, f))
                __addFileToZip(zip, abs_path, os.path.relpath(abs_path, abs_zip_path), exclude)
                    
def __addFileToZip(zip, filepath, relpath, exclude=[]):
    match = False
    for pattern in exclude:
        if re.match(pattern, filepath):
            match = True
            break
    if not match:
        zip.write(filepath, relpath, zipfile.ZIP_DEFLATED)    

def makejar(delete_files=True):
    logger = build_util.getLogger("omnify")
    # ----------------------
    # We need to grab the chrome.manifest file because we're going to modify it
    
    chrome_mfst_path = os.path.join(Settings.prefs.kylo_build_dir, "chrome.manifest")
    
    try:
        chrome_mfst = open(chrome_mfst_path, 'r+')
    except IOError as e:
        logger.error("%s missing! Can't create omni.jar" % chrome_mfst_path)
        sys.exit()
        
    # Binary components stay in the main chrome.manifest, everything else goes in a copy in the omni.jar
    bin_mfst = []
    jar_mfst = []
    for line in chrome_mfst:
        if line.startswith("binary-component"):
            bin_mfst.append(line)
        else:
            jar_mfst.append(line)    
    
    chrome_mfst.close()
    
    chrome_mfst = open(chrome_mfst_path, 'w+')
    chrome_mfst.writelines(jar_mfst)
    chrome_mfst.close()   
    
    # ----------------------
    # Create the jar file
    
    # omni.jar was renamed to omni.ja in Gecko 10
    
    gecko = Settings.config.get("Build", "gecko")
    m = re.search(r"^(\d+)\.",gecko)
    gecko_major_ver = int(m.group(1))
    
    if gecko_major_ver <= 9:
        omni_filename = "omni.jar"
    else:
        omni_filename = "omni.ja" 
    
    omni_path = os.path.abspath(os.path.join(Settings.prefs.kylo_build_dir, omni_filename))
    omni_jar = zipfile.ZipFile(omni_path, 'w', compression=zipfile.ZIP_STORED)
    
    # Here's what's going into the omni.jar
    #   /chrome
    #   /components (- *.dll, *.so, *.dylib)
    #   /defaults
    #   chrome.manifest
    
    chrome_path = os.path.join(Settings.prefs.kylo_build_dir, "chrome")
    components_path = os.path.join(Settings.prefs.kylo_build_dir, "components")
    defaults_path = os.path.join(Settings.prefs.kylo_build_dir, "defaults")
    
    addToZip(omni_jar, omni_path, chrome_path)
    addToZip(omni_jar, omni_path, components_path, exclude=[r'.*\.dll$', r'.*\.so$', r'.*\.dylib$', r'.*\.xpt$', r'.*binary\.manifest$'])
    addToZip(omni_jar, omni_path, defaults_path)
    addToZip(omni_jar, omni_path, chrome_mfst_path)
    
    omni_jar.close()
    
    # Need to optimize the jar
    optimize_log = open('omni.jar.log', 'w+')
    optimize_log.write('')
    optimize_log.close()
    optimizejars.optimizejar(omni_path, omni_path, 'omni.jar.log')
    
    # Delete files we've jarred
    if delete_files:
        for f in omni_jar.namelist():
            os.remove(os.path.abspath(os.path.join(os.path.split(omni_path)[0], f)))
            
        shutil.rmtree(chrome_path)
        shutil.rmtree(defaults_path)
        
        if len(os.listdir(components_path)) < 1:
            os.rmdir(components_path)
    else:
        # Still need to delete original chrome.manifest
        os.remove(chrome_mfst_path)
    