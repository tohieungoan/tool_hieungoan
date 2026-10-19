/**
 * Main Application Logic & Event Controllers
 * Includes: Overlay System, Frame System, Badge/Text Controls, 3D Breakthrough Flag
 */

let currentTemplate = 'full_vip_6cards';
let canvasZoomFactor = 1;
let slotsData = [];

// --- New State Objects ---
let overlayElements = [];  // Free-form image/text overlays
let overlayIdCounter = 1;

let frameSettings = {
    topCards: {
        enabled: true,
        style: 'simple_neon',  // simple_neon | gold_royal | cyberpunk | diamond | rainbow
        color: '#f472b6'
    },
    gridSkins: {
        enabled: true,
        style: 'simple_neon',
        color: '#a855f7',
        width: 3,
        gap: 3
    }
};

let badgeSettings = {
    showVipBadge: true,
    vipTier: 8,
    vipBadgeSize: 65,
    x: 50,
    y: 4.2,
    breakthrough: false   // 3D breakthrough for hero slot 6
};

// Pre-load sẵn 10 Huy Hiệu VIP Transparent
const vipBadgeCache = {};
for (let i = 1; i <= 10; i++) {
    const numStr = i < 10 ? `0${i}` : `${i}`;
    const img = new Image();
    img.src = `vip_badge/HuyHieu_VIP_${numStr}_Transparent.png`;
    img.onload = () => { if (typeof updateRender === 'function') updateRender(); };
    vipBadgeCache[i] = img;
}
window.vipBadgeCache = vipBadgeCache;

// --- UNDO / REDO HISTORY SYSTEM ---
let historyStack = [];
let redoStack = [];
let maxHistoryLength = 30;
let isRestoringHistory = false;

function saveHistoryState() {
    if (isRestoringHistory) return;

    const snapshot = {
        template: currentTemplate,
        frameSettings: JSON.parse(JSON.stringify(frameSettings)),
        badgeSettings: JSON.parse(JSON.stringify(badgeSettings)),
        slotsData: slotsData.map(s => ({
            id: s.id,
            label: s.label,
            scale: s.scale,
            rotate: s.rotate,
            offsetX: s.offsetX,
            offsetY: s.offsetY,
            tag: s.tag,
            breakthrough: s.breakthrough, colSpan: s.colSpan || 1, rowSpan: s.rowSpan || 1,
            imgSrc: s.img ? s.img.src : null
        })),
        overlayElements: overlayElements.map(o => ({
            ...o,
            imgSrc: o.img ? o.img.src : null,
            img: undefined
        }))
    };

    historyStack.push(snapshot);
    if (historyStack.length > maxHistoryLength) {
        historyStack.shift();
    }
    redoStack = [];
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const btnsUndo = document.querySelectorAll('.btn-action-undo');
    const btnsRedo = document.querySelectorAll('.btn-action-redo');

    const canUndo = historyStack.length > 1;
    const canRedo = redoStack.length > 0;

    btnsUndo.forEach(b => {
        if (canUndo) {
            b.removeAttribute('disabled');
            b.classList.remove('opacity-40', 'cursor-not-allowed');
        } else {
            b.setAttribute('disabled', 'true');
            b.classList.add('opacity-40', 'cursor-not-allowed');
        }
    });

    btnsRedo.forEach(b => {
        if (canRedo) {
            b.removeAttribute('disabled');
            b.classList.remove('opacity-40', 'cursor-not-allowed');
        } else {
            b.setAttribute('disabled', 'true');
            b.classList.add('opacity-40', 'cursor-not-allowed');
        }
    });
}

function undo() {
    if (historyStack.length <= 1) {
        showToast("Không có thao tác nào để Hoàn tác (Undo)!");
        return;
    }
    const current = historyStack.pop();
    redoStack.push(current);
    const prevSnapshot = historyStack[historyStack.length - 1];
    restoreStateFromSnapshot(prevSnapshot);
    showToast("Đã Hoàn tác (Undo)!");
}

function redo() {
    if (redoStack.length === 0) {
        showToast("Không có thao tác nào để Làm lại (Redo)!");
        return;
    }
    const nextSnapshot = redoStack.pop();
    historyStack.push(nextSnapshot);
    restoreStateFromSnapshot(nextSnapshot);
    showToast("Đã Làm lại (Redo - Ctrl+Y)!");
}

function restoreStateFromSnapshot(snapshot) {
    isRestoringHistory = true;

    currentTemplate = snapshot.template;
    frameSettings = JSON.parse(JSON.stringify(snapshot.frameSettings));
    badgeSettings = JSON.parse(JSON.stringify(snapshot.badgeSettings || {}));
    if (badgeSettings.showVipBadge === undefined) badgeSettings.showVipBadge = true;
    if (badgeSettings.vipTier === undefined) badgeSettings.vipTier = 8;
    if (badgeSettings.vipBadgeSize === undefined) badgeSettings.vipBadgeSize = 65;
    if (badgeSettings.x === undefined) badgeSettings.x = 50;
    if (badgeSettings.y === undefined) badgeSettings.y = 4.2;

    // Update form controls
    const chkBadge = document.getElementById('chkShowVipBadge');
    const selTier  = document.getElementById('selVipTier');
    const rngSize  = document.getElementById('rngVipBadgeSize');
    const valSize  = document.getElementById('valVipBadgeSize');
    const rngX     = document.getElementById('rngVipBadgeX');
    const valX     = document.getElementById('valVipBadgeX');
    const rngY     = document.getElementById('rngVipBadgeY');
    const valY     = document.getElementById('valVipBadgeY');
    const previewImg = document.getElementById('vipBadgePreviewImg');
    const badgeLabel = document.getElementById('valVipTierBadge');

    if (chkBadge) chkBadge.checked = !!badgeSettings.showVipBadge;
    if (selTier && badgeSettings.vipTier) selTier.value = badgeSettings.vipTier;
    if (rngSize && badgeSettings.vipBadgeSize) {
        rngSize.value = badgeSettings.vipBadgeSize;
        if (valSize) valSize.innerText = `${badgeSettings.vipBadgeSize}px`;
    }
    if (rngX && badgeSettings.x !== undefined) {
        rngX.value = badgeSettings.x;
        if (valX) valX.innerText = `${badgeSettings.x}%${Math.abs(badgeSettings.x - 50) < 0.3 ? ' (Giữa)' : ''}`;
    }
    if (rngY && badgeSettings.y !== undefined) {
        rngY.value = badgeSettings.y;
        if (valY) valY.innerText = `${badgeSettings.y}%`;
    }
    if (previewImg && badgeSettings.vipTier) {
        const numStr = badgeSettings.vipTier < 10 ? `0${badgeSettings.vipTier}` : `${badgeSettings.vipTier}`;
        previewImg.src = `vip_badge/HuyHieu_VIP_${numStr}_Transparent.png`;
    }
    if (badgeLabel && badgeSettings.vipTier) {
        const tierNames = {
            1: 'VIP 1', 2: 'VIP 2', 3: 'VIP 3', 4: 'VIP 4', 5: 'VIP 5',
            6: 'VIP 6', 7: 'VIP 7', 8: 'VIP 8 (Hoàng Kim)', 9: 'VIP 9 (Huyền Thoại)', 10: 'VIP 10 (Chí Tôn Tối Thượng)'
        };
        badgeLabel.innerText = tierNames[badgeSettings.vipTier] || `VIP ${badgeSettings.vipTier}`;
    }

    const chkTopCards  = document.getElementById('chkFrameTopCards');
    const selTopStyle  = document.getElementById('selFrameTopStyle');
    const clrTopColor  = document.getElementById('clrFrameTopColor');
    const chkGridSkins = document.getElementById('chkFrameGridSkins');
    const selGridStyle = document.getElementById('selFrameGridStyle');
    const clrGridColor = document.getElementById('clrFrameGridColor');

    if (chkTopCards)  chkTopCards.checked  = frameSettings.topCards.enabled;
    if (selTopStyle)  selTopStyle.value    = frameSettings.topCards.style;
    if (clrTopColor)  clrTopColor.value    = frameSettings.topCards.color;
    if (chkGridSkins) chkGridSkins.checked = frameSettings.gridSkins.enabled;
    if (selGridStyle) selGridStyle.value   = frameSettings.gridSkins.style;
    if (clrGridColor) clrGridColor.value   = frameSettings.gridSkins.color;
    const rngGridWidth = document.getElementById('rngFrameGridWidth');
    const valGridWidth = document.getElementById('valFrameGridWidth');
    if (rngGridWidth && frameSettings.gridSkins.width !== undefined) {
        rngGridWidth.value = frameSettings.gridSkins.width;
        if (valGridWidth) valGridWidth.innerText = `${frameSettings.gridSkins.width}px`;
    }
    const rngGridGap = document.getElementById('rngFrameGridGap');
    const valGridGap = document.getElementById('valFrameGridGap');
    if (rngGridGap && frameSettings.gridSkins.gap !== undefined) {
        rngGridGap.value = frameSettings.gridSkins.gap;
        if (valGridGap) valGridGap.innerText = `${frameSettings.gridSkins.gap}px`;
    }

    // Restore slotsData
    slotsData = snapshot.slotsData.map(s => {
        const item = {
            id: s.id, label: s.label, scale: s.scale, rotate: s.rotate,
            offsetX: s.offsetX, offsetY: s.offsetY, tag: s.tag,
            breakthrough: s.breakthrough, colSpan: s.colSpan || 1, rowSpan: s.rowSpan || 1, img: null
        };
        if (s.imgSrc) {
            const img = new Image();
            img.onload = () => { updateRender(); };
            img.src = s.imgSrc;
            item.img = img;
        }
        return item;
    });

    // Restore overlayElements
    overlayElements = snapshot.overlayElements.map(o => {
        const item = { ...o };
        if (o.type === 'image' && o.imgSrc) {
            const img = new Image();
            img.onload = () => { updateRender(); };
            img.src = o.imgSrc;
            item.img = img;
        }
        return item;
    });

    renderSlotControls();
    renderOverlayControls();
    updateRender();
    updateUndoRedoButtons();

    isRestoringHistory = false;
}

// Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
window.addEventListener('keydown', function(e) {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if (isInput) return;

    if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
            e.preventDefault();
            redo();
        }
    }
});

window.onload = function() {
    initTemplate('full_vip_6cards');
    setupCropCanvasInteraction();
    if (typeof setupCanvasOverlayInteractions === 'function') {
        setupCanvasOverlayInteractions();
    }
    generateAntigravityPrompt();
    renderOverlayControls();
    const restored = loadProjectFromLocalStorage();
    if (!restored) {
        saveHistoryState();
    }
};

function switchTab(tab) {
    const secStudio = document.getElementById('sectionStudio');
    const secAnti = document.getElementById('sectionAntigravity');
    const btnStudio = document.getElementById('btnTabStudio');
    const btnAnti = document.getElementById('btnTabAntigravity');

    if (!secStudio || !secAnti || !btnStudio || !btnAnti) return;

    if (tab === 'studio') {
        secStudio.classList.remove('hidden');
        secAnti.classList.add('hidden');
        btnStudio.className = "px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-900/40";
        btnAnti.className = "px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium text-sm transition-all hover:bg-slate-700 border border-slate-700";
    } else {
        secStudio.classList.add('hidden');
        secAnti.classList.remove('hidden');
        btnAnti.className = "px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-900/40";
        btnStudio.className = "px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium text-sm transition-all hover:bg-slate-700 border border-slate-700";
    }
}

// --- TEMPLATE ENGINE ---
function setTemplate(tplKey) {
    document.querySelectorAll('.tpl-btn').forEach(btn => {
        btn.classList.remove('active', 'border-amber-500', 'bg-amber-500/10');
        btn.classList.add('border-slate-700', 'bg-slate-800/40');
    });
    const selectedBtn = document.getElementById(`tpl_${tplKey}`);
    if (selectedBtn) {
        selectedBtn.classList.add('active', 'border-amber-500', 'bg-amber-500/10');
    }
    currentTemplate = tplKey;
    initTemplate(tplKey);
    const tplName = (typeof TEMPLATE_CONFIGS !== 'undefined' && TEMPLATE_CONFIGS[tplKey]?.title) || tplKey;
    showToast(`Đã chuyển sang mẫu: ${tplName}`);
}

function initTemplate(tplKey) {
    const config = TEMPLATE_CONFIGS[tplKey];
    const canvas = document.getElementById('mainCanvas');
    if (!canvas || !config) return;

    const inpSkinCount = document.getElementById('inpSkinCount');
    const skinCount = inpSkinCount ? parseInt(inpSkinCount.value) || config.defaultSkinCount : config.defaultSkinCount;

    canvas.width = config.width;

    // Preserve existing images if any
    const prevSlotsMap = new Map();
    if (Array.isArray(slotsData)) {
        slotsData.forEach((s, idx) => {
            if (s.id) prevSlotsMap.set(s.id, s);
            prevSlotsMap.set(`idx_${idx}`, s);
        });
    }

    const newSlotsData = [];
    config.slots.forEach(s => {
        if (s.isGrid) {
            for (let i = 0; i < skinCount; i++) {
                const existing = prevSlotsMap.get(`${s.id}_${i}`);
                if (existing) {
                    newSlotsData.push(existing);
                } else {
                    newSlotsData.push({
                        id: `${s.id}_${i}`,
                        label: `Skin #${i+1}`,
                        img: null, scale: 1, rotate: 0, offsetX: 0, offsetY: 0, tag: '', colSpan: 1, rowSpan: 1
                    });
                }
            }
        } else {
            const existing = prevSlotsMap.get(s.id);
            if (existing) {
                newSlotsData.push({ ...existing, label: s.label });
            } else {
                newSlotsData.push({
                    id: s.id, label: s.label,
                    img: null, scale: 1, rotate: 0, offsetX: 0, offsetY: 0, tag: '', colSpan: 1, rowSpan: 1,
                    breakthrough: false
                });
            }
        }
    });

    slotsData = newSlotsData;

    renderSlotControls();
    updateRender();
    if (typeof saveHistoryState === 'function') saveHistoryState();
    if (typeof autoSaveProject === 'function') autoSaveProject();
}

function updateSkinCount(newCountStr) {
    const newCount = Math.max(1, parseInt(newCountStr) || 28);
    const nonGridSlots = slotsData.filter(s => !s.id.startsWith('grid_skins_'));
    const currentGridSlots = slotsData.filter(s => s.id.startsWith('grid_skins_'));

    const newGridSlots = [];
    for (let i = 0; i < newCount; i++) {
        if (i < currentGridSlots.length) {
            newGridSlots.push(currentGridSlots[i]);
        } else {
            newGridSlots.push({
                id: `grid_skins_${i}`, label: `Skin #${i+1}`,
                img: null, scale: 1, rotate: 0, offsetX: 0, offsetY: 0, tag: '', colSpan: 1, rowSpan: 1
            });
        }
    }

    slotsData = [...nonGridSlots, ...newGridSlots];
    renderSlotControls();
    updateRender();
    showToast(`Đã điều chỉnh số ô skin thành ${newCount} ô!`);
}

// --- BADGE & VIP CONTROLS (FREE MOVEMENT) ---
function syncVipBadgeUi() {
    const rngX = document.getElementById('rngVipBadgeX');
    const valX = document.getElementById('valVipBadgeX');
    const rngY = document.getElementById('rngVipBadgeY');
    const valY = document.getElementById('valVipBadgeY');
    const rngSize = document.getElementById('rngVipBadgeSize');
    const valSize = document.getElementById('valVipBadgeSize');

    if (rngX && badgeSettings.x !== undefined) rngX.value = badgeSettings.x;
    if (valX && badgeSettings.x !== undefined) valX.innerText = `${badgeSettings.x}%${Math.abs(badgeSettings.x - 50) < 0.3 ? ' (Giữa)' : ''}`;
    if (rngY && badgeSettings.y !== undefined) rngY.value = badgeSettings.y;
    if (valY && badgeSettings.y !== undefined) valY.innerText = `${badgeSettings.y}%`;
    if (rngSize && badgeSettings.vipBadgeSize) rngSize.value = badgeSettings.vipBadgeSize;
    if (valSize && badgeSettings.vipBadgeSize) valSize.innerText = `${badgeSettings.vipBadgeSize}px`;
}
window.syncVipBadgeUi = syncVipBadgeUi;

function onBadgeSettingsChange() {
    const chkBadge = document.getElementById('chkShowVipBadge');
    if (chkBadge) badgeSettings.showVipBadge = chkBadge.checked;
    updateRender();
    saveHistoryState();
}
window.onBadgeSettingsChange = onBadgeSettingsChange;

function onVipTierChange(val) {
    badgeSettings.vipTier = parseInt(val) || 8;
    const previewImg = document.getElementById('vipBadgePreviewImg');
    const badgeLabel = document.getElementById('valVipTierBadge');
    const numStr = badgeSettings.vipTier < 10 ? `0${badgeSettings.vipTier}` : `${badgeSettings.vipTier}`;
    if (previewImg) previewImg.src = `vip_badge/HuyHieu_VIP_${numStr}_Transparent.png`;
    
    const tierNames = {
        1: 'VIP 1', 2: 'VIP 2', 3: 'VIP 3', 4: 'VIP 4', 5: 'VIP 5',
        6: 'VIP 6', 7: 'VIP 7', 8: 'VIP 8 (Hoàng Kim)', 9: 'VIP 9 (Huyền Thoại)', 10: 'VIP 10 (Chí Tôn Tối Thượng)'
    };
    if (badgeLabel) badgeLabel.innerText = tierNames[badgeSettings.vipTier] || `VIP ${badgeSettings.vipTier}`;
    
    updateRender();
    saveHistoryState();
}
window.onVipTierChange = onVipTierChange;

function onVipBadgeSizeChange(val) {
    badgeSettings.vipBadgeSize = parseInt(val) || 65;
    const sizeLabel = document.getElementById('valVipBadgeSize');
    if (sizeLabel) sizeLabel.innerText = `${badgeSettings.vipBadgeSize}px`;
    updateRender();
}
window.onVipBadgeSizeChange = onVipBadgeSizeChange;

function onVipBadgeXChange(val) {
    badgeSettings.x = Math.round(parseFloat(val) * 10) / 10;
    const valX = document.getElementById('valVipBadgeX');
    if (valX) valX.innerText = `${badgeSettings.x}%${Math.abs(badgeSettings.x - 50) < 0.3 ? ' (Giữa)' : ''}`;
    updateRender();
}
window.onVipBadgeXChange = onVipBadgeXChange;

function onVipBadgeYChange(val) {
    badgeSettings.y = Math.round(parseFloat(val) * 10) / 10;
    const valY = document.getElementById('valVipBadgeY');
    if (valY) valY.innerText = `${badgeSettings.y}%`;
    updateRender();
}
window.onVipBadgeYChange = onVipBadgeYChange;

function centerVipBadge() {
    badgeSettings.x = 50;
    syncVipBadgeUi();
    updateRender();
    saveHistoryState();
    if (typeof showToast === 'function') showToast('Đã căn giữa Huy Hiệu VIP!');
}
window.centerVipBadge = centerVipBadge;

function resetVipBadgePosition() {
    badgeSettings.x = 50;
    badgeSettings.y = 4.2;
    syncVipBadgeUi();
    updateRender();
    saveHistoryState();
    if (typeof showToast === 'function') showToast('Đã đưa Huy Hiệu VIP về vị trí mặc định!');
}
window.resetVipBadgePosition = resetVipBadgePosition;

// Toggle 3D breakthrough per-slot (called from checkbox in slot row)
function toggleBreakthrough(index, checked) {
    if (slotsData[index]) {
        slotsData[index].breakthrough = checked;
        updateRender();
        saveHistoryState();
    }
}

// --- FRAME SETTINGS ---
function onFrameSettingsChange() {
    const chkTopCards    = document.getElementById('chkFrameTopCards');
    const selTopStyle    = document.getElementById('selFrameTopStyle');
    const clrTopColor    = document.getElementById('clrFrameTopColor');
    const chkGridSkins   = document.getElementById('chkFrameGridSkins');
    const selGridStyle   = document.getElementById('selFrameGridStyle');
    const clrGridColor   = document.getElementById('clrFrameGridColor');
    const rngGridWidth   = document.getElementById('rngFrameGridWidth');
    const valGridWidth   = document.getElementById('valFrameGridWidth');
    const rngGridGap     = document.getElementById('rngFrameGridGap');
    const valGridGap     = document.getElementById('valFrameGridGap');

    if (chkTopCards)  frameSettings.topCards.enabled  = chkTopCards.checked;
    if (selTopStyle)  frameSettings.topCards.style    = selTopStyle.value;
    if (clrTopColor)  frameSettings.topCards.color    = clrTopColor.value;

    if (rngGridWidth) {
        frameSettings.gridSkins.width = parseFloat(rngGridWidth.value) || 3;
        if (valGridWidth) valGridWidth.innerText = `${frameSettings.gridSkins.width}px`;
    }
    if (rngGridGap) {
        frameSettings.gridSkins.gap = parseInt(rngGridGap.value, 10);
        if (isNaN(frameSettings.gridSkins.gap)) frameSettings.gridSkins.gap = 3;
        if (valGridGap) valGridGap.innerText = `${frameSettings.gridSkins.gap}px`;
    }

    if (chkGridSkins) {
        frameSettings.gridSkins.enabled = chkGridSkins.checked;
    }
    if (selGridStyle) frameSettings.gridSkins.style   = selGridStyle.value;
    if (clrGridColor) frameSettings.gridSkins.color   = clrGridColor.value;

    updateRender();
    saveHistoryState();
}


// --- ACTIVE SLOT & PASTE SYSTEM ---
let activeSlotIndex = 0;

function selectActiveSlot(index) {
    activeSlotIndex = index;
    renderSlotControls();
}

function setSlotImageFromBlob(index, blob, customToastMsg) {
    if (index < 0 || index >= slotsData.length) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            slotsData[index].img = img;
            slotsData[index].scale = 1;
            slotsData[index].rotate = 0;
            slotsData[index].offsetX = 0;
            slotsData[index].offsetY = 0;

            // Auto advance active slot to next empty slot
            const nextEmpty = findNextEmptySlotIndex(index + 1);
            if (nextEmpty !== -1) {
                activeSlotIndex = nextEmpty;
            } else {
                activeSlotIndex = (index + 1) % slotsData.length;
            }

            renderSlotControls();
            updateRender();
            if (window.saveHistoryState) saveHistoryState();
            showToast(customToastMsg || `📋 Đã dán ảnh vào Slot #${index + 1} (${slotsData[index].label})!`);
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(blob);
}

async function pasteToSlot(event, index) {
    if (event) event.stopPropagation();
    activeSlotIndex = index;
    renderSlotControls();

    try {
        if (navigator.clipboard && navigator.clipboard.read) {
            const items = await navigator.clipboard.read();
            let imageFound = false;
            for (const item of items) {
                const imgType = item.types.find(t => t.startsWith('image/'));
                if (imgType) {
                    const blob = await item.getType(imgType);
                    setSlotImageFromBlob(index, blob, `📋 Đã dán ảnh từ Clipboard vào Slot #${index + 1} (${slotsData[index].label})!`);
                    imageFound = true;
                    break;
                }
            }
            if (!imageFound) {
                showToast(`Chưa thấy ảnh trong Clipboard! Nhấn Win+Shift+S hoặc Copy ảnh rồi nhấn Ctrl+V.`);
            }
        } else {
            showToast(`Đã chọn Slot #${index + 1}. Nhấn Ctrl+V để dán ảnh từ Clipboard!`);
        }
    } catch (err) {
        showToast(`Đã chọn Slot #${index + 1}. Nhấn Ctrl+V để dán ảnh từ Clipboard!`);
    }
}

async function pasteFromClipboardToNextEmptySlot() {
    let targetIdx = activeSlotIndex;
    if (targetIdx < 0 || targetIdx >= slotsData.length || (slotsData[targetIdx] && slotsData[targetIdx].img !== null)) {
        const nextEmpty = findNextEmptySlotIndex(0);
        if (nextEmpty !== -1) {
            targetIdx = nextEmpty;
        } else if (targetIdx < 0 || targetIdx >= slotsData.length) {
            targetIdx = 0;
        }
    }
    await pasteToSlot(null, targetIdx);
}

function handleDropOnSlot(e, index) {
    e.preventDefault();
    const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    
    setSlotImageFromBlob(index, imageFiles[0], `🎯 Đã thả ảnh vào Slot #${index + 1}!`);
}

function handleGlobalPaste(e) {
    const items = e.clipboardData ? e.clipboardData.items : null;
    if (!items) return;

    let imageFiles = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) imageFiles.push(blob);
        }
    }

    if (imageFiles.length === 0) return;

    // Prevent default binary string pasting into input text elements
    e.preventDefault();

    // 1. Batch Grid Crop Modal open?
    const batchGridModal = document.getElementById('batchGridModal');
    if (batchGridModal && !batchGridModal.classList.contains('hidden')) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                if (typeof initBatchGridWithImage === 'function') {
                    initBatchGridWithImage(img);
                } else {
                    batchGridState.img = img;
                    renderBatchGridCanvas();
                }
                showToast("📋 Đã dán screenshot vào Cắt Lưới Hàng Loạt!");
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(imageFiles[0]);
        return;
    }

    // 2. Crop Modal open?
    const cropModal = document.getElementById('cropModal');
    if (cropModal && !cropModal.classList.contains('hidden') && typeof activeCropSlotIndex !== 'undefined' && activeCropSlotIndex >= 0) {
        setSlotImageFromBlob(activeCropSlotIndex, imageFiles[0], `📋 Đã dán ảnh mới vào Slot #${activeCropSlotIndex + 1}!`);
        openCropModal(activeCropSlotIndex);
        return;
    }

    // 3. Studio Main Slots
    let startIdx = activeSlotIndex;
    if (startIdx < 0 || startIdx >= slotsData.length || (slotsData[startIdx] && slotsData[startIdx].img !== null)) {
        const emptyIdx = findNextEmptySlotIndex(0);
        if (emptyIdx !== -1) {
            startIdx = emptyIdx;
        } else if (startIdx < 0 || startIdx >= slotsData.length) {
            startIdx = 0;
        }
    }

    let loadedCount = 0;
    let currSlot = startIdx;

    imageFiles.forEach((file, fIdx) => {
        let targetSlot = currSlot;
        if (fIdx > 0) {
            const nextEmpty = findNextEmptySlotIndex(currSlot);
            if (nextEmpty !== -1) {
                targetSlot = nextEmpty;
            } else {
                targetSlot = (currSlot + 1) % slotsData.length;
            }
        }
        currSlot = targetSlot + 1;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                slotsData[targetSlot].img = img;
                slotsData[targetSlot].scale = 1;
                slotsData[targetSlot].rotate = 0;
                slotsData[targetSlot].offsetX = 0;
                slotsData[targetSlot].offsetY = 0;

                loadedCount++;
                if (loadedCount === imageFiles.length) {
                    activeSlotIndex = findNextEmptySlotIndex(targetSlot + 1);
                    renderSlotControls();
                    updateRender();
                    if (window.saveHistoryState) saveHistoryState();
                    if (imageFiles.length === 1) {
                        showToast(`📋 Đã dán ảnh vào Slot #${targetSlot + 1} (${slotsData[targetSlot].label})!`);
                    } else {
                        showToast(`📋 Đã dán ${loadedCount} ảnh từ Clipboard vào các ô!`);
                    }
                }
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Global Paste Event Listener
window.addEventListener('paste', handleGlobalPaste);

// --- RENDER SLOT CONTROLS IN SIDEBAR ---
function renderSlotControls() {
    const container = document.getElementById('slotsContainer');
    if (!container) return;
    container.innerHTML = '';

    slotsData.forEach((slot, index) => {
        const div = document.createElement('div');
        const hasImg = slot.img !== null;
        const isActive = (index === activeSlotIndex);
        const isHeroSlot = (index >= 1 && index <= 6);
        const isGridSkin = slot.id.startsWith("grid_skins_");
        const spanVal = `${slot.colSpan || 1}x${slot.rowSpan || 1}`;

        div.className = `flex items-center justify-between p-2 rounded-xl border text-xs transition-all cursor-pointer ${
            isActive 
                ? 'bg-slate-900/90 border-amber-400 ring-1 ring-amber-400/50 shadow-md shadow-amber-950/40' 
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        }`;

        div.onclick = (e) => {
            if (['BUTTON', 'INPUT', 'LABEL', 'I'].includes(e.target.tagName)) return;
            selectActiveSlot(index);
        };

        div.ondragover = (e) => {
            e.preventDefault();
            div.classList.add('border-emerald-400', 'bg-emerald-950/40');
        };
        div.ondragleave = () => {
            div.classList.remove('border-emerald-400', 'bg-emerald-950/40');
        };
        div.ondrop = (e) => {
            div.classList.remove('border-emerald-400', 'bg-emerald-950/40');
            handleDropOnSlot(e, index);
        };

        div.innerHTML = `
            <div class="flex items-center gap-2 overflow-hidden">
                <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border ${isActive ? 'border-amber-400/60' : 'border-slate-700'} shrink-0 overflow-hidden relative">
                    ${hasImg ? `<img src="${slot.img.src}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-image text-slate-500"></i>`}
                    ${isActive ? `<span class="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900"></span>` : ''}
                </div>
                <div class="truncate">
                    <span class="font-medium ${isActive ? 'text-amber-300 font-bold' : 'text-slate-300'} block truncate">
                        [${index + 1}] ${slot.label}
                    </span>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] ${hasImg ? 'text-emerald-400 font-medium' : 'text-slate-500'}">
                            ${hasImg ? 'Đã có ảnh' : 'Chưa có ảnh'}
                        </span>
                        ${isActive ? `<span class="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40 font-bold">Chờ dán</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <!-- Cụm nút mũi tên đổi vị trí (Next / Chen ô trước) -->
                <div class="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg p-0.5 shadow-sm" title="Đổi vị trí (Next: sang ô tiếp theo | Lùi: chen qua ô trước)">
                    <button onclick="moveSlotImage(${index}, -1, event)" 
                        class="px-1.5 py-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-all ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}" 
                        title="Chen qua ô trước (Lùi lại ô #${index})" ${index === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-arrow-left text-[11px]"></i>
                    </button>
                    <div class="w-[1px] h-3.5 bg-slate-800 mx-0.5"></div>
                    <button onclick="moveSlotImage(${index}, 1, event)" 
                        class="px-1.5 py-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-all" 
                        title="Đổi qua ô tiếp theo (Tiến sang ô #${index + 2})">
                        <i class="fa-solid fa-arrow-right text-[11px]"></i>
                    </button>
                </div>

                ${isGridSkin ? `
                <select onchange="updateSlotSpan(${index}, this.value)" class="bg-slate-950 border border-slate-700 rounded text-[10px] text-amber-300 font-bold px-1 py-1" title="Kích thước gộp ô (Cột x Hàng)">
                    <option value="1x1" ${spanVal === '1x1' ? 'selected' : ''}>1×1</option>
                    <option value="2x1" ${spanVal === '2x1' ? 'selected' : ''}>2×1</option>
                    <option value="1x2" ${spanVal === '1x2' ? 'selected' : ''}>1×2</option>
                    <option value="2x2" ${spanVal === '2x2' ? 'selected' : ''}>2×2</option>
                    <option value="3x1" ${spanVal === '3x1' ? 'selected' : ''}>3×1</option>
                    <option value="3x2" ${spanVal === '3x2' ? 'selected' : ''}>3×2</option>
                </select>
                ` : ''}
                ${isHeroSlot ? `
                <label class="flex items-center gap-1 cursor-pointer bg-amber-900/20 border border-amber-700/40 rounded px-1.5 py-0.5" title="Bật hiệu ứng 3D: Ảnh vượt ra ngoài khung (dùng PNG đã xóa nền)">
                    <input type="checkbox" onchange="toggleBreakthrough(${index}, this.checked)" ${slot.breakthrough ? 'checked' : ''} class="accent-amber-400 w-3 h-3">
                    <span class="text-[10px] text-amber-300 font-bold">3D</span>
                </label>
                ` : ''}
                <button onclick="pasteToSlot(event, ${index})" class="px-2 py-1 bg-emerald-900/40 border border-emerald-600/50 hover:bg-emerald-800/60 text-emerald-300 rounded cursor-pointer text-[11px] transition-all flex items-center gap-1" title="Dán ảnh từ Clipboard (Ctrl+V)">
                    <i class="fa-solid fa-paste"></i> Dán
                </button>
                <label class="px-2 py-1 bg-purple-900/40 border border-purple-600/50 hover:bg-purple-800/60 text-purple-300 rounded cursor-pointer text-[11px] transition-all">
                    <i class="fa-solid fa-upload"></i> Nạp
                    <input type="file" accept="image/*" class="hidden" onchange="uploadSlotImage(event, ${index})">
                </label>
                ${hasImg ? `
                    <button onclick="openCropModal(${index})" class="px-2 py-1 bg-amber-900/40 border border-amber-600/50 hover:bg-amber-800/60 text-amber-300 rounded text-[11px]" title="Chỉnh sửa / Crop">
                        <i class="fa-solid fa-crop-simple"></i>
                    </button>
                    <button onclick="clearSlotImage(${index})" class="px-2 py-1 bg-red-900/40 border border-red-700/50 hover:bg-red-800/60 text-red-300 rounded text-[11px]" title="Xóa ảnh">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

// --- MOVE / SWAP SLOT IMAGE POSITION ---
function moveSlotImage(currentIndex, direction, e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }

    const targetIndex = currentIndex + direction;

    if (targetIndex < 0) {
        showToast("Đã ở ô đầu tiên, không thể chen về trước!");
        return;
    }

    // Nếu bấm next ở ô cuối cùng: tự động mở rộng thêm ô skin mới
    if (targetIndex >= slotsData.length) {
        const currentGridCount = slotsData.filter(s => s.id.startsWith('grid_skins_')).length;
        const newTotalSkinCount = currentGridCount + 1;
        updateSkinCount(newTotalSkinCount);
        const inpSkinCount = document.getElementById('inpSkinCount');
        if (inpSkinCount) inpSkinCount.value = newTotalSkinCount;
    }

    const slotA = slotsData[currentIndex];
    const slotB = slotsData[targetIndex];

    if (!slotA || !slotB) return;

    // Hoán đổi thông tin ảnh và cấu hình hiển thị ảnh
    const temp = {
        img: slotA.img,
        scale: slotA.scale,
        rotate: slotA.rotate,
        offsetX: slotA.offsetX,
        offsetY: slotA.offsetY,
        tag: slotA.tag,
        breakthrough: slotA.breakthrough
    };

    slotA.img = slotB.img;
    slotA.scale = slotB.scale;
    slotA.rotate = slotB.rotate;
    slotA.offsetX = slotB.offsetX;
    slotA.offsetY = slotB.offsetY;
    slotA.tag = slotB.tag;
    slotA.breakthrough = slotB.breakthrough;

    slotB.img = temp.img;
    slotB.scale = temp.scale;
    slotB.rotate = temp.rotate;
    slotB.offsetX = temp.offsetX;
    slotB.offsetY = temp.offsetY;
    slotB.tag = temp.tag;
    slotB.breakthrough = temp.breakthrough;

    activeSlotIndex = targetIndex;

    renderSlotControls();
    updateRender();
    if (typeof saveHistoryState === 'function') saveHistoryState();
    if (typeof autoSaveProject === 'function') autoSaveProject();

    const dirText = direction > 0 ? "ô tiếp theo" : "ô trước";
    showToast(`🔄 Đã đổi ảnh sang ${dirText} (Slot #${targetIndex + 1})!`);

    setTimeout(() => {
        const container = document.getElementById('slotsContainer');
        if (container && container.children[targetIndex]) {
            container.children[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 50);
}
window.moveSlotImage = moveSlotImage;

// Phím tắt Alt + Mũi tên để di chuyển ô đang chọn
window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        e.preventDefault();
        if (activeSlotIndex >= 0 && activeSlotIndex < slotsData.length) {
            moveSlotImage(activeSlotIndex, 1);
        }
    } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault();
        if (activeSlotIndex > 0) {
            moveSlotImage(activeSlotIndex, -1);
        }
    }
});


function clearSlotImage(index) {
    slotsData[index].img = null;
    slotsData[index].scale = 1;
    slotsData[index].offsetX = 0;
    slotsData[index].offsetY = 0;
    renderSlotControls();
    updateRender();
    saveHistoryState();
}

function uploadSlotImage(e, index) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            slotsData[index].img = img;
            slotsData[index].scale = 1;
            slotsData[index].offsetX = 0;
            slotsData[index].offsetY = 0;
            renderSlotControls();
            updateRender();
            saveHistoryState();
            showToast("Đã tải ảnh lên slot!");
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// --- OVERLAY ELEMENT SYSTEM ---
function addOverlayImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        let loadedCount = 0;
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const offset = (index % 10) * 3;
                    const newOverlay = {
                        id: `overlay_${overlayIdCounter++}`,
                        type: 'image',
                        x: Math.min(75, 25 + offset),
                        y: Math.min(75, 25 + offset),
                        width: 28,
                        height: 0,
                        rotation: 0,
                        flipH: false,
                        hasFrame: false,
                        frameStyle: 'simple_neon',
                        frameColor: '#38bdf8',
                        frameWidth: 3,
                        borderRadius: 6,
                        img: img,
                        opacity: 1.0,
                        zIndex: 10 + overlayElements.length
                    };
                    overlayElements.push(newOverlay);
                    if (typeof selectedOverlayId !== 'undefined') {
                        selectedOverlayId = newOverlay.id;
                    }
                    loadedCount++;
                    if (loadedCount === files.length) {
                        renderOverlayControls();
                        updateRender();
                        saveHistoryState();
                        if (typeof autoSaveProject === 'function') autoSaveProject();
                        showToast(`Đã thêm thành công ${files.length} ảnh tự do! Kéo chuột trên Canvas để di chuyển vị trí.`);
                    }
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    };
    input.click();
}

function clearAllOverlays() {
    if (!overlayElements || overlayElements.length === 0) {
        showToast("Không có ảnh hoặc chữ tự do nào để xóa!");
        return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${overlayElements.length} ảnh/text tự do không?`)) {
        overlayElements = [];
        if (typeof selectedOverlayId !== 'undefined') {
            selectedOverlayId = null;
        }
        renderOverlayControls();
        updateRender();
        saveHistoryState();
        if (typeof autoSaveProject === 'function') autoSaveProject();
        showToast("Đã xóa sạch tất cả ảnh & text tự do!");
    }
}


function addOverlayText() {
    const text = prompt("Nhập nội dung text overlay:", "Text Tùy Chỉnh");
    if (!text) return;

    const newOverlay = {
        id: `overlay_${overlayIdCounter++}`,
        type: 'text',
        x: 20, y: 20,
        width: 60,
        text: text,
        fontSize: 24,
        fontColor: '#ffffff',
        fontBold: true,
        fontShadow: true,
        rotation: 0,
        opacity: 1.0,
        zIndex: 10 + overlayElements.length
    };
    overlayElements.push(newOverlay);
    if (typeof selectedOverlayId !== 'undefined') {
        selectedOverlayId = newOverlay.id;
    }
    renderOverlayControls();
    updateRender();
    saveHistoryState();
    if (typeof autoSaveProject === 'function') autoSaveProject();
    showToast("Đã thêm text overlay! Bạn có thể kéo chuột trên Canvas để di chuyển vị trí.");
}

function removeOverlay(id) {
    overlayElements = overlayElements.filter(el => el.id !== id);
    if (typeof selectedOverlayId !== 'undefined' && selectedOverlayId === id) {
        selectedOverlayId = null;
    }
    renderOverlayControls();
    updateRender();
    saveHistoryState();
    if (typeof autoSaveProject === 'function') autoSaveProject();
}

function moveOverlayLayer(id, direction) {
    const idx = overlayElements.findIndex(e => e.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx < overlayElements.length - 1) {
        const temp = overlayElements[idx];
        overlayElements[idx] = overlayElements[idx + 1];
        overlayElements[idx + 1] = temp;
    } else if (direction === 'down' && idx > 0) {
        const temp = overlayElements[idx];
        overlayElements[idx] = overlayElements[idx - 1];
        overlayElements[idx - 1] = temp;
    }
    overlayElements.forEach((el, i) => { el.zIndex = 10 + i; });
    renderOverlayControls();
    updateRender();
    saveHistoryState();
    if (typeof autoSaveProject === 'function') autoSaveProject();
}

function updateOverlayParam(id, param, value) {
    const el = overlayElements.find(e => e.id === id);
    if (!el) return;
    if (param === 'fontBold' || param === 'fontShadow' || param === 'flipH' || param === 'hasFrame') {
        el[param] = !!value;
        if (param === 'hasFrame') {
            renderOverlayControls();
        }
    } else if (param === 'frameStyle' || param === 'frameColor' || param === 'fontColor') {
        el[param] = value;
    } else {
        el[param] = isNaN(parseFloat(value)) ? value : parseFloat(value);
    }
    const lbl = document.getElementById(`lbl_${id}_${param}`);
    if (lbl) {
        if (param === 'opacity') lbl.innerText = `${Math.round(el[param]*100)}%`;
        else if (param === 'rotation') lbl.innerText = `${el[param]}°`;
        else if (param === 'frameWidth' || param === 'borderRadius') lbl.innerText = `${el[param]}px`;
        else if (param !== 'fontColor' && param !== 'frameColor') lbl.innerText = `${el[param]}%`;
    }
    updateRender();
    if (typeof autoSaveProject === 'function') autoSaveProject();
}

function updateOverlayText(id, val) {
    const el = overlayElements.find(e => e.id === id);
    if (el) { 
        el.text = val; 
        updateRender(); 
        if (typeof autoSaveProject === 'function') autoSaveProject();
    }
}

function renderOverlayControls() {
    const container = document.getElementById('overlayContainer');
    if (!container) return;
    container.innerHTML = '';

    if (overlayElements.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 italic text-center py-3">Chưa có ảnh/text chèn tự do. Bấm nút <strong>+ Chèn Ảnh</strong> hoặc kéo thả file ảnh trực tiếp vào Canvas.</div>`;
        return;
    }

    overlayElements.forEach(el => {
        const div = document.createElement('div');
        const isSelected = (typeof selectedOverlayId !== 'undefined' && selectedOverlayId === el.id);
        div.className = `border rounded-xl p-3 space-y-2 text-xs transition-all ${
            isSelected 
                ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md' 
                : 'bg-slate-950 border-slate-800'
        }`;

        const icon = el.type === 'image' ? 'fa-image' : 'fa-font';
        const typeLabel = el.type === 'image' ? 'Ảnh' : 'Text';
        const displayName = el.type === 'text'
            ? `"${el.text.substring(0, 20)}${el.text.length > 20 ? '...' : ''}"`
            : `Ảnh #${el.id.replace('overlay_', '')}`;

        let extraControls = '';
        if (el.type === 'text') {
            extraControls = `
                <div class="grid grid-cols-3 gap-2 pt-1">
                    <div>
                        <label class="text-slate-400 block mb-0.5">Text:</label>
                        <input type="text" value="${el.text}" oninput="updateOverlayText('${el.id}', this.value)"
                            class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-[11px]">
                    </div>
                    <div>
                        <label class="text-slate-400 block mb-0.5">Cỡ chữ (px):</label>
                        <input type="number" value="${el.fontSize}" min="8" max="120" onchange="updateOverlayParam('${el.id}','fontSize',this.value)"
                            class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-[11px]">
                    </div>
                    <div>
                        <label class="text-slate-400 block mb-0.5">Màu chữ:</label>
                        <input type="color" value="${el.fontColor}" oninput="updateOverlayParam('${el.id}','fontColor',this.value)"
                            class="w-full h-7 rounded border border-slate-700 cursor-pointer bg-slate-900">
                    </div>
                </div>
                <div class="flex gap-4 pt-1">
                    <label class="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" ${el.fontBold ? 'checked' : ''} onchange="updateOverlayParam('${el.id}','fontBold',this.checked)" class="accent-purple-500 w-3 h-3">
                        <span class="text-slate-400">Đậm</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" ${el.fontShadow ? 'checked' : ''} onchange="updateOverlayParam('${el.id}','fontShadow',this.checked)" class="accent-purple-500 w-3 h-3">
                        <span class="text-slate-400">Bóng đổ</span>
                    </label>
                </div>
            `;
        } else {
            const hasFrame = !!el.hasFrame;
            const fStyle = el.frameStyle || 'simple_neon';
            const fColor = el.frameColor || '#38bdf8';
            const fWidth = el.frameWidth !== undefined ? el.frameWidth : 3;
            const bRadius = el.borderRadius !== undefined ? el.borderRadius : 6;

            extraControls = `
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <div>
                        <div class="flex justify-between text-slate-400 mb-1">
                            <span>Kích thước:</span>
                            <span id="lbl_${el.id}_width" class="text-purple-300 font-bold">${el.width}%</span>
                        </div>
                        <input type="range" min="2" max="100" value="${el.width}" oninput="updateOverlayParam('${el.id}','width',this.value)" class="w-full accent-purple-500">
                    </div>
                    <div>
                        <div class="flex justify-between text-slate-400 mb-1">
                            <span>Xoay góc:</span>
                            <span id="lbl_${el.id}_rotation" class="text-amber-300 font-bold">${el.rotation || 0}°</span>
                        </div>
                        <input type="range" min="-180" max="180" value="${el.rotation || 0}" oninput="updateOverlayParam('${el.id}','rotation',this.value)" class="w-full accent-amber-500">
                    </div>
                </div>
                <div class="flex items-center justify-between pt-1">
                    <label class="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" ${el.flipH ? 'checked' : ''} onchange="updateOverlayParam('${el.id}','flipH',this.checked)" class="accent-cyan-400 w-3 h-3">
                        <span class="text-slate-300 text-[11px]">Lật ngang (Mirror)</span>
                    </label>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-slate-400">Thứ tự lớp:</span>
                        <button onclick="moveOverlayLayer('${el.id}', 'down')" class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px]" title="Xuống dưới 1 lớp"><i class="fa-solid fa-arrow-down"></i></button>
                        <button onclick="moveOverlayLayer('${el.id}', 'up')" class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px]" title="Lên trên 1 lớp"><i class="fa-solid fa-arrow-up"></i></button>
                    </div>
                </div>

                <!-- Tùy Chọn Khung Cho Ảnh Tự Do -->
                <div class="mt-2 pt-2 border-t border-slate-800/80">
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" ${hasFrame ? 'checked' : ''} onchange="updateOverlayParam('${el.id}','hasFrame',this.checked)" class="accent-amber-400 w-3.5 h-3.5">
                            <span class="text-amber-300 font-bold text-[11px]"><i class="fa-solid fa-border-all text-xs"></i> Bật Khung Ảnh</span>
                        </label>
                        ${hasFrame ? `<span class="text-[10px] text-amber-400/80 font-mono font-semibold">Khung Pro</span>` : ''}
                    </div>
                    ${hasFrame ? `
                    <div class="space-y-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-slate-400 block mb-0.5 text-[10px]">Kiểu Khung:</label>
                                <select onchange="updateOverlayParam('${el.id}','frameStyle',this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-[10px] focus:outline-none">
                                    <option value="simple_neon" ${fStyle === 'simple_neon' ? 'selected' : ''}>✨ Neon Glow</option>
                                    <option value="gold_royal" ${fStyle === 'gold_royal' ? 'selected' : ''}>👑 Gold Royal</option>
                                    <option value="cyberpunk" ${fStyle === 'cyberpunk' ? 'selected' : ''}>⚡ Cyberpunk</option>
                                    <option value="diamond" ${fStyle === 'diamond' ? 'selected' : ''}>💎 Diamond</option>
                                    <option value="rainbow" ${fStyle === 'rainbow' ? 'selected' : ''}>🌈 Rainbow</option>
                                    <option value="simple" ${fStyle === 'simple' ? 'selected' : ''}>⏹️ Viền Thẳng</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-slate-400 block mb-0.5 text-[10px]">Màu Khung:</label>
                                <input type="color" value="${fColor}" oninput="updateOverlayParam('${el.id}','frameColor',this.value)" class="w-full h-6 rounded border border-slate-700 cursor-pointer bg-slate-900">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <div class="flex justify-between text-slate-400 mb-0.5 text-[10px]">
                                    <span>Độ dày viền:</span>
                                    <span id="lbl_${el.id}_frameWidth" class="text-purple-300 font-bold">${fWidth}px</span>
                                </div>
                                <input type="range" min="1" max="15" step="0.5" value="${fWidth}" oninput="updateOverlayParam('${el.id}','frameWidth',this.value)" class="w-full accent-purple-500">
                            </div>
                            <div>
                                <div class="flex justify-between text-slate-400 mb-0.5 text-[10px]">
                                    <span>Bo góc:</span>
                                    <span id="lbl_${el.id}_borderRadius" class="text-amber-300 font-bold">${bRadius}px</span>
                                </div>
                                <input type="range" min="0" max="30" step="1" value="${bRadius}" oninput="updateOverlayParam('${el.id}','borderRadius',this.value)" class="w-full accent-amber-500">
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        div.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="font-bold text-slate-300 flex items-center gap-1.5">
                    <i class="fa-solid ${icon} text-cyan-400 text-xs"></i> ${typeLabel}: ${displayName}
                    ${isSelected ? '<span class="text-[9px] bg-cyan-900/60 text-cyan-300 px-1 rounded border border-cyan-500/50">Đang chọn</span>' : ''}
                </span>
                <button onclick="removeOverlay('${el.id}')" class="px-2 py-0.5 bg-red-900/40 border border-red-700/50 text-red-300 rounded text-[11px] hover:bg-red-800/60">
                    <i class="fa-solid fa-trash"></i> Xóa
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <div class="flex justify-between text-slate-400 mb-1">
                        <span>Vị trí X:</span>
                        <span id="lbl_${el.id}_x" class="text-amber-300 font-bold">${el.x}%</span>
                    </div>
                    <input type="range" id="inp_${el.id}_x" min="-20" max="110" step="0.5" value="${el.x}" oninput="updateOverlayParam('${el.id}','x',this.value)" class="w-full accent-amber-500">
                </div>
                <div>
                    <div class="flex justify-between text-slate-400 mb-1">
                        <span>Vị trí Y:</span>
                        <span id="lbl_${el.id}_y" class="text-amber-300 font-bold">${el.y}%</span>
                    </div>
                    <input type="range" id="inp_${el.id}_y" min="-20" max="110" step="0.5" value="${el.y}" oninput="updateOverlayParam('${el.id}','y',this.value)" class="w-full accent-amber-500">
                </div>
            </div>
            ${extraControls}
            <div>
                <div class="flex justify-between text-slate-400 mb-1">
                    <span>Độ mờ:</span>
                    <span id="lbl_${el.id}_opacity" class="text-slate-300 font-bold">${Math.round(el.opacity*100)}%</span>
                </div>
                <input type="range" min="0.05" max="1" step="0.05" value="${el.opacity}" oninput="updateOverlayParam('${el.id}','opacity',this.value)" class="w-full accent-slate-500">
            </div>
        `;
        container.appendChild(div);
    });
}

// --- UPLOAD & BULK ---
function triggerBulkUpload() {
    const input = document.getElementById('bulkUploadInput');
    if (input) input.click();
}

function handleBulkUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Đảm bảo không giới hạn số lượng: tự động mở rộng slot skin nếu cần
    let countEmpty = 0;
    for (let i = 1; i < slotsData.length; i++) {
        if (slotsData[i] && slotsData[i].img === null) {
            countEmpty++;
        }
    }
    if (countEmpty < files.length && typeof updateSkinCount === 'function') {
        const neededMore = files.length - countEmpty;
        const currentGridCount = slotsData.filter(s => s.id.startsWith('grid_skins_')).length;
        const newTotalSkinCount = currentGridCount + neededMore;
        updateSkinCount(newTotalSkinCount);
        const inpSkinCount = document.getElementById('inpSkinCount');
        if (inpSkinCount) inpSkinCount.value = newTotalSkinCount;
    }

    let loadedCount = 0;
    let currentSlotSearch = 1;
    let targetSlotIndices = [];

    files.forEach(() => {
        let emptyIdx = -1;
        for (let i = Math.max(1, currentSlotSearch); i < slotsData.length; i++) {
            if (slotsData[i] && slotsData[i].img === null) {
                emptyIdx = i;
                break;
            }
        }
        if (emptyIdx !== -1) {
            targetSlotIndices.push(emptyIdx);
            currentSlotSearch = emptyIdx + 1;
        }
    });

    if (targetSlotIndices.length === 0) {
        showToast("Không tìm thấy ô trống nào để nạp ảnh!");
        e.target.value = '';
        return;
    }

    files.forEach((file, idx) => {
        if (idx < targetSlotIndices.length) {
            const targetIdx = targetSlotIndices[idx];
            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    slotsData[targetIdx].img = img;
                    loadedCount++;
                    if (loadedCount === targetSlotIndices.length) {
                        renderSlotControls();
                        updateRender();
                        saveHistoryState();
                        showToast(`Đã lấp ${loadedCount} ảnh vào các ô trống!`);
                    }
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    e.target.value = '';
}

// --- UTILITY ---
function zoomCanvas(delta) {
    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;
    canvasZoomFactor = Math.max(0.3, Math.min(3, canvasZoomFactor + delta));
    canvas.style.transform = `scale(${canvasZoomFactor})`;
    canvas.style.transformOrigin = 'top center';
}

function resetCanvasZoom() {
    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;
    canvasZoomFactor = 1;
    canvas.style.transform = 'scale(1)';
}

function downloadCanvas() {
    const mainCanvas = document.getElementById('mainCanvas');
    if (!mainCanvas) return;

    const scaleSelect = document.getElementById('selDownloadScale');
    const scaleMultiplier = scaleSelect ? Math.max(1, parseInt(scaleSelect.value) || 3) : 3;

    const baseW = 720;
    const baseH = typeof getRequiredCanvasHeight === 'function' ? getRequiredCanvasHeight() : mainCanvas.height;

    // Offscreen Canvas với độ phân giải siêu nét (2K/4K/Super 4K)
    const hdCanvas = document.createElement('canvas');
    hdCanvas.width = baseW * scaleMultiplier;
    hdCanvas.height = baseH * scaleMultiplier;

    const hdCtx = hdCanvas.getContext('2d');
    hdCtx.imageSmoothingEnabled = true;
    hdCtx.imageSmoothingQuality = 'high';

    // Scale context giúp toàn bộ nét chữ, khung neon, badge và ảnh render sắc nét gấp 2x - 4x
    hdCtx.scale(scaleMultiplier, scaleMultiplier);

    if (typeof renderSceneToContext === 'function') {
        renderSceneToContext(hdCtx, baseW, baseH, true);
    } else {
        hdCtx.drawImage(mainCanvas, 0, 0, baseW, baseH);
    }

    const vipInput = document.getElementById('inpVipLevel');
    const vip = vipInput ? vipInput.value || 'VIP' : 'VIP';

    const link = document.createElement('a');
    link.download = `Ghep_Banner_Acc_VIP${vip}_${hdCanvas.width}p_${Date.now()}.png`;
    link.href = hdCanvas.toDataURL('image/png');
    link.click();

    autoSaveProject();
    showToast(`Đã tải ảnh HD (${hdCanvas.width}x${hdCanvas.height}px) & Tự động lưu dự án để sau này chỉnh sửa!`);
}

// ─────────────────────────────────────────────────────────────────────────
// PROJECT SAVE / LOAD & PERSISTENCE SYSTEM (.JSON & LOCALSTORAGE)
// ─────────────────────────────────────────────────────────────────────────
function getProjectSnapshot() {
    const colsInput = document.getElementById('inpColsPerRow');
    const skinInput = document.getElementById('inpSkinCount');
    const vipLevelInput = document.getElementById('inpVipLevel');
    const vipTextInput = document.getElementById('inpVipText');
    const chkGridTags = document.getElementById('chkShowGridTags');

    return {
        version: '2.0',
        timestamp: new Date().toISOString(),
        template: currentTemplate,
        colsPerRow: colsInput ? parseInt(colsInput.value) || 6 : 6,
        skinCount: skinInput ? parseInt(skinInput.value) || 56 : 56,
        vipLevel: vipLevelInput ? vipLevelInput.value : '8',
        vipText: vipTextInput ? vipTextInput.value : '+31,737 UP V9',
        showGridTags: chkGridTags ? chkGridTags.checked : false,
        frameSettings: JSON.parse(JSON.stringify(frameSettings)),
        badgeSettings: JSON.parse(JSON.stringify(badgeSettings)),
        slotsData: slotsData.map(s => ({
            id: s.id,
            label: s.label,
            scale: s.scale || 1,
            rotate: s.rotate || 0,
            offsetX: s.offsetX || 0,
            offsetY: s.offsetY || 0,
            tag: s.tag || '',
            breakthrough: !!s.breakthrough,
            colSpan: s.colSpan || 1,
            rowSpan: s.rowSpan || 1,
            imgSrc: s.img ? (s.img.src || null) : null
        })),
        overlayElements: overlayElements.map(o => ({
            id: o.id,
            type: o.type,
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
            opacity: o.opacity,
            zIndex: o.zIndex,
            rotation: o.rotation || 0,
            flipH: !!o.flipH,
            text: o.text || '',
            fontSize: o.fontSize || 24,
            fontColor: o.fontColor || '#ffffff',
            fontBold: !!o.fontBold,
            fontShadow: !!o.fontShadow,
            imgSrc: (o.type === 'image' && o.img) ? (o.img.src || null) : null
        }))
    };
}

function autoSaveProject() {
    try {
        const snapshot = getProjectSnapshot();
        localStorage.setItem('ACC_STUDIO_CURRENT_PROJECT', JSON.stringify(snapshot));
    } catch (e) {
        console.warn('Cannot auto save to localStorage:', e);
    }
}

function loadProjectSnapshot(snapshot) {
    if (!snapshot) return;

    if (snapshot.template) {
        currentTemplate = snapshot.template;
        document.querySelectorAll('.tpl-btn').forEach(btn => {
            btn.classList.remove('active', 'border-amber-500', 'bg-amber-500/10');
            btn.classList.add('border-slate-700', 'bg-slate-800/40');
        });
        const selectedBtn = document.getElementById(`tpl_${currentTemplate}`);
        if (selectedBtn) {
            selectedBtn.classList.add('active', 'border-amber-500', 'bg-amber-500/10');
        }
    }

    const colsInput = document.getElementById('inpColsPerRow');
    if (colsInput && snapshot.colsPerRow) colsInput.value = snapshot.colsPerRow;

    const skinInput = document.getElementById('inpSkinCount');
    if (skinInput && snapshot.skinCount) skinInput.value = snapshot.skinCount;

    const vipLevelInput = document.getElementById('inpVipLevel');
    if (vipLevelInput && snapshot.vipLevel !== undefined) vipLevelInput.value = snapshot.vipLevel;

    const vipTextInput = document.getElementById('inpVipText');
    if (vipTextInput && snapshot.vipText !== undefined) vipTextInput.value = snapshot.vipText;

    const chkGridTags = document.getElementById('chkShowGridTags');
    if (chkGridTags && snapshot.showGridTags !== undefined) chkGridTags.checked = snapshot.showGridTags;

    if (snapshot.frameSettings) frameSettings = JSON.parse(JSON.stringify(snapshot.frameSettings));
    if (snapshot.badgeSettings) badgeSettings = JSON.parse(JSON.stringify(snapshot.badgeSettings));

    // Update UI controls for badge & frame settings
    const chkBadge = document.getElementById('chkShowVipBadge');
    const chkText  = document.getElementById('chkShowVipText');
    const clrText  = document.getElementById('clrVipText');
    if (chkBadge) chkBadge.checked = badgeSettings.showVipBadge;
    if (chkText)  chkText.checked  = badgeSettings.showVipText;
    if (clrText)  clrText.value    = badgeSettings.vipTextColor;

    const chkTopCards  = document.getElementById('chkFrameTopCards');
    const selTopStyle  = document.getElementById('selFrameTopStyle');
    const clrTopColor  = document.getElementById('clrFrameTopColor');
    const chkGridSkins = document.getElementById('chkFrameGridSkins');
    const selGridStyle = document.getElementById('selFrameGridStyle');
    const clrGridColor = document.getElementById('clrFrameGridColor');

    if (chkTopCards)  chkTopCards.checked  = frameSettings.topCards.enabled;
    if (selTopStyle)  selTopStyle.value    = frameSettings.topCards.style;
    if (clrTopColor)  clrTopColor.value    = frameSettings.topCards.color;
    if (chkGridSkins) chkGridSkins.checked = frameSettings.gridSkins.enabled;
    if (selGridStyle) selGridStyle.value   = frameSettings.gridSkins.style;
    if (clrGridColor) clrGridColor.value   = frameSettings.gridSkins.color;
    const rngGridWidth = document.getElementById('rngFrameGridWidth');
    const valGridWidth = document.getElementById('valFrameGridWidth');
    if (rngGridWidth && frameSettings.gridSkins.width !== undefined) {
        rngGridWidth.value = frameSettings.gridSkins.width;
        if (valGridWidth) valGridWidth.innerText = `${frameSettings.gridSkins.width}px`;
    }
    const rngGridGap = document.getElementById('rngFrameGridGap');
    const valGridGap = document.getElementById('valFrameGridGap');
    if (rngGridGap && frameSettings.gridSkins.gap !== undefined) {
        rngGridGap.value = frameSettings.gridSkins.gap;
        if (valGridGap) valGridGap.innerText = `${frameSettings.gridSkins.gap}px`;
    }

    // Restore slotsData
    if (Array.isArray(snapshot.slotsData)) {
        slotsData = snapshot.slotsData.map(s => {
            const item = {
                id: s.id,
                label: s.label,
                scale: s.scale || 1,
                rotate: s.rotate || 0,
                offsetX: s.offsetX || 0,
                offsetY: s.offsetY || 0,
                tag: s.tag || '',
                breakthrough: !!s.breakthrough,
                colSpan: s.colSpan || 1,
                rowSpan: s.rowSpan || 1,
                img: null
            };
            if (s.imgSrc) {
                const img = new Image();
                img.onload = () => { updateRender(); };
                img.src = s.imgSrc;
                item.img = img;
            }
            return item;
        });
    }

    // Restore overlayElements
    if (Array.isArray(snapshot.overlayElements)) {
        overlayElements = snapshot.overlayElements.map(o => {
            const item = { ...o, img: null };
            if (o.type === 'image' && o.imgSrc) {
                const img = new Image();
                img.onload = () => { updateRender(); };
                img.src = o.imgSrc;
                item.img = img;
            }
            return item;
        });
    }

    renderSlotControls();
    renderOverlayControls();
    updateRender();
    if (window.saveHistoryState) saveHistoryState();
}

function loadProjectFromLocalStorage() {
    try {
        const saved = localStorage.getItem('ACC_STUDIO_CURRENT_PROJECT');
        if (saved) {
            const snapshot = JSON.parse(saved);
            loadProjectSnapshot(snapshot);
            showToast("Đã tự động khôi phục dự án gần nhất!");
            return true;
        }
    } catch (e) {
        console.warn('Error loading backup from localStorage:', e);
    }
    return false;
}

function exportProjectFile() {
    const snapshot = getProjectSnapshot();
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const vipInput = document.getElementById('inpVipLevel');
    const vip = vipInput ? vipInput.value || 'VIP' : 'VIP';
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ghep_Banner_Acc_Project_VIP${vip}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    autoSaveProject();
    showToast("💾 Đã tải file Dự Án (.json) về máy! Bạn có thể Mở lại file này bất cứ lúc nào.");
}

function triggerImportProject() {
    const input = document.getElementById('projectFileInput');
    if (input) input.click();
}

function handleProjectFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const snapshot = JSON.parse(evt.target.result);
            loadProjectSnapshot(snapshot);
            autoSaveProject();
            showToast("📂 Đã nạp dữ liệu dự án từ file JSON thành công!");
        } catch (err) {
            showToast("⚠️ File project không hợp lệ!");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.innerText = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); }, 2500);
}

function copyToClipboard(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText || el.value)
        .then(() => showToast("Đã copy prompt vào clipboard!"))
        .catch(() => showToast("Không thể copy. Vui lòng copy thủ công."));
}

// setPromptColor is defined in prompts.js


// --- SLOT MERGING & SPAN SYSTEM ---
function updateSlotSpan(index, spanStr) {
    if (!slotsData[index]) return;
    const parts = spanStr.split('x');
    const cSpan = Math.max(1, parseInt(parts[0]) || 1);
    const rSpan = Math.max(1, parseInt(parts[1]) || 1);
    
    slotsData[index].colSpan = cSpan;
    slotsData[index].rowSpan = rSpan;
    
    renderSlotControls();
    updateRender();
    if (window.saveHistoryState) saveHistoryState();
    showToast(`Đã đổi kích thước ô Slot #${index + 1} thành ${cSpan}×${rSpan}!`);
}

function openMergeSlotsModal() {
    const modal = document.getElementById('mergeSlotsModal');
    if (modal) {
        renderMergeModalSlotsList();
        modal.classList.remove('hidden');
    }
}

function closeMergeSlotsModal() {
    const modal = document.getElementById('mergeSlotsModal');
    if (modal) modal.classList.add('hidden');
}

function resetAllSlotSpans() {
    slotsData.forEach(s => {
        s.colSpan = 1;
        s.rowSpan = 1;
    });
    renderSlotControls();
    renderMergeModalSlotsList();
    updateRender();
    if (window.saveHistoryState) saveHistoryState();
    showToast("Đã đặt lại tất cả ô về kích thước 1×1 mặc định!");
}

function applyMergePreset(preset) {
    const firstGridIdx = slotsData.findIndex(s => s.id.startsWith('grid_skins_'));
    if (firstGridIdx === -1) return;

    if (preset === 'top_item_2x2') {
        slotsData[firstGridIdx].colSpan = 2;
        slotsData[firstGridIdx].rowSpan = 2;
    } else if (preset === 'top_banner_3x1') {
        slotsData[firstGridIdx].colSpan = 3;
        slotsData[firstGridIdx].rowSpan = 1;
    } else if (preset === 'combo_showcase') {
        slotsData[firstGridIdx].colSpan = 2;
        slotsData[firstGridIdx].rowSpan = 2;
        if (slotsData[firstGridIdx + 3]) {
            slotsData[firstGridIdx + 3].colSpan = 2;
            slotsData[firstGridIdx + 3].rowSpan = 1;
        }
    }
    renderSlotControls();
    renderMergeModalSlotsList();
    updateRender();
    if (window.saveHistoryState) saveHistoryState();
    showToast("Đã áp dụng mẫu bố cục ô gộp!");
}

function renderMergeModalSlotsList() {
    const container = document.getElementById('mergeSlotsListContainer');
    if (!container) return;
    container.innerHTML = '';

    const skinSlots = slotsData.map((s, idx) => ({ ...s, originalIndex: idx }))
                               .filter(s => s.id.startsWith('grid_skins_'));

    skinSlots.forEach((slot) => {
        const idx = slot.originalIndex;
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs";
        
        const spanVal = `${slot.colSpan || 1}x${slot.rowSpan || 1}`;

        div.innerHTML = `
            <div class="flex items-center gap-2 truncate">
                <span class="font-bold text-amber-300 shrink-0">Slot #${idx + 1}</span>
                <span class="text-slate-300 truncate">${slot.label}</span>
            </div>
            <select onchange="updateSlotSpan(${idx}, this.value); renderMergeModalSlotsList();" class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none">
                <option value="1x1" ${spanVal === '1x1' ? 'selected' : ''}>1×1 (Mặc định)</option>
                <option value="2x1" ${spanVal === '2x1' ? 'selected' : ''}>2×1 (Ngang)</option>
                <option value="1x2" ${spanVal === '1x2' ? 'selected' : ''}>1×2 (Dọc)</option>
                <option value="2x2" ${spanVal === '2x2' ? 'selected' : ''}>2×2 (Ô Lớn)</option>
                <option value="3x1" ${spanVal === '3x1' ? 'selected' : ''}>3×1 (Banner)</option>
                <option value="3x2" ${spanVal === '3x2' ? 'selected' : ''}>3×2 (Rộng)</option>
            </select>
        `;
        container.appendChild(div);
    });
}

// Tự động khởi tạo ứng dụng khi load xong script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTemplate('full_vip_6cards');
    });
} else {
    initTemplate('full_vip_6cards');
}
