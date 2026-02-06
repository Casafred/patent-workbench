from rapidocr_onnxruntime import RapidOCR
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2

# Create image with text
img = Image.new('RGB', (200, 100), color='white')
draw = ImageDraw.Draw(img)
draw.text((50, 30), "123", fill='black')

# Convert to numpy
img_array = np.array(img)
img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

# Initialize and run
ocr = RapidOCR()
result = ocr(img_array)

print(f"Type: {type(result)}")
print(f"Tuple length: {len(result) if isinstance(result, tuple) else 'N/A'}")

if isinstance(result, tuple):
    for i, item in enumerate(result):
        print(f"\nItem {i}:")
        print(f"  Type: {type(item)}")
        print(f"  Value: {item}")
        if isinstance(item, list) and item:
            print(f"  List length: {len(item)}")
            print(f"  First element: {item[0]}")
