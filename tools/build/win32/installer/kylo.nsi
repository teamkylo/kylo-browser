/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 * 
 * Copyright 2005-2012 Hillcrest Laboratories, Inc. All rights reserved. 
 * Hillcrest Labs, the Loop, Kylo, the Kylo logo and the Kylo cursor are 
 * trademarks of Hillcrest Laboratories, Inc.
 * */

;
; NSIS Setup script for Kylo
;
;
;


#!define DEBUG_BUILD
#!define DEBUG_NOJAR

!ifndef DEBUG_BUILD
    SetCompressor /SOLID lzma
!else
    !echo "**** DEBUG BUILD *****"
    !echo "**********************"
    !echo "**********************"
    !warning "**** SetCompress off *****"
    SetCompress off
!endif

; Directory with entire Kylo app tree - fully assembled
!ifndef APP_DIR
    !define APP_DIR "..\..\..\build\win32\kylo\application"
!endif

; Contains icons, images for installer, etc.
!ifndef RESOURCE_DIR
    !define RESOURCE_DIR "..\resources"
!endif

; Contains redistributable packages
!ifndef REDIST_DIR
    !define REDIST_DIR "redist"
!endif

; License file definition
!ifndef LICENSE_FILE
    !define LICENSE_FILE "..\..\common\resources\eula.rtf"
!endif

; Where's this installer go when we're done?
!ifndef OUT_FILE_DIR
    !define OUT_FILE_DIR    ".."
!endif

!ifndef LOCALE
    !define LOCALE "en-US"
!endif

!addincludedir  "includes"
!addincludedir  "l10n"
!addplugindir   "plugins"

; =============================================================================
; Metadata variables
!define PRODUCT_NAME        "Kylo Browser"
!define PUBLISHER           "Hillcrest Labs, Inc."
!define INTERNAL_NAME       "Kylo"
!define INSTALL_PARENT_DIR  "Hillcrest Labs"
!define PROFILE_PARENT_DIR  "Hillcrest Labs"
!define START_MENU_GROUP    "Hillcrest Labs Kylo Browser"
!define SHORTCUT_NAME       "Kylo"

!define INSTALL_DIR_NAME    "${INTERNAL_NAME}"
!define DEFAULT_INSTALL_DIR "${INSTALL_PARENT_DIR}\${INSTALL_DIR_NAME}"
!define EXE_NAME            "Kylo.exe"
!define ICO_NAME            "Kylo.ico"

!define FLASH_PLUGIN        "install_flash_player_11_plugin_32bit.exe"
!define MSVC_REDIST         "vcredist_x86.exe"

!define S_DEFINSTDIR_USER   "$LOCALAPPDATA\${DEFAULT_INSTALL_DIR}"
!define S_DEFINSTDIR_ADMIN  "$PROGRAMFILES\${DEFAULT_INSTALL_DIR}"
!define UNINSTALLER_FULLPATH "$InstDir\uninstall.exe"

!define UNINSTALL_REG_LOC   "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define UAC_DUALMODE_ALLUSER_TEST_REGKEY    "${UNINSTALL_REG_LOC}"
!define UAC_DUALMODE_ALLUSER_TEST_REGVALUE  "InstallLocation"

!define ABOUT_SITE_URL      "http://connect.kylo.tv/about"
!define HELP_SITE_URL       "http://connect.kylo.tv/support"

; Icon
!define MUI_ICON "${RESOURCE_DIR}\Kylo.ico"

; Installer Graphics
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${RESOURCE_DIR}\nsis_header_image.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${RESOURCE_DIR}\nsis_welcome_finish.bmp"

!ifndef BUILD_ID
    !define BUILD_ID        "00000000000000"
!endif

!ifndef WIN_VERSION
    !define WIN_VERSION     "0.0.0.0"
!endif

!ifndef FULL_VERSION
    !define FULL_VERSION    "0.0.0.0"
!endif

!ifndef FILENAME_VERSION
    !define FILENAME_VERSION "0_0_0_0"
!endif

!ifndef VERSION_MAJOR
    !define VERSION_MAJOR   0
!endif

!ifndef VERSION_MINOR
    !define VERSION_MINOR   0
!endif

!ifndef DISPLAY_VERSION
    !define DISPLAY_VERSION    "0.0.0"
!endif

!ifndef OUT_FILE_NAME
  !if ${LOCALE} == "en-US"
      !define OUT_FILE_NAME       "${OUT_FILE_DIR}\kylo-setup-${FILENAME_VERSION}.exe"
  !else
      !define OUT_FILE_NAME       "${OUT_FILE_DIR}\kylo-setup-${LOCALE}-${FILENAME_VERSION}.exe"
  !endif
!endif
; =============================================================================

; The name of the installer
Name "${INTERNAL_NAME}"

; The file to write
OutFile "${OUT_FILE_NAME}"

; Include all the other pieces now...
!include LogicLib.nsh
!include nsDialogs.nsh
!include winmessages.nsh
!include MUI2.nsh
!include UAC.nsh
!include FileFunc.nsh
!include Sections.nsh
!include ShellExecWait.nsh
!include WinVer.nsh

!include kylo-UAC.nsh
!include kylo-install.nsh
!include kylo-uninstall.nsh


!macro killApp un
    Function ${un}killApp
        StrCpy $0 "${EXE_NAME}"
        KillProc::FindProcesses
        StrCmp $0 "0" continue goodNews

        continue:
            DetailPrint "No running instances of ${PRODUCT_NAME} found"
            Return

        badNews:
            MessageBox MB_OK "$(AppCloseFailed)"
            Abort

        goodNews:
            MessageBox MB_OKCANCEL "$(RequireAppExitToInstall)" IDOK killAndInstall IDCANCEL closeInstaller

            killAndInstall:
                StrCpy $0 "${EXE_NAME}"
                DetailPrint "Closing ${EXE_NAME}"
                KillProc::KillProcesses
                Sleep 2000
                StrCmp $1 "-1" badNews
                Return

            closeInstaller:
                Abort

        Pop $R0
    FunctionEnd
!macroend

!macro CheckWMCInstalled un
    Var IsWMCInstalled
    Function ${un}CheckWMCInstalled
        ${If} ${FileExists} $WINDIR\ehome\RegisterMCEApp.exe
            StrCpy $IsWMCInstalled 1
        ${Else}
            StrCpy $IsWMCInstalled 0
        ${EndIf}
    FunctionEnd
!macroend


!define CALL_SIGN_UNINSTALLER
!macro SIGN_UNINSTALLER path
    !if "$%SIGNTOOL_PATH%"
        !echo "Signing ${path}"
        !system "$%SIGNTOOL_PATH%\run_signtool.bat ${path}" = 0
    !else
         !echo "%SIGNTOOL_PATH% not found; skipping for ${path}"
    !endif
!macroend


!ifndef BUILDUNINST
    !echo "Main invocation of polo.nsi, building installer"
    RequestExecutionLevel user
    !insertmacro killApp ""
    !insertmacro CheckWMCInstalled ""

    !insertmacro BUILD_INSTALLER
    !echo "Main invocation done"
!else
    !echo "============= Inner invocation of polo.nsi to create uninstaller.exe ============="
    SilentInstall silent
    OutFile "${UNINSTEXE}"
    !if ${BUILDUNINST} > 0
        !echo " -- Inner invocation for admin uninstaller.exe"
        RequestExecutionLevel admin
    !else
        !echo " -- Inner invocation for current-user uninstaller.exe"
        RequestExecutionLevel user
    !endif

    !insertmacro MUI_PAGE_INSTFILES

    !insertmacro killApp "un."
    !insertmacro CheckWMCInstalled "un."
    !insertmacro BUILD_UNINSTALLER
    Section
        WriteUninstaller "${UNINSTEXE}.un"
    SectionEnd
    !echo "============= Inner invocation Done ============="
!endif

; =============================================================================
!macro addSetupFileVersionInfo
;Version Information

; Common for all languages
VIProductVersion "${WIN_VERSION}"
VIAddVersionKey "BuildID"           "${BUILD_ID}"
VIAddVersionKey "InternalName"      "${INTERNAL_NAME}"
VIAddVersionKey "FileVersion"       "${DISPLAY_VERSION}"
VIAddVersionKey "ProductVersion"    "${FULL_VERSION}"

VIAddVersionKey "FileDescription"   "${SetupFileDescription}"
VIAddVersionKey "LegalCopyright"    "${LegalCopyright}"
VIAddVersionKey "Publisher"         "${PUBLISHER}"
VIAddVersionKey "CompanyName"       "${PUBLISHER}"
VIAddVersionKey "LegalTrademarks"   "${LegalTrademarks}"
VIAddVersionKey "ProductName"       "${ProductDisplayName}"
VIAddVersionKey "Comments"          "${SetupFileComment}"

VIAddVersionKey "OriginalFilename"  "${OUT_FILE_NAME}"
!macroend

!include "${LOCALE}.nsh" 
!insertmacro addSetupFileVersionInfo
