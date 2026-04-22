# Off-PC Learning System

## Core guarantee

This learning system is designed to run only on GitHub-hosted runners.

- It does not train in the browser.
- It does not add local watchers, local workers, editor tasks, or background jobs.
- It does not use self-hosted runners.
- It does not rely on your PC after the project is uploaded.
- The live app only reads static learned output files.

All remote scripts in `scripts/offpc_training/` are guarded and refuse execution unless:

- `GITHUB_ACTIONS=true`
- `RUNNER_ENVIRONMENT` is not self-hosted

## Source classes

The expanded pipeline can learn from:

- internal meta pool
- random pool
- self-play pool
- archived teams
- Pikalytics-derived snapshots and curated imports
- Reddit raw snapshots and curated imports
- YouTube raw snapshots and curated imports

For Reddit and YouTube, the system is intentionally honest:

- partial teams are preserved as partial teams
- missing fields are not hallucinated
- confidence and completeness are recorded explicitly
- low-confidence teams remain useful for exploratory robustness, but are not treated like top-confidence meta inputs

## Data layout

Raw source snapshots:

- `data/raw/pikalytics_snapshot.json`
- `data/raw/reddit_threads.json`
- `data/raw/youtube_sources.json`

Curated imports:

- `data/curated/pikalytics_imports.json`
- `data/curated/reddit_imports.json`
- `data/curated/youtube_imports.json`

Normalized internal pools:

- `data/normalized/meta_pool.json`
- `data/normalized/random_pool.json`
- `data/normalized/self_play_pool.json`
- `data/normalized/pikalytics_pool.json`
- `data/normalized/reddit_pool.json`
- `data/normalized/youtube_pool.json`
- `data/normalized/source_meta_snapshot.json`
- `data/normalized/combined_training_pool.json`

Learned outputs:

- `data/learned_weights.json`
- `data/species_role_priors.json`
- `data/move_choice_weights.json`
- `data/threat_penalties.json`
- `data/team_archive.json`

Logs and reports:

- `data/battle_logs/*.jsonl`
- `reports/training_summary.md`

## Normalized team schema

Every normalized team record follows one common shape:

- `id`
- `sourceType`
- `sourceName`
- `sourceUrl`
- `archetype`
- `team`
- `confidence`
- `completeness`
- `tags`
- `importStrategy`
- `notes`

Each `team` slot can include:

- `name`
- `item`
- `ability`
- `moves`
- `nature`
- `spreads`

## Remote-only scripts

Remote ingestion and normalization:

- `scripts/offpc_training/normalize_sources.py`
- `scripts/offpc_training/ingest_pikalytics.py`
- `scripts/offpc_training/ingest_reddit.py`
- `scripts/offpc_training/ingest_youtube.py`

Remote learning and validation:

- `scripts/offpc_training/train.py`
- `scripts/offpc_training/validate_learned_data.py`

These scripts are intended for GitHub Actions only.

## GitHub workflows

Nightly or manual training:

- `.github/workflows/offpc-nightly-training.yml`

Manual lightweight evaluation:

- `.github/workflows/offpc-manual-eval.yml`

Manual validation:

- `.github/workflows/offpc-validation.yml`

Source refresh:

- `.github/workflows/offpc-pikalytics-refresh.yml`
- `.github/workflows/offpc-reddit-refresh.yml`
- `.github/workflows/offpc-youtube-refresh.yml`

Normalization rebuild:

- `.github/workflows/offpc-normalize-pools.yml`

All workflows use:

- `runs-on: ubuntu-latest`

No workflow uses `self-hosted`.

## How training uses the sources

The trainer samples from:

- normalized meta pool
- normalized Pikalytics pool
- normalized Reddit pool
- normalized YouTube pool
- normalized random pool
- normalized self-play pool
- archived teams

It weights sources differently:

- official/curated meta and Pikalytics-derived data: highest
- archive: high
- Reddit curated/structured imports: medium
- YouTube imports: medium-low unless curated
- self-play: exploratory
- random: lowest source confidence, still useful for robustness

## How the live app benefits

The browser app only reads learned files at runtime.

`app.js` fetches:

- `data/learned_weights.json`
- `data/species_role_priors.json`
- `data/move_choice_weights.json`
- `data/threat_penalties.json`
- `data/team_archive.json`
- `data/normalized/source_meta_snapshot.json`
- `data/normalized/combined_training_pool.json`

If those files are missing, the app falls back safely to built-in defaults.

No browser-side training exists.

## How to trigger learning from GitHub

From the GitHub repository:

1. Open the `Actions` tab.
2. Pick one of these workflows:
   - `Off-PC Nightly Training`
   - `Off-PC Manual Evaluation`
   - `Off-PC Pikalytics Refresh`
   - `Off-PC Reddit Refresh`
   - `Off-PC YouTube Refresh`
   - `Off-PC Normalize Pools`
   - `Off-PC Learned Data Validation`
3. Click `Run workflow`.
4. Optionally set workflow inputs such as `iterations`.
5. Start the run.

## How to verify learned files updated

After a successful run:

1. Open the workflow run in GitHub Actions.
2. Check the uploaded artifacts for normalized pools, logs, and reports.
3. Check the repository commit history if the workflow commits refreshed outputs.
4. Confirm updates in:
   - `data/learned_weights.json`
   - `data/species_role_priors.json`
   - `data/move_choice_weights.json`
   - `data/threat_penalties.json`
   - `data/team_archive.json`
   - `data/normalized/*.json`
   - `reports/training_summary.md`
   - `data/battle_logs/*.jsonl`

## How to disable schedules

Edit the relevant workflow file and remove or comment out the `schedule:` block.

The manual `workflow_dispatch` path can remain enabled even when schedules are disabled.

## Local safety summary

Nothing in this implementation auto-runs on your PC.

Specifically not added:

- self-hosted runners
- postinstall hooks
- prepare hooks
- local training scripts that auto-run
- background workers
- file watchers
- VS Code tasks
- browser-side training
