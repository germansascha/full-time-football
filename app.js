(function () {
  "use strict";

  const { competitions, domesticTitles, competitionTitles, demo } = window.FT_DATA;
  const api = window.FT_API;
  const liveCache = new Map();
  const requests = new Map();

  const state = {
    competition: "eng.1",
    view: "table",
    formRange: "five",
    matchFilter: "all",
    dataset: null,
    selectedTeam: null,
    lastFocus: null,
  };

  const dom = {
    dataState: document.querySelector("#data-state"),
    refreshButton: document.querySelector("#refresh-button"),
    competitionCountry: document.querySelector("#competition-country"),
    competitionTitle: document.querySelector("#competition-title"),
    seasonLabel: document.querySelector("#season-label"),
    viewSwitcher: document.querySelector("#view-switcher"),
    tableView: document.querySelector("#table-view"),
    matchesView: document.querySelector("#matches-view"),
    standingsBody: document.querySelector("#standings-body"),
    matchList: document.querySelector("#match-list"),
    matchesTitle: document.querySelector("#matches-title"),
    loadingState: document.querySelector("#loading-state"),
    errorState: document.querySelector("#error-state"),
    summaryStrip: document.querySelector("#summary-strip"),
    summaryLeader: document.querySelector("#summary-leader"),
    summaryPlayed: document.querySelector("#summary-played"),
    summaryGoals: document.querySelector("#summary-goals"),
    summaryNext: document.querySelector("#summary-next"),
    tableKey: document.querySelector(".table-key"),
    drawer: document.querySelector("#team-drawer"),
    drawerBackdrop: document.querySelector("#drawer-backdrop"),
    drawerCrest: document.querySelector("#drawer-crest"),
    drawerCountry: document.querySelector("#drawer-country"),
    drawerName: document.querySelector("#drawer-team-name"),
    drawerRecord: document.querySelector("#drawer-record"),
    drawerLeagueTitles: document.querySelector("#drawer-league-titles"),
    drawerTitleNote: document.querySelector("#drawer-title-note"),
    drawerCompetitionLabel: document.querySelector("#drawer-competition-label"),
    drawerCompetitionTitles: document.querySelector("#drawer-competition-titles"),
    drawerCompetitionNote: document.querySelector("#drawer-competition-note"),
    drawerSeason: document.querySelector("#drawer-season"),
    drawerPoints: document.querySelector("#drawer-points"),
    drawerForm: document.querySelector("#drawer-form"),
    scorerList: document.querySelector("#scorer-list"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeName(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\b(f\.c\.|fc|afc|cf|s\.c\.|sc)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function titleLookup(map, teamName) {
    const normalized = normalizeName(teamName);
    if (Object.prototype.hasOwnProperty.call(map || {}, normalized)) return map[normalized];

    const candidate = Object.keys(map || {}).find((key) => {
      const normalizedKey = normalizeName(key);
      return normalizedKey === normalized ||
        (normalized.length > 6 && normalizedKey.includes(normalized)) ||
        (normalizedKey.length > 6 && normalized.includes(normalizedKey));
    });
    return candidate ? map[candidate] : null;
  }

  function domesticTitleCount(teamName, preferredCountry) {
    if (preferredCountry && domesticTitles[preferredCountry]) {
      const preferred = titleLookup(domesticTitles[preferredCountry], teamName);
      if (preferred !== null) return preferred;
    }
    for (const map of Object.values(domesticTitles)) {
      const count = titleLookup(map, teamName);
      if (count !== null) return count;
    }
    return null;
  }

  function competitionTitleCount(slug, teamName) {
    const config = competitions[slug];
    if (config.kind === "league") return domesticTitleCount(teamName, config.domesticKey);
    return titleLookup(competitionTitles[slug] || {}, teamName);
  }

  function currentDemo(slug) {
    const year = api.seasonYear();
    return {
      ...demo[slug],
      slug,
      year,
      label: api.seasonLabel(year),
    };
  }

  function setDataState(mode, partial = false) {
    dom.dataState.classList.remove("is-live", "is-demo");
    if (mode === "live") {
      dom.dataState.classList.add("is-live");
      dom.dataState.lastChild.textContent = partial ? " Live · partial" : " Live data";
    } else if (mode === "demo") {
      dom.dataState.classList.add("is-demo");
      dom.dataState.lastChild.textContent = " Sample data";
    } else {
      dom.dataState.lastChild.textContent = " Connecting";
    }
  }

  function teamLogo(team, className = "club-crest") {
    if (!team.logo) {
      return `<span class="crest-fallback" aria-hidden="true">${escapeHtml(team.abbreviation || team.name.slice(0, 2).toUpperCase())}</span>`;
    }
    return `<img class="${className}" src="${escapeHtml(team.logo)}" alt="" loading="lazy" onerror="this.style.display='none'" />`;
  }

  function resultMarks(results, range, labelPrefix = "Form") {
    const shown = range === "season" ? results : results.slice(-5);
    if (!shown.length) return `<span class="no-form">—</span>`;
    return shown.map((result, index) => {
      const word = result === "W" ? "Win" : result === "D" ? "Draw" : "Loss";
      return `<span class="result-mark is-${word.toLowerCase()}" title="${word}" aria-label="${labelPrefix} match ${index + 1}: ${word}">${result}</span>`;
    }).join("");
  }

  function zoneFor(row, total, slug) {
    if (slug === "uefa.champions") {
      if (row.rank <= 8) return "zone-champions";
      if (row.rank <= 24) return "zone-europa";
      return "";
    }
    if (row.rank <= 4) return "zone-champions";
    if (row.rank <= 6) return "zone-europa";
    if (row.rank > total - 3) return "zone-relegation";
    return "";
  }

  function renderTable() {
    const rows = state.dataset.table || [];
    dom.standingsBody.innerHTML = rows.map((row) => {
      const stats = row.stats;
      const gd = stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference;
      const formClass = state.formRange === "season" ? "form-run is-season" : "form-run";
      return `
        <tr class="${zoneFor(row, rows.length, state.competition)}">
          <td class="rank-cell">${row.rank}</td>
          <td class="club-cell">
            <button class="club-button" type="button" data-team-id="${escapeHtml(row.team.id)}">
              ${teamLogo(row.team)}
              <span>${escapeHtml(row.team.shortName || row.team.name)}</span>
            </button>
          </td>
          <td>${stats.played}</td>
          <td>${stats.wins}</td>
          <td>${stats.draws}</td>
          <td>${stats.losses}</td>
          <td>${stats.goalsFor}</td>
          <td>${stats.goalsAgainst}</td>
          <td>${gd}</td>
          <td class="points-cell">${stats.points}</td>
          <td class="form-cell"><div class="${formClass}">${row.form?.length ? resultMarks(row.form, state.formRange) : `<span class="no-form">${stats.played ? "Results unavailable" : "No matches yet"}</span>`}</div>${row.formIncomplete && row.form?.length ? `<small class="form-note">${row.form.length} of ${stats.played} results available</small>` : ""}</td>
        </tr>`;
    }).join("");

    if (!rows.length) {
      dom.standingsBody.innerHTML = `<tr><td colspan="11">No table is available for this stage.</td></tr>`;
    }

    dom.tableKey.innerHTML = state.competition === "uefa.champions"
      ? `<span><i class="key-champions"></i>Direct round of 16</span><span><i class="key-europa"></i>Knockout play-off</span><span class="table-hint">Select any club for titles and leading scorers</span>`
      : `<span><i class="key-champions"></i>Champions League</span><span><i class="key-europa"></i>Europa / Conference</span><span><i class="key-relegation"></i>Relegation</span><span class="table-hint">Select any club for titles and leading scorers</span>`;
  }

  function matchDateLabel(dateString) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  }

  function shortDate(dateString) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(dateString));
  }

  function matchTime(dateString) {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString));
  }

  function filteredMatches() {
    const matches = [...(state.dataset.matches || [])];
    if (state.matchFilter === "results") {
      return matches.filter((match) => match.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
    }
    if (state.matchFilter === "upcoming") {
      return matches.filter((match) => !match.completed).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 30);
    }
    const complete = matches.filter((match) => match.completed).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 16).reverse();
    const upcoming = matches.filter((match) => !match.completed).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 24);
    return [...complete, ...upcoming].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function renderMatches() {
    const matches = filteredMatches();
    if (!matches.length) {
      dom.matchList.innerHTML = `<div class="empty-matches"><div><strong>No matches in this view</strong><p>Try another filter or refresh the live feed.</p></div></div>`;
      return;
    }

    const groups = new Map();
    matches.forEach((match) => {
      const key = new Date(match.date).toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(match);
    });

    dom.matchList.innerHTML = [...groups.values()].map((dayMatches) => `
      <section class="match-day">
        <h3 class="match-day-title">${escapeHtml(matchDateLabel(dayMatches[0].date))}</h3>
        <div class="match-grid">
          ${dayMatches.map((match) => {
            const score = match.completed || match.live
              ? `${match.homeScore ?? "–"} <span aria-hidden="true">:</span> ${match.awayScore ?? "–"}`
              : matchTime(match.date);
            return `
              <article class="match-card">
                <button class="match-team" type="button" data-team-id="${escapeHtml(match.home.id)}">
                  ${teamLogo(match.home)}
                  <span>${escapeHtml(match.home.shortName || match.home.name)}</span>
                </button>
                <div class="match-score">
                  <strong>${score}</strong>
                  <span>${escapeHtml(match.live ? match.status : match.completed ? "Full time" : match.status)}</span>
                </div>
                <button class="match-team" type="button" data-team-id="${escapeHtml(match.away.id)}">
                  ${teamLogo(match.away)}
                  <span>${escapeHtml(match.away.shortName || match.away.name)}</span>
                </button>
              </article>`;
          }).join("")}
        </div>
      </section>`).join("");
  }

  function findTeam(teamId) {
    const row = (state.dataset.table || []).find((candidate) => String(candidate.team.id) === String(teamId));
    if (row) return row.team;
    for (const match of state.dataset.matches || []) {
      if (String(match.home.id) === String(teamId)) return match.home;
      if (String(match.away.id) === String(teamId)) return match.away;
    }
    return null;
  }

  function recordForTeam(team) {
    const tableRow = (state.dataset.table || []).find((row) => api.sameTeam(row.team, team));
    if (tableRow) return { ...tableRow.stats, form: tableRow.form || [], demoScorers: tableRow.demoScorers || [] };

    const completed = (state.dataset.matches || [])
      .filter((match) => match.completed && (api.sameTeam(match.home, team) || api.sameTeam(match.away, team)))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const record = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [], demoScorers: [] };
    completed.forEach((match) => {
      const home = api.sameTeam(match.home, team);
      const own = home ? match.homeScore : match.awayScore;
      const other = home ? match.awayScore : match.homeScore;
      record.played += 1;
      record.goalsFor += own || 0;
      record.goalsAgainst += other || 0;
      if (own === other) {
        record.draws += 1;
        record.form.push("D");
      } else if (own > other) {
        record.wins += 1;
        record.form.push("W");
      } else {
        record.losses += 1;
        record.form.push("L");
      }
    });
    record.points = record.wins * 3 + record.draws;
    return record;
  }

  function renderSummary() {
    const table = state.dataset.table || [];
    const matches = state.dataset.matches || [];
    const completed = matches.filter((match) => match.completed);
    const goals = completed.reduce((sum, match) => sum + (match.homeScore || 0) + (match.awayScore || 0), 0);
    const next = matches
      .filter((match) => !match.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    dom.summaryLeader.textContent = table[0]?.team.shortName || (completed.length ? "Cup underway" : "—");
    dom.summaryPlayed.textContent = completed.length ? completed.length.toLocaleString("en-GB") : "—";
    dom.summaryGoals.textContent = completed.length ? goals.toLocaleString("en-GB") : "—";
    dom.summaryNext.textContent = next
      ? `${next.home.abbreviation || next.home.shortName} v ${next.away.abbreviation || next.away.shortName} · ${shortDate(next.date)}`
      : "—";
  }

  function setActiveButtons(selector, attribute, value) {
    document.querySelectorAll(selector).forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute(attribute) === value);
    });
  }

  function updateViewVisibility() {
    const config = competitions[state.competition];
    const tableButton = dom.viewSwitcher.querySelector('[data-view="table"]');
    tableButton.hidden = !config.standings;
    if (!config.standings && state.view === "table") state.view = "matches";

    dom.tableView.classList.toggle("is-hidden", state.view !== "table");
    dom.matchesView.classList.toggle("is-hidden", state.view !== "matches");
    setActiveButtons("[data-view]", "data-view", state.view);
  }

  function renderAll() {
    const config = competitions[state.competition];
    dom.competitionCountry.textContent = config.country;
    dom.competitionTitle.textContent = config.name;
    dom.seasonLabel.textContent = state.dataset.label;
    dom.drawerSeason.textContent = state.dataset.label;
    dom.matchesTitle.textContent = config.kind === "cup" ? "Cup ties" : "Fixtures & results";
    document.documentElement.style.setProperty("--competition-accent", config.accent);
    updateViewVisibility();
    renderSummary();
    renderTable();
    renderMatches();
    dom.loadingState.classList.add("is-hidden");
    dom.errorState.classList.add("is-hidden");
    setDataState(state.dataset.source, state.dataset.partial);
  }

  async function loadCompetition(slug, { force = false } = {}) {
    state.competition = slug;
    const config = competitions[slug];
    state.view = config.standings ? state.view : "matches";
    state.dataset = force ? currentDemo(slug) : (liveCache.get(slug) || currentDemo(slug));
    setActiveButtons("[data-competition]", "data-competition", slug);
    renderAll();

    dom.refreshButton.classList.add("is-spinning");
    setDataState("connecting");

    if (!force && requests.has(slug)) {
      try {
        const cachedRequest = await requests.get(slug);
        if (state.competition === slug) {
          state.dataset = cachedRequest;
          renderAll();
        }
      } finally {
        dom.refreshButton.classList.remove("is-spinning");
      }
      return;
    }

    const task = api.getCompetition(slug, { bypassCache: force });
    requests.set(slug, task);
    try {
      const dataset = await task;
      liveCache.set(slug, dataset);
      if (state.competition === slug) {
        state.dataset = dataset;
        renderAll();
      }
    } catch (error) {
      console.warn("Live football data unavailable; showing sample data.", error);
      if (state.competition === slug) {
        state.dataset = currentDemo(slug);
        renderAll();
      }
    } finally {
      requests.delete(slug);
      dom.refreshButton.classList.remove("is-spinning");
    }
  }

  function titleDisplay(count) {
    return count === null ? "—" : String(count);
  }

  function openDrawer(team, trigger) {
    if (!team) return;
    const config = competitions[state.competition];
    const record = recordForTeam(team);
    const domesticCount = domesticTitleCount(team.name, config.domesticKey);
    const compCount = competitionTitleCount(state.competition, team.name);

    state.selectedTeam = team;
    state.lastFocus = trigger || document.activeElement;
    dom.drawerName.textContent = team.name;
    dom.drawerCountry.textContent = config.country;
    dom.drawerRecord.textContent = `${record.wins} wins · ${record.draws} draws · ${record.losses} losses`;
    dom.drawerLeagueTitles.textContent = titleDisplay(domesticCount);
    dom.drawerTitleNote.textContent = domesticCount === null ? "Historic count not yet catalogued" : "National top-flight championships";
    dom.drawerCompetitionLabel.textContent = config.kind === "league" ? `${config.name} lineage` : `${config.name} titles`;
    dom.drawerCompetitionTitles.textContent = titleDisplay(compCount);
    dom.drawerCompetitionNote.textContent = compCount === null ? "Historic count not yet catalogued" : "Through the 2025/26 season";
    dom.drawerPoints.textContent = config.kind === "cup" ? `${record.played} ties` : `${record.points} pts`;
    dom.drawerForm.innerHTML = resultMarks(record.form || [], "season", "Season form");
    dom.drawerCrest.src = team.logo || "";
    dom.drawerCrest.alt = team.logo ? `${team.name} crest` : "";
    dom.drawerCrest.style.display = team.logo ? "block" : "none";
    dom.scorerList.innerHTML = `<li class="scorer-empty">Calculating this season’s goals…</li>`;

    dom.drawerBackdrop.hidden = false;
    requestAnimationFrame(() => {
      dom.drawerBackdrop.classList.add("is-open");
      dom.drawer.classList.add("is-open");
    });
    dom.drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    dom.drawer.querySelector(".drawer-close").focus();

    loadTeamScorers(team, record);
  }

  async function loadTeamScorers(team, record) {
    let scorers = api.scorersFromMatches(state.dataset.matches || [], team);
    if (!scorers.length && state.dataset.source === "demo") scorers = record.demoScorers || [];
    if (scorers.length < 3 && state.dataset.source === "live") {
      const leaders = await api.scorersFromLeaders(state.competition, state.dataset.year, team);
      const merged = new Map(scorers.map((scorer) => [scorer.name, scorer]));
      leaders.forEach((scorer) => merged.set(scorer.name, scorer));
      scorers = [...merged.values()].sort((a, b) => b.goals - a.goals).slice(0, 3);
    }
    if (!state.selectedTeam || String(state.selectedTeam.id) !== String(team.id)) return;

    dom.scorerList.innerHTML = scorers.length
      ? scorers.slice(0, 3).map((scorer) => `
          <li>
            <span class="scorer-name">${escapeHtml(scorer.name)}</span>
            <span class="scorer-goals">${Number(scorer.goals) || 0} goals</span>
          </li>`).join("")
      : `<li class="scorer-empty">Goal-event detail is not available for this club yet.</li>`;
  }

  function closeDrawer() {
    dom.drawer.classList.remove("is-open");
    dom.drawerBackdrop.classList.remove("is-open");
    dom.drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    state.selectedTeam = null;
    window.setTimeout(() => { dom.drawerBackdrop.hidden = true; }, 260);
    if (state.lastFocus instanceof HTMLElement) state.lastFocus.focus();
  }

  document.addEventListener("click", (event) => {
    const competitionButton = event.target.closest("[data-competition]");
    if (competitionButton) {
      const slug = competitionButton.dataset.competition;
      state.view = competitions[slug].standings ? "table" : "matches";
      loadCompetition(slug);
      return;
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.view = viewButton.dataset.view;
      updateViewVisibility();
      return;
    }

    const formButton = event.target.closest("[data-form-range]");
    if (formButton) {
      state.formRange = formButton.dataset.formRange;
      setActiveButtons("[data-form-range]", "data-form-range", state.formRange);
      renderTable();
      return;
    }

    const filterButton = event.target.closest("[data-match-filter]");
    if (filterButton) {
      state.matchFilter = filterButton.dataset.matchFilter;
      setActiveButtons("[data-match-filter]", "data-match-filter", state.matchFilter);
      renderMatches();
      return;
    }

    const teamButton = event.target.closest("[data-team-id]");
    if (teamButton) {
      openDrawer(findTeam(teamButton.dataset.teamId), teamButton);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (actionButton?.dataset.action === "close-drawer") closeDrawer();
    if (actionButton?.dataset.action === "retry") loadCompetition(state.competition, { force: true });
    if (actionButton?.dataset.action === "home") {
      state.view = "table";
      loadCompetition("eng.1");
    }
  });

  dom.drawerBackdrop.addEventListener("click", closeDrawer);
  dom.refreshButton.addEventListener("click", () => loadCompetition(state.competition, { force: true }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dom.drawer.classList.contains("is-open")) closeDrawer();
  });

  loadCompetition(state.competition);
})();
