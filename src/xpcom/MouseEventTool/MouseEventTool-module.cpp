/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#include "mozilla/ModuleUtils.h"
#include "nsIClassInfoImpl.h"
#include "MouseEventTool.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(MouseEventTool)

NS_DEFINE_NAMED_CID(MOUSEEVENTTOOL_CID);

/*static nsModuleComponentInfo components[] =
{
    {
        MOUSEEVENTTOOL_CLASSNAME, 
        MOUSEEVENTTOOL_CID,
        MOUSEEVENTTOOL_CONTRACTID,
        MouseEventToolConstructor,
    }
};*/

static const mozilla::Module::CIDEntry kMouseEventToolCIDs[] = {
    { &kMOUSEEVENTTOOL_CID, false, NULL, MouseEventToolConstructor},
    { NULL }
};

static const mozilla::Module::ContractIDEntry kMouseEventToolContracts[] = {
    { MOUSEEVENTTOOL_CONTRACTID, &kMOUSEEVENTTOOL_CID },
    { NULL }
};

const mozilla::Module MouseEventToolModule= {
    mozilla::Module::kVersion,
    kMouseEventToolCIDs,
    kMouseEventToolContracts,
    NULL
};

NSMODULE_DEFN(MouseEventTool-module) = &MouseEventToolModule;

//NS_IMPL_NSGETMODULE("MouseEventToolModule", components) 

