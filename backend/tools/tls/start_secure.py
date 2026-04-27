#!/usr/bin/env python3
"""
Secure Startup Script for Sikapa Enterprise Backend

This script starts the FastAPI server with HTTPS/TLS support for secure data handling.

Usage:
    python start_secure.py [--http] [--port PORT]

Options:
    --http     Start in HTTP mode (development only)
    --port     Port to run on (default: 8443 for HTTPS, 8000 for HTTP)
"""

import argparse
import os
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Start Sikapa Enterprise Backend")
    parser.add_argument("--http", action="store_true", help="Start in HTTP mode (development only)")
    parser.add_argument("--port", type=int, help="Port to run on")

    args = parser.parse_args()

    # Check if certificates exist for HTTPS mode
    cert_dir = Path(__file__).parent.parent.parent / "certs"
    key_file = cert_dir / "server.key"
    cert_file = cert_dir / "server.crt"

    if not args.http:
        if not key_file.exists() or not cert_file.exists():
            print("❌ SSL certificates not found!")
            print("   Run 'python tools/tls/generate_cert.py' to generate certificates.")
            print("   Or use --http flag for HTTP mode (not recommended for production).")
            sys.exit(1)

    # Set default ports
    port = args.port or (8000 if args.http else 8442)

    # Build uvicorn command
    venv_uvicorn = Path(__file__).parent / "venv" / "Scripts" / "uvicorn.exe"
    if venv_uvicorn.exists():
        cmd_parts = [str(venv_uvicorn)]
    else:
        cmd_parts = ["uvicorn"]

    cmd_parts.extend([
        "app.main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", str(port)
    ])

    if not args.http:
        cmd_parts.extend([
            "--ssl-keyfile", str(key_file),
            "--ssl-certfile", str(cert_file)
        ])

    # Execute command
    cmd = " ".join(cmd_parts)
    print(f"🚀 Starting Sikapa Enterprise Backend...")
    print(f"   Mode: {'HTTP' if args.http else 'HTTPS'}")
    print(f"   Port: {port}")
    if not args.http:
        print(f"   Certificate: {cert_file}")
        print(f"   Private Key: {key_file}")
    print(f"   Command: {cmd}")
    print()

    # Change to backend root directory if not already there
    backend_dir = Path(__file__).parent.parent.parent
    os.chdir(backend_dir)

    # Execute uvicorn
    if venv_uvicorn.exists():
        os.execv(str(venv_uvicorn), cmd_parts)
    else:
        os.execvp("uvicorn", cmd_parts)

if __name__ == "__main__":
    main()