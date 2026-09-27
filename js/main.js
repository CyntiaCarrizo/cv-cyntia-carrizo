(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /* ==========================================================================
     Copiar email: no depende de que el visitante tenga un programa de correo
     ========================================================================== */
  document.querySelectorAll('[data-copy]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (!navigator.clipboard) return; // sin soporte: sigue funcionando como mailto
      e.preventDefault();
      navigator.clipboard.writeText(link.dataset.copy).then(function () {
        var original = link.textContent;
        link.textContent = '¡Email copiado!';
        setTimeout(function () { link.textContent = original; }, 1800);
      }).catch(function () {
        window.location.href = link.href; // si el navegador bloquea el copiado, abre el mailto
      });
    });
  });

  // Quien pide "reducir movimiento" en su sistema ve la página completa y quieta
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var updaters = [];

  /* ==========================================================================
     Aparición al hacer scroll
     ========================================================================== */
  var heroOrder = ['.status-pill', '.hero h1', '.hero-tagline', '.hero-contacts'];
  heroOrder.forEach(function (selector, i) {
    var el = document.querySelector(selector);
    if (el) el.style.setProperty('--delay', (0.1 + i * 0.15) + 's');
  });
  // Elementos en grilla: cada uno entra un poquito después que el anterior
  ['.stack-group', '.edu-card'].forEach(function (selector) {
    document.querySelectorAll(selector).forEach(function (el, i) {
      el.style.setProperty('--delay', (i * 0.1) + 's');
    });
  });

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // se anima una sola vez
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ==========================================================================
     Foto magnética: sigue al mouse cuando el cursor se acerca
     ========================================================================== */
  var magnet = document.querySelector('[data-magnet]');
  if (magnet && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var PADDING = 150;  // distancia (px) desde el borde en la que empieza a atraer
    var STRENGTH = 4;   // cuanto más alto, menos se mueve
    var tx = 0;
    var ty = 0;

    window.addEventListener('mousemove', function (e) {
      var rect = magnet.getBoundingClientRect();
      // Centro "real", descontando el desplazamiento que ya le aplicamos
      var cx = rect.left + rect.width / 2 - tx;
      var cy = rect.top + rect.height / 2 - ty;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var near = Math.abs(dx) < rect.width / 2 + PADDING &&
                 Math.abs(dy) < rect.height / 2 + PADDING;

      if (near) {
        tx = dx / STRENGTH;
        ty = dy / STRENGTH;
        magnet.style.transition = 'translate 0.3s ease-out';
      } else {
        tx = 0;
        ty = 0;
        magnet.style.transition = 'translate 0.6s ease-in-out';
      }
      magnet.style.translate = tx + 'px ' + ty + 'px';
    }, { passive: true });
  }

  /* ==========================================================================
     Texto que se ilumina letra por letra al hacer scroll
     ========================================================================== */
  document.querySelectorAll('[data-scroll-text]').forEach(function (p) {
    var text = p.textContent.trim().replace(/\s+/g, ' ');
    var words = text.split(' ');
    var chars = [];

    // Copia oculta del texto completo para lectores de pantalla
    var srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;

    // Versión visual: cada palabra agrupa sus letras para que no se corte al saltar de línea
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    words.forEach(function (word, i) {
      var wordEl = document.createElement('span');
      wordEl.className = 'scroll-word';
      Array.from(word).forEach(function (ch) {
        var charEl = document.createElement('span');
        charEl.className = 'scroll-char';
        charEl.textContent = ch;
        wordEl.appendChild(charEl);
        chars.push(charEl);
      });
      visual.appendChild(wordEl);
      if (i < words.length - 1) visual.appendChild(document.createTextNode(' '));
    });

    p.textContent = '';
    p.appendChild(srText);
    p.appendChild(visual);

    updaters.push(function (vh) {
      var rect = p.getBoundingClientRect();
      // 0 cuando el párrafo entra al 80% de la pantalla, 1 cuando su final llega al 20%
      var progress = clamp((vh * 0.8 - rect.top) / (vh * 0.6 + rect.height), 0, 1);
      var n = chars.length;
      chars.forEach(function (charEl, i) {
        var local = clamp((progress - i / n) * n, 0, 1);
        charEl.style.opacity = 0.2 + 0.8 * local;
      });
    });
  });

  /* ==========================================================================
     Cinta de tecnologías: una fila va a la derecha y la otra a la izquierda
     ========================================================================== */
  var marquee = document.querySelector('.marquee');
  if (marquee) {
    var rows = Array.prototype.slice.call(marquee.querySelectorAll('.marquee-row'));

    // Se triplica el contenido para que nunca se vea un hueco en los bordes
    rows.forEach(function (row) {
      var original = row.innerHTML;
      row.innerHTML = original + original + original;
    });

    updaters.push(function (vh) {
      var rect = marquee.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return; // fuera de pantalla: no hace falta moverla
      var offset = (vh - rect.top) * 0.3;
      rows.forEach(function (row, i) {
        var third = row.scrollWidth / 3;
        var direction = i % 2 === 0 ? 1 : -1;
        var shift = clamp(direction * (offset - 200), -third, third);
        row.style.transform = 'translate3d(' + (shift - third) + 'px, 0, 0)';
      });
    });
  }

  /* ==========================================================================
     Proyectos apilados: cada tarjeta queda fija y se achica al llegar la siguiente
     ========================================================================== */
  var stack = document.querySelector('.projects-stack');
  if (stack) {
    var cards = Array.prototype.slice.call(stack.querySelectorAll('.project'));
    // Solo en pantallas donde una tarjeta entra completa; en celular quedan en lista
    var stackQuery = window.matchMedia('(min-width: 641px) and (min-height: 620px)');

    cards.forEach(function (card, i) { card.style.setProperty('--i', i); });

    var applyStacking = function () {
      stack.classList.toggle('is-stacking', stackQuery.matches);
      if (!stackQuery.matches) cards.forEach(function (card) { card.style.scale = ''; });
    };
    applyStacking();
    if (stackQuery.addEventListener) stackQuery.addEventListener('change', applyStacking);

    updaters.push(function (vh) {
      if (!stackQuery.matches) return;
      var rect = stack.getBoundingClientRect();
      var scrollable = rect.height - vh;
      var progress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0;
      var n = cards.length;
      cards.forEach(function (card, i) {
        var targetScale = 1 - (n - 1 - i) * 0.03;
        var start = i / n;
        var local = clamp((progress - start) / (1 - start), 0, 1);
        card.style.scale = 1 + (targetScale - 1) * local;
      });
    });
  }

  /* ==========================================================================
     Un solo listener de scroll para todos los efectos (1 actualización por frame)
     ========================================================================== */
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    updaters.forEach(function (fn) { fn(vh); });
  }
  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
})();
