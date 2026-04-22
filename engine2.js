/**
 * ═══════════════════════════════════════════════════════════════
 *  MASTER BALL WAR ROOM — ENGINE 2
 *  Meta-Aware Competitive Upgrade Layer
 *
 *  Drop this file in your project folder. Add ONE script tag in
 *  index.html, AFTER app.js and patch.js:
 *
 *    <script src="./engine2.js"></script>
 *
 *  This file ADDS features on top of the existing app. It does NOT
 *  replace anything. All existing analysis, damage calc, and draft
 *  logic remains intact and is re-used here.
 * ═══════════════════════════════════════════════════════════════
 *
 *  What this adds:
 *
 *  1.  RULESET ENGINE        — switchable format configs
 *  2.  ARCHETYPE CLASSIFIER  — detects Rain / TR / Offense / Balance
 *  3.  THREAT COVERAGE GRID  — per-threat good/neutral/bad matchup table
 *  4.  LEAD OPTIMIZER        — scores all 2-mon lead combos, surfaces top 3
 *  5.  EVOLUTIONARY OPTIMIZER— guided team mutation w/ synergy scoring
 *  6.  IMPROVE MY TEAM BUTTON— one-click smart fixes injected into UI
 *  7.  TEAM COMPARISON TOOL  — side-by-side two-team scoring
 *  8.  PLAYSTYLE LEARNER     — tracks user preferences across sessions
 *  9.  META SHIFT DETECTOR   — flags significant usage changes
 * 10.  ANALYSIS DASHBOARD    — visual overlay on top of existing analysis
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  const ENGINE2_DISABLE_FLAG = "MBWR_DEBUG_DISABLE_ENGINE2";

  function isEngine2Disabled() {
    try {
      return window[ENGINE2_DISABLE_FLAG] === true || window.sessionStorage?.getItem(ENGINE2_DISABLE_FLAG) === "1";
    } catch (error) {
      console.warn("MBWR engine2: failed to read debug flag", error);
      return false;
    }
  }

  if (isEngine2Disabled()) {
    console.warn(`MBWR engine2: disabled via ${ENGINE2_DISABLE_FLAG}`);
    return;
  }

  if (window.__MBWR_ENGINE2_INITIALIZED) {
    console.warn("MBWR engine2: init skipped because engine2 is already active");
    return;
  }
  window.__MBWR_ENGINE2_INITIALIZED = true;

  /* ─────────────────────────────────────────────────────────────
     UTILITIES
  ───────────────────────────────────────────────────────────── */

  function nk(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function clamp(val, lo = 0, hi = 100) {
    return Math.max(lo, Math.min(hi, Math.round(val)));
  }

  function getAppApi() {
    return window.MBWR_APP_API || null;
  }

  const warnedEngineApiFields = new Set();

  function warnEngineApiField(fieldName) {
    if (warnedEngineApiFields.has(fieldName)) return;
    warnedEngineApiFields.add(fieldName);
    console.warn(`MBWR engine2: missing MBWR_APP_API.${fieldName}`);
  }

  function getRoster() {
    const roster = getAppApi()?.championsRoster;
    if (Array.isArray(roster)) return roster;
    warnEngineApiField("championsRoster");
    return [];
  }

  function getMetaThreats() {
    const threats = getAppApi()?.metaThreats;
    if (Array.isArray(threats)) return threats;
    warnEngineApiField("metaThreats");
    return [];
  }

  function getTypeChart() {
    const chart = getAppApi()?.TYPE_CHART;
    if (chart && typeof chart === "object") return chart;
    warnEngineApiField("TYPE_CHART");
    return {};
  }

  function typeEffectiveness(attackType, defTypes) {
    const chart = getTypeChart();
    return (defTypes || []).reduce((acc, dt) => acc * (chart[attackType]?.[dt] ?? 1), 1);
  }

  function singleTypeEff(atk, def) {
    return getTypeChart()[atk]?.[def] ?? 1;
  }

  function getRosterEntry(name) {
    if (!name) return null;
    const key = nk(name);
    return getRoster().find(e => nk(e.name) === key) || null;
  }

  function getTeamSlots() {
    return Array.from({ length: 6 }, (_, i) => ({
      name: document.querySelector(`.team-slot[data-slot="${i}"]`)?.value || "",
      item: document.querySelector(`.team-item[data-slot="${i}"]`)?.value || "",
      ability: document.querySelector(`.team-ability[data-slot="${i}"]`)?.value || "",
      nature: document.querySelector(`.team-nature[data-slot="${i}"]`)?.value || "",
      moves: Array.from(document.querySelectorAll(`.team-move[data-slot="${i}"]`)).map(el => el.value || ""),
    }));
  }

  function getFilledSlots() {
    return getTeamSlots().filter(s => s.name);
  }

  function resolveEntry(slot) {
    return slot?.name ? getRosterEntry(slot.name) : null;
  }

  function localStore(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch { return null; }
  }

  /* ─────────────────────────────────────────────────────────────
     1. RULESET ENGINE
  ───────────────────────────────────────────────────────────── */

  const RULESETS = {
    champions: {
      id: "champions",
      label: "Pokémon Champions",
      maxTeamSize: 6,
      levelCap: 50,
      clauses: ["Species Clause", "Item Clause"],
      spMax: 66,
      spPerStat: 32,
      description: "The Champions format — custom roster, SP instead of EVs, level 50."
    },
    vgc2025: {
      id: "vgc2025",
      label: "VGC 2025 Reg H",
      maxTeamSize: 6,
      levelCap: 50,
      clauses: ["Species Clause", "Item Clause", "Restricted Pair"],
      maxRestricted: 2,
      description: "VGC 2025 Regulation H — series format reference."
    },
    custom: {
      id: "custom",
      label: "Custom Format",
      maxTeamSize: 6,
      levelCap: 50,
      clauses: [],
      description: "User-defined format."
    }
  };

  let activeRuleset = localStore("mbwr-ruleset") || "champions";

  function getRuleset() {
    return RULESETS[activeRuleset] || RULESETS.champions;
  }

  function setRuleset(id) {
    activeRuleset = id;
    localStore("mbwr-ruleset", id);
    refreshRulesetBadge();
  }

  function refreshRulesetBadge() {
    const badge = document.getElementById("e2-ruleset-badge");
    if (badge) badge.textContent = getRuleset().label;
  }

  /* ─────────────────────────────────────────────────────────────
     2. ARCHETYPE CLASSIFIER
  ───────────────────────────────────────────────────────────── */

  const WEATHER_SETTERS = {
    rain: new Set(["drizzle", "primordial sea"]),
    sun:  new Set(["drought", "desolate land"]),
    sand: new Set(["sand stream"]),
    snow: new Set(["snow warning", "snow"]),
  };

  const WEATHER_ABUSERS = {
    rain: new Set(["swift swim", "rain dish", "dry skin"]),
    sun:  new Set(["chlorophyll", "solar power", "flower gift"]),
    sand: new Set(["sand rush", "sand force"]),
    snow: new Set(["slush rush", "ice body"]),
  };

  function classifyArchetype(slots) {
    const filled = slots.filter(s => s.name);
    if (!filled.length) return { label: "Empty", tags: [], confidence: 0 };

    const tags = [];
    let trSetters = 0, trAbusers = 0;
    let weatherMode = null;
    let weatherAbusers = 0;
    let hyper = 0, support = 0;
    let fakeOuts = 0, redirects = 0, tailwinds = 0;
    let avgSpeed = 0;

    filled.forEach(slot => {
      const entry = resolveEntry(slot);
      if (!entry) return;
      const moveKeys = slot.moves.map(m => nk(m));
      const ability = nk(slot.ability || "");

      if (moveKeys.includes(nk("Trick Room"))) trSetters++;
      if (entry.baseSpeed <= 60 && trSetters > 0) trAbusers++;
      if (moveKeys.includes(nk("Fake Out"))) fakeOuts++;
      if (moveKeys.some(m => ["followme", "ragepowder"].includes(m))) redirects++;
      if (moveKeys.includes(nk("Tailwind"))) tailwinds++;
      avgSpeed += entry.baseSpeed;

      for (const [wx, abilities] of Object.entries(WEATHER_SETTERS)) {
        if (abilities.has(ability)) { weatherMode = wx; }
      }
      for (const [wx, abilities] of Object.entries(WEATHER_ABUSERS)) {
        if (abilities.has(ability) && wx === weatherMode) weatherAbusers++;
      }

      if (entry.baseSpeed >= 100 && entry.baseStats[1] >= 100) hyper++;
      if (redirects > 0 || fakeOuts > 0) support++;
    });

    avgSpeed = avgSpeed / (filled.length || 1);

    // Classify
    if (trSetters >= 2 && trAbusers >= 2) {
      tags.push("Hard Trick Room");
    } else if (trSetters === 1 && trAbusers >= 1) {
      if (avgSpeed > 70) {
        tags.push("Hybrid TR");
        tags.push("⚠ Speed conflict — too fast for hard TR");
      } else {
        tags.push("Soft Trick Room");
      }
    }

    if (weatherMode && weatherAbusers >= 2) {
      tags.push(`${weatherMode.charAt(0).toUpperCase() + weatherMode.slice(1)} Offense`);
    } else if (weatherMode) {
      tags.push(`${weatherMode.charAt(0).toUpperCase() + weatherMode.slice(1)} Mode`);
    }

    if (tailwinds >= 1) tags.push("Tailwind");
    if (fakeOuts >= 2) tags.push("Fake Out Pressure");
    if (redirects >= 1) tags.push("Redirection Core");

    if (!tags.length) {
      if (hyper >= 3) tags.push("Hyper Offense");
      else if (support >= 2) tags.push("Bulky Offense");
      else tags.push("Balance");
    }

    // TR speed conflict check
    const trSpeedConflict = trSetters >= 1 && avgSpeed > 80;
    const fastForTR = filled.filter(s => (resolveEntry(s)?.baseSpeed || 0) >= 90).length;
    const warnings = [];
    if (trSetters >= 1 && fastForTR >= 3) {
      warnings.push(`TR speed conflict: ${fastForTR} members are 90+ Speed — hard TR needs mostly slow Pokémon.`);
    }
    if (trSetters === 1 && trAbusers === 0) {
      warnings.push("Only one TR setter detected and no clear TR abusers — this may not function as a TR team.");
    }

    return {
      label: tags[0] || "Balance",
      tags,
      warnings,
      trSetters, trAbusers, weatherMode, weatherAbusers,
      avgSpeed: Math.round(avgSpeed),
      confidence: Math.min(100, tags.length * 25)
    };
  }

  /* ─────────────────────────────────────────────────────────────
     3. THREAT COVERAGE GRID
  ───────────────────────────────────────────────────────────── */

  function scoreSingleThreatMatchup(threat, slots) {
    const filled = slots.filter(s => s.name);
    if (!filled.length) return { label: "?", score: 50, color: "#888" };

    let resistCount = 0, weakCount = 0, pressureBack = 0;

    filled.forEach(slot => {
      const entry = resolveEntry(slot);
      if (!entry) return;

      // Can we resist the threat's STAB?
      const maxEff = Math.max(...threat.types.map(t => typeEffectiveness(t, entry.types)));
      if (maxEff < 1) resistCount++;
      if (maxEff > 1) weakCount++;

      // Can we hit back super-effectively?
      const stabs = entry.types;
      const canHit = stabs.some(stab => threat.types.some(dt => singleTypeEff(stab, dt) > 1));
      if (canHit) pressureBack++;

      // Move coverage check
      const moveKeys = slot.moves.map(m => nk(m));
      const moveHits = moveKeys.some(m => {
        // crude type inference from move name patterns
        const fireWords = ["heatwave", "flamethrower", "fireblast", "flareblitz", "burnup"];
        const waterWords = ["waterfall", "surfing", "hydropump", "muddywater", "scald"];
        const elecWords = ["thunderbolt", "discharge", "voltswitch", "electroweb", "thunderwave"];
        const groundWords = ["earthquake", "earthpower", "bulldoze", "bonemerang"];
        const moveTypeGuess = fireWords.some(w => m.includes(w)) ? "Fire"
          : waterWords.some(w => m.includes(w)) ? "Water"
          : elecWords.some(w => m.includes(w)) ? "Electric"
          : groundWords.some(w => m.includes(w)) ? "Ground" : null;
        return moveTypeGuess && threat.types.some(dt => singleTypeEff(moveTypeGuess, dt) > 1);
      });
      if (moveHits) pressureBack++;
    });

    const score = clamp(50 + resistCount * 12 + pressureBack * 8 - weakCount * 14);
    const label = score >= 68 ? "Good" : score >= 45 ? "Neutral" : "Bad";
    const color = score >= 68 ? "#42d4a0" : score >= 45 ? "#c89bff" : "#ff8878";
    return { label, score, color, resistCount, weakCount, pressureBack };
  }

  function buildThreatCoverageGrid(slots) {
    const threats = getMetaThreats().slice(0, 12);
    if (!threats.length) return "<p class='muted'>No meta threat data loaded.</p>";

    const rows = threats.map(threat => {
      const { label, score, color } = scoreSingleThreatMatchup(threat, slots);
      const bar = Math.round(score);
      return `<div class="e2-threat-row">
        <span class="e2-threat-name">${threat.name}</span>
        <span class="e2-threat-usage">Usage: ${threat.weight?.toFixed(1) || "?"}%</span>
        <div class="e2-threat-bar-wrap">
          <div class="e2-threat-bar" style="width:${bar}%;background:${color};"></div>
        </div>
        <span class="e2-threat-label" style="color:${color};">${label}</span>
      </div>`;
    });

    const good = rows.filter((_, i) => {
      const { label } = scoreSingleThreatMatchup(threats[i], slots);
      return label === "Good";
    }).length;
    const bad = rows.filter((_, i) => {
      const { label } = scoreSingleThreatMatchup(threats[i], slots);
      return label === "Bad";
    }).length;

    return `
      <div class="e2-threat-summary">
        <span class="e2-pill e2-pill--good">✓ ${good} good matchups</span>
        <span class="e2-pill e2-pill--bad">✗ ${bad} bad matchups</span>
      </div>
      <div class="e2-threat-grid">${rows.join("")}</div>`;
  }

  /* ─────────────────────────────────────────────────────────────
     4. LEAD OPTIMIZER (extended)
  ───────────────────────────────────────────────────────────── */

  const LEAD_MOVE_BONUSES = {
    "fake out":     20,
    "tailwind":     16,
    "trick room":   16,
    "rage powder":  14,
    "follow me":    14,
    "icy wind":     12,
    "electroweb":   12,
    "protect":       8,
    "helping hand": 10,
    "taunt":        10,
    "encore":        8,
  };

  const LEAD_ABILITY_BONUSES = {
    "intimidate":  14,
    "prankster":   12,
    "drizzle":     10,
    "drought":     10,
    "sand stream": 10,
    "snow warning": 10,
    "unburden":     8,
  };

  function scoreLeadMon(slot, entry) {
    let score = 40;
    const moveKeys = slot.moves.map(m => nk(m));
    const ability = nk(slot.ability || "");

    Object.entries(LEAD_MOVE_BONUSES).forEach(([move, bonus]) => {
      if (moveKeys.includes(nk(move))) score += bonus;
    });

    Object.entries(LEAD_ABILITY_BONUSES).forEach(([ab, bonus]) => {
      if (ability === nk(ab)) score += bonus;
    });

    // Speed bonus — leads need to be fast or have priority
    if (entry.baseSpeed >= 110) score += 12;
    else if (entry.baseSpeed >= 90) score += 7;
    else if (entry.baseSpeed <= 50) score -= 8;

    // Focus Sash — great for lead
    if (nk(slot.item || "") === nk("Focus Sash")) score += 10;

    return clamp(score);
  }

  function buildLeadOptimizer(slots) {
    const filled = slots.filter(s => s.name);
    if (filled.length < 2) return "<p class='muted'>Add at least 2 Pokémon to see lead recommendations.</p>";

    // Score all pairs
    const pairs = [];
    for (let i = 0; i < filled.length; i++) {
      for (let j = i + 1; j < filled.length; j++) {
        const a = filled[i], b = filled[j];
        const ea = resolveEntry(a), eb = resolveEntry(b);
        if (!ea || !eb) continue;

        const scoreA = scoreLeadMon(a, ea);
        const scoreB = scoreLeadMon(b, eb);
        const pairScore = clamp(Math.round((scoreA + scoreB) / 2));

        // Synergy bonus: fake out + setup
        const movesA = a.moves.map(m => nk(m));
        const movesB = b.moves.map(m => nk(m));
        const allMoves = [...movesA, ...movesB];
        let synergy = 0;
        if (allMoves.includes(nk("Fake Out")) && allMoves.some(m => ["tailwind", "trickroom", "swordssdance", "nastyplot"].includes(m))) synergy += 12;
        if (allMoves.includes(nk("Rage Powder")) || allMoves.includes(nk("Follow Me"))) synergy += 8;

        const tags = [];
        if (allMoves.includes(nk("Fake Out"))) tags.push("Fake Out");
        if (allMoves.includes(nk("Tailwind"))) tags.push("Tailwind");
        if (allMoves.includes(nk("Trick Room"))) tags.push("Trick Room");
        if (allMoves.some(m => ["ragepowder", "followme"].includes(m))) tags.push("Redirect");

        pairs.push({
          a: ea.name, b: eb.name,
          score: clamp(pairScore + synergy),
          tags
        });
      }
    }

    pairs.sort((x, y) => y.score - x.score);
    const top = pairs.slice(0, 3);

    return `
      <div class="e2-leads">
        ${top.map((p, idx) => `
          <div class="e2-lead-row">
            <span class="e2-lead-rank">${["#1", "#2", "#3"][idx]}</span>
            <span class="e2-lead-names">${p.a} + ${p.b}</span>
            <span class="e2-lead-score" style="color:${p.score >= 70 ? "#42d4a0" : p.score >= 50 ? "#c89bff" : "#ff8878"}">${p.score}/100</span>
            <div class="e2-lead-tags">${p.tags.map(t => `<span class="e2-tag">${t}</span>`).join("")}</div>
          </div>
        `).join("")}
      </div>`;
  }

  /* ─────────────────────────────────────────────────────────────
     5. EVOLUTIONARY OPTIMIZER
     Guided mutation — replaces weakest member iteratively
  ───────────────────────────────────────────────────────────── */

  function scoreTeamFitness(slots) {
    const filled = slots.filter(s => s.name);
    if (!filled.length) return 0;

    // Type diversity (unique types score higher)
    const types = new Set();
    filled.forEach(s => { resolveEntry(s)?.types.forEach(t => types.add(t)); });
    const typeDiversity = clamp(types.size * 8);

    // Speed spread
    const speeds = filled.map(s => resolveEntry(s)?.baseSpeed || 0);
    const avgSpd = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const speedScore = clamp(avgSpd / 1.5);

    // Role coverage
    const roles = new Set();
    filled.forEach(s => {
      const moves = s.moves.map(m => nk(m));
      if (moves.includes(nk("Fake Out"))) roles.add("fakeout");
      if (moves.some(m => ["tailwind", "icywind", "electroweb"].includes(m))) roles.add("speedcontrol");
      if (moves.includes(nk("Trick Room"))) roles.add("tr");
      if (moves.some(m => ["ragepowder", "followme"].includes(m))) roles.add("redirect");
      if (moves.includes(nk("Protect"))) roles.add("protect");
    });
    const roleScore = clamp(roles.size * 16);

    // Weakness penalty
    const TC = getTypeChart();
    let weaknessPenalty = 0;
    Object.keys(TC).forEach(atk => {
      const weakCount = filled.filter(s => typeEffectiveness(atk, resolveEntry(s)?.types || []) > 1).length;
      if (weakCount >= 3) weaknessPenalty += 20;
      else if (weakCount === 2) weaknessPenalty += 8;
    });

    // Meta coverage
    const threats = getMetaThreats().slice(0, 8);
    const metaScore = threats.length ? clamp(
      threats.map(t => scoreSingleThreatMatchup(t, slots).score).reduce((a, b) => a + b, 0) / threats.length
    ) : 50;

    return clamp(Math.round(
      typeDiversity * 0.20
      + speedScore   * 0.10
      + roleScore    * 0.25
      + metaScore    * 0.30
      - weaknessPenalty * 0.15
    ) * 1.2);
  }

  function mutateTeam(slots, iterations = 3) {
    const roster = getRoster().filter(e => !e.name.startsWith("Mega ") || slots.some(s => s.name === e.name));
    let best = [...slots];
    let bestScore = scoreTeamFitness(slots);

    for (let iter = 0; iter < iterations; iter++) {
      const filled = best.filter(s => s.name);
      if (filled.length < 2) break;

      // Find the slot contributing least (swap it out)
      let worstIdx = -1, worstScore = Infinity;
      best.forEach((slot, i) => {
        if (!slot.name) return;
        const without = best.map((s, j) => j === i ? { ...s, name: "" } : s);
        const score = scoreTeamFitness(without);
        if (score > worstScore || worstScore === Infinity) { worstScore = score; worstIdx = i; }
      });
      if (worstIdx < 0) break;

      const currentNames = new Set(best.filter(s => s.name).map(s => nk(s.name)));

      // Find best replacement from meta-weighted roster
      const candidates = roster
        .filter(e => !currentNames.has(nk(e.name)) || nk(e.name) === nk(best[worstIdx].name))
        .filter(e => !nk(e.name).startsWith("mega") || e.name === best[worstIdx].name) // preserve Megas
        .sort((a, b) => {
          const wa = getMetaThreats().find(t => nk(t.name) === nk(a.name))?.weight || 0;
          const wb = getMetaThreats().find(t => nk(t.name) === nk(b.name))?.weight || 0;
          return wb - wa;
        })
        .slice(0, 20);

      let bestSwap = null, bestSwapScore = bestScore;
      for (const candidate of candidates) {
        const trial = best.map((s, i) => i === worstIdx ? { ...s, name: candidate.name } : s);
        const trialScore = scoreTeamFitness(trial);
        if (trialScore > bestSwapScore) { bestSwapScore = trialScore; bestSwap = candidate.name; }
      }

      if (bestSwap) {
        best = best.map((s, i) => i === worstIdx ? { ...s, name: bestSwap } : s);
        bestScore = bestSwapScore;
      }
    }

    return { slots: best, score: bestScore, improved: bestScore > scoreTeamFitness(slots) };
  }

  /* ─────────────────────────────────────────────────────────────
     6. SUGGESTION ENGINE
  ───────────────────────────────────────────────────────────── */

  function generateSuggestions(slots, archetype, threatGrid) {
    const suggestions = [];
    const filled = slots.filter(s => s.name);
    if (!filled.length) return ["Add some Pokémon first to get suggestions."];

    const moves = filled.flatMap(s => s.moves.map(m => nk(m)));
    const abilities = filled.map(s => nk(s.ability || ""));
    const types = new Set(filled.flatMap(s => resolveEntry(s)?.types || []));

    // Speed control
    const hasSpeedControl = moves.some(m => ["tailwind", "icywind", "electroweb", "trickroom", "thunderwave"].includes(m));
    if (!hasSpeedControl) suggestions.push("⚡ No speed control detected — add Tailwind, Icy Wind, or Trick Room.");

    // Fake Out
    const hasFakeOut = moves.includes(nk("Fake Out"));
    if (!hasFakeOut && filled.length >= 3) suggestions.push("👊 No Fake Out user — Incineroar or Sneasler improve your openers significantly.");

    // Protect
    const protectCount = moves.filter(m => m === nk("Protect")).length;
    if (protectCount === 0) suggestions.push("🛡 No Protect users — Protect is nearly mandatory in doubles for scouting and positioning.");
    else if (protectCount < 2 && filled.length >= 4) suggestions.push(`🛡 Only ${protectCount} Protect user(s) — most slots benefit from Protect access.`);

    // Redirection
    const hasRedirect = moves.some(m => ["ragepowder", "followme"].includes(m));
    const hasSetup = moves.some(m => ["swordsdance", "nastyplot", "calmmind", "dragonicane", "quiverdance"].includes(m));
    if (!hasRedirect && hasSetup) suggestions.push("🎯 You have setup moves but no redirection — Follow Me or Rage Powder helps sweepers get a free turn.");

    // Physical/Special balance
    const physicalMoves = moves.filter(m => isPhysicalMoveKey(m)).length;
    const specialMoves = moves.filter(m => isSpecialMoveKey(m)).length;
    if (physicalMoves >= specialMoves * 3 && filled.length >= 4) {
      suggestions.push("⚖ Team is very physically oriented — add a special attacker to punish Intimidate stacking.");
    }
    if (specialMoves >= physicalMoves * 3 && filled.length >= 4) {
      suggestions.push("⚖ Team is very specially oriented — add a physical attacker to handle Assault Vest / SpD walls.");
    }

    // TR speed check
    if (archetype.warnings?.length) {
      archetype.warnings.forEach(w => suggestions.push(`🔀 ${w}`));
    }

    // Threat-based suggestions
    const threats = getMetaThreats().slice(0, 12);
    const badMatchups = threats.filter(t => scoreSingleThreatMatchup(t, slots).label === "Bad");
    if (badMatchups.length >= 3) {
      const types = [...new Set(badMatchups.flatMap(t => t.types))];
      suggestions.push(`⚠ Bad matchups vs ${badMatchups.map(t => t.name).slice(0, 3).join(", ")} — consider adding ${types.slice(0, 2).join(" or ")} coverage.`);
    }

    // Mega check
    const hasMega = filled.some(s => s.name.startsWith("Mega "));
    if (!hasMega && filled.length >= 5) {
      suggestions.push("💎 No Mega Evolution — adding one significantly boosts team power in Champions format.");
    }

    // Item clause
    const items = filled.map(s => nk(s.item || "")).filter(Boolean);
    const dupeItems = items.filter((item, i) => items.indexOf(item) !== i);
    if (dupeItems.length) {
      suggestions.push(`🚫 Item clause violation — duplicate item(s) detected. Each slot needs a unique item.`);
    }

    return suggestions.length ? suggestions : ["✅ Team looks solid! Fine-tune move choices and lead matchups."];
  }

  function isPhysicalMoveKey(mk) {
    return ["punch", "kick", "edge", "slide", "quake", "jab", "claw", "crash", "fang", "slam", "blade", "combat", "drill", "rush", "smash", "sneak", "charge", "press"].some(f => mk.includes(f));
  }
  function isSpecialMoveKey(mk) {
    return ["beam", "bolt", "blast", "wave", "pulse", "ball", "gleam", "storm", "voice", "song", "wind", "hex", "draco", "moonblast", "blizzard", "thunder", "heat", "flamethrower", "hydropump"].some(f => mk.includes(f));
  }

  /* ─────────────────────────────────────────────────────────────
     7. TEAM COMPARISON TOOL
  ───────────────────────────────────────────────────────────── */

  let savedCompareTeam = null;

  function buildComparePanel() {
    const slots = getFilledSlots();
    const current = scoreTeamFitness(getTeamSlots());
    const archA = classifyArchetype(getTeamSlots());

    if (!savedCompareTeam) {
      return `
        <div class="e2-compare">
          <p class="muted">Save the current team as Team A, then build a second team and compare.</p>
          <button class="action-button ghost" id="e2-save-compare-a">Save Current as Team A</button>
        </div>`;
    }

    const scoreA = scoreTeamFitness(savedCompareTeam);
    const scoreB = current;
    const archB = classifyArchetype(getTeamSlots());
    const winner = scoreA >= scoreB ? "A" : "B";

    return `
      <div class="e2-compare">
        <div class="e2-compare-grid">
          <div class="e2-compare-col">
            <p class="e2-compare-label">Team A (saved)</p>
            <p class="e2-compare-names">${savedCompareTeam.filter(s => s.name).map(s => s.name).join(", ") || "—"}</p>
            <p class="e2-compare-arch">${classifyArchetype(savedCompareTeam).label}</p>
            <p class="e2-compare-score ${winner === "A" ? "e2-winner" : ""}">${scoreA}/100</p>
          </div>
          <div class="e2-compare-vs">VS</div>
          <div class="e2-compare-col">
            <p class="e2-compare-label">Team B (current)</p>
            <p class="e2-compare-names">${getFilledSlots().map(s => s.name).join(", ") || "—"}</p>
            <p class="e2-compare-arch">${archB.label}</p>
            <p class="e2-compare-score ${winner === "B" ? "e2-winner" : ""}">${scoreB}/100</p>
          </div>
        </div>
        <p class="e2-compare-verdict">Team ${winner} scores higher. ${winner === "A" ? "Current team has room to improve." : "Good improvement from the saved version!"}</p>
        <button class="action-button ghost" id="e2-save-compare-a" style="margin-top:8px;">Update Team A with Current</button>
      </div>`;
  }

  /* ─────────────────────────────────────────────────────────────
     8. PLAYSTYLE LEARNER
  ───────────────────────────────────────────────────────────── */

  function recordPlaystyle(archetype) {
    const history = localStore("mbwr-playstyle-v1") || { archetypes: [], analyses: 0 };
    history.analyses++;
    if (archetype.label) {
      history.archetypes.push(archetype.label);
      if (history.archetypes.length > 20) history.archetypes.shift();
    }
    localStore("mbwr-playstyle-v1", history);
    return history;
  }

  function getPlaystyleProfile() {
    const history = localStore("mbwr-playstyle-v1") || { archetypes: [], analyses: 0 };
    const counts = {};
    history.archetypes.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted[0]?.[0] || "Unknown";
    return { top, counts, analyses: history.analyses };
  }

  /* ─────────────────────────────────────────────────────────────
     9. META SHIFT DETECTOR
  ───────────────────────────────────────────────────────────── */

  function checkMetaShift() {
    const snapshot = localStore("mbwr-meta-snapshot-v1");
    const current = getMetaThreats().slice(0, 10).map(t => ({ name: t.name, weight: t.weight }));
    if (!snapshot) {
      localStore("mbwr-meta-snapshot-v1", { threats: current, ts: Date.now() });
      return null;
    }
    const daysSince = (Date.now() - snapshot.ts) / 86400000;
    if (daysSince < 1) return null;

    const shifts = [];
    current.forEach(cur => {
      const old = snapshot.threats.find(t => t.name === cur.name);
      if (!old) { shifts.push(`${cur.name} entered the top 10`); return; }
      const delta = cur.weight - old.weight;
      if (Math.abs(delta) >= 5) {
        shifts.push(`${cur.name}: ${delta > 0 ? "▲" : "▼"}${Math.abs(delta).toFixed(1)}% usage`);
      }
    });

    localStore("mbwr-meta-snapshot-v1", { threats: current, ts: Date.now() });
    return shifts.length ? shifts : null;
  }

  /* ─────────────────────────────────────────────────────────────
     10. ANALYSIS DASHBOARD — injects into existing UI
  ───────────────────────────────────────────────────────────── */

  function buildDashboard() {
    const slots = getTeamSlots();
    const filled = slots.filter(s => s.name);
    const archetype = classifyArchetype(slots);
    const suggestions = generateSuggestions(slots, archetype, null);
    const fitnessScore = scoreTeamFitness(slots);
    const playstyle = getPlaystyleProfile();

    recordPlaystyle(archetype);

    const threatGrid = buildThreatCoverageGrid(slots);
    const leads = buildLeadOptimizer(slots);
    const comparison = buildComparePanel();

    const archetypeColor = archetype.label.includes("TR") ? "#7bc8ff"
      : archetype.label.includes("Rain") ? "#4d90d5"
      : archetype.label.includes("Sun") ? "#ff7036"
      : archetype.label.includes("Offense") ? "#ff8878"
      : "#c89bff";

    const fitnessColor = fitnessScore >= 70 ? "#42d4a0" : fitnessScore >= 45 ? "#c89bff" : "#ff8878";

    return `
      <div class="e2-dashboard">

        <div class="e2-section">
          <div class="e2-section-head">
            <span class="e2-section-title">Team Identity</span>
            <span class="e2-score-badge" style="background:${archetypeColor}22;color:${archetypeColor};border-color:${archetypeColor}44;">${archetype.label}</span>
            <span class="e2-score-badge" style="background:${fitnessColor}22;color:${fitnessColor};border-color:${fitnessColor}44;">Engine score: ${fitnessScore}/100</span>
          </div>
          <div class="e2-arch-tags">
            ${archetype.tags.map(t => `<span class="e2-tag">${t}</span>`).join("")}
          </div>
          ${archetype.warnings?.length
            ? `<div class="e2-warnings">${archetype.warnings.map(w => `<div class="e2-warn">⚠ ${w}</div>`).join("")}</div>`
            : ""}
          <p class="e2-muted">Your playstyle: <strong>${playstyle.top}</strong> (${playstyle.analyses} team${playstyle.analyses !== 1 ? "s" : ""} analyzed)</p>
        </div>

        <div class="e2-section">
          <div class="e2-section-head"><span class="e2-section-title">Smart Suggestions</span></div>
          <ul class="e2-suggestion-list">
            ${suggestions.map(s => `<li class="e2-suggestion">${s}</li>`).join("")}
          </ul>
          <div class="e2-btn-row">
            <button class="action-button accent" id="e2-improve-btn">🧬 Improve My Team</button>
          </div>
        </div>

        <div class="e2-section">
          <div class="e2-section-head"><span class="e2-section-title">Threat Coverage</span></div>
          ${threatGrid}
        </div>

        <div class="e2-section">
          <div class="e2-section-head"><span class="e2-section-title">Lead Optimizer</span></div>
          ${leads}
        </div>

        <div class="e2-section">
          <div class="e2-section-head"><span class="e2-section-title">Team Comparison</span></div>
          ${comparison}
        </div>

        <div class="e2-section">
          <div class="e2-section-head"><span class="e2-section-title">Format</span></div>
          <div class="e2-ruleset-row">
            ${Object.values(RULESETS).map(r => `
              <button class="e2-ruleset-btn ${activeRuleset === r.id ? "e2-ruleset-btn--active" : ""}"
                data-ruleset="${r.id}">${r.label}</button>
            `).join("")}
          </div>
          <p class="e2-muted">${getRuleset().description}</p>
        </div>

      </div>`;
  }

  /* ─────────────────────────────────────────────────────────────
     UI INJECTION — adds Engine 2 panel below existing analysis
  ───────────────────────────────────────────────────────────── */

  function injectDashboardPanel() {
    const analysisPanel = document.getElementById("team-analysis");
    if (!analysisPanel) return;

    // Remove existing e2 panel if present
    const existing = document.getElementById("e2-panel");
    if (existing) existing.remove();

    const panel = document.createElement("section");
    panel.id = "e2-panel";
    panel.className = "e2-panel result-panel";
    panel.innerHTML = `
      <div class="e2-header">
        <span class="e2-badge">ENGINE 2</span>
        <span class="e2-title">Competitive Intelligence</span>
        <button class="e2-toggle" id="e2-toggle-btn">▼ Expand</button>
      </div>
      <div id="e2-body" class="e2-body e2-collapsed"></div>`;
    analysisPanel.parentNode.insertBefore(panel, analysisPanel.nextSibling);

    // Toggle button
    const toggleBtn = document.getElementById("e2-toggle-btn");
    const body = document.getElementById("e2-body");
    let expanded = false;
    toggleBtn?.addEventListener("click", () => {
      expanded = !expanded;
      body.classList.toggle("e2-collapsed", !expanded);
      toggleBtn.textContent = expanded ? "▲ Collapse" : "▼ Expand";
      if (expanded && !body.innerHTML.trim()) {
        body.innerHTML = buildDashboard();
        bindDashboardEvents();
      }
    });
  }

  function refreshDashboard() {
    const body = document.getElementById("e2-body");
    if (!body || body.classList.contains("e2-collapsed")) return;
    body.innerHTML = buildDashboard();
    bindDashboardEvents();
  }

  function bindDashboardEvents() {
    // Improve My Team
    document.getElementById("e2-improve-btn")?.addEventListener("click", async () => {
      const btn = document.getElementById("e2-improve-btn");
      if (btn) { btn.textContent = "🧬 Optimizing..."; btn.disabled = true; }

      const slots = getTeamSlots();
      const result = mutateTeam(slots, 4);

      // Apply improvements to UI
      for (let i = 0; i < 6; i++) {
        const newSlot = result.slots[i];
        const slotEl = document.querySelector(`.team-slot[data-slot="${i}"]`);
        if (slotEl && newSlot.name !== slots[i].name && newSlot.name) {
          slotEl.value = newSlot.name;
          slotEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }

      // Trigger app analysis
      setTimeout(() => {
        document.getElementById("build-team")?.click();
        if (btn) { btn.textContent = result.improved ? "✓ Team improved!" : "✓ Already optimal"; btn.disabled = false; }
      }, 500);
    });

    // Save Compare Team A
    document.getElementById("e2-save-compare-a")?.addEventListener("click", () => {
      savedCompareTeam = getTeamSlots();
      refreshDashboard();
    });

    // Ruleset buttons
    document.querySelectorAll(".e2-ruleset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setRuleset(btn.dataset.ruleset);
        refreshDashboard();
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     TOOLBAR — adds Engine 2 section to the teambuilder actions
  ───────────────────────────────────────────────────────────── */

  function injectToolbar() {
    const existingToolbar = document.getElementById("e2-toolbar");
    if (existingToolbar) return;

    const actionRow = document.querySelector(".team-builder-grid")?.parentElement?.querySelector(".inline-actions");
    if (!actionRow) return;

    const toolbar = document.createElement("div");
    toolbar.id = "e2-toolbar";
    toolbar.className = "e2-toolbar";
    toolbar.innerHTML = `
      <span class="e2-toolbar-label">Engine 2:</span>
      <button class="action-button ghost e2-toolbar-btn" id="e2-run-btn">📊 Run Analysis</button>
      <span class="e2-ruleset-badge" id="e2-ruleset-badge">${getRuleset().label}</span>`;
    actionRow.parentNode.insertBefore(toolbar, actionRow.nextSibling);

    document.getElementById("e2-run-btn")?.addEventListener("click", () => {
      injectDashboardPanel();
      // Force expand
      const body = document.getElementById("e2-body");
      const btn = document.getElementById("e2-toggle-btn");
      if (body && body.classList.contains("e2-collapsed")) {
        body.classList.remove("e2-collapsed");
        if (btn) btn.textContent = "▲ Collapse";
        body.innerHTML = buildDashboard();
        bindDashboardEvents();
      } else {
        refreshDashboard();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     META SHIFT BANNER
  ───────────────────────────────────────────────────────────── */

  function checkAndShowMetaShiftBanner() {
    const shifts = checkMetaShift();
    if (!shifts || !shifts.length) return;
    const existing = document.getElementById("e2-meta-banner");
    if (existing) return;

    const banner = document.createElement("div");
    banner.id = "e2-meta-banner";
    banner.className = "e2-meta-banner";
    banner.innerHTML = `
      <strong>📈 Meta Shift Detected</strong>
      <span>${shifts.slice(0, 3).join(" · ")}</span>
      <button class="e2-meta-banner-close" id="e2-banner-close">✕</button>`;
    document.querySelector(".hero")?.parentNode?.insertBefore(banner, document.querySelector(".tab-bar"));
    document.getElementById("e2-banner-close")?.addEventListener("click", () => banner.remove());
  }

  /* ─────────────────────────────────────────────────────────────
     CSS INJECTION
  ───────────────────────────────────────────────────────────── */

  function injectStyles() {
    if (document.getElementById("e2-styles")) return;
    const style = document.createElement("style");
    style.id = "e2-styles";
    style.textContent = `
      /* ── Engine 2 Panel ── */
      .e2-panel { margin-top: 20px; border: 1px solid rgba(176,110,255,0.3); border-radius: 20px; overflow: hidden; background: rgba(12,8,26,0.85); }
      .e2-header { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: rgba(26,16,48,0.9); border-bottom: 1px solid rgba(176,110,255,0.2); flex-wrap: wrap; }
      .e2-badge { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; background: linear-gradient(135deg,#ff3d9a,#b06eff); color: #fff; padding: 3px 9px; border-radius: 999px; }
      .e2-title { font-family: "Cinzel", serif; font-size: 1rem; color: var(--text); flex: 1; }
      .e2-toggle { background: none; border: 1px solid rgba(176,110,255,0.3); color: var(--muted); cursor: pointer; font-size: 0.82rem; padding: 5px 12px; border-radius: 999px; font-family: inherit; transition: border-color 150ms; }
      .e2-toggle:hover { border-color: var(--accent-vivid); color: var(--text); }
      .e2-body { padding: 0 20px 20px; }
      .e2-collapsed { display: none; }

      /* ── Dashboard ── */
      .e2-dashboard { display: flex; flex-direction: column; gap: 20px; padding-top: 16px; }
      .e2-section { background: rgba(18,12,34,0.6); border: 1px solid rgba(176,110,255,0.15); border-radius: 14px; padding: 16px 18px; }
      .e2-section-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
      .e2-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
      .e2-score-badge { font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; border: 1px solid transparent; }
      .e2-muted { font-size: 0.82rem; color: var(--muted); margin: 8px 0 0; }

      /* ── Archetype ── */
      .e2-arch-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
      .e2-tag { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: rgba(176,110,255,0.12); color: var(--accent-vivid); border: 1px solid rgba(176,110,255,0.22); }
      .e2-warnings { margin-top: 8px; }
      .e2-warn { font-size: 0.82rem; color: #ffcc70; padding: 6px 10px; background: rgba(255,170,50,0.10); border-radius: 8px; margin-bottom: 4px; border: 1px solid rgba(255,170,50,0.22); }

      /* ── Suggestions ── */
      .e2-suggestion-list { list-style: none; padding: 0; margin: 0 0 12px; }
      .e2-suggestion { font-size: 0.84rem; color: var(--text); padding: 7px 0; border-bottom: 1px solid rgba(176,110,255,0.10); line-height: 1.5; }
      .e2-suggestion:last-child { border-bottom: none; }
      .e2-btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }

      /* ── Threat Grid ── */
      .e2-threat-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
      .e2-pill { font-size: 0.75rem; font-weight: 600; padding: 4px 12px; border-radius: 999px; }
      .e2-pill--good { background: rgba(66,212,160,0.12); color: #42d4a0; border: 1px solid rgba(66,212,160,0.25); }
      .e2-pill--bad  { background: rgba(255,80,80,0.12);  color: #ff8878; border: 1px solid rgba(255,80,80,0.25); }
      .e2-threat-grid { display: flex; flex-direction: column; gap: 7px; }
      .e2-threat-row { display: grid; grid-template-columns: 130px 80px 1fr 60px; align-items: center; gap: 10px; }
      .e2-threat-name { font-size: 0.82rem; font-weight: 600; color: var(--text); }
      .e2-threat-usage { font-size: 0.72rem; color: var(--muted); }
      .e2-threat-bar-wrap { height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
      .e2-threat-bar { height: 100%; border-radius: 999px; transition: width 400ms ease; }
      .e2-threat-label { font-size: 0.72rem; font-weight: 700; text-align: right; }

      /* ── Leads ── */
      .e2-leads { display: flex; flex-direction: column; gap: 8px; }
      .e2-lead-row { display: grid; grid-template-columns: 30px 1fr 55px auto; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(176,110,255,0.10); }
      .e2-lead-row:last-child { border-bottom: none; }
      .e2-lead-rank { font-size: 0.72rem; font-weight: 800; color: var(--muted); }
      .e2-lead-names { font-size: 0.84rem; font-weight: 600; color: var(--text); }
      .e2-lead-score { font-size: 0.8rem; font-weight: 700; text-align: right; }
      .e2-lead-tags { display: flex; flex-wrap: wrap; gap: 4px; }

      /* ── Comparison ── */
      .e2-compare-grid { display: grid; grid-template-columns: 1fr 40px 1fr; gap: 12px; align-items: center; text-align: center; margin-bottom: 12px; }
      .e2-compare-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 4px; }
      .e2-compare-names { font-size: 0.78rem; color: var(--text); margin: 0 0 4px; }
      .e2-compare-arch { font-size: 0.75rem; color: var(--accent-vivid); margin: 0 0 6px; }
      .e2-compare-score { font-family: "Cinzel", serif; font-size: 1.4rem; color: var(--muted); margin: 0; }
      .e2-winner { color: #42d4a0!important; }
      .e2-compare-vs { font-family: "Cinzel", serif; font-size: 1rem; color: var(--muted); }
      .e2-compare-verdict { font-size: 0.84rem; color: var(--text); text-align: center; margin: 0; }

      /* ── Ruleset ── */
      .e2-ruleset-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
      .e2-ruleset-btn { background: rgba(18,12,34,0.7); border: 1px solid var(--line); color: var(--muted); cursor: pointer; font-family: inherit; font-size: 0.82rem; padding: 7px 14px; border-radius: 999px; transition: all 150ms; }
      .e2-ruleset-btn:hover { border-color: var(--accent-vivid); color: var(--text); }
      .e2-ruleset-btn--active { background: rgba(176,110,255,0.18); border-color: var(--accent-vivid); color: var(--text); }

      /* ── Toolbar ── */
      .e2-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 12px 0; padding: 10px 16px; background: rgba(18,12,34,0.6); border: 1px solid rgba(176,110,255,0.18); border-radius: 14px; }
      .e2-toolbar-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
      .e2-toolbar-btn { padding: 8px 16px; font-size: 0.85rem; }
      .e2-ruleset-badge { font-size: 0.75rem; font-weight: 600; padding: 4px 12px; border-radius: 999px; background: rgba(176,110,255,0.12); color: var(--accent-vivid); border: 1px solid rgba(176,110,255,0.22); }

      /* ── Meta Shift Banner ── */
      .e2-meta-banner { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 10px 18px; background: rgba(255,170,50,0.10); border: 1px solid rgba(255,170,50,0.28); border-radius: 12px; margin: 0 0 14px; font-size: 0.84rem; color: #ffcc70; }
      .e2-meta-banner strong { font-family: "Cinzel", serif; font-size: 0.82rem; }
      .e2-meta-banner span { flex: 1; }
      .e2-meta-banner-close { background: none; border: none; color: #ffcc70; cursor: pointer; font-size: 1rem; padding: 0 4px; line-height: 1; }

      /* ── Mobile ── */
      @media (max-width: 720px) {
        .e2-threat-row { grid-template-columns: 100px 1fr 40px; }
        .e2-threat-usage { display: none; }
        .e2-lead-row { grid-template-columns: 28px 1fr 50px; }
        .e2-lead-tags { display: none; }
        .e2-compare-grid { grid-template-columns: 1fr 30px 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────────────────────────
     WATCH — hook into existing Analyze button
  ───────────────────────────────────────────────────────────── */

  function watchAnalyzeButton() {
    const analyzeBtn = document.getElementById("build-team");
    if (!analyzeBtn) return;

    analyzeBtn.addEventListener("click", () => {
      // After app finishes its own analysis (~800ms), refresh ours
      setTimeout(() => {
        injectDashboardPanel();
        injectToolbar();
        // Auto-expand on first analysis
        const body = document.getElementById("e2-body");
        const toggleBtn = document.getElementById("e2-toggle-btn");
        if (body && body.classList.contains("e2-collapsed") && !body.dataset.everOpened) {
          body.classList.remove("e2-collapsed");
          if (toggleBtn) toggleBtn.textContent = "▲ Collapse";
          body.innerHTML = buildDashboard();
          body.dataset.everOpened = "1";
          bindDashboardEvents();
        } else {
          refreshDashboard();
        }
      }, 850);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────────────────────── */

  function init() {
    injectStyles();
    injectToolbar();
    watchAnalyzeButton();
    checkAndShowMetaShiftBanner();

    // Refresh badge when ruleset changes
    refreshRulesetBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOMContentLoaded already fired — wait for app to finish loading
    setTimeout(init, 1200);
  }

})();


