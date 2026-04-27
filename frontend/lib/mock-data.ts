export type CategoryKey =
  | "all"
  | "bestsellers"
  | "microcontrollers"
  | "sensors"
  | "robotics-motors"
  | "power-batteries"
  | "tools-prototyping";

export type MockProduct = {
  id: string;
  name: string;
  price: number;
  /** Optional “was” price — shown struck through when greater than `price`. */
  compareAtPrice?: number;
  rating: number;
  image: string;
  /** Filter slug: matches backend category slugs (e.g. `microcontrollers`, `sensors`). */
  category: string;
  /** Display name shown on product detail (e.g. “Microcontrollers”, “Sensors”). */
  categoryLabel: string;
  /** Short detail copy for product page. */
  description: string;
  in_stock?: number;
};

export const CATEGORIES: {
  key: CategoryKey;
  label: string;
  image: string;
  slug: string;
}[] = [
  {
    key: "bestsellers",
    label: "Best Sellers",
    slug: "bestsellers",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
  },
  {
    key: "microcontrollers",
    label: "Microcontrollers",
    slug: "microcontrollers",
    image:
      "https://images.unsplash.com/photo-1591799265444-d66432b91588?w=400&h=400&fit=crop",
  },
  {
    key: "sensors",
    label: "Sensors",
    slug: "sensors",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
  },
  {
    key: "robotics-motors",
    label: "Robotics & Motors",
    slug: "robotics-motors",
    image:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400&h=400&fit=crop",
  },
  {
    key: "power-batteries",
    label: "Power & Batteries",
    slug: "power-batteries",
    image:
      "https://images.unsplash.com/photo-1584277261846-c6a1672ed979?w=400&h=400&fit=crop",
  },
  {
    key: "tools-prototyping",
    label: "Tools & Prototyping",
    slug: "tools-prototyping",
    image:
      "https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=400&h=400&fit=crop",
  },
];

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "1",
    name: "Arduino UNO R3 Starter Pack",
    price: 580,
    rating: 4.9,
    category: "microcontrollers",
    categoryLabel: "Microcontrollers",
    description:
      "Beginner-friendly kit with the UNO R3 board, breadboard, jumper wires, and core components for your first embedded projects.",
    image:
      "https://images.unsplash.com/photo-1516110833967-0b5716ca1387?w=300&h=300&fit=crop",
  },
  {
    id: "2",
    name: "ESP32 WiFi + BLE Dev Board",
    price: 165,
    compareAtPrice: 195,
    rating: 4.8,
    category: "microcontrollers",
    categoryLabel: "Microcontrollers",
    description:
      "Low-power dual-core MCU with built-in Wi-Fi and Bluetooth. Ideal for IoT, smart home, and connected sensor projects.",
    image:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=300&h=300&fit=crop",
  },
  {
    id: "3",
    name: "Raspberry Pi 4 Model B (4GB)",
    price: 1320,
    rating: 4.9,
    category: "microcontrollers",
    categoryLabel: "Microcontrollers",
    description:
      "Powerful single-board computer for robotics, IoT gateways, and edge AI builds. Quad-core 64-bit CPU with USB 3.0 and dual-display HDMI.",
    image:
      "https://images.unsplash.com/photo-1591799265444-d66432b91588?w=300&h=300&fit=crop",
  },
  {
    id: "4",
    name: "HC-SR04 Ultrasonic Distance Sensor",
    price: 32,
    rating: 4.6,
    category: "sensors",
    categoryLabel: "Sensors",
    description:
      "Non-contact distance measurement module (2cm–4m). Perfect for obstacle detection on rovers, parking sensors, and tank gauges.",
    image:
      "https://images.unsplash.com/photo-1563770557125-198f7d2f2f5c?w=300&h=300&fit=crop",
  },
  {
    id: "5",
    name: "MPU6050 Gyroscope + Accelerometer",
    price: 55,
    rating: 4.7,
    category: "sensors",
    categoryLabel: "Sensors",
    description:
      "6-axis IMU module for motion tracking. Great for self-balancing robots, drones, and gesture-controlled projects.",
    image:
      "https://images.unsplash.com/photo-1581092160612-31ad9f5b9f84?w=300&h=300&fit=crop",
  },
  {
    id: "6",
    name: "MG996R High-Torque Servo Motor",
    price: 78,
    rating: 4.5,
    category: "robotics-motors",
    categoryLabel: "Robotics & Motors",
    description:
      "Metal-gear servo with strong torque (up to 11kg·cm). Ideal for robotic arms, RC vehicles, and pan-tilt camera mounts.",
    image:
      "https://images.unsplash.com/photo-1591808216268-ce0a1b5944f7?w=300&h=300&fit=crop",
  },
  {
    id: "7",
    name: "L298N Dual H-Bridge Motor Driver",
    price: 49,
    rating: 4.6,
    category: "robotics-motors",
    categoryLabel: "Robotics & Motors",
    description:
      "Drive two DC motors with direction and PWM speed control. Built-in regulator powers your microcontroller from the same supply.",
    image:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=300&h=300&fit=crop",
  },
  {
    id: "8",
    name: "12V 10A Switching Power Supply",
    price: 220,
    compareAtPrice: 260,
    rating: 4.7,
    category: "power-batteries",
    categoryLabel: "Power & Batteries",
    description:
      "Stable 12V DC bench supply for LED strips, CNC controllers, 3D printer rails, and lab prototyping.",
    image:
      "https://images.unsplash.com/photo-1584277261846-c6a1672ed979?w=300&h=300&fit=crop",
  },
  {
    id: "9",
    name: "830-Point Solderless Breadboard",
    price: 24,
    rating: 4.6,
    category: "tools-prototyping",
    categoryLabel: "Tools & Prototyping",
    description:
      "Reusable prototyping board with 830 tie points and dual power rails. Test circuits before you commit to soldering.",
    image:
      "https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=300&h=300&fit=crop",
  },
  {
    id: "10",
    name: "Jumper Wire Set (120 pcs)",
    price: 28,
    rating: 4.5,
    category: "tools-prototyping",
    categoryLabel: "Tools & Prototyping",
    description:
      "Mixed bundle of male-to-male, male-to-female, and female-to-female jumpers in multiple lengths and colours.",
    image:
      "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=300&h=300&fit=crop",
  },
  {
    id: "11",
    name: "60W Soldering Iron Kit",
    price: 185,
    rating: 4.4,
    category: "tools-prototyping",
    categoryLabel: "Tools & Prototyping",
    description:
      "Adjustable-temperature iron with stand, replaceable tips, solder wick, and cleaning sponge. A complete prototyping bench upgrade.",
    image:
      "https://images.unsplash.com/photo-1562408590-e32931084e23?w=300&h=300&fit=crop",
  },
  {
    id: "12",
    name: "18650 Li-ion Cell (3000 mAh)",
    price: 42,
    rating: 4.5,
    category: "power-batteries",
    categoryLabel: "Power & Batteries",
    description:
      "High-capacity 3.7V cell for portable robotics, drone packs, and DIY power banks. Sold individually.",
    image:
      "https://images.unsplash.com/photo-1609592806950-23f8f3628dd0?w=300&h=300&fit=crop",
  },
];

export function getProductById(id: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

/** Products for each home category rail (bestsellers = highest rated first). */
export function productsForHomeCategory(key: string, pool: MockProduct[] = MOCK_PRODUCTS): MockProduct[] {
  if (key === "bestsellers") {
    return [...pool].sort((a, b) => b.rating - a.rating).slice(0, 8);
  }
  if (key === "all") {
    return [...pool].slice(0, 8);
  }
  return pool.filter((p) => p.category === key).slice(0, 8);
}

export function formatGhs(n: number): string {
  return `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
