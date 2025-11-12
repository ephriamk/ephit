"""
Encoding fix utility to ensure UTF-8 encoding throughout the application.
This module should be imported early in the application lifecycle.
"""
import json
import os
import sys


def ensure_utf8_encoding():
    """
    Ensure UTF-8 encoding is used throughout the application.
    This sets environment variables and patches JSON serialization at multiple levels.
    """
    # Set environment variables for UTF-8 encoding
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'
    
    # Set LC_ALL and LANG if not already set
    if 'LC_ALL' not in os.environ:
        os.environ['LC_ALL'] = 'en_US.UTF-8'
    if 'LANG' not in os.environ:
        os.environ['LANG'] = 'en_US.UTF-8'
    
    # Patch json.dumps to always use ensure_ascii=False for UTF-8
    _original_dumps = json.dumps
    
    def utf8_dumps(*args, **kwargs):
        """JSON dumps that defaults to UTF-8 (ensure_ascii=False)"""
        if 'ensure_ascii' not in kwargs:
            kwargs['ensure_ascii'] = False
        return _original_dumps(*args, **kwargs)
    
    json.dumps = utf8_dumps  # type: ignore
    
    # Patch httpx to use UTF-8 JSON encoding
    try:
        import httpx
        from httpx import _content
        from httpx._types import RequestData
        
        # Save original function
        _original_encode_json = _content.encode_json
        
        def utf8_encode_json(json_data: RequestData):
            """Encode JSON with UTF-8 (ensure_ascii=False)"""
            # httpx encode_json returns (headers, body_stream) tuple
            body = json.dumps(json_data, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode('utf-8')
            content_length = str(len(body))
            content_type = "application/json"
            headers = {"Content-Length": content_length, "Content-Type": content_type}
            
            # Import ByteStream from httpx
            from httpx._content import ByteStream
            return headers, ByteStream(body)
        
        # Replace httpx's JSON encoder
        _content.encode_json = utf8_encode_json
        httpx._content.encode_json = utf8_encode_json
        
    except (ImportError, AttributeError) as e:
        # httpx not installed or structure changed, skip this patch
        pass
    
    # Patch OpenAI SDK if available
    try:
        import openai
        # The OpenAI SDK uses httpx internally, so the httpx patch should cover it
        # But we can also set a flag if needed
        pass
    except ImportError:
        pass
    
    # Set default string encoding if possible (Python 2 compatibility, no-op in Python 3)
    if hasattr(sys, 'setdefaultencoding'):
        sys.setdefaultencoding('utf-8')


# Auto-apply on import
ensure_utf8_encoding()

