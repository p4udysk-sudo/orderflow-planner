/* app.js — OrderFlow Planner Application Logic */
/* global DATA */

(function () {
  "use strict";

  // ===== STATE =====
  let appData = null;
  let currentModule = "overview";
  let decisions = {}; // { "featureKey": "TAK"|"NIE"|"PÓŹNIEJ" }
  let filters = {
    priorities: ["KRYTYCZNE", "WAŻNE", "PRZYDATNE", "OPCJONALNE"],
    complexities: ["Niska", "Średnia", "Wysoka"],
    decisionStatus: "all", // "all", "decided", "undecided"
  };
  let searchQuery = "";

  // ===== INIT =====
  function init() {
    // Try to use embedded DATA constant as primary source
    if (typeof DATA !== "undefined") {
      appData = DATA;
      bootstrap();
    } else {
      // Fallback: try fetch
      fetch("./baselinker-data.json")
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          appData = data;
          bootstrap();
        })
        .catch(function () {
          document.getElementById("mainContent").innerHTML =
            '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Nie udało się załadować danych</div></div>';
        });
    }
  }

  function bootstrap() {
    renderSidebar();
    renderHeaderStats();
    renderContent();
    setupEventListeners();
    setupThemeToggle();
  }

  // ===== HELPERS =====
  function getFeatureKey(moduleId, submoduleId, featureIdx) {
    return moduleId + "::" + submoduleId + "::" + featureIdx;
  }

  function getAllFeatures() {
    var result = [];
    appData.modules.forEach(function (mod) {
      mod.submodules.forEach(function (sub) {
        sub.features.forEach(function (feat, idx) {
          result.push({
            feature: feat,
            module: mod,
            submodule: sub,
            key: getFeatureKey(mod.id, sub.id, idx),
          });
        });
      });
    });
    return result;
  }

  function getModuleFeatureCount(mod) {
    var count = 0;
    mod.submodules.forEach(function (sub) {
      count += sub.features.length;
    });
    return count;
  }

  function getDecisionCounts() {
    var tak = 0,
      nie = 0,
      pozniej = 0;
    Object.values(decisions).forEach(function (d) {
      if (d === "TAK") tak++;
      else if (d === "NIE") nie++;
      else if (d === "PÓŹNIEJ") pozniej++;
    });
    return {
      tak: tak,
      nie: nie,
      pozniej: pozniej,
      total: tak + nie + pozniej,
    };
  }

  function getModuleDecisionProgress(mod) {
    var total = 0,
      decided = 0;
    mod.submodules.forEach(function (sub) {
      sub.features.forEach(function (feat, idx) {
        total++;
        var key = getFeatureKey(mod.id, sub.id, idx);
        if (decisions[key]) decided++;
      });
    });
    return { total: total, decided: decided };
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ===== SIDEBAR =====
  function renderSidebar() {
    var nav = document.getElementById("sidebarNav");
    var html =
      '<button class="nav-item' +
      (currentModule === "overview" ? " active" : "") +
      '" data-module="overview"><span class="nav-icon">📊</span><span class="nav-label">Przegląd</span></button>';

    appData.modules.forEach(function (mod) {
      var count = getModuleFeatureCount(mod);
      html +=
        '<button class="nav-item' +
        (currentModule === mod.id ? " active" : "") +
        '" data-module="' +
        mod.id +
        '" title="' +
        escapeHtml(mod.name) +
        '"><span class="nav-icon">' +
        mod.icon +
        '</span><span class="nav-label">' +
        escapeHtml(mod.name) +
        '</span><span class="nav-count">' +
        count +
        "</span></button>";
    });

    nav.innerHTML = html;
  }

  // ===== HEADER STATS =====
  function renderHeaderStats() {
    var stats = document.getElementById("headerStats");
    var counts = getDecisionCounts();
    var total = appData.stats.total;
    var remaining = total - counts.total;
    var pct = total > 0 ? Math.round((counts.total / total) * 100) : 0;

    stats.innerHTML =
      '<div class="stat-item"><span>Funkcje:</span> <span class="stat-value">' +
      total +
      '</span></div>' +
      '<div class="stat-item"><span>Zdecydowano:</span> <span class="stat-value">' +
      counts.total +
      '</span></div>' +
      '<div class="stat-item"><span>Pozostało:</span> <span class="stat-value">' +
      remaining +
      '</span></div>' +
      '<div class="stat-item"><div class="stat-bar"><div class="stat-bar-fill" style="width:' +
      pct +
      '%"></div></div><span class="stat-value">' +
      pct +
      "%</span></div>";
  }

  // ===== CONTENT ROUTING =====
  function renderContent() {
    if (searchQuery.length > 0) {
      renderSearchResults();
    } else if (currentModule === "overview") {
      renderOverview();
    } else {
      renderModule(currentModule);
    }
  }

  // ===== OVERVIEW =====
  function renderOverview() {
    var main = document.getElementById("mainContent");
    var counts = getDecisionCounts();
    var total = appData.stats.total;

    var html = '<div class="overview-grid">';

    // KPI Cards — Priority row
    html += '<div class="kpi-row">';
    html += kpiCard("Wszystkie funkcje", total, "w 18 modułach");
    html += kpiCard("Krytyczne", appData.stats.KRYTYCZNE, "najwyższy priorytet");
    html += kpiCard("Ważne", appData.stats["WAŻNE"], "do rozważenia");
    html += kpiCard("Przydatne", appData.stats.PRZYDATNE, "nice-to-have");
    html += kpiCard("Opcjonalne", appData.stats.OPCJONALNE, "niska priorytetowość");
    html += "</div>";

    // Complexity + Decision KPIs
    html += '<div class="kpi-row">';
    html += kpiCard("Niska złożoność", appData.complexity["Niska"], "szybka realizacja");
    html += kpiCard("Średnia złożoność", appData.complexity["Średnia"], "standardowa praca");
    html += kpiCard("Wysoka złożoność", appData.complexity.Wysoka, "wymagające zadania");
    html += kpiCard("TAK ✓", counts.tak, "do implementacji");
    html += kpiCard(
      "Postęp",
      counts.total + "/" + total,
      Math.round((counts.total / total) * 100) + "% zdecydowano",
    );
    html += "</div>";

    // Two-column: Problems + Recommendations
    html += '<div class="two-col">';

    // Problems
    html += '<div class="section-card">';
    html += '<div class="section-title">Problemy BaseLinker</div>';
    html += '<ul class="problem-list" role="list">';
    appData.problems.forEach(function (p) {
      html +=
        '<li class="problem-item"><span class="item-icon">⚠</span><span>' +
        escapeHtml(p) +
        "</span></li>";
    });
    html += "</ul></div>";

    // Recommendations
    html += '<div class="section-card">';
    html += '<div class="section-title">Rekomendacje</div>';
    html += '<ul class="rec-list" role="list">';
    appData.recommendations.forEach(function (r) {
      html +=
        '<li class="rec-item"><span class="item-icon">✦</span><span>' +
        escapeHtml(r) +
        "</span></li>";
    });
    html += "</ul></div>";
    html += "</div>";

    // Module Decision Progress
    html += '<div class="section-card">';
    html += '<div class="section-title">Postęp decyzji</div>';
    html += '<div class="progress-grid">';
    appData.modules.forEach(function (mod) {
      var prog = getModuleDecisionProgress(mod);
      var pct = prog.total > 0 ? Math.round((prog.decided / prog.total) * 100) : 0;
      html +=
        '<div class="progress-item"><span class="progress-icon">' +
        mod.icon +
        '</span><div class="progress-info"><div class="progress-name">' +
        escapeHtml(mod.name) +
        '</div><div class="progress-bar-wrapper"><div class="progress-bar"><div class="progress-bar-fill ' +
        (pct > 0 ? "has-progress" : "no-progress") +
        '" style="width:' +
        pct +
        '%"></div></div><span class="progress-pct">' +
        prog.decided +
        "/" +
        prog.total +
        "</span></div></div></div>";
    });
    html += "</div></div>";

    html += "</div>";
    html += footerHtml();
    main.innerHTML = html;
    main.scrollTop = 0;
  }

  function footerHtml() {
    return '<div class="app-footer"><a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">Created with Perplexity Computer</a></div>';
  }

  function kpiCard(label, value, sub) {
    return (
      '<div class="kpi-card"><span class="kpi-label">' +
      escapeHtml(label) +
      '</span><span class="kpi-value">' +
      value +
      '</span><span class="kpi-sub">' +
      escapeHtml(sub) +
      "</span></div>"
    );
  }

  // ===== MODULE VIEW =====
  function renderModule(moduleId) {
    var mod = appData.modules.find(function (m) {
      return m.id === moduleId;
    });
    if (!mod) return;

    var main = document.getElementById("mainContent");
    var html = "";

    // Module header
    html +=
      '<div class="module-header"><h1 class="module-title"><span class="module-icon">' +
      mod.icon +
      "</span>" +
      escapeHtml(mod.name) +
      "</h1></div>";

    // Filters bar
    html += renderFiltersBar();

    // Submodules
    mod.submodules.forEach(function (sub) {
      var filteredFeatures = getFilteredFeatures(mod, sub);
      if (filteredFeatures.length === 0) return;

      html +=
        '<div class="submodule-section expanded" data-submodule="' +
        sub.id +
        '">';
      html +=
        '<div class="submodule-header" role="button" tabindex="0" aria-expanded="true"><div class="submodule-title">' +
        escapeHtml(sub.name) +
        ' <span class="submodule-count">(' +
        filteredFeatures.length +
        ')</span></div><svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>';
      html += '<div class="submodule-content">';

      filteredFeatures.forEach(function (item) {
        html += renderFeatureRow(mod, sub, item.feature, item.originalIndex);
      });

      html += "</div></div>";
    });

    html += footerHtml();
    main.innerHTML = html;
    main.scrollTop = 0;
  }

  function getFilteredFeatures(mod, sub) {
    var results = [];
    sub.features.forEach(function (feat, idx) {
      // Priority filter
      if (filters.priorities.indexOf(feat.priority) === -1) return;
      // Complexity filter
      if (filters.complexities.indexOf(feat.complexity) === -1) return;
      // Decision status filter
      var key = getFeatureKey(mod.id, sub.id, idx);
      var dec = decisions[key] || "";
      if (filters.decisionStatus === "decided" && !dec) return;
      if (filters.decisionStatus === "undecided" && dec) return;

      results.push({ feature: feat, originalIndex: idx });
    });
    return results;
  }

  function renderFiltersBar() {
    var html = '<div class="filters-bar">';

    // Priority filters
    html += '<div class="filter-group"><span class="filter-label">Priorytet</span>';
    ["KRYTYCZNE", "WAŻNE", "PRZYDATNE", "OPCJONALNE"].forEach(function (p) {
      var active = filters.priorities.indexOf(p) !== -1 ? " active" : "";
      html +=
        '<button class="filter-chip' +
        active +
        '" data-filter-priority="' +
        p +
        '">' +
        p +
        "</button>";
    });
    html += "</div>";

    html += '<div class="filter-sep"></div>';

    // Complexity filters
    html += '<div class="filter-group"><span class="filter-label">Złożoność</span>';
    ["Niska", "Średnia", "Wysoka"].forEach(function (c) {
      var active = filters.complexities.indexOf(c) !== -1 ? " active" : "";
      html +=
        '<button class="filter-chip' +
        active +
        '" data-filter-complexity="' +
        c +
        '">' +
        c +
        "</button>";
    });
    html += "</div>";

    html += '<div class="filter-sep"></div>';

    // Decision status
    html += '<div class="filter-group"><span class="filter-label">Decyzja</span>';
    ["all", "decided", "undecided"].forEach(function (s) {
      var labels = {
        all: "Wszystkie",
        decided: "Zdecydowane",
        undecided: "Niezdecydowane",
      };
      var active = filters.decisionStatus === s ? " active" : "";
      html +=
        '<button class="filter-chip' +
        active +
        '" data-filter-decision="' +
        s +
        '">' +
        labels[s] +
        "</button>";
    });
    html += "</div>";

    // Export button
    html +=
      '<button class="export-btn" id="exportBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Eksportuj decyzje</button>';

    html += "</div>";
    return html;
  }

  function renderFeatureRow(mod, sub, feat, idx) {
    var key = getFeatureKey(mod.id, sub.id, idx);
    var dec = decisions[key] || "";

    var priorityClass = {
      KRYTYCZNE: "badge-krytyczne",
      "WAŻNE": "badge-wazne",
      PRZYDATNE: "badge-przydatne",
      OPCJONALNE: "badge-opcjonalne",
    };

    var complexityClass = {
      Niska: "badge-niska",
      "Średnia": "badge-srednia",
      Wysoka: "badge-wysoka",
    };

    var html =
      '<div class="feature-row" data-feature-key="' + key + '">';

    // Name + notes
    html += '<div class="feature-name-col"><span class="feature-name">' + escapeHtml(feat.name) + "</span>";
    if (feat.notes) {
      html += '<span class="feature-note">' + escapeHtml(feat.notes) + "</span>";
    }
    html += "</div>";

    // Badges
    html += '<div class="feature-badges">';
    html +=
      '<span class="badge ' +
      (priorityClass[feat.priority] || "") +
      '">' +
      escapeHtml(feat.priority) +
      "</span>";
    html +=
      '<span class="badge ' +
      (complexityClass[feat.complexity] || "") +
      '">' +
      escapeHtml(feat.complexity) +
      "</span>";
    html += "</div>";

    // Decision buttons
    html += '<div class="decision-group">';
    html +=
      '<button class="decision-btn' +
      (dec === "TAK" ? " selected-tak" : "") +
      '" data-decision="TAK" data-key="' +
      key +
      '">TAK ✓</button>';
    html +=
      '<button class="decision-btn' +
      (dec === "NIE" ? " selected-nie" : "") +
      '" data-decision="NIE" data-key="' +
      key +
      '">NIE ✗</button>';
    html +=
      '<button class="decision-btn' +
      (dec === "PÓŹNIEJ" ? " selected-pozniej" : "") +
      '" data-decision="PÓŹNIEJ" data-key="' +
      key +
      '">PÓŹNIEJ ⏳</button>';
    html += "</div>";

    html += "</div>";
    return html;
  }

  // ===== SEARCH =====
  function renderSearchResults() {
    var main = document.getElementById("mainContent");
    var query = searchQuery.toLowerCase();
    var allFeatures = getAllFeatures();

    var matches = allFeatures.filter(function (item) {
      return item.feature.name.toLowerCase().indexOf(query) !== -1 || (item.feature.notes && item.feature.notes.toLowerCase().indexOf(query) !== -1);
    });

    var html = '<div class="search-results-header">Wyniki wyszukiwania: ' + matches.length + " funkcji</div>";

    if (matches.length === 0) {
      html +=
        '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Brak wyników</div><div class="empty-state-desc">Spróbuj innego zapytania</div></div>';
    } else {
      matches.forEach(function (item) {
        html +=
          '<div class="search-result-module">' +
          item.module.icon +
          " " +
          escapeHtml(item.module.name) +
          " → " +
          escapeHtml(item.submodule.name) +
          "</div>";
        html += renderFeatureRow(
          item.module,
          item.submodule,
          item.feature,
          item.submodule.features.indexOf(item.feature),
        );
      });
    }

    html += footerHtml();
    main.innerHTML = html;
    main.scrollTop = 0;
  }

  // ===== EXPORT =====
  function exportDecisions() {
    var exportData = {
      timestamp: new Date().toISOString(),
      summary: getDecisionCounts(),
      decisions: [],
    };

    getAllFeatures().forEach(function (item) {
      var dec = decisions[item.key];
      if (dec) {
        exportData.decisions.push({
          module: item.module.name,
          submodule: item.submodule.name,
          feature: item.feature.name,
          priority: item.feature.priority,
          complexity: item.feature.complexity,
          decision: dec,
        });
      }
    });

    var jsonStr = JSON.stringify(exportData, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "orderflow-decisions.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== THEME TOGGLE =====
  function setupThemeToggle() {
    var toggle = document.querySelector("[data-theme-toggle]");
    var root = document.documentElement;
    // Respect pre-existing data-theme if set, otherwise use system preference
    var existing = root.getAttribute("data-theme");
    var theme;
    if (existing === "dark" || existing === "light") {
      theme = existing;
    } else {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    root.setAttribute("data-theme", theme);
    updateThemeIcon(toggle, theme);

    if (toggle) {
      toggle.addEventListener("click", function () {
        theme = theme === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", theme);
        updateThemeIcon(toggle, theme);
      });
    }
  }

  function updateThemeIcon(toggle, theme) {
    if (!toggle) return;
    toggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Tryb jasny" : "Tryb ciemny",
    );
    toggle.innerHTML =
      theme === "dark"
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ===== EVENT LISTENERS =====
  function setupEventListeners() {
    var main = document.getElementById("mainContent");
    var sidebar = document.getElementById("sidebar");
    var sidebarNav = document.getElementById("sidebarNav");
    var hamburger = document.getElementById("hamburger");
    var sidebarClose = document.getElementById("sidebarClose");
    var searchInput = document.getElementById("searchInput");

    // Create overlay for mobile
    var overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.id = "sidebarOverlay";
    document.body.appendChild(overlay);

    // Sidebar navigation
    sidebarNav.addEventListener("click", function (e) {
      var btn = e.target.closest(".nav-item");
      if (!btn) return;
      var moduleId = btn.getAttribute("data-module");
      currentModule = moduleId;
      searchQuery = "";
      searchInput.value = "";
      renderSidebar();
      renderContent();
      closeSidebar();
    });

    // Hamburger
    hamburger.addEventListener("click", function () {
      sidebar.classList.add("open");
      overlay.classList.add("visible");
    });

    sidebarClose.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    function closeSidebar() {
      sidebar.classList.remove("open");
      overlay.classList.remove("visible");
    }

    // Search
    var searchTimeout;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        searchQuery = searchInput.value.trim();
        renderContent();
      }, 200);
    });

    // Delegated events on main
    main.addEventListener("click", function (e) {
      // Submodule toggle
      var subHeader = e.target.closest(".submodule-header");
      if (subHeader) {
        var section = subHeader.closest(".submodule-section");
        section.classList.toggle("expanded");
        var isExpanded = section.classList.contains("expanded");
        subHeader.setAttribute("aria-expanded", isExpanded);
        return;
      }

      // Decision button
      var decBtn = e.target.closest(".decision-btn");
      if (decBtn) {
        var key = decBtn.getAttribute("data-key");
        var decision = decBtn.getAttribute("data-decision");

        // Toggle off if already selected
        if (decisions[key] === decision) {
          delete decisions[key];
        } else {
          decisions[key] = decision;
        }

        // Update just the row's buttons
        var row = decBtn.closest(".feature-row");
        if (row) {
          row.querySelectorAll(".decision-btn").forEach(function (btn) {
            btn.className = "decision-btn";
            var btnDec = btn.getAttribute("data-decision");
            var currentDec = decisions[key];
            if (currentDec === btnDec) {
              if (btnDec === "TAK") btn.classList.add("selected-tak");
              else if (btnDec === "NIE") btn.classList.add("selected-nie");
              else if (btnDec === "PÓŹNIEJ") btn.classList.add("selected-pozniej");
            }
          });
        }

        renderHeaderStats();
        return;
      }

      // Filter chips
      var filterChip = e.target.closest(".filter-chip");
      if (filterChip) {
        var priorityFilter = filterChip.getAttribute("data-filter-priority");
        var complexityFilter = filterChip.getAttribute("data-filter-complexity");
        var decisionFilter = filterChip.getAttribute("data-filter-decision");

        if (priorityFilter) {
          var idx = filters.priorities.indexOf(priorityFilter);
          if (idx !== -1) {
            filters.priorities.splice(idx, 1);
          } else {
            filters.priorities.push(priorityFilter);
          }
        } else if (complexityFilter) {
          var cidx = filters.complexities.indexOf(complexityFilter);
          if (cidx !== -1) {
            filters.complexities.splice(cidx, 1);
          } else {
            filters.complexities.push(complexityFilter);
          }
        } else if (decisionFilter) {
          filters.decisionStatus = decisionFilter;
        }

        renderContent();
        return;
      }

      // Export button
      if (e.target.closest("#exportBtn")) {
        exportDecisions();
        return;
      }
    });

    // Keyboard support for submodule headers
    main.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        var subHeader = e.target.closest(".submodule-header");
        if (subHeader) {
          e.preventDefault();
          subHeader.click();
        }
      }
    });
  }

  // ===== BOOT =====
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
