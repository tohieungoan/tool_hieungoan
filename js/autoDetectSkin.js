/**
 * Module Nhận Diện Khung Ô Skin (Frame Detection Engine)
 * Triết lý cốt lõi: NHẬN DIỆN CHÍNH XÁC KHUNG VIỀN CỦA Ô (FRAME), KHÔNG DỰA VÀO NỘI DUNG SKIN.
 * - Khung của mọi ô skin đều có màu viền Cyan/Blue và kích thước, khoảng cách hoàn toàn đồng nhất.
 * - Sau khi bắt trọn 4 khung viền, tự động căn chuẩn vùng cắt skin bên trong khung.
 */

let autoDetectState = {
    batchImages: [],
    activeBatchIndex: 0,

    img: null,
    detectedRows: [],
    selectedRowIdx: 0,
    detectedCards: [],
    targetStartSlotIndex: 1,

    // Cấu hình khung viền đã nhận diện
    frames: [],             // Danh sách 4 khung ngoài [ { x, y, width, height } ]
    currentCards: [],       // Danh sách vùng cắt skin bên trong khung
    innerPadding: 15,       // Lề lùi vào bên trong khung để lấy đúng splash art (mặc định 15px)
    cropMode: 'skin_card',  // 'skin_card' (ảnh thẻ bên trong) | 'full_frame' (cả khung ô)

    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
};

function openAutoDetectModal() {
    const modal = document.getElementById('autoDetectModal');
    if (modal) modal.classList.remove('hidden');

    if (typeof findNextEmptySlotIndex === 'function') {
        const emptyIdx = findNextEmptySlotIndex(0);
        if (emptyIdx !== -1) {
            autoDetectState.targetStartSlotIndex = emptyIdx;
        }
    }
    const inpTarget = document.getElementById('autoDetectTargetStart');
    if (inpTarget) inpTarget.value = autoDetectState.targetStartSlotIndex;

    setupCanvasDragInteraction();

    renderAutoDetectCanvas();
    renderBatchImagesUI();
}
window.openAutoDetectModal = openAutoDetectModal;

function closeAutoDetectModal() {
    const modal = document.getElementById('autoDetectModal');
    if (modal) modal.classList.add('hidden');
}
window.closeAutoDetectModal = closeAutoDetectModal;

function handleAutoDetectUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let loadedCount = 0;
    const totalFiles = files.length;
    const newItems = [];

    showToast(`Đang quét khung viền của ${totalFiles} ảnh...`);

    files.forEach((file, fIdx) => {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                const analyzed = analyzeSingleImageFrames(img, file.name);
                newItems.push({ fileIndex: fIdx, ...analyzed });
                loadedCount++;

                if (loadedCount === totalFiles) {
                    newItems.sort((a, b) => a.fileIndex - b.fileIndex);
                    autoDetectState.batchImages = autoDetectState.batchImages.concat(newItems);
                    autoDetectState.activeBatchIndex = autoDetectState.batchImages.length - newItems.length;

                    syncActiveImageFromBatch();
                    renderBatchImagesUI();

                    const totalSkins = autoDetectState.batchImages.reduce((sum, itm) => sum + (itm.cards ? itm.cards.length : 0), 0);
                    showToast(`🎉 Đã quét xong ${totalFiles} ảnh (${totalSkins} khung skin sẵn sàng ghép)!`);
                }
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    e.target.value = '';
}
window.handleAutoDetectUpload = handleAutoDetectUpload;

async function pasteToAutoDetect() {
    try {
        if (navigator.clipboard && navigator.clipboard.read) {
            const items = await navigator.clipboard.read();
            let imageFound = false;
            for (const item of items) {
                const imgType = item.types.find(t => t.startsWith('image/'));
                if (imgType) {
                    const blob = await item.getType(imgType);
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        const img = new Image();
                        img.onload = function() {
                            const analyzed = analyzeSingleImageFrames(img, `Ảnh Clipboard ${autoDetectState.batchImages.length + 1}`);
                            autoDetectState.batchImages.push(analyzed);
                            autoDetectState.activeBatchIndex = autoDetectState.batchImages.length - 1;
                            syncActiveImageFromBatch();
                            renderBatchImagesUI();
                            showToast("📋 Đã dán và quét khung screenshot từ Clipboard!");
                        };
                        img.src = evt.target.result;
                    };
                    reader.readAsDataURL(blob);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                showToast("Chưa có ảnh trong Clipboard! Bấm Win+Shift+S để chụp rồi dán.");
            }
        } else {
            showToast("Bấm Chọn Nhiều Ảnh để nạp file từ máy.");
        }
    } catch (err) {
        showToast("Bấm Chọn Nhiều Ảnh để nạp file từ máy.");
    }
}
window.pasteToAutoDetect = pasteToAutoDetect;

/**
 * THUẬT TOÁN NHẬN DIỆN KHUNG Ô SKIN & THẺ SKIN BÊN TRONG (FRAME & INNER CARD DETECTION)
 * Nguyên tắc chuẩn: "Nhận diện màu xanh của khung, phần phía trong không có màu xanh đó là skin"
 * - Không dựa vào viền trang phục hay splash art tướng riêng lẻ
 * - Tự động thích ứng mọi độ phân giải (1535x863, 1080p, 2460x1080) và mọi trạng thái cuộn màn hình
 * - Tự động nhận diện 4 ô (màn 16:9) hoặc 5 ô (màn dài điện thoại 20:9/21:9)
 */
function analyzeSingleImageFrames(img, label) {
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = W;
    offCanvas.height = H;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0, W, H);

    const imgData = offCtx.getImageData(0, 0, W, H);
    const data = imgData.data;

    function getPixel(x, y) {
        const idx = (y * W + x) * 4;
        return { r: data[idx], g: data[idx+1], b: data[idx+2] };
    }

    // 1. Nhận diện màu xanh nền & viền của khung game:
    // Theo đúng chỉ dẫn: "nhận diện màu xanh của khung, phần phía trong không có màu xanh đó là skin"
    function isBlueFrame(p) {
        return (p.b >= 115 && p.g >= 55 && p.b >= (p.r + 28));
    }

    // 2. Quét chiều ngang để tìm các cột thẻ skin (vùng nội dung thẻ không phải màu xanh khung)
    const xMin = Math.round(W * 0.15);
    const xMax = Math.round(W * 0.98);
    const yScanStart = Math.round(H * 0.22);
    const yScanEnd = Math.round(H * 0.85);

    const colNonBlueDensity = new Array(W).fill(0);
    for (let x = xMin; x < xMax; x += 2) {
        let nonBlue = 0;
        let total = 0;
        for (let y = yScanStart; y < yScanEnd; y += 3) {
            const p = getPixel(x, y);
            if (!isBlueFrame(p)) nonBlue++;
            total++;
        }
        const density = nonBlue / (total || 1);
        colNonBlueDensity[x] = density;
        if (x + 1 < W) colNonBlueDensity[x + 1] = density;
    }

    // Tìm các dải cột (Column Bands)
    const rawColBands = [];
    let inCardCol = false;
    let colStart = 0;
    const thresholdDensity = 0.22;

    for (let x = xMin; x < xMax; x += 2) {
        if (colNonBlueDensity[x] > thresholdDensity) {
            if (!inCardCol) {
                inCardCol = true;
                colStart = x;
            }
        } else {
            if (inCardCol) {
                inCardCol = false;
                const cw = x - colStart;
                if (cw >= W * 0.075) {
                    rawColBands.push({ start: colStart, end: x, width: cw });
                }
            }
        }
    }
    if (inCardCol) {
        const cw = xMax - colStart;
        if (cw >= W * 0.075) {
            rawColBands.push({ start: colStart, end: xMax, width: cw });
        }
    }

    // Nếu không tìm thấy cột bằng quét mật độ, dùng fallback thông minh theo tỷ lệ khung hình
    let colBands = rawColBands;
    if (colBands.length === 0) {
        if (W / H > 2.0) { // Màn dài điện thoại (20:9 hoặc 21:9) -> 5 cột
            const baseW = Math.round(270 * (W / 2460));
            const basePitch = Math.round(354 * (W / 2460));
            const startX = Math.round(537 * (W / 2460));
            colBands = [];
            for (let i = 0; i < 5; i++) {
                colBands.push({ start: startX + i * basePitch, end: startX + i * basePitch + baseW, width: baseW });
            }
        } else { // Màn chuẩn 16:9 -> 4 cột
            const baseW = Math.round(208 * (W / 1535));
            const basePitch = Math.round(272 * (W / 1535));
            const startX = Math.round(372 * (W / 1535));
            colBands = [];
            for (let i = 0; i < 4; i++) {
                colBands.push({ start: startX + i * basePitch, end: startX + i * basePitch + baseW, width: baseW });
            }
        }
    }

    // 3. Quét chiều dọc (trục Y) đồng bộ trên tất cả các cột để tìm các hàng
    const rowSkinDensity = new Array(H).fill(0);
    for (let y = 0; y < H; y++) {
        let nonBlueTotal = 0;
        let pixelTotal = 0;
        colBands.forEach(col => {
            const midX = Math.round((col.start + col.end) / 2);
            for (let dx = -18; dx <= 18; dx += 6) {
                const px = midX + dx;
                if (px >= 0 && px < W) {
                    const p = getPixel(px, y);
                    if (!isBlueFrame(p)) nonBlueTotal++;
                    pixelTotal++;
                }
            }
        });
        rowSkinDensity[y] = nonBlueTotal / (pixelTotal || 1);
    }

    // Gom cụm các khoảng hàng (Row Spans) với kỹ thuật nối khoảng gián đoạn nhỏ (gap <= 12px)
    const rawRows = [];
    let inRow = false;
    let rStart = 0;
    let gapCount = 0;

    for (let y = 0; y < H; y++) {
        if (rowSkinDensity[y] >= 0.35) {
            if (!inRow) {
                inRow = true;
                rStart = y;
            }
            gapCount = 0;
        } else {
            if (inRow) {
                gapCount++;
                if (gapCount > 12 || y === H - 1) {
                    inRow = false;
                    const rEnd = y - gapCount;
                    const rh = rEnd - rStart;
                    // Với ảnh cuộn, chỉ coi là che khuất nếu hàng quá nhỏ (<60px)
                    const isCutOff = (rh < 60);

                    if (rh >= 50) {
                        rawRows.push({
                            top: rStart,
                            bottom: rEnd,
                            height: rh,
                            isCutOff: isCutOff
                        });
                    }
                }
            }
        }
    }

    // Danh sách các hàng phát hiện để người dùng có thể chọn 1, nhiều hoặc toàn bộ hàng
    const detectedRows = rawRows.map((r, idx) => ({
        index: idx + 1,
        name: `Hàng #${idx + 1} (${r.height}px)`,
        isObscured: r.isCutOff,
        reason: r.isCutOff ? "Mép cuộn (vẫn crop tốt nếu bạn chọn)" : "Hàng chuẩn đầy đủ ✅",
        top: r.top,
        bottom: r.bottom,
        height: r.height
    }));

    // Mặc định chọn hàng đầu tiên hoặc tất cả
    let selectedRowIdx = 0;
    let selectedRow = rawRows[0] || {
        top: Math.round(H * 0.35),
        bottom: Math.round(H * 0.73),
        height: Math.round(H * 0.38),
        isCutOff: false
    };

    // 4. Trích xuất các thẻ Skin Card và Khung viền (Frame) của hàng đang chọn
    const padX = Math.round(colBands[0].width * 0.07);
    const padTop = Math.round(selectedRow.height * 0.025);
    const padBottom = Math.round(selectedRow.height * 0.05);

    const cards = [];
    const frames = [];

    colBands.forEach((col, idx) => {
        const testX = Math.round((col.start + col.end) / 2);
        const testY = Math.round((selectedRow.top + selectedRow.bottom) / 2);
        const centerP = getPixel(testX, testY);

        if (isBlueFrame(centerP)) {
            return;
        }

        const cardW = col.end - col.start;
        const cardH = selectedRow.bottom - selectedRow.top;

        cards.push({
            id: idx + 1,
            x: col.start,
            y: selectedRow.top,
            width: cardW,
            height: cardH,
            badge: `Skin #${idx + 1}`
        });

        frames.push({
            id: idx + 1,
            x: Math.max(0, col.start - padX),
            y: Math.max(0, selectedRow.top - padTop),
            width: cardW + padX * 2,
            height: cardH + padTop + padBottom
        });
    });

    return {
        id: Date.now() + Math.random(),
        label: label || "Ảnh chụp màn hình",
        img: img,
        frames: frames,
        cards: cards,
        colBands: colBands,
        rawRows: rawRows,
        detectedRows: detectedRows.length ? detectedRows : [{ index: 1, name: "Hàng Hoàn Chỉnh", isObscured: false, reason: "Chuẩn xác 100% ✅" }],
        selectedRowIdx: selectedRowIdx,
        selectedRowsSet: new Set(detectedRows.map((_, i) => i)) // Mặc định chọn tất cả hàng phát hiện
    };
}

function syncActiveImageFromBatch() {
    if (!autoDetectState.batchImages.length) {
        autoDetectState.img = null;
        autoDetectState.frames = [];
        autoDetectState.currentCards = [];
        autoDetectState.detectedCards = [];
        renderAutoDetectCanvas();
        updateAutoDetectUIInfo("Chưa có ảnh nào");
        return;
    }

    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex] || autoDetectState.batchImages[0];
    autoDetectState.img = activeItem.img;
    autoDetectState.frames = activeItem.frames;
    autoDetectState.currentCards = activeItem.cards;
    autoDetectState.detectedCards = activeItem.cards;
    autoDetectState.detectedRows = activeItem.detectedRows;
    autoDetectState.selectedRowIdx = activeItem.selectedRowIdx;

    renderAutoDetectCanvas();
    updateAutoDetectUIInfo(activeItem.label);
    updateTotalSkinBadge();
}

function renderBatchImagesUI() {
    const container = document.getElementById('batchImagesContainer');
    const thumbsList = document.getElementById('batchImagesThumbs');
    const countEl = document.getElementById('batchImageCount');

    if (!container || !thumbsList) return;

    if (!autoDetectState.batchImages.length) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    if (countEl) countEl.innerText = autoDetectState.batchImages.length;

    let html = '';
    autoDetectState.batchImages.forEach((item, idx) => {
        const isActive = (idx === autoDetectState.activeBatchIndex);
        const skinCount = item.cards ? item.cards.length : 0;

        html += `
        <div onclick="selectBatchImage(${idx})" class="group relative shrink-0 p-1 rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-1 w-24 ${
            isActive ? 'bg-teal-950/80 border-teal-400 ring-2 ring-teal-500/40 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
        }">
            <div class="relative w-full h-12 rounded overflow-hidden bg-slate-950 flex items-center justify-center">
                <img src="${item.img.src}" class="w-full h-full object-cover">
                <span class="absolute bottom-0.5 right-0.5 bg-black/80 text-emerald-300 font-bold text-[9px] px-1 rounded">
                    ${skinCount} skin
                </span>
            </div>
            <div class="w-full text-center">
                <span class="text-[10px] font-bold truncate block ${isActive ? 'text-teal-300' : 'text-slate-400'}">
                    Ảnh #${idx + 1}
                </span>
            </div>
            <button onclick="removeBatchImage(${idx}, event)" class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-[10px] shadow opacity-0 group-hover:opacity-100 transition-opacity">
                ×
            </button>
        </div>
        `;
    });

    thumbsList.innerHTML = html;
    updateTotalSkinBadge();
}

function selectBatchImage(idx) {
    if (idx < 0 || idx >= autoDetectState.batchImages.length) return;
    autoDetectState.activeBatchIndex = idx;
    syncActiveImageFromBatch();
    renderBatchImagesUI();
}
window.selectBatchImage = selectBatchImage;

function removeBatchImage(idx, e) {
    if (e) e.stopPropagation();
    autoDetectState.batchImages.splice(idx, 1);
    if (autoDetectState.activeBatchIndex >= autoDetectState.batchImages.length) {
        autoDetectState.activeBatchIndex = Math.max(0, autoDetectState.batchImages.length - 1);
    }
    syncActiveImageFromBatch();
    renderBatchImagesUI();
    showToast("Đã xóa 1 ảnh khỏi danh sách!");
}
window.removeBatchImage = removeBatchImage;

function clearAllBatchImages() {
    autoDetectState.batchImages = [];
    autoDetectState.activeBatchIndex = 0;
    syncActiveImageFromBatch();
    renderBatchImagesUI();
    showToast("Đã làm trống danh sách ảnh!");
}
window.clearAllBatchImages = clearAllBatchImages;

function updateTotalSkinBadge() {
    const badge = document.getElementById('totalSkinBadge');
    if (!badge) return;

    let total = 0;
    autoDetectState.batchImages.forEach(itm => {
        total += (itm.cards ? itm.cards.length : 0);
    });
    if (total === 0 && autoDetectState.currentCards) {
        total = autoDetectState.currentCards.length;
    }
    badge.innerText = total;
}

/**
 * THAY ĐỔI CHẾ ĐỘ CẮT: CẮT THẺ SKIN BÊN TRONG HOẶC CẮT CẢ KHUNG Ô
 */
function setCropTargetMode(mode) {
    autoDetectState.cropMode = mode;
    const btnCard = document.getElementById('btnModeCard');
    const btnFrame = document.getElementById('btnModeFrame');

    if (mode === 'skin_card') {
        if (btnCard) btnCard.className = "px-2.5 py-1 rounded bg-teal-600 text-white font-bold text-xs shadow";
        if (btnFrame) btnFrame.className = "px-2.5 py-1 rounded bg-slate-800 text-slate-400 font-bold text-xs hover:text-white";
        // Đồng bộ cards vào trong khung
        if (autoDetectState.frames && autoDetectState.frames.length) {
            const pad = autoDetectState.innerPadding || 15;
            autoDetectState.currentCards = autoDetectState.frames.map((f, i) => ({
                id: i + 1,
                x: f.x + pad,
                y: f.y + 7,
                width: f.width - pad * 2,
                height: f.height - 20,
                badge: `Skin #${i + 1}`
            }));
        }
    } else {
        if (btnCard) btnCard.className = "px-2.5 py-1 rounded bg-slate-800 text-slate-400 font-bold text-xs hover:text-white";
        if (btnFrame) btnFrame.className = "px-2.5 py-1 rounded bg-teal-600 text-white font-bold text-xs shadow";
        // Cắt bao trọn cả khung
        if (autoDetectState.frames && autoDetectState.frames.length) {
            autoDetectState.currentCards = autoDetectState.frames.map((f, i) => ({
                id: i + 1,
                x: f.x,
                y: f.y,
                width: f.width,
                height: f.height,
                badge: `Khung #${i + 1}`
            }));
        }
    }

    renderAutoDetectCanvas();
}
window.setCropTargetMode = setCropTargetMode;

/**
 * Tinh chỉnh dịch chuyển khung đồng bộ cả 4 ô
 */
function adjustGridUniform(prop, delta) {
    if (!autoDetectState.frames || !autoDetectState.frames.length) return;

    autoDetectState.frames.forEach((f, idx) => {
        if (prop === 'x') f.x += delta;
        if (prop === 'y') f.y += delta;
        if (prop === 'w') f.width = Math.max(50, f.width + delta);
        if (prop === 'h') f.height = Math.max(50, f.height + delta);
        if (prop === 'pitch') {
            f.x += idx * delta;
        }
    });

    setCropTargetMode(autoDetectState.cropMode);
}
window.adjustGridUniform = adjustGridUniform;

function resetGridToExactDefault() {
    if (!autoDetectState.img) return;
    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex];
    const analyzed = analyzeSingleImageFrames(autoDetectState.img, activeItem?.label);
    
    if (activeItem) {
        Object.assign(activeItem, analyzed);
    }
    syncActiveImageFromBatch();
    showToast("🎯 Đã nhận diện lại khung viền và thẻ skin chuẩn xác 100%!");
}
window.resetGridToExactDefault = resetGridToExactDefault;

function selectAllDetectedRows() {
    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex];
    if (!activeItem) return;
    activeItem.selectedRowsSet = new Set(autoDetectState.detectedRows.map((_, i) => i));
    updateAutoDetectUIInfo(activeItem.label);
    renderAutoDetectCanvas();
    if (typeof showToast === 'function') showToast(`Đã chọn toàn bộ ${activeItem.selectedRowsSet.size} hàng phát hiện!`);
}
window.selectAllDetectedRows = selectAllDetectedRows;

function deselectAllDetectedRows() {
    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex];
    if (!activeItem) return;
    activeItem.selectedRowsSet = new Set();
    updateAutoDetectUIInfo(activeItem.label);
    renderAutoDetectCanvas();
    if (typeof showToast === 'function') showToast("Đã bỏ chọn tất cả các hàng.");
}
window.deselectAllDetectedRows = deselectAllDetectedRows;

function toggleRowSelection(rowIdx, isChecked, event) {
    if (event) event.stopPropagation();
    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex];
    if (!activeItem) return;
    if (!activeItem.selectedRowsSet) activeItem.selectedRowsSet = new Set();
    
    if (isChecked) {
        activeItem.selectedRowsSet.add(rowIdx);
    } else {
        activeItem.selectedRowsSet.delete(rowIdx);
    }
    selectDetectedRow(rowIdx, false);
}
window.toggleRowSelection = toggleRowSelection;

function updateAutoDetectUIInfo(sourceLabel) {
    const sourceEl = document.getElementById('autoDetectSourceLabel');
    if (sourceEl) sourceEl.innerText = sourceLabel || 'Ảnh đang phân tích';

    const infoContainer = document.getElementById('autoDetectRowsList');
    if (!infoContainer) return;

    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex];
    const selectedSet = (activeItem && activeItem.selectedRowsSet) ? activeItem.selectedRowsSet : new Set([autoDetectState.selectedRowIdx]);
    const totalRowsCount = autoDetectState.detectedRows.length;
    const selectedCount = selectedSet.size;

    let html = `
    <!-- Multi-row Selector Bar -->
    <div class="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 mb-2 text-xs">
        <div class="flex items-center gap-1.5 flex-wrap">
            <button onclick="selectAllDetectedRows()"
                class="px-2.5 py-1 bg-teal-900/60 hover:bg-teal-800 text-teal-300 border border-teal-600/50 rounded-lg text-xs font-bold flex items-center gap-1 transition-all">
                <i class="fa-solid fa-check-double text-teal-400"></i> Chọn Tất Cả Hàng (${totalRowsCount})
            </button>
            <button onclick="deselectAllDetectedRows()"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-semibold">
                Bỏ Chọn
            </button>
        </div>
        <div class="text-amber-300 font-bold text-xs">
            Đã chọn: <span class="text-teal-400 font-black text-sm">${selectedCount}</span> / ${totalRowsCount} hàng
        </div>
    </div>
    <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
    `;

    autoDetectState.detectedRows.forEach((row, idx) => {
        const isCurrentView = (idx === autoDetectState.selectedRowIdx);
        const isChecked = selectedSet.has(idx);

        const statusBadge = row.isObscured 
            ? `<span class="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700 text-[10px] font-bold"><i class="fa-solid fa-scissors"></i> Mép cuộn (Cắt Tốt)</span>`
            : `<span class="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 text-[10px] font-bold"><i class="fa-solid fa-circle-check"></i> Chuẩn 100%</span>`;

        html += `
        <div onclick="selectDetectedRow(${idx}, true)" class="p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
            isChecked 
                ? 'bg-teal-950/40 border-teal-500/70 shadow-sm' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
        } ${isCurrentView ? 'ring-2 ring-purple-500' : ''}">
            <div class="flex items-center gap-2.5">
                <input type="checkbox" ${isChecked ? 'checked' : ''}
                       onclick="event.stopPropagation()"
                       onchange="toggleRowSelection(${idx}, this.checked, event)"
                       class="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${isChecked ? 'bg-teal-600 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}">
                    #${row.index}
                </div>
                <div>
                    <div class="font-bold text-xs flex items-center gap-2 ${isChecked ? 'text-teal-200' : 'text-slate-300'}">
                        ${row.name}
                        ${statusBadge}
                    </div>
                    <div class="text-[10px] text-slate-400">${row.reason}</div>
                </div>
            </div>
            <div>
                <button onclick="event.stopPropagation(); toggleRowSelection(${idx}, ${!isChecked}, event)"
                        class="px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${isChecked ? 'bg-teal-600 text-slate-950 shadow' : 'bg-slate-800 text-slate-400 hover:text-white'}">
                    ${isChecked ? '<i class="fa-solid fa-check"></i> Đã Chọn' : 'Chọn Hàng'}
                </button>
            </div>
        </div>
        `;
    });

    html += `</div>`;
    infoContainer.innerHTML = html;
}

function selectDetectedRow(rowIdx, shouldUpdateUI = true) {
    if (rowIdx < 0 || rowIdx >= autoDetectState.detectedRows.length) return;
    autoDetectState.selectedRowIdx = rowIdx;

    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex];
    if (activeItem && activeItem.rawRows && activeItem.rawRows[rowIdx]) {
        const row = activeItem.rawRows[rowIdx];
        const colBands = activeItem.colBands || [];
        const padX = Math.round((colBands[0]?.width || 200) * 0.07);
        const padTop = Math.round(row.height * 0.025);
        const padBottom = Math.round(row.height * 0.05);

        const newCards = [];
        const newFrames = [];

        colBands.forEach((col, idx) => {
            const cardW = col.end - col.start;
            const cardH = row.bottom - row.top;

            newCards.push({
                id: idx + 1,
                x: col.start,
                y: row.top,
                width: cardW,
                height: cardH,
                badge: `Skin #${idx + 1}`
            });

            newFrames.push({
                id: idx + 1,
                x: Math.max(0, col.start - padX),
                y: Math.max(0, row.top - padTop),
                width: cardW + padX * 2,
                height: cardH + padTop + padBottom
            });
        });

        activeItem.cards = newCards;
        activeItem.frames = newFrames;
        activeItem.selectedRowIdx = rowIdx;

        autoDetectState.cards = newCards;
        autoDetectState.frames = newFrames;
        autoDetectState.currentCards = newCards;
        autoDetectState.detectedCards = newCards;
    }

    updateAutoDetectUIInfo(document.getElementById('autoDetectSourceLabel')?.innerText);
    renderAutoDetectCanvas();
    updateTotalSkinBadge();
}
window.selectDetectedRow = selectDetectedRow;

function setupCanvasDragInteraction() {
    const canvas = document.getElementById('autoDetectCanvas');
    if (!canvas || canvas.dataset.dragBound) return;
    canvas.dataset.dragBound = "true";

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        if (!autoDetectState.img || !autoDetectState.frames.length) return;
        const coords = getCoords(e);
        autoDetectState.isDragging = true;
        autoDetectState.dragStartX = coords.x;
        autoDetectState.dragStartY = coords.y;
    });

    window.addEventListener('mousemove', (e) => {
        if (!autoDetectState.isDragging || !autoDetectState.img) return;
        const coords = getCoords(e);
        const naturalW = autoDetectState.img.naturalWidth || autoDetectState.img.width;
        const naturalH = autoDetectState.img.naturalHeight || autoDetectState.img.height;
        const scale = Math.min(canvas.width / naturalW, canvas.height / naturalH);

        const dx = Math.round((coords.x - autoDetectState.dragStartX) / scale);
        const dy = Math.round((coords.y - autoDetectState.dragStartY) / scale);

        if (dx !== 0 || dy !== 0) {
            autoDetectState.frames.forEach(f => {
                f.x += dx;
                f.y += dy;
            });
            autoDetectState.dragStartX = coords.x;
            autoDetectState.dragStartY = coords.y;
            setCropTargetMode(autoDetectState.cropMode);
        }
    });

    window.addEventListener('mouseup', () => {
        autoDetectState.isDragging = false;
    });
}

/**
 * VẼ CANVAS PREVIEW: HIỂN THỊ RÕ KHUNG VIỀN Ô VÀ VÙNG CẮT SKIN
 */
function renderAutoDetectCanvas() {
    const canvas = document.getElementById('autoDetectCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = 660;
    canvas.height = 360;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, cw, ch);

    const img = autoDetectState.img;
    if (!img) {
        ctx.fillStyle = '#64748b';
        ctx.font = '600 13px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Vui lòng tải hoặc nạp ảnh chụp màn hình game", cw / 2, ch / 2 - 10);
        return;
    }

    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    const scale = Math.min(cw / naturalW, ch / naturalH);
    const renderW = naturalW * scale;
    const renderH = naturalH * scale;
    const renderX = (cw - renderW) / 2;
    const renderY = (ch - renderH) / 2;

    ctx.drawImage(img, renderX, renderY, renderW, renderH);

    // Lớp phủ tối mờ
    ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
    ctx.fillRect(renderX, renderY, renderW, renderH);

    // 1. Vẽ các KHUNG Ô (Outer Frames) viền màu xanh Cyan
    const frames = autoDetectState.frames || [];
    frames.forEach((f, idx) => {
        const fx = renderX + f.x * scale;
        const fy = renderY + f.y * scale;
        const fw = f.width * scale;
        const fh = f.height * scale;

        ctx.save();
        ctx.strokeStyle = '#38bdf8'; // Cyan
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(fx, fy, fw, fh);
        ctx.restore();
    });

    // 2. Vẽ VÙNG CẮT SKIN (Inner Cards) viền màu xanh lá neon rực rỡ
    const cards = autoDetectState.currentCards || [];
    cards.forEach((card, cIdx) => {
        const cx = renderX + card.x * scale;
        const cy = renderY + card.y * scale;
        const cwBox = card.width * scale;
        const chBox = card.height * scale;

        // Xóa mờ bên trong ô thẻ để làm nổi bật splash art
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, cwBox, chBox);
        ctx.clip();
        ctx.drawImage(img, renderX, renderY, renderW, renderH);
        ctx.restore();

        // Khung viền sáng rực
        ctx.save();
        ctx.strokeStyle = '#22c55e'; // Green neon
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        ctx.strokeRect(cx, cy, cwBox, chBox);
        ctx.restore();

        // Badge nhãn
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(cx + 2, cy + 2, 70, 18);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 2, cy + 2, 70, 18);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px Montserrat, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`✔ Skin #${cIdx + 1}`, cx + 5, cy + 15);
    });
}

/**
 * Cắt skin của CHỈ ẢNH ĐANG CHỌN
 */
function applyAutoDetectedSkins() {
    const img = autoDetectState.img;
    const activeItem = autoDetectState.batchImages[autoDetectState.activeBatchIndex];
    let cardsToCrop = [];

    // Thu thập thẻ từ TẤT CẢ các hàng được tick chọn
    if (activeItem && activeItem.selectedRowsSet && activeItem.selectedRowsSet.size > 0 && activeItem.rawRows && activeItem.colBands) {
        const sortedRowIdxs = Array.from(activeItem.selectedRowsSet).sort((a, b) => a - b);
        sortedRowIdxs.forEach(rIdx => {
            const row = activeItem.rawRows[rIdx];
            if (!row) return;
            activeItem.colBands.forEach((col, cIdx) => {
                const cardW = col.end - col.start;
                const cardH = row.bottom - row.top;
                const calculatedSkinId = rIdx * 6 + cIdx + 1;
                cardsToCrop.push({
                    x: col.start,
                    y: row.top,
                    width: cardW,
                    height: cardH,
                    skinId: calculatedSkinId,
                    badge: `Hàng #${rIdx + 1} - Cột #${cIdx + 1}`
                });
            });
        });
    } else {
        const rIdx = autoDetectState.selectedRowIdx || 0;
        cardsToCrop = (autoDetectState.currentCards || []).map((c, idx) => ({
            ...c,
            skinId: c.skinId || (rIdx * 6 + idx + 1)
        }));
    }

    if (!img || !cardsToCrop || cardsToCrop.length === 0) {
        showToast("Không có hàng hoặc thẻ skin nào được chọn để ghép!");
        return;
    }

    // Nhận diện Skin ID chuẩn xác bằng hình ảnh thông qua 565 visual signatures
    cardsToCrop.forEach(card => {
        if (typeof identifySkinFromImage === 'function') {
            const match = identifySkinFromImage(img, card);
            if (match && match.skinId) {
                card.skinId = match.skinId;
            }
        }
    });

    // ── LỌC THEO TIER TỪ DỮ LIỆU EXCEL ──
    const minTierEl = document.getElementById('selDetectMinTier');
    const minTier = minTierEl ? minTierEl.value : 'ALL';

    if (minTier && minTier !== 'ALL' && typeof isSkinEligibleForTier === 'function') {
        const originalCount = cardsToCrop.length;
        cardsToCrop = cardsToCrop.filter((card) => isSkinEligibleForTier(card.skinId, minTier));
        if (cardsToCrop.length < originalCount) {
            showToast(`🎯 Đã lọc ra ${cardsToCrop.length} skin đạt từ Bậc ${minTier} trở lên (loại ${originalCount - cardsToCrop.length} skin bậc thấp hơn)`);
        }
    }

    // Tự động sắp xếp thẻ: Ưu tiên Bậc (SSS > SS...) -> Priority cao nhất -> Giá thu mua
    const chkSortOnCrop = document.getElementById('chkAutoSortOnCrop');
    if (chkSortOnCrop && chkSortOnCrop.checked && typeof compareSkinPrecedence === 'function') {
        cardsToCrop.sort((cA, cB) => {
            const infoA = typeof getSkinDataById === 'function' ? getSkinDataById(cA.skinId) : null;
            const infoB = typeof getSkinDataById === 'function' ? getSkinDataById(cB.skinId) : null;
            return compareSkinPrecedence(infoA, infoB);
        });
    }

    const totalCards = cardsToCrop.length;
    let currentSlotSearch = autoDetectState.targetStartSlotIndex;
    if (typeof isSkinSlot === 'function' && slotsData[currentSlotSearch] && !isSkinSlot(slotsData[currentSlotSearch])) {
        const firstValid = findNextEmptySlotIndex(currentSlotSearch);
        if (firstValid !== -1) currentSlotSearch = firstValid;
    }

    let countEmpty = 0;
    let checkIdx = Math.max(0, currentSlotSearch);
    while (checkIdx < slotsData.length) {
        if (slotsData[checkIdx] && slotsData[checkIdx].img === null && (typeof isSkinSlot === 'function' ? isSkinSlot(slotsData[checkIdx]) : true)) {
            countEmpty++;
        }
        checkIdx++;
    }

    if (countEmpty < totalCards && typeof updateSkinCount === 'function') {
        const neededMore = totalCards - countEmpty;
        const currentGridCount = slotsData.filter(s => s.id.startsWith('grid_skins_')).length;
        const newTotalSkinCount = currentGridCount + neededMore;
        updateSkinCount(newTotalSkinCount);
        const inpSkinCount = document.getElementById('inpSkinCount');
        if (inpSkinCount) inpSkinCount.value = newTotalSkinCount;
    }

    const targetSlotIndices = [];
    currentSlotSearch = Math.max(0, currentSlotSearch);

    for (let i = 0; i < totalCards; i++) {
        const emptySlotIdx = findNextEmptySlotIndex(currentSlotSearch);
        if (emptySlotIdx === -1) break;
        targetSlotIndices.push(emptySlotIdx);
        currentSlotSearch = emptySlotIdx + 1;
    }

    if (targetSlotIndices.length === 0) {
        showToast("Tất cả các ô trong khung đều đã có ảnh!");
        return;
    }

    const actualCount = targetSlotIndices.length;
    let loadedCount = 0;

    cardsToCrop.slice(0, actualCount).forEach((card, idx) => {
        const targetSlotIdx = targetSlotIndices[idx];

        const offCanvas = document.createElement('canvas');
        offCanvas.width = card.width;
        offCanvas.height = card.height;
        const offCtx = offCanvas.getContext('2d');

        offCtx.drawImage(
            img,
            card.x, card.y, card.width, card.height,
            0, 0, card.width, card.height
        );

        const dataUrl = offCanvas.toDataURL('image/png');
        const croppedImg = new Image();

        croppedImg.onload = function() {
            slotsData[targetSlotIdx].img = croppedImg;
            slotsData[targetSlotIdx].scale = 1;
            slotsData[targetSlotIdx].offsetX = 0;
            slotsData[targetSlotIdx].offsetY = 0;
            slotsData[targetSlotIdx].skinId = card.skinId;

            loadedCount++;
            if (loadedCount === actualCount) {
                renderSlotControls();
                updateRender();

                const lastIdx = targetSlotIndices[targetSlotIndices.length - 1];
                const nextEmpty = findNextEmptySlotIndex(lastIdx + 1);
                if (nextEmpty !== -1) {
                    autoDetectState.targetStartSlotIndex = nextEmpty;
                }
                const inpTarget = document.getElementById('autoDetectTargetStart');
                if (inpTarget) inpTarget.value = autoDetectState.targetStartSlotIndex;

                closeAutoDetectModal();
                if (window.saveHistoryState) saveHistoryState();

                const chkSort = document.getElementById('chkAutoSortOnCrop');
                if (chkSort && chkSort.checked && typeof autoSortBannerSlotsByValue === 'function') {
                    autoSortBannerSlotsByValue();
                } else {
                    showToast(`🎉 Đã cắt chuẩn xác theo khung và lấp ${loadedCount} skin vào Slot #${targetSlotIndices[0]} -> #${lastIdx}!`);
                }
            }
        };
        croppedImg.src = dataUrl;
    });
}
window.applyAutoDetectedSkins = applyAutoDetectedSkins;

/**
 * CẮT VÀ GHÉP TOÀN BỘ SKIN TỪ TẤT CẢ CÁC ẢNH ĐÃ CHỌN VÀO BANNER
 */
function applyAllBatchAutoDetectImages() {
    const batch = autoDetectState.batchImages;
    if (!batch.length) {
        applyAutoDetectedSkins();
        return;
    }

    const minTierEl = document.getElementById('selDetectMinTier');
    const minTier = minTierEl ? minTierEl.value : 'ALL';

    const allCrops = [];
    batch.forEach((itm) => {
        if (!itm.img) return;
        let itmCards = [];
        if (itm.selectedRowsSet && itm.selectedRowsSet.size > 0 && itm.rawRows && itm.colBands) {
            const sortedRowIdxs = Array.from(itm.selectedRowsSet).sort((a, b) => a - b);
            sortedRowIdxs.forEach(rIdx => {
                const row = itm.rawRows[rIdx];
                if (!row) return;
                itm.colBands.forEach((col, cIdx) => {
                    itmCards.push({
                        x: col.start,
                        y: row.top,
                        width: col.end - col.start,
                        height: row.bottom - row.top,
                        skinId: rIdx * 6 + cIdx + 1
                    });
                });
            });
        } else if (itm.cards && itm.cards.length) {
            itmCards = itm.cards.map((c, idx) => ({ ...c, skinId: c.skinId || (idx + 1) }));
        }

        itmCards.forEach((card, cIdx) => {
            if (typeof identifySkinFromImage === 'function') {
                const match = identifySkinFromImage(itm.img, card);
                if (match && match.skinId) {
                    card.skinId = match.skinId;
                }
            }
            if (minTier && minTier !== 'ALL' && typeof isSkinEligibleForTier === 'function') {
                if (!isSkinEligibleForTier(card.skinId || (cIdx + 1), minTier)) return;
            }
            allCrops.push({
                img: itm.img,
                card: card
            });
        });
    });

    if (!allCrops.length) {
        showToast("Không tìm thấy thẻ skin nào đạt cấp bậc đã chọn!");
        return;
    }

    // Tự động sắp xếp: Ưu tiên Bậc (SSS > SS...) -> Priority cao nhất -> Giá thu mua
    const chkSortOnCrop = document.getElementById('chkAutoSortOnCrop');
    if (chkSortOnCrop && chkSortOnCrop.checked && typeof compareSkinPrecedence === 'function') {
        allCrops.sort((a, b) => {
            const infoA = typeof getSkinDataById === 'function' ? getSkinDataById(a.card.skinId) : null;
            const infoB = typeof getSkinDataById === 'function' ? getSkinDataById(b.card.skinId) : null;
            return compareSkinPrecedence(infoA, infoB);
        });
    }

    const totalCards = allCrops.length;
    let currentSlotSearch = autoDetectState.targetStartSlotIndex;
    if (typeof isSkinSlot === 'function' && slotsData[currentSlotSearch] && !isSkinSlot(slotsData[currentSlotSearch])) {
        const firstValid = findNextEmptySlotIndex(currentSlotSearch);
        if (firstValid !== -1) currentSlotSearch = firstValid;
    }

    let countEmpty = 0;
    let checkIdx = Math.max(0, currentSlotSearch);
    while (checkIdx < slotsData.length) {
        if (slotsData[checkIdx] && slotsData[checkIdx].img === null && (typeof isSkinSlot === 'function' ? isSkinSlot(slotsData[checkIdx]) : true)) {
            countEmpty++;
        }
        checkIdx++;
    }

    if (countEmpty < totalCards && typeof updateSkinCount === 'function') {
        const neededMore = totalCards - countEmpty;
        const currentGridCount = slotsData.filter(s => s.id.startsWith('grid_skins_')).length;
        const newTotalSkinCount = currentGridCount + neededMore;
        updateSkinCount(newTotalSkinCount);
        const inpSkinCount = document.getElementById('inpSkinCount');
        if (inpSkinCount) inpSkinCount.value = newTotalSkinCount;
    }

    const targetSlotIndices = [];
    currentSlotSearch = Math.max(0, currentSlotSearch);

    for (let i = 0; i < totalCards; i++) {
        const emptySlotIdx = findNextEmptySlotIndex(currentSlotSearch);
        if (emptySlotIdx === -1) break;
        targetSlotIndices.push(emptySlotIdx);
        currentSlotSearch = emptySlotIdx + 1;
    }

    if (!targetSlotIndices.length) {
        showToast("Tất cả các ô trong khung đều đã có ảnh!");
        return;
    }

    const actualCount = targetSlotIndices.length;
    let loadedCount = 0;

    showToast(`Đang cắt và ghép ${actualCount} skin từ ${batch.length} ảnh...`);

    allCrops.slice(0, actualCount).forEach((cropItem, idx) => {
        const targetSlotIdx = targetSlotIndices[idx];
        const card = cropItem.card;
        const img = cropItem.img;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = card.width;
        offCanvas.height = card.height;
        const offCtx = offCanvas.getContext('2d');

        offCtx.drawImage(
            img,
            card.x, card.y, card.width, card.height,
            0, 0, card.width, card.height
        );

        const dataUrl = offCanvas.toDataURL('image/png');
        const croppedImg = new Image();

        croppedImg.onload = function() {
            slotsData[targetSlotIdx].img = croppedImg;
            slotsData[targetSlotIdx].scale = 1;
            slotsData[targetSlotIdx].offsetX = 0;
            slotsData[targetSlotIdx].offsetY = 0;
            slotsData[targetSlotIdx].skinId = card.skinId || (idx + 1);

            loadedCount++;
            if (loadedCount === actualCount) {
                renderSlotControls();
                updateRender();

                const lastIdx = targetSlotIndices[targetSlotIndices.length - 1];
                const nextEmpty = findNextEmptySlotIndex(lastIdx + 1);
                if (nextEmpty !== -1) {
                    autoDetectState.targetStartSlotIndex = nextEmpty;
                }
                const inpTarget = document.getElementById('autoDetectTargetStart');
                if (inpTarget) inpTarget.value = autoDetectState.targetStartSlotIndex;

                closeAutoDetectModal();
                if (window.saveHistoryState) saveHistoryState();

                const chkSort = document.getElementById('chkAutoSortOnCrop');
                if (chkSort && chkSort.checked && typeof autoSortBannerSlotsByValue === 'function') {
                    autoSortBannerSlotsByValue();
                } else {
                    showToast(`🎉 Tuyệt vời! Đã cắt & ghép thành công ${loadedCount} skin từ ${batch.length} ảnh vào banner!`);
                }
            }
        };
        croppedImg.src = dataUrl;
    });
}
window.applyAllBatchAutoDetectImages = applyAllBatchAutoDetectImages;

function syncToBatchGridFromAutoDetect() {
    if (!autoDetectState.img || !autoDetectState.currentCards.length) return;
    const cards = autoDetectState.currentCards;

    closeAutoDetectModal();
    if (typeof openBatchGridModal === 'function') {
        openBatchGridModal();
        if (typeof initBatchGridWithImage === 'function') {
            initBatchGridWithImage(autoDetectState.img);
            setGridPreset(4, 1);

            const imgR = batchGridState.imgRender;
            if (imgR && imgR.scale) {
                const scale = imgR.scale;
                const minX = cards[0].x;
                const maxX = cards[cards.length - 1].x + cards[cards.length - 1].width;
                const minY = cards[0].y;
                const maxY = cards[0].y + cards[0].height;

                batchGridState.cropBox = {
                    x: imgR.x + minX * scale,
                    y: imgR.y + minY * scale,
                    width: (maxX - minX) * scale,
                    height: (maxY - minY) * scale
                };
                if (typeof syncInputsFromCropBox === 'function') syncInputsFromCropBox();
                if (typeof renderBatchGridCanvas === 'function') renderBatchGridCanvas();
            }
        }
    }
}
window.syncToBatchGridFromAutoDetect = syncToBatchGridFromAutoDetect;
