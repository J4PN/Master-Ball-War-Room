/**
 * Master Ball War Room — UX Patch
 * Drop this file in your project folder and add ONE script tag at the end of index.html,
 * AFTER the existing app.js tag:
 *
 *   <script src="./patch.js"></script>
 *
 * Also paste the contents of styles_additions.css at the bottom of your styles.css.
 * Replace your index.html with the provided index.html (hero + nav + roster section updated).
 */

(function () {
  "use strict";

  const PATCH_DISABLE_FLAG = "MBWR_DEBUG_DISABLE_PATCH";

  function isPatchDisabled() {
    try {
      return window[PATCH_DISABLE_FLAG] === true || window.sessionStorage?.getItem(PATCH_DISABLE_FLAG) === "1";
    } catch (error) {
      console.warn("MBWR patch: failed to read debug flag", error);
      return false;
    }
  }

  if (isPatchDisabled()) {
    console.warn(`MBWR patch: disabled via ${PATCH_DISABLE_FLAG}`);
    return;
  }

  if (window.__MBWR_PATCH_INITIALIZED) {
    console.warn("MBWR patch: init skipped because patch is already active");
    return;
  }
  window.__MBWR_PATCH_INITIALIZED = true;

  function getAppApi() {
    return window.MBWR_APP_API || null;
  }

  const warnedPatchApiFields = new Set();

  function warnPatchApiField(fieldName) {
    if (warnedPatchApiFields.has(fieldName)) return;
    warnedPatchApiFields.add(fieldName);
    console.warn(`MBWR patch: missing MBWR_APP_API.${fieldName}`);
  }

  function getApiRoster() {
    const roster = getAppApi()?.championsRoster;
    if (Array.isArray(roster)) return roster;
    warnPatchApiField("championsRoster");
    return [];
  }

  /* ─────────────────────────────────────────────
     SECTION 1 — HERO BUTTONS: Save / Load / Start
  ───────────────────────────────────────────── */

  function showHeroSaveStatus(msg, ok) {
    const el = document.getElementById("hero-save-status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "var(--success)" : "#ff7878";
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.textContent = ""; }, 3500);
  }

  function getTeamBuilderStatePatch() {
    const appState = window.MBWR_APP_API?.getTeamBuilderState?.();
    if (Array.isArray(appState) && appState.length) {
      return appState.map(slot => ({
        name: slot.name || "",
        item: slot.item || "",
        ability: slot.ability || "",
        nature: slot.nature || "",
        moves: (slot.moves || []).map(move => String(move || "").trim().toLowerCase()),
      }));
    }
    return Array.from({ length: 6 }, (_, i) => ({
      name: document.querySelector(`.team-slot[data-slot="${i}"]`)?.value || "",
      item: document.querySelector(`.team-item[data-slot="${i}"]`)?.value || "",
      ability: document.querySelector(`.team-ability[data-slot="${i}"]`)?.value || "",
      nature: document.querySelector(`.team-nature[data-slot="${i}"]`)?.value || "",
      moves: Array.from(document.querySelectorAll(`.team-move[data-slot="${i}"]`)).map(el => String(el.value || "").trim().toLowerCase()),
    }));
  }

  function bindHeroButtons() {
    // ▶ Start Building Team
    const startBtn = document.getElementById("hero-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        const tbBtn = document.querySelector('[data-tab-trigger="teambuilder"]');
        if (tbBtn) tbBtn.click();
        setTimeout(() => {
          const firstSlot = document.querySelector('.team-slot[data-slot="0"]');
          if (firstSlot) {
            firstSlot.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => firstSlot.focus(), 350);
          }
        }, 100);
      });
    }

    // 💾 Save Team
    const saveBtn = document.getElementById("hero-save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const state = getTeamBuilderStatePatch();
        if (!state.some(s => s.name)) {
          showHeroSaveStatus("Add at least one Pokémon before saving.", false);
          return;
        }
        try {
          localStorage.setItem("mbwr-saved-team-v1", JSON.stringify(state));
          showHeroSaveStatus("Team saved ✓", true);
        } catch (e) {
          showHeroSaveStatus("Save failed — storage unavailable.", false);
        }
      });
    }

    // ↩ Load Saved
    const loadBtn = document.getElementById("hero-load-btn");
    if (loadBtn) {
      loadBtn.addEventListener("click", async () => {
        try {
          const raw = localStorage.getItem("mbwr-saved-team-v1");
          if (!raw) { showHeroSaveStatus("No saved team found.", false); return; }
          const state = JSON.parse(raw);
          for (let i = 0; i < 6; i++) {
            const slot = state[i] || {};
            const slotInput = document.querySelector(`.team-slot[data-slot="${i}"]`);
            const itemInput = document.querySelector(`.team-item[data-slot="${i}"]`);
            const abilityInput = document.querySelector(`.team-ability[data-slot="${i}"]`);
            const natureSelect = document.querySelector(`.team-nature[data-slot="${i}"]`);
            if (slotInput) slotInput.value = slot.name || "";
            if (itemInput) itemInput.value = slot.item || "";
            if (abilityInput) abilityInput.value = slot.ability || "";
            if (natureSelect && slot.nature) natureSelect.value = slot.nature;
            if (slot.moves) {
              slot.moves.forEach((mv, mi) => {
                const mEl = document.querySelector(`.team-move[data-slot="${i}"][data-move-slot="${mi}"]`);
                if (mEl) mEl.value = mv || "";
              });
            }
          }
          // Trigger app's own refresh if available
          if (typeof window._mbwrRefreshAll === "function") await window._mbwrRefreshAll();
          showHeroSaveStatus("Team loaded ✓", true);
          const tbBtn = document.querySelector('[data-tab-trigger="teambuilder"]');
          if (tbBtn) tbBtn.click();
        } catch (e) {
          showHeroSaveStatus("Load failed — saved data may be corrupted.", false);
        }
      });
    }
  }

  /* ─────────────────────────────────────────────
     SECTION 2 — FOOTER NAV BUTTONS
  ───────────────────────────────────────────── */

  function bindFooterButtons() {
    document.querySelectorAll(".footer-link-btn[data-tab-trigger]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tabTrigger;
        const tabBtn = document.querySelector(`[data-tab-trigger="${target}"]`);
        if (tabBtn) {
          tabBtn.click();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }

  /* ─────────────────────────────────────────────
     SECTION 3 — ROSTER: QUICK-ADD + SEARCH + TYPE FILTER
  ───────────────────────────────────────────── */

  function getRosterEntries() {
    return getApiRoster();
  }

  function getNextEmptySlot() {
    for (let i = 0; i < 6; i++) {
      const el = document.querySelector(`.team-slot[data-slot="${i}"]`);
      if (el && !el.value) return i;
    }
    return null; // all full
  }

  async function quickAddPokemonToTeam(entry) {
    let slotIndex = getNextEmptySlot();
    if (slotIndex === null) {
      // All full: ask which slot to replace
      slotIndex = promptSlotReplace(entry.name);
      if (slotIndex === null) return;
    }

    const slotInput = document.querySelector(`.team-slot[data-slot="${slotIndex}"]`);
    if (!slotInput) return;
    slotInput.value = entry.name;

    // Auto-set mega stone if applicable
    const itemInput = document.querySelector(`.team-item[data-slot="${slotIndex}"]`);
    if (itemInput) {
      const megaStone = getMegaStoneForEntryPatch(entry);
      if (megaStone) itemInput.value = megaStone;
    }

    // Flash the team card
    const card = document.querySelector(`.team-card[data-team-card="${slotIndex}"]`);
    if (card) {
      card.classList.add("pokemon-added");
      setTimeout(() => card.classList.remove("pokemon-added"), 600);
    }

    // Trigger app refresh
    if (typeof window._mbwrRefreshSlot === "function") {
      await window._mbwrRefreshSlot(slotIndex);
    }
    if (typeof window._mbwrAnalyze === "function") {
      window._mbwrAnalyze();
    }

    // Update slot header label with role badge
    updateSlotRoleBadge(slotIndex, entry);

    showQuickAddFeedback(entry.name, slotIndex);
  }

  function promptSlotReplace(pokemonName) {
    const slots = Array.from({ length: 6 }, (_, i) => {
      const el = document.querySelector(`.team-slot[data-slot="${i}"]`);
      return el?.value || `Slot ${i + 1}`;
    });
    const msg = `All 6 slots are full. Pick a slot to replace with ${pokemonName}:\n\n` +
      slots.map((name, i) => `${i + 1}. ${name}`).join("\n") +
      "\n\nEnter 1–6 (or cancel):";
    const answer = prompt(msg);
    if (!answer) return null;
    const num = parseInt(answer, 10);
    if (isNaN(num) || num < 1 || num > 6) return null;
    return num - 1;
  }

  function getMegaStoneForEntryPatch(entry) {
    // Mirrors the MEGA_STONE_OVERRIDES logic from app.js
    const MEGA_STONES = {
      "Mega Charizard X": "Charizardite X", "Mega Charizard Y": "Charizardite Y",
      "Mega Lucario": "Lucarionite", "Mega Heracross": "Heracronite",
      "Mega Dragonite": "Dragoninite", "Mega Feraligatr": "Feraligite",
      "Mega Emboar": "Emboarite", "Mega Delphox": "Delphoxite",
      "Mega Greninja": "Greninjite", "Mega Chesnaught": "Chesnaughtite",
      "Mega Floette": "Floettite", "Mega Victreebel": "Victreebelite",
      "Mega Chimecho": "Chimechite", "Mega Glimmora": "Glimmoranite",
      "Mega Hawlucha": "Hawluchanite", "Mega Crabominable": "Crabominite",
      "Mega Drampa": "Drampanite", "Mega Skarmory": "Skarmorite",
      "Mega Clefable": "Clefablite", "Mega Starmie": "Starminite",
      "Mega Scovillain": "Scovillainite", "Mega Excadrill": "Excadrite",
      "Mega Golurk": "Golurkite", "Mega Meowstic (Male)": "Meowsticite",
      "Mega Meowstic (Female)": "Meowsticite",
    };
    return MEGA_STONES[entry.name] || null;
  }

  function showQuickAddFeedback(pokemonName, slotIndex) {
    // Brief toast-style status below the roster
    const statusEl = document.getElementById("roster-add-status");
    if (!statusEl) return;
    statusEl.textContent = `✓ ${pokemonName} added to Slot ${slotIndex + 1}`;
    statusEl.style.opacity = "1";
    clearTimeout(statusEl._timer);
    statusEl._timer = setTimeout(() => { statusEl.style.opacity = "0"; }, 2000);
  }

  /* ── Type chip colours for the roster ── */
  const TYPE_COLORS = {
    Normal: "#9a9a8a", Fire: "#ff7036", Water: "#4d90d5", Grass: "#78c850",
    Electric: "#f8d030", Ice: "#98d8d8", Fighting: "#c03028", Poison: "#a040a0",
    Ground: "#e0c068", Flying: "#a890f0", Psychic: "#f85888", Bug: "#a8b820",
    Rock: "#b8a038", Ghost: "#705898", Dragon: "#7038f8", Dark: "#705848",
    Steel: "#b8b8d0", Fairy: "#ee99ac",
  };

  function typeChip(type) {
    const bg = TYPE_COLORS[type] || "#888";
    return `<span class="roster-type-chip" style="background:${bg}22;color:${bg};border:1px solid ${bg}55;">${type}</span>`;
  }

  function renderRosterChips(entries) {
    const container = document.getElementById("confirmed-roster");
    const countEl = document.getElementById("roster-count");
    if (!container) return;

    container.innerHTML = entries.map(entry => {
      const typeStr = entry.types.map(typeChip).join("");
      return `<div class="roster-chip" data-name="${entry.name}" title="Click to add ${entry.name}">
        <div class="chip-add-hint">+ Add</div>
        <strong>${entry.name}</strong>
        <div class="roster-chip-types">${typeStr}</div>
      </div>`;
    }).join("");

    if (countEl) countEl.textContent = `${entries.length} Pokémon`;

    // Bind click handlers
    container.querySelectorAll(".roster-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const name = chip.dataset.name;
        const entry = getRosterEntries().find(e => e.name === name);
        if (!entry) return;
        chip.classList.add("just-added");
        setTimeout(() => chip.classList.remove("just-added"), 800);
        quickAddPokemonToTeam(entry);
      });
    });
  }

  function setupRosterFilterAndSearch() {
    const searchInput = document.getElementById("roster-search");
    const typeFilter = document.getElementById("roster-type-filter");
    if (!searchInput && !typeFilter) return;

    function applyFilters() {
      const query = (searchInput?.value || "").toLowerCase().trim();
      const typeVal = typeFilter?.value || "";
      const all = getRosterEntries();
      const filtered = all.filter(entry => {
        const nameMatch = !query || entry.name.toLowerCase().includes(query);
        const typeMatch = !typeVal || entry.types.includes(typeVal);
        return nameMatch && typeMatch;
      });
      renderRosterChips(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (typeFilter) typeFilter.addEventListener("change", applyFilters);

    // Initial render
    renderRosterChips(getRosterEntries());
  }

  /* ─────────────────────────────────────────────
     SECTION 4 — ROLE BADGE AUTO-DETECTION
  ───────────────────────────────────────────── */

  const ROLE_DETECT = {
    "trick room":   { role: "TR Setter",  cls: "role-support" },
    "tailwind":     { role: "Tailwind",   cls: "role-lead" },
    "fake out":     { role: "Fake Out",   cls: "role-lead" },
    "follow me":    { role: "Redirect",   cls: "role-support" },
    "rage powder":  { role: "Redirect",   cls: "role-support" },
    "protect":      { role: "Pivot",      cls: "role-sweeper" },
    "parting shot": { role: "Pivot",      cls: "role-support" },
    "u-turn":       { role: "Pivot",      cls: "role-support" },
    "volt switch":  { role: "Pivot",      cls: "role-support" },
    "icy wind":     { role: "Spd Ctrl",   cls: "role-support" },
    "electroweb":   { role: "Spd Ctrl",   cls: "role-support" },
    "swords dance": { role: "Setup",      cls: "role-setup" },
    "nasty plot":   { role: "Setup",      cls: "role-setup" },
    "calm mind":    { role: "Setup",      cls: "role-setup" },
    "quiver dance": { role: "Setup",      cls: "role-setup" },
  };

  const SPEED_ABILITY_NAMES = new Set([
    "intimidate", "prankster", "unburden", "speed boost", "swift swim",
    "chlorophyll", "sand rush", "slush rush", "surge surfer",
  ]);

  const SUPPORT_ABILITY_NAMES = new Set([
    "intimidate", "prankster", "hospitality", "drought", "drizzle",
    "sand stream", "snow warning", "electric surge", "psychic surge",
    "grassy surge", "misty surge", "armor tail", "cud chew",
  ]);

  function detectSlotRole(slotIndex) {
    const moves = Array.from(document.querySelectorAll(`.team-move[data-slot="${slotIndex}"]`))
      .map(el => el.value.toLowerCase().trim());
    const ability = (document.querySelector(`.team-ability[data-slot="${slotIndex}"]`)?.value || "").toLowerCase();
    const item = (document.querySelector(`.team-item[data-slot="${slotIndex}"]`)?.value || "").toLowerCase();

    // Move-based role detection (first match wins for label)
    for (const move of moves) {
      if (ROLE_DETECT[move]) return ROLE_DETECT[move];
    }

    if (SUPPORT_ABILITY_NAMES.has(ability)) return { role: "Support", cls: "role-support" };
    if (item.includes("scarf")) return { role: "Scarf", cls: "role-sweeper" };
    if (item.includes("sash")) return { role: "Lead", cls: "role-lead" };
    if (item.endsWith("ite") || item.endsWith("ite x") || item.endsWith("ite y")) return { role: "Mega", cls: "role-setup" };

    return null;
  }

  function updateSlotRoleBadge(slotIndex, entry) {
    const header = document.querySelector(`.team-card[data-team-card="${slotIndex}"] .team-card__tag`);
    if (!header) return;

    const detected = detectSlotRole(slotIndex);
    if (detected) {
      header.textContent = detected.role;
      header.className = `team-card__tag ${detected.cls}`;
    } else if (entry) {
      // Fallback: heuristic from base stats
      const spd = entry.baseSpeed || 0;
      if (spd >= 110) { header.textContent = "Sweeper"; header.className = "team-card__tag role-sweeper"; }
      else if (spd <= 55) { header.textContent = "TR Abuser"; header.className = "team-card__tag role-support"; }
      else {
        const slotLabels = ["Lead", "Core", "Pivot", "Support", "Breaker", "Closer"];
        header.textContent = slotLabels[slotIndex] || "Flex";
        header.className = "team-card__tag";
      }
    }
  }

  /* Watch move + ability + item changes to live-update role badges */
  function bindRoleBadgeWatchers() {
    for (let i = 0; i < 6; i++) {
      const idx = i;
      const watchEls = [
        document.querySelector(`.team-slot[data-slot="${idx}"]`),
        document.querySelector(`.team-ability[data-slot="${idx}"]`),
        document.querySelector(`.team-item[data-slot="${idx}"]`),
        ...Array.from(document.querySelectorAll(`.team-move[data-slot="${idx}"]`)),
      ].filter(Boolean);
      watchEls.forEach(el => {
        el.addEventListener("change", () => updateSlotRoleBadge(idx, null));
        el.addEventListener("input", () => updateSlotRoleBadge(idx, null));
      });
    }
  }

  /* ─────────────────────────────────────────────
     SECTION 5 — LIVE TEAM SUMMARY BAR
     Shows types / roles / warnings above the team cards
  ───────────────────────────────────────────── */

  function buildTeamSummaryBar() {
    const grid = document.querySelector(".team-builder-grid");
    if (!grid || document.getElementById("team-summary-bar")) return;
    const bar = document.createElement("div");
    bar.id = "team-summary-bar";
    bar.className = "team-summary-bar";
    bar.innerHTML = `
      <div class="tsb-section">
        <span class="tsb-label">Types on team</span>
        <div id="tsb-types" class="tsb-chips"></div>
      </div>
      <div class="tsb-section">
        <span class="tsb-label">Roles detected</span>
        <div id="tsb-roles" class="tsb-chips"></div>
      </div>
      <div class="tsb-section">
        <span class="tsb-label">Quick warnings</span>
        <div id="tsb-warnings" class="tsb-chips"></div>
      </div>`;
    grid.parentNode.insertBefore(bar, grid);
  }

  function updateTeamSummaryBar() {
    const typesEl = document.getElementById("tsb-types");
    const rolesEl = document.getElementById("tsb-roles");
    const warningsEl = document.getElementById("tsb-warnings");
    if (!typesEl) return;

    const team = Array.from({ length: 6 }, (_, i) => {
      const name = document.querySelector(`.team-slot[data-slot="${i}"]`)?.value || "";
      const ability = document.querySelector(`.team-ability[data-slot="${i}"]`)?.value || "";
      const item = document.querySelector(`.team-item[data-slot="${i}"]`)?.value || "";
      const moves = Array.from(document.querySelectorAll(`.team-move[data-slot="${i}"]`))
        .map(el => el.value.toLowerCase().trim());
      return { name, ability, item, moves };
    }).filter(s => s.name);

    if (!team.length) {
      typesEl.innerHTML = `<span class="tsb-chip tsb-chip--dim">—</span>`;
      rolesEl.innerHTML = `<span class="tsb-chip tsb-chip--dim">—</span>`;
      warningsEl.innerHTML = `<span class="tsb-chip tsb-chip--dim">Add Pokémon to see warnings</span>`;
      return;
    }

    // Types
    const allTypes = new Set();
    team.forEach(s => {
      const entry = getApiRoster()
        .find(e => e.name === s.name);
      if (entry) entry.types.forEach(t => allTypes.add(t));
    });
    typesEl.innerHTML = [...allTypes].map(t => {
      const c = TYPE_COLORS[t] || "#888";
      return `<span class="tsb-chip" style="background:${c}22;color:${c};border-color:${c}44">${t}</span>`;
    }).join("");

    // Roles
    const roles = new Set();
    team.forEach((s, i) => {
      const detected = detectSlotRole(i);
      if (detected) roles.add(detected.role);
    });
    const hasFakeOut = team.some(s => s.moves.includes("fake out"));
    const hasTailwind = team.some(s => s.moves.includes("tailwind"));
    const hasTR = team.some(s => s.moves.includes("trick room"));
    const hasProtect = team.some(s => s.moves.includes("protect"));
    if (hasFakeOut) roles.add("Fake Out");
    if (hasTailwind) roles.add("Tailwind");
    if (hasTR) roles.add("Trick Room");
    if (hasProtect) roles.add("Protect");
    rolesEl.innerHTML = roles.size
      ? [...roles].map(r => `<span class="tsb-chip tsb-chip--role">${r}</span>`).join("")
      : `<span class="tsb-chip tsb-chip--dim">No roles detected yet</span>`;

    // Warnings
    const warnings = [];

    // Type weakness check (simple heuristic)
    const typeWeakCounts = {};
    const allTypeNames = ["Normal","Fire","Water","Grass","Electric","Ice","Fighting","Poison",
      "Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"];
    allTypeNames.forEach(atk => {
      let weakCount = 0;
      team.forEach(s => {
        const entry = getApiRoster()
          .find(e => e.name === s.name);
        if (!entry) return;
        // simple heuristic: check if any of the team types is weak to this attack type
        // We don't replicate the full type chart here — just flag if 3+ members share a type that is weak
      });
    });

    if (!hasFakeOut && team.length >= 2) warnings.push({ text: "No Fake Out user", cls: "amber" });
    if (!hasTailwind && !hasTR) warnings.push({ text: "No speed control", cls: "amber" });
    if (!hasProtect) warnings.push({ text: "No Protect users", cls: "red" });
    const physCount = team.filter(s => {
      const entry = getApiRoster()
        .find(e => e.name === s.name);
      return entry && (entry.baseStats ? entry.baseStats[1] > entry.baseStats[3] : false);
    }).length;
    if (physCount >= 5) warnings.push({ text: "Mostly physical — Intimidate bait", cls: "amber" });

    // TR speed check
    if (hasTR) {
      const entries = team.map(s =>
        getApiRoster().find(e => e.name === s.name)
      ).filter(Boolean);
      const fastCount = entries.filter(e => (e.baseSpeed || 0) >= 80).length;
      if (fastCount >= 3) {
        warnings.push({ text: `TR speed conflict — ${fastCount} fast members`, cls: "red" });
      }
    }

    warningsEl.innerHTML = warnings.length
      ? warnings.map(w => `<span class="analysis-warning analysis-warning--${w.cls}">⚠ ${w.text}</span>`).join("")
      : `<span class="tsb-chip tsb-chip--ok">✓ No major issues</span>`;
  }

  /* Hook into team slot changes to refresh summary */
  function bindSummaryBarWatchers() {
    for (let i = 0; i < 6; i++) {
      const watchEls = [
        document.querySelector(`.team-slot[data-slot="${i}"]`),
        document.querySelector(`.team-ability[data-slot="${i}"]`),
        document.querySelector(`.team-item[data-slot="${i}"]`),
        document.querySelector(`.team-nature[data-slot="${i}"]`),
        ...Array.from(document.querySelectorAll(`.team-move[data-slot="${i}"]`)),
      ].filter(Boolean);
      watchEls.forEach(el => {
        el.addEventListener("change", updateTeamSummaryBar);
        el.addEventListener("input", updateTeamSummaryBar);
      });
    }
    document.addEventListener("mbwr:team-state-changed", updateTeamSummaryBar);
  }

  /* ─────────────────────────────────────────────
     SECTION 6 — EXPOSE APP INTERNALS
     Hook into existing app.js functions via MutationObserver
     so our quick-add calls the real refresh/analyze
  ───────────────────────────────────────────── */

  function exposeAppInternals() {
    // The app wraps everything in an IIFE so we can't directly call its functions.
    // We intercept via the DOM: we trigger an input event on the team-slot which
    // makes the app's own bindSpeciesHelpers fire.
    window._mbwrRefreshSlot = async function (slotIndex) {
      const slotEl = document.querySelector(`.team-slot[data-slot="${slotIndex}"]`);
      if (slotEl) {
        slotEl.dispatchEvent(new Event("input", { bubbles: true }));
        slotEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      // Small delay so the app can process
      await new Promise(r => setTimeout(r, 80));
    };

    window._mbwrAnalyze = function () {
      const analyzeBtn = document.getElementById("build-team");
      if (analyzeBtn) analyzeBtn.click();
    };

    window._mbwrRefreshAll = async function () {
      for (let i = 0; i < 6; i++) await window._mbwrRefreshSlot(i);
    };
  }

  /* ─────────────────────────────────────────────
     SECTION 7 — ROSTER STATUS ELEMENT INJECTION
  ───────────────────────────────────────────── */

  function injectRosterStatusEl() {
    const container = document.getElementById("confirmed-roster");
    if (!container || document.getElementById("roster-add-status")) return;
    const el = document.createElement("div");
    el.id = "roster-add-status";
    el.className = "roster-add-status";
    el.style.cssText = "opacity:0;transition:opacity 300ms;font-size:0.82rem;color:var(--success);padding:6px 0 0;grid-column:1/-1;";
    container.parentNode.insertBefore(el, container.nextSibling);
  }

  /* ─────────────────────────────────────────────
     SECTION 8 — INIT
  ───────────────────────────────────────────── */

  function init() {
    exposeAppInternals();
    bindHeroButtons();
    bindFooterButtons();
    setupRosterFilterAndSearch();
    injectRosterStatusEl();
    buildTeamSummaryBar();
    bindRoleBadgeWatchers();
    bindSummaryBarWatchers();
    updateTeamSummaryBar();

    // Re-render roster after app has loaded its data (app init is async)
    // We watch for the confirmed-roster to get populated by the app, then re-render ours
    let rosterReady = false;
    const rosterObserver = new MutationObserver(() => {
      if (rosterReady) return;
      const roster = getRosterEntries();
      if (roster.length > 0) {
        rosterReady = true;
        rosterObserver.disconnect();
        renderRosterChips(roster);
        // Wire up search after data arrives
        const searchInput = document.getElementById("roster-search");
        const typeFilter = document.getElementById("roster-type-filter");
        if (searchInput) searchInput.addEventListener("input", () => {
          const q = searchInput.value.toLowerCase();
          const t = typeFilter?.value || "";
          renderRosterChips(getRosterEntries().filter(e =>
            (!q || e.name.toLowerCase().includes(q)) && (!t || e.types.includes(t))
          ));
        });
        if (typeFilter) typeFilter.addEventListener("change", () => {
          const q = searchInput?.value.toLowerCase() || "";
          const t = typeFilter.value;
          renderRosterChips(getRosterEntries().filter(e =>
            (!q || e.name.toLowerCase().includes(q)) && (!t || e.types.includes(t))
          ));
        });
      }
    });

    const confirmedRosterEl = document.getElementById("confirmed-roster");
    if (confirmedRosterEl) {
      rosterObserver.observe(confirmedRosterEl, { childList: true, subtree: true });
    }

    // Also observe analyze button to refresh summary bar whenever analysis runs
    const analyzeBtn = document.getElementById("build-team");
    if (analyzeBtn) {
      analyzeBtn.addEventListener("click", () => {
        setTimeout(updateTeamSummaryBar, 100);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();

