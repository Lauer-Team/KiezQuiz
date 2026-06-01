/* KiezQuiz SVG zoom/pan */
class MapNavigator {
  constructor(svgElement, containerElement) {
    this.svg = svgElement;
    this.container = containerElement;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.isPinching = false;
    this.didDrag = false;
    this.pendingDrag = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.startX = 0;
    this.startY = 0;
    this.lastPinchDistance = 0;
    this._wheelSnapTimer = null;
    this.RUBBER_RESISTANCE = 0.32;
    
    this.setupListeners();
    this.updateTransform();
  }

  getPanBounds() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const baseW = this.svg.offsetWidth || cw;
    const baseH = this.svg.offsetHeight || ch;
    const scaledW = baseW * this.zoom;
    const scaledH = baseH * this.zoom;
    const overscroll = Math.min(cw, ch) * 0.12;
    const maxPanX = Math.max(overscroll, (scaledW - cw) / 2 + overscroll);
    const maxPanY = Math.max(overscroll, (scaledH - ch) / 2 + overscroll);
    return { minX: -maxPanX, maxX: maxPanX, minY: -maxPanY, maxY: maxPanY };
  }

  applyRubberBand(value, min, max) {
    if (value >= min && value <= max) return value;
    const edge = value < min ? min : max;
    return edge + (value - edge) * this.RUBBER_RESISTANCE;
  }

  snapPanToBounds() {
    const b = this.getPanBounds();
    const nx = Math.min(b.maxX, Math.max(b.minX, this.panX));
    const ny = Math.min(b.maxY, Math.max(b.minY, this.panY));
    if (nx === this.panX && ny === this.panY) return;
    this.svg.classList.add('smooth-transition');
    this.panX = nx;
    this.panY = ny;
    this.updateTransform(false);
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  scheduleWheelSnap() {
    clearTimeout(this._wheelSnapTimer);
    this._wheelSnapTimer = setTimeout(() => this.snapPanToBounds(), 120);
  }

  getPinchDistance(e) {
    const [a, b] = [e.touches[0], e.touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  setupListeners() {
    const DRAG_THRESHOLD = 5;

    const beginPendingDrag = (clientX, clientY) => {
      this.pendingDrag = true;
      this.isDragging = false;
      this.dragStartX = clientX;
      this.dragStartY = clientY;
      this.startX = clientX - this.panX;
      this.startY = clientY - this.panY;
    };

    const updatePendingDrag = (clientX, clientY) => {
      if (!this.pendingDrag || this.isDragging) return;
      const dx = clientX - this.dragStartX;
      const dy = clientY - this.dragStartY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      this.isDragging = true;
      this.didDrag = true;
      this.svg.classList.remove('smooth-transition');
      this.container.style.cursor = 'grabbing';
    };

    const endDrag = () => {
      this.pendingDrag = false;
      if (this.isDragging) {
        this.isDragging = false;
        this.container.style.cursor = 'grab';
        this.snapPanToBounds();
      }
    };

    // Mouse Dragging for Panning — threshold so clicks on districts still fire
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.didDrag = false;
      beginPendingDrag(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      updatePendingDrag(e.clientX, e.clientY);
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform(true);
    });

    window.addEventListener('mouseup', endDrag);

    // Touch: pan (1 finger) and pinch-zoom (2 fingers)
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.pendingDrag = false;
        this.isDragging = false;
        this.isPinching = true;
        this.didDrag = false;
        this.lastPinchDistance = this.getPinchDistance(e);
        this.svg.classList.remove('smooth-transition');
        e.preventDefault();
        return;
      }
      if (e.touches.length === 1) {
        this.isPinching = false;
        this.didDrag = false;
        beginPendingDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && this.isPinching) {
        const dist = this.getPinchDistance(e);
        if (this.lastPinchDistance > 0) {
          const scale = dist / this.lastPinchDistance;
          const oldZoom = this.zoom;
          this.zoom = Math.min(Math.max(this.zoom * scale, 0.8), 8);
          const rect = this.container.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          this.panX = cx - (cx - this.panX) * (this.zoom / oldZoom);
          this.panY = cy - (cy - this.panY) * (this.zoom / oldZoom);
          this.updateTransform(true);
        }
        this.lastPinchDistance = dist;
        this.didDrag = true;
        e.preventDefault();
        return;
      }
      if (e.touches.length !== 1) return;
      updatePendingDrag(e.touches[0].clientX, e.touches[0].clientY);
      if (!this.isDragging) return;
      this.panX = e.touches[0].clientX - this.startX;
      this.panY = e.touches[0].clientY - this.startY;
      this.updateTransform(true);
      e.preventDefault();
    }, { passive: false });

    this.container.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        if (this.isPinching) this.snapPanToBounds();
        this.isPinching = false;
        this.lastPinchDistance = 0;
      }
      endDrag();
    });

    // Mouse Wheel Zoom (Silkier and dampened)
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      this.svg.classList.remove('smooth-transition'); // Pure 1:1 scroll feel
      const zoomFactor = 1.04; // Dampened from 1.1 for precise scroll control
      const oldZoom = this.zoom;
      
      if (e.deltaY < 0) {
        this.zoom = Math.min(this.zoom * zoomFactor, 8);
      } else {
        this.zoom = Math.max(this.zoom / zoomFactor, 0.8);
      }
      
      // Zoom toward cursor location
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      this.panX = mouseX - (mouseX - this.panX) * (this.zoom / oldZoom);
      this.panY = mouseY - (mouseY - this.panY) * (this.zoom / oldZoom);
      
      this.updateTransform(true);
      this.scheduleWheelSnap();
    }, { passive: false });
  }

  zoomIn() {
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.min(this.zoom * 1.3, 8);
    this.updateTransform(false);
    this.snapPanToBounds();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  zoomOut() {
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.max(this.zoom / 1.3, 0.8);
    this.updateTransform(false);
    this.snapPanToBounds();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  reset() {
    this.svg.classList.add('smooth-transition');
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform(false);
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  zoomToPaths(paths, { padding = 1.8, maxZoom = 6, minZoom = 1.2 } = {}) {
    if (!paths?.length || !this.container || !this.svg) return;

    const containerRect = this.container.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    paths.forEach((path) => {
      const r = path.getBoundingClientRect();
      minX = Math.min(minX, r.left);
      minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right);
      maxY = Math.max(maxY, r.bottom);
    });

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    if (bboxW <= 0 || bboxH <= 0) return;

    const bboxCx = (minX + maxX) / 2 - containerRect.left;
    const bboxCy = (minY + maxY) / 2 - containerRect.top;
    const fitZoom = Math.min(cw / (bboxW * padding), ch / (bboxH * padding));
    const targetZoom = Math.min(maxZoom, Math.max(minZoom, this.zoom * fitZoom));

    const oldZoom = this.zoom;
    this.svg.classList.add('smooth-transition');
    this.zoom = targetZoom;
    this.panX = bboxCx - (bboxCx - this.panX) * (this.zoom / oldZoom);
    this.panY = bboxCy - (bboxCy - this.panY) * (this.zoom / oldZoom);
    this.updateTransform(false);
    this.snapPanToBounds();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  updateTransform(rubberBand = false) {
    let px = this.panX;
    let py = this.panY;
    if (rubberBand) {
      const b = this.getPanBounds();
      px = this.applyRubberBand(px, b.minX, b.maxX);
      py = this.applyRubberBand(py, b.minY, b.maxY);
    }
    this.svg.style.transform = `translate(${px}px, ${py}px) scale(${this.zoom})`;
  }
}

