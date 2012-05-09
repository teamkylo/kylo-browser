/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM ISendKeys.idl
 */

#ifndef __gen_ISendKeys_h__
#define __gen_ISendKeys_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    ISendKeys */
#define ISENDKEYS_IID_STR "fd066436-aeef-4249-9be6-02e7abdf6750"

#define ISENDKEYS_IID \
  {0xfd066436, 0xaeef, 0x4249, \
    { 0x9b, 0xe6, 0x02, 0xe7, 0xab, 0xdf, 0x67, 0x50 }}

class NS_NO_VTABLE NS_SCRIPTABLE ISendKeys : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(ISENDKEYS_IID)

  /* void key_up (in octet vk); */
  NS_SCRIPTABLE NS_IMETHOD Key_up(PRUint8 vk) = 0;

  /* void key_down (in octet vk); */
  NS_SCRIPTABLE NS_IMETHOD Key_down(PRUint8 vk) = 0;

  /* void char_up (in wchar key); */
  NS_SCRIPTABLE NS_IMETHOD Char_up(PRUnichar key) = 0;

  /* void char_down (in wchar key); */
  NS_SCRIPTABLE NS_IMETHOD Char_down(PRUnichar key) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(ISendKeys, ISENDKEYS_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_ISENDKEYS \
  NS_SCRIPTABLE NS_IMETHOD Key_up(PRUint8 vk); \
  NS_SCRIPTABLE NS_IMETHOD Key_down(PRUint8 vk); \
  NS_SCRIPTABLE NS_IMETHOD Char_up(PRUnichar key); \
  NS_SCRIPTABLE NS_IMETHOD Char_down(PRUnichar key); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_ISENDKEYS(_to) \
  NS_SCRIPTABLE NS_IMETHOD Key_up(PRUint8 vk) { return _to Key_up(vk); } \
  NS_SCRIPTABLE NS_IMETHOD Key_down(PRUint8 vk) { return _to Key_down(vk); } \
  NS_SCRIPTABLE NS_IMETHOD Char_up(PRUnichar key) { return _to Char_up(key); } \
  NS_SCRIPTABLE NS_IMETHOD Char_down(PRUnichar key) { return _to Char_down(key); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_ISENDKEYS(_to) \
  NS_SCRIPTABLE NS_IMETHOD Key_up(PRUint8 vk) { return !_to ? NS_ERROR_NULL_POINTER : _to->Key_up(vk); } \
  NS_SCRIPTABLE NS_IMETHOD Key_down(PRUint8 vk) { return !_to ? NS_ERROR_NULL_POINTER : _to->Key_down(vk); } \
  NS_SCRIPTABLE NS_IMETHOD Char_up(PRUnichar key) { return !_to ? NS_ERROR_NULL_POINTER : _to->Char_up(key); } \
  NS_SCRIPTABLE NS_IMETHOD Char_down(PRUnichar key) { return !_to ? NS_ERROR_NULL_POINTER : _to->Char_down(key); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public ISendKeys
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_ISENDKEYS

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, ISendKeys)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* void key_up (in octet vk); */
NS_IMETHODIMP _MYCLASS_::Key_up(PRUint8 vk)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void key_down (in octet vk); */
NS_IMETHODIMP _MYCLASS_::Key_down(PRUint8 vk)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void char_up (in wchar key); */
NS_IMETHODIMP _MYCLASS_::Char_up(PRUnichar key)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void char_down (in wchar key); */
NS_IMETHODIMP _MYCLASS_::Char_down(PRUnichar key)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_ISendKeys_h__ */
