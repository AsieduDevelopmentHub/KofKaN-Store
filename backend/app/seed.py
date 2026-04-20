from sqlmodel import Session, select

from app.core.security import hash_password
from app.db import engine
from app.models import Category, Product, User


def seed_demo_data() -> None:
    with Session(engine) as session:
        if session.exec(select(Product)).first():
            return

        categories = [
            Category(
                name="Microcontrollers",
                slug="microcontrollers",
                description="Arduino, ESP, Raspberry Pi and compatible boards.",
                sort_order=1,
            ),
            Category(
                name="Sensors",
                slug="sensors",
                description="Motion, temperature, gas, and industrial sensors.",
                sort_order=2,
            ),
            Category(
                name="Power & Batteries",
                slug="power-batteries",
                description="Power modules, adapters, chargers, and battery packs.",
                sort_order=3,
            ),
        ]
        session.add_all(categories)
        session.flush()

        products = [
            Product(
                name="Arduino UNO R3 Starter Pack",
                slug="arduino-uno-r3-starter-pack",
                sku="ARD-UNO-R3-KIT",
                brand="Arduino",
                voltage_spec="5V",
                category_id=categories[0].id,
                price=580.00,
                stock_quantity=24,
                image_url="https://images.unsplash.com/photo-1516110833967-0b5716ca1387?auto=format&fit=crop&w=900&q=80",
                is_featured=True,
                description="Beginner-friendly kit with UNO board, breadboard, jumper wires, and core components.",
            ),
            Product(
                name="ESP32 WiFi + BLE Dev Board",
                slug="esp32-wifi-ble-dev-board",
                sku="ESP32-WROOM-DEV",
                brand="Espressif",
                voltage_spec="3.3V",
                category_id=categories[0].id,
                price=165.00,
                stock_quantity=40,
                image_url="https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=900&q=80",
                is_featured=True,
                description="Low-power microcontroller with dual-core processor and wireless connectivity.",
            ),
            Product(
                name="PIR Motion Sensor HC-SR501",
                slug="pir-motion-sensor-hc-sr501",
                sku="SEN-PIR-HCSR501",
                brand="Generic",
                voltage_spec="5V-12V",
                category_id=categories[1].id,
                price=45.00,
                stock_quantity=120,
                image_url="https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=900&q=80",
                description="Adjustable sensitivity and delay timer for motion-triggered automation projects.",
            ),
        ]

        session.add_all(products)
        session.add(
            User(
                email="admin@kofkan.store",
                full_name="KofKaN Admin",
                password_hash=hash_password("Admin@123"),
                is_admin=True,
            )
        )
        session.commit()
