# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
# Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
# trademarks of Hillcrest Laboratories, Inc.

""" Utilities for Kylo Build scripts """

from build_prefs import Settings
import pyrobocopy
import errno
import logging
import os
import math
import stat
import subprocess
import time
import shutil
import re

LOG_LEVELS = {'debug': logging.DEBUG,
              'info': logging.INFO,
              'warning': logging.WARNING,
              'error': logging.ERROR,
              'critical': logging.CRITICAL}

def getLogLevel(level):
    return LOG_LEVELS.get(level, logging.NOTSET)

def getLogger(loggerName):
    # Logger
    logger = logging.getLogger("build_kylo")
    if len(logger.handlers) > 0:
        return logger
    logfile = None
    if Settings.prefs is not None:
        logger.setLevel(getLogLevel(Settings.prefs.verbosity))
        logfile = Settings.prefs.logfile
    # Formatter
    formatter = logging.Formatter("%(asctime)s - %(filename)s - %(levelname)s - %(message)s")
    # Handler
    if logfile is not None:
        handler = logging.FileHandler(logfile, 'w')
    else:
        handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

def stopLogging():
    logging.shutdown()

class StreamLogger(object):

    def __init__(self, stream, logger, prefix=''):
        self.stream = stream
        self.logger = logger
        self.prefix = prefix
        self.data = ''

    def write(self, data):
        self.data += data
        tmp = str(self.data)
        if '\x0a' in tmp or '\x0d' in tmp:
            tmp = tmp.rstrip('\x0a\x0d')
            self.logger.info('%s%s' % (self.prefix, tmp))
            self.data = ''
            
class VersionFormat(object):
    # Version numbers are screwy. 
    #
    # version = The "complete" version number
    #    Can have alphanumeric values and will contain full revision data. This
    #    is the version that Kylo uses to identify itself to the update servers.
    #
    # win = Windows format version number
    #    Windows expects version numbers in the format x.x.x.x (Major, Minor, 
    #    Build, Revision), where x is an integer value. This version only
    #    applies to the NSIS installer. We will strip non-numerical values from
    #    the complete version to get this number.
    #
    # display = "Display" version number
    #    This is the first three version numbers (Major, Minor, Build). It can
    #    have alphanumeric values.
    
    def __init__(self, version=None):
        if version is None:
            self.full = Settings.config.get("App", "Version")
        else:
            self.full = version
        
        # First, strip off any trailing "-xxxx" revision numbers (ie. 1.1b2.1.1-abcdef -> 1.1b2.1.1)
        self.stripped = re.sub("([^-]+)-.*", self.__replVersion, self.full)
        
        # Second, remove any alpha, beta, etc. tags (ie. 1.1b2.1.1 -> 1.1.1.1) 
        self.num = re.sub("(\d+)[a-zA-Z]+\d*", self.__replVersion, self.stripped)
          
        # Array of integers    
        self.ints = [int(x) for x in self.num.split(".")[:4]]
        
        # Display version
        self.display = ".".join(str(x) for x in self.ints[:3])
        
        # Win version
        self.win = "%s.0" % self.display
        
        # Display with alpha/beta tags
        self.displayTagged = ".".join(x for x in self.stripped.split(".")[:3])        
    
    def __replVersion(self, m):
        return m.group(1)

def RMFail(function, path, excinfo):
    function(chmod_w(path))        

def chmod_w(path, doCheck=False):
    if os.path.exists(path):
        if doCheck and \
            os.stat(path).st_mode & stat.S_IWRITE:
                return path
            
        os.chmod(path, os.stat(path).st_mode | stat.S_IWRITE)
    
    return path

def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError, exc: # Python >2.5
        if exc.errno == errno.EEXIST:
            pass
        else: raise

def syncDirs(dir_in, dir_out, purge=True, force_write=False, exclude=[]):
    copier = pyrobocopy.PyRobocopier()
    args = ("-s", "-f", "-c", "-m", "--verbose=1")
    if purge:
        args = args + ("-p",)
    if len(exclude) > 0:
        for x in exclude:
            args = args + ("-x",x)
    args = args + (dir_in, dir_out)
    copier.parse_args(args)
    copier.do_work()
    
    ret = copier.report()
    
    if force_write:
        for root, dirs, files in os.walk(dir_out):
            for f in files:
                chmod_w(os.path.join(root, f), doCheck=True)
                
    return ret
        
def syncFile(file_in, dir_out, force_write=False):
    file_out = os.path.join(dir_out, os.path.basename(file_in))
    
    src_is_newer = True;
    
    if os.path.exists(file_out):
        # File already exists, check timestamps
        src_is_newer = False;
        
        src_mt = os.path.getmtime(file_in)
        trg_mt = os.path.getmtime(file_out)
        
        if os.stat_float_times():
            src_mt = math.fabs(src_mt)
            trg_mt = math.fabs(trg_mt)
            diff = math.fabs(src_mt - trg_mt)
            
            if diff > 1:
                src_is_newer = True
        else:
            src_is_newer = (src_mt > trg_mt)

    if src_is_newer:
        shutil.copy2(file_in, dir_out)
        if force_write:
            chmod_w(os.path.join(dir_out, os.path.basename(file_in)))
            
    return src_is_newer

def signExe(path, logger):
    if "SIGNTOOL_PATH" in os.environ:
        if not os.path.exists(path):
            logger.error("... file to sign is missing: %s", path)
            
        signtool_bat = os.path.normpath(os.path.join(os.environ["SIGNTOOL_PATH"], "run_signtool.bat"))
         
        cmd = [signtool_bat, path]
        logger.info("... Signing: %s", path)
        runSubprocess(cmd, logger)
    else:
        logger.info("... SIGNTOOL_PATH not defined. Skipping sign for: %s", path)

def runSubprocess(arguments, logger, **kwargs):
    logger.info("Running:  " + " ".join(arguments))
    
    start = time.time()
    proc = subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize = kwargs.get("bufsize", -1), **kwargs)
    logger.debug("Done executing %s", time.time() - start)    
    while proc.returncode is None:
        (out, error) = proc.communicate()            
        if out:
            logger.info(">>> " + out)
        if error:
            logger.warning(">>> " + error)
    logger.debug("Returned, and done logging %s", time.time() - start)
    
    if proc.returncode:
        logger.error("script returned with: %i" %proc.returncode)
        raise Exception("script returned with: %i" %proc.returncode)
    
    return proc.returncode