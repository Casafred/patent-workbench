from rapidocr_onnxruntime import RapidOCR
import numpy as np

# Create simple test image
img = np.ones((100, 100, 3), dtype=np.uint8) * 255

# Initialize and run
ocr = RapidOCR()
result = ocr(img)

print(f"Type: {type(result)}")
print(f"Content: {result}")

if isinstance(result, tuple):
    print(f"Tuple length: {len(result)}")
    for i, item in enumerate(result):
        print(f"  Item {i}: type={type(item)}, value={item}")
