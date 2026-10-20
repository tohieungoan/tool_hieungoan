import os
import sys
import json
import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

Image.MAX_IMAGE_PIXELS = None

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'skin_id')
os.makedirs(OUTPUT_DIR, exist_ok=True)

IMG1_PATH = os.path.join(os.path.dirname(__file__), 'img', 'Screenshot_2026_1020_023556_com.levelinfinite.sgameGlobal.jpg')
IMG2_PATH = os.path.join(os.path.dirname(__file__), 'img', 'Screenshot_2026_1020_023724_com.levelinfinite.sgameGlobal.jpg')

COLS = [
    (497, 812),
    (855, 1170),
    (1210, 1525),
    (1567, 1882),
    (1924, 2239),
    (2281, 2596)
]
CARD_HEIGHT = 440

def find_row_top(im_pil, y_guess, search_range=25):
    h = im_pil.height
    y1 = max(0, y_guess - search_range)
    y2 = min(h, y_guess + search_range)
    
    grad_sum = np.zeros(y2 - y1)
    for c_start, c_end in COLS:
        cx1 = int(c_start + (c_end - c_start) * 0.1)
        cx2 = int(c_end - (c_end - c_start) * 0.1)
        strip = np.array(im_pil.crop((cx1, y1, cx2, y2)))
        gray = cv2.cvtColor(strip, cv2.COLOR_RGB2GRAY)
        sobel = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        grad_sum += np.mean(np.abs(sobel), axis=1)
        
    best_offset = np.argmax(grad_sum)
    return y1 + best_offset

def process_all_skins():
    print("=== BẮT ĐẦU CẮT SKIN TỪ 2 ẢNH CHỤP CUỘN HOK ===")
    
    current_skin_id = 1
    manifest = []

    # 1. Xử lý Ảnh 1 (63 hàng: hàng 0 đến 62)
    print(f"\n[1/2] Đang xử lý Ảnh 1: {os.path.basename(IMG1_PATH)}...")
    im1 = Image.open(IMG1_PATH)
    y_curr = 269

    for r_idx in range(63):
        y_top = find_row_top(im1, y_curr)
        y_bottom = y_top + CARD_HEIGHT
        
        for c_idx, (x1, x2) in enumerate(COLS):
            card_crop = im1.crop((x1, y_top, x2, y_bottom))
            filename = f"{current_skin_id}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)
            card_crop.save(filepath, format="PNG")
            
            manifest.append({
                "id": int(current_skin_id),
                "filename": filename,
                "source": "Screenshot_1",
                "row": int(r_idx),
                "col": int(c_idx),
                "crop_box": [int(x1), int(y_top), int(x2), int(y_bottom)]
            })
            current_skin_id += 1
            
        y_curr = y_top + 633
        if (r_idx + 1) % 10 == 0 or r_idx == 62:
            print(f"  -> Đã cắt hàng {r_idx + 1}/63 (Tổng skin hiện tại: {current_skin_id - 1})")

    im1.close()
    print(f"Hoàn thành Ảnh 1: {current_skin_id - 1} skin đã được cắt.")

    # 2. Xử lý Ảnh 2 (bỏ qua hàng 0 vì trùng hàng 62 của Ảnh 1)
    print(f"\n[2/2] Đang xử lý Ảnh 2: {os.path.basename(IMG2_PATH)}...")
    im2 = Image.open(IMG2_PATH)
    
    # Hàng 0 trùng ở y=213, bắt đầu tìm từ y=213 để có delta chuẩn
    y_curr = 213
    im2_rows = []
    for r in range(33):
        y_top = find_row_top(im2, y_curr)
        im2_rows.append(y_top)
        y_curr = y_top + 633

    # Cắt từ hàng 1 đến 31 (đầy đủ 6 cột)
    for r_idx in range(1, 32):
        y_top = im2_rows[r_idx]
        y_bottom = y_top + CARD_HEIGHT
        
        for c_idx, (x1, x2) in enumerate(COLS):
            card_crop = im2.crop((x1, y_top, x2, y_bottom))
            filename = f"{current_skin_id}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)
            card_crop.save(filepath, format="PNG")
            
            manifest.append({
                "id": int(current_skin_id),
                "filename": filename,
                "source": "Screenshot_2",
                "row": int(r_idx),
                "col": int(c_idx),
                "crop_box": [int(x1), int(y_top), int(x2), int(y_bottom)]
            })
            current_skin_id += 1

        if r_idx % 10 == 0 or r_idx == 31:
            print(f"  -> Đã cắt hàng {r_idx}/32 của Ảnh 2 (Tổng skin hiện tại: {current_skin_id - 1})")

    # Hàng 32 là hàng cuối cùng: chỉ có cột 1 (Zilong - Rồng Nghi Lễ), cột 2..6 trống
    y_top_last = im2_rows[32]
    y_bottom_last = y_top_last + CARD_HEIGHT
    x1, x2 = COLS[0]
    last_card_crop = im2.crop((x1, y_top_last, x2, y_bottom_last))
    filename = f"{current_skin_id}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)
    last_card_crop.save(filepath, format="PNG")

    manifest.append({
        "id": int(current_skin_id),
        "filename": filename,
        "source": "Screenshot_2",
        "row": 32,
        "col": 0,
        "crop_box": [int(x1), int(y_top_last), int(x2), int(y_bottom_last)]
    })
    print(f"  -> Đã cắt skin cuối cùng (Zilong - Rồng Nghi Lễ) tại Cột 1 hàng 32: ID #{current_skin_id}")
    current_skin_id += 1

    im2.close()

    total_skins = current_skin_id - 1
    # Ghi manifest.json
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_skins": total_skins,
            "naming_convention": "sequential_id (1.png ... 565.png)",
            "dimensions": {"width": 315, "height": CARD_HEIGHT},
            "items": manifest
        }, f, indent=2, ensure_ascii=False)

    print(f"\n🎉 HOÀN THÀNH TẤT CẢ! Đã xuất thành công {total_skins} skin vào thư mục 'skin_id/'")
    print(f"File thông tin danh mục: {manifest_path}")

if __name__ == '__main__':
    process_all_skins()
