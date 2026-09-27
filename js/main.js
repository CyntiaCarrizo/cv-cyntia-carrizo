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
  var heroOrder = ['.status-pill', '.hero h1', '.hero-tagline', '.hero-contacts', '.hero-portrait'];
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
     Fondo: puntos que flotan y se unen con líneas violetas cuando están cerca
     ========================================================================== */
  var net = (function () {
    var canvas = document.getElementById('net');
    if (!canvas) return { pointer: function () {} };
    var ctx = canvas.getContext('2d');
    var LINK = 150;          // distancia máxima (px) para dibujar una línea entre dos puntos
    var W, H;
    var nodes = [];
    var dust = [];
    var px = 0.5;            // posición del personaje (0 a 1): mueve el fondo en paralaje
    var py = 0.5;
    var mx = -9999;          // posición del mouse
    var my = -9999;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(90, W * H / 16000)); // menos puntos en pantallas chicas
      nodes = Array.from({ length: n }, function () {
        return {
          x: Math.random() * W, y: Math.random() * H,
          z: 0.4 + Math.random() * 0.6,                 // profundidad para el paralaje
          vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
          r: Math.random() < 0.18 ? 2.6 : 1.4
        };
      });
      dust = Array.from({ length: Math.round(n * 2.2) }, function () {
        return { x: Math.random() * W, y: Math.random() * H, a: Math.random() * 0.5 };
      });
    }
    window.addEventListener('resize', resize);
    resize();
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });

    function frame() {
      ctx.clearRect(0, 0, W, H);
      dust.forEach(function (d) {
        ctx.fillStyle = 'rgba(170, 150, 255, ' + d.a + ')';
        ctx.fillRect(d.x, d.y, 1, 1);
      });

      var ox = (0.5 - px) * 40;
      var oy = (py - 0.5) * 24;
      var points = nodes.map(function (n) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        if (n.y > H + 20) n.y = -20;
        return { x: n.x + ox * n.z, y: n.y + oy * n.z, n: n };
      });

      // Líneas: más visibles cuanto más cerca están los puntos entre sí y del mouse
      ctx.lineWidth = 0.7;
      for (var i = 0; i < points.length; i++) {
        for (var j = i + 1; j < points.length; j++) {
          var d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          if (d >= LINK) continue;
          var midX = (points[i].x + points[j].x) / 2 - mx;
          var midY = (points[i].y + points[j].y) / 2 - my;
          var near = Math.max(0, 1 - Math.hypot(midX, midY) / 220);
          ctx.strokeStyle = 'rgba(139, 107, 255, ' + (1 - d / LINK) * (0.28 + near * 0.5) + ')';
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }

      // Puntos: se agrandan y se vuelven rosados cerca del mouse
      ctx.shadowColor = '#8B6BFF';
      points.forEach(function (p) {
        var near = Math.max(0, 1 - Math.hypot(p.x - mx, p.y - my) / 200);
        ctx.fillStyle = near > 0.05 ? 'rgba(224, 79, 192, ' + (0.6 + near * 0.4) + ')' : 'rgba(166, 140, 255, 0.85)';
        ctx.shadowBlur = p.n.r > 2 ? 10 : 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.n.r + near * 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);

    return { pointer: function (x, y) { px = x; py = y; } };
  })();

  /* ==========================================================================
     Personaje: gira la cabeza siguiendo al mouse (o al dedo en celular)
     ========================================================================== */
  var face = document.getElementById('face');
  if (face) {
    var FRAME_COUNT = 89;      // archivos img/personaje/00.webp … 88.webp
    var FRONT = 55;            // fotograma donde mira de frente (00 = derecha, 88 = izquierda)
    var SENSITIVITY = 1.35;    // >1 = llega al giro completo sin ir hasta el borde de la pantalla
    var EASE = 0.09;           // suavizado: más alto = gira más rápido
    var TILT_DEG = 3;          // inclinación vertical sutil
    var IDLE_MS = 2500;        // tiempo quieto antes de volver a mirar de frente

    var fctx = face.getContext('2d');
    var frames = [];
    var restIndex = FRONT;

    function drawFrame(i) {
      var img = frames[i];
      if (!img || !img.complete || !img.naturalWidth) return false;
      fctx.clearRect(0, 0, face.width, face.height);
      fctx.drawImage(img, 0, 0, face.width, face.height);
      return true;
    }

    function loadFrame(i) {
      var img = new Image();
      img.decoding = 'async';
      img.src = 'img/personaje/' + String(i).padStart(2, '0') + '.webp';
      frames[i] = img;
      return img;
    }

    // Primero la pose de reposo; el resto se descarga cuando termina de cargar la página
    loadFrame(restIndex).onload = function () { drawFrame(restIndex); };
    function loadRest() {
      for (var i = 0; i < FRAME_COUNT; i++) if (!frames[i]) loadFrame(i);
    }
    if (document.readyState === 'complete') loadRest();
    else window.addEventListener('load', loadRest);

    // 0.5 = centro de la pantalla = mira de frente
    var targetX = 0.5, targetY = 0.5, curX = 0.5, curY = 0.5;
    var lastMove = 0;
    var lastFrame = -1;

    function setFromPoint(x, y) {
      var nx = 0.5 + (x / window.innerWidth - 0.5) * SENSITIVITY;
      targetX = 1 - clamp(nx, 0, 1);   // cursor a la derecha => mira a la derecha (fotograma 0)
      targetY = clamp(y / window.innerHeight, 0, 1);
      lastMove = performance.now();
    }
    window.addEventListener('pointermove', function (e) { setFromPoint(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (t) setFromPoint(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { lastMove = 0; });

    (function tick(now) {
      if (now - lastMove > IDLE_MS) { targetX = 0.5; targetY = 0.5; }
      curX += (targetX - curX) * EASE;
      curY += (targetY - curY) * EASE;
      // Mitad derecha de la pantalla -> fotogramas 0..FRONT; mitad izquierda -> FRONT..último
      var last = FRAME_COUNT - 1;
      var idx = curX <= 0.5
        ? Math.round(curX * 2 * FRONT)
        : Math.round(FRONT + (curX - 0.5) * 2 * (last - FRONT));
      // Si ese fotograma todavía no llegó, se queda en el anterior
      if (idx !== lastFrame && drawFrame(idx)) lastFrame = idx;
      face.style.transform = 'perspective(900px) rotateX(' + (0.5 - curY) * TILT_DEG + 'deg) translateY(' + (curY - 0.5) * 8 + 'px)';
      net.pointer(curX, curY);
      window.requestAnimationFrame(tick);
    })(0);
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
