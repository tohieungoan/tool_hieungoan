/**
 * Configuration presets for Acc Banner Templates
 * Dựa trên các mẫu banner phổ biến của các shop game Liên Quân Mobile tại Việt Nam.
 */
const TEMPLATE_CONFIGS = {

    // ── Template 1: FULL VIP 6 CARDS (Layout Chuẩn Mẫu) ────────────────────
    'full_vip_6cards': {
        width: 720,
        title: 'Layout Full VIP (Top 6 Khung + Stats)',
        defaultSkinCount: 56,
        defaultColsPerRow: 6,
        slots: [
            { id: 'top_bg_art',      label: 'Ảnh Phôi Header Trên Cùng' },
            { id: 'top_hero_1',      label: 'Tướng 1 (Top VIP 1)' },
            { id: 'top_hero_2',      label: 'Tướng 2 (Top VIP 2)' },
            { id: 'top_hero_3',      label: 'Tướng 3 (Top VIP 3)' },
            { id: 'top_hero_4',      label: 'Tướng 4 (Top VIP 4)' },
            { id: 'top_hero_5',      label: 'Tướng 5 (Top VIP 5)' },
            { id: 'top_hero_6',      label: 'Tướng 6 (Top VIP 6)' },
            { id: 'stats_panel',     label: 'Ảnh Bảng Thông Số Account (Trái)' },
            { id: 'portrait_right',  label: 'Ảnh Chân Dung / Avatar (Phải)' },
            { id: 'grid_skins',      label: 'Lưới Skin', isGrid: true }
        ]
    },

    // ── Template 2: LAYOUT CHIA 2 NỬA (50 / 50 Profile & Skins) ─────────────
    'split_50_50': {
        width: 720,
        title: 'Layout 2 Nửa (Nửa Trên Profile Acc - Nửa Dưới Lưới Skin)',
        defaultSkinCount: 42,
        defaultColsPerRow: 6,
        slots: [
            { id: 'top_bg_art',       label: 'Ảnh Phôi Header' },
            { id: 'profile_full_top', label: 'Ảnh Profile Acc / Thông Số In-game (Nửa Trên Full)' },
            { id: 'grid_skins',       label: 'Lưới Skin', isGrid: true }
        ]
    },

    // ── Template 3: SHOP VIP SPLIT (Trái: Profile - Phải: 2 Tướng Hot + Stats) ──
    'shop_vip_banner': {
        width: 720,
        title: 'Layout Shop VIP (Trái: Profile In-game, Phải: Tướng Hot)',
        defaultSkinCount: 42,
        defaultColsPerRow: 6,
        slots: [
            { id: 'top_bg_art',     label: 'Ảnh Phôi Header' },
            { id: 'profile_left',   label: 'Ảnh Profile Account In-game (Trái)' },
            { id: 'hot_hero_1',     label: 'Tướng Hot 1 (Phải)' },
            { id: 'hot_hero_2',     label: 'Tướng Hot 2 (Phải)' },
            { id: 'stats_panel',    label: 'Ảnh Thông Số Account (Góc Phải)' },
            { id: 'grid_skins',     label: 'Lưới Skin', isGrid: true }
        ]
    },

    // ── Template 4: SOLO SPOTLIGHT (1 Hero Lớn + 4 Hero Nhỏ) ───────────────
    'solo_spotlight': {
        width: 720,
        title: 'Tiêu Điểm Solo (1 Tướng Lớn + 4 Tướng Nhỏ)',
        defaultSkinCount: 42,
        defaultColsPerRow: 6,
        slots: [
            { id: 'top_bg_art',   label: 'Ảnh Phôi Header' },
            { id: 'hero_main',    label: 'Tướng Tiêu Điểm (Card Lớn)' },
            { id: 'side_hero_1',  label: 'Tướng Phụ 1' },
            { id: 'side_hero_2',  label: 'Tướng Phụ 2' },
            { id: 'side_hero_3',  label: 'Tướng Phụ 3' },
            { id: 'side_hero_4',  label: 'Tướng Phụ 4' },
            { id: 'stats_panel',  label: 'Ảnh Bảng Thông Số' },
            { id: 'grid_skins',   label: 'Lưới Skin', isGrid: true }
        ]
    },

    // ── Template 5: SHOP MINIMAL (Header Rút Gọn + Lưới Skin) ──────────────
    'minimal_shop': {
        width: 720,
        title: 'Layout Shop Tối Giản (Header Rút Gọn + Lưới Skin Toàn Màn)',
        defaultSkinCount: 48,
        defaultColsPerRow: 6,
        slots: [
            { id: 'top_bg_art',   label: 'Ảnh Phôi Header' },
            { id: 'stats_panel',  label: 'Ảnh Thông Số / Profile Rút Gọn' },
            { id: 'grid_skins',   label: 'Lưới Skin', isGrid: true }
        ]
    }
};
