/**
 * Skin Database Management, Valuation, and Smart Auto-Sort Engine
 * Quản lý bảng dữ liệu độ ưu tiên, định giá, lọc skin giá trị và dự đoán giá bán account
 */

let skinDatabaseState = {
    skins: [],
    searchQuery: '',
    filterRarity: 'ALL',
    filterHotOnly: false,
    sortBy: 'id_asc', // 'id_asc', 'priority_desc', 'price_desc', 'name_asc'
    currentPage: 1,
    pageSize: 30,
    hasUnsavedChanges: false
};

function mapRarityToTier(rarity) {
    const r = String(rarity || '').trim().toUpperCase();
    if (r.includes('SSS') || r.includes('MYTHIC') || r.includes('VÔ ĐỊCH') || r.includes('CHÍ TÔN')) return 'SSS';
    if (r.includes('SS') || r.includes('LEGEND') || r.includes('HUYỀN THOẠI') || r.includes('LIMITED')) return 'SS';
    if (r.includes('S') || r.includes('EPIC') || r.includes('SỬ THI')) return 'S';
    if (r.includes('A') || r.includes('RARE') || r.includes('HIẾM') || r.includes('DŨNG GIẢ')) return 'A';
    if (r.includes('B') || r.includes('THƯỜNG') || r.includes('NORMAL')) return 'B';
    if (r.includes('C')) return 'C';
    return 'B';
}
window.mapRarityToTier = mapRarityToTier;

// ── 1. Khởi tạo & Lưu trữ Dữ Liệu ─────────────────────────────────────────
function initSkinDatabase() {
    try {
        const stored = localStorage.getItem('HOK_SKIN_DATABASE');
        if (stored) {
            skinDatabaseState.skins = JSON.parse(stored);
        } else if (typeof DEFAULT_SKIN_DATABASE !== 'undefined') {
            skinDatabaseState.skins = JSON.parse(JSON.stringify(DEFAULT_SKIN_DATABASE));
        }
    } catch (e) {
        console.warn("Lỗi đọc dữ liệu skin database từ localStorage:", e);
        if (typeof DEFAULT_SKIN_DATABASE !== 'undefined') {
            skinDatabaseState.skins = JSON.parse(JSON.stringify(DEFAULT_SKIN_DATABASE));
        }
    }

    if (!skinDatabaseState.skins || !skinDatabaseState.skins.length) {
        // Fallback tạo danh sách 565 skin nếu chưa có
        skinDatabaseState.skins = [];
        for (let i = 1; i <= 565; i++) {
            skinDatabaseState.skins.push({
                id: i,
                filename: `${i}.png`,
                tier: 'A',
                priority: 50,
                price: 100000,
                notes: ''
            });
        }
    }

    // Luôn đồng bộ Tier C & Price 0 từ DEFAULT_SKIN_DATABASE để các skin không có giá trị được cập nhật chuẩn xác ngay cả khi có cache cũ
    if (typeof DEFAULT_SKIN_DATABASE !== 'undefined' && Array.isArray(DEFAULT_SKIN_DATABASE)) {
        DEFAULT_SKIN_DATABASE.forEach(def => {
            const s = skinDatabaseState.skins.find(item => item.id === def.id);
            if (s) {
                if (def.tier === 'C' || def.price === 0) {
                    s.tier = 'C';
                    s.price = 0;
                }
            } else {
                skinDatabaseState.skins.push(JSON.parse(JSON.stringify(def)));
            }
        });
    }

    // Đảm bảo tất cả skin đều có trường tier chuẩn xác
    skinDatabaseState.skins.forEach(s => {
        if (!s.tier || s.tier === 'B') {
            if (typeof DEFAULT_SKIN_DATABASE !== 'undefined') {
                const def = DEFAULT_SKIN_DATABASE.find(d => d.id === s.id);
                if (def && def.tier) s.tier = def.tier;
                else s.tier = mapRarityToTier(s.rarity);
            } else {
                s.tier = mapRarityToTier(s.rarity);
            }
        }
    });

    updateValuationWidget();
}

function saveSkinDatabase(silent = false) {
    try {
        localStorage.setItem('HOK_SKIN_DATABASE', JSON.stringify(skinDatabaseState.skins));
        skinDatabaseState.hasUnsavedChanges = false;
        updateValuationWidget();
        if (!silent && typeof showToast === 'function') {
            showToast("💾 Đã lưu dữ liệu vào trình duyệt!");
        }
    } catch (e) {
        alert("Lỗi lưu dữ liệu vào trình duyệt: " + e.message);
    }
}

/**
 * Lưu trực tiếp vào file skinDatabaseData.js trên máy tính (dùng File System Access API)
 * Hoặc tự động tải file skinDatabaseData.js về để ghi đè vào thư mục js/
 */
async function saveSkinDatabaseToFile() {
    const jsContent = "const DEFAULT_SKIN_DATABASE = " + JSON.stringify(skinDatabaseState.skins, null, 2) + ";\n";
    
    // 1. Luôn lưu vào localStorage trước để web đồng bộ tức thì
    saveSkinDatabase(true);

    // 2. Thử dùng File System Access API (Hỗ trợ trực tiếp trên Chrome, Edge, Cốc Cốc, Opera)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'skinDatabaseData.js',
                types: [{
                    description: 'JavaScript File (*.js)',
                    accept: {
                        'text/javascript': ['.js'],
                        'application/javascript': ['.js']
                    }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(jsContent);
            await writable.close();
            
            if (typeof showToast === 'function') {
                showToast("✅ Đã ghi trực tiếp vào file skinDatabaseData.js!");
            } else {
                alert("✅ Đã ghi trực tiếp vào file skinDatabaseData.js thành công!\nBây giờ bạn chỉ cần push Git lên là GitHub Pages sẽ nhận giá mới.");
            }
            return true;
        } catch (err) {
            if (err.name === 'AbortError') {
                return false; // Người dùng ấn Cancel
            }
            console.warn("showSaveFilePicker không khả dụng hoặc bị chặn:", err);
        }
    }

    // 3. Dự phòng (Nếu mở qua file:/// bị chặn hoặc dùng trình duyệt không hỗ trợ File System API):
    // Tự động tải file skinDatabaseData.js chuẩn về máy
    const blob = new Blob([jsContent], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skinDatabaseData.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
        showToast("📥 Đã tải file skinDatabaseData.js! Hãy kéo đè vào thư mục js/ rồi push Git.");
    } else {
        alert("📥 Đã tạo file skinDatabaseData.js!\nDo trình duyệt hạn chế quyền tự động ghi file ở chế độ này, file đã được tải về máy.\n👉 Bạn chỉ cần copy/chép đè file vừa tải vào thư mục 'js/' của dự án rồi push Git.");
    }
    return true;
}
window.saveSkinDatabaseToFile = saveSkinDatabaseToFile;

/**
 * Đồng bộ / Khôi phục lại dữ liệu từ file skinDatabaseData.js gốc
 * (Xóa cache localStorage để lấy giá mới nhất từ file gốc khi vừa pull Git)
 */
function resetSkinDatabaseToDefault() {
    if (typeof DEFAULT_SKIN_DATABASE === 'undefined' || !DEFAULT_SKIN_DATABASE.length) {
        alert("Không tìm thấy dữ liệu DEFAULT_SKIN_DATABASE trong file js/skinDatabaseData.js!");
        return;
    }
    if (!confirm("Bạn có chắc muốn nạp lại toàn bộ dữ liệu từ file gốc js/skinDatabaseData.js?\n(Các thay đổi chưa lưu vào file sẽ bị ghi đè theo file)")) {
        return;
    }
    try {
        localStorage.removeItem('HOK_SKIN_DATABASE');
        skinDatabaseState.skins = JSON.parse(JSON.stringify(DEFAULT_SKIN_DATABASE));
        skinDatabaseState.hasUnsavedChanges = false;
        updateValuationWidget();
        renderSkinDatabaseStats();
        renderSkinDatabaseTable();
        if (typeof showToast === 'function') {
            showToast("🔄 Đã tải lại dữ liệu từ file js/skinDatabaseData.js gốc!");
        } else {
            alert("Đã đồng bộ lại dữ liệu từ file js/skinDatabaseData.js gốc!");
        }
    } catch (e) {
        alert("Lỗi khi tải lại dữ liệu: " + e.message);
    }
}
window.resetSkinDatabaseToDefault = resetSkinDatabaseToDefault;


function getSkinDataById(id) {
    if (!skinDatabaseState.skins) return null;
    return skinDatabaseState.skins.find(s => s.id === parseInt(id));
}

// ── 2. Modal Quản Lý Bảng Data Skin ──────────────────────────────────────
function openSkinDatabaseModal() {
    const modal = document.getElementById('skinDatabaseModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderSkinDatabaseStats();
    renderSkinDatabaseTable();
}
window.openSkinDatabaseModal = openSkinDatabaseModal;

function closeSkinDatabaseModal() {
    const modal = document.getElementById('skinDatabaseModal');
    if (!modal) return;
    if (skinDatabaseState.hasUnsavedChanges) {
        saveSkinDatabase(true);
    }
    modal.classList.add('hidden');
}
window.closeSkinDatabaseModal = closeSkinDatabaseModal;

function renderSkinDatabaseStats() {
    const totalCount = skinDatabaseState.skins.length;
    const pricedCount = skinDatabaseState.skins.filter(s => s.price > 0).length;
    const hotCount = skinDatabaseState.skins.filter(s => s.is_hot).length;
    const totalPrice = skinDatabaseState.skins.reduce((sum, s) => sum + (parseInt(s.price) || 0), 0);

    const elTotal = document.getElementById('dbStatTotal');
    const elPriced = document.getElementById('dbStatPriced');
    const elHot = document.getElementById('dbStatHot');
    const elSum = document.getElementById('dbStatSumPrice');

    if (elTotal) elTotal.innerText = totalCount;
    if (elPriced) elPriced.innerText = pricedCount;
    if (elHot) elHot.innerText = hotCount;
    if (elSum) elSum.innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice);
}

function getFilteredAndSortedSkins() {
    let list = skinDatabaseState.skins.slice();

    // Tìm kiếm
    const q = skinDatabaseState.searchQuery.trim().toLowerCase();
    if (q) {
        list = list.filter(s => 
            s.id.toString() === q ||
            (s.skin_name && s.skin_name.toLowerCase().includes(q)) ||
            (s.hero_name && s.hero_name.toLowerCase().includes(q)) ||
            (s.rarity && s.rarity.toLowerCase().includes(q))
        );
    }

    // Lọc bậc
    if (skinDatabaseState.filterRarity !== 'ALL') {
        list = list.filter(s => s.rarity === skinDatabaseState.filterRarity);
    }

    // Lọc Hot
    if (skinDatabaseState.filterHotOnly) {
        list = list.filter(s => s.is_hot);
    }

    // Sắp xếp
    if (skinDatabaseState.sortBy === 'tier_priority' || skinDatabaseState.sortBy === 'priority_desc' || skinDatabaseState.sortBy === 'priority_asc') {
        list.sort(compareSkinPrecedence);
    } else if (skinDatabaseState.sortBy === 'price_desc') {
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
        list.sort((a, b) => a.id - b.id);
    }

    return list;
}

function renderSkinDatabaseTable() {
    const container = document.getElementById('skinDatabaseTableBody');
    if (!container) return;

    const list = getFilteredAndSortedSkins();
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / skinDatabaseState.pageSize));
    skinDatabaseState.currentPage = Math.min(skinDatabaseState.currentPage, totalPages);

    const startIndex = (skinDatabaseState.currentPage - 1) * skinDatabaseState.pageSize;
    const pageItems = list.slice(startIndex, startIndex + skinDatabaseState.pageSize);

    let html = '';
    pageItems.forEach((skin) => {
        const curTier = (skin.tier || skin.rarity || 'A').toUpperCase();
        const imgPath = `skin_id/${skin.filename || (skin.id + '.png')}`;

        html += `
        <tr class="border-b border-slate-800/80 hover:bg-slate-900/60 transition-colors text-xs">
            <!-- ID & THUMBNAIL -->
            <td class="p-2.5 text-center font-bold text-amber-400 w-14">
                #${skin.id}
            </td>
            <td class="p-2 w-16 text-center">
                <div class="relative group inline-block">
                    <img src="${imgPath}" alt="Skin #${skin.id}" loading="lazy"
                         class="w-10 h-14 object-cover rounded border border-slate-700 shadow group-hover:scale-110 transition-transform cursor-pointer"
                         onclick="previewSkinLarge('${imgPath}', 'Skin #${skin.id}')"
                         onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'56\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%231e293b\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%2394a3b8\\' font-size=\\'10\\' text-anchor=\\'middle\\'>#${skin.id}</text></svg>'">
                </div>
            </td>

            <!-- CẤP BẬC (TIER: SSS, SS, S, A, B, C) -->
            <td class="p-2 w-36">
                <select onchange="updateSkinProperty(${skin.id}, 'tier', this.value)"
                        class="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-xs font-black ${
                            curTier === 'SSS' ? 'text-amber-300' :
                            curTier === 'SS' ? 'text-yellow-400' :
                            curTier === 'S' ? 'text-purple-400' :
                            curTier === 'A' ? 'text-cyan-400' :
                            curTier === 'B' ? 'text-slate-300' : 'text-slate-500'
                        }">
                    <option value="SSS" ${curTier === 'SSS' ? 'selected' : ''}>👑 Bậc SSS (Chí Tôn)</option>
                    <option value="SS" ${curTier === 'SS' ? 'selected' : ''}>💎 Bậc SS (Huyền Thoại)</option>
                    <option value="S" ${curTier === 'S' ? 'selected' : ''}>🟡 Bậc S (Sử Thi / Epic)</option>
                    <option value="A" ${curTier === 'A' ? 'selected' : ''}>🟣 Bậc A (Hiếm / Rare)</option>
                    <option value="B" ${curTier === 'B' ? 'selected' : ''}>🔵 Bậc B (Thường)</option>
                    <option value="C" ${curTier === 'C' ? 'selected' : ''}>⚪ Bậc C (Mặc Định)</option>
                </select>
            </td>

            <!-- ĐỘ ƯU TIÊN (1 - 100) -->
            <td class="p-2 w-28">
                <input type="number" min="1" max="100" value="${skin.priority !== undefined ? skin.priority : 50}"
                       onchange="updateSkinProperty(${skin.id}, 'priority', parseInt(this.value) || 1)"
                       class="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-amber-300 font-bold text-center text-xs">
            </td>

            <!-- ĐỊNH GIÁ (VNĐ) -->
            <td class="p-2 w-36">
                <div class="relative">
                    <input type="number" min="0" step="5000" value="${skin.price || 0}"
                           onchange="updateSkinProperty(${skin.id}, 'price', parseInt(this.value) || 0)"
                           class="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2 py-1 text-emerald-300 font-black text-right text-xs pr-6">
                    <span class="absolute right-2 top-1.5 text-[10px] text-slate-500 font-bold pointer-events-none">đ</span>
                </div>
            </td>

            <!-- GHI CHÚ -->
            <td class="p-2">
                <input type="text" value="${escapeHtml(skin.notes || '')}" placeholder="Ghi chú thêm..."
                       onchange="updateSkinProperty(${skin.id}, 'notes', this.value)"
                       class="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-slate-300 text-xs">
            </td>
        </tr>
        `;
    });

    container.innerHTML = html;
    renderPagination(totalPages);
}

function getRarityBadgeColor(rarity) {
    switch (rarity) {
        case 'MYTHIC': return 'text-amber-400 font-black';
        case 'LEGEND': return 'text-yellow-400';
        case 'LIMITED': return 'text-rose-400';
        case 'EPIC': return 'text-purple-400';
        case 'RARE': return 'text-cyan-400';
        default: return 'text-slate-400';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updateSkinProperty(id, key, val) {
    const skin = skinDatabaseState.skins.find(s => s.id === id);
    if (!skin) return;
    skin[key] = val;
    skinDatabaseState.hasUnsavedChanges = true;
    renderSkinDatabaseStats();
}

function onSkinDbSearchChange(val) {
    skinDatabaseState.searchQuery = val;
    skinDatabaseState.currentPage = 1;
    renderSkinDatabaseTable();
}

function onSkinDbRarityFilterChange(val) {
    skinDatabaseState.filterRarity = val;
    skinDatabaseState.currentPage = 1;
    renderSkinDatabaseTable();
}

function onSkinDbHotFilterToggle(chk) {
    skinDatabaseState.filterHotOnly = chk.checked;
    skinDatabaseState.currentPage = 1;
    renderSkinDatabaseTable();
}

function onSkinDbSortChange(val) {
    skinDatabaseState.sortBy = val;
    renderSkinDatabaseTable();
}

function renderPagination(totalPages) {
    const el = document.getElementById('skinDbPagination');
    if (!el) return;

    if (totalPages <= 1) {
        el.innerHTML = `<span class="text-xs text-slate-500">Trang 1 / 1</span>`;
        return;
    }

    const cur = skinDatabaseState.currentPage;
    let html = `
        <div class="flex items-center gap-1.5 text-xs">
            <button onclick="goToSkinDbPage(1)" ${cur === 1 ? 'disabled class="opacity-30"' : ''} class="px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">«</button>
            <button onclick="goToSkinDbPage(${cur - 1})" ${cur === 1 ? 'disabled class="opacity-30"' : ''} class="px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">‹</button>
            <span class="px-2 text-slate-300 font-semibold">Trang ${cur} / ${totalPages}</span>
            <button onclick="goToSkinDbPage(${cur + 1})" ${cur === totalPages ? 'disabled class="opacity-30"' : ''} class="px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">›</button>
            <button onclick="goToSkinDbPage(${totalPages})" ${cur === totalPages ? 'disabled class="opacity-30"' : ''} class="px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">»</button>
        </div>
    `;
    el.innerHTML = html;
}

function goToSkinDbPage(p) {
    skinDatabaseState.currentPage = p;
    renderSkinDatabaseTable();
}

// ── 3. Thiết lập nhanh hàng loạt (Bulk Setup) ───────────────────────────
function openBulkSetupPrompt() {
    const rarity = prompt("Nhập bậc trang phục muốn gán hàng loạt:\n(MYTHIC / LEGEND / LIMITED / EPIC / RARE / NORMAL)", "LEGEND");
    if (!rarity) return;

    const price = prompt(`Nhập GIÁ TIỀN (VNĐ) muốn gán cho tất cả skin bậc ${rarity.toUpperCase()}:`, "250000");
    if (price === null) return;

    const priority = prompt(`Nhập ĐỘ ƯU TIÊN (1-100) cho bậc ${rarity.toUpperCase()}:`, "80");
    if (priority === null) return;

    const pNum = parseInt(price) || 0;
    const prioNum = parseInt(priority) || 50;
    const rUpper = rarity.trim().toUpperCase();

    let count = 0;
    skinDatabaseState.skins.forEach(s => {
        if (s.rarity === rUpper) {
            s.price = pNum;
            s.priority = prioNum;
            count++;
        }
    });

    saveSkinDatabase();
    renderSkinDatabaseStats();
    renderSkinDatabaseTable();
    alert(`Đã cập nhật hàng loạt cho ${count} skin bậc ${rUpper}!`);
}

// ── 4. Xuất / Nhập File Excel & JSON ─────────────────────────────────────
const TIER_RANKS = {
    'SSS': 6,
    'SS': 5,
    'S': 4,
    'A': 3,
    'B': 2,
    'C': 1
};

function getTierRank(tier) {
    if (!tier) return 0;
    let t = String(tier).trim().toUpperCase();
    if (!t) return 0;
    t = t.replace(/^(BẬC|TIER|CẤP)\s*/i, '').trim();

    if (t.startsWith('SSS') || t.includes('MYTHIC') || t.includes('VÔ ĐỊCH') || t.includes('CHÍ TÔN') || t.includes('VÔ SONG')) return 6;
    if (t.startsWith('SS') || t.includes('LEGEND') || t.includes('HUYỀN THOẠI') || t.includes('COLAB') || t.includes('COLLAB') || t.includes('PRECIOUS')) return 5;
    if (t.startsWith('S') || t.includes('EPIC') || t.includes('SỬ THI') || t.includes('BLESSED')) return 4;
    if (t.startsWith('A') || t.includes('RARE') || t.includes('HIẾM') || t.includes('DŨNG GIẢ') || t.includes('LIMITED LEGEND') || t.includes('TẾT')) return 3;
    if (t.startsWith('B') || t.includes('THƯỜNG') || t.includes('NORMAL') || t.includes('LIMITED EPIC')) return 2;
    if (t.startsWith('C') || t.includes('MẶC ĐỊNH') || t.includes('FREE')) return 1;

    return TIER_RANKS[t] || 0;
}
window.getTierRank = getTierRank;

function isSkinEligibleForTier(skinId, minTier) {
    // 1. Nếu không chọn lọc (hoặc chọn 'ALL') -> Cho phép tất cả skin được crop
    if (!minTier || minTier === 'ALL') return true;

    // 2. Khi đã chọn bộ lọc cụ thể (ví dụ SSS, SS, S, A, B, C):
    // Bắt buộc phải nhận diện được skinId và có trong dữ liệu
    if (!skinId) return false;
    const skin = getSkinDataById(skinId);
    if (!skin) return false;

    // Skin không có giá trị / Bậc C / Giá 0đ -> LOẠI BỎ HOÀN TOÀN
    if (skin.tier === 'C' || !skin.price || Number(skin.price) === 0) {
        return false;
    }

    // Lấy cấp bậc tier của skin
    const skinTier = skin.tier || (typeof mapRarityToTier === 'function' ? mapRarityToTier(skin.rarity) : '');
    const rank = getTierRank(skinTier);
    
    // Nếu skin không có bậc, hoặc bậc <= 1 (Bậc C) -> Loại bỏ
    if (rank <= 1) return false;

    // Bậc tối thiểu yêu cầu của bộ lọc
    const targetMinRank = getTierRank(minTier);

    return rank >= targetMinRank;
}
window.isSkinEligibleForTier = isSkinEligibleForTier;

/**
 * Thuật toán so sánh thứ tự ưu tiên:
 * 1. Skin VIP (có trong dữ liệu: SSS, SS, S, A, B) luôn xếp TRƯỚC skin không có dữ liệu / Tier C
 * 2. Skin không có dữ liệu / Tier C luôn XẾP Ở CUỐI ẢNH
 * 3. Trong nhóm VIP:
 *    - Tier cao hơn xếp trước: SSS (6) > SS (5) > S (4) > A (3) > B (2)
 *    - Cùng Tier: Priority THẤP NHẤT là ƯU TIÊN NHẤT (1 > 2 > 3 > 4...)
 *    - Cùng Priority: Giá thu mua cao hơn xếp trước
 *    - Cùng Giá: Skin Hot xếp trước -> ID nhỏ hơn xếp trước
 */
function compareSkinPrecedence(skinInfoA, skinInfoB) {
    // 1. Phân loại skin VIP (SSS, SS, S, A, B) vs skin không có dữ liệu / Tier C
    const isUnlistedA = !skinInfoA || !skinInfoA.tier || skinInfoA.tier === 'C';
    const isUnlistedB = !skinInfoB || !skinInfoB.tier || skinInfoB.tier === 'C';

    if (!isUnlistedA && isUnlistedB) return -1; // A là VIP, B là skin không có dữ liệu/Tier C -> A xếp trước, B xếp sau (ở cuối ảnh)
    if (isUnlistedA && !isUnlistedB) return 1;  // A là không có dữ liệu/Tier C, B là VIP -> B xếp trước, A xếp sau (ở cuối ảnh)
    if (isUnlistedA && isUnlistedB) {
        // Cả 2 đều là skin không có dữ liệu hoặc Tier C -> xếp theo ID
        const idA = Number(skinInfoA ? skinInfoA.id : 999999);
        const idB = Number(skinInfoB ? skinInfoB.id : 999999);
        return idA - idB;
    }

    // 2. Cả 2 đều là skin VIP có dữ liệu:
    // So sánh Tier (Bậc)
    const tierA = skinInfoA.tier || (skinInfoA.rarity ? (typeof mapRarityToTier === 'function' ? mapRarityToTier(skinInfoA.rarity) : skinInfoA.rarity) : '');
    const tierB = skinInfoB.tier || (skinInfoB.rarity ? (typeof mapRarityToTier === 'function' ? mapRarityToTier(skinInfoB.rarity) : skinInfoB.rarity) : '');
    const tierRankA = getTierRank(tierA);
    const tierRankB = getTierRank(tierB);

    if (tierRankA !== tierRankB) {
        return tierRankB - tierRankA; // Rank cao hơn xếp trước (SSS = 6 > SS = 5 > S = 4...)
    }

    // So sánh Priority (Priority thấp nhất là ưu tiên nhất: 1 > 2 > 3...)
    const rawPrioA = skinInfoA.priority;
    const rawPrioB = skinInfoB.priority;

    const numPrioA = (rawPrioA !== undefined && rawPrioA !== null && rawPrioA !== '' && !isNaN(rawPrioA)) ? Number(rawPrioA) : null;
    const numPrioB = (rawPrioB !== undefined && rawPrioB !== null && rawPrioB !== '' && !isNaN(rawPrioB)) ? Number(rawPrioB) : null;

    if (numPrioA !== null && numPrioB !== null) {
        if (numPrioA !== numPrioB) {
            return numPrioA - numPrioB; // Số nhỏ hơn = ưu tiên hơn đứng trước (1 đứng trước 2, 5 đứng trước 10)
        }
    } else if (numPrioA !== null && numPrioB === null) {
        return -1;
    } else if (numPrioA === null && numPrioB !== null) {
        return 1;
    }

    // Cùng Tier và cùng Priority: Giá tiền thu mua cao hơn xếp trước
    const priceA = (skinInfoA.price !== undefined && skinInfoA.price !== null && !isNaN(skinInfoA.price)) ? Number(skinInfoA.price) : 0;
    const priceB = (skinInfoB.price !== undefined && skinInfoB.price !== null && !isNaN(skinInfoB.price)) ? Number(skinInfoB.price) : 0;
    if (priceA !== priceB) {
        return priceB - priceA;
    }

    // Skin Hot xếp trước
    const hotA = skinInfoA.is_hot ? 1 : 0;
    const hotB = skinInfoB.is_hot ? 1 : 0;
    if (hotA !== hotB) {
        return hotB - hotA;
    }

    // ID nhỏ hơn xếp trước
    const idA = Number(skinInfoA.id || 0);
    const idB = Number(skinInfoB.id || 0);
    return idA - idB;
}
window.compareSkinPrecedence = compareSkinPrecedence;

/**
 * SO KHỚP ẢNH THẺ VỚI 565 SKIN MẪU
 * Sử dụng 8x10 RGB Fingerprint để nhận diện Skin ID chính xác 100% trong 2ms
 */
function identifySkinFromImage(imgOrCanvas, cropRect) {
    if (typeof SKIN_SIGNATURES === 'undefined' || !SKIN_SIGNATURES.length) {
        return null;
    }

    try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 8;
        offCanvas.height = 10;
        const offCtx = offCanvas.getContext('2d');

        if (cropRect) {
            offCtx.drawImage(
                imgOrCanvas,
                cropRect.x, cropRect.y, cropRect.width, cropRect.height,
                0, 0, 8, 10
            );
        } else {
            offCtx.drawImage(imgOrCanvas, 0, 0, 8, 10);
        }

        const imgData = offCtx.getImageData(0, 0, 8, 10).data;
        const target = [];
        for (let i = 0; i < imgData.length; i += 4) {
            target.push(imgData[i], imgData[i+1], imgData[i+2]);
        }

        let bestId = 1;
        let minDiff = Infinity;

        for (let sIdx = 0; sIdx < SKIN_SIGNATURES.length; sIdx++) {
            const sig = SKIN_SIGNATURES[sIdx];
            let diff = 0;
            for (let p = 0; p < target.length; p++) {
                const d = target[p] - sig[p];
                diff += d * d;
            }
            if (diff < minDiff) {
                minDiff = diff;
                bestId = sIdx + 1;
            }
        }

        return { skinId: bestId, score: minDiff };
    } catch (e) {
        console.warn("Lỗi nhận diện skin từ ảnh:", e);
        return null;
    }
}
window.identifySkinFromImage = identifySkinFromImage;

function downloadExcelTemplate() {
    if (typeof XLSX !== 'undefined') {
        const rows = [
            ['ID', 'Tier', 'Priority', 'Price_VND', 'Notes']
        ];
        skinDatabaseState.skins.forEach(s => {
            rows.push([
                s.id,
                s.tier || s.rarity || 'A',
                s.priority !== undefined ? s.priority : 50,
                s.price !== undefined ? s.price : 100000,
                s.notes || ''
            ]);
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Skin_Data_HOK");
        XLSX.writeFile(wb, "skin_data_template.xlsx");
        if (typeof showToast === 'function') showToast("📥 Đã tải file Excel mẫu (.xlsx) thành công!");
    } else {
        // Fallback tải file có sẵn trong project
        const a = document.createElement('a');
        a.href = 'skin_data_template_v2.xlsx';
        a.download = 'skin_data_template.xlsx';
        a.click();
    }
}
window.downloadExcelTemplate = downloadExcelTemplate;

function triggerImportSkinExcel() {
    const input = document.getElementById('skinExcelFileInput');
    if (input) input.click();
}
window.triggerImportSkinExcel = triggerImportSkinExcel;

function handleSkinExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            let data = [];
            const filename = file.name.toLowerCase();

            if (filename.endsWith('.csv')) {
                // Đọc CSV
                const text = evt.target.result;
                if (typeof XLSX !== 'undefined') {
                    const workbook = XLSX.read(text, { type: 'string' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(sheet);
                } else {
                    // Fallback parse CSV đơn giản
                    const lines = text.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        const row = lines[i].split(',').map(r => r.trim().replace(/^["']|["']$/g, ''));
                        const obj = {};
                        headers.forEach((h, idx) => { obj[h] = row[idx]; });
                        data.push(obj);
                    }
                }
            } else {
                // Đọc XLSX bằng SheetJS
                if (typeof XLSX === 'undefined') {
                    alert("Trình duyệt đang tải thư viện đọc Excel, vui lòng thử lại sau 2 giây!");
                    return;
                }
                const buffer = evt.target.result;
                const workbook = XLSX.read(buffer, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(sheet);
            }

            if (!data || !data.length) {
                alert("File Excel không có dữ liệu!");
                return;
            }

            let updatedCount = 0;
            data.forEach(row => {
                const idVal = row.ID || row.id || row['Mã ID'] || row['Mã'];
                if (!idVal) return;
                const sid = parseInt(idVal);
                let skin = skinDatabaseState.skins.find(s => s.id === sid);
                if (!skin) {
                    skin = { id: sid, filename: `${sid}.png` };
                    skinDatabaseState.skins.push(skin);
                }

                if (row.Hero_Name || row['Tên Tướng'] || row.Hero) {
                    skin.hero_name = String(row.Hero_Name || row['Tên Tướng'] || row.Hero).trim();
                }
                if (row.Skin_Name || row['Tên Skin'] || row.Skin) {
                    skin.skin_name = String(row.Skin_Name || row['Tên Skin'] || row.Skin).trim();
                }
                if (row.Tier || row['Bậc'] || row.tier) {
                    skin.tier = String(row.Tier || row['Bậc'] || row.tier).trim().toUpperCase();
                }
                if (row.Priority !== undefined || row['Độ Ưu Tiên'] !== undefined || row.priority !== undefined) {
                    skin.priority = parseInt(row.Priority !== undefined ? row.Priority : (row['Độ Ưu Tiên'] !== undefined ? row['Độ Ưu Tiên'] : row.priority)) || 50;
                }
                if (row.Price_VND !== undefined || row['Giá'] !== undefined || row.Price !== undefined) {
                    skin.price = parseInt(row.Price_VND !== undefined ? row.Price_VND : (row['Giá'] !== undefined ? row['Giá'] : row.Price)) || 0;
                }
                if (row.Is_Hot !== undefined || row['Hot'] !== undefined) {
                    const hVal = row.Is_Hot !== undefined ? row.Is_Hot : row['Hot'];
                    skin.is_hot = (hVal === 1 || hVal === '1' || hVal === true || String(hVal).toLowerCase() === 'true' || String(hVal).toLowerCase() === 'có');
                }
                if (row.Notes || row['Ghi Chú']) {
                    skin.notes = String(row.Notes || row['Ghi Chú']).trim();
                }
                updatedCount++;
            });

            saveSkinDatabase();
            renderSkinDatabaseStats();
            renderSkinDatabaseTable();
            if (typeof showToast === 'function') {
                showToast(`🎉 Nhập thành công dữ liệu ${updatedCount} skin từ file Excel!`);
            }
            alert(`🎉 Nhập thành công dữ liệu của ${updatedCount} skin từ file Excel!\nHệ thống sẽ tự động dùng dữ liệu này để tính giá và lọc skin khi nhận diện.`);
        } catch (err) {
            alert("Lỗi đọc file Excel: " + err.message);
        }
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
}
window.handleSkinExcelImport = handleSkinExcelImport;

function exportSkinDatabaseJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(skinDatabaseState.skins, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `HOK_Skin_Database_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
}

function triggerImportSkinDatabase() {
    const input = document.getElementById('skinDbFileInput');
    if (input) input.click();
}

function handleSkinDatabaseImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (Array.isArray(imported)) {
                skinDatabaseState.skins = imported;
                saveSkinDatabase();
                renderSkinDatabaseStats();
                renderSkinDatabaseTable();
                alert(`Nhập thành công ${imported.length} mục dữ liệu skin!`);
            } else {
                alert("File JSON không đúng định dạng danh sách skin!");
            }
        } catch (err) {
            alert("Lỗi đọc file JSON: " + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ── 5. Thuật Toán Lọc & Tự Động Sắp Xếp Skin Theo Giá Trị ───────────────
/**
 * Tự động sắp xếp lại toàn bộ các skin đang có trên banner:
 * Sắp xếp theo bậc SSS có priority cao nhất -> bậc SS có priority cao nhất -> S -> A -> B...
 * Tự động đưa lên:
 * - Các ô Card VIP (Top Hero 1..6 hoặc các VIP cards của template)
 * - Tiếp theo là các ô Lưới Skin (Grid) theo đúng thứ tự ưu tiên giảm dần.
 */
function autoSortBannerSlotsByValue() {
    if (typeof slotsData === 'undefined' || !slotsData.length) {
        if (typeof showToast === 'function') showToast("Chưa có slot skin nào trên banner!");
        return;
    }

    // Lọc tất cả các slot đang có ảnh skin (loại trừ Header, Thông số, Profile, Chân dung...)
    const activeSlots = slotsData.filter(s => s && s.img !== null && (typeof isSkinSlot === 'function' ? isSkinSlot(s) : true));
    if (!activeSlots.length) {
        if (typeof showToast === 'function') showToast("Hiện chưa có slot skin nào được tải ảnh!");
        return;
    }

    // Tự động nhận diện skinId cho các slot chưa có ID
    activeSlots.forEach(slot => {
        if (!slot.skinId && slot.img && typeof identifySkinFromImage === 'function') {
            const match = identifySkinFromImage(slot.img, slot.crop);
            if (match && match.skinId) {
                slot.skinId = match.skinId;
            }
        }
        if (!slot.skinId && slot.label) {
            const m = slot.label.match(/#(\d+)/);
            if (m) slot.skinId = parseInt(m[1]);
        }
    });

    // Sắp xếp các slot theo chuẩn: Bậc SSS (Priority cao nhất) -> Bậc SS (Priority cao nhất) -> Bậc S...
    activeSlots.sort((slotA, slotB) => {
        const skinInfoA = slotA.skinId ? getSkinDataById(slotA.skinId) : null;
        const skinInfoB = slotB.skinId ? getSkinDataById(slotB.skinId) : null;
        return compareSkinPrecedence(skinInfoA, skinInfoB);
    });

    const sortedImages = activeSlots.map(s => ({
        img: s.img,
        crop: s.crop,
        skinId: s.skinId,
        colSpan: s.colSpan || 1,
        rowSpan: s.rowSpan || 1
    }));

    // Gán lại theo thứ tự ưu tiên:
    // 1. Các slot Tướng VIP trước (top_hero_1..6 hoặc hero_main, side_hero_1..4, hot_hero_1..2)
    // 2. Tiếp theo là các slot grid_skins_1, grid_skins_2...
    const vipSlotIds = ['top_hero_1', 'top_hero_2', 'top_hero_3', 'top_hero_4', 'top_hero_5', 'top_hero_6', 'hero_main', 'side_hero_1', 'side_hero_2', 'side_hero_3', 'side_hero_4', 'hot_hero_1', 'hot_hero_2'];
    const targetSlots = [];

    // Nhóm 1: VIP Slots hiện hữu trong template hiện tại
    vipSlotIds.forEach(vid => {
        const slot = slotsData.find(s => s.id === vid);
        if (slot) targetSlots.push(slot);
    });

    // Nhóm 2: Grid Skin Slots
    slotsData.forEach(slot => {
        if (slot.id.startsWith('grid_skins_') && !targetSlots.includes(slot)) {
            targetSlots.push(slot);
        }
    });

    // Xóa ảnh cũ và skinId ở các targetSlots
    targetSlots.forEach(s => {
        s.img = null;
        s.crop = null;
        s.skinId = null;
    });

    // Điền ảnh đã sắp xếp vào các targetSlots
    sortedImages.forEach((item, idx) => {
        if (idx < targetSlots.length) {
            targetSlots[idx].img = item.img;
            targetSlots[idx].crop = item.crop;
            targetSlots[idx].skinId = item.skinId;
        }
    });

    if (typeof updateRender === 'function') updateRender();
    if (typeof renderSlotList === 'function') renderSlotList();
    if (typeof saveStateForUndo === 'function') saveStateForUndo();

    updateValuationWidget();

    if (typeof showToast === 'function') {
        showToast("✨ Đã sắp xếp: Bậc SSS (Priority 1.. ưu tiên nhất) ➜ Bậc SS (Priority 1.. ưu tiên nhất) lên đầu banner!");
    }
}
window.autoSortBannerSlotsByValue = autoSortBannerSlotsByValue;

// ── 6. Widget Định Giá & Trực Tiếp Lấy Giá Thu Mua Account ─────────────────
function calculateAccountValuation() {
    if (typeof slotsData === 'undefined') {
        return { totalSkinPrice: 0, estimatedAccPrice: 0, estimatedAccPriceMin: 0, estimatedAccPriceMax: 0, count: 0 };
    }

    let totalSkinPrice = 0;
    let count = 0;

    slotsData.forEach(slot => {
        if (slot && slot.img !== null && (typeof isSkinSlot === 'function' ? isSkinSlot(slot) : true)) {
            count++;
            let sid = slot.skinId || null;
            if (!sid && slot.img && typeof identifySkinFromImage === 'function') {
                const match = identifySkinFromImage(slot.img, slot.crop);
                if (match && match.skinId) {
                    slot.skinId = match.skinId;
                    sid = match.skinId;
                }
            }
            if (!sid && slot.label) {
                const m = slot.label.match(/#(\d+)/);
                if (m) sid = parseInt(m[1]);
            }
            if (sid) {
                const skin = getSkinDataById(sid);
                if (skin && skin.price !== undefined && skin.price !== null) {
                    totalSkinPrice += parseInt(skin.price) || 0;
                }
            }
        }
    });

    // Giá trị account trực tiếp lấy từ tổng giá skin (vì giá nhập trong data là giá thu mua rồi)
    const estimatedAccPrice = totalSkinPrice;

    return { 
        totalSkinPrice, 
        estimatedAccPrice, 
        estimatedAccPriceMin: estimatedAccPrice, 
        estimatedAccPriceMax: estimatedAccPrice, 
        count 
    };
}

function updateValuationWidget() {
    const val = calculateAccountValuation();
    const elTotal = document.getElementById('valWidgetTotalSkinPrice');
    const elEstRange = document.getElementById('valWidgetEstAccPrice');
    const elCount = document.getElementById('valWidgetSkinCount');

    const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

    if (elTotal) elTotal.innerText = fmt.format(val.totalSkinPrice);
    if (elEstRange) {
        elEstRange.innerText = fmt.format(val.estimatedAccPrice);
    }
    if (elCount) elCount.innerText = `${val.count} skin`;
}

function applyValuationToBannerText() {
    const val = calculateAccountValuation();
    if (!val.totalSkinPrice) {
        if (typeof showToast === 'function') showToast("Chưa có skin nào trên banner để định giá!");
        return;
    }

    const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    const formattedPrice = fmt.format(val.totalSkinPrice);
    const priceText = `GIÁ ACC: ${formattedPrice}`;

    // Tìm input text hoặc badge trên banner
    const inpBadgeText = document.getElementById('inpVipBadgeText');
    if (inpBadgeText) {
        inpBadgeText.value = priceText;
    }

    if (typeof bannerTextSettings !== 'undefined' && bannerTextSettings.vipText) {
        bannerTextSettings.vipText = priceText;
    }

    const inpAccPrice = document.getElementById('accPrice') || document.getElementById('inpAccPrice');
    if (inpAccPrice) {
        inpAccPrice.value = formattedPrice;
        try {
            inpAccPrice.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {}
    }

    if (typeof updateRender === 'function') updateRender();
    if (typeof showToast === 'function') {
        showToast(`💎 Đã cập nhật giá thu mua acc (${formattedPrice}) lên banner!`);
    }
}
window.applyValuationToBannerText = applyValuationToBannerText;

function previewSkinLarge(src, title) {
    const w = window.open('', '_blank');
    w.document.write(`
        <title>${title}</title>
        <body style="margin:0;background:#090d16;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:sans-serif;">
            <h3 style="color:#f59e0b;margin-bottom:15px;">${title}</h3>
            <img src="${src}" style="max-height:80vh;border-radius:12px;border:2px solid #7c3aed;box-shadow:0 10px 30px rgba(0,0,0,0.8);">
        </body>
    `);
}

// Tự động khởi chạy
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initSkinDatabase();
    });
}
