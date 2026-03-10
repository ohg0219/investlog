# cleanup

1. Read `docs/.pdca-status.json` and find features where `phase` = `"archived"`
2. Based on argument:
   - No argument: Show list of archived features as text, then output usage guide: "/pdca cleanup all" or "/pdca cleanup {feature}". Do NOT use AskUserQuestion.
   - `all`: Delete all archived features from status
   - `{feature}`: Delete specific feature from status
3. Archive documents in `docs/archive/` are NOT deleted (only status is cleaned)
4. Add to history: `"cleanup"` with `deletedFeatures` list

> Action completed -> save snapshot. Procedure: see `refs/snapshot.ref.md`.
