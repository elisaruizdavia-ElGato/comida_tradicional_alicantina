// ================================
// Google Analytics (cuenta las visitas de todas las páginas)
// Para que NO cuente tus propias visitas, abre una vez en cada
// móvil u ordenador tuyo la web con ?soyyo al final:
//   https://elisaruizdavia-elgato.github.io/comida_tradicional_alicantina/?soyyo
// Para volver a contarlas: ?soyyo=0
// ================================
(function () {
  var ID = 'G-FQ8R8CC0X5';
  var params = new URLSearchParams(location.search);
  try {
    if (params.has('soyyo')) {
      if (params.get('soyyo') === '0') {
        localStorage.removeItem('noContarMisVisitas');
        alert('Listo: este dispositivo vuelve a contar en las estadísticas.');
      } else {
        localStorage.setItem('noContarMisVisitas', '1');
        alert('Listo: las visitas desde este dispositivo ya no cuentan en las estadísticas.');
      }
    }
    if (localStorage.getItem('noContarMisVisitas')) return;
  } catch (e) {}

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', ID);
})();
