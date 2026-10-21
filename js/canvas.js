// ─────────────────────────────────────────────────────────────────────────
// 2D GRID PLACEMENT & SPAN ENGINE
// ─────────────────────────────────────────────────────────────────────────
function computeGridPlacement(skinSlots, gridCols, itemW, itemH, gap) {
    const occupied = {};
    let maxRowUsed = 0;
    const positions = [];

    skinSlots.forEach((slot) => {
        const colSpan = Math.min(gridCols, Math.max(1, parseInt(slot.colSpan) || 1));
        const rowSpan = Math.max(1, parseInt(slot.rowSpan) || 1);

        let r = 0;
        let placed = false;

        while (!placed) {
            for (let c = 0; c <= gridCols - colSpan; c++) {
                let canFit = true;
                for (let dr = 0; dr < rowSpan; dr++) {
                    for (let dc = 0; dc < colSpan; dc++) {
                        if (occupied[`${r + dr},${c + dc}`]) {
                            canFit = false;
                            break;
                        }
                    }
                    if (!canFit) break;
                }

                if (canFit) {
                    for (let dr = 0; dr < rowSpan; dr++) {
                        for (let dc = 0; dc < colSpan; dc++) {
                            occupied[`${r + dr},${c + dc}`] = true;
                        }
                    }
                    positions.push({
                        slot: slot,
                        row: r,
                        col: c,
                        colSpan: colSpan,
                        rowSpan: rowSpan,
                        w: itemW * colSpan + (colSpan - 1) * gap,
                        h: itemH * rowSpan + (rowSpan - 1) * gap
                    });
                    maxRowUsed = Math.max(maxRowUsed, r + rowSpan);
                    placed = true;
                    break;
                }
            }
            if (!placed) r++;
        }
    });

    return { positions, maxRows: maxRowUsed };
}

/**
 * Canvas Rendering Engine
 * Features: Multi-Template Shop Layouts, Badge/Text toggle+color, 3D Breakthrough per-slot, Frame System, Overlay Elements
 */

function getRequiredCanvasHeight() {
    const canvas = document.getElementById('mainCanvas');
    const w = canvas ? canvas.width : 720;
    const colsPerRowInput = document.getElementById('inpColsPerRow');
    const gridCols = colsPerRowInput ? Math.max(1, parseInt(colsPerRowInput.value) || 6) : 6;

    // Dynamic skin grid metrics
    const skinSlots  = slotsData.filter(s => s.id.startsWith('grid_skins_'));
    const gap        = (typeof frameSettings !== 'undefined' && frameSettings.gridSkins && frameSettings.gridSkins.gap !== undefined) ? frameSettings.gridSkins.gap : 3;
    const itemW      = (w - 16 - (gridCols - 1) * gap) / gridCols;
    const itemH      = itemW * 1.35;
    const { maxRows } = computeGridPlacement(skinSlots, gridCols, itemW, itemH, gap);
    const gridHeight = maxRows > 0 ? maxRows * (itemH + gap) : 0;

    // Calculate required canvas height based on template
    let topSectionHeight = 475; // Default for Full VIP
    if (currentTemplate === 'split_50_50') {
        topSectionHeight = 420;
    } else if (currentTemplate === 'shop_vip_banner') {
        topSectionHeight = 400;
    } else if (currentTemplate === 'solo_spotlight') {
        topSectionHeight = 430;
    } else if (currentTemplate === 'minimal_shop') {
        topSectionHeight = 220;
    }

    return Math.max(500, topSectionHeight + gridHeight + 16);
}

window.canvasSlotBounds = [];

function registerCanvasSlotBound(slot, x, y, w, h) {
    if (!slot || !window.canvasSlotBounds) return;
    const index = slotsData.indexOf(slot);
    if (index !== -1) {
        window.canvasSlotBounds.push({
            slot,
            index,
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(w),
            h: Math.round(h)
        });
    }
}
window.registerCanvasSlotBound = registerCanvasSlotBound;

function renderSceneToContext(ctx, w, h, isExport = false) {
    if (!isExport) {
        window.canvasSlotBounds = [];
    }
    const showGridTagsChk = document.getElementById('chkShowGridTags');
    const colsPerRowInput = document.getElementById('inpColsPerRow');

    const showGridTags = showGridTagsChk ? showGridTagsChk.checked : false;
    const gridCols    = colsPerRowInput ? Math.max(1, parseInt(colsPerRowInput.value) || 6) : 6;

    const gap        = (typeof frameSettings !== 'undefined' && frameSettings.gridSkins && frameSettings.gridSkins.gap !== undefined) ? frameSettings.gridSkins.gap : 3;
    const itemW      = (w - 16 - (gridCols - 1) * gap) / gridCols;
    const itemH      = itemW * 1.35;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    // Dispatch to specific template renderer
    if (currentTemplate === 'split_50_50') {
        renderSplit5050Layout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap);
    } else if (currentTemplate === 'shop_vip_banner') {
        renderShopVipBannerLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap);
    } else if (currentTemplate === 'solo_spotlight') {
        renderSoloSpotlightLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap);
    } else if (currentTemplate === 'minimal_shop') {
        renderMinimalShopLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap);
    } else {
        renderFullVipLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap);
    }

    // Overlay elements drawn on top
    renderAllOverlays(ctx, w, h, isExport);

    // HUY HIỆU VIP LUÔN NỔI LÊN TRÊN CÙNG (KHÔNG BỊ BẤT KỲ ẢNH NÀO CHE KHUẤT)
    if (typeof drawFreeVipBadge === 'function') {
        drawFreeVipBadge(ctx, w, h, isExport);
    }
}

function updateRender() {
    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;

    const requiredHeight = getRequiredCanvasHeight();
    if (canvas.height !== requiredHeight) canvas.height = requiredHeight;

    renderSceneToContext(ctx, w, canvas.height, false);
    if (typeof updateValuationWidget === 'function') updateValuationWidget();
}

// Export for app.js and window scope
window.getRequiredCanvasHeight = getRequiredCanvasHeight;
window.renderSceneToContext = renderSceneToContext;

// ─────────────────────────────────────────────────────────────────────────
//  1. FULL VIP LAYOUT (2-pass breakthrough for hero cards)
// ─────────────────────────────────────────────────────────────────────────
function renderFullVipLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap) {
    const headerSlot = slotsData[0];
    const headerH = 135;
    registerCanvasSlotBound(headerSlot, 0, 0, w, headerH);
    if (headerSlot && headerSlot.img) {
        drawCustomSlotImage(ctx, headerSlot, 0, 0, w, headerH);
    } else {
        const headGrad = ctx.createLinearGradient(0, 0, 0, headerH);
        headGrad.addColorStop(0, '#1e1b4b');
        headGrad.addColorStop(0.5, '#311042');
        headGrad.addColorStop(1, '#080c14');
        ctx.fillStyle = headGrad;
        ctx.fillRect(0, 0, w, headerH);
    }

    const cardW    = 108;
    const cardH    = 158;
    const cardGap  = 8;
    const topStartX = (w - (6 * cardW + 5 * cardGap)) / 2;
    const topStartY = 108;

    const breakthroughQueue = [];

    for (let i = 0; i < 6; i++) {
        const cx   = topStartX + i * (cardW + cardGap);
        const slot = slotsData[1 + i];
        registerCanvasSlotBound(slot, cx, topStartY, cardW, cardH);
        drawTopNeonCard(ctx, cx, topStartY, cardW, cardH, slot);

        if (slot && slot.breakthrough && slot.img) {
            breakthroughQueue.push({ slot, cx, cy: topStartY });
        }
    }

    const midY   = topStartY + cardH + 16;
    const statsW = 470;
    const midH   = 185;

    const statsSlot = slotsData[7];
    registerCanvasSlotBound(statsSlot, 8, midY, statsW, midH);
    if (statsSlot && statsSlot.img) {
        drawCustomSlotImage(ctx, statsSlot, 8, midY, statsW, midH);
    } else {
        drawDefaultStatsPanel(ctx, 8, midY, statsW, midH);
    }

    const portX   = statsW + 12;
    const portW   = w - portX - 8;
    const portSlot = slotsData[8];
    registerCanvasSlotBound(portSlot, portX, midY, portW, midH);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(portX, midY, portW, midH, 4);
    ctx.clip();
    if (portSlot && portSlot.img) {
        drawCustomSlotImage(ctx, portSlot, portX, midY, portW, midH);
    } else {
        ctx.fillStyle = '#1e1b2e';
        ctx.fillRect(portX, midY, portW, midH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 12px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ảnh Chân Dung', portX + portW / 2, midY + midH / 2);
    }
    ctx.restore();

    drawTornDivider(ctx, portX - 3, midY, midH);

    const gridStartY = midY + midH + 12;
    renderGridSkins(ctx, w, gridStartY, itemW, itemH, gridCols, gap, showGridTags);

    breakthroughQueue.forEach(({ slot, cx, cy }) => {
        drawBreakthroughOverflow(ctx, slot, cx, cy, cardW, cardH);
    });
}

// ─────────────────────────────────────────────────────────────────────────
//  2. LAYOUT CHIA 2 NỬA (50 / 50 Profile Top & Skins Bottom)
// ─────────────────────────────────────────────────────────────────────────
function renderSplit5050Layout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap) {
    const headerH = 100;
    const headerSlot = slotsData[0];
    registerCanvasSlotBound(headerSlot, 0, 0, w, headerH);
    if (headerSlot && headerSlot.img) {
        drawCustomSlotImage(ctx, headerSlot, 0, 0, w, headerH);
    } else {
        const headGrad = ctx.createLinearGradient(0, 0, 0, headerH);
        headGrad.addColorStop(0, '#0f172a');
        headGrad.addColorStop(1, '#080c14');
        ctx.fillStyle = headGrad;
        ctx.fillRect(0, 0, w, headerH);
    }

    // Full Profile Screenshot Slot (Nửa Trên)
    const profileSlot = slotsData[1];
    const profX = 12;
    const profY = 95;
    const profW = w - 24;
    const profH = 300;
    registerCanvasSlotBound(profileSlot, profX, profY, profW, profH);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(profX, profY, profW, profH, 8);
    ctx.clip();

    if (profileSlot && profileSlot.img) {
        drawCustomSlotImage(ctx, profileSlot, profX, profY, profW, profH);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(profX, profY, profW, profH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 15px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nạp Ảnh Profile In-Game / Thông Số Account (Nửa Trên)', profX + profW / 2, profY + profH / 2);
    }
    ctx.restore();

    if (frameSettings.topCards.enabled) {
        drawFrameStyle(ctx, profX, profY, profW, profH, frameSettings.topCards.style, frameSettings.topCards.color, 8);
    }

    // Dynamic Skin Grid below
    const gridStartY = profY + profH + 16;
    renderGridSkins(ctx, w, gridStartY, itemW, itemH, gridCols, gap, showGridTags);
}

// ─────────────────────────────────────────────────────────────────────────
//  3. SHOP VIP BANNER LAYOUT (Trái: Profile In-Game, Phải: 2 Tướng Hot + Stats)
// ─────────────────────────────────────────────────────────────────────────
function renderShopVipBannerLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap) {
    const headerH = 90;
    const headerSlot = slotsData[0];
    registerCanvasSlotBound(headerSlot, 0, 0, w, headerH);
    if (headerSlot && headerSlot.img) {
        drawCustomSlotImage(ctx, headerSlot, 0, 0, w, headerH);
    } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, headerH);
    }

    const topStartY = 85;
    // Left: Profile Slot
    const profSlot = slotsData[1];
    const profW = 340;
    const profH = 295;
    const profX = 12;
    registerCanvasSlotBound(profSlot, profX, topStartY, profW, profH);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(profX, topStartY, profW, profH, 6);
    ctx.clip();
    if (profSlot && profSlot.img) {
        drawCustomSlotImage(ctx, profSlot, profX, topStartY, profW, profH);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(profX, topStartY, profW, profH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 12px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ảnh Profile In-Game (Trái)', profX + profW / 2, topStartY + profH / 2);
    }
    ctx.restore();
    if (frameSettings.topCards.enabled) {
        drawFrameStyle(ctx, profX, topStartY, profW, profH, frameSettings.topCards.style, frameSettings.topCards.color, 6);
    }

    // Right: 2 Hot Hero Cards
    const cardW = 168;
    const cardH = 180;
    const card1X = profX + profW + 12;
    const card2X = card1X + cardW + 8;

    const hero1 = slotsData[2];
    const hero2 = slotsData[3];
    registerCanvasSlotBound(hero1, card1X, topStartY, cardW, cardH);
    registerCanvasSlotBound(hero2, card2X, topStartY, cardW, cardH);
    drawTopNeonCard(ctx, card1X, topStartY, cardW, cardH, hero1);
    drawTopNeonCard(ctx, card2X, topStartY, cardW, cardH, hero2);

    // Right Bottom: Stats Panel
    const statsSlot = slotsData[4];
    const statsX = card1X;
    const statsY = topStartY + cardH + 8;
    const statsW = w - statsX - 12;
    const statsH = profH - cardH - 8;
    registerCanvasSlotBound(statsSlot, statsX, statsY, statsW, statsH);

    if (statsSlot && statsSlot.img) {
        drawCustomSlotImage(ctx, statsSlot, statsX, statsY, statsW, statsH);
    } else {
        drawDefaultStatsPanel(ctx, statsX, statsY, statsW, statsH);
    }

    const gridStartY = topStartY + profH + 16;
    renderGridSkins(ctx, w, gridStartY, itemW, itemH, gridCols, gap, showGridTags);
}

// ─────────────────────────────────────────────────────────────────────────
//  4. SOLO SPOTLIGHT LAYOUT (1 Hero Lớn Trung Tâm + 4 Hero Nhỏ)
// ─────────────────────────────────────────────────────────────────────────
function renderSoloSpotlightLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap) {
    const headerH = 100;
    const headerSlot = slotsData[0];
    registerCanvasSlotBound(headerSlot, 0, 0, w, headerH);
    if (headerSlot && headerSlot.img) {
        drawCustomSlotImage(ctx, headerSlot, 0, 0, w, headerH);
    } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, headerH);
    }

    const topStartY = 95;
    // Center: Big Main Hero
    const mainW = 210;
    const mainH = 200;
    const mainX = (w - mainW) / 2;
    const mainHero = slotsData[1];
    registerCanvasSlotBound(mainHero, mainX, topStartY, mainW, mainH);

    drawTopNeonCard(ctx, mainX, topStartY, mainW, mainH, mainHero);

    // Left 2 side heroes
    const subW = 110;
    const subH = 140;
    registerCanvasSlotBound(slotsData[2], 12, topStartY + 30, subW, subH);
    registerCanvasSlotBound(slotsData[3], 128, topStartY + 30, subW, subH);
    drawTopNeonCard(ctx, 12, topStartY + 30, subW, subH, slotsData[2]);
    drawTopNeonCard(ctx, 128, topStartY + 30, subW, subH, slotsData[3]);

    // Right 2 side heroes
    registerCanvasSlotBound(slotsData[4], w - 128 - subW, topStartY + 30, subW, subH);
    registerCanvasSlotBound(slotsData[5], w - 12 - subW, topStartY + 30, subW, subH);
    drawTopNeonCard(ctx, w - 128 - subW, topStartY + 30, subW, subH, slotsData[4]);
    drawTopNeonCard(ctx, w - 12 - subW, topStartY + 30, subW, subH, slotsData[5]);

    // Bottom Stats Panel
    const statsSlot = slotsData[6];
    const statsY = topStartY + mainH + 10;
    const statsW = w - 24;
    const statsH = 110;
    registerCanvasSlotBound(statsSlot, 12, statsY, statsW, statsH);
    if (statsSlot && statsSlot.img) {
        drawCustomSlotImage(ctx, statsSlot, 12, statsY, statsW, statsH);
    } else {
        drawDefaultStatsPanel(ctx, 12, statsY, statsW, statsH);
    }

    const gridStartY = statsY + statsH + 16;
    renderGridSkins(ctx, w, gridStartY, itemW, itemH, gridCols, gap, showGridTags);
}

// ─────────────────────────────────────────────────────────────────────────
//  5. MINIMAL SHOP LAYOUT (Header Rút Gọn + Lưới Skin)
// ─────────────────────────────────────────────────────────────────────────
function renderMinimalShopLayout(ctx, w, h, showGridTags, itemW, itemH, gridCols, gap) {
    const headerH = 75;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, headerH);

    // Stats / Compact Profile Banner
    const statsSlot = slotsData[1];
    const statsY = 75;
    const statsW = w - 24;
    const statsH = 130;
    registerCanvasSlotBound(statsSlot, 12, statsY, statsW, statsH);
    if (statsSlot && statsSlot.img) {
        drawCustomSlotImage(ctx, statsSlot, 12, statsY, statsW, statsH);
    } else {
        drawDefaultStatsPanel(ctx, 12, statsY, statsW, statsH);
    }

    const gridStartY = statsY + statsH + 14;
    renderGridSkins(ctx, w, gridStartY, itemW, itemH, gridCols, gap, showGridTags);
}

// ─────────────────────────────────────────────────────────────────────────
//  GRID SKINS HELPER
// ─────────────────────────────────────────────────────────────────────────
function renderGridSkins(ctx, w, gridStartY, itemW, itemH, gridCols, gap, showGridTags) {
    const skinSlots  = slotsData.filter(s => s.id.startsWith('grid_skins_'));
    if (skinSlots.length === 0) return;

    const { positions } = computeGridPlacement(skinSlots, gridCols, itemW, itemH, gap);

    // Pass 1: Render toàn bộ ảnh nền của các ô và đăng ký bounds
    positions.forEach((pos) => {
        const gx = 8 + pos.col * (itemW + gap);
        const gy = gridStartY + pos.row * (itemH + gap);
        registerCanvasSlotBound(pos.slot, gx, gy, pos.w, pos.h);
        drawSkinSlotContent(ctx, gx, gy, pos.w, pos.h, pos.slot);
    });

    // Pass 2: Render toàn bộ khung viền (độ dày tuỳ chỉnh) và tags đè lên trên cùng
    positions.forEach((pos) => {
        const gx = 8 + pos.col * (itemW + gap);
        const gy = gridStartY + pos.row * (itemH + gap);
        drawSkinSlotBorderAndTag(ctx, gx, gy, pos.w, pos.h, pos.slot, showGridTags);
    });
}

function drawSkinMiniCard(ctx, x, y, w, h, slot, showGridTags) {
    drawSkinSlotContent(ctx, x, y, w, h, slot);
    drawSkinSlotBorderAndTag(ctx, x, y, w, h, slot, showGridTags);
}

// ─────────────────────────────────────────────────────────────────────────
//  3D BREAKTHROUGH OVERFLOW RENDER
// ─────────────────────────────────────────────────────────────────────────
function drawTopNeonCard(ctx, x, y, w, h, slot) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.clip();

    if (slot && slot.img) {
        if (slot.breakthrough) {
            drawCardImageBottomAnchored(ctx, slot, x, y, w, h);
        } else {
            drawCustomSlotImage(ctx, slot, x, y, w, h);
        }
    } else {
        ctx.fillStyle = '#161329';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#64748b';
        ctx.font = '600 11px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Thêm Tướng', x + w/2, y + h/2);
    }
    ctx.restore();

    if (frameSettings.topCards.enabled) {
        drawFrameStyle(ctx, x, y, w, h, frameSettings.topCards.style, frameSettings.topCards.color, 6);
    }
}

function drawCardImageBottomAnchored(ctx, slot, cx, cy, cw, ch) {
    const img       = slot.img;
    const userScale = slot.scale  || 1;
    const offX      = slot.offsetX || 0;
    const offY      = slot.offsetY || 0;

    const imgAspect = img.width / img.height;
    const renderW   = cw * Math.max(1, userScale);
    const renderH   = renderW / imgAspect;

    const imgLeft = cx + (cw - renderW) / 2 + offX;
    const imgTop  = cy + ch - renderH + offY;

    ctx.drawImage(img, imgLeft, imgTop, renderW, renderH);
}

function drawBreakthroughOverflow(ctx, slot, cx, cy, cw, ch) {
    const img = slot.img;
    if (!img) return;

    const userScale = slot.scale  || 1;
    const offX      = slot.offsetX || 0;
    const offY      = slot.offsetY || 0;

    const imgAspect = img.width / img.height;
    const renderW = cw * Math.max(1, userScale);
    const renderH = renderW / imgAspect;

    const imgLeft = cx + (cw - renderW) / 2 + offX;
    const imgTop  = cy + ch - renderH + offY;

    if (imgTop >= cy) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, 0, cw, cy);
    ctx.clip();

    ctx.drawImage(img, imgLeft, imgTop, renderW, renderH);
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
//  FRAME DRAWING SYSTEM
// ─────────────────────────────────────────────────────────────────────────
function drawFrameStyle(ctx, x, y, w, h, style, color, radius, customLineWidth) {
    radius = radius || 6;
    const lw = (customLineWidth !== undefined && customLineWidth !== null) ? customLineWidth : 3;
    const halfLw = lw / 2;
    const innerX = x + halfLw;
    const innerY = y + halfLw;
    const innerW = Math.max(1, w - lw);
    const innerH = Math.max(1, h - lw);
    const innerRadius = Math.max(1, radius - halfLw);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerW, innerH, innerRadius);

    switch (style) {
        case 'gold_royal': {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = lw;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = Math.min(16, lw * 4);
            ctx.stroke();
            if (innerW > lw * 2 + 4 && innerH > lw * 2 + 4) {
                ctx.beginPath();
                ctx.roundRect(innerX + lw, innerY + lw, innerW - lw * 2, innerH - lw * 2, Math.max(1, innerRadius - lw));
                ctx.strokeStyle = '#92400e';
                ctx.lineWidth = Math.max(1, lw * 0.4);
                ctx.shadowBlur = 0;
                ctx.stroke();
            }
            const corners = [[x, y], [x+w, y], [x+w, y+h], [x, y+h]];
            ctx.fillStyle = '#fbbf24';
            corners.forEach(([px, py]) => {
                ctx.beginPath();
                ctx.arc(px, py, Math.max(2, lw + 1), 0, Math.PI * 2);
                ctx.fill();
            });
            break;
        }
        case 'cyberpunk': {
            const cut = Math.min(10, Math.max(4, Math.floor(w * 0.1)));
            ctx.beginPath();
            ctx.moveTo(innerX + cut, innerY);
            ctx.lineTo(innerX + innerW - cut, innerY);
            ctx.lineTo(innerX + innerW, innerY + cut);
            ctx.lineTo(innerX + innerW, innerY + innerH - cut);
            ctx.lineTo(innerX + innerW - cut, innerY + innerH);
            ctx.lineTo(innerX + cut, innerY + innerH);
            ctx.lineTo(innerX, innerY + innerH - cut);
            ctx.lineTo(innerX, innerY + cut);
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.shadowColor = color;
            ctx.shadowBlur = Math.min(18, lw * 4);
            ctx.setLineDash([6, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
        }
        case 'diamond': {
            const grad = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
            grad.addColorStop(0,    '#e0e7ff');
            grad.addColorStop(0.25, '#a5b4fc');
            grad.addColorStop(0.5,  '#ffffff');
            grad.addColorStop(0.75, '#818cf8');
            grad.addColorStop(1,    '#c7d2fe');
            ctx.strokeStyle = grad;
            ctx.lineWidth = lw;
            ctx.shadowColor = '#a5b4fc';
            ctx.shadowBlur = Math.min(14, lw * 3);
            ctx.stroke();
            break;
        }
        case 'rainbow': {
            const rGrad = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
            rGrad.addColorStop(0,    '#ff0000');
            rGrad.addColorStop(0.17, '#ff8800');
            rGrad.addColorStop(0.33, '#ffff00');
            rGrad.addColorStop(0.50, '#00ff00');
            rGrad.addColorStop(0.67, '#0088ff');
            rGrad.addColorStop(0.83, '#8800ff');
            rGrad.addColorStop(1,    '#ff0000');
            ctx.strokeStyle = rGrad;
            ctx.lineWidth = lw;
            ctx.shadowBlur = Math.min(12, lw * 3);
            ctx.shadowColor = '#ffffff88';
            ctx.stroke();
            break;
        }
        case 'simple': {
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.shadowBlur = 0;
            ctx.stroke();
            break;
        }
        default: // simple_neon
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.shadowColor = color;
            ctx.shadowBlur = Math.min(16, lw * 4);
            ctx.stroke();
            break;
    }
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
//  SKIN MINI CARD (Two-pass separation for perfect border rendering)
// ─────────────────────────────────────────────────────────────────────────
function drawSkinSlotContent(ctx, x, y, w, h, slot) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.clip();

    if (slot && slot.img) {
        drawCustomSlotImage(ctx, slot, x, y, w, h);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#475569';
        ctx.font = '10px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+Ảnh', x + w/2, y + h/2);
    }
    ctx.restore();
}

function drawSkinSlotBorderAndTag(ctx, x, y, w, h, slot, showGridTags) {
    const skinBorderWidth = (typeof frameSettings !== 'undefined' && frameSettings.gridSkins && frameSettings.gridSkins.width !== undefined) 
        ? frameSettings.gridSkins.width 
        : 3;

    if (frameSettings.gridSkins.enabled) {
        drawFrameStyle(ctx, x, y, w, h, frameSettings.gridSkins.style, frameSettings.gridSkins.color, 3, skinBorderWidth);
    } else {
        const halfLw = skinBorderWidth / 2;
        ctx.save();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = skinBorderWidth;
        ctx.strokeRect(x + halfLw, y + halfLw, Math.max(1, w - skinBorderWidth), Math.max(1, h - skinBorderWidth));
        ctx.restore();
    }

    if (showGridTags && slot && slot.tag) {
        ctx.save();
        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        ctx.fillRect(x, y, w, 14);
        ctx.font = '800 8px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(slot.tag, x + w/2, y + 10);
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────────────────
//  OVERLAY ELEMENTS RENDER
// ─────────────────────────────────────────────────────────────────────────
let selectedOverlayId = null;
let isDraggingOverlay = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function renderAllOverlays(ctx, cw, ch, isExport = false) {
    const sorted = [...overlayElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    sorted.forEach(el => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, el.opacity || 1));

        const px = (el.x / 100) * cw;
        const py = (el.y / 100) * ch;

        if (el.type === 'image' && el.img) {
            const pw = (el.width / 100) * cw;
            const aspect = el.img.width / el.img.height;
            const ph = pw / aspect;

            const cx = px + pw / 2;
            const cy = py + ph / 2;

            ctx.translate(cx, cy);
            if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
            if (el.flipH) ctx.scale(-1, 1);

            const bRadius = el.hasFrame ? (el.borderRadius !== undefined ? el.borderRadius : 6) : 0;
            if (bRadius > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(-pw / 2, -ph / 2, pw, ph, bRadius);
                ctx.clip();
                ctx.drawImage(el.img, -pw / 2, -ph / 2, pw, ph);
                ctx.restore();
            } else {
                ctx.drawImage(el.img, -pw / 2, -ph / 2, pw, ph);
            }

            if (el.hasFrame) {
                const fStyle = el.frameStyle || 'simple_neon';
                const fColor = el.frameColor || '#38bdf8';
                const fWidth = el.frameWidth !== undefined ? el.frameWidth : 3;
                drawFrameStyle(ctx, -pw / 2, -ph / 2, pw, ph, fStyle, fColor, bRadius, fWidth);
            }

            if (!isExport && selectedOverlayId === el.id) {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(-pw / 2 - 2, -ph / 2 - 2, pw + 4, ph + 4);
                ctx.setLineDash([]);
            }

        } else if (el.type === 'text') {
            const weight  = el.fontBold ? '900' : '400';
            const size    = Math.max(8, el.fontSize || 24);
            ctx.font      = `${weight} ${size}px Montserrat, sans-serif`;
            ctx.fillStyle = el.fontColor || '#ffffff';
            ctx.textAlign = 'left';

            if (el.fontShadow) {
                ctx.shadowColor   = 'rgba(0,0,0,0.85)';
                ctx.shadowBlur    = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }

            const textMetrics = ctx.measureText(el.text || ' ');
            const textW = Math.max(textMetrics.width, 30);
            const cx = px + textW / 2;
            const cy = py + size / 2;

            ctx.translate(cx, cy);
            if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.fillText(el.text || '', -textW / 2, size / 2 - 4);

            if (!isExport && selectedOverlayId === el.id) {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(-textW / 2 - 4, -size / 2 - 2, textW + 8, size + 8);
                ctx.setLineDash([]);
            }
        }
        ctx.restore();
    });
}

// ─────────────────────────────────────────────────────────────────────────
//  HUY HIỆU VIP TỰ DO (LUÔN NỔI LÊN TRÊN CÙNG NHẤT, KÉO THẢ TỰ DO)
// ─────────────────────────────────────────────────────────────────────────
let isDraggingVipBadge = false;
let isHoverVipBadge = false;
let vipDragOffsetX = 0;
let vipDragOffsetY = 0;

function getVipBadgeBounds(cw, ch) {
    if (!badgeSettings || !badgeSettings.showVipBadge) return null;
    const tier = badgeSettings.vipTier || 8;
    const sizeH = badgeSettings.vipBadgeSize || 65;
    const badgeImg = (window.vipBadgeCache && window.vipBadgeCache[tier]) ? window.vipBadgeCache[tier] : null;
    let aspect = 1.63; // Tỷ lệ chuẩn ảnh VIP Transparent (606x372)
    if (badgeImg && badgeImg.naturalWidth && badgeImg.naturalHeight) {
        aspect = badgeImg.naturalWidth / badgeImg.naturalHeight;
    }
    const renderH = sizeH;
    const renderW = renderH * aspect;
    const cx = ((badgeSettings.x !== undefined ? badgeSettings.x : 50) / 100) * cw;
    const cy = ((badgeSettings.y !== undefined ? badgeSettings.y : 4.2) / 100) * ch;

    return {
        cx, cy,
        w: renderW,
        h: renderH,
        x1: cx - renderW / 2,
        y1: cy - renderH / 2,
        x2: cx + renderW / 2,
        y2: cy + renderH / 2
    };
}
window.getVipBadgeBounds = getVipBadgeBounds;

function drawFreeVipBadge(ctx, w, h, isExport = false) {
    if (!badgeSettings || !badgeSettings.showVipBadge) return;
    const b = getVipBadgeBounds(w, h);
    if (!b) return;

    const tier = badgeSettings.vipTier || 8;
    const badgeImg = (window.vipBadgeCache && window.vipBadgeCache[tier]) ? window.vipBadgeCache[tier] : null;

    ctx.save();
    if (badgeImg && badgeImg.complete && badgeImg.naturalWidth > 0) {
        // Ánh sáng phát quang hoàng kim tương ứng từng bậc VIP
        const glowColor = tier >= 9 ? 'rgba(239, 68, 68, 0.85)' : (tier >= 7 ? 'rgba(251, 191, 36, 0.85)' : 'rgba(168, 85, 247, 0.75)');
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = Math.min(26, b.h * 0.4);

        ctx.drawImage(badgeImg, b.x1, b.y1, b.w, b.h);
    } else {
        // Fallback vẽ huy hiệu tròn dát vàng nếu file ảnh chưa kịp sẵn sàng
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.h * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.h * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `900 ${Math.round(b.h * 0.3)}px Montserrat, sans-serif`;
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`V${tier}`, b.cx, b.cy);
    }
    ctx.restore();

    // Viền nét đứt khi hover hoặc drag trực tiếp trên canvas (không vẽ khi xuất ảnh)
    if (!isExport && (isDraggingVipBadge || isHoverVipBadge)) {
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(b.x1 - 4, b.y1 - 4, b.w + 8, b.h + 8);

        if (isDraggingVipBadge) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = '#f59e0b';
            ctx.setLineDash([]);
            const tagText = `VIP ${tier} (X:${badgeSettings.x}%, Y:${badgeSettings.y}%)`;
            ctx.font = 'bold 11px Montserrat, sans-serif';
            const tw = ctx.measureText(tagText).width;
            const tagX = b.cx - tw / 2 - 6;
            const tagY = b.y1 - 22;
            ctx.beginPath();
            ctx.roundRect(tagX, tagY, tw + 12, 18, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tagText, b.cx, tagY + 9);
        }
        ctx.restore();
    }
}
window.drawFreeVipBadge = drawFreeVipBadge;

function setupCanvasOverlayInteractions() {
    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        const cw = canvas.width;
        const ch = canvas.height;

        // 1. ƯU TIÊN KIỂM TRA HIT TEST VỚI HUY HIỆU VIP (VÌ VIP LUÔN NẰM TRÊN CÙNG)
        const vipBounds = getVipBadgeBounds(cw, ch);
        if (vipBounds && cx >= vipBounds.x1 - 8 && cx <= vipBounds.x2 + 8 && cy >= vipBounds.y1 - 8 && cy <= vipBounds.y2 + 8) {
            isDraggingVipBadge = true;
            vipDragOffsetX = cx - vipBounds.cx;
            vipDragOffsetY = cy - vipBounds.cy;
            canvas.style.cursor = 'move';
            if (selectedOverlayId !== null) {
                selectedOverlayId = null;
                if (typeof renderOverlayControls === 'function') renderOverlayControls();
            }
            updateRender();
            return;
        }

        // 2. NẾU KHÔNG HIT VIP THÌ KIỂM TRA CÁC OVERLAY ELEMENTS
        const sorted = [...overlayElements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
        let hit = null;

        for (const el of sorted) {
            const px = (el.x / 100) * cw;
            const py = (el.y / 100) * ch;
            let pw = 0, ph = 0;

            if (el.type === 'image' && el.img) {
                pw = (el.width / 100) * cw;
                const aspect = el.img.width / el.img.height;
                ph = pw / aspect;
            } else if (el.type === 'text') {
                const size = Math.max(8, el.fontSize || 24);
                pw = (el.width / 100) * cw;
                ph = size * 1.4;
            }

            if (cx >= px - 10 && cx <= px + pw + 10 && cy >= py - 10 && cy <= py + ph + 10) {
                hit = el;
                dragOffsetX = cx - px;
                dragOffsetY = cy - py;
                break;
            }
        }

        if (hit) {
            selectedOverlayId = hit.id;
            isDraggingOverlay = true;
            canvas.style.cursor = 'move';
            updateRender();
            if (typeof renderOverlayControls === 'function') renderOverlayControls();
        } else {
            if (selectedOverlayId !== null) {
                selectedOverlayId = null;
                updateRender();
                if (typeof renderOverlayControls === 'function') renderOverlayControls();
            }

            // 3. NẾU KHÔNG HIT VIP/OVERLAY: Click chuột trái chọn nhanh ô slot tương ứng
            if (e.button === 0) {
                const bounds = window.canvasSlotBounds || [];
                for (let i = bounds.length - 1; i >= 0; i--) {
                    const b = bounds[i];
                    if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
                        if (typeof selectActiveSlot === 'function') {
                            selectActiveSlot(b.index);
                            const container = document.getElementById('slotsContainer');
                            if (container && container.children[b.index]) {
                                container.children[b.index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }
                        break;
                    }
                }
            }
        }
    });

    // BẮT SỰ KIỆN CHUỘT PHẢI (CONTEXTMENU) TRÊN CÁC Ô TRỰC TIẾP TRÊN CANVAS
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        const bounds = window.canvasSlotBounds || [];
        let hitSlot = null;
        for (let i = bounds.length - 1; i >= 0; i--) {
            const b = bounds[i];
            if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
                hitSlot = b;
                break;
            }
        }

        if (hitSlot) {
            if (typeof selectActiveSlot === 'function') {
                selectActiveSlot(hitSlot.index);
                const container = document.getElementById('slotsContainer');
                if (container && container.children[hitSlot.index]) {
                    container.children[hitSlot.index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
            if (typeof showSlotContextMenu === 'function') {
                showSlotContextMenu(hitSlot.index, e.clientX, e.clientY);
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        // Xử lý kéo thả Huy Hiệu VIP
        if (isDraggingVipBadge) {
            const targetCx = cx - vipDragOffsetX;
            const targetCy = cy - vipDragOffsetY;
            let newX = Math.round(((targetCx / canvas.width) * 100) * 10) / 10;
            let newY = Math.round(((targetCy / canvas.height) * 100) * 10) / 10;
            newX = Math.max(0, Math.min(100, newX));
            newY = Math.max(0, Math.min(100, newY));
            badgeSettings.x = newX;
            badgeSettings.y = newY;
            if (typeof syncVipBadgeUi === 'function') syncVipBadgeUi();
            updateRender();
            return;
        }

        // Xử lý kéo thả Overlays
        if (isDraggingOverlay && selectedOverlayId) {
            const el = overlayElements.find(item => item.id === selectedOverlayId);
            if (el) {
                const newPx = cx - dragOffsetX;
                const newPy = cy - dragOffsetY;
                el.x = Math.round(((newPx / canvas.width) * 100) * 10) / 10;
                el.y = Math.round(((newPy / canvas.height) * 100) * 10) / 10;

                updateRender();

                const inputX = document.getElementById(`inp_${el.id}_x`);
                const inputY = document.getElementById(`inp_${el.id}_y`);
                const lblX = document.getElementById(`lbl_${el.id}_x`);
                const lblY = document.getElementById(`lbl_${el.id}_y`);
                if (inputX) inputX.value = el.x;
                if (inputY) inputY.value = el.y;
                if (lblX) lblX.innerText = `${el.x}%`;
                if (lblY) lblY.innerText = `${el.y}%`;
            }
            return;
        }

        const cw = canvas.width;
        const ch = canvas.height;

        // Kiểm tra hover vào VIP Badge
        const vipBounds = getVipBadgeBounds(cw, ch);
        const isHoverVip = !!(vipBounds && cx >= vipBounds.x1 - 6 && cx <= vipBounds.x2 + 6 && cy >= vipBounds.y1 - 6 && cy <= vipBounds.y2 + 6);
        if (isHoverVip !== isHoverVipBadge) {
            isHoverVipBadge = isHoverVip;
            updateRender();
        }
        if (isHoverVip) {
            canvas.style.cursor = 'move';
            return;
        }

        // Kiểm tra hover vào Overlays
        let isHover = false;
        for (const el of overlayElements) {
            const px = (el.x / 100) * cw;
            const py = (el.y / 100) * ch;
            let pw = 0, ph = 0;
            if (el.type === 'image' && el.img) {
                pw = (el.width / 100) * cw;
                const aspect = el.img.width / el.img.height;
                ph = pw / aspect;
            } else if (el.type === 'text') {
                const size = Math.max(8, el.fontSize || 24);
                pw = (el.width / 100) * cw;
                ph = size * 1.4;
            }

            if (cx >= px && cx <= px + pw && cy >= py && cy <= py + ph) {
                isHover = true;
                break;
            }
        }
        canvas.style.cursor = isHover ? 'move' : 'default';
    });

    const stopDrag = () => {
        let hasChanged = false;
        if (isDraggingVipBadge) {
            isDraggingVipBadge = false;
            hasChanged = true;
        }
        if (isDraggingOverlay) {
            isDraggingOverlay = false;
            hasChanged = true;
        }
        canvas.style.cursor = 'default';
        if (hasChanged) {
            updateRender();
            if (window.saveHistoryState) saveHistoryState();
            if (window.autoSaveProject) autoSaveProject();
        }
    };

    canvas.addEventListener('mouseup', stopDrag);
    canvas.addEventListener('mouseleave', stopDrag);

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.classList.add('ring-4', 'ring-cyan-500');
    });

    canvas.addEventListener('dragleave', () => {
        canvas.classList.remove('ring-4', 'ring-cyan-500');
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('ring-4', 'ring-cyan-500');

        const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const dropX = (e.clientX - rect.left) * scaleX;
        const dropY = (e.clientY - rect.top) * scaleY;

        const posX = Math.round(((dropX - 50) / canvas.width) * 100 * 10) / 10;
        const posY = Math.round(((dropY - 50) / canvas.height) * 100 * 10) / 10;

        imageFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const newOverlay = {
                        id: `overlay_${window.overlayIdCounter ? window.overlayIdCounter++ : Date.now()}`,
                        type: 'image',
                        x: Math.max(0, Math.min(90, posX)),
                        y: Math.max(0, Math.min(90, posY)),
                        width: 30,
                        opacity: 1.0,
                        zIndex: 10 + overlayElements.length,
                        rotation: 0,
                        flipH: false,
                        hasFrame: false,
                        frameStyle: 'simple_neon',
                        frameColor: '#38bdf8',
                        frameWidth: 3,
                        borderRadius: 6,
                        img: img
                    };
                    overlayElements.push(newOverlay);
                    selectedOverlayId = newOverlay.id;
                    if (typeof renderOverlayControls === 'function') renderOverlayControls();
                    updateRender();
                    if (window.saveHistoryState) saveHistoryState();
                    if (window.autoSaveProject) autoSaveProject();
                    if (window.showToast) showToast('🎯 Đã chèn ảnh mới trực tiếp vào vị trí Canvas!');
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────
function drawCrownCrest(ctx, cx, cy, levelText) {
    const tier = (typeof badgeSettings !== 'undefined' && badgeSettings.vipTier) ? badgeSettings.vipTier : (parseInt(levelText) || 8);
    const sizeH = (typeof badgeSettings !== 'undefined' && badgeSettings.vipBadgeSize) ? badgeSettings.vipBadgeSize : 62;
    const offsetY = (typeof badgeSettings !== 'undefined' && badgeSettings.vipBadgeOffsetY) ? badgeSettings.vipBadgeOffsetY : 0;
    const targetY = cy + offsetY;

    const badgeImg = (window.vipBadgeCache && window.vipBadgeCache[tier]) ? window.vipBadgeCache[tier] : null;

    if (badgeImg && badgeImg.complete && badgeImg.naturalWidth > 0) {
        ctx.save();
        const aspect = badgeImg.naturalWidth / badgeImg.naturalHeight;
        const renderH = sizeH;
        const renderW = renderH * aspect;

        // Ánh sáng phát quang hoàng kim tương ứng từng bậc VIP
        const glowColor = tier >= 9 ? 'rgba(239, 68, 68, 0.75)' : (tier >= 7 ? 'rgba(251, 191, 36, 0.8)' : 'rgba(168, 85, 247, 0.7)');
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = Math.min(22, sizeH * 0.35);

        ctx.drawImage(badgeImg, cx - renderW / 2, targetY - renderH / 2, renderW, renderH);
        ctx.restore();
    } else {
        // Fallback vẽ huy hiệu tròn dát vàng nếu file ảnh chưa kịp sẵn sàng
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(cx, targetY, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(cx, targetY, 19, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '900 16px Montserrat, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(`V${tier}`, cx, targetY + 5);
        ctx.restore();
    }
}

function drawDefaultStatsPanel(ctx, x, y, w, h) {
    ctx.save();
    const bg = ctx.createLinearGradient(x, y, x + w, y + h);
    bg.addColorStop(0, '#0f2b66');
    bg.addColorStop(1, '#091c44');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Upload Ảnh Thông Số Account', x + w / 2, y + h / 2);
    ctx.restore();
}

function drawTornDivider(ctx, x, y, h) {
    ctx.save();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = y; i <= y + h; i += 12) {
        ctx.lineTo(x + Math.sin(i) * 3, i);
    }
    ctx.stroke();
    ctx.restore();
}

function drawCustomSlotImage(ctx, slot, destX, destY, destW, destH) {
    const img = slot.img;
    if (!img) return;
    ctx.save();

    const scale      = slot.scale  || 1;
    const offX       = slot.offsetX || 0;
    const offY       = slot.offsetY || 0;
    const imgAspect  = img.width / img.height;
    const destAspect = destW / destH;

    let renderW, renderH;
    if (imgAspect > destAspect) {
        renderH = destH * scale;
        renderW = renderH * imgAspect;
    } else {
        renderW = destW * scale;
        renderH = renderW / imgAspect;
    }

    const centerX = destX + destW / 2 + offX;
    const centerY = destY + destH / 2 + offY;
    ctx.drawImage(img, centerX - renderW / 2, centerY - renderH / 2, renderW, renderH);
    ctx.restore();
}
