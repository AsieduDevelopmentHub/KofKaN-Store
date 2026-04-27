#!/usr/bin/env python3
"""
Test HTTPS API endpoints for Sikapa Enterprise Backend

This script tests the secure HTTPS endpoints to verify TLS/SSL is working correctly.
"""

import json
import ssl
import urllib.request
import sys
from pathlib import Path

def test_https_endpoints():
    """Test HTTPS endpoints"""

    base_url = "https://localhost:8443"

    print("🔒 Testing HTTPS endpoints for Sikapa Enterprise Backend")
    print(f"📡 Base URL: {base_url}")
    print()

    # Create SSL context that doesn't verify certificates (for self-signed certs)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        # Test root endpoint
        print("Testing root endpoint...")
        req = urllib.request.Request(f"{base_url}/")
        with urllib.request.urlopen(req, context=ssl_context) as response:
            data = json.loads(response.read().decode())
            print(f"✅ Root endpoint: {response.status}")
            print(f"   Response: {data}")
        print()

        # Test health endpoint
        print("Testing health endpoint...")
        req = urllib.request.Request(f"{base_url}/health")
        with urllib.request.urlopen(req, context=ssl_context) as response:
            data = json.loads(response.read().decode())
            print(f"✅ Health endpoint: {response.status}")
            print(f"   Response: {data}")
        print()

        print("🎉 All HTTPS endpoints are working correctly!")
        print("🔐 TLS/SSL encryption is active and functional.")

    except Exception as e:
        print(f"❌ Error testing HTTPS endpoints: {e}")
        print("   Make sure the server is running on https://localhost:8443")
        sys.exit(1)

if __name__ == "__main__":
    test_https_endpoints()