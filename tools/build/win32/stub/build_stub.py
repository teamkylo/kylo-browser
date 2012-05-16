# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
# Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
# trademarks of Hillcrest Laboratories, Inc.

#
# Script to compile a .res file and subst it in xulrunner-stub.exe
#

from common import build_util
from common.build_prefs import Settings
import shutil
import os
import sys

_logger = None

def getLogger():
    global _logger
    if _logger is None:
        _logger = build_util.getLogger("build_kylo")
    return _logger


def relPath(*args):
    rel = os.path.join(*args)
    return os.path.abspath(os.path.join(module_path, rel))

module_path = os.path.dirname(relPath.func_code.co_filename)

def main(version, buildId, temp_dir = None, stub_dir = None):
    logger = getLogger()
    logger.info("Begin creating personalized xulrunner stub")
    
    if temp_dir is None:
        temp_dir = module_path
    
    if stub_dir is None:
        polo_exe_path = os.path.join(temp_dir, "Kylo.exe")
    else:
        polo_exe_path = os.path.join(stub_dir, "Kylo.exe")
        
    # executable paths
    rc_exe = os.path.normpath(Settings.config.get("env","RC"))
    reshacker_exe = os.path.normpath(Settings.config.get("env","RESHACKER"))
    
    # source files
    xulrunner_stub_path = os.path.normpath(os.path.join(Settings.prefs.xul_dir, "xulrunner-stub.exe"))
    polo_ico_path = relPath("../resources/Kylo.ico")
    
    #intermediate files
    params_rc_path = os.path.join(temp_dir, "temp.params.rc")
    params_res_path = os.path.join(temp_dir, "temp.params.res")
    reshacker_ini_path  = os.path.join(temp_dir, "temp.reshacker.ini")
    reshacker_log_path  = os.path.join(temp_dir, "temp.reshacker.log")
    
    rc_file_template = """
    1 VERSIONINFO
     FILEVERSION %(FileVersion_Ints)s
     PRODUCTVERSION %(ProductVersion_Ints)s
     FILEOS 0x4
     FILETYPE 0x2
    BEGIN
        BLOCK "StringFileInfo"
        BEGIN
            BLOCK "000004B0"
            BEGIN
                VALUE "Comments", %(Comments)s
                VALUE "LegalCopyright", %(LegalCopyright)s
                VALUE "CompanyName", %(CompanyName)s
                VALUE "FileDescription", %(FileDescription)s
                VALUE "FileVersion", %(FileVersion)s
                VALUE "ProductVersion", %(ProductVersion)s
                VALUE "InternalName", %(InternalName)s
                VALUE "LegalTrademarks", %(LegalTrademarks)s
                VALUE "OriginalFilename", %(OriginalFilename)s
                VALUE "ProductName", %(ProductName)s
                VALUE "BuildID", %(BuildID)s
            END
        END
        BLOCK "VarFileInfo"
        BEGIN
            VALUE "Translation", 0x0000 0x04B0
        END
    END
    """

    reshack_script_template = """\
[FILENAMES]
Exe=%(xulrunner_stub_path)s
SaveAs=%(polo_exe_path)s
Log=%(reshacker_log_path)s
[COMMANDS]
-addoverwrite %(params_res_path)s,,,
-add %(polo_ico_path)s,icon,MAINICON,
"""
    #%(polo_ico_path)s %(params_res_path)s

    version = build_util.VersionFormat(version=version)

    versionInts = version.ints

    while len(versionInts) < 4:
        versionInts.append(0)
    versionInts = ",".join(str(x) for x in versionInts)
    
    fileVersion_ints = version.win.replace(".",",")

    params = {
        "ProductVersion_Ints": versionInts,
        "ProductVersion": r'"%s"' % version.full,
        "BuildID": r'"%s"' % buildId,

        "FileVersion": r'"%s"' % version.displayTagged,
        "FileVersion_Ints": "%s" % fileVersion_ints,

        "FileDescription": r'"The Kylo Browser"',
        "LegalCopyright": r'"Copyright (c) 2010 Hillcrest Labs, Inc"',
        "CompanyName": r'"Hillcrest Labs, Inc."',
        "InternalName": r'"Kylo"',
        "LegalTrademarks": r'"Kylo and Kylo logos are trademarks of Hillcrest Laboratories, Inc.  All rights Reserved."',
        "ProductName": r'"Hillcrest Labs Kylo Browser"',
        "Comments": r'"The Kylo Browser built with Mozilla xulrunner framework"',

        "OriginalFilename": r'"Kylo.exe"',
    }
    
    
    # output the rc file
    logger.info("Writing _params.rc [%s]", params_rc_path)
    with file(params_rc_path, "w") as out:
        out.writelines(rc_file_template % params)

    cmd = [rc_exe, "/v", "/l", "0", params_rc_path] 
    build_util.runSubprocess(cmd, logger)

    logger.info("Writing reshack.ini [%s]", reshacker_ini_path)
    with file(reshacker_ini_path, "w") as out:
        out.writelines(reshack_script_template % locals())
    
    logger.info("Running reshacker; writing stub to [%s]", polo_exe_path)
    cmd = [reshacker_exe, "-script", reshacker_ini_path]
    build_util.runSubprocess(cmd, logger)
    
    assert os.path.exists(polo_exe_path), "Executable not at expected location"
    logger.info("Done creating xulrunner stub .exe [%s]", polo_exe_path)
    
    logger.info("Cleaning up...")
    shutil.rmtree(temp_dir, ignore_errors=False, onerror=build_util.RMFail)

    logger.info("Attempting to sign application...")
    build_util.signExe(polo_exe_path, logger)

if __name__ == '__main__':
    # read the params in
    if len(sys.argv) != 3:
        print " !! Bad params!"
        exit(-1);

    version = sys.argv[1]
    buildId = sys.argv[2]
    main(version, buildId)
