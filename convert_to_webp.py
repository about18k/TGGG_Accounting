import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow is not installed. Please run: pip install Pillow")
    exit(1)

# Path to the frontend public folder
frontend_public_dir = Path("frontend/public")

if not frontend_public_dir.exists():
    print(f"Error: Directory not found -> {frontend_public_dir.absolute()}")
    exit(1)

supported_extensions = {".png", ".jpg", ".jpeg"}
count = 0

print(f"Scanning {frontend_public_dir} for images to convert...")

for root, _, files in os.walk(frontend_public_dir):
    for file in files:
        file_path = Path(root) / file
        
        # Check if the file is an image we want to convert
        if file_path.suffix.lower() in supported_extensions:
            webp_path = file_path.with_suffix(".webp")
            
            # Skip if the .webp version already exists
            if webp_path.exists():
                print(f"Skipping {file_path.name}, webp already exists.")
                continue

            try:
                # Open the image and convert it to WebP
                with Image.open(file_path) as img:
                    img.save(webp_path, "WEBP", quality=85)
                    print(f"Converted: {file_path.name} -> {webp_path.name}")
                    count += 1
                    
                    # NOTE: If you want to automatically DELETE the original files 
                    # after conversion, uncomment the line below:
                    # os.remove(file_path)
                    
            except Exception as e:
                print(f"Failed to convert {file_path.name}: {e}")

print(f"\nDone! Successfully converted {count} images to WebP.")
