/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */


/***************************************************
** Installer
***************************************************/

; 
;  Note: BUILD_INSTALLER starts at line 10 so when u see:
;           Error in macro BUILD_INSTALLER on macroline 265
;         Add +10 to macroline 265 to find the error location in this file.

!macro BUILD_INSTALLER

!define MUI_CUSTOMFUNCTION_GUIINIT GuiInit

!insertmacro MUI_PAGE_WELCOME
Page Custom LicensePage ; custom license page that provides print capabilities


!insertmacro UAC_InsertDualModeInstallPage

!define MUI_PAGE_CUSTOMFUNCTION_PRE UAC_DisableBack
!define MUI_COMPONENTSPAGE_NODESC
!insertmacro MUI_PAGE_COMPONENTS

!define MUI_PAGE_CUSTOMFUNCTION_PRE     SetPrevInstDir
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE   CheckInstDir
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; flash installer page
/**
 * Can't distribute flash -- commenting out for now
 
Page custom FlashInstallerPage FlashInstallerPage_Leave
 */
 
; Finish page params
!define MUI_FINISHPAGE_LINK "$(FinishPageLinkText)"
!define MUI_FINISHPAGE_LINK_LOCATION "${ABOUT_SITE_URL}"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "$(FinishPageRunApp)"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchPolo
!define MUI_PAGE_CUSTOMFUNCTION_SHOW FinishPage_Show
!insertmacro MUI_PAGE_FINISH


Function .onInit
    !insertmacro UAC_DualMode_OnInit

    ${IfNot} ${AtLeastWinXP}
        MessageBox MB_ICONEXCLAMATION "$(OSUnsupported)"
        Quit
    ${EndIf}

    Call CheckWMCInstalled
    Call CheckWMCSection
FunctionEnd

Function GuiInit
    !insertmacro UAC_PageElevation_OnGuiInit
FunctionEnd


var Require_Uninstall

/**
 * Can't distribute flash plugin. Commenting out for now
 */
;Var FlashInstallCheckBox
;Var FlashInstallCheckBox_State

; For custom license page
Var Dialog             ; custom page field
Var PageDownMessage    ; message shown on top of license page
Var AgreeCheckBox      ; refers to the I Agree checkbox
Var PrintButton        ; refers to the print button
Var LicenseTextBox     ; refers to the text box containing the license agreement
Var IfYouAcceptMessage ; message shown on bottom of license page
Var AgreeBoxState      ; contains the state of the I Agree checkbox

; A required section of the installer that always runs
Section -PrepUpgrade
    Call killApp

    ${If} $Require_Uninstall == 0
        Return
    ${EndIf}

    Call PrepDirForUpgrade
SectionEnd

Section "$(SectNameMain)" SecBrowser
    SectionIn RO

    ; Set output path to the installation directory.
    SetOutPath $INSTDIR

    ; Top Level Files
    File /r ${APP_DIR}\*.*
    
    ; Icon file
    File /oname=${ICO_NAME} ${MUI_ICON}
    
SectionEnd

Section -UpgradeCleanup
    ${If} $Require_Uninstall == 1
        RMDir /r $INSTDIR\backup
        RMDir $INSTDIR\backup
    ${EndIf}
SectionEnd

; Optional section (can be disabled by the user)
Section  "$(SectNameStartMenuShortcuts)" SecShortcuts
    ; Change dir so that Shortcuts start in $INSTDIR
    SetOutPath $INSTDIR
    CreateDirectory "$SMPROGRAMS\${START_MENU_GROUP}"
    CreateShortCut "$SMPROGRAMS\${START_MENU_GROUP}\${SHORTCUT_NAME}.lnk" \
                        "$INSTDIR\${EXE_NAME}" "" "$INSTDIR\${ICO_NAME}" 0
    CreateShortCut "$SMPROGRAMS\${START_MENU_GROUP}\Uninstall.lnk" \
                        "${UNINSTALLER_FULLPATH}" "" "${UNINSTALLER_FULLPATH}" 0
SectionEnd

; Optional section (can be disabled by the user)
Section "$(SectNameDesktopShortcuts)" SecDesktopShortcuts

    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" \
                        "$INSTDIR\${EXE_NAME}" "" "$INSTDIR\${ICO_NAME}" 0

SectionEnd

; Optional section (can be disabled by the user)
Section "$(SectNameWinMediaCtrShrtcuts)" SecWMCShortcuts
	${If} $IsWMCInstalled == 1

        CreateDirectory $INSTDIR\wmc
		SetOutPath $INSTDIR\wmc   
        
    	File ${RESOURCE_DIR}\kylo_wmc.png
    	File redist\MceAppHandler.exe

    	FileOpen $0 kylo_wmc.xml w
    	FileWrite $0 '<application title="Kylo Browser" id="{25e1993f-a9d8-4251-871c-0bf84c6d6e29}" StartMenuStripTitle="Kylo" StartMenuStripCategory="Kylo\Kylo"><entrypoint id="{58267566-672b-4b1d-812a-fc46d728d073}" run="$INSTDIR\wmc\kylo_wmc.lnk" title="Kylo Browser" description="The browser built for the big screen" imageUrl="$INSTDIR\wmc\kylo_wmc.png"><category category="More Programs"/><category category="Kylo\Kylo"/></entrypoint></application>'
    	FileClose $0
    	CreateShortCut "$INSTDIR\wmc\kylo_wmc.lnk" \
                        "$INSTDIR\wmc\MceAppHandler.exe" "$\"$INSTDIR\${EXE_NAME}$\"" "$INSTDIR\${ICO_NAME}" 0

    	${If} ${UAC_IsAdmin}
    		Exec '"$WINDIR\ehome\registermceapp.exe" /allusers "$INSTDIR\wmc\kylo_wmc.xml"'
		${Else}
    		Exec '"$WINDIR\ehome\registermceapp.exe" "$INSTDIR\wmc\kylo_wmc.xml"'
		${EndIf}
    ${EndIf}
SectionEnd


Section -Uninstaller
    SetOutPath -
    ${If} $InstMode = 0
        !insertmacro UAC_WriteUninstaller "${UNINSTALLER_FULLPATH}" 0
    ${Else}
        !insertmacro UAC_WriteUninstaller "${UNINSTALLER_FULLPATH}" 1
    ${EndIf}

    ; ===============================================================================================
    ; Windows Add/Remove Programs Info
    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "UninstallString"       "$\"${UNINSTALLER_FULLPATH}$\" "
    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "QuietUninstallString"  "$\"${UNINSTALLER_FULLPATH}$\"  /S"

    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "InstallLocation"   "$INSTDIR"
    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "DisplayIcon"       "$\"$INSTDIR\${ICO_NAME}$\""

    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "DisplayName"       "$(ProductDisplayName)"
    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "Comments"          "$(ProductDisplayName)"
    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "Publisher"         "${PUBLISHER}"

    WriteRegDWORD SHCTX "${UNINSTALL_REG_LOC}" "NoModify"        1
    WriteRegDWORD SHCTX "${UNINSTALL_REG_LOC}" "NoRepair"        1

    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}" "URLInfoAbout"      "${ABOUT_SITE_URL}"

    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}"   "Version"         ${FULL_VERSION}
    WriteRegStr SHCTX "${UNINSTALL_REG_LOC}"   "DisplayVersion"  ${DISPLAY_VERSION}
    WriteRegDWORD SHCTX "${UNINSTALL_REG_LOC}" "VersionMajor"    ${VERSION_MAJOR}
    WriteRegDWORD SHCTX "${UNINSTALL_REG_LOC}" "VersionMinor"    ${VERSION_MINOR}
SectionEnd

;;--------------------------------
;; Descriptions
;LangString SecBrowser_Desc ${LANG_ENGLISH} "This is the Kylo Browser and is required for installation."
;LangString SecShortcuts_Desc ${LANG_ENGLISH} "These are shortcuts put on your Start Menu.  They are optional."
;LangString SecDesktopShortcuts_Desc ${LANG_ENGLISH} "Shortcut put on your Desktop.  This is optional."
;; TODO text
;LangString SecWMCShortcuts_Desc ${LANG_ENGLISH} "Shortcut put in Windows Media Center menu.  Requires Windows Media Center. This is optional."

;!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
;  !insertmacro MUI_DESCRIPTION_TEXT ${SecBrowser} $(SecBrowser_Desc)
;  !insertmacro MUI_DESCRIPTION_TEXT ${SecShortcuts} $(SecShortcuts_Desc)
;  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktopShortcuts} $(SecDesktopShortcuts_Desc)
;  !insertmacro MUI_DESCRIPTION_TEXT ${SecWMCShortcuts} $(SecWMCShortcuts_Desc)
;!insertmacro MUI_FUNCTION_DESCRIPTION_END

Function SetPrevInstDir
    ReadRegStr $0 SHCTX "${UNINSTALL_REG_LOC}" "InstallLocation"
    ${If} $0 != ""
        ; stupid bug from initial release where reg is written w/ a leading a quote
        StrCpy $1 $0 1
        ${If} $1 == "$\""
            StrCpy $INSTDIR $0 "" 1
        ${Else}
            StrCpy $INSTDIR $0
        ${EndIf}
    ${EndIf}
FunctionEnd

Function CheckInstDir
    StrCpy $Require_Uninstall "0"

    ${IfNot} ${FileExists} $INSTDIR
        !insertmacro ensureInstDirWritable
        Return
    ${EndIf}

    ${DirState} $INSTDIR $R0
    
    ${If} $R0 == 0
        ; empty dir
        !insertmacro ensureInstDirWritable
    ${ElseIf} $R0 == 1
        
        ; dir has files
        ; check the app.ini to see if it is a Polo install
        ${If} ${FileExists} $INSTDIR\application.ini
        
            StrCpy $0 $INSTDIR\application.ini
            ReadINIStr $1 $0 App Name
            ${IfNot} $1 == "${INTERNAL_NAME}"
                Call AbortOnInvalidInstallDir
                Return
            ${EndIf}
            
        ; handle the case where:
        ;      1. doing a single user install to the c:\users\xx\appdata\local\Hillcrest Labs\Kylo\
        ;      2. a previous Kylo profile exists
        ${ElseIf} "${S_DEFINSTDIR_USER}" != $INSTDIR
        ${AndIfNot} ${FileExists} $INSTDIR\Profiles
            Call AbortOnInvalidInstallDir
            Return
        ${EndIf}
        
        ; validate write permissions
        !insertmacro ensureInstDirWritable

        ; looks like a "upgrade"
        StrCpy $Require_Uninstall "1"
        ; invalid directory
    ${ElseIf} $R0 == -1
        Call AbortOnNonEmptyInstallDir
    ${EndIf}
FunctionEnd

Function AbortOnInvalidInstallDir
    MessageBox MB_OK "$(ErrBadInstallDir)"
    Abort
FunctionEnd

Function AbortOnNonEmptyInstallDir
    MessageBox MB_OK "$(ErrInstallDirNotEmpty)"
    Abort
FunctionEnd


Function PrepDirForUpgrade
    ; Move the old files out of the way so that files deleted in the new version
    ; Don't remain and cause problems

    ; TODO improve this section

    DetailPrint "Backing up installed files"
    CreateDirectory $INSTDIR\backup
    SetOutPath $INSTDIR\backup

    Rename $INSTDIR\chrome chrome
    Rename $INSTDIR\xulrunner xulrunner
    Rename $INSTDIR\extensions extensions
    Rename $INSTDIR\components components
    Rename $INSTDIR\defaults defaults
    Rename $INSTDIR\wmc wmc
    Rename $INSTDIR\uninstall.exe uninstall.exe
    Rename $INSTDIR\chrome.manifest chrome.manifest
    Rename $INSTDIR\mozcrt19.dll mozcrt19.dll
    Rename $INSTDIR\omni.jar omni.jar
    Rename $INSTDIR\${EXE_NAME} ${EXE_NAME}
    Rename $INSTDIR\${ICO_NAME} ${ICO_NAME}
    Rename $INSTDIR\application.ini     application.ini

    SetOutPath -
FunctionEnd

/**
 * Can't distribute flash plugin. Commenting out for now
 */
 
/*
Function FlashInstallerPage
    nsDialogs::Create 1018
    ; Pop the dialog hwnd
    Pop $0

    ${If} $0 == error
        Abort
    ${EndIf}

    !insertmacro MUI_HEADER_TEXT  "$(FlashInstPageTitle)" ""

    ${NSD_CreateLabel} 0 0 100% 30u $(FlashInstPageDescription)

    ${NSD_CreateCheckbox} 5% 40u 90% 15u "$(FlashInstPageTitle)"
    Pop $FlashInstallCheckBox
    ; checked by default
    ${NSD_SetState} $FlashInstallCheckBox 1

    CreateFont $0 "Tahoma" 10 700
    SendMessage $FlashInstallCheckBox ${WM_SETFONT} $0 0


;    ${IfNot} ${UAC_IsAdmin}
;        EnableWindow $FlashInstallCheckBox 0
;        ${NSD_SetState} $FlashInstallCheckBox 0
;
;        ${NSD_CreateLabel} 0 70u 100% 30u "Installation of the Adobe Flash Player 10 Plugin requires administrator access."
;        Pop $1
;
;        CreateFont $0 "Tahoma" 9
;        SendMessage $1 ${WM_SETFONT} $0 0
;        SetCtlColors $1 0xCC0000 transparent
;    ${EndIf}

    nsDialogs::Show
FunctionEnd

Function FlashInstallerPage_Leave
    ; Launch the flash installer if the box is checked
    ${NSD_GetState} $FlashInstallCheckBox $FlashInstallCheckBox_State
    ${If} $FlashInstallCheckBox_State == 1
        Call FlashInstallPage_DoInstall
    ${EndIf}
FunctionEnd

Function FlashInstallPage_DoInstall
    StrCpy $R0 "$PLUGINSDIR\install_flash_player_10.exe"
    File /oname=$R0  redist\install_flash_player_10.exe
    ${If} ${UAC_IsAdmin}
        ExecWait $R0
    ${Else}
        ; Exec, ExecWait will not launch the adobe installer and do a UAC prompt
        ; ExecShell will, the lines below try and do "ExecShellWait"
        ; http://nsis.sourceforge.net/ShellExecWait
        !insertmacro ShellExecWait "" $R0 "" "" ${SW_SHOW} $1
    ${EndIf}
    Delete $R0
FunctionEnd
*/

Function FinishPage_Show
    ; disable the back button if flash install was attempted
    ${If} $FlashInstallCheckBox_State == 1
        GetDlGItem $0 $HWNDPARENT 3
        EnableWindow $0 0
    ${EndIf}
FunctionEnd

Function LaunchPolo
    !insertmacro UAC_AsUser_ExecShell "" "${EXE_NAME}" "" "$INSTDIR" ""
FunctionEnd

Function LicensePage
    InitPluginsDir

    !insertmacro MUI_HEADER_TEXT "$(LicPageHeader)" "$(LicPageSubHeader)"

    ; Place the License file (which should be located in the same directory as this nsi file) in the temporary plugins directory.
    ; The plugins directory is deleted when the installer quits, so the License file will be deleted as well.
    File "/oname=$PLUGINSDIR\eula.rtf" ${LICENSE_FILE}

    nsDialogs::Create 1018
    Pop $Dialog

    ${If} $Dialog == error
        Abort
    ${Endif}

    ; Text above license box
    ${NSD_CreateLabel} 0 0 100% 12u "$(LicPagePageDownInstr)"
    Pop $PageDownMessage

    ; License box
    nsDialogs::CreateControl /NOUNLOAD "RichEdit20A" ${DEFAULT_STYLES}|${WS_VSCROLL}|${ES_MULTILINE} ${__NSD_Text_EXSTYLE} 1u 12u -1u 90u ''
    Pop $LicenseTextBox

    ; Text after license box
    ${NSD_CreateLabel} 0 -55 100% 16u "$(LicPageAcceptInstr)"
    Pop $IfYouAcceptMessage

    ; Print license agreement button
    ${NSD_CreateButton} 10u -20 30% 12u "$(LicPagePrintButton)"
    Pop $PrintButton
    GetFunctionAddress $0 PrintOnClick
    nsDialogs::OnClick $PrintButton $0

    ; I Agree button
    ${NSD_CreateCheckbox} -50u -20 20% 16u "$(LicPageAgreeButton)"
    Pop $AgreeCheckBox
    ; Set unchecked by default
    ${NSD_SetState} $AgreeCheckBox 0
    GetFunctionAddress $0 ToggleNext
    nsDialogs::OnClick $AgreeCheckBox $0

    ; Call to custom license plugin to load licene file into license text box
    CustomLicense::LoadFile "$PLUGINSDIR\eula.rtf" $LicenseTextBox
    SendMessage $LicenseTextBox ${EM_SETREADONLY} $0 0

    ; Disable the Next button so that control is shifted to selection of the I Agree button.
    ; It is currently field number 1.
    GetDlGItem $0 $HWNDPARENT 1
    EnableWindow $0 0

    nsDialogs::Show
FunctionEnd

Function ToggleNext
    ; Toggle the next button based on the state of the I Agree box. This allows
    ; the user to select and unselect this checkbox with the affect being passed
    ; on to the next button as appropriate.
    GetDlGItem $0 $HWNDPARENT 1

    ; Determine the state of the checkbox
    ${NSD_GetState} $AgreeCheckBox $AgreeBoxState

    ; Toggle the next button accordingly
    ${If} $AgreeBoxState == 0
        EnableWindow $0 0
    ${Else}
        EnableWindow $0 1
    ${EndIf}
FunctionEnd

Function PrintOnClick

    # Print out the license agreement file using the ExecShell command and
    # check for errors
    ClearErrors
    ExecShell "print" "$PLUGINSDIR\${LICENSE_FILE}"

    ifErrors error noError
         noError:
             Return
         error:
             MessageBox MB_OK "$(LicPagePrintFailed)"
             Return
FunctionEnd

Function CheckWMCSection
    ${If} $IsWMCInstalled == 0
        SectionSetFlags ${SecWMCShortcuts} ${SF_RO}
    ${EndIf}
FunctionEnd

!macroend

!macro ensureInstDirWritable
    ClearErrors
    CreateDirectory $INSTDIR
    ${If} ${Errors}
        ClearErrors
        MessageBox MB_ICONEXCLAMATION "$(ErrNoDirWriteAccess)"
        Abort
    ${EndIf}

    GetTempFileName $9 $INSTDIR
    ${If} ${Errors}
        ClearErrors
        MessageBox MB_ICONEXCLAMATION "$(ErrNoDirWriteAccess)"
        Abort
    ${EndIf}
    Delete $9
!macroend
