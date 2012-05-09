/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#include "MouseEventTool.h"
#include "nsIObserverService.h"
#include "nsXPCOM.h"
#include "nsIServiceManager.h"
#include "nsEmbedString.h"
#include "nsIClassInfoImpl.h"
#include "nsMemory.h"

#include <iostream>
#include <stdio.h>
#include <windows.h>
#include <WinUser.h>
#include <tlhelp32.h>


static HINSTANCE hinstDLL; 
static HHOOK hhook;
static MouseEventTool* myself;
static DWORD myPid;

/* Implementation file */
//NS_IMPL_ISUPPORTS1(MouseEventTool, IMouseEventTool)
NS_IMPL_CLASSINFO(MouseEventTool, NULL, 0, MOUSEEVENTTOOL_CID)
NS_IMPL_ISUPPORTS1_CI(MouseEventTool, IMouseEventTool)


#define FULLSCREEN_FLASH_CLASS_NAME L"ShockwaveFlashFullScreen"
#define FULLSCREEN_SILVERLIGHT_CLASS_NAME L"AGFullScreenWinClass"

// Some PID/HWND utils
void getPidFromHwnd(PidAndName* pan) 
{
    if (pan == NULL) {
        return;
    }
    if (pan->hwnd == NULL) {
        return;
    }

    DWORD tid = GetWindowThreadProcessId(pan->hwnd, (LPDWORD) &(pan->pid));
}

void getWindowInfoFromHwnd(PidAndName* pan)
{
    if (pan == NULL) {
        return;
    }
    if (pan->hwnd == NULL) {
        return;
    }

    WINDOWINFO winfo;
    winfo.cbSize = sizeof(WINDOWINFO);
    BOOL gotInfo = GetWindowInfo(pan->hwnd, &winfo);
    if (gotInfo) {
        pan->info = winfo;
    }
    pan->hasWindowInfo = gotInfo;
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



MouseEventTool::MouseEventTool()
{
    pid_ = GetCurrentProcessId();

    remapping_ = new AppSignalPairVec[NUM_WM_MESSAGES];

    prevMousePoint_.x = -1;
    prevMousePoint_.y = -1;
    AddHook();
}

MouseEventTool::~MouseEventTool()
{
    RemoveHook();
    delete [] remapping_;
}

void MouseEventTool::AddHook()
{
    myself = this;
    myPid = pid_;
    hinstDLL = GetHInstance();
    hkprc = MouseHookProc;

    hhook = SetWindowsHookEx(WH_MOUSE,
        hkprc,
        //hinstDLL,
        //0);
        NULL,
        GetCurrentThreadId());
    return;
}

void MouseEventTool::RemoveHook()
{
    if (hhook) {
        UnhookWindowsHookEx(hhook);
    }
}

/* void RemapButton (in string processName, in short inputEvent, in short outputEvent); */
NS_IMETHODIMP MouseEventTool::RemapButton(const char *processName, PRInt16 inputEvent, PRInt16 outputEvent)
{
    // get vector for input event
    AppSignalPairVec* aspv = getVecFromInputValue(inputEvent);
    
    // if process name exists in vector, reset its output
    for (AppSignalPairVec::iterator i = aspv->begin(); i != aspv->end(); ++i) 
    {
        AppSignalPair p = *i;
        if (strcmp(p.first, processName) == 0)
        {
            p.second = outputEvent;
            return S_OK;
        }
    }

    aspv->push_back(std::make_pair(processName, outputEvent));

    // otherwise, add a new pair to the vector
    return S_OK;
}

/* void RemapButton (in string processName, in short inputEvent, in short outputEvent); */
NS_IMETHODIMP MouseEventTool::UnmapButton(const char *processName, PRInt16 inputEvent)
{
    // get vector for input event
    AppSignalPairVec* aspv = getVecFromInputValue(inputEvent);
    
    // if process name exists in vector, remove it
    for (AppSignalPairVec::iterator i = aspv->begin(); i != aspv->end(); ++i) 
    {
        AppSignalPair p = *i;
        if (strcmp(p.first, processName) == 0)
        {
            aspv->erase(i);
            return S_OK;
        }
    }

    return S_OK;
}

/* attribute MouseEventCallback objCallback; */
NS_IMETHODIMP MouseEventTool::GetObjCallback(MouseEventCallback * *aObjCallback)
{
    *aObjCallback = mouseEventCallback_;
    return S_OK;
}
NS_IMETHODIMP MouseEventTool::SetObjCallback(MouseEventCallback * aObjCallback)
{
    mouseEventCallback_ = aObjCallback;
    return S_OK;
}

#ifdef XPCOM_USE_PRBOOL
NS_IMETHODIMP MouseEventTool::HackForceFullScreen(PRBool shouldMakeFullScreenOrNot)
{
#else
NS_IMETHODIMP MouseEventTool::HackForceFullScreen(bool shouldMakeFullScreenOrNot)
{
#endif
    shouldMakeFullScreenOrNot_ = shouldMakeFullScreenOrNot;
    return S_OK;
}

LRESULT WINAPI MouseEventTool::MouseHookProc(int nCode, WPARAM wParam, LPARAM lParam)
{
    if (GetCurrentProcessId() == myPid) {
        if (nCode >= 0) {
            if (myself->HandleMouseEvent(wParam, lParam)) {
                return 1;
           }
        }
    }
    return CallNextHookEx(hhook, nCode, wParam, lParam);
}

void PrintError(DWORD err) {
    LPVOID lpMsgBuf;
    FormatMessage( 
        FORMAT_MESSAGE_ALLOCATE_BUFFER | 
        FORMAT_MESSAGE_FROM_SYSTEM | 
        FORMAT_MESSAGE_IGNORE_INSERTS,
        NULL,
        err,
        MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), // Default language
        (LPTSTR) &lpMsgBuf,
        0,
        NULL 
        );
    // Process any inserts in lpMsgBuf.
    // ...
    // Display the string.
    //FILE* f = fopen("C:\\mouseEvent.log", "a+");
    //fprintf(f, "%ls\n", lpMsgBuf);
    //fclose(f);

    // Free the buffer.
    LocalFree( lpMsgBuf );

}

bool MouseEventTool::HandleMouseEvent(WPARAM wParam, LPARAM lParam)
{
    bool fullScreenFlash = false;
    DWORD activePid;
    WCHAR str[512];

    PidAndName pan;
    pan.hwnd = GetForegroundWindow();
    if (pan.hwnd == NULL) { return false; }

    getPidFromHwnd(&pan);

    activePid = pan.pid;

    // Only do stuff if we're dealing with the guy that made me (Polo)
    if (activePid != pid_) {
        return false;
    }

    int len = GetClassName(pan.hwnd, (LPTSTR)str, 512);

    fullScreenFlash = (lstrcmpi(str, FULLSCREEN_FLASH_CLASS_NAME) == 0 ||
                       lstrcmpi(str, FULLSCREEN_SILVERLIGHT_CLASS_NAME) == 0);

    // Get some info about the actual mouse event & send the event if necessary
    MSLLHOOKSTRUCT* mouseStruct = (MSLLHOOKSTRUCT*) lParam;
    if (mouseEventCallback_ != NULL) {
        int dx = 0;
        int dy = 0;
        if (prevMousePoint_.x > 0) {
            dx = mouseStruct->pt.x - prevMousePoint_.x;
            dy = mouseStruct->pt.y - prevMousePoint_.y;
        }

        int dw = 0;
        if (wParam == WM_MOUSEWHEEL) {
            dw = mouseStruct->mouseData;
        }
        mouseEventCallback_->MouseEvent(wParam, mouseStruct->pt.x, mouseStruct->pt.y, dx, dy, dw);
    }

    prevMousePoint_ = mouseStruct->pt;

    // moving on
    AppSignalPairVec* aspv = getVecFromInputValue(wParam);
    if (aspv == NULL) {
        return false;
    }
    if (aspv->size() > 0) {
        AppSignalPair p = aspv->at(0);
        short signalToSend = p.second;

        if (signalToSend != VK_NO_EVENT) {

            INPUT input;
            
            if (signalToSend == VK_BROWSER_BACK && fullScreenFlash) {
                // Hackery for Full Screen Flash
                signalToSend = VK_ESCAPE;
            }

            KEYBDINPUT keyboardInput;
            keyboardInput.wVk = signalToSend;
            keyboardInput.time = 0;
            keyboardInput.dwFlags = 0;
            keyboardInput.wScan = 0;

            input.ki = keyboardInput;
            input.type = INPUT_KEYBOARD;

            SendInput(1, &input, sizeof(input));

            keyboardInput.dwFlags = KEYEVENTF_KEYUP;

            input.ki = keyboardInput;
            input.type = INPUT_KEYBOARD;

            SendInput(1, &input, sizeof(input));
        }
        return true;
    }

    return false;
}


AppSignalPairVec* MouseEventTool::getVecFromInputValue(short input) {
    switch (input) 
    {
    case WM_LBUTTONDOWN:
        return &remapping_[ENUM_LBUTTONDOWN];
    case WM_LBUTTONUP:
        return &remapping_[ENUM_LBUTTONUP];
    case WM_LBUTTONDBLCLK:
        return &remapping_[ENUM_LBUTTONDBLCLK];
    case WM_RBUTTONDOWN:
        return &remapping_[ENUM_RBUTTONDOWN];
    case WM_RBUTTONUP:
        return &remapping_[ENUM_RBUTTONUP];
    case WM_RBUTTONDBLCLK:
        return &remapping_[ENUM_RBUTTONDBLCLK];
    case WM_KEYDOWN:
        return &remapping_[ENUM_KEYDOWN];
    case WM_KEYUP:
        return &remapping_[ENUM_KEYUP];
    case WM_MBUTTONDOWN:
        return &remapping_[ENUM_MBUTTONDOWN];
    case WM_MBUTTONUP:
        return &remapping_[ENUM_MBUTTONUP];
    case WM_MBUTTONDBLCLK:
        return &remapping_[ENUM_MBUTTONDBLCLK];
    case WM_MOUSEWHEEL:
        return &remapping_[ENUM_MOUSEWHEEL];
    default:
        break;
    }

    return NULL;
}
