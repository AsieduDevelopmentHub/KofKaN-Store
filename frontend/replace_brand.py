import os

frontend_dir = r"c:\Users\asied\Desktop\Dev\Software\KofKaN-Store\frontend"
target_dirs = ["app", "components", "context", "lib", "hooks", "types"]

replacements = {
    "Sikapa Enterprise": "KofKaN Store",
    "Sikapa": "KofKaN",
    "sikapa": "kofkan",
    "SIKAPA": "KOFKAN",
    "bg-sikapa-bg-deep": "bg-kofkan-deep",
    "text-sikapa-gold": "text-kofkan-cyan",
    "bg-sikapa-gold": "bg-kofkan-cyan",
    "text-sikapa-crimson": "text-kofkan-accent",
    "bg-sikapa-crimson": "bg-kofkan-accent",
    "text-sikapa-cream": "text-kofkan-silver",
    "bg-sikapa-cream": "bg-kofkan-silver",
    "bg-sikapa-crimson-dark": "bg-kofkan-accent-hover",
    "border-sikapa-gold": "border-kofkan-cyan",
    "border-sikapa-crimson": "border-kofkan-accent"
}

for d in target_dirs:
    full_dir = os.path.join(frontend_dir, d)
    if not os.path.exists(full_dir):
        continue
    for root, dirs, files in os.walk(full_dir):
        for name in files:
            if name.endswith(('.tsx', '.ts', '.css', '.js')):
                file_path = os.path.join(root, name)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                except Exception as e:
                    print(f"Skipping {file_path}: {e}")
                    continue
                
                original_content = content
                
                for old, new in replacements.items():
                    content = content.replace(old, new)
                    
                if content != original_content:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"Updated {file_path}")

print("Done frontend replacements.")
