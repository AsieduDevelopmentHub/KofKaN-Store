#!/usr/bin/env python3
"""
Test runner script for Sikapa backend
"""
import subprocess
import sys
import os

def run_tests():
    """Run the test suite."""
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)

    # Set environment variables for testing
    env = os.environ.copy()
    env.update({
        'DATABASE_URL': 'sqlite+aiosqlite:///:memory:',
        'SECRET_KEY': 'test-secret-key-for-testing-only',
        'JWT_SECRET_KEY': 'test-jwt-secret-key',
        'JWT_REFRESH_SECRET_KEY': 'test-jwt-refresh-secret-key',
        'RESEND_API_KEY': 'test-resend-api-key',
        'EMAIL_FROM': 'test@example.com',
        'FRONTEND_URL': 'http://localhost:3000',
        'HTTPS_ENABLED': 'false',
        'TESTING': 'true'
    })

    # Run pytest
    cmd = [
        sys.executable, '-m', 'pytest',
        'tests/',
        '-v',
        '--tb=short',
        '--asyncio-mode=auto',
        '--cov=app',
        '--cov-report=term-missing',
        '--cov-report=html:htmlcov'
    ]

    print("Running Sikapa Backend Tests...")
    print("=" * 50)

    result = subprocess.run(cmd, env=env)

    if result.returncode == 0:
        print("\n✅ All tests passed!")
    else:
        print(f"\n❌ Tests failed with exit code {result.returncode}")

    return result.returncode

if __name__ == "__main__":
    sys.exit(run_tests())