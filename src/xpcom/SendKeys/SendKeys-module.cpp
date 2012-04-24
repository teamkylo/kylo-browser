/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#include "mozilla/ModuleUtils.h"
#include "nsIClassInfoImpl.h"
#include "SendKeys-impl.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(SendKeys)

NS_DEFINE_NAMED_CID(SENDKEYS_CID);

static const mozilla::Module::CIDEntry kSendKeysCIDs[] = {
	{ &kSENDKEYS_CID, false, NULL, SendKeysConstructor },
    { NULL }
};

static const mozilla::Module::ContractIDEntry kSendKeysContracts[] = {
    { SENDKEYS_CONTRACTID, &kSENDKEYS_CID },
    { NULL }
};

const mozilla::Module SendKeysModule= {
    mozilla::Module::kVersion,
    kSendKeysCIDs,
    kSendKeysContracts,
	NULL
};

NSMODULE_DEFN(SendKeys-module) = &SendKeysModule;
