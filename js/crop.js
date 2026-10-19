/**
 * Crop & Image Adjustment Modal Controller
 */

let activeCropSlotIndex = -1;
let cropState = { scale: 1, rotate: 0, offsetX: 0, offsetY: 0, isDragging: false, startX: 0, startY: 0 };

function openCropModal(index) {
    activeCropSlotIndex = index;
    const slot = slotsData[index];
    if (!slot || !slot.img) return;

    cropState.scale = slot.scale || 1;
    cropState.rotate = slot.rotate || 0;
    cropState.offsetX = slot.offsetX || 0;
    cropState.offsetY = slot.offsetY || 0;

    const cropZoom = document.getElementById('cropZoom');
    const cropRotate = document.getElementById('cropRotate');
    const cropModal = document.getElementById('cropModal');
    const titleEl = document.getElementById('cropModalTitle');

    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-crop-simple text-purple-400"></i> Điều Chỉnh Ảnh [Slot #${index + 1}: ${slot.label}]`;
    }

    if (cropZoom) cropZoom.value = cropState.scale;
    if (cropRotate) cropRotate.value = cropState.rotate;
    if (cropModal) cropModal.classList.remove('hidden');

    renderCropCanvas();
}

function closeCropModal() {
    const cropModal = document.getElementById('cropModal');
    if (cropModal) cropModal.classList.add('hidden');
    activeCropSlotIndex = -1;
}

function cropModalMoveSlot(direction) {
    if (activeCropSlotIndex < 0) return;
    saveCropAdjustment();
    const targetIdx = activeCropSlotIndex + direction;
    if (typeof moveSlotImage === 'function') {
        moveSlotImage(activeCropSlotIndex, direction);
    }
    if (targetIdx >= 0 && targetIdx < slotsData.length && slotsData[targetIdx] && slotsData[targetIdx].img) {
        openCropModal(targetIdx);
    } else {
        closeCropModal();
    }
}
window.cropModalMoveSlot = cropModalMoveSlot;

function onCropAdjust() {
    const cropZoom = document.getElementById('cropZoom');
    const cropRotate = document.getElementById('cropRotate');

    if (cropZoom) cropState.scale = parseFloat(cropZoom.value);
    if (cropRotate) cropState.rotate = parseInt(cropRotate.value);
    renderCropCanvas();
}

function renderCropCanvas() {
    if (activeCropSlotIndex < 0) return;
    const slot = slotsData[activeCropSlotIndex];
    const img = slot.img;
    const cropCanvas = document.getElementById('cropCanvas');
    if (!cropCanvas || !img) return;

    const cropCtx = cropCanvas.getContext('2d');
    cropCanvas.width = 400;
    cropCanvas.height = 260;

    const cw = cropCanvas.width;
    const ch = cropCanvas.height;

    cropCtx.fillStyle = '#020617';
    cropCtx.fillRect(0, 0, cw, ch);

    cropCtx.save();
    cropCtx.translate(cw / 2 + cropState.offsetX, ch / 2 + cropState.offsetY);
    cropCtx.rotate((cropState.rotate * Math.PI) / 180);
    cropCtx.scale(cropState.scale, cropState.scale);

    cropCtx.drawImage(img, -img.width / 4, -img.height / 4, img.width / 2, img.height / 2);
    cropCtx.restore();

    // Center Frame Guide
    cropCtx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    cropCtx.lineWidth = 2;
    cropCtx.strokeRect(cw / 2 - 60, ch / 2 - 80, 120, 160);
}

function setupCropCanvasInteraction() {
    const cropCanvas = document.getElementById('cropCanvas');
    if (!cropCanvas) return;

    let isDragging = false;
    let startX, startY;

    cropCanvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - cropState.offsetX;
        startY = e.clientY - cropState.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        cropState.offsetX = e.clientX - startX;
        cropState.offsetY = e.clientY - startY;
        renderCropCanvas();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function saveCropAdjustment() {
    if (activeCropSlotIndex >= 0) {
        slotsData[activeCropSlotIndex].scale = cropState.scale;
        slotsData[activeCropSlotIndex].rotate = cropState.rotate;
        slotsData[activeCropSlotIndex].offsetX = cropState.offsetX;
        slotsData[activeCropSlotIndex].offsetY = cropState.offsetY;

        updateRender();
        if (window.saveHistoryState) saveHistoryState();
        closeCropModal();
        showToast("Đã áp dụng chỉnh sửa!");
    }
}
