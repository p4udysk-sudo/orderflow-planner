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
    // Inject additional CSS for new sections
    var styleTag = document.createElement("style");
    styleTag.textContent = [
      ".api-analysis-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:12px;}",
      ".api-stat-card{background:var(--surface-2,rgba(255,255,255,0.06));border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:4px;}",
      ".api-stat-label{font-size:11px;color:var(--text-secondary,#8a9bb0);text-transform:uppercase;letter-spacing:.05em;}",
      ".api-stat-value{font-size:18px;font-weight:700;color:var(--accent,#4a9eff);}",
      ".api-stat-sub{font-size:11px;color:var(--text-secondary,#8a9bb0);}",
      ".integrations-mini-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:10px;}",
      ".integration-mini-card{background:var(--surface-2,rgba(255,255,255,0.06));border-radius:7px;padding:8px 12px;text-align:center;}",
      ".integration-mini-name{font-size:11px;color:var(--text-secondary,#8a9bb0);margin-bottom:4px;}",
      ".integration-mini-count{font-size:22px;font-weight:700;color:var(--accent,#4a9eff);}",
      ".panel-sections-list{list-style:none;margin:10px 0 0 0;padding:0;display:flex;flex-direction:column;gap:6px;}",
      ".panel-sections-list li{padding:7px 12px;background:var(--surface-2,rgba(255,255,255,0.06));border-radius:6px;font-size:13px;color:var(--text-primary,#e2e8f0);border-left:3px solid var(--accent,#4a9eff);}",
      ".ui-features-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}",
      ".ui-feature-tag{background:rgba(74,158,255,0.12);border:1px solid rgba(74,158,255,0.3);color:var(--accent,#4a9eff);border-radius:20px;padding:4px 10px;font-size:12px;}",
      ".account-config-groups{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:12px;}",
      ".account-config-group{background:var(--surface-2,rgba(255,255,255,0.06));border-radius:8px;padding:12px 14px;}",
      ".account-config-group-title{font-size:11px;font-weight:600;color:var(--text-secondary,#8a9bb0);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;}",
      ".status-dot-row{display:flex;align-items:center;gap:7px;padding:4px 0;font-size:13px;color:var(--text-primary,#e2e8f0);}",
      ".status-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}",
      ".config-tag-list{display:flex;flex-wrap:wrap;gap:5px;}",
      ".config-tag{background:var(--surface-3,rgba(255,255,255,0.1));border-radius:5px;padding:3px 8px;font-size:12px;color:var(--text-primary,#e2e8f0);}",
      ".config-kv{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:13px;border-bottom:1px solid var(--border,rgba(255,255,255,0.07));}",
      ".config-kv:last-child{border-bottom:none;}",
      ".config-kv-label{color:var(--text-secondary,#8a9bb0);}",
      ".config-kv-value{color:var(--text-primary,#e2e8f0);font-weight:500;}",
      ".business-flows-list{display:flex;flex-direction:column;gap:8px;margin-top:12px;}",
      ".business-flow-item{border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;overflow:hidden;}",
      ".business-flow-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface-2,rgba(255,255,255,0.06));cursor:pointer;user-select:none;}",
      ".business-flow-title{font-size:14px;font-weight:600;color:var(--text-primary,#e2e8f0);}",
      ".business-flow-content{padding:10px 14px;display:none;}",
      ".business-flow-item.expanded .business-flow-content{display:block;}",
      ".business-flow-item.expanded .business-flow-chevron{transform:rotate(180deg);}",
      ".business-flow-chevron{transition:transform .2s;color:var(--text-secondary,#8a9bb0);}",
      ".flow-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;}",
      ".flow-step{display:flex;gap:10px;align-items:flex-start;padding:5px 0;font-size:13px;color:var(--text-primary,#e2e8f0);border-bottom:1px solid var(--border,rgba(255,255,255,0.05));}",
      ".flow-step:last-child{border-bottom:none;}",
      ".flow-step-num{width:22px;height:22px;border-radius:50%;background:var(--accent,#4a9eff);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}",
      ".api-mapping-card{margin:12px 0 0 0;border:1px solid rgba(99,102,241,0.4);border-left:4px solid #6366f1;border-radius:8px;overflow:hidden;}",
      ".api-mapping-header{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:rgba(99,102,241,0.08);cursor:pointer;user-select:none;}",
      ".api-mapping-title{font-size:13px;font-weight:600;color:#818cf8;display:flex;align-items:center;gap:6px;}",
      ".api-mapping-content{padding:12px 14px;display:none;}",
      ".api-mapping-card.expanded .api-mapping-content{display:block;}",
      ".api-mapping-card.expanded .api-mapping-chevron{transform:rotate(180deg);}",
      ".api-mapping-chevron{transition:transform .2s;color:#818cf8;}",
      ".api-methods-list{list-style:none;margin:0 0 10px 0;padding:0;display:flex;flex-direction:column;gap:4px;}",
      ".api-method-item{padding:5px 8px;background:rgba(99,102,241,0.06);border-radius:5px;font-size:12px;color:var(--text-primary,#e2e8f0);font-family:monospace;}",
      ".bl-info-cards{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}",
      ".bl-info-card{background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:7px 10px;font-size:12px;color:var(--text-secondary,#8a9bb0);}",
      ".bl-info-card strong{color:#818cf8;display:block;margin-bottom:3px;}"
    ].join("\n");
    document.head.appendChild(styleTag);

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

    // ===== NEW SECTION 1: API Analysis =====
    if (appData.api_analysis) {
      var api = appData.api_analysis;
      html += '<div class="section-card">';
      html += '<div class="section-title">Analiza API Base.com</div>';
      html += '<div class="api-analysis-grid">';
      html += '<div class="api-stat-card"><span class="api-stat-label">Metody API</span><span class="api-stat-value">' + escapeHtml(String(api.total_methods)) + '</span><span class="api-stat-sub">łącznie dostępnych</span></div>';
      html += '<div class="api-stat-card"><span class="api-stat-label">Kategorie</span><span class="api-stat-value">' + escapeHtml(String(api.categories)) + '</span><span class="api-stat-sub">grup metod</span></div>';
      html += '<div class="api-stat-card"><span class="api-stat-label">Rate Limit</span><span class="api-stat-value">' + escapeHtml(api.rate_limit) + '</span><span class="api-stat-sub">maks. żądań</span></div>';
      html += '<div class="api-stat-card"><span class="api-stat-label">Autentykacja</span><span class="api-stat-value" style="font-size:13px;margin-top:2px;">' + escapeHtml(api.auth) + '</span><span class="api-stat-sub">format nagłówka</span></div>';
      html += '<div class="api-stat-card"><span class="api-stat-label">Endpoint</span><span class="api-stat-value" style="font-size:11px;margin-top:2px;word-break:break-all;">' + escapeHtml(api.base_url) + '</span><span class="api-stat-sub">connector.php</span></div>';
      if (api.last_updated) {
        html += '<div class="api-stat-card"><span class="api-stat-label">Aktualizacja</span><span class="api-stat-value" style="font-size:14px;">' + escapeHtml(api.last_updated) + '</span><span class="api-stat-sub">data analizy</span></div>';
      }
      html += '</div>';
      html += '</div>';
    }

    // ===== NEW SECTION 2: Panel Analysis =====
    if (appData.panel_analysis) {
      var panel = appData.panel_analysis;
      html += '<div class="section-card">';
      html += '<div class="section-title">Struktura panelu Base.com</div>';

      if (panel.main_sections && panel.main_sections.length) {
        html += '<ul class="panel-sections-list">';
        panel.main_sections.forEach(function (sec) {
          html += '<li>' + escapeHtml(sec) + '</li>';
        });
        html += '</ul>';
      }

      if (panel.integrations_count) {
        var ic = panel.integrations_count;
        html += '<div style="margin-top:14px;"><div style="font-size:11px;font-weight:600;color:var(--text-secondary,#8a9bb0);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Liczba integracji</div>';
        html += '<div class="integrations-mini-grid">';
        var icLabels = {
          marketplace: "Marketplace",
          stores: "Sklepy",
          couriers: "Kurierzy",
          fulfillment: "Fulfillment",
          accounting_erp: "Księgowość",
          wholesalers: "Hurtownie",
          total: "Łącznie"
        };
        var icKeys = Object.keys(ic);
        icKeys.forEach(function (k) {
          if (k === "total") return; // show total separately
          html += '<div class="integration-mini-card"><div class="integration-mini-name">' + escapeHtml(icLabels[k] || k) + '</div><div class="integration-mini-count">' + ic[k] + '</div></div>';
        });
        if (ic.total !== undefined) {
          html += '<div class="integration-mini-card" style="background:rgba(74,158,255,0.12);border:1px solid rgba(74,158,255,0.3);"><div class="integration-mini-name" style="color:var(--accent,#4a9eff);">Łącznie</div><div class="integration-mini-count" style="font-size:26px;">' + ic.total + '</div></div>';
        }
        html += '</div></div>';
      }

      if (panel.ui_features && panel.ui_features.length) {
        html += '<div style="margin-top:14px;font-size:11px;font-weight:600;color:var(--text-secondary,#8a9bb0);text-transform:uppercase;letter-spacing:.05em;">Funkcje UI</div>';
        html += '<div class="ui-features-tags">';
        panel.ui_features.forEach(function (f) {
          html += '<span class="ui-feature-tag">' + escapeHtml(f) + '</span>';
        });
        html += '</div>';
      }

      html += '</div>';
    }

    // ===== NEW SECTION 3: Account Config =====
    if (appData.account_config) {
      var cfg = appData.account_config;
      html += '<div class="section-card">';
      html += '<div class="section-title">Konfiguracja konta</div>';
      html += '<div class="account-config-groups">';

      // Basic info group
      html += '<div class="account-config-group">';
      html += '<div class="account-config-group-title">Katalog i magazyn</div>';
      if (cfg.inventory_id !== undefined) {
        html += '<div class="config-kv"><span class="config-kv-label">Katalog (ID)</span><span class="config-kv-value">' + escapeHtml(String(cfg.inventory_id)) + '</span></div>';
      }
      if (cfg.inventory_name) {
        html += '<div class="config-kv"><span class="config-kv-label">Nazwa katalogu</span><span class="config-kv-value">' + escapeHtml(cfg.inventory_name) + '</span></div>';
      }
      if (cfg.warehouse_id !== undefined) {
        html += '<div class="config-kv"><span class="config-kv-label">Magazyn (ID)</span><span class="config-kv-value">' + escapeHtml(String(cfg.warehouse_id)) + '</span></div>';
      }
      if (cfg.warehouse_name) {
        html += '<div class="config-kv"><span class="config-kv-label">Nazwa magazynu</span><span class="config-kv-value">' + escapeHtml(cfg.warehouse_name) + '</span></div>';
      }
      if (cfg.currency) {
        html += '<div class="config-kv"><span class="config-kv-label">Waluta</span><span class="config-kv-value">' + escapeHtml(cfg.currency) + '</span></div>';
      }
      if (cfg.default_language) {
        html += '<div class="config-kv"><span class="config-kv-label">Język</span><span class="config-kv-value">' + escapeHtml(cfg.default_language) + '</span></div>';
      }
      html += '</div>';

      // Order statuses group
      if (cfg.order_statuses && cfg.order_statuses.length) {
        html += '<div class="account-config-group">';
        html += '<div class="account-config-group-title">Statusy zamówień</div>';
        cfg.order_statuses.forEach(function (s) {
          html += '<div class="status-dot-row"><span class="status-dot" style="background:' + escapeHtml(s.color) + ';"></span><span>' + escapeHtml(s.name) + '</span></div>';
        });
        html += '</div>';
      }

      // Return statuses group
      if (cfg.return_statuses && cfg.return_statuses.length) {
        html += '<div class="account-config-group">';
        html += '<div class="account-config-group-title">Statusy zwrotów</div>';
        cfg.return_statuses.forEach(function (s) {
          html += '<div class="status-dot-row"><span class="status-dot" style="background:' + escapeHtml(s.color) + ';"></span><span>' + escapeHtml(s.name) + '</span></div>';
        });
        html += '</div>';
      }

      // Return reasons
      if (cfg.return_reasons && cfg.return_reasons.length) {
        html += '<div class="account-config-group">';
        html += '<div class="account-config-group-title">Powody zwrotów</div>';
        html += '<div class="config-tag-list">';
        cfg.return_reasons.forEach(function (r) {
          html += '<span class="config-tag">' + escapeHtml(r) + '</span>';
        });
        html += '</div>';
        html += '</div>';
      }

      // Document & invoice series
      html += '<div class="account-config-group">';
      html += '<div class="account-config-group-title">Serie dokumentów</div>';
      if (cfg.document_series && cfg.document_series.length) {
        html += '<div class="config-kv-label" style="font-size:11px;margin-bottom:4px;">Magazynowe</div>';
        html += '<div class="config-tag-list" style="margin-bottom:8px;">';
        cfg.document_series.forEach(function (d) {
          html += '<span class="config-tag">' + escapeHtml(d) + '</span>';
        });
        html += '</div>';
      }
      if (cfg.invoice_series && cfg.invoice_series.length) {
        html += '<div class="config-kv-label" style="font-size:11px;margin-bottom:4px;">Fakturowe</div>';
        html += '<div class="config-tag-list">';
        cfg.invoice_series.forEach(function (d) {
          html += '<span class="config-tag">' + escapeHtml(d) + '</span>';
        });
        html += '</div>';
      }
      html += '</div>';

      // Pick&Pack carts
      if (cfg.pickpack_carts && cfg.pickpack_carts.length) {
        html += '<div class="account-config-group">';
        html += '<div class="account-config-group-title">Wózki Pick&Pack</div>';
        html += '<div class="config-tag-list">';
        cfg.pickpack_carts.forEach(function (c) {
          html += '<span class="config-tag">' + escapeHtml(c) + '</span>';
        });
        html += '</div>';
        html += '</div>';
      }

      // Printout templates
      if (cfg.printout_templates && cfg.printout_templates.length) {
        html += '<div class="account-config-group">';
        html += '<div class="account-config-group-title">Szablony wydruków</div>';
        html += '<div class="config-tag-list">';
        cfg.printout_templates.forEach(function (t) {
          html += '<span class="config-tag">' + escapeHtml(t) + '</span>';
        });
        html += '</div>';
        html += '</div>';
      }

      html += '</div>'; // end account-config-groups
      html += '</div>'; // end section-card
    }

    // ===== NEW SECTION 4: Business Flows =====
    if (appData.business_flows && appData.business_flows.length) {
      html += '<div class="section-card">';
      html += '<div class="section-title">Przepływy biznesowe</div>';
      html += '<div class="business-flows-list">';
      appData.business_flows.forEach(function (flow, flowIdx) {
        html += '<div class="business-flow-item" data-flow-idx="' + flowIdx + '">';
        html += '<div class="business-flow-header" role="button" tabindex="0" aria-expanded="false">';
        html += '<span class="business-flow-title">⬡ ' + escapeHtml(flow.name) + '</span>';
        html += '<svg class="business-flow-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
        html += '</div>';
        html += '<div class="business-flow-content">';
        html += '<ul class="flow-steps">';
        if (flow.steps && flow.steps.length) {
          flow.steps.forEach(function (step, stepIdx) {
            // Strip leading "N. " numbering from step text since we show our own number
            var stepText = step.replace(/^\d+\.\s*/, "");
            html += '<li class="flow-step"><span class="flow-step-num">' + (stepIdx + 1) + '</span><span>' + escapeHtml(stepText) + '</span></li>';
          });
        }
        html += '</ul>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

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

    // ===== API MAPPING SECTION (collapsible, before filters) =====
    if (mod.api_mapping) {
      var am = mod.api_mapping;
      html += '<div class="api-mapping-card" data-api-card="' + mod.id + '">';
      html += '<div class="api-mapping-header" role="button" tabindex="0" aria-expanded="false" data-api-toggle="' + mod.id + '">';
      html += '<span class="api-mapping-title">';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 20l4-16M6.343 17.657l-4-4 4-4M17.657 17.657l4-4-4-4"/></svg>';
      html += 'API Base.com — metody i przepływy';
      html += '</span>';
      html += '<svg class="api-mapping-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
      html += '</div>';
      html += '<div class="api-mapping-content">';

      if (am.api_methods && am.api_methods.length) {
        html += '<div style="font-size:11px;font-weight:600;color:#818cf8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Metody API (' + am.api_methods.length + ')</div>';
        html += '<ul class="api-methods-list">';
        am.api_methods.forEach(function (method) {
          html += '<li class="api-method-item">' + escapeHtml(method) + '</li>';
        });
        html += '</ul>';
      }

      // Render extra bl_* fields as info cards
      var blFields = [];
      var blFieldLabels = {
        "bl_flow": "Przepływ statusów",
        "bl_structure": "Struktura danych",
        "bl_limits": "Limity API",
        "bl_panel": "Panel BaseLinker",
        "bl_doc_types": "Typy dokumentów",
        "bl_missing": "Brakujące funkcje",
        "bl_config": "Konfiguracja",
        "bl_integrations": "Integracje",
        "bl_courier_form_example": "Formularz kurierski",
        "bl_couriers_pl": "Kurierzy PL"
      };
      Object.keys(am).forEach(function (k) {
        if (k !== "api_methods" && am[k]) {
          blFields.push({ key: k, label: blFieldLabels[k] || k, value: am[k] });
        }
      });
      if (blFields.length) {
        html += '<div class="bl-info-cards">';
        blFields.forEach(function (field) {
          html += '<div class="bl-info-card"><strong>' + escapeHtml(field.label) + '</strong>' + escapeHtml(String(field.value)) + '</div>';
        });
        html += '</div>';
      }

      html += '</div>'; // end api-mapping-content
      html += '</div>'; // end api-mapping-card
    }

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
      // Business flow toggle (overview)
      var flowHeader = e.target.closest(".business-flow-header");
      if (flowHeader) {
        var flowItem = flowHeader.closest(".business-flow-item");
        flowItem.classList.toggle("expanded");
        var isExpanded = flowItem.classList.contains("expanded");
        flowHeader.setAttribute("aria-expanded", isExpanded);
        return;
      }

      // API mapping card toggle (module view)
      var apiToggleEl = e.target.closest("[data-api-toggle]");
      if (apiToggleEl) {
        var cardId = apiToggleEl.getAttribute("data-api-toggle");
        var apiCard = document.querySelector('[data-api-card="' + cardId + '"]');
        if (apiCard) {
          apiCard.classList.toggle("expanded");
          var isApiExpanded = apiCard.classList.contains("expanded");
          apiToggleEl.setAttribute("aria-expanded", isApiExpanded);
        }
        return;
      }

      // Submodule toggle
      var subHeader = e.target.closest(".submodule-header");
      if (subHeader) {
        var section = subHeader.closest(".submodule-section");
        section.classList.toggle("expanded");
        var isSubExpanded = section.classList.contains("expanded");
        subHeader.setAttribute("aria-expanded", isSubExpanded);
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

    // Keyboard support for submodule headers, business flow headers, api mapping headers
    main.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        var subHeader = e.target.closest(".submodule-header");
        if (subHeader) {
          e.preventDefault();
          subHeader.click();
          return;
        }
        var flowHeader = e.target.closest(".business-flow-header");
        if (flowHeader) {
          e.preventDefault();
          flowHeader.click();
          return;
        }
        var apiToggleKb = e.target.closest("[data-api-toggle]");
        if (apiToggleKb) {
          e.preventDefault();
          apiToggleKb.click();
          return;
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
