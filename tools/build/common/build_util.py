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
import stat
import subprocess
import time

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

def RMFail(function, path, excinfo):
    function(chmod_w(path))        

def chmod_w(path):
    if os.path.exists(path):
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
    args = ("-s", "-f", "-c")
    if purge:
        args = args + ("-p",)
    if len(exclude) > 0:
        for x in exclude:
            args = args + ("-x",x)
    args = args + (dir_in, dir_out)
    copier.parse_args(args)
    copier.do_work()
    
    if force_write:
        for root, dirs, files in os.walk(dir_out):
            for f in files:
                chmod_w(os.path.join(root, f))
        

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