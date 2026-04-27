from app.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check User table
    print("User table columns:")
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'user'"))
    for row in res:
        print(f"  {row[0]}")
    
    # Check Order table
    print("\nOrder table columns:")
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'order'"))
    for row in res:
        print(f"  {row[0]}")
