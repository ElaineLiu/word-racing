# UX Optimization Epic Design

## Epic Goal

Upgrade Word Racing from a functional prototype UI into a polished vocabulary racing game experience for middle-school learners.

This Epic focuses on product-wide UX direction before coding. It defines the new theme system, page information architecture, English-only copy strategy, and page-by-page redesign specs. Implementation should start only after this design is reviewed and approved.

## Current UX Audit Findings

### Product-wide issues

- The current visual system is dominated by black and dark gray, which feels closer to an engineering prototype than a friendly student game.
- The UI mixes Chinese and English in navigation, buttons, reports, shop messages, achievements, and track descriptions.
- Page elements use inconsistent card, button, panel, table, and modal styles.
- Important actions compete with secondary data; several pages do not make the next step obvious.
- Game rewards, learning progress, race resources, currency, achievements, and leaderboard data are scattered without a clear hierarchy.
- Some styles are inline in JavaScript-generated HTML, making the interface harder to redesign consistently.

### Home

Current files:

- `index.html`
- `views/home-view.js`
- `ui/learning-ui.js`

Main issues:

- Home combines learning progress, race resources, currency, leaderboard, lap selector, learning panel, achievement, settings, and quiz start in one vertical stack.
- Some learning progress is duplicated between the Learning panel and Home progress card.
- Resource data such as fuel, nitro, fuel coins, and gear coins is useful, but it should not dominate the first screen.
- Mixed-language copy appears in labels, settings, tooltips, alerts, and progress values.
- The primary action is unclear: Home currently says `START QUIZ`, while the product promise is vocabulary learning plus racing.

### Quiz

Current files:

- `index.html`
- `views/quiz-view.js`

Main issues:

- Basic / Advanced mode is clear, but the quiz area lacks a stronger learning-game frame.
- Navigation buttons and recovery actions include Chinese copy.
- The learning panel can become visually disconnected from the question area.
- Completion actions are useful but presented as a flat button group without priority.
- Feedback states should feel encouraging, not exam-like.

### Shop / Garage

Current files:

- `index.html`
- `views/shop-view.js`
- `config/game-config.js`
- `config/track-registry.js`

Main issues:

- The shop currently mixes consumables, upgrades, tracks, unlock rules, and resource balances in a dense layout.
- Track unlock explanations and progress details use Chinese and inline styling.
- Track names and descriptions are Chinese in config.
- The mental model should be closer to `Garage + Track Unlocks`, not only a traditional shop.
- The tire,body, engine upgrades was designed in outdated versions, should remove them.

### Race and 3D HUD

Current files:

- `views/race-view.js`
- `rendering/render-system.js`
- `ui/hud-3d/*.js`
- `css/hud-3d.css`

Main issues:

- Race UI should feel energetic and focused, but information overlays need stricter prioritization.
- 3D HUD has separate HTML overlay styles and some inline positioning.
- The HUD should avoid repeated rank/time/score blocks and separate quick-glance race data from secondary controls.
- `css/hud-3d.css` should be intentionally loaded or consolidated so HUD styling is not accidental.

### Report

Current files:

- `index.html`
- `views/report-view.js`

Main issues:

- Report page is heavily Chinese.
- Tables provide useful data but are dense for middle-school users.
- The page should first answer: “How am I doing today?”, “What should I practice next?”, and “What have I mastered?”
- Wrong words and word detail tables should be secondary, scannable sections.

### Achievements

Current files:

- `index.html`
- `ui/achievement-panel.js`
- `ui/achievement-toast.js`
- `config/achievements.js`

Main issues:

- Achievement names and descriptions are Chinese.
- Achievement UI should act as motivation, not just a modal list.
- Unlock rewards should clearly explain how learning progress unlocks race content.

## Design Principles

1. **English-only interface**
   - All user-visible UI copy should be English.
   - Chinese may remain only in code comments or internal documentation, not in the product UI.

2. **Learning first, racing reward loop second**
   - Home and Quiz should guide users through daily learning.
   - Race resources and garage upgrades should feel like rewards earned through vocabulary practice.

3. **One primary action per screen**
   - Home: continue or start daily practice.
   - Quiz: answer the current question.
   - Shop / Garage: select one upgrade or track.
   - Race: drive.
   - Report: understand progress and next focus.

4. **Friendly for middle-school learners**
   - Use brighter surfaces, rounded cards, encouraging microcopy, and clear progress states.
   - Avoid heavy all-black screens outside race mode.

5. **Different moods for learning and racing**
   - Learning pages should be bright, calm, and rewarding.
   - Racing pages should be high-energy, high-contrast, and HUD-like.

6. **Consistent component language**
   - Reuse shared styles for cards, buttons, badges, progress bars, resource chips, tables, modals, and empty states.

## Theme Direction

### Global product style

The visual identity should be “bright learning dashboard meets racing game energy.”

Recommended base tokens:

- Typography: keep system UI stack; remove Chinese font preference from product-facing visual intent.
- Shape: large rounded cards, pill badges, soft panels.
- Motion: subtle transitions for cards, button press states, progress updates, and achievement toasts.
- Icons: use sparingly and consistently; avoid turning every label into an emoji row.

### Learning theme

Use on Home, Quiz, Report, and most Achievement surfaces.

Suggested palette:

- Page background: soft sky gradient `#EAF7FF` → `#F8FBFF`
- Primary: race blue `#2563EB`
- Secondary: mint `#10B981`
- Accent: warm yellow `#FBBF24`
- Friendly danger: coral `#F97373`
- Text primary: slate `#1E293B`
- Text muted: `#64748B`
- Card surface: white / translucent white
- Border: pale blue-gray `#D8E6F3`

UX feeling:

- Optimistic, school-friendly, low-pressure.
- Similar to a learning app dashboard with racing rewards.

### Racing theme

Use on Race page, 2D/3D HUD, speedometer, nitro, minimap, race results.

Suggested palette:

- Race background: midnight blue `#07111F`
- HUD panel: translucent navy `rgba(8, 20, 38, 0.72)`
- Primary HUD text: white `#F8FAFC`
- Telemetry cyan: `#22D3EE`
- Nitro orange: `#F97316`
- Warning red: `#EF4444`
- Success green: `#22C55E`
- Finish gold: `#FACC15`

UX feeling:

- Energetic and readable without returning to a flat black/gray prototype look.
- HUD should feel like glass telemetry over the race scene.

## Information Architecture

### New Home hierarchy

Recommended Home sections, in order:

1. **Hero / Daily Mission**
   - Title: `Word Racing`
   - Subtitle: `Practice vocabulary. Earn fuel. Win races.`
   - Primary CTA: `Start Today's Practice` or `Continue Practice`
   - Secondary CTA: `Start Race` only when the player has enough fuel.

2. **Daily Practice Card**
   - 3 quiz progress dots.
   - Today’s goals:
     - `Complete 3 quizzes`
     - `Reach 80% accuracy`
     - `Learn 10 new words`
   - Show current streak if available.

3. **Race Readiness Card**
   - Fuel, Nitro, selected track, and lap count.
   - Link/CTA: `Go to Garage` or `Choose Track`.

4. **Progress Snapshot**
   - Words learning.
   - Words mastered.
   - Today’s coins earned.
   - CTA: `View Progress Report`.

5. **Secondary Cards**
   - Fastest laps.
   - Achievements.
   - Settings as a small utility, not a main content block.

Remove or de-emphasize from Home:

- Large separate currency block.
- Repeated progress values already shown in the Learning panel.
- Dense leaderboard above the primary practice action.

## Page Redesign Specs

## Home

### Goal

Make the next action obvious and make learning progress feel rewarding.

### Layout

```text
[Top Nav]

[Hero: Word Racing]
Practice vocabulary. Earn fuel. Win races.
[Start Today's Practice] [Start Race]

[Daily Practice]        [Race Readiness]
3 quiz dots             Fuel / Nitro / Track / Laps
Goals + streak          Garage CTA

[Progress Snapshot]     [Fastest Laps]
Words Learning          Best times
Words Mastered          compact list
Today’s Rewards
```

### Key copy

- `Start Today's Practice`
- `Continue Practice`
- `Start Race`
- `Daily Practice`
- `Race Readiness`
- `Progress Snapshot`
- `Fastest Laps`
- `No race records yet`
- `Reset Daily Practice Limit`

## Quiz

### Goal

Make answering feel focused, supportive, and game-like.

### Layout

```text
[Mode tabs: Basic | Advanced]

[Progress pill: Quiz 1 • Question 3/10 • Correct 2]
[Question Card]
Word / sentence / prompt

[Answer Options]
2x2 grid or stacked cards

[Help action]
[I’m not sure]

[Learning Panel appears beside or below question]
Meaning, phonetic, sentence, explanation
[Got it. Continue]
```

### Key copy

- `Basic`
- `Advanced`
- `I’m not sure`
- `Got it. Continue`
- `Previous`
- `Next`
- `Correct answers earn fuel or gear coins.`
- `Pit Stop Complete!`
- `Try Again`
- `Start Race`
- `Go to Garage`
- `Achievements`

### Behavior notes

- Keep the existing learning logic and session flow.
- Redesign should only reorganize presentation and copy.
- Feedback should use encouraging states: `Nice!`, `Almost there`, `Review this word`.

## Shop / Garage

### Goal

Turn the shop into a clear Garage experience: resources, upgrades, and track unlocks.

### Layout

```text
[Garage Header]
Fuel Coins | Gear Coins | Fuel | Nitro

[Tabs: Supplies | Upgrades | Tracks]

Supplies:
[Fuel +20] [Fuel +50] [Nitro x1] [Nitro x3]

Upgrades:
[Engine] [Tires] [Body]

Tracks:
[Track Card]
Name, type, cost, unlock progress, selected state
```

### Key copy

- `Garage`
- `Supplies`
- `Upgrades`
- `Tracks`
- `Buy`
- `Selected`
- `Select`
- `Locked`
- `Not enough fuel coins`
- `Unlock by mastering more words`
- `Learn {n} more words`
- `Complete {n} more quizzes`
- `Master {n} more words`

### Track name recommendations

- `Shanghai International Circuit`
- `Monte Carlo Street Circuit`
- `Silverstone Circuit`
- `Shanghai International Circuit 3D`

## Race Select / Race Active

### Goal

Keep race setup simple before the race and keep the active race screen distraction-free.

### Race setup content

- Selected track.
- Lap count.
- Fuel cost.
- Available nitro.
- Primary CTA: `Start Race`.
- Secondary CTA: `Practice First` if fuel is not enough.

### Active race HUD

3D HUD layout recommendation:

```text
Top center: Position • Lap • Time
Top right: Best Lap / Race objective
Bottom left: Speed / Gear / RPM
Bottom right: Minimap
Right side: Nitro
Bottom center or lower left: Controls hint, minimized after race starts
```

### Key copy

- `Position`
- `Lap`
- `Time`
- `Best Lap`
- `Speed`
- `Gear`
- `Nitro`
- `[R] Reset`
- `[C] Camera`
- `[Tab] Pause`
- `Race Complete`
- `Race Time`
- `Fuel Left`

## Report

### Goal

Make progress understandable before exposing detailed data.

### Layout

```text
[Progress Report]
Today’s Summary cards:
Quizzes, Accuracy, New Words, Streak

[Mastery Overview]
Progress bar + mastered / learning counts

[Recommended Practice]
Wrong words and review suggestions

[Details]
Wrong Words table
Word Details table
```

### Key copy

- `Progress Report`
- `Today’s Summary`
- `All-Time Progress`
- `Mastery Overview`
- `Recommended Practice`
- `Words to Review`
- `Word Details`
- `No words to review yet. Great job!`
- `Showing first 20 of {count}`

## Achievements

### Goal

Use achievements to connect learning progress with race unlocks.

### Layout

- Modal title: `Achievements`
- Achievement card:
  - name,
  - description,
  - progress or unlocked state,
  - reward.
- Toast:
  - `Achievement unlocked!`
  - Reward summary.

### Recommended achievement copy

- `First Pit Stop` — `Complete your first quiz.`
- `Quiz Streak 10` — `Complete 10 quizzes.`
- `Word Collector` — `Master 50 words.`
- `Word Master` — `Master 100 words.`
- `Perfect Run` — `Answer all 10 questions correctly in one quiz.`

## English Copy Inventory

High-priority sources to convert:

- `index.html`
  - Achievement titles and tooltips.
  - Home progress labels.
  - Resource labels.
  - Quiz navigation and learning buttons.
  - Report headings and hints.
  - Achievement modal title.

- `views/home-view.js`
  - Daily reset confirm/alert copy.
  - Progress values with Chinese units.

- `views/quiz-view.js`
  - Any prompt, fallback, or navigation copy still in Chinese.

- `views/shop-view.js`
  - Track unlock overview.
  - Remaining requirement messages.
  - Locked/selected/insufficient-funds button states.
  - Alert messages.

- `views/report-view.js`
  - Status labels.
  - Stat labels.
  - Empty states.
  - Table headers.
  - More hints.

- `config/track-registry.js`
  - Track names and descriptions.

- `config/achievements.js`
  - Achievement names and descriptions.

Suggested copy replacements:

| Current meaning | Recommended English |
| --- | --- |
| 学习进度 | Learning Progress |
| 今日答题 | Today’s Quizzes |
| 已掌握 | Mastered |
| 连续学习 | Streak |
| 比赛资源 | Race Resources |
| 燃油 | Fuel |
| 氮气 | Nitro |
| 货币 | Wallet |
| 燃油币 | Fuel Coins |
| 齿轮币 / 装备币 | Gear Coins |
| 上一题 | Previous |
| 下一题 | Next |
| 我不认识 | I’m not sure |
| 我记住了，继续 | Got it. Continue |
| 成就 | Achievements |
| 学习进度报告 | Progress Report |
| 累计统计 | All-Time Progress |
| 今日进度 | Today’s Summary |
| 错词列表 | Words to Review |
| 单词详情 | Word Details |

## CSS and Component Strategy

### Keep the current technology choices

- No new framework.
- Keep ES6 Modules.
- Keep Canvas rendering for race.
- Keep `localStorage` persistence.

### CSS restructuring direction

Use `css/style.css` as the shared design system entry.

Recommended sections:

1. `Design Tokens`
   - semantic colors,
   - learning theme tokens,
   - racing theme tokens,
   - typography,
   - spacing,
   - radius,
   - shadows,
   - z-index.

2. `Base Layout`
   - body,
   - pages,
   - top navigation,
   - responsive containers.

3. `Shared Components`
   - `.app-card`
   - `.primary-btn`
   - `.secondary-btn`
   - `.ghost-btn`
   - `.stat-card`
   - `.resource-chip`
   - `.progress-bar`
   - `.status-badge`
   - `.empty-state`
   - `.data-table`
   - `.modal`

4. `Page Sections`
   - Home.
   - Quiz.
   - Garage.
   - Race.
   - Report.
   - Achievements.

5. `Responsive Rules`
   - desktop layout,
   - tablet layout,
   - narrow/mobile layout.

### HUD CSS direction

- Either load `css/hud-3d.css` explicitly in `index.html` or move its rules into the main stylesheet under a `Race HUD` section.
- Minimize inline CSS in HUD components and generated shop track cards.
- Use race theme tokens for HUD panels and telemetry text.

## Implementation Plan After Design Approval

### Phase 1: English-only copy cleanup

- Add or update tests that assert key user-facing copy is English.
- Update static copy in `index.html`.
- Update dynamic copy in views and configs.
- Verify no major Chinese UI copy remains.

### Phase 2: Shared theme tokens and components

- Replace dark F1-only global theme with learning/racing theme tokens.
- Add shared card, button, badge, progress, modal, and table classes.
- Avoid changing business logic.

### Phase 3: Home redesign

- Reorganize Home into Hero, Daily Practice, Race Readiness, Progress Snapshot, and Secondary Cards.
- Remove duplicate progress/resource emphasis.
- Keep existing LearningUI data flow.

### Phase 4: Quiz, Garage, and Report redesign

- Quiz: improve question card, answer options, learning panel, completion actions.
- Garage: separate supplies/upgrades/tracks and remove inline styling.
- Report: summary-first layout with details below.

### Phase 5: Race and 3D HUD cleanup

- Apply racing theme to active race surfaces.
- Ensure HUD information is not duplicated.
- Improve readability of speed, rank/time/lap, minimap, nitro, and control hints.

### Phase 6: Validation and manual UX QA

- Run `npx vitest run`.
- Start dev server with `npx http-server . -p 3000`.
- Manually test Home, Quiz, Shop/Garage, Race, 3D Race, Report, and Achievements.
- Stop before commit/PR/merge until user manual validation is complete and explicitly confirmed.

## Testing Strategy for Coding Phase

Follow Red-Green-Refactor for implementation.

Recommended tests:

- Home renders the new primary action copy.
- Home does not show duplicate primary learning stats.
- Quiz navigation and help actions use English copy.
- Shop/Garage track states use English copy.
- Report status labels and table headers use English copy.
- Achievements use English names and descriptions.
- 3D HUD still renders minimap, speedometer, nitro, and controls after visual cleanup.
- Existing integration tests continue to pass.

## Open Decisions for Review

1. Should the main navigation label be `Shop` or `Garage`?
   - Recommendation: use `Garage`, because it better matches racing upgrades and track selection.
   - review comment: yes, use Garage.

2. Should Home show `Start Race` when fuel is insufficient?
   - Recommendation: show it disabled with helper text, and make `Start Today's Practice` primary.
   - review comment: yes, show it disabled with helper text, and make `Start Today's Practice` primary.

3. Should track names be fully English or include real-world Chinese location names?
   - Recommendation: fully English UI names, e.g. `Shanghai International Circuit`, without Chinese characters.
   - review comment: yes, use fully English UI names, e.g. `Shanghai International Circuit`, without Chinese characters.

4. Should the design keep emoji icons?
   - Recommendation: keep a small number for motivation, but do not rely on emoji as the main visual system.
   - review comment: yes, keep a small number for motivation, but do not rely on emoji as the main visual system.

## Definition of Done for This Epic

The UX optimization Epic is complete when:

- All core UI copy is English.
- Home has a clear primary learning action and reduced duplication.
- Learning pages use the brighter learning theme.
- Race and HUD pages use the dedicated racing theme.
- Shared component styles replace scattered one-off styling where practical.
- Automated tests pass.
- User completes manual UX validation.
- Only after explicit user confirmation, changes are committed, PR is created, and merged.
