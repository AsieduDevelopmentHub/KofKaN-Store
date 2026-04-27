import sqlite3

conn = sqlite3.connect('db/sikapa.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Existing tables:', [t[0] for t in tables])

# Check product table schema
cursor.execute("PRAGMA table_info(product)")
product_columns = cursor.fetchall()
print('Product table columns:', [col[1] for col in product_columns])

# Check order table schema
cursor.execute('PRAGMA table_info("order")')
order_columns = cursor.fetchall()
print('Order table columns:', [col[1] for col in order_columns])

conn.close()