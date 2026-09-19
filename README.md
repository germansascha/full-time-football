# Full Time

A responsive football dashboard for:

- Premier League
- Bundesliga
- La Liga
- UEFA Champions League
- FA Cup
- Carabao Cup
- DFB-Pokal

It shows live standings, the usual P/W/D/L/GF/GA/GD/Pts statistics, last-five or full-season form, fixtures and results. Selecting a club opens its domestic title record, its record in the selected competition and its three leading scorers for the current season.

## Live data

The site reads ESPN's public football feeds directly in the visitor's browser. No API key, server or database is required. If the feed is temporarily unavailable, the interface remains usable with clearly labelled sample data.

Historic title counts are curated locally through the end of the 2025/26 season. Current-season scorer totals are calculated from match goal events, with ESPN's season-leaders feed as a fallback.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Add this project's files and push them to the `main` branch.
3. Open **Settings → Pages** and choose **Deploy from a branch** as the source.
4. Select the **main** branch and **/(root)** folder, then click **Save**.

GitHub Pages publishes updates automatically when changes are pushed to `main`. No custom deployment workflow is needed.

The site will then be available at `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

## Run locally

Serve the repository root with any static web server. For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Project structure

```text
  index.html   Page structure
  styles.css   Responsive visual system
  data.js      Competitions, fallback data and historic titles
  api.js       ESPN data adapter and form/scorer calculations
  app.js       Rendering and interactions
```

This is an independent, unofficial project and is not affiliated with ESPN, the leagues, competitions or clubs shown.
