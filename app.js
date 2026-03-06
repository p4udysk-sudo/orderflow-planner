/* app.js — OrderFlow Planner Application Logic */
/* global DATA */

(function () {
  "use strict";

  // ===== STATE =====
  let appData = null;
  let currentModule = "overview";
  let decisions = {}; // { "featureKey": "TAK"|"NIE"|"PÓŹNIEJ" }
  let statuses = {}; // { "featureKey": "OGARNIJ"|"W_REALIZACJI"|"GOTOWE" }
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
    // Handle hash routing from URL
    var hash = window.location.hash.replace("#", "");
    if (hash === "podstawy-v1") {
      currentModule = "podstawy-v1";
    }
    renderSidebar();
    renderHeaderStats();
    renderContent();
    setupEventListeners();
    setupThemeToggle();
    // Listen for hash changes
    window.addEventListener("hashchange", function () {
      var newHash = window.location.hash.replace("#", "");
      if (newHash === "podstawy-v1") {
        currentModule = "podstawy-v1";
        searchQuery = "";
        var si = document.getElementById("searchInput");
        if (si) si.value = "";
        renderSidebar();
        renderContent();
      }
    });
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
      pozniej = 0,
      ogarnij = 0,
      wRealizacji = 0,
      gotowe = 0;
    Object.values(decisions).forEach(function (d) {
      if (d === "TAK") tak++;
      else if (d === "NIE") nie++;
      else if (d === "PÓŹNIEJ") pozniej++;
    });
    Object.values(statuses).forEach(function (s) {
      if (s === "OGARNIJ") ogarnij++;
      else if (s === "W_REALIZACJI") wRealizacji++;
      else if (s === "GOTOWE") gotowe++;
    });
    return {
      tak: tak,
      nie: nie,
      pozniej: pozniej,
      total: tak + nie + pozniej,
      ogarnij: ogarnij,
      wRealizacji: wRealizacji,
      gotowe: gotowe,
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
      (currentModule === "podstawy-v1" ? " active" : "") +
      '" data-module="podstawy-v1"><span class="nav-icon">🚀</span><span class="nav-label">Podstawy v1</span></button>' +
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
    } else if (currentModule === "podstawy-v1") {
      renderPodstawyV1();
    } else if (currentModule === "overview") {
      renderOverview();
    } else {
      renderModule(currentModule);
    }
  }

  // ===== PODSTAWY V1 =====
  function renderPodstawyV1() {
    var main = document.getElementById("mainContent");

    var styles = '<style>' +
      '.pv1-wrap { max-width: 1100px; margin: 0 auto; padding: 0 0 40px; }' +
      '.pv1-hero { margin-bottom: 28px; }' +
      '.pv1-hero h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 6px; color: var(--text-primary, #f1f5f9); }' +
      '.pv1-hero p.subtitle { font-size: 0.95rem; color: var(--text-secondary, #94a3b8); margin: 0 0 12px; }' +
      '.pv1-context { font-size: 0.82rem; color: var(--text-muted, #64748b); background: var(--bg-card, #1e293b); border: 1px solid var(--border, #334155); border-radius: 8px; padding: 10px 14px; display: inline-block; line-height: 1.6; }' +
      '.pv1-stats-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 28px; }' +
      '.pv1-stat { display: flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; border: 1px solid transparent; }' +
      '.pv1-stat-green { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #4ade80; }' +
      '.pv1-stat-amber { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #fbbf24; }' +
      '.pv1-stat-blue { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); color: #60a5fa; }' +
      '.pv1-stat-gray { background: var(--bg-card, #1e293b); border-color: var(--border, #334155); color: var(--text-secondary, #94a3b8); }' +
      '.pv1-phase { margin-bottom: 32px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border, #334155); }' +
      '.pv1-phase-header { padding: 14px 20px; display: flex; align-items: center; gap: 10px; }' +
      '.pv1-phase-header-green { background: rgba(34,197,94,0.15); border-bottom: 1px solid rgba(34,197,94,0.25); }' +
      '.pv1-phase-header-amber { background: rgba(245,158,11,0.15); border-bottom: 1px solid rgba(245,158,11,0.25); }' +
      '.pv1-phase-header-blue { background: rgba(59,130,246,0.15); border-bottom: 1px solid rgba(59,130,246,0.25); }' +
      '.pv1-phase-title { font-size: 1rem; font-weight: 700; color: var(--text-primary, #f1f5f9); }' +
      '.pv1-phase-badge { font-size: 0.78rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-left: auto; }' +
      '.pv1-badge-green { background: rgba(34,197,94,0.2); color: #4ade80; }' +
      '.pv1-badge-amber { background: rgba(245,158,11,0.2); color: #fbbf24; }' +
      '.pv1-badge-blue { background: rgba(59,130,246,0.2); color: #60a5fa; }' +
      '.pv1-table { width: 100%; border-collapse: collapse; background: var(--bg-card, #1e293b); }' +
      '.pv1-table th { padding: 10px 14px; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); border-bottom: 1px solid var(--border, #334155); }' +
      '.pv1-table td { padding: 11px 14px; font-size: 0.875rem; color: var(--text-primary, #e2e8f0); border-bottom: 1px solid var(--border-subtle, #1e293b); vertical-align: middle; }' +
      '.pv1-table tr:last-child td { border-bottom: none; }' +
      '.pv1-table tr:hover td { background: rgba(255,255,255,0.03); }' +
      '.pv1-num { font-weight: 700; color: var(--text-muted, #64748b); font-family: monospace; font-size: 0.8rem; white-space: nowrap; }' +
      '.pv1-feat-name { font-weight: 500; }' +
      '.pv1-module { font-size: 0.78rem; color: var(--text-muted, #64748b); margin-top: 2px; }' +
      '.pv1-src { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.73rem; font-weight: 600; white-space: nowrap; }' +
      '.pv1-src-blue { background: rgba(59,130,246,0.15); color: #60a5fa; }' +
      '.pv1-src-purple { background: rgba(168,85,247,0.15); color: #c084fc; }' +
      '.pv1-src-green { background: rgba(34,197,94,0.15); color: #4ade80; }' +
      '.pv1-deps { font-size: 0.78rem; color: var(--text-muted, #64748b); font-family: monospace; }' +
      '@media (max-width: 700px) { .pv1-table th:nth-child(3), .pv1-table td:nth-child(3) { display: none; } .pv1-table th:nth-child(4), .pv1-table td:nth-child(4) { display: none; } }' +
      '</style>';

    var html = styles + '<div class="pv1-wrap">';

    // Hero header
    html += '<div class="pv1-hero">';
    html += '<h1>Podstawy v1 — Lista prac do wdrożenia</h1>';
    html += '<p class="subtitle">31 funkcji niezbędnych aby firma mogła zastąpić Base.com i zacząć korzystać z OrderFlow</p>';
    html += '<div class="pv1-context">';
    html += '📦 <strong>Allegro.pl + WooCommerce (WordPress)</strong><br>';
    html += '👥 4–10 pracowników, 200–500 zamówień/dzień<br>';
    html += '🚚 Kurierzy: InPost, DPD, DHL, Poczta Polska, Wysyłam z Allegro<br>';
    html += '🧾 Faktury VAT w systemie';
    html += '</div>';
    html += '</div>';

    // Stats row
    html += '<div class="pv1-stats-row">';
    html += '<div class="pv1-stat pv1-stat-green">✅ Faza 0: 8 zadań</div>';
    html += '<div class="pv1-stat pv1-stat-amber">🔨 Faza 1: 20 zadań</div>';
    html += '<div class="pv1-stat pv1-stat-blue">📋 Faza 2: 14 zadań</div>';
    html += '<div class="pv1-stat pv1-stat-gray">Razem: 42 zadania</div>';
    html += '</div>';

    // ===== FAZA 0 =====
    html += '<div class="pv1-phase">';
    html += '<div class="pv1-phase-header pv1-phase-header-green">';
    html += '<span class="pv1-phase-title">⚙️ Faza 0 — Fundament (infrastruktura)</span>';
    html += '<span class="pv1-phase-badge pv1-badge-green">Zrealizowane ✅</span>';
    html += '</div>';
    html += '<table class="pv1-table"><thead><tr>';
    html += '<th>#</th><th>Funkcja</th><th>Moduł / Opis</th>';
    html += '</tr></thead><tbody>';

    var faza0 = [
      ['F0.1', 'Architektura bazy danych PostgreSQL', 'Schemat ERD, 19 tabel'],
      ['F0.2', 'Backend FastAPI + SQLAlchemy + Alembic migracje', 'Infrastruktura backendowa'],
      ['F0.3', 'REST API (CRUD) — 20 endpointów', 'Warstwa API'],
      ['F0.4', 'Autentykacja JWT + RBAC (role: admin/manager/operator/viewer)', 'Bezpieczeństwo i dostęp'],
      ['F0.5', 'Audit Log — pełna historia zmian', 'Śledzenie zmian'],
      ['F0.6', 'Panel admina (SPA) — login, dashboard, dark/light mode', 'Frontend'],
      ['F0.7', 'Docker + PostgreSQL (docker-compose)', 'DevOps / Infrastruktura'],
      ['F0.8', 'GitHub repo + deploy', 'DevOps / CI/CD'],
    ];

    faza0.forEach(function(row) {
      html += '<tr>';
      html += '<td><span class="pv1-num">' + row[0] + '</span></td>';
      html += '<td><div class="pv1-feat-name">' + row[1] + '</div></td>';
      html += '<td><div class="pv1-module">' + row[2] + '</div></td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    // ===== FAZA 1 =====
    html += '<div class="pv1-phase">';
    html += '<div class="pv1-phase-header pv1-phase-header-amber">';
    html += '<span class="pv1-phase-title">🔨 Faza 1 — MVP (minimum żeby firma mogła zacząć)</span>';
    html += '<span class="pv1-phase-badge pv1-badge-amber">Do realizacji 🔨</span>';
    html += '</div>';
    html += '<table class="pv1-table"><thead><tr>';
    html += '<th>#</th><th>Funkcja</th><th>Źródło</th><th>Moduł OrderFlow</th><th>Zależności</th>';
    html += '</tr></thead><tbody>';

    var faza1 = [
      ['F1.1',  'Pobieranie zamówień z Allegro',                                      'Z opisu',    'Manager Marketplace (m7)',          'F0'],
      ['F1.2',  'Pobieranie zamówień z WooCommerce',                                  'Z opisu',    'Integracje zewnętrzne (m11)',        'F0'],
      ['F1.3',  'Centralna lista zamówień z wielu źródeł',                            'Z opisu',    'Manager Zamówień (m1)',              'F1.1, F1.2'],
      ['F1.4',  'Statusy zamówień (nazwa, kolor, ikona)',                             'Z opisu',    'm1 → Statusy',                      'F0'],
      ['F1.5',  'Filtrowanie po statusie, dacie, źródle',                             'Z opisu',    'm1 → Lista zamówień',               'F1.3'],
      ['F1.6',  'Karta zamówienia (klient, produkty, adresy, płatność)',              'Z opisu',    'm1 → Karta zamówienia',             'F1.3'],
      ['F1.7',  'Ręczna zmiana statusu zamówienia',                                   'Z opisu',    'm1 → Statusy',                      'F1.4, F1.6'],
      ['F1.8',  'Rejestracja/status płatności zamówienia',                            'Propozycja', 'm1 → Płatności',                    'F1.3'],
      ['F1.9',  'Notatki/komentarze wewnętrzne na zamówieniu',                        'Propozycja', 'm1 → Karta zamówienia',             'F1.6'],
      ['F1.10', 'Historia zmian statusu (audit log)',                                  'Propozycja', 'm1 → Karta zamówienia',             'F0.5, F1.6'],
      ['F1.11', 'Dane firmy i konfiguracja nadawcy',                                   'Propozycja', 'Konfiguracja systemu (m15)',         'F0'],
      ['F1.12', 'Konta pracowników (zarządzanie użytkownikami)',                        'Z opisu',    'Uprawnienia (m12)',                  'F0.4'],
      ['F1.13', 'Role i uprawnienia (granularne)',                                      'Z opisu',    'm12 → Użytkownicy',                  'F1.12'],
      ['F1.14', 'Konfiguracja kont kurierskich (API keys)',                             'Propozycja', 'Wysyłki (m4) → Konfiguracja',       'F0'],
      ['F1.15', 'Dynamiczne pola formularza per kurier',                                'Propozycja', 'm4 → Konfiguracja kurierów',         'F1.14'],
      ['F1.16', 'Integracja InPost (Paczkomaty + kurier)',                              'Z opisu',    'm4 → Integracje kurierskie',         'F1.14, F1.15'],
      ['F1.17', 'Nadanie kuriera z poziomu zamówienia',                                 'Z opisu',    'm4 → Integracja z kurierami',        'F1.16, F1.6'],
      ['F1.18', 'Generowanie etykiet wysyłkowych (PDF)',                                'Z opisu',    'm4 → Integracja z kurierami',        'F1.17'],
      ['F1.19', 'Automatyczne przypisanie paczkomatu z Allegro',                        'Propozycja', 'm4 → Punkty odbioru',               'F1.1, F1.16'],
      ['F1.20', 'Synchronizacja statusów zwrotnie do Allegro/WooCommerce',             'Propozycja', 'm7 → Synchronizacja',               'F1.1, F1.2'],
    ];

    faza1.forEach(function(row) {
      var srcClass = row[2] === 'Z opisu' ? 'pv1-src-blue' : (row[2] === 'Propozycja' ? 'pv1-src-purple' : 'pv1-src-green');
      html += '<tr>';
      html += '<td><span class="pv1-num">' + row[0] + '</span></td>';
      html += '<td><div class="pv1-feat-name">' + row[1] + '</div></td>';
      html += '<td><span class="pv1-src ' + srcClass + '">' + row[2] + '</span></td>';
      html += '<td><div class="pv1-module">' + row[3] + '</div></td>';
      html += '<td><span class="pv1-deps">' + row[4] + '</span></td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    // ===== FAZA 2 =====
    html += '<div class="pv1-phase">';
    html += '<div class="pv1-phase-header pv1-phase-header-blue">';
    html += '<span class="pv1-phase-title">📋 Faza 2 — Pełna operacyjność</span>';
    html += '<span class="pv1-phase-badge pv1-badge-blue">Planowane 📋</span>';
    html += '</div>';
    html += '<table class="pv1-table"><thead><tr>';
    html += '<th>#</th><th>Funkcja</th><th>Źródło</th><th>Moduł OrderFlow</th>';
    html += '</tr></thead><tbody>';

    var faza2 = [
      ['F2.1',  'Integracja DPD',                                          'Z opisu',      'm4 → Integracje kurierskie'],
      ['F2.2',  'Integracja DHL',                                          'Z opisu',      'm4 → Integracje kurierskie'],
      ['F2.3',  'Integracja Poczta Polska',                                'Z opisu',      'm4 → Integracje kurierskie'],
      ['F2.4',  'Integracja Wysyłam z Allegro',                            'Z opisu',      'm4 → Integracje kurierskie'],
      ['F2.5',  'Drukowanie etykiet na drukarce termicznej',               'Z opisu',      'Drukowanie (m13)'],
      ['F2.6',  'Mapowanie drukarki do konta użytkownika',                 'Propozycja',   'm13 → Drukowanie'],
      ['F2.7',  'Powiadomienia o nowych zamówieniach',                     'Propozycja',   'Powiadomienia (m14)'],
      ['F2.8',  'Śledzenie przesyłek (tracking)',                          'Propozycja',   'm4 → Integracja z kurierami'],
      ['F2.9',  'Automatyczne e-maile statusowe do klienta',               'Propozycja',   'CRM (m9) / Powiadomienia'],
      ['F2.10', 'Wystawianie faktur VAT',                                   'Z odpowiedzi', 'm1 → Dokumenty sprzedaży'],
      ['F2.11', 'Masowe nadawanie przesyłek',                              'Z odpowiedzi', 'm4 → Integracja z kurierami'],
      ['F2.12', 'Masowa zmiana statusów',                                  'Z odpowiedzi', 'm1 → Lista zamówień'],
      ['F2.13', 'Automatyczna zmiana statusu po wydruku etykiety',         'Z opisu',      'Automatyzacja (m5)'],
      ['F2.14', 'Silnik reguł (podstawowy)',                               'Z opisu',      'm5 → Silnik reguł'],
    ];

    faza2.forEach(function(row) {
      var srcClass = row[2] === 'Z opisu' ? 'pv1-src-blue' : (row[2] === 'Propozycja' ? 'pv1-src-purple' : 'pv1-src-green');
      html += '<tr>';
      html += '<td><span class="pv1-num">' + row[0] + '</span></td>';
      html += '<td><div class="pv1-feat-name">' + row[1] + '</div></td>';
      html += '<td><span class="pv1-src ' + srcClass + '">' + row[2] + '</span></td>';
      html += '<td><div class="pv1-module">' + row[3] + '</div></td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '</div>'; // pv1-wrap
    html += footerHtml();

    main.innerHTML = html;
    main.scrollTop = 0;
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

    // Implementation Progress
    html += '<div class="section-card implementation-progress">';
    html += '<div class="section-title">🚀 Postęp realizacji systemu</div>';
    html += '<div class="impl-phases">';

    var phases = [
      {name: 'Schemat bazy danych (ERD)', status: 'done', detail: '19 tabel: orders, products, customers, users, audit_log, inventory...'},
      {name: 'Backend FastAPI + SQLAlchemy', status: 'done', detail: 'Struktura projektu, modele ORM, Alembic migracje, konfiguracja'},
      {name: 'REST API (CRUD)', status: 'done', detail: '20 endpointów: auth, orders, products, customers, statuses'},
      {name: 'Autentykacja JWT + RBAC', status: 'done', detail: 'Rejestracja, logowanie, role (admin/manager/operator/viewer)'},
      {name: 'Audit Log', status: 'done', detail: 'Pełna historia zmian każdej encji — kluczowa przewaga nad BaseLinker'},
      {name: 'Panel admina (SPA)', status: 'done', detail: 'Login, dashboard z KPI, zamówienia, produkty, klienci, dark/light mode'},
      {name: 'Docker + PostgreSQL', status: 'done', detail: 'docker-compose.yml, Dockerfile, .env konfiguracja'},
      {name: 'GitHub repo + deploy', status: 'done', detail: 'github.com/p4udysk-sudo/orderflow-app — backend + frontend'},
      {name: 'Integracja frontend ↔ backend', status: 'pending', detail: 'Podłączenie panelu do live API, auth flow, real data'},
      {name: 'Testy + CI/CD', status: 'pending', detail: 'Unit tests, integration tests, GitHub Actions'},
    ];

    phases.forEach(function(phase) {
      var icon = phase.status === 'done' ? '✅' : phase.status === 'progress' ? '⚡' : '⏳';
      var cls = 'impl-phase impl-' + phase.status;
      html += '<div class="' + cls + '">';
      html += '<span class="impl-icon">' + icon + '</span>';
      html += '<div class="impl-info">';
      html += '<div class="impl-name">' + escapeHtml(phase.name) + '</div>';
      html += '<div class="impl-detail">' + escapeHtml(phase.detail) + '</div>';
      html += '</div></div>';
    });

    html += '</div>';
    html += '<div class="impl-summary">Stack: Python 3.12 + FastAPI + PostgreSQL 16 + SQLAlchemy 2.0 | Frontend: Vanilla JS + Chart.js | Repo: github.com/p4udysk-sudo/orderflow-app</div>';
    html += '</div>';

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
      '</h1><button class="ogarnij-module-btn" data-ogarnij-module="' + mod.id + '" title="Kopiuj wszystkie funkcje TAK z tego modułu do schowka">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
      'OGARNIJ MODUŁ</button></div>';

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
    var status = statuses[key] || "";

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

    var statusBadge = "";
    if (status === "W_REALIZACJI") {
      statusBadge = '<span class="badge badge-realizacja">⚡ W realizacji</span>';
    } else if (status === "GOTOWE") {
      statusBadge = '<span class="badge badge-gotowe">✅ Gotowe</span>';
    } else if (status === "OGARNIJ") {
      statusBadge = '<span class="badge badge-ogarnij">📨 Zlecone</span>';
    }

    var html =
      '<div class="feature-row' + (status ? ' has-status-' + status.toLowerCase().replace('_','-') : '') + '" data-feature-key="' + key + '">';

    // Name + notes + status
    html += '<div class="feature-name-col"><span class="feature-name">' + escapeHtml(feat.name) + "</span>";
    if (feat.notes) {
      html += '<span class="feature-note">' + escapeHtml(feat.notes) + "</span>";
    }
    if (statusBadge) {
      html += '<div class="feature-status-row">' + statusBadge + '</div>';
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

    // OGARNIJ button (visible only when TAK is selected and not yet in status)
    var showOgarnij = dec === "TAK" && status !== "W_REALIZACJI" && status !== "GOTOWE";
    html += '<div class="ogarnij-col">';
    if (showOgarnij) {
      html += '<button class="ogarnij-btn" data-ogarnij-key="' + key + '" data-ogarnij-module="' + mod.name + '" data-ogarnij-sub="' + sub.name + '" data-ogarnij-feat="' + escapeHtml(feat.name) + '" data-ogarnij-priority="' + feat.priority + '" data-ogarnij-complexity="' + feat.complexity + '" title="Kopiuj komendę do czatu">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
        'OGARNIJ!</button>';
    }
    html += '</div>';

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

  // ===== CLIPBOARD & TOAST =====
  function copyToClipboard(text, triggerEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast("Skopiowano do schowka — wklej w czat Perplexity", "success");
        flashButton(triggerEl);
      }).catch(function() {
        fallbackCopy(text, triggerEl);
      });
    } else {
      fallbackCopy(text, triggerEl);
    }
  }

  function fallbackCopy(text, triggerEl) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("Skopiowano do schowka — wklej w czat Perplexity", "success");
      flashButton(triggerEl);
    } catch (err) {
      showToast("Nie uda\u0142o si\u0119 skopiowa\u0107. Skopiuj r\u0119cznie:", "warning");
      prompt("Skopiuj t\u0119 komend\u0119:", text);
    }
    document.body.removeChild(textarea);
  }

  function flashButton(el) {
    if (!el) return;
    el.classList.add("ogarnij-sent");
    var origText = el.innerHTML;
    el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Skopiowano!';
    setTimeout(function() {
      el.innerHTML = origText;
      el.classList.remove("ogarnij-sent");
    }, 2000);
  }

  function showToast(message, type) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function() {
      toast.classList.add("toast-visible");
    });

    setTimeout(function() {
      toast.classList.remove("toast-visible");
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
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
      // Update URL hash for podstawy-v1
      if (moduleId === "podstawy-v1") {
        history.pushState(null, "", "#podstawy-v1");
      } else if (window.location.hash === "#podstawy-v1") {
        history.pushState(null, "", window.location.pathname + window.location.search);
      }
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

        // Re-render to show/hide OGARNIJ button
        var scrollPos = main.scrollTop;
        renderContent();
        main.scrollTop = scrollPos;
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

      // OGARNIJ single feature button
      var ogarnijBtn = e.target.closest(".ogarnij-btn");
      if (ogarnijBtn) {
        var oKey = ogarnijBtn.getAttribute("data-ogarnij-key");
        var oModule = ogarnijBtn.getAttribute("data-ogarnij-module");
        var oSub = ogarnijBtn.getAttribute("data-ogarnij-sub");
        var oFeat = ogarnijBtn.getAttribute("data-ogarnij-feat");
        var oPriority = ogarnijBtn.getAttribute("data-ogarnij-priority");
        var oComplexity = ogarnijBtn.getAttribute("data-ogarnij-complexity");

        var command = "[ORDERFLOW] Zrealizuj funkcj\u0119:\n" +
          "Modu\u0142: " + oModule + "\n" +
          "Submodu\u0142: " + oSub + "\n" +
          "Funkcja: " + oFeat + "\n" +
          "Priorytet: " + oPriority + " | Z\u0142o\u017cono\u015b\u0107: " + oComplexity;

        copyToClipboard(command, ogarnijBtn);
        statuses[oKey] = "OGARNIJ";
        renderContent();
        renderHeaderStats();
        return;
      }

      // OGARNIJ MODULE button
      var ogarnijModBtn = e.target.closest(".ogarnij-module-btn");
      if (ogarnijModBtn) {
        var modId = ogarnijModBtn.getAttribute("data-ogarnij-module");
        var targetMod = appData.modules.find(function(m) { return m.id === modId; });
        if (!targetMod) return;

        var lines = [];
        var count = 0;
        targetMod.submodules.forEach(function(sub) {
          sub.features.forEach(function(feat, idx) {
            var fKey = getFeatureKey(targetMod.id, sub.id, idx);
            if (decisions[fKey] === "TAK" && statuses[fKey] !== "W_REALIZACJI" && statuses[fKey] !== "GOTOWE") {
              lines.push("  \u2022 " + sub.name + " \u2192 " + feat.name + " [" + feat.priority + ", " + feat.complexity + "]");
              statuses[fKey] = "OGARNIJ";
              count++;
            }
          });
        });

        if (count === 0) {
          showToast("Brak funkcji TAK do zlecenia w tym module", "warning");
          return;
        }

        var moduleCommand = "[ORDERFLOW] Zrealizuj modu\u0142: " + targetMod.name + " (" + count + " funkcji)\n" + lines.join("\n");
        copyToClipboard(moduleCommand, ogarnijModBtn);
        renderContent();
        renderHeaderStats();
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
