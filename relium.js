/**
 * Relium marketing site behaviour.
 *
 * Three things, and nothing else: the theme toggle, the mobile menu, and a
 * one-shot reveal on scroll. There is no analytics, no tracker, no third-party
 * script and no network request on this site — which is what lets the privacy
 * page say so plainly.
 *
 * The theme key is the SAME one the application writes (`relium.theme`), so a
 * customer who picks dark mode in the product and comes back to relium.dev on
 * the same browser is not thrown into a white page. Cross-subdomain sharing is
 * not possible from localStorage, so this is per-origin; it is a nicety, not a
 * guarantee, and nothing depends on it.
 */
(function () {
  'use strict'

  var root = document.documentElement
  var STORAGE_KEY = 'relium.theme'

  /* ------------------------------------------------------------------ theme */

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  }

  function applyTheme(next) {
    root.setAttribute('data-theme', next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch (e) {
      /* Storage unavailable (private mode, blocked cookies). The choice still
         applies for this page view; it simply is not remembered. */
    }
    var label = next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-theme-toggle]'),
      function (button) {
        button.setAttribute('aria-label', label)
        button.setAttribute('title', label)
      },
    )
  }

  applyTheme(currentTheme())

  Array.prototype.forEach.call(
    document.querySelectorAll('[data-theme-toggle]'),
    function (button) {
      button.addEventListener('click', function () {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark')
      })
    },
  )

  /* ------------------------------------------------------------ mobile menu */

  var toggle = document.querySelector('[data-nav-toggle]')
  var menu = document.getElementById('mobile-menu')

  function setMenu(open) {
    if (!menu || !toggle) return
    menu.setAttribute('data-open', open ? 'true' : 'false')
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(menu.getAttribute('data-open') !== 'true')
    })
    // Escape closes it and returns focus to the control that opened it, so
    // keyboard users are never stranded inside the drawer.
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.getAttribute('data-open') === 'true') {
        setMenu(false)
        toggle.focus()
      }
    })
    // Any navigation closes it; the links are same-page anchors as often as
    // they are page loads.
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (link) {
      link.addEventListener('click', function () { setMenu(false) })
    })
  }

  /* ----------------------------------------------------------------- reveal */

  var revealables = document.querySelectorAll('.reveal')
  if (!revealables.length) return

  var reducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // No IntersectionObserver, or motion is unwanted: show everything at once.
  // The content must never depend on the animation having run.
  if (reducedMotion || typeof IntersectionObserver !== 'function') {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add('is-in')
    })
    return
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      // Intersecting, or ALREADY SCROLLED PAST. The second case is not
      // cosmetic: landing on /#pricing scrolls the browser straight down, and
      // an observer that only reacts to `isIntersecting` leaves everything
      // above the anchor at opacity 0 for as long as the page is open. Anything
      // at or above the viewport top has been "seen" and must be shown.
      if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return
      entry.target.classList.add('is-in')
      observer.unobserve(entry.target)
    })
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })

  Array.prototype.forEach.call(revealables, function (el) { observer.observe(el) })
}())
