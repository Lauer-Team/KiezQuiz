/* KiezQuiz SVG zoom/pan — viewBox zoom for sharp programmatic focus, CSS transform for overview pan */
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
    this._viewBoxAnimFrame = null;
    this.RUBBER_RESISTANCE = 0.32;
    this.viewBoxZoomActive = false;
    this._baseViewBox = null;
    this.currentViewBox = null;

    this._captureBaseViewBox();
    this.setupListeners();
    this.updateTransform();
  }

  rebindSvg(svgElement) {
    this._cancelViewBoxAnimation();
    this.svg = svgElement;
    this._baseViewBox = null;
    this.currentViewBox = null;
    this.viewBoxZoomActive = false;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this._captureBaseViewBox();
    this.updateTransform(false);
  }

  _captureBaseViewBox() {
    if (this._baseViewBox || !this.svg) return;
    const vb = this.svg.viewBox?.baseVal;
    if (vb && vb.width > 0) {
      this._baseViewBox = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    } else {
      const w = this.svg.clientWidth || 746;
      const h = this.svg.clientHeight || 700;
      this._baseViewBox = { x: 0, y: 0, w, h };
    }
    this.currentViewBox = { ...this._baseViewBox };
  }

  _setViewBox(vb) {
    this.currentViewBox = { x: vb.x, y: vb.y, w: vb.w, h: vb.h };
    this.svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }

  _exitViewBoxZoom() {
    this.viewBoxZoomActive = false;
    if (this._baseViewBox) {
      this._setViewBox({ ...this._baseViewBox });
    }
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform(false);
  }

  _cancelViewBoxAnimation() {
    if (this._viewBoxAnimFrame) {
      cancelAnimationFrame(this._viewBoxAnimFrame);
      this._viewBoxAnimFrame = null;
    }
  }

  _animateViewBoxTo(target, duration = 360) {
    this._cancelViewBoxAnimation();
    const start = this.currentViewBox
      ? { ...this.currentViewBox }
      : { ...this._baseViewBox };
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      this._setViewBox({
        x: start.x + (target.x - start.x) * ease,
        y: start.y + (target.y - start.y) * ease,
        w: start.w + (target.w - start.w) * ease,
        h: start.h + (target.h - start.h) * ease
      });
      if (t < 1) {
        this._viewBoxAnimFrame = requestAnimationFrame(tick);
      } else {
        this._viewBoxAnimFrame = null;
        this.svg.classList.remove('map-viewbox-animating');
      }
    };

    this.svg.classList.add('map-viewbox-animating');
    this._viewBoxAnimFrame = requestAnimationFrame(tick);
  }

  _viewBoxFromDragDelta(dx, dy) {
    const start = this._viewBoxDragStart;
    if (!start) return null;
    const rect = this.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scaleX = start.w / rect.width;
    const scaleY = start.h / rect.height;
    return {
      x: start.x - dx * scaleX,
      y: start.y - dy * scaleY,
      w: start.w,
      h: start.h
    };
  }

  _zoomViewBoxAt(factor, clientX, clientY) {
    const vb = this.currentViewBox;
    const rect = this.svg.getBoundingClientRect();
    if (!rect.width || !rect.height || !this._baseViewBox) return;

    const minW = this._baseViewBox.w / 16;
    const maxW = this._baseViewBox.w * 1.05;
    const newW = Math.min(maxW, Math.max(minW, vb.w * factor));
    const ratio = newW / vb.w;
    const newH = vb.h * ratio;

    const mx = vb.x + ((clientX - rect.left) / rect.width) * vb.w;
    const my = vb.y + ((clientY - rect.top) / rect.height) * vb.h;

    this._setViewBox({
      x: mx - (mx - vb.x) * ratio,
      y: my - (my - vb.y) * ratio,
      w: newW,
      h: newH
    });
  }

  getPanBounds() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const baseW = Math.min(this.svg.clientWidth || cw, cw);
    const baseH = Math.min(this.svg.clientHeight || ch, ch);
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
    if (this.viewBoxZoomActive) return;
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
      if (this.viewBoxZoomActive) {
        this._viewBoxDragStart = { ...this.currentViewBox };
        this._viewBoxDragClientX = clientX;
        this._viewBoxDragClientY = clientY;
      }
    };

    const updatePendingDrag = (clientX, clientY) => {
      if (!this.pendingDrag || this.isDragging) return;
      const dx = clientX - this.dragStartX;
      const dy = clientY - this.dragStartY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      this.isDragging = true;
      this.didDrag = true;
      this.svg.classList.remove('smooth-transition');
      if (!this.viewBoxZoomActive) this.svg.classList.add('map-panning');
      this.container.style.cursor = 'grabbing';
    };

    const endDrag = () => {
      this.pendingDrag = false;
      if (this.isDragging) {
        this.isDragging = false;
        this.svg.classList.remove('map-panning');
        this.container.style.cursor = 'grab';
        this.snapPanToBounds();
      }
      this._viewBoxDragStart = null;
    };

    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.didDrag = false;
      beginPendingDrag(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      updatePendingDrag(e.clientX, e.clientY);
      if (!this.isDragging) return;
      if (this.viewBoxZoomActive && this._viewBoxDragStart) {
        const dx = e.clientX - this._viewBoxDragClientX;
        const dy = e.clientY - this._viewBoxDragClientY;
        const next = this._viewBoxFromDragDelta(dx, dy);
        if (next) this._setViewBox(next);
        return;
      }
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform(true);
    });

    window.addEventListener('mouseup', endDrag);

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
          if (this.viewBoxZoomActive) {
            const rect = this.container.getBoundingClientRect();
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            this._zoomViewBoxAt(scale, cx, cy);
          } else {
            const oldZoom = this.zoom;
            this.zoom = Math.min(Math.max(this.zoom * scale, 0.8), 8);
            const rect = this.container.getBoundingClientRect();
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            this.panX = cx - (cx - this.panX) * (this.zoom / oldZoom);
            this.panY = cy - (cy - this.panY) * (this.zoom / oldZoom);
            this.updateTransform(true);
          }
        }
        this.lastPinchDistance = dist;
        this.didDrag = true;
        e.preventDefault();
        return;
      }
      if (e.touches.length !== 1) return;
      updatePendingDrag(e.touches[0].clientX, e.touches[0].clientY);
      if (!this.isDragging) return;
      if (this.viewBoxZoomActive && this._viewBoxDragStart) {
        const dx = e.touches[0].clientX - this._viewBoxDragClientX;
        const dy = e.touches[0].clientY - this._viewBoxDragClientY;
        const next = this._viewBoxFromDragDelta(dx, dy);
        if (next) this._setViewBox(next);
        e.preventDefault();
        return;
      }
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

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.svg.classList.remove('smooth-transition');
      const zoomFactor = 1.04;
      const rect = this.container.getBoundingClientRect();

      if (this.viewBoxZoomActive) {
        const factor = e.deltaY < 0 ? 1 / zoomFactor : zoomFactor;
        this._zoomViewBoxAt(factor, e.clientX, e.clientY);
        return;
      }

      const oldZoom = this.zoom;
      if (e.deltaY < 0) {
        this.zoom = Math.min(this.zoom * zoomFactor, 8);
      } else {
        this.zoom = Math.max(this.zoom / zoomFactor, 0.8);
      }

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.panX = mouseX - (mouseX - this.panX) * (this.zoom / oldZoom);
      this.panY = mouseY - (mouseY - this.panY) * (this.zoom / oldZoom);
      this.updateTransform(true);
      this.scheduleWheelSnap();
    }, { passive: false });
  }

  zoomIn() {
    if (this.viewBoxZoomActive) {
      const rect = this.container.getBoundingClientRect();
      this._zoomViewBoxAt(1 / 1.3, rect.left + rect.width / 2, rect.top + rect.height / 2);
      return;
    }
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.min(this.zoom * 1.3, 8);
    this.updateTransform(false);
    this.snapPanToBounds();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  zoomOut() {
    if (this.viewBoxZoomActive) {
      const rect = this.container.getBoundingClientRect();
      this._zoomViewBoxAt(1.3, rect.left + rect.width / 2, rect.top + rect.height / 2);
      return;
    }
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.max(this.zoom / 1.3, 0.8);
    this.updateTransform(false);
    this.snapPanToBounds();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  reset() {
    this._cancelViewBoxAnimation();
    this._exitViewBoxZoom();
    this.svg.classList.add('smooth-transition');
    this.updateTransform(false);
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  zoomToPaths(paths, { padding = 2, maxZoom = 4, minZoom = 0.55 } = {}) {
    if (!paths?.length || !this.container || !this.svg) return;

    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const svgW = this.svg.clientWidth;
    const svgH = this.svg.clientHeight;
    if (!cw || !ch || !svgW || !svgH) return;

    const promptBar = this.container.querySelector('.map-prompt-bar:not([hidden])');
    const promptInset = promptBar ? promptBar.offsetHeight : 0;
    const promptOverlap = Math.max(0, promptInset - Math.max(0, ch - svgH));
    const viewH = Math.max(1, svgH - promptOverlap);

    let ux = Infinity;
    let uy = Infinity;
    let ux2 = -Infinity;
    let uy2 = -Infinity;
    paths.forEach((path) => {
      const b = path.getBBox();
      ux = Math.min(ux, b.x);
      uy = Math.min(uy, b.y);
      ux2 = Math.max(ux2, b.x + b.width);
      uy2 = Math.max(uy2, b.y + b.height);
    });

    const ubw = ux2 - ux;
    const ubh = uy2 - uy;
    if (ubw <= 0 || ubh <= 0) return;

    this._captureBaseViewBox();

    const padFrac = Math.max(0, (padding - 1) / 2);
    const contentW = ubw * (1 + 2 * padFrac);
    const contentH = ubh * (1 + 2 * padFrac);
    const cx = ux + ubw / 2;
    const cy = uy + ubh / 2;
    const containerAspect = cw / viewH;

    let vw;
    let vh;
    if (contentW / contentH > containerAspect) {
      vw = contentW;
      vh = contentW / containerAspect;
    } else {
      vh = contentH;
      vw = contentH * containerAspect;
    }

    const minW = this._baseViewBox.w / maxZoom;
    const maxW = this._baseViewBox.w / minZoom;
    if (vw < minW) {
      vw = minW;
      vh = vw / containerAspect;
    } else if (vw > maxW) {
      vw = maxW;
      vh = vw / containerAspect;
    }

    const vx = cx - vw / 2;
    const vy = cy - vh / 2;

    this._cancelViewBoxAnimation();
    this.viewBoxZoomActive = true;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.svg.classList.remove('smooth-transition');
    this.svg.style.transform = 'none';
    this._animateViewBoxTo({ x: vx, y: vy, w: vw, h: vh });
  }

  updateTransform(rubberBand = false) {
    if (this.viewBoxZoomActive) {
      this.svg.style.transform = 'none';
      return;
    }
    let px = this.panX;
    let py = this.panY;
    if (rubberBand) {
      const b = this.getPanBounds();
      px = this.applyRubberBand(px, b.minX, b.maxX);
      py = this.applyRubberBand(py, b.minY, b.maxY);
    }
    const z = Math.round(this.zoom * 1000) / 1000;
    px = Math.round(px * 100) / 100;
    py = Math.round(py * 100) / 100;
    this.svg.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${z})`;
  }
}
