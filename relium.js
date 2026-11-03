/**
 * Relium marketing site behaviour.
 *
 * Four things and nothing else: the theme toggle, the frosted nav, the mobile
 * menu and the reveal on scroll. The homepage's console and layer stack live
 * in relium-home.js. No analytics, no tracker, no third-party script, no
 * network request — which is what lets the privacy page say so plainly.
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
    /* Storage blocked. The dark default still applies for this page view. */
  }
  // Dark first: light only when the visitor chose it.
  setTheme(storedTheme === "light" ? "light" : "dark");

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

  /* ----------------------------------------------------------------- nav --
     Transparent over the top of the page, frosted once anything scrolls
     beneath it. */
  var nav = document.querySelector(".site-nav");
  if (nav) {
    var scrolled = null;
    var syncNav = function () {
      var next = window.scrollY > 8;
      if (next !== scrolled) {
        scrolled = next;
        nav.classList.toggle("is-scrolled", next);
      }
    };
    syncNav();
    window.addEventListener("scroll", syncNav, { passive: true });
  }

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
}());
