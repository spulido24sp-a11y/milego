/**
 * advisor-panel.js
 * Pure UI renderers for the LIAM Advisor Workspace.
 * No API calls. Receives data, returns HTML strings or mutates DOM.
 */

// ─────────────────────────────────────────────────────────────────────────
// Grade helpers
// ─────────────────────────────────────────────────────────────────────────
const GRADE_CSS = {
  'A+': 'grade-a-plus', 'A': 'grade-a',
  'B+': 'grade-b-plus', 'B': 'grade-b',
  'C':  'grade-c',       'D': 'grade-d'
};
const CONFIDENCE_CIRCLE_CSS = (score) => {
  if (score >= 80) return 'conf-circle-green';
  if (score >= 65) return 'conf-circle-blue';
  if (score >= 50) return 'conf-circle-yellow';
  return 'conf-circle-red';
};

const FINDING_ICONS = {
  critical: '🔴', high: '🟠', medium: '🟡',
  low: '🔵', ok: '✅', info: 'ℹ️'
};

const SCORE_BAR_COLOR = (score) => {
  if (score >= 80) return 'fill-green';
  if (score >= 60) return 'fill-blue';
  if (score >= 40) return 'fill-yellow';
  return 'fill-red';
};

const DIMENSION_LABELS = {
  viabilidad:    { label: 'Viabilidad',     emoji: '💰', weight: 25 },
  logistica:     { label: 'Logística',      emoji: '📦', weight: 20 },
  calidad_datos: { label: 'Calidad Datos',  emoji: '📋', weight: 20 },
  seo:           { label: 'SEO',            emoji: '🔍', weight: 15 },
  oferta:        { label: 'Oferta',         emoji: '🏷️', weight: 20 }
};

const SCENARIO_LABELS = {
  price:         (s) => `Precio $${(s.after?.retail ?? 0).toLocaleString()}`,
  bundle:        (s) => `Bundle x${s.scenario?.quantity ?? 2}`,
  free_shipping: ()  => 'Envío Gratis Incluido',
  custom:        ()  => 'Escenario Personalizado'
};

const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.', '6.'];

// ─────────────────────────────────────────────────────────────────────────
// 1. Update Header — Grade badge + confidence circle
// ─────────────────────────────────────────────────────────────────────────
export function renderConfidenceHeader(confidence, grade) {
  const circleEl  = document.getElementById('confidence-circle');
  const verdictEl = document.getElementById('confidence-verdict');
  const gradeEl   = document.getElementById('confidence-grade');

  if (!circleEl) return;

  circleEl.textContent = confidence;
  circleEl.className = `${CONFIDENCE_CIRCLE_CSS(confidence)}`;
  circleEl.style.cssText = `width:56px;height:56px;border-radius:50%;border:4px solid currentColor;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;color:#fff;`;

  if (gradeEl) {
    gradeEl.className = `grade-badge ${GRADE_CSS[grade] ?? 'grade-c'}`;
    gradeEl.textContent = grade;
  }

  if (verdictEl) {
    if (confidence >= 80) {
      verdictEl.textContent = '✓ Listo para lanzar';
      verdictEl.style.color = '#34d399';
    } else if (confidence >= 60) {
      verdictEl.textContent = '⚠ Lanzar con precaución';
      verdictEl.style.color = '#fbbf24';
    } else {
      verdictEl.textContent = '✗ No recomendado';
      verdictEl.style.color = '#f87171';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Executive Summary
// ─────────────────────────────────────────────────────────────────────────
export function renderExecutiveSummary(explanation) {
  const el = document.getElementById('advisor-executive-summary');
  if (!el) return;

  el.innerHTML = `
    <div class="advisor-section-title">🧠 Executive Summary</div>
    <div class="exec-summary">${explanation.executiveSummary ?? 'Analizando producto…'}</div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Findings Panel
// ─────────────────────────────────────────────────────────────────────────
export function renderFindings(findings) {
  const el = document.getElementById('advisor-findings');
  if (!el) return;

  // Show ok findings only if there are no critical/high ones, to avoid noise
  const hasProblems = findings.some(f => f.severity !== 'ok');
  const visible = hasProblems
    ? findings.filter(f => f.severity !== 'ok')
    : findings.slice(0, 4);

  const rows = visible.map(f => `
    <div class="finding-item finding-${f.severity}">
      <span class="finding-icon">${FINDING_ICONS[f.severity] ?? '⚪'}</span>
      <span>${f.detail}</span>
    </div>
  `).join('');

  const okCount = findings.filter(f => f.severity === 'ok').length;
  const okNote  = hasProblems && okCount > 0
    ? `<div style="font-size:0.72rem;color:var(--text-secondary);margin-top:6px;padding-left:4px;">✅ ${okCount} verificación(es) superada(s)</div>`
    : '';

  el.innerHTML = `
    <div class="advisor-section-title">🔍 Findings</div>
    <div style="display:flex;flex-direction:column;gap:5px;">${rows}</div>
    ${okNote}
  `;
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Recommendations
// ─────────────────────────────────────────────────────────────────────────
export function renderRecommendations(topActions, productId, onSimulate, onApply) {
  const el = document.getElementById('advisor-recommendations');
  if (!el) return;

  if (!topActions || topActions.length === 0) {
    el.innerHTML = `
      <div class="advisor-section-title">⚡ Recomendaciones</div>
      <p style="font-size:0.8rem;color:var(--text-secondary);">No hay acciones prioritarias en este momento.</p>
    `;
    return;
  }

  const rows = topActions.slice(0, 3).map((rec, i) => {
    const gainLabel = rec.gain > 0 ? `+${rec.gain}` : '—';
    const roasLabel = rec.roasGain ? `+${rec.roasGain}x ROAS` : '';
    const hasSimKey = !!rec.simulationKey;
    
    // Auto-applicable rules
    const isAutoApplicable = hasSimKey && ['price', 'bundle', 'free_shipping'].includes(rec.simulationKey.type);

    return `
      <div class="rec-card" style="margin-bottom: 6px;">
        <span class="rec-gain-badge">${gainLabel} pts</span>
        <span class="rec-label">
          ${rec.label}
          ${roasLabel ? `<span style="color:#34d399;font-size:0.7rem;margin-left:4px;">${roasLabel}</span>` : ''}
        </span>
        <div style="display: flex; gap: 4px; flex-shrink: 0;">
          ${hasSimKey
            ? `<button class="rec-action-btn btn-sim" data-sim-key='${JSON.stringify(rec.simulationKey)}'>Simular</button>`
            : `<button class="rec-action-btn" style="opacity:0.4;cursor:default;">Acción</button>`
          }
          ${isAutoApplicable
            ? `<button class="rec-action-btn btn-apply" style="background: rgba(16,185,129,0.12); color: #34d399; border-color: rgba(16,185,129,0.25);" data-sim-key='${JSON.stringify(rec.simulationKey)}'>★ Aplicar</button>`
            : ''
          }
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="advisor-section-title">⚡ Recomendaciones</div>
    <div style="display:flex;flex-direction:column;gap:4px;">${rows}</div>
  `;

  // Wire simulate buttons
  el.querySelectorAll('.btn-sim').forEach(btn => {
    btn.addEventListener('click', () => {
      const simKey = JSON.parse(btn.dataset.simKey);
      if (onSimulate) onSimulate(simKey);
    });
  });

  // Wire apply buttons
  el.querySelectorAll('.btn-apply').forEach(btn => {
    btn.addEventListener('click', async () => {
      const simKey = JSON.parse(btn.dataset.simKey);
      btn.textContent = '…';
      btn.disabled = true;
      if (onApply) await onApply(simKey);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Score Breakdown (right column)
// ─────────────────────────────────────────────────────────────────────────
export function renderScoreBreakdown(breakdown, confidence, grade, dimensionExplanations) {
  const el = document.getElementById('score-parameters-list');
  if (!el) return;

  const dims = ['viabilidad', 'logistica', 'calidad_datos', 'seo', 'oferta'];

  const bars = dims.map(dim => {
    const info   = DIMENSION_LABELS[dim] ?? { label: dim, emoji: '•', weight: 20 };
    const score  = breakdown[dim]?.score ?? 0;
    const contrib = breakdown[dim]?.contribution ?? Math.round(score * info.weight / 100);
    const color  = SCORE_BAR_COLOR(score);
    const explain = dimensionExplanations?.[dim] ?? '';

    return `
      <div class="score-bar-wrap" title="${explain}">
        <div class="score-bar-label">
          <span class="score-name">${info.emoji} ${info.label}</span>
          <span style="display:flex;gap:6px;align-items:center;">
            <span class="score-contrib">+${contrib}</span>
            <span class="score-value">${score}</span>
          </span>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill ${color}" style="width:${score}%; animation: bar-grow 0.8s ease-out;"></div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="advisor-section-title" style="margin-bottom:12px;">🎯 Score Breakdown</div>
    ${bars}
    <div class="score-total-row">
      <span class="score-total-label">Confidence Score</span>
      <span style="display:flex;align-items:center;gap:8px;">
        <span class="grade-badge ${GRADE_CSS[grade] ?? 'grade-c'}" style="font-size:0.85rem;width:32px;height:32px;">${grade}</span>
        <span class="score-total-value">${confidence}</span>
      </span>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Simulator Leaderboard (right column, below history)
// ─────────────────────────────────────────────────────────────────────────
export function renderLeaderboard(allResults, baseConfidence, onApply, onOptimizeClick) {
  const el = document.getElementById('advisor-leaderboard');
  if (!el) return;

  if (!allResults || allResults.length === 0) {
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div class="advisor-section-title" style="margin:0;">🏆 Leaderboard</div>
      </div>
      <p style="font-size:0.8rem;color:var(--text-secondary);">Cargando escenarios…</p>
    `;
    return;
  }

  const rows = allResults.slice(0, 5).map((result, i) => {
    const label   = SCENARIO_LABELS[result.scenario?.type]?.(result) ?? result.scenario?.type ?? 'Escenario';
    const score   = result.scoring?.confidence ?? 0;
    const diff    = score - baseConfidence;
    const gainStr = diff > 0 ? `+${diff}` : diff === 0 ? '=' : `${diff}`;
    const isBest  = i === 0;

    return `
      <div class="leaderboard-row ${isBest ? 'is-best' : ''}">
        <span class="lb-medal">${MEDALS[i] ?? '•'}</span>
        <div style="flex:1;min-width:0;">
          <div class="lb-label">${label}</div>
          <div class="lb-gain">${gainStr} pts · ${result.scoring?.grade ?? '?'}</div>
        </div>
        <span class="lb-score">${score}</span>
        <button class="lb-apply" data-scenario='${JSON.stringify(result.scenario)}'>Aplicar</button>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div class="advisor-section-title" style="margin:0;">🏆 Leaderboard de Escenarios</div>
      <button class="btn btn-outline" id="btn-open-optimize" style="font-size:0.7rem;padding:3px 8px;margin-top:-4px;">🔬 Optimizar</button>
    </div>
    <div>${rows}</div>
    <p style="font-size:0.7rem;color:var(--text-secondary);margin-top:8px;text-align:center;">
      Ordenado por Confidence Score. Haz clic en Aplicar para hacer JSON Patch al Blueprint.
    </p>
  `;

  // Wire optimize click
  const optBtn = document.getElementById('btn-open-optimize');
  if (optBtn && onOptimizeClick) {
    optBtn.addEventListener('click', () => onOptimizeClick());
  }

  el.querySelectorAll('.lb-apply').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const scenario = JSON.parse(btn.dataset.scenario);
      btn.textContent = '…';
      btn.disabled = true;
      if (onApply) await onApply(scenario);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 7. What-If detection helper (used by chat)
// ─────────────────────────────────────────────────────────────────────────
const PRICE_REGEX = /(?:vend(?:o|er|a)|pong(?:o|as)?|subi(?:r|endo)?|baj(?:ar|o)?|precio|cambio).*?\$?([\d.,]+(?:\s*(?:mil|k|m))?)/i;
const BUNDLE_REGEX = /bundle\s*x?(\d)|combo\s*x?(\d)|paquete\s*x?(\d)/i;

export function detectWhatIf(text) {
  const lc = text.toLowerCase();

  // "¿qué pasa si…?" or "si vendo a…"
  if (!/(qué pasa si|si vendo|si subo|si bajo|si cambio|que pasaría|what if)/i.test(lc)) {
    return null;
  }

  // Bundle detection
  const bundleMatch = lc.match(BUNDLE_REGEX);
  if (bundleMatch) {
    const qty = parseInt(bundleMatch[1] || bundleMatch[2] || bundleMatch[3]);
    if (qty >= 2 && qty <= 5) return { type: 'bundle', quantity: qty };
  }

  // Price detection — parse "59.900", "59900", "59 mil"
  const priceMatch = text.match(PRICE_REGEX);
  if (priceMatch) {
    const raw = priceMatch[1].replace(/\./g, '').replace(/,/g, '');
    let value = parseInt(raw);
    if (/mil|k/i.test(priceMatch[1])) value *= 1000;
    if (value > 1000 && value < 10_000_000) {
      return { type: 'price', value };
    }
  }

  return null; // Is a "what-if" question but we couldn't parse → fallback to LLM
}

// ─────────────────────────────────────────────────────────────────────────
// 8. Render What-If simulation response in chat
// ─────────────────────────────────────────────────────────────────────────
export function buildWhatIfResponse(text, simResult) {
  const { before, after, scoring, delta } = simResult;
  const diffConf = scoring.confidence - (simResult._baseConfidence ?? scoring.confidence);

  const confLine  = diffConf > 0
    ? `${simResult._baseConfidence ?? '?'} → <strong>${scoring.confidence}</strong> (+${diffConf} pts)`
    : `${scoring.confidence}`;

  const roasLine  = `${before.roas.toFixed(2)}x → <strong>${after.roas.toFixed(2)}x</strong>`;
  const marginLine = `${before.marginPct.toFixed(1)}% → <strong>${after.marginPct.toFixed(1)}%</strong>`;

  const positive = delta.roasDiff >= 0;

  return `
    <div style="font-size:0.85rem;line-height:1.6;">
      ${positive ? '📈' : '📉'} Simulé ese escenario. Aquí el impacto estimado:
      <div class="sim-response-card">
        <div class="sim-row"><span>Precio de venta</span><strong>$${after.retail.toLocaleString()}</strong></div>
        <div class="sim-row"><span>Confidence Score</span><span>${confLine}</span></div>
        <div class="sim-row"><span>ROAS estimado</span><span>${roasLine}</span></div>
        <div class="sim-row"><span>Margen bruto</span><span>${marginLine}</span></div>
      </div>
      <div style="margin-top:8px;color:var(--text-secondary);font-size:0.78rem;">
        ${scoring.grade === 'A+' || scoring.grade === 'A'
          ? '✅ Recomendado. Este escenario mejora la rentabilidad del producto.'
          : scoring.isLaunchReady
            ? '⚠️ Viable, pero monitorea el CPA de cerca.'
            : '❌ No recomendado. El ROAS proyectado no cubre los costos de pauta.'}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────
// 9. Optimization Mode Modal Renderer (Client-side sorting & action dispatch)
// ─────────────────────────────────────────────────────────────────────────
export function renderOptimizationModal(results, baseConfidence, onApply, objective = 'confidence') {
  // Try finding existing modal, if not create it
  let modal = document.getElementById('liam-optimization-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'liam-optimization-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  // Sort results based on selected objective
  const sorted = [...results].sort((a, b) => {
    if (objective === 'roas') {
      return (b.after?.roas ?? 0) - (a.after?.roas ?? 0);
    }
    if (objective === 'margin') {
      return (b.after?.marginPct ?? 0) - (a.after?.marginPct ?? 0);
    }
    // Default: confidence score
    return (b.scoring?.confidence ?? 0) - (a.scoring?.confidence ?? 0);
  });

  const bestResult = sorted[0];

  const rows = sorted.map((res, idx) => {
    const label = SCENARIO_LABELS[res.scenario?.type]?.(res) ?? res.scenario?.type ?? 'Escenario';
    const score = res.scoring?.confidence ?? 0;
    const roas = (res.after?.roas ?? 0).toFixed(2);
    const margin = (res.after?.marginPct ?? 0).toFixed(1);
    const isBest = idx === 0;

    return `
      <div class="leaderboard-row ${isBest ? 'is-best' : ''}" style="margin-bottom: 8px;">
        <span class="lb-medal">${MEDALS[idx] ?? '•'}</span>
        <div style="flex:1; min-width:0;">
          <div class="lb-label">${label}</div>
          <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:2px;">
            ROAS: <strong>${roas}x</strong> · Margen: <strong>${margin}%</strong>
          </div>
        </div>
        <div style="text-align:right; margin-right:8px;">
          <div style="font-size:0.85rem; font-weight:800; color:#fff;">${score} pts</div>
          <div style="font-size:0.7rem; color:${score - baseConfidence >= 0 ? '#34d399' : '#f87171'}; font-weight:700;">
            ${score - baseConfidence >= 0 ? '+' : ''}${score - baseConfidence}
          </div>
        </div>
        <button class="lb-apply btn-modal-apply" data-scenario='${JSON.stringify(res.scenario)}'>Aplicar</button>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal-content" style="width: 580px; max-width: 95%;">
      <div class="modal-header">
        <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
          <span>🔬</span> Optimization Mode (LIAM)
        </h3>
        <span class="modal-close" id="opt-modal-close">&times;</span>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <label style="font-size: 0.78rem; font-weight: 700; color: var(--brand-light); display:block; margin-bottom: 8px;">
          SELECCIONA EL OBJETIVO DE OPTIMIZACIÓN
        </label>
        <div style="display: flex; gap: 10px; background: var(--bg-input); padding: 6px; border-radius: 8px;">
          <label style="flex: 1; text-align: center; font-size: 0.78rem; padding: 6px; border-radius: 6px; cursor: pointer; background: ${objective === 'confidence' ? 'var(--brand)' : 'none'}; color: ${objective === 'confidence' ? 'white' : 'var(--text-secondary)'};">
            <input type="radio" name="opt-objective" value="confidence" ${objective === 'confidence' ? 'checked' : ''} style="display:none;">
            🎯 Max Score
          </label>
          <label style="flex: 1; text-align: center; font-size: 0.78rem; padding: 6px; border-radius: 6px; cursor: pointer; background: ${objective === 'roas' ? 'var(--brand)' : 'none'}; color: ${objective === 'roas' ? 'white' : 'var(--text-secondary)'};">
            <input type="radio" name="opt-objective" value="roas" ${objective === 'roas' ? 'checked' : ''} style="display:none;">
            📈 Max ROAS
          </label>
          <label style="flex: 1; text-align: center; font-size: 0.78rem; padding: 6px; border-radius: 6px; cursor: pointer; background: ${objective === 'margin' ? 'var(--brand)' : 'none'}; color: ${objective === 'margin' ? 'white' : 'var(--text-secondary)'};">
            <input type="radio" name="opt-objective" value="margin" ${objective === 'margin' ? 'checked' : ''} style="display:none;">
            💰 Max Margen
          </label>
        </div>
      </div>

      <div style="max-height: 280px; overflow-y: auto; margin-bottom: 1.5rem; padding-right: 4px;">
        ${rows}
      </div>

      <div class="modal-footer" style="margin-top: 0; padding-top: 15px; border-top: 1px solid var(--border);">
        <button class="btn btn-outline" id="opt-modal-btn-cancel">Cerrar</button>
        ${bestResult
          ? `<button class="btn btn-primary" id="opt-modal-btn-best" data-scenario='${JSON.stringify(bestResult.scenario)}' style="background:var(--success); border-color:var(--success);">Aplicar el Mejor (${SCENARIO_LABELS[bestResult.scenario?.type]?.(bestResult) ?? 'Mejor'})</button>`
          : ''
        }
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  // Wire close & cancel
  const close = () => { modal.style.display = 'none'; };
  document.getElementById('opt-modal-close').addEventListener('click', close);
  document.getElementById('opt-modal-btn-cancel').addEventListener('click', close);

  // Wire objective changes (recursive re-render)
  modal.querySelectorAll('input[name="opt-objective"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      renderOptimizationModal(results, baseConfidence, onApply, e.target.value);
    });
  });

  // Wire "Aplicar" buttons on each row
  modal.querySelectorAll('.btn-modal-apply').forEach(btn => {
    btn.addEventListener('click', async () => {
      const scenario = JSON.parse(btn.dataset.scenario);
      btn.textContent = '…';
      btn.disabled = true;
      close();
      if (onApply) await onApply(scenario);
    });
  });

  // Wire "Aplicar el Mejor"
  const bestBtn = document.getElementById('opt-modal-btn-best');
  if (bestBtn) {
    bestBtn.addEventListener('click', async () => {
      const scenario = JSON.parse(bestBtn.dataset.scenario);
      bestBtn.textContent = 'Aplicando…';
      bestBtn.disabled = true;
      close();
      if (onApply) await onApply(scenario);
    });
  }
}
