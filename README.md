# PitchStats

PitchStats is a responsive Premier League player comparison dashboard built with React. The app lets users search for current Premier League players, compare head-to-head performance metrics, and view a season-style performance timeline through interactive charts.

The project was created for a DV200 football analytics dashboard brief and is structured as a portfolio-ready frontend application.

## Live Demo

Add your deployed Vercel URL here:

```text
https://dv200-football-dashboard.vercel.app/
```

## Features

- Search Premier League players using the API-SPORTS Football API.
- Select two players and compare their core season statistics.
- View radar, bar, pie, and line charts powered by Chart.js.
- Compare goals, assists, shots, shot accuracy, tackles, dribbles, passes, and derived percentages.
- Explore a simulated season timeline for selected player metrics.
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

```text
https://v3.football.api-sports.io/players
```

The current search is configured for:

```text
League: Premier League
League ID: 39
Season: 2024
```

## Current Limitations

- Timeline data is generated from season totals rather than fetched as real match-by-match history.
- The app depends on a valid API key for player search results.
- Direct visits to comparison pages show guard screens because selected players are stored in router state.

## Future Improvements

- Persist selected players in local storage or URL parameters.
- Add real fixture-by-fixture player performance data.
- Add loading, empty, and API error states for stronger production behavior.
- Add player profile pages with deeper statistics.
- Add shareable comparison URLs.
- Add automated tests for route guards and player selection.

## Author

Gedeon Kazadi

## License

This project is for academic and portfolio use.
