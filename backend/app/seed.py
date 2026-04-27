from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.db import engine
from app.models import Category, Product, User


def seed_demo_data() -> None:
    with Session(engine) as session:
        categories = {
            "microcontrollers": Category(
                name="Microcontrollers",
                slug="microcontrollers",
                description="Arduino, ESP, Raspberry Pi and compatible boards.",
                sort_order=1,
            ),
            "sensors": Category(
                name="Sensors",
                slug="sensors",
                description="Motion, temperature, gas, and industrial sensors.",
                sort_order=2,
            ),
            "power-batteries": Category(
                name="Power & Batteries",
                slug="power-batteries",
                description="Power modules, adapters, chargers, and battery packs.",
                sort_order=3,
            ),
            "robotics-motors": Category(
                name="Robotics & Motors",
                slug="robotics-motors",
                description="DC motors, servos, steppers, and motion control modules.",
                sort_order=4,
            ),
            "tools-prototyping": Category(
                name="Tools & Prototyping",
                slug="tools-prototyping",
                description="Breadboards, jumper cables, soldering, and repair accessories.",
                sort_order=5,
            ),
        }

        category_ids: dict[str, int] = {}
        for slug, draft in categories.items():
            existing = session.exec(select(Category).where(Category.slug == slug)).first()
            if existing:
                category_ids[slug] = existing.id or 0
                continue
            session.add(draft)
            session.flush()
            category_ids[slug] = draft.id or 0

        products = [
            Product(
                name="Arduino UNO R3 Starter Pack",
                slug="arduino-uno-r3-starter-pack",
                sku="ARD-UNO-R3-KIT",
                brand="Arduino",
                voltage_spec="5V",
                category_id=category_ids["microcontrollers"],
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
                category_id=category_ids["microcontrollers"],
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
                category_id=category_ids["sensors"],
                price=45.00,
                stock_quantity=120,
                image_url="https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=900&q=80",
                description="Adjustable sensitivity and delay timer for motion-triggered automation projects.",
            ),
            Product(
                name="Raspberry Pi 4 Model B (4GB)",
                slug="raspberry-pi-4-model-b-4gb",
                sku="RPI4-4GB",
                brand="Raspberry Pi",
                voltage_spec="5V USB-C",
                category_id=category_ids["microcontrollers"],
                price=1320.00,
                stock_quantity=18,
                image_url="https://images.unsplash.com/photo-1591799265444-d66432b91588?auto=format&fit=crop&w=900&q=80",
                is_featured=True,
                description="Powerful single-board computer for robotics, IoT gateways, and embedded projects.",
            ),
            Product(
                name="NodeMCU ESP8266 Development Board",
                slug="nodemcu-esp8266-development-board",
                sku="NODEMCU-ESP8266",
                brand="Espressif",
                voltage_spec="3.3V",
                category_id=category_ids["microcontrollers"],
                price=95.00,
                stock_quantity=60,
                image_url="https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=900&q=80",
                description="WiFi-ready microcontroller board for smart home and IoT prototypes.",
            ),
            Product(
                name="DS18B20 Waterproof Temperature Sensor",
                slug="ds18b20-waterproof-temp-sensor",
                sku="SEN-DS18B20-WP",
                brand="Maxim",
                voltage_spec="3.0V-5.5V",
                category_id=category_ids["sensors"],
                price=38.00,
                stock_quantity=140,
                image_url="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
                description="Accurate digital sensor for climate monitoring and smart agriculture.",
            ),
            Product(
                name="HC-SR04 Ultrasonic Distance Sensor",
                slug="hc-sr04-ultrasonic-distance-sensor",
                sku="SEN-HCSR04",
                brand="Generic",
                voltage_spec="5V",
                category_id=category_ids["sensors"],
                price=32.00,
                stock_quantity=200,
                image_url="https://images.unsplash.com/photo-1563770557125-198f7d2f2f5c?auto=format&fit=crop&w=900&q=80",
                description="Non-contact distance measurement module for obstacle detection systems.",
            ),
            Product(
                name="MPU6050 Gyroscope + Accelerometer",
                slug="mpu6050-gyro-accelerometer",
                sku="SEN-MPU6050",
                brand="InvenSense",
                voltage_spec="3V-5V",
                category_id=category_ids["sensors"],
                price=55.00,
                stock_quantity=95,
                image_url="https://images.unsplash.com/photo-1581092160612-31ad9f5b9f84?auto=format&fit=crop&w=900&q=80",
                description="6-axis motion tracking module for drones and balancing robots.",
            ),
            Product(
                name="12V 10A Switching Power Supply",
                slug="12v-10a-switching-power-supply",
                sku="PWR-SMPS-12V10A",
                brand="Mean Well",
                voltage_spec="220V AC in / 12V DC out",
                category_id=category_ids["power-batteries"],
                price=220.00,
                stock_quantity=48,
                image_url="https://images.unsplash.com/photo-1584277261846-c6a1672ed979?auto=format&fit=crop&w=900&q=80",
                description="Stable DC output supply for LED strips, CNC controllers, and automation builds.",
            ),
            Product(
                name="18650 Rechargeable Battery (3000mAh)",
                slug="18650-rechargeable-battery-3000mah",
                sku="BAT-18650-3000",
                brand="Samsung",
                voltage_spec="3.7V",
                category_id=category_ids["power-batteries"],
                price=42.00,
                stock_quantity=300,
                image_url="https://images.unsplash.com/photo-1609592806950-23f8f3628dd0?auto=format&fit=crop&w=900&q=80",
                description="High-capacity lithium-ion cell for portable electronics and battery packs.",
            ),
            Product(
                name="TP4056 Lithium Battery Charging Module",
                slug="tp4056-lithium-charging-module",
                sku="PWR-TP4056",
                brand="Generic",
                voltage_spec="5V Input",
                category_id=category_ids["power-batteries"],
                price=18.00,
                stock_quantity=260,
                image_url="https://images.unsplash.com/photo-1563770660941-10a6360762a2?auto=format&fit=crop&w=900&q=80",
                description="USB charging board with battery protection for single-cell lithium packs.",
            ),
            Product(
                name="MG996R High Torque Servo Motor",
                slug="mg996r-high-torque-servo-motor",
                sku="MOT-MG996R",
                brand="TowerPro",
                voltage_spec="4.8V-7.2V",
                category_id=category_ids["robotics-motors"],
                price=78.00,
                stock_quantity=80,
                image_url="https://images.unsplash.com/photo-1591808216268-ce0a1b5944f7?auto=format&fit=crop&w=900&q=80",
                description="Metal gear servo with strong torque ideal for robotic arms and RC projects.",
            ),
            Product(
                name="NEMA 17 Stepper Motor (42BYGH)",
                slug="nema17-stepper-motor-42bygh",
                sku="MOT-NEMA17-42",
                brand="LDO",
                voltage_spec="12V",
                category_id=category_ids["robotics-motors"],
                price=165.00,
                stock_quantity=54,
                image_url="https://images.unsplash.com/photo-1581092921461-39b9d08a9b2b?auto=format&fit=crop&w=900&q=80",
                description="Precision stepper motor for 3D printers, CNC, and positioning systems.",
            ),
            Product(
                name="L298N Dual H-Bridge Motor Driver",
                slug="l298n-dual-h-bridge-motor-driver",
                sku="MOT-L298N",
                brand="ST",
                voltage_spec="5V-35V",
                category_id=category_ids["robotics-motors"],
                price=49.00,
                stock_quantity=170,
                image_url="https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=900&q=80",
                description="Dual-channel motor control module for DC motor direction and speed control.",
            ),
            Product(
                name="Soldering Iron Kit 60W",
                slug="soldering-iron-kit-60w",
                sku="TOOL-SOLDER-60W",
                brand="INGCO",
                voltage_spec="220V",
                category_id=category_ids["tools-prototyping"],
                price=185.00,
                stock_quantity=36,
                image_url="https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&w=900&q=80",
                description="Complete soldering set with stand, tips, wick, and accessories.",
            ),
            Product(
                name="830-Point Breadboard",
                slug="830-point-breadboard",
                sku="TOOL-BREAD-830",
                brand="Generic",
                voltage_spec="N/A",
                category_id=category_ids["tools-prototyping"],
                price=24.00,
                stock_quantity=240,
                image_url="https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?auto=format&fit=crop&w=900&q=80",
                description="Reusable prototyping board for rapid testing without soldering.",
            ),
            Product(
                name="Jumper Wire Set (120 pcs)",
                slug="jumper-wire-set-120pcs",
                sku="TOOL-JUMP-120",
                brand="Generic",
                voltage_spec="N/A",
                category_id=category_ids["tools-prototyping"],
                price=28.00,
                stock_quantity=190,
                image_url="https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=900&q=80",
                description="Male-to-male, male-to-female, and female-to-female jumper assortment.",
            ),
        ]
        existing_skus = set(session.exec(select(Product.sku)).all())
        for product in products:
            if product.sku in existing_skus:
                continue
            session.add(product)

        admin = session.exec(select(User).where(User.email == "admin@kofkan.store")).first()
        if not admin:
            session.add(
                User(
                    email="admin@kofkan.store",
                    full_name="KofKaN Admin",
                    password_hash=get_password_hash("Admin@123"),
                    is_admin=True,
                    admin_role="super_admin",
                    admin_permissions="view_dashboard,manage_newsletter,manage_orders,manage_products",
                )
            )
        else:
            admin.is_admin = True
            admin.admin_role = "super_admin"
            if not (admin.admin_permissions or "").strip():
                admin.admin_permissions = "view_dashboard,manage_newsletter,manage_orders,manage_products"
            session.add(admin)
        session.commit()
