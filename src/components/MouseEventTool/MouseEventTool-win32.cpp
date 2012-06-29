/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.
 * */

#include "MouseEventTool.h"
#include "nsXPCOM.h"
#include "nsServiceManagerUtils.h"
#include "nsIWindowMediator.h"
#include "nsIDocShell.h"
#include "nsIBaseWindow.h"
#include "nsIXULWindow.h"
#include "nsIWidget.h"
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
static HWND mainHWND;
static DWORD mainPID;

//#define _DEBUG_

#ifdef _DEBUG_
static std::wofstream _log;
#endif

/* Implementation file */
//NS_IMPL_ISUPPORTS1(MouseEventTool, IMouseEventTool)
NS_IMPL_CLASSINFO(MouseEventTool, NULL, 0, MOUSEEVENTTOOL_CID)
NS_IMPL_ISUPPORTS1_CI(MouseEventTool, IMouseEventTool)


#define FULLSCREEN_FLASH_CLASS_NAME L"ShockwaveFlashFullScreen"
#define FULLSCREEN_SILVERLIGHT_CLASS_NAME L"AGFullScreenWinClass"
#define OOP_PLUGIN_CLASS_NAME L"GeckoPluginWindow"
#define FLASH_SANDBOX_CLASS_NAME L"GeckoFPSandboxChildWindow"


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
#ifdef _DEBUG_
    _log.open("C:\\Users\\kwood\\mouseeventtool.log", std::ios::app);
    _log << "======== START" << std::endl;
#endif

    /**
     * We're going to get the main Kylo window through some special XPCOM APIs.
     *
     * Steps:
     * 1) Get the WindowMediator service
     * 2) Get an enumerator of all XUL window objects with a "contenttype" of "poloContent"
     * 3) Take the first window. It should be the *only* window because Kylo is
     *    designed to only have 1 main window
     */
    nsCOMPtr<nsIServiceManager> svcMgr;
    nsresult rv = NS_GetServiceManager(getter_AddRefs(svcMgr));

    if (NS_FAILED(rv))
    {
#ifdef _DEBUG_
        _log << "Can't get the service manager!" << std::endl;
#endif
        NS_ShutdownXPCOM(nsnull);
        return;
    }

    nsCOMPtr<nsIWindowMediator> winMediator;
    rv = svcMgr->GetServiceByContractID(NS_WINDOWMEDIATOR_CONTRACTID,
            NS_GET_IID(nsIWindowMediator), getter_AddRefs(winMediator));

    if (NS_FAILED(rv))
    {
#ifdef _DEBUG_
        _log << "Can't get the WindowMediator service!" << std::endl;
#endif
        return;
    }

    // Get the enumerator
    nsCOMPtr<nsISimpleEnumerator> winEnum;
    winMediator->GetXULWindowEnumerator(NS_LITERAL_STRING("poloContent").get(), getter_AddRefs(winEnum));

    bool more;
    winEnum->HasMoreElements(&more);
    if (!more) {
#ifdef _DEBUG_
        _log << "No XUL windows!" << std::endl;
#endif
        return;
    }

    // Get the first item in the enumerator
    nsCOMPtr<nsIXULWindow> xulWin;
    winEnum->GetNext(getter_AddRefs(xulWin));

    // Get the docShell from the window...
    nsCOMPtr<nsIDocShell> docShell;
    xulWin->GetDocShell(getter_AddRefs(docShell));

    // ...which becomes nsIBaseWindow...
    nsIBaseWindow* win = 0;
    docShell->QueryInterface(NS_GET_IID(nsIBaseWindow), (void**)&win);

    // ...which lets me get the "main widget"...
    nsCOMPtr<nsIWidget> widget;
    win->GetMainWidget(getter_AddRefs(widget));

    // ...which gives me the native window handle...
    mainHWND = (HWND) widget->GetNativeData(NS_NATIVE_WINDOW);

    // ...and now I can get the PID (for comparison).
    GetWindowThreadProcessId(mainHWND, &mainPID);

    remapping_ = new AppSignalPairVec[NUM_WM_MESSAGES];

    prevMousePoint_.x = -1;
    prevMousePoint_.y = -1;
    AddHook();
}

MouseEventTool::~MouseEventTool()
{
    RemoveHook();
    delete [] remapping_;

#ifdef _DEBUG_
    _log << "======== END" << std::endl;
    _log.close();
#endif
}

void MouseEventTool::AddHook()
{
    if (hhook != NULL) {
        // Don't add hook if it's already there
        return;
    }
    myself = this;

    hhook = SetWindowsHookEx(WH_MOUSE_LL,
            MouseHookProc,
            NULL,
            0);
            //GetCurrentThreadId());

    return;
}

void MouseEventTool::RemoveHook()
{
    if (hhook) {
        UnhookWindowsHookEx(hhook);
        hhook = NULL;
    }
}

/* void RemapButton (in string processName, in short inputEvent, in short outputEvent); */
NS_IMETHODIMP MouseEventTool::RemapButton(const char *processName, PRInt16 inputEvent, PRInt16 outputEvent)
{
    // get vector for input event
    AppSignalPairVec* aspv = getVecFromInputValue(inputEvent);

    // if process name exists in vector, reset its output
    for (AppSignalPairVec::iterator i = aspv->begin(); i != aspv->end();)
    {
        AppSignalPair p = *i;
        if (strcmp(p.first.c_str(), processName) == 0)
        {
#ifdef _DEBUG_
            _log << "Replacing button map for " << processName << " input: " << inputEvent << " output: " << outputEvent << std::endl;
#endif
            aspv->erase(i);
        } else {
            ++i;
        }
    }

    aspv->push_back(std::make_pair(std::string(processName), outputEvent));

    // otherwise, add a new pair to the vector
    return S_OK;
}

/* void RemapButton (in string processName, in short inputEvent, in short outputEvent); */
NS_IMETHODIMP MouseEventTool::UnmapButton(const char *processName, PRInt16 inputEvent)
{
    // get vector for input event
    AppSignalPairVec* aspv = getVecFromInputValue(inputEvent);
    
    // if process name exists in vector, remove it
    for (AppSignalPairVec::iterator i = aspv->begin(); i != aspv->end();)
    {
        AppSignalPair p = *i;
        if (strcmp(p.first.c_str(), processName) == 0)
        {
            aspv->erase(i);
            return S_OK;
        } else {
            ++i;
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
    if (nCode >= 0) {
        if (myself->HandleMouseEvent(wParam, lParam)) {
            return 1;
        }
    }
    return CallNextHookEx(hhook, nCode, wParam, lParam);
}

bool MouseEventTool::HandleMouseEvent(WPARAM wParam, LPARAM lParam)
{
    bool fullScreenPlugin = false;
    bool oopPlugin = false;
    bool flashSB = false;

    MSLLHOOKSTRUCT* mouseStruct = (MSLLHOOKSTRUCT*) lParam;

    HWND curWinHWND = WindowFromPoint(mouseStruct->pt);
    if (curWinHWND == NULL) {
#ifdef _DEBUG_
        _log << "No cursor window" << std::endl;
#endif
        return false;
    }

    // We're comparing PIDs instead of HWNDs because different XUL panels have
    // different HWNDs, but they all have the same PID
    DWORD curWinPID;
    GetWindowThreadProcessId(curWinHWND, &curWinPID);

    WCHAR curWinClassName[512];

    GetClassName(curWinHWND, curWinClassName, 512);

    fullScreenPlugin = (lstrcmpi(curWinClassName, FULLSCREEN_FLASH_CLASS_NAME) == 0 ||
                        lstrcmpi(curWinClassName, FULLSCREEN_SILVERLIGHT_CLASS_NAME) == 0);

    oopPlugin = (lstrcmpi(curWinClassName, OOP_PLUGIN_CLASS_NAME) == 0);

    flashSB = (lstrcmpi(curWinClassName, FLASH_SANDBOX_CLASS_NAME) == 0);

    // Only do stuff if our cursor is over the main window
    // ... OR we're dealing with full screen flash/silverlight...
    // ... OR we're dealing with out of process plugins...
    if (curWinPID != mainPID && !fullScreenPlugin && !oopPlugin && !flashSB) {
#ifdef _DEBUG_
        if (wParam != 512) {
            _log << "outside main window - cursor window: " << curWinClassName << " | " << curWinPID << ", fullScreenPlugin: " << fullScreenPlugin << ", oopPlugin: " << oopPlugin << std::endl;
        }
#endif
        return false;
    }

    // Get some info about the actual mouse event & send the event if necessary
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
#ifdef _DEBUG_
        if (wParam != 512) {
            _log << "no signal for wParam: " << wParam << std::endl;
        }
#endif
        return false;
    }


#ifdef _DEBUG_
    _log << "number of mappings for " << wParam << ": " << aspv->size() << std::endl;
#endif
    if (aspv->size() > 0) {
        AppSignalPair p = aspv->at(0);
        short signalToSend = p.second;
        if (signalToSend != VK_NO_EVENT) {
            INPUT input;

            if (fullScreenPlugin) {
                if (signalToSend == VK_BROWSER_BACK) {
                    // Hackery for Full Screen Flash
                    signalToSend = VK_ESCAPE;
                }

#ifdef _DEBUG_
                _log << "fullScreenPlugin! " << signalToSend << " | " << curWinClassName << std::endl;
#endif

                // Send the message to the cursor window instead of main window
                PostMessage(curWinHWND, WM_KEYDOWN, signalToSend, 0);
                PostMessage(curWinHWND, WM_KEYUP, signalToSend, 0);

                // Set focus back to main window
                SetForegroundWindow(mainHWND);
                SetFocus(mainHWND);

                return true;
            }

            PostMessage(mainHWND, WM_KEYDOWN, signalToSend, 0);
            PostMessage(mainHWND, WM_KEYUP, signalToSend, 0);

#ifdef _DEBUG_
            _log << "swapping signal: " << wParam << " -> " << signalToSend << std::endl;
#endif

        }
        return true;
    }

#ifdef _DEBUG_
        _log << "not gonna do it - aspv->size() <= 0 | " << wParam << std::endl;
#endif
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
