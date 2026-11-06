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

  // Desplegable de «El club»
  document.querySelectorAll(".abre-sub").forEach(function (b) {
    b.addEventListener("click", function () {
      var li = b.parentNode;
      var abierto = li.classList.toggle("abierto");
      b.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  });

  // YouTube, Instagram y TikTok con fachada: el reproductor solo se carga al pulsar.
  document.querySelectorAll("[data-marco]").forEach(function (el) {
    el.addEventListener("click", function () {
      var marco = document.createElement("iframe");
      marco.src = el.getAttribute("data-marco");
      marco.title = el.getAttribute("data-titulo") || "Vídeo";
      marco.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      marco.allowFullscreen = true;
      marco.className = el.className.replace("fachada", "marco");
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

  // ---------- Animaciones del inicio ----------
  // Sin JavaScript (o con «reducir movimiento») todo se ve ya, sin animar: el CSS solo oculta con la clase .js
  // y solo si el usuario no pidió menos movimiento.
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animables = document.querySelectorAll("[data-anim]");
  var mostrar = function (el) { el.classList.add("visto"); };
  if (reducir || !("IntersectionObserver" in window)) {
    animables.forEach(mostrar);
    return;
  }

  // Entrada al bajar: cada elemento aparece una sola vez
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) { mostrar(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  animables.forEach(function (el) { io.observe(el); });

  // Alto de la barra fija (para que las tarjetas de personas se apilen justo debajo)
  var cabecera = document.querySelector(".cabecera");
  var medirBarra = function () {
    if (cabecera) document.documentElement.style.setProperty("--barra", cabecera.offsetHeight + "px");
  };
  medirBarra();
  window.addEventListener("resize", medirBarra);

  // Parallax del título de la portada y tarjetas apiladas de las personas: un solo bucle con requestAnimationFrame,
  // que solo trabaja mientras esas zonas se ven.
  var titulo = document.querySelector("[data-parallax]");
  var portada = document.getElementById("portada");
  var tarjetas = Array.prototype.slice.call(document.querySelectorAll(".persona-pila"));
  var zonaPersonas = document.querySelector(".pila-personas");
  var portadaVisible = !!portada, personasVisibles = false, pendiente = false;

  var actualizar = function () {
    pendiente = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (titulo && portadaVisible) {
      var d = Math.min(y, 800);
      titulo.style.transform = "translate3d(0," + (d * 0.22).toFixed(1) + "px,0)";
      titulo.style.opacity = String(Math.max(0, 1 - d / 700).toFixed(3));
    }
    if (personasVisibles) {
      var barra = cabecera ? cabecera.offsetHeight : 92;
      var alto = window.innerHeight - barra;
      var apiladas = window.matchMedia("(min-width: 801px)").matches;
      tarjetas.forEach(function (t, i) {
        var sig = tarjetas[i + 1];
        var cubre = 0;
        if (sig && apiladas) {
          // 0 = la siguiente aún no llega; 1 = ya la tapa del todo
          cubre = 1 - (sig.getBoundingClientRect().top - barra) / alto;
          cubre = Math.max(0, Math.min(1, cubre));
        }
        var foto = t.firstElementChild;
        t.style.setProperty("--cubre", (cubre * 0.75).toFixed(3));
        if (foto) foto.style.transform = cubre ? "scale(" + (1 - 0.07 * cubre).toFixed(4) + ")" : "";
      });
    }
  };
  var pedir = function () {
    if (!pendiente) { pendiente = true; window.requestAnimationFrame(actualizar); }
  };
  var vigilar = function (el, fijar) {
    if (!el) return;
    new IntersectionObserver(function (es) { fijar(es[0].isIntersecting); pedir(); }, { rootMargin: "100px 0px" }).observe(el);
  };
  vigilar(portada, function (v) { portadaVisible = v; });
  vigilar(zonaPersonas, function (v) { personasVisibles = v; });
  window.addEventListener("scroll", pedir, { passive: true });
  window.addEventListener("resize", pedir);
  pedir();
})();
