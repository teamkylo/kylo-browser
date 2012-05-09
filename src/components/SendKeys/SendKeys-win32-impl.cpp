/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#include "SendKeys-impl.h"
#include "nsEmbedString.h"
#include "nsIClassInfoImpl.h"
#include "nsMemory.h"

#include <windows.h>
#include <winuser.h>

#include <iostream>
#include <fstream>



// This mozilla macro defines the nsISupports interface for SendKeys
NS_IMPL_CLASSINFO(SendKeys, NULL, 0, SENDKEYS_CID)
NS_IMPL_ISUPPORTS1_CI(SendKeys, ISendKeys)

SendKeys::SendKeys() {

}

SendKeys::~SendKeys() {

}

/* void key_up (in octet vk); */
NS_IMETHODIMP SendKeys::Key_up(PRUint8 vk) {
	char scanCode = 0;
	keybd_event(vk, scanCode, KEYEVENTF_KEYUP, 0);

	return NS_OK;
}

/* void key_down (in octet vk); */
NS_IMETHODIMP SendKeys::Key_down(PRUint8 vk) {
	char scanCode = 0;
	keybd_event(vk, scanCode, 0, 0);

	return NS_OK;
}

/* void char_up (in char key); */
NS_IMETHODIMP SendKeys::Char_up(PRUnichar key) {
	INPUT input;
	input.type = INPUT_KEYBOARD;
	input.ki.wVk = 0;
	input.ki.wScan = (WCHAR) key;
	input.ki.dwFlags = KEYEVENTF_KEYUP | KEYEVENTF_UNICODE;
	input.ki.time = 0;
	input.ki.dwExtraInfo = 0;

	SendInput(1, &input, sizeof(INPUT));

	return NS_OK;
}


/* void char_down (in char key); */
NS_IMETHODIMP SendKeys::Char_down(PRUnichar key) {
	INPUT input;
	input.type = INPUT_KEYBOARD;
	input.ki.wVk = 0;
	input.ki.wScan = (WCHAR) key;
	input.ki.dwFlags = KEYEVENTF_UNICODE;
	input.ki.time = 0;
	input.ki.dwExtraInfo = 0;

	SendInput(1, &input, sizeof(INPUT));

    return NS_OK;
}

