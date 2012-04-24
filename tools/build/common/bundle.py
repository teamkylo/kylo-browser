# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
# Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
# trademarks of Hillcrest Laboratories, Inc.

from build_prefs import Settings
import build_util
import jarrify
import os
import shutil


_logger = None

def getLogger():
    global _logger
    if _logger is None:
        _logger = build_util.getLogger("build_kylo")
    return _logger

def writeLanguagePref(lang, poloDir = None):
    if poloDir is None:
        poloDir = Settings.prefs.polo_output_dir
    path = os.path.join(poloDir, "defaults", "preferences", "locale-pref.js")
    getLogger().info("Setting [%s] to %s", path, lang)
            
    with open(build_util.chmod_w(path), "w") as f:
        f.write("""\
pref("general.useragent.locale", "%s");
""" % lang)
        
def makeLangJars(spec, langs = None):
    if langs is None:
        langs = Settings.prefs.langs
    
    logger = getLogger();
    logger.info("Making language jars [%s]" % " ".join(langs))
    
    lang_base_src = os.path.join(Settings.prefs.root_dir, "hcrest.ux.polo.bundles", "l10n", "translated")
    lang_base_dest = Settings.prefs.lang_directory
    
   
    for lang in langs:
        logger.info("Creating language pack for %s" % lang)
        lang_src = os.path.join(lang_base_src, lang)
        assert os.path.exists(lang_src), "No translations files for %s found" % lang 

        lang_base_dest_xr = os.path.join(lang_base_dest, lang, "xulrunner")
        lang_base_dest_polo = os.path.join(lang_base_dest, lang, "polo")
        
        if not os.path.exists(lang_base_dest_xr):
            os.makedirs(lang_base_dest_xr)
            
        if not os.path.exists(lang_base_dest_polo):
            os.makedirs(lang_base_dest_polo)
        
        xrJarDest = os.path.join(lang_base_dest_xr, "%s.jar" % lang)
        xrSrcBasePath = os.path.join(lang_src, "runtime")
        chromeDir = os.path.join(Settings.prefs.polo_output_dir, "chrome")
        
        # first create a xulrunner lang jar based on the unpacked firefox jar files
        logger.debug("Making [%s]" % xrJarDest)
        jarrify.jar(xrSrcBasePath, xrJarDest, [("locale",)], delete_jarred = False)        
        
        # copy the original firefox manifest as xr-lang.manifest
        xrManifestDest = os.path.join(lang_base_dest_xr, "%s.manifest" % lang)
        shutil.copy(os.path.join(xrSrcBasePath, "%s.manifest" % lang), build_util.chmod_w(xrManifestDest))
        
        # fix the manifest paths
        jarrify.editManifests(lang_base_dest_xr, "%s.jar" % lang, [("locale",)])
        
        # start work on the hillcrest translated text        
        poloJarDest = os.path.join(lang_base_dest_polo, "%s.jar" % lang)
        logger.debug("Making [%s]" % poloJarDest)
        
        # use the spec for en-US.jar when creating lang.jar 
        jarrify.jar(os.path.join(lang_src), poloJarDest, spec["en-US.jar"], delete_jarred = False)
        
        # copy the en-US manifest 
        manifestSrc = os.path.join(chromeDir, "en-US.manifest")
        manifestDest = os.path.join(lang_base_dest_polo, "%s.manifest" % lang)
        shutil.copy(manifestSrc, build_util.chmod_w(manifestDest))
        
        # switch "en-US" to lang        
        with open(manifestDest, "r") as f:
            contents = f.read()
        
        with open(build_util.chmod_w(manifestDest), "w") as f:
            f.write(contents.replace("en-US", lang))
        
        # edit manifests to jar: spec
        jarrify.editManifests(lang_base_dest_polo, "%s.jar" % lang, spec["en-US.jar"])
        