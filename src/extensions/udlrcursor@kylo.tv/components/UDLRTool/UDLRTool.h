/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved.
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are
 * trademarks of Hillcrest Laboratories, Inc.
 * */

#ifndef _UDLRTOOL_H_
#define _UDLRTOOL_H_

#include "IUDLRTool.h"
#include "nsStringAPI.h"
#include "nsCOMPtr.h"
#include "windows.h"
#include "tlhelp32.h"

#define UDLRTOOL_CONTRACTID "@hcrest.com/UDLRTool;1"
#define UDLRTOOL_CLASSNAME "Hillcrest UDLRTool Module"
// {5357C90C-0DCD-4a50-9051-637C24C1E578}
#define UDLRTOOL_CID { 0x5357C90C, 0x0DCD, 0x4a50, { 0x90, 0x51, 0x63, 0x7C, 0x24, 0xC1, 0xE5, 0x78 } }

class UDLRTool : public IUDLRTool
{
public:
    NS_DECL_ISUPPORTS
    NS_DECL_IUDLRTOOL

    UDLRTool();

    static LRESULT WINAPI KeyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam);
    static VOID CALLBACK TimerProc(HWND hwnd, UINT uMsg, UINT_PTR idEvent, DWORD dwTime);

    void HandleTimerEvent();
    bool HandleKeyEvent(WPARAM wParam, LPARAM lParam);
    

private:
    HOOKPROC hkprc;
    UINT_PTR uIDEvent_;

    void AddHook();
    void RemoveHook();

    ~UDLRTool();

    bool pressed_;
    bool capture_;

    float speed_;
    float minSpeed_;
    float maxSpeed_;
    float acceleration_;

    DWORD pid_;

    PRInt16 upKey_;
    PRInt16 downKey_;
    PRInt16 leftKey_;
    PRInt16 rightKey_;

    bool upKeyState_;
    bool downKeyState_;
    bool leftKeyState_;
    bool rightKeyState_;

    PRInt16 leftClickKey_;
    PRInt16 rightClickKey_;
    PRInt16 middleClickKey_;
    PRInt16 scrollUpKey_;
    PRInt16 scrollDownKey_;

protected:
    /* additional members */
};

#endif _UDRLTOOL_H_

