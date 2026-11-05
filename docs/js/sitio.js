// Rotary&Line: JavaScript mínimo y sin dependencias. No guarda nada ni hace peticiones.
(function () {
  // Menú del móvil
  var boton = document.querySelector(".boton-menu");
  var menu = document.getElementById("menu");
  if (boton && menu) {
    boton.addEventListener("click", function () {
      var abierto = menu.classList.toggle("abierto");
      boton.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  }

  // Vídeos de YouTube con fachada: el reproductor solo se carga al pulsar.
  document.querySelectorAll("[data-youtube]").forEach(function (el) {
    el.addEventListener("click", function () {
      var id = el.getAttribute("data-youtube");
      var marco = document.createElement("iframe");
      marco.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
      marco.title = el.getAttribute("data-titulo") || "Vídeo de YouTube";
      marco.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      marco.allowFullscreen = true;
      el.replaceWith(marco);
      marco.focus();
    });
  });

  // Filtro de eventos por coche y por fecha
  var lista = document.getElementById("lista-eventos");
  if (lista) {
    var chips = document.querySelectorAll("[data-filtro-coche]");
    var soloFuturos = document.getElementById("solo-proximos");
    var vacio = document.getElementById("sin-eventos");
    var coche = "";
    var hoy = new Date().toISOString().slice(0, 10);
    var aplicar = function () {
      var visibles = 0;
      lista.querySelectorAll(".evento").forEach(function (e) {
        var coches = (e.getAttribute("data-coches") || "").split(" ");
        var ok = (!coche || coches.indexOf(coche) !== -1) &&
          (!soloFuturos.checked || e.getAttribute("data-fecha") >= hoy);
        e.hidden = !ok;
        if (ok) visibles++;
      });
      vacio.hidden = visibles !== 0;
    };
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        coche = c.getAttribute("data-filtro-coche");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        aplicar();
      });
    });
    soloFuturos.addEventListener("change", aplicar);
    aplicar();
  }
})();
