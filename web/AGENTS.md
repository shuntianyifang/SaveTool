# Offline SaveTool maintenance

- Edit `src/app.js`, `src/template.html`, and `src/styles.css`. `SaveTool.html` is a generated deliverable, not the source of truth.
- Before editing, run `node tests/check_player_values.cjs`. If the embedded application, styles, or template differ from source, inspect the differences and migrate any HTML-only user changes into source before rebuilding. Do not discard unexplained changes in the deliverable.
- Keep `AG_PLAYER_VALUES_KEYS`, `AG_PLAYER_VALUE_LABELS`, and the label lookup in `renderPlayerValuesForm()` in `src/app.js`. Preserve known labels, the `value[i]` fallback for unknown/unnamed indexes, and the original `data-pv` index/value association.
- After source changes, rebuild with `python tools/build_web.py`, then run `node tests/check_player_values.cjs`. Also run `python tests/run_regression.py` when its browser and save fixtures are available.
- Never modify real save fixtures during tests. Regression edits and pack/download interception must stay in memory or an isolated temporary test directory.
