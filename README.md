# UCB App

This is a React Native app built with Expo for the University of California, Berkeley community. It provides features such as course information, news, guides, maps, and more, all in one place.

## Features
- View and search courses
- Access campus news
- Interactive campus map
- Guides and FAQs
- User profile and settings
- Timetable and events

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (iOS/Android)

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/Stochastic96/ucb-app.git
   cd ucb-app
   ```
2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```
3. Start the development server:
   ```
   npx expo start
   ```
4. Scan the QR code with Expo Go on your phone to run the app.

## Project Structure
- `App.js` — Main entry point
- `components/` — Reusable UI components
- `constants/` — App-wide constants
- `data/` — Static data files
- `navigation/` — Navigation stacks and tabs
- `screens/` — App screens (courses, guide, home, map, news, profile, timetable)
- `services/` — API and data services
- `store/` — State management
- `utils/` — Utility functions

## AI Usage Tracking
To keep track of which AI (Copilot, Claude, Codex, etc.) contributed to which part of the code, use the `AI_TRACKING.md` file in the root directory. Whenever an AI helps with a feature, document it there with the following format:

```
# AI Usage Log

## [Date]
- [Feature/Component/Service]: [AI Name] — [Short description of the contribution]
```

Example:
```
## 2026-04-28
- CourseCard.js: GitHub Copilot — Refactored card layout and props
- api.js: Claude — Helped with API error handling logic
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
