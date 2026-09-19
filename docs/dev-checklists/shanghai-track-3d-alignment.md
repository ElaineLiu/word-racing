# Shanghai 3D track alignment checklist

- [x] Read ISSUE_LOG entries #013-#015 and the 3D track geometry/physics designs.
- [x] Create an isolated branch from the latest `origin/main`.
- [x] Record the focused 3D test baseline (45 passing).
- [x] Archive the legacy 20-point Shanghai 3D route.
- [x] Share the accepted Shanghai route and interpolation between 2D, 3D rendering, collision and AI.
- [x] Replace per-sample standalone barrier blocks with continuous instanced edge segments.
- [x] Keep the start/finish clear zone free of barriers and kerbs.
- [x] Replace 180-degree rebound with inward correction and tangential sliding.
- [x] Test collision clearance, tangential sliding, steering retention and no reversal.
- [x] Verify Monaco/Silverstone 3D and every 2D track remain unchanged via the full suite.
- [x] Limit guardrails to two instanced draw-call batches (one per side).
- [x] Run full Vitest (811 passing), build and `git diff --check`.
- [ ] Complete local browser driving and request user manual validation before pushing.
