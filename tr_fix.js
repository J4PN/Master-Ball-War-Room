(function () {
  const TR_FIX_DISABLE_FLAG = "MBWR_DEBUG_DISABLE_TR_FIX";
  const TR_INTENTS = new Set(["hard_tr", "soft_tr"]);
  const warnedTrFixApiFields = new Set();

  function isTrFixDisabled() {
    try {
      return window[TR_FIX_DISABLE_FLAG] === true || window.sessionStorage?.getItem(TR_FIX_DISABLE_FLAG) === "1";
    } catch (error) {
      console.warn("MBWR tr_fix: failed to read debug flag", error);
      return false;
    }
  }

  if (isTrFixDisabled()) {
    console.warn(`MBWR tr_fix: disabled via ${TR_FIX_DISABLE_FLAG}`);
    return;
  }

  if (window.__MBWR_TR_FIX_INITIALIZED) {
    console.warn("MBWR tr_fix: init skipped because tr_fix is already active");
    return;
  }
  window.__MBWR_TR_FIX_INITIALIZED = true;

  function api() {
    return window.MBWR_APP_API || {};
  }

  function logMissingApiField(fieldName) {
    if (warnedTrFixApiFields.has(fieldName)) return;
    warnedTrFixApiFields.add(fieldName);
    console.warn(`MBWR tr_fix: missing MBWR_APP_API.${fieldName}`);
  }

  function normalize(value) {
    if (api().normalizeNameKey) return api().normalizeNameKey(value || "");
    logMissingApiField("normalizeNameKey");
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function cloneDraft(draft) {
    return JSON.parse(JSON.stringify(draft || []));
  }

  function getPromptText() {
    const focus = document.getElementById("ai-builder-focus")?.value || "";
    const requestBox = document.getElementById("team-import-input")?.value || "";
    const tweaks = document.getElementById("ai-builder-tweaks")?.value || "";
    return `${focus} ${requestBox} ${tweaks}`.trim();
  }

  function hasPromptToken(prompt, pattern) {
    return pattern.test(prompt);
  }

  function getDraftMetrics(draft) {
    const entries = draft
      .map((set) => ({
        set,
        entry: api().getRosterEntry ? api().getRosterEntry(set.name) : (logMissingApiField("getRosterEntry"), null)
      }))
      .filter((row) => row.entry);
    const speeds = entries.map(({ entry }) => entry.baseSpeed || 0);
    const avgSpeed = speeds.length ? speeds.reduce((sum, value) => sum + value, 0) / speeds.length : 0;
    const slowCount = entries.filter(({ entry }) => (entry.baseSpeed || 0) <= 65).length;
    const fastCount = entries.filter(({ entry }) => (entry.baseSpeed || 0) >= 100).length;
    const trickRoomSetters = entries.filter(({ set }) => (set.moves || []).some((move) => normalize(move) === "trick room")).length;
    const tailwindUsers = entries.filter(({ set }) => (set.moves || []).some((move) => normalize(move) === "tailwind")).length;
    const speedControlUsers = entries.filter(({ set }) => (set.moves || []).some((move) => ["tailwind", "icy wind", "electroweb", "thunder wave"].includes(normalize(move)))).length;
    return {
      entries,
      avgSpeed,
      slowCount,
      fastCount,
      trickRoomSetters,
      tailwindUsers,
      speedControlUsers
    };
  }

  function buildIntentSummary(intent, payload, metrics) {
    const desiredTypes = Array.isArray(payload?.request?.desiredTypes) ? payload.request.desiredTypes : [];
    const typeText = desiredTypes.length ? ` Extra emphasis on ${desiredTypes.join(", ")} coverage.` : "";
    const explanationMap = {
      hard_tr: "This draft is built as a hard Trick Room shell with setters, slow abusers, and support aimed at protecting the setter.",
      soft_tr: "This draft uses a hybrid slow mode, keeping Trick Room available without giving up flexible game plans outside it.",
      tailwind: "This draft is built around speed pressure, tempo swings, and early positioning with proactive speed control.",
      rain: "This draft is built to establish rain quickly and convert that weather into immediate offensive pressure and positioning value.",
      sun: "This draft is built to establish sun, pressure the board immediately, and convert weather turns into strong attacks and support.",
      sand: "This draft is built to enable sand turns and capitalize on chip, durability, and sand-boosted pressure.",
      snow: "This draft uses snow to improve board control, defensive stability, and weather-based pressure.",
      fast_offense: "This draft leans into speed and immediate pressure so it can force tempo from turn one.",
      bulky_offense: "This draft uses sturdy attackers and flexible support so it can trade well without losing offensive momentum.",
      balance: "This draft aims for broad matchup coverage, cleaner pivoting, and enough defensive backbone to stay adaptable.",
      anti_meta: "This draft is tuned to punish common meta threats while still keeping a playable, coherent core.",
      unknown: "This draft stays flexible and avoids locking itself into a mismatched speed plan."
    };
    const speedNote = metrics.fastCount >= 3 ? " The speed profile stays proactive." : metrics.slowCount >= 3 ? " The slower pieces are supported intentionally." : "";
    return `${explanationMap[intent] || explanationMap.unknown}${typeText}${speedNote}`;
  }

  function detectIntent(payload) {
    const request = payload?.request || (api().parseBuilderRequest ? api().parseBuilderRequest(getPromptText(), document.getElementById("ai-builder-focus")?.value || "", document.getElementById("ai-builder-mode")?.value || "archetype") : { requestedModes: {}, requestedPressure: {} });
    const prompt = normalize(`${request.focus || ""} ${request.normalizedText || getPromptText()}`);
    const metrics = getDraftMetrics(payload?.draft || []);
    const trRequested = !!request.requestedModes?.trickRoom;
    const trShellDetected = trRequested || (metrics.trickRoomSetters >= 1 && metrics.slowCount >= 2);
    let detectedIntent = "unknown";
    let rejectedTrReason = "";

    if (trRequested) {
      detectedIntent = metrics.avgSpeed <= 72 && metrics.slowCount >= 3 ? "hard_tr" : "soft_tr";
      if (metrics.avgSpeed > 85) {
        detectedIntent = "soft_tr";
        rejectedTrReason = "requested Trick Room shell is too fast for hard Trick Room";
      }
    } else if (request.requestedModes?.tailwind || hasPromptToken(prompt, /\btailwind\b/)) {
      detectedIntent = "tailwind";
    } else if (request.requestedPressure?.counterMeta || hasPromptToken(prompt, /\banti meta\b|\bcounter meta\b/)) {
      detectedIntent = "anti_meta";
    } else if (hasPromptToken(prompt, /\brain\b/)) {
      detectedIntent = "rain";
    } else if (hasPromptToken(prompt, /\bsun\b/)) {
      detectedIntent = "sun";
    } else if (hasPromptToken(prompt, /\bsand\b/)) {
      detectedIntent = "sand";
    } else if (hasPromptToken(prompt, /\bsnow\b/)) {
      detectedIntent = "snow";
    } else if (hasPromptToken(prompt, /\bbulky offense\b/)) {
      detectedIntent = "bulky_offense";
    } else if (hasPromptToken(prompt, /\bfast offense\b|\bhyper offense\b/)) {
      detectedIntent = "fast_offense";
    } else if (hasPromptToken(prompt, /\bbalance\b|\bbalanced\b/)) {
      detectedIntent = "balance";
    } else if (metrics.fastCount >= 3 || metrics.avgSpeed >= 98) {
      detectedIntent = "fast_offense";
    } else if (metrics.avgSpeed >= 80) {
      detectedIntent = "bulky_offense";
    } else {
      detectedIntent = "balance";
    }

    if (!trRequested && metrics.trickRoomSetters >= 1 && !trShellDetected) {
      rejectedTrReason = rejectedTrReason || "Trick Room setter found without a real slow abuser shell";
    }
    if (detectedIntent === "hard_tr" && metrics.avgSpeed > 85) {
      detectedIntent = "soft_tr";
      rejectedTrReason = rejectedTrReason || "hard Trick Room downgraded because the team is too fast";
    }

    const summary = {
      detected_intent: detectedIntent,
      tr_requested: trRequested,
      tr_shell_detected: trShellDetected,
      avg_speed: Math.round(metrics.avgSpeed * 10) / 10,
      rejected_tr_reason: rejectedTrReason,
      slow_count: metrics.slowCount,
      fast_count: metrics.fastCount,
      trick_room_setters: metrics.trickRoomSetters,
      tailwind_users: metrics.tailwindUsers,
      speed_control_users: metrics.speedControlUsers
    };

    window.MBWR_INTENT = summary;
    console.log(summary);
    return { request, metrics, summary };
  }

  async function replaceTrickRoomSlot(set) {
    const nextSet = { ...set, moves: [...(set.moves || [])] };
    const entry = api().getRosterEntry ? api().getRosterEntry(nextSet.name) : (logMissingApiField("getRosterEntry"), null);
    const legalMoves = entry && api().getLegalMovesForEntry ? await api().getLegalMovesForEntry(entry) : [];
    const legalKeys = new Set((legalMoves || []).map((move) => normalize(move)));
    let moves = nextSet.moves.filter((move) => normalize(move) !== "trick room");
    if (legalKeys.has("protect") && !moves.some((move) => normalize(move) === "protect")) {
      moves.push("Protect");
    }
    if (moves.length < 4) {
      const fallback = (legalMoves || []).find((move) => {
        const key = normalize(move);
        return key !== "trick room" && !moves.some((picked) => normalize(picked) === key);
      });
      if (fallback) moves.push(fallback);
    }
    nextSet.moves = moves.slice(0, 4);
    return nextSet;
  }

  function shouldForceTrickRoomCleanup(payload, intentContext) {
    const request = intentContext.request || payload?.request || {};
    const explicitTr = !!request.requestedModes?.trickRoom;
    const explicitTailwind = !!request.requestedModes?.tailwind;
    const explicitWeather = !!request.promptLocks?.weather;
    const detectedIntent = intentContext.summary?.detected_intent || "unknown";
    const metrics = intentContext.metrics || {};
    if (explicitTr) return false;
    if (metrics.trickRoomSetters <= 0) return false;
    if (TR_INTENTS.has(detectedIntent)) return false;
    if (explicitTailwind || explicitWeather) return true;
    if (["tailwind", "fast_offense", "rain", "sun", "sand", "snow"].includes(detectedIntent)) return true;
    if (metrics.trickRoomSetters >= 2 && metrics.slowCount < 2) return true;
    if (metrics.trickRoomSetters >= 1 && !intentContext.summary?.tr_shell_detected) return true;
    return false;
  }

  async function validateDraft(payload) {
    const draft = cloneDraft(payload?.draft || []);
    const intentContext = detectIntent({ ...payload, draft });
    const isTrIntent = TR_INTENTS.has(intentContext.summary.detected_intent);
    let mutated = false;

    if (!isTrIntent && shouldForceTrickRoomCleanup(payload, intentContext)) {
      for (let index = 0; index < draft.length; index += 1) {
        if ((draft[index].moves || []).some((move) => normalize(move) === "trick room")) {
          draft[index] = await replaceTrickRoomSlot(draft[index]);
          mutated = true;
        }
      }
      const refreshed = detectIntent({ ...payload, draft });
      intentContext.request = refreshed.request;
      intentContext.metrics = refreshed.metrics;
      intentContext.summary = refreshed.summary;
    }

    if (intentContext.summary.detected_intent === "hard_tr" && intentContext.summary.avg_speed > 85) {
      intentContext.summary.detected_intent = "soft_tr";
      intentContext.summary.rejected_tr_reason = intentContext.summary.rejected_tr_reason || "hard Trick Room downgraded because the team is too fast";
      window.MBWR_INTENT = intentContext.summary;
    }

    const evaluation = api().evaluateTeamState && api().padTeamState
      ? await api().evaluateTeamState(api().padTeamState(draft))
      : payload?.evaluation;
    if (!api().evaluateTeamState || !api().padTeamState) {
      if (!api().evaluateTeamState) logMissingApiField("evaluateTeamState");
      if (!api().padTeamState) logMissingApiField("padTeamState");
    }

    console.log("[MBWR] tr_fix:validate", {
      names: draft.map((set) => set.name),
      mutated,
      detectedIntent: intentContext.summary.detected_intent,
      trRequested: intentContext.summary.tr_requested,
      trShellDetected: intentContext.summary.tr_shell_detected,
      rejectedTrReason: intentContext.summary.rejected_tr_reason || ""
    });

    return {
      draft,
      evaluation,
      explanation: buildIntentSummary(intentContext.summary.detected_intent, payload, intentContext.metrics),
      summary: intentContext.summary
    };
  }

  function patchTextLeaks(root) {
    if (!root || TR_INTENTS.has(window.MBWR_INTENT?.detected_intent)) return;
    const patched = root.innerHTML
      .replace(/adds a slow mode/gi, "offers alternate speed control")
      .replace(/Add either a Trick Room mode or at least a couple of slow backup pieces\./gi, "Add more speed control - Tailwind, Icy Wind, Electroweb, or a Trick Room mode if the team is built slow.")
      .replace(/backup slow mode/gi, "secondary speed control plan")
      .replace(/Fits the slower Trick Room pacing\./gi, "Fits a lower-speed positioning plan without forcing Trick Room.");
    if (patched !== root.innerHTML) root.innerHTML = patched;
  }

  function patchAiBuilderExplanation() {
    const panel = document.getElementById("ai-builder-output");
    if (!panel) return;
    patchTextLeaks(panel);
    const explanationNode = panel.querySelector(".result-copy");
    if (!explanationNode || !window.MBWR_INTENT) return;
    const metrics = getDraftMetrics(readRenderedDraft());
    const nextText = buildIntentSummary(window.MBWR_INTENT.detected_intent, {}, metrics);
    if (explanationNode.textContent !== nextText) explanationNode.textContent = nextText;
  }

  function readRenderedDraft() {
    return Array.from(document.querySelectorAll("#ai-builder-output .analysis-chip")).map((chip) => {
      const strong = chip.querySelector("strong");
      const lines = chip.innerText.split("\n").map((line) => line.trim()).filter(Boolean);
      const movesLine = lines.find((line) => line.includes(" / ")) || "";
      return {
        name: strong?.textContent?.trim() || "",
        moves: movesLine ? movesLine.split("/").map((move) => move.trim()) : []
      };
    }).filter((set) => set.name);
  }

  function installObservers() {
    ["team-analysis", "ai-builder-output"].forEach((id) => {
      const node = document.getElementById(id);
      if (!node || node.dataset.trFixObserved === "true") return;
      const observer = new MutationObserver(() => {
        patchTextLeaks(node);
        if (id === "ai-builder-output") patchAiBuilderExplanation();
      });
      observer.observe(node, { childList: true, subtree: true, characterData: true });
      node.dataset.trFixObserved = "true";
      patchTextLeaks(node);
    });
  }

  window.MBWR_ON_DRAFT_GENERATED = async function (payload) {
    const result = await validateDraft(payload);
    setTimeout(() => {
      patchAiBuilderExplanation();
      patchTextLeaks(document.getElementById("team-analysis"));
    }, 0);
    return {
      draft: result.draft,
      evaluation: result.evaluation
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installObservers, { once: true });
  } else {
    installObservers();
  }
})();
