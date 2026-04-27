import os
import re

path = 'alembic/versions'
files = [f for f in os.listdir(path) if f.endswith('.py')]
revises = {}
ids = set()

for f in files:
    with open(os.path.join(path, f), 'r') as file:
        content = file.read()
    
    rev_match = re.search(r'Revision ID: ([a-f0-9]+)', content)
    if not rev_match:
        rev_match = re.search(r"revision = ['\"]([a-f0-9]+)['\"]", content)
    
    down_match = re.search(r'Revises: (.*)', content)
    if not down_match:
        down_match = re.search(r"down_revision = (.*)", content)
    
    if rev_match:
        rev = rev_match.group(1)
        ids.add(rev)
        if down_match:
            down_val = down_match.group(1).strip().replace("'", "").replace('"', '').replace('(', '').replace(')', '').replace(' ', '')
            if down_val and down_val.lower() != 'none':
                for d in down_val.split(','):
                    revises[rev] = revises.get(rev, []) + [d]

all_downs = set()
for v in revises.values():
    all_downs.update(v)

heads = ids - all_downs
print(f"Heads: {heads}")

# Find orphans (not connected to a base)
# We define base as having no down_revision or down_revision=None
bases = ids - set(revises.keys())
print(f"Bases (Roots): {bases}")

# Check which ones are not in the f55ebb63af35 lineage
# (We could do a full traversal but this is a quick check)
