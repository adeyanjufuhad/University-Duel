# University Duel — Competitive Practice Arena

> A fast-paced, solo and multiplayer buzzer-drill practice web application designed specifically for Nigerian university students preparing for the live television and stage quiz competition **University Duel**.

Players rehearse answering rapid-fire competition questions under extreme time pressure using browser-native voice recognition, millisecond buzzer reaction timers, real-time head-to-head duel lockouts, and AI-powered answer evaluation.

---

## Table of Contents
1. [Overview & Competition Context](#overview--competition-context)
2. [Game Modes](#game-modes)
   - [Solo Practice Drill](#1-solo-practice-drill)
   - [1v1 Local Duel (Pass & Play)](#2-1v1-local-duel-pass--play)
   - [2-Device Online Duel (Room Code Pairing)](#3-2-device-online-duel-room-code-pairing)
3. [Voice Recognition & Answer Matching Engine](#voice-recognition--answer-matching-engine)
4. [Scoring System (100 Points Max)](#scoring-system-100-points-max)
5. [Design System & Typography](#design-system--typography)
6. [Competition Question Bank](#competition-question-bank)
7. [Repository Structure](#repository-structure)
8. [Setup & Running Locally](#setup--running-locally)
9. [Connecting Across Devices on the Same Wi-Fi](#connecting-across-devices-on-the-same-wi-fi)

---

## Overview & Competition Context

**University Duel** is Nigeria's premier collegiate academic challenge. Contestants face difficult questions spanning mathematics, quantitative analysis, language reasoning, and African & world affairs. 

Success requires not just knowledge, but exceptional **buzzer speed**, **verbal clarity under pressure**, and **strategic rebound decisions**. This application provides an authentic, high-intensity training ground mimicking the exact conditions of the live competition floor.

---

## Game Modes

### 1. Solo Practice Drill
- **Configurable Constraints**: Filter by Category (*Applied Math*, *Data Analysis*, *Verbal Reasoning*, *General Knowledge*, or *All*) and Difficulty (*Easy*, *Medium*, *Hard*, or *All*).
- **Time Pressure**: Configurable question countdowns (`10s`, `15s`, `20s`, `30s`, `45s`, `60s`) with an animated, shrinking geometric timer track.
- **Voice-Driven Buzzing**: Hit `Spacebar` to buzz in, speak your answer into the microphone, or click `[ SWITCH TO KEYBOARD ]` to type.
- **Persistent High Score**: Saves your highest score in `localStorage` with an on-screen `[ RESET ]` confirmation button.
- **Contestant Memory**: Remembers your contestant name across practice sessions.

### 2. 1v1 Local Duel (Pass & Play)
- **Split Millisecond Buzzers**:
  - **Player 1**: Buzzes with key **`A`** (or left touch buzzer).
  - **Player 2**: Buzzes with key **`L`** (or right touch buzzer).
- **Instant Lockout**: The first contestant to buzz locks out the opponent down to 0.1 seconds.
- **Rebound / Steal Opportunity**: If the first player answers incorrectly, the opponent receives an immediate **Rebound Steal** prompt to buzz in and claim the points!
- **Match Analytics**: Side-by-side post-duel comparison of Total Points, Questions Correct, Buzzes Won, and Average Reaction Time.

### 3. 2-Device Online Duel (Universal HTTPS Real-Time Pairing)
- **Zero Server Setup**: Powered by client-side Server-Sent Events (SSE) cloud relay with instant local `BroadcastChannel` synchronization.
- **Works Universally on All Phones & Deployments**: Operates over standard HTTPS on port 443, eliminating Carrier-Grade NAT (CGNAT) and mobile firewall blocks that disrupt pure WebRTC. Fully functional when deployed as a static or serverless site on **Vercel**, **Netlify**, **GitHub Pages**, or local networks.
- **Host a Match**: Generates an authoritative **4-digit room code** (e.g. `9350`).
- **Join from Another Phone or Laptop**: Enter the 4-digit code from any smartphone or computer across the internet to connect live in under 2 seconds.
- **Synchronized Arena**:
  - Ultra-low latency event stream keeps contestants synchronized across cellular mobile data or Wi-Fi.
  - Simultaneous countdown and question display.
  - The first device to hit **`BUZZ IN`** wins the floor; the other device is instantly notified that they are **`LOCKED OUT`**.
  - Live speech transcription and automated answer evaluation.
  - Synchronous verdict flips and opponent rebound opportunities.
  - Host can trigger a one-click **`PLAY REMATCH`** to start another round on both devices together.

---

## Voice Recognition & Answer Matching Engine

The voice engine is built entirely on the browser-native **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) coupled with an intelligent dual-layer judging pipeline:

### 1. Dual-Locale Language Fallback
Initializes with Nigerian English (`en-NG`) to accurately capture local pronunciation and accent cadence, with seamless automatic fallback to `en-US` if the host browser does not support `en-NG`.

### 2. Conversational Filler Stripping
Contestants naturally speak conversational preambles under stress. The engine automatically strips common fillers before evaluation:
- *"The answer is thirty"* $\rightarrow$ `30`
- *"I think it is Abuja"* $\rightarrow$ `Abuja`
- *"My answer is hive"* $\rightarrow$ `hive`
- *"It should be 60 km/h"* $\rightarrow$ `60 km/h`
- *"Equals to forty two"* $\rightarrow$ `42`

### 3. Bidirectional Number & Unit Normalization
- **Compound Numbers**: Translates phrases like *"six hundred and forty thousand"* $\rightarrow$ `640,000`, *"two thousand one hundred"* $\rightarrow$ `2,100`, *"nineteen sixty"* $\rightarrow$ `1960`, and *"thirty six"* $\rightarrow$ `36`.
- **Fractions**: Converts spoken fractions like *"seven eighths"* $\rightarrow$ `7/8`, *"three quarters"* $\rightarrow$ `3/4`, *"one sixth"* $\rightarrow$ `1/6`.
- **Currencies & Units**: Normalizes *"Naira"*, *"₦"*, *"km/h"*, *"kilometers per hour"*, *"cubic centimeters"*, *"cm³"*, and percentage signs.

### 4. Claude Sonnet 4.6 + Smart Fallback
Answers are evaluated via the Anthropic Claude Sonnet 4.6 API (`claude-sonnet-4-6`) when an API key is configured. If running offline or without an API key, the built-in intelligent normalization engine (`src/utils/answerMatcher.ts`) performs robust fuzzy matching, phonetic handling, surname extraction (*"Achebe"* for *"Chinua Achebe"*), and alternate answer validation.

### 5. Snappy Silence Detection & Restart Guards
- Sets a 2.2-second silence timer once speech is detected for natural automatic submission.
- Prevents premature microphone cutoff with automatic restart recovery if the browser halts recognition unexpectedly.
- Manual **`[ STOP MIC & SUBMIT ]`** button enables instant manual submission.

---

## Scoring System (100 Points Max)

Points reward both **accuracy** and **buzzer speed**. Each question is worth a maximum of **100 points**:

$$\text{Total Points} = \text{Base Points} + \text{Speed Bonus}$$

| Difficulty | Base Points | Max Speed Bonus | Maximum Points |
| :--- | :---: | :---: | :---: |
| **Easy** | 40 pts | +60 pts | **100 pts** |
| **Medium** | 50 pts | +50 pts | **100 pts** |
| **Hard** | 60 pts | +40 pts | **100 pts** |

### Speed Bonus Calculation
$$\text{Speed Bonus} = \text{round}\left(\frac{\text{Time Remaining}}{\text{Time Limit}} \times \text{Max Bonus}\right)$$

- Fast responses (e.g. answering in 1.5s on a 15s timer) capture almost the entire speed bonus pool.
- Incorrect answers or expired timers award **0 points**.

---

## Design System & Typography

The application strictly obeys a competition-grade **grayscale token system** with hard geometric borders:

```css
--ink:     #0A0A0A; /* Dark text, dark screen background */
--paper:   #FAFAF7; /* Clean off-white background */
--surface: #1C1C1C; /* Raised dark panels */
--rule:    #3A3A3A; /* Dividers, timer progress track */
--mute:    #8F8F8F; /* Secondary text, labels */
```

### Strict Inversion Feedback
- **CORRECT Verdict**: Screen instantly inverts to `--paper` background with `--ink` typography.
- **INCORRECT Verdict**: Screen inverts to `--ink` background with `--paper` typography and a repeating diagonal hatched texture:
  ```css
  background-image: repeating-linear-gradient(45deg, #2a2a2a 0px, #2a2a2a 1px, transparent 1px, transparent 8px);
  ```
- **Geometry & Transitions**:
  - `rounded-none` (0px border radius across all cards, buttons, badges, and progress lines).
  - Instant state transitions (`transition: none !important`). No easing, no hover elevation.
- **Typography**:
  - Display, Questions & Verdicts: **`Archivo Black`** (heavy, high-impact sans-serif).
  - Data, Timer, Scores & Badges: **`Space Mono`** (monospace precision).

---

## Competition Question Bank

Contains **34 official competition questions** in [`src/data/question-bank.json`](src/data/question-bank.json) covering:
1. **Applied Math**: Percentages, fractions, mental arithmetic, simultaneous equations, quadratic roots, geometric volumes, calculus derivatives, physics kinematics & circuits, clock angles, work-rate problems, and optimization.
2. **Data Analysis**: Chart interpretation, probability, median/mode calculations, percentage increases, normal distributions ($Z$-scores), leap year probability, ratios, and uniform distributions.
3. **Verbal Reasoning**: Antonyms, analogies, spelling corrections, logical deductions, box stacking syllogisms, networking protocols (TCP vs UDP), and vocabulary definitions.
4. **General Knowledge**: Nigerian geography, constitution, historical milestones, African Union, Pan-African philosophy (Consciencism), UNESCO African heritage foods, world geography, Nobel laureates, and computer science pioneers.

*Questions with multiple-choice options display interactive option reference badges during buzzing, and reveal comprehensive tournament explanations on the verdict screen.*

---

## Repository Structure

```
├── .gitignore                          # Git ignore configuration
├── index.html                          # Entry HTML loading Archivo Black & Space Mono
├── package.json                        # Dependencies & scripts
├── tailwind.config.js                  # Tailwind configuration with grayscale tokens
├── tsconfig.json                       # TypeScript compiler options
├── vite.config.ts                      # Vite dev server + SSE multiplayer & Claude proxy
├── src/
│   ├── App.tsx                         # Root controller & screen router
│   ├── main.tsx                        # React application bootstrap
│   ├── index.css                       # Global styles & hatched pattern utility
│   ├── types.ts                        # TypeScript interfaces & screen state models
│   ├── components/
│   │   ├── SetupScreen.tsx             # Home screen (Solo vs Duel setup, time, high score)
│   │   ├── IntroModal.tsx              # Contestant orientation & name memory modal
│   │   ├── BuzzerScreen.tsx            # Solo practice buzzer screen with Web Speech
│   │   ├── VerdictScreen.tsx           # Solo verdict screen with inversion feedback
│   │   ├── SummaryScreen.tsx           # Solo performance report & category breakdown
│   │   ├── DuelBuzzerScreen.tsx        # 1v1 local split buzzer screen (Keys A & L)
│   │   ├── DuelVerdictScreen.tsx       # 1v1 local verdict & rebound steal screen
│   │   ├── DuelSummaryScreen.tsx       # 1v1 local match winner proclamation & analytics
│   │   ├── NetworkDuelLobby.tsx        # 2-device room code pairing lobby
│   │   ├── NetworkDuelBuzzerScreen.tsx # 2-device synchronized real-time buzzer screen
│   │   ├── NetworkDuelVerdictScreen.tsx# 2-device synchronized verdict & rebound screen
│   │   └── NetworkDuelSummaryScreen.tsx# 2-device match champion & rematch screen
│   ├── data/
│   │   ├── question-bank.json          # 80 official competition questions
│   │   └── questions.ts                # Question bank utilities, filters, and shuffle
│   ├── services/
│   │   ├── speechRecognition.ts        # Web Speech API continuous listening & silence handler
│   │   ├── claudeJudge.ts              # Claude Sonnet 4.6 answer evaluation
│   │   └── networkDuel.ts              # Real-time room creation, SSE subscriber, and actions
│   └── utils/
│       ├── answerMatcher.ts            # Advanced speech filler removal & number parser
│       ├── playerMemory.ts             # Contestant name persistence in localStorage
│       └── scoring.ts                  # 100 max points calculation & high score storage
```

---

## Setup & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm or yarn

### 1. Clone & Install
```bash
git clone <repository-url>
cd Udeuls
npm install
```

### 2. Optional: Set Claude API Key
If you want to use the live Claude Sonnet 4.6 evaluation model, set your API key in your environment or a `.env` file:
```bash
# In Windows PowerShell:
$env:ANTHROPIC_API_KEY="your-anthropic-api-key"

# In Bash / macOS / Linux:
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```
*(Note: If no API key is provided, the app will automatically use the built-in intelligent normalization engine.)*

### 3. Start Development Server
```bash
npm run dev -- --host 0.0.0.0 --port 5174
```
Open your browser at `http://localhost:5174/`.

### 4. Build for Production
```bash
npm run build
```

---

## Connecting Across Devices on the Same Wi-Fi

To challenge a friend from another phone or laptop:
1. Ensure both devices are connected to the **same Wi-Fi network**.
2. Note your computer's local IP address (printed in your terminal when running Vite with `--host`, e.g. `http://192.168.x.x:5174`).
3. On **Device 1 (Host)**:
   - Click **`DUEL MODE (1v1)`** $\rightarrow$ **`2 DEVICES (ROOM CODE)`** $\rightarrow$ **`CREATE DUEL ROOM`**.
   - Note the **4-digit room code** (e.g. `4821`).
4. On **Device 2 (Challenger)**:
   - Open your phone's browser and go to `http://<your-computer-ip>:5174`.
   - Click **`DUEL MODE (1v1)`** $\rightarrow$ **`JOIN WITH CODE`**.
   - Enter your name and the 4-digit code, then tap **`CONNECT TO DUEL`**.
5. Once connected, the host taps **`START DUEL MATCH`** to begin the live duel!

---

## License
MIT License. Built for collegiate academic competition excellence.
