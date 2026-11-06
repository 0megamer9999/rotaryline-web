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
      lista.querySelectorAll(".ev-card").forEach(function (e) {
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

  // ---------- Animaciones ----------
  // Sin JavaScript (o con «reducir movimiento») todo se ve ya, sin animar: el CSS solo oculta con la clase .js
  // y solo si el usuario no pidió menos movimiento.
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animables = document.querySelectorAll("[data-anim]");
  var mostrar = function (el) { el.classList.add("visto"); };
  if (reducir || !("IntersectionObserver" in window)) {
    animables.forEach(mostrar);
    return;
  }

  // Entrada al bajar: cada elemento aparece una sola vez, cuando ya está bien dentro de la pantalla
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) { mostrar(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.3, rootMargin: "0px 0px -16% 0px" });
  animables.forEach(function (el) { io.observe(el); });

  // Alto de la barra fija (las zonas fijas y apiladas se pegan justo debajo)
  var cabecera = document.querySelector(".cabecera");
  var medirBarra = function () {
    if (cabecera) document.documentElement.style.setProperty("--barra", cabecera.offsetHeight + "px");
  };
  medirBarra();
  window.addEventListener("resize", medirBarra);

  // Un solo bucle con requestAnimationFrame: parallax del título, Quiénes somos y personas apiladas.
  // Solo trabaja mientras esas zonas se ven.
  var titulo = document.querySelector("[data-parallax]");
  var portada = document.getElementById("portada");
  var pista = document.getElementById("quienes-somos");
  var fotosQs = pista ? Array.prototype.slice.call(pista.querySelectorAll(".qs-fotos a")) : [];
  var tarjetas = Array.prototype.slice.call(document.querySelectorAll(".persona-pila"));
  var zonaPersonas = document.querySelector(".pila-personas");
  var visible = { portada: !!portada, qs: false, personas: false };
  var pendiente = false;
  var ancha = window.matchMedia("(min-width: 801px)");

  var acota = function (x) { return Math.max(0, Math.min(1, x)); };
  var suave = function (x) { return x * x * (3 - 2 * x); };

  var actualizar = function () {
    pendiente = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var barra = cabecera ? cabecera.offsetHeight : 92;

    if (titulo && visible.portada) {
      var d = Math.min(y, 800);
      titulo.style.transform = "translate3d(0," + (d * 0.22).toFixed(1) + "px,0)";
      titulo.style.opacity = (Math.max(0, 1 - d / 700)).toFixed(3);
    }

    // Quiénes somos: el texto queda fijo; con el scroll van entrando las fotos una a una y al final cubren todo el bloque
    if (pista && visible.qs) {
      var fijo = pista.firstElementChild;
      if (ancha.matches) {
        var total = pista.offsetHeight - fijo.offsetHeight;
        var p = acota((barra - pista.getBoundingClientRect().top) / total);
        var n = fotosQs.length || 1;
        // Ninguna foto al cargar; al bajar un poco entran todas, escalonadas y rápido (p = 0.06 a 0.24)
        fotosQs.forEach(function (a, i) {
          var tp = suave(acota((p - (0.06 + 0.02 * i)) / 0.06));
          a.style.opacity = tp.toFixed(3);
          a.style.transform = "translateY(" + ((1 - tp) * 40).toFixed(1) + "px) scale(" + (0.9 + 0.1 * tp).toFixed(3) + ")";
        });
        // de p=0.68 a p=0.9 el mosaico crece hasta cubrir el bloque entero; el resto, quieto para leer
        pista.style.setProperty("--exp", suave(acota((p - 0.68) / 0.22)).toFixed(3));
      } else {
        pista.style.removeProperty("--exp");
        fotosQs.forEach(function (a) { a.style.opacity = ""; a.style.transform = ""; });
      }
    }

    // Personas: la siguiente se desliza sobre la anterior, que se oscurece y encoge un poco
    if (visible.personas) {
      var alto = window.innerHeight - barra;
      tarjetas.forEach(function (t, i) {
        var sig = tarjetas[i + 1];
        var cubre = 0;
        if (sig && ancha.matches) {
          cubre = acota(1 - (sig.getBoundingClientRect().top - barra) / alto);
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
  var vigilar = function (el, clave) {
    if (!el) return;
    new IntersectionObserver(function (es) { visible[clave] = es[0].isIntersecting; pedir(); }, { rootMargin: "100px 0px" }).observe(el);
  };
  vigilar(portada, "portada");
  vigilar(pista, "qs");
  vigilar(zonaPersonas, "personas");
  window.addEventListener("scroll", pedir, { passive: true });
  window.addEventListener("resize", pedir);
  pedir();
})();
