# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
# Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
# trademarks of Hillcrest Laboratories, Inc.
#
# Script to modify various files to add correct version/build ids
# Note: this script modifies contents to files without checking out from
#       perforce

from build_prefs import Settings
from optparse import OptionParser
import build_util
import os
import sys

_logger = None

def getLogger():
    global _logger
    if _logger is None:
        _logger = build_util.getLogger("build_kylo")
    return _logger


pref_js_path = "defaults/preferences/bundle-prefs.js"

control_file_path = "hcrest.ux.polo.build/linux/kylo-linux-i386/DEBIAN/control"
kylodesktop_path = "hcrest.ux.polo.build/linux/kylo-linux-i386/usr/share/applications/kylo.desktop"

def joinPath(rootDir, file):
    return os.path.normpath(os.path.join(rootDir, file))

def getFilesToChange(rootDir=None):
    if rootDir is None:
        if Settings.prefs is not None:
            rootDir = Settings.prefs.root_dir
        else:
            rootDir = os.path.normpath(os.path.join(os.path.abspath(__file__), '../..'))

    if Settings.platform == 'win32':
        return {
            "pref": os.path.normpath(os.path.join(Settings.prefs.build_dir, pref_js_path)),
            "nsis": joinPath(Settings.prefs.root_output_dir, "installer/win32/nsis/polo.nsi"),
        }
    elif sys.platform == 'darwin':        
        appPath = joinPath(Settings.prefs.dist_dir, "Kylo.app")
        poloAppPath = joinPath(appPath, "Contents/Resources")
        return {
            "pref": os.path.join(poloAppPath, pref_js_path),
            "plist": os.path.join(appPath, "Contents", "Info.plist"), 
        }
        
    elif sys.platform.startswith('linux'):
        ### TODO: The paths haven't been fixed for this yet
        return {
            "pref": joinPath(rootDir, pref_js_path),
            "control": joinPath(rootDir, control_file_path), 
            "desktop": joinPath(rootDir, kylodesktop_path),
        }        
        
    return filesToChange

def revertFiles():
    getLogger().info("Revert files")
    files = getFilesToChange()
    for k, f in files.iteritems():
        cmd = "p4 -p cm.hcrest.com:1666 sync -f " + f
        getLogger().info("Exec: %s", cmd)
        os.system(cmd)
        

def modifyWin32Files(files, buildId, version, versionInts):
    
    nsis_ini_path = files["nsis"]
    
    '''Modify the NSIS script '''
    nsisDefs = [
        '   !define BUILD_ID        "%s"\n' % buildId,
        '   !define VERSION         "%s"\n' % version,
        '   !define VERSION_MAJOR   %s\n'   % versionInts[0],
        '   !define VERSION_MINOR   %s\n'   % versionInts[1],
        '   !define FILE_VERSION	"%s"\n' % version,
    ]

    with file(nsis_ini_path, "r") as nsisFile:
        nsisContents = nsisFile.readlines()

    found = False
    for idx, line in enumerate(nsisContents):
        if "$$VersionInfo$$" in line:
              for line in nsisDefs:
                  idx = idx + 1
                  nsisContents[idx] = line
              found = True
              break
          
    assert found, " ** Could not modify nsis file"
    
    with file(nsis_ini_path, "w") as nsisFile:
        nsisFile.writelines(nsisContents)
    
    getLogger().info(" ** Wrote nsis file")
    

def modifyMacFiles(files, version):
    '''Modify the Mac Info.plist '''
    
    info_plist_path = files["plist"]
    
    getLogger().info(" ** Editing Info.plist [%s]", info_plist_path)
    assert os.path.exists(info_plist_path), "Info.plist does not exist at %s" % info_plist_path
    
    with file(info_plist_path, "r") as infoPlistFile:
        infoPlistContents = infoPlistFile.readlines()
    
    found = False
    for idx, line in enumerate (infoPlistContents):
        if "CFBundleGetInfoString" in line:
            infoPlistContents[idx + 1] = \
                """    <string>%s</string>\n""" % version
            found = True
            break
        
    assert found, " ** Couldn't modify Info.plist file for Mac build"
    
    with file(info_plist_path, "w") as infoPlistFile:
        infoPlistFile.writelines(infoPlistContents)

    getLogger().info(" ** Wrote Info.plist file ")

def modifyLinuxFiles(files, version):
    '''Modify the linux control and kylo.desktop file'''
    
    with file(files["control"], "r") as fileToEdit:
        fileContents = fileToEdit.readlines()
    
    found = False
    for idx, line in enumerate (fileContents):
        if "Version:" in line:
            fileContents[idx] = "Version: %s\n"%version
            found = True
            break
        
    assert found, " ** Couldn't modify control file for linux build" 

    with file(files["control"], "w") as fileToEdit:
        fileToEdit.writelines(fileContents)
    
    getLogger().info(" ** Wrote control file ")
    
    with file(files["desktop"], "r") as fileToEdit:
        fileContents = fileToEdit.readlines()

    found = False
    for idx, line in enumerate (fileContents):
        if "Version=" in line:
            fileContents[idx] = "Version=%s\n"%version
            found = True
            break

    assert found, " ** Couldn't modify kylo.desktop file for linux build"
    
    with file(files["desktop"], "w") as fileToEdit:
        fileToEdit.writelines(fileContents)

    getLogger().info(" ** Wrote kylo.desktop file ")

def modifyPrefsJS(files, version):
    '''Modify the pref js file (user agent) '''
    
    getLogger().info(" ** Add version number to pref file [%s]", files["pref"])
    with file(files["pref"], "r") as prefFile:
        prefContents = prefFile.readlines()

    found = False
    for idx, line in enumerate(prefContents):
        if "$$VersionInfo$$" in line:
              prefContents[idx + 1] = \
                  """pref("general.useragent.extra.polo", "Kylo/%s");\n""" % version
              found = True
              break
    assert found, " ** Could not modify pref file"
    
    with file(files["pref"], "w") as prefFile:
        prefFile.writelines(prefContents)

    getLogger().info(" ** Wrote pref file")

def modifyFiles(buildId, versionId, versionInts):
    """Modify any files required for building on this system.

       Keyword Arguments:
           rootDir - base checkout directory. Must contain hcrest.ux.polo and hcrest.ux.polo.build
    """
    files = getFilesToChange()
    if Settings.prefs.p4Checkout:
        for k, f in files.iteritems():
            cmd = "p4 -p cm:1666 edit " + f
            getLogger().info(cmd)
            os.system(cmd)
    else:
        # make files writable, Hahah F.U. perforce!
        for k, f in files.iteritems():
            getLogger().info(" ** Making %s writable" % f)
            build_util.chmod_w(f)

    modifyPrefsJS(files, versionId)
    if sys.platform == 'darwin':
        modifyMacFiles(files, versionId)
    elif sys.platform == 'win32':
        modifyWin32Files(files, buildId, versionId, versionInts)
    elif sys.platform.startswith('linux'):
        modifyLinuxFiles(files, versionId)


def main(argv=None):
    if argv is None:
        argv = sys.argv
    usage = "python modify-version.py [options] version buildId"
    root_dir = os.path.normpath(os.path.join(os.path.abspath(__file__), '../../..'))
    parser = OptionParser(usage=usage)
    parser.set_defaults(p4Checkout = False)
    parser.set_defaults(root_dir = root_dir)
    parser.set_defaults(revert = False)

    parser.add_option("--revert",
                      action="store_true",
                      dest="revert",
                      help="Undo changes")

    parser.add_option("--checkout",
                      action="store_true",
                      dest="p4Checkout",
                      help="Check out from perforce instead of just overwriting permissions")

    parser.add_option("--root_dir",
                      dest="root_dir",
                      type="string",
                      help="Change the root directory. Must contain hcrest.ux.polo and hcrest.ux.polo.build")

    (options, args) = parser.parse_args()
    #print options

    if options.revert:
        revertFiles()
        return 0

    if len(args) != 2:
        parser.error("modify_version requires a version and a build-id")

    Settings.prefs = options

    version = args[0]
    buildId = args[1]
    versionInts = version.split(".")

    modifyFiles(buildId, version, versionInts)

if __name__ == "__main__":
    sys.exit(main())
