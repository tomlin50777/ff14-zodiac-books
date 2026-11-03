/* Section state only. Existing page handlers remain responsible for navigation,
   progress, confirmation dialogs, and all stored data. */
(function () {
  function updateZodiacSection() {
    const nav = document.querySelector('.zodiac-section-nav');
    if (!nav) return;
    const activeId = location.hash === '#alexandrite' ? 'alexTop' : 'allBooks';
    ['allBooks', 'alexTop'].forEach(function (id) {
      const button = nav.querySelector('#' + id);
      if (!button) return;
      const active = id === activeId;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateZodiacSection);
  else updateZodiacSection();
  window.addEventListener('hashchange', updateZodiacSection);
  window.addEventListener('popstate', updateZodiacSection);
  // closeBook() uses history.pushState(), which does not emit hashchange.
  // Document bubbling runs after each existing button's own click handler.
  document.addEventListener('click', function (event) {
    if (event.target.closest('#allBooks, #alexTop, #backBtn, #alexBack, #alexHome')) updateZodiacSection();
  });
})();
