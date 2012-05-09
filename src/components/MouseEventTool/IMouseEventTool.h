/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM IMouseEventTool.idl
 */

#ifndef __gen_IMouseEventTool_h__
#define __gen_IMouseEventTool_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    MouseEventCallback */
#define MOUSEEVENTCALLBACK_IID_STR "f4ef8906-55a3-4ea1-8360-b511cd6e2a0a"

#define MOUSEEVENTCALLBACK_IID \
  {0xf4ef8906, 0x55a3, 0x4ea1, \
    { 0x83, 0x60, 0xb5, 0x11, 0xcd, 0x6e, 0x2a, 0x0a }}

class NS_NO_VTABLE NS_SCRIPTABLE MouseEventCallback : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(MOUSEEVENTCALLBACK_IID)

  /* void MouseEvent (in short eventType, in short mouseX, in short mouseY, in short mouseDx, in short mouseDy, in short scroll); */
  NS_SCRIPTABLE NS_IMETHOD MouseEvent(PRInt16 eventType, PRInt16 mouseX, PRInt16 mouseY, PRInt16 mouseDx, PRInt16 mouseDy, PRInt16 scroll) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(MouseEventCallback, MOUSEEVENTCALLBACK_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_MOUSEEVENTCALLBACK \
  NS_SCRIPTABLE NS_IMETHOD MouseEvent(PRInt16 eventType, PRInt16 mouseX, PRInt16 mouseY, PRInt16 mouseDx, PRInt16 mouseDy, PRInt16 scroll); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_MOUSEEVENTCALLBACK(_to) \
  NS_SCRIPTABLE NS_IMETHOD MouseEvent(PRInt16 eventType, PRInt16 mouseX, PRInt16 mouseY, PRInt16 mouseDx, PRInt16 mouseDy, PRInt16 scroll) { return _to MouseEvent(eventType, mouseX, mouseY, mouseDx, mouseDy, scroll); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_MOUSEEVENTCALLBACK(_to) \
  NS_SCRIPTABLE NS_IMETHOD MouseEvent(PRInt16 eventType, PRInt16 mouseX, PRInt16 mouseY, PRInt16 mouseDx, PRInt16 mouseDy, PRInt16 scroll) { return !_to ? NS_ERROR_NULL_POINTER : _to->MouseEvent(eventType, mouseX, mouseY, mouseDx, mouseDy, scroll); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public MouseEventCallback
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_MOUSEEVENTCALLBACK

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, MouseEventCallback)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* void MouseEvent (in short eventType, in short mouseX, in short mouseY, in short mouseDx, in short mouseDy, in short scroll); */
NS_IMETHODIMP _MYCLASS_::MouseEvent(PRInt16 eventType, PRInt16 mouseX, PRInt16 mouseY, PRInt16 mouseDx, PRInt16 mouseDy, PRInt16 scroll)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


/* starting interface:    IMouseEventTool */
#define IMOUSEEVENTTOOL_IID_STR "5ba97c79-1c4e-4187-a43d-3d7ce5fd8ab2"

#define IMOUSEEVENTTOOL_IID \
  {0x5ba97c79, 0x1c4e, 0x4187, \
    { 0xa4, 0x3d, 0x3d, 0x7c, 0xe5, 0xfd, 0x8a, 0xb2 }}

class NS_NO_VTABLE NS_SCRIPTABLE IMouseEventTool : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(IMOUSEEVENTTOOL_IID)

  /* void RemapButton (in string processName, in short inputEvent, in short outputEvent); */
  NS_SCRIPTABLE NS_IMETHOD RemapButton(const char * processName, PRInt16 inputEvent, PRInt16 outputEvent) = 0;

  /* void UnmapButton (in string processName, in short inputEvent); */
  NS_SCRIPTABLE NS_IMETHOD UnmapButton(const char * processName, PRInt16 inputEvent) = 0;

  /* void HackForceFullScreen (in boolean shouldMakeFullScreenOrNot); */
  NS_SCRIPTABLE NS_IMETHOD HackForceFullScreen(bool shouldMakeFullScreenOrNot) = 0;

  /* attribute MouseEventCallback objCallback; */
  NS_SCRIPTABLE NS_IMETHOD GetObjCallback(MouseEventCallback * *aObjCallback) = 0;
  NS_SCRIPTABLE NS_IMETHOD SetObjCallback(MouseEventCallback *aObjCallback) = 0;

  enum { WM_LBUTTONDOWN = 513 };

  enum { WM_LBUTTONUP = 514 };

  enum { WM_LBUTTONDBLCLK = 515 };

  enum { WM_RBUTTONDOWN = 516 };

  enum { WM_RBUTTONUP = 517 };

  enum { WM_RBUTTONDBLCLK = 518 };

  enum { WM_KEYDOWN = 256 };

  enum { WM_KEYUP = 257 };

  enum { WM_MBUTTONDOWN = 519 };

  enum { WM_MBUTTONUP = 520 };

  enum { WM_MBUTTONDBLCLK = 521 };

  enum { WM_MOUSEWHEEL = 522 };

  enum { VK_NO_EVENT = 0 };

  enum { VK_LBUTTON = 1 };

  enum { VK_RBUTTON = 2 };

  enum { VK_CANCEL = 3 };

  enum { VK_MBUTTON = 4 };

  enum { VK_BACK = 8 };

  enum { VK_TAB = 9 };

  enum { VK_CLEAR = 12 };

  enum { VK_RETURN = 13 };

  enum { VK_SHIFT = 16 };

  enum { VK_CONTROL = 17 };

  enum { VK_MENU = 18 };

  enum { VK_PAUSE = 19 };

  enum { VK_CAPITAL = 20 };

  enum { VK_ESCAPE = 27 };

  enum { VK_SPACE = 32 };

  enum { VK_PRIOR = 33 };

  enum { VK_NEXT = 34 };

  enum { VK_END = 35 };

  enum { VK_HOME = 36 };

  enum { VK_LEFT = 37 };

  enum { VK_UP = 38 };

  enum { VK_RIGHT = 39 };

  enum { VK_DOWN = 40 };

  enum { VK_SELECT = 41 };

  enum { VK_PRINT = 42 };

  enum { VK_EXECUTE = 43 };

  enum { VK_SNAPSHOT = 44 };

  enum { VK_INSERT = 45 };

  enum { VK_DELETE = 46 };

  enum { VK_HELP = 47 };

  enum { VK_0 = 48 };

  enum { VK_1 = 49 };

  enum { VK_2 = 50 };

  enum { VK_3 = 51 };

  enum { VK_4 = 52 };

  enum { VK_5 = 53 };

  enum { VK_6 = 54 };

  enum { VK_7 = 55 };

  enum { VK_8 = 56 };

  enum { VK_9 = 57 };

  enum { VK_A = 65 };

  enum { VK_B = 66 };

  enum { VK_C = 67 };

  enum { VK_D = 68 };

  enum { VK_E = 69 };

  enum { VK_F = 70 };

  enum { VK_G = 71 };

  enum { VK_H = 72 };

  enum { VK_I = 73 };

  enum { VK_J = 74 };

  enum { VK_K = 75 };

  enum { VK_L = 76 };

  enum { VK_M = 77 };

  enum { VK_N = 78 };

  enum { VK_O = 79 };

  enum { VK_P = 80 };

  enum { VK_Q = 81 };

  enum { VK_R = 82 };

  enum { VK_S = 83 };

  enum { VK_T = 84 };

  enum { VK_U = 85 };

  enum { VK_V = 86 };

  enum { VK_W = 87 };

  enum { VK_X = 88 };

  enum { VK_Y = 89 };

  enum { VK_Z = 90 };

  enum { VK_NUMPAD0 = 96 };

  enum { VK_NUMPAD1 = 97 };

  enum { VK_NUMPAD2 = 98 };

  enum { VK_NUMPAD3 = 99 };

  enum { VK_NUMPAD4 = 100 };

  enum { VK_NUMPAD5 = 101 };

  enum { VK_NUMPAD6 = 102 };

  enum { VK_NUMPAD7 = 103 };

  enum { VK_NUMPAD8 = 104 };

  enum { VK_NUMPAD9 = 105 };

  enum { VK_SEPARATOR = 108 };

  enum { VK_SUBTRACT = 109 };

  enum { VK_DECIMAL = 110 };

  enum { VK_DIVIDE = 111 };

  enum { VK_F1 = 112 };

  enum { VK_F2 = 113 };

  enum { VK_F3 = 114 };

  enum { VK_F4 = 115 };

  enum { VK_F5 = 116 };

  enum { VK_F6 = 117 };

  enum { VK_F7 = 118 };

  enum { VK_F8 = 119 };

  enum { VK_F9 = 120 };

  enum { VK_F10 = 121 };

  enum { VK_F11 = 122 };

  enum { VK_F12 = 123 };

  enum { VK_F13 = 124 };

  enum { VK_F14 = 125 };

  enum { VK_F15 = 126 };

  enum { VK_F16 = 127 };

  enum { VK_F17 = 128 };

  enum { VK_F18 = 129 };

  enum { VK_F19 = 130 };

  enum { VK_F20 = 131 };

  enum { VK_F21 = 132 };

  enum { VK_F22 = 133 };

  enum { VK_F23 = 134 };

  enum { VK_F24 = 135 };

  enum { VK_SCROLL = 145 };

  enum { VK_LSHIFT = 160 };

  enum { VK_RSHIFT = 161 };

  enum { VK_LCONTROL = 162 };

  enum { VK_RCONTROL = 163 };

  enum { VK_LMENU = 164 };

  enum { VK_RMENU = 165 };

  enum { VK_PLAY = 250 };

  enum { VK_ZOOM = 251 };

  enum { VK_BROWSER_BACK = 166 };

  enum { VK_BROWSER_FORWARD = 167 };

  enum { VK_BROWSER_REFRESH = 168 };

  enum { VK_BROWSER_STOP = 169 };

  enum { VK_BROWSER_SEARCH = 170 };

  enum { VK_BROWSER_FAVORITES = 171 };

  enum { VK_BROWSER_HOME = 172 };

  enum { VK_VOLUME_MUTE = 173 };

  enum { VK_VOLUME_DOWN = 174 };

  enum { VK_VOLUME_UP = 175 };

  enum { VK_MEDIA_NEXT_TRACK = 176 };

  enum { VK_MEDIA_PREV_TRACK = 177 };

  enum { VK_MEDIA_STOP = 178 };

  enum { VK_MEDIA_PLAY_PAUSE = 179 };

};

  NS_DEFINE_STATIC_IID_ACCESSOR(IMouseEventTool, IMOUSEEVENTTOOL_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_IMOUSEEVENTTOOL \
  NS_SCRIPTABLE NS_IMETHOD RemapButton(const char * processName, PRInt16 inputEvent, PRInt16 outputEvent); \
  NS_SCRIPTABLE NS_IMETHOD UnmapButton(const char * processName, PRInt16 inputEvent); \
  NS_SCRIPTABLE NS_IMETHOD HackForceFullScreen(bool shouldMakeFullScreenOrNot); \
  NS_SCRIPTABLE NS_IMETHOD GetObjCallback(MouseEventCallback * *aObjCallback); \
  NS_SCRIPTABLE NS_IMETHOD SetObjCallback(MouseEventCallback *aObjCallback); \

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_IMOUSEEVENTTOOL(_to) \
  NS_SCRIPTABLE NS_IMETHOD RemapButton(const char * processName, PRInt16 inputEvent, PRInt16 outputEvent) { return _to RemapButton(processName, inputEvent, outputEvent); } \
  NS_SCRIPTABLE NS_IMETHOD UnmapButton(const char * processName, PRInt16 inputEvent) { return _to UnmapButton(processName, inputEvent); } \
  NS_SCRIPTABLE NS_IMETHOD HackForceFullScreen(bool shouldMakeFullScreenOrNot) { return _to HackForceFullScreen(shouldMakeFullScreenOrNot); } \
  NS_SCRIPTABLE NS_IMETHOD GetObjCallback(MouseEventCallback * *aObjCallback) { return _to GetObjCallback(aObjCallback); } \
  NS_SCRIPTABLE NS_IMETHOD SetObjCallback(MouseEventCallback *aObjCallback) { return _to SetObjCallback(aObjCallback); } \

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_IMOUSEEVENTTOOL(_to) \
  NS_SCRIPTABLE NS_IMETHOD RemapButton(const char * processName, PRInt16 inputEvent, PRInt16 outputEvent) { return !_to ? NS_ERROR_NULL_POINTER : _to->RemapButton(processName, inputEvent, outputEvent); } \
  NS_SCRIPTABLE NS_IMETHOD UnmapButton(const char * processName, PRInt16 inputEvent) { return !_to ? NS_ERROR_NULL_POINTER : _to->UnmapButton(processName, inputEvent); } \
  NS_SCRIPTABLE NS_IMETHOD HackForceFullScreen(bool shouldMakeFullScreenOrNot) { return !_to ? NS_ERROR_NULL_POINTER : _to->HackForceFullScreen(shouldMakeFullScreenOrNot); } \
  NS_SCRIPTABLE NS_IMETHOD GetObjCallback(MouseEventCallback * *aObjCallback) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetObjCallback(aObjCallback); } \
  NS_SCRIPTABLE NS_IMETHOD SetObjCallback(MouseEventCallback *aObjCallback) { return !_to ? NS_ERROR_NULL_POINTER : _to->SetObjCallback(aObjCallback); } \

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public IMouseEventTool
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IMOUSEEVENTTOOL

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, IMouseEventTool)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* void RemapButton (in string processName, in short inputEvent, in short outputEvent); */
NS_IMETHODIMP _MYCLASS_::RemapButton(const char * processName, PRInt16 inputEvent, PRInt16 outputEvent)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void UnmapButton (in string processName, in short inputEvent); */
NS_IMETHODIMP _MYCLASS_::UnmapButton(const char * processName, PRInt16 inputEvent)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void HackForceFullScreen (in boolean shouldMakeFullScreenOrNot); */
NS_IMETHODIMP _MYCLASS_::HackForceFullScreen(bool shouldMakeFullScreenOrNot)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* attribute MouseEventCallback objCallback; */
NS_IMETHODIMP _MYCLASS_::GetObjCallback(MouseEventCallback * *aObjCallback)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}
NS_IMETHODIMP _MYCLASS_::SetObjCallback(MouseEventCallback *aObjCallback)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_IMouseEventTool_h__ */
