/**
 * Batch Grid Splicer / Crop Tool with Interactive Mouse Drag-to-Select & Manual Controls
 */

let batchGridState = {
    img: null,
    cols: 6,
    rows: 1,
    targetStartSlotIndex: 1,
    // Crop box in canvas render coordinates
    cropBox: { x: 40, y: 30, width: 500, height: 260 },
    // Image rendering metrics
    imgRender: { x: 0, y: 0, width: 0, height: 0, scale: 1 },
    // Interaction state
    interactionMode: null, // 'move', 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'new'
    dragStartMouse: { x: 0, y: 0 },
    dragStartBox: { x: 0, y: 0, width: 0, height: 0 }
};

function findNextEmptySlotIndex(startFromIdx) {
    let idx = Math.max(1, startFromIdx || 1);
    while (idx < slotsData.length) {
        if (slotsData[idx] && slotsData[idx].img === null) {
            return idx;
        }
        idx++;
    }
    return -1;
}

function openBatchGridModal() {
    const modal = document.getElementById('batchGridModal');
    if (modal) modal.classList.remove('hidden');

    // Auto set target slot index to first empty slot if current targeted slot already has image
    const currentTarget = batchGridState.targetStartSlotIndex;
    if (!slotsData[currentTarget] || slotsData[currentTarget].img !== null) {
        const emptyIdx = findNextEmptySlotIndex(1);
        if (emptyIdx !== -1) {
            batchGridState.targetStartSlotIndex = emptyIdx;
        }
    }
    const inpTarget = document.getElementById('gridTargetStart');
    if (inpTarget) inpTarget.value = batchGridState.targetStartSlotIndex;

    setupBatchGridCanvasEvents();
    renderBatchGridCanvas();
}

function closeBatchGridModal() {
    const modal = document.getElementById('batchGridModal');
    if (modal) modal.classList.add('hidden');
}

function autoSetNextEmptySlot() {
    const emptyIdx = findNextEmptySlotIndex(1);
    if (emptyIdx !== -1) {
        batchGridState.targetStartSlotIndex = emptyIdx;
        const inpTarget = document.getElementById('gridTargetStart');
        if (inpTarget) inpTarget.value = emptyIdx;
        renderBatchGridCanvas();
        showToast(`Đã chọn Slot trống tiếp theo: Slot #${emptyIdx}`);
    } else {
        showToast("Tất cả các slot trong khung đều đã có ảnh!");
    }
}

function initBatchGridWithImage(img) {
    batchGridState.img = img;
    
    const canvas = document.getElementById('batchGridCanvas');
    const cw = canvas ? canvas.width : 580;
    const ch = canvas ? canvas.height : 340;

    const scale = Math.min(cw / img.width, ch / img.height);
    const renderW = img.width * scale;
    const renderH = img.height * scale;
    const renderX = (cw - renderW) / 2;
    const renderY = (ch - renderH) / 2;

    batchGridState.imgRender = { x: renderX, y: renderY, width: renderW, height: renderH, scale: scale };

    // Default crop box: X = 0%, Y = 0%, W = 100%, H = 100%
    batchGridState.cropBox = {
        x: renderX,
        y: renderY,
        width: renderW,
        height: renderH
    };

    syncInputsFromCropBox();
    renderBatchGridCanvas();
}
window.initBatchGridWithImage = initBatchGridWithImage;

function handleBatchGridUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            initBatchGridWithImage(img);
            showToast(`Đã nạp ảnh! Sẽ cắt & lấp vào từ Slot #${batchGridState.targetStartSlotIndex}`);
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function setGridPreset(cols, rows) {
    batchGridState.cols = cols;
    batchGridState.rows = rows;
    
    const inpCols = document.getElementById('gridCols');
    const inpRows = document.getElementById('gridRows');
    if (inpCols) inpCols.value = cols;
    if (inpRows) inpRows.value = rows;

    renderBatchGridCanvas();
}

function onGridParamChange() {
    const inpCols = document.getElementById('gridCols');
    const inpRows = document.getElementById('gridRows');
    const inpTarget = document.getElementById('gridTargetStart');

    if (inpCols) batchGridState.cols = Math.max(1, parseInt(inpCols.value) || 1);
    if (inpRows) batchGridState.rows = Math.max(1, parseInt(inpRows.value) || 1);
    if (inpTarget) batchGridState.targetStartSlotIndex = Math.max(1, parseInt(inpTarget.value) || 1);

    renderBatchGridCanvas();
}

// Sync slider/number inputs when cropBox changes from mouse dragging
function syncInputsFromCropBox() {
    const box = batchGridState.cropBox;
    const imgR = batchGridState.imgRender;

    // Normalize coordinates relative to image render area (0 to 100%)
    if (imgR.width > 0 && imgR.height > 0) {
        const relX = Math.max(0, Math.min(100, Math.round(((box.x - imgR.x) / imgR.width) * 100)));
        const relY = Math.max(0, Math.min(100, Math.round(((box.y - imgR.y) / imgR.height) * 100)));
        const relW = Math.max(1, Math.min(100 - relX, Math.round((box.width / imgR.width) * 100)));
        const relH = Math.max(1, Math.min(100 - relY, Math.round((box.height / imgR.height) * 100)));

        const inpX = document.getElementById('cropParamX');
        const inpY = document.getElementById('cropParamY');
        const inpW = document.getElementById('cropParamW');
        const inpH = document.getElementById('cropParamH');

        const valX = document.getElementById('cropValX');
        const valY = document.getElementById('cropValY');
        const valW = document.getElementById('cropValW');
        const valH = document.getElementById('cropValH');

        if (inpX) inpX.value = relX;
        if (inpY) inpY.value = relY;
        if (inpW) inpW.value = relW;
        if (inpH) inpH.value = relH;

        if (valX) valX.innerText = `${relX}%`;
        if (valY) valY.innerText = `${relY}%`;
        if (valW) valW.innerText = `${relW}%`;
        if (valH) valH.innerText = `${relH}%`;
    }
}

// Update cropBox directly from manual inputs/sliders
function updateCropBoxFromInputs() {
    const imgR = batchGridState.imgRender;
    if (!batchGridState.img || imgR.width === 0) return;

    const inpX = document.getElementById('cropParamX');
    const inpY = document.getElementById('cropParamY');
    const inpW = document.getElementById('cropParamW');
    const inpH = document.getElementById('cropParamH');

    const relX = inpX ? parseFloat(inpX.value) : 0;
    const relY = inpY ? parseFloat(inpY.value) : 0;
    const relW = inpW ? parseFloat(inpW.value) : 100;
    const relH = inpH ? parseFloat(inpH.value) : 100;

    batchGridState.cropBox = {
        x: imgR.x + (relX / 100) * imgR.width,
        y: imgR.y + (relY / 100) * imgR.height,
        width: (relW / 100) * imgR.width,
        height: (relH / 100) * imgR.height
    };

    const valX = document.getElementById('cropValX');
    const valY = document.getElementById('cropValY');
    const valW = document.getElementById('cropValW');
    const valH = document.getElementById('cropValH');

    if (valX) valX.innerText = `${relX}%`;
    if (valY) valY.innerText = `${relY}%`;
    if (valW) valW.innerText = `${relW}%`;
    if (valH) valH.innerText = `${relH}%`;

    renderBatchGridCanvas();
}

function resetDefaultCropDimensions() {
    const inpX = document.getElementById('cropParamX');
    const inpY = document.getElementById('cropParamY');
    const inpW = document.getElementById('cropParamW');
    const inpH = document.getElementById('cropParamH');

    if (inpX) inpX.value = 0;
    if (inpY) inpY.value = 0;
    if (inpW) inpW.value = 100;
    if (inpH) inpH.value = 100;

    const valX = document.getElementById('cropValX');
    const valY = document.getElementById('cropValY');
    const valW = document.getElementById('cropValW');
    const valH = document.getElementById('cropValH');

    if (valX) valX.innerText = '0%';
    if (valY) valY.innerText = '0%';
    if (valW) valW.innerText = '100%';
    if (valH) valH.innerText = '100%';

    const imgR = batchGridState.imgRender;
    if (imgR && imgR.width > 0) {
        batchGridState.cropBox = {
            x: imgR.x,
            y: imgR.y,
            width: imgR.width,
            height: imgR.height
        };
    }

    renderBatchGridCanvas();
    showToast("Đã khôi phục Kích thước mặc định (X: 0%, Y: 0%, W: 100%, H: 100%)!");
}

function setupBatchGridCanvasEvents() {
    const canvas = document.getElementById('batchGridCanvas');
    if (!canvas || canvas.dataset.eventsBound) return;

    canvas.dataset.eventsBound = "true";

    let isPointerDown = false;

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Scale factors if CSS display size differs from canvas pixel size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function detectHit(mX, mY) {
        const box = batchGridState.cropBox;
        const handleRadius = 16; // Click tolerance radius around handles

        const corners = {
            nw: { x: box.x, y: box.y },
            ne: { x: box.x + box.width, y: box.y },
            se: { x: box.x + box.width, y: box.y + box.height },
            sw: { x: box.x, y: box.y + box.height }
        };

        for (let key in corners) {
            if (Math.hypot(mX - corners[key].x, mY - corners[key].y) <= handleRadius) {
                return key;
            }
        }

        // Check if inside box for panning
        if (mX >= box.x && mX <= box.x + box.width && mY >= box.y && mY <= box.y + box.height) {
            return 'move';
        }

        return 'new';
    }

    canvas.addEventListener('mousedown', (e) => {
        if (!batchGridState.img) return;

        isPointerDown = true;
        const coords = getCanvasCoords(e);
        const mode = detectHit(coords.x, coords.y);

        batchGridState.interactionMode = mode;
        batchGridState.dragStartMouse = coords;
        batchGridState.dragStartBox = { ...batchGridState.cropBox };

        if (mode === 'new') {
            const imgR = batchGridState.imgRender;
            const clampedX = Math.max(imgR.x, Math.min(imgR.x + imgR.width, coords.x));
            const clampedY = Math.max(imgR.y, Math.min(imgR.y + imgR.height, coords.y));

            batchGridState.cropBox = { x: clampedX, y: clampedY, width: 10, height: 10 };
            batchGridState.dragStartBox = { ...batchGridState.cropBox };
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPointerDown || !batchGridState.interactionMode || !batchGridState.img) return;

        const coords = getCanvasCoords(e);
        const dx = coords.x - batchGridState.dragStartMouse.x;
        const dy = coords.y - batchGridState.dragStartMouse.y;
        const startBox = batchGridState.dragStartBox;
        const imgR = batchGridState.imgRender;

        let box = { ...batchGridState.cropBox };

        if (batchGridState.interactionMode === 'move') {
            box.x = Math.max(imgR.x, Math.min(imgR.x + imgR.width - startBox.width, startBox.x + dx));
            box.y = Math.max(imgR.y, Math.min(imgR.y + imgR.height - startBox.height, startBox.y + dy));
        } else if (batchGridState.interactionMode === 'new') {
            const x1 = batchGridState.dragStartMouse.x;
            const y1 = batchGridState.dragStartMouse.y;
            const x2 = coords.x;
            const y2 = coords.y;

            box.x = Math.max(imgR.x, Math.min(x1, x2));
            box.y = Math.max(imgR.y, Math.min(y1, y2));
            box.width = Math.min(imgR.x + imgR.width - box.x, Math.abs(x2 - x1));
            box.height = Math.min(imgR.y + imgR.height - box.y, Math.abs(y2 - y1));
        } else if (batchGridState.interactionMode === 'se') {
            box.width = Math.max(20, Math.min(imgR.x + imgR.width - startBox.x, startBox.width + dx));
            box.height = Math.max(20, Math.min(imgR.y + imgR.height - startBox.y, startBox.height + dy));
        } else if (batchGridState.interactionMode === 'nw') {
            const right = startBox.x + startBox.width;
            const bottom = startBox.y + startBox.height;
            box.x = Math.max(imgR.x, Math.min(right - 20, startBox.x + dx));
            box.y = Math.max(imgR.y, Math.min(bottom - 20, startBox.y + dy));
            box.width = right - box.x;
            box.height = bottom - box.y;
        } else if (batchGridState.interactionMode === 'ne') {
            const left = startBox.x;
            const bottom = startBox.y + startBox.height;
            box.y = Math.max(imgR.y, Math.min(bottom - 20, startBox.y + dy));
            box.width = Math.max(20, Math.min(imgR.x + imgR.width - left, startBox.width + dx));
            box.height = bottom - box.y;
        } else if (batchGridState.interactionMode === 'sw') {
            const right = startBox.x + startBox.width;
            const top = startBox.y;
            box.x = Math.max(imgR.x, Math.min(right - 20, startBox.x + dx));
            box.width = right - box.x;
            box.height = Math.max(20, Math.min(imgR.y + imgR.height - top, startBox.height + dy));
        }

        batchGridState.cropBox = box;
        syncInputsFromCropBox();
        renderBatchGridCanvas();
    });

    window.addEventListener('mouseup', () => {
        if (isPointerDown) {
            isPointerDown = false;
            batchGridState.interactionMode = null;
            syncInputsFromCropBox();
        }
    });
}

function renderBatchGridCanvas() {
    const canvas = document.getElementById('batchGridCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = 580;
    canvas.height = 340;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, cw, ch);

    const img = batchGridState.img;
    if (!img) {
        ctx.fillStyle = '#64748b';
        ctx.font = '600 13px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Vui lòng tải ảnh chụp màn hình game bên trên", cw / 2, ch / 2 - 10);
        ctx.font = '11px Roboto, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText("Sau đó dùng chuột kéo chọn hoặc chỉnh thanh trượt vị trí bên dưới", cw / 2, ch / 2 + 12);
        return;
    }

    const scale = Math.min(cw / img.width, ch / img.height);
    const renderW = img.width * scale;
    const renderH = img.height * scale;
    const renderX = (cw - renderW) / 2;
    const renderY = (ch - renderH) / 2;

    batchGridState.imgRender = { x: renderX, y: renderY, width: renderW, height: renderH, scale: scale };

    // 1. Draw main screenshot
    ctx.drawImage(img, renderX, renderY, renderW, renderH);

    // 2. Darken area outside cropBox
    const box = batchGridState.cropBox;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    // Top overlay
    ctx.fillRect(renderX, renderY, renderW, Math.max(0, box.y - renderY));
    // Bottom overlay
    const bottomY = box.y + box.height;
    ctx.fillRect(renderX, bottomY, renderW, Math.max(0, renderY + renderH - bottomY));
    // Left overlay
    ctx.fillRect(renderX, box.y, Math.max(0, box.x - renderX), box.height);
    // Right overlay
    const rightX = box.x + box.width;
    ctx.fillRect(rightX, box.y, Math.max(0, renderX + renderW - rightX), box.height);

    // 3. Draw cropBox glowing border
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();

    // 4. Draw Splicer Grid inside cropBox
    const cols = batchGridState.cols;
    const rows = batchGridState.rows;
    const cellW = box.width / cols;
    const cellH = box.height / rows;

    ctx.save();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const gx = box.x + c * cellW;
            const gy = box.y + r * cellH;

            ctx.strokeRect(gx, gy, cellW, cellH);

            // Cell number badge
            const cellIndex = r * cols + c + 1;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(gx + 2, gy + 2, 22, 16);
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 10px Montserrat, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`#${cellIndex}`, gx + 13, gy + 14);
        }
    }
    ctx.restore();

    // 5. Draw 4 Corner Handles
    const handles = [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height }
    ];

    handles.forEach(h => {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });
}

function executeBatchGridCrop() {
    const img = batchGridState.img;
    if (!img) {
        showToast("Vui lòng nạp ảnh chụp màn hình trước khi cắt!");
        return;
    }

    const box = batchGridState.cropBox;
    const imgR = batchGridState.imgRender;

    if (box.width < 10 || box.height < 10) {
        showToast("Vùng cắt quá nhỏ, hãy dùng chuột kéo chọn hoặc tăng kích thước!");
        return;
    }

    const scale = imgR.scale;
    const origCropX = Math.max(0, (box.x - imgR.x) / scale);
    const origCropY = Math.max(0, (box.y - imgR.y) / scale);
    const origCropW = Math.min(img.width - origCropX, box.width / scale);
    const origCropH = Math.min(img.height - origCropY, box.height / scale);

    const cols = batchGridState.cols;
    const rows = batchGridState.rows;
    const totalCells = cols * rows;

    const cellImgW = origCropW / cols;
    const cellImgH = origCropH / rows;

    let currentSlotSearch = batchGridState.targetStartSlotIndex;

    // Đảm bảo không giới hạn số lượng: Tự động mở rộng thêm số ô skin nếu số ô trống không đủ cho totalCells
    let countEmpty = 0;
    let checkIdx = Math.max(1, currentSlotSearch);
    while (checkIdx < slotsData.length) {
        if (slotsData[checkIdx] && slotsData[checkIdx].img === null) {
            countEmpty++;
        }
        checkIdx++;
    }

    if (countEmpty < totalCells && typeof updateSkinCount === 'function') {
        const neededMore = totalCells - countEmpty;
        const currentGridCount = slotsData.filter(s => s.id.startsWith('grid_skins_')).length;
        const newTotalSkinCount = currentGridCount + neededMore;
        updateSkinCount(newTotalSkinCount);
        const inpSkinCount = document.getElementById('inpSkinCount');
        if (inpSkinCount) inpSkinCount.value = newTotalSkinCount;
    }

    let targetSlotIndices = [];
    currentSlotSearch = batchGridState.targetStartSlotIndex;

    // Collect ONLY empty slot indices starting from currentSlotSearch
    for (let i = 0; i < totalCells; i++) {
        const emptySlotIdx = findNextEmptySlotIndex(currentSlotSearch);
        if (emptySlotIdx === -1) {
            break; // No more empty slots available
        }
        targetSlotIndices.push(emptySlotIdx);
        currentSlotSearch = emptySlotIdx + 1;
    }

    if (targetSlotIndices.length === 0) {
        showToast("Không tìm thấy ô trống nào! Tất cả các slot đều đã có ảnh.");
        return;
    }

    const actualCellCount = targetSlotIndices.length;
    let loadedCroppedCount = 0;

    for (let i = 0; i < actualCellCount; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const targetSlotIdx = targetSlotIndices[i];

        const srcX = origCropX + c * cellImgW;
        const srcY = origCropY + r * cellImgH;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = Math.max(1, cellImgW);
        offCanvas.height = Math.max(1, cellImgH);
        const offCtx = offCanvas.getContext('2d');

        offCtx.drawImage(img, srcX, srcY, cellImgW, cellImgH, 0, 0, cellImgW, cellImgH);

        const croppedDataUrl = offCanvas.toDataURL('image/png');
        const croppedImg = new Image();

        croppedImg.onload = (function(slotIdx) {
            return function() {
                slotsData[slotIdx].img = croppedImg;
                slotsData[slotIdx].scale = 1;
                slotsData[slotIdx].offsetX = 0;
                slotsData[slotIdx].offsetY = 0;

                loadedCroppedCount++;
                if (loadedCroppedCount === actualCellCount) {
                    renderSlotControls();
                    updateRender();

                    // Auto-advance target slot index to the next EMPTY slot
                    const lastInserted = targetSlotIndices[targetSlotIndices.length - 1];
                    const nextEmptyIdx = findNextEmptySlotIndex(lastInserted + 1);
                    
                    if (nextEmptyIdx !== -1) {
                        batchGridState.targetStartSlotIndex = nextEmptyIdx;
                    } else {
                        batchGridState.targetStartSlotIndex = slotsData.length - 1;
                    }

                    const inpTarget = document.getElementById('gridTargetStart');
                    if (inpTarget) inpTarget.value = batchGridState.targetStartSlotIndex;

                    // Clear current image so next upload starts fresh
                    batchGridState.img = null;

                    closeBatchGridModal();
                    if (window.saveHistoryState) saveHistoryState();
                    showToast(`Tuyệt vời! Đã lấp ${loadedCroppedCount} ảnh vào ô trống (bỏ qua ô đã có ảnh)! Slot trống tiếp: #${batchGridState.targetStartSlotIndex}`);
                }
            };
        })(targetSlotIdx);

        croppedImg.src = croppedDataUrl;
    }
}


async function pasteToBatchGrid() {
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
                            initBatchGridWithImage(img);
                            showToast("📋 Đã dán screenshot từ Clipboard vào Cắt Lưới!");
                        };
                        img.src = evt.target.result;
                    };
                    reader.readAsDataURL(blob);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                showToast("Chưa có ảnh trong Clipboard! Bấm Win+Shift+S rồi nhấn Ctrl+V.");
            }
        } else {
            showToast("Hãy nhấn Ctrl+V trên bàn phím để dán screenshot vào đây!");
        }
    } catch (err) {
        showToast("Bấm Ctrl+V trên bàn phím để dán screenshot vào đây!");
    }
}

// Nạp nhanh ảnh acc mẫu trong thư mục img
function loadDefaultAccToBatchGrid() {
    const samplePath = 'img/Screenshot 2026-10-19 183204.png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        initBatchGridWithImage(img);
        autoDetectAndSetGrid();
        showToast("🎯 Đã nạp ảnh acc mẫu và tự động căn chuẩn Hàng Skin không bị che khuất!");
    };
    img.onerror = function() {
        showToast("Không tìm thấy ảnh tại img/Screenshot 2026-10-19 183204.png!");
    };
    img.src = samplePath;
}
window.loadDefaultAccToBatchGrid = loadDefaultAccToBatchGrid;

// Tự động nhận diện và căn chuẩn hàng skin không bị che khuất trong Cắt Lưới
function autoDetectAndSetGrid() {
    if (!batchGridState.img) {
        loadDefaultAccToBatchGrid();
        return;
    }

    const img = batchGridState.img;
    const imgR = batchGridState.imgRender;
    if (!imgR || imgR.width === 0) return;

    // Nếu module autoDetect đã phân tích, lấy hàng chuẩn
    if (typeof autoDetectState !== 'undefined' && autoDetectState.detectedRows && autoDetectState.detectedRows.length) {
        const fullRow = autoDetectState.detectedRows[autoDetectState.selectedRowIdx] || autoDetectState.detectedRows.find(r => !r.isObscured);
        if (fullRow && fullRow.cards && fullRow.cards.length) {
            const minX = Math.min(...fullRow.cards.map(c => c.x));
            const maxX = Math.max(...fullRow.cards.map(c => c.x + c.width));
            const numCols = fullRow.cards.length;

            setGridPreset(numCols, 1);

            const scale = imgR.scale;
            batchGridState.cropBox = {
                x: imgR.x + minX * scale,
                y: imgR.y + fullRow.y * scale,
                width: (maxX - minX) * scale,
                height: fullRow.height * scale
            };
            syncInputsFromCropBox();
            renderBatchGridCanvas();
            showToast(`🎯 Đã tự động căn chuẩn Hàng #${fullRow.index} (${numCols} skin) không bị che khuất!`);
            return;
        }
    }

    // Tự động tính toán theo tỷ lệ chuẩn nếu chưa phân tích:
    // Hàng giữa: X: 371 -> 1394 (W: 1023), Y: 307 (H: 325) trên ảnh 1535x863
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;

    // Tỷ lệ cho ảnh màn hình HOK:
    const relX = 371 / 1535;
    const relY = 307 / 863;
    const relW = 1023 / 1535;
    const relH = 325 / 863;

    setGridPreset(4, 1);

    const scale = imgR.scale;
    batchGridState.cropBox = {
        x: imgR.x + (relX * W) * scale,
        y: imgR.y + (relY * H) * scale,
        width: (relW * W) * scale,
        height: (relH * H) * scale
    };

    syncInputsFromCropBox();
    renderBatchGridCanvas();
    showToast("🎯 Đã tự động căn chuẩn Hàng Skin không bị che khuất (4 skin, 1 hàng)!");
}
window.autoDetectAndSetGrid = autoDetectAndSetGrid;

