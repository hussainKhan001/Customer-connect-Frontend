/* Small dependency-free corner toast — replaces sweetalert2's toast mixin
   for success/info feedback (see toast.js). Styled with the same --nx-*
   tokens as the rest of the app, so it tracks light/dark automatically
   with no isDark() branching needed. Kept intentionally tiny: one
   container, one style tag, injected lazily on first use. */

const ICONS = {
  success:
    '<path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16v-5M12 8h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

const TONE = {
  success: 'color: var(--nx-success, #22c55e);',
  info: 'color: var(--nx-info, #3b82f6);',
};

let container = null;

function ensureContainer() {
  if (container) return container;

  const style = document.createElement('style');
  style.textContent = `
    #nx-toast-container { position: fixed; top: 16px; right: 16px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
    .nx-toast { pointer-events: auto; width: 320px; max-width: calc(100vw - 32px); background: var(--nx-surface); color: var(--nx-text); border: 1px solid var(--nx-border); border-radius: var(--nx-radius-md, 8px); box-shadow: var(--nx-shadow-md, 0 4px 12px rgb(15 23 42 / 0.08)); overflow: hidden; opacity: 0; transform: translateX(12px); transition: opacity 200ms ease, transform 200ms ease; }
    .nx-toast.nx-toast-in { opacity: 1; transform: translateX(0); }
    .nx-toast-body { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; }
    .nx-toast-icon { flex-shrink: 0; width: 20px; height: 20px; margin-top: 1px; }
    .nx-toast-title { font-size: 13px; font-weight: 700; line-height: 1.35; }
    .nx-toast-text { font-size: 12px; color: var(--nx-text-muted); margin-top: 2px; line-height: 1.4; }
    .nx-toast-close { flex-shrink: 0; width: 20px; height: 20px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--nx-text-muted); background: transparent; border: none; cursor: pointer; }
    .nx-toast-close:hover { background: var(--nx-surface-muted); }
    .nx-toast-bar { height: 2px; background: currentColor; opacity: 0.35; width: 100%; transform-origin: left; animation: nx-toast-shrink linear forwards; animation-duration: var(--nx-toast-duration, 3200ms); }
    @keyframes nx-toast-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `;
  document.head.appendChild(style);

  container = document.createElement('div');
  container.id = 'nx-toast-container';
  document.body.appendChild(container);
  return container;
}

export function showToast({ kind = 'info', title, text, timer = 3200 }) {
  const root = ensureContainer();

  const el = document.createElement('div');
  el.className = 'nx-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.setProperty('--nx-toast-duration', `${timer}ms`);
  el.innerHTML = `
    <div class="nx-toast-body">
      <svg class="nx-toast-icon" style="${TONE[kind] || TONE.info}" viewBox="0 0 24 24">${ICONS[kind] || ICONS.info}</svg>
      <div style="flex: 1; min-width: 0;">
        <div class="nx-toast-title">${escapeHtml(title)}</div>
        ${text ? `<div class="nx-toast-text">${escapeHtml(text)}</div>` : ''}
      </div>
      <button type="button" class="nx-toast-close" aria-label="Dismiss notification">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="nx-toast-bar" style="${TONE[kind] || TONE.info}"></div>
  `;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('nx-toast-in'));

  const bar = el.querySelector('.nx-toast-bar');
  const dismiss = () => {
    el.classList.remove('nx-toast-in');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };

  let remaining = timer;
  let start = Date.now();
  let dismissTimer = setTimeout(dismiss, remaining);

  el.addEventListener('mouseenter', () => {
    clearTimeout(dismissTimer);
    remaining -= Date.now() - start;
    bar.style.animationPlayState = 'paused';
  });
  el.addEventListener('mouseleave', () => {
    start = Date.now();
    dismissTimer = setTimeout(dismiss, remaining);
    bar.style.animationPlayState = 'running';
  });
  el.querySelector('.nx-toast-close').addEventListener('click', () => {
    clearTimeout(dismissTimer);
    dismiss();
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}
