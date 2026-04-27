"""Script to update products with abbreviation-based SKUs."""
from app.db import engine
from sqlmodel import Session, select
from app.models import Product
from app.core.sku_generator import generate_product_sku, _get_next_seq, _sku_prefix

def main():
    sess = Session(engine)
    products = sess.exec(select(Product)).all()
    
    # Update all products to new format
    updated = 0
    for p in products:
        try:
            # Generate new SKU with new format
            new_sku = generate_product_sku(
                sess, 
                name=p.name, 
                category=p.category, 
                exclude_product_id=p.id
            )
            p.sku = new_sku
            sess.add(p)
            print(f'ID {p.id}: {p.name} -> {new_sku}')
            updated += 1
        except Exception as e:
            print(f'Error for {p.name}: {e}')
    
    sess.commit()
    print(f'\nUpdated {updated} products with new SKUs')

if __name__ == "__main__":
    main()