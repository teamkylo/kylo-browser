# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright 2005-2012 Hillcrest Laboratories, Inc.  All rights reserved.  Hillcrest Laboratories, and the Hillcrest logo are registered trademarks of Hillcrest Laboratories, Inc.

CMAKE_MINIMUM_REQUIRED(VERSION 2.8)

PROJECT(MouseEventTool)

SET(BUILD_DIR ${CMAKE_SOURCE_DIR}/build)

FILE(TO_NATIVE_PATH ${XULRUNNER_SDK_PATH}/bin/xpidl.exe XPIDL)

FILE(TO_NATIVE_PATH ${XULRUNNER_SDK_PATH}/sdk/bin/header.py HEADER_PY)
FILE(TO_NATIVE_PATH ${XULRUNNER_SDK_PATH}/sdk/bin/typelib.py TYPELIB_PY)

FILE(TO_NATIVE_PATH ${XULRUNNER_SDK_PATH}/idl IDL_INCLUDE_PATH)
FILE(TO_NATIVE_PATH ${XULRUNNER_SDK_PATH}/include XULRUNNER_SDK_INCLUDE) 
FILE(TO_NATIVE_PATH ${CMAKE_SOURCE_DIR} MOUSEEVENTTOOL_SRC_NATIVE)

INCLUDE_DIRECTORIES(
    ${XULRUNNER_SDK_INCLUDE}
    ${MOUSEEVENTTOOL_SRC_NATIVE}
)

STRING(REGEX REPLACE "^([0-9]+)\\..*" "\\1" MAJOR_VER ${GECKO})

MATH(EXPR MAJOR_VER_NUM ${MAJOR_VER})

IF(MAJOR_VER_NUM EQUAL 9 OR MAJOR_VER_NUM GREATER 9)
    ADD_CUSTOM_COMMAND(
        OUTPUT ${CMAKE_SOURCE_DIR}/IMouseEventTool.h ${CMAKE_SOURCE_DIR}/IMouseEventTool.xpt
        
        COMMAND ${HEADER_PY} -I \"${IDL_INCLUDE_PATH}\" --cachedir=${BUILD_DIR}/pyxpidl_cache -o IMouseEventTool.h IMouseEventTool.idl
        COMMAND ${TYPELIB_PY} -I \"${IDL_INCLUDE_PATH}\" --cachedir=${BUILD_DIR}/pyxpidl_cache -o IMouseEventTool.xpt IMouseEventTool.idl
    
        WORKING_DIRECTORY ${MOUSEEVENTTOOL_SRC_NATIVE}
    )
ELSE()
    ADD_CUSTOM_COMMAND(
        OUTPUT ${CMAKE_SOURCE_DIR}/IMouseEventTool.h ${CMAKE_SOURCE_DIR}/IMouseEventTool.xpt
        
        COMMAND ${XPIDL} -m header -I \"${IDL_INCLUDE_PATH}\" -e IMouseEventTool.h IMouseEventTool.idl
        COMMAND ${XPIDL} -m typelib -I \"${IDL_INCLUDE_PATH}\" -e IMouseEventTool.xpt IMouseEventTool.idl
    
        WORKING_DIRECTORY ${MOUSEEVENTTOOL_SRC_NATIVE}
    ) 
ENDIF()

ADD_LIBRARY(MouseEventTool SHARED
    ${CMAKE_SOURCE_DIR}/IMouseEventTool.h
    ${CMAKE_SOURCE_DIR}/MouseEventTool.h
    ${CMAKE_SOURCE_DIR}/MouseEventTool-module.cpp
    ${CMAKE_SOURCE_DIR}/MouseEventTool-win32.cpp 
)

ADD_DEFINITIONS(-DWIN32 -D_WINDOWS -D_USRDLL -DXP_WIN -DXP_WIN32 -DUNICODE -D_UNICODE)
ADD_DEFINITIONS(-D_WIN32_WINNT=0x0500)

IF(MAJOR_VER_NUM LESS 10)
    ADD_DEFINITIONS(-DXPCOM_USE_PRBOOL)
ENDIF()

TARGET_LINK_LIBRARIES(MouseEventTool 
    ${XULRUNNER_SDK_PATH}/lib/xpcomglue_s.lib
    ${XULRUNNER_SDK_PATH}/lib/xpcom.lib
    ${XULRUNNER_SDK_PATH}/lib/nspr4.lib
    ${XULRUNNER_SDK_PATH}/lib/mozalloc.lib
)