/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

!ifndef BCM_SETSHIELD
    !define BCM_SETSHIELD 0x0000160C
!endif

!macro UAC_WriteUninstaller extractTo mode
    !tempfile UNINSTEXE
    !system '"${NSISDIR}\MakeNSIS" /DBUILDUNINST=${mode} /DUNINSTEXE=${UNINSTEXE}.exe "${__FILE__}"' = 0
    !system '"${UNINSTEXE}.exe"' = 0

    !ifdef CALL_SIGN_UNINSTALLER
        !insertmacro SIGN_UNINSTALLER ${UNINSTEXE}.exe.un
    !endif    
    File "/oname=${extractTo}" "${UNINSTEXE}.exe.un"
    !delfile "${UNINSTEXE}.exe"
    !delfile "${UNINSTEXE}.exe.un"
    !undef UNINSTEXE
!macroend

Var InstMode ;0=current,1=all users

!ifndef BUILDUNINST


!macro UAC_SetInstMode m
    StrCpy $InstMode ${m}
    Call UAC_InstModeChanged
!macroend

!macro UAC_DualMode_OnInit
    !insertmacro UAC_PageElevation_OnInit
    ${If} ${UAC_IsInnerInstance}
    ${AndIfNot} ${UAC_IsAdmin}
        SetErrorLevel 0x666666 ;special return value for outer instance so it knows we did not have admin rights
        Quit
    ${EndIf}
    
    StrCpy $InstMode 0
    ${IfThen} ${UAC_IsAdmin} ${|} StrCpy $InstMode 1 ${|}
    call UAC_InstModeChanged
    
    ${If} ${Silent}
    ${AndIf} $InstDir == "" ;defaults (for silent installs)
        SetSilent normal
        call UAC_InstModeChanged
        SetSilent silent
    ${EndIf}
!macroend

Function UAC_DisableBack
${If} ${UAC_IsInnerInstance}
    GetDlgItem $0 $HWNDParent 3
    EnableWindow $0 0
${EndIf}
FunctionEnd

!macro UAC_InsertDualModeInstallPage
    Page custom UAC_InstModeSelectionPage_Create UAC_InstModeSelectionPage_Leave
    
    Function UAC_InstModeChanged
        SetShellVarContext CURRENT
        ${IfNotThen} ${Silent} ${|} StrCpy $InstDir "${S_DEFINSTDIR_USER}" ${|}
        ${If} $InstMode > 0
            SetShellVarContext ALL
            ${IfNotThen} ${Silent} ${|} StrCpy $InstDir "${S_DEFINSTDIR_ADMIN}" ${|}
        ${EndIf}
    FunctionEnd
    
    Function UAC_RemoveNextBtnShield
    GetDlgItem $0 $hwndParent 1
    SendMessage $0 ${BCM_SETSHIELD} 0 0
    FunctionEnd
    
    Function UAC_InstModeSelectionPage_Create
        !insertmacro MUI_HEADER_TEXT_PAGE "$(UAC_DualMode_PageHeader)" "$(UAC_DualMode_PageSubHeader)"
        GetFunctionAddress $8 UAC_InstModeSelectionPage_OnClick
        nsDialogs::Create /NOUNLOAD 1018
        Pop $9
        ${NSD_OnBack} UAC_RemoveNextBtnShield
        ${NSD_CreateLabel} 0 20u 100% 20u "$(UAC_DualMode_PageText)"
        Pop $0
        System::Call "advapi32::GetUserName(t.r0,*i${NSIS_MAX_STRLEN})i"
        ${NSD_CreateRadioButton} 3% 40u 75% 15u "$(UAC_DualMode_SingleUser)"
        Pop $0
        nsDialogs::OnClick $0 $8
        nsDialogs::SetUserData $0 0
        SendMessage $0 ${BM_CLICK} 0 0
        ${NSD_CreateRadioButton} 3% 60u 75% 15u "$(UAC_DualMode_AllUsers)"
        Pop $2
        nsDialogs::OnClick $2 $8
        nsDialogs::SetUserData $2 1
        ${IfThen} $InstMode <> 0 ${|} SendMessage $2 ${BM_CLICK} 0 0 ${|}
        push $2 ;store allusers radio hwnd on stack
        
        !ifdef UAC_DUALMODE_ALLUSER_TEST_REGKEY & UAC_DUALMODE_ALLUSER_TEST_REGVALUE
            ReadRegStr $R0 HKLM "${UAC_DUALMODE_ALLUSER_TEST_REGKEY}" "${UAC_DUALMODE_ALLUSER_TEST_REGVALUE}"                
            ${IfNot} $R0 == ""
                SendMessage $2 ${BM_CLICK} 0 0
            ${EndIf}
        !endif
        nsDialogs::Show
        pop $2
    FunctionEnd
    
    Function UAC_InstModeSelectionPage_OnClick
        pop $1
        nsDialogs::GetUserData $1
        pop $1
        GetDlgItem $0 $hwndParent 1
        SendMessage $0 ${BCM_SETSHIELD} 0 $1
    FunctionEnd
    
    Function UAC_InstModeSelectionPage_Leave
        pop $0  ;get hwnd
        push $0 ;and put it back
        ${NSD_GetState} $0 $9
        ${If} $9 = 0
            !insertmacro UAC_SetInstMode 0
        ${Else}
            !insertmacro UAC_SetInstMode 1
            ${IfNot} ${UAC_IsAdmin}
                GetDlgItem $9 $HWNDParent 1
                System::Call user32::GetFocus()i.s
                EnableWindow $9 0 ;disable next button
                !insertmacro UAC_RunElevated
                EnableWindow $9 1
                System::Call user32::SetFocus(is) ;Do we need WM_NEXTDLGCTL or can we get away with this hack?
                ${If} $2 = 0x666666 ;our special return, the new process was not admin after all 
                    MessageBox mb_iconExclamation "$(UAC_DualMode_ReqAdmin)"
                    Abort 
                ${ElseIf} $0 = 1223 ;cancel
                    Abort
                ${Else}
                    ${If} $0 <> 0
                        ${If} $0 = 1062
                            MessageBox mb_iconstop "$(UAC_DualMode_ErrLoginSvc)" 
                        ${Else}
                            MessageBox mb_iconstop "$(UAC_DualMode_Err)"
                        ${EndIf} 
                        Abort
                    ${EndIf}
                ${EndIf} 
                Quit ;We now have a new process, the install will continue there, we have nothing left to do here
            ${EndIf}
        ${EndIf}
    FunctionEnd    
!macroend

!else

!macro un.UAC_DualMode_OnInit
    !if ${BUILDUNINST} > 0        
        SetShellVarContext ALL
        !insertmacro UAC_RunElevated
        ${Switch} $0
        ${Case} 0
            ${IfThen} $1 = 1 ${|} Quit ${|} ;we are the outer process, the inner process has done its work, we are done
            ${IfThen} $3 <> 0 ${|} ${Break} ${|} ;we are admin, let the show go on
            ;fall-through and die
        ${Case} 1223
            MessageBox mb_IconStop|mb_TopMost|mb_SetForeground "$(UAC_DualMode_UnReqAdmin)"
            Quit
        ${Case} 1062
            MessageBox mb_IconStop|mb_TopMost|mb_SetForeground "$(UAC_DualMode_UnErrLoginSvc)"
            Quit
        ${Default}
            MessageBox mb_IconStop|mb_TopMost|mb_SetForeground "$(UAC_DualMode_UnErr)"
            Quit
        ${EndSwitch}
        
        StrCpy $InstMode 1 
    !else
        StrCpy $InstMode 0
    !endif
!macroend

!endif