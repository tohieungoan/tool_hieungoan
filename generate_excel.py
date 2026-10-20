import json
import csv
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

with open('skin_id/skin_database.json', 'r', encoding='utf-8') as f:
    skins = json.load(f)

# Tạo file CSV chuẩn mở được bằng Excel (UTF-8 with BOM)
csv_file = 'skin_data_template.csv'
with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    # Header: ID, Tên Tướng, Tên Skin, Tier, Độ Ưu Tiên, Giá Cả VNĐ, Skin Hot, Ghi Chú
    writer.writerow(['ID', 'Hero_Name', 'Skin_Name', 'Tier', 'Priority', 'Price_VND', 'Is_Hot', 'Notes'])
    for s in skins:
        sid = s['id']
        tier = 'S' if s.get('rarity') == 'LEGEND' else ('SS' if s.get('rarity') == 'MYTHIC' else ('A' if s.get('rarity') == 'EPIC' else ('B' if s.get('rarity') == 'RARE' else 'C')))
        writer.writerow([
            sid,
            s.get('hero_name', ''),
            s.get('skin_name', f'Skin #{sid}'),
            tier,
            s.get('priority', 50),
            s.get('price', 100000),
            1 if s.get('is_hot') else 0,
            s.get('notes', '')
        ])

print(f"Đã tạo thành công file: {csv_file}")

# Tạo file .xlsx trực tiếp bằng openpyxl nếu có
try:
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Skin_Data_HOK"
    ws.append(['ID', 'Hero_Name', 'Skin_Name', 'Tier', 'Priority', 'Price_VND', 'Is_Hot', 'Notes'])
    for s in skins:
        sid = s['id']
        tier = 'S' if s.get('rarity') == 'LEGEND' else ('SS' if s.get('rarity') == 'MYTHIC' else ('A' if s.get('rarity') == 'EPIC' else ('B' if s.get('rarity') == 'RARE' else 'C')))
        ws.append([
            sid,
            s.get('hero_name', ''),
            s.get('skin_name', f'Skin #{sid}'),
            tier,
            s.get('priority', 50),
            s.get('price', 100000),
            1 if s.get('is_hot') else 0,
            s.get('notes', '')
        ])
    xlsx_file = 'skin_data_template.xlsx'
    wb.save(xlsx_file)
    print(f"Đã tạo thành công file: {xlsx_file}")
except Exception as e:
    print("Thông báo:", e)
