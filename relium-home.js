/**
 * Homepage behaviour: the live review console and the L01–L06 layer stack.
 *
 * Loaded by index.html only, after relium.js. Same rules as there: no
 * network request, no third party, no inline script (the CSP forbids it).
 *
 * Motion budget: CSS animates transform and opacity; the one exception is
 * the lineage edges, drawn with stroke-dashoffset. Every loop stops when it
 * is off screen or the tab is hidden, and under prefers-reduced-motion both
 * visuals render their final state and never loop.
 */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function onVisible(element, callback, threshold) {
    if (!("IntersectionObserver" in window)) {
      callback(true);
      return;
    }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { callback(entry.isIntersecting); });
    }, { threshold: threshold || 0 }).observe(element);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* =================================================================
     Review console
     ================================================================= */

  /* Three illustrative reviews, one per outcome. Model names, evidence
     classes and decisions use the product's own vocabulary; nothing here
     is a measurement of a real customer. Lineage is laid out on a grid:
     `col` is the hop from the changed model, `lane` the position within
     that hop (0 top, 0.5 middle, 1 bottom). */
  var SCENARIOS = [
    {
      tone: "block",
      pr: "#214",
      file: "models/marts/fct_customer_ltv.sql",
      stat: [1, 1],
      diff: [
        ["ctx", " ", "left join orders o on c.id = o.customer_id"],
        ["del", "-", "  and o.status = 'completed'"],
        ["add", "+", "where o.status = 'completed'"]
      ],
      nodes: [
        { name: "fct_customer_ltv", kind: "changed", tone: "block", col: 0, lane: 0.5,
          tip: "The model this pull request edits. Customers with no completed order are dropped before aggregation, so it loses rows — and every metric built on it moves with it." },
        { name: "mart_revenue_daily", kind: "affected", tone: "block", col: 1, lane: 0,
          tip: "Built on fct_customer_ltv, so it inherits the dropped customers. Traced from your compiled dbt lineage, not from file names." },
        { name: "mart_retention", kind: "affected", tone: "warn", col: 1, lane: 1,
          tip: "Reads customer rows from fct_customer_ltv. Retention cohorts shrink along with them." },
        { name: "exec_dashboard", kind: "exposure", tone: "warn", col: 2, lane: 0.5,
          tip: "A dbt exposure downstream of both marts — where the changed numbers would be seen." }
      ],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3]],
      evidence: [
        { src: "dbt manifest", what: "compiled lineage for both commits", pill: "4 nodes",
          tip: "Base and head manifests, handed over by your CI, so the review reasons about the compiled project rather than guessing from the diff." },
        { src: "Semantic diff", what: "join semantics changed", pill: "flagged", tone: "block",
          tip: "A WHERE predicate on the right-hand table of a LEFT JOIN removes the rows the join was keeping. The LEFT JOIN now behaves as an inner join." },
        { src: "Warehouse metadata", what: "row counts and null rates", pill: "aggregates",
          tip: "Submitted by a collector you run with your own read-only credentials. Aggregate metadata only — never rows." }
      ],
      decision: { stamp: "BLOCK", title: "A filter in the WHERE clause turns this LEFT JOIN into an inner join", pill: "Merge held" }
    },
    {
      tone: "allow",
      pr: "#215",
      file: "models/staging/stg_customers.sql",
      stat: [1, 0],
      diff: [
        ["ctx", " ", "  c.email,"],
        ["add", "+", "  c.created_at as signup_at,"],
        ["ctx", " ", "  c.region"]
      ],
      nodes: [
        { name: "stg_customers", kind: "changed", tone: "allow", col: 0, lane: 0.5,
          tip: "The model this pull request edits. One column is added; nothing existing is renamed, removed or recomputed." },
        { name: "dim_customers", kind: "unaffected", col: 1, lane: 0,
          tip: "Selects named columns from stg_customers. signup_at is not one of them, so its output does not change." },
        { name: "fct_customer_ltv", kind: "unaffected", col: 1, lane: 1,
          tip: "Downstream of stg_customers, but reads none of the changed logic." },
        { name: "exec_dashboard", kind: "exposure", col: 2, lane: 0.5,
          tip: "Exposure checked. No metric feeding it changes definition." }
      ],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3]],
      evidence: [
        { src: "dbt manifest", what: "compiled lineage for both commits", pill: "4 nodes",
          tip: "Base and head manifests, handed over by your CI. Every downstream node is checked against the change." },
        { src: "Semantic diff", what: "additive column only", pill: "no change", tone: "allow",
          tip: "The only change is a new column. Joins, filters, grain and existing definitions are identical between the two commits." },
        { src: "Warehouse metadata", what: "row counts and null rates", pill: "aggregates",
          tip: "Submitted by a collector you run with your own read-only credentials. Aggregate metadata only — never rows." }
      ],
      decision: { stamp: "ALLOW", title: "One column added, and nothing downstream reads it", pill: "Check passes" }
    },
    {
      tone: "warn",
      pr: "#216",
      file: "models/marts/mart_revenue_daily.sql",
      stat: [1, 1],
      diff: [
        ["del", "-", "  date_trunc('day', o.ordered_at) as day,"],
        ["add", "+", "  date_trunc('day', o.ordered_at_utc) as day,"],
        ["ctx", " ", "  sum(o.amount) as revenue"]
      ],
      nodes: [
        { name: "mart_revenue_daily", kind: "changed", tone: "warn", col: 0, lane: 0.5,
          tip: "The model this pull request edits. Orders are now bucketed into days by UTC time instead of local time." },
        { name: "revenue_daily", kind: "metric", tone: "warn", col: 1, lane: 0,
          tip: "A dbt metric defined on mart_revenue_daily. Its formula is unchanged; which day each order counts towards is not." },
        { name: "mart_revenue_weekly", kind: "affected", tone: "warn", col: 1, lane: 1,
          tip: "Rolls daily revenue up into weeks, so orders near midnight can move between weeks too." },
        { name: "exec_dashboard", kind: "exposure", tone: "warn", col: 2, lane: 0.5,
          tip: "A dbt exposure on the revenue metric. Totals still add up; the daily shape shifts." }
      ],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3]],
      evidence: [
        { src: "dbt manifest", what: "compiled lineage for both commits", pill: "4 nodes",
          tip: "Base and head manifests, handed over by your CI. The metric and the exposure are read from your own project." },
        { src: "Semantic diff", what: "day boundary moved", pill: "flagged", tone: "warn",
          tip: "The grain column changed its time basis. Totals are preserved, but revenue near midnight lands on a different day." },
        { src: "Warehouse metadata", what: "row counts and null rates", pill: "aggregates",
          tip: "Submitted by a collector you run with your own read-only credentials. Aggregate metadata only — never rows." }
      ],
      decision: { stamp: "WARN", title: "Revenue days now start at UTC midnight, not local midnight", pill: "Advisory — merge is not held" }
    }
  ];

  /* Lineage geometry, in SVG user units. Horizontal on wide consoles,
     transposed to vertical on narrow ones so node labels never collide. */
  var LAYOUTS = {
    h: { w: 600, h: 170, cols: [90, 300, 510], lanes: [42, 128] },
    v: { w: 320, h: 280, cols: [40, 140, 240], lanes: [84, 236] }
  };

  function nodePoint(node, layoutName) {
    var layout = LAYOUTS[layoutName];
    var main = layout.cols[node.col];
    var cross = layout.lanes[0] + (layout.lanes[1] - layout.lanes[0]) * node.lane;
    return layoutName === "h"
      ? { x: main, y: cross, w: layout.w, h: layout.h }
      : { x: cross, y: main, w: layout.w, h: layout.h };
  }

  function edgePath(a, b, layoutName) {
    if (layoutName === "h") {
      var mx = (a.x + b.x) / 2;
      return "M" + a.x + " " + a.y + " C" + mx + " " + a.y + " " + mx + " " + b.y + " " + b.x + " " + b.y;
    }
    var my = (a.y + b.y) / 2;
    return "M" + a.x + " " + a.y + " C" + a.x + " " + my + " " + b.x + " " + my + " " + b.x + " " + b.y;
  }

  function initConsole(root) {
    var $ = function (name) { return root.querySelector('[data-c="' + name + '"]'); };
    var body = $("body");
    var lineage = $("lineage");
    var tip = root.querySelector(".console-tip");
    var tabs = root.querySelectorAll(".console-tab");
    var isStatic = reducedMotion.matches;

    var current = 0;
    var layoutName = "h";
    var lit = {};       // node index -> true once lit this run
    var drawn = {};     // edge index -> true once drawn this run
    var events = [];
    var clock = 0;
    var cursor = 0;
    var lastFrame = 0;
    var frame = 0;
    var started = false;
    var pause = {};     // reason -> true

    /* -------------------------------------------------------- render -- */
    function renderLineage(s) {
      var layout = LAYOUTS[layoutName];
      var svg = '<svg viewBox="0 0 ' + layout.w + " " + layout.h + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">';
      s.edges.forEach(function (edge, i) {
        var d = edgePath(nodePoint(s.nodes[edge[0]], layoutName), nodePoint(s.nodes[edge[1]], layoutName), layoutName);
        var tone = s.nodes[edge[1]].tone || "none";
        var on = drawn[i] ? " is-drawn" : "";
        svg += '<path class="edge' + on + '" data-tone="' + tone + '" data-edge="' + i + '" pathLength="1" d="' + d + '"/>' +
               '<path class="edge-flow' + on + '" data-edge="' + i + '" pathLength="1" d="' + d + '"/>';
      });
      svg += "</svg>";
      var nodes = s.nodes.map(function (node, i) {
        var p = nodePoint(node, layoutName);
        return '<button class="node' + (lit[i] ? " is-lit" : "") + '" type="button" data-node="' + i + '"' +
          (node.tone ? ' data-tone="' + node.tone + '"' : "") +
          ' style="left:' + (p.x / p.w * 100).toFixed(2) + "%;top:" + (p.y / p.h * 100).toFixed(2) + '%">' +
          '<span class="nm">' + escapeHtml(node.name) + '</span><span class="kd">' + escapeHtml(node.kind) + "</span></button>";
      }).join("");
      lineage.setAttribute("data-layout", layoutName);
      lineage.innerHTML = svg + nodes;
    }

    function render(s) {
      root.setAttribute("data-tone", s.tone);
      $("pr").textContent = s.pr;
      $("file").textContent = s.file;
      $("stat").innerHTML = '<span class="a">+' + s.stat[0] + '</span> <span class="d">&minus;' + s.stat[1] + "</span>";
      $("diff").innerHTML = s.diff.map(function (line, i) {
        var n = line[2].length;
        return '<span class="ln ' + line[0] + '" data-line="' + i + '" style="--n:' + n + ";--d:" + Math.min(Math.max(n * 26, 380), 1100) + 'ms">' +
          '<span class="g">' + line[1] + '</span><span class="tx">' + escapeHtml(line[2]) + "</span></span>";
      }).join("");
      renderLineage(s);
      $("evidence").innerHTML = s.evidence.map(function (row, i) {
        return '<li><button class="evidence-row" type="button" data-row="' + i + '">' +
          '<span class="src">' + escapeHtml(row.src) + '</span><span class="what">' + escapeHtml(row.what) + "</span>" +
          '<span class="pill"' + (row.tone ? ' data-tone="' + row.tone + '"' : "") + ">" + escapeHtml(row.pill) + "</span></button></li>";
      }).join("");
      var decision = $("decision");
      decision.setAttribute("data-tone", s.tone);
      decision.classList.remove("is-landed");
      decision.innerHTML = '<span class="stamp">' + s.decision.stamp + "</span>" +
        '<div class="decision-copy"><p class="t">' + escapeHtml(s.decision.title) + '</p><span class="pill" data-tone="' + s.tone + '">' + escapeHtml(s.decision.pill) + "</span></div>" +
        '<span class="decision-wait" aria-hidden="true">AWAITING DECISION</span>';
      $("foot").innerHTML = "pr_review.live &middot; " + s.nodes.length + " downstream nodes &middot; " + s.evidence.length + " evidence sources";
      Array.prototype.forEach.call(tabs, function (tab, i) {
        tab.setAttribute("aria-pressed", String(i === current));
      });
    }

    /* ------------------------------------------------------ timeline -- */
    function q(selector) { return root.querySelector(selector); }

    function build(s) {
      var list = [];
      var t = 250;
      s.diff.forEach(function (line, i) {
        var d = Math.min(Math.max(line[2].length * 26, 380), 1100);
        list.push([t, function () { var el = q('[data-line="' + i + '"]'); if (el) el.classList.add("is-typed"); }]);
        t += d + 140;
      });
      t += 100;
      list.push([t, function () { root.classList.add("is-scanning"); }]);
      t += 1050;

      var cols = {};
      s.nodes.forEach(function (node, i) { (cols[node.col] = cols[node.col] || []).push(i); });
      var hops = Object.keys(cols).map(Number).sort();
      hops.forEach(function (col, h) {
        if (h > 0) {
          s.edges.forEach(function (edge, i) {
            if (s.nodes[edge[1]].col !== col) return;
            list.push([t, function () {
              drawn[i] = true;
              Array.prototype.forEach.call(root.querySelectorAll('[data-edge="' + i + '"]'), function (el) { el.classList.add("is-drawn"); });
            }]);
          });
          t += 520;
        }
        cols[col].forEach(function (n) {
          list.push([t, function () { lit[n] = true; var el = q('[data-node="' + n + '"]'); if (el) el.classList.add("is-lit"); }]);
        });
        t += 300;
      });

      t += 100;
      s.evidence.forEach(function (row, i) {
        list.push([t, function () { var el = q('[data-row="' + i + '"]'); if (el) el.classList.add("is-in"); }]);
        t += 380;
      });
      t += 280;
      list.push([t, function () { $("decision").classList.add("is-landed"); }]);
      t += 3800;
      list.push([t, function () { body.classList.add("is-out"); }]);
      t += 380;
      list.push([t, function () { play((current + 1) % SCENARIOS.length); }]);
      return { events: list, duration: t };
    }

    function play(index) {
      current = index;
      lit = {};
      drawn = {};
      hideTip();
      root.classList.remove("is-scanning", "is-playing");
      body.classList.remove("is-out");
      render(SCENARIOS[index]);
      var plan = build(SCENARIOS[index]);
      events = plan.events;
      clock = 0;
      cursor = 0;
      root.style.setProperty("--dur", plan.duration + "ms");
      void root.offsetWidth; // restart the tab progress animation
      root.classList.add("is-playing");
    }

    function showFinal(index) {
      current = index;
      lit = {};
      drawn = {};
      SCENARIOS[index].nodes.forEach(function (n, i) { lit[i] = true; });
      SCENARIOS[index].edges.forEach(function (e, i) { drawn[i] = true; });
      render(SCENARIOS[index]);
    }

    // `frame` stays non-zero for as long as a loop is alive, including while
    // events fire, so a setPause() from inside an event never starts a second.
    function tick(now) {
      if (isPaused()) { frame = 0; return; }
      clock += Math.min(now - lastFrame, 64);
      lastFrame = now;
      while (cursor < events.length && events[cursor][0] <= clock) {
        events[cursor++][1]();
      }
      frame = window.requestAnimationFrame(tick);
    }

    function isPaused() {
      for (var reason in pause) if (pause[reason]) return true;
      return false;
    }

    function setPause(reason, on) {
      pause[reason] = on;
      var paused = isPaused();
      root.classList.toggle("is-paused", paused && started && !isStatic);
      if (isStatic) return;
      if (!paused && !frame) {
        if (!started) {
          started = true;
          root.classList.add("is-animating");
          play(0);
        }
        lastFrame = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    }

    /* ------------------------------------------------------- layout -- */
    function syncLayout() {
      var next = lineage.clientWidth < 440 ? "v" : "h";
      if (next === layoutName) return;
      layoutName = next;
      renderLineage(SCENARIOS[current]);
    }

    /* ----------------------------------------------------- inspect -- */
    var inspected = null;
    var pinned = false;

    function tipFor(target) {
      var s = SCENARIOS[current];
      if (target.hasAttribute("data-node")) {
        var node = s.nodes[+target.getAttribute("data-node")];
        return { kind: node.kind, tone: node.tone || "none", title: node.name, text: node.tip };
      }
      var row = s.evidence[+target.getAttribute("data-row")];
      return { kind: "evidence · " + row.pill, tone: row.tone || "none", title: row.src, text: row.tip };
    }

    function showTip(target) {
      var info = tipFor(target);
      if (inspected && inspected !== target) inspected.classList.remove("is-inspected");
      inspected = target;
      target.classList.add("is-inspected");
      target.setAttribute("aria-describedby", "console-tip");
      tip.innerHTML = '<span class="k" data-tone="' + info.tone + '">' + escapeHtml(info.kind) + "</span>" +
        "<b>" + escapeHtml(info.title) + "</b>" + escapeHtml(info.text);
      tip.hidden = false;

      var box = root.getBoundingClientRect();
      var r = target.getBoundingClientRect();
      var w = tip.offsetWidth;
      var h = tip.offsetHeight;
      var left = Math.min(Math.max(r.left - box.left + r.width / 2 - w / 2, 12), box.width - w - 12);
      var top = r.bottom - box.top + 8;
      if (top + h > box.height - 8) top = r.top - box.top - h - 8;
      tip.style.left = left + "px";
      tip.style.top = Math.max(top, 8) + "px";
      setPause("inspect", true);
    }

    function hideTip() {
      if (inspected) {
        inspected.classList.remove("is-inspected");
        inspected.removeAttribute("aria-describedby");
      }
      inspected = null;
      pinned = false;
      tip.hidden = true;
      if (pause.inspect) setPause("inspect", false);
    }

    function inspectable(event) {
      var el = event.target.closest && event.target.closest(".node,.evidence-row");
      return el && root.contains(el) ? el : null;
    }

    root.addEventListener("pointerover", function (event) {
      if (event.pointerType === "touch") return;
      var el = inspectable(event);
      if (el && el !== inspected) showTip(el);
    });
    root.addEventListener("pointerout", function (event) {
      if (event.pointerType === "touch" || pinned) return;
      var el = inspectable(event);
      if (el && !el.contains(event.relatedTarget)) hideTip();
    });
    // Tap (and click) pins the explanation; a second tap, a tap anywhere
    // else, or Escape releases it and the loop carries on.
    root.addEventListener("click", function (event) {
      var el = inspectable(event);
      if (!el) return;
      if (pinned && inspected === el) { hideTip(); return; }
      showTip(el);
      pinned = true;
    });
    root.addEventListener("focusin", function (event) {
      var el = inspectable(event);
      if (el) showTip(el);
    });
    root.addEventListener("focusout", function (event) {
      if (inspectable(event) && !root.contains(event.relatedTarget)) hideTip();
    });
    document.addEventListener("pointerdown", function (event) {
      if (pinned && !inspectable(event)) hideTip();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && inspected) hideTip();
    });

    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener("click", function () {
        var index = +tab.getAttribute("data-scenario");
        if (isStatic || !started) { showFinal(index); return; }
        play(index);
      });
    });

    /* --------------------------------------------------------- start -- */
    if (isStatic) {
      root.classList.add("is-static");
      showFinal(0);
      return;
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(syncLayout).observe(lineage);
    } else {
      window.addEventListener("resize", syncLayout);
    }
    syncLayout();
    document.addEventListener("visibilitychange", function () {
      setPause("hidden", document.hidden);
    });
    pause.offscreen = true;
    onVisible(root, function (visible) { setPause("offscreen", !visible); }, 0.15);
  }

  /* =================================================================
     Layer stack
     ================================================================= */
  function initStack(stack) {
    var layers = stack.querySelectorAll(".layer");
    var zone = stack.querySelector(".stack-zone");
    var packet = stack.querySelector(".stack-packet");
    var wrap = stack.parentNode;
    var inspector = wrap.querySelector(".stack-inspector");
    var content = inspector && inspector.querySelector("[data-inspector-content]");
    var idLabel = inspector && inspector.querySelector("[data-inspector-id]");
    var kickerLabel = inspector && inspector.querySelector("[data-inspector-kicker]");
    var position = 0;
    var timer = 0;
    var visible = false;
    var narrow = window.matchMedia("(max-width: 960px)");

    function headOf(layer) { return layer.querySelector(".layer-head"); }

    function select(index, fromTap) {
      Array.prototype.forEach.call(layers, function (layer, i) {
        var on = i === index;
        layer.classList.toggle("is-active", on);
        if (fromTap && narrow.matches) {
          var open = on && !layer.classList.contains("is-open");
          if (on || layer.classList.contains("is-open")) {
            layer.classList.toggle("is-open", open);
            headOf(layer).setAttribute("aria-expanded", String(open));
          }
        }
      });
      if (!content) return;
      var layer = layers[index];
      idLabel.textContent = layer.querySelector(".layer-id").textContent;
      kickerLabel.textContent = layer.getAttribute("data-kicker");
      content.innerHTML = layer.querySelector(".layer-detail").innerHTML;
      inspector.classList.remove("is-updating");
      void inspector.offsetWidth;
      inspector.classList.add("is-updating");
      window.requestAnimationFrame(movePacketTo.bind(null, position));
    }

    function movePacketTo(index) {
      var head = headOf(layers[index]);
      var y = head.getBoundingClientRect().top - stack.getBoundingClientRect().top + head.offsetHeight / 2 - packet.offsetHeight / 2;
      packet.style.setProperty("--y", y + "px");
    }

    function hit(index) {
      Array.prototype.forEach.call(layers, function (layer, i) {
        layer.classList.toggle("is-hit", i === index);
      });
    }

    function step() {
      timer = 0;
      if (!visible || document.hidden) return;
      if (position === layers.length - 1) {
        // The decision layer: the verdict is returned, then the packet
        // fades out and re-enters at L01.
        zone.classList.add("is-returned");
        timer = window.setTimeout(function () {
          stack.classList.add("is-resetting");
          timer = window.setTimeout(function () {
            zone.classList.remove("is-returned");
            position = 0;
            packet.style.transition = "none";
            movePacketTo(0);
            void packet.offsetWidth;
            packet.style.transition = "";
            stack.classList.remove("is-resetting");
            hit(0);
            timer = window.setTimeout(step, 1000);
          }, 420);
        }, 1800);
        return;
      }
      position += 1;
      movePacketTo(position);
      timer = window.setTimeout(function () {
        hit(position);
        timer = window.setTimeout(step, 650);
      }, 520);
    }

    Array.prototype.forEach.call(layers, function (layer, i) {
      var head = headOf(layer);
      head.addEventListener("click", function () { select(i, true); });
      head.addEventListener("focus", function () { if (!narrow.matches) select(i); });
      head.addEventListener("mouseenter", function () { if (!narrow.matches) select(i); });
    });

    window.addEventListener("resize", function () { movePacketTo(position); });
    select(0);

    if (reducedMotion.matches) {
      hit(layers.length - 1);
      zone.classList.add("is-returned");
      return;
    }

    stack.classList.add("is-running");
    movePacketTo(0);
    hit(0);
    function resume() {
      if (visible && !document.hidden && !timer) timer = window.setTimeout(step, 900);
    }
    document.addEventListener("visibilitychange", resume);
    onVisible(stack, function (isVisible) {
      visible = isVisible;
      resume();
    }, 0.2);
  }

  /* =================================================================
     Play once: the problem panels, the timeline, the final CTA stamp.
     Armed only when motion is allowed, played the first time they are
     in view, then left alone. Unarmed, they are already in their final
     state — which is what no-JS and reduced-motion visitors see.
     ================================================================= */
  function initPlayOnce(element) {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    element.classList.add("is-armed");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        element.classList.add("is-played");
        observer.disconnect();
      });
    }, { threshold: 0.2 });
    observer.observe(element);
  }

  /* =================================================================
     Integrations: hover, focus or click a connection to read it. The
     flowing edges only run while the diagram is on screen.
     ================================================================= */
  function initConnect(root) {
    var nodes = root.querySelectorAll(".connect-node");
    var inspector = root.querySelector(".connect-inspector");
    var logo = inspector.querySelector("[data-ci-logo]");
    var name = inspector.querySelector("[data-ci-name]");
    var text = inspector.querySelector("[data-ci-text]");
    var narrow = window.matchMedia("(max-width: 960px)");

    function select(node) {
      Array.prototype.forEach.call(nodes, function (item) {
        item.classList.toggle("is-active", item === node);
      });
      root.setAttribute("data-active", node.getAttribute("data-node"));
      logo.innerHTML = node.querySelector(".integration-logo").outerHTML;
      name.textContent = node.querySelector("strong").textContent;
      text.textContent = node.querySelector(".connect-text").textContent;
      inspector.classList.remove("is-updating");
      void inspector.offsetWidth;
      inspector.classList.add("is-updating");
    }

    Array.prototype.forEach.call(nodes, function (node) {
      var button = node.querySelector(".connect-btn");
      ["mouseenter", "focus", "click"].forEach(function (type) {
        button.addEventListener(type, function () { if (!narrow.matches) select(node); });
      });
    });
    select(nodes[0]);

    if (!reducedMotion.matches) {
      onVisible(root, function (visible) { root.classList.toggle("is-live", visible); });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-play]"), initPlayOnce);
  var connectRoot = document.querySelector("[data-connect]");
  if (connectRoot) initConnect(connectRoot);

  var consoleRoot = document.getElementById("review-console");
  if (consoleRoot) initConsole(consoleRoot);
  var stackRoot = document.querySelector("[data-stack]");
  if (stackRoot) initStack(stackRoot);
}());
