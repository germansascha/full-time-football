(function () {
  "use strict";

  const SITE_BASE = "https://site.api.espn.com/apis";
  const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";
  const cache = new Map();

  function seasonYear(referenceDate = new Date()) {
    return referenceDate.getMonth() >= 6 ? referenceDate.getFullYear() : referenceDate.getFullYear() - 1;
  }

  function seasonLabel(year) {
    return `${year}–${String(year + 1).slice(-2)}`;
  }

  function dateRange(year) {
    return `${year}0701-${year + 1}0630`;
  }

  async function request(url, { timeout = 12000, bypassCache = false } = {}) {
    if (!bypassCache && cache.has(url)) return cache.get(url);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Football feed returned ${response.status}`);
      const data = await response.json();
      if (data.error || Number(data.code) >= 400 || data.status === "error") {
        throw new Error(data.message || "Football feed returned an error");
      }
      cache.set(url, data);
      return data;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function collectStandingEntries(node, output = []) {
    if (!node || typeof node !== "object") return output;
    if (Array.isArray(node.entries)) output.push(...node.entries);
    if (node.standings) collectStandingEntries(node.standings, output);
    if (Array.isArray(node.children)) node.children.forEach((child) => collectStandingEntries(child, output));
    return output;
  }

  function statValue(stats, names, fallback = 0) {
    const lookup = stats.find((stat) => names.includes(stat.name) || names.includes(stat.abbreviation));
    if (!lookup) return fallback;
    const value = lookup.value ?? Number.parseFloat(lookup.displayValue);
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function statText(stats, names, fallback = "") {
    const lookup = stats.find((stat) => names.includes(stat.name) || names.includes(stat.abbreviation));
    return lookup?.displayValue ?? fallback;
  }

  function normalizeTeam(team = {}) {
    const logo = team.logos?.[0]?.href || team.logo || "";
    return {
      id: String(team.id || team.uid || team.abbreviation || team.displayName || "unknown"),
      uid: team.uid || "",
      name: team.displayName || team.name || team.shortDisplayName || "Unknown club",
      shortName: team.shortDisplayName || team.displayName || team.name || "Unknown club",
      abbreviation: team.abbreviation || "",
      logo,
      color: team.color ? `#${team.color.replace("#", "")}` : "",
    };
  }

  function parseStandings(payload) {
    const rawEntries = collectStandingEntries(payload);
    const seen = new Set();
    const rows = [];

    rawEntries.forEach((entry) => {
      const team = normalizeTeam(entry.team || entry.club || {});
      if (!team.id || seen.has(team.id)) return;
      seen.add(team.id);

      const stats = Array.isArray(entry.stats) ? entry.stats : [];
      const wins = statValue(stats, ["wins", "W"]);
      const draws = statValue(stats, ["ties", "draws", "D"]);
      const losses = statValue(stats, ["losses", "L"]);
      const played = statValue(stats, ["gamesPlayed", "games", "GP"], wins + draws + losses);
      const goalsFor = statValue(stats, ["pointsFor", "goalsFor", "GF"]);
      const goalsAgainst = statValue(stats, ["pointsAgainst", "goalsAgainst", "GA"]);
      const goalDifference = statValue(stats, ["pointDifferential", "goalDifference", "GD"], goalsFor - goalsAgainst);
      const points = statValue(stats, ["points", "PTS"], wins * 3 + draws);
      const rank = statValue(stats, ["rank", "RANK"], rows.length + 1);
      // A standings streak is not a chronological match history.
      const form = [];

      rows.push({
        rank,
        team,
        stats: { played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points },
        form,
        note: entry.note?.description || "",
      });
    });

    rows.sort((a, b) => a.rank - b.rank || b.stats.points - a.stats.points);
    rows.forEach((row, index) => { row.rank = index + 1; });
    return rows;
  }

  function scoreValue(competitor) {
    const raw = competitor?.score?.value ?? competitor?.score;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseEvents(payload) {
    const events = Array.isArray(payload?.events)
      ? payload.events
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

    return events.map((event) => {
      const competition = event.competitions?.[0] || event.competition || {};
      const competitors = competition.competitors || [];
      const homeRaw = competitors.find((team) => team.homeAway === "home") || competitors[0] || {};
      const awayRaw = competitors.find((team) => team.homeAway === "away") || competitors[1] || {};
      const statusType = event.status?.type || competition.status?.type || {};
      const completed = Boolean(statusType.completed || statusType.state === "post");
      const live = statusType.state === "in";

      return {
        id: String(event.id || competition.id || `${event.date}-${homeRaw.id}-${awayRaw.id}`),
        date: event.date || competition.date || new Date().toISOString(),
        completed,
        live,
        status: live
          ? statusType.shortDetail || statusType.detail || "Live"
          : completed
            ? "FT"
            : statusType.shortDetail || statusType.detail || "Scheduled",
        round: event.seasonType?.name || competition.type?.text || "",
        home: normalizeTeam(homeRaw.team || homeRaw),
        away: normalizeTeam(awayRaw.team || awayRaw),
        homeScore: scoreValue(homeRaw),
        awayScore: scoreValue(awayRaw),
        details: competition.details || event.details || [],
      };
    }).filter((match) => match.home.name !== "Unknown club" && match.away.name !== "Unknown club");
  }

  function sameTeam(left, right) {
    if (!left || !right) return false;
    if (String(left.id) === String(right.id)) return true;
    return left.name && right.name && left.name.toLowerCase() === right.name.toLowerCase();
  }

  function addFormFromMatches(table, matches) {
    const completed = matches
      .filter((match) => match.completed && match.homeScore !== null && match.awayScore !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    table.forEach((row) => {
      const form = [];
      completed.forEach((match) => {
        const isHome = sameTeam(match.home, row.team);
        const isAway = sameTeam(match.away, row.team);
        if (!isHome && !isAway) return;
        const own = isHome ? match.homeScore : match.awayScore;
        const other = isHome ? match.awayScore : match.homeScore;
        form.push(own === other ? "D" : own > other ? "W" : "L");
      });
      row.form = form;
      row.formIncomplete = form.length < row.stats.played;
    });
    return table;
  }

  function participantFromDetail(detail) {
    return detail.participants?.[0]?.athlete || detail.athletes?.[0] || detail.athlete || null;
  }

  function teamFromDetail(detail) {
    return detail.team || detail.participants?.[0]?.team || null;
  }

  function scorersFromMatches(matches, team) {
    const scorers = new Map();
    matches.forEach((match) => {
      if (!match.completed || (!sameTeam(match.home, team) && !sameTeam(match.away, team))) return;
      (match.details || []).forEach((detail) => {
        const type = `${detail.type?.text || ""} ${detail.type?.name || ""} ${detail.text || ""}`.toLowerCase();
        const scoringPlay = detail.scoringPlay === true || /\bgoal\b/.test(type);
        if (!scoringPlay || /shootout|penalty shoot-out/.test(type)) return;
        const detailTeam = teamFromDetail(detail);
        if (detailTeam && String(detailTeam.id || detailTeam.uid) !== String(team.id)) return;
        const athlete = participantFromDetail(detail);
        const name = athlete?.displayName || athlete?.fullName || athlete?.shortName;
        if (!name) return;
        scorers.set(name, (scorers.get(name) || 0) + 1);
      });
    });

    return [...scorers.entries()]
      .map(([name, goals]) => ({ name, goals }))
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
      .slice(0, 3);
  }

  function idFromRef(ref = "") {
    const clean = ref.split("?")[0];
    return clean.split("/").filter(Boolean).pop() || "";
  }

  function collectLeaderCategories(payload) {
    const roots = payload?.items || payload?.splits || [payload];
    return roots.flatMap((root) => root?.categories || root?.leaders || []);
  }

  async function scorersFromLeaders(slug, year, team) {
    try {
      const schedule = await request(`${SITE_BASE}/site/v2/sports/soccer/${encodeURIComponent(slug)}/teams/${encodeURIComponent(team.id)}/schedule?season=${year}`);
      if (Number(schedule.season?.year) !== year || !schedule.season?.type) throw new Error("Season unavailable");
      const url = `${CORE_BASE}/${encodeURIComponent(slug)}/seasons/${year}/types/${schedule.season.type}/teams/${encodeURIComponent(team.id)}/leaders`;
      const payload = await request(url, { timeout: 9000 });
      const categories = collectLeaderCategories(payload);
      const goalsCategory = categories.find((category) => category.name === "goalsLeaders" || category.name === "goals");
      if (!goalsCategory) throw new Error("Goal totals unavailable");
      const leaders = goalsCategory.leaders || goalsCategory.entries || goalsCategory.items || [];
      const matching = leaders.filter((leader) => {
        const leaderTeamId = leader.team?.id || idFromRef(leader.team?.$ref);
        return (!leaderTeamId || String(leaderTeamId) === String(team.id)) && Number(leader.value) > 0;
      }).sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 3);

      return Promise.all(matching.map(async (leader) => {
        let athlete = leader.athlete || leader.player || {};
        if (athlete.$ref && !athlete.displayName) {
          athlete = await request(athlete.$ref.replace(/^http:/, "https:"), { timeout: 7000 });
        }
        return {
          name: athlete.displayName || athlete.fullName || athlete.shortName || "Unknown scorer",
          goals: Number(leader.value),
        };
      }));
    } catch (error) {
      throw error;
    }
  }

  async function fillMissingResults(slug, year, table, matches, bypassCache) {
    const byId = new Map(matches.map((match) => [match.id, match]));
    const needsFixtures = !matches.some((match) => !match.completed);
    const missing = table.filter((row) => row.formIncomplete || needsFixtures);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(6, missing.length) }, async () => {
      while (cursor < missing.length) {
        const row = missing[cursor++];
        const baseUrl = `${SITE_BASE}/site/v2/sports/soccer/${encodeURIComponent(slug)}/teams/${encodeURIComponent(row.team.id)}/schedule?season=${year}`;
        const urls = [row.formIncomplete ? baseUrl : null, needsFixtures ? `${baseUrl}&fixture=true` : null].filter(Boolean);
        const responses = await Promise.allSettled(urls.map((url) => request(url, { bypassCache })));
        for (const response of responses) {
          if (response.status !== "fulfilled") continue;
          const payload = response.value;
          if (payload.season?.year && Number(payload.season.year) !== year) continue;
          const events = (payload.events || []).filter((event) =>
            !event.season?.year || Number(event.season.year) === year);
          parseEvents({ events }).forEach((match) => {
            // Preserve scoreboard goal details when both feeds contain a match.
            if (!byId.has(match.id)) byId.set(match.id, match);
          });
        }
      }
    }));
    return [...byId.values()];
  }

  async function getCompetition(slug, { bypassCache = false } = {}) {
    const year = seasonYear();
    const config = window.FT_DATA.competitions[slug];
    if (!config) throw new Error("Unknown competition");

    const standingsUrl = `${SITE_BASE}/v2/sports/soccer/${encodeURIComponent(slug)}/standings?season=${year}`;
    const matchesUrl = `${SITE_BASE}/site/v2/sports/soccer/${encodeURIComponent(slug)}/scoreboard?limit=1000&dates=${dateRange(year)}`;
    const jobs = [
      config.standings ? request(standingsUrl, { bypassCache }) : Promise.resolve(null),
      request(matchesUrl, { bypassCache }),
    ];
    const [standingsResult, matchesResult] = await Promise.allSettled(jobs);

    if (standingsResult.status === "rejected" && matchesResult.status === "rejected") {
      throw matchesResult.reason;
    }

    const table = standingsResult.status === "fulfilled" && standingsResult.value
      ? parseStandings(standingsResult.value)
      : [];
    let matches = matchesResult.status === "fulfilled"
      ? parseEvents(matchesResult.value)
      : [];

    if (!table.length && !matches.length) throw new Error("No competition data returned");
    addFormFromMatches(table, matches);
    if (table.some((row) => row.formIncomplete) || (table.length && !matches.some((match) => !match.completed))) {
      matches = await fillMissingResults(slug, year, table, matches, bypassCache);
      addFormFromMatches(table, matches);
    }

    return {
      slug,
      year,
      label: seasonLabel(year),
      table,
      matches,
      source: "live",
      partial: standingsResult.status === "rejected" || table.some((row) => row.formIncomplete) || (!table.length && matchesResult.status === "rejected"),
    };
  }

  window.FT_API = {
    getCompetition,
    scorersFromMatches,
    scorersFromLeaders,
    seasonYear,
    seasonLabel,
    sameTeam,
  };
})();
