/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#ifndef __SENDKEYS_IMPL_H__
#define __SENDKEYS_IMPL_H__

#include "ISendKeys.h"
#ifdef WIN32
#include "nsStringAPI.h"
#endif

#include <iostream>
#include <fstream>

#define SENDKEYS_CONTRACTID "@hcrest.com/sendKeys;1"
#define SENDKEYS_CLASSNAME "Hillcrest Win32 Key Stroke Generation Module"
// {7FC711F9-B34D-43c8-8E6C-E9701E6BE1BC}
#define SENDKEYS_CID { 0x7fc711f9, 0xb34d, 0x43c8, { 0x8e, 0x6c, 0xe9, 0x70, 0x1e, 0x6b, 0xe1, 0xbc } }

class SendKeys : public ISendKeys {
public:
	NS_DECL_ISUPPORTS
	NS_DECL_ISENDKEYS

	SendKeys();

private:
	~SendKeys();

protected:
};

#endif
