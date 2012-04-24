/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#include "MouseEventTool.h"
#include "nsIClassInfoImpl.h"
#include "nsMemory.h"
//#include "nsEmbedString.h"

#import <Carbon/Carbon.h>
#include <ApplicationServices/ApplicationServices.h>

static MouseEventTool* myself;
CFMachPortRef MouseEventTool::eventTap_;

/* Implementation file */
NS_IMPL_CLASSINFO(MouseEventTool, NULL, 0, MOUSEEVENTTOOL_CID)
NS_IMPL_ISUPPORTS1_CI(MouseEventTool, IMouseEventTool)
//NS_IMPL_ISUPPORTS1(MouseEventTool, IMouseEventTool)

enum WinEvents {
    WIN_MOUSE_MOVE = 512,
    WIN_LEFT_DOWN = 513,
    WIN_LEFT_UP = 514,
    WIN_MIDDLE_DOWN = 519,
    WIN_MIDDLE_UP = 520,
    WIN_RIGHT_DOWN = 516,
    WIN_RIGHT_UP = 517,
    WIN_SCROLL_WHEEL = 522
};

int macEventToWindowsEventType(CGEventType macEvent) {
    switch (macEvent) {
        case kCGEventRightMouseUp:
            return WIN_RIGHT_UP;
        case kCGEventRightMouseDown:
            return WIN_RIGHT_DOWN;
        case kCGEventLeftMouseUp:
            return WIN_LEFT_UP;
        case kCGEventLeftMouseDown:
            return WIN_LEFT_DOWN;
        case kCGEventLeftMouseDragged:
        case kCGEventMouseMoved:
            return WIN_MOUSE_MOVE;
        case kCGEventOtherMouseDown:
            return WIN_MIDDLE_DOWN;
        case kCGEventOtherMouseUp:
            return WIN_MIDDLE_UP;
        case kCGEventScrollWheel:
            return WIN_SCROLL_WHEEL;
        default:
            return -1;
    }
}

int winEventToEnum(int winEvent) {
    switch (winEvent) {
        case WIN_LEFT_DOWN:
            return ENUM_LBUTTONDOWN;
        case WIN_LEFT_UP:
            return ENUM_LBUTTONUP;
        case WIN_RIGHT_UP:
            return ENUM_RBUTTONUP;
        case WIN_RIGHT_DOWN:
            return ENUM_RBUTTONDOWN;
        case WIN_MIDDLE_DOWN:
            return ENUM_MBUTTONDOWN;
        case WIN_MIDDLE_UP:
            return ENUM_MBUTTONUP;
        case WIN_SCROLL_WHEEL:
            return ENUM_MOUSEWHEEL;
        default:
            return -1;
    }
}

int macEventToEnum(CGEventType macEvent) {
    switch (macEvent) {
        case kCGEventRightMouseUp:
            return ENUM_RBUTTONUP;
        case kCGEventRightMouseDown:
            return ENUM_RBUTTONDOWN;
        case kCGEventLeftMouseUp:
            return ENUM_LBUTTONUP;
        case kCGEventLeftMouseDown:
            return ENUM_LBUTTONDOWN;
        case kCGEventOtherMouseDown:
            return ENUM_MBUTTONDOWN;
        case kCGEventOtherMouseUp:
            return ENUM_MBUTTONUP;
        case kCGEventScrollWheel:
            return ENUM_MOUSEWHEEL;
        default:
            return -1;
    }
}
//
//void MouseEventTool::attachEventHandler(CFNumberRef windowRef) {
////    EventTypeSpec      myEventSpec[] = {
////        {kEventClassWindow, kEventWindowDeactivated},
////        {kEventClassWindow, kEventWindowClose}
////    };
////    
////    if (gWinEventHandlerUPP != NULL)
////        InstallWindowEventHandler(windowRef, gWinEventHandlerUPP, GetEventTypeCount(myEventSpec), myEventSpec, this, NULL);
////    
//}
//
//void printWindowRefs() {
//    WindowRef wind = GetFrontWindowOfClass(kAllWindowClasses, true);
//    
//    WindowRef userFocux = GetUserFocusWindow();
//    while (IsValidWindowPtr(wind)) {
//        WindowAttributes attrs;
//        OSStatus err = GetWindowAttributes(wind, &attrs);
//      
//    
//        if (IsWindowActive(wind)) {
//        }
//        
//        CFStringRef title;
//        
//        err = CopyWindowTitleAsCFString (wind, &title);
//    
//        wind = GetNextWindow(wind);
//    }
//}
//

MouseEventTool::MouseEventTool() {
    isFullScreen_ = false;
   // printWindowRefs();

    
    for (int i = 0; i < NUM_WM_MESSAGES; ++i) {
        buttonMapping_[i] = -1;
    }
    prevX_ = -1;
    prevY_ = -1;
    
	windowNumber_ = NULL;
    AddHook();
}

MouseEventTool::~MouseEventTool() {
    RemoveHook();
}

void printCFString(FILE* f, CFStringRef formatString, ...) {
    CFStringRef resultString;
    CFDataRef data;
    va_list argList;
    
    va_start(argList, formatString);
    resultString = CFStringCreateWithFormatAndArguments(NULL, NULL,
                                                        formatString, argList);
    va_end(argList);
    
    data = CFStringCreateExternalRepresentation(NULL, resultString,
                                                CFStringGetSystemEncoding(), '?');
    
    if (data != NULL) {
        fprintf (f, "%.*s\n\n", (int)CFDataGetLength(data),
                CFDataGetBytePtr(data));
        CFRelease(data);
    }
    CFRelease(resultString);
}

pid_t MouseEventTool::getPid() {
    pid_t pid;
    ProcessSerialNumber proc;
    OSStatus err;
    err = GetCurrentProcess(&proc);
    if (err) {
        return -1;
    }
    
    err = GetProcessPID(&proc, &pid);
    if (err) {
        return -1;
    }

    return pid;
}

void MouseEventTool::getMainWindowNumber() {
    pid_t pid = getPid();

    if (windowNumber_ == NULL) {
        // Get the windowNumber of the main window
        CFArrayRef windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
        for (int i = 0; i < CFArrayGetCount(windows); ++i) {
            CFDictionaryRef windInfo = (CFDictionaryRef) CFArrayGetValueAtIndex(windows, i);
            
            // We'll know if it's this process because it has the same PID as us, and it's got a name.
            int windowPid;
            CFNumberRef windowPidRef = (CFNumberRef) CFDictionaryGetValue(windInfo, kCGWindowOwnerPID);
            CFNumberGetValue(windowPidRef, kCFNumberIntType, &windowPid);
            if (windowPid == pid) {                CFStringRef windName;
                bool val = CFDictionaryGetValueIfPresent(windInfo, kCGWindowName, (const void**) &windName);
                if (val) {
                    // Store the window number so it's easier to do searches in the future.
                    CFNumberRef windNum = (CFNumberRef) CFDictionaryGetValue(windInfo, kCGWindowNumber);
                    windowNumber_ = windNum;
                    break;
                }
            }
        }
    }
}

bool MouseEventTool::isMinimized() {
    if (windowNumber_ == NULL) {
        getMainWindowNumber();
    }

    // If windowNumber_ is still NULL, we don't have the main window
    if (windowNumber_ == NULL) {
        return false;
    }
    
    SInt32 windNumVal;
    CFNumberGetValue(windowNumber_, kCFNumberSInt32Type, &windNumVal);
    
    
    CFArrayRef windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenAboveWindow | kCGWindowListOptionIncludingWindow | kCGWindowListExcludeDesktopElements, windNumVal);
    int count = CFArrayGetCount(windows);
    
    pid_t pid = getPid();

    // Start at 1 to ignore our own window
    for (int i = 0; i < count; ++i) {
        CFDictionaryRef windInfo = (CFDictionaryRef) CFArrayGetValueAtIndex(windows, i);
        // We have the full screen window if the pid is the same as ours, but there is no name
        
        int windowPid;
        CFNumberRef windowPidRef = (CFNumberRef) CFDictionaryGetValue(windInfo, kCGWindowOwnerPID);
        CFNumberGetValue(windowPidRef, kCFNumberIntType, &windowPid);
        if (windowPid == pid) {
            
            CFBooleanRef windowHiddenRef = (CFBooleanRef) CFDictionaryGetValue(windInfo, kCGWindowIsOnscreen);
            bool onScreen = CFBooleanGetValue(windowHiddenRef);
            if (!onScreen) {
                return true;
            }
        }
    }
    return false;
}

bool MouseEventTool::isFullScreenWindow() {
    if (windowNumber_ == NULL) {
        getMainWindowNumber();
    }
    
    // If windowNumber_ is still NULL, we don't have the main window
    if (windowNumber_ == NULL) {
        return false;
    }
    
    SInt32 windNumVal;
    CFNumberGetValue(windowNumber_, kCFNumberSInt32Type, &windNumVal);
    
    
    CFArrayRef windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenAboveWindow | kCGWindowListOptionIncludingWindow | kCGWindowListExcludeDesktopElements, windNumVal);
    int count = CFArrayGetCount(windows);
    if (count == 1) {
        // Only 1 window - it's gotta be our main window, thus NOT full screen
        return false;
    }

    pid_t pid = getPid();

    // Start at 1 to ignore our own window
    for (int i = 1; i < count; ++i) {
        CFDictionaryRef windInfo = (CFDictionaryRef) CFArrayGetValueAtIndex(windows, i);
        // We have the full screen window if the pid is the same as ours, but there is no name
        
        int windowPid;
        CFNumberRef windowPidRef = (CFNumberRef) CFDictionaryGetValue(windInfo, kCGWindowOwnerPID);
        CFNumberGetValue(windowPidRef, kCFNumberIntType, &windowPid);
        if (windowPid == pid) {
           // CFStringRef windName;
           // bool val = CFDictionaryGetValueIfPresent(windInfo, kCGWindowName, (const void**) &windName);
           // if (!val) {
                // Looks like we found a window in the Polo process that isn't our main window, thus it's a full screen window
                //attachEventHandler((CFNumberRef) CFDictionaryGetValue(windInfo, kCGWindowNumber));
                return true;
//            } else {
//                printCFString(f, windName);
//            }
        }
    }
    return false;
}

CGEventRef MouseEventTool::myCGEventCallback(CGEventTapProxy proxy, CGEventType type,  CGEventRef event, void *refcon) {
    if (type == kCGEventTapDisabledByTimeout || type == kCGEventTapDisabledByUserInput) {
        if (eventTap_) {
            if (!CGEventTapIsEnabled(eventTap_)) {
                CGEventTapEnable(eventTap_, true);
            }
        }
    } else if (myself->HandleMouseEvent(type, event)) {
        // The event was handled, so return NULL saying it should get eaten.
        return NULL;
    }
    
    // We must return the event for it to be useful. 
    return event;
}


// Return true if the event is handled, return false otherwise and if the event should not be interrupted
bool MouseEventTool::HandleMouseEvent(CGEventType type, CGEventRef event) {
    // Check our full screen state so we can hackily reset it if it gets messed up
    if (shouldMakeFullScreenOrNot_) {
        if (IsMenuBarVisible()) {
            ::SetSystemUIMode(kUIModeAllHidden, 0);
        }
    }
    
    if (type == kCGEventKeyUp || type == kCGEventKeyDown) {
        // Don't do anything to key events
        return false;
    }
    
    CGPoint mouseLocation = CGEventGetLocation(event);
    double scrollMotion = CGEventGetDoubleValueField(event, kCGScrollWheelEventDeltaAxis1);
    
    if (mouseEventCallback_ != NULL) {
        int dx = 0;
        int dy = 0;
        if (prevX_ >= 0) {
            dx = mouseLocation.x - prevX_;
            dy = mouseLocation.y - prevY_;
        }
        
        mouseEventCallback_->MouseEvent(macEventToWindowsEventType(type), mouseLocation.x, mouseLocation.y, dx, dy, scrollMotion);
    }
    
    prevX_ = mouseLocation.x;
    prevY_ = mouseLocation.y;
    
    int eventTypeEnum = macEventToEnum(type);
    if (eventTypeEnum == -1) {
        return false;
    }    
    
    isFullScreen_ = isFullScreenWindow();
    short resultKey = buttonMapping_[eventTypeEnum];	
    
    if (resultKey != -1) {
        if (resultKey != VK_NO_EVENT) {
            CGEventRef eventDown, eventUp;
            CGEventRef commandDown, commandUp;
            CGEventSourceRef eventSource = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);
            CGKeyCode keyToSend = resultKey;
            
            if (resultKey == VK_BROWSER_BACK && isFullScreen_) {
                keyToSend = kVK_Escape;
            } else if (resultKey == VK_BROWSER_BACK) {
                commandDown = CGEventCreateKeyboardEvent(eventSource, kVK_Command, true);
                keyToSend = kVK_ANSI_LeftBracket;
                
                CGEventPost(kCGHIDEventTap, commandDown);
            }
            
            eventDown = CGEventCreateKeyboardEvent (eventSource, keyToSend, true);
            eventUp = CGEventCreateKeyboardEvent (eventSource, keyToSend, false);
            
            CGEventPost(kCGHIDEventTap, eventDown);
            CGEventPost(kCGHIDEventTap, eventUp);
            
            if (resultKey == VK_BROWSER_BACK && !isFullScreen_) {
                commandUp = CGEventCreateKeyboardEvent(eventSource, kVK_Command, false);
                CGEventPost(kCGHIDEventTap, commandUp);

                CFRelease(commandDown);
                CFRelease(commandUp);
            }
            
            CFRelease(eventDown);
            CFRelease(eventUp);
            CFRelease(eventSource);
            
        }
        return true;
    }
    
    return false;
}

void MouseEventTool::AddHook() 
{
    CGEventMask eventMask;
    CFRunLoopSourceRef runLoopSource;
    ProcessSerialNumber psn;
    
    myself = this;
    
    OSErr err = GetCurrentProcess(&psn);
    if (err) {
        return;
    }
    
    // Create an event tap.
    eventMask = kCGEventMaskForAllEvents;
    
    eventTap_ = CGEventTapCreateForPSN((void*) &psn, kCGHeadInsertEventTap, 0, eventMask, myCGEventCallback, NULL);
    //eventTap = CGEventTapCreate(kCGHIDEventTap, kCGHeadInsertEventTap, 0, eventMask, myCGEventCallback, NULL);
    
    if (!eventTap_) {
        exit(1);
    }
    
    // Create a run loop source.
    runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap_, 0);
    
    // Add to the current run loop.
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource,  kCFRunLoopCommonModes); 
    
    // Enable the event tap.
    CGEventTapEnable(eventTap_, true);
    
}

void MouseEventTool::RemoveHook() 
{
    
}

NS_IMETHODIMP MouseEventTool::RemapButton(const char *processName, PRInt16 inputEvent, PRInt16 outputEvent)
{
    buttonMapping_[winEventToEnum(inputEvent)] = outputEvent;
}

NS_IMETHODIMP MouseEventTool::UnmapButton(const char *processName, PRInt16 inputEvent)
{
	buttonMapping_[winEventToEnum(inputEvent)] = -1;
}

#ifdef XPCOM_USE_PRBOOL
NS_IMETHODIMP MouseEventTool::HackForceFullScreen(PRBool shouldMakeFullScreenOrNot)
{
#else
NS_IMETHODIMP MouseEventTool::HackForceFullScreen(bool shouldMakeFullScreenOrNot)
{
#endif
    shouldMakeFullScreenOrNot_ = shouldMakeFullScreenOrNot;
}

/* attribute MouseEventCallback objCallback; */
NS_IMETHODIMP MouseEventTool::GetObjCallback(MouseEventCallback * *aObjCallback)
{
    *aObjCallback = mouseEventCallback_;
    return NS_OK;
}

NS_IMETHODIMP MouseEventTool::SetObjCallback(MouseEventCallback * aObjCallback)
{
    if (mouseEventCallback_ != NULL) {
        mouseEventCallback_->Release();
    }
    mouseEventCallback_ = aObjCallback;
    
    if (mouseEventCallback_ != NULL) {
        mouseEventCallback_->AddRef();
    }
    return NS_OK;
}
