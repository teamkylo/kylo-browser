/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *  
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc. 
 * */
 
#include "SendKeys-impl.h"
#include "nsIClassInfoImpl.h"
#include "nsMemory.h"

#include <iostream>
#include <fstream>

#include <CoreFoundation/CoreFoundation.h>
#include <Carbon/Carbon.h>


// This mozilla macro defines the nsISupports interface for SendKeys
//NS_IMPL_ISUPPORTS1(SendKeys, ISendKeys)
NS_IMPL_CLASSINFO(SendKeys, NULL, 0, SENDKEYS_CID)
NS_IMPL_ISUPPORTS1_CI(SendKeys, ISendKeys)

enum WINDOWS_KEYS {
    BKSP = 0x08,
	TAB = 0x09,
	ENTER = 0x0D,	
	SHIFT = 0x10,
	SPACE = 0x20,
};

SendKeys::SendKeys() {
#if _DEBUG
    printf("printin'\n");
#endif
}

SendKeys::~SendKeys() {
#if _DEBUG
#endif
}

void convertAndSendVK(PRUint8 vk, bool down) {
    CGKeyCode key = 0;
    
    // Hack
    usleep(100);
    
    switch (vk) {
        case SPACE:
            key = kVK_Space;
            break;
        case BKSP:
            key = kVK_Delete;
            break;
        case TAB:
            key = kVK_Tab;
            break;
        case ENTER:
            key = kVK_Return;
            break;
        case SHIFT:
            key = kVK_Shift;
            break;
        default:
            return;
    }
    
	CGEventRef event;
    CGEventSourceRef eventSource = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
    event = CGEventCreateKeyboardEvent (eventSource, key, down);
    CGEventPost(kCGHIDEventTap, event);
    CFRelease(eventSource);
    CFRelease(event);
}

/* void key_up (in octet vk); */
NS_IMETHODIMP SendKeys::Key_up(PRUint8 vk) {
#if _DEBUG
    printf("VKey Up: %d\n", vk);
#endif
    convertAndSendVK(vk, false);

	return NS_OK;
}

/* void key_down (in octet vk); */
NS_IMETHODIMP SendKeys::Key_down(PRUint8 vk) {
#if _DEBUG
    printf("VKey Down: %d\n", vk);
#endif
    convertAndSendVK(vk, true);
	return NS_OK;
}

/* void char_up (in char key); */

NS_IMETHODIMP SendKeys::Char_up(PRUnichar key) {
#if _DEBUG
    printf("charUp: %c (%d)\n", key, key);
#endif
    UniChar letter = key;
    
	CGEventRef event;
    CGEventSourceRef eventSource = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
    event = CGEventCreateKeyboardEvent (eventSource, 1, false);
    CGEventKeyboardSetUnicodeString(event, 1, &letter);
    CGEventPost(kCGHIDEventTap, event);
    CFRelease(event);
    CFRelease(eventSource);

	return NS_OK;
}


/* void char_down (in char key); */
NS_IMETHODIMP SendKeys::Char_down(PRUnichar key) {
#if _DEBUG
    printf("charDown: %c (%d)\n", key, key);
#endif
    UniChar letter = key;
	CGEventRef event;
    CGEventSourceRef eventSource = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
    event = CGEventCreateKeyboardEvent (eventSource, 1, true);
    CGEventKeyboardSetUnicodeString(event, 1, &letter);
    CGEventPost(kCGHIDEventTap, event);
    CFRelease(event);
    CFRelease(eventSource);

    return NS_OK;
}
