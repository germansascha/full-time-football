(function () {
  "use strict";

  const competitions = {
    "eng.1": {
      slug: "eng.1",
      name: "Premier League",
      country: "England",
      kind: "league",
      standings: true,
      domesticKey: "england",
      accent: "#7b36aa",
    },
    "ger.1": {
      slug: "ger.1",
      name: "Bundesliga",
      country: "Germany",
      kind: "league",
      standings: true,
      domesticKey: "germany",
      accent: "#e4514a",
    },
    "esp.1": {
      slug: "esp.1",
      name: "La Liga",
      country: "Spain",
      kind: "league",
      standings: true,
      domesticKey: "spain",
      accent: "#e93851",
    },
    "uefa.champions": {
      slug: "uefa.champions",
      name: "Champions League",
      country: "Europe",
      kind: "hybrid",
      standings: true,
      domesticKey: null,
      accent: "#4c79e8",
    },
    "eng.fa": {
      slug: "eng.fa",
      name: "FA Cup",
      country: "England",
      kind: "cup",
      standings: false,
      domesticKey: "england",
      accent: "#3676e8",
    },
    "eng.league_cup": {
      slug: "eng.league_cup",
      name: "Carabao Cup",
      country: "England",
      kind: "cup",
      standings: false,
      domesticKey: "england",
      accent: "#13a8d7",
    },
    "ger.dfb_pokal": {
      slug: "ger.dfb_pokal",
      name: "DFB-Pokal",
      country: "Germany",
      kind: "cup",
      standings: false,
      domesticKey: "germany",
      accent: "#2bae78",
    },
  };

  // National top-flight championships through the end of 2025/26.
  // Counts include championships before each league's current branding.
  const domesticTitles = {
    england: {
      arsenal: 14,
      "aston villa": 7,
      bournemouth: 0,
      brentford: 0,
      "brighton and hove albion": 0,
      brighton: 0,
      burnley: 2,
      chelsea: 6,
      "crystal palace": 0,
      everton: 9,
      fulham: 0,
      "ipswich town": 1,
      leeds: 3,
      "leeds united": 3,
      leicester: 1,
      "leicester city": 1,
      liverpool: 20,
      "manchester city": 10,
      "manchester united": 20,
      "newcastle united": 4,
      "nottingham forest": 1,
      "sheffield united": 1,
      southampton: 0,
      sunderland: 6,
      "tottenham hotspur": 2,
      tottenham: 2,
      "west ham united": 0,
      "wolverhampton wanderers": 3,
      wolves: 3,
    },
    germany: {
      "bayern munich": 35,
      "bayern munchen": 35,
      "borussia dortmund": 8,
      dortmund: 8,
      "borussia monchengladbach": 5,
      "bayer leverkusen": 1,
      "rb leipzig": 0,
      "vfb stuttgart": 5,
      stuttgart: 5,
      "eintracht frankfurt": 1,
      "werder bremen": 4,
      "hamburger sv": 6,
      hamburg: 6,
      "schalke 04": 7,
      "fc koln": 3,
      cologne: 3,
      "kaiserslautern": 4,
      "nurnberg": 10,
      "wolfsburg": 1,
      "vfl wolfsburg": 1,
      "mainz 05": 0,
      freiburg: 0,
      "sc freiburg": 0,
      hoffenheim: 0,
      "union berlin": 0,
      "st pauli": 0,
      heidenheim: 0,
      augsburg: 0,
      elversberg: 0,
      "hertha berlin": 2,
      "hannover 96": 2,
      "eintracht braunschweig": 1,
    },
    spain: {
      "real madrid": 36,
      barcelona: 29,
      "fc barcelona": 29,
      "atletico madrid": 11,
      "athletic club": 8,
      "athletic bilbao": 8,
      valencia: 6,
      "real sociedad": 2,
      "deportivo la coruna": 1,
      "deportivo coruna": 1,
      sevilla: 1,
      "real betis": 1,
      villarreal: 0,
      girona: 0,
      getafe: 0,
      osasuna: 0,
      espanyol: 0,
      "celta vigo": 0,
      mallorca: 0,
      "rayo vallecano": 0,
      alaves: 0,
      elche: 0,
      levante: 0,
      oviedo: 0,
      "real oviedo": 0,
      "las palmas": 0,
    },
    france: {
      "paris saint germain": 14,
      psg: 14,
      "saint etienne": 10,
      marseille: 9,
      "olympique marseille": 9,
      monaco: 8,
      nantes: 8,
      lyon: 7,
      "olympique lyonnais": 7,
      lille: 4,
    },
    italy: {
      juventus: 36,
      "inter milan": 21,
      internazionale: 21,
      "ac milan": 19,
      milan: 19,
      napoli: 4,
      "ssc napoli": 4,
      roma: 3,
      lazio: 2,
      atalanta: 0,
    },
    portugal: {
      benfica: 38,
      porto: 31,
      "sporting cp": 21,
      sporting: 21,
    },
    netherlands: {
      ajax: 36,
      "psv eindhoven": 26,
      psv: 26,
      feyenoord: 16,
    },
  };

  // Selected-competition trophy counts through the end of 2025/26.
  const competitionTitles = {
    "uefa.champions": {
      "real madrid": 15,
      "ac milan": 7,
      "bayern munich": 6,
      "bayern munchen": 6,
      liverpool: 6,
      barcelona: 5,
      "fc barcelona": 5,
      ajax: 4,
      "inter milan": 3,
      internazionale: 3,
      "manchester united": 3,
      juventus: 2,
      benfica: 2,
      "nottingham forest": 2,
      porto: 2,
      chelsea: 2,
      "paris saint germain": 2,
      psg: 2,
      "borussia dortmund": 1,
      "manchester city": 1,
      "aston villa": 1,
      "psv eindhoven": 1,
      feyenoord: 1,
      marseille: 1,
      "red star belgrade": 1,
      "celtic": 1,
      "hamburger sv": 1,
      steaua: 1,
    },
    "eng.fa": {
      arsenal: 14,
      "manchester united": 13,
      chelsea: 8,
      liverpool: 8,
      "tottenham hotspur": 8,
      tottenham: 8,
      "manchester city": 8,
      "aston villa": 7,
      "newcastle united": 6,
      "blackburn rovers": 6,
      everton: 5,
      "west bromwich albion": 5,
      "wolverhampton wanderers": 4,
      wolves: 4,
      bolton: 4,
      "sheffield united": 4,
      "sheffield wednesday": 3,
      "west ham united": 3,
      "nottingham forest": 2,
      sunderland: 2,
      portsmouth: 2,
      "crystal palace": 1,
      leicester: 1,
      "wigan athletic": 1,
    },
    "eng.league_cup": {
      liverpool: 10,
      "manchester city": 9,
      "manchester united": 6,
      chelsea: 5,
      "aston villa": 5,
      "tottenham hotspur": 4,
      tottenham: 4,
      "nottingham forest": 4,
      leicester: 3,
      arsenal: 2,
      norwich: 2,
      birmingham: 2,
      wolves: 2,
      "wolverhampton wanderers": 2,
      "west bromwich albion": 1,
      "newcastle united": 1,
      swansea: 1,
      middlesbrough: 1,
    },
    "ger.dfb_pokal": {
      "bayern munich": 21,
      "bayern munchen": 21,
      "werder bremen": 6,
      "schalke 04": 5,
      "borussia dortmund": 5,
      dortmund: 5,
      "eintracht frankfurt": 5,
      "vfb stuttgart": 4,
      stuttgart: 4,
      "nurnberg": 4,
      "fc koln": 4,
      "hamburger sv": 3,
      "borussia monchengladbach": 3,
      "bayer leverkusen": 2,
      "rb leipzig": 2,
      "kaiserslautern": 2,
      wolfsburg: 1,
    },
  };

  const leagueTeams = {
    "eng.1": [
      "Arsenal", "Manchester City", "Liverpool", "Chelsea", "Manchester United",
      "Aston Villa", "Newcastle United", "Tottenham Hotspur", "Brighton & Hove Albion", "Brentford",
      "Crystal Palace", "Fulham", "Everton", "Nottingham Forest", "West Ham United",
      "Leeds United", "Sunderland", "Bournemouth", "Burnley", "Wolverhampton Wanderers",
    ],
    "ger.1": [
      "Bayern Munich", "Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen", "VfB Stuttgart",
      "Eintracht Frankfurt", "SC Freiburg", "Werder Bremen", "Borussia Mönchengladbach", "Mainz 05",
      "Wolfsburg", "Union Berlin", "Augsburg", "Hoffenheim", "Hamburger SV", "St. Pauli",
      "Heidenheim", "Elversberg",
    ],
    "esp.1": [
      "Barcelona", "Real Madrid", "Atlético Madrid", "Villarreal", "Athletic Club",
      "Real Betis", "Real Sociedad", "Sevilla", "Celta Vigo", "Girona",
      "Valencia", "Osasuna", "Espanyol", "Getafe", "Mallorca", "Rayo Vallecano",
      "Alavés", "Levante", "Elche", "Deportivo La Coruña",
    ],
    "uefa.champions": [
      "Paris Saint-Germain", "Bayern Munich", "Barcelona", "Real Madrid", "Arsenal", "Liverpool",
      "Manchester City", "Inter Milan", "Borussia Dortmund", "Chelsea", "Atlético Madrid", "Juventus",
      "Benfica", "Napoli", "Sporting CP", "PSV Eindhoven", "Marseille", "Atalanta",
    ],
  };

  const cupTeams = {
    "eng.fa": ["Arsenal", "Chelsea", "Manchester City", "Leeds United", "Liverpool", "Aston Villa", "Newcastle United", "Brighton & Hove Albion"],
    "eng.league_cup": ["Manchester City", "Arsenal", "Liverpool", "Chelsea", "Tottenham Hotspur", "Newcastle United", "Manchester United", "Aston Villa"],
    "ger.dfb_pokal": ["Bayern Munich", "VfB Stuttgart", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig", "Eintracht Frankfurt", "Schalke 04", "Werder Bremen"],
  };

  const demoScorers = {
    Arsenal: ["Viktor Gyökeres", "Bukayo Saka", "Kai Havertz"],
    "Manchester City": ["Erling Haaland", "Omar Marmoush", "Phil Foden"],
    Liverpool: ["Mohamed Salah", "Hugo Ekitiké", "Cody Gakpo"],
    "Bayern Munich": ["Harry Kane", "Michael Olise", "Luis Díaz"],
    Barcelona: ["Raphinha", "Lamine Yamal", "Ferran Torres"],
    "Real Madrid": ["Kylian Mbappé", "Vinícius Júnior", "Arda Güler"],
  };

  function initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function demoTeam(name, index, total) {
    const played = 6;
    const wins = Math.max(0, Math.min(played, 5 - Math.floor(index / 4)));
    const draws = index % 3 === 0 ? 1 : index % 3 === 1 ? 0 : 2;
    const losses = Math.max(0, played - wins - draws);
    const gf = Math.max(2, 17 - index);
    const ga = 3 + Math.floor(index * 0.65);
    const formPool = ["W", "W", "D", "W", "L", "W"];
    const form = Array.from({ length: played }, (_, i) => formPool[(i + index) % formPool.length]);

    return {
      rank: index + 1,
      team: {
        id: `demo-${index}-${initials(name).toLowerCase()}`,
        name,
        shortName: name,
        abbreviation: initials(name),
        logo: "",
      },
      stats: {
        played,
        wins,
        draws,
        losses,
        goalsFor: gf,
        goalsAgainst: ga,
        goalDifference: gf - ga,
        points: wins * 3 + draws,
      },
      form,
      demoScorers: (demoScorers[name] || ["Leading scorer", "Second scorer", "Third scorer"]).map((player, playerIndex) => ({
        name: player,
        goals: Math.max(1, 7 - playerIndex * 2 - Math.floor(index / 7)),
      })),
      total,
    };
  }

  function makeDemoLeague(slug) {
    const teams = leagueTeams[slug];
    const table = teams.map((name, index) => demoTeam(name, index, teams.length));
    table.sort((a, b) => b.stats.points - a.stats.points || b.stats.goalDifference - a.stats.goalDifference);
    table.forEach((row, index) => { row.rank = index + 1; });

    const matches = teams.slice(0, 10).map((home, index) => {
      const away = teams[(index + 9) % teams.length];
      const complete = index < 5;
      return {
        id: `demo-match-${slug}-${index}`,
        date: new Date(Date.now() + (index - 4) * 86400000).toISOString(),
        completed: complete,
        status: complete ? "FT" : "Scheduled",
        home: table.find((row) => row.team.name === home).team,
        away: table.find((row) => row.team.name === away).team,
        homeScore: complete ? (index + 2) % 4 : null,
        awayScore: complete ? index % 3 : null,
        details: [],
      };
    });

    return { table, matches, source: "demo" };
  }

  function makeDemoCup(slug) {
    const teams = cupTeams[slug];
    const matches = [];
    for (let index = 0; index < teams.length; index += 2) {
      matches.push({
        id: `demo-match-${slug}-${index}`,
        date: new Date(Date.now() + (index - 2) * 86400000).toISOString(),
        completed: index < 4,
        status: index < 4 ? "FT" : "Scheduled",
        home: demoTeam(teams[index], index, teams.length).team,
        away: demoTeam(teams[index + 1], index + 1, teams.length).team,
        homeScore: index < 4 ? 2 + (index % 2) : null,
        awayScore: index < 4 ? index % 2 : null,
        details: [],
      });
    }
    return { table: [], matches, source: "demo" };
  }

  const demo = {
    "eng.1": makeDemoLeague("eng.1"),
    "ger.1": makeDemoLeague("ger.1"),
    "esp.1": makeDemoLeague("esp.1"),
    "uefa.champions": makeDemoLeague("uefa.champions"),
    "eng.fa": makeDemoCup("eng.fa"),
    "eng.league_cup": makeDemoCup("eng.league_cup"),
    "ger.dfb_pokal": makeDemoCup("ger.dfb_pokal"),
  };

  window.FT_DATA = {
    competitions,
    domesticTitles,
    competitionTitles,
    demo,
  };
})();
