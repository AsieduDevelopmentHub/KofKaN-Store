#!/usr/bin/env python
"""
Management script for Sikapa Enterprise backend.

Usage:
    python migration/manage.py migrate          # Upgrade to latest
    python migration/manage.py migrate rollback # Downgrade one step
    python migration/manage.py makemigrations   # Create new migration
    python migration/manage.py current          # Show current revision
"""

import sys
from migrations import migrate_cli


def show_help():
    """Display help message."""
    print("""
Sikapa Enterprise Backend Management

Commands:
    migrate [REVISION]      - Upgrade database (default: head)
    rollback [STEPS]        - Downgrade database (default: -1 step)
    makemigrations [MSG]    - Create auto migration (default: auto migration)
    current                 - Show current revision
    validate [REVISION]     - Validate migration SQL
    help                    - Show this message

Examples:
    python migration/manage.py migrate
    python migration/manage.py migrate abc123def
    python migration/manage.py rollback
    python migration/manage.py makemigrations "add users table"
    python migration/manage.py current
    python migration/manage.py validate head
    """)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        show_help()
        sys.exit(1)
    
    command = sys.argv[1]
    args = sys.argv[2:] if len(sys.argv) > 2 else []
    
    if command == "help":
        show_help()
    elif command == "migrate":
        revision = args[0] if args else "head"
        migrate_cli("upgrade", revision)
    elif command == "rollback":
        steps = args[0] if args else "-1"
        migrate_cli("downgrade", steps)
    elif command == "makemigrations":
        message = args[0] if args else "auto migration"
        migrate_cli("create", message)
    elif command == "current":
        migrate_cli("current")
    elif command == "validate":
        revision = args[0] if args else "head"
        migrate_cli("validate", revision)
    else:
        print(f"Unknown command: {command}")
        show_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
