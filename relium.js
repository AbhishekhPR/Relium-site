/**
 * Relium marketing site behaviour.
 *
 * Four things and nothing else: the theme toggle, the mobile menu, the reveal
 * on scroll, and the interactive review map. No analytics, no tracker, no
 * third-party script, no network request — which is what lets the privacy
 * page say so plainly.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var storageKey = "relium-theme";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------------- URLs --
     Served with cleanUrls, so /pricing.html and /pricing are the same page.
     Normalise the address bar to the canonical form. */
  if (window.location && window.history && window.history.replaceState) {
    var cleanPath = window.location.pathname
      .replace(/\/index\.html$/, "/")
      .replace(/\.html$/, "");
    if (cleanPath !== window.location.pathname) {
      window.history.replaceState(
        null,
        "",
        cleanPath + window.location.search + window.location.hash
      );
    }
  }

  /* --------------------------------------------------------------- theme -- */
  var toggles = document.querySelectorAll("[data-theme-toggle]");

  function setTheme(theme) {
    var dark = theme === "dark";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    Array.prototype.forEach.call(toggles, function (toggle) {
      var label = toggle.querySelector("[data-theme-label]");
      toggle.setAttribute("aria-pressed", String(dark));
      toggle.setAttribute(
        "aria-label",
        dark ? "Switch to light mode" : "Switch to dark mode"
      );
      if (label) {
        label.textContent = dark ? "Dark" : "Light";
      }
    });
  }

  var storedTheme = null;
  try {
    storedTheme = window.localStorage.getItem(storageKey);
  } catch (error) {
    /* Storage blocked. The light default still applies for this page view. */
  }
  setTheme(storedTheme === "dark" ? "dark" : "light");

  Array.prototype.forEach.call(toggles, function (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch (error) {
        /* Not remembered; the choice still applies to this page view. */
      }
    });
  });

  /* --------------------------------------------------------- mobile menu -- */
  Array.prototype.forEach.call(
    document.querySelectorAll(".mobile-menu-toggle"),
    function (button) {
      var menu = document.getElementById(button.getAttribute("aria-controls"));
      if (!menu) return;

      function setOpen(open) {
        button.setAttribute("aria-expanded", String(open));
        menu.classList.toggle("is-open", open);
      }

      button.addEventListener("click", function () {
        setOpen(button.getAttribute("aria-expanded") !== "true");
      });
      Array.prototype.forEach.call(
        menu.querySelectorAll("a,button"),
        function (item) {
          item.addEventListener("click", function () { setOpen(false); });
        }
      );
      // Escape closes the drawer and returns focus, so keyboard users are
      // never stranded inside it.
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
          setOpen(false);
          button.focus();
        }
      });
    }
  );

  /* -------------------------------------------------------------- reveal -- */
  var revealItems = document.querySelectorAll(".reveal");

  function revealAll() {
    Array.prototype.forEach.call(revealItems, function (item) {
      item.classList.add("reveal-visible");
    });
  }

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          // Intersecting, or already scrolled past. The second case matters:
          // landing on /#pricing jumps the browser down the page, and an
          // observer that only reacts to isIntersecting would leave every
          // section above the anchor invisible for as long as the page is open.
          if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );
    Array.prototype.forEach.call(revealItems, function (item) {
      observer.observe(item);
    });
    // Belt and braces: if something goes wrong with the observer, the content
    // must still be readable. Never let an animation gate the copy.
    window.setTimeout(revealAll, 2500);
  }

  /* ---------------------------------------------------------- review map -- */
  var pipelineGraph = document.querySelector(".data-pipeline-graph");
  var pipelineSection = document.querySelector("#pipeline");

  function initReviewMap() {
    if (!pipelineGraph) return;
    var nodes = pipelineGraph.querySelectorAll("[data-pipeline-step]");
    var inspector = pipelineGraph.querySelector(".pipeline-inspector");
    if (!nodes.length || !inspector) return;

    var kicker = inspector.querySelector("[data-inspector-kicker]");
    var title = inspector.querySelector("[data-inspector-title]");
    var body = inspector.querySelector("[data-inspector-body]");
    var metric = inspector.querySelector("[data-inspector-metric]");
    var owner = inspector.querySelector("[data-inspector-owner]");

    function selectNode(node) {
      Array.prototype.forEach.call(nodes, function (item) {
        var selected = item === node;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      if (kicker) kicker.textContent = node.getAttribute("data-kicker") || "";
      if (title) title.textContent = node.getAttribute("data-title") || "";
      if (body) body.textContent = node.getAttribute("data-body") || "";
      if (metric) metric.textContent = node.getAttribute("data-metric") || "";
      if (owner) owner.textContent = node.getAttribute("data-owner") || "";
      inspector.classList.remove("is-updating");
      window.requestAnimationFrame(function () {
        inspector.classList.add("is-updating");
      });
    }

    Array.prototype.forEach.call(nodes, function (node) {
      node.addEventListener("mouseenter", function () { selectNode(node); });
      node.addEventListener("focus", function () { selectNode(node); });
      node.addEventListener("click", function () { selectNode(node); });
    });
  }

  function beginSvgAnimation(animation, delay) {
    window.setTimeout(function () {
      if (animation && typeof animation.beginElement === "function") {
        animation.beginElement();
      }
    }, delay);
  }

  function activatePipeline() {
    if (!pipelineGraph || pipelineGraph.dataset.pipelineActivated === "true") return;
    pipelineGraph.dataset.pipelineActivated = "true";
    pipelineGraph.classList.add("pipeline-visible");

    if (reducedMotion.matches) {
      pipelineGraph.classList.add("pipeline-reduced");
      return;
    }

    window.setTimeout(function () {
      pipelineGraph.classList.add("pipeline-flowing");
      Array.prototype.forEach.call(
        pipelineGraph.querySelectorAll(".pipeline-motion"),
        function (animation) {
          var delay = parseFloat(animation.getAttribute("data-delay") || "0") * 1000;
          beginSvgAnimation(animation, delay);
        }
      );

      var stage = pipelineGraph.querySelector(".transformation-layer");
      function showRiskCaught() {
        if (!stage) return;
        stage.classList.add("risk-caught");
        window.setTimeout(function () {
          stage.classList.remove("risk-caught");
        }, 1250);
      }
      window.setTimeout(showRiskCaught, 1500);
      window.setInterval(showRiskCaught, 4200);
    }, 700);
  }

  if (pipelineGraph) {
    initReviewMap();
    pipelineGraph.classList.add("pipeline-primed");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      activatePipeline();
    } else {
      var pipelineObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
            activatePipeline();
            pipelineObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.2 }
      );
      pipelineObserver.observe(pipelineSection || pipelineGraph);
    }
  }
}());
