import os

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace('font-serif', 'font-display')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
    except Exception as e:
        # print(f"Error in {filepath}: {e}")
        pass

frontend_path = 'frontend'
include_dirs = ['app', 'components', 'lib', 'hooks', 'context']

for inc in include_dirs:
    target = os.path.join(frontend_path, inc)
    if not os.path.exists(target):
        continue
    for root, dirs, files in os.walk(target):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css')):
                replace_in_file(os.path.join(root, file))
