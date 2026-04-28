"""SKU generation with abbreviation patterns.

Format:
  Product:  {PREFIX}-{SEQ:03d}   (e.g., ARD-001, ESP-001, MCU-001)
  Variant:  {PARENT_SKU}-{VAR}

Examples:
  - Arduino UNO R3 → ARD-001
  - ESP32 Dev Board → ESP-001
  - Microcontrollers category → MCU-001
  - Sensors category → SEN-001
  - Robotics & Motors category → MOT-001

Prefix is derived from:
  1. Brand name (e.g., Arduino → ARD, Espressif → ESP)
  2. Or category abbreviation (e.g., Microcontrollers → MCU)
  3. Or "GEN" if neither available
"""
from __future__ import annotations

import re
from typing import Optional
from sqlmodel import Session, select

from app.models import Category, Product

try:
    from app.models import ProductVariant  # type: ignore
except ImportError:  # pragma: no cover - variants are optional in this build
    ProductVariant = None  # type: ignore[assignment]

_MAX_SKU = 120

# Category abbreviations focused on embedded systems, robotics, and programming gear.
CATEGORY_ABBREVIATIONS = {
    # Microcontrollers / dev boards
    "microcontrollers": "MCU",
    "microcontroller": "MCU",
    "dev boards": "DEV",
    "development boards": "DEV",
    "single board computers": "SBC",
    "sbc": "SBC",
    "fpga": "FPG",
    # Sensors
    "sensors": "SEN",
    "sensor": "SEN",
    "temperature sensors": "TMP",
    "imu": "IMU",
    "rfid": "RFD",
    # Robotics / motors
    "robotics-motors": "MOT",
    "robotics": "ROB",
    "motors": "MOT",
    "servo": "SRV",
    "servos": "SRV",
    "steppers": "STP",
    "stepper motors": "STP",
    "motor drivers": "MDR",
    # Power
    "power-batteries": "PWR",
    "power": "PWR",
    "batteries": "BAT",
    "battery": "BAT",
    "power supply": "PSU",
    "psu": "PSU",
    "regulators": "REG",
    # Tools / prototyping
    "tools-prototyping": "TLP",
    "tools": "TOL",
    "prototyping": "PRT",
    "soldering": "SLD",
    "breadboards": "BRD",
    "breadboard": "BRD",
    # Components
    "components": "CMP",
    "passive components": "PAS",
    "resistors": "RES",
    "capacitors": "CAP",
    "inductors": "IND",
    "diodes": "DIO",
    "transistors": "TRN",
    "ics": "IC",
    "integrated circuits": "IC",
    # Connectivity / networking
    "connectivity": "CNX",
    "networking": "NET",
    "wireless modules": "WLS",
    "rf modules": "RF",
    "wifi modules": "WIF",
    "bluetooth modules": "BLE",
    "gps modules": "GPS",
    "gsm modules": "GSM",
    "lora modules": "LRA",
    # Displays / cameras
    "displays": "DSP",
    "lcd": "LCD",
    "oled": "OLD",
    "tft": "TFT",
    "cameras": "CAM",
    # Tools — measurement
    "test equipment": "TST",
    "multimeters": "MTM",
    "oscilloscopes": "OSC",
    "logic analyzers": "LGA",
    # Mechanical / chassis
    "chassis": "CHS",
    "wheels": "WHL",
    "frames": "FRM",
    "fasteners": "FAS",
    # Education
    "kits": "KIT",
    "starter kits": "SKT",
    "learning kits": "LKT",
    "stem": "STM",
    # 3D printing
    "3d printing": "3DP",
    "filament": "FIL",
    # Misc
    "accessories": "ACC",
    "gift set": "GST",
    "bundle": "BND",
}

# Common embedded systems / robotics brand abbreviations.
BRAND_ABBREVIATIONS = {
    # Microcontroller / SoC vendors
    "arduino": "ARD",
    "raspberry pi": "RPI",
    "espressif": "ESP",
    "esp32": "ESP",
    "esp8266": "ESP",
    "nodemcu": "NDM",
    "stmicroelectronics": "STM",
    "st microelectronics": "STM",
    "stm32": "STM",
    "atmel": "ATM",
    "microchip": "MCP",
    "pic": "PIC",
    "nxp": "NXP",
    "ti": "TI",
    "texas instruments": "TI",
    "nordic": "NRF",
    "nrf": "NRF",
    "infineon": "INF",
    "renesas": "REN",
    "intel": "INT",
    "altera": "ALT",
    "xilinx": "XLX",
    "lattice": "LAT",
    # Pi-class / SBC
    "beagleboard": "BBB",
    "beaglebone": "BBB",
    "odroid": "ODR",
    "rock pi": "RKP",
    "orange pi": "ORP",
    "banana pi": "BNP",
    "jetson": "JET",
    "nvidia": "NVD",
    # Maker / module vendors
    "adafruit": "ADA",
    "sparkfun": "SPF",
    "seeedstudio": "SEE",
    "seeed": "SEE",
    "waveshare": "WAV",
    "dfrobot": "DFR",
    "pololu": "POL",
    "elegoo": "ELG",
    "keyestudio": "KEY",
    "osoyoo": "OSO",
    # Sensors
    "bosch": "BSH",
    "invensense": "INV",
    "sensirion": "SNR",
    "maxim": "MAX",
    "honeywell": "HON",
    "sharp": "SHP",
    "vishay": "VIS",
    "rohm": "ROH",
    # Motors / actuators
    "towerpro": "TWP",
    "hitec": "HTC",
    "futaba": "FTB",
    "savox": "SVX",
    "ldo motors": "LDO",
    "ldo": "LDO",
    "moons": "MNS",
    "nema": "NMA",
    # Power / batteries
    "mean well": "MWL",
    "meanwell": "MWL",
    "samsung": "SMS",
    "lg": "LG",
    "panasonic": "PAN",
    "molicel": "MOL",
    "sanyo": "SAN",
    # Tools
    "fluke": "FLK",
    "rigol": "RGL",
    "hantek": "HAN",
    "saleae": "SLE",
    "weller": "WEL",
    "hakko": "HAK",
    "ingco": "ING",
    "tektronix": "TEK",
    # Connectivity
    "ublox": "UBX",
    "u-blox": "UBX",
    "sim com": "SIM",
    "simcom": "SIM",
    "quectel": "QCT",
    "semtech": "SMT",
    # Displays
    "ssd1306": "SSD",
    "ili9341": "ILI",
    "winstar": "WIN",
    # 3D printing
    "creality": "CRE",
    "prusa": "PRU",
    "bambu lab": "BBU",
    "anycubic": "ANY",
    "esun": "ESN",
}


def _extract_brand(name: str) -> Optional[str]:
    """Extract brand abbreviation from product name."""
    name_lower = name.lower()
    
    # Check for known brands (longer matches first)
    for brand, abbr in BRAND_ABBREVIATIONS.items():
        if brand in name_lower:
            return abbr
    
    return None


def _abbreviate_category(s: str) -> str:
    """Convert category to abbreviation."""
    if not s:
        return "GEN"
    
    s_lower = s.lower().strip()
    if s_lower in CATEGORY_ABBREVIATIONS:
        return CATEGORY_ABBREVIATIONS[s_lower]
    
    # Default: first 3 letters of each significant word
    words = re.split(r"[\s\-]+", s)
    abbrev = "".join(w[:3].upper() for w in words if w and len(w) > 1)
    return abbrev[:6] if abbrev else "GEN"


def _get_next_seq(session: Session, prefix: str) -> int:
    """Get next sequence number for a given prefix."""
    # Find all products with this prefix
    pattern = f"{prefix}-%"
    products = session.exec(
        select(Product).where(Product.sku.like(pattern))
    ).all()
    
    max_seq = 0
    for p in products:
        if p.sku:
            # Extract sequence number
            parts = p.sku.split("-")
            if len(parts) >= 2:
                try:
                    seq = int(parts[-1])
                    if seq > max_seq:
                        max_seq = seq
                except ValueError:
                    pass
    
    return max_seq + 1


def _sku_prefix(session: Session, name: str, category: Optional[str]) -> str:
    """Determine SKU prefix: brand if found, otherwise category abbreviation."""
    # First try to extract brand from name
    brand_abbrev = _extract_brand(name)
    if brand_abbrev:
        return brand_abbrev
    
    # Then try category abbreviation
    if category:
        cat_abbrev = _abbreviate_category(str(category))
        if cat_abbrev != "GEN":
            return cat_abbrev
    
    # Default to GEN
    return "GEN"


def _sku_exists(
    session: Session,
    sku: str,
    *,
    exclude_product_id: Optional[int] = None,
    exclude_variant_id: Optional[int] = None,
) -> bool:
    q_p = select(Product.id).where(Product.sku == sku)
    if exclude_product_id is not None:
        q_p = q_p.where(Product.id != exclude_product_id)
    if session.exec(q_p).first() is not None:
        return True
    if ProductVariant is None:
        return False
    q_v = select(ProductVariant.id).where(ProductVariant.sku == sku)
    if exclude_variant_id is not None:
        q_v = q_v.where(ProductVariant.id != exclude_variant_id)
    return session.exec(q_v).first() is not None


def allocate_unique_sku(
    session: Session,
    base: str,
    *,
    exclude_product_id: Optional[int] = None,
    exclude_variant_id: Optional[int] = None,
) -> str:
    """
    Append -2, -3, … if `base` is taken (checked on both products and variants).
    """
    base = base.strip()[:_MAX_SKU]
    if not base:
        base = "SKU"
    for n in range(0, 10_000):
        candidate = base if n == 0 else f"{base}-{n + 1}"
        if len(candidate) > _MAX_SKU:
            candidate = candidate[:_MAX_SKU]
        if not _sku_exists(
            session,
            candidate,
            exclude_product_id=exclude_product_id,
            exclude_variant_id=exclude_variant_id,
        ):
            return candidate
    raise RuntimeError("Could not allocate a unique SKU")


def generate_product_sku(
    session: Session,
    *,
    name: str,
    category: Optional[str],
    exclude_product_id: Optional[int] = None,
) -> str:
    """Generate SKU: {PREFIX}-{SEQ:03d} format."""
    prefix = _sku_prefix(session, name, category)
    seq = _get_next_seq(session, prefix)
    base = f"{prefix}-{seq:03d}"
    return allocate_unique_sku(
        session, base, exclude_product_id=exclude_product_id
    )


def generate_variant_sku(
    session: Session,
    *,
    product: Product,
    variant_name: str,
    exclude_variant_id: Optional[int] = None,
) -> str:
    """Generate variant SKU: {PARENT_SKU}-{VAR}."""
    parent_sku = (product.sku or "").strip()
    if not parent_sku:
        raise ValueError("Product must have a SKU before generating variant SKU")
    
    # Create variant suffix from variant name
    # Take first 3 letters of each significant word
    words = re.split(r"[\s\-]+", variant_name)
    var_suffix = "".join(w[:3].upper() for w in words if w and len(w) > 1)[:8]
    
    if not var_suffix:
        var_suffix = "VAR"
    
    base = f"{parent_sku}-{var_suffix}"
    return allocate_unique_sku(
        session,
        base,
        exclude_product_id=None,
        exclude_variant_id=exclude_variant_id,
    )