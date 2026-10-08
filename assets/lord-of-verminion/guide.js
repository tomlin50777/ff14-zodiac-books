(() => {
  'use strict';

  const tabs = [...document.querySelectorAll('.step-tab')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const previous = document.getElementById('previous-step');
  const next = document.getElementById('next-step');
  const currentNumber = document.getElementById('current-step-number');
  const currentLabel = document.getElementById('current-step-label');
  const walkthrough = document.querySelector('.walkthrough');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;

  function showStep(index, { updateHash = true, focusTab = false, reveal = false } = {}) {
    if (index < 0 || index >= panels.length) return;
    activeIndex = index;
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    previous.disabled = index === 0;
    next.disabled = index === panels.length - 1;
    currentNumber.textContent = String(index + 1).padStart(2, '0');
    currentLabel.textContent = tabs[index].lastElementChild.textContent;
    if (updateHash && location.hash !== `#${panels[index].id}`) {
      // Some file preview hosts restrict history; navigation still works there.
      try { history.replaceState(null, '', `#${panels[index].id}`); } catch (_) { /* no URL update needed */ }
    }
    if (focusTab) tabs[index].focus({ preventScroll: true });
    if (reveal) walkthrough.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showStep(index));
    tab.addEventListener('keydown', event => {
      let target = index;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      else return;
      event.preventDefault();
      showStep(target, { focusTab: true });
    });
  });

  previous.addEventListener('click', () => showStep(activeIndex - 1, { focusTab: true, reveal: true }));
  next.addEventListener('click', () => showStep(activeIndex + 1, { focusTab: true, reveal: true }));
  document.querySelectorAll('[data-go-step]').forEach(button => {
    button.addEventListener('click', () => {
      const index = panels.findIndex(panel => panel.id === button.dataset.goStep);
      showStep(index, { focusTab: true, reveal: true });
    });
  });

  function readHash() {
    const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
    showStep(index >= 0 ? index : 0, { updateHash: false });
  }
  window.addEventListener('hashchange', readHash);
  readHash();

  const dialog = document.getElementById('image-dialog');
  const dialogTitle = document.getElementById('image-dialog-title');
  const zoomContent = document.getElementById('zoom-content');
  let zoomTrigger = null;

  document.querySelectorAll('[data-zoom]').forEach(button => {
    button.addEventListener('click', () => {
      const visual = button.querySelector('.visual-canvas');
      if (!visual || typeof dialog.showModal !== 'function') return;
      const enlarged = visual.cloneNode(true);
      enlarged.querySelector('img').loading = 'eager';
      zoomContent.replaceChildren(enlarged);
      dialogTitle.textContent = button.dataset.title;
      zoomTrigger = button;
      dialog.showModal();
      document.body.classList.add('image-open');
      dialog.querySelector('.dialog-close').focus();
    });
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('image-open');
    zoomContent.replaceChildren();
    if (zoomTrigger) zoomTrigger.focus({ preventScroll: true });
  });
})();
