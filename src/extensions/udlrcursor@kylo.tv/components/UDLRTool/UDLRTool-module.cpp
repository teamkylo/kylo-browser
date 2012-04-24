/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved.
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are
 * trademarks of Hillcrest Laboratories, Inc.
 * */

#include "mozilla/ModuleUtils.h"
#include "nsIClassInfoImpl.h"
#include "UDLRTool.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(UDLRTool)

NS_DEFINE_NAMED_CID(UDLRTOOL_CID);

static const mozilla::Module::CIDEntry kUDLRToolCIDs[] = {
	{ &kUDLRTOOL_CID, false, NULL, UDLRToolConstructor},
    { NULL }
};

static const mozilla::Module::ContractIDEntry kUDLRToolContracts[] = {
    { UDLRTOOL_CONTRACTID, &kUDLRTOOL_CID },
    { NULL }
};

const mozilla::Module UDLRToolModule= {
    mozilla::Module::kVersion,
    kUDLRToolCIDs,
    kUDLRToolContracts,
	NULL
};

NSMODULE_DEFN(UDLRTool-module) = &UDLRToolModule;
