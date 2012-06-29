/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

/***************************************************
** Uninstaller
***************************************************/
!macro BUILD_UNINSTALLER

!include un.GetUserShellFolderFromRegistry.nsh
!include EnumUsersReg.nsh

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

Function un.onInit
    !insertmacro un.UAC_DualMode_OnInit
    Call un.CheckWMCInstalled
FunctionEnd

Section -un.killApp
    Call un.killApp
SectionEnd

Section -un.wmc
    ${If} $IsWMCInstalled == 1 
    ${AndIf} ${FileExists} $INSTDIR\wmc\kylo_wmc.xml
      DetailPrint "Uninstalling WMC shortcut"
      ${If} ${UAC_IsAdmin}
        ExecWait '"$WINDIR\ehome\registermceapp.exe" /u /allusers "$INSTDIR\wmc\kylo_wmc.xml"'
      ${Else}
        ExecWait '"$WINDIR\ehome\registermceapp.exe" /u "$INSTDIR\wmc\kylo_wmc.xml"'
      ${EndIf}
      
      RMDir /r $INSTDIR\wmc
    ${EndIf}
SectionEnd

Section -un.main
    ; Remove main polo files and uninstaller
    RMDir /r $INSTDIR\chrome
    RMDir /r $INSTDIR\components
    RMDir /r $INSTDIR\defaults
    RMDir /r $INSTDIR\extensions
    RMDir /r $INSTDIR\Plugins
    RMDir /r $INSTDIR\xulrunner
    Delete $INSTDIR\application.ini
    Delete $INSTDIR\chrome.manifest
    Delete $INSTDIR\mozcrt19.dll
    Delete $INSTDIR\mozutils.dll
    Delete $INSTDIR\gkmedias.dll
    Delete $INSTDIR\omni.jar
    Delete $INSTDIR\omni.ja
    Delete $INSTDIR\${EXE_NAME}
    Delete $INSTDIR\${ICO_NAME}
    Delete $INSTDIR\uninstall.exe
    RMDir $INSTDIR
    
    ; delete "Hillcrest Labs" from "Hillcrest Labs\Kylo" 
    Push $INSTDIR
    Call un.cleanDefaultLocation    
SectionEnd

Section -un.shortcuts    
    Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
    Delete "$SMPROGRAMS\${START_MENU_GROUP}\${SHORTCUT_NAME}.lnk"
    Delete "$SMPROGRAMS\${START_MENU_GROUP}\Uninstall.lnk"
    RMDir  "$SMPROGRAMS\${START_MENU_GROUP}"    
SectionEnd

Section -un.reg
    DeleteRegKey SHCTX "${UNINSTALL_REG_LOC}"
SectionEnd

Section -un.deleteProfiles
    ; TODO make this section optional
    ${If} $InstMode == 1
        ; Delete the current user's Profile(s) explicitly
        DetailPrint "Deleting Current User Profile"
        SetShellVarContext current
        Call un.deleteProfile    
        SetShellVarContext all
        
        ; Best effort attempt at deleting the remaing user's profiles
        ; This might fail if they have profiles in non standard dirs
        DetailPrint "Deleting remaing user's profiles"
        ; temp.key is a temp location needed by the macro
        ${un.EnumUsersReg} un.deleteProfileFromReg temp.key
    ${Else}
        DetailPrint "Deleting Current User Profile"
        ; Delete only the current user's Profile(s)
        Call un.deleteProfile
        Push $LOCALAPPDATA
        Call un.cleanVirtualStore        
    ${EndIf}   
SectionEnd

Function un.deleteProfile
    RMDir /r "$APPDATA\${INSTALL_PARENT_DIR}\${INTERNAL_NAME}"
    RMDir /r "$LOCALAPPDATA\${INSTALL_PARENT_DIR}\${INTERNAL_NAME}"
    RMDir "$APPDATA\${INSTALL_PARENT_DIR}"
    RMDir "$LOCALAPPDATA\${INSTALL_PARENT_DIR}"
FunctionEnd

Function un.deleteProfileFromReg
    Pop $0
    ; attempt to expand shell vars defined in the windows registry 
    !insertmacro un.GetUserShellFolderFromRegistry "APPDATA" $0 $1
    !insertmacro un.GetUserShellFolderFromRegistry "Local AppData" $0 $2
    
    ; delete polo profile if exists for this user     
    ${If} ${FileExists}  "$1\${INSTALL_PARENT_DIR}\${INTERNAL_NAME}"
        RMDir /r "$1\${PROFILE_PARENT_DIR}\${INTERNAL_NAME}"
        RMDir "$1\${PROFILE_PARENT_DIR}"
    ${EndIf}
    
    ${If} ${FileExists}  "$2\${INSTALL_PARENT_DIR}\${INTERNAL_NAME}" 
        RMDir /r "$2\${PROFILE_PARENT_DIR}\${INTERNAL_NAME}"
        RMDir "$2\${PROFILE_PARENT_DIR}"        
    ${EndIf}
    
    ; push localappdata
    Push $2
    Call un.cleanVirtualStore
FunctionEnd

Function un.cleanVirtualStore
    Pop $0 ; User specific LOCALAPPDATA
    
    ; N/A for winxp
    ${IfNot} ${AtLeastWinVista}
        Return
    ${EndIf}
    
    ; Check if $INSTDIR begins with $PROGRAMFILES
    StrLen $1 $PROGRAMFILES
    StrCpy $1 $INSTDIR $1 0
    ${If} $1 != $PROGRAMFILES
        Return
    ${EndIf}
    
    ; Strip the the drive letter from the full path 
    StrCpy $1 $INSTDIR "" 2
    
    ; Construct the VirtualStore path
    StrCpy $1 "$0\VirtualStore$1"
    
    ${If} ${FileExists} $1
        DetailPrint "Deleting VirtualStore: $1"
        RMDir /r $1
    ${EndIf}

    Push $1
    Call un.cleanDefaultLocation
FunctionEnd

Function un.cleanDefaultLocation
    Pop $R0
       
    StrLen $0 "\${DEFAULT_INSTALL_DIR}"
    StrCpy $1 $R0 $0 -$0
     
    ${If} "\${DEFAULT_INSTALL_DIR}" == $1
        StrLen $0 "${INSTALL_DIR_NAME}" 
        StrCpy $1 $R0 -$0
        ; this shoudld be something like c:\program files\Hillcrest Labs\
        ; try and remove it, this fails if the dir has other files in it 
        RMDir $1
    ${EndIf}
FunctionEnd

!macroend