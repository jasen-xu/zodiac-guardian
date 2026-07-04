"""Optimize zodiac images for web and create seal placeholders."""
import os
from PIL import Image

IMAGES_DIR = r'c:\编程\Qoder\zodiac-guardian\images'

# Zodiac IDs in order
ZODIAC_IDS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake',
              'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig']

def optimize_zodiac_images():
    """Resize and compress zodiac images to web-friendly format."""
    MAX_WIDTH = 600
    QUALITY = 82

    for zid in ZODIAC_IDS:
        # Find the source file (could be .jpg or .jpeg)
        for ext in ['.jpg', '.jpeg']:
            src = os.path.join(IMAGES_DIR, f'{zid}{ext}')
            if os.path.exists(src):
                break
        else:
            print(f'  [SKIP] {zid} - no image found')
            continue

        img = Image.open(src)
        # Convert to RGB if needed (handles RGBA or palette modes)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize if wider than MAX_WIDTH
        w, h = img.size
        if w > MAX_WIDTH:
            ratio = MAX_WIDTH / w
            new_h = int(h * ratio)
            img = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)

        # Save as optimized WebP
        dst = os.path.join(IMAGES_DIR, f'{zid}.webp')
        img.save(dst, 'WEBP', quality=QUALITY)

        old_size = os.path.getsize(src) / 1024
        new_size = os.path.getsize(dst) / 1024
        print(f'  [OK] {zid}: {old_size:.0f}KB -> {new_size:.0f}KB ({img.size[0]}x{img.size[1]})')

def create_seal_placeholders():
    """Create seal-*.png placeholders for all zodiacs by copying seal-goat.png."""
    seal_src = os.path.join(IMAGES_DIR, 'seal-goat.png')
    if not os.path.exists(seal_src):
        print('  [ERROR] seal-goat.png not found!')
        return

    for zid in ZODIAC_IDS:
        dst = os.path.join(IMAGES_DIR, f'seal-{zid}.png')
        if os.path.exists(dst) and zid == 'goat':
            print(f'  [SKIP] seal-{zid}.png already exists')
            continue
        import shutil
        shutil.copy2(seal_src, dst)
        print(f'  [OK] seal-{zid}.png created')

if __name__ == '__main__':
    print('=== Optimizing zodiac images ===')
    optimize_zodiac_images()
    print('\n=== Creating seal placeholders ===')
    create_seal_placeholders()
    print('\nDone!')
