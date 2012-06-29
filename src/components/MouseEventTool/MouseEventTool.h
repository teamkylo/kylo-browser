/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#ifndef _MOUSEEVENTTOOLXPC_H_
#define _MOUSEEVENTTOOLXPC_H_

#include "IMouseEventTool.h"
#include "nsCOMPtr.h"
#include <vector>

#define MOUSEEVENTTOOL_CONTRACTID "@hcrest.com/MouseEventTool;1"
#define MOUSEEVENTTOOL_CLASSNAME "Hillcrest MouseEventTool Module"
// {185DA900-2844-42df-9D56-6478510089E8}
#define MOUSEEVENTTOOL_CID { 0x185da900, 0x2844, 0x42df, { 0x9d, 0x56, 0x64, 0x78, 0x51, 0x0, 0x89, 0xe8 } }

#ifdef WIN32
#include "nsStringAPI.h"
#include <utility>
#include <string>
#include <iostream>
#include <fstream>
#include "windows.h"

typedef std::pair<std::string, short> AppSignalPair;
typedef std::vector<AppSignalPair> AppSignalPairVec;
#else //WIN32
#ifdef __APPLE__
#import <Carbon/Carbon.h>
#else //__APPLE
// LINUX:
#include "nsIThread.h"
#endif //__APPLE__
#endif //WIN32

enum wMessages {
    ENUM_LBUTTONDOWN,
    ENUM_LBUTTONUP,
    ENUM_LBUTTONDBLCLK,
    ENUM_RBUTTONDOWN,
    ENUM_RBUTTONUP,
    ENUM_RBUTTONDBLCLK,
    ENUM_KEYDOWN,
    ENUM_KEYUP,
    ENUM_MBUTTONDOWN,
    ENUM_MBUTTONUP,
    ENUM_MBUTTONDBLCLK,
    ENUM_MOUSEWHEEL,
    NUM_WM_MESSAGES,
};

/* Header file */
class MouseEventTool : public IMouseEventTool
{
public:
    NS_DECL_ISUPPORTS
    NS_DECL_IMOUSEEVENTTOOL

    MouseEventTool();

#ifdef WIN32
    static LRESULT WINAPI MouseHookProc(int nCode, WPARAM wParam, LPARAM lParam);
    // Returns true if the event is handled
    bool HandleMouseEvent(WPARAM wParam, LPARAM lParam);
#endif
    
#ifdef __APPLE__

    static CGEventRef myCGEventCallback(CGEventTapProxy proxy, CGEventType type,  CGEventRef event, void *refcon);
    
    bool HandleMouseEvent(CGEventType type, CGEventRef event);
#endif
private:
    ~MouseEventTool();
    
    nsCOMPtr<MouseEventCallback> mouseEventCallback_;
    
    bool shouldMakeFullScreenOrNot_;
    
#ifdef WIN32
    // Remappings:
    // Defines an application and an output event
    AppSignalPairVec* remapping_;
    
    AppSignalPairVec* getVecFromInputValue(short input);
    
    POINT prevMousePoint_;
#else	
#ifdef __APPLE__

    static CFMachPortRef eventTap_;

    short buttonMapping_[NUM_WM_MESSAGES];
    
	CFNumberRef windowNumber_;
    
    bool isFullScreen_;
    
    void getMainWindowNumber();
    bool isFullScreenWindow();
    bool isMinimized();
    pid_t getPid();
    
    void attachEventHandler(CFNumberRef windowRef);
    
    int prevX_, prevY_;
#else //__APPLE__
    // Must be linux

    nsCOMPtr<nsIThread> thread_;
#endif //__APPLE__
#endif // WIN32
protected:
    void AddHook();
    void RemoveHook();
};


#endif
