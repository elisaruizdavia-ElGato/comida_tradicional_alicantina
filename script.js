// ================================
// Marcar/desmarcar ingredientes al tocar
// ================================
document.querySelectorAll('.ingredientes li').forEach(function (li) {
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
  var lista = document.querySelector('.ingredientes');
  var card = document.querySelector('.card-ingredientes');
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
document.querySelectorAll('img.imagen-receta').forEach(function (img) {
  function ocultar() { img.style.display = 'none'; }
  if (img.complete && img.naturalWidth === 0) ocultar();
  img.addEventListener('error', ocultar);
});

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
    var actual = decodeURIComponent(location.pathname.split('/').pop());
    var html = '<div class="menu-cabecera"><span>Recetas</span>' +
      '<button type="button" class="menu-cerrar" aria-label="Cerrar el menú">✕</button></div>' +
      '<a class="menu-inicio" href="index.html">Inicio</a>';
    docPortada.querySelectorAll('.seccion').forEach(function (sec) {
      var titulo = sec.querySelector('h2');
      html += '<h3>' + (titulo ? titulo.textContent : '') + '</h3><ul>';
      sec.querySelectorAll('.tarjeta').forEach(function (t) {
        var href = t.getAttribute('href');
        var nombre = t.querySelector('.nombre').textContent;
        var esta = decodeURIComponent(href) === actual ? ' class="actual" aria-current="page"' : '';
        html += '<li><a href="' + href + '"' + esta + '>' + nombre + '</a></li>';
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

// ================================
// Carrusel de fotos: flechas y puntitos
// En el HTML basta con poner las fotos dentro de
// <div class="carrusel"><div class="carrusel-pista"> ... </div></div>
// ================================
document.querySelectorAll('.carrusel').forEach(function (carrusel) {
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
});
