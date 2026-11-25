/* global document */
// Progressive enhancement: every original link opens its WebP without JavaScript.
(() => {
  const byId = (id) => document.getElementById(id);
  const dialog = byId('visor');
  if (typeof dialog.showModal !== 'function') return;
  const links = Array.from(document.querySelectorAll('figure > a'));
  const previous = byId('anterior'), next = byId('siguiente');
  let at = 0, origin;

  function show(index) {
    if (index < 0 || index >= links.length) return;
    at = index;
    const link = links[index], figure = link.closest('figure');
    const name = figure.querySelector('b').textContent;
    const folio = `${figure.closest('section').querySelector('h2').textContent} · ${index + 1} / ${links.length}`;
    const enlarged = byId('ampliada');
    enlarged.alt = link.querySelector('img').alt;
    enlarged.src = link.href;
    byId('nombre').textContent = name;
    byId('efecto').textContent = figure.querySelector('figcaption span').textContent;
    byId('folio').textContent = folio;
    byId('anuncio').textContent = `${name}. ${folio}`;
    previous.disabled = index === 0;
    next.disabled = index === links.length - 1;
    if (!dialog.open) dialog.showModal();
  }

  links.forEach((link, index) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      origin = link;
      show(index);
    });
  });
  previous.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  byId('cerrar').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(at + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  dialog.addEventListener('close', () => origin?.focus({preventScroll: true}));
})();