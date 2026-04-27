#!/usr/bin/env python3
"""
Certificate Generation Script for Sikapa Enterprise Backend

This script generates self-signed SSL certificates for development HTTPS support.
For production, use proper certificates from a Certificate Authority.

Usage:
    python tools/tls/generate_cert.py
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

try:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend
except ImportError:
    print("❌ cryptography library not found.")
    print("   Install with: pip install cryptography")
    sys.exit(1)

def generate_self_signed_cert():
    """Generate self-signed certificate using Python cryptography library"""

    cert_dir = Path(__file__).parent.parent.parent / "certs"
    key_file = cert_dir / "server.key"
    cert_file = cert_dir / "server.crt"

    print("🔐 Generating self-signed SSL certificate for development...")
    print("📁 Certificate files will be created in:", cert_dir)

    # Generate private key
    print("🔑 Generating private key...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )

    # Create certificate
    print("📜 Generating certificate...")
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "State"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "City"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Sikapa Enterprise"),
        x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
    ])

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.utcnow()
    ).not_valid_after(
        datetime.utcnow() + timedelta(days=365)
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName("localhost"),
            x509.DNSName("127.0.0.1"),
        ]),
        critical=False,
    ).sign(private_key, hashes.SHA256(), default_backend())

    # Write private key
    with open(key_file, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))

    # Write certificate
    with open(cert_file, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    # Set proper permissions (more important on Unix systems)
    try:
        os.chmod(key_file, 0o600)
        os.chmod(cert_file, 0o644)
    except OSError:
        # Windows might not support chmod the same way
        pass

    print("✅ Certificate generation complete!")
    print(f"   Private key: {key_file}")
    print(f"   Certificate: {cert_file}")
    print()
    print("⚠️  WARNING: This is a self-signed certificate for development only!")
    print("   Browsers will show security warnings. For production, use proper certificates.")
    print()
    print("🚀 To start the server with HTTPS:")
    print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8443 --ssl-keyfile certs/server.key --ssl-certfile certs/server.crt")

if __name__ == "__main__":
    generate_self_signed_cert()