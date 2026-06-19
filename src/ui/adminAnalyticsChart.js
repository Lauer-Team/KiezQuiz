/* KiezQuiz — Admin analytics time-series chart (SVG, no deps) */
(function () {
  const METRICS = {
    visitors: { color: '#5b9fd4', field: 'visitors' },
    page_views: { color: '#3ecf8e', field: 'page_views' },
    games: { color: '#f0b429', field: 'games' },
    gsc_clicks: { color: '#b48cff', field: 'gsc_clicks' },
    gsc_impressions: { color: '#ff8b94', field: 'gsc_impressions', dashed: true },
  };

  const PAD = { top: 16, right: 12, bottom: 28, left: 44 };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function metricLabel(key) {
    const map = {
      visitors: 'adminPage.analyticsMetricVisitors',
      page_views: 'adminPage.analyticsMetricPageViews',
      games: 'adminPage.analyticsMetricGames',
      gsc_clicks: 'adminPage.analyticsMetricGscClicks',
      gsc_impressions: 'adminPage.analyticsMetricGscImpressions',
    };
    return t(map[key] || key);
  }

  function readValue(point, metricKey) {
    const field = METRICS[metricKey]?.field || metricKey;
    const raw = point?.[field];
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function buildSeries(points, activeMetrics) {
    return activeMetrics
      .filter((key) => METRICS[key])
      .map((key) => ({
        key,
        color: METRICS[key].color,
        dashed: !!METRICS[key].dashed,
        values: points.map((p) => readValue(p, key)),
      }))
      .filter((s) => s.values.some((v) => v != null));
  }

  function computeYMax(series) {
    let max = 0;
    series.forEach((s) => {
      s.values.forEach((v) => {
        if (v != null && v > max) max = v;
      });
    });
    return max || 1;
  }

  function niceTicks(max, count) {
    const raw = max / Math.max(1, count - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const step = Math.ceil(raw / mag) * mag;
    const ticks = [];
    for (let v = 0; v <= max + step * 0.01; v += step) {
      ticks.push(v);
      if (ticks.length > count + 2) break;
    }
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  function formatTick(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${Math.round(n / 1000)}k`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(Math.round(n));
  }

  function formatTooltipValue(n) {
    return typeof formatNumber === 'function' ? formatNumber(n) : String(n);
  }

  function xForIndex(i, count, innerW) {
    if (count <= 1) return PAD.left + innerW / 2;
    return PAD.left + (i / (count - 1)) * innerW;
  }

  function yForValue(v, yMax, innerH) {
    return PAD.top + innerH - (v / yMax) * innerH;
  }

  function renderChartHtml(points, activeMetrics, granularity) {
    if (!points?.length) {
      return `<p class="admin-analytics-chart-empty">${escapeHtml(t('adminPage.analyticsSeriesEmpty'))}</p>`;
    }

    const series = buildSeries(points, activeMetrics);
    if (!series.length) {
      return `<p class="admin-analytics-chart-empty">${escapeHtml(t('adminPage.analyticsChartNoMetrics'))}</p>`;
    }

    const width = 720;
    const height = 280;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const yMax = computeYMax(series);
    const yTicks = niceTicks(yMax, 5);
    const yTop = yTicks[yTicks.length - 1] || yMax;
    const count = points.length;

    const gridLines = yTicks.map((tick) => {
      const y = yForValue(tick, yTop, innerH);
      return `
        <line class="admin-analytics-grid-line" x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${width - PAD.right}" y2="${y.toFixed(1)}" />
        <text class="admin-analytics-axis-y" x="${PAD.left - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end">${escapeHtml(formatTick(tick))}</text>`;
    }).join('');

    const xLabelStep = count > 14 ? Math.ceil(count / 7) : (count > 7 ? 2 : 1);
    const xLabels = points.map((p, i) => {
      if (i % xLabelStep !== 0 && i !== count - 1) return '';
      const x = xForIndex(i, count, innerW);
      const label = p.label || '';
      return `<text class="admin-analytics-axis-x" x="${x.toFixed(1)}" y="${height - 6}" text-anchor="middle">${escapeHtml(label)}</text>`;
    }).join('');

    const paths = series.map((s) => {
      const segments = [];
      let current = [];
      s.values.forEach((v, i) => {
        if (v == null) {
          if (current.length) {
            segments.push(current);
            current = [];
          }
          return;
        }
        current.push({ i, v });
      });
      if (current.length) segments.push(current);

      const polylines = segments.map((seg) => {
        const pts = seg.map(({ i, v }) => {
          const x = xForIndex(i, count, innerW);
          const y = yForValue(v, yTop, innerH);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        const dash = s.dashed ? ' stroke-dasharray="6 4"' : '';
        return `<polyline class="admin-analytics-line" data-metric="${escapeHtml(s.key)}" points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.25" vector-effect="non-scaling-stroke"${dash} />`;
      }).join('');

      const dots = s.values.map((v, i) => {
        if (v == null) return '';
        const x = xForIndex(i, count, innerW);
        const y = yForValue(v, yTop, innerH);
        return `<circle class="admin-analytics-dot" data-metric="${escapeHtml(s.key)}" data-index="${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${s.color}" />`;
      }).join('');

      return polylines + dots;
    }).join('');

    const hoverCols = points.map((p, i) => {
      const x = xForIndex(i, count, innerW);
      const colW = count > 1 ? innerW / (count - 1) : innerW;
      const x0 = count > 1 ? x - colW / 2 : PAD.left;
      const w = count > 1 ? colW : innerW;
      return `<rect class="admin-analytics-hover-col" data-index="${i}" x="${x0.toFixed(1)}" y="${PAD.top}" width="${w.toFixed(1)}" height="${innerH}" fill="transparent" />`;
    }).join('');

    const legend = series.map((s) => `
      <span class="admin-analytics-legend-item">
        <span class="admin-analytics-legend-swatch" style="background:${s.color}"></span>
        ${escapeHtml(metricLabel(s.key))}
      </span>`).join('');

    const granHint = granularity === 'hour'
      ? t('adminPage.analyticsGranularityHour')
      : t('adminPage.analyticsGranularityDay');

    return `
      <div class="admin-analytics-chart-wrap" data-point-count="${count}">
        <div class="admin-analytics-chart-meta">
          <div class="admin-analytics-legend" role="list">${legend}</div>
          <span class="admin-analytics-granularity">${escapeHtml(granHint)}</span>
        </div>
        <div class="admin-analytics-chart-stage">
          <svg class="admin-analytics-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(t('adminPage.analyticsChartAria'))}">
            ${gridLines}
            <line class="admin-analytics-axis-line" x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${height - PAD.bottom}" />
            <line class="admin-analytics-axis-line" x1="${PAD.left}" y1="${height - PAD.bottom}" x2="${width - PAD.right}" y2="${height - PAD.bottom}" />
            ${paths}
            ${hoverCols}
            ${xLabels}
          </svg>
          <div class="admin-analytics-tooltip" hidden></div>
        </div>
      </div>`;
  }

  function bindChart(root, points, activeMetrics) {
    const wrap = root?.querySelector('.admin-analytics-chart-wrap');
    const tooltip = wrap?.querySelector('.admin-analytics-tooltip');
    const stage = wrap?.querySelector('.admin-analytics-chart-stage');
    if (!wrap || !tooltip || !stage || !points?.length) return;

    const showTooltip = (index) => {
      const point = points[index];
      if (!point) return;
      const lines = activeMetrics
        .filter((key) => METRICS[key])
        .map((key) => {
          const v = readValue(point, key);
          if (v == null) return '';
          return `<span class="admin-analytics-tip-row"><span class="admin-analytics-tip-key">${escapeHtml(metricLabel(key))}</span><strong>${escapeHtml(formatTooltipValue(v))}</strong></span>`;
        })
        .filter(Boolean)
        .join('');

      const title = point.label || point.t || '';
      tooltip.innerHTML = `<span class="admin-analytics-tip-title">${escapeHtml(title)}</span>${lines}`;
      tooltip.hidden = false;

      const col = wrap.querySelector(`.admin-analytics-hover-col[data-index="${index}"]`);
      if (!col) return;
      const stageRect = stage.getBoundingClientRect();
      const colRect = col.getBoundingClientRect();
      const left = colRect.left - stageRect.left + colRect.width / 2;
      tooltip.style.left = `${left}px`;
    };

    const hideTooltip = () => {
      tooltip.hidden = true;
    };

    wrap.querySelectorAll('.admin-analytics-hover-col').forEach((col) => {
      col.addEventListener('mouseenter', () => showTooltip(Number(col.dataset.index)));
      col.addEventListener('focus', () => showTooltip(Number(col.dataset.index)));
      col.addEventListener('mouseleave', hideTooltip);
      col.addEventListener('blur', hideTooltip);
    });
  }

  function sumMetric(points, key) {
    return points.reduce((acc, p) => {
      const v = readValue(p, key);
      return v == null ? acc : acc + v;
    }, 0);
  }

  function maxMetric(points, key) {
    return points.reduce((acc, p) => {
      const v = readValue(p, key);
      if (v == null) return acc;
      return Math.max(acc, v);
    }, 0);
  }

  function metricTotal(totals, key, points) {
    if (totals && totals[key] != null) {
      const n = Number(totals[key]);
      return Number.isFinite(n) ? n : null;
    }
    return sumMetric(points, key);
  }

  function computeKpis(points, activeMetrics, gscAvailable, totals) {
    const kpis = [];
    const sumMeta = totals ? 'adminPage.analyticsKpiTotal' : 'adminPage.analyticsKpiSum';
    const add = (key, value, metaKey, metaParams) => {
      if (!activeMetrics.includes(key)) return;
      if (value == null) return;
      kpis.push({
        key,
        label: metricLabel(key),
        value: typeof value === 'number' ? formatNumber(value) : value,
        meta: metaKey ? t(metaKey, metaParams) : '',
        color: METRICS[key]?.color,
      });
    };

    if (activeMetrics.includes('visitors')) {
      add(
        'visitors',
        metricTotal(totals, 'visitors', points),
        totals ? 'adminPage.analyticsKpiUnique' : 'adminPage.analyticsKpiSum'
      );
    }
    if (activeMetrics.includes('page_views')) {
      add('page_views', metricTotal(totals, 'page_views', points), sumMeta);
    }
    if (activeMetrics.includes('games')) {
      add('games', metricTotal(totals, 'games', points), sumMeta);
    }
    if (gscAvailable && activeMetrics.includes('gsc_clicks')) {
      add('gsc_clicks', metricTotal(totals, 'gsc_clicks', points), sumMeta);
    }
    if (gscAvailable && activeMetrics.includes('gsc_impressions')) {
      add('gsc_impressions', metricTotal(totals, 'gsc_impressions', points), sumMeta);
    }

    const visitors = metricTotal(totals, 'visitors', points);
    const games = metricTotal(totals, 'games', points);
    const clicks = metricTotal(totals, 'gsc_clicks', points);
    const impressions = metricTotal(totals, 'gsc_impressions', points);

    if (activeMetrics.includes('visitors') && activeMetrics.includes('games') && visitors > 0 && games > 0) {
      kpis.push({
        key: 'play_rate',
        label: t('adminPage.analyticsKpiPlayRate'),
        value: `${((games / visitors) * 100).toFixed(1)}%`,
        meta: t('adminPage.analyticsKpiPlayRateMeta', { games: formatNumber(games), visitors: formatNumber(visitors) }),
        color: '#f0b429',
      });
    }

    if (gscAvailable && activeMetrics.includes('gsc_clicks') && activeMetrics.includes('gsc_impressions') && impressions > 0 && clicks >= 0) {
      kpis.push({
        key: 'gsc_ctr',
        label: t('adminPage.analyticsKpiGscCtr'),
        value: `${((clicks / impressions) * 100).toFixed(2)}%`,
        meta: t('adminPage.analyticsKpiGscCtrMeta'),
        color: '#b48cff',
      });
    }

    if (activeMetrics.includes('page_views')) {
      kpis.push({
        key: 'peak_views',
        label: t('adminPage.analyticsKpiPeakViews'),
        value: formatNumber(maxMetric(points, 'page_views')),
        meta: t('adminPage.analyticsKpiPeakMeta'),
        color: '#3ecf8e',
      });
    }

    return kpis.slice(0, 6);
  }

  window.kiezAdminAnalyticsChart = {
    METRICS,
    metricLabel,
    renderChartHtml,
    bindChart,
    computeKpis,
    sumMetric,
    readValue,
  };
})();
