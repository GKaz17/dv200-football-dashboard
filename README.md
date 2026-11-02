# PitchStats

PitchStats is a responsive Premier League player comparison dashboard built with React. Each player has an independent season selection, including same-player cross-season comparisons. Charts compare recorded season totals, with optional recorded matchweek overlays and a separate, clearly labelled simulated timeline.

The project was created for a DV200 football analytics dashboard brief and is structured as a portfolio-ready frontend application.

## Live Demo

```text
https://dv200-football-dashboard.vercel.app/
```

## Features

- Search Premier League players using the API-SPORTS Football API.
- Select two players and compare their core season statistics.
- Compare different player-seasons, or the same player in two seasons, with season-specific labels throughout.
- Discover Premier League coverage from 2016/17 onward, filtered by explicit API plan restrictions. The newest covered season is offered when accessible.
- View radar, bar, pie, and line charts powered by Chart.js.
- Compare goals, assists, shots, shot accuracy, tackles, dribbles, passes, and derived percentages.
- Explore a simulated season timeline with stable, player-specific points, not recorded match history.
- Load real matchweek overlays on demand, with missing/unplayed weeks left as gaps and successful API responses cached to reduce quota use.
- Keep the selected pair while navigating between Home, Compare, and Stats.
- See loading, no-results, API-error, timeout, and retry states during player searches.
- Distinguish unavailable statistics (N/A) from recorded zero values, with explanations of chart scales.
- Responsive layout with mobile-first improvements and a hamburger navigation menu.
- Guard screens for direct visits to comparison routes without selected players.

## Tech Stack

- React
- React Router
- Chart.js
- React Chart.js 2
- React Icons
- CSS
- API-SPORTS Football API
- Vercel

## Project Structure

```text
src/
  components/
    Footer.jsx
    Navbar.jsx
    PlayerCard.jsx
  pages/
    LandingPage.js
    ComparePage.js
    TimelinePage.js
  App.js
  App.css
  index.css
  playerData.js
  playerSearch.js
  matchHistory.js

public/
  Logo_PitchStats.png
  index.html
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/GKaz17/dv200-football-dashboard.git
cd dv200-football-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add environment variables

Create a `.env.local` file in the project root:

```env
REACT_APP_API_SPORTS_KEY=your_api_sports_key_here
```

You can use `.env.example` as a template.

### 4. Run the development server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm start
```

Runs the app locally in development mode.

```bash
npm run build
```

Creates an optimized production build in the `build/` folder.

```bash
npm test
```

Starts the test runner in watch mode.

```bash
npm test -- --watchAll=false --runInBand
```

Runs the regression suite once, covering season access, searches, navigation, missing statistics, transfers, and both timeline sources.

## Vercel Deployment

This project can be deployed through Vercel's GitHub integration.

Recommended Vercel settings:

```text
Framework Preset: Create React App
Build Command: npm run build
Output Directory: build
Install Command: npm install
Production Branch: master
```

Add this environment variable in Vercel Project Settings:

```text
REACT_APP_API_SPORTS_KEY
```

### Important deployment note

Vercel deploys the latest pushed commit from the connected GitHub branch. If the deployed site still shows an old version, check that:

- The changes are committed locally.
- The commit has been pushed to GitHub.
- Vercel is connected to the correct repository.
- Vercel's production branch matches the branch you pushed to, which is currently `master` for this repo.
- The environment variable exists in Vercel, not only in `.env.local`.

After pushing, Vercel should automatically create a new deployment. If it does not, trigger a redeploy from the Vercel dashboard.

## Data Source

Player data is fetched from the API-SPORTS Football API:

[API-FOOTBALL documentation](https://www.api-football.com/documentation_v3)

```text
https://v3.football.api-sports.io/players
```

The search is configured for:

```text
League: Premier League
League ID: 39
Season floor: 2016 (2016/17)
Newest season: latest covered start year, no later than the current year
Fallback while season discovery is unavailable: 2024 (2024/25)
```
Season discovery first checks access for the current start year. Explicit provider plan bounds can supply the year choices without waiting for a separate coverage lookup; player coverage is then verified by each search. Otherwise `/leagues?id=39` supplies covered years from 2016 onward. Seasons are four-digit start years. Coverage does not guarantee plan access or complete statistics. On 2 November 2026, the configured key rejected 2016 and 2026 and explicitly allowed 2022–2024. No subscription was changed.

Recorded overlays fetch completed league fixtures for each selected player-season's clubs, then request details in batches of at most 20 IDs. The current free key rejects the `ids` parameter but permits the single-fixture `id` endpoint; the loader detects that restriction and switches to cached individual requests. The default window is matchweeks 1–6, adjustable up to 38. The chart uses per-matchweek counts, not cumulative totals. Loads estimated above 20 requests require an explicit quota-approval checkbox. A load shows its worst-case request estimate; other plan or quota errors stop loading without inventing data. Successful searches are cached for five minutes and fixture/season coverage responses for one hour. Missing count fields remain N/A, including when aggregating a transferred player's club records.

## Current Limitations

- The simulated source is a deterministic illustration, not real month-by-month history. Only the recorded matchweek source uses actual fixture data, where the API covers it and the plan permits it.
- 2016/17 and 2026/27 are not promised for a restricted key. In-progress seasons have fewer completed matches, and raw totals are not adjusted per appearance or per 90 minutes.
- The app depends on a valid API key for player search results.
- Selected players live in shared React state. In-app navigation retains them; a full reload or new browser session requires a new selection.
- A frontend environment variable is included in the browser bundle, not a secret. A backend proxy would be required to keep the provider key server-side.
- Radar axes are relative to the selected pair, not league rankings. Missing values are omitted, not inferred as zero.

## Future Improvements

- Persist selected players in local storage or URL parameters.
- Add per-90 and per-appearance comparison modes.
- Move provider requests behind a backend proxy with appropriate rate limits.
- Add player profile pages with deeper statistics.
- Add shareable comparison URLs.
- Extend the regression suite with production deployment checks.

## Author

Gedeon Kazadi

## License

This project is for academic and portfolio use.
