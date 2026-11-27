// ================================
// Todo lo que va dentro de una receta se prepara con esta función.
// Se llama al abrir la página y también con la receta vecina
// cuando se pasa de una a otra deslizando el dedo (sin recargar).
// ================================
function iniciarContenido(raiz) {

// ================================
// Marcar/desmarcar ingredientes al tocar
// ================================
raiz.querySelectorAll('.ingredientes li').forEach(function (li) {
  li.addEventListener('click', function () {
    this.classList.toggle('checked');
  });
});

// ================================
// Selector de comensales
// La lista de ingredientes lleva data-comensales="2" (para cuántas personas
// están escritas las cantidades). Si no lo lleva, se asume 2.
// Al abrir una receta se muestra siempre para POR_DEFECTO personas
// (o lo último que eligió el visitante).
// ================================
(function () {
  var lista = raiz.querySelector('.ingredientes');
  var card = raiz.querySelector('.card-ingredientes');
  if (!lista || !card || lista.hasAttribute('data-sin-comensales')) return;

  var base = parseFloat(lista.getAttribute('data-comensales')) || 2;
  var MAX = 6;
  var POR_DEFECTO = 2;

  var FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  var NUM_RE = /(\d+(?:[.,]\d+)?\s?[½¼¾⅓⅔]?|[½¼¾⅓⅔])/g;
  var UNIDADES = /^(g|kg|ml|l|cl|gr|grs)\b/i;

  function leerNumero(txt) {
    txt = txt.replace(/\s/g, '');
    var total = 0;
    var m = txt.match(/^(\d+(?:[.,]\d+)?)/);
    if (m) total += parseFloat(m[1].replace(',', '.'));
    var f = txt.match(/[½¼¾⅓⅔]/);
    if (f) total += FRAC[f[0]];
    return total;
  }

  function formatear(valor, conTercios, esPeso, originalEntero) {
    if (esPeso) {
      var paso = valor >= 100 ? 10 : 5;
      return String(Math.max(paso, Math.round(valor / paso) * paso));
    }
    if (valor >= 10) return String(Math.round(valor));
    // Cosas que se cuentan (dientes, huevos, clavos...): número entero
    if (originalEntero) return String(Math.max(1, Math.round(valor)));
    var div = conTercios ? 3 : 4;
    var r = Math.round(valor * div) / div;
    if (r === 0) r = 1 / div;
    var entero = Math.floor(r + 1e-9);
    var resto = r - entero;
    var simbolo = '';
    if (Math.abs(resto - 0.5) < 0.01) simbolo = '½';
    else if (Math.abs(resto - 0.25) < 0.01) simbolo = '¼';
    else if (Math.abs(resto - 0.75) < 0.01) simbolo = '¾';
    else if (Math.abs(resto - 1 / 3) < 0.01) simbolo = '⅓';
    else if (Math.abs(resto - 2 / 3) < 0.01) simbolo = '⅔';
    return (entero > 0 ? String(entero) : '') + simbolo;
  }

  function plural(palabra) {
    if (/s$/i.test(palabra)) return palabra;
    if (/ón$/.test(palabra)) return palabra.replace(/ón$/, 'ones');
    var acentos = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
    if (/[áéíú]n$/.test(palabra)) return palabra.replace(/([áéíú])n$/, function (_m, v) { return acentos[v] + 'nes'; });
    if (/z$/.test(palabra)) return palabra.replace(/z$/, 'ces');
    if (/[aeiouáéíóú]$/i.test(palabra)) return palabra + 's';
    if (/[lnrdj]$/i.test(palabra)) return palabra + 'es';
    return palabra + 's';
  }

  function singular(palabra) {
    if (/ones$/.test(palabra)) return palabra.replace(/ones$/, 'ón');
    if (/ces$/.test(palabra)) return palabra.replace(/ces$/, 'z');
    if (/[aeiou][lnrdj]es$/i.test(palabra)) return palabra.slice(0, -2);
    if (/s$/i.test(palabra)) return palabra.slice(0, -1);
    return palabra;
  }

  // Guardar el texto original de cada ingrediente
  var items = [];
  lista.querySelectorAll('li').forEach(function (li) {
    // Solo se escalan los ingredientes de texto simple
    if (li.children.length) return;
    var texto = li.textContent;
    if (/por persona/i.test(texto) || !NUM_RE.test(texto)) return;
    NUM_RE.lastIndex = 0;
    items.push({ li: li, original: texto });
  });

  function escalar(texto, factor) {
    var primero = true;
    var conTercios = /[⅓⅔]/.test(texto);
    return texto.replace(NUM_RE, function (match, _g, offset, todo) {
      var despues = todo.slice(offset + match.length).replace(/^\s+/, '');
      var esPeso = UNIDADES.test(despues);
      var original = leerNumero(match);
      var originalEntero = /^\d+\s?$/.test(match) && original >= 2;
      var valor = original * factor;
      var nuevo = formatear(valor, conTercios, esPeso, originalEntero);
      var valorMostrado = leerNumero(nuevo);
      var espacio = /\s$/.test(match) ? ' ' : '';
      if (primero) {
        primero = false;
        // Marca para ajustar singular/plural de la palabra siguiente
        return nuevo + espacio + '\u0000' + (valorMostrado > 1 ? 'P' : 'S');
      }
      return nuevo + espacio;
    }).replace(/\u0000([PS])(\s*)([A-Za-zÁÉÍÓÚáéíóúñÑü]+)(\s+[A-Za-zÁÉÍÓÚáéíóúñÑü]+)?/, function (_m, modo, esp, palabra, sig) {
      sig = sig || '';
      if (UNIDADES.test(palabra) || /^(de|del|y|o)$/i.test(palabra)) return esp + palabra + sig;
      var cambiar = modo === 'P' ? plural : singular;
      // Concordar también el adjetivo que va justo detrás (huevos duros, pimientos rojos)
      var adj = sig.trim();
      if (adj && !/^(de|del|y|o|a|en|con|para|para|al)$/i.test(adj)) {
        sig = sig.replace(adj, cambiar(adj));
      }
      return esp + cambiar(palabra) + sig;
    }).replace(/\u0000[PS]/g, '');
  }

  // Crear el desplegable
  var cabecera = card.querySelector('h2');
  var caja = document.createElement('div');
  caja.className = 'comensales';
  var opciones = '';
  for (var i = 1; i <= MAX; i++) {
    opciones += '<option value="' + i + '">' + i + (i === 1 ? ' persona' : ' personas') + '</option>';
  }
  caja.innerHTML =
    '<label for="selector-comensales">Para</label>' +
    '<select id="selector-comensales">' + opciones + '</select>';
  if (cabecera) {
    var fila = document.createElement('div');
    fila.className = 'cabecera-ingredientes';
    cabecera.parentNode.insertBefore(fila, cabecera);
    fila.appendChild(cabecera);
    fila.appendChild(caja);
  } else {
    card.insertBefore(caja, card.firstChild);
  }

  var select = caja.querySelector('select');
  var inicial = POR_DEFECTO;
  try {
    var guardado = parseInt(localStorage.getItem('comensales'), 10);
    if (guardado >= 1 && guardado <= MAX) inicial = guardado;
  } catch (e) {}
  select.value = String(Math.min(MAX, Math.max(1, Math.round(inicial))));

  function aplicar() {
    var n = parseInt(select.value, 10);
    var factor = n / base;
    items.forEach(function (it) {
      it.li.textContent = factor === 1 ? it.original : escalar(it.original, factor);
    });
    try { localStorage.setItem('comensales', String(n)); } catch (e) {}
  }

  select.addEventListener('change', aplicar);
  aplicar();
})();

// ================================
// Si falta la foto de la receta, ocultar el hueco roto
// ================================
raiz.querySelectorAll('img.imagen-receta').forEach(function (img) {
  function ocultar() { img.style.display = 'none'; }
  if (img.complete && img.naturalWidth === 0) ocultar();
  img.addEventListener('error', ocultar);
});

// ================================
// Carrusel de fotos: flechas y puntitos
// En el HTML basta con poner las fotos dentro de
// <div class="carrusel"><div class="carrusel-pista"> ... </div></div>
// ================================
raiz.querySelectorAll('.carrusel').forEach(iniciarCarrusel);

// ================================
// Tocar una foto de la receta para verla en grande
// ================================
raiz.querySelectorAll('.receta-wrapper .imagen-receta').forEach(function (f) {
  f.addEventListener('click', function () { abrirVisor(f); });
});

}
iniciarContenido(document);

// ================================
// Menú lateral (botón ☰ de la cabecera)
// Lee las recetas de la portada para no tener que mantener otra lista.
// ================================
(function () {
  var boton = document.querySelector('.boton-menu');
  if (!boton) return;

  var panel = null;
  var fondo = null;

  function cerrar() {
    if (!panel) return;
    panel.classList.remove('abierto');
    fondo.classList.remove('abierto');
    boton.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    boton.focus();
  }

  function abrir() {
    // Marcar la receta que se está viendo (puede haber cambiado al deslizar)
    var actual = decodeURIComponent(location.pathname.split('/').pop());
    panel.querySelectorAll('ul a').forEach(function (a) {
      var esta = decodeURIComponent(a.getAttribute('href')) === actual;
      a.classList.toggle('actual', esta);
      if (esta) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    panel.classList.add('abierto');
    fondo.classList.add('abierto');
    boton.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var primero = panel.querySelector('a, button');
    if (primero) primero.focus();
  }

  function construir(docPortada) {
    panel = document.createElement('nav');
    panel.className = 'menu-lateral';
    panel.setAttribute('aria-label', 'Recetas');
    var html = '<div class="menu-cabecera"><span>Recetas</span>' +
      '<button type="button" class="menu-cerrar" aria-label="Cerrar el menú">✕</button></div>' +
      '<a class="menu-inicio" href="index.html">Todas las recetas</a>';
    docPortada.querySelectorAll('.seccion').forEach(function (sec) {
      var titulo = sec.querySelector('h2');
      html += '<h3>' + (titulo ? titulo.textContent : '') + '</h3><ul>';
      sec.querySelectorAll('.tarjeta').forEach(function (t) {
        var href = t.getAttribute('href');
        var nombre = t.querySelector('.nombre').textContent;
        html += '<li><a href="' + href + '">' + nombre + '</a></li>';
      });
      html += '</ul>';
    });
    html += '<a class="menu-sobre-mi" href="quiensoy.html">Sobre mí</a>';
    panel.innerHTML = html;

    fondo = document.createElement('div');
    fondo.className = 'menu-fondo';

    document.body.appendChild(fondo);
    document.body.appendChild(panel);

    fondo.addEventListener('click', cerrar);
    panel.querySelector('.menu-cerrar').addEventListener('click', cerrar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  }

  boton.addEventListener('click', function (e) {
    if (panel) { e.preventDefault(); abrir(); return; }
    if (document.querySelector('.seccion')) { // estamos en la portada
      e.preventDefault();
      construir(document);
      void panel.offsetWidth;
      abrir();
      return;
    }
    if (!window.fetch || !window.DOMParser) return; // sin JS moderno: va a la portada
    e.preventDefault();
    fetch('index.html')
      .then(function (r) { return r.text(); })
      .then(function (texto) {
        construir(new DOMParser().parseFromString(texto, 'text/html'));
        // forzar el reflow para que se vea la animación
        void panel.offsetWidth;
        abrir();
      })
      .catch(function () { location.href = 'index.html'; });
  });
})();

function iniciarCarrusel(carrusel) {
  var pista = carrusel.querySelector('.carrusel-pista');
  var fotos = pista.querySelectorAll('img, video');
  if (fotos.length < 2) return;

  function boton(clase, texto, etiqueta) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'carrusel-flecha ' + clase;
    b.setAttribute('aria-label', etiqueta);
    b.innerHTML = texto;
    carrusel.appendChild(b);
    return b;
  }
  var anterior = boton('anterior', '&#8249;', 'Foto anterior');
  var siguiente = boton('siguiente', '&#8250;', 'Foto siguiente');

  var puntos = document.createElement('div');
  puntos.className = 'carrusel-puntos';
  fotos.forEach(function (_f, i) {
    var p = document.createElement('button');
    p.type = 'button';
    p.setAttribute('aria-label', 'Ver foto ' + (i + 1));
    p.addEventListener('click', function () { ir(i); });
    puntos.appendChild(p);
  });
  carrusel.appendChild(puntos);

  function actual() {
    return Math.round(pista.scrollLeft / pista.clientWidth);
  }
  function ir(i) {
    pista.scrollTo({ left: i * pista.clientWidth });
  }
  function refrescar() {
    var i = actual();
    anterior.disabled = i <= 0;
    siguiente.disabled = i >= fotos.length - 1;
    puntos.querySelectorAll('button').forEach(function (p, k) {
      p.classList.toggle('activo', k === i);
    });
  }

  anterior.addEventListener('click', function () { ir(actual() - 1); });
  siguiente.addEventListener('click', function () { ir(actual() + 1); });
  pista.addEventListener('scroll', function () { window.requestAnimationFrame(refrescar); });
  window.addEventListener('resize', refrescar);
  refrescar();
}

// ================================
// Pasar de receta deslizando el dedo
// Izquierda → siguiente receta, derecha → anterior.
// El orden es el de la portada. Abajo de cada receta
// también salen enlaces a la anterior y la siguiente.
// La receta vecina se descarga por adelantado (texto y foto grande)
// y al deslizar se cambia en el sitio, sin recargar la página,
// para que no haya parpadeo.
// ================================
(function () {
  if (!document.querySelector('.receta-wrapper') || document.querySelector('.seccion') || !document.querySelector('.card-ingredientes')) return;
  if (!window.fetch || !window.DOMParser) return;

  var lista = null;
  var ant = null, sig = null;
  var docs = {};       // recetas ya descargadas: href → documento
  var pedidas = {};    // descargas en marcha
  var fotosListas = []; // para que el navegador no suelte las fotos precargadas

  function nombreArchivo(url) {
    return decodeURIComponent(url.split('#')[0].split('?')[0].split('/').pop());
  }

  function contenidoDe(raiz) {
    return {
      titulo: raiz.querySelector('.titulo-receta'),
      wrapper: raiz.querySelector('.receta-wrapper')
    };
  }

  function descargar(href) {
    if (docs[href] || pedidas[href]) return pedidas[href] || Promise.resolve(docs[href]);
    pedidas[href] = fetch(href)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (texto) {
        var doc = new DOMParser().parseFromString(texto, 'text/html');
        if (!doc.querySelector('.receta-wrapper')) throw new Error('no es receta');
        // Precargar y descodificar la foto grande para que aparezca ya pintada
        var foto = doc.querySelector('.receta-wrapper img.imagen-receta');
        if (foto) {
          var im = new Image();
          im.src = foto.getAttribute('src');
          fotosListas.push(im);
          if (im.decode) im.decode().catch(function () {});
        }
        docs[href] = doc;
        delete pedidas[href];
        return doc;
      })
      .catch(function (e) { delete pedidas[href]; throw e; });
    return pedidas[href];
  }

  // La lista de recetas se guarda en el móvil para tenerla al instante;
  // se actualiza siempre en segundo plano por si hay recetas nuevas.
  function conLista(cb) {
    var hecho = false;
    try {
      var guardada = localStorage.getItem('listaRecetas2');
      if (guardada) { cb(JSON.parse(guardada)); hecho = true; }
    } catch (e) {}
    fetch('index.html', { cache: 'no-cache' })
      .then(function (r) { return r.text(); })
      .then(function (texto) {
        var doc = new DOMParser().parseFromString(texto, 'text/html');
        var nueva = [];
        doc.querySelectorAll('.seccion .tarjeta').forEach(function (t) {
          var img = t.querySelector('img');
          nueva.push({ href: t.getAttribute('href'), nombre: t.querySelector('.nombre').textContent, foto: img ? img.getAttribute('src') : '' });
        });
        try { localStorage.setItem('listaRecetas2', JSON.stringify(nueva)); } catch (e) {}
        if (!hecho) cb(nueva);
        else lista = nueva;
      })
      .catch(function () {});
  }

  // Calcula la anterior y la siguiente de la receta que se está viendo,
  // pone los enlaces de abajo y descarga las dos vecinas.
  function prepararVecinos() {
    ant = sig = null;
    if (!lista) return;
    var actual = nombreArchivo(location.pathname);
    var i = -1;
    lista.forEach(function (r, k) { if (decodeURIComponent(r.href) === actual) i = k; });
    if (i < 0) return;
    ant = lista[i - 1] || null;
    sig = lista[i + 1] || null;

    var wrapper = document.querySelector('body > .receta-wrapper') || document.querySelector('.receta-wrapper');
    var vieja = wrapper.querySelector('.entre-recetas');
    if (vieja) vieja.remove();
    var nav = document.createElement('nav');
    nav.className = 'entre-recetas';
    nav.setAttribute('aria-label', 'Otras recetas');
    nav.innerHTML =
      (ant ? '<a class="anterior" href="' + ant.href + '"><small>‹ Anterior</small>' + ant.nombre + '</a>' : '<span></span>') +
      (sig ? '<a class="siguiente" href="' + sig.href + '"><small>Siguiente ›</small>' + sig.nombre + '</a>' : '<span></span>');
    wrapper.appendChild(nav);

    [ant, sig].forEach(function (r) { if (r) descargar(r.href).catch(function () {}); });
  }

  conLista(function (l) { lista = l; prepararVecinos(); });

  // Enlaces "Anterior / Siguiente" de abajo: también sin recargar
  document.addEventListener('click', function (e) {
    var a = e.target.closest('.entre-recetas a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var href = a.getAttribute('href');
    if (!docs[href]) return; // aún no descargada: navegación normal
    e.preventDefault();
    poner(docs[href], href, true, 0);
  });

  // Sustituye la receta de la página por otra
  //   fuente: {titulo, wrapper} ya preparado, o un documento descargado
  function poner(fuente, href, guardarHistorial, scrollNuevo) {
    var viejo = contenidoDe(document);
    var nuevo;
    if (fuente.nodeType === 9) { // documento descargado: prepararlo aparte
      var c = contenidoDe(fuente);
      var caja = document.createElement('div');
      nuevo = {
        titulo: caja.appendChild(document.importNode(c.titulo, true)),
        wrapper: caja.appendChild(document.importNode(c.wrapper, true))
      };
      iniciarContenido(caja);
    } else {
      nuevo = fuente;
    }
    nuevo.titulo.style.transition = nuevo.titulo.style.transform = '';
    nuevo.wrapper.style.transition = nuevo.wrapper.style.transform = '';
    viejo.titulo.replaceWith(nuevo.titulo);
    viejo.wrapper.replaceWith(nuevo.wrapper);
    var doc = docs[href];
    if (doc) document.title = doc.title;
    if (guardarHistorial) history.pushState({ receta: href }, '', href);
    window.scrollTo(0, scrollNuevo || 0);
    try { window.dispatchEvent(new Event('resize')); } catch (e) {} // recolocar carruseles
    prepararVecinos();
  }

  // Botón "atrás"/"adelante" del navegador entre recetas
  window.addEventListener('popstate', function () {
    var href = nombreArchivo(location.pathname);
    var listo = docs[href] ? Promise.resolve(docs[href]) : descargar(href);
    listo.then(function (doc) { poner(doc, href, false, 0); })
      .catch(function () { location.reload(); });
  });

  // Gesto de deslizar: la receta sigue al dedo y la vecina entra por el lado
  var panel = null, panelDe = null, panelNuevo = null;
  var x0 = null, y0 = 0, t0 = 0, eje = null, dx = 0, ancho = 1, muestras = [];
  var cambiando = false;

  function partes() {
    var c = contenidoDe(document);
    return [c.titulo, c.wrapper].filter(Boolean);
  }

  function crearPanel(r, lado) {
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'panel-vecino';
    var cab = document.querySelector('.cabecera');
    var arriba = cab ? Math.max(0, cab.getBoundingClientRect().bottom) : 0;
    panel.style.top = arriba + 'px';
    panelNuevo = null;
    var doc = docs[r.href];
    if (doc) {
      // La receta de verdad, ya preparada: al soltar se queda tal cual
      var c = contenidoDe(doc);
      panelNuevo = {
        titulo: document.importNode(c.titulo, true),
        wrapper: document.importNode(c.wrapper, true)
      };
      panel.appendChild(panelNuevo.titulo);
      panel.appendChild(panelNuevo.wrapper);
      document.body.appendChild(panel);
      iniciarContenido(panel);
    } else {
      panel.innerHTML =
        '<div class="titulo-receta"><span class="volver">‹ Todas las recetas</span><h1></h1></div>' +
        '<div class="receta-wrapper">' + (r.foto ? '<img class="imagen-receta" alt="" />' : '') + '</div>';
      panel.querySelector('h1').textContent = r.nombre;
      if (r.foto) panel.querySelector('img').src = r.foto;
    }
    document.body.appendChild(panel);
    panelDe = lado;
  }

  function pintar(x, conTransicion) {
    var tr = conTransicion ? 'transform 0.22s ease-out' : 'none';
    partes().forEach(function (p) { p.style.transition = tr; p.style.transform = x ? 'translateX(' + x + 'px)' : ''; });
    if (panel) {
      panel.style.transition = tr;
      var base = panelDe === 'sig' ? ancho : -ancho;
      panel.style.transform = 'translateX(' + (base + x) + 'px)';
    }
  }

  function reiniciar() {
    partes().forEach(function (p) { p.style.transition = ''; p.style.transform = ''; });
    if (panel) { panel.remove(); panel = null; panelDe = null; panelNuevo = null; }
  }

  document.addEventListener('touchstart', function (e) {
    x0 = null; eje = null; dx = 0;
    if (cambiando || e.touches.length !== 1) return;
    var t = e.touches[0];
    // No interferir con el carrusel de fotos, el menú, el visor ni el gesto de "atrás" del borde
    if (e.target.closest('.carrusel, .menu-lateral, .visor, select, input')) return;
    if (document.querySelector('.menu-lateral.abierto')) return;
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); ancho = window.innerWidth; muestras = [[t0, 0]];
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (x0 === null) return;
    var t = e.touches[0];
    var mx = t.clientX - x0, my = t.clientY - y0;
    if (!eje) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      eje = Math.abs(mx) >= Math.abs(my) * 0.9 ? 'h' : 'v';
      if (eje === 'v') { x0 = null; return; }
    }
    e.preventDefault();
    var destino = mx < 0 ? sig : ant;
    var lado = mx < 0 ? 'sig' : 'ant';
    if (destino && panelDe !== lado) crearPanel(destino, lado);
    if (!destino && panel) { panel.remove(); panel = null; panelDe = null; panelNuevo = null; }
    dx = destino ? mx : mx * 0.25;   // resistencia si no hay más recetas
    var ahora = Date.now();
    muestras.push([ahora, mx]);
    while (muestras.length > 2 && ahora - muestras[0][0] > 120) muestras.shift();
    pintar(dx, false);
  }, { passive: false });

  function soltar() {
    if (x0 === null || eje !== 'h') { x0 = null; return; }
    x0 = null;
    // velocidad de los últimos ~120 ms (un toque rápido cuenta aunque sea corto)
    var p0 = muestras[0], p1 = muestras[muestras.length - 1];
    var vel = (p1[1] - p0[1]) / Math.max(1, p1[0] - p0[0]);
    var destino = dx < 0 ? sig : ant;
    var mismoSentido = (vel < 0) === (dx < 0);
    var pasa = destino && (Math.abs(dx) > ancho * 0.22 || (mismoSentido && Math.abs(vel) > 0.25 && Math.abs(dx) > 30));
    if (pasa) {
      cambiando = true;
      pintar(dx < 0 ? -ancho : ancho, true);
      setTimeout(function () {
        cambiando = false;
        if (panelNuevo) {
          // La vecina ya está en pantalla: se queda en la página tal cual,
          // con el desplazamiento justo para que no se mueva nada
          var cab = document.querySelector('.cabecera');
          var finCab = cab ? cab.getBoundingClientRect().bottom + window.scrollY : 0;
          var scrollNuevo = Math.min(window.scrollY, finCab);
          var nuevo = panelNuevo;
          var p = panel;
          panel = null; panelDe = null; panelNuevo = null;
          poner(nuevo, destino.href, true, scrollNuevo);
          p.remove();
        } else {
          location.href = destino.href;
        }
      }, 220);
    } else {
      pintar(0, true);
      setTimeout(reiniciar, 230);
    }
  }
  document.addEventListener('touchend', soltar, { passive: true });
  document.addEventListener('touchcancel', soltar, { passive: true });

  // Si se vuelve atrás con el navegador, dejar la receta en su sitio
  window.addEventListener('pageshow', reiniciar);
})();

// ================================
// Foto en grande (visor)
// ================================
function abrirVisor(original) {
    var visor = document.createElement('div');
    visor.className = 'visor';
    visor.setAttribute('role', 'dialog');
    visor.setAttribute('aria-label', 'Foto en grande');
    var copia;
    if (original.tagName === 'VIDEO') {
      copia = document.createElement('video');
      copia.src = original.currentSrc || original.src;
      copia.autoplay = true; copia.loop = true; copia.muted = true;
      copia.setAttribute('playsinline', '');
    } else {
      copia = document.createElement('img');
      copia.src = original.currentSrc || original.src;
      copia.alt = original.alt || '';
    }
    var cerrarBtn = document.createElement('button');
    cerrarBtn.type = 'button';
    cerrarBtn.className = 'visor-cerrar';
    cerrarBtn.setAttribute('aria-label', 'Cerrar');
    cerrarBtn.textContent = '✕';
    visor.appendChild(copia);
    visor.appendChild(cerrarBtn);
    document.body.appendChild(visor);
    document.body.style.overflow = 'hidden';

    function cerrar() {
      visor.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', tecla);
    }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    visor.addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla);
    cerrarBtn.focus();
}
