/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved.
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are
 * trademarks of Hillcrest Laboratories, Inc.
 * */

#include "UDLRTool.h"
#include "nsEmbedString.h"
#include "nsIClassInfoImpl.h"
#include "nsMemory.h"
#include <stdio.h>

//#define _DEBUG_

#define TIMER 10
#define MIN_SPEED 3
#define MAX_SPEED 10

#define ACCELERATION 0.1

static HINSTANCE hinstDLL; 
static HHOOK keyboardhhook;
static HHOOK shellhhook;
static UDLRTool* myself;
static DWORD myPid;
static DWORD myTid;

//NS_IMPL_ISUPPORTS1(UDLRTool, IUDLRTool)
NS_IMPL_CLASSINFO(UDLRTool, NULL, 0, UDLRTOOL_CID)
NS_IMPL_ISUPPORTS1_CI(UDLRTool, IUDLRTool)

UDLRTool::UDLRTool()
{
    // Set up defaults
    upKey_ = VK_UP;
    downKey_ = VK_DOWN;
    leftKey_ = VK_LEFT;
    rightKey_ = VK_RIGHT;

    minSpeed_ = MIN_SPEED;
    maxSpeed_ = MAX_SPEED;
    acceleration_ = ACCELERATION;
    speed_ = 0;

    pressed_ = false;
    capture_ = true;
    

    leftClickKey_ = VK_RETURN;
    rightClickKey_ = NULL;
    middleClickKey_ = NULL;
    scrollUpKey_ = NULL;
    scrollDownKey_ = NULL;
    
    pid_ = GetCurrentProcessId();

    keyboardhhook = NULL;
    
#ifdef _DEBUG_
    FILE* f = fopen("C:\\udlrtool.log", "w");
    fprintf(f, " Starrting UDLR Tool\n");
    fclose(f);
#endif
}

UDLRTool::~UDLRTool()
{
    /* destructor code */
    if (keyboardhhook != NULL)
    {
        RemoveHook();
    }
}

HINSTANCE GetHInstance()
{
    MEMORY_BASIC_INFORMATION mbi;
    CHAR szModule[MAX_PATH];

    SetLastError(ERROR_SUCCESS);
    if (VirtualQuery(GetHInstance,&mbi,sizeof(mbi)))
    {
        if (GetModuleFileName((HINSTANCE)mbi.AllocationBase, (LPWCH) szModule,sizeof(szModule)))
        {
            return (HINSTANCE)mbi.AllocationBase;
        }        
    }
    return NULL;
}

void UDLRTool::AddHook()
{
    if (keyboardhhook != NULL) {
        // Don't add hook if it's already enabled
        return;
    }
    myself = this;
    myPid = pid_;
    myTid = GetCurrentThreadId();
    hinstDLL = GetHInstance();

    uIDEvent_ = SetTimer(0, 0, TIMER, TimerProc);

    keyboardhhook = SetWindowsHookEx(WH_KEYBOARD,
        KeyboardHookProc,
        NULL,
        myTid);

    return;
}

void UDLRTool::RemoveHook() 
{
    bool result = KillTimer(NULL, uIDEvent_);
    if (keyboardhhook != NULL) {
        UnhookWindowsHookEx(keyboardhhook);
        keyboardhhook = NULL;
    }
}

VOID CALLBACK UDLRTool::TimerProc(HWND hwnd, UINT uMsg, UINT_PTR idEvent, DWORD dwTime) {
    HWND frontmost = GetForegroundWindow();
    DWORD frontpid;
    DWORD tid = GetWindowThreadProcessId(frontmost, (LPDWORD) &frontpid);

    if (frontpid != myPid) { 
#ifdef _DEBUG_
       // FILE* f = fopen("C:\\udlrtool.log", "a+");
       // fprintf(f, "Not my pid in front.\n");
       // fclose(f);
#endif
        return;
    }
    myself->HandleTimerEvent();
}

void UDLRTool::HandleTimerEvent() {
#ifdef _DEBUG_
    FILE* f = fopen("C:\\udlrtool.log", "a+");
#endif
    DWORD dwFlags = 0;
    bool upDown = (GetKeyState(upKey_) >> 1);
    bool downDown = (GetKeyState(downKey_) >> 1);
    bool leftDown = (GetKeyState(leftKey_) >> 1);
    bool rightDown = (GetKeyState(rightKey_) >> 1);

    int dx = 0;
    int dy = 0;
    if (downDown || upDown || leftDown || rightDown) {
        dwFlags |= MOUSEEVENTF_MOVE;
        if (pressed_) {
            speed_ += acceleration_;
            if (speed_ > maxSpeed_) {
                speed_ = maxSpeed_;
            }
        } else {
            speed_ = minSpeed_;
        }
        pressed_ = true;
    } else {
        pressed_ = false;
        speed_ = 0;
#ifdef _DEBUG_
        fclose(f);
#endif
        return;
    }

    if (downDown) {
        dy = speed_;
    }

    if (upDown) {
        dy -= speed_;
    }

    if (rightDown) {
        dx += speed_;
    }

    if (leftDown) {
        dx -= speed_;
    }
#ifdef _DEBUG_
    //fprintf(f, "Speed: %d, %d\n", dx, dy);
    fclose(f);
#endif
    mouse_event(dwFlags, dx, dy, 0, 0);
}

LRESULT CALLBACK UDLRTool::ShellHookProc(int nCode, WPARAM wParam, LPARAM lParam)
{
    if (nCode < 0) {
        CallNextHookEx(shellhhook, nCode, wParam, lParam);
    }
#ifdef _DEBUG_
    FILE* f = fopen("C:\\udlrtool.log", "a+");
    fprintf(f, "ncode: %d, wParam: %x\n", nCode, wParam);
    fclose(f);
#endif
    return 0;
}

LRESULT WINAPI UDLRTool::KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam)
{
    if (nCode == 0) {
        if (myself->HandleKeyEvent(wParam, lParam)) {
            return 1;
        }
    }
    return CallNextHookEx(keyboardhhook, nCode, wParam, lParam);
}

bool UDLRTool::HandleKeyEvent(WPARAM wParam, LPARAM lParam) {
    bool buttonPress = !((lParam >> 30) & 1);
#if 0
    FILE* f = fopen("C:\\udlrtool.log", "a+");
    fprintf(f, "Key: %x\n", wParam);
    fprintf(f, "LPARAM: %x\n", lParam);
    fprintf(f, "buttonPress: %d\n", buttonPress);
    fclose(f);
#endif
    bool capture = false;

    if (capture_ && 
        (wParam == upKey_ ||
        wParam == downKey_ ||
        wParam == leftKey_ ||
        wParam == rightKey_)) {
            capture = capture_;
    }

    if (buttonPress) {
        if (wParam == leftClickKey_) {
            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
            capture = capture_;
        }
        if (wParam == rightClickKey_) {
            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
            capture = capture_;
        }
        if (wParam == middleClickKey_) {
            mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0);
            mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0);
            capture = capture_;
        }
        if (wParam == scrollUpKey_) {
            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, WHEEL_DELTA, 0);
            capture = capture_;
        }
        if (wParam == scrollDownKey_) {
            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, -WHEEL_DELTA, 0);
            capture = capture_;
        }
    }

    return capture;
}


/* void enableUDLR (); */
NS_IMETHODIMP UDLRTool::EnableUDLR()
{
#ifdef _DEBUG_;
    FILE* f = fopen("C:\\udlrtool.log", "a+");
    fprintf(f, "enabling udlr\n");
    fclose(f);
#endif
    AddHook();
    return NS_OK;
}

/* void disableUDLR (); */
NS_IMETHODIMP UDLRTool::DisableUDLR()
{
#ifdef _DEBUG_;
    FILE* f = fopen("C:\\udlrtool.log", "a+");
    fprintf(f, "disabling udlr\n");
    fclose(f);
#endif
    RemoveHook();
    return NS_OK;
}

/* void captureKeypresses (in boolean shouldCapture); */

#ifdef XPCOM_USE_PRBOOL
NS_IMETHODIMP UDLRTool::CaptureKeypresses(PRBool shouldCapture)
{
#else
NS_IMETHODIMP UDLRTool::CaptureKeypresses(bool shouldCapture)
{
#endif
    capture_ = shouldCapture;
    return NS_OK;
}

/* void setUDLRKeys (in short upKey, in short downKey, in short leftKey, in short rightKey); */
NS_IMETHODIMP UDLRTool::SetUDLRKeys(PRInt16 upKey, PRInt16 downKey, PRInt16 leftKey, PRInt16 rightKey)
{
    upKey_ = upKey;
    downKey_ = downKey;
    leftKey_ = leftKey;
    rightKey_ = rightKey;
    return NS_OK;
}

/* void setButtonKeys (in short leftClickKey, in short rightClickKey, in short middleClickKey, in short scrollUpKey, in short scrollDownKey); */
NS_IMETHODIMP UDLRTool::SetButtonKeys(PRInt16 leftClickKey, PRInt16 rightClickKey, PRInt16 middleClickKey, PRInt16 scrollUpKey, PRInt16 scrollDownKey)
{
    leftClickKey_ = leftClickKey;
    rightClickKey_ = rightClickKey;
    middleClickKey_ = middleClickKey;
    scrollUpKey_ = scrollUpKey;
    scrollDownKey_ = scrollDownKey;
    return NS_OK;
}

/* void setSpeed (in short min, in short max); */
NS_IMETHODIMP UDLRTool::SetSpeed(PRInt16 min, PRInt16 max)
{
    minSpeed_ = min;
    maxSpeed_ = max;
    return NS_OK;
}
