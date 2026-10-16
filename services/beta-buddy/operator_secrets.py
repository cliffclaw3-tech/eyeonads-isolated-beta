"""Windows user-bound DPAPI secret storage. Never prints credential values."""
import ctypes,os,pathlib
from ctypes import wintypes
class Blob(ctypes.Structure):
    _fields_=[('size',wintypes.DWORD),('data',ctypes.POINTER(ctypes.c_byte))]
def transform(data,protect):
    if os.name!='nt':raise ValueError('Windows operator credential store required')
    buffer=ctypes.create_string_buffer(data);source=Blob(len(data),ctypes.cast(buffer,ctypes.POINTER(ctypes.c_byte)));output=Blob()
    crypt=ctypes.WinDLL('crypt32',use_last_error=True);kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.LocalFree.argtypes=[ctypes.c_void_p];kernel.LocalFree.restype=ctypes.c_void_p
    if protect:
        function=crypt.CryptProtectData;function.argtypes=[ctypes.POINTER(Blob),wintypes.LPCWSTR,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
        result=function(ctypes.byref(source),'Beta Buddy scoped beta credential',None,None,None,1,ctypes.byref(output))
    else:
        function=crypt.CryptUnprotectData;function.argtypes=[ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
        result=function(ctypes.byref(source),None,None,None,None,1,ctypes.byref(output))
    if not result:raise OSError('Windows credential protection unavailable')
    try:return ctypes.string_at(output.data,output.size)
    finally:kernel.LocalFree(output.data)
def save_secret(path,value):
    path=pathlib.Path(path)
    if path.suffix!='.dpapi':raise ValueError('Encrypted operator file required')
    temporary=path.with_suffix('.tmp');temporary.write_bytes(transform(value.encode(),True));temporary.replace(path)
def read_secret(path):
    path=pathlib.Path(path)
    if path.suffix!='.dpapi':raise ValueError('Encrypted operator file required')
    return transform(path.read_bytes(),False).decode()
