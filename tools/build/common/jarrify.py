# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
# Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
# trademarks of Hillcrest Laboratories, Inc.
#
#  jarrify.py
#  Kylo
#
#  Created by JT Burgess on 3/8/10.
#  Copyright (c) 2010 Hillcrest Labs, Inc.. All rights reserved.
#

# Args:
#    path to manifest folders
#    name of folder to jar


import build_util
import glob
import os
import re
import shutil
import sys
import zipfile
from build_prefs import Settings

def getLogger():
    return build_util.getLogger("jarrify") 

property 
DELETE_JARRED = True

def relPath(rel):
    return os.path.abspath(os.path.join(module_path, rel))

module_path = os.path.dirname(relPath.func_code.co_filename)

def isExcluded(fileName):
    if fileName == ".hc.copyright.rules":
        return True
    return False

def shutil_on_ro_error(func, path, exc_info):
    """
    Error handler for ``shutil.rmtree``.

    If the error is due to an access error (read only file)
    it attempts to add write permission and then retries.

    If the error is for another reason it re-raises the error.

    Usage : ``shutil.rmtree(path, onerror=onerror)``
    """
    import stat
    if not os.access(path, os.W_OK):
        # Is the error an access error ?
        build_util.chmod_w(path)
        func(path)
    else:
        raise

def addDirToZip(zip, base, dir):
    
    root_len = len(os.path.abspath(base))
    for root, dirs, files in os.walk(dir):
        archive_root = os.path.abspath(root)[root_len:]
        for f in files:
            fullpath = os.path.join(root, f)
            archive_name = os.path.join(archive_root, f)
            zip.write(fullpath, archive_name, zipfile.ZIP_DEFLATED)

def jar(chromeFolder, jarpath, dirs, delete_jarred = DELETE_JARRED):
         
    zip = zipfile.ZipFile(jarpath, 'w', compression=zipfile.ZIP_STORED)
    getLogger().info("*** Create %s" % jarpath)
    for dir in dirs:
        dir = os.path.join(chromeFolder, *dir)
        getLogger().debug("  + Add %s" % dir)
        addDirToZip(zip, chromeFolder, dir)
        
        if delete_jarred:
            getLogger().debug("  - Deleting: " + dir)
            shutil.rmtree(dir, onerror=shutil_on_ro_error)

            
    zip.close()
    
def editManifests(chromeDir, jarFileName, dirs):    
    getLogger().debug("*** Editing manifests for references to " + jarFileName)
    for dir in dirs:
        dir = "/".join(dir)    
    
    for name in glob.glob(os.path.join(chromeDir, "*.manifest")):        
        getLogger().debug("  + Editing manifest: " + name)
        os.chmod(name, 0775)
        
        with open(name, "r") as f: 
            lines = f.readlines()
    
        for idx, line in enumerate(lines):
            if line.strip().startswith("resource"):
                continue
            
            for dir in dirs:
                dir = "/".join(dir)
                line = re.sub("file:/?%s/" % dir, "jar:%s!/%s/" % (jarFileName, dir), line)
                
            lines[idx] = line
        
        with open(name, "w") as f:
            f.writelines(lines)

def jarrify(chromeFolder, jarFileName, dirs):
    """
        Moves files in the specified directories to a jar file, and edits 
        references in chrome manifest files.
        
        chromeFolder - path to chrome folder containing manifest files
        jarFileName - jar file name, e.g. "polo.jar" -- file is written to chromeFolder
        dirs - A list of path-fragment tuples to add to jar file. e.g.: [('polo', 'content'), ('polo', 'locale')]
          
    """
    getLogger().debug("*** Jarrify " + jarFileName)
    
    assert not os.path.join(Settings.prefs.root_dir, "hcrest.ux.polo") in chromeFolder, "Should not jarrify a source folder!" 
    
    jarpath = os.path.join(chromeFolder, jarFileName)
    jar(chromeFolder, jarpath, dirs)    
    editManifests(chromeFolder, jarFileName, dirs)
    
    # try and clean up empty directories
    if DELETE_JARRED:
        for dir in dirs:
            try:
                os.rmdir(os.path.join(chromeFolder, dir[0]))
            except:
                pass
        


def main():
    print "CLI usage unimplemented"

if (__name__ == "__main__"):
    main()

