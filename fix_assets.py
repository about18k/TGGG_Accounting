import os
import re

for root, _, files in os.walk('frontend'):
    for file in files:
        if file.endswith(('.jsx', '.js', '.ts', '.tsx', '.html')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = re.sub(r'(formlogo|logo|logotripleg)\.png', r'\1.webp', content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
