# Shanghai 2D track redesign checklist

- [x] Read `ISSUE_LOG.md`, including track regressions #013 and #014.
- [x] Read the completed track-v2 design and current track implementation.
- [x] Isolate work from the existing Mini Reading working tree.
- [x] Preserve both legacy Shanghai 2D waypoint sources.
- [x] Add geometry and integration tests for runtime references.
- [x] Keep `shanghai-3d` geometry unchanged.
- [x] Verify start position, direction, progress, collision and bounds.
- [x] Measure generated point count and construction/query performance.
- [x] Run targeted tests, full Vitest and build.
- [x] Run `git diff --check` after final documentation updates.
- [x] Complete a local 2D render smoke test and request user visual validation.
