!macro _GetUserShellFolderFromRegistry_SetEnv env regh regp regv expenv tmpvar
System::Call 'kernel32::GetEnvironmentVariable(t "${env}",t.s,i ${NSIS_MAX_STRLEN})i'
ReadRegStr ${tmpvar} ${regh} "${regp}" "${regv}"
!if "${expenv}" != ""
    ExpandEnvStrings ${tmpvar} ${tmpvar}
!endif
System::Call 'kernel32::SetEnvironmentVariable(t "${env}",t "${tmpvar}")'
!macroend
!macro _GetUserShellFolderFromRegistry_RestoreEnv env
System::Call 'kernel32::SetEnvironmentVariable(t "${env}",ts)'
!macroend
 
Function un.GetUserShellFolderFromRegistry
Exch $1 ;_hku
Exch
Exch $2 ;_shellfolderid
Push $0
Push $3
;NOTE: we try the legacy key first so we don't have to expand
ReadRegStr $0 HKU "$1\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" $2
${If} $0 == ""
    StrCpy $3 $1 3
    ${If} $3 == "S-1"
        ReadRegStr $2 HKU "$1\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders" $2
        ;Let's hope other env strings like username is not used by anyone
        !insertmacro _GetUserShellFolderFromRegistry_SetEnv "APPDATA" HKU "$1\Volatile Environment" APPDATA "" $3
        !insertmacro _GetUserShellFolderFromRegistry_SetEnv "HOMEDRIVE" HKU "$1\Volatile Environment" HOMEDRIVE "" $3
        !insertmacro _GetUserShellFolderFromRegistry_SetEnv "HOMEPATH" HKU "$1\Volatile Environment" HOMEPATH "" $3
        !insertmacro _GetUserShellFolderFromRegistry_SetEnv "HOMESHARE" HKU "$1\Volatile Environment" HOMESHARE "" $3
        !insertmacro _GetUserShellFolderFromRegistry_SetEnv "userprofile" HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\$1" ProfileImagePath x $3
        ExpandEnvStrings $0 $2
        !insertmacro _GetUserShellFolderFromRegistry_RestoreEnv "userprofile"
        !insertmacro _GetUserShellFolderFromRegistry_RestoreEnv "HOMESHARE"
        !insertmacro _GetUserShellFolderFromRegistry_RestoreEnv "HOMEPATH"
        !insertmacro _GetUserShellFolderFromRegistry_RestoreEnv "HOMEDRIVE"
        !insertmacro _GetUserShellFolderFromRegistry_RestoreEnv "APPDATA"
    ${Endif}
${EndIf}
StrCpy $1 $0
Pop $3
Pop $0
Pop $2
Exch $1
FunctionEnd
!macro un.GetUserShellFolderFromRegistry _shellfolderid _hku _outvar
push "${_shellfolderid}"
push "${_hku}"
call un.GetUserShellFolderFromRegistry
!if "${_outvar}" != ""
    pop ${_outvar}
!endif
!macroend