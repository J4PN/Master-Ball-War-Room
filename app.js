(function () {
  const SP_MAX_PER_STAT = 32;
  const SP_MAX_TOTAL = 66;
  const statOrder = ["hp", "atk", "def", "spa", "spd", "spe"];
  const statLabels = { hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe" };
  const EXPORT_TYPE_ICON_PATHS = {
    Normal: "./assets/types/normal.svg",
    Fire: "./assets/types/fire.svg",
    Water: "./assets/types/water.svg",
    Electric: "./assets/types/electric.svg",
    Grass: "./assets/types/grass.svg",
    Ice: "./assets/types/ice.svg",
    Fighting: "./assets/types/fighting.svg",
    Poison: "./assets/types/poison.svg",
    Ground: "./assets/types/ground.svg",
    Flying: "./assets/types/flying.svg",
    Psychic: "./assets/types/psychic.svg",
    Bug: "./assets/types/bug.svg",
    Rock: "./assets/types/rock.svg",
    Ghost: "./assets/types/ghost.svg",
    Dragon: "./assets/types/dragon.svg",
    Dark: "./assets/types/dark.svg",
    Steel: "./assets/types/steel.svg",
    Fairy: "./assets/types/fairy.svg"
  };
  const EXPORT_STAT_BAR_COLORS = {
    hp: "#ef6f6c",
    atk: "#f59e42",
    def: "#f4d35e",
    spa: "#5fa8ff",
    spd: "#5bc98c",
    spe: "#ef7cc7"
  };
  const natures = [
    "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
    "Bold", "Docile", "Relaxed", "Impish", "Lax",
    "Timid", "Hasty", "Serious", "Jolly", "Naive",
    "Modest", "Mild", "Quiet", "Bashful", "Rash",
    "Calm", "Gentle", "Sassy", "Careful", "Quirky"
  ];
  const natureEffects = {
    Hardy: ["", ""], Lonely: ["Atk", "Def"], Brave: ["Atk", "Spe"], Adamant: ["Atk", "SpA"], Naughty: ["Atk", "SpD"],
    Bold: ["Def", "Atk"], Docile: ["", ""], Relaxed: ["Def", "Spe"], Impish: ["Def", "SpA"], Lax: ["Def", "SpD"],
    Timid: ["Spe", "Atk"], Hasty: ["Spe", "Def"], Serious: ["", ""], Jolly: ["Spe", "SpA"], Naive: ["Spe", "SpD"],
    Modest: ["SpA", "Atk"], Mild: ["SpA", "Def"], Quiet: ["SpA", "Spe"], Bashful: ["", ""], Rash: ["SpA", "SpD"],
    Calm: ["SpD", "Atk"], Gentle: ["SpD", "Def"], Sassy: ["SpD", "Spe"], Careful: ["SpD", "SpA"], Quirky: ["", ""]
  };
  const PIKALYTICS_SOURCES = {
    tournaments: "https://www.pikalytics.com/pokedex/championstournaments",
    preview: "https://www.pikalytics.com/pokedex/championspreview"
  };
  const META_REFRESH_INTERVAL_MS = 48 * 60 * 60 * 1000;
  const META_CACHE_KEY = "champions-meta-cache-v1";
  const META_CACHE_TS_KEY = "champions-meta-cache-ts-v1";
  const HOSTED_DAMAGE_CALC_URL = "https://damage-calc.onrender.com/calculate";
  const MOVE_POLICY_PATH = "./pokemon_move_discourage_policy.json";
  const DEFAULT_MIN_MEGAS = 1;
  const DEFAULT_MAX_MEGAS = 2;
  const GUIDED_BUILD_TARGET_SCORE = 75;
  const GUIDED_BUILD_GOAL_SCORE = 80;
  const GUIDED_PREFILTER_LIMIT = 18;
  const GUIDED_LIVE_CANDIDATE_LIMIT = 10;
  const GUIDED_OPTIMIZATION_PASSES = 6;
  const GUIDED_SLOT_REVIEW_COUNT = 3;
  const LIVE_PRESSURE_TYPES = ["Water", "Fire", "Electric", "Fighting", "Poison"];
  const LIVE_WAR_ROOM_MEDIUM_DEBOUNCE_MS = 180;
  const LIVE_WAR_ROOM_SLOW_DEBOUNCE_MS = 420;
  const DEBUG_DISABLE_FLAGS = {
    patch: "MBWR_DEBUG_DISABLE_PATCH",
    engine2: "MBWR_DEBUG_DISABLE_ENGINE2",
    trFix: "MBWR_DEBUG_DISABLE_TR_FIX"
  };
  const pikalyticsMetaSeed = [
    { name: "Incineroar", weight: 54.4, tags: ["fakeout", "intimidate", "pivot"] },
    { name: "Sneasler", weight: 45.1, tags: ["fakeout", "speed"] },
    { name: "Garchomp", weight: 37.1, tags: ["spread", "ground"] },
    { name: "Sinistcha", weight: 34.6, tags: ["redirection", "support"] },
    { name: "Kingambit", weight: 27.0, tags: ["dark", "priority"] },
    { name: "Basculegion", weight: 22.1, tags: ["water", "priority"] },
    { name: "Whimsicott", weight: 20.1, tags: ["tailwind", "support"] },
    { name: "Charizard", weight: 17.8, tags: ["sun", "mega"] },
    { name: "Mega Floette", weight: 17.8, tags: ["fairy", "special"] },
    { name: "Rotom-Wash", weight: 16.0, tags: ["pivot", "electric", "water"] },
    { name: "Pelipper", weight: 16.0, tags: ["rain", "tailwind"] },
    { name: "Tyranitar", weight: 15.4, tags: ["sand", "mega"] },
    { name: "Dragonite", weight: 13.7, tags: ["priority", "setup"] },
    { name: "Archaludon", weight: 12.8, tags: ["special", "bulky"] },
    { name: "Gengar", weight: 12.3, tags: ["special", "ghost"] },
    { name: "Farigiraf", weight: 11.6, tags: ["support", "priority-block"] }
  ];
  const LEARNED_DATA_FILES = {
    learnedWeights: "./data/learned_weights.json",
    speciesRolePriors: "./data/species_role_priors.json",
    moveChoiceWeights: "./data/move_choice_weights.json",
    threatPenalties: "./data/threat_penalties.json",
    teamArchive: "./data/team_archive.json",
    sourceMetaSnapshot: "./data/normalized/source_meta_snapshot.json",
    combinedTrainingPool: "./data/normalized/combined_training_pool.json"
  };
  const DEFAULT_LEARNED_BUILDER_DATA = {
    learnedWeights: {
      version: 1,
      updatedAt: null,
      candidateScoreWeights: {
        rolePrior: 6,
        moveWeight: 4,
        threatPenalty: 12,
        archiveBias: 3
      },
      leadPairBias: {
        fakeOut: 0,
        speedControl: 0
      },
      threatSeverityWeights: {
        default: 1,
        byThreat: {}
      }
    },
    speciesRolePriors: {
      updatedAt: null,
      priors: {}
    },
    moveChoiceWeights: {
      updatedAt: null,
      weights: {}
    },
    threatPenalties: {
      updatedAt: null,
      byThreat: {}
    },
    teamArchive: {
      updatedAt: null,
      teams: []
    },
    sourceMetaSnapshot: {
      updatedAt: null,
      threats: [],
      sources: []
    },
    combinedTrainingPool: {
      updatedAt: null,
      teams: []
    }
  };

  function cloneLearnedBuilderDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_LEARNED_BUILDER_DATA));
  }

  const learnedBuilderState = {
    data: cloneLearnedBuilderDefaults(),
    loaded: false,
    promise: null
  };

  async function primeLearnedBuilderData() {
    if (learnedBuilderState.promise) return learnedBuilderState.promise;
    if (typeof fetch !== "function") {
      learnedBuilderState.loaded = true;
      learnedBuilderState.promise = Promise.resolve(learnedBuilderState.data);
      return learnedBuilderState.promise;
    }
    learnedBuilderState.promise = Promise.allSettled(
      Object.entries(LEARNED_DATA_FILES).map(async ([key, path]) => {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) throw new Error(`${key}:${response.status}`);
        return { key, payload: await response.json() };
      })
    ).then((results) => {
      const merged = cloneLearnedBuilderDefaults();
      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const { key, payload } = result.value;
        if (payload && typeof payload === "object") merged[key] = payload;
      });
      learnedBuilderState.data = merged;
      learnedBuilderState.loaded = true;
      return merged;
    }).catch(() => {
      learnedBuilderState.data = cloneLearnedBuilderDefaults();
      learnedBuilderState.loaded = true;
      return learnedBuilderState.data;
    });
    return learnedBuilderState.promise;
  }

  function getLearnedBuilderData() {
    return learnedBuilderState.data || DEFAULT_LEARNED_BUILDER_DATA;
  }

  function clampLearnedNumber(value, fallback = 0, min = -5, max = 5) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  function getLearnedRolePriorWeight(speciesName) {
    const priors = getLearnedBuilderData().speciesRolePriors?.priors || {};
    const row = priors[normalizeNameKey(speciesName || "")];
    if (row?.weight != null) return clampLearnedNumber(row.weight, 0, -1, 1);
    const combinedPool = getLearnedBuilderData().combinedTrainingPool?.teams || [];
    const key = normalizeNameKey(speciesName || "");
    const hits = combinedPool.filter((teamRow) => (teamRow?.team || []).some((slot) => normalizeNameKey(slot?.name || "") === key)).length;
    if (!combinedPool.length) return 0;
    return clampLearnedNumber(hits / combinedPool.length, 0, -1, 1);
  }

  function getLearnedMoveWeight(moveName) {
    const weights = getLearnedBuilderData().moveChoiceWeights?.weights || {};
    return clampLearnedNumber(weights[normalizeNameKey(moveName || "")], 0, -1, 1);
  }

  function getLearnedThreatPenaltyMultiplier(threatName) {
    const threatWeights = getLearnedBuilderData().learnedWeights?.threatSeverityWeights || {};
    const directPenalties = getLearnedBuilderData().threatPenalties?.byThreat || {};
    const sourceSnapshot = getLearnedBuilderData().sourceMetaSnapshot?.threats || [];
    const key = normalizeNameKey(threatName || "");
    const severityWeight = clampLearnedNumber(threatWeights.byThreat?.[key], threatWeights.default ?? 1, 0.5, 2);
    const directWeight = clampLearnedNumber(directPenalties[key]?.multiplier, 1, 0.5, 2);
    const sourceThreat = sourceSnapshot.find((row) => normalizeNameKey(row?.name || "") === key);
    const sourceWeight = clampLearnedNumber(sourceThreat?.importance, 1, 0.5, 2);
    return Math.max(0.5, Math.min(2.5, severityWeight * directWeight * sourceWeight));
  }

  function isDebugFlagEnabled(flagName) {
    try {
      if (window[flagName] === true) return true;
      if (window.sessionStorage?.getItem(flagName) === "1") return true;
    } catch (error) {
      console.warn("[MBWR] debug:flag-check-failed", { flagName, error });
    }
    return false;
  }

  function logBuilderEvent(eventName, payload) {
    if (payload === undefined) {
      console.log(`[MBWR] ${eventName}`);
      return;
    }
    console.log(`[MBWR] ${eventName}`, payload);
  }
  const META_MOVESET_SEED = {
    "Incineroar":   { moves: ["Fake Out", "Flare Blitz", "Parting Shot", "Knock Off"], item: "Sitrus Berry", ability: "Intimidate", nature: "Careful" },
    "Sneasler":     { moves: ["Dire Claw", "Close Combat", "Fake Out", "Protect"], item: "White Herb", ability: "Unburden", nature: "Adamant" },
    "Garchomp":     { moves: ["Earthquake", "Rock Slide", "Dragon Claw", "Protect"], item: "Choice Scarf", ability: "Rough Skin", nature: "Jolly" },
    "Sinistcha":    { moves: ["Matcha Gotcha", "Shadow Ball", "Rage Powder", "Protect"], item: "Leftovers", ability: "Hospitality", nature: "Sassy" },
    "Kingambit":    { moves: ["Sucker Punch", "Kowtow Cleave", "Low Kick", "Protect"], item: "Black Glasses", ability: "Defiant", nature: "Adamant" },
    "Basculegion":  { moves: ["Last Respects", "Wave Crash", "Flip Turn", "Aqua Jet"], item: "Choice Scarf", ability: "Adaptability", nature: "Adamant" },
    "Whimsicott":   { moves: ["Tailwind", "Moonblast", "Encore", "Protect"], item: "Focus Sash", ability: "Prankster", nature: "Timid" },
    "Charizard":    { moves: ["Heat Wave", "Air Slash", "Weather Ball", "Protect"], item: "Charizardite Y", ability: "Blaze", nature: "Timid" },
    "Pelipper":     { moves: ["Hurricane", "Muddy Water", "Tailwind", "Protect"], item: "Choice Scarf", ability: "Drizzle", nature: "Timid" },
    "Tyranitar":    { moves: ["Rock Slide", "Crunch", "Ice Punch", "Protect"], item: "Tyranitarite", ability: "Sand Stream", nature: "Adamant" },
    "Dragonite":    { moves: ["Extreme Speed", "Dragon Claw", "Fire Punch", "Protect"], item: "Dragoninite", ability: "Multiscale", nature: "Adamant" },
    "Archaludon":   { moves: ["Electro Shot", "Dragon Pulse", "Flash Cannon", "Protect"], item: "Magnet", ability: "Stamina", nature: "Modest" },
    "Gengar":       { moves: ["Shadow Ball", "Sludge Bomb", "Icy Wind", "Protect"], item: "Focus Sash", ability: "Cursed Body", nature: "Timid" },
    "Farigiraf":    { moves: ["Trick Room", "Hyper Voice", "Psychic Noise", "Protect"], item: "Mental Herb", ability: "Armor Tail", nature: "Sassy" },
  };
  const HARD_LEGAL_ITEMS = [
    "Abomasite", "Absolite", "Aerodactylite", "Aggronite", "Alakazite", "Altarianite", "Ampharosite", "Aspear Berry",
    "Audinite", "Babiri Berry", "Banettite", "Beedrillite", "Black Belt", "Black Glasses", "Blastoisinite", "Bright Powder",
    "Cameruptite", "Chandelurite", "Charcoal", "Charizardite X", "Charizardite Y", "Charti Berry", "Cheri Berry", "Chesnaughtite",
    "Chesto Berry", "Chilan Berry", "Chimechite", "Choice Scarf", "Chople Berry", "Clefablite", "Coba Berry", "Colbur Berry",
    "Crabominite", "Delphoxite", "Dragon Fang", "Dragoninite", "Drampanite", "Emboarite", "Excadrite", "Fairy Feather",
    "Feraligite", "Floettite", "Focus Band", "Focus Sash", "Froslassite", "Galladite", "Garchompite", "Gardevoirite",
    "Gengarite", "Glalitite", "Glimmoranite", "Golurkite", "Greninjite", "Gyaradosite", "Haban Berry", "Hard Stone",
    "Hawluchanite", "Heracronite", "Houndoominite", "Kangaskhanite", "Kasib Berry", "Kebia Berry", "King's Rock", "Leftovers",
    "Leppa Berry", "Light Ball", "Lopunnite", "Lucarionite", "Lum Berry", "Magnet", "Manectite", "Medichamite",
    "Meganiumite", "Mental Herb", "Meowsticite", "Metal Coat", "Miracle Seed", "Mystic Water", "Never-Melt Ice", "Occa Berry",
    "Oran Berry", "Passho Berry", "Payapa Berry", "Pecha Berry", "Persim Berry", "Pidgeotite", "Pinsirite", "Poison Barb",
    "Quick Claw", "Rawst Berry", "Rindo Berry", "Roseli Berry", "Sablenite", "Scizorite", "Scope Lens", "Scovillainite",
    "Sharp Beak", "Sharpedonite", "Shell Bell", "Shuca Berry", "Silk Scarf", "Silver Powder", "Sitrus Berry", "Skarmorite",
    "Slowbronite", "Soft Sand", "Spell Tag", "Starminite", "Steelixite", "Tanga Berry", "Twisted Spoon", "Tyranitarite",
    "Venusaurite", "Victreebelite", "Wacan Berry", "White Herb", "Yache Berry"
  ];
  const MEGA_STONE_OVERRIDES = {
    "Mega Charizard X": "Charizardite X",
    "Mega Charizard Y": "Charizardite Y",
    "Mega Lucario": "Lucarionite",
    "Mega Heracross": "Heracronite",
    "Mega Dragonite": "Dragoninite",
    "Mega Feraligatr": "Feraligite",
    "Mega Emboar": "Emboarite",
    "Mega Delphox": "Delphoxite",
    "Mega Greninja": "Greninjite",
    "Mega Chesnaught": "Chesnaughtite",
    "Mega Floette": "Floettite",
    "Mega Victreebel": "Victreebelite",
    "Mega Chimecho": "Chimechite",
    "Mega Glimmora": "Glimmoranite",
    "Mega Hawlucha": "Hawluchanite",
    "Mega Crabominable": "Crabominite",
    "Mega Drampa": "Drampanite",
    "Mega Skarmory": "Skarmorite",
    "Mega Clefable": "Clefablite",
    "Mega Starmie": "Starminite",
    "Mega Scovillain": "Scovillainite",
    "Mega Excadrill": "Excadrite",
    "Mega Golurk": "Golurkite",
    "Mega Meowstic (Male)": "Meowsticite",
    "Mega Meowstic (Female)": "Meowsticite"
  };
  const POKEBALL_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="top" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ff7ca8"/>
          <stop offset="100%" stop-color="#7d63ff"/>
        </linearGradient>
        <linearGradient id="mid" x1="0" x2="1">
          <stop offset="0%" stop-color="#67b7ff"/>
          <stop offset="100%" stop-color="#ff7ca8"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="58" fill="#120f26" stroke="#ff6f9f" stroke-width="4"/>
      <path d="M12 64a52 52 0 0 1 104 0H12Z" fill="url(#top)"/>
      <path d="M12 64h104" stroke="url(#mid)" stroke-width="10" stroke-linecap="round"/>
      <circle cx="64" cy="64" r="17" fill="#20163f" stroke="#120f26" stroke-width="4"/>
      <circle cx="64" cy="64" r="11" fill="#ffd4e8"/>
    </svg>
  `);
  const ABILITY_OVERRIDES = {
    "Garchomp": ["Sand Veil", "Rough Skin"],
    "Incineroar": ["Blaze", "Intimidate"],
    "Sneasler": ["Pressure", "Unburden", "Poison Touch"],
    "Serperior": ["Overgrow", "Contrary"],
    "Sinistcha": ["Hospitality", "Heatproof"],
    "Pelipper": ["Keen Eye", "Drizzle", "Rain Dish"],
    "Whimsicott": ["Prankster", "Infiltrator", "Chlorophyll"],
    "Farigiraf": ["Cud Chew", "Armor Tail", "Sap Sipper"],
    "Raichu": ["Static", "Lightning Rod"],
    "Raichu-Alola": ["Surge Surfer"],
    "Rotom-Heat": ["Levitate"],
    "Rotom-Wash": ["Levitate"],
    "Rotom-Mow": ["Levitate"],
    "Rotom-Frost": ["Levitate"],
    "Rotom-Fan": ["Levitate"],
    "Ninetales-Alola": ["Snow Cloak", "Snow Warning"],
    "Lycanroc": ["Keen Eye", "Sand Rush", "Steadfast"],
    "Lycanroc-Midnight": ["Keen Eye", "Vital Spirit", "No Guard"],
    "Lycanroc-Dusk": ["Tough Claws"]
  };
  const RECHARGE_OR_BAD_COMMIT_MOVES = new Set([
    "hyper beam", "giga impact", "blast burn", "frenzy plant", "hydro cannon", "rock wrecker", "roar of time", "meteor assault", "focus punch"
  ]);
  const STRONGLY_DISCOURAGED_MOVES = new Set([
    "double-edge", "dragon rush", "focus blast", "steel beam", "stored power"
  ]);
  const GUARANTEED_MULTI_HIT_MOVES = {
    "bonemerang": 2,
    "double hit": 2,
    "double iron bash": 2,
    "double kick": 2,
    "dragon darts": 2,
    "dual wingbeat": 2,
    "gear grind": 2,
    "twin beam": 2,
    "twineedle": 2,
    "triple axle": 3,
    "triple kick": 3,
    "population bomb": 10
  };
  const ROTOM_FORM_DEFINITIONS = [
    { name: "Rotom-Heat", baseName: "Rotom", calcName: "Rotom-Heat", apiName: "rotom-heat", types: ["Electric", "Fire"], baseSpeed: 86, baseStats: [50, 65, 107, 105, 107, 86] },
    { name: "Rotom-Wash", baseName: "Rotom", calcName: "Rotom-Wash", apiName: "rotom-wash", types: ["Electric", "Water"], baseSpeed: 86, baseStats: [50, 65, 107, 105, 107, 86] },
    { name: "Rotom-Mow", baseName: "Rotom", calcName: "Rotom-Mow", apiName: "rotom-mow", types: ["Electric", "Grass"], baseSpeed: 86, baseStats: [50, 65, 107, 105, 107, 86] },
    { name: "Rotom-Frost", baseName: "Rotom", calcName: "Rotom-Frost", apiName: "rotom-frost", types: ["Electric", "Ice"], baseSpeed: 86, baseStats: [50, 65, 107, 105, 107, 86] },
    { name: "Rotom-Fan", baseName: "Rotom", calcName: "Rotom-Fan", apiName: "rotom-fan", types: ["Electric", "Flying"], baseSpeed: 86, baseStats: [50, 65, 107, 105, 107, 86] }
  ];
  const META_SPEED_BENCHMARKS = [
    { name: "Sneasler", item: "White Herb", nature: "Jolly", speedSp: 32, note: "fast Fake Out lead" },
    { name: "Garchomp", item: "Choice Scarf", nature: "Jolly", speedSp: 32, note: "common scarf benchmark" },
    { name: "Whimsicott", item: "Focus Sash", nature: "Timid", speedSp: 32, note: "Tailwind lead" },
    { name: "Talonflame", item: "Sharp Beak", nature: "Jolly", speedSp: 32, note: "Gale Wings pressure" },
    { name: "Ninetales-Alola", item: "Focus Sash", nature: "Timid", speedSp: 32, note: "snow support" },
    { name: "Charizard", item: "Charizardite Y", nature: "Timid", speedSp: 32, note: "sun mega pressure" },
    { name: "Dragonite", item: "Dragoninite", nature: "Jolly", speedSp: 32, note: "fast mixed pressure" },
    { name: "Rotom-Wash", item: "Choice Scarf", nature: "Timid", speedSp: 32, note: "scarf pivot" },
    { name: "Pelipper", item: "Choice Scarf", nature: "Timid", speedSp: 32, note: "rain scarf mode" },
    { name: "Gengar", item: "Focus Sash", nature: "Timid", speedSp: 32, note: "fast disruption" },
    { name: "Basculegion", item: "Choice Scarf", nature: "Jolly", speedSp: 32, note: "scarf cleaner" },
    { name: "Floette", item: "Choice Scarf", nature: "Timid", speedSp: 32, note: "scarf fairy pressure" },
    { name: "Incineroar", item: "Sitrus Berry", nature: "Careful", speedSp: 0, note: "bulky pivot pace" },
    { name: "Sinistcha", item: "Sitrus Berry", nature: "Sassy", speedSp: 0, note: "TR support" },
    { name: "Farigiraf", item: "Mental Herb", nature: "Sassy", speedSp: 0, note: "Trick Room setter" },
    { name: "Tyranitar", item: "Choice Scarf", nature: "Jolly", speedSp: 32, note: "sand scarf benchmark" }
  ];
  const LOW_PRIORITY_AI_PICKS = new Set([
    "aromatisse",
    "banette",
    "mega banette",
    "chimecho",
    "mega chimecho",
    "gourgeist"
  ]);
  const SUPPORT_ROLE_LOCKS = new Set([
    "incineroar", "whimsicott", "farigiraf", "polteageist", "slowbro", "mega slowbro", "pelipper", "sinistcha", "hatterene"
  ]);
  const HARD_ATTACKER_LOCKS = new Set([
    "kingambit",
    "garchomp",
    "dragonite",
    "sneasler",
    "basculegion",
    "mega lucario",
    "lucario",
    "mega heracross",
    "heracross",
    "mega tyranitar",
    "tyranitar",
    "mega garchomp",
    "mega absol",
    "mega gallade",
    "mega pinsir",
    "mega gyarados",
    "mega dragonite",
    "mega hawlucha"
  ]);
  const HARD_SPECIAL_LOCKS = new Set([
    "gengar",
    "mega gengar",
    "delphox",
    "mega delphox",
    "chandelure",
    "mega chandelure",
    "archaludon",
    "serperior",
    "gardevoir",
    "mega gardevoir",
    "floette",
    "mega floette",
    "ninetales-alola",
    "rotom-wash",
    "sinistcha",
    "dragapult",
    "raichu-alola"
  ]);
  const HARD_MIXED_LOCKS = new Set([
    "infernape",
    "charizard",
    "mega charizard x",
    "mega charizard y",
    "dragonite",
    "lucario",
    "mega lucario",
    "greninja",
    "mega greninja"
  ]);
  const FOCUS_SASH_PRIORITY = new Set([
    "whimsicott",
    "maushold",
    "talonflame",
    "dragapult",
    "sneasler",
    "gengar",
    "mega gengar",
    "froslass",
    "ninetales-alola"
  ]);
  const STARTER_NAMES = new Set([
    "venusaur","charizard","blastoise","meganium","feraligatr","typhlosion","sceptile","blaziken","swampert",
    "torterra","infernape","empoleon","serperior","emboar","samurott","chesnaught","delphox","greninja",
    "decidueye","incineroar","primarina","rillaboom","cinderace","inteleon","meowscarada","skeledirge","quaquaval"
  ]);
  const GITHUB_ISSUES_URL = "https://github.com/J4PN/Master-Ball-War-Room/issues/new";
  const SPECIES_FAMILY_OVERRIDES = {
    "Raichu-Alola": "Raichu",
    "Ninetales-Alola": "Ninetales",
    "Samurott-Hisui": "Samurott",
    "Zoroark-Hisui": "Zoroark",
    "Tauros-Paldea": "Tauros",
    "Tauros-Paldea-Aqua": "Tauros",
    "Tauros-Paldea-Blaze": "Tauros",
    "Lycanroc-Midnight": "Lycanroc",
    "Lycanroc-Dusk": "Lycanroc",
    "Rotom-Heat": "Rotom",
    "Rotom-Wash": "Rotom",
    "Rotom-Mow": "Rotom",
    "Rotom-Frost": "Rotom",
    "Rotom-Fan": "Rotom",
    "Mega Charizard X": "Charizard",
    "Mega Charizard Y": "Charizard",
    "Mega Meowstic (Male)": "Meowstic",
    "Mega Meowstic (Female)": "Meowstic"
  };
  const SPECIES_FAMILY_SUFFIXES = [
    "Alola", "Galar", "Hisui", "Paldea",
    "Heat", "Wash", "Mow", "Frost", "Fan",
    "Midday", "Midnight", "Dusk", "Dawn",
    "Attack", "Defense", "Speed", "Origin", "Therian", "Incarnate"
  ];

  const TYPE_CHART = {
    Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
    Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
    Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5, Ice: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
    Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
    Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
    Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
    Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
    Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
    Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
    Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
    Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
    Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
    Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
  };
  const TYPE_ORDER = ["Normal", "Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost", "Steel", "Fire", "Water", "Grass", "Electric", "Psychic", "Ice", "Dragon", "Dark", "Fairy"];
  const TYPE_NAME_LOOKUP = Object.fromEntries([...TYPE_ORDER, "Stellar"].map((type) => [normalizeNameKey(type), type]));
  const DEFENSE_TYPE_PROFILE = {
    Normal: { weak: ["Fighting"], immune: ["Ghost"], resist: [] },
    Fire: { weak: ["Water", "Ground", "Rock"], immune: [], resist: ["Fire", "Grass", "Ice", "Bug", "Steel", "Fairy"] },
    Water: { weak: ["Electric", "Grass"], immune: [], resist: ["Fire", "Water", "Ice", "Steel"] },
    Electric: { weak: ["Ground"], immune: [], resist: ["Electric", "Flying", "Steel"] },
    Grass: { weak: ["Fire", "Ice", "Flying", "Bug", "Poison"], immune: [], resist: ["Water", "Electric", "Grass", "Ground"] },
    Ice: { weak: ["Fire", "Fighting", "Rock", "Steel"], immune: [], resist: ["Ice"] },
    Fighting: { weak: ["Flying", "Psychic", "Fairy"], immune: [], resist: ["Bug", "Rock", "Dark"] },
    Poison: { weak: ["Ground", "Psychic"], immune: [], resist: ["Grass", "Fighting", "Poison", "Bug", "Fairy"] },
    Ground: { weak: ["Water", "Grass", "Ice"], immune: ["Electric"], resist: ["Poison", "Rock"] },
    Flying: { weak: ["Electric", "Ice", "Rock"], immune: ["Ground"], resist: ["Grass", "Fighting", "Bug"] },
    Psychic: { weak: ["Bug", "Ghost", "Dark"], immune: [], resist: ["Fighting", "Psychic"] },
    Bug: { weak: ["Fire", "Flying", "Rock"], immune: [], resist: ["Grass", "Fighting", "Ground"] },
    Rock: { weak: ["Water", "Grass", "Fighting", "Ground", "Steel"], immune: [], resist: ["Normal", "Fire", "Poison", "Flying"] },
    Ghost: { weak: ["Ghost", "Dark"], immune: ["Normal", "Fighting"], resist: ["Poison", "Bug"] },
    Dragon: { weak: ["Ice", "Dragon", "Fairy"], immune: [], resist: ["Fire", "Water", "Grass", "Electric"] },
    Dark: { weak: ["Fighting", "Bug", "Fairy"], immune: ["Psychic"], resist: ["Ghost", "Dark"] },
    Steel: { weak: ["Fire", "Fighting", "Ground"], immune: ["Poison"], resist: ["Normal", "Grass", "Ice", "Flying", "Psychic", "Bug", "Rock", "Dragon", "Steel", "Fairy"] },
    Fairy: { weak: ["Poison", "Steel"], immune: ["Dragon"], resist: ["Fighting", "Bug", "Dark"] }
  };
  const DEFENSIVE_ABILITY_TYPE_MODIFIERS = {
    fluffy: { Fire: 2 },
    "purifying salt": { Ghost: 0.5 },
    heatproof: { Fire: 0.5 },
    "water bubble": { Fire: 0.5 },
    "thick fat": { Fire: 0.5, Ice: 0.5 },
    "earth eater": { Ground: 0 },
    levitate: { Ground: 0 },
    "flash fire": { Fire: 0 },
    "well baked body": { Fire: 0 },
    "dry skin": { Fire: 1.25, Water: 0 },
    "storm drain": { Water: 0 },
    "water absorb": { Water: 0 },
    "sap sipper": { Grass: 0 },
    "lightning rod": { Electric: 0 },
    "motor drive": { Electric: 0 },
    "volt absorb": { Electric: 0 },
    "primordial sea": { Fire: 0 },
    "desolate land": { Water: 0 }
  };
  const PKMN_HELP_REDUCER_ABILITIES = new Set(["filter", "solid rock", "prism armor"]);

  const legalPokemonData =
    (typeof CHAMPIONS_DATABASE !== "undefined" && CHAMPIONS_DATABASE?.pokemon) ||
    window.CHAMPIONS_DATABASE?.pokemon ||
    {};
  const verifiedAbilityIndex = window.CHAMPIONS_ABILITIES || {};
  let metaThreats = buildMetaThreatsFromSeed(pikalyticsMetaSeed);
  let metaStatus = { source: "seed", updatedAt: null };
  const rawMegaDefinitions = [
    { name: "Mega Venusaur", calcName: "Venusaur-Mega", apiName: "venusaur-mega", baseName: "Venusaur", ability: "Thick Fat", baseStats: [80, 100, 123, 122, 120, 80] },
    { name: "Mega Charizard X", calcName: "Charizard-Mega-X", apiName: "charizard-mega-x", baseName: "Charizard", types: ["Fire", "Dragon"], ability: "Tough Claws", baseStats: [78, 130, 111, 130, 85, 100] },
    { name: "Mega Charizard Y", calcName: "Charizard-Mega-Y", apiName: "charizard-mega-y", baseName: "Charizard", ability: "Drought", baseStats: [78, 104, 78, 159, 115, 100] },
    { name: "Mega Blastoise", calcName: "Blastoise-Mega", apiName: "blastoise-mega", baseName: "Blastoise", ability: "Mega Launcher", baseStats: [79, 103, 120, 135, 115, 78] },
    { name: "Mega Beedrill", calcName: "Beedrill-Mega", apiName: "beedrill-mega", baseName: "Beedrill", ability: "Adaptability", baseStats: [65, 150, 40, 15, 80, 145] },
    { name: "Mega Pidgeot", calcName: "Pidgeot-Mega", apiName: "pidgeot-mega", baseName: "Pidgeot", ability: "No Guard", baseStats: [83, 80, 80, 135, 80, 121] },
    { name: "Mega Clefable", baseName: "Clefable", ability: "Magic Bounce", baseStats: [95, 80, 93, 135, 110, 70] },
    { name: "Mega Alakazam", calcName: "Alakazam-Mega", apiName: "alakazam-mega", baseName: "Alakazam", ability: "Trace", baseStats: [55, 50, 65, 175, 105, 150] },
    { name: "Mega Victreebel", baseName: "Victreebel", ability: "Innards Out", baseStats: [80, 125, 85, 135, 95, 70] },
    { name: "Mega Slowbro", calcName: "Slowbro-Mega", apiName: "slowbro-mega", baseName: "Slowbro", ability: "Shell Armor", baseStats: [95, 75, 180, 130, 80, 30] },
    { name: "Mega Gengar", calcName: "Gengar-Mega", apiName: "gengar-mega", baseName: "Gengar", ability: "Shadow Tag", baseStats: [60, 65, 80, 170, 95, 130] },
    { name: "Mega Kangaskhan", calcName: "Kangaskhan-Mega", apiName: "kangaskhan-mega", baseName: "Kangaskhan", ability: "Parental Bond", baseStats: [105, 125, 100, 60, 100, 100] },
    { name: "Mega Starmie", baseName: "Starmie", ability: "Huge Power", baseStats: [60, 100, 105, 130, 105, 120] },
    { name: "Mega Pinsir", calcName: "Pinsir-Mega", apiName: "pinsir-mega", baseName: "Pinsir", types: ["Bug", "Flying"], ability: "Aerilate", baseStats: [65, 155, 120, 65, 90, 105] },
    { name: "Mega Gyarados", calcName: "Gyarados-Mega", apiName: "gyarados-mega", baseName: "Gyarados", types: ["Water", "Dark"], ability: "Mold Breaker", baseStats: [95, 155, 109, 70, 130, 81] },
    { name: "Mega Aerodactyl", calcName: "Aerodactyl-Mega", apiName: "aerodactyl-mega", baseName: "Aerodactyl", ability: "Tough Claws", baseStats: [80, 135, 85, 70, 95, 150] },
    { name: "Mega Dragonite", baseName: "Dragonite", ability: "Multiscale", baseStats: [91, 124, 115, 145, 125, 100] },
    { name: "Mega Meganium", baseName: "Meganium", ability: "Mega Sol", baseStats: [80, 92, 115, 143, 115, 80] },
    { name: "Mega Feraligatr", baseName: "Feraligatr", ability: "Dragonize", baseStats: [85, 160, 125, 89, 93, 78] },
    { name: "Mega Ampharos", calcName: "Ampharos-Mega", apiName: "ampharos-mega", baseName: "Ampharos", types: ["Electric", "Dragon"], ability: "Mold Breaker", baseStats: [90, 95, 105, 165, 110, 45] },
    { name: "Mega Steelix", calcName: "Steelix-Mega", apiName: "steelix-mega", baseName: "Steelix", ability: "Sand Force", baseStats: [75, 125, 230, 55, 95, 30] },
    { name: "Mega Scizor", calcName: "Scizor-Mega", apiName: "scizor-mega", baseName: "Scizor", ability: "Technician", baseStats: [70, 150, 140, 65, 100, 75] },
    { name: "Mega Heracross", calcName: "Heracross-Mega", apiName: "heracross-mega", baseName: "Heracross", ability: "Skill Link", baseStats: [80, 185, 115, 40, 105, 75] },
    { name: "Mega Skarmory", baseName: "Skarmory", ability: "Stalwart", baseStats: [65, 140, 110, 40, 100, 110] },
    { name: "Mega Houndoom", calcName: "Houndoom-Mega", apiName: "houndoom-mega", baseName: "Houndoom", ability: "Solar Power", baseStats: [75, 90, 90, 140, 90, 115] },
    { name: "Mega Tyranitar", calcName: "Tyranitar-Mega", apiName: "tyranitar-mega", baseName: "Tyranitar", ability: "Sand Stream", baseStats: [100, 164, 150, 95, 120, 71] },
    { name: "Mega Gardevoir", calcName: "Gardevoir-Mega", apiName: "gardevoir-mega", baseName: "Gardevoir", ability: "Pixilate", baseStats: [68, 85, 65, 165, 135, 100] },
    { name: "Mega Sableye", calcName: "Sableye-Mega", apiName: "sableye-mega", baseName: "Sableye", ability: "Magic Bounce", baseStats: [50, 85, 125, 85, 115, 20] },
    { name: "Mega Aggron", calcName: "Aggron-Mega", apiName: "aggron-mega", baseName: "Aggron", types: ["Steel"], ability: "Filter", baseStats: [70, 140, 230, 60, 80, 50] },
    { name: "Mega Medicham", calcName: "Medicham-Mega", apiName: "medicham-mega", baseName: "Medicham", ability: "Pure Power", baseStats: [60, 100, 85, 80, 85, 100] },
    { name: "Mega Manectric", calcName: "Manectric-Mega", apiName: "manectric-mega", baseName: "Manectric", ability: "Intimidate", baseStats: [70, 75, 80, 135, 80, 135] },
    { name: "Mega Sharpedo", calcName: "Sharpedo-Mega", apiName: "sharpedo-mega", baseName: "Sharpedo", ability: "Strong Jaw", baseStats: [70, 140, 70, 110, 65, 105] },
    { name: "Mega Camerupt", calcName: "Camerupt-Mega", apiName: "camerupt-mega", baseName: "Camerupt", ability: "Sheer Force", baseStats: [70, 120, 100, 145, 105, 20] },
    { name: "Mega Altaria", calcName: "Altaria-Mega", apiName: "altaria-mega", baseName: "Altaria", types: ["Dragon", "Fairy"], ability: "Pixilate", baseStats: [75, 110, 110, 110, 105, 80] },
    { name: "Mega Banette", calcName: "Banette-Mega", apiName: "banette-mega", baseName: "Banette", ability: "Prankster", baseStats: [64, 165, 75, 93, 83, 75] },
    { name: "Mega Chimecho", baseName: "Chimecho", ability: "Levitate", baseStats: [75, 50, 110, 135, 120, 65] },
    { name: "Mega Absol", calcName: "Absol-Mega", apiName: "absol-mega", baseName: "Absol", ability: "Magic Bounce", baseStats: [65, 150, 60, 115, 60, 115] },
    { name: "Mega Glalie", calcName: "Glalie-Mega", apiName: "glalie-mega", baseName: "Glalie", ability: "Refrigerate", baseStats: [80, 120, 80, 120, 80, 100] },
    { name: "Mega Lopunny", calcName: "Lopunny-Mega", apiName: "lopunny-mega", baseName: "Lopunny", types: ["Normal", "Fighting"], ability: "Scrappy", baseStats: [65, 136, 94, 54, 96, 135] },
    { name: "Mega Garchomp", calcName: "Garchomp-Mega", apiName: "garchomp-mega", baseName: "Garchomp", ability: "Sand Force", baseStats: [108, 170, 115, 120, 95, 92] },
    { name: "Mega Lucario", calcName: "Lucario-Mega", apiName: "lucario-mega", baseName: "Lucario", ability: "Adaptability", baseStats: [70, 145, 88, 140, 70, 112] },
    { name: "Mega Abomasnow", calcName: "Abomasnow-Mega", apiName: "abomasnow-mega", baseName: "Abomasnow", ability: "Snow Warning", baseStats: [90, 132, 105, 132, 105, 30] },
    { name: "Mega Gallade", calcName: "Gallade-Mega", apiName: "gallade-mega", baseName: "Gallade", ability: "Inner Focus", baseStats: [68, 165, 95, 65, 115, 110] },
    { name: "Mega Froslass", baseName: "Froslass", ability: "Snow Warning", baseStats: [70, 80, 70, 140, 100, 120] },
    { name: "Mega Emboar", baseName: "Emboar", ability: "Mold Breaker", baseStats: [110, 148, 75, 110, 110, 75] },
    { name: "Mega Excadrill", baseName: "Excadrill", ability: "Piercing Drill", baseStats: [110, 165, 100, 65, 65, 103] },
    { name: "Mega Audino", calcName: "Audino-Mega", apiName: "audino-mega", baseName: "Audino", types: ["Normal", "Fairy"], ability: "Healer", baseStats: [103, 60, 126, 80, 126, 50] },
    { name: "Mega Chandelure", baseName: "Chandelure", ability: "Infiltrator", baseStats: [60, 75, 110, 175, 110, 90] },
    { name: "Mega Golurk", baseName: "Golurk", ability: "Unseen Fist", baseStats: [89, 159, 105, 70, 105, 55] },
    { name: "Mega Chesnaught", baseName: "Chesnaught", ability: "Bulletproof", baseStats: [88, 137, 172, 74, 115, 44] },
    { name: "Mega Delphox", baseName: "Delphox", ability: "Levitate", baseStats: [75, 69, 72, 159, 125, 134] },
    { name: "Mega Greninja", baseName: "Greninja", ability: "Protean", baseStats: [72, 125, 77, 133, 81, 142] },
    { name: "Mega Floette", baseName: "Floette", ability: "Fairy Aura", baseStats: [74, 85, 87, 155, 148, 102] },
    { name: "Mega Meowstic (Male)", baseName: "Meowstic", ability: "Trace", baseStats: [74, 48, 76, 143, 101, 124] },
    { name: "Mega Meowstic (Female)", baseName: "Meowstic-F", ability: "Trace", baseStats: [74, 48, 76, 83, 81, 104] },
    { name: "Mega Hawlucha", baseName: "Hawlucha", ability: "No Guard", baseStats: [78, 137, 100, 74, 93, 118] },
    { name: "Mega Crabominable", baseName: "Crabominable", ability: "Iron Fist", baseStats: [97, 157, 122, 62, 107, 33] },
    { name: "Mega Drampa", baseName: "Drampa", ability: "Berserk", baseStats: [78, 85, 110, 160, 116, 36] },
    { name: "Mega Scovillain", baseName: "Scovillain", ability: "Spicy Spray", baseStats: [65, 138, 85, 138, 85, 75] },
    { name: "Mega Glimmora", baseName: "Glimmora", ability: "Adaptability", baseStats: [83, 90, 105, 150, 96, 101] }
  ];
  const megaFormDefinitions = rawMegaDefinitions
    .map((entry) => {
      const baseInfo = legalPokemonData[entry.baseName];
      if (!baseInfo) return null;
      return {
        ...entry,
        apiName: entry.apiName || toApiSpeciesName(entry.baseName),
        calcName: entry.calcName || entry.name,
        types: entry.types || baseInfo.types || ["Normal"],
        baseSpeed: entry.baseStats?.[5] || baseInfo.baseStats?.[5] || 50,
        abilities: entry.ability ? [entry.ability] : []
      };
    })
    .filter(Boolean);
  const baseRoster = Object.entries(legalPokemonData).map(([name, info]) => ({
    name,
    apiName: toApiSpeciesName(name),
    calcName: name,
    types: info.types || ["Normal"],
    baseSpeed: info.baseStats?.[5] || 50,
    baseStats: info.baseStats || [50, 50, 50, 50, 50, 50],
    baseName: name,
    abilities: getLocalAbilitiesForName(name),
    metaRole: describeRole(info.types || ["Normal"], info.baseStats?.[5] || 50)
  }));
  const championsRoster = [
    ...baseRoster,
    ...ROTOM_FORM_DEFINITIONS.map((entry) => ({
      ...entry,
      abilities: getLocalAbilitiesForName(entry.name),
      metaRole: describeRole(entry.types, entry.baseSpeed)
    })),
    ...megaFormDefinitions
      .filter((entry) => legalPokemonData[entry.baseName])
      .map((entry) => ({
        ...entry,
        metaRole: describeRole(entry.types, entry.baseSpeed)
      }))
  ];

  const aliases = new Map([
    ["lycanroc-dusk", "Lycanroc-Dusk"], ["lycanroc dusk", "Lycanroc-Dusk"],
    ["lycanroc-midnight", "Lycanroc-Midnight"], ["lycanroc midnight", "Lycanroc-Midnight"],
    ["lycanroc-midday", "Lycanroc"], ["lycanroc midday", "Lycanroc"],
    ["samurott-hisui", "Samurott-Hisui"], ["hisuian samurott", "Samurott-Hisui"],
    ["zoroark-hisui", "Zoroark-Hisui"], ["hisuian zoroark", "Zoroark-Hisui"],
    ["mega meowstic male", "Mega Meowstic (Male)"], ["mega meowstic female", "Mega Meowstic (Female)"],
    ["alolan raichu", "Raichu-Alola"], ["raichu alola", "Raichu-Alola"],
    ["water tauros paldea", "Tauros-Paldea-Aqua"], ["paldean water tauros", "Tauros-Paldea-Aqua"], ["tauros paldea water", "Tauros-Paldea-Aqua"], ["water paldean tauros", "Tauros-Paldea-Aqua"], ["tauros aqua", "Tauros-Paldea-Aqua"], ["aqua tauros", "Tauros-Paldea-Aqua"], ["tauros aqua breed", "Tauros-Paldea-Aqua"],
    ["fire tauros paldea", "Tauros-Paldea-Blaze"], ["paldean fire tauros", "Tauros-Paldea-Blaze"], ["tauros paldea fire", "Tauros-Paldea-Blaze"], ["fire paldean tauros", "Tauros-Paldea-Blaze"], ["tauros blaze", "Tauros-Paldea-Blaze"], ["blaze tauros", "Tauros-Paldea-Blaze"], ["tauros blaze breed", "Tauros-Paldea-Blaze"],
    ["combat tauros paldea", "Tauros-Paldea"], ["paldean combat tauros", "Tauros-Paldea"], ["tauros combat", "Tauros-Paldea"], ["combat breed tauros", "Tauros-Paldea"], ["paldean tauros", "Tauros-Paldea"], ["tauros paldea", "Tauros-Paldea"],
    ["rotom heat", "Rotom-Heat"], ["rotom wash", "Rotom-Wash"], ["rotom mow", "Rotom-Mow"], ["rotom frost", "Rotom-Frost"], ["rotom fan", "Rotom-Fan"]
  ]);
  megaFormDefinitions.forEach((entry) => {
    aliases.set(normalizeNameKey(entry.name), entry.name);
  });

  function getLocalAbilitiesForName(name) {
    const verifiedRaw = verifiedAbilityIndex[name];
    const verified = Array.isArray(verifiedRaw) ? verifiedRaw : (verifiedRaw ? [verifiedRaw] : []);
    const overrides = ABILITY_OVERRIDES[name] || [];
    return [...new Set([...verified, ...overrides])];
  }

  function getExpectedAbilityCount(entry) {
    const key = normalizeNameKey(entry?.baseName || entry?.name || "");
    if (isMegaEntry(entry)) return 1;
    return STARTER_NAMES.has(key) ? 2 : 3;
  }

  function deriveSpeciesFamilyName(name) {
    if (!name) return "";
    if (SPECIES_FAMILY_OVERRIDES[name]) return SPECIES_FAMILY_OVERRIDES[name];
    let family = String(name).trim();
    if (family.startsWith("Mega ")) {
      family = family.replace(/^Mega\s+/, "");
    }
    family = family.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const suffixPattern = new RegExp(`-(?:${SPECIES_FAMILY_SUFFIXES.join("|")})$`, "i");
    if (suffixPattern.test(family)) {
      family = family.replace(suffixPattern, "");
    }
    return family.trim();
  }

  function getSpeciesClauseKey(entryOrName) {
    if (!entryOrName) return "";
    if (typeof entryOrName === "string") {
      const rosterEntry = getRosterEntry(entryOrName);
      const resolvedName = rosterEntry?.name || entryOrName;
      return normalizeNameKey(
        deriveSpeciesFamilyName(resolvedName)
        || rosterEntry?.baseName
        || rosterEntry?.name
        || entryOrName
      );
    }
    return normalizeNameKey(
      deriveSpeciesFamilyName(entryOrName.name)
      || entryOrName.baseName
      || entryOrName.name
      || ""
    );
  }

  function violatesSpeciesClause(entries, candidate) {
    const candidateKey = getSpeciesClauseKey(candidate);
    if (!candidateKey) return false;
    return entries.some((entry) => getSpeciesClauseKey(entry) === candidateKey);
  }

  const rosterByName = new Map(championsRoster.map((entry) => [entry.name.toLowerCase(), entry]));
  const speciesCache = new Map();
  const moveCache = new Map();
  const itemDetailCache = new Map();
  const abilityDetailCache = new Map();
  const abilityCache = new Map();
  const customMovepool = new Map();
  const legalMovesForEntryCache = new Map();
  const legalItems = [];
  const optimizedSetCache = new Map();
  const guidedThreatSetCache = new Map();
  const liveDamageCalcCache = new Map();
  let aiBuildCounter = 0;
  let gen = null;
  let parsedImportSets = [];
  let lastAiDraft = [];
  let lastAiBuildContext = null;

  const tabButtons = Array.from(document.querySelectorAll("[data-tab-trigger]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  const importInput = document.getElementById("import-input");
  const teamImportInput = document.getElementById("team-import-input");
  const importResults = document.getElementById("import-results");
  const damageResult = document.getElementById("damage-result");
  const speedResult = document.getElementById("speed-result");
  const speedChart = document.getElementById("speed-chart");
  const metaUsageBoard = document.getElementById("meta-usage-board");
  const metaStatusPanel = document.getElementById("meta-status");
  const confirmedRoster = document.getElementById("confirmed-roster");
  const teamAnalysis = document.getElementById("team-analysis");
  const teamExportStatus = document.getElementById("team-export-status");
  const liveWarRoomIntel = document.getElementById("live-war-room-intel");
  const aiBuilderOutput = document.getElementById("ai-builder-output");
  const aiBuilderTweaks = document.getElementById("ai-builder-tweaks");
  const bugOutput = document.getElementById("bug-report-output");
  const bugStatus = document.getElementById("bug-status");
  const movePicker = document.getElementById("move-picker");
  const movePickerTitle = document.getElementById("move-picker-title");
  const movePickerSearch = document.getElementById("move-picker-search");
  const movePickerHead = document.getElementById("move-picker-head");
  const movePickerResults = document.getElementById("move-picker-results");
  const movePickerClose = document.getElementById("move-picker-close");
  const uiAnimationTimers = new WeakMap();
  let metaCountdownTimer = null;
  let moveDiscouragePolicy = null;
  const movePickerState = {
    kind: "move",
    control: null,
    entry: null,
    legalMoves: [],
    ranked: [],
    slotState: null,
    options: []
  };
  const liveWarRoomIntelState = {
    requestId: 0,
    fast: null,
    medium: null,
    slow: null,
    loading: { fast: false, medium: false, slow: false },
    reason: "init",
    mediumTimer: null,
    slowTimer: null,
    mediumPromise: null
  };
  let speedCalcSp = 0;
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      gen = window.calc ? calc.Generations.get(9) : null;
      primeLearnedBuilderData().catch(() => null);
      await initializeMetaThreats();
      setupTabs();
      setupNatureSelects();
      renderSpSliders("attacker", { hp: 0, atk: 0, def: 0, spa: 32, spd: 2, spe: 32 });
      renderSpSliders("defender", { hp: 32, atk: 0, def: 2, spa: 0, spd: 32, spe: 0 });
      renderAllTeamSpSliders();
      setupRosterSelects();
      setupItemSelects();
      renderConfirmedRoster();
      bindButtons();
      bindSpeciesHelpers();
      setupMovePicker();
      setupTeamBuilderControls();
      setupLiveWarRoomIntel();
      setupSpeedTools();
      await loadMoveDiscouragePolicy();
      await loadCustomMovepool();
      await loadLegalItems();
      await populateMovesForAttacker();
      await populateAbilitiesForSide("attacker");
      await populateAbilitiesForSide("defender");
      await refreshAllTeamBuilderOptions();
      await refreshAllSprites();
      renderSpeedChart();
    } catch (error) {
      console.error("App init failed.", error);
      if (teamAnalysis) {
        teamAnalysis.innerHTML = `<div class="status-note">Part of the app failed to boot cleanly. Refresh once after updating the site files if a panel still looks stale.</div>`;
      }
    } finally {
      renderMetaTab();
    }
  }

  function setupLiveWarRoomIntel() {
    if (!liveWarRoomIntel) return;
    document.addEventListener("mbwr:team-state-changed", (event) => {
      scheduleLiveWarRoomIntelUpdate(event.detail?.reason || "team-update");
    });
    scheduleLiveWarRoomIntelUpdate("init");
  }

  function setupTabs() {
    const initialTarget = tabButtons.find((button) => button.classList.contains("is-active"))?.dataset.tabTrigger || "teambuilder";
    activateTab(initialTarget);
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.tabTrigger;
        activateTab(target);
        if (target === "meta") renderMetaTab();
      });
    });
  }

  function setupNatureSelects() {
    const controls = [
      document.getElementById("attacker-nature"),
      document.getElementById("defender-nature"),
      ...Array.from(document.querySelectorAll(".team-nature"))
    ].filter(Boolean);
    controls.forEach((select) => {
      select.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose nature";
      select.appendChild(placeholder);
      natures.forEach((nature) => {
        const option = document.createElement("option");
        option.value = nature;
        option.textContent = formatNatureLabel(nature);
        select.appendChild(option);
      });
    });
    document.getElementById("attacker-nature").value = "Jolly";
    document.getElementById("defender-nature").value = "Calm";
    document.querySelectorAll(".team-nature").forEach((select) => {
      select.value = "";
    });
  }

  function renderSpSliders(side, defaults) {
    const grid = document.getElementById(`${side}-stats-grid`);
    grid.innerHTML = "";
    statOrder.forEach((stat) => {
      const wrapper = document.createElement("div");
      wrapper.className = "stat-slider";
      wrapper.innerHTML = `
        <label for="${side}-ev-${stat}">
          <span class="slider-header">
            <span>${statLabels[stat]} SP</span>
            <span class="slider-value" id="${side}-ev-${stat}-value">${defaults[stat] || 0}</span>
          </span>
        </label>
        <div class="slider-input-row">
          <input class="stat-range" id="${side}-ev-${stat}" type="range" min="0" max="${SP_MAX_PER_STAT}" step="1" value="${defaults[stat] || 0}" />
          <input class="stat-number" id="${side}-ev-${stat}-input" type="number" min="0" max="${SP_MAX_PER_STAT}" step="1" inputmode="numeric" value="${defaults[stat] || 0}" aria-label="${statLabels[stat]} SP value" />
        </div>
      `;
      grid.appendChild(wrapper);
    });

    statOrder.forEach((stat) => {
      const input = document.getElementById(`${side}-ev-${stat}`);
      input.addEventListener("input", () => handleSpSliderChange(side, stat));
      input.addEventListener("change", () => handleSpSliderChange(side, stat));
      const numberInput = document.getElementById(`${side}-ev-${stat}-input`);
      numberInput.addEventListener("input", () => handleSpNumberInput(side, stat));
      numberInput.addEventListener("change", () => handleSpNumberInput(side, stat));
    });
    updateSpDisplay(side);
  }

  function renderAllTeamSpSliders() {
    for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
      renderTeamSpSliders(slotIndex, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    }
  }

  function renderTeamSpSliders(slotIndex, defaults) {
    const grid = document.getElementById(`team-stats-grid-${slotIndex}`);
    if (!grid) return;
    grid.innerHTML = "";
    statOrder.forEach((stat) => {
      const wrapper = document.createElement("div");
      wrapper.className = "stat-slider";
      wrapper.innerHTML = `
        <label for="team-${slotIndex}-ev-${stat}">
          <span class="slider-header">
            <span>${statLabels[stat]} SP</span>
            <span class="slider-value" id="team-${slotIndex}-ev-${stat}-value">${defaults[stat] || 0}</span>
          </span>
        </label>
        <div class="slider-input-row">
          <input class="stat-range team-stat-range" id="team-${slotIndex}-ev-${stat}" type="range" min="0" max="${SP_MAX_PER_STAT}" step="1" value="${defaults[stat] || 0}" />
          <input class="stat-number team-stat-number" id="team-${slotIndex}-ev-${stat}-input" type="number" min="0" max="${SP_MAX_PER_STAT}" step="1" inputmode="numeric" value="${defaults[stat] || 0}" aria-label="Slot ${slotIndex + 1} ${statLabels[stat]} SP value" />
        </div>
      `;
      grid.appendChild(wrapper);
    });
    statOrder.forEach((stat) => {
      const input = document.getElementById(`team-${slotIndex}-ev-${stat}`);
      input.addEventListener("input", () => handleTeamSpSliderChange(slotIndex, stat));
      input.addEventListener("change", () => handleTeamSpSliderChange(slotIndex, stat));
      const numberInput = document.getElementById(`team-${slotIndex}-ev-${stat}-input`);
      numberInput.addEventListener("input", () => handleTeamSpNumberInput(slotIndex, stat));
      numberInput.addEventListener("change", () => handleTeamSpNumberInput(slotIndex, stat));
    });
    updateTeamSpDisplay(slotIndex);
  }

  function triggerTransientClass(element, className, duration = 220) {
    if (!element) return;
    const timers = uiAnimationTimers.get(element) || {};
    if (timers[className]) window.clearTimeout(timers[className]);
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    timers[className] = window.setTimeout(() => {
      element.classList.remove(className);
      delete timers[className];
    }, duration);
    uiAnimationTimers.set(element, timers);
  }

  function clampSpInputValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return clampSp(Math.round(parsed));
  }

  function notifyTeamBuilderStateChange(reason = "update", slotIndex = -1) {
    document.dispatchEvent(new CustomEvent("mbwr:team-state-changed", {
      detail: { reason, slotIndex }
    }));
  }

  function handleSpNumberInput(side, changedStat) {
    const rangeInput = document.getElementById(`${side}-ev-${changedStat}`);
    const numberInput = document.getElementById(`${side}-ev-${changedStat}-input`);
    if (!rangeInput || !numberInput) return;
    rangeInput.value = clampSpInputValue(numberInput.value);
    handleSpSliderChange(side, changedStat);
  }

  function handleTeamSpNumberInput(slotIndex, changedStat) {
    const rangeInput = document.getElementById(`team-${slotIndex}-ev-${changedStat}`);
    const numberInput = document.getElementById(`team-${slotIndex}-ev-${changedStat}-input`);
    if (!rangeInput || !numberInput) return;
    rangeInput.value = clampSpInputValue(numberInput.value);
    handleTeamSpSliderChange(slotIndex, changedStat);
  }

  function getTeamCard(slotIndex) {
    return document.querySelector(`.team-card[data-team-card="${slotIndex}"]`);
  }

  function animateTeamCard(slotIndex, state = "is-slot-updated") {
    triggerTransientClass(getTeamCard(slotIndex), state, 240);
  }

  function animateMoveField(control) {
    triggerTransientClass(control, "is-move-updated", 220);
  }

  function markMoveFieldChange(control, nextValue) {
    if (!control) return false;
    const normalizedNext = nextValue || "";
    const previousValue = control.dataset.lastMoveValue ?? control.value ?? "";
    const changed = previousValue !== normalizedNext;
    control.dataset.lastMoveValue = normalizedNext;
    if (changed && normalizedNext) animateMoveField(control);
    return changed;
  }

  function animateScorePanelChanges(panel) {
    if (!panel) return;
    const nextValues = new Map();
    panel.querySelectorAll(".analysis-chip").forEach((chip) => {
      const text = chip.textContent || "";
      const match = text.match(/^([^:]+):\s*(-?\d+)/);
      if (!match) return;
      const key = match[1].trim();
      const value = Number(match[2]);
      nextValues.set(key, value);
      const previous = panel._mbwrScoreMap?.get(key);
      if (Number.isFinite(previous) && previous !== value) {
        triggerTransientClass(chip, value > previous ? "is-score-up" : "is-score-down", 240);
      }
    });
    panel._mbwrScoreMap = nextValues;
    triggerTransientClass(panel, "is-live-update", 240);
  }

  function setBusyState(element, active, label = "Updating") {
    if (!element) return;
    element.classList.toggle("is-busy", active);
    element.setAttribute("aria-busy", active ? "true" : "false");
    if (active) element.dataset.busyLabel = label;
    else delete element.dataset.busyLabel;
  }

  function handleTeamSpSliderChange(slotIndex, changedStat) {
    const totals = getTeamSlotSpSpread(slotIndex);
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    if (total > SP_MAX_TOTAL) {
      const overflow = total - SP_MAX_TOTAL;
      const input = document.getElementById(`team-${slotIndex}-ev-${changedStat}`);
      input.value = Math.max(0, Number(input.value) - overflow);
    }
    updateTeamSpDisplay(slotIndex);
    notifyTeamBuilderStateChange("team-spread", slotIndex);
    analyzeTeamBuilder();
  }

  function updateTeamSpDisplay(slotIndex) {
    const spread = getTeamSlotSpSpread(slotIndex);
    const total = Object.values(spread).reduce((sum, value) => sum + value, 0);
    const totalEl = document.getElementById(`team-sp-total-${slotIndex}`);
    if (totalEl) totalEl.textContent = `${total} / ${SP_MAX_TOTAL} SP`;
    statOrder.forEach((stat) => {
      const valueEl = document.getElementById(`team-${slotIndex}-ev-${stat}-value`);
      if (valueEl) valueEl.textContent = String(spread[stat]);
      const numberInput = document.getElementById(`team-${slotIndex}-ev-${stat}-input`);
      if (numberInput) numberInput.value = String(spread[stat]);
    });
  }

  function getTeamSlotSpSpread(slotIndex) {
    const spread = {};
    statOrder.forEach((stat) => {
      spread[stat] = Number(document.getElementById(`team-${slotIndex}-ev-${stat}`)?.value) || 0;
    });
    return spread;
  }

  function applyImportedTeamSlotSpSpread(slotIndex, importedSp) {
    const spSpread = {};
    statOrder.forEach((stat) => {
      spSpread[stat] = clampSp(importedSp?.[stat] || 0);
    });
    let total = Object.values(spSpread).reduce((sum, value) => sum + value, 0);
    while (total > SP_MAX_TOTAL) {
      const stat = [...statOrder].reverse().find((key) => spSpread[key] > 0);
      if (!stat) break;
      spSpread[stat] -= 1;
      total -= 1;
    }
    statOrder.forEach((stat) => {
      const input = document.getElementById(`team-${slotIndex}-ev-${stat}`);
      if (input) input.value = spSpread[stat];
      const numberInput = document.getElementById(`team-${slotIndex}-ev-${stat}-input`);
      if (numberInput) numberInput.value = spSpread[stat];
    });
    updateTeamSpDisplay(slotIndex);
  }

  function formatNatureLabel(nature) {
    const [up, down] = natureEffects[nature] || ["", ""];
    if (!up || !down) return `${nature} (neutral)`;
    return `${nature} (+${up}, -${down})`;
  }

  function buildMetaThreatsFromSeed(seed) {
    return seed
      .map((threat) => {
        if (threat.name === "Mega Floette") {
          return { ...threat, types: ["Fairy"] };
        }
        const info = legalPokemonData[threat.name];
        return info ? { ...threat, types: info.types || ["Normal"] } : null;
      })
      .filter(Boolean);
  }

  async function initializeMetaThreats() {
    const cached = loadCachedMetaThreats();
    if (cached.length) {
      metaThreats = cached;
      metaStatus = {
        source: "cached",
        updatedAt: Number(localStorage.getItem(META_CACHE_TS_KEY)) || null
      };
    }
    const lastUpdated = Number(localStorage.getItem(META_CACHE_TS_KEY)) || 0;
    const shouldRefresh = !lastUpdated || (Date.now() - lastUpdated) >= META_REFRESH_INTERVAL_MS;
    if (!shouldRefresh) return;
    try {
      const refreshed = await refreshMetaThreatsFromWeb();
      if (!refreshed.length) return;
      metaThreats = refreshed;
      metaStatus = { source: "live", updatedAt: Date.now() };
      localStorage.setItem(META_CACHE_KEY, JSON.stringify(refreshed));
      localStorage.setItem(META_CACHE_TS_KEY, String(metaStatus.updatedAt));
      renderMetaTab();
    } catch (error) {
      console.warn("Meta refresh skipped, using cached/seed data.", error);
    }
  }

  function loadCachedMetaThreats() {
    try {
      const raw = localStorage.getItem(META_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((threat) => {
          const info = legalPokemonData[threat.name];
          return info ? { ...threat, types: threat.types || info.types || ["Normal"] } : null;
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async function refreshMetaThreatsFromWeb() {
    const endpoints = [
      `https://r.jina.ai/http://${PIKALYTICS_SOURCES.tournaments.replace(/^https?:\/\//, "")}`,
      `https://r.jina.ai/http://${PIKALYTICS_SOURCES.preview.replace(/^https?:\/\//, "")}`
    ];
    const texts = await Promise.all(endpoints.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Meta fetch failed: ${url}`);
      return response.text();
    }));
    const combined = texts.join("\n");
    const discovered = new Map();
    const usageRegex = /#\d+\s+([A-Za-z0-9 .'\-()]+)\s+(\d+(?:\.\d+)?)%/g;
    for (const match of combined.matchAll(usageRegex)) {
      const name = normalizeThreatName(match[1]);
      const usage = Number(match[2]);
      const info = legalPokemonData[name];
      if (!info) continue;
      discovered.set(name, {
        name,
        weight: usage,
        tags: [],
        types: info.types || ["Normal"]
      });
    }
    if (discovered.size < 6) {
      return buildMetaThreatsFromSeed(pikalyticsMetaSeed);
    }
    pikalyticsMetaSeed.forEach((seed) => {
      if (discovered.has(seed.name)) {
        discovered.get(seed.name).tags = seed.tags;
      }
    });
    return [...discovered.values()]
      .sort((a, b) => b.weight - a.weight);
  }

  function normalizeThreatName(name) {
    return name
      .replace(/\s+/g, " ")
      .replace(/\s+\(.+\)$/, "")
      .trim();
  }

  function formatMetaStatusCopy() {
    const updated = metaStatus.updatedAt ? new Date(metaStatus.updatedAt).toLocaleString() : "seed snapshot in use";
    if (metaStatus.source === "live") {
      return `Meta refreshed from Pikalytics and cached locally on ${updated}. It will try again every 48 hours.`;
    }
    if (metaStatus.source === "cached") {
      return `Using cached Pikalytics meta from ${updated}. The app retries a live refresh every 48 hours.`;
    }
    return "Using the built-in Pikalytics seed snapshot. The app retries a live refresh every 48 hours when network fetch is available.";
  }

  function formatMetaCountdownCopy() {
    if (!metaStatus.updatedAt) {
      return "Next live refresh: waiting for the first cached Pikalytics timestamp.";
    }
    const nextRefresh = metaStatus.updatedAt + META_REFRESH_INTERVAL_MS;
    const remaining = nextRefresh - Date.now();
    if (remaining <= 0) {
      return `Next live refresh: due now (${new Date(nextRefresh).toLocaleString()}).`;
    }
    const totalMinutes = Math.floor(remaining / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return `Next live refresh: ${days}d ${hours}h ${minutes}m (${new Date(nextRefresh).toLocaleString()}).`;
  }

  function updateMetaStatusPanel() {
    if (!metaStatusPanel) return;
    metaStatusPanel.innerHTML = `${escapeHtml(formatMetaStatusCopy())}<br><span class="result-copy">${escapeHtml(formatMetaCountdownCopy())}</span>`;
  }

  function startMetaCountdown() {
    if (metaCountdownTimer) clearInterval(metaCountdownTimer);
    updateMetaStatusPanel();
    metaCountdownTimer = window.setInterval(updateMetaStatusPanel, 60000);
  }

  function renderMetaTab() {
    if (!metaUsageBoard || !metaStatusPanel) return;
    const usageMap = new Map(metaThreats.map((threat) => [normalizeNameKey(threat.name), threat.weight]));
    const rows = championsRoster
      .filter((entry) => !isMegaEntry(entry))
      .map((entry) => ({
        name: entry.name,
        usage: usageMap.get(normalizeNameKey(entry.name)) || 0,
        role: entry.metaRole,
        types: entry.types
      }))
      .sort((a, b) => (b.usage - a.usage) || a.name.localeCompare(b.name))
      .slice(0, 14);
    if (!rows.length) {
      metaStatusPanel.textContent = "Meta snapshot fallback is active, but the roster did not finish loading.";
      metaUsageBoard.innerHTML = `<div class="status-note">Reload after updating all site files. The usage board needs the roster and app script to boot together.</div>`;
      return;
    }
    const maxUsage = Math.max(...rows.map((row) => row.usage), 1);
    updateMetaStatusPanel();
    metaUsageBoard.innerHTML = rows.map((row, index) => `
      <div class="speed-bar">
        <div class="speed-bar__label">
          <span>#${index + 1} ${row.name}</span>
          <span>${row.usage.toFixed(2)}%</span>
        </div>
        <div class="speed-bar__meta">${row.types.join(" / ")} | ${row.role}</div>
        <div class="speed-bar__track">
          <div class="speed-bar__fill" style="width:${((row.usage / maxUsage) * 100).toFixed(1)}%"></div>
        </div>
      </div>
    `).join("");
    startMetaCountdown();
  }

  function handleSpSliderChange(side, changedStat) {
    const totals = getSpSpread(side);
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    if (total > SP_MAX_TOTAL) {
      const overflow = total - SP_MAX_TOTAL;
      const input = document.getElementById(`${side}-ev-${changedStat}`);
      input.value = Math.max(0, Number(input.value) - overflow);
    }
    updateSpDisplay(side);
  }

  function updateSpDisplay(side) {
    const spread = getSpSpread(side);
    const total = Object.values(spread).reduce((sum, value) => sum + value, 0);
    document.getElementById(`${side}-sp-total`).textContent = `${total} / ${SP_MAX_TOTAL} SP`;
    statOrder.forEach((stat) => {
      document.getElementById(`${side}-ev-${stat}-value`).textContent = String(spread[stat]);
      const numberInput = document.getElementById(`${side}-ev-${stat}-input`);
      if (numberInput) numberInput.value = String(spread[stat]);
    });
  }

  function getSpSpread(side) {
    const spread = {};
    statOrder.forEach((stat) => {
      spread[stat] = Number(document.getElementById(`${side}-ev-${stat}`).value) || 0;
    });
    return spread;
  }

  function spToEv(value) {
    return Math.round((value / SP_MAX_PER_STAT) * 252);
  }

  function evToSp(value) {
    return Math.round((value / 252) * SP_MAX_PER_STAT);
  }

  function setupRosterSelects() {
    fillRosterSelect(document.getElementById("attacker-name"), "Choose Champions Pokemon");
    fillRosterSelect(document.getElementById("defender-name"), "Choose Champions Pokemon");
    fillRosterSelect(document.getElementById("speed-pokemon"), "Optional Pokemon");
    document.querySelectorAll(".team-slot").forEach((select) => fillRosterSelect(select, "Empty slot"));
  }

  function fillRosterSelect(select, placeholder) {
    setSelectOptions(select, championsRoster.map((entry) => ({ value: entry.name, text: entry.name })), placeholder);
  }

  function setupItemSelects() {
    fillItemSelect(document.getElementById("attacker-item"));
    fillItemSelect(document.getElementById("defender-item"));
    document.querySelectorAll(".team-item").forEach((select) => fillItemSelect(select));
  }

  function fillItemSelect(select) {
    setSelectOptions(
      select,
      legalItems.map((item) => ({ value: item, text: item })),
      legalItems.length ? "No item" : "No item / waiting for legal item list"
    );
  }

  function renderConfirmedRoster() {
    confirmedRoster.innerHTML = championsRoster
      .map((entry) => `<div class="roster-chip"><strong>${entry.name}</strong><br>${entry.types.join(" / ")}</div>`)
      .join("");
  }

  function toApiSpeciesName(name) {
    return name
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/'/g, "")
      .replace(/\s+/g, "-");
  }

  function describeRole(types, speed) {
    if (speed >= 110) return "Very fast attacker";
    if (speed >= 95) return "Fast offensive piece";
    if (types.includes("Steel") || types.includes("Water")) return "Bulky utility option";
    if (types.includes("Psychic") || types.includes("Fairy")) return "Special pressure";
    if (types.includes("Fighting") || types.includes("Rock")) return "Physical pressure";
    return "Flexible battle piece";
  }

  function bindButtons() {
    document.getElementById("parse-import").addEventListener("click", handleImportParse);
    document.getElementById("clear-import").addEventListener("click", () => {
      importInput.value = "";
      importResults.innerHTML = "";
      parsedImportSets = [];
    });
    document.getElementById("calculate-damage").addEventListener("click", calculateDamage);
    document.getElementById("build-team").addEventListener("click", analyzeTeamBuilder);
    document.getElementById("team-parse-import").addEventListener("click", handleUnifiedTeamBuilderInput);
    document.getElementById("team-clear-import").addEventListener("click", () => {
      teamImportInput.value = "";
    });
    document.getElementById("ai-builder-generate").addEventListener("click", handleUnifiedTeamBuilderInput);
    document.getElementById("ai-builder-apply").addEventListener("click", applyAiBuilderDraft);
    document.getElementById("ai-builder-tweak").addEventListener("click", handleAiBuilderTweaks);
    document.getElementById("ai-builder-analyze").addEventListener("click", analyzeTeamBuilder);
    document.getElementById("clear-team").addEventListener("click", () => {
      document.querySelectorAll(".team-slot, .team-item, .team-ability, .team-nature, .team-move").forEach((select) => { select.value = ""; });
      for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
        applyImportedTeamSlotSpSpread(slotIndex, {});
      }
      refreshAllTeamBuilderOptions();
      notifyTeamBuilderStateChange("team-cleared");
      teamAnalysis.innerHTML = `<p class="placeholder">Select a few Champions Pokemon to get role and matchup recommendations.</p>`;
      teamExportStatus.textContent = "Export the current six slots as text or an image.";
    });
    document.getElementById("copy-team-export").addEventListener("click", copyTeamExport);
    document.getElementById("download-team-export").addEventListener("click", downloadTeamExport);
    document.getElementById("download-team-image").addEventListener("click", downloadTeamImage);
    document.getElementById("send-to-bug-tab").addEventListener("click", () => {
      activateTab("bugs");
      document.getElementById("bug-title").focus();
    });
    document.getElementById("generate-bug-report").addEventListener("click", generateBugReport);
    document.getElementById("send-bug-report-github").addEventListener("click", sendBugReportToGitHub);
    document.getElementById("copy-bug-report").addEventListener("click", copyBugReport);
    document.getElementById("download-bug-report").addEventListener("click", downloadBugReport);
    teamAnalysis?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-add-recommendation]");
      if (!button) return;
      const entry = getRosterEntry(button.dataset.addRecommendation || "");
      if (!entry) return;
      const currentTeam = getTeamBuilderState();
      const set = await getOptimizedDraftSetCached(entry, {
        mode: "archetype",
        focus: "",
        notes: "",
        enemyNames: [],
        chosen: currentTeam.map((slot) => getRosterEntry(slot.name)).filter(Boolean),
        currentDraft: currentTeam,
        requestedModes: {},
        requestedPressure: {}
      });
      await loadSetIntoTeamBuilder(set);
      analyzeTeamBuilder();
    });
  }

  function bindSpeciesHelpers() {
    document.getElementById("attacker-name").addEventListener("input", async () => {
      await populateMovesForAttacker();
      await populateAbilitiesForSide("attacker");
      await updateSideSprite("attacker");
    });
    document.getElementById("defender-name").addEventListener("input", async () => {
      await populateAbilitiesForSide("defender");
      await updateSideSprite("defender");
    });
    document.getElementById("speed-pokemon").addEventListener("input", async () => {
      const entry = getRosterEntry(document.getElementById("speed-pokemon").value);
      speedCalcSp = 0;
      await updateSpeedSprite();
      if (!entry) {
        updateSpeedResult();
        return;
      }
      document.getElementById("speed-base").value = entry.baseSpeed;
      updateSpeedResult();
    });
  }

  function getPickerKind(control) {
    if (!control) return "";
    if (control.classList.contains("move-picker-input")) return "move";
    if (control.classList.contains("team-slot") || ["attacker-name", "defender-name", "speed-pokemon"].includes(control.id)) return "pokemon";
    if (control.classList.contains("team-item") || ["attacker-item", "defender-item"].includes(control.id)) return "item";
    if (control.classList.contains("team-ability") || ["attacker-ability", "defender-ability"].includes(control.id)) return "ability";
    return "";
  }

  function bindPickerControl(control) {
    const kind = getPickerKind(control);
    if (!kind) return;
    control.dataset.pickerKind = kind;
    control.readOnly = true;
    control.addEventListener("click", () => openPickerForControl(control));
    control.addEventListener("focus", () => openPickerForControl(control));
    control.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPickerForControl(control);
      }
    });
  }

  function setupMovePicker() {
    document.querySelectorAll(".move-picker-input, .team-slot, .team-item, .team-ability, #attacker-name, #defender-name, #speed-pokemon, #attacker-item, #defender-item, #attacker-ability, #defender-ability").forEach((control) => {
      bindPickerControl(control);
    });
    movePickerSearch?.addEventListener("input", renderMovePickerResults);
    movePickerClose?.addEventListener("click", closeMovePicker);
    movePicker?.addEventListener("click", (event) => {
      if (event.target === movePicker) closeMovePicker();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && movePicker?.classList.contains("is-open")) closeMovePicker();
    });
  }

  async function openPickerForControl(control) {
    const kind = getPickerKind(control);
    if (!kind) return;
    const context = kind === "move"
      ? await getMovePickerContext(control)
      : await getChooserContext(control, kind);
    if (!context) return;
    if (kind === "move" && (!context.entry || !context.legalMoves.length)) return;
    if (kind !== "move" && (!context.options || !context.options.length)) return;
    movePickerState.kind = kind;
    movePickerState.control = control;
    movePickerState.entry = context.entry || null;
    movePickerState.legalMoves = context.legalMoves || [];
    movePickerState.ranked = context.ranked || [];
    movePickerState.slotState = context.slotState || null;
    movePickerState.options = context.options || [];
    movePickerSearch.value = "";
    movePickerTitle.textContent = kind === "move" ? "Choose Move" : kind === "pokemon" ? "Choose Pokemon" : kind === "item" ? "Choose Item" : "Choose Ability";
    movePickerSearch.placeholder = kind === "move" ? "Search Moves..." : kind === "pokemon" ? "Search Pokemon..." : kind === "item" ? "Search Items..." : "Search Abilities...";
    movePicker.classList.add("is-open");
    movePicker.setAttribute("aria-hidden", "false");
    renderMovePickerResults();
    movePickerSearch.focus();
  }

  function closeMovePicker() {
    movePicker.classList.remove("is-open");
    movePicker.setAttribute("aria-hidden", "true");
  }

  async function getMovePickerContext(control) {
    if (control.id === "attacker-move") {
      const entry = getRosterEntry(document.getElementById("attacker-name").value);
      const legalMoves = entry ? await getLegalMovesForEntry(entry) : [];
      const ranked = entry ? await rankDamagingMoves(entry, legalMoves, getEntryOffenseProfile(entry), inferCoverageTargetsFromContext({ focus: "", notes: "" }), {}) : [];
      return { entry, legalMoves, ranked, slotState: null };
    }
    if (control.classList.contains("team-move")) {
      const slotIndex = Number(control.dataset.slot);
      const slotState = getTeamBuilderState()[slotIndex];
      const entry = getRosterEntry(slotState?.name || "");
      const legalMoves = entry ? await getLegalMovesForEntry(entry) : [];
      const ranked = entry ? await rankDamagingMoves(entry, legalMoves, getOffenseProfile(slotState, entry), inferCoverageTargetsFromContext({ focus: "", notes: "" }), {}) : [];
      return { entry, legalMoves, ranked, slotState };
    }
    return { entry: null, legalMoves: [], ranked: [], slotState: null };
  }

  async function getChooserContext(control, kind) {
    if (kind === "pokemon") {
      const currentTeam = getTeamBuilderState();
      const slotIndex = control.dataset.slot != null ? Number(control.dataset.slot) : -1;
      const chosen = currentTeam
        .map((slot, index) => (index === slotIndex ? null : getRosterEntry(slot.name)))
        .filter(Boolean);
      const focusText = `${document.getElementById("ai-builder-focus")?.value || ""} ${teamImportInput?.value || ""}`.trim().toLowerCase();
      const desiredTypes = inferDesiredTypesFromText(focusText);
      const options = await Promise.all(championsRoster.map(async (entry) => ({
        value: entry.name,
        row: await buildPokemonPickerRow(entry, chosen, desiredTypes)
      })));
      return { entry: null, options };
    }
    if (kind === "item") {
      const entry = resolvePickerEntryForControl(control);
      if (!entry) return { entry: null, options: [] };
      const slotState = resolvePickerSlotState(control);
      const options = await Promise.all(legalItems.map(async (item) => ({
        value: item,
        row: await buildItemPickerRow(item, entry, slotState)
      })));
      return { entry, options, slotState };
    }
    if (kind === "ability") {
      const entry = resolvePickerEntryForControl(control);
      if (!entry) return { entry: null, options: [] };
      const slotState = resolvePickerSlotState(control);
      const abilities = await getPokemonAbilities(entry);
      const options = await Promise.all(abilities.map(async (ability) => ({
        value: ability,
        row: await buildAbilityPickerRow(ability, entry, slotState)
      })));
      return { entry, options, slotState };
    }
    return null;
  }

  function resolvePickerEntryForControl(control) {
    if (control.classList.contains("team-item") || control.classList.contains("team-ability")) {
      return getRosterEntry(document.querySelector(`.team-slot[data-slot="${control.dataset.slot}"]`)?.value || "");
    }
    if (["attacker-item", "attacker-ability"].includes(control.id)) return getRosterEntry(document.getElementById("attacker-name").value);
    if (["defender-item", "defender-ability"].includes(control.id)) return getRosterEntry(document.getElementById("defender-name").value);
    return null;
  }

  function resolvePickerSlotState(control) {
    if (control.classList.contains("team-item") || control.classList.contains("team-ability")) {
      return getTeamBuilderState()[Number(control.dataset.slot)] || null;
    }
    if (["attacker-item", "attacker-ability"].includes(control.id)) {
      return {
        name: document.getElementById("attacker-name").value,
        item: document.getElementById("attacker-item").value,
        ability: document.getElementById("attacker-ability").value,
        nature: document.getElementById("attacker-nature").value,
        sps: getSpSpread("attacker"),
        moves: [document.getElementById("attacker-move").value].filter(Boolean)
      };
    }
    if (["defender-item", "defender-ability"].includes(control.id)) {
      return {
        name: document.getElementById("defender-name").value,
        item: document.getElementById("defender-item").value,
        ability: document.getElementById("defender-ability").value,
        nature: document.getElementById("defender-nature").value,
        sps: getSpSpread("defender"),
        moves: []
      };
    }
    return null;
  }

  async function renderMovePickerResults() {
    const query = normalizeNameKey(movePickerSearch.value || "");
    if (movePickerState.kind === "move") {
      const filtered = movePickerState.legalMoves.filter((move) => !query || normalizeNameKey(move).includes(query));
      if (!filtered.length) {
        movePickerHead.innerHTML = buildPickerHead("move");
        movePickerResults.innerHTML = `<div class="move-picker__empty">No legal moves matched that search.</div>`;
        return;
      }
      const rows = await Promise.all(filtered.slice(0, 80).map(async (move) => {
        const detail = await getMoveDetail(move);
        const typeName = detail?.type?.name ? prettyMoveName(detail.type.name) : "Status";
        const desc = formatMoveDescription(detail, move);
        const power = formatMovePowerForDisplay(move, detail);
        const accuracy = detail?.accuracy ? `${detail.accuracy}%` : "-";
        const pp = detail?.pp ?? "-";
        const fit = await scorePickerMove(movePickerState.entry, movePickerState.slotState, move, detail, movePickerState.ranked);
        return { move, typeName, desc, power, accuracy, pp, fit };
      }));
      movePickerHead.className = "move-picker__head move-picker__head--move";
      movePickerHead.innerHTML = buildPickerHead("move");
      movePickerResults.innerHTML = rows.map((row) => `
        <button class="move-picker__row move-picker__row--move ${movePickerState.control?.value === row.move ? "is-active" : ""}" type="button" data-pick-value="${escapeAttribute(row.move)}">
          <span class="move-picker__name"><span class="move-picker__type-dot" style="background:${getTypeColor(row.typeName)}"></span>${row.move}</span>
          <span class="move-picker__fit">${row.fit}%</span>
          <span class="move-picker__desc">${escapeHtml(row.desc)}</span>
          <span class="move-picker__stat">${row.power}</span>
          <span class="move-picker__stat">${row.accuracy}</span>
          <span class="move-picker__stat">${row.pp}</span>
        </button>
      `).join("");
    } else {
      const filtered = movePickerState.options.filter((option) => !query || normalizeNameKey(option.value).includes(query));
      movePickerHead.className = `move-picker__head move-picker__head--${movePickerState.kind === "pokemon" ? "pokemon" : "simple"}`;
      movePickerHead.innerHTML = buildPickerHead(movePickerState.kind);
      if (!filtered.length) {
        movePickerResults.innerHTML = `<div class="move-picker__empty">No ${movePickerState.kind} options matched that search.</div>`;
        return;
      }
      movePickerResults.innerHTML = filtered.slice(0, 80).map((option) => option.row).join("");
    }
    movePickerResults.querySelectorAll("[data-pick-value]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!movePickerState.control) return;
        movePickerState.control.value = button.dataset.pickValue;
        if (movePickerState.control.classList.contains("team-move")) {
          markMoveFieldChange(movePickerState.control, movePickerState.control.value);
        }
        movePickerState.control.dispatchEvent(new Event("input", { bubbles: true }));
        movePickerState.control.dispatchEvent(new Event("change", { bubbles: true }));
        closeMovePicker();
      });
    });
  }

  function buildPickerHead(kind) {
    if (kind === "pokemon") {
      return `<span>Pokemon</span><span>Fit</span><span>Typing</span><span>HP</span><span>Atk</span><span>Def</span><span>SpA</span><span>SpD</span><span>Spe</span>`;
    }
    if (kind === "item") {
      return `<span>Item</span><span>Fit</span><span>Description</span>`;
    }
    if (kind === "ability") {
      return `<span>Ability</span><span>Fit</span><span>Description</span>`;
    }
    return `<span>Move</span><span>Fit</span><span>Description</span><span>Power</span><span>Accuracy</span><span>PP</span>`;
  }

  async function buildPokemonPickerRow(entry, chosen, desiredTypes) {
    const score = Math.max(0, Math.min(100, Math.round(
      40
      + (metaThreats.find((threat) => normalizeNameKey(threat.name) === normalizeNameKey(entry.name))?.weight || 0)
      + scoreWeatherArchetypeFit(entry, chosen)
      + (desiredTypes.some((type) => entry.types.includes(type)) ? 12 : 0)
      - (violatesSpeciesClause(chosen, entry) ? 100 : 0)
    )));
    const sprite = getSpriteUrl(entry.apiName || toApiSpeciesName(entry.name)) || POKEBALL_PLACEHOLDER;
    return `
      <button class="move-picker__row move-picker__row--pokemon ${movePickerState.control?.value === entry.name ? "is-active" : ""}" type="button" data-pick-value="${escapeAttribute(entry.name)}">
        <span class="move-picker__name"><img class="picker-icon" src="${sprite}" onerror="this.onerror=null;this.src='${POKEBALL_PLACEHOLDER}'" alt="${escapeAttribute(entry.name)} sprite" />${escapeHtml(entry.name)}</span>
        <span class="move-picker__fit">${score}%</span>
        <span class="picker-type-list">${entry.types.map((type) => `<span class="picker-type-chip" style="background:${getTypeColor(type)}">${escapeHtml(type)}</span>`).join("")}</span>
        <span class="move-picker__stat">${entry.baseStats?.[0] ?? "-"}</span>
        <span class="move-picker__stat">${entry.baseStats?.[1] ?? "-"}</span>
        <span class="move-picker__stat">${entry.baseStats?.[2] ?? "-"}</span>
        <span class="move-picker__stat">${entry.baseStats?.[3] ?? "-"}</span>
        <span class="move-picker__stat">${entry.baseStats?.[4] ?? "-"}</span>
        <span class="move-picker__stat">${entry.baseStats?.[5] ?? "-"}</span>
      </button>
    `;
  }

  async function buildItemPickerRow(item, entry, slotState) {
    const detail = await getItemDetail(item);
    const desc = formatItemDescription(detail, item);
    const sprite = detail?.sprites?.default || POKEBALL_PLACEHOLDER;
    const suggested = getSuggestedItem(entry, { mode: "pokemon", focus: entry.name, notes: "", chosen: [], currentDraft: slotState ? [slotState] : [] }, slotState?.moves || []);
    const fit = normalizeNameKey(item) === normalizeNameKey(suggested) ? 96 : 58;
    return `
      <button class="move-picker__row move-picker__row--simple ${movePickerState.control?.value === item ? "is-active" : ""}" type="button" data-pick-value="${escapeAttribute(item)}">
        <span class="move-picker__name"><img class="picker-icon picker-icon--item" src="${sprite}" onerror="this.onerror=null;this.src='${POKEBALL_PLACEHOLDER}'" alt="${escapeAttribute(item)} icon" />${escapeHtml(item)}</span>
        <span class="move-picker__fit">${fit}%</span>
        <span class="move-picker__desc">${escapeHtml(desc)}</span>
      </button>
    `;
  }

  async function buildAbilityPickerRow(ability, entry, slotState) {
    const detail = await getAbilityDetail(ability);
    const desc = formatAbilityDescription(detail, ability);
    const suggested = getSuggestedAbility(entry, await getPokemonAbilities(entry), { mode: "pokemon", focus: entry.name, notes: "", chosen: [], currentDraft: slotState ? [slotState] : [] }, slotState?.moves || []);
    const fit = normalizeNameKey(ability) === normalizeNameKey(suggested) ? 96 : 62;
    return `
      <button class="move-picker__row move-picker__row--simple ${movePickerState.control?.value === ability ? "is-active" : ""}" type="button" data-pick-value="${escapeAttribute(ability)}">
        <span class="move-picker__name"><span class="move-picker__type-dot" style="background:linear-gradient(135deg, #ff7ca8, #7d63ff)"></span>${escapeHtml(ability)}</span>
        <span class="move-picker__fit">${fit}%</span>
        <span class="move-picker__desc">${escapeHtml(desc)}</span>
      </button>
    `;
  }

  async function scorePickerMove(entry, slotState, moveName, detail, rankedMoves) {
    const key = normalizeNameKey(moveName);
    const rankedIndex = rankedMoves.findIndex((row) => normalizeNameKey(row.name) === key);
    let score = rankedIndex >= 0 ? Math.max(28, 100 - rankedIndex * 4) : (detail?.power ? Math.max(34, Math.min(90, Number(detail.power))) : 36);
    const supportMoves = new Set(["protect", "tailwind", "trick room", "taunt", "helping hand", "encore", "icy wind", "electroweb", "will-o-wisp", "thunder wave", "coaching", "parting shot", "fake out"]);
    if (isSupportEntry(entry) && supportMoves.has(key)) score += 26;
    if (!isSupportEntry(entry) && supportMoves.has(key)) score -= 14;
    if (isPolicyAllowListed(entry, moveName)) score += 12;
    if (!isPolicyAllowListed(entry, moveName) && RECHARGE_OR_BAD_COMMIT_MOVES.has(key)) score = 0;
    if (!isPolicyAllowListed(entry, moveName) && STRONGLY_DISCOURAGED_MOVES.has(key)) score = 0;
    if (!isPolicyAllowListed(entry, moveName) && isPolicyHardDiscouraged(entry, moveName)) score = Math.min(score, 6);
    if (!isPolicyAllowListed(entry, moveName) && isPolicyConditionallyDiscouraged(entry, moveName, movePickerState.slotState || {}, movePickerState.legalMoves || [])) score = Math.min(score, 18);
    if (["stored power", "steel roller", "solar beam", "solar blade"].includes(key)) score = Math.min(score, 18);
    if (detail?.accuracy && Number(detail.accuracy) === 100) score += 6;
    if (detail?.accuracy && Number(detail.accuracy) < 100) score -= Math.min(16, (100 - Number(detail.accuracy)) / 2);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function isSupportEntry(entry) {
    if (!entry) return false;
    if (SUPPORT_ROLE_LOCKS.has(normalizeNameKey(entry.name))) return true;
    return !HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name))
      && !HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))
      && !HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))
      && ((entry.baseStats[1] || 0) < 115 && (entry.baseStats[3] || 0) < 115);
  }

  function setupTeamBuilderControls() {
    document.querySelectorAll(".team-slot").forEach((select) => {
      select.addEventListener("input", async (event) => {
        const slotIndex = Number(event.currentTarget.dataset.slot);
        const previousName = event.currentTarget.dataset.currentSpecies || "";
        const currentName = event.currentTarget.value || "";
        if (normalizeNameKey(previousName) !== normalizeNameKey(currentName)) {
          resetTeamBuilderSlotData(slotIndex);
        }
        await refreshTeamSlotOptions(slotIndex);
        syncTeamMegaStone(slotIndex);
        await updateTeamSlotSprite(slotIndex);
        event.currentTarget.dataset.currentSpecies = getRosterEntry(currentName)?.name || currentName;
        if (normalizeNameKey(previousName) !== normalizeNameKey(currentName)) {
          animateTeamCard(slotIndex, previousName && currentName ? "is-slot-replaced" : "is-slot-added");
        } else if (currentName) {
          animateTeamCard(slotIndex, "is-slot-updated");
        }
        notifyTeamBuilderStateChange("team-slot", slotIndex);
        analyzeTeamBuilder();
      });
    });
    document.querySelectorAll(".team-item, .team-ability, .team-nature, .team-move").forEach((select) => {
      if (select.classList.contains("team-item")) {
        select.addEventListener("change", (event) => {
          enforceManualItemClause(event.currentTarget);
          animateTeamCard(Number(event.currentTarget.dataset.slot), "is-slot-updated");
          notifyTeamBuilderStateChange("team-item", Number(event.currentTarget.dataset.slot));
          analyzeTeamBuilder();
        });
        return;
      }
      const handleTeamControlChange = (event) => {
        const slotIndex = Number(event.currentTarget.dataset.slot);
        const nextValue = event.currentTarget.value || "";
        const previousValue = event.currentTarget.dataset.lastUiValue ?? "";
        const changed = previousValue !== nextValue;
        if (!changed && event.type === "change") return;
        event.currentTarget.dataset.lastUiValue = nextValue;
        if (event.currentTarget.classList.contains("team-move")) {
          if (!changed) return;
          markMoveFieldChange(event.currentTarget, nextValue);
        }
        animateTeamCard(slotIndex, "is-slot-updated");
        notifyTeamBuilderStateChange(event.currentTarget.classList.contains("team-move") ? "team-move" : "team-control", slotIndex);
        analyzeTeamBuilder();
      };
      select.addEventListener("input", handleTeamControlChange);
      select.addEventListener("change", handleTeamControlChange);
    });
  }

  function resetTeamBuilderSlotData(slotIndex) {
    const itemControl = document.querySelector(`.team-item[data-slot="${slotIndex}"]`);
    const abilityControl = document.querySelector(`.team-ability[data-slot="${slotIndex}"]`);
    const natureControl = document.querySelector(`.team-nature[data-slot="${slotIndex}"]`);
    const moveControls = Array.from(document.querySelectorAll(`.team-move[data-slot="${slotIndex}"]`));
    if (itemControl) itemControl.value = "";
    if (abilityControl) abilityControl.value = "";
    if (natureControl) natureControl.value = "";
    moveControls.forEach((control) => {
      control.value = "";
      control.dataset.lastMoveValue = "";
    });
    applyImportedTeamSlotSpSpread(slotIndex, {});
  }

  function setupSpeedTools() {
    ["speed-base", "speed-iv", "speed-nature-mode", "speed-stage", "speed-tailwind", "speed-scarf", "speed-weather", "speed-ability-mod"].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener("input", updateSpeedResult);
      el.addEventListener("change", updateSpeedResult);
    });
    updateSpeedResult();
  }

  function updateSpeedResult() {
    const base = Number(document.getElementById("speed-base").value) || 100;
    const level = 50;
    const sp = Number(speedCalcSp) || 0;
    const iv = Number(document.getElementById("speed-iv").value) || 31;
    const natureMode = document.getElementById("speed-nature-mode").value;
    const stage = Number(document.getElementById("speed-stage").value) || 0;
    const tailwind = document.getElementById("speed-tailwind").checked;
    const scarf = document.getElementById("speed-scarf").checked;
    const weather = document.getElementById("speed-weather").value || "";
    const abilityMod = document.getElementById("speed-ability-mod").value || "";
    const selected = getRosterEntry(document.getElementById("speed-pokemon").value);
    const ev = spToEv(sp);
    const natureMultiplier = natureMode === "boost" ? 1.1 : natureMode === "drop" ? 0.9 : 1;
    const raw = Math.floor(((((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureMultiplier);
    const weatherAbilityMultiplier = getSpeedAbilityMultiplier(abilityMod, weather);
    const modified = applyStage(raw, stage) * (tailwind ? 2 : 1) * (scarf ? 1.5 : 1) * weatherAbilityMultiplier;

    speedResult.innerHTML = `
      <p class="result-title">Speed Result</p>
      <p class="result-copy">Final Speed: <strong>${Math.floor(modified)}</strong></p>
      <p class="result-copy">Base stat result before modifiers: ${raw}</p>
      <p class="result-copy">${selected ? `${selected.name} base Speed ${selected.baseSpeed} at level 50.` : "Choose a roster Pokemon or enter a custom base Speed."}</p>
      <p class="result-copy">Active modifiers: ${[tailwind ? "Tailwind" : null, scarf ? "Choice Scarf" : null, stage !== 0 ? `Stage ${stage > 0 ? `+${stage}` : stage}` : null, weather ? `Weather: ${weather}` : null, formatSpeedAbilityModLabel(abilityMod, weatherAbilityMultiplier)].filter(Boolean).join(", ") || "None"}</p>
    `;
  }

  function getSpeedAbilityMultiplier(abilityMod, weather = "") {
    const key = normalizeNameKey(abilityMod || "");
    if (!key) return 1;
    if (key === "unburden") return 2;
    if (key === "swift swim" || key === "swift-swim") return weather === "Rain" ? 2 : 1;
    if (key === "chlorophyll") return weather === "Sun" ? 2 : 1;
    if (key === "sand rush" || key === "sand-rush") return weather === "Sand" ? 2 : 1;
    if (key === "slush rush" || key === "slush-rush") return weather === "Snow" ? 2 : 1;
    if (key === "surge surfer" || key === "surge-surfer") return 2;
    return 1;
  }

  function formatSpeedAbilityModLabel(abilityMod, multiplier) {
    if (!abilityMod) return null;
    const pretty = prettyMoveName(String(abilityMod).replace(/-/g, " "));
    return multiplier > 1 ? `${pretty} active` : `${pretty} inactive`;
  }

  function renderSpeedChart() {
    const tiers = META_SPEED_BENCHMARKS
      .map((benchmark) => {
        const entry = getRosterEntry(benchmark.name);
        if (!entry) return null;
        const speed = calculateLv50SpeedWithSpread(entry.baseSpeed, benchmark.speedSp, benchmark.nature, benchmark.item);
        return {
          ...benchmark,
          speed,
          entry
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.speed - a.speed);
    const maxSpeed = Math.max(...tiers.map((entry) => entry.speed));
    speedChart.innerHTML = tiers.map((tier) => `
      <div class="speed-bar">
        <div class="speed-bar__label">
          <span>${tier.name}</span>
          <span>${tier.speed}</span>
        </div>
        <div class="speed-bar__meta">${tier.nature}${tier.speedSp ? ` | ${tier.speedSp} SP` : " | 0 SP"}${tier.item ? ` | ${tier.item}` : ""} | ${tier.note}</div>
        <div class="speed-bar__track">
          <div class="speed-bar__fill" style="width:${((tier.speed / maxSpeed) * 100).toFixed(1)}%"></div>
        </div>
      </div>
    `).join("");
  }

  function calculateLv50Speed(baseSpeed) {
    return Math.floor(((((2 * baseSpeed + 31 + Math.floor(spToEv(32) / 4)) * 50) / 100) + 5) * 1.1);
  }

  function calculateLv50SpeedWithSpread(baseSpeed, speedSp, nature, item) {
    const boostedNatures = new Set(["Timid", "Hasty", "Jolly", "Naive"]);
    const loweredNatures = new Set(["Brave", "Relaxed", "Quiet", "Sassy"]);
    const ev = spToEv(speedSp || 0);
    const natureMultiplier = boostedNatures.has(nature) ? 1.1 : loweredNatures.has(nature) ? 0.9 : 1;
    const raw = Math.floor(((((2 * baseSpeed + 31 + Math.floor(ev / 4)) * 50) / 100) + 5) * natureMultiplier);
    return Math.floor(raw * (normalizeNameKey(item || "") === "choice scarf" ? 1.5 : 1));
  }

  function setSelectOptions(select, options, placeholder) {
    const currentValue = select.value;
    select._allOptions = options;
    if (select.tagName === "INPUT") {
      const listId = buildListId(select);
      let list = document.getElementById(listId);
      if (!list) {
        list = document.createElement("datalist");
        list.id = listId;
        select.insertAdjacentElement("afterend", list);
      }
      list.innerHTML = "";
      options.forEach((option) => {
        const item = document.createElement("option");
        item.value = option.value;
        item.label = option.text;
        list.appendChild(item);
      });
      select.setAttribute("list", listId);
      select.setAttribute("autocomplete", "off");
      select.setAttribute("spellcheck", "false");
      if (placeholder) select.placeholder = placeholder;
      if (currentValue && options.some((option) => normalizeNameKey(option.value) === normalizeNameKey(currentValue))) {
        select.value = options.find((option) => normalizeNameKey(option.value) === normalizeNameKey(currentValue)).value;
      }
      return;
    }

    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder || "Choose option";
    select.appendChild(first);
    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.text;
      select.appendChild(item);
    });
    if ([...select.options].some((option) => normalizeNameKey(option.value) === normalizeNameKey(currentValue))) {
      select.value = [...select.options].find((option) => normalizeNameKey(option.value) === normalizeNameKey(currentValue)).value;
    }
  }

  function buildListId(control) {
    const rawId = `${control.id || control.className || "combo"}-${control.dataset.slot || "base"}-${control.dataset.moveSlot || "all"}-list`;
    return rawId.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  }

  function controlHasOption(control, value) {
    return Boolean(resolveControlValue(control, value));
  }

  function resolveControlValue(control, value) {
    if (!control || !value) return "";
    const options = control._allOptions || Array.from(control.options || []).map((option) => ({ value: option.value, text: option.textContent }));
    const match = options.find((option) => normalizeNameKey(option.value) === normalizeNameKey(value));
    return match ? match.value : "";
  }

  function getConfiguredCustomMovepoolPath() {
    const configured = typeof window !== "undefined" ? window.MBWR_CUSTOM_MOVEPOOL_PATH : "";
    return typeof configured === "string" ? configured.trim() : "";
  }

  async function loadCustomMovepool() {
    const movepoolPath = getConfiguredCustomMovepoolPath();
    if (!movepoolPath) {
      console.info("[MBWR] custom movepool: skipped (no MBWR_CUSTOM_MOVEPOOL_PATH configured)");
      return;
    }
    try {
      const response = await fetch(movepoolPath);
      if (!response.ok) {
        console.warn("[MBWR] custom movepool: request failed", {
          path: movepoolPath,
          status: response.status
        });
        return;
      }
      const payload = await response.json();
      normalizeMovepool(payload);
    } catch (error) {
      console.warn("[MBWR] custom movepool: load failed", {
        path: movepoolPath,
        error
      });
    }
  }

  async function loadMoveDiscouragePolicy() {
    try {
      const response = await fetch(MOVE_POLICY_PATH);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload && payload.roles) {
        moveDiscouragePolicy = payload;
      }
    } catch (error) {
      // Keep current built-in heuristics if the policy file cannot be loaded.
    }
  }

  function getPolicyRoleKey(entry) {
    return isSupportEntry(entry) ? "support" : "attacker";
  }

  function getRolePolicy(entry) {
    const roleKey = getPolicyRoleKey(entry);
    return moveDiscouragePolicy?.roles?.[roleKey] || null;
  }

  function isPolicyAllowListed(entry, moveName) {
    const policy = getRolePolicy(entry);
    const allowed = policy?.allow_list || [];
    return allowed.some((move) => normalizeNameKey(move) === normalizeNameKey(moveName));
  }

  function isPolicyHardDiscouraged(entry, moveName) {
    const policy = getRolePolicy(entry);
    const discouraged = policy?.hard_discourage || [];
    return discouraged.some((move) => normalizeNameKey(move) === normalizeNameKey(moveName));
  }

  function isPolicyConditionallyDiscouraged(entry, moveName, context = {}, legalMoves = []) {
    if (isPolicyAllowListed(entry, moveName)) return false;
    const key = normalizeNameKey(moveName);
    const policy = getRolePolicy(entry);
    if (!policy?.conditional_discourage) return false;
    const weatherContext = inferMoveRequirementContext(entry, context, legalMoves);
    if ((policy.conditional_discourage.only_if_team_mode_does_not_use_them || []).some((move) => normalizeNameKey(move) === key)) {
      if (key === "tailwind") return !(context.requestedModes?.tailwind);
      if (key === "trick room") return !(context.requestedModes?.trickRoom);
      if (["rain dance", "sunny day", "sandstorm", "snowscape"].includes(key)) return !(`${context.focus || ""} ${context.notes || ""}`.toLowerCase().includes(key.split(" ")[0]));
      if (["electric terrain", "psychic terrain", "grassy terrain", "misty terrain"].includes(key)) return !weatherContext.terrain;
      return true;
    }
    if ((policy.conditional_discourage.only_if_no_synergy_or_set_support || []).some((move) => normalizeNameKey(move) === key)) {
      return !isMoveUsefulInCurrentWeather(moveName, weatherContext);
    }
    return false;
  }

  const TWO_TURN_MOVE_KEYS = new Set([
    "solar beam", "solar blade",
    "meteor beam",
    "electro shot",
    "dig", "dive", "fly", "bounce",
    "phantom force", "shadow force",
    "skull bash", "razor wind", "sky attack",
    "freeze shock", "ice burn"
  ]);

  function isTwoTurnMove(moveName) {
    return TWO_TURN_MOVE_KEYS.has(normalizeNameKey(moveName));
  }

  function getRealWeatherModesFromContext(entry, context = {}, legalMoves = []) {
    const modes = new Set(inferTeamWeatherProfile(context.currentDraft || []).modes || []);
    (context.chosen || []).filter(Boolean).forEach((candidate) => {
      const mode = getWeatherSetterMode(candidate);
      if (mode) modes.add(mode);
    });
    const selfMode = getWeatherSetterMode(entry);
    if (selfMode) modes.add(selfMode);
    return modes;
  }

  function isTwoTurnMoveInvalid(moveName, pokemon, context = {}, legalMoves = []) {
    const key = normalizeNameKey(moveName);
    const weatherModes = getRealWeatherModesFromContext(pokemon, context, legalMoves);
    if (key === "meteor beam") return true;
    if (key === "solar beam" || key === "solar blade") {
      if (normalizeNameKey(pokemon?.name || "") === "mega meganium") return false;
      return !weatherModes.has("sun");
    }
    if (key === "electro shot") {
      return !weatherModes.has("rain");
    }
    if (isTwoTurnMove(key)) {
      return true;
    }
    return false;
  }

  function isMoveContextuallyInvalid(entry, moveName, context = {}, legalMoves = []) {
    const key = normalizeNameKey(moveName);
    const weatherContext = inferMoveRequirementContext(entry, context, legalMoves);
    const buildRules = getCompetitiveBuildRules(context);
    if (isTwoTurnMoveInvalid(moveName, entry, context, legalMoves)) {
      return true;
    }
    if (buildRules.intent === "hard_tr" && !buildRules.hybridSpeed && ["tailwind", "icy wind", "electroweb", "thunder wave"].includes(key)) {
      return true;
    }
    if (buildRules.intent === "tailwind" && !buildRules.hybridSpeed && key === "trick room") {
      return true;
    }
    if (buildRules.hyperOffense && ["life dew", "recover", "slack off", "wish", "heal pulse"].includes(key)) {
      return true;
    }
    return false;
  }

  async function loadLegalItems() {
    const hardcoded = [...HARD_LEGAL_ITEMS].sort((a, b) => a.localeCompare(b));
    legalItems.splice(0, legalItems.length, ...hardcoded);
    window.CHAMPIONS_ITEM_VALIDATION = {
      source: "hardcoded",
      mergedCount: hardcoded.length,
      isAligned: true
    };
    setupItemSelects();
    await refreshAllTeamBuilderOptions();
  }

  function parseItemsJson(payload) {
    return Object.keys(payload || {})
      .map((item) => item.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  function parseItemsText(raw) {
    const tabParsed = raw
      .split(/\r?\n/)
      .map((line) => {
        const match = line.match(/^\t([^\t]+)\t/);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean);

    if (tabParsed.length) {
      return tabParsed.filter((item, index, array) => array.indexOf(item) === index);
    }

    const ignoredLines = new Set([
      "Items", "Hold Items", "Picture", "Name", "Effect", "Location",
      "Beginning", "Mega Stone", "Berries"
    ]);
    const ignoreFragments = ["VP", "Pok", "Shop", "In the games", "Each item has", "added perks", "status condition"];
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/\uFFFD/g, "").trim())
      .filter(Boolean)
      .filter((line) => !ignoredLines.has(line))
      .filter((line) => !ignoreFragments.some((fragment) => line.includes(fragment)))
      .filter((line) => /^[A-Z][A-Za-z' -]+$/.test(line))
      .filter((line) => line.split(/\s+/).length <= 4)
      .filter((line) => !/^[A-Z][a-z]+ [a-z]/.test(line))
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  function mergeLegalItems(jsonItems, textItems) {
    const jsonSet = new Set(jsonItems.map(normalizeNameKey));
    const textSet = new Set(textItems.map(normalizeNameKey));
    const missingFromJson = textItems.filter((item) => !jsonSet.has(normalizeNameKey(item)));
    const extraInJson = jsonItems.filter((item) => !textSet.has(normalizeNameKey(item)));
    const items = [...new Set([...jsonItems, ...textItems])].sort((a, b) => a.localeCompare(b));
    const validation = {
      jsonCount: jsonItems.length,
      textCount: textItems.length,
      mergedCount: items.length,
      missingFromJson,
      extraInJson,
      isAligned: missingFromJson.length === 0 && extraInJson.length === 0
    };
    if (!validation.isAligned) {
      console.warn("Legal item source mismatch detected.", validation);
    }
    return { items, validation };
  }

  function normalizeMovepool(payload) {
    if (Array.isArray(payload)) {
      payload.forEach((entry) => {
        if (!entry || !entry.name) return;
        customMovepool.set(normalizeNameKey(entry.name), (entry.moves || []).map(prettyMoveName));
      });
      return;
    }
    Object.entries(payload || {}).forEach(([name, value]) => {
      if (Array.isArray(value)) {
        customMovepool.set(normalizeNameKey(name), value.map(prettyMoveName));
      } else if (value && Array.isArray(value.moves)) {
        customMovepool.set(normalizeNameKey(name), value.moves.map(prettyMoveName));
      }
    });
  }

  async function populateMovesForAttacker() {
    const attackerName = document.getElementById("attacker-name").value;
    const moveSelect = document.getElementById("attacker-move");
    if (!attackerName) {
      setSelectOptions(moveSelect, [], "Select attacker first");
      return;
    }

    const rosterEntry = getRosterEntry(attackerName);
    if (!rosterEntry) {
      setSelectOptions(moveSelect, [], "Unknown Pokemon");
      return;
    }

    const legalMoves = legalPokemonData[rosterEntry.calcName]?.legalMoves;
    if (legalMoves && legalMoves.length) {
      setSelectOptions(moveSelect, [...new Set(legalMoves)].sort((a, b) => a.localeCompare(b)).map((move) => ({ value: move, text: move })), "Choose legal move");
      return;
    }

    const customMoves = customMovepool.get(normalizeNameKey(rosterEntry.name));
    if (customMoves && customMoves.length) {
      setSelectOptions(moveSelect, [...new Set(customMoves)].sort((a, b) => a.localeCompare(b)).map((move) => ({ value: move, text: move })), "Choose legal move");
      return;
    }

    const detail = await getPokemonDetail(rosterEntry);
    if (!detail) {
      setSelectOptions(moveSelect, [], "Move data unavailable");
      return;
    }

    const moves = [...new Set(detail.moves.map((item) => prettyMoveName(item.move.name)).sort((a, b) => a.localeCompare(b)))];
    setSelectOptions(moveSelect, moves.map((move) => ({ value: move, text: move })), "Choose legal move");
  }

  async function getPokemonDetail(entry) {
    if (!entry) return null;
    if (speciesCache.has(entry.apiName)) return speciesCache.get(entry.apiName);
    const lookupNames = [...new Set([entry.apiName, toApiSpeciesName(entry.baseName || entry.name), toApiSpeciesName(entry.name)])].filter(Boolean);
    for (const apiName of lookupNames) {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
        if (!response.ok) continue;
        const data = await response.json();
        speciesCache.set(entry.apiName, data);
        return data;
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  async function refreshAllSprites() {
    await Promise.all([
      updateSideSprite("attacker"),
      updateSideSprite("defender"),
      updateSpeedSprite(),
      ...Array.from({ length: 6 }, (_, slotIndex) => updateTeamSlotSprite(slotIndex))
    ]);
  }

  async function updateSideSprite(side) {
    await updateSpriteImage(
      document.getElementById(`${side}-sprite`),
      getRosterEntry(document.getElementById(`${side}-name`).value)
    );
  }

  async function updateSpeedSprite() {
    await updateSpriteImage(
      document.getElementById("speed-sprite"),
      getRosterEntry(document.getElementById("speed-pokemon").value)
    );
  }

  async function updateTeamSlotSprite(slotIndex) {
    await updateSpriteImage(
      document.getElementById(`team-sprite-${slotIndex}`),
      getRosterEntry(document.querySelector(`.team-slot[data-slot="${slotIndex}"]`)?.value)
    );
  }

  async function updateSpriteImage(img, entry) {
    if (!img) return;
    if (!entry) {
      img.src = POKEBALL_PLACEHOLDER;
      img.alt = "Pokeball placeholder";
      return;
    }
    const primarySprite = getSpriteUrl(entry.apiName || toApiSpeciesName(entry.name));
    const fallbackSprite = getSpriteUrl(toApiSpeciesName(entry.baseName || entry.name));
    img.onerror = () => {
      if (img.dataset.fallbackTried === "1") {
        img.onerror = null;
        img.src = POKEBALL_PLACEHOLDER;
        img.alt = `${entry.name} sprite unavailable`;
        return;
      }
      img.dataset.fallbackTried = "1";
      img.src = fallbackSprite || POKEBALL_PLACEHOLDER;
    };
    img.dataset.fallbackTried = "0";
    img.src = primarySprite || fallbackSprite || POKEBALL_PLACEHOLDER;
    img.alt = `${entry.name} sprite`;
  }

  function extractAbilityNames(detail) {
    return (detail?.abilities || [])
      .slice()
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((row) => prettyMoveName(row.ability.name));
  }

  const SPRITE_URL_OVERRIDES = {
    "kingambit": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/983.png",
    "sinistcha": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1013.png",
    "tauros-paldea": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10250.png",
    "tauros-paldea-blaze": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10251.png",
    "tauros-paldea-aqua": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10252.png"
  };
  const EXPORT_SPRITE_API_NAME_OVERRIDES = {
    "tauros-paldea": "tauros-paldea-combat-breed",
    "tauros-paldea-blaze": "tauros-paldea-blaze-breed",
    "tauros-paldea-aqua": "tauros-paldea-aqua-breed"
  };
  const exportSpriteUrlCache = new Map();

  function getSpriteUrl(apiName) {
    if (!apiName) return "";
    const normalized = apiName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-mega-x/g, "-megax")
      .replace(/-mega-y/g, "-megay")
      .replace(/-hisui/g, "-hisuian")
      .replace(/-galar/g, "-galarian")
      .replace(/-alola/g, "-alolan")
      .replace(/-f$/g, "-female")
      .replace(/-m$/g, "-male");
    if (SPRITE_URL_OVERRIDES[normalized]) return SPRITE_URL_OVERRIDES[normalized];
    return `https://img.pokemondb.net/sprites/home/normal/${normalized}.png`;
  }

  async function getPokemonAbilities(entry) {
    if (!entry) return [];
    const overrideAbilities = [
      ...getLocalAbilitiesForName(entry.name),
      ...getLocalAbilitiesForName(entry.baseName || "")
    ];
    const mergedLocal = [...new Set(overrideAbilities)];
    const expectedCount = getExpectedAbilityCount(entry);
    if (entry.abilities?.length) {
      return [...new Set([...entry.abilities, ...mergedLocal])].slice(0, Math.max(expectedCount, entry.abilities.length, mergedLocal.length));
    }
    if (abilityCache.has(entry.apiName)) return abilityCache.get(entry.apiName);
    const detail = await getPokemonDetail(entry);
    let merged = [...new Set([...mergedLocal, ...extractAbilityNames(detail)])];
    if (!isMegaEntry(entry) && merged.length < expectedCount && entry.baseName && normalizeNameKey(entry.baseName) !== normalizeNameKey(entry.name)) {
      const baseEntry = getRosterEntry(entry.baseName) || {
        name: entry.baseName,
        baseName: entry.baseName,
        apiName: toApiSpeciesName(entry.baseName)
      };
      const baseDetail = await getPokemonDetail(baseEntry);
      merged = [...new Set([
        ...merged,
        ...getLocalAbilitiesForName(entry.baseName),
        ...extractAbilityNames(baseDetail)
      ])];
    }
    if (!merged.length) merged = mergedLocal.slice();
    abilityCache.set(entry.apiName, merged.slice(0, Math.max(expectedCount, merged.length || expectedCount)));
    return abilityCache.get(entry.apiName);
  }

  async function refreshAllTeamBuilderOptions() {
    for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
      await refreshTeamSlotOptions(slotIndex);
    }
  }

  async function refreshTeamSlotOptions(slotIndex) {
    await populateTeamSlotAbilities(slotIndex);
    await populateTeamSlotMoves(slotIndex);
    syncTeamMegaStone(slotIndex);
  }

  async function populateTeamSlotAbilities(slotIndex) {
    const pokemonSelect = document.querySelector(`.team-slot[data-slot="${slotIndex}"]`);
    const abilitySelect = document.querySelector(`.team-ability[data-slot="${slotIndex}"]`);
    const selectedAbility = abilitySelect.value;
    const entry = getRosterEntry(pokemonSelect.value);
    if (!entry) {
      setSelectOptions(abilitySelect, [], "Select Pokemon first");
      return;
    }
    const abilities = await getPokemonAbilities(entry);
    setSelectOptions(abilitySelect, abilities.map((ability) => ({ value: ability, text: ability })), "Choose legal ability");
    if (controlHasOption(abilitySelect, selectedAbility)) abilitySelect.value = resolveControlValue(abilitySelect, selectedAbility);
  }

  async function populateTeamSlotMoves(slotIndex) {
    const pokemonSelect = document.querySelector(`.team-slot[data-slot="${slotIndex}"]`);
    const moveSelects = Array.from(document.querySelectorAll(`.team-move[data-slot="${slotIndex}"]`));
    const entry = getRosterEntry(pokemonSelect.value);
    const legalMoves = entry ? await getLegalMovesForEntry(entry) : [];
    moveSelects.forEach((select, moveIndex) => {
      const previousValue = select.value;
      setSelectOptions(select, legalMoves.map((move) => ({ value: move, text: move })), entry ? `Move ${moveIndex + 1}` : "Select Pokemon first");
      if (controlHasOption(select, previousValue)) select.value = resolveControlValue(select, previousValue);
    });
  }

  async function getLegalMovesForEntry(entry) {
    if (!entry) return [];
    const cacheKeys = [...new Set([
      normalizeNameKey(entry.name),
      normalizeNameKey(entry.baseName || ""),
      normalizeNameKey(entry.calcName || "")
    ].filter(Boolean))];
    const cachedMoves = cacheKeys
      .map((key) => legalMovesForEntryCache.get(key))
      .find((moves) => Array.isArray(moves) && moves.length);
    if (cachedMoves) {
      return [...cachedMoves];
    }
    const sourceName = entry.baseName || entry.calcName;
    const legalMoves = legalPokemonData[sourceName]?.legalMoves;
    if (legalMoves && legalMoves.length) {
      const normalizedMoves = [...new Set(legalMoves)].sort((a, b) => a.localeCompare(b));
      cacheKeys.forEach((key) => legalMovesForEntryCache.set(key, normalizedMoves));
      return [...normalizedMoves];
    }
    const customMoves = customMovepool.get(normalizeNameKey(entry.name));
    if (customMoves && customMoves.length) {
      const normalizedMoves = [...new Set(customMoves)].sort((a, b) => a.localeCompare(b));
      cacheKeys.forEach((key) => legalMovesForEntryCache.set(key, normalizedMoves));
      return [...normalizedMoves];
    }
    const detail = await getPokemonDetail(entry);
    if (!detail) return [];
    const normalizedMoves = [...new Set(detail.moves.map((item) => prettyMoveName(item.move.name)).sort((a, b) => a.localeCompare(b)))];
    cacheKeys.forEach((key) => legalMovesForEntryCache.set(key, normalizedMoves));
    return [...normalizedMoves];
  }

  async function populateAbilitiesForSide(side) {
    const select = document.getElementById(`${side}-ability`);
    const entry = getRosterEntry(document.getElementById(`${side}-name`).value);
    if (!entry) {
      setSelectOptions(select, [], "Select Pokemon first");
      return;
    }
    const abilities = await getPokemonAbilities(entry);
    setSelectOptions(select, abilities.map((ability) => ({ value: ability, text: ability })), "Choose legal ability");
  }

  async function getMoveDetail(name) {
    if (!name) return null;
    const key = normalizeApiName(name);
    if (moveCache.has(key)) return moveCache.get(key);
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/move/${key}`);
      if (!response.ok) throw new Error("Missing move");
      const data = await response.json();
      moveCache.set(key, data);
      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function getItemDetail(name) {
    if (!name) return null;
    const key = normalizeApiName(name);
    if (itemDetailCache.has(key)) return itemDetailCache.get(key);
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/item/${key}`);
      if (!response.ok) throw new Error("Missing item");
      const data = await response.json();
      itemDetailCache.set(key, data);
      return data;
    } catch (error) {
      itemDetailCache.set(key, null);
      return null;
    }
  }

  async function getAbilityDetail(name) {
    if (!name) return null;
    const key = normalizeApiName(name);
    if (abilityDetailCache.has(key)) return abilityDetailCache.get(key);
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/ability/${key}`);
      if (!response.ok) throw new Error("Missing ability");
      const data = await response.json();
      abilityDetailCache.set(key, data);
      return data;
    } catch (error) {
      abilityDetailCache.set(key, null);
      return null;
    }
  }

  function formatMoveDescription(detail, fallbackMoveName = "") {
    const effect = (detail?.effect_entries || []).find((entry) => entry.language?.name === "en")?.short_effect
      || (detail?.effect_entries || []).find((entry) => entry.language?.name === "en")?.effect
      || "";
    if (effect) {
      const chance = detail?.effect_chance;
      return effect
        .replace(/\$effect_chance%/gi, chance != null ? `${chance}%` : "its listed")
        .replace(/\$effect_chance/gi, chance != null ? `${chance}` : "its listed")
        .replace(/\$target/gi, "the target");
    }
    const typeName = detail?.type?.name ? prettyMoveName(detail.type.name) : "Unknown";
    const category = detail?.damage_class?.name ? prettyMoveName(detail.damage_class.name) : "move";
    const power = detail?.power ? ` ${detail.power} BP` : "";
    const accuracy = detail?.accuracy ? `, ${detail.accuracy}% accurate` : "";
    const hitCount = getGuaranteedMoveHitCount(fallbackMoveName);
    const multiHitText = hitCount > 1 ? ` It hits ${hitCount} times.` : "";
    return fallbackMoveName ? `${fallbackMoveName} is a ${typeName} ${category} move${power}${accuracy}.${multiHitText}` : "Move details unavailable.";
  }

  function getGuaranteedMoveHitCount(moveName) {
    return GUARANTEED_MULTI_HIT_MOVES[normalizeNameKey(moveName)] || 1;
  }

  function formatMovePowerForDisplay(moveName, moveDetail) {
    const basePower = Number(moveDetail?.power) || 0;
    if (!basePower) return "-";
    const hitCount = getGuaranteedMoveHitCount(moveName);
    return hitCount > 1 ? `${basePower}x${hitCount}` : `${basePower}`;
  }

  function formatItemDescription(detail, fallbackItemName = "") {
    const effect = (detail?.effect_entries || []).find((entry) => entry.language?.name === "en")?.short_effect
      || (detail?.effect_entries || []).find((entry) => entry.language?.name === "en")?.effect
      || "";
    if (effect) return effect;
    return fallbackItemName ? `${fallbackItemName} has no imported item text available.` : "Item details unavailable.";
  }

  function formatAbilityDescription(detail, fallbackAbilityName = "") {
    const effect = (detail?.effect_entries || []).find((entry) => entry.language?.name === "en")?.short_effect
      || (detail?.effect_entries || []).find((entry) => entry.language?.name === "en")?.effect
      || (detail?.flavor_text_entries || []).find((entry) => entry.language?.name === "en")?.flavor_text
      || "";
    if (effect) return effect.replace(/\s+/g, " ").trim();
    return fallbackAbilityName ? `${fallbackAbilityName} has no imported ability text available.` : "Ability details unavailable.";
  }

  function getEffectiveMoveType(slot, entry, moveName, moveDetail = null) {
    const fallbackType = moveDetail?.type?.name ? prettyMoveName(moveDetail.type.name) : "";
    const abilityKey = normalizeNameKey(slot?.ability || "");
    const moveKey = normalizeNameKey(moveName || "");
    const damageClass = normalizeNameKey(moveDetail?.damage_class?.name || "");
    const weather = slot?.weather || slot?.fieldState?.weather || document.getElementById("calc-weather")?.value || inferWeatherFromSlot(slot, entry);
    if (abilityKey === "liquid voice" && ["hyper voice", "echoed voice", "round", "alluring voice", "disarming voice"].includes(moveKey)) {
      return "Water";
    }
    if (moveKey === "weather ball") {
      if (weather === "Sun") return "Fire";
      if (weather === "Rain") return "Water";
      if (weather === "Sand") return "Rock";
      if (weather === "Snow") return "Ice";
    }
    if (fallbackType === "Normal" && damageClass && damageClass !== "status") {
      const normalTypeConverters = {
        aerilate: "Flying",
        pixilate: "Fairy",
        refrigerate: "Ice",
        galvanize: "Electric",
        dragonize: "Dragon",
        normalize: "Normal"
      };
      if (normalTypeConverters[abilityKey]) return normalTypeConverters[abilityKey];
    }
    return fallbackType;
  }

  function inferWeatherFromSlot(slot, entry) {
    const abilityKey = normalizeNameKey(slot?.ability || "");
    const moveKeys = (slot?.moves || []).map((move) => normalizeNameKey(move));
    if (abilityKey === "drought" || moveKeys.includes("sunny day")) return "Sun";
    if (abilityKey === "drizzle" || moveKeys.includes("rain dance")) return "Rain";
    if (abilityKey === "sand stream" || moveKeys.includes("sandstorm")) return "Sand";
    if (abilityKey === "snow warning" || moveKeys.includes("snowscape")) return "Snow";
    const entryKey = normalizeNameKey(entry?.name || "");
    if (entryKey === "mega charizard y") return "Sun";
    return "";
  }

  function handleImportParse() {
    const rawText = importInput.value.trim();
    if (!rawText) {
      importResults.innerHTML = `<div class="status-note">Paste a Pikalytics or Showdown export to parse your sets.</div>`;
      return;
    }
    const { accepted, rejected } = parseSets(rawText);
    parsedImportSets = accepted;
    if (!accepted.length) {
      importResults.innerHTML = `<div class="status-note">No imported sets matched the configured Champions roster. Rejected: ${rejected.join(", ") || "all sets"}.</div>`;
      return;
    }
    renderImportResults(rejected);
  }

  async function handleTeamImportParse() {
    const rawText = teamImportInput.value.trim();
    if (!rawText) {
      teamAnalysis.innerHTML = `<div class="status-note">Paste a full Pokepaste export to fill the teambuilder.</div>`;
      return;
    }
    const { accepted, rejected } = parseSets(rawText);
    if (!accepted.length) {
      teamAnalysis.innerHTML = `<div class="status-note">No imported sets matched the legal Champions roster. Rejected: ${rejected.join(", ") || "all sets"}.</div>`;
      return;
    }
    document.querySelectorAll(".team-slot, .team-item, .team-ability, .team-nature, .team-move").forEach((select) => { select.value = ""; });
    for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
      applyImportedTeamSlotSpSpread(slotIndex, {});
    }
    await refreshAllTeamBuilderOptions();
    for (const set of accepted.slice(0, 6)) {
      await loadSetIntoTeamBuilder(set);
    }
    analyzeTeamBuilder();
    if (rejected.length) {
      teamAnalysis.insertAdjacentHTML("afterbegin", `<div class="status-note">Loaded ${accepted.length} set(s). Skipped: ${rejected.join(", ")}.</div>`);
    }
  }

  async function handleUnifiedTeamBuilderInput() {
    const rawText = teamImportInput.value.trim();
    const focus = document.getElementById("ai-builder-focus").value.trim();
    const mode = document.getElementById("ai-builder-mode").value;
    const parsed = rawText ? parseSets(rawText) : { accepted: [], rejected: [] };
    const looksLikePaste = Boolean(
      parsed.accepted.length
      || /@\s*[A-Za-z]/.test(rawText)
      || /^\s*Ability:/m.test(rawText)
      || /^\s*-\s/m.test(rawText)
    );
    if (looksLikePaste) {
      await handleTeamImportParse();
      return;
    }
    if (!rawText && !focus) {
      aiBuilderOutput.innerHTML = `<div class="status-note">Type a team request or paste a Pokepaste in the shared box first.</div>`;
      return;
    }
    await generateAiBuilderDraft();
  }

  function parseBuilderRequest(rawText, explicitFocus, explicitMode) {
    const normalizedText = normalizeBuilderPrompt(rawText.trim());
    const detectedPokemon = detectRequestedPokemon(normalizedText);
    const requestedPokemon = detectRequestedPokemonList(normalizedText);
    const requestedModes = {
      tailwind: /\btailwind\b/i.test(normalizedText),
      trickRoom: /\btrick room\b/i.test(normalizedText),
      fakeOut: /\bfake out\b/i.test(normalizedText)
    };
    const counterMeta = /\bcounter meta\b/i.test(normalizedText) || /\banti meta\b/i.test(normalizedText);
    const requestedPressure = {
      ohko: /\bone hit knockout\b/i.test(normalizedText) || /\bohko\b/i.test(normalizedText),
      counterMeta,
      avoidStaples: /without relying on top[-\s]?tier staples|avoid top[-\s]?tier staples|without top[-\s]?tier staples|avoid staples|\boff meta\b|\boff-meta\b/i.test(normalizedText),
      safeAttacks: /\bsafe attacks?\b/i.test(normalizedText) || /\bpositioning\b/i.test(normalizedText),
      damageAnchor: /\bdamage anchor\b/i.test(normalizedText) || /\breliable damage\b/i.test(normalizedText),
      mindGames: /\bmind games?\b/i.test(normalizedText) || /\billusion\b/i.test(normalizedText)
    };
    const focus = explicitFocus || detectedPokemon || "";
    const mode = explicitMode === "counter" || counterMeta
      ? "counter"
      : ((requestedPokemon.length || detectedPokemon) ? "pokemon" : explicitMode);
    const intentLock = detectBuilderIntentLock({
      focus,
      mode,
      detectedPokemon,
      requestedPokemon,
      requestedModes,
      requestedPressure,
      normalizedText
    });
    const promptLocks = buildPromptLocks({
      focus,
      mode,
      detectedPokemon,
      requestedPokemon,
      requestedModes,
      requestedPressure,
      normalizedText,
      intentLock
    });
    return { focus, mode, detectedPokemon, requestedPokemon, requestedModes, requestedPressure, normalizedText, intentLock, promptLocks };
  }

  function detectRequestedWeatherMode(text) {
    const normalized = normalizeNameKey(text || "");
    if (/\brain\b/.test(normalized)) return "rain";
    if (/\bsun\b/.test(normalized)) return "sun";
    if (/\bsand\b/.test(normalized)) return "sand";
    if (/\bsnow\b/.test(normalized)) return "snow";
    return "";
  }

  function detectBuilderIntentLock(request) {
    const normalized = normalizeNameKey(`${request.focus || ""} ${request.normalizedText || ""}`);
    if (request.requestedModes?.trickRoom) {
      if (/\bhard trick room\b|\bfull trick room\b|\bhard tr\b|\bfullroom\b/.test(normalized)) return "hard_tr";
      return "soft_tr";
    }
    if (request.requestedModes?.tailwind || /\btailwind\b/.test(normalized)) return "tailwind";
    const weather = detectRequestedWeatherMode(normalized);
    if (weather) return weather;
    if (request.requestedPressure?.counterMeta || /\banti meta\b|\bcounter meta\b/.test(normalized)) return "anti_meta";
    if (/\bfast offense\b|\bhyper offense\b|\bfast team\b/.test(normalized)) return "fast_offense";
    if (/\bbulky offense\b/.test(normalized)) return "bulky_offense";
    if (/\bbalance\b|\bbalanced\b/.test(normalized)) return "balance";
    return request.mode === "counter" ? "anti_meta" : "unknown";
  }

  function buildPromptLocks(request) {
    const normalized = normalizeNameKey(request.normalizedText || "");
    const noMegas = /\bno mega\b|\bno megas\b|\bwithout megas\b|\bzero megas\b|\b0 megas\b/.test(normalized);
    const focusEntry = getRosterEntry(request.focus || "");
    const lockedPokemon = [...new Set([...(request.requestedPokemon || []), focusEntry?.name].filter(Boolean))];
    const specificMega = lockedPokemon
      .filter(Boolean)
      .map((name) => getRosterEntry(name))
      .find((entry) => entry && isMegaEntry(entry))?.name || null;
    const requiredPokemon = lockedPokemon;
    const weather = detectRequestedWeatherMode(normalized);
    return {
      trickRoom: !!request.requestedModes?.trickRoom,
      tailwind: !!request.requestedModes?.tailwind,
      weather,
      noMegas,
      specificMega,
      megaTargetMin: noMegas ? 0 : DEFAULT_MIN_MEGAS,
      megaTargetMax: noMegas ? 0 : DEFAULT_MAX_MEGAS,
      requiredPokemon,
      enemyNames: [],
      forbidTrickRoomDrift: !request.requestedModes?.trickRoom,
      allowSlowMode: !!request.requestedModes?.trickRoom
    };
  }

  function normalizeBuilderPrompt(text) {
    return text
      .replace(/\beq\b/gi, "earthquake")
      .replace(/\btw\b/gi, "tailwind")
      .replace(/\btr\b/gi, "trick room")
      .replace(/\bohko\b/gi, "one hit knockout");
  }

  function detectRequestedPokemon(text) {
    const lowered = normalizeNameKey(text);
    const aliasMatches = [];
    Object.entries(Object.fromEntries(aliases)).forEach(([aliasKey, canonical]) => {
      if (lowered.includes(aliasKey)) {
        aliasMatches.push({ name: canonical, length: aliasKey.length, mega: canonical.startsWith("Mega ") ? 1 : 0 });
      }
    });
    if (aliasMatches.length) {
      aliasMatches.sort((a, b) => (b.length - a.length) || (b.mega - a.mega));
      return aliasMatches[0].name;
    }
    const candidates = [];
    championsRoster.forEach((entry) => {
      const namesToCheck = new Set([
        normalizeNameKey(entry.name),
        normalizeNameKey(entry.baseName || entry.name)
      ]);
      namesToCheck.forEach((candidate) => {
        if (candidate && lowered.includes(candidate)) {
          candidates.push({ name: entry.name, length: candidate.length, mega: isMegaEntry(entry) ? 1 : 0 });
        }
      });
    });
    candidates.sort((a, b) => (b.length - a.length) || (b.mega - a.mega));
    return candidates[0]?.name || "";
  }

  function detectRequestedPokemonList(text) {
    const lowered = normalizeNameKey(text);
    const aliasMatches = [];
    Object.entries(Object.fromEntries(aliases)).forEach(([aliasKey, canonical]) => {
      if (lowered.includes(aliasKey)) {
        aliasMatches.push({ name: canonical, length: aliasKey.length, mega: canonical.startsWith("Mega ") ? 1 : 0 });
      }
    });
    const explicitAliasNames = new Set(aliasMatches.map((match) => match.name));
    const aliasedBaseKeys = new Set(aliasMatches.map((match) => {
      const entry = getRosterEntry(match.name);
      return normalizeNameKey(entry?.baseName || entry?.name || match.name);
    }));
    const candidates = [];
    championsRoster
      .filter((entry) => isMegaEntry(entry))
      .forEach((entry) => {
        const megaPhrase = normalizeNameKey(`mega ${entry.baseName}`);
        const exactMega = normalizeNameKey(entry.name);
        if (lowered.includes(megaPhrase) || lowered.includes(exactMega)) {
          candidates.push({ name: entry.name, length: Math.max(megaPhrase.length, exactMega.length), mega: 2 });
        }
      });
    championsRoster.forEach((entry) => {
      const clauseKey = normalizeNameKey(entry.baseName || entry.name);
      if (aliasedBaseKeys.has(clauseKey) && !explicitAliasNames.has(entry.name)) return;
      const namesToCheck = new Set([
        normalizeNameKey(entry.name),
        normalizeNameKey(entry.baseName || entry.name)
      ]);
      namesToCheck.forEach((candidate) => {
        if (candidate && lowered.includes(candidate)) {
          candidates.push({ name: entry.name, length: candidate.length, mega: isMegaEntry(entry) ? 1 : 0 });
        }
      });
    });
    candidates.push(...aliasMatches);
    return [...new Map(candidates
      .sort((a, b) => (b.length - a.length) || (b.mega - a.mega))
      .map((candidate) => [candidate.name, candidate])).values()]
      .map((candidate) => candidate.name)
      .filter((name, index, names) => {
        const entry = getRosterEntry(name);
        if (!entry || !isMegaEntry(entry)) return true;
        return !names.includes(entry.baseName);
      })
      .filter((name, index, names) => {
        const entry = getRosterEntry(name);
        if (!entry || isMegaEntry(entry)) return true;
        return !names.some((otherName) => {
          const otherEntry = getRosterEntry(otherName);
          return otherEntry && isMegaEntry(otherEntry) && normalizeNameKey(otherEntry.baseName) === normalizeNameKey(entry.name);
        });
      });
  }

  function parseSets(text) {
    const accepted = [];
    const rejected = [];
    text.split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map(parseSetBlock)
      .filter(Boolean)
      .forEach((set) => {
        const entry = getRosterEntry(set.name);
        if (!entry) {
          rejected.push(set.name);
          return;
        }
        set.name = entry.name;
        accepted.push(set);
      });
    return { accepted, rejected };
  }

  function parseSetBlock(block) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;
    const header = lines[0].split("@");
    const rawHeaderName = header[0].trim().replace(/\(M\)|\(F\)/g, "").trim();
    const speciesMatch = rawHeaderName.match(/\(([^()]+)\)\s*$/);
    const rawName = speciesMatch ? speciesMatch[1].trim() : rawHeaderName;
    const set = {
      name: rawName.replace(/\s*\(.*\)$/, "").trim(),
      item: header[1] ? header[1].trim() : "",
      ability: "",
      level: 50,
      nature: "",
      sps: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: []
    };
    lines.slice(1).forEach((line) => {
      if (/^Ability:/i.test(line)) set.ability = line.replace(/^Ability:/i, "").trim();
      else if (/^Level:/i.test(line)) set.level = Number(line.replace(/^Level:/i, "").trim()) || 50;
      else if (/^EVs:/i.test(line)) assignSpread(set.sps, line.replace(/^EVs:/i, "").trim(), false);
      else if (/^SPs:/i.test(line)) assignSpread(set.sps, line.replace(/^SPs:/i, "").trim(), true);
      else if (/^\d+\s+[\w.]+/i.test(line) && line.includes("/")) assignSpread(set.sps, line, false);
      else if (/Nature$/i.test(line)) set.nature = line.replace(/Nature$/i, "").trim();
      else if (line.startsWith("-")) set.moves.push(line.replace(/^-+\s*/, "").trim());
    });
    return set;
  }

  function assignSpread(target, spreadText, isSp) {
    const normalized = spreadText.replace(/,/g, "/").replace(/\s+/g, " ").trim();
    const pairRegex = /(\d+)\s*(HP|Atk|Def|SpA|SpD|Spe|Attack|Defense|Sp\.?\s*Atk|Sp\.?\s*Def|Special Attack|Special Defense|Speed)/gi;
    const matches = [...normalized.matchAll(pairRegex)];
    const shouldTreatAsSp = isSp || (matches.length > 0 && matches.every((match) => Number(match[1]) <= SP_MAX_PER_STAT));
    if (matches.length) {
      matches.forEach((match) => {
        const stat = spreadStatKey(match[2]);
        if (!stat) return;
        target[stat] = shouldTreatAsSp ? clampSp(Number(match[1])) : evToSp(Number(match[1]));
      });
      return;
    }
    normalized.split("/").forEach((chunk) => {
      const cleaned = chunk.trim().replace(/\s+/g, " ");
      const match = cleaned.match(/^(\d+)\s+(.+)$/i);
      if (!match) return;
      const stat = spreadStatKey(match[2]);
      if (!stat) return;
      target[stat] = isSp || Number(match[1]) <= SP_MAX_PER_STAT ? clampSp(Number(match[1])) : evToSp(Number(match[1]));
    });
  }

  function clampSp(value) {
    return Math.max(0, Math.min(SP_MAX_PER_STAT, Number(value) || 0));
  }

  function spreadStatKey(label) {
    const key = label
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, "")
      .replace(/special/g, "sp")
      .replace(/atk$/g, "attack")
      .replace(/def$/g, "defense");
    const map = {
      hp: "hp", atk: "atk", attack: "atk", def: "def", defense: "def",
      spa: "spa", spatk: "spa", spattack: "spa",
      spatt: "spa", specialattack: "spa",
      spd: "spd", spdef: "spd", spdefense: "spd", specialdefense: "spd",
      spe: "spe", speed: "spe"
    };
    return map[key] || null;
  }

  function renderImportResults(rejected) {
    importResults.innerHTML = "";
    if (rejected.length) {
      const note = document.createElement("div");
      note.className = "status-note";
      note.textContent = `Skipped Pokemon outside the configured roster: ${rejected.join(", ")}.`;
      importResults.appendChild(note);
    }
    if (parsedImportSets.length > 1) {
      const bulkActions = document.createElement("div");
      bulkActions.className = "inline-actions";
      bulkActions.innerHTML = `<button class="action-button accent" id="load-import-team">Load Full Team Into Teambuilder</button>`;
      importResults.appendChild(bulkActions);
      bulkActions.querySelector("#load-import-team").addEventListener("click", async () => {
        document.querySelectorAll(".team-slot, .team-item, .team-ability, .team-nature, .team-move").forEach((select) => { select.value = ""; });
        for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
          applyImportedTeamSlotSpSpread(slotIndex, {});
        }
        await refreshAllTeamBuilderOptions();
        for (const set of parsedImportSets.slice(0, 6)) {
          await loadSetIntoTeamBuilder(set);
        }
        activateTab("teambuilder");
      });
    }
    parsedImportSets.forEach((set, index) => {
      const card = document.createElement("article");
      card.className = "import-card-item";
      card.innerHTML = `
        <h3>${set.name}</h3>
        <p>${set.item ? `<span class="import-pill">Item: ${set.item}</span>` : ""}${set.ability ? `<span class="import-pill">Ability: ${set.ability}</span>` : ""}</p>
        <p>${set.nature || "Unknown Nature"} | Battle level 50</p>
        <p>${set.moves.join(" / ") || "No moves detected"}</p>
        <div class="import-actions">
          <button class="action-button accent" data-load-target="attacker" data-set-index="${index}">Load as Attacker</button>
          <button class="action-button ghost" data-load-target="defender" data-set-index="${index}">Load as Defender</button>
          <button class="action-button ghost" data-load-target="speed" data-set-index="${index}">Load in Speed Calc</button>
          <button class="action-button ghost" data-load-target="team" data-set-index="${index}">Add to Teambuilder</button>
        </div>
      `;
      importResults.appendChild(card);
    });
    importResults.querySelectorAll("[data-load-target]").forEach((button) => {
      button.addEventListener("click", async () => {
        const set = parsedImportSets[Number(button.dataset.setIndex)];
        await applySetToForm(button.dataset.loadTarget, set);
      });
    });
  }

  async function applySetToForm(target, set) {
    if (target === "speed") {
      await loadSetIntoSpeedCalc(set);
      activateTab("speed");
      return;
    }
    if (target === "team") {
      await loadSetIntoTeamBuilder(set);
      activateTab("teambuilder");
      return;
    }
    document.getElementById(`${target}-name`).value = set.name;
    document.getElementById(`${target}-item`).value = controlHasOption(document.getElementById(`${target}-item`), set.item) ? resolveControlValue(document.getElementById(`${target}-item`), set.item) : "";
    if (set.nature && natures.includes(set.nature)) {
      document.getElementById(`${target}-nature`).value = set.nature;
    }
    applyImportedSpSpread(target, set.sps);
    await populateAbilitiesForSide(target);
    if (controlHasOption(document.getElementById(`${target}-ability`), set.ability)) document.getElementById(`${target}-ability`).value = resolveControlValue(document.getElementById(`${target}-ability`), set.ability);
    if (target === "attacker") {
      await populateMovesForAttacker();
      const moveSelect = document.getElementById("attacker-move");
      const preferred = set.moves[0];
      if (controlHasOption(moveSelect, preferred)) moveSelect.value = resolveControlValue(moveSelect, preferred);
    }
    await updateSideSprite(target);
  }

  async function loadSetIntoSpeedCalc(set) {
    const entry = getRosterEntry(set.name);
    if (!entry) return;
    document.getElementById("speed-pokemon").value = entry.name;
    document.getElementById("speed-base").value = entry.baseSpeed;
    speedCalcSp = clampSp(set.sps?.spe || 0);
    document.getElementById("speed-iv").value = 31;
    document.getElementById("speed-scarf").checked = normalizeNameKey(set.item) === "choice scarf";
    const nature = (set.nature || "").toLowerCase();
    const boostSpe = ["timid", "hasty", "jolly", "naive"].includes(nature);
    const dropSpe = ["brave", "relaxed", "quiet", "sassy"].includes(nature);
    document.getElementById("speed-nature-mode").value = boostSpe ? "boost" : dropSpe ? "drop" : "neutral";
    await updateSpeedSprite();
    updateSpeedResult();
  }

  async function loadSetIntoTeamBuilder(set) {
    const entry = getRosterEntry(set.name);
    if (!entry) return;
    const slots = Array.from(document.querySelectorAll(".team-slot"));
    const existing = slots.find((slot) => slot.value === entry.name);
    const targetSlot = existing || slots.find((slot) => !slot.value) || slots[slots.length - 1];
    targetSlot.value = entry.name;
    const slotIndex = Number(targetSlot.dataset.slot);
    const card = getTeamCard(slotIndex);
    card?.classList.add("is-loading");
    try {
      const itemSelect = document.querySelector(`.team-item[data-slot="${slotIndex}"]`);
      const forcedMegaStone = getMegaStoneForEntry(entry);
      itemSelect.value = forcedMegaStone
        ? forcedMegaStone
        : controlHasOption(itemSelect, set.item) ? resolveControlValue(itemSelect, set.item) : "";
      await refreshTeamSlotOptions(slotIndex);
      const abilitySelect = document.querySelector(`.team-ability[data-slot="${slotIndex}"]`);
      const natureSelect = document.querySelector(`.team-nature[data-slot="${slotIndex}"]`);
      if (controlHasOption(abilitySelect, set.ability)) abilitySelect.value = resolveControlValue(abilitySelect, set.ability);
      if (set.nature && natures.includes(set.nature)) natureSelect.value = set.nature;
      applyImportedTeamSlotSpSpread(slotIndex, set.sps);
      const moveSelects = Array.from(document.querySelectorAll(`.team-move[data-slot="${slotIndex}"]`));
      moveSelects.forEach((select, index) => {
        const move = set.moves[index] || "";
        select.value = controlHasOption(select, move) ? resolveControlValue(select, move) : "";
        markMoveFieldChange(select, select.value || "");
      });
      await updateTeamSlotSprite(slotIndex);
      targetSlot.dataset.currentSpecies = entry.name;
      animateTeamCard(slotIndex, existing ? "is-slot-replaced" : "is-slot-added");
      notifyTeamBuilderStateChange(existing ? "team-slot-replaced" : "team-slot-added", slotIndex);
      analyzeTeamBuilder();
    } finally {
      card?.classList.remove("is-loading");
    }
  }

  function applyImportedSpSpread(side, importedSp) {
    const spSpread = {};
    statOrder.forEach((stat) => {
      spSpread[stat] = clampSp(importedSp?.[stat] || 0);
    });
    let total = Object.values(spSpread).reduce((sum, value) => sum + value, 0);
    while (total > SP_MAX_TOTAL) {
      const stat = [...statOrder].reverse().find((key) => spSpread[key] > 0);
      if (!stat) break;
      spSpread[stat] -= 1;
      total -= 1;
    }
    statOrder.forEach((stat) => {
      document.getElementById(`${side}-ev-${stat}`).value = spSpread[stat];
    });
    updateSpDisplay(side);
  }

  async function calculateDamage() {
    damageResult.innerHTML = `<div class="status-note" style="display:flex;align-items:center;gap:10px;"><span style="display:inline-block;width:18px;height:18px;border:3px solid var(--accent-vivid);border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;"></span> Calculating...</div>`;
    if (!gen || !window.calc) {
      damageResult.innerHTML = `<div class="status-note">The Smogon calculator library did not load. Refresh the page with internet access and try again.</div>`;
      return;
    }
    const attacker = getRosterEntry(document.getElementById("attacker-name").value);
    const defender = getRosterEntry(document.getElementById("defender-name").value);
    const moveName = document.getElementById("attacker-move").value.trim();
    if (!attacker || !defender || !moveName) {
      damageResult.innerHTML = `<div class="status-note">Choose attacker, defender, and a move before calculating.</div>`;
      return;
    }

    const moveDetail = await getMoveDetail(moveName);
    if (!moveDetail) {
      damageResult.innerHTML = `<div class="status-note">That move could not be resolved from the current data source.</div>`;
      return;
    }

    let attackerPokemon;
    let defenderPokemon;
    let move;
    let field;
    let result;
    const attackerCandidates = resolveCalcSpeciesCandidates(attacker);
    const defenderCandidates = resolveCalcSpeciesCandidates(defender);
    try {
      attackerPokemon = buildCalcPokemon("attacker", attacker);
    } catch (error) {
      console.error("Attacker calc construction failed.", error);
      await renderHostedOrFallbackDamage(attacker, defender, moveName, moveDetail, {
        status: "The attacker could not be constructed for the browser calc bundle.",
        attackerCandidates: attackerCandidates.join(" / "),
        error
      });
      return;
    }
    try {
      defenderPokemon = buildCalcPokemon("defender", defender);
    } catch (error) {
      console.error("Defender calc construction failed.", error);
      await renderHostedOrFallbackDamage(attacker, defender, moveName, moveDetail, {
        status: "The defender could not be constructed for the browser calc bundle.",
        defenderCandidates: defenderCandidates.join(" / "),
        error
      });
      return;
    }
    try {
      move = buildCalcMove(moveName);
    } catch (error) {
      console.error("Move calc construction failed.", error);
      await renderHostedOrFallbackDamage(attacker, defender, moveName, moveDetail, {
        status: "That move could not be constructed for the browser calc bundle.",
        moveName,
        error
      });
      return;
    }
    try {
      field = buildCalcField();
      result = calc.calculate(gen, attackerPokemon, defenderPokemon, move, field);
      const rolls = Array.isArray(result.damage) ? result.damage : [result.damage];
      const min = Math.min(...rolls);
      const max = Math.max(...rolls);
      const hp = defenderPokemon.rawStats.hp;
      damageResult.innerHTML = `
        <p class="result-title">${attacker.name} used ${prettyMoveName(moveName)} into ${defender.name}</p>
        <p class="result-copy">${result.desc()}</p>
        <p class="result-copy"><strong>${min} - ${max}</strong> damage (${((min / hp) * 100).toFixed(1)}% - ${((max / hp) * 100).toFixed(1)}%)</p>
        <p class="result-copy">Damage uses Champions-style SP mapped onto calc EVs for the browser engine.</p>
        <div class="damage-rolls">${rolls.slice(0, 16).map((value) => `<span class="damage-roll">${value}</span>`).join("")}</div>
      `;
    } catch (error) {
      console.error(error);
      await renderHostedOrFallbackDamage(attacker, defender, moveName, moveDetail, {
        status: "The damage calculation itself failed inside the browser calc bundle.",
        attackerCandidates: attackerCandidates.join(" / "),
        defenderCandidates: defenderCandidates.join(" / "),
        moveName,
        error
      });
    }
  }

  async function renderHostedOrFallbackDamage(attacker, defender, moveName, moveDetail, context = {}) {
    try {
      const hosted = await calculateHostedDamage(attacker, defender, moveName);
      damageResult.innerHTML = `
        <p class="result-title">${attacker.name} used ${prettyMoveName(moveName)} into ${defender.name}</p>
        <p class="result-copy"><strong>${hosted.min} - ${hosted.max}</strong> damage (${hosted.minPercent}% - ${hosted.maxPercent}%)</p>
        <p class="result-copy">${hosted.summary}</p>
        <p class="result-copy">Using hosted calc fallback because the browser bundle failed on this matchup.</p>
        <div class="damage-rolls">${hosted.rolls.slice(0, 16).map((value) => `<span class="damage-roll">${value}</span>`).join("")}</div>
      `;
      return;
    } catch (hostedError) {
      try {
        const fallback = calculateFallbackDamage(attacker, defender, moveName, moveDetail);
        damageResult.innerHTML = `
          <p class="result-title">${attacker.name} used ${prettyMoveName(moveName)} into ${defender.name}</p>
          <p class="result-copy"><strong>${fallback.min} - ${fallback.max}</strong> damage (${fallback.minPercent}% - ${fallback.maxPercent}%)</p>
          <p class="result-copy">${fallback.summary}</p>
          <p class="result-copy">Using local fallback calc because the browser and hosted calcs both failed on this matchup.</p>
          <div class="damage-rolls">${fallback.rolls.slice(0, 16).map((value) => `<span class="damage-roll">${value}</span>`).join("")}</div>
        `;
        return;
      } catch (fallbackError) {
        damageResult.innerHTML = `
          <div class="status-note">${context.status || "Damage calc failed."}</div>
          ${context.attackerCandidates ? `<p class="result-copy"><strong>Attacker tried:</strong> ${context.attackerCandidates}</p>` : ""}
          ${context.defenderCandidates ? `<p class="result-copy"><strong>Defender tried:</strong> ${context.defenderCandidates}</p>` : ""}
          ${context.moveName ? `<p class="result-copy"><strong>Move:</strong> ${prettyMoveName(context.moveName)}</p>` : ""}
          <p class="result-copy"><strong>Browser calc error:</strong> ${escapeHtml(context.error?.message || String(context.error || ""))}</p>
          <p class="result-copy"><strong>Hosted calc error:</strong> ${escapeHtml(hostedError?.message || String(hostedError))}</p>
          <p class="result-copy"><strong>Local fallback error:</strong> ${escapeHtml(fallbackError?.message || String(fallbackError))}</p>
        `;
      }
    }
  }

  async function calculateHostedDamage(attackerEntry, defenderEntry, moveName) {
    const response = await fetch(HOSTED_DAMAGE_CALC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attackingPokemon: attackerEntry.baseName || attackerEntry.name,
        defendingPokemon: defenderEntry.baseName || defenderEntry.name,
        moveName: prettyMoveName(moveName)
      })
    });
    const payload = await response.json();
    if (!response.ok || payload?.error) {
      throw new Error(payload?.error || `Hosted calc failed with status ${response.status}`);
    }
    const raw = payload?.raw;
    const rolls = Array.isArray(raw?.damage) ? raw.damage.map((value) => Number(value) || 0).filter((value) => value > 0) : [];
    const defenderHp = Number(raw?.defender?.rawStats?.hp || raw?.defender?.stats?.hp || 0);
    if (!rolls.length || !defenderHp) {
      throw new Error("Hosted calc returned an incomplete damage payload.");
    }
    const min = Math.min(...rolls);
    const max = Math.max(...rolls);
    const desc = raw?.rawDesc
      ? `${raw.rawDesc.attackerName} ${raw.rawDesc.moveName} vs ${raw.rawDesc.defenderName}`
      : `${attackerEntry.name} ${prettyMoveName(moveName)} vs ${defenderEntry.name}`;
    return {
      rolls,
      min,
      max,
      minPercent: ((min / defenderHp) * 100).toFixed(1),
      maxPercent: ((max / defenderHp) * 100).toFixed(1),
      summary: desc
    };
  }

  function buildPokemonConfig(side) {
    const config = {
      level: 50,
      nature: document.getElementById(`${side}-nature`).value,
      evs: {},
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      boosts: {}
    };
    const item = document.getElementById(`${side}-item`).value.trim();
    const ability = document.getElementById(`${side}-ability`).value.trim();
    if (item) config.item = item;
    if (ability) config.ability = ability;
    const spread = getSpSpread(side);
    statOrder.forEach((stat) => {
      config.evs[stat] = spToEv(spread[stat]);
    });
    if (side === "attacker") {
      config.boosts.atk = Number(document.getElementById("calc-attacker-atk-stage")?.value || 0);
      config.boosts.spa = Number(document.getElementById("calc-attacker-spa-stage")?.value || 0);
      if (document.getElementById("calc-attacker-burned")?.checked) config.status = "brn";
    }
    if (side === "defender") {
      config.boosts.def = Number(document.getElementById("calc-defender-def-stage")?.value || 0);
      config.boosts.spd = Number(document.getElementById("calc-defender-spd-stage")?.value || 0);
    }
    return config;
  }

  function buildCalcField() {
    const weather = document.getElementById("calc-weather")?.value || "";
    const terrain = document.getElementById("calc-terrain")?.value || "";
    const fieldConfig = {};
    if (weather) fieldConfig.weather = weather;
    if (terrain) fieldConfig.terrain = terrain;
    return new calc.Field(fieldConfig);
  }

  function buildCalcMove(moveName) {
    const overrides = {};
    if (normalizeNameKey(moveName) === "last respects") {
      overrides.bp = 50 + clampCalcCount(document.getElementById("calc-last-respects-count")?.value) * 50;
    }
    const candidates = [
      prettyMoveName(moveName),
      moveName,
      moveName.replace(/-/g, " ")
    ].filter(Boolean);
    let lastError = null;
    for (const candidate of [...new Set(candidates)]) {
      try {
        return new calc.Move(gen, candidate, overrides);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No calc move candidate could be resolved.");
  }

  function buildCalcPokemon(side, entry) {
    let lastError = null;
    const baseConfig = buildPokemonConfig(side);
    const configVariants = buildCalcConfigVariants(baseConfig);
    for (const speciesName of resolveCalcSpeciesCandidates(entry)) {
      for (const config of configVariants) {
        try {
          return new calc.Pokemon(gen, speciesName, config);
        } catch (error) {
          lastError = error;
        }
      }
    }
    throw lastError || new Error("No calc species candidate could be resolved.");
  }

  function buildCalcConfigVariants(config) {
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const variants = [];
    const full = clone(config);
    variants.push(full);

    const noItem = clone(config);
    delete noItem.item;
    variants.push(noItem);

    const noAbility = clone(config);
    delete noAbility.ability;
    variants.push(noAbility);

    const noItemOrAbility = clone(config);
    delete noItemOrAbility.item;
    delete noItemOrAbility.ability;
    variants.push(noItemOrAbility);

    const minimal = {
      level: config.level,
      nature: config.nature,
      evs: clone(config.evs),
      ivs: clone(config.ivs),
      boosts: clone(config.boosts || {})
    };
    if (config.status) minimal.status = config.status;
    variants.push(minimal);

    return variants.filter((variant, index, array) => index === array.findIndex((item) => JSON.stringify(item) === JSON.stringify(variant)));
  }

  function resolveCalcSpeciesCandidates(entry) {
    return [...new Set([
      entry.calcName,
      entry.baseName,
      entry.name,
      entry.name?.replace(/^Mega\s+/, ""),
      aliases.get(normalizeNameKey(entry.name || "")),
      aliases.get(normalizeNameKey(entry.baseName || ""))
    ].filter(Boolean))];
  }

  function calculateFallbackDamage(attackerEntry, defenderEntry, moveName, moveDetail) {
    const category = moveDetail?.damage_class?.name || "";
    if (category === "status") {
      throw new Error("Status move selected; no direct damage to calculate.");
    }
    const attackerState = getCalcSideState("attacker");
    const defenderState = getCalcSideState("defender");
    const attackerStats = calculateBattleStats(attackerEntry, "attacker", attackerState);
    const defenderStats = calculateBattleStats(defenderEntry, "defender", defenderState);
    const moveType = getEffectiveMoveType(attackerState, attackerEntry, moveName, moveDetail);
    const typeEffectiveness = getEffectiveTypeEffectiveness(moveType, defenderState, defenderEntry);
    const power = getAdjustedMovePower(moveName, moveDetail);
    if (!moveType || !power) {
      throw new Error("Missing move power or type for fallback calculation.");
    }

    const isPhysical = category === "physical";
    const attackStage = isPhysical
      ? Number(document.getElementById("calc-attacker-atk-stage")?.value || 0)
      : Number(document.getElementById("calc-attacker-spa-stage")?.value || 0);
    const defenseStage = isPhysical
      ? Number(document.getElementById("calc-defender-def-stage")?.value || 0)
      : Number(document.getElementById("calc-defender-spd-stage")?.value || 0);
    const attackingStat = applyStage(isPhysical ? attackerStats.atk : attackerStats.spa, attackStage);
    const defendingStat = Math.max(1, applyStage(isPhysical ? defenderStats.def : defenderStats.spd, defenseStage));
    const weather = document.getElementById("calc-weather")?.value || "";
    const terrain = document.getElementById("calc-terrain")?.value || "";
    const burn = document.getElementById("calc-attacker-burned")?.checked && isPhysical;
    const abilityKey = normalizeNameKey(attackerState.ability || "");

    let modifier = 1;
    const stab = attackerEntry.types.includes(moveType) ? (abilityKey === "adaptability" ? 2 : 1.5) : 1;
    modifier *= stab;
    modifier *= typeEffectiveness;
    if (burn) modifier *= 0.5;
    modifier *= getSupremeOverlordMultiplier();
    if (weather === "Sun") {
      if (moveType === "Fire") modifier *= 1.5;
      if (moveType === "Water") modifier *= 0.5;
    }
    if (weather === "Rain") {
      if (moveType === "Water") modifier *= 1.5;
      if (moveType === "Fire") modifier *= 0.5;
    }
    if (terrain === "Electric" && moveType === "Electric") modifier *= 1.3;
    if (terrain === "Grassy" && moveType === "Grass") modifier *= 1.3;
    if (terrain === "Psychic" && moveType === "Psychic") modifier *= 1.3;

    const level = 50;
    const baseDamage = Math.floor(Math.floor(Math.floor(((2 * level / 5 + 2) * power * attackingStat) / defendingStat) / 50) + 2);
    const rolls = Array.from({ length: 16 }, (_, index) => {
      const variance = (85 + index) / 100;
      return Math.max(1, Math.floor(baseDamage * modifier * variance));
    });
    const min = Math.min(...rolls);
    const max = Math.max(...rolls);
    const hp = Math.max(1, defenderStats.hp);
    return {
      rolls,
      min,
      max,
      minPercent: ((min / hp) * 100).toFixed(1),
      maxPercent: ((max / hp) * 100).toFixed(1),
      summary: `${prettyMoveName(moveName)} is treated as a ${moveType}-type ${category} attack in the fallback formula.`
    };
  }

  function getCalcSideState(side) {
    return {
      item: document.getElementById(`${side}-item`)?.value?.trim() || "",
      ability: document.getElementById(`${side}-ability`)?.value?.trim() || "",
      nature: document.getElementById(`${side}-nature`)?.value || "",
      sps: getSpSpread(side),
      moves: side === "attacker" ? [document.getElementById("attacker-move")?.value || ""] : []
    };
  }

  function calculateBattleStats(entry, side, sideState) {
    return calculateBattleStatsWithSpread(entry, getSpSpread(side), sideState.nature || "");
  }

  function calculateBattleStatsWithSpread(entry, spread, nature) {
    const level = 50;
    const iv = 31;
    const stats = {};
    statOrder.forEach((stat, index) => {
      const base = Number(entry.baseStats?.[index] || 0);
      const ev = spToEv(spread[stat] || 0);
      if (stat === "hp") {
        stats.hp = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
      } else {
        const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
        stats[stat] = Math.floor(raw * getNatureModifier(nature, stat));
      }
    });
    return stats;
  }

  async function calculateDamageEstimate(attackerEntry, defenderEntry, moveName, attackerState = {}, defenderState = {}, fieldState = {}) {
    const moveDetail = await getMoveDetail(moveName);
    return calculateDamageEstimateFromDetail(attackerEntry, defenderEntry, moveName, moveDetail, attackerState, defenderState, fieldState);
  }

  function calculateDamageEstimateFromDetail(attackerEntry, defenderEntry, moveName, moveDetail, attackerState = {}, defenderState = {}, fieldState = {}) {
    const category = moveDetail?.damage_class?.name || "";
    if (category === "status") return null;
    const attackerStats = calculateBattleStatsWithSpread(attackerEntry, attackerState.sps || defaultSpSpreadForEntry(attackerEntry), attackerState.nature || "");
    const defenderStats = calculateBattleStatsWithSpread(defenderEntry, defenderState.sps || defaultSpSpreadForEntry(defenderEntry), defenderState.nature || "");
    const moveType = getEffectiveMoveType(attackerState, attackerEntry, moveName, moveDetail);
    const typeEffectiveness = getEffectiveTypeEffectiveness(moveType, defenderState, defenderEntry);
    const power = getAdjustedMovePower(moveName, moveDetail, attackerState);
    if (!moveType || !power) return null;
    const isPhysical = category === "physical";
    const attackStage = isPhysical ? Number(attackerState.boosts?.atk || 0) : Number(attackerState.boosts?.spa || 0);
    const defenseStage = isPhysical ? Number(defenderState.boosts?.def || 0) : Number(defenderState.boosts?.spd || 0);
    const attackingStat = applyStage(isPhysical ? attackerStats.atk : attackerStats.spa, attackStage);
    const defendingStat = Math.max(1, applyStage(isPhysical ? defenderStats.def : defenderStats.spd, defenseStage));
    const weather = fieldState.weather || "";
    const terrain = fieldState.terrain || "";
    const burn = attackerState.status === "brn" && isPhysical;
    const abilityKey = normalizeNameKey(attackerState.ability || "");
    let modifier = 1;
    const stab = attackerEntry.types.includes(moveType) ? (abilityKey === "adaptability" ? 2 : 1.5) : 1;
    modifier *= stab * typeEffectiveness;
    if (burn) modifier *= 0.5;
    modifier *= getSupremeOverlordMultiplier(attackerState);
    if (weather === "Sun") {
      if (moveType === "Fire") modifier *= 1.5;
      if (moveType === "Water") modifier *= 0.5;
    }
    if (weather === "Rain") {
      if (moveType === "Water") modifier *= 1.5;
      if (moveType === "Fire") modifier *= 0.5;
    }
    if (terrain === "Electric" && moveType === "Electric") modifier *= 1.3;
    if (terrain === "Grassy" && moveType === "Grass") modifier *= 1.3;
    if (terrain === "Psychic" && moveType === "Psychic") modifier *= 1.3;
    const level = 50;
    const baseDamage = Math.floor(Math.floor(Math.floor(((2 * level / 5 + 2) * power * attackingStat) / defendingStat) / 50) + 2);
    const rolls = Array.from({ length: 16 }, (_, index) => Math.max(1, Math.floor(baseDamage * modifier * ((85 + index) / 100))));
    const min = Math.min(...rolls);
    const max = Math.max(...rolls);
    const hp = Math.max(1, defenderStats.hp);
    return {
      rolls,
      min,
      max,
      minPercent: Number(((min / hp) * 100).toFixed(1)),
      maxPercent: Number(((max / hp) * 100).toFixed(1)),
      moveType,
      category
    };
  }

  function buildCalcConfigFromState(state = {}) {
    const spread = state.sps || {};
    const config = {
      level: 50,
      nature: state.nature || "Serious",
      evs: {},
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      boosts: {
        atk: Number(state.boosts?.atk || 0),
        spa: Number(state.boosts?.spa || 0),
        def: Number(state.boosts?.def || 0),
        spd: Number(state.boosts?.spd || 0)
      }
    };
    statOrder.forEach((stat) => {
      config.evs[stat] = spToEv(spread[stat] || 0);
    });
    if (state.item) config.item = state.item;
    if (state.ability) config.ability = state.ability;
    if (state.status) config.status = state.status;
    return config;
  }

  function buildCalcPokemonFromState(entry, state = {}) {
    let lastError = null;
    const baseConfig = buildCalcConfigFromState(state);
    const configVariants = buildCalcConfigVariants(baseConfig);
    for (const speciesName of resolveCalcSpeciesCandidates(entry)) {
      for (const config of configVariants) {
        try {
          return new calc.Pokemon(gen, speciesName, config);
        } catch (error) {
          lastError = error;
        }
      }
    }
    throw lastError || new Error("No calc species candidate could be resolved.");
  }

  function buildCalcMoveFromState(moveName, attackerState = {}) {
    const overrides = {};
    if (normalizeNameKey(moveName) === "last respects") {
      overrides.bp = 50 + clampCalcCount(attackerState.faintedAllies) * 50;
    }
    const candidates = [
      prettyMoveName(moveName),
      moveName,
      moveName.replace(/-/g, " ")
    ].filter(Boolean);
    let lastError = null;
    for (const candidate of [...new Set(candidates)]) {
      try {
        return new calc.Move(gen, candidate, overrides);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No calc move candidate could be resolved.");
  }

  function buildCalcFieldFromState(fieldState = {}) {
    const config = {};
    if (fieldState.weather) config.weather = fieldState.weather;
    if (fieldState.terrain) config.terrain = fieldState.terrain;
    return new calc.Field(config);
  }

  async function calculateLiveDamageBenchmark(attackerEntry, defenderEntry, moveName, attackerState = {}, defenderState = {}, fieldState = {}) {
    if (!attackerEntry || !defenderEntry || !moveName) return null;
    const cacheKey = JSON.stringify({
      attacker: attackerEntry.name,
      defender: defenderEntry.name,
      moveName: normalizeNameKey(moveName),
      attackerState,
      defenderState,
      fieldState
    });
    if (liveDamageCalcCache.has(cacheKey)) return liveDamageCalcCache.get(cacheKey);
    let result = null;
    const moveDetail = await getMoveDetail(moveName);
    if (!moveDetail || normalizeNameKey(moveDetail?.damage_class?.name || "") === "status") {
      liveDamageCalcCache.set(cacheKey, null);
      return null;
    }
    if (gen && window.calc) {
      try {
        const attackerPokemon = buildCalcPokemonFromState(attackerEntry, attackerState);
        const defenderPokemon = buildCalcPokemonFromState(defenderEntry, defenderState);
        const move = buildCalcMoveFromState(moveName, attackerState);
        const field = buildCalcFieldFromState(fieldState);
        const calcResult = calc.calculate(gen, attackerPokemon, defenderPokemon, move, field);
        const rolls = Array.isArray(calcResult.damage) ? calcResult.damage : [calcResult.damage];
        const min = Math.min(...rolls);
        const max = Math.max(...rolls);
        const hp = defenderPokemon.rawStats.hp;
        result = {
          source: "browser",
          rolls,
          min,
          max,
          minPercent: Number(((min / hp) * 100).toFixed(1)),
          maxPercent: Number(((max / hp) * 100).toFixed(1))
        };
      } catch (error) {
        result = null;
      }
    }
    if (!result) {
      result = calculateDamageEstimateFromDetail(attackerEntry, defenderEntry, moveName, moveDetail, attackerState, defenderState, fieldState);
      if (result) result.source = "fallback";
    }
    liveDamageCalcCache.set(cacheKey, result);
    return result;
  }

  function defaultSpSpreadForEntry(entry) {
    if (!entry) return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    if (HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))) return { hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 };
    if (HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name))) return { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 };
    return { hp: 28, atk: 0, def: 4, spa: 32, spd: 2, spe: 0 };
  }

  function getNatureModifier(nature, stat) {
    const effect = natureEffects[nature] || ["", ""];
    const label = statLabels[stat];
    if (!label) return 1;
    if (effect[0] === label) return 1.1;
    if (effect[1] === label) return 0.9;
    return 1;
  }

  function buildSimulatedStateFromSet(set) {
    const resolvedEntry = resolveBattleEntry(set);
    return {
      item: set?.item || "",
      ability: resolvedEntry?.abilities?.[0] || set?.ability || "",
      nature: set?.nature || "",
      sps: set?.sps || defaultSpSpreadForEntry(getRosterEntry(set?.name || "")),
      status: set?.status || "",
      boosts: set?.boosts || {},
      faintedAllies: Number(set?.faintedAllies || 0),
      supremeCount: Number(set?.supremeCount || 0)
    };
  }

  function clampCalcCount(value) {
    return Math.max(0, Math.min(5, Number(value) || 0));
  }

  function getAdjustedMovePower(moveName, moveDetail, attackerState = null) {
    if (normalizeNameKey(moveName) === "last respects") {
      const fainted = attackerState ? clampCalcCount(attackerState.faintedAllies) : clampCalcCount(document.getElementById("calc-last-respects-count")?.value);
      return 50 + fainted * 50;
    }
    const basePower = Number(moveDetail?.power) || estimateMovePower(moveName);
    return basePower * getGuaranteedMoveHitCount(moveName);
  }

  function getSupremeOverlordMultiplier(attackerState = null) {
    const count = attackerState ? clampCalcCount(attackerState.supremeCount) : clampCalcCount(document.getElementById("calc-supreme-count")?.value);
    return 1 + count * 0.1;
  }

  function sameSpread(left = {}, right = {}) {
    return statOrder.every((stat) => Number(left?.[stat] || 0) === Number(right?.[stat] || 0));
  }

  function describeMoveAdjustments(currentMoves, suggestedMoves) {
    const current = currentMoves.filter(Boolean);
    const suggested = suggestedMoves.filter(Boolean);
    const missing = suggested.filter((move) => !current.some((existing) => normalizeNameKey(existing) === normalizeNameKey(move)));
    const extra = current.filter((move) => !suggested.some((target) => normalizeNameKey(target) === normalizeNameKey(move)));
    if (!missing.length && !extra.length) return "";
    const pairs = missing.map((move, index) => `${extra[index] || "empty slot"} -> ${move}`);
    return pairs.slice(0, 3).join(" | ");
  }

  function buildSetChangeList(currentSet, suggestedSet) {
    const changes = [];
    if (!currentSet || !suggestedSet) return changes;
    if (suggestedSet.item && normalizeNameKey(suggestedSet.item) !== normalizeNameKey(currentSet.item || "")) {
      changes.push({ kind: "item", label: "Item", from: currentSet.item || "none", to: suggestedSet.item });
    }
    if (suggestedSet.ability && normalizeNameKey(suggestedSet.ability) !== normalizeNameKey(currentSet.ability || "")) {
      changes.push({ kind: "ability", label: "Ability", from: currentSet.ability || "none", to: suggestedSet.ability });
    }
    if (!sameSpread(currentSet.sps, suggestedSet.sps)) {
      changes.push({ kind: "sp", label: "SP", from: formatSpSummary(currentSet.sps), to: formatSpSummary(suggestedSet.sps) });
    }
    const currentMoves = currentSet.moves.filter(Boolean);
    const suggestedMoves = suggestedSet.moves.filter(Boolean);
    const missing = suggestedMoves.filter((move) => !currentMoves.some((existing) => normalizeNameKey(existing) === normalizeNameKey(move)));
    const extra = currentMoves.filter((move) => !suggestedMoves.some((target) => normalizeNameKey(target) === normalizeNameKey(move)));
    missing.forEach((move, index) => {
      changes.push({ kind: "move", label: "Move", from: extra[index] || "empty slot", to: move });
    });
    return changes;
  }

  function renderChangeBadge(change) {
    const iconMap = {
      pokemon: "P",
      item: "I",
      ability: "A",
      move: "M",
      sp: "SP"
    };
    return `<span class="change-badge change-badge--${change.kind}"><strong>${iconMap[change.kind] || change.label}</strong> ${change.from ? `${escapeHtml(change.from)} -> ` : ""}${escapeHtml(change.to)}</span>`;
  }

  async function buildRecommendationCards(teamState, evaluation, swapRecommendations, recommendationSets) {
    const occupiedNameKeys = new Set(teamState.map((slot) => normalizeNameKey(slot.name || "")).filter(Boolean));
    const occupiedFamilyKeys = new Set(teamState.map((slot) => getSpeciesClauseKey(slot.name || "")).filter(Boolean));
    const tuneUps = await buildPokemonTuneUps(teamState, evaluation);
    const threatNames = evaluation.threatRows.slice(0, 2).map((row) => row.threat.name).filter(Boolean);
    const tuneUpCards = await Promise.all(tuneUps.map(async (row) => {
      const currentEntry = getRosterEntry(row.name);
      const sprite = currentEntry ? (getSpriteUrl(currentEntry.apiName || toApiSpeciesName(currentEntry.name)) || POKEBALL_PLACEHOLDER) : POKEBALL_PLACEHOLDER;
      const changes = buildSetChangeList(teamState.find((slot) => normalizeNameKey(slot.name) === normalizeNameKey(row.name)), row.suggested);
      return {
        type: "tune",
        title: row.name,
        sprite,
        subtitle: "Fix this slot first",
        summary: row.reason,
        badges: changes.map(renderChangeBadge).join("") || `<span class="change-badge change-badge--ok"><strong>OK</strong> Keep current set</span>`
      };
    }));
    const filteredSwapRecommendations = swapRecommendations.filter((item) => {
      const entryNameKey = normalizeNameKey(item?.entry?.name || "");
      const entryFamilyKey = getSpeciesClauseKey(item?.entry?.name || "");
      const swapTargetKey = normalizeNameKey(item?.swapTarget || "");
      if (!entryNameKey) return false;
      if (occupiedNameKeys.has(entryNameKey)) return false;
      if (entryFamilyKey && occupiedFamilyKeys.has(entryFamilyKey)) return false;
      if (swapTargetKey && swapTargetKey === entryNameKey) return false;
      return true;
    });
    const swapCards = await Promise.all(filteredSwapRecommendations.map(async (item, index) => {
      const set = recommendationSets[index];
      const sprite = getSpriteUrl(item.entry.apiName || toApiSpeciesName(item.entry.name)) || POKEBALL_PLACEHOLDER;
      const coverageNote = threatNames.length ? `Helps the team hit back into ${threatNames.join(" and ")}.` : "Improves the current matchup spread.";
      const swapSlot = teamState.find((slot) => normalizeNameKey(slot.name || "") === normalizeNameKey(item.swapTarget || ""));
      const swapResolvedEntry = swapSlot ? resolveBattleEntry(swapSlot) : getRosterEntry(item.swapTarget || "");
      const megaSwapWarning = (isMegaEntry(item.entry) || isMegaEntry(swapResolvedEntry))
        ? " This is a bigger structural change because it changes your mega slot, so only do it if the matchup gain matters more than your current mega game plan."
        : "";
      const setChanges = [
        { kind: "pokemon", label: "Pokemon", from: item.swapTarget, to: item.entry.name },
        { kind: "item", label: "Item", from: "", to: set.item || "none" },
        { kind: "ability", label: "Ability", from: "", to: set.ability || "none" },
        { kind: "sp", label: "SP", from: "", to: formatSpSummary(set.sps) }
      ];
      set.moves.filter(Boolean).slice(0, 4).forEach((move) => setChanges.push({ kind: "move", label: "Move", from: "", to: move }));
      return {
        type: "swap",
        title: item.entry.name,
        sprite,
        subtitle: `${item.entry.types.join(" / ")} | ${item.entry.metaRole}`,
        summary: `${item.reasons.join(" ")} ${item.swapSummary} ${coverageNote}${megaSwapWarning}`,
        badges: setChanges.map(renderChangeBadge).join(""),
        addName: item.entry.name
      };
    }));
    return [...tuneUpCards, ...swapCards];
  }

  async function calculateBestResponsePercent(attackerSet, attackerEntry, defenderEntry) {
    if (!attackerEntry || !defenderEntry) return 0;
    const state = buildSimulatedStateFromSet(attackerSet);
    let best = 0;
    for (const move of attackerSet.moves.filter(Boolean)) {
      const estimate = await calculateDamageEstimate(attackerEntry, defenderEntry, move, state, { nature: "Serious", sps: defaultSpSpreadForEntry(defenderEntry) });
      if (estimate?.maxPercent) best = Math.max(best, estimate.maxPercent);
    }
    return best;
  }

  function getThreatBenchmarkSet(threatEntry) {
    const metaSeed = META_MOVESET_SEED[threatEntry?.name || ""];
    if (metaSeed) {
      const spread = ["hard_tr", "soft_tr"].includes(inferAiDraftArchetype(threatEntry.name, "benchmark", [threatEntry]))
        ? defaultSpSpreadForEntry(threatEntry)
        : { hp: 2, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 };
      return {
        name: threatEntry.name,
        item: metaSeed.item,
        ability: metaSeed.ability,
        nature: metaSeed.nature,
        sps: spread,
        moves: metaSeed.moves
      };
    }
    return null;
  }

  function threatUsesIntimidate(threatSet, threatEntry) {
    const abilityKey = normalizeNameKey(threatSet?.ability || "");
    if (abilityKey === "intimidate") return true;
    return hasAnyAbility(threatEntry?.abilities || [], ["intimidate"]);
  }

  async function calculateRealisticThreatResponse(slot, attackerEntry, threatEntry, threatSet, fieldState = {}) {
    const attackerState = buildSimulatedStateFromSet(slot);
    const threatState = buildSimulatedStateFromSet(threatSet);
    const physicalProfile = getOffenseProfile(slot, attackerEntry) === "physical";
    let bestNeutral = { attacker: slot.name, move: "", maxPercent: 0, minPercent: 0 };
    let bestIntimidated = { attacker: slot.name, move: "", maxPercent: 0, minPercent: 0 };
    for (const move of slot.moves.filter(Boolean)) {
      const neutralEstimate = await calculateDamageEstimate(attackerEntry, threatEntry, move, attackerState, threatState, fieldState);
      if (neutralEstimate?.maxPercent > bestNeutral.maxPercent) {
        bestNeutral = { attacker: slot.name, move, maxPercent: neutralEstimate.maxPercent, minPercent: neutralEstimate.minPercent || 0 };
      }
      if (physicalProfile && threatUsesIntimidate(threatSet, threatEntry)) {
        const intimidatedState = {
          ...attackerState,
          boosts: {
            ...(attackerState.boosts || {}),
            atk: Math.min(Number(attackerState.boosts?.atk || 0), -1)
          }
        };
        const intimidatedEstimate = await calculateDamageEstimate(attackerEntry, threatEntry, move, intimidatedState, threatState, fieldState);
        if (intimidatedEstimate?.maxPercent > bestIntimidated.maxPercent) {
          bestIntimidated = { attacker: slot.name, move, maxPercent: intimidatedEstimate.maxPercent, minPercent: intimidatedEstimate.minPercent || 0 };
        }
      }
    }
    if (physicalProfile && threatUsesIntimidate(threatSet, threatEntry)) {
      if (bestIntimidated.maxPercent <= 0) return { ...bestNeutral, disadvantageNote: "intimidate" };
      return {
        attacker: bestNeutral.attacker || bestIntimidated.attacker,
        move: bestIntimidated.move || bestNeutral.move,
        maxPercent: Math.min(bestNeutral.maxPercent || 0, bestIntimidated.maxPercent || 0),
        minPercent: Math.min(bestNeutral.minPercent || 0, bestIntimidated.minPercent || 0),
        neutralMaxPercent: bestNeutral.maxPercent || 0,
        disadvantagedMaxPercent: bestIntimidated.maxPercent || 0,
        disadvantageNote: "intimidate"
      };
    }
    return bestNeutral;
  }

  async function buildDamageScoutRows(teamState, threatRows) {
    const currentTeam = teamState.filter((slot) => slot.name);
    const scoutEntries = [
      ...threatRows.slice(0, 3).map((row) => row.threat.name),
      ...championsRoster
        .filter((entry) => !currentTeam.some((slot) => normalizeNameKey(slot.name) === normalizeNameKey(entry.name)))
        .slice(0, 2)
        .map((entry) => entry.name)
    ];
    const uniqueNames = [...new Set(scoutEntries)];
    const rows = [];
    for (const name of uniqueNames) {
      const threatEntry = getRosterEntry(name);
      if (!threatEntry) continue;
      const benchmarkThreatSet = getThreatBenchmarkSet(threatEntry);
      const threatSet = benchmarkThreatSet
        ? benchmarkThreatSet
        : await getOptimizedDraftSetCached(threatEntry, {
            mode: "counter",
            focus: name,
            notes: "damage scout benchmark",
            enemyNames: [],
            chosen: [threatEntry],
            currentDraft: [],
            requestedModes: {},
            requestedPressure: { counterMeta: true }
          });
      const resolvedThreatEntry = resolveBattleEntry(threatSet) || threatEntry;
      const threatState = buildSimulatedStateFromSet(threatSet);
      const fieldState = normalizeNameKey(resolvedThreatEntry.name) === "mega charizard y" ? { weather: "Sun" } : {};
      let worstIncoming = { target: "", move: "", maxPercent: 0 };
      for (const slot of currentTeam) {
        const defenderEntry = resolveBattleEntry(slot);
        if (!defenderEntry) continue;
        for (const move of threatSet.moves.filter(Boolean)) {
          const estimate = await calculateDamageEstimate(resolvedThreatEntry, defenderEntry, move, threatState, buildSimulatedStateFromSet(slot), fieldState);
          if (estimate?.maxPercent > worstIncoming.maxPercent) {
            worstIncoming = { target: slot.name, move, maxPercent: estimate.maxPercent };
          }
        }
      }
      let bestResponse = { attacker: "", move: "", maxPercent: 0 };
      for (const slot of currentTeam) {
        const attackerEntry = resolveBattleEntry(slot);
        if (!attackerEntry) continue;
        const realisticResponse = await calculateRealisticThreatResponse(slot, attackerEntry, resolvedThreatEntry, threatSet, fieldState);
        if (realisticResponse?.maxPercent > bestResponse.maxPercent) {
          bestResponse = realisticResponse;
        }
      }
      rows.push({
        name,
        incoming: worstIncoming,
        response: bestResponse,
        safeSwitchCount: threatRows.find((row) => normalizeNameKey(row.threat.name) === normalizeNameKey(name))?.safeSwitchCount || 0,
        speedRisk: !!threatRows.find((row) => normalizeNameKey(row.threat.name) === normalizeNameKey(name))?.speedRisk,
        summary: worstIncoming.maxPercent >= 100
          ? `${name} can threaten a likely OHKO line into ${worstIncoming.target || "your team"} with ${prettyMoveName(worstIncoming.move)}.`
          : `${name}'s strongest line currently tops out around ${worstIncoming.maxPercent.toFixed(1)}% into ${worstIncoming.target || "your team"}.`
      });
    }
    return rows.slice(0, 5);
  }

  function getLiveWarRoomFilledSlots(teamState) {
    return (teamState || []).filter((slot) => slot?.name);
  }

  function getLiveWarRoomOccupiedRows(teamState) {
    return getLiveWarRoomFilledSlots(teamState)
      .map((slot) => ({ slot, entry: resolveBattleEntry(slot) }))
      .filter((row) => row.entry);
  }

  function buildLiveWarRoomWeaknessRows(teamState) {
    return Object.keys(TYPE_CHART).map((attackType) => ({
      attackType,
      weakCount: teamState
        .map((slot) => ({ slot, entry: resolveBattleEntry(slot) }))
        .filter((row) => row.entry)
        .filter(({ slot, entry }) => getEffectiveTypeEffectiveness(attackType, slot, entry) > 1).length,
      answerCount: teamState
        .map((slot) => ({ slot, entry: resolveBattleEntry(slot) }))
        .filter((row) => row.entry)
        .filter(({ slot, entry }) => getEffectiveTypeEffectiveness(attackType, slot, entry) < 1).length
    })).filter((row) => row.weakCount > 0).sort((a, b) => {
      const severityDiff = (b.weakCount * 2 - b.answerCount) - (a.weakCount * 2 - a.answerCount);
      if (severityDiff) return severityDiff;
      return a.attackType.localeCompare(b.attackType);
    });
  }

  function getLiveWarRoomMoveKeys(teamState) {
    return getLiveWarRoomFilledSlots(teamState).flatMap((slot) => (slot.moves || []).map((move) => normalizeNameKey(move)).filter(Boolean));
  }

  function getLiveWarRoomRoleCounts(teamState) {
    const occupied = getLiveWarRoomOccupiedRows(teamState);
    const moveKeys = getLiveWarRoomMoveKeys(teamState);
    const spreadDamageMoves = new Set(["rock slide", "heat wave", "muddy water", "dazzling gleam", "hyper voice", "snarl", "earthquake", "discharge", "blizzard", "breaking swipe", "surf"]);
    const priorityMoves = new Set(["fake out", "extreme speed", "sucker punch", "aqua jet", "accelerock", "shadow sneak", "bullet punch", "ice shard", "vacuum wave", "mach punch"]);
    const roleProfiles = occupied.map(({ slot, entry }) => inferSetRoleProfile(entry, { currentDraft: teamState }, slot.moves || [], slot.moves || []));
    return {
      pivotCount: occupied.filter(({ slot }) => (slot.moves || []).some((move) => ["u-turn", "volt switch", "flip turn", "parting shot"].includes(normalizeNameKey(move)))).length,
      redirectionCount: occupied.filter(({ slot }) => (slot.moves || []).some((move) => ["follow me", "rage powder"].includes(normalizeNameKey(move)))).length,
      spreadDamageCount: moveKeys.filter((move) => spreadDamageMoves.has(move)).length,
      priorityCount: moveKeys.filter((move) => priorityMoves.has(move)).length,
      tailwindCount: moveKeys.filter((move) => move === "tailwind").length,
      trickRoomCount: moveKeys.filter((move) => move === "trick room").length,
      extraSpeedControlCount: moveKeys.filter((move) => ["icy wind", "electroweb", "thunder wave", "bulldoze"].includes(move)).length,
      fakeOutCount: moveKeys.filter((move) => move === "fake out").length,
      scarfCount: occupied.filter(({ slot }) => normalizeNameKey(slot.item || "") === "choice scarf").length,
      supportCount: occupied.filter(({ slot }) => isMeaningfulSupportSet(slot)).length,
      attackerCount: occupied.filter(({ slot }) => isRealAttackerSet(slot)).length,
      specialBreakerCount: occupied.filter(({ slot, entry }) => {
        const profile = getOffenseProfile(slot, entry);
        const spa = entry.baseStats?.[3] || 0;
        return (profile === "special" || profile === "mixed") && spa >= 110;
      }).length,
      physicalBreakerCount: occupied.filter(({ slot, entry }) => {
        const profile = getOffenseProfile(slot, entry);
        const atk = entry.baseStats?.[1] || 0;
        return (profile === "physical" || profile === "mixed") && atk >= 110;
      }).length,
      cleanerCount: roleProfiles.filter((profile) => profile?.primaryRole === "cleaner" || profile?.secondaryRole === "cleaner").length,
      lowConfidenceCount: roleProfiles.filter((profile) => profile?.roleConfidence === "low").length,
      conflictCount: roleProfiles.filter((profile) => (profile?.roleConflicts || []).length > 0).length,
      fastCount: occupied.filter(({ entry }) => (entry.baseSpeed || 0) >= 100).length,
      slowCount: occupied.filter(({ entry }) => (entry.baseSpeed || 0) <= 65).length,
      groundImmunityCount: occupied.filter(({ slot, entry }) => getEffectiveTypeEffectiveness("Ground", slot, entry) === 0).length
    };
  }

  function getLiveWarRoomWeatherIdentity(teamState) {
    return inferTeamWeatherProfile(teamState).modes[0] || "";
  }

  function inferLiveTeamIdentity(teamState, fastData) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    const weather = fastData.weatherMode;
    if (!filled) return "Empty shell";
    if (weather === "rain") return "Rain shell";
    if (weather === "sun") return "Sun shell";
    if (weather === "sand") return "Sand shell";
    if (weather === "snow") return "Snow shell";
    if (fastData.roleCounts.trickRoomCount && fastData.roleCounts.slowCount >= 2) return "Hard Trick Room shell";
    if (fastData.roleCounts.trickRoomCount) return "Soft Trick Room shell";
    if (fastData.roleCounts.tailwindCount) return "Tailwind shell";
    if (fastData.roleCounts.fastCount >= 3 && fastData.roleCounts.supportCount <= 2) return "Fast offense shell";
    if (fastData.roleCounts.attackerCount >= 3 && fastData.structureReport.score >= 65) return "Bulky offense shell";
    if (fastData.roleCounts.supportCount >= 2 && fastData.roleCounts.attackerCount >= 2) return "Balanced shell";
    return "Early team shell";
  }

  function getLiveWarRoomSeverityClass(score) {
    if (score >= 75) return "live-war-room-severity--good";
    if (score >= 50) return "live-war-room-severity--warn";
    return "live-war-room-severity--danger";
  }

  function getCriticalTeamIssue(teamState, fastData) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    if (!filled) {
      return {
        severity: "warn",
        title: "Waiting for more team data.",
        hint: "Add a Pokemon to reveal the biggest structural issue."
      };
    }
    const candidates = [];
    const topWeakness = fastData.weaknessRows[0];
    if (topWeakness) {
      candidates.push({
        priority: topWeakness.weakCount * 24 - topWeakness.answerCount * 5,
        severity: topWeakness.weakCount >= 3 && topWeakness.answerCount === 0 ? "danger" : "warn",
        title: `Weak to ${topWeakness.attackType}: ${topWeakness.weakCount} member${topWeakness.weakCount === 1 ? "" : "s"} weak, ${topWeakness.answerCount} answer${topWeakness.answerCount === 1 ? "" : "s"}.`,
        hint: topWeakness.attackType === "Fairy"
          ? "Add a Steel resist or a stronger Fairy answer."
          : topWeakness.attackType === "Ground"
            ? "Consider Flying, Levitate, or a sturdier Ground switch-in."
            : `Patch ${topWeakness.attackType} with a resist, immunity, or a sturdier pivot.`
      });
    }
    if (filled >= 3 && fastData.roleCounts.groundImmunityCount === 0) {
      candidates.push({
        priority: 88,
        severity: "danger",
        title: "No Ground immunity.",
        hint: "Consider Flying, Levitate, or a sturdier Ground-resistant pivot."
      });
    }
    LIVE_PRESSURE_TYPES.forEach((type) => {
      const row = fastData.weaknessRows.find((item) => item.attackType === type);
      if (row && row.weakCount >= 2 && row.answerCount === 0) {
        candidates.push({
          priority: 72 + row.weakCount * 5,
          severity: row.weakCount >= 3 ? "danger" : "warn",
          title: `No safe switch into common ${type} pressure.`,
          hint: `Add a sturdier ${type} resist, immunity, or better pivoting into that matchup.`
        });
      }
    });
    if (!fastData.structureReport.speedControlCount && filled >= 3) {
      candidates.push({
        priority: 70,
        severity: "warn",
        title: "No real speed control.",
        hint: "Add Tailwind, Icy Wind, Electroweb, Thunder Wave, or a committed Trick Room mode."
      });
    }
    const occupied = getLiveWarRoomOccupiedRows(teamState);
    const lowPhysicalBulk = occupied.filter(({ entry }) => ((entry.baseStats?.[0] || 0) + (entry.baseStats?.[2] || 0)) <= 155).length;
    if (filled >= 4 && lowPhysicalBulk >= 3) {
      candidates.push({
        priority: 64,
        severity: "warn",
        title: "Low physical bulk across the shell.",
        hint: "Add Intimidate, bulk, or stronger physical pivoting."
      });
    }
    if (!candidates.length) {
      return {
        severity: "good",
        title: "No single structural alarm yet.",
        hint: "Keep adding pieces to reveal pressure points and matchup leaks."
      };
    }
    return candidates.sort((a, b) => b.priority - a.priority)[0];
  }

  function getLiveSpeedSummary(teamState, fastData) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    if (!filled) return "Waiting for more speed information.";
    const counts = fastData.roleCounts;
    const priorityNote = counts.priorityCount ? " Priority gives you some cleanup insurance." : "";
    if (counts.trickRoomCount && (counts.tailwindCount || counts.extraSpeedControlCount >= 2)) {
      return `Mixed speed plan is unstable.${priorityNote}`;
    }
    if (counts.trickRoomCount && counts.slowCount >= 2) {
      return `Hard Trick Room pace looks good.${priorityNote}`;
    }
    if (counts.trickRoomCount) {
      return `Trick Room is present, but the slow-mode shell is incomplete.${priorityNote}`;
    }
    if (counts.tailwindCount && counts.fastCount >= 2) {
      return `Strong speed control. Tailwind gives the offense real tempo.${priorityNote}`;
    }
    if (counts.tailwindCount) {
      return `Relies on Tailwind to keep up.${priorityNote}`;
    }
    if (counts.extraSpeedControlCount >= 2) {
      return `Strong speed control through layered support.${priorityNote}`;
    }
    if (counts.scarfCount && counts.fastCount < 2) {
      return `Speed plan leans heavily on Choice Scarf.${priorityNote}`;
    }
    if (counts.fastCount >= 3) {
      return `Natural speed keeps pace with most offensive meta.${priorityNote}`;
    }
    if (counts.fastCount <= 1) {
      return `Outsped by most offensive meta.${priorityNote}`;
    }
    return `Speed ties common threats and needs cleaner positioning.${priorityNote}`;
  }

  function getRoleGapPreview(teamState, fastData) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    if (!filled) return ["Add more Pokemon to expose role gaps."];
    const gaps = [];
    const counts = fastData.roleCounts;
    const structure = fastData.structureReport;
    if (counts.pivotCount === 0 && filled >= 3) gaps.push("No pivoting.");
    if (counts.redirectionCount === 0 && counts.trickRoomCount && filled >= 3) gaps.push("No redirection or setup protection.");
    if (counts.spreadDamageCount === 0 && filled >= 3) gaps.push("No spread damage.");
    if (counts.specialBreakerCount === 0 && filled >= 4) gaps.push("No reliable special breaker.");
    if (counts.attackerCount < Math.min(2, filled) && filled >= 3) gaps.push("Not enough meaningful attackers.");
    if (!counts.priorityCount && counts.fastCount < 2 && !structure.speedControlCount && filled >= 4) gaps.push("No clear endgame cleaner.");
    if (!gaps.length) gaps.push("Role structure looks healthy so far.");
    return gaps.slice(0, 3);
  }

  function computeSecondaryTeamScoreSource(teamState, fastData = {}, evaluation = null) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    const roleCounts = fastData.roleCounts || getLiveWarRoomRoleCounts(teamState);
    const structureReport = fastData.structureReport || evaluateTeamStructure(teamState);
    const metaPressure = fastData.metaPressure || scoreMetaAdaptability(teamState);
    const weaknessRows = fastData.weaknessRows || evaluation?.weaknessRows || [];
    const coherencePenalty = Math.max(0, (roleCounts.lowConfidenceCount || 0) * 4 + (roleCounts.conflictCount || 0) * 6 - (roleCounts.cleanerCount || 0) * 2);
    const offense = clampScore(
      30
      + roleCounts.attackerCount * 14
      + roleCounts.specialBreakerCount * 6
      + roleCounts.physicalBreakerCount * 6
      + roleCounts.spreadDamageCount * 5
      + roleCounts.priorityCount * 3
      + (roleCounts.attackerCount >= Math.min(3, Math.max(1, filled)) ? 6 : 0)
      + ((roleCounts.cleanerCount || 0) ? 5 : -4)
      - coherencePenalty
    );
    const defense = evaluation?.defensiveTypeScore ?? computeDefensiveTypeScore(weaknessRows.slice(0, 4), filled || 1);
    const structure = clampScore(structureReport.score - coherencePenalty - Math.max(0, (roleCounts.pivotCount || 0) - Math.max(0, roleCounts.attackerCount - 1)) * 4);
    const meta = clampScore(Math.round(
      ((evaluation?.metaMatchupScore ?? structureReport.score) * 0.45)
      + (metaPressure.fakeOut.score * 0.275)
      + (metaPressure.intimidate.score * 0.275)
    ));
    const synergy = clampScore(Math.round(
      structure * 0.45
      + meta * 0.25
      + defense * 0.15
      + (roleCounts.pivotCount ? 8 : 0)
      + (roleCounts.attackerCount >= 2 ? 8 : 0)
      + ((fastData.weatherMode || "") ? 6 : 0)
      + ((roleCounts.cleanerCount || 0) ? 5 : -2)
      - coherencePenalty
    ));
    const overall = clampScore(Math.round(
      offense * 0.22
      + defense * 0.18
      + synergy * 0.18
      + structure * 0.18
      + meta * 0.24
    ));
    return { offense, defense, synergy, structure, meta, overall };
  }

  function computeAveragedTeamScore(teamState, evaluation = null, fastData = null) {
    const secondary = computeSecondaryTeamScoreSource(teamState, fastData || {}, evaluation);
    const primary = {
      offense: evaluation?.offenseReport?.score ?? secondary.offense,
      defense: evaluation?.defensiveTypeScore ?? secondary.defense,
      synergy: clampScore(Math.round(
        (evaluation?.structureReport?.score ?? secondary.structure) * 0.45
        + (evaluation?.metaMatchupScore ?? secondary.meta) * 0.2
        + (((evaluation?.metaPressure?.fakeOut?.score ?? secondary.meta) + (evaluation?.metaPressure?.intimidate?.score ?? secondary.meta)) / 2) * 0.2
        + (evaluation?.offenseReport?.score ?? secondary.offense) * 0.15
      )),
      structure: evaluation?.structureReport?.score ?? secondary.structure,
      meta: evaluation?.metaMatchupScore ?? secondary.meta,
      overall: evaluation?.overallScore ?? secondary.overall
    };
    const averaged = Object.fromEntries(Object.keys(primary).map((field) => [
      field,
      clampScore(Math.round(((primary[field] ?? secondary[field]) + (secondary[field] ?? primary[field])) / 2))
    ]));
    return {
      primary,
      secondary,
      averaged
    };
  }

  function getMiniTeamScores(teamState, fastData, evaluation = null) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    if (!filled) {
      return {
        offense: { score: 0, label: "--" },
        defense: { score: 0, label: "--" },
        synergy: { score: 0, label: "--" }
      };
    }
    const averagedScores = computeAveragedTeamScore(teamState, evaluation, fastData).averaged;
    return {
      offense: { score: averagedScores.offense, label: String(Math.round(averagedScores.offense)) },
      defense: { score: averagedScores.defense, label: String(Math.round(averagedScores.defense)) },
      synergy: { score: averagedScores.synergy, label: String(Math.round(averagedScores.synergy)) }
    };
  }

  function buildLiveWarRoomSummary(teamState, fastData, evaluation = null) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    if (!filled) return "Waiting for more team data.";
    const identity = inferLiveTeamIdentity(teamState, fastData);
    const issue = getCriticalTeamIssue(teamState, fastData);
    const speedText = getLiveSpeedSummary(teamState, fastData)
      .replace(/\.$/, "")
      .replace(/^Hard Trick Room pace looks good/i, "strong slow-mode pacing")
      .replace(/^Strong speed control\. Tailwind gives the offense real tempo/i, "good speed control")
      .replace(/^Outsped by most offensive meta/i, "limited speed control");
    const offenseTone = (evaluation?.offenseReport?.score ?? fastData.miniScores.offense.score) >= 75
      ? "real pressure"
      : "patchable pressure";
    return `${identity} with ${issue.title.replace(/\.$/, "").toLowerCase()} and ${speedText.toLowerCase()}; current shell shows ${offenseTone}.`;
  }

  function formatLiveThreatSeverity(row, forcedLevel = "") {
    const severityKey = forcedLevel || (row.matchupScore <= 45 ? "danger" : row.matchupScore <= 68 ? "warn" : "good");
    if (severityKey === "danger") return { label: "Severe", className: "live-war-room-severity--danger" };
    if (severityKey === "warn") return { label: "Moderate", className: "live-war-room-severity--warn" };
    return { label: "Manageable", className: "live-war-room-severity--good" };
  }

  function formatLiveThreatReason(row) {
    if ((row.safeSwitchCount || 0) <= 0 && row.speedRisk) return "no safe switch-ins and it controls the pace";
    if (row.intimidatePressure >= 2) return "intimidate reduces key physical damage lines";
    if ((row.safeSwitchCount || 0) <= 0) return "no clean switch-ins";
    if (row.pressure >= 3 && !row.offenseReady) return "hits several members hard and you lack a clean punish";
    if (row.pressure >= 3) return "pressures multiple members heavily";
    if (!row.offenseReady) return "requires positioning before you can pressure back";
    return "demands careful positioning";
  }

  function buildRankedLiveThreatPreview(evaluation = null) {
    const sorted = [...(evaluation?.threatRows || [])].sort((a, b) => {
      const dangerDiff = (b.threatSeverityScore || (100 - b.matchupScore)) - (a.threatSeverityScore || (100 - a.matchupScore));
      if (dangerDiff) return dangerDiff;
      return (b.threat.weight || 0) - (a.threat.weight || 0);
    });
    const desiredLevels = ["danger", "danger", "warn", "warn", "good"];
    return sorted.slice(0, 5).map((row, index) => ({ row, level: desiredLevels[index] || "good" }));
  }

  function buildLiveThreatPreviewRows(evaluation = null) {
    if (!evaluation?.threatRows?.length) {
      return [{
        text: "Meta snapshot not ready, using local team read.",
        severityClass: "live-war-room-severity--warn"
      }];
    }
    return buildRankedLiveThreatPreview(evaluation).map(({ row, level }) => {
      const severity = formatLiveThreatSeverity(row, level);
      return {
        text: `${row.threat.name} (${Number(row.threat.weight || 0).toFixed(1)}%)`,
        detail: `${severity.label} — ${formatLiveThreatReason(row)}`,
        severityClass: severity.className
      };
    });
  }

  function getLiveThreatPreview(evaluation = null) {
    return buildLiveThreatPreviewRows(evaluation);
  }

  function formatMatchupPercent(value) {
    const numeric = Number(value || 0);
    if (numeric <= 0) return "0%";
    return `~${numeric.toFixed(1)}%`;
  }

  function buildQuickMatchupLine(row, threatRow = null) {
    const threatName = row.name;
    const incomingMove = row.incoming?.move ? prettyMoveName(row.incoming.move) : "its strongest line";
    const responseMove = row.response?.move ? prettyMoveName(row.response.move) : "your best attack";
    const targetName = row.incoming?.target || "your current board";
    const responder = row.response?.attacker || "your current answer";
    const incomingText = `${incomingMove} reaches ${formatMatchupPercent(row.incoming?.maxPercent)}`;
    const responseText = `${responder}'s ${responseMove} only returns ${formatMatchupPercent(row.response?.maxPercent)}`;
    const neutralText = row.response?.neutralMaxPercent ? ` from ${formatMatchupPercent(row.response.neutralMaxPercent)} neutral` : "";
    const limitedSwitches = (row.safeSwitchCount || 0) <= 1;

    if (row.response?.disadvantageNote === "intimidate") {
      return `Struggles into ${threatName} because Intimidate drops ${responseText}${neutralText}; ${incomingText} into ${targetName}.`;
    }
    if ((row.safeSwitchCount || 0) <= 0 && row.incoming?.maxPercent >= 100) {
      return `No safe switch into ${threatName}: ${incomingText} into ${targetName}, and ${responseText}.`;
    }
    if (threatRow?.speedRisk && row.incoming?.maxPercent >= 70) {
      return `${threatName} controls the pace here; ${incomingText} into ${targetName}, so you usually need speed control or a pivot first.`;
    }
    if ((threatRow?.pressure || 0) >= 3 && limitedSwitches) {
      return `${threatName} pressures multiple members and gives you limited switch-ins; ${responseText}, so this matchup is position-dependent.`;
    }
    if (row.response?.maxPercent >= 100 && limitedSwitches) {
      return `Can handle ${threatName} if positioned correctly: ${responder}'s ${responseMove} reaches ${formatMatchupPercent(row.response.maxPercent)}, but entry windows stay tight.`;
    }
    if (row.response?.maxPercent >= 85) {
      return `${responder} can keep ${threatName} in check with ${responseMove} for ${formatMatchupPercent(row.response.maxPercent)}, but it still asks for clean positioning.`;
    }
    if ((row.safeSwitchCount || 0) <= 0) {
      return `No clean switch into ${threatName}'s current pressure; ${incomingText} into ${targetName}.`;
    }
    return `${threatName} is manageable only with positioning: ${incomingText} into ${targetName}, while ${responseText}.`;
  }

  function getQuickMatchupPreview(teamState, fastData, evaluation = null, scoutRows = null) {
    const filled = getLiveWarRoomFilledSlots(teamState).length;
    if (!filled) return ["Add more Pokemon to reveal matchup pressure."];
    const lines = [];
    const seen = new Set();
    const pushUnique = (line) => {
      const key = normalizeNameKey(line || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      lines.push(line);
    };
    const threatLookup = new Map((evaluation?.threatRows || []).map((row) => [normalizeNameKey(row.threat.name), row]));
    const rankedScouts = [...(scoutRows || [])]
      .sort((a, b) => {
        const aThreat = threatLookup.get(normalizeNameKey(a.name));
        const bThreat = threatLookup.get(normalizeNameKey(b.name));
        const severityDiff = (bThreat?.threatSeverityScore || 0) - (aThreat?.threatSeverityScore || 0);
        if (severityDiff) return severityDiff;
        return (b.incoming?.maxPercent || 0) - (a.incoming?.maxPercent || 0);
      });
    rankedScouts.slice(0, 3).forEach((row) => {
      pushUnique(buildQuickMatchupLine(row, threatLookup.get(normalizeNameKey(row.name))));
    });
    if (lines.length < 3) {
      if (fastData.metaPressure.fakeOut.score >= 75) {
        pushUnique("Current team survives common Fake Out openings well.");
      } else if (fastData.metaPressure.fakeOut.score < 60) {
        pushUnique("Common Fake Out openings still strain this shell.");
      }
    }
    if (!lines.length && evaluation?.threatRows?.[0]) {
      pushUnique(`${evaluation.threatRows[0].threat.name} is the current matchup to respect most.`);
    }
    if (!lines.length) {
      pushUnique("Add more Pokemon to reveal matchup pressure.");
    }
    return lines.slice(0, 3);
  }

  function buildLiveWarRoomFastData(teamState) {
    const filled = getLiveWarRoomFilledSlots(teamState);
    const weaknessRows = buildLiveWarRoomWeaknessRows(teamState);
    const structureReport = evaluateTeamStructure(teamState);
    const metaPressure = scoreMetaAdaptability(teamState);
    const roleCounts = getLiveWarRoomRoleCounts(teamState);
    const weatherMode = getLiveWarRoomWeatherIdentity(teamState);
    const miniScores = getMiniTeamScores(teamState, { weaknessRows, structureReport, metaPressure, roleCounts, weatherMode });
    return {
      filledCount: filled.length,
      weaknessRows,
      structureReport,
      metaPressure,
      roleCounts,
      weatherMode,
      miniScores
    };
  }

  function renderLiveWarRoomList(items, fallbackText) {
    const rows = (items || []).length ? items : [{ text: fallbackText }];
    return rows.map((item) => `
      <div class="live-war-room-list__item ${item.severityClass || ""}">
        ${item.severityClass ? `<span class="live-war-room-severity ${item.severityClass}">${escapeHtml(item.text)}</span>` : escapeHtml(item.text)}
        ${item.detail ? `<small class="${item.severityClass || ""}">${escapeHtml(item.detail)}</small>` : ""}
      </div>
    `).join("");
  }

  function renderLiveWarRoomIntel() {
    if (!liveWarRoomIntel) return;
    const fast = liveWarRoomIntelState.fast;
    const medium = liveWarRoomIntelState.medium;
    const slow = liveWarRoomIntelState.slow;
    const loading = liveWarRoomIntelState.loading;
    const anyLoading = loading.fast || loading.medium || loading.slow;
    const summaryText = fast?.summary || "Waiting for more team data.";
    const issue = fast?.criticalIssue || {
      severity: "warn",
      title: "Add more Pokemon to reveal the biggest structural issue.",
      hint: "The panel will keep updating as the team changes."
    };
    const roleGaps = fast?.roleGaps || ["Add more Pokemon to expose role gaps."];
    const threatItems = medium?.threats || [{ text: "Meta snapshot not ready, using local team read.", severityClass: "live-war-room-severity--warn" }];
    const speedSummary = fast?.speedSummary || "Waiting for more speed information.";
    const matchupPreview = slow?.matchups || ["Add more Pokemon to reveal matchup pressure."];
    const scores = medium?.scores || fast?.scores || getMiniTeamScores([], { weaknessRows: [], structureReport: { score: 0 }, metaPressure: { fakeOut: { score: 0 }, intimidate: { score: 0 } }, roleCounts: {}, weatherMode: "" });
    liveWarRoomIntel.classList.toggle("is-loading", anyLoading);
    setBusyState(liveWarRoomIntel, anyLoading, "Refreshing Intel");
    liveWarRoomIntel.innerHTML = `
      <div class="section-heading live-war-room-card__heading">
        <div>
          <p class="section-kicker">Live War Room Intel</p>
          <h2>Always-On Team Read</h2>
        </div>
        <span class="live-war-room-card__status">${anyLoading ? "Updating" : "Live"}</span>
      </div>
      <section class="live-war-room-section live-war-room-section--summary">
        <p class="live-war-room-section__label">War Room Summary</p>
        <p class="live-war-room-section__body">${escapeHtml(summaryText)}</p>
      </section>
      <section class="live-war-room-section">
        <p class="live-war-room-section__label">Critical Weakness</p>
        <p class="live-war-room-section__body"><strong class="live-war-room-severity ${issue.severity === "good" ? "live-war-room-severity--good" : issue.severity === "danger" ? "live-war-room-severity--danger" : "live-war-room-severity--warn"}">${escapeHtml(issue.title)}</strong> ${escapeHtml(issue.hint)}</p>
      </section>
      <section class="live-war-room-section">
        <p class="live-war-room-section__label">Meta Threats</p>
        <div class="live-war-room-list">${renderLiveWarRoomList(threatItems, "Meta snapshot not ready, using local team read.")}</div>
      </section>
      <section class="live-war-room-section">
        <p class="live-war-room-section__label">Speed Control</p>
        <p class="live-war-room-section__body">${escapeHtml(speedSummary)}</p>
      </section>
      <section class="live-war-room-section">
        <p class="live-war-room-section__label">Quick Matchup Preview</p>
        <div class="live-war-room-list">${renderLiveWarRoomList(matchupPreview.map((text) => ({ text })), "Add more Pokemon to reveal matchup pressure.")}</div>
      </section>
      <section class="live-war-room-section">
        <p class="live-war-room-section__label">Role Gaps</p>
        <div class="live-war-room-list">${renderLiveWarRoomList(roleGaps.map((text) => ({ text })), "Role structure looks healthy so far.")}</div>
      </section>
      <section class="live-war-room-section">
        <p class="live-war-room-section__label">Team Score</p>
        <div class="live-war-room-score-row">
          ${["offense", "defense", "synergy"].map((key) => {
            const row = scores[key];
            return `<div class="live-war-room-score ${row?.score != null ? `live-war-room-score--${row.score >= 75 ? "good" : row.score >= 50 ? "warn" : "danger"}` : ""}"><span>${escapeHtml(key)}</span><strong>${escapeHtml(row?.label || "--")}</strong></div>`;
          }).join("")}
        </div>
      </section>
    `;
  }

  function scheduleLiveWarRoomIntelUpdate(reason = "update") {
    if (!liveWarRoomIntel) return;
    liveWarRoomIntelState.requestId += 1;
    const requestId = liveWarRoomIntelState.requestId;
    liveWarRoomIntelState.reason = reason;
    liveWarRoomIntelState.loading.fast = true;
    liveWarRoomIntelState.loading.medium = true;
    liveWarRoomIntelState.loading.slow = true;
    if (liveWarRoomIntelState.mediumTimer) clearTimeout(liveWarRoomIntelState.mediumTimer);
    if (liveWarRoomIntelState.slowTimer) clearTimeout(liveWarRoomIntelState.slowTimer);
    renderLiveWarRoomIntel();
    queueMicrotask(() => runLiveWarRoomFastPath(requestId));
    liveWarRoomIntelState.mediumTimer = window.setTimeout(() => {
      runLiveWarRoomMediumPath(requestId);
    }, LIVE_WAR_ROOM_MEDIUM_DEBOUNCE_MS);
    liveWarRoomIntelState.slowTimer = window.setTimeout(() => {
      runLiveWarRoomSlowPath(requestId);
    }, LIVE_WAR_ROOM_SLOW_DEBOUNCE_MS);
  }

  function runLiveWarRoomFastPath(requestId) {
    if (requestId !== liveWarRoomIntelState.requestId) return;
    const teamState = getTeamBuilderState();
    const fastData = buildLiveWarRoomFastData(teamState);
    liveWarRoomIntelState.fast = {
      summary: buildLiveWarRoomSummary(teamState, fastData),
      criticalIssue: getCriticalTeamIssue(teamState, fastData),
      speedSummary: getLiveSpeedSummary(teamState, fastData),
      roleGaps: getRoleGapPreview(teamState, fastData),
      scores: fastData.miniScores
    };
    liveWarRoomIntelState.loading.fast = false;
    renderLiveWarRoomIntel();
  }

  async function runLiveWarRoomMediumPath(requestId) {
    if (requestId !== liveWarRoomIntelState.requestId) return;
    const teamState = getTeamBuilderState();
    liveWarRoomIntelState.mediumPromise = evaluateTeamState(teamState);
    const evaluation = await liveWarRoomIntelState.mediumPromise.catch(() => null);
    if (requestId !== liveWarRoomIntelState.requestId) return;
    const fastData = buildLiveWarRoomFastData(teamState);
    liveWarRoomIntelState.medium = {
      evaluation,
      threats: getLiveThreatPreview(evaluation),
      scores: getMiniTeamScores(teamState, fastData, evaluation)
    };
    liveWarRoomIntelState.loading.medium = false;
    renderLiveWarRoomIntel();
  }

  async function runLiveWarRoomSlowPath(requestId) {
    if (requestId !== liveWarRoomIntelState.requestId) return;
    const teamState = getTeamBuilderState();
    const evaluation = liveWarRoomIntelState.medium?.evaluation
      || await (liveWarRoomIntelState.mediumPromise || evaluateTeamState(teamState)).catch(() => null);
    const scoutRows = evaluation?.threatRows?.length ? await buildDamageScoutRows(teamState, evaluation.threatRows).catch(() => []) : [];
    if (requestId !== liveWarRoomIntelState.requestId) return;
    const fastData = buildLiveWarRoomFastData(teamState);
    liveWarRoomIntelState.slow = {
      matchups: getQuickMatchupPreview(teamState, fastData, evaluation, scoutRows)
    };
    liveWarRoomIntelState.loading.slow = false;
    renderLiveWarRoomIntel();
  }

  async function buildPokemonTuneUps(teamState, evaluation) {
    const teamEntries = teamState.map((slot) => resolveBattleEntry(slot)).filter(Boolean);
    const tuneUps = [];
    const reservedSuggestedItems = new Set();
    for (let index = 0; index < teamState.length; index += 1) {
      const slot = teamState[index];
      const entry = resolveBattleEntry(slot);
      if (!entry) continue;
      const trustedCurrent = isTrustedCurrentSet(slot, entry);
      const currentItemDuplicate = evaluation.itemClause.duplicates.some((row) => normalizeNameKey(row.name || "") === normalizeNameKey(slot.item || ""));
      if (trustedCurrent && !currentItemDuplicate) {
        tuneUps.push({
          name: slot.name,
          summary: "Current set already matches a strong meta or anti-meta line.",
          reason: explainTrustedSet(slot, entry),
          suggested: {
            name: slot.name,
            item: slot.item || "",
            ability: slot.ability || "",
            nature: slot.nature || "",
            sps: { ...(slot.sps || {}) },
            moves: [...(slot.moves || [])]
          }
        });
        if (slot.item) reservedSuggestedItems.add(normalizeNameKey(slot.item));
        continue;
      }
      const preserveSupport = isSupportStyledSlot(slot, entry);
      const suggested = await getOptimizedDraftSetCached(entry, {
        mode: preserveSupport ? "archetype" : "pokemon",
        focus: entry.name,
        notes: `${preserveSupport ? "preserve this as a support / utility set with speed control, disruption, fake out pressure, or positioning tools." : "optimize this set for current weaknesses, matchup holes, and role compression."} ${evaluation.offenseReport.uncoveredTypes.join(", ")}`,
        enemyNames: [],
        chosen: teamEntries,
        currentDraft: teamState,
        requestedModes: {},
        requestedPressure: {},
        forceSupport: preserveSupport
      });
      const usedItemKeys = new Set([
        ...reservedSuggestedItems,
        ...teamState
          .filter((_, slotIndex) => slotIndex !== index)
          .map((otherSlot) => normalizeNameKey(otherSlot.item || ""))
          .filter(Boolean)
      ]);
      if (suggested.item && usedItemKeys.has(normalizeNameKey(suggested.item))) {
        suggested.item = findUniqueItemForSet({ ...suggested, item: "" }, usedItemKeys);
      }
      if (suggested.item) {
        reservedSuggestedItems.add(normalizeNameKey(suggested.item));
      }
      const changeNotes = [];
      if (suggested.item && normalizeNameKey(suggested.item) !== normalizeNameKey(slot.item || "")) changeNotes.push(`Item: ${slot.item || "none"} -> ${suggested.item}`);
      if (suggested.ability && normalizeNameKey(suggested.ability) !== normalizeNameKey(slot.ability || "")) changeNotes.push(`Ability: ${slot.ability || "none"} -> ${suggested.ability}`);
      if (!sameSpread(slot.sps, suggested.sps)) changeNotes.push(`SP: ${formatSpSummary(slot.sps)} -> ${formatSpSummary(suggested.sps)}`);
      const moveShift = describeMoveAdjustments(slot.moves, suggested.moves);
      if (moveShift) changeNotes.push(`Moves: ${moveShift}`);
      const currentPressure = await calculateBestResponsePercent(slot, entry, getRosterEntry(evaluation.threatRows?.[0]?.threat?.name || "") || entry);
      const suggestedPressure = await calculateBestResponsePercent(suggested, entry, getRosterEntry(evaluation.threatRows?.[0]?.threat?.name || "") || entry);
      tuneUps.push({
        name: slot.name,
        summary: changeNotes.length ? changeNotes.join(" | ") : "Set already looks coherent for the current team shell.",
        reason: suggestedPressure > currentPressure + 10
          ? `This suggested version improves pressure into ${evaluation.threatRows?.[0]?.threat?.name || "current problem matchups"} by about ${(suggestedPressure - currentPressure).toFixed(1)}%.`
          : explainDraftSet(suggested),
        suggested
      });
    }
    return tuneUps;
  }

  function slotHasAllMoves(slot, moves) {
    const moveKeys = new Set((slot?.moves || []).map((move) => normalizeNameKey(move)).filter(Boolean));
    return moves.every((move) => moveKeys.has(normalizeNameKey(move)));
  }

  function isTrustedCurrentSet(slot, entry) {
    const key = normalizeNameKey(entry?.name || "");
    const itemKey = normalizeNameKey(slot?.item || "");
    const abilityKey = normalizeNameKey(slot?.ability || "");
    if (key === "sneasler") {
      return itemKey === "white herb"
        && abilityKey === "unburden"
        && slotHasAllMoves(slot, ["close combat", "dire claw", "protect", "fake out"]);
    }
    if (key === "incineroar") {
      return itemKey === "sitrus berry"
        && abilityKey === "intimidate"
        && slotHasAllMoves(slot, ["fake out", "flare blitz", "parting shot"])
        && (slotHasAllMoves(slot, ["throat chop"]) || slotHasAllMoves(slot, ["knock off"]));
    }
    if (key === "greninja" || key === "mega greninja") {
      return itemKey === "greninjite"
        && abilityKey === "protean"
        && slotHasAllMoves(slot, ["hydro pump", "dark pulse"])
        && (slotHasAllMoves(slot, ["gunk shot"]) || slotHasAllMoves(slot, ["poison jab"]));
    }
    if (key === "aerodactyl" || key === "mega aerodactyl") {
      return itemKey === "focus sash"
        && abilityKey === "unnerve"
        && slotHasAllMoves(slot, ["tailwind", "rock slide", "dual wingbeat", "protect"]);
    }
    if (key === "primarina") {
      return itemKey === "kebia berry"
        && abilityKey === "liquid voice"
        && slotHasAllMoves(slot, ["hyper voice", "sparkling aria", "moonblast", "protect"]);
    }
    if (key === "sinistcha") {
      return itemKey === "leftovers"
        && abilityKey === "hospitality"
        && slotHasAllMoves(slot, ["matcha gotcha", "strength sap", "protect", "rage powder"]);
    }
    return false;
  }

  function explainTrustedSet(slot, entry) {
    const key = normalizeNameKey(entry?.name || "");
    if (key === "sneasler") return "White Herb + Unburden with Dire Claw / Close Combat / Fake Out / Protect is already a strong current line.";
    if (key === "incineroar") return "This Intimidate Sitrus support set is already doing the Fake Out / Parting Shot pivot job it should.";
    if (key === "greninja" || key === "mega greninja") return "This Protean Greninja line already looks like a real anti-meta breaker rather than a slot that needs flattening.";
    if (key === "aerodactyl" || key === "mega aerodactyl") return "Focus Sash Unnerve Tailwind Aerodactyl is already a coherent speed-control lead.";
    if (key === "primarina") return "Kebia Berry Liquid Voice Primarina is already tuned to survive the key Poison pressure and keep back with strong Fairy/Water sound damage.";
    if (key === "sinistcha") return "Leftovers Hospitality Sinistcha with Matcha Gotcha / Strength Sap / Rage Powder / Protect is already doing the bulky redirector job it should.";
    return "This current set already matches a coherent role.";
  }

  function isSupportStyledSlot(slot, entry) {
    const moveKeys = (slot?.moves || []).map((move) => normalizeNameKey(move)).filter(Boolean);
    const supportMoves = new Set([
      "protect", "tailwind", "trick room", "helping hand", "quick guard", "parting shot", "taunt",
      "will-o-wisp", "fake out", "substitute", "thunder wave", "icy wind", "electroweb", "encore",
      "coaching", "disable", "haze", "nuzzle"
    ]);
    const supportCount = moveKeys.filter((move) => supportMoves.has(move)).length;
    if (supportCount >= 2) return true;
    if (SUPPORT_ROLE_LOCKS.has(normalizeNameKey(entry?.name || "")) && supportCount >= 1) return true;
    if (moveKeys.includes("fake out") || moveKeys.includes("electroweb") || moveKeys.includes("icy wind")) return true;
    return false;
  }

  async function analyzeTeamBuilder() {
    document.body.classList.add("is-analyzing");
    setBusyState(teamAnalysis, true, "Analyzing");
    try {
    const teamState = getTeamBuilderState();
    logBuilderEvent("builder:analysis-start", {
      filledSlots: teamState.filter((slot) => slot.name).length
    });
    const selectedNames = teamState.map((slot) => slot.name).filter(Boolean);
    const uniqueNames = [...new Set(selectedNames)];
    const occupiedNameKeys = new Set(selectedNames.map((name) => normalizeNameKey(name)).filter(Boolean));
    const occupiedFamilyKeys = new Set(selectedNames.map((name) => getSpeciesClauseKey(name)).filter(Boolean));
    const team = teamState.map((slot) => resolveBattleEntry(slot)).filter(Boolean);
    if (!team.length) {
      teamAnalysis.innerHTML = `<div class="status-note">Choose at least one Pokemon to analyze your team.</div>`;
      return;
    }

    const evaluation = await evaluateTeamState(teamState);
    const {
      offenseReport,
      threatRows,
      metaPressure,
      itemClause,
      speciesClause,
      defensiveTypeScore,
      metaMatchupScore,
      structureReport,
      overallScore,
      weaknessRows
    } = evaluation;
    const averagedScores = evaluation.averagedScores || computeAveragedTeamScore(teamState, evaluation).averaged;
    const leadRecommendations = await buildLeadRecommendation(teamState, threatRows);
    const damageScoutRows = await buildDamageScoutRows(teamState, threatRows);

    const teamItemKeys = new Set(teamState.filter((slot) => slot.name).map((slot) => normalizeNameKey(slot.item || "")).filter(Boolean));
    const recommendations = championsRoster
      .filter((entry) => !uniqueNames.includes(entry.name))
      .filter((entry) => !occupiedNameKeys.has(normalizeNameKey(entry.name)))
      .filter((entry) => !occupiedFamilyKeys.has(getSpeciesClauseKey(entry.name)))
      .filter((entry) => !violatesSpeciesClause(team, entry))
      .filter((entry) => !team.some((t) => normalizeNameKey(t.name) === normalizeNameKey(entry.name)))
      .map((entry) => scoreCandidate(entry, weaknessRows, threatRows.slice(0, 6), offenseReport, structureReport, teamState))
      .filter((item) => normalizeNameKey(item.swapTarget || "") !== normalizeNameKey(item.entry.name))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const recommendationSets = await Promise.all(recommendations.map((item) => getOptimizedDraftSetCached(item.entry, {
      mode: "archetype",
      focus: "",
      notes: "",
      enemyNames: [],
      chosen: team,
      currentDraft: teamState,
      requestedModes: {},
      requestedPressure: {}
    })));
    recommendationSets.forEach((set) => {
      if (teamItemKeys.has(normalizeNameKey(set.item || ""))) {
        set.item = findUniqueItemForSet(set, teamItemKeys);
      }
      if (set.item) teamItemKeys.add(normalizeNameKey(set.item));
    });
    const recommendationCards = await buildRecommendationCards(teamState, evaluation, recommendations, recommendationSets);

    const weaknessMarkup = weaknessRows.length
      ? weaknessRows.map((row) => `<span class="analysis-chip ${severityClassForWeakness(row.weakCount)}">${row.attackType}: ${row.weakCount} weak</span>`).join("")
      : `<span class="analysis-chip severity-good">No major weakness stack detected.</span>`;

    const threatMarkup = threatRows.slice(0, 5).map((item) => {
      const severity = severityClassForScore(item.matchupScore);
      return `<span class="analysis-chip ${severity}">${item.threat.name}: ${item.matchupScore}/100 matchup${item.offenseReady ? " | can hit back" : " | poor pressure back"}</span>`;
    }).join("");
    const offensiveMarkup = offenseReport.uncoveredTypes.length
      ? offenseReport.uncoveredTypes.slice(0, 6).map((type) => `<span class="analysis-chip severity-high">${type}: no strong hits</span>`).join("")
      : `<span class="analysis-chip severity-good">No major offensive type holes detected.</span>`;
    const fakeOutSeverity = severityClassForScore(metaPressure.fakeOut.score);
    const intimidateSeverity = severityClassForScore(metaPressure.intimidate.score);
    const overallSeverity = severityClassForScore(averagedScores.overall);

    const teamPreview = teamState
      .filter((slot) => slot.name)
      .map((slot) => {
        const details = [slot.item, slot.ability, slot.nature, slot.moves.filter(Boolean).join(" / ")].filter(Boolean).join(" | ");
        return `<div class="analysis-chip severity-neutral"><strong>${slot.name}</strong>${details ? `<br>${details}` : ""}</div>`;
      }).join("");
    const gradeBand = describeGradeBand(averagedScores.overall);
    const fixList = buildFixList({
      weaknessRows,
      offenseReport,
      metaPressure,
      threatRows,
      itemClause,
      speciesClause,
      structureReport
    });
    const dockedPointDetails = buildDockedPointDetails(evaluation);
    const defenseTypeChartMarkup = buildTeamTypeChartMarkup(teamState);

    teamAnalysis.innerHTML = `
      <div class="analysis-grid">
        <div class="analysis-stack">
          <p class="result-title">Team Readout</p>
          <p class="result-copy">Current core: <strong>${team.map((entry) => entry.name).join(", ")}</strong></p>
          <div class="analysis-row">${teamPreview}</div>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Overall Team Score</p>
          <div class="analysis-row">
            <span class="analysis-chip ${overallSeverity}">Overall: ${averagedScores.overall}/100</span>
            <span class="analysis-chip ${severityClassForScore(averagedScores.defense)}">Type Defense: ${averagedScores.defense}/100</span>
            <span class="analysis-chip ${severityClassForScore(averagedScores.offense)}">Offense: ${averagedScores.offense}/100</span>
            <span class="analysis-chip ${severityClassForScore(averagedScores.meta)}">Vs Meta: ${averagedScores.meta}/100</span>
            <span class="analysis-chip ${severityClassForScore(averagedScores.structure)}">Structure: ${averagedScores.structure}/100</span>
            <span class="analysis-chip ${severityClassForScore(averagedScores.synergy)}">Synergy: ${averagedScores.synergy}/100</span>
            <span class="analysis-chip ${severityClassForScore(itemClause.score)}">Item Clause: ${itemClause.score}/100</span>
            <span class="analysis-chip ${severityClassForScore(speciesClause.score)}">Species Clause: ${speciesClause.score}/100</span>
          </div>
          <p class="result-copy"><strong>Grade:</strong> ${gradeBand}. ${dockedPointDetails[0] || "The score is coming mostly from balanced team fundamentals."}</p>
          <div class="fix-list">
            ${fixList.map((item) => `<div class="fix-list__item">${item}</div>`).join("")}
          </div>
          <ol class="fix-list fix-list--ordered">
            ${dockedPointDetails.map((item) => `<li class="fix-list__item">${item}</li>`).join("")}
          </ol>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Lead Recommendation</p>
          <div class="analysis-row">
            ${leadRecommendations.map((lead) => `<span class="analysis-chip ${severityClassForScore(lead.score)}">${lead.names.join(" + ")}: ${lead.score}/100</span>`).join("")}
          </div>
          ${leadRecommendations.map((lead, index) => `<p class="result-copy"><strong>${index === 0 ? "Primary" : "Backup"}:</strong> ${lead.summary}</p>`).join("")}
        </div>
        <div class="analysis-stack">
          <p class="result-title">Item Clause</p>
          <div class="analysis-row">
            ${itemClause.duplicates.length
              ? itemClause.duplicates.map((item) => `<span class="analysis-chip severity-high">${item.name}: ${item.count} copies</span>`).join("")
              : `<span class="analysis-chip severity-good">No duplicate items detected.</span>`}
          </div>
          <p class="result-copy">${itemClause.summary}</p>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Species Clause</p>
          <div class="analysis-row">
            ${speciesClause.duplicates.length
              ? speciesClause.duplicates.map((row) => `<span class="analysis-chip severity-high">${row.names.join(" + ")}</span>`).join("")
              : `<span class="analysis-chip severity-good">No duplicate base-species or regional-form pairs detected.</span>`}
          </div>
          <p class="result-copy">${speciesClause.summary}</p>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Structure Check</p>
          <div class="analysis-row">
            <span class="analysis-chip ${severityClassForScore(structureReport.score)}">Structure: ${structureReport.score}/100</span>
            <span class="analysis-chip severity-neutral">Physical: ${structureReport.physicalCount}</span>
            <span class="analysis-chip severity-neutral">Special: ${structureReport.specialCount}</span>
            <span class="analysis-chip severity-neutral">Fast: ${structureReport.fastCount}</span>
            <span class="analysis-chip severity-neutral">Slow: ${structureReport.slowCount}</span>
            <span class="analysis-chip severity-neutral">Speed control: ${structureReport.speedControlCount}</span>
            <span class="analysis-chip severity-neutral">Trick Room: ${structureReport.trickRoomCount}</span>
          </div>
          <p class="result-copy">${structureReport.summary}</p>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Defense Type Chart</p>
          ${defenseTypeChartMarkup}
          <p class="result-copy">Each row shows how the current team takes that attack type. Use it to spot weaknesses, resistances, and immunities without relying only on the AI summary.</p>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Weakness Map</p>
          <div class="analysis-row">${weaknessMarkup}</div>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Offensive Blind Spots</p>
          <div class="analysis-row">${offensiveMarkup}</div>
          <p class="result-copy">${offenseReport.summary}</p>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Meta Threat Pressure</p>
          <div class="analysis-row">${threatMarkup || `<span class="analysis-chip severity-good">No major threat overlap detected.</span>`}</div>
          <p class="result-copy">${formatMetaStatusCopy()}</p>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Damage Scout</p>
          <div class="fix-list">
            ${damageScoutRows.map((row) => `<div class="fix-list__item"><strong>${row.name}:</strong> ${row.summary}<br><strong>Best hit in:</strong> ${row.incoming.move ? `${prettyMoveName(row.incoming.move)} into ${row.incoming.target} for ~${row.incoming.maxPercent.toFixed(1)}%` : "No clean line found."}<br><strong>Best hit back:</strong> ${row.response.move ? `${row.response.attacker} using ${prettyMoveName(row.response.move)} for ~${row.response.maxPercent.toFixed(1)}%` : "Current team does not pressure it well."}</div>`).join("")}
          </div>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Meta Adaptability</p>
          <div class="analysis-row">
            <span class="analysis-chip ${fakeOutSeverity}">Fake Out: ${metaPressure.fakeOut.score}/100</span>
            <span class="analysis-chip ${intimidateSeverity}">Intimidate: ${metaPressure.intimidate.score}/100</span>
          </div>
          <p class="result-copy">Compared to common meta pressure, this team looks <strong>${metaPressure.summary}</strong>.</p>
          <p class="result-copy"><strong>Fake Out:</strong> ${metaPressure.fakeOut.summary}</p>
          <p class="result-copy"><strong>Intimidate:</strong> ${metaPressure.intimidate.summary}</p>
          <p class="result-copy"><strong>Sources:</strong> <a href="${PIKALYTICS_SOURCES.tournaments}" target="_blank" rel="noreferrer">Champions Tournaments</a> and <a href="${PIKALYTICS_SOURCES.preview}" target="_blank" rel="noreferrer">Champions Preview</a>.</p>
        </div>
        <div class="analysis-stack">
          <p class="result-title">Recommended Fixes</p>
          <div class="fix-list">
            ${recommendationCards.map((card) => `
              <div class="import-card-item import-card-item--recommend">
                <div class="import-card-item__header">
                  <div class="pokemon-preview">
                    <div class="sprite-shell"><img class="pokemon-sprite" src="${card.sprite}" onerror="this.onerror=null;this.src='${POKEBALL_PLACEHOLDER}'" alt="${escapeHtml(card.title)} sprite" /></div>
                    <div>
                      <h3>${card.title}</h3>
                      <p>${card.subtitle}</p>
                    </div>
                  </div>
                </div>
                <p>${card.summary}</p>
                <div class="change-badge-row">${card.badges}</div>
                ${card.addName ? `<div class="inline-actions"><button class="action-button accent" data-add-recommendation="${card.addName}">Add</button></div>` : ""}
              </div>
            `).join("")}
          </div>
          <p class="result-copy">These fixes are ordered with set corrections first. If they still do not patch the matchup spread, use the swap options that follow in the same list.</p>
        </div>
      </div>
    `;
    animateScorePanelChanges(teamAnalysis);
    } finally {
      setBusyState(teamAnalysis, false);
      document.body.classList.remove("is-analyzing");
    }
  }

  async function evaluateTeamState(teamState) {
    const team = teamState.map((slot) => resolveBattleEntry(slot)).filter(Boolean);
    const weaknessRows = Object.keys(TYPE_CHART).map((attackType) => ({
      attackType,
      weakCount: teamState
        .map((slot) => ({ slot, entry: resolveBattleEntry(slot) }))
        .filter((row) => row.entry)
        .filter(({ slot, entry }) => getEffectiveTypeEffectiveness(attackType, slot, entry) > 1).length,
      answerCount: teamState
        .map((slot) => ({ slot, entry: resolveBattleEntry(slot) }))
        .filter((row) => row.entry)
        .filter(({ slot, entry }) => getEffectiveTypeEffectiveness(attackType, slot, entry) < 1).length
    })).filter((row) => row.weakCount > 0 && !(row.weakCount === 2 && row.answerCount > 0)).sort((a, b) => b.weakCount - a.weakCount).slice(0, 4);
    const offenseReport = await buildOffenseCoverageReport(teamState);
    const threatRows = buildMetaThreatRows(teamState, offenseReport.attackTypes);
    const metaPressure = scoreMetaAdaptability(teamState);
    const itemClause = evaluateItemClause(teamState);
    const speciesClause = evaluateSpeciesClause(teamState);
    const structureReport = evaluateTeamStructure(teamState);
    const defensiveTypeScore = computeDefensiveTypeScore(weaknessRows, team.length);
    const metaMatchupScore = computeMetaMatchupScore(threatRows);
    const rawOverallScore = clampScore(Math.round(
      metaPressure.fakeOut.score * 0.12
      + metaPressure.intimidate.score * 0.12
      + defensiveTypeScore * 0.16
      + offenseReport.score * 0.18
      + metaMatchupScore * 0.18
      + structureReport.score * 0.16
      + itemClause.score * 0.04
      + speciesClause.score * 0.04
    ));
    const averagedScores = computeAveragedTeamScore(teamState, {
      offenseReport,
      defensiveTypeScore,
      structureReport,
      metaMatchupScore,
      metaPressure,
      overallScore: rawOverallScore
    }, {
      weaknessRows,
      structureReport,
      metaPressure,
      roleCounts: getLiveWarRoomRoleCounts(teamState),
      weatherMode: inferTeamWeatherProfile(teamState).primary
    }).averaged;
    return {
      team,
      weaknessRows,
      offenseReport,
      threatRows,
      metaPressure,
      itemClause,
      speciesClause,
      structureReport,
      defensiveTypeScore,
      metaMatchupScore,
      rawOverallScore,
      overallScore: averagedScores.overall,
      averagedScores
    };
  }

  function scoreCandidate(entry, weaknesses, threats, offenseReport, structureReport = {}, teamState = []) {
    let score = 0;
    const reasons = [];
    const metaWeight = metaThreats.find((threat) => normalizeNameKey(threat.name) === normalizeNameKey(entry.name))?.weight || 0;
    const teamWeatherProfile = inferTeamWeatherProfile(teamState);
    const candidateWeatherMode = getWeatherSetterMode(entry);
    const entryLegalMoves = legalPokemonData[entry.name]?.legalMoves || [];
    const currentMegaCount = teamState.filter((slot) => {
      const resolved = resolveBattleEntry(slot);
      return resolved && isMegaEntry(resolved);
    }).length;
    weaknesses.forEach((weakness) => {
      const effect = getTypeEffectiveness(weakness.attackType, entry.types);
      if (effect < 1) {
        score += weakness.weakCount * (effect === 0 ? 4 : 3);
        reasons.push(`Helps into ${weakness.attackType}.`);
      }
    });
    threats.forEach(({ threat, pressure }) => {
      const resists = threat.types.some((type) => getTypeEffectiveness(type, entry.types) < 1);
      const threatensBack = entry.types.some((stab) => threat.types.some((targetType) => getSingleTypeEffectiveness(stab, targetType) > 1));
      if (resists) {
        score += pressure * 2;
        reasons.push(`Checks ${threat.name}'s main pressure.`);
      }
      if (threatensBack) {
        score += 2;
        reasons.push(`Can hit ${threat.name} back effectively.`);
      }
      if (normalizeNameKey(entry.name) === "arcanine-hisui" && ["charizard", "mega charizard y"].includes(normalizeNameKey(threat.name || ""))) {
        score += 10;
        reasons.push("Can pressure Mega Charizard Y with Rock STAB.");
      }
    });
    offenseReport.uncoveredTypes.slice(0, 5).forEach((type) => {
      if (entry.types.some((stab) => getSingleTypeEffectiveness(stab, type) > 1)) {
        score += 3;
        reasons.push(`Adds pressure into ${type}.`);
      }
    });
    const hasSpeedControl = (structureReport.speedControlCount || 0) > 0;
    const hasTrickRoom = (structureReport.trickRoomCount || 0) > 0;
    const disruptionLead = ["fake out", "encore", "taunt", "electroweb", "icy wind", "nuzzle", "parting shot"];
    const hasLeadDisruption = entryLegalMoves.some((move) => disruptionLead.includes(normalizeNameKey(move)));
    if (!hasSpeedControl && entry.baseSpeed >= 100) {
      score += 8;
      reasons.push("Adds natural speed where the team currently has none.");
    } else if (hasTrickRoom && !hasSpeedControl && entry.baseSpeed <= 65) {
      score += 8;
      reasons.push("Fits the slower Trick Room pacing.");
    } else if (hasTrickRoom && hasSpeedControl && entry.baseSpeed >= 55 && entry.baseSpeed <= 95) {
      score += 7;
      reasons.push("Fits the mid-speed zone for mixed Tailwind and Trick Room plans.");
    }
    if (hasTrickRoom && hasLeadDisruption) {
      score += 7;
      reasons.push("Helps a Trick Room lead with Fake Out or disruption support.");
    }
    if (candidateWeatherMode && !teamWeatherProfile.modes.includes(candidateWeatherMode)) {
      score -= 16;
    } else if (candidateWeatherMode && teamWeatherProfile.modes.includes(candidateWeatherMode)) {
      score += 4;
      reasons.push(`Fits the team's existing ${candidateWeatherMode} plan.`);
    }
    if (normalizeNameKey(entry.name) === "mega charizard y" && teamWeatherProfile.modes.some((mode) => mode && mode !== "sun")) {
      score -= 28;
    }
    if (isMegaEntry(entry) && currentMegaCount > 0) {
      score -= 18;
    }
    if (metaWeight) {
      score += Math.min(24, metaWeight / 2);
      reasons.push("Is already proving itself in current Champions meta.");
    } else {
      score -= 12;
    }
    const duplicateItemRisk = teamState.some((slot) => normalizeNameKey(slot.item || "") === normalizeNameKey(getSuggestedItem(entry, { mode: "archetype" }, [])));
    if (duplicateItemRisk) score -= 3;
    if (!reasons.length) reasons.push("Adds a different defensive profile.");
    const swapTarget = recommendSwapCandidate(entry, weaknesses, offenseReport);
    return {
      entry,
      score,
      reasons: [...new Set(reasons)].slice(0, 3),
      swapTarget: swapTarget?.name || "lowest-impact piece",
      swapSummary: swapTarget
        ? `Best swap: replace ${swapTarget.name}. ${swapTarget.reason}`
        : "Best swap: open slot or lowest-impact piece."
    };
  }

  function recommendSwapCandidate(entry, weaknesses, offenseReport) {
    return getTeamBuilderState()
      .filter((slot) => slot.name)
      .map((slot) => {
        const current = getRosterEntry(slot.name);
        if (!current) return null;
        let score = 0;
        const majorWeakness = weaknesses.find((weakness) => getTypeEffectiveness(weakness.attackType, current.types) > 1);
        if (majorWeakness) score += majorWeakness.weakCount * 4;
        if (offenseReport.uncoveredTypes.some((type) => !current.types.some((stab) => getSingleTypeEffectiveness(stab, type) > 1))) score += 4;
        if (current.types.some((type) => entry.types.includes(type))) score += 1;
        return {
          name: current.name,
          score,
          reason: majorWeakness
            ? `${current.name} adds to the ${majorWeakness.attackType} problem and patches fewer current blind spots.`
            : `${current.name} gives up the least unique coverage compared with ${entry.name}.`
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)[0] || null;
  }

  function inferTeamWeatherProfile(teamState) {
    const modes = new Set();
    for (const slot of teamState.filter((row) => row.name)) {
      const ability = normalizeNameKey(slot.ability || "");
      const moveKeys = (slot.moves || []).map((move) => normalizeNameKey(move));
      if (ability === "drought" || moveKeys.includes("sunny day")) modes.add("sun");
      if (ability === "drizzle" || moveKeys.includes("rain dance")) modes.add("rain");
      if (ability === "sand stream") modes.add("sand");
      if (ability === "snow warning" || moveKeys.includes("snowscape")) modes.add("snow");
    }
    return { modes: [...modes] };
  }

  function getWeatherSetterMode(entry) {
    const key = normalizeNameKey(entry?.name || "");
    if (["pelipper"].includes(key)) return "rain";
    if (["torkoal", "mega charizard y"].includes(key)) return "sun";
    if (["tyranitar", "mega tyranitar"].includes(key)) return "sand";
    if (["ninetales-alola", "abomasnow", "mega abomasnow"].includes(key)) return "snow";
    return "";
  }

  async function buildOffenseCoverageReport(teamState) {
    const attackTypes = [];
    for (const slot of teamState.filter((item) => item.name)) {
      const entry = getRosterEntry(slot.name);
      if (!entry) continue;
      const moveNames = slot.moves.filter(Boolean);
      if (moveNames.length) {
        const slotAttackTypes = [];
        for (const moveName of moveNames) {
          const moveDetail = await getMoveDetail(moveName);
          const typeName = getEffectiveMoveType(slot, entry, moveName, moveDetail);
          if (typeName) slotAttackTypes.push(typeName);
        }
        if (slotAttackTypes.length) {
          attackTypes.push(...slotAttackTypes);
        } else {
          attackTypes.push(...entry.types);
        }
      } else {
        attackTypes.push(...entry.types);
      }
    }
    const uniqueAttackTypes = [...new Set(attackTypes)];
    const uncoveredTypes = Object.keys(TYPE_CHART).filter((defenderType) => !uniqueAttackTypes.some((attackType) => getSingleTypeEffectiveness(attackType, defenderType) > 1));
    const lightlyCoveredTypes = Object.keys(TYPE_CHART).filter((defenderType) => uniqueAttackTypes.filter((attackType) => getSingleTypeEffectiveness(attackType, defenderType) > 1).length === 1);
    const score = clampScore(100 - uncoveredTypes.length * 9 - lightlyCoveredTypes.length * 2);
    const summary = uncoveredTypes.length
      ? `Your current move pool struggles to threaten ${uncoveredTypes.slice(0, 6).join(", ")} super effectively.`
      : `Your selected moves give you broad offensive reach across the current legal pool.`;
    return { attackTypes: uniqueAttackTypes, uncoveredTypes, lightlyCoveredTypes, score, summary };
  }

  function buildMetaThreatRows(teamState, attackTypes) {
    const occupiedRows = (teamState || [])
      .map((slot) => ({ slot, entry: resolveBattleEntry(slot) }))
      .filter((row) => row.entry);
    const team = occupiedRows.map((row) => row.entry);
    return metaThreats.map((threat) => {
      const pressure = Math.max(...threat.types.map((type) => team.filter((entry) => getTypeEffectiveness(type, entry.types) > 1).length));
      const resistCount = threat.types.reduce((count, type) => count + team.filter((entry) => getTypeEffectiveness(type, entry.types) < 1).length, 0);
      const safeSwitchCount = occupiedRows.filter(({ slot, entry }) => threat.types.every((type) => getEffectiveTypeEffectiveness(type, slot, entry) < 1)).length;
      const offenseReady = attackTypes.some((attackType) => threat.types.some((targetType) => getSingleTypeEffectiveness(attackType, targetType) > 1));
      const speedBenchmark = META_SPEED_BENCHMARKS.find((row) => normalizeNameKey(row.name) === normalizeNameKey(threat.name));
      const threatSpeed = speedBenchmark ? calculateLv50SpeedWithSpread(getRosterEntry(threat.name)?.baseSpeed || 0, speedBenchmark.speedSp, speedBenchmark.nature, speedBenchmark.item) : 0;
      const fasterCount = occupiedRows.filter(({ slot, entry }) => calculateLv50SpeedWithSpread(entry.baseSpeed || 0, slot?.sps?.spe || 0, slot?.nature || "Serious", slot?.item || "") >= threatSpeed).length;
      const speedRisk = threatSpeed > 0 && fasterCount === 0;
      const intimidatePressure = normalizeNameKey(threat.name) === "incineroar"
        ? occupiedRows.filter(({ slot, entry }) => getOffenseProfile(slot, entry) === "physical" && isIntimidateWeak(slot, entry)).length
        : 0;
      const threatPenaltyMultiplier = getLearnedThreatPenaltyMultiplier(threat.name);
      const switchPenalty = safeSwitchCount <= 0 ? 32 : safeSwitchCount === 1 ? 18 : 0;
      const offensePenalty = offenseReady ? 0 : 16;
      const speedPenalty = speedRisk ? 18 : 0;
      const resistRelief = Math.min(resistCount, 3) * 5;
      const threatSeverityScore = (
        pressure * 20
        + switchPenalty
        + speedPenalty
        + intimidatePressure * 12
        + offensePenalty
        - resistRelief
      ) * threatPenaltyMultiplier;
      const matchupScore = clampScore(95 - threatSeverityScore);
      return { threat, pressure, resistCount, safeSwitchCount, offenseReady, fasterCount, speedRisk, intimidatePressure, threatSeverityScore, matchupScore };
    }).sort((a, b) => (b.threatSeverityScore - a.threatSeverityScore) || (b.threat.weight - a.threat.weight));
  }

  async function buildLeadRecommendation(teamState, threatRows) {
    const occupied = teamState
      .map((slot, index) => ({ slot, index, entry: getRosterEntry(slot.name) }))
      .filter((row) => row.entry);
    if (!occupied.length) {
      return [{ names: ["No lead"], score: 0, summary: "Pick at least one Pokemon to score a lead." }];
    }
    const topThreats = threatRows.slice(0, 4).map((row) => row.threat);
    const scoredPairs = [];
    for (let i = 0; i < occupied.length; i += 1) {
      for (let j = i; j < occupied.length; j += 1) {
        const pair = [occupied[i], occupied[j]].filter((value, idx, arr) => arr.findIndex((item) => item.index === value.index) === idx);
        const score = await scoreLeadPair(pair, topThreats);
        scoredPairs.push(score);
      }
    }
    const unique = [];
    scoredPairs
      .sort((a, b) => b.score - a.score)
      .forEach((pair) => {
        const key = pair.names.join("|");
        if (!unique.some((item) => item.names.join("|") === key) && unique.length < 2) unique.push(pair);
      });
    return unique.length ? unique : [{ names: [occupied[0].entry.name], score: 40, summary: "Fallback single lead recommendation." }];
  }

  async function scoreLeadPair(pair, topThreats) {
    const names = pair.map((row) => row.entry.name);
    let score = 42;
    const reasons = [];
    const combinedMoves = pair.flatMap(({ slot }) => slot.moves.map((move) => normalizeNameKey(move)).filter(Boolean));
    const averageRolePrior = pair.length
      ? pair.reduce((sum, { entry }) => sum + getLearnedRolePriorWeight(entry.name), 0) / pair.length
      : 0;
    const learnedMoveBias = combinedMoves.reduce((sum, move) => sum + getLearnedMoveWeight(move), 0);
    const speedAvg = pair.reduce((sum, row) => sum + row.entry.baseSpeed, 0) / pair.length;
    score += Math.min(18, Math.round(speedAvg / 10));
    score += Math.round(averageRolePrior * (getLearnedBuilderData().learnedWeights?.candidateScoreWeights?.rolePrior || 6));
    score += Math.max(-6, Math.min(6, Math.round(learnedMoveBias * (getLearnedBuilderData().learnedWeights?.candidateScoreWeights?.moveWeight || 4))));
    if (combinedMoves.includes("fake out")) {
      score += 12;
      reasons.push("opens games with Fake Out pressure");
    }
    if (combinedMoves.some((move) => ["tailwind", "trick room", "icy wind", "electroweb"].includes(move))) {
      score += 10;
      reasons.push("has speed control");
    }
    if (pair.some(({ slot, entry }) => hasFakeOutCounterplay(slot, entry))) {
      score += 8;
      reasons.push("does not fold easily to opposing Fake Out");
    }
    if (pair.some(({ slot }) => punishesIntimidate(slot))) {
      score += 8;
      reasons.push("punishes Intimidate leads");
    }
    for (const threat of topThreats) {
      const resists = pair.some(({ entry }) => threat.types.some((type) => getTypeEffectiveness(type, entry.types) < 1));
      const threatensBack = await pairThreatensTarget(pair, threat);
      if (resists) score += 4;
      if (threatensBack) score += 6;
    }
    const summary = buildLeadSummary(names, reasons, topThreats);
    return { names, score: clampScore(score), summary };
  }

  function buildLeadSummary(names, reasons, topThreats) {
    if (!reasons.length) {
      return `${names.join(" + ")} is the cleaner generic opener when you want a stable start into the current snapshot.`;
    }
    if (reasons.includes("opens games with Fake Out pressure")) {
      return `${names.join(" + ")} is best when you need immediate tempo with Fake Out and a safer turn-one board.`;
    }
    if (reasons.includes("has speed control")) {
      return `${names.join(" + ")} is the better call when speed control matters more than raw bulk.`;
    }
    if (topThreats.length) {
      return `${names.join(" + ")} is the leaner anti-meta lead when you want better play into ${topThreats.slice(0, 2).map((threat) => threat.name).join(" and ")}.`;
    }
    return `${names.join(" + ")} is the better opener when you want ${reasons.join(", ")}.`;
  }

  async function pairThreatensTarget(pair, threat) {
    for (const { slot, entry } of pair) {
      const selectedMoves = slot.moves.filter(Boolean);
      if (!selectedMoves.length && entry.types.some((type) => threat.types.some((defType) => getSingleTypeEffectiveness(type, defType) > 1))) {
        return true;
      }
      for (const move of selectedMoves) {
        const detail = await getMoveDetail(move);
        const moveType = getEffectiveMoveType(slot, entry, move, detail);
        if (moveType && threat.types.some((defType) => getSingleTypeEffectiveness(moveType, defType) > 1)) {
          return true;
        }
      }
    }
    return false;
  }

  function describeGradeBand(score) {
    if (score >= 90) return "Tournament-ready";
    if (score >= 80) return "Very solid";
    if (score >= 70) return "Strong but patchable";
    if (score >= 60) return "Playable with clear leaks";
    if (score >= 45) return "Shaky";
    return "Needs major work";
  }

  function buildFixList({ weaknessRows, offenseReport, metaPressure, threatRows, itemClause, speciesClause, structureReport }) {
    const fixes = [];
    if (itemClause.duplicates.length) {
      fixes.push(`Fix item clause first by replacing duplicate ${itemClause.duplicates[0].name} copies.`);
    }
    if (speciesClause?.duplicates?.length) {
      fixes.push(`Fix species clause by removing one form from ${speciesClause.duplicates[0].names.join(" + ")}.`);
    }
    if (weaknessRows[0]) {
      fixes.push(`Patch the ${weaknessRows[0].attackType} weakness stack first.`);
    }
    if (offenseReport.uncoveredTypes.length) {
      fixes.push(`Add stronger pressure into ${offenseReport.uncoveredTypes.slice(0, 3).join(", ")}.`);
    }
    if (metaPressure.fakeOut.score < 65) {
      fixes.push("Add better Fake Out counterplay like Ghosts, Protect, Quick Guard, or Covert Cloak.");
    }
    if (metaPressure.intimidate.score < 65) {
      fixes.push("Add stronger Intimidate insurance like Defiant, Competitive, better positioning, or more special pressure.");
    }
    if (structureReport.issues.length) {
      fixes.push(structureReport.issues[0]);
    }
    if (threatRows[0]) {
      fixes.push(`Respect ${threatRows[0].threat.name} more in builder choices and lead planning.`);
    }
    if (!fixes.length) {
      fixes.push("The team is in a healthy spot. Tighten move choices and lead plans rather than rebuilding the core.");
    }
    return fixes.slice(0, 4);
  }

  function buildDockedPointDetails(evaluation) {
    const notes = [];
    if (evaluation.itemClause.duplicates.length) {
      notes.push({
        loss: 100 - evaluation.itemClause.score,
        text: `Item Clause lost points because ${evaluation.itemClause.duplicates.map((item) => `${item.name} appears ${item.count} times`).join(", ")}.`
      });
    }
    if (evaluation.speciesClause?.duplicates?.length) {
      notes.push({
        loss: 100 - evaluation.speciesClause.score,
        text: `Species Clause lost points because ${evaluation.speciesClause.duplicates.map((row) => row.names.join(" + ")).join(", ")} share the same base Pokedex slot.`
      });
    }
    if (evaluation.weaknessRows.length) {
      notes.push({
        loss: 100 - evaluation.defensiveTypeScore,
        text: `Type Defense lost points mostly from ${evaluation.weaknessRows.map((row) => `${row.attackType} (${row.weakCount} weak${row.answerCount ? `, ${row.answerCount} answers` : ""})`).join(", ")}.`
      });
    }
    if (evaluation.offenseReport.uncoveredTypes.length) {
      notes.push({
        loss: 100 - evaluation.offenseReport.score,
        text: `Offense lost points because the team does not pressure ${evaluation.offenseReport.uncoveredTypes.slice(0, 5).join(", ")} hard enough.`
      });
    }
    if (evaluation.metaPressure.fakeOut.score < 75 || evaluation.metaPressure.intimidate.score < 75) {
      notes.push({
        loss: Math.max(100 - evaluation.metaPressure.fakeOut.score, 100 - evaluation.metaPressure.intimidate.score),
        text: `Meta Adaptability lost points from Fake Out (${evaluation.metaPressure.fakeOut.score}/100) and Intimidate (${evaluation.metaPressure.intimidate.score}/100) resilience.`
      });
    }
    if (evaluation.structureReport.issues.length) {
      notes.push({
        loss: 100 - evaluation.structureReport.score,
        text: `Structure lost points because ${evaluation.structureReport.issues.join(" ")}`
      });
    }
    if (evaluation.threatRows[0]) {
      notes.push({
        loss: 100 - evaluation.metaMatchupScore,
        text: `Vs Meta lost points mainly into ${evaluation.threatRows.slice(0, 3).map((row) => `${row.threat.name} (${row.matchupScore}/100)`).join(", ")}.`
      });
    }
    if (!notes.length) {
      return ["The score is coming mostly from balanced team fundamentals."];
    }
    return notes.sort((a, b) => b.loss - a.loss).map((note) => note.text);
  }

  const MATCHUP_BUCKETS = [8, 4, 2, 1, 0.5, 0.25, 0.125, 0];
  const OFFENSE_MATCHUP_BUCKETS = [2, 1, 0.5, 0];

  function normalizeEffectivenessBucket(value, buckets = MATCHUP_BUCKETS) {
    const rounded = value == null ? 1 : Number(value);
    const bucket = buckets.find((candidate) => Math.abs(candidate - rounded) < 0.001);
    return bucket ?? 1;
  }

  function canonicalizeTypeName(typeName) {
    if (!typeName) return "";
    return TYPE_NAME_LOOKUP[normalizeNameKey(typeName)] || String(typeName).trim();
  }

  function getDefensiveSingleTypeEffectiveness(attackType, defenderType) {
    const canonicalAttackType = canonicalizeTypeName(attackType);
    const canonicalDefenderType = canonicalizeTypeName(defenderType);
    const profile = DEFENSE_TYPE_PROFILE[canonicalDefenderType];
    if (!profile) return getSingleTypeEffectiveness(attackType, defenderType);
    if ((profile.immune || []).includes(canonicalAttackType)) return 0;
    if ((profile.weak || []).includes(canonicalAttackType)) return 2;
    if ((profile.resist || []).includes(canonicalAttackType)) return 0.5;
    return 1;
  }

  function getDefensiveTypeEffectiveness(attackType, defenderTypes) {
    return defenderTypes.reduce((total, defenderType) => total * getDefensiveSingleTypeEffectiveness(attackType, defenderType), 1);
  }

  function getMatchupCellClass(bucket, invert = false) {
    if (!invert) {
      if (bucket >= 2) return "type-chart__cell--weak";
      if (bucket === 0) return "type-chart__cell--immune";
      if (bucket < 1) return "type-chart__cell--resist";
      return "type-chart__cell--neutral";
    }
    if (bucket >= 2) return "type-chart__cell--resist";
    if (bucket === 0) return "type-chart__cell--immune";
    if (bucket < 1) return "type-chart__cell--weak";
    return "type-chart__cell--neutral";
  }

  function buildMatchupCountTableMarkup(titleLabel, rows, buckets = MATCHUP_BUCKETS, invert = false) {
    const head = buckets.map((bucket) => `<th>${bucket}</th>`).join("");
    const body = rows.map((row) => `
      <tr>
        <th><span class="type-label-chip" style="background:${getTypeColor(row.type)}">${escapeHtml(row.type)}</span></th>
        ${buckets.map((bucket) => `<td class="type-chart__cell ${getMatchupCellClass(bucket, invert)}">${row.counts[bucket] || ""}</td>`).join("")}
      </tr>
    `).join("");
    return `
      <div class="type-chart-wrap">
        <table class="type-chart type-chart--counts">
          <thead>
            <tr>
              <th>${titleLabel}</th>
              ${head}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  function buildSimpleDefenseMatchupTableMarkup(rows) {
    const body = rows.map((row) => `
      <tr>
        <th><span class="type-label-chip" style="background:${getTypeColor(row.type)}">${escapeHtml(row.type)}</span></th>
        <td class="type-chart__cell type-chart__cell--weak">${row.counts.weak || ""}</td>
        <td class="type-chart__cell type-chart__cell--resist">${row.counts.resist || ""}</td>
        <td class="type-chart__cell type-chart__cell--immune">${row.counts.immune || ""}</td>
      </tr>
    `).join("");
    return `
      <div class="type-chart-wrap">
        <table class="type-chart type-chart--counts">
          <thead>
            <tr>
              <th>Attack</th>
              <th>&gt;= 2</th>
              <th>&lt;= 0.5</th>
              <th>0</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  function getChartEntryForSlot(slot) {
    if (!slot?.name) return null;
    const baseEntry = getRosterEntry(slot.name) || legalPokemonData[slot.name] || null;
    if (!baseEntry) return null;
    const megaEntry = getMegaEntryForItem(slot.item || "", baseEntry.name || slot.name);
    const resolved = megaEntry || baseEntry;
    return {
      ...resolved,
      types: (resolved.types || []).map((type) => canonicalizeTypeName(type)).filter(Boolean)
    };
  }

  function getOccupiedChartSlots(teamState) {
    return (teamState || [])
      .filter((slot) => slot?.name)
      .map((slot) => ({ slot, entry: getChartEntryForSlot(slot) }))
      .filter((row) => row.entry && Array.isArray(row.entry.types) && row.entry.types.length);
  }

  function getDefenseChartEffectiveness(attackType, slot, entry) {
    const canonicalAttackType = canonicalizeTypeName(attackType);
    const defenseTypes = (entry.types || []).map((type) => canonicalizeTypeName(type)).filter(Boolean);
    let effect = getDefensiveTypeEffectiveness(canonicalAttackType, defenseTypes);
    const ability = normalizeNameKey(slot?.ability || "");
    const modifierTable = DEFENSIVE_ABILITY_TYPE_MODIFIERS[ability];
    if (modifierTable && Object.prototype.hasOwnProperty.call(modifierTable, canonicalAttackType)) {
      effect *= modifierTable[canonicalAttackType];
    }
    if (ability === "wonder guard" && effect <= 1) effect = 0;
    if (PKMN_HELP_REDUCER_ABILITIES.has(ability) && effect > 1) effect *= 0.75;
    if (ability === "tera shell" && effect > 0) effect = 0.5;
    return effect;
  }

  function buildTeamTypeChartMarkup(teamState) {
    const occupied = getOccupiedChartSlots(teamState);
    if (!occupied.length) {
      return `<p class="placeholder">Add at least one Pokemon to see the live defense matchup counts.</p>`;
    }
    const rows = TYPE_ORDER.map((attackType) => {
      const counts = { weak: 0, resist: 0, immune: 0 };
      occupied.forEach(({ slot, entry }) => {
        const effect = getDefenseChartEffectiveness(attackType, slot, entry);
        if (effect === 0) {
          counts.immune += 1;
        } else if (effect <= 0.5) {
          counts.resist += 1;
        } else if (effect >= 2) {
          counts.weak += 1;
        }
      });
      return { type: attackType, counts };
    });
    return buildSimpleDefenseMatchupTableMarkup(rows);
  }

  async function buildTeamOffenseTypeChartMarkup(teamState) {
    const occupied = getOccupiedChartSlots(teamState);
    if (!occupied.length) {
      return `<p class="placeholder">Add at least one Pokemon to see the live offense matchup counts.</p>`;
    }
    const rows = [];
    for (const defenderType of TYPE_ORDER) {
      const counts = Object.fromEntries(OFFENSE_MATCHUP_BUCKETS.map((bucket) => [bucket, 0]));
      for (const { slot, entry } of occupied) {
        let best = 0;
        const moveNames = (slot.moves || []).filter(Boolean);
        let foundDamagingMove = false;
        if (moveNames.length) {
          for (const moveName of moveNames) {
            const detail = await getMoveDetail(moveName);
            if (detail?.damage_class?.name === "status") continue;
            const moveType = getEffectiveMoveType(slot, entry, moveName, detail);
            if (!moveType) continue;
            foundDamagingMove = true;
            best = Math.max(best, getSingleTypeEffectiveness(moveType, defenderType));
          }
        }
        if (!foundDamagingMove) {
          for (const stab of entry.types) {
            best = Math.max(best, getSingleTypeEffectiveness(stab, defenderType));
          }
        }
        const bucket = normalizeEffectivenessBucket(best || 1, OFFENSE_MATCHUP_BUCKETS);
        counts[bucket] += 1;
      }
      rows.push({ type: defenderType, counts });
    }
    return buildMatchupCountTableMarkup("Defender", rows, OFFENSE_MATCHUP_BUCKETS, true);
  }

  function evaluateTeamStructure(teamState) {
    const occupied = teamState
      .filter((slot) => slot.name)
      .map((slot) => ({ slot, entry: getRosterEntry(slot.name) }))
      .filter((row) => row.entry);
    if (!occupied.length) {
      return {
        score: 0,
        physicalCount: 0,
        specialCount: 0,
        fastCount: 0,
        slowCount: 0,
        speedControlCount: 0,
        trickRoomCount: 0,
        summary: "No structure data yet.",
        issues: []
      };
    }
    let physicalCount = 0;
    let specialCount = 0;
    let fastCount = 0;
    let slowCount = 0;
    let speedControlCount = 0;
    let trickRoomCount = 0;
    let fakeOutCount = 0;
    occupied.forEach(({ slot, entry }) => {
      const profile = getOffenseProfile(slot, entry);
      if (profile === "physical") physicalCount += 1;
      if (profile === "special") specialCount += 1;
      if (entry.baseSpeed >= 100) fastCount += 1;
      if (entry.baseSpeed <= 65) slowCount += 1;
      const moveKeys = slot.moves.map((move) => normalizeNameKey(move)).filter(Boolean);
      if (moveKeys.some((move) => ["tailwind", "icy wind", "electroweb", "thunder wave", "bulldoze"].includes(move))) speedControlCount += 1;
      if (moveKeys.includes("trick room")) trickRoomCount += 1;
      if (moveKeys.includes("fake out")) fakeOutCount += 1;
    });
    const issues = [];
    if (Math.abs(physicalCount - specialCount) >= 3) {
      issues.push(`Rebalance offense. You're too skewed ${physicalCount > specialCount ? "physical" : "special"} right now.`);
    }
    if (!speedControlCount) {
      issues.push("Add real speed control like Tailwind, Icy Wind, Electroweb, or Thunder Wave.");
    }
    if (fastCount < 2) {
      issues.push("Add more fast pressure so you are not forced to play every game from behind.");
    }
    if (!trickRoomCount && slowCount < 2) {
      issues.push("Add more speed control - Tailwind, Icy Wind, Electroweb, or a Trick Room mode if the team is built slow.");
    }
    if (!fakeOutCount) {
      issues.push("Consider adding Fake Out or stronger anti-lead tools to improve openings.");
    }
    const mixPenalty = Math.abs(physicalCount - specialCount) * 8;
    const fastPenalty = fastCount >= 2 ? 0 : (2 - fastCount) * 10;
    const slowPenalty = ((trickRoomCount >= 1 && slowCount >= 2) || slowCount >= 3) ? 0 : 10;
    const speedPenalty = speedControlCount ? 0 : 16;
    const fakeOutPenalty = fakeOutCount ? 0 : 4;
    const score = clampScore(100 - mixPenalty - fastPenalty - slowPenalty - speedPenalty - fakeOutPenalty);
    const summary = issues.length
      ? `Structure is ${describeGradeBand(score).toLowerCase()}. ${issues.slice(0, 2).join(" ")}`
      : "The team has a healthy physical-special mix, enough speed pressure, and a backup slow mode.";
    return { score, physicalCount, specialCount, fastCount, slowCount, speedControlCount, trickRoomCount, summary, issues };
  }

  function getOffenseProfile(slot, entry) {
    const moveKeys = slot.moves.map((move) => normalizeNameKey(move)).filter(Boolean);
    const physicalHits = moveKeys.filter((move) => isLikelyPhysicalMove(move)).length;
    const specialHits = moveKeys.filter((move) => isLikelySpecialMove(move)).length;
    if (physicalHits > specialHits) return "physical";
    if (specialHits > physicalHits) return "special";
    return entry.baseStats[1] >= entry.baseStats[3] ? "physical" : "special";
  }

  function isLikelyPhysicalMove(moveKey) {
    return ["punch", "kick", "edge", "slide", "quake", "jab", "claw", "crash", "fang", "slam", "head", "blade", "combat", "drill", "rush", "smash", "sneak", "tackle", "charge", "press", "out"].some((fragment) => moveKey.includes(fragment));
  }

  function isLikelySpecialMove(moveKey) {
    return ["beam", "bolt", "blast", "wave", "pulse", "ball", "gleam", "storm", "voice", "meteor", "song", "wind", "hex", "flame", "fire", "water", "leaf storm", "draco", "psychic", "moonblast", "blizzard", "thunder", "heat"].some((fragment) => moveKey.includes(fragment));
  }

  function evaluateItemClause(teamState) {
    const counts = new Map();
    teamState.forEach((slot) => {
      const item = (slot.item || "").trim();
      if (!item) return;
      const key = normalizeNameKey(item);
      const current = counts.get(key) || { name: item, count: 0 };
      current.count += 1;
      counts.set(key, current);
    });
    const duplicates = [...counts.values()].filter((row) => row.count > 1);
    const duplicateCopies = duplicates.reduce((sum, row) => sum + (row.count - 1), 0);
    const score = clampScore(100 - duplicateCopies * 30);
    const summary = duplicates.length
      ? `Item clause is currently broken. Replace duplicate copies of ${duplicates.map((row) => row.name).join(", ")}.`
      : "Item clause is clean. Every filled slot has a unique item or no item.";
    return { duplicates, score, summary };
  }

  function evaluateSpeciesClause(teamState) {
    const counts = new Map();
    teamState.forEach((slot) => {
      if (!slot.name) return;
      const key = getSpeciesClauseKey(slot.name);
      if (!key) return;
      const current = counts.get(key) || { key, names: [], count: 0 };
      current.count += 1;
      current.names.push(slot.name);
      counts.set(key, current);
    });
    const duplicates = [...counts.values()].filter((row) => row.count > 1);
    const duplicateCopies = duplicates.reduce((sum, row) => sum + (row.count - 1), 0);
    const score = clampScore(100 - duplicateCopies * 40);
    const summary = duplicates.length
      ? `Species clause is currently broken. Forms sharing the same Pokedex slot cannot coexist: ${duplicates.map((row) => row.names.join(" + ")).join("; ")}.`
      : "Species clause is clean. No base species or regional-form duplicates are present.";
    return { duplicates, score, summary };
  }

  function countMegasInEntries(entries = []) {
    return entries.filter((entry) => entry && isMegaEntry(entry)).length;
  }

  function countMegasInSets(teamSets = []) {
    return teamSets.filter((set) => isMegaEntry(resolveBattleEntry(set))).length;
  }

  function hasMoveOnTeam(teamSets, moveName) {
    const key = normalizeNameKey(moveName);
    return teamSets.some((set) => (set.moves || []).some((move) => normalizeNameKey(move) === key));
  }

  function normalizeWeatherForField(weather) {
    if (weather === "rain") return "Rain";
    if (weather === "sun") return "Sun";
    if (weather === "sand") return "Sand";
    if (weather === "snow") return "Snow";
    return "";
  }

  function isPromptRequiredEntry(entry, context) {
    const requiredNames = new Set((context.promptLocks?.requiredPokemon || []).map((name) => normalizeNameKey(name)));
    return requiredNames.has(normalizeNameKey(entry?.name || ""))
      || requiredNames.has(normalizeNameKey(entry?.baseName || ""));
  }

  function buildArchetypePlan(request, focus, notes) {
    const intent = request.intentLock || "unknown";
    const normalized = `${focus || ""} ${notes || ""}`.toLowerCase();
    const plans = {
      hard_tr: {
        winCondition: "Set Trick Room, protect positioning, then win through slow breakers.",
        earlyPriority: ["tr_setter", "tr_abuser", "tr_abuser"],
        minCounts: { tr_setter: 1, tr_abuser: 3, support: 1, attacker: 3 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      soft_tr: {
        winCondition: "Keep Trick Room as a flexible secondary mode around mid-speed pressure.",
        earlyPriority: ["tr_setter", "tr_abuser", "attacker"],
        minCounts: { tr_setter: 1, tr_abuser: 2, support: 1, attacker: 3 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      tailwind: {
        winCondition: "Create tempo through Tailwind and cash it in with fast pressure.",
        earlyPriority: ["tailwind_setter", "attacker", "attacker"],
        minCounts: { tailwind_setter: 1, attacker: 3, support: 1, speed_control: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      fast_offense: {
        winCondition: "Pressure immediately with fast attackers and minimal downtime.",
        earlyPriority: ["attacker", "attacker", "attacker"],
        minCounts: { attacker: 4, support: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      bulky_offense: {
        winCondition: "Trade efficiently with sturdy attackers plus just enough support.",
        earlyPriority: ["attacker", "attacker", "support"],
        minCounts: { attacker: 3, support: 1, pivot: 1 },
        nicheMegas: ["mega audino"]
      },
      balance: {
        winCondition: "Maintain broad matchup coverage with offense, pivots, and speed options.",
        earlyPriority: ["attacker", "support", "pivot"],
        minCounts: { attacker: 2, support: 1, pivot: 1, speed_control: 1 },
        nicheMegas: ["mega ampharos", "mega audino"]
      },
      rain: {
        winCondition: "Establish rain and convert it into tempo and heavy Water pressure.",
        earlyPriority: ["weather_setter", "weather_abuser", "attacker"],
        minCounts: { weather_setter: 1, weather_abuser: 2, attacker: 3, support: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      sun: {
        winCondition: "Establish sun and leverage weather-powered offense or tempo.",
        earlyPriority: ["weather_setter", "weather_abuser", "attacker"],
        minCounts: { weather_setter: 1, weather_abuser: 2, attacker: 3, support: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      sand: {
        winCondition: "Use sand turns for chip, durable offense, and sand-aligned closers.",
        earlyPriority: ["weather_setter", "weather_abuser", "attacker"],
        minCounts: { weather_setter: 1, weather_abuser: 2, attacker: 3, support: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      snow: {
        winCondition: "Use snow for positioning and durable pressure without weather conflict.",
        earlyPriority: ["weather_setter", "weather_abuser", "attacker"],
        minCounts: { weather_setter: 1, weather_abuser: 2, attacker: 3, support: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      anti_meta: {
        winCondition: "Bring a real offensive shell that also punishes top meta threats.",
        earlyPriority: ["attacker", "anti_meta_tech", "support"],
        minCounts: { attacker: 3, support: 1, anti_meta_tech: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      },
      unknown: {
        winCondition: "Keep a coherent offensive plan with enough support to position it.",
        earlyPriority: ["attacker", "support", "attacker"],
        minCounts: { attacker: 2, support: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      }
    };
    if (/\bhyper offense\b/.test(normalized)) {
      return {
        winCondition: "Overwhelm from turn one with immediate offensive pressure and minimal passivity.",
        earlyPriority: ["attacker", "attacker", "attacker"],
        minCounts: { attacker: 4, support: 1 },
        nicheMegas: ["mega audino", "mega ampharos"]
      };
    }
    return plans[intent] || plans.unknown;
  }

  function buildGuidedBuildContext(request, focus, notes, enemyNames, desiredTypes, pool, anchor) {
    const requiredEntries = [...new Map((request.promptLocks?.requiredPokemon || [])
      .map((name) => getRosterEntry(name))
      .filter(Boolean)
      .map((entry) => [normalizeNameKey(entry.name), entry])).values()];
    const teamPlan = buildArchetypePlan(request, focus, notes);
    return {
      request,
      mode: request.mode,
      focus,
      notes,
      enemyNames,
      desiredTypes,
      pool,
      anchor,
      intentLock: request.intentLock || "unknown",
      promptLocks: {
        ...(request.promptLocks || {}),
        enemyNames
      },
      teamPlan,
      requiredEntries,
      targetScore: GUIDED_BUILD_TARGET_SCORE,
      goalScore: GUIDED_BUILD_GOAL_SCORE
    };
  }

  async function getThreatBenchmarkSet(entry) {
    if (!entry) return null;
    const cacheKey = normalizeNameKey(entry.name);
    if (guidedThreatSetCache.has(cacheKey)) return cloneDraftSet(guidedThreatSetCache.get(cacheKey));
    const metaSeed = META_MOVESET_SEED[entry.name];
    let set;
    if (metaSeed) {
      const spread = defaultSpSpreadForEntry(entry);
      if (typeof metaSeed.speedSp === "number") spread.spe = metaSeed.speedSp;
      set = {
        name: entry.name,
        item: metaSeed.item || "",
        ability: metaSeed.ability || entry.abilities?.[0] || "",
        nature: metaSeed.nature || "Serious",
        sps: spread,
        moves: (metaSeed.moves || []).slice(0, 4)
      };
    } else {
      set = await getOptimizedDraftSetCached(entry, {
        mode: "counter",
        focus: entry.name,
        notes: "guided live benchmark",
        enemyNames: [],
        chosen: [entry],
        currentDraft: [],
        buildCounter: 0,
        requestedModes: {},
        requestedPressure: {}
      });
    }
    guidedThreatSetCache.set(cacheKey, cloneDraftSet(set));
    return cloneDraftSet(set);
  }

  function inferLiveFieldState(teamSets, context) {
    const weatherProfile = inferTeamWeatherProfile(teamSets);
    const forcedWeather = context.promptLocks?.weather || weatherProfile.modes[0] || "";
    return {
      weather: normalizeWeatherForField(forcedWeather),
      terrain: ""
    };
  }

  async function evaluateLiveCalcBenchmarks(teamSets, context, slotIndex, threatRows = []) {
    const occupiedSets = teamSets.filter((set) => set.name);
    if (!occupiedSets.length) return { score: 0, rows: [], warnings: ["No live calc data yet."] };
    const benchmarkNames = context.enemyNames?.length
      ? context.enemyNames.slice(0, Math.min(3, 1 + Math.floor(slotIndex / 2)))
      : threatRows.slice(0, Math.min(3, 1 + Math.floor(slotIndex / 2))).map((row) => row.threat.name);
    const fieldState = inferLiveFieldState(occupiedSets, context);
    const rows = [];
    for (const threatName of [...new Set(benchmarkNames)].filter(Boolean)) {
      const threatEntry = getRosterEntry(threatName);
      const threatSet = await getThreatBenchmarkSet(threatEntry);
      if (!threatEntry || !threatSet) continue;
      const threatState = buildSimulatedStateFromSet(threatSet);
      let bestResponse = { maxPercent: 0, attacker: "", move: "", source: "" };
      let bestIncoming = { maxPercent: 0, target: "", move: "", source: "" };
      for (const set of occupiedSets) {
        const attackerEntry = resolveBattleEntry(set);
        const attackerState = buildSimulatedStateFromSet(set);
        for (const move of (set.moves || []).filter(Boolean)) {
          const estimate = await calculateLiveDamageBenchmark(attackerEntry, threatEntry, move, attackerState, threatState, fieldState);
          if (estimate?.maxPercent > bestResponse.maxPercent) {
            bestResponse = { maxPercent: estimate.maxPercent, attacker: attackerEntry.name, move, source: estimate.source };
          }
        }
        for (const move of (threatSet.moves || []).filter(Boolean)) {
          const estimate = await calculateLiveDamageBenchmark(threatEntry, attackerEntry, move, threatState, attackerState, fieldState);
          if (estimate?.maxPercent > bestIncoming.maxPercent) {
            bestIncoming = { maxPercent: estimate.maxPercent, target: attackerEntry.name, move, source: estimate.source };
          }
        }
      }
      const threatScore = clampScore(
        42
        + (bestResponse.maxPercent >= 90 ? 28 : bestResponse.maxPercent >= 65 ? 18 : bestResponse.maxPercent >= 40 ? 8 : -10)
        + (bestIncoming.maxPercent <= 70 ? 20 : bestIncoming.maxPercent <= 90 ? 10 : bestIncoming.maxPercent <= 110 ? 0 : -12)
      );
      rows.push({
        threat: threatEntry.name,
        score: threatScore,
        response: bestResponse,
        incoming: bestIncoming
      });
    }
    const warnings = rows
      .filter((row) => row.score < 55)
      .map((row) => `Live calc still looks shaky into ${row.threat}.`);
    return {
      score: rows.length ? clampScore(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 50,
      rows,
      warnings
    };
  }

  function computeLiveSpeedControlScore(teamSets, context, structureReport, slotIndex) {
    const fastCount = structureReport.fastCount || 0;
    const slowCount = structureReport.slowCount || 0;
    let score = 42 + (structureReport.speedControlCount || 0) * 18 + fastCount * 7;
    if (context.intentLock === "tailwind" && !hasMoveOnTeam(teamSets, "Tailwind")) score -= 34;
    if (context.intentLock === "hard_tr" && !hasMoveOnTeam(teamSets, "Trick Room")) score -= 42;
    if (context.intentLock === "soft_tr" && !hasMoveOnTeam(teamSets, "Trick Room") && slotIndex >= 2) score -= 24;
    if (["tailwind", "fast_offense", "rain", "sun"].includes(context.intentLock) && slowCount >= 3) score -= 20;
    if (context.intentLock === "hard_tr" && slowCount < 2) score -= 22;
    return clampScore(score);
  }

  function computePromptAdherenceScore(teamSets, context, slotIndex) {
    const megaCount = countMegasInSets(teamSets);
    const averageSpeed = teamSets.length
      ? teamSets.reduce((sum, set) => sum + (resolveBattleEntry(set)?.baseSpeed || 0), 0) / teamSets.length
      : 0;
    let score = 70;
    const requiredNames = new Set((context.promptLocks?.requiredPokemon || []).map((name) => normalizeNameKey(name)));
    const presentNames = new Set(teamSets.flatMap((set) => {
      const entry = getRosterEntry(set.name || "");
      return [normalizeNameKey(set.name || ""), normalizeNameKey(entry?.baseName || "")].filter(Boolean);
    }));
    requiredNames.forEach((name) => {
      if (!presentNames.has(name)) score -= slotIndex >= 2 ? 28 : 12;
    });
    if (context.promptLocks?.tailwind && !hasMoveOnTeam(teamSets, "Tailwind") && slotIndex >= 1) score -= 22;
    if (context.promptLocks?.trickRoom && !hasMoveOnTeam(teamSets, "Trick Room") && slotIndex >= 1) score -= 24;
    if (!context.promptLocks?.trickRoom && hasMoveOnTeam(teamSets, "Trick Room")) score -= 36;
    if (context.promptLocks?.weather) {
      const weatherModes = inferTeamWeatherProfile(teamSets).modes;
      if (!weatherModes.includes(context.promptLocks.weather) && slotIndex >= 1) score -= 20;
    }
    if (context.promptLocks?.noMegas && megaCount > 0) score = 0;
    if (!context.promptLocks?.noMegas && slotIndex >= 4 && megaCount < (context.promptLocks?.megaTargetMin || 0)) score -= 26;
    if (context.intentLock === "fast_offense" && averageSpeed < 90) score -= 18;
    if (context.intentLock === "hard_tr" && averageSpeed > 75 && slotIndex >= 2) score -= 24;
    if (context.intentLock === "tailwind" && averageSpeed < 80 && slotIndex >= 2) score -= 14;
    return clampScore(score);
  }

  async function evaluateLiveTeamState(teamSets, context, slotIndex) {
    const paddedTeam = padTeamState(teamSets);
    const evaluation = await evaluateTeamState(paddedTeam);
    const competitiveValidation = buildCompetitiveDraftValidation(teamSets, context);
    const calcBenchmarks = await evaluateLiveCalcBenchmarks(teamSets, context, slotIndex, evaluation.threatRows);
    const speedControl = computeLiveSpeedControlScore(teamSets, context, evaluation.structureReport, slotIndex);
    const megaCount = countMegasInSets(teamSets);
    const megaPlanScore = clampScore(
      context.promptLocks?.noMegas
        ? (megaCount === 0 ? 100 : 0)
        : (slotIndex >= 4 && megaCount < (context.promptLocks?.megaTargetMin || 0))
          ? 34
          : megaCount <= (context.promptLocks?.megaTargetMax || DEFAULT_MAX_MEGAS)
            ? 82 + Math.min(18, megaCount * 8)
            : 10
    );
    const promptAdherence = computePromptAdherenceScore(teamSets, context, slotIndex);
    const threatCoverage = clampScore(100 - (evaluation.threatRows.slice(0, 4).reduce((sum, row) => sum + (100 - row.matchupScore), 0) / Math.max(1, evaluation.threatRows.slice(0, 4).length)));
    const metaAdaptability = clampScore((evaluation.metaPressure.fakeOut.score + evaluation.metaPressure.intimidate.score + speedControl) / 3);
    const phase = slotIndex <= 1 ? "early" : slotIndex <= 3 ? "mid" : "late";
    const rawGuidedScore = Math.round(
      phase === "early"
        ? evaluation.structureReport.score * 0.18 + evaluation.offenseReport.score * 0.14 + threatCoverage * 0.12 + speedControl * 0.16 + calcBenchmarks.score * 0.12 + promptAdherence * 0.20 + megaPlanScore * 0.08
        : phase === "mid"
          ? evaluation.defensiveTypeScore * 0.14 + evaluation.offenseReport.score * 0.14 + evaluation.metaMatchupScore * 0.14 + threatCoverage * 0.14 + calcBenchmarks.score * 0.16 + speedControl * 0.10 + promptAdherence * 0.12 + megaPlanScore * 0.06
          : evaluation.overallScore * 0.24 + evaluation.metaMatchupScore * 0.14 + threatCoverage * 0.14 + calcBenchmarks.score * 0.16 + metaAdaptability * 0.10 + speedControl * 0.08 + promptAdherence * 0.10 + megaPlanScore * 0.04
    );
    const guidedScore = clampScore(rawGuidedScore - competitiveValidation.penalty);
    const warnings = [
      ...calcBenchmarks.warnings,
      ...evaluation.weaknessRows.filter((row) => LIVE_PRESSURE_TYPES.includes(row.attackType) && row.weakCount >= 2).map((row) => `${row.attackType} pressure is still stacked.`),
      ...competitiveValidation.violations.map((row) => row.text)
    ];
    if (!context.promptLocks?.noMegas && slotIndex >= 4 && megaCount < (context.promptLocks?.megaTargetMin || 0)) warnings.push("Mega slot still missing.");
    if (!context.promptLocks?.trickRoom && hasMoveOnTeam(teamSets, "Trick Room")) warnings.push("Trick Room drift detected.");
    return {
      overall: evaluation.overallScore,
      typeDefense: evaluation.defensiveTypeScore,
      offense: evaluation.offenseReport.score,
      structure: evaluation.structureReport.score,
      vsMeta: evaluation.metaMatchupScore,
      metaAdaptability,
      threatCoverage,
      speedControl,
      megaCount,
      calcBenchmarks,
      promptAdherence,
      megaPlanScore,
      competitiveValidation,
      guidedScore,
      warnings,
      evaluation
    };
  }

  async function scoreGuidedCandidateFit(entry, legalMoves, partialEntries, context, slotIndex) {
    let score = 0;
    const rules = getCompetitiveBuildRules(context);
    const teamPlan = context.teamPlan || buildArchetypePlan(context.request || {}, context.focus, context.notes);
    const partialWeatherModes = [...new Set(partialEntries.map((picked) => getWeatherSetterMode(picked)).filter(Boolean))];
    const moveDupCounts = new Map();
    (context.currentDraftSnapshot || []).forEach((set) => {
      getSetMoveKeys(set).forEach((move) => moveDupCounts.set(move, (moveDupCounts.get(move) || 0) + 1));
    });
    const roleCounts = countDraftPlanRoles(context.currentDraftSnapshot || [], context);
    const candidateRoles = await inferEntryRoleTags(entry, legalMoves, context);
    const missingEarlyRole = (teamPlan.earlyPriority || []).find((role) => (roleCounts[role] || 0) <= 0);
    if (isPromptRequiredEntry(entry, context)) score += 60;
    if (context.promptLocks?.specificMega && normalizeNameKey(entry.name) === normalizeNameKey(context.promptLocks.specificMega)) score += 45;
    if (context.promptLocks?.noMegas && isMegaEntry(entry)) return -999;
    if (isMegaEntry(entry) && countMegasInEntries(partialEntries) >= (context.promptLocks?.megaTargetMax || DEFAULT_MAX_MEGAS)) return -999;
    if (!context.promptLocks?.trickRoom && hasAnyLegalMove(legalMoves, ["trick room"]) && entry.baseSpeed <= 65 && ["tailwind", "fast_offense", "rain", "sun", "anti_meta"].includes(context.intentLock)) return -999;
    const candidateWeather = getWeatherSetterMode(entry);
    if (partialWeatherModes.length && candidateWeather && !partialWeatherModes.includes(candidateWeather)) return -999;
    if (context.intentLock === "hard_tr") {
      if (entry.baseSpeed <= 65) score += 24;
      if (hasAnyLegalMove(legalMoves, ["trick room"])) score += 26;
      if (entry.baseSpeed >= 100) score -= 34;
      if (isSupportEntry(entry)) score -= 10;
    }
    if (context.intentLock === "soft_tr") {
      if (hasAnyLegalMove(legalMoves, ["trick room"])) score += 24;
      if (entry.baseSpeed <= 75) score += 10;
      if (entry.baseSpeed >= 115) score -= 12;
    }
    if (context.intentLock === "tailwind") {
      if (hasAnyLegalMove(legalMoves, ["tailwind", "icy wind", "electroweb"])) score += 20;
      if (entry.baseSpeed >= 95) score += 16;
      if (entry.baseSpeed <= 55) score -= 28;
    }
    if (context.intentLock === "fast_offense") {
      if (entry.baseSpeed >= 100) score += 18;
      if (entry.baseSpeed <= 60) score -= 22;
      if (isSupportEntry(entry)) score -= 16;
    }
    if (context.intentLock === "bulky_offense") {
      if ((entry.baseStats[0] || 0) + (entry.baseStats[2] || 0) + (entry.baseStats[4] || 0) >= 260) score += 12;
      if (Math.max(entry.baseStats[1] || 0, entry.baseStats[3] || 0) >= 115) score += 10;
    }
    if (context.intentLock === "balance") {
      if (entry.baseSpeed >= 70 && entry.baseSpeed <= 110) score += 10;
      if (hasAnyLegalMove(legalMoves, ["protect", "tailwind", "fake out", "parting shot", "icy wind", "electroweb"])) score += 12;
    }
    if (context.intentLock === "anti_meta") {
      score += scoreMetaKillPressure(entry);
      if (hasAnyLegalMove(legalMoves, ["fake out", "protect", "taunt", "parting shot"])) score += 10;
    }
    if (["rain", "sun", "sand", "snow"].includes(context.intentLock)) {
      const weatherMode = getWeatherSetterMode(entry);
      if (weatherMode === context.intentLock) score += 30;
      if (weatherMode && weatherMode !== context.intentLock) return -999;
      score += scoreWeatherArchetypeFit(entry, partialEntries);
      if (context.intentLock === "rain" && (entry.types.includes("Water") || entry.types.includes("Electric"))) score += 12;
      if (context.intentLock === "sun" && (entry.types.includes("Fire") || entry.types.includes("Grass"))) score += 12;
      if (context.intentLock === "sand" && (entry.types.includes("Rock") || entry.types.includes("Ground") || entry.types.includes("Steel"))) score += 12;
      if (context.intentLock === "snow" && (entry.types.includes("Ice") || hasAnyAbility(entry.abilities || [], ["snow warning"]))) score += 12;
    }
    if (!context.promptLocks?.noMegas && isMegaEntry(entry)) {
      score += slotIndex >= 4 && countMegasInEntries(partialEntries) === 0 ? 28 : 12;
    }
    if (!context.promptLocks?.noMegas && !isMegaEntry(entry) && slotIndex >= 4 && countMegasInEntries(partialEntries) === 0) {
      score -= 16;
    }
    if (slotIndex <= 2 && missingEarlyRole) {
      if (candidateRoles.has(missingEarlyRole)) score += 26;
      else if (!candidateRoles.has("attacker") && !candidateRoles.has("weather_setter")) score -= 18;
    }
    Object.entries(teamPlan.minCounts || {}).forEach(([role, target]) => {
      const current = roleCounts[role] || 0;
      if (current < target && candidateRoles.has(role)) score += role === "attacker" ? 18 : 14;
      if (current >= target && role === "support" && candidateRoles.has("support") && !candidateRoles.has("attacker")) score -= 8;
    });
    if ((teamPlan.nicheMegas || []).includes(normalizeNameKey(entry.name)) && !isPromptRequiredEntry(entry, context)) {
      score -= slotIndex <= 2 ? 24 : 14;
    }
    if (rules.intent === "hard_tr") {
      if (isMeaningfulTrSupportSet({ name: entry.name, moves: legalMoves })) score += 18;
      if (entry.baseSpeed >= 95 && !isPromptRequiredEntry(entry, context)) score -= 30;
      if (hasAnyLegalMove(legalMoves, ["tailwind", "icy wind", "electroweb", "thunder wave"])) score -= 22;
    }
    if (rules.isTrickRoom && hasAnyLegalMove(legalMoves, ["trick room"]) && partialEntries.filter((picked) => {
      const cached = legalMovesForEntryCache.get(normalizeNameKey(picked.name)) || [];
      return hasAnyLegalMove(cached, ["trick room"]);
    }).length >= rules.maxTrSetters) return -999;
    if (rules.isTrickRoom && isSupportEntry(entry) && !isRealTrAbuserEntry(entry) && partialEntries.filter((picked) => isSupportEntry(picked)).length >= rules.maxSupport) score -= 20;
    if (rules.hyperOffense && isSupportEntry(entry) && !isMegaEntry(entry)) score -= 22;
    if (rules.isTrickRoom && isRealTrAbuserEntry(entry)) score += 20;
    if (isRealAttackerEntry(entry)) score += rules.hyperOffense ? 18 : 8;
    ["icy wind", "electroweb", "thunder wave", "tailwind", "trick room"].forEach((moveKey) => {
      if (hasAnyLegalMove(legalMoves, [moveKey]) && (moveDupCounts.get(moveKey) || 0) > 0) {
        score -= moveKey === "trick room" ? 26 : 12;
      }
    });
    return score;
  }

  async function isCandidateAllowedForPrompt(entry, partialEntries, context, slotIndex) {
    const rules = getCompetitiveBuildRules(context);
    if (partialEntries.some((picked) => normalizeNameKey(picked.name) === normalizeNameKey(entry.name))) return false;
    if (violatesSpeciesClause(partialEntries, entry)) return false;
    if (context.promptLocks?.noMegas && isMegaEntry(entry)) return false;
    if (isMegaEntry(entry) && countMegasInEntries(partialEntries) >= (context.promptLocks?.megaTargetMax || DEFAULT_MAX_MEGAS)) return false;
    if (context.promptLocks?.specificMega && isMegaEntry(entry) && normalizeNameKey(entry.name) !== normalizeNameKey(context.promptLocks.specificMega) && !partialEntries.some((picked) => normalizeNameKey(picked.name) === normalizeNameKey(context.promptLocks.specificMega)) && slotIndex >= 3) {
      return false;
    }
    if (context.promptLocks?.weather) {
      const candidateWeather = getWeatherSetterMode(entry);
      if (candidateWeather && candidateWeather !== context.promptLocks.weather) return false;
    }
    const partialWeatherModes = [...new Set(partialEntries.map((picked) => getWeatherSetterMode(picked)).filter(Boolean))];
    if (partialWeatherModes.length) {
      const candidateWeather = getWeatherSetterMode(entry);
      if (candidateWeather && !partialWeatherModes.includes(candidateWeather)) return false;
    }
    const legalMoves = await getLegalMovesForEntry(entry);
    if (!context.promptLocks?.trickRoom && hasAnyLegalMove(legalMoves, ["trick room"]) && entry.baseSpeed <= 55 && ["tailwind", "fast_offense", "rain", "sun"].includes(context.intentLock)) return false;
    if (context.intentLock === "hard_tr" && entry.baseSpeed >= 120 && !isPromptRequiredEntry(entry, context)) return false;
    const currentTrSetters = (context.currentDraftSnapshot || []).filter((set) => getSetMoveKeys(set).includes("trick room")).length;
    if (rules.isTrickRoom && hasAnyLegalMove(legalMoves, ["trick room"]) && currentTrSetters >= rules.maxTrSetters && !isPromptRequiredEntry(entry, context)) return false;
    if (!rules.hybridSpeed && rules.isTrickRoom && hasAnyLegalMove(legalMoves, ["tailwind"]) && !isPromptRequiredEntry(entry, context)) return false;
    if (!rules.isTrickRoom && ["tailwind", "fast_offense", "rain", "sun", "sand", "snow"].includes(rules.intent) && hasAnyLegalMove(legalMoves, ["trick room"]) && isSupportEntry(entry)) return false;
    if (rules.hyperOffense && isSupportEntry(entry) && !isRealAttackerEntry(entry) && partialEntries.filter((picked) => isSupportEntry(picked)).length >= rules.maxSupport) return false;
    return true;
  }

  async function getCandidatesForSlot(context, partialEntries, slotIndex) {
    const chosenKeys = new Set(partialEntries.map((entry) => normalizeNameKey(entry.name)));
    const requiredRemaining = context.requiredEntries.filter((entry) => !chosenKeys.has(normalizeNameKey(entry.name)));
    const slotsRemaining = 6 - slotIndex;
    const candidatePool = (requiredRemaining.length && (slotIndex === 0 || slotsRemaining <= requiredRemaining.length))
      ? requiredRemaining
      : context.pool;
    const scoredRows = [];
    for (const entry of candidatePool) {
      if (!(await isCandidateAllowedForPrompt(entry, partialEntries, context, slotIndex))) continue;
      const legalMoves = await getLegalMovesForEntry(entry);
      const aiBase = await scoreAiDraftCandidate(entry, partialEntries, context.desiredTypes, context.enemyNames, context.mode, context.request.requestedModes, context.request.requestedPressure);
      if (aiBase <= -999) continue;
      const fitScore = await scoreGuidedCandidateFit(entry, legalMoves, partialEntries, context, slotIndex);
      if (fitScore <= -999) continue;
      scoredRows.push({
        entry,
        legalMoves,
        baseScore: aiBase + fitScore
      });
    }
    return scoredRows.sort((a, b) => b.baseScore - a.baseScore).slice(0, GUIDED_PREFILTER_LIMIT);
  }

  async function findWeakestReplaceableSlot(draft, context) {
    const fullEval = await evaluateLiveTeamState(draft, context, 5);
    const rows = [];
    for (let index = 0; index < draft.length; index += 1) {
      const set = draft[index];
      const entry = getRosterEntry(set.name);
      if (!entry || isPromptRequiredEntry(entry, context)) continue;
      if (context.promptLocks?.specificMega && normalizeNameKey(entry.name) === normalizeNameKey(context.promptLocks.specificMega)) continue;
      const trimmed = draft.filter((_, rowIndex) => rowIndex !== index);
      const evalWithout = await evaluateLiveTeamState(trimmed, context, Math.max(0, trimmed.length - 1));
      rows.push({ index, drop: fullEval.guidedScore - evalWithout.guidedScore });
    }
    rows.sort((a, b) => a.drop - b.drop);
    return rows[0]?.index ?? -1;
  }

  async function findReplaceableSlotsByWeakness(draft, context, limit = GUIDED_SLOT_REVIEW_COUNT) {
    const fullEval = await evaluateLiveTeamState(draft, context, 5);
    const rows = [];
    for (let index = 0; index < draft.length; index += 1) {
      const set = draft[index];
      const entry = getRosterEntry(set.name);
      if (!entry || isPromptRequiredEntry(entry, context)) continue;
      if (context.promptLocks?.specificMega && normalizeNameKey(entry.name) === normalizeNameKey(context.promptLocks.specificMega)) continue;
      const trimmed = draft.filter((_, rowIndex) => rowIndex !== index);
      const evalWithout = await evaluateLiveTeamState(trimmed, context, Math.max(0, trimmed.length - 1));
      rows.push({
        index,
        drop: fullEval.guidedScore - evalWithout.guidedScore,
        overallDrop: fullEval.overall - evalWithout.overall
      });
    }
    return rows
      .sort((a, b) => (a.drop - b.drop) || (a.overallDrop - b.overallDrop))
      .slice(0, limit);
  }

  async function enforceMegaTargetsOnDraft(draft, context) {
    if (context.promptLocks?.noMegas) return draft;
    if (countMegasInSets(draft) >= (context.promptLocks?.megaTargetMin || DEFAULT_MIN_MEGAS)) return draft;
    const replaceIndex = await findWeakestReplaceableSlot(draft, context);
    if (replaceIndex < 0) return draft;
    const currentEntries = draft.map((set) => getRosterEntry(set.name)).filter(Boolean);
    const megaCandidates = context.pool.filter((entry) => isMegaEntry(entry) && !currentEntries.some((picked) => normalizeNameKey(picked.name) === normalizeNameKey(entry.name)));
    let bestDraft = draft;
    let bestEval = await evaluateLiveTeamState(draft, context, 5);
    for (const megaEntry of megaCandidates.slice(0, GUIDED_LIVE_CANDIDATE_LIMIT)) {
      if (!(await isCandidateAllowedForPrompt(megaEntry, currentEntries.filter((_, index) => index !== replaceIndex), context, replaceIndex))) continue;
      const replacementEntries = currentEntries.slice();
      replacementEntries[replaceIndex] = megaEntry;
      const replacementDraft = [];
      for (const entry of replacementEntries) {
        replacementDraft.push(await getOptimizedDraftSetCached(entry, {
          mode: context.mode,
          focus: context.focus,
          notes: context.notes,
          enemyNames: context.enemyNames,
          chosen: replacementEntries,
          currentDraft: replacementDraft,
          buildCounter: ++aiBuildCounter,
          requestedModes: context.request.requestedModes,
          requestedPressure: context.request.requestedPressure
        }));
      }
      applyItemClauseToDraft(replacementDraft);
      const liveEval = await evaluateLiveTeamState(replacementDraft, context, 5);
      if (liveEval.guidedScore > bestEval.guidedScore) {
        bestEval = liveEval;
        bestDraft = replacementDraft;
      }
    }
    return bestDraft;
  }

  async function optimizeGuidedDraft(draft, context) {
    let bestDraft = draft.map((set) => cloneDraftSet(set));
    let bestLiveEval = await evaluateLiveTeamState(bestDraft, context, 5);
    for (let pass = 0; pass < GUIDED_OPTIMIZATION_PASSES; pass += 1) {
      if (bestLiveEval.overall >= context.targetScore && bestLiveEval.guidedScore >= context.goalScore && (context.promptLocks?.noMegas || bestLiveEval.megaCount >= (context.promptLocks?.megaTargetMin || 0))) break;
      let improved = false;
      const replacementSlots = await findReplaceableSlotsByWeakness(bestDraft, context);
      if (!replacementSlots.length) break;
      for (const slotRow of replacementSlots) {
        const replaceIndex = slotRow.index;
        const currentEntries = bestDraft.map((set) => getRosterEntry(set.name)).filter(Boolean);
        const baseEntries = currentEntries.filter((_, index) => index !== replaceIndex);
        context.currentDraftSnapshot = bestDraft.filter((_, index) => index !== replaceIndex).map((set) => cloneDraftSet(set));
        const replacementRows = await getCandidatesForSlot(context, baseEntries, replaceIndex);
        for (const row of replacementRows.slice(0, GUIDED_LIVE_CANDIDATE_LIMIT)) {
          const replacementEntries = currentEntries.slice();
          replacementEntries[replaceIndex] = row.entry;
          const replacementDraft = [];
          for (const entry of replacementEntries) {
            replacementDraft.push(await getOptimizedDraftSetCached(entry, {
              mode: context.mode,
              focus: context.focus,
              notes: context.notes,
              enemyNames: context.enemyNames,
              chosen: replacementEntries,
              currentDraft: replacementDraft,
              buildCounter: ++aiBuildCounter,
              requestedModes: context.request.requestedModes,
              requestedPressure: context.request.requestedPressure
            }));
          }
          applyItemClauseToDraft(replacementDraft);
          const liveEval = await evaluateLiveTeamState(replacementDraft, context, 5);
          const isOverallUpgrade = liveEval.overall > bestLiveEval.overall;
          const isGuidedUpgrade = liveEval.guidedScore > bestLiveEval.guidedScore + 1;
          const needsRescue = bestLiveEval.overall < context.targetScore && liveEval.overall >= bestLiveEval.overall;
          if (isGuidedUpgrade || isOverallUpgrade || needsRescue) {
            bestDraft = replacementDraft;
            bestLiveEval = liveEval;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      if (!improved) break;
    }
    bestDraft = await enforceMegaTargetsOnDraft(bestDraft, context);
    const evaluation = await evaluateTeamState(padTeamState(bestDraft));
    return { draft: bestDraft, evaluation, liveEval: await evaluateLiveTeamState(bestDraft, context, 5) };
  }

  async function buildGuidedDraft(context) {
    const partialEntries = [];
    const partialDraft = [];
    const bestPartialStates = [];
    while (partialEntries.length < 6) {
      const slotIndex = partialEntries.length;
      context.currentDraftSnapshot = partialDraft.map((set) => cloneDraftSet(set));
      const candidateRows = await getCandidatesForSlot(context, partialEntries, slotIndex);
      const liveRows = [];
      for (const row of candidateRows.slice(0, GUIDED_LIVE_CANDIDATE_LIMIT)) {
        const testEntries = [...partialEntries, row.entry];
        const set = await getOptimizedDraftSetCached(row.entry, {
          mode: context.mode,
          focus: context.focus,
          notes: context.notes,
          enemyNames: context.enemyNames,
          chosen: testEntries,
          currentDraft: partialDraft,
          buildCounter: ++aiBuildCounter,
          requestedModes: context.request.requestedModes,
          requestedPressure: context.request.requestedPressure
        });
        const testDraft = [...partialDraft, set];
        const liveEval = await evaluateLiveTeamState(testDraft, context, slotIndex);
        liveRows.push({
          ...row,
          set,
          liveEval,
          total: row.baseScore * 0.42 + liveEval.guidedScore * 0.58
        });
      }
      liveRows.sort((a, b) => b.total - a.total);
      let best = liveRows[0];
      if (!best) {
        let fallbackEntry = null;
        for (const entry of context.pool) {
          if (partialEntries.some((picked) => normalizeNameKey(picked.name) === normalizeNameKey(entry.name))) continue;
          if (violatesSpeciesClause(partialEntries, entry)) continue;
          if (!(await isCandidateAllowedForPrompt(entry, partialEntries, context, slotIndex))) continue;
          fallbackEntry = entry;
          break;
        }
        if (!fallbackEntry) break;
        const testEntries = [...partialEntries, fallbackEntry];
        const set = await getOptimizedDraftSetCached(fallbackEntry, {
          mode: context.mode,
          focus: context.focus,
          notes: context.notes,
          enemyNames: context.enemyNames,
          chosen: testEntries,
          currentDraft: partialDraft,
          buildCounter: ++aiBuildCounter,
          requestedModes: context.request.requestedModes,
          requestedPressure: context.request.requestedPressure
        });
        const liveEval = await evaluateLiveTeamState([...partialDraft, set], context, slotIndex);
        best = {
          entry: fallbackEntry,
          set,
          liveEval
        };
      }
      partialEntries.push(best.entry);
      partialDraft.push(best.set);
      bestPartialStates.push({
        slotIndex,
        name: best.entry.name,
        guidedScore: best.liveEval.guidedScore,
        overall: best.liveEval.overall
      });
    }
    await enforceSpeciesClauseOnDraft(partialDraft, context.pool, {
      mode: context.mode,
      focus: context.focus,
      notes: context.notes,
      enemyNames: context.enemyNames,
      requestedModes: context.request.requestedModes,
      requestedPressure: context.request.requestedPressure
    });
    applyItemClauseToDraft(partialDraft);
    let optimized = await optimizeGuidedDraft(partialDraft, context);
    if (optimized.evaluation?.overallScore < context.targetScore || optimized.liveEval?.guidedScore < context.goalScore) {
      optimized = await optimizeGuidedDraft(optimized.draft, context);
    }
    return {
      draft: optimized.draft,
      evaluation: optimized.evaluation,
      liveEval: optimized.liveEval,
      bestPartialStates
    };
  }

  async function generateAiBuilderDraft() {
    document.body.classList.add("is-building");
    setBusyState(aiBuilderOutput, true, "Building");
    try {
    const explicitMode = document.getElementById("ai-builder-mode").value;
    const explicitFocus = document.getElementById("ai-builder-focus").value.trim();
    const rawNotes = teamImportInput.value.trim();
    const request = parseBuilderRequest(rawNotes, explicitFocus, explicitMode);
    const notes = request.normalizedText;
    const mode = request.mode;
    const focus = request.focus;
    const enemySets = mode === "counter" ? parseSets(notes).accepted : [];
    const enemyNames = enemySets.map((set) => set.name);
    const requestedAnchors = (request.requestedPokemon || []).map((name) => getRosterEntry(name)).filter(Boolean);
    const anchor = mode === "pokemon" ? (requestedAnchors[0] || getRosterEntry(focus)) : null;
    const archetypeText = `${focus} ${notes}`.toLowerCase();
    const desiredTypes = inferDesiredTypesFromText(archetypeText);
    const avoidNames = new Set(enemyNames.map((name) => normalizeNameKey(name)));
    const stapleBanKeys = new Set(request.requestedPressure.avoidStaples ? metaThreats.slice(0, 12).map((threat) => normalizeNameKey(threat.name)) : []);
    const requestedAnchorKeys = new Set(requestedAnchors.map((entry) => normalizeNameKey(entry.name)));
    const pool = championsRoster
      .filter((entry) => !entry.name.startsWith("Mega ") || canUseMega(entry))
      .filter((entry) => !avoidNames.has(normalizeNameKey(entry.name)))
      .filter((entry) => !stapleBanKeys.has(normalizeNameKey(entry.name)) || requestedAnchorKeys.has(normalizeNameKey(entry.name)));
    aiBuildCounter += 1;
    optimizedSetCache.clear();
    liveDamageCalcCache.clear();
    const guidedContext = buildGuidedBuildContext(request, focus, notes, enemyNames, desiredTypes, pool, anchor);
    lastAiBuildContext = guidedContext;
    logBuilderEvent("builder:start", {
      mode,
      focus,
      notes,
      poolSize: pool.length,
      debugFlags: {
        patch: isDebugFlagEnabled(DEBUG_DISABLE_FLAGS.patch),
        engine2: isDebugFlagEnabled(DEBUG_DISABLE_FLAGS.engine2),
        trFix: isDebugFlagEnabled(DEBUG_DISABLE_FLAGS.trFix)
      }
    });
    const guidedBuild = await buildGuidedDraft(guidedContext);
    let bestDraft = guidedBuild.draft;
    let bestEvaluation = guidedBuild.evaluation;
    logBuilderEvent("builder:draft-generated", {
      names: bestDraft.map((set) => set.name),
      overallScore: bestEvaluation?.overallScore ?? null,
      guidedScore: guidedBuild.liveEval?.guidedScore ?? null
    });
    const finalizedDraftPayload = await applyDraftPostProcessing({
      title: "Draft Suggestion",
      request,
      evaluation: bestEvaluation,
      draft: bestDraft
    });
    bestEvaluation = finalizedDraftPayload.evaluation;
    bestDraft = finalizedDraftPayload.draft;
    lastAiDraft = bestDraft;
    const chosen = lastAiDraft.map((set) => getRosterEntry(set.name)).filter(Boolean);
    const explanation = buildAiDraftExplanation(mode, focus, notes, chosen, enemyNames, desiredTypes);
    renderAiBuilderOutput("Draft Suggestion", explanation, bestEvaluation, lastAiDraft);
    await applyAiBuilderDraft();
    logBuilderEvent("builder:complete", {
      names: lastAiDraft.map((set) => set.name),
      overallScore: bestEvaluation?.overallScore ?? null
    });
    } catch (error) {
      console.error("[MBWR] builder:error", error);
      throw error;
    } finally {
      setBusyState(aiBuilderOutput, false);
      document.body.classList.remove("is-building");
    }
  }

  function renderAiBuilderOutput(title, explanation, evaluation, draft) {
    aiBuilderOutput.innerHTML = `
      <p class="result-title">${title}</p>
      <p class="result-copy">${explanation}</p>
      ${evaluation ? `<p class="result-copy"><strong>Projected grade:</strong> ${(evaluation.averagedScores?.overall ?? evaluation.overallScore)}/100 | Structure ${(evaluation.averagedScores?.structure ?? evaluation.structureReport.score)}/100 | Offense ${(evaluation.averagedScores?.offense ?? evaluation.offenseReport.score)}/100 | Vs Meta ${(evaluation.averagedScores?.meta ?? evaluation.metaMatchupScore)}/100</p>` : ""}
      <div class="analysis-row">
        ${(draft || []).map((set) => `<span class="analysis-chip severity-neutral"><strong>${set.name}</strong><br>${[set.item, set.ability, set.nature].filter(Boolean).join(" | ")}<br>${formatSpSummary(set.sps)}<br>${set.moves.filter(Boolean).join(" / ")}<br>${explainDraftSet(set)}</span>`).join("")}
      </div>
    `;
    animateScorePanelChanges(aiBuilderOutput);
  }

  function padTeamState(draft) {
    return Array.from({ length: 6 }, (_, index) => draft[index] || {
      name: "",
      item: "",
      ability: "",
      nature: "",
      sps: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: []
    });
  }

  async function enforceRequestedSupportModes(chosen, pool, requestedModes, anchor) {
    const averageBaseSpeed = chosen.length ? chosen.reduce((sum, entry) => sum + (entry.baseSpeed || 0), 0) / chosen.length : 0;
    const requirements = [
      requestedModes.tailwind ? { move: "tailwind" } : null,
      (requestedModes.trickRoom && averageBaseSpeed <= 70) ? { move: "trick room" } : null
    ].filter(Boolean);
    for (const requirement of requirements) {
      const alreadyCovered = await teamHasLegalMove(chosen, requirement.move);
      if (alreadyCovered) continue;
      const replacement = await findSupportModeCandidate(pool, chosen, requirement.move);
      if (!replacement) continue;
      const replaceIndex = chosen.findIndex((entry) => entry.name !== anchor?.name && !isMegaEntry(entry));
      if (replaceIndex >= 0) chosen[replaceIndex] = replacement;
    }
    const wantsTrickRoomShell = (requestedModes.trickRoom && averageBaseSpeed <= 70) || chosen.filter((entry) => entry.baseSpeed <= 65).length >= 2;
    if (wantsTrickRoomShell) {
      const hasLeadDisruption = await teamHasAnyLegalMove(chosen, ["fake out", "taunt", "encore", "electroweb", "icy wind", "nuzzle"]);
      if (!hasLeadDisruption) {
        const disruptionReplacement = await findSupportModeCandidate(pool, chosen, "fake out")
          || await findSupportModeCandidate(pool, chosen, "taunt")
          || await findSupportModeCandidate(pool, chosen, "encore");
        if (disruptionReplacement) {
          const replaceIndex = chosen.findIndex((entry) => entry.name !== anchor?.name && !isMegaEntry(entry) && entry.baseSpeed >= 90);
          if (replaceIndex >= 0) chosen[replaceIndex] = disruptionReplacement;
        }
      }
    }
  }

  async function teamHasLegalMove(entries, moveKey) {
    for (const entry of entries) {
      const legalMoves = await getLegalMovesForEntry(entry);
      if (hasAnyLegalMove(legalMoves, [moveKey])) return true;
    }
    return false;
  }

  async function teamHasAnyLegalMove(entries, moveKeys) {
    for (const entry of entries) {
      const legalMoves = await getLegalMovesForEntry(entry);
      if (hasAnyLegalMove(legalMoves, moveKeys)) return true;
    }
    return false;
  }

  async function findSupportModeCandidate(pool, chosen, moveKey) {
    const candidates = [];
    for (const entry of pool) {
      if (chosen.some((picked) => picked.name === entry.name)) continue;
      if (violatesSpeciesClause(chosen, entry)) continue;
      const legalMoves = await getLegalMovesForEntry(entry);
      if (!hasAnyLegalMove(legalMoves, [moveKey])) continue;
      candidates.push(entry);
    }
    return candidates.sort((a, b) => b.baseSpeed - a.baseSpeed)[0] || null;
  }

  async function applyAiBuilderDraft() {
    if (!lastAiDraft.length) {
      aiBuilderOutput.innerHTML = `<div class="status-note">Generate a draft first, then load it into the teambuilder.</div>`;
      return;
    }
    document.body.classList.add("is-applying-team");
    try {
      logBuilderEvent("builder:apply-start", {
        names: lastAiDraft.map((set) => set.name)
      });
      document.querySelectorAll(".team-slot, .team-item, .team-ability, .team-nature, .team-move").forEach((select) => { select.value = ""; });
      for (let slotIndex = 0; slotIndex < 6; slotIndex += 1) {
        applyImportedTeamSlotSpSpread(slotIndex, {});
      }
      await refreshAllTeamBuilderOptions();
      for (const set of lastAiDraft) {
        await loadSetIntoTeamBuilder(set);
      }
      notifyTeamBuilderStateChange("ai-draft-applied");
      analyzeTeamBuilder();
      activateTab("teambuilder");
      logBuilderEvent("builder:applied", {
        filledSlots: getTeamBuilderState().filter((slot) => slot.name).length
      });
    } catch (error) {
      console.error("[MBWR] builder:apply-error", error);
      throw error;
    } finally {
      document.body.classList.remove("is-applying-team");
    }
  }

  async function handleAiBuilderTweaks() {
    document.body.classList.add("is-building");
    setBusyState(aiBuilderOutput, true, "Updating");
    try {
    const tweakText = aiBuilderTweaks?.value?.trim() || "";
    const currentTeamState = getTeamBuilderState().filter((slot) => slot.name);
    const currentEntries = currentTeamState.map((slot) => resolveBattleEntry(slot)).filter(Boolean);
    const sourceEntries = currentEntries.length
      ? currentEntries
      : lastAiDraft.map((set) => getRosterEntry(set.name)).filter(Boolean);
    if (!sourceEntries.length) {
      aiBuilderOutput.innerHTML = `<div class="status-note">Generate or load a team first, then ask for tweaks here.</div>`;
      return;
    }
    const request = parseBuilderRequest(tweakText, document.getElementById("ai-builder-focus").value.trim(), document.getElementById("ai-builder-mode").value);
    const notes = [tweakText, `Current roster: ${sourceEntries.map((entry) => entry.name).join(", ")}`].filter(Boolean).join(". ");
    const tweakedDraft = [];
    optimizedSetCache.clear();
    for (const entry of sourceEntries.slice(0, 6)) {
      tweakedDraft.push(await getOptimizedDraftSetCached(entry, {
        mode: request.mode || "pokemon",
        focus: request.focus || sourceEntries[0]?.name || "",
        notes,
        enemyNames: [],
        chosen: sourceEntries,
        currentDraft: tweakedDraft,
        buildCounter: ++aiBuildCounter,
        requestedModes: request.requestedModes,
        requestedPressure: request.requestedPressure
      }));
    }
    await enforceSpeciesClauseOnDraft(tweakedDraft, championsRoster.filter((entry) => !entry.name.startsWith("Mega ") || canUseMega(entry)), {
      mode: request.mode || "pokemon",
      focus: request.focus || sourceEntries[0]?.name || "",
      notes,
      enemyNames: [],
      requestedModes: request.requestedModes,
      requestedPressure: request.requestedPressure
    });
    applyItemClauseToDraft(tweakedDraft);
    let evaluation = await evaluateTeamState(padTeamState(tweakedDraft));
    const finalizedDraftPayload = await applyDraftPostProcessing({
      title: "Tweaked Draft",
      request,
      evaluation,
      draft: tweakedDraft
    });
    evaluation = finalizedDraftPayload.evaluation;
    lastAiDraft = finalizedDraftPayload.draft;
    renderAiBuilderOutput("Tweaked Draft", tweakText || "Adjusted the current six for cleaner synergy and stronger role fit.", evaluation, lastAiDraft);
    await applyAiBuilderDraft();
    } finally {
      setBusyState(aiBuilderOutput, false);
      document.body.classList.remove("is-building");
    }
  }

  async function applyDraftPostProcessing(payload) {
    const nextPayload = {
      ...payload,
      draft: (payload.draft || []).map((set) => cloneDraftSet(set))
    };
    logBuilderEvent("builder:post-process-start", {
      names: nextPayload.draft.map((set) => set.name),
      trFixDisabled: isDebugFlagEnabled(DEBUG_DISABLE_FLAGS.trFix)
    });
    if (nextPayload.request && nextPayload.draft.length) {
      nextPayload.draft = await repairDraftByCompetitiveRules(nextPayload.draft, nextPayload.request);
      nextPayload.evaluation = await evaluateTeamState(padTeamState(nextPayload.draft));
    }
    if (isDebugFlagEnabled(DEBUG_DISABLE_FLAGS.trFix)) {
      logBuilderEvent("builder:post-hook-skipped", { reason: DEBUG_DISABLE_FLAGS.trFix });
      return nextPayload;
    }
    if (typeof window.MBWR_ON_DRAFT_GENERATED !== "function") return nextPayload;
    try {
      logBuilderEvent("builder:post-hook", {
        handler: "MBWR_ON_DRAFT_GENERATED",
        names: nextPayload.draft.map((set) => set.name)
      });
      const maybePatched = await window.MBWR_ON_DRAFT_GENERATED({
        ...nextPayload,
        draft: nextPayload.draft.map((set) => cloneDraftSet(set))
      });
      if (Array.isArray(maybePatched?.draft)) nextPayload.draft = maybePatched.draft.map((set) => cloneDraftSet(set));
      if (maybePatched?.evaluation) nextPayload.evaluation = maybePatched.evaluation;
      logBuilderEvent("builder:post-hook-result", {
        names: nextPayload.draft.map((set) => set.name),
        overallScore: nextPayload.evaluation?.overallScore ?? null
      });
    } catch (error) {
      console.warn("[MBWR] builder:post-hook-error", error);
    }
    if (nextPayload.request && nextPayload.draft.length) {
      nextPayload.draft = await repairDraftByCompetitiveRules(nextPayload.draft, nextPayload.request);
      nextPayload.evaluation = await evaluateTeamState(padTeamState(nextPayload.draft));
    }
    return nextPayload;
  }

  function inferDesiredTypesFromText(text) {
    const typeNames = Object.keys(TYPE_CHART).map((type) => type.toLowerCase());
    return typeNames.filter((type) => text.includes(type)).map((type) => prettyMoveName(type));
  }

  function getSupportMoveKeySet() {
    return new Set(["protect", "tailwind", "trick room", "helping hand", "quick guard", "parting shot", "taunt", "will-o-wisp", "fake out", "substitute", "swords dance", "nasty plot", "agility", "thunder wave", "icy wind", "electroweb", "coaching", "encore", "disable", "follow me", "rage powder"]);
  }

  const PIVOT_MOVE_KEYS = new Set(["u-turn", "volt switch", "flip turn", "parting shot"]);
  const SPREAD_PRESSURE_MOVE_KEYS = new Set(["heat wave", "rock slide", "dazzling gleam", "hyper voice", "sparkling aria", "muddy water", "discharge", "blizzard", "eruption", "sludge wave", "surf", "earthquake"]);
  const SELF_DROP_MOVE_KEYS = new Set(["close combat", "superpower", "draco meteor", "overheat", "make it rain", "v-create", "armor cannon", "leaf storm"]);
  const POSITIONING_MOVE_KEYS = new Set(["protect", "fake out", "parting shot", "u-turn", "volt switch", "flip turn", "follow me", "rage powder", "helping hand", "tailwind", "trick room", "quick guard", "wide guard", "taunt", "encore", "disable"]);
  const SETUP_MOVE_KEYS = new Set(["swords dance", "dragon dance", "nasty plot", "calm mind", "bulk up", "shell smash", "quiver dance", "agility", "curse"]);
  const SUPPORT_STYLE_MOVE_KEYS = new Set(["fake out", "parting shot", "taunt", "will-o-wisp", "helping hand", "encore", "disable", "follow me", "rage powder", "tailwind", "trick room", "icy wind", "electroweb", "thunder wave", "quick guard", "wide guard"]);

  function getEntryBulkStat(entry) {
    return (entry?.baseStats?.[0] || 0) + (entry?.baseStats?.[2] || 0) + (entry?.baseStats?.[4] || 0);
  }

  const ROLE_CLASS_KEYS = [
    "pivot_support",
    "bulky_support",
    "fakeout_support",
    "disruption_support",
    "speed_control_support",
    "redirection_support",
    "tr_setter",
    "tr_abuser_physical",
    "tr_abuser_special",
    "weather_setter",
    "weather_abuser",
    "fast_physical_attacker",
    "fast_special_attacker",
    "bulky_physical_attacker",
    "bulky_special_attacker",
    "mixed_breaker",
    "cleaner"
  ];

  const ROLE_FAMILY_MAP = {
    pivot_support: "support",
    bulky_support: "support",
    fakeout_support: "support",
    disruption_support: "support",
    speed_control_support: "support",
    redirection_support: "support",
    tr_setter: "support",
    weather_setter: "support",
    weather_abuser: "attacker",
    tr_abuser_physical: "attacker",
    tr_abuser_special: "attacker",
    fast_physical_attacker: "attacker",
    fast_special_attacker: "attacker",
    bulky_physical_attacker: "attacker",
    bulky_special_attacker: "attacker",
    mixed_breaker: "attacker",
    cleaner: "attacker"
  };

  const ROLE_CONFLICT_GROUPS = [
    ["pivot_support", "fast_physical_attacker", "fast_special_attacker", "cleaner"],
    ["tr_setter", "weather_setter", "weather_abuser"],
    ["redirection_support", "mixed_breaker", "cleaner"],
    ["bulky_support", "fast_physical_attacker", "fast_special_attacker"]
  ];

  const ABILITY_ROLE_WEIGHTS = {
    intimidate: { pivot_support: 28, fakeout_support: 16, disruption_support: 12 },
    prankster: { speed_control_support: 22, disruption_support: 22, bulky_support: 8 },
    hospitality: { bulky_support: 26, redirection_support: 10 },
    "armor tail": { disruption_support: 18, tr_setter: 10, bulky_support: 8 },
    "magic bounce": { disruption_support: 18, bulky_support: 12 },
    drizzle: { weather_setter: 28 },
    drought: { weather_setter: 28 },
    "sand stream": { weather_setter: 28 },
    "snow warning": { weather_setter: 28 },
    "swift swim": { weather_abuser: 22, cleaner: 8 },
    chlorophyll: { weather_abuser: 22, cleaner: 8 },
    "sand rush": { weather_abuser: 22, cleaner: 8 },
    "slush rush": { weather_abuser: 22, cleaner: 8 },
    "huge power": { bulky_physical_attacker: 12, fast_physical_attacker: 16, cleaner: 10 },
    adaptability: { fast_special_attacker: 10, fast_physical_attacker: 10, mixed_breaker: 18, cleaner: 8 },
    "sheer force": { mixed_breaker: 18, fast_special_attacker: 10, fast_physical_attacker: 10 },
    "tough claws": { mixed_breaker: 12, fast_physical_attacker: 14, bulky_physical_attacker: 8 },
    levitate: { pivot_support: 8, bulky_support: 8 },
    "shadow tag": { disruption_support: 26 },
    "magic guard": { bulky_special_attacker: 10, bulky_support: 8 },
    clearbody: { bulky_physical_attacker: 8 },
    "clear body": { bulky_physical_attacker: 8 },
    defiant: { fast_physical_attacker: 12, cleaner: 10 },
    competitive: { bulky_special_attacker: 10, fast_special_attacker: 10 },
    contrary: { mixed_breaker: 12, bulky_special_attacker: 8 }
  };

  const SPECIES_ROLE_OVERRIDES = {
    incineroar: {
      tendencies: { pivot_support: 36, fakeout_support: 28, disruption_support: 20, bulky_support: 18 },
      perRoleMovePriority: {
        pivot_support: ["Flare Blitz", "Fake Out", "Parting Shot", "Protect", "Throat Chop", "Will-O-Wisp"],
        fakeout_support: ["Flare Blitz", "Fake Out", "Parting Shot", "Protect", "Throat Chop", "Will-O-Wisp"]
      },
      bannedMovesByRole: {
        pivot_support: ["Close Combat", "Superpower"],
        fakeout_support: ["Close Combat", "Superpower"]
      }
    },
    primarina: {
      tendencies: { bulky_special_attacker: 26, disruption_support: 10, bulky_support: 8 },
      perRoleMovePriority: {
        bulky_special_attacker: ["Sparkling Aria", "Moonblast", "Protect", "Encore", "Icy Wind", "Hyper Voice", "Alluring Voice"],
        disruption_support: ["Sparkling Aria", "Moonblast", "Protect", "Encore", "Icy Wind", "Hyper Voice"]
      }
    },
    goodra: {
      tendencies: { bulky_special_attacker: 24, bulky_support: 6 },
      perRoleMovePriority: {
        bulky_special_attacker: ["Protect", "Dragon Pulse", "Draco Meteor", "Flamethrower", "Thunderbolt", "Sludge Bomb"]
      }
    }
  };

  function getEntryLearnsetKeys(entry, legalMoves = [], moves = []) {
    const entryLegalMoves = legalMoves.length
      ? legalMoves
      : (legalPokemonData[entry?.name || ""]?.legalMoves || legalPokemonData[entry?.baseName || ""]?.legalMoves || []);
    return new Set([...entryLegalMoves, ...(moves || [])].map((move) => normalizeNameKey(move)).filter(Boolean));
  }

  function getAbilityRoleWeights(abilityKey) {
    return ABILITY_ROLE_WEIGHTS[abilityKey] || ABILITY_ROLE_WEIGHTS[abilityKey.replace(/\s+/g, "")] || null;
  }

  function getSpeciesRoleOverride(entry) {
    return SPECIES_ROLE_OVERRIDES[normalizeNameKey(entry?.name || "")] || null;
  }

  function buildEmptyRoleScores() {
    return Object.fromEntries(ROLE_CLASS_KEYS.map((role) => [role, 0]));
  }

  function addRoleScore(roleScores, role, value) {
    if (!Object.prototype.hasOwnProperty.call(roleScores, role)) return;
    roleScores[role] += value;
  }

  function getRolePrimaryFamily(role) {
    return ROLE_FAMILY_MAP[role] || "flex";
  }

  function scoreEntryRoleClasses(entry, context = {}, moves = [], legalMoves = []) {
    const buildRules = getCompetitiveBuildRules(context);
    const roleScores = buildEmptyRoleScores();
    const key = normalizeNameKey(entry?.name || "");
    const moveKeys = (moves || []).map((move) => normalizeNameKey(move)).filter(Boolean);
    const learnsetKeys = getEntryLearnsetKeys(entry, legalMoves, moves);
    const sourceKeys = new Set([...learnsetKeys, ...moveKeys]);
    const abilities = (entry?.abilities || []).map((ability) => normalizeNameKey(ability));
    const atk = entry?.baseStats?.[1] || 0;
    const spa = entry?.baseStats?.[3] || 0;
    const hp = entry?.baseStats?.[0] || 0;
    const def = entry?.baseStats?.[2] || 0;
    const spd = entry?.baseStats?.[4] || 0;
    const speed = entry?.baseSpeed || 0;
    const bulk = hp + def + spd;
    const offenseStat = Math.max(atk, spa);
    const physicalBias = atk >= spa + 12;
    const specialBias = spa >= atk + 12;
    const mixedBias = !physicalBias && !specialBias && atk >= 95 && spa >= 95;
    const bulky = bulk >= 248 || (bulk >= 232 && speed <= 95);
    const veryBulky = bulk >= 270;
    const fast = speed >= 100;
    const veryFast = speed >= 118;
    const slow = speed <= 75;
    const verySlow = speed <= 55;
    const hasFakeOut = sourceKeys.has("fake out");
    const hasPivot = [...PIVOT_MOVE_KEYS].some((move) => sourceKeys.has(move));
    const hasSupportKit = [...SUPPORT_STYLE_MOVE_KEYS].some((move) => sourceKeys.has(move));
    const hasSpeedControl = ["tailwind", "icy wind", "electroweb", "thunder wave", "bulldoze"].some((move) => sourceKeys.has(move));
    const hasRedirection = sourceKeys.has("follow me") || sourceKeys.has("rage powder");
    const hasTrickRoom = sourceKeys.has("trick room");
    const hasWeatherAbility = abilities.some((ability) => ["drizzle", "drought", "sand stream", "snow warning"].includes(ability));
    const hasSpreadOption = [...SPREAD_PRESSURE_MOVE_KEYS].some((move) => sourceKeys.has(move));
    const hasDisruption = ["taunt", "encore", "disable", "will-o-wisp", "parting shot", "fake out"].some((move) => sourceKeys.has(move));
    const hasSetup = [...SETUP_MOVE_KEYS].some((move) => sourceKeys.has(move));
    const weatherIntent = buildRules.weather || "";

    if (hasPivot) addRoleScore(roleScores, "pivot_support", 18);
    if (hasFakeOut) addRoleScore(roleScores, "fakeout_support", 18);
    if (hasSupportKit) addRoleScore(roleScores, "bulky_support", 10);
    if (hasDisruption) addRoleScore(roleScores, "disruption_support", 14);
    if (hasSpeedControl) addRoleScore(roleScores, "speed_control_support", 16);
    if (hasRedirection) addRoleScore(roleScores, "redirection_support", 28);
    if (hasTrickRoom) addRoleScore(roleScores, "tr_setter", 26);
    if (hasWeatherAbility || ["rain dance", "sunny day", "sandstorm", "snowscape"].some((move) => sourceKeys.has(move))) addRoleScore(roleScores, "weather_setter", 24);

    if (offenseStat >= 120 && fast && physicalBias) addRoleScore(roleScores, "fast_physical_attacker", 24);
    if (offenseStat >= 120 && fast && specialBias) addRoleScore(roleScores, "fast_special_attacker", 24);
    if (offenseStat >= 108 && bulky && physicalBias) addRoleScore(roleScores, "bulky_physical_attacker", 22);
    if (offenseStat >= 108 && bulky && specialBias) addRoleScore(roleScores, "bulky_special_attacker", 22);
    if (mixedBias) addRoleScore(roleScores, "mixed_breaker", 22);
    if ((veryFast && offenseStat >= 105) || (sourceKeys.has("sucker punch") || sourceKeys.has("extreme speed")) && offenseStat >= 105) addRoleScore(roleScores, "cleaner", 18);

    if (buildRules.isTrickRoom && slow && physicalBias && offenseStat >= 110) addRoleScore(roleScores, "tr_abuser_physical", 28);
    if (buildRules.isTrickRoom && slow && specialBias && offenseStat >= 110) addRoleScore(roleScores, "tr_abuser_special", 28);
    if (buildRules.isTrickRoom && verySlow && offenseStat >= 100) {
      addRoleScore(roleScores, physicalBias ? "tr_abuser_physical" : "tr_abuser_special", 10);
    }

    if (weatherIntent && isWeatherAbuserEntry(entry, weatherIntent)) addRoleScore(roleScores, "weather_abuser", 26);
    if (weatherIntent && hasWeatherAbility && getWeatherSetterMode(entry) === weatherIntent) addRoleScore(roleScores, "weather_setter", 12);

    if (veryBulky && hasSupportKit) addRoleScore(roleScores, "bulky_support", 18);
    if (bulky && hasPivot) addRoleScore(roleScores, "pivot_support", 14);
    if (bulky && specialBias && offenseStat >= 95) addRoleScore(roleScores, "bulky_special_attacker", 8);
    if (bulky && physicalBias && offenseStat >= 95) addRoleScore(roleScores, "bulky_physical_attacker", 8);
    if (fast && hasSpeedControl) addRoleScore(roleScores, "speed_control_support", 10);
    if (hasSpreadOption && offenseStat >= 105) {
      addRoleScore(roleScores, physicalBias ? "fast_physical_attacker" : "fast_special_attacker", fast ? 6 : 0);
      addRoleScore(roleScores, physicalBias ? "bulky_physical_attacker" : "bulky_special_attacker", !fast ? 6 : 0);
    }
    if (hasSetup && fast) addRoleScore(roleScores, "cleaner", 12);

    abilities.forEach((ability) => {
      const weights = getAbilityRoleWeights(ability);
      if (!weights) return;
      Object.entries(weights).forEach(([role, value]) => addRoleScore(roleScores, role, value));
    });

    const override = getSpeciesRoleOverride(entry);
    if (override?.tendencies) {
      Object.entries(override.tendencies).forEach(([role, value]) => addRoleScore(roleScores, role, value));
    }

    if (buildRules.intent === "hard_tr") {
      addRoleScore(roleScores, "tr_setter", hasTrickRoom ? 12 : 0);
      addRoleScore(roleScores, "tr_abuser_physical", slow ? 10 : -12);
      addRoleScore(roleScores, "tr_abuser_special", slow ? 10 : -12);
      addRoleScore(roleScores, "fast_physical_attacker", fast ? -18 : 0);
      addRoleScore(roleScores, "fast_special_attacker", fast ? -18 : 0);
      addRoleScore(roleScores, "cleaner", fast ? -12 : 0);
    }
    if (buildRules.isTailwind) {
      addRoleScore(roleScores, "speed_control_support", hasSpeedControl || sourceKeys.has("tailwind") ? 10 : 0);
      addRoleScore(roleScores, "fast_physical_attacker", fast ? 8 : -8);
      addRoleScore(roleScores, "fast_special_attacker", fast ? 8 : -8);
      addRoleScore(roleScores, "cleaner", fast ? 8 : 0);
      addRoleScore(roleScores, "tr_setter", hasTrickRoom && !buildRules.hybridSpeed ? -20 : 0);
    }
    if (buildRules.hyperOffense) {
      addRoleScore(roleScores, "bulky_support", -8);
      addRoleScore(roleScores, "pivot_support", -4);
      addRoleScore(roleScores, "fast_physical_attacker", 8);
      addRoleScore(roleScores, "fast_special_attacker", 8);
      addRoleScore(roleScores, "cleaner", 12);
    }

    if (context.slotPurpose === "support") {
      ["pivot_support", "bulky_support", "fakeout_support", "disruption_support", "speed_control_support", "redirection_support", "tr_setter"].forEach((role) => addRoleScore(roleScores, role, 8));
    } else if (context.slotPurpose === "breaker") {
      ["mixed_breaker", "bulky_physical_attacker", "bulky_special_attacker", "fast_physical_attacker", "fast_special_attacker"].forEach((role) => addRoleScore(roleScores, role, 6));
    } else if (context.slotPurpose === "closer") {
      addRoleScore(roleScores, "cleaner", 12);
    } else if (context.slotPurpose === "pivot") {
      addRoleScore(roleScores, "pivot_support", 10);
    }

    if (key === "incineroar" && sourceKeys.has("fake out") && sourceKeys.has("parting shot")) addRoleScore(roleScores, "pivot_support", 12);
    if (key === "primarina" && bulky && specialBias) addRoleScore(roleScores, "bulky_special_attacker", 10);
    if (key === "goodra" && bulky && specialBias) addRoleScore(roleScores, "bulky_special_attacker", 12);

    return {
      roleScores,
      metadata: {
        key,
        abilities,
        atk,
        spa,
        bulk,
        speed,
        physicalBias,
        specialBias,
        mixedBias,
        bulky,
        fast,
        slow,
        hasFakeOut,
        hasPivot,
        hasSupportKit,
        hasSpeedControl,
        hasRedirection,
        hasTrickRoom,
        hasSpreadOption,
        hasDisruption,
        hasSetup,
        weatherIntent
      }
    };
  }

  function resolveRoleClasses(roleScores) {
    const ranked = Object.entries(roleScores).sort((a, b) => b[1] - a[1]);
    const primary = ranked[0]?.[0] || "bulky_support";
    const primaryScore = ranked[0]?.[1] || 0;
    const secondaryEntry = ranked.find(([role, score]) => role !== primary && score >= Math.max(12, primaryScore - 8));
    const secondary = secondaryEntry?.[0] || "";
    const secondaryScore = secondaryEntry?.[1] || 0;
    const conflicts = ROLE_CONFLICT_GROUPS
      .filter((group) => group.includes(primary) && secondary && group.includes(secondary))
      .map((group) => `${primary} vs ${secondary} within ${group.join("/")}`);
    const confidence = primaryScore >= 42 ? "high" : primaryScore >= 28 ? "medium" : "low";
    return {
      primary,
      secondary,
      confidence,
      conflicts,
      ranked,
      primaryFamily: getRolePrimaryFamily(primary),
      secondaryFamily: secondary ? getRolePrimaryFamily(secondary) : ""
    };
  }

  function inferSetRoleProfile(entry, context = {}, moves = [], legalMoves = []) {
    const buildRules = getCompetitiveBuildRules(context);
    const key = normalizeNameKey(entry?.name || "");
    const moveKeys = (moves || []).map((move) => normalizeNameKey(move)).filter(Boolean);
    const learnsetKeys = getEntryLearnsetKeys(entry, legalMoves, moves);
    const sourceKeys = new Set([...learnsetKeys, ...moveKeys]);
    const offenseStat = getEntryOffenseStat(entry);
    const bulkStat = getEntryBulkStat(entry);
    const speed = entry?.baseSpeed || 0;
    const supportLock = SUPPORT_ROLE_LOCKS.has(key);
    const { roleScores, metadata } = scoreEntryRoleClasses(entry, context, moves, legalMoves);
    const resolved = resolveRoleClasses(roleScores);
    const trAbuser = ["tr_abuser_physical", "tr_abuser_special"].includes(resolved.primary) || ["tr_abuser_physical", "tr_abuser_special"].includes(resolved.secondary);
    const supportOrPivot = supportLock || ["support"].includes(resolved.primaryFamily) || ["support"].includes(resolved.secondaryFamily) || !!context.forceSupport;
    const pivot = ["pivot_support"].includes(resolved.primary) || ["pivot_support"].includes(resolved.secondary);
    const attacker = ["attacker"].includes(resolved.primaryFamily) || ["attacker"].includes(resolved.secondaryFamily) || isRealAttackerEntry(entry) || offenseStat >= 115;
    const pureOffense = attacker && !supportOrPivot && !pivot && !trAbuser && ["fast_physical_attacker", "fast_special_attacker", "mixed_breaker", "cleaner"].includes(resolved.primary);
    const supportivePrimarina = key === "primarina" && (["bulky_special_attacker", "bulky_support", "disruption_support"].includes(resolved.primary) || moveKeys.some((move) => ["encore", "icy wind", "protect"].includes(move)));
    const wantsProtect = supportivePrimarina
      || supportOrPivot
      || pivot
      || metadata.bulky
      || trAbuser
      || metadata.hasSetup
      || speed <= 100
      || (!buildRules.hyperOffense && attacker);
    const canDropProtect = pureOffense && !supportOrPivot && !pivot && !trAbuser && !supportivePrimarina && resolved.confidence !== "low";
    const wantsFakeOut = sourceKeys.has("fake out") && (["fakeout_support", "pivot_support"].includes(resolved.primary) || ["fakeout_support", "pivot_support"].includes(resolved.secondary) || buildRules.isTrickRoom || metadata.bulky);
    const wantsPivotMove = [...PIVOT_MOVE_KEYS].some((move) => sourceKeys.has(move)) && (["pivot_support", "bulky_support"].includes(resolved.primary) || ["pivot_support", "bulky_support"].includes(resolved.secondary) || key === "incineroar");
    const wantsSpreadDamage = metadata.hasSpreadOption && attacker && !supportOrPivot;
    const avoidSelfDrop = supportOrPivot || pivot || metadata.bulky || trAbuser || supportivePrimarina || ["bulky_physical_attacker", "bulky_special_attacker"].includes(resolved.primary);
    const bulkyDisruption = supportivePrimarina || (metadata.bulky && metadata.hasSupportKit) || ["bulky_support", "disruption_support"].includes(resolved.primary);
    const dislikesRedundantVoiceWater = key === "primarina" && (supportivePrimarina || bulkyDisruption || speed <= 80);
    return {
      key,
      buildRules,
      offenseStat,
      bulkStat,
      speed,
      roleScores,
      primaryRole: resolved.primary,
      secondaryRole: resolved.secondary,
      roleConfidence: resolved.confidence,
      roleConflicts: resolved.conflicts,
      roleRanked: resolved.ranked,
      primaryFamily: resolved.primaryFamily,
      secondaryFamily: resolved.secondaryFamily,
      attacker,
      supportOrPivot,
      pivot,
      trAbuser,
      bulky: metadata.bulky,
      pureOffense,
      wantsProtect,
      canDropProtect,
      wantsFakeOut,
      wantsPivotMove,
      wantsSpreadDamage,
      avoidSelfDrop,
      bulkyDisruption,
      dislikesRedundantVoiceWater,
      learnsetKeys,
      sourceKeys,
      hasSupportKit: metadata.hasSupportKit,
      hasPivotKit: metadata.hasPivot,
      hasSpeedControl: metadata.hasSpeedControl,
      hasRedirection: metadata.hasRedirection,
      hasTrickRoom: metadata.hasTrickRoom,
      hasSpreadOption: metadata.hasSpreadOption
    };
  }

  function getRoleAwareSupportPriority(entry, roleProfile) {
    const key = normalizeNameKey(entry?.name || "");
    const ordered = [];
    if (roleProfile.wantsProtect) ordered.push("Protect");
    if (roleProfile.wantsFakeOut) ordered.push("Fake Out");
    if (roleProfile.wantsPivotMove) ordered.push("Parting Shot", "U-turn", "Volt Switch", "Flip Turn");
    if (roleProfile.supportOrPivot) ordered.push("Taunt", "Helping Hand", "Encore", "Disable", "Will-O-Wisp");
    if (!roleProfile.buildRules.isTrickRoom || roleProfile.buildRules.hybridSpeed) ordered.push("Icy Wind", "Electroweb", "Thunder Wave");
    if (roleProfile.buildRules.intent === "hard_tr") ordered.push("Helping Hand", "Rage Powder", "Follow Me", "Fake Out");
    if (key === "incineroar") {
      return ["Protect", "Fake Out", "Parting Shot", "Taunt", "Will-O-Wisp", "Throat Chop"];
    }
    return [...new Set(ordered)];
  }

  function getRoleAwareSpeciesMovePriority(entry, roleProfile) {
    const override = getSpeciesRoleOverride(entry);
    if (override?.perRoleMovePriority?.[roleProfile.primaryRole]) {
      return override.perRoleMovePriority[roleProfile.primaryRole];
    }
    if (override?.perRoleMovePriority?.[roleProfile.secondaryRole]) {
      return override.perRoleMovePriority[roleProfile.secondaryRole];
    }
    return [];
  }

  function getRoleAwareMoveAdjustment(entry, moveName, roleProfile, currentMoves = []) {
    const key = normalizeNameKey(moveName);
    const currentKeys = currentMoves.map((move) => normalizeNameKey(move));
    const override = getSpeciesRoleOverride(entry);
    let score = 0;
    if (key === "protect") score += roleProfile.wantsProtect ? 34 : (roleProfile.canDropProtect ? -4 : 8);
    if (key === "fake out") score += roleProfile.wantsFakeOut ? 24 : -18;
    if (PIVOT_MOVE_KEYS.has(key)) score += roleProfile.wantsPivotMove ? 18 : (roleProfile.pureOffense ? -16 : -4);
    if (SPREAD_PRESSURE_MOVE_KEYS.has(key)) score += roleProfile.wantsSpreadDamage ? 12 : (roleProfile.supportOrPivot ? -10 : 0);
    if (SELF_DROP_MOVE_KEYS.has(key)) score += roleProfile.avoidSelfDrop ? -30 : 8;
    if (SELF_DROP_MOVE_KEYS.has(key) && currentKeys.some((move) => SELF_DROP_MOVE_KEYS.has(move))) score -= 20;
    if (roleProfile.dislikesRedundantVoiceWater && ["sparkling aria", "hyper voice"].includes(key) && currentKeys.some((move) => ["sparkling aria", "hyper voice"].includes(move))) score -= 20;
    if (roleProfile.key === "incineroar") {
      if (key === "flare blitz") score += 34;
      if (key === "parting shot") score += 28;
      if (key === "throat chop") score += 12;
      if (["close combat", "superpower"].includes(key) && roleProfile.supportOrPivot) score -= 34;
      if (key === "will-o-wisp") score += roleProfile.supportOrPivot ? 10 : 0;
    }
    if (roleProfile.key === "primarina") {
      if (key === "protect" && roleProfile.bulkyDisruption) score += 28;
      if (["sparkling aria", "hyper voice"].includes(key) && roleProfile.dislikesRedundantVoiceWater && currentKeys.some((move) => ["sparkling aria", "hyper voice"].includes(move))) score -= 18;
    }
    const bannedForRole = [
      ...(override?.bannedMovesByRole?.[roleProfile.primaryRole] || []),
      ...(override?.bannedMovesByRole?.[roleProfile.secondaryRole] || [])
    ].map((move) => normalizeNameKey(move));
    if (bannedForRole.includes(key)) score -= 60;
    if (roleProfile.roleConfidence === "low" && roleProfile.roleConflicts.length && SETUP_MOVE_KEYS.has(key)) score -= 12;
    return score;
  }

  function getCompetitiveBuildRules(source) {
    const request = source?.request || source || {};
    const normalizedText = `${source?.focus || request.focus || ""} ${source?.notes || request.normalizedText || request.notes || ""}`.toLowerCase();
    const intent = source?.intentLock || request.intentLock || "unknown";
    const promptLocks = source?.promptLocks || request.promptLocks || {};
    const requestedModes = request.requestedModes || source?.requestedModes || {};
    const weather = promptLocks.weather || detectRequestedWeatherMode(normalizedText) || "";
    const isTrickRoom = !!promptLocks.trickRoom || !!requestedModes.trickRoom || ["hard_tr", "soft_tr"].includes(intent);
    const isTailwind = !!promptLocks.tailwind || !!requestedModes.tailwind || intent === "tailwind";
    const hyperOffense = /\bhyper offense\b/.test(normalizedText) || (intent === "fast_offense" && !/\bbulky offense\b/.test(normalizedText));
    const hybridSpeed = /\bhybrid\b|\bmixed speed\b|\bsecondary trick room\b|\bsecondary tailwind\b|\bsoft trick room\b/.test(normalizedText);
    return {
      intent,
      normalizedText,
      weather,
      isTrickRoom,
      isTailwind,
      hyperOffense,
      hybridSpeed,
      maxTrSetters: 2,
      minTrAbusers: intent === "hard_tr" ? 3 : (isTrickRoom ? 2 : 0),
      minAttackers: hyperOffense ? 3 : 2,
      minSupport: intent === "hard_tr" ? 1 : 0,
      maxSupport: isTrickRoom ? 1 : (hyperOffense ? 1 : 2)
    };
  }

  function getSetMoveKeys(set) {
    return (set?.moves || []).map((move) => normalizeNameKey(move)).filter(Boolean);
  }

  function getSetWeatherMode(set) {
    const entry = getRosterEntry(set?.name || "");
    const ability = normalizeNameKey(set?.ability || "");
    const moveKeys = getSetMoveKeys(set);
    if (ability === "drizzle" || moveKeys.includes("rain dance")) return "rain";
    if (ability === "drought" || moveKeys.includes("sunny day")) return "sun";
    if (ability === "sand stream" || moveKeys.includes("sandstorm")) return "sand";
    if (ability === "snow warning" || moveKeys.includes("snowscape")) return "snow";
    return getWeatherSetterMode(entry);
  }

  function getEntryOffenseStat(entry) {
    return Math.max(entry?.baseStats?.[1] || 0, entry?.baseStats?.[3] || 0);
  }

  function isSpeedControlMoveKey(moveKey) {
    return ["tailwind", "icy wind", "electroweb", "thunder wave", "bulldoze", "trick room"].includes(moveKey);
  }

  function isRealAttackerSet(set) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return false;
    const moveKeys = getSetMoveKeys(set);
    const supportMoveKeys = getSupportMoveKeySet();
    const damagingMoves = moveKeys.filter((move) => !supportMoveKeys.has(move) || move === "fake out");
    const offenseStat = getEntryOffenseStat(entry);
    return damagingMoves.length >= 2 && (offenseStat >= 110 || isMegaEntry(entry) || HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name)) || HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name)) || HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name)));
  }

  function isRealAttackerEntry(entry) {
    if (!entry) return false;
    const offenseStat = getEntryOffenseStat(entry);
    return offenseStat >= 110 || isMegaEntry(entry) || HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name)) || HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name)) || HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name));
  }

  function isPassiveSupportSet(set) {
    const moveKeys = getSetMoveKeys(set);
    const supportMoveKeys = getSupportMoveKeySet();
    const supportCount = moveKeys.filter((move) => supportMoveKeys.has(move) && move !== "fake out").length;
    return !isRealAttackerSet(set) && supportCount >= 2;
  }

  function isMeaningfulTrSupportSet(set) {
    const moveKeys = getSetMoveKeys(set);
    const supportMoves = ["fake out", "follow me", "rage powder", "helping hand", "parting shot", "taunt", "encore", "disable", "quick guard", "wide guard"];
    const supportHit = moveKeys.some((move) => supportMoves.includes(move));
    if (!supportHit) return false;
    return !isRealTrAbuserSet(set) || moveKeys.includes("fake out") || moveKeys.includes("follow me") || moveKeys.includes("rage powder");
  }

  function isMeaningfulSupportSet(set) {
    const moveKeys = getSetMoveKeys(set);
    return moveKeys.some((move) => ["fake out", "follow me", "rage powder", "helping hand", "parting shot", "taunt", "encore", "disable", "quick guard", "wide guard", "tailwind", "trick room"].includes(move));
  }

  function isPivotSet(set) {
    const moveKeys = getSetMoveKeys(set);
    return moveKeys.some((move) => ["u-turn", "volt switch", "flip turn", "parting shot"].includes(move));
  }

  function hasProtectPreferredGap(set, source) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return false;
    const roleProfile = inferSetRoleProfile(entry, source, set.moves || [], set.moves || []);
    return roleProfile.wantsProtect && !roleProfile.canDropProtect && !getSetMoveKeys(set).includes("protect");
  }

  function hasOffRoleFakeOut(set, source) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return false;
    const roleProfile = inferSetRoleProfile(entry, source, set.moves || [], set.moves || []);
    return getSetMoveKeys(set).includes("fake out") && !roleProfile.wantsFakeOut;
  }

  function hasOffRolePivotMove(set, source) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return false;
    const roleProfile = inferSetRoleProfile(entry, source, set.moves || [], set.moves || []);
    return getSetMoveKeys(set).some((move) => PIVOT_MOVE_KEYS.has(move)) && !roleProfile.wantsPivotMove;
  }

  function hasRoleUnsafeSelfDrop(set, source) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return false;
    const roleProfile = inferSetRoleProfile(entry, source, set.moves || [], set.moves || []);
    return getSetMoveKeys(set).some((move) => SELF_DROP_MOVE_KEYS.has(move)) && roleProfile.avoidSelfDrop;
  }

  function isWeatherAbuserEntry(entry, weatherMode = "") {
    if (!entry) return false;
    const abilities = entry.abilities || [];
    if (weatherMode === "rain") return hasAnyAbility(abilities, ["swift swim", "dry skin", "rain dish"]) || entry.types.includes("Water");
    if (weatherMode === "sun") return hasAnyAbility(abilities, ["chlorophyll", "solar power", "flower gift"]) || entry.types.includes("Fire");
    if (weatherMode === "sand") return hasAnyAbility(abilities, ["sand rush", "sand force"]) || entry.types.includes("Rock") || entry.types.includes("Ground") || entry.types.includes("Steel");
    if (weatherMode === "snow") return hasAnyAbility(abilities, ["slush rush", "snow cloak"]) || entry.types.includes("Ice");
    return false;
  }

  function isAntiMetaTechSet(set) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return false;
    const moveKeys = getSetMoveKeys(set);
    return moveKeys.some((move) => ["fake out", "taunt", "encore", "parting shot", "protect"].includes(move))
      || hasAnyAbility(entry.abilities || [], ["defiant", "competitive", "clear body", "contrary", "mirror armor"]);
  }

  async function inferEntryRoleTags(entry, legalMoves, context = {}) {
    const tags = new Set();
    const weatherMode = context.promptLocks?.weather || context.intentLock;
    const roleProfile = inferSetRoleProfile(entry, context, [], legalMoves);
    if (roleProfile.primaryFamily === "attacker" || roleProfile.secondaryFamily === "attacker") tags.add("attacker");
    if (["tr_abuser_physical", "tr_abuser_special"].includes(roleProfile.primaryRole) || ["tr_abuser_physical", "tr_abuser_special"].includes(roleProfile.secondaryRole)) tags.add("tr_abuser");
    if (roleProfile.primaryRole === "tr_setter" || roleProfile.secondaryRole === "tr_setter") tags.add("tr_setter");
    if (roleProfile.primaryRole === "speed_control_support" || roleProfile.secondaryRole === "speed_control_support" || hasAnyLegalMove(legalMoves, ["tailwind"])) tags.add("tailwind_setter");
    if (roleProfile.primaryFamily === "support" || roleProfile.secondaryFamily === "support") tags.add("support");
    if (roleProfile.primaryRole === "pivot_support" || roleProfile.secondaryRole === "pivot_support") tags.add("pivot");
    if (roleProfile.hasSpeedControl || roleProfile.hasTrickRoom) tags.add("speed_control");
    if (roleProfile.primaryRole === "weather_setter" || roleProfile.secondaryRole === "weather_setter" || getWeatherSetterMode(entry)) tags.add("weather_setter");
    if (["rain", "sun", "sand", "snow"].includes(weatherMode) && (roleProfile.primaryRole === "weather_abuser" || roleProfile.secondaryRole === "weather_abuser" || isWeatherAbuserEntry(entry, weatherMode))) tags.add("weather_abuser");
    if (roleProfile.primaryRole === "disruption_support" || roleProfile.secondaryRole === "disruption_support" || hasAnyAbility(entry.abilities || [], ["defiant", "competitive", "clear body", "contrary", "mirror armor"])) tags.add("anti_meta_tech");
    if (roleProfile.primaryRole === "cleaner" || roleProfile.secondaryRole === "cleaner") tags.add("cleaner");
    if (!tags.size) tags.add("flex");
    return tags;
  }

  function countDraftPlanRoles(draft, context) {
    const counts = {
      attacker: 0,
      support: 0,
      pivot: 0,
      tr_setter: 0,
      tr_abuser: 0,
      tailwind_setter: 0,
      weather_setter: 0,
      weather_abuser: 0,
      anti_meta_tech: 0,
      speed_control: 0,
      cleaner: 0
    };
    const weatherMode = context.teamPlan?.weather || context.promptLocks?.weather || context.intentLock;
    (draft || []).filter((set) => set?.name).forEach((set) => {
      const moveKeys = getSetMoveKeys(set);
      const entry = getRosterEntry(set.name);
      const roleProfile = inferSetRoleProfile(entry, context, set.moves || [], set.moves || []);
      if (roleProfile.primaryFamily === "attacker" || roleProfile.secondaryFamily === "attacker") counts.attacker += 1;
      if (roleProfile.primaryFamily === "support" || roleProfile.secondaryFamily === "support") counts.support += 1;
      if (roleProfile.primaryRole === "pivot_support" || roleProfile.secondaryRole === "pivot_support") counts.pivot += 1;
      if (roleProfile.primaryRole === "tr_setter" || roleProfile.secondaryRole === "tr_setter" || moveKeys.includes("trick room")) counts.tr_setter += 1;
      if (["tr_abuser_physical", "tr_abuser_special"].includes(roleProfile.primaryRole) || ["tr_abuser_physical", "tr_abuser_special"].includes(roleProfile.secondaryRole)) counts.tr_abuser += 1;
      if (moveKeys.includes("tailwind") || roleProfile.primaryRole === "speed_control_support" || roleProfile.secondaryRole === "speed_control_support") counts.tailwind_setter += 1;
      if (roleProfile.primaryRole === "weather_setter" || roleProfile.secondaryRole === "weather_setter" || getSetWeatherMode(set)) counts.weather_setter += 1;
      if (roleProfile.primaryRole === "weather_abuser" || roleProfile.secondaryRole === "weather_abuser" || isWeatherAbuserEntry(entry, weatherMode)) counts.weather_abuser += 1;
      if (roleProfile.primaryRole === "disruption_support" || roleProfile.secondaryRole === "disruption_support" || isAntiMetaTechSet(set)) counts.anti_meta_tech += 1;
      if (roleProfile.hasSpeedControl || moveKeys.some((move) => ["tailwind", "trick room", "icy wind", "electroweb", "thunder wave"].includes(move))) counts.speed_control += 1;
      if (roleProfile.primaryRole === "cleaner" || roleProfile.secondaryRole === "cleaner") counts.cleaner += 1;
    });
    return counts;
  }

  function getResolvedRoleProfileForSet(set, context = {}) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return null;
    return inferSetRoleProfile(entry, context, set.moves || [], set.moves || []);
  }

  function hasPivotTargets(roleProfile, counts) {
    if (!roleProfile || roleProfile.primaryRole !== "pivot_support") return true;
    return (counts.attacker || 0) >= 2 || (counts.cleaner || 0) >= 1 || (counts.tr_abuser || 0) >= 2;
  }

  function hasHardTrAntiSpeedItem(set) {
    const itemKey = normalizeNameKey(set?.item || "");
    return ["choice scarf", "quick claw"].includes(itemKey);
  }

  function hasHardTrFastModeMoves(set) {
    const moveKeys = getSetMoveKeys(set);
    return moveKeys.some((move) => ["icy wind", "electroweb", "tailwind", "thunder wave"].includes(move));
  }

  function hasHardTrSpeedMisalignment(set) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry) return false;
    if (!isRealTrAbuserSet(set) && !getSetMoveKeys(set).includes("trick room")) return false;
    return (set?.sps?.spe || 0) > 0 || (entry.baseSpeed || 999) >= 95;
  }

  function isRealTrAbuserSet(set) {
    const entry = getRosterEntry(set?.name || "");
    if (!entry || !isRealAttackerSet(set)) return false;
    return (entry.baseSpeed || 999) <= 80 || ((entry.baseSpeed || 999) <= 90 && getEntryOffenseStat(entry) >= 125);
  }

  function isRealTrAbuserEntry(entry) {
    if (!entry || !isRealAttackerEntry(entry)) return false;
    return (entry.baseSpeed || 999) <= 80 || ((entry.baseSpeed || 999) <= 90 && getEntryOffenseStat(entry) >= 125);
  }

  function buildCompetitiveDraftValidation(draft, source) {
    const rules = getCompetitiveBuildRules(source);
    const teamPlan = source?.teamPlan || buildArchetypePlan(source?.request || source || {}, source?.focus, source?.notes);
    const occupied = (draft || []).filter((set) => set?.name);
    const teamSize = occupied.length;
    const expectedAttackers = teamSize >= 5 ? rules.minAttackers : Math.min(rules.minAttackers, Math.max(1, teamSize - Math.min(rules.maxSupport, Math.max(0, teamSize - 1))));
    const expectedTrAbusers = rules.isTrickRoom
      ? (teamSize >= 5 ? rules.minTrAbusers : Math.min(rules.minTrAbusers, Math.max(1, teamSize - 1)))
      : 0;
    const weatherModes = [...new Set(occupied.map((set) => getSetWeatherMode(set)).filter(Boolean))];
    const moveCounts = new Map();
    let trSetterCount = 0;
    let tailwindCount = 0;
    let tailwindSetterCount = 0;
    let extraSpeedControlCount = 0;
    let attackerCount = 0;
    let supportCount = 0;
    let trAbuserCount = 0;
    let trSupportCount = 0;
    let hardTrBadItemCount = 0;
    let hardTrBadMoveCount = 0;
    let hardTrSpeedIssueCount = 0;
    let pivotCount = 0;
    let weatherSetterCount = 0;
    let weatherAbuserCount = 0;
    let antiMetaTechCount = 0;
    let rolelessCount = 0;
    let cleanerCount = 0;
    let lowConfidenceRoleCount = 0;
    let roleConflictCount = 0;
    let invalidTwoTurnMoveCount = 0;
    let protectGapCount = 0;
    let offRoleFakeOutCount = 0;
    let offRolePivotCount = 0;
    let unsafeSelfDropCount = 0;
    occupied.forEach((set) => {
      const moveKeys = getSetMoveKeys(set);
      const entry = getRosterEntry(set.name);
      const roleProfile = inferSetRoleProfile(entry, source, set.moves || [], set.moves || []);
      if (moveKeys.includes("trick room")) trSetterCount += 1;
      if (moveKeys.includes("tailwind")) tailwindCount += 1;
      if (moveKeys.includes("tailwind")) tailwindSetterCount += 1;
      if (moveKeys.some((move) => ["icy wind", "electroweb", "thunder wave", "bulldoze"].includes(move))) extraSpeedControlCount += 1;
      if (isRealAttackerSet(set)) attackerCount += 1;
      if (isPassiveSupportSet(set)) supportCount += 1;
      if (isRealTrAbuserSet(set)) trAbuserCount += 1;
      if (isMeaningfulTrSupportSet(set)) trSupportCount += 1;
      if (isPivotSet(set)) pivotCount += 1;
      if (getSetWeatherMode(set)) weatherSetterCount += 1;
      if (isWeatherAbuserEntry(entry, rules.weather || rules.intent)) weatherAbuserCount += 1;
      if (isAntiMetaTechSet(set)) antiMetaTechCount += 1;
      if (!(isRealAttackerSet(set) || isMeaningfulSupportSet(set) || isPivotSet(set) || getSetWeatherMode(set))) rolelessCount += 1;
      if (roleProfile.primaryRole === "cleaner" || roleProfile.secondaryRole === "cleaner") cleanerCount += 1;
      if (roleProfile.roleConfidence === "low") lowConfidenceRoleCount += 1;
      if ((roleProfile.roleConflicts || []).length) roleConflictCount += 1;
      invalidTwoTurnMoveCount += (set.moves || []).filter((move) => isTwoTurnMoveInvalid(move, entry, { ...source, currentDraft: occupied }, set.moves || [])).length;
      if (hasProtectPreferredGap(set, source)) protectGapCount += 1;
      if (hasOffRoleFakeOut(set, source)) offRoleFakeOutCount += 1;
      if (hasOffRolePivotMove(set, source)) offRolePivotCount += 1;
      if (hasRoleUnsafeSelfDrop(set, source)) unsafeSelfDropCount += 1;
      if (rules.intent === "hard_tr" && hasHardTrAntiSpeedItem(set) && isRealTrAbuserSet(set)) hardTrBadItemCount += 1;
      if (rules.intent === "hard_tr" && hasHardTrFastModeMoves(set) && !moveKeys.includes("trick room")) hardTrBadMoveCount += 1;
      if (rules.intent === "hard_tr" && hasHardTrSpeedMisalignment(set)) hardTrSpeedIssueCount += 1;
      moveKeys.forEach((move) => moveCounts.set(move, (moveCounts.get(move) || 0) + 1));
    });
    const violations = [];
    let penalty = 0;
    if (weatherModes.length > 1) {
      violations.push({ code: "weather_conflict", text: `Conflicting weather shells detected: ${weatherModes.join(" + ")}.` });
      penalty += 42;
    }
    if (rules.weather && weatherModes.some((mode) => mode !== rules.weather)) {
      violations.push({ code: "off_weather", text: `Off-plan weather is present. Expected only ${rules.weather}.` });
      penalty += 26;
    }
    if (rules.isTrickRoom && trSetterCount > rules.maxTrSetters) {
      violations.push({ code: "extra_tr_setters", text: `Too many Trick Room setters: ${trSetterCount}. Keep this to ${rules.maxTrSetters}.` });
      penalty += (trSetterCount - rules.maxTrSetters) * 22;
    }
    if (!rules.isTrickRoom && trSetterCount > 0 && !rules.hybridSpeed) {
      violations.push({ code: "tr_drift", text: "Trick Room drift detected in a non-TR archetype." });
      penalty += trSetterCount * 22;
    }
    if (rules.isTrickRoom && teamSize >= 3 && trAbuserCount < expectedTrAbusers) {
      violations.push({ code: "low_tr_abusers", text: `Not enough real Trick Room abusers: ${trAbuserCount}/${expectedTrAbusers}.` });
      penalty += (expectedTrAbusers - trAbuserCount) * 18;
    }
    if (rules.intent === "hard_tr" && teamSize >= 4 && trSupportCount < rules.minSupport) {
      violations.push({ code: "low_tr_support", text: `Hard Trick Room needs at least ${rules.minSupport} real support/enabler piece.` });
      penalty += (rules.minSupport - trSupportCount) * 18;
    }
    if (rules.isTrickRoom && tailwindCount > 0 && !rules.hybridSpeed) {
      violations.push({ code: "speed_conflict", text: "Tailwind is conflicting with a dedicated Trick Room shell." });
      penalty += tailwindCount * 24;
    }
    if (rules.isTrickRoom && extraSpeedControlCount > 1 && !rules.hybridSpeed) {
      violations.push({ code: "speed_spam", text: "Too many extra speed-control moves on a Trick Room team." });
      penalty += (extraSpeedControlCount - 1) * 12;
    }
    if (!rules.isTrickRoom && trSetterCount > 0 && tailwindCount > 0 && !rules.hybridSpeed) {
      violations.push({ code: "mixed_speed_modes", text: "Mixed Trick Room and fast-mode speed control detected." });
      penalty += 28;
    }
    if (rules.intent === "hard_tr" && hardTrBadItemCount > 0) {
      violations.push({ code: "anti_tr_items", text: `Hard Trick Room has ${hardTrBadItemCount} anti-TR speed item choice(s).` });
      penalty += hardTrBadItemCount * 28;
    }
    if (rules.intent === "hard_tr" && hardTrBadMoveCount > 0) {
      violations.push({ code: "anti_tr_moves", text: `Hard Trick Room has ${hardTrBadMoveCount} fast-mode speed control slot(s).` });
      penalty += hardTrBadMoveCount * 22;
    }
    if (rules.intent === "hard_tr" && hardTrSpeedIssueCount > 0) {
      violations.push({ code: "tr_speed_misalignment", text: `Hard Trick Room has ${hardTrSpeedIssueCount} slot(s) with speed investment or pace misalignment.` });
      penalty += hardTrSpeedIssueCount * 18;
    }
    if (teamSize >= 3 && attackerCount < expectedAttackers) {
      violations.push({ code: "low_attackers", text: `Not enough real attackers: ${attackerCount}/${expectedAttackers}.` });
      penalty += (expectedAttackers - attackerCount) * 18;
    }
    if ((teamPlan.minCounts?.tailwind_setter || 0) > 0 && teamSize >= 3 && tailwindSetterCount < teamPlan.minCounts.tailwind_setter) {
      violations.push({ code: "low_tailwind_setter", text: `Tailwind plan is missing a real Tailwind setter: ${tailwindSetterCount}/${teamPlan.minCounts.tailwind_setter}.` });
      penalty += (teamPlan.minCounts.tailwind_setter - tailwindSetterCount) * 22;
    }
    if ((teamPlan.minCounts?.speed_control || 0) > 0 && teamSize >= 3 && (tailwindCount + extraSpeedControlCount + trSetterCount) < teamPlan.minCounts.speed_control) {
      violations.push({ code: "low_speed_control", text: `Team is short on planned speed control: ${tailwindCount + extraSpeedControlCount + trSetterCount}/${teamPlan.minCounts.speed_control}.` });
      penalty += (teamPlan.minCounts.speed_control - (tailwindCount + extraSpeedControlCount + trSetterCount)) * 16;
    }
    if ((teamPlan.minCounts?.pivot || 0) > 0 && teamSize >= 4 && pivotCount < teamPlan.minCounts.pivot) {
      violations.push({ code: "low_pivoting", text: `Team lacks pivoting support: ${pivotCount}/${teamPlan.minCounts.pivot}.` });
      penalty += (teamPlan.minCounts.pivot - pivotCount) * 12;
    }
    if ((teamPlan.minCounts?.weather_setter || 0) > 0 && teamSize >= 3 && weatherSetterCount < teamPlan.minCounts.weather_setter) {
      violations.push({ code: "missing_weather_setter", text: `Weather plan is missing a real setter: ${weatherSetterCount}/${teamPlan.minCounts.weather_setter}.` });
      penalty += (teamPlan.minCounts.weather_setter - weatherSetterCount) * 22;
    }
    if ((teamPlan.minCounts?.weather_abuser || 0) > 0 && teamSize >= 4 && weatherAbuserCount < teamPlan.minCounts.weather_abuser) {
      violations.push({ code: "low_weather_abusers", text: `Weather plan lacks real abusers: ${weatherAbuserCount}/${teamPlan.minCounts.weather_abuser}.` });
      penalty += (teamPlan.minCounts.weather_abuser - weatherAbuserCount) * 16;
    }
    if ((teamPlan.minCounts?.anti_meta_tech || 0) > 0 && teamSize >= 4 && antiMetaTechCount < teamPlan.minCounts.anti_meta_tech) {
      violations.push({ code: "low_anti_meta_tech", text: `Anti-meta plan is missing a dedicated disruptive slot.` });
      penalty += 12;
    }
    if (rolelessCount > 0) {
      violations.push({ code: "unclear_roles", text: `${rolelessCount} slot(s) still lack a clear role in the team plan.` });
      penalty += rolelessCount * 14;
    }
    if (teamSize >= 4 && lowConfidenceRoleCount >= Math.max(2, Math.ceil(teamSize / 3))) {
      violations.push({ code: "vague_role_map", text: `${lowConfidenceRoleCount} slot(s) still have low-confidence role assignment.` });
      penalty += lowConfidenceRoleCount * 10;
    }
    if (roleConflictCount > 0) {
      violations.push({ code: "role_conflicts", text: `${roleConflictCount} slot(s) still have conflicting role signals.` });
      penalty += roleConflictCount * 12;
    }
    if (teamSize >= 5 && cleanerCount < 1 && !rules.isTrickRoom) {
      violations.push({ code: "no_cleaner", text: "Team lacks a clear cleaner / closer role." });
      penalty += 14;
    }
    if (pivotCount > 0 && attackerCount < Math.max(2, pivotCount) && teamSize >= 4) {
      violations.push({ code: "pivot_without_targets", text: "Pivoting is present, but there are not enough attackers / closers to support it." });
      penalty += Math.max(1, pivotCount - attackerCount + 1) * 10;
    }
    if (invalidTwoTurnMoveCount > 0) {
      violations.push({ code: "invalid_two_turn_moves", text: `${invalidTwoTurnMoveCount} invalid charge / two-turn move slot(s) are still present.` });
      penalty += invalidTwoTurnMoveCount * 30;
    }
    if (protectGapCount > 0) {
      violations.push({ code: "role_protect_gaps", text: `${protectGapCount} role-sensitive slot(s) are missing Protect.` });
      penalty += protectGapCount * 10;
    }
    if (offRoleFakeOutCount > 0) {
      violations.push({ code: "off_role_fake_out", text: `${offRoleFakeOutCount} Fake Out slot(s) do not match the assigned role plan.` });
      penalty += offRoleFakeOutCount * 12;
    }
    if (offRolePivotCount > 0) {
      violations.push({ code: "off_role_pivoting", text: `${offRolePivotCount} pivot move slot(s) are landing on the wrong role.` });
      penalty += offRolePivotCount * 10;
    }
    if (unsafeSelfDropCount > 0) {
      violations.push({ code: "unsafe_self_drop", text: `${unsafeSelfDropCount} bulky/support slot(s) still carry self-drop attacks.` });
      penalty += unsafeSelfDropCount * 16;
    }
    if (teamSize >= 4 && supportCount > rules.maxSupport) {
      violations.push({ code: "support_spam", text: `Too many passive support slots: ${supportCount}.` });
      penalty += (supportCount - rules.maxSupport) * 16;
    }
    [["icy wind", 1], ["electroweb", 1], ["thunder wave", 1], ["helping hand", 1], ["parting shot", 1]].forEach(([moveKey, limit]) => {
      const count = moveCounts.get(moveKey) || 0;
      if (count > limit) {
        violations.push({ code: "role_duplication", text: `${prettyMoveName(moveKey)} is duplicated too many times (${count}).` });
        penalty += (count - limit) * 10;
      }
    });
    if (rules.hyperOffense && (moveCounts.get("protect") || 0) >= 5) {
      violations.push({ code: "passive_ho", text: "Hyper offense is overloaded with passive Protect usage." });
      penalty += 14;
    }
    const nicheMegaCount = occupied.filter((set) => (teamPlan.nicheMegas || []).includes(normalizeNameKey(set.name))).length;
    if (nicheMegaCount > 0 && !["hard_tr", "soft_tr", "balance", "bulky_offense"].includes(rules.intent)) {
      violations.push({ code: "niche_mega_drift", text: "A niche mega is being used outside its best archetype shell." });
      penalty += nicheMegaCount * 12;
    }
    return {
      isValid: violations.length === 0,
      penalty,
      violations,
      trSetterCount,
      trAbuserCount,
      attackerCount,
      supportCount,
      trSupportCount,
      weatherModes,
      tailwindCount,
      tailwindSetterCount,
      extraSpeedControlCount,
      hardTrBadItemCount,
      hardTrBadMoveCount,
      hardTrSpeedIssueCount,
      pivotCount,
      weatherSetterCount,
      weatherAbuserCount,
      antiMetaTechCount,
      rolelessCount,
      cleanerCount,
      lowConfidenceRoleCount,
      roleConflictCount,
      invalidTwoTurnMoveCount,
      protectGapCount,
      offRoleFakeOutCount,
      offRolePivotCount,
      unsafeSelfDropCount,
      moveCounts,
      rules,
      teamPlan
    };
  }

  async function rebuildDraftSetsStrictly(draft, context) {
    const entries = draft.map((set) => getRosterEntry(set.name)).filter(Boolean);
    if (!entries.length) return draft.map((set) => cloneDraftSet(set));
    const rebuilt = [];
    for (const entry of entries) {
      rebuilt.push(await getOptimizedDraftSetCached(entry, {
        mode: context.mode,
        focus: context.focus,
        notes: context.notes,
        enemyNames: context.enemyNames,
        chosen: entries,
        currentDraft: rebuilt,
        buildCounter: ++aiBuildCounter,
        requestedModes: context.request.requestedModes,
        requestedPressure: context.request.requestedPressure
      }));
    }
    applyItemClauseToDraft(rebuilt);
    return rebuilt;
  }

  async function findValidationReplacement(draft, replaceIndex, context, predicate = null) {
    const currentEntries = draft.map((set) => getRosterEntry(set.name)).filter(Boolean);
    const baseEntries = currentEntries.filter((_, index) => index !== replaceIndex);
    context.currentDraftSnapshot = draft.filter((_, index) => index !== replaceIndex).map((set) => cloneDraftSet(set));
    const rows = await getCandidatesForSlot(context, baseEntries, replaceIndex);
    let best = null;
    for (const row of rows.slice(0, GUIDED_LIVE_CANDIDATE_LIMIT)) {
      const replacementEntries = currentEntries.slice();
      replacementEntries[replaceIndex] = row.entry;
      const replacementDraft = [];
      for (const entry of replacementEntries) {
        replacementDraft.push(await getOptimizedDraftSetCached(entry, {
          mode: context.mode,
          focus: context.focus,
          notes: context.notes,
          enemyNames: context.enemyNames,
          chosen: replacementEntries,
          currentDraft: replacementDraft,
          buildCounter: ++aiBuildCounter,
          requestedModes: context.request.requestedModes,
          requestedPressure: context.request.requestedPressure
        }));
      }
      applyItemClauseToDraft(replacementDraft);
      const validation = buildCompetitiveDraftValidation(replacementDraft, context);
      if (predicate && !predicate(validation, replacementDraft[replaceIndex], row.entry, replacementDraft)) continue;
      const liveEval = await evaluateLiveTeamState(replacementDraft, context, 5);
      const score = liveEval.guidedScore - validation.penalty;
      if (!best || score > best.score) {
        best = { score, draft: replacementDraft, validation };
      }
    }
    return best;
  }

  async function repairDraftByCompetitiveRules(draft, request) {
    const focus = request.focus || "";
    const notes = request.normalizedText || "";
    const enemyNames = [];
    const desiredTypes = inferDesiredTypesFromText(`${focus} ${notes}`.toLowerCase());
    const requestedAnchors = (request.requestedPokemon || []).map((name) => getRosterEntry(name)).filter(Boolean);
    const anchor = request.mode === "pokemon" ? (requestedAnchors[0] || getRosterEntry(focus)) : null;
    const pool = championsRoster.filter((entry) => !entry.name.startsWith("Mega ") || canUseMega(entry));
    const context = buildGuidedBuildContext(request, focus, notes, enemyNames, desiredTypes, pool, anchor);
    let working = await rebuildDraftSetsStrictly(draft, context);
    for (let pass = 0; pass < 6; pass += 1) {
      const validation = buildCompetitiveDraftValidation(working, context);
      if (validation.isValid) break;
      const primary = validation.violations[0];
      let replaceIndex = -1;
      let predicate = null;
      if (primary.code === "extra_tr_setters") {
        replaceIndex = working.findIndex((set) => getSetMoveKeys(set).includes("trick room") && !isRealTrAbuserSet(set));
        if (replaceIndex < 0) replaceIndex = working.findIndex((set) => getSetMoveKeys(set).includes("trick room"));
        predicate = (nextValidation, replacementSet) => !getSetMoveKeys(replacementSet).includes("trick room") && (nextValidation.trSetterCount < validation.trSetterCount);
      } else if (primary.code === "weather_conflict" || primary.code === "off_weather") {
        const preferredWeather = validation.rules.weather || validation.weatherModes[0] || "";
        replaceIndex = working.findIndex((set) => {
          const mode = getSetWeatherMode(set);
          return mode && mode !== preferredWeather;
        });
        predicate = (nextValidation, replacementSet) => {
          const mode = getSetWeatherMode(replacementSet);
          return !mode || mode === preferredWeather;
        };
      } else if (primary.code === "low_tr_abusers" || primary.code === "low_attackers") {
        replaceIndex = working.findIndex((set) => isPassiveSupportSet(set));
        predicate = (nextValidation, replacementSet) => isRealAttackerSet(replacementSet) && (!validation.rules.isTrickRoom || isRealTrAbuserSet(replacementSet) || nextValidation.trAbuserCount > validation.trAbuserCount);
      } else if (primary.code === "low_tailwind_setter") {
        replaceIndex = working.findIndex((set) => !getSetMoveKeys(set).includes("tailwind") && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation, replacementSet) => getSetMoveKeys(replacementSet).includes("tailwind") && nextValidation.tailwindSetterCount > validation.tailwindSetterCount;
      } else if (primary.code === "low_speed_control") {
        replaceIndex = working.findIndex((set) => !getSetMoveKeys(set).some((move) => ["tailwind", "trick room", "icy wind", "electroweb", "thunder wave"].includes(move)) && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation) => nextValidation.penalty < validation.penalty;
      } else if (primary.code === "low_tr_support") {
        replaceIndex = working.findIndex((set) => !getSetMoveKeys(set).includes("trick room") && !isMeaningfulTrSupportSet(set) && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation, replacementSet) => isMeaningfulTrSupportSet(replacementSet) && nextValidation.trSupportCount > validation.trSupportCount;
      } else if (primary.code === "low_pivoting") {
        replaceIndex = working.findIndex((set) => !isPivotSet(set) && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation, replacementSet) => isPivotSet(replacementSet) && nextValidation.pivotCount > validation.pivotCount;
      } else if (primary.code === "missing_weather_setter") {
        replaceIndex = working.findIndex((set) => !getSetWeatherMode(set) && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation, replacementSet) => !!getSetWeatherMode(replacementSet) && nextValidation.weatherSetterCount > validation.weatherSetterCount;
      } else if (primary.code === "low_weather_abusers") {
        replaceIndex = working.findIndex((set) => !isRealAttackerSet(set) || !isWeatherAbuserEntry(getRosterEntry(set.name), validation.rules.weather || validation.rules.intent));
        predicate = (nextValidation, replacementSet) => isWeatherAbuserEntry(getRosterEntry(replacementSet.name), validation.rules.weather || validation.rules.intent) && nextValidation.weatherAbuserCount > validation.weatherAbuserCount;
      } else if (primary.code === "low_anti_meta_tech") {
        replaceIndex = working.findIndex((set) => !isAntiMetaTechSet(set) && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation, replacementSet) => isAntiMetaTechSet(replacementSet) && nextValidation.antiMetaTechCount > validation.antiMetaTechCount;
      } else if (primary.code === "unclear_roles") {
        replaceIndex = working.findIndex((set) => !(isRealAttackerSet(set) || isMeaningfulSupportSet(set) || isPivotSet(set) || getSetWeatherMode(set)) && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation) => nextValidation.rolelessCount < validation.rolelessCount;
      } else if (primary.code === "vague_role_map") {
        replaceIndex = working.findIndex((set) => {
          const profile = getResolvedRoleProfileForSet(set, context);
          return profile?.roleConfidence === "low" && !isPromptRequiredEntry(getRosterEntry(set.name), context);
        });
        predicate = (nextValidation) => nextValidation.lowConfidenceRoleCount < validation.lowConfidenceRoleCount;
      } else if (primary.code === "role_conflicts") {
        replaceIndex = working.findIndex((set) => {
          const profile = getResolvedRoleProfileForSet(set, context);
          return (profile?.roleConflicts || []).length > 0 && !isPromptRequiredEntry(getRosterEntry(set.name), context);
        });
        predicate = (nextValidation) => nextValidation.roleConflictCount < validation.roleConflictCount;
      } else if (primary.code === "no_cleaner") {
        replaceIndex = working.findIndex((set) => {
          const profile = getResolvedRoleProfileForSet(set, context);
          return profile?.primaryRole !== "cleaner" && profile?.secondaryRole !== "cleaner" && !isPromptRequiredEntry(getRosterEntry(set.name), context);
        });
        predicate = (nextValidation, replacementSet) => {
          const profile = getResolvedRoleProfileForSet(replacementSet, context);
          return (profile?.primaryRole === "cleaner" || profile?.secondaryRole === "cleaner") && nextValidation.cleanerCount > validation.cleanerCount;
        };
      } else if (primary.code === "pivot_without_targets") {
        replaceIndex = working.findIndex((set) => {
          const profile = getResolvedRoleProfileForSet(set, context);
          return profile?.primaryRole === "pivot_support" && !isPromptRequiredEntry(getRosterEntry(set.name), context);
        });
        predicate = (nextValidation) => nextValidation.penalty < validation.penalty && nextValidation.attackerCount >= validation.attackerCount;
      } else if (primary.code === "niche_mega_drift") {
        replaceIndex = working.findIndex((set) => (validation.teamPlan?.nicheMegas || []).includes(normalizeNameKey(set.name)) && !isPromptRequiredEntry(getRosterEntry(set.name), context));
        predicate = (nextValidation, replacementSet) => !(validation.teamPlan?.nicheMegas || []).includes(normalizeNameKey(replacementSet.name)) && nextValidation.penalty < validation.penalty;
      } else if (primary.code === "invalid_two_turn_moves") {
        replaceIndex = working.findIndex((set) => {
          const entry = getRosterEntry(set.name);
          return (set.moves || []).some((move) => isTwoTurnMoveInvalid(move, entry, { ...context, currentDraft: working }, set.moves || []));
        });
        predicate = (nextValidation) => nextValidation.invalidTwoTurnMoveCount < validation.invalidTwoTurnMoveCount;
      } else if (primary.code === "role_protect_gaps") {
        replaceIndex = working.findIndex((set) => hasProtectPreferredGap(set, context));
        predicate = (nextValidation) => nextValidation.protectGapCount < validation.protectGapCount;
      } else if (primary.code === "off_role_fake_out") {
        replaceIndex = working.findIndex((set) => hasOffRoleFakeOut(set, context));
        predicate = (nextValidation) => nextValidation.offRoleFakeOutCount < validation.offRoleFakeOutCount;
      } else if (primary.code === "off_role_pivoting") {
        replaceIndex = working.findIndex((set) => hasOffRolePivotMove(set, context));
        predicate = (nextValidation) => nextValidation.offRolePivotCount < validation.offRolePivotCount;
      } else if (primary.code === "unsafe_self_drop") {
        replaceIndex = working.findIndex((set) => hasRoleUnsafeSelfDrop(set, context));
        predicate = (nextValidation) => nextValidation.unsafeSelfDropCount < validation.unsafeSelfDropCount;
      } else if (primary.code === "support_spam") {
        replaceIndex = working.findIndex((set) => isPassiveSupportSet(set));
        predicate = (nextValidation) => nextValidation.supportCount < validation.supportCount;
      } else if (primary.code === "anti_tr_items") {
        replaceIndex = working.findIndex((set) => hasHardTrAntiSpeedItem(set) && isRealTrAbuserSet(set));
        predicate = (nextValidation) => nextValidation.hardTrBadItemCount < validation.hardTrBadItemCount;
      } else if (primary.code === "anti_tr_moves" || primary.code === "tr_speed_misalignment") {
        replaceIndex = working.findIndex((set) => hasHardTrFastModeMoves(set) || hasHardTrSpeedMisalignment(set));
        predicate = (nextValidation) => nextValidation.penalty < validation.penalty;
      } else if (primary.code === "speed_conflict" || primary.code === "mixed_speed_modes" || primary.code === "speed_spam" || primary.code === "tr_drift") {
        replaceIndex = working.findIndex((set) => {
          const moveKeys = getSetMoveKeys(set);
          return moveKeys.includes("tailwind") || moveKeys.includes("trick room") || moveKeys.some((move) => ["icy wind", "electroweb", "thunder wave"].includes(move));
        });
        predicate = (nextValidation) => nextValidation.penalty < validation.penalty;
      } else if (primary.code === "role_duplication") {
        replaceIndex = working.findIndex((set) => {
          const moveKeys = getSetMoveKeys(set);
          return moveKeys.some((move) => (validation.moveCounts.get(move) || 0) > 1 && ["icy wind", "electroweb", "thunder wave", "helping hand", "parting shot"].includes(move));
        });
        predicate = (nextValidation) => nextValidation.penalty < validation.penalty;
      } else if (primary.code === "passive_ho") {
        replaceIndex = working.findIndex((set) => isPassiveSupportSet(set) || (getSetMoveKeys(set).includes("protect") && !isRealAttackerSet(set)));
        predicate = (nextValidation, replacementSet) => isRealAttackerSet(replacementSet) && nextValidation.penalty < validation.penalty;
      }
      if (replaceIndex < 0) break;
      const replacement = await findValidationReplacement(working, replaceIndex, context, predicate);
      if (!replacement?.draft) break;
      working = replacement.draft;
    }
    return working;
  }

  async function enforceSpeciesClauseOnDraft(draft, pool, context) {
    const seen = new Set();
    for (let index = 0; index < draft.length; index += 1) {
      const set = draft[index];
      const familyKey = getSpeciesClauseKey(set.name);
      if (!familyKey) continue;
      if (!seen.has(familyKey)) {
        seen.add(familyKey);
        continue;
      }
      const chosenEntries = draft
        .map((row, rowIndex) => (rowIndex === index ? null : getRosterEntry(row.name)))
        .filter(Boolean);
      const desiredTypes = inferDesiredTypesFromText(`${context.focus || ""} ${context.notes || ""}`.toLowerCase());
      const replacementRows = await Promise.all(
        pool
          .filter((entry) => entry.name !== set.name)
          .filter((entry) => !draft.some((row, rowIndex) => rowIndex !== index && getSpeciesClauseKey(row.name) === getSpeciesClauseKey(entry)))
          .filter((entry) => !violatesSpeciesClause(chosenEntries, entry))
          .map(async (entry) => ({
            entry,
            score: await scoreAiDraftCandidate(
              entry,
              chosenEntries,
              desiredTypes,
              context.enemyNames || [],
              context.mode || "pokemon",
              context.requestedModes || {},
              context.requestedPressure || {}
            )
          }))
      );
      replacementRows.sort((a, b) => b.score - a.score);
      const replacement = replacementRows.find((row) => row.score > -999)?.entry;
      if (!replacement) {
        draft.splice(index, 1);
        index -= 1;
        continue;
      }
      draft[index] = await getOptimizedDraftSetCached(replacement, {
        ...context,
        chosen: chosenEntries,
        currentDraft: draft.slice(0, index),
        buildCounter: ++aiBuildCounter
      });
      seen.add(getSpeciesClauseKey(draft[index].name));
    }
  }

  async function scoreAiDraftCandidate(entry, chosen, desiredTypes, enemyNames, mode, requestedModes = {}, requestedPressure = {}) {
    let score = 45;
    if (violatesSpeciesClause(chosen, entry)) return -999;
    const legalMoves = await getLegalMovesForEntry(entry);
    const abilities = await getPokemonAbilities(entry);
    const trialTeam = [...chosen, entry];
    const averageBaseSpeed = trialTeam.length ? trialTeam.reduce((sum, picked) => sum + (picked.baseSpeed || 0), 0) / trialTeam.length : 0;
    if (isMegaEntry(entry)) {
      const megaCount = chosen.filter((picked) => isMegaEntry(picked)).length;
      if (megaCount >= 2) return -999;
      score -= megaCount * 10;
    }
    if (desiredTypes.some((type) => entry.types.includes(type))) score += 10;
    if (chosen.length && !chosen.some((picked) => picked.types.some((type) => entry.types.includes(type)))) score += 14;
    if (entry.baseSpeed >= 100) score += 6;
    if (hasAnyLegalMove(legalMoves, ["tailwind", "icy wind", "electroweb", "thunder wave"]) && !chosen.some((picked) => picked.baseSpeed >= 100)) score += 8;
    if (requestedModes.trickRoom && hasAnyLegalMove(legalMoves, ["trick room"]) && trialTeam.filter((picked) => picked.baseSpeed <= 65).length >= 2 && averageBaseSpeed <= 70) score += 10;
    if (requestedModes.tailwind && hasAnyLegalMove(legalMoves, ["tailwind"])) score += 18;
    if (requestedModes.trickRoom && hasAnyLegalMove(legalMoves, ["trick room"]) && averageBaseSpeed <= 70) score += 18;
    if (requestedModes.fakeOut && hasAnyLegalMove(legalMoves, ["fake out"])) score += 10;
    if (entry.baseSpeed <= 65 && trialTeam.some((picked) => picked.baseSpeed <= 65) && trialTeam.length >= 4) score += 4;
    if (entry.types.includes("Ghost") || hasAnyAbility(abilities, ["inner focus", "shield dust"])) score += 4;
    if (hasAnyAbility(abilities, ["defiant", "competitive", "contrary", "clear body", "mirror armor"])) score += 6;
    score += scoreWeatherArchetypeFit(entry, chosen);
    const physicalCount = trialTeam.filter((picked) => picked.baseStats[1] >= picked.baseStats[3]).length;
    const specialCount = trialTeam.length - physicalCount;
    score += Math.max(0, 10 - Math.abs(physicalCount - specialCount) * 4);
    const weaknessPenalty = estimateWeaknessPenalty(trialTeam);
    score -= weaknessPenalty * 1.5;
    const offenseBonus = estimateOffensiveCoverageBonus(trialTeam);
    score += offenseBonus;
    if (requestedPressure.counterMeta || (mode === "counter" && !enemyNames.length)) {
      score += scoreMetaKillPressure(entry);
    }
    if (requestedPressure.ohko) {
      score += scoreImmediateDamage(entry, legalMoves);
    }
    if (requestedPressure.damageAnchor && (HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name)) || HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name)) || entry.baseStats[1] >= 120 || entry.baseStats[3] >= 120)) {
      score += 12;
    }
    if (requestedPressure.safeAttacks && hasAnyLegalMove(legalMoves, ["fake out", "follow me", "rage powder", "tailwind", "protect", "parting shot", "icy wind", "electroweb"])) {
      score += 10;
    }
    if (requestedPressure.mindGames) {
      if (normalizeNameKey(entry.name) === "zoroark-hisui" || normalizeNameKey(entry.name) === "zoroark") score += 22;
      if (entry.types.includes("Ghost") || entry.types.includes("Dark")) score += 5;
      if (hasAnyLegalMove(legalMoves, ["u-turn", "parting shot", "taunt", "protect", "substitute"])) score += 5;
    }
    if (LOW_PRIORITY_AI_PICKS.has(normalizeNameKey(entry.name))) score -= 22;
    if ((entry.baseStats || []).reduce((sum, stat) => sum + stat, 0) < 500) score -= 8;
    if (!metaThreats.some((threat) => normalizeNameKey(threat.name) === normalizeNameKey(entry.name))) score -= 12;
    if (requestedPressure.avoidStaples && metaThreats.slice(0, 12).some((threat) => normalizeNameKey(threat.name) === normalizeNameKey(entry.name))) score -= 30;
    if (requestedPressure.avoidStaples && !metaThreats.slice(0, 12).some((threat) => normalizeNameKey(threat.name) === normalizeNameKey(entry.name))) score += 8;
    score += getDraftVarianceBonus(entry.name, contextSafeBuildCounter(mode, chosen));
    if (mode === "counter") {
      const namesToCounter = enemyNames.length ? enemyNames : metaThreats.slice(0, 10).map((threat) => threat.name);
      namesToCounter.forEach((name) => {
        const enemy = getRosterEntry(name);
        if (!enemy) return;
        if (enemy.types.some((type) => getTypeEffectiveness(type, entry.types) < 1)) score += 5;
        if (entry.types.some((type) => enemy.types.some((defType) => getSingleTypeEffectiveness(type, defType) > 1))) score += 6;
      });
    }
    if (mode === "archetype") {
      if (["Whimsicott", "Pelipper", "Sinistcha"].includes(entry.name)) score += 7;
      if (entry.name === "Farigiraf" && requestedModes.trickRoom && averageBaseSpeed <= 70) score += 7;
    }
    if (mode === "pokemon" && chosen.length) {
      const anchor = chosen[0];
      if (anchor.types.some((type) => getTypeEffectiveness(type, entry.types) < 1)) score += 6;
      if (entry.types.some((type) => anchor.types.some((anchorType) => getSingleTypeEffectiveness(type, anchorType) > 1))) score += 2;
    }
    return score;
  }

  function getDraftVarianceBonus(name, buildCounter) {
    const key = normalizeNameKey(name);
    let hash = buildCounter * 17;
    for (let index = 0; index < key.length; index += 1) {
      hash = (hash * 31 + key.charCodeAt(index)) % 9973;
    }
    return (hash % 11) - 5;
  }

  function contextSafeBuildCounter(mode, chosen) {
    return aiBuildCounter + chosen.length + (mode === "counter" ? 3 : mode === "pokemon" ? 2 : 1);
  }

  function hasAnyLegalMove(legalMoves, moveKeys) {
    const normalized = new Set(legalMoves.map((move) => normalizeNameKey(move)));
    return moveKeys.some((move) => normalized.has(move));
  }

  function hasAnyAbility(abilities, abilityKeys) {
    const normalized = new Set(abilities.map((ability) => normalizeNameKey(ability)));
    return abilityKeys.some((ability) => normalized.has(ability));
  }

  function estimateWeaknessPenalty(entries) {
    return Object.keys(TYPE_CHART).reduce((penalty, attackType) => {
      const weakCount = entries.filter((candidate) => getTypeEffectiveness(attackType, candidate.types) > 1).length;
      const answerCount = entries.filter((candidate) => getTypeEffectiveness(attackType, candidate.types) < 1).length;
      if (weakCount >= 3) return penalty + (weakCount - 2) * 7;
      if (weakCount === 2) return penalty + (answerCount ? 0 : 2);
      return penalty;
    }, 0);
  }

  function estimateOffensiveCoverageBonus(entries) {
    const stabTypes = [...new Set(entries.flatMap((candidate) => candidate.types))];
    const uncovered = Object.keys(TYPE_CHART).filter((defenderType) => !stabTypes.some((attackType) => getSingleTypeEffectiveness(attackType, defenderType) > 1));
    return Math.max(0, 18 - uncovered.length * 2);
  }

  function scoreMetaKillPressure(entry) {
    const offenseStat = Math.max(entry.baseStats[1] || 0, entry.baseStats[3] || 0);
    const seHits = metaThreats.slice(0, 10).filter((threat) =>
      entry.types.some((type) => threat.types.some((defType) => getSingleTypeEffectiveness(type, defType) > 1))
    ).length;
    return seHits * 4 + Math.max(0, Math.floor((offenseStat - 100) / 8));
  }

  function scoreImmediateDamage(entry, legalMoves) {
    const offenseProfile = getEntryOffenseProfile(entry);
    const hasBigHit = legalMoves.some((move) => {
      const key = normalizeNameKey(move);
      if (offenseProfile === "physical") {
        return ["close combat", "flare blitz", "earthquake", "kowtow cleave", "dire claw", "dragon claw", "rock slide", "wave crash", "poltergeist", "iron head", "sucker punch"].includes(key);
      }
      if (offenseProfile === "special") {
        return ["heat wave", "draco meteor", "moonblast", "shadow ball", "hydro pump", "thunderbolt", "flash cannon", "sludge bomb", "weather ball", "leaf storm"].includes(key);
      }
      return ["close combat", "draco meteor", "flare blitz", "heat wave", "dragon claw", "hydro pump"].includes(key);
    });
    return hasBigHit ? 12 : 0;
  }

  function inferAiDraftArchetype(focus, notes, chosen) {
    const prompt = normalizeNameKey(`${focus || ""} ${notes || ""}`);
    if (/\banti meta\b|\bcounter meta\b/.test(prompt)) return "anti_meta";
    if (/\brain\b/.test(prompt)) return "rain";
    if (/\bsun\b/.test(prompt)) return "sun";
    if (/\bsand\b/.test(prompt)) return "sand";
    if (/\bsnow\b/.test(prompt)) return "snow";
    if (/\btailwind\b/.test(prompt)) return "tailwind";
    if (/\bhard trick room\b|\bfull trick room\b|\bfullroom\b/.test(prompt)) return "hard_tr";
    if (/\btrick room\b/.test(prompt)) return "soft_tr";
    if (/\bbulky offense\b/.test(prompt)) return "bulky_offense";
    if (/\bfast offense\b|\bhyper offense\b/.test(prompt)) return "fast_offense";
    if (/\bbalance\b|\bbalanced\b/.test(prompt)) return "balance";
    const averageBaseSpeed = chosen.length ? chosen.reduce((sum, entry) => sum + (entry.baseSpeed || 0), 0) / chosen.length : 0;
    const fastCount = chosen.filter((entry) => (entry.baseSpeed || 0) >= 100).length;
    if (fastCount >= 3 || averageBaseSpeed >= 95) return "fast_offense";
    if (averageBaseSpeed >= 80) return "bulky_offense";
    return "balance";
  }

  function buildAiDraftExplanation(mode, focus, notes, chosen, enemyNames, desiredTypes) {
    if (!chosen.length) return "No legal draft could be built from the current request.";
    const megaNames = chosen.filter((entry) => isMegaEntry(entry)).map((entry) => entry.name);
    if (mode === "counter") {
      return `This draft leans into resistances and counter-pressure against ${enemyNames.join(", ") || "the pasted enemy team"}, while still keeping a playable core${megaNames.length ? `. Mega options: ${megaNames.join(" and ")}; only one can Mega Evolve in a game` : ""}.`;
    }
    if (mode === "pokemon") {
      return `This draft is built to support ${focus || chosen[0].name}, adding role compression, speed control, and safer pivots around it${megaNames.length ? `. Mega options: ${megaNames.join(" and ")}; only one can Mega Evolve in a game` : ""}.`;
    }
    const archetype = inferAiDraftArchetype(focus, notes, chosen);
    const typeText = desiredTypes.length ? ` Extra emphasis on ${desiredTypes.join(", ")} coverage.` : "";
    const notesText = notes ? " It keeps your prompt notes in scope." : "";
    const megaText = megaNames.length ? ` Mega options: ${megaNames.join(" and ")}; only one can Mega Evolve in a game.` : "";
    const explanationMap = {
      tailwind: "This draft is built around speed pressure, tempo swings, and early positioning with proactive speed control.",
      hard_tr: "This draft is built as a hard Trick Room shell with setters, slow abusers, and support aimed at protecting the setter.",
      soft_tr: "This draft uses a hybrid slow mode, keeping Trick Room available without giving up flexible game plans outside it.",
      rain: "This draft is built to establish rain quickly and convert that weather into immediate offensive pressure and positioning value.",
      sun: "This draft is built to establish sun, pressure the board immediately, and convert weather turns into strong attacks and support.",
      sand: "This draft is built to enable sand turns and capitalize on chip, durability, and sand-boosted pressure.",
      snow: "This draft uses snow to improve board control, defensive stability, and weather-based pressure.",
      fast_offense: "This draft leans into speed and immediate pressure so it can force tempo from turn one.",
      bulky_offense: "This draft uses sturdy attackers and flexible support so it can trade well without losing offensive momentum.",
      balance: "This draft aims for broad matchup coverage, cleaner pivoting, and enough defensive backbone to stay adaptable.",
      anti_meta: "This draft is tuned to punish common meta threats while still keeping a playable, coherent core.",
      unknown: "This draft aims for a balanced shell that stays flexible across common matchups."
    };
    return `${explanationMap[archetype] || explanationMap.unknown}${typeText}${notesText}${megaText}`;
  }

  function explainDraftSet(set) {
    const moveKeys = (set.moves || []).map((move) => normalizeNameKey(move));
    const notes = [];
    if (moveKeys.includes("fake out")) notes.push("gives the team turn-one tempo");
    if (moveKeys.includes("tailwind")) notes.push("adds fast mode speed control");
    if (moveKeys.includes("trick room")) {
      const currentIntent = window.MBWR_INTENT?.detected_intent;
      notes.push(currentIntent === "hard_tr" || currentIntent === "soft_tr" ? "adds a Trick Room mode" : "offers alternate speed control");
    }
    if (moveKeys.includes("parting shot") || moveKeys.includes("u-turn")) notes.push("keeps momentum moving");
    if (moveKeys.includes("protect")) notes.push("has a safe positioning button");
    if (set.item) notes.push(`uses ${set.item} to support its role`);
    if (set.ability) notes.push(`${set.ability} is the preferred ability here`);
    return notes.length ? notes.slice(0, 3).join(". ") + "." : "Fills a general role slot in the current draft.";
  }

  function canUseMega(entry) {
    return isMegaEntry(entry);
  }

  function isMegaEntry(entry) {
    return Boolean(entry?.name?.startsWith("Mega "));
  }

  function getMegaStoneForEntry(entry) {
    if (!isMegaEntry(entry)) return "";
    if (MEGA_STONE_OVERRIDES[entry.name]) return MEGA_STONE_OVERRIDES[entry.name];
    const stone = `${entry.baseName}ite`;
    if (HARD_LEGAL_ITEMS.includes(stone)) return stone;
    const normalizedBase = normalizeNameKey(entry.baseName || entry.name).replace(/\s+/g, "");
    const fallback = HARD_LEGAL_ITEMS.find((item) => {
      const normalizedItem = normalizeNameKey(item).replace(/\s+/g, "");
      return normalizedItem.endsWith("ite") && (
        normalizedItem.includes(normalizedBase)
        || normalizedItem.includes(normalizedBase.slice(0, Math.max(4, normalizedBase.length - 1)))
        || normalizedItem.includes(normalizedBase.slice(0, Math.max(4, normalizedBase.length - 2)))
      );
    });
    return fallback || "";
  }

  function syncTeamMegaStone(slotIndex) {
    const pokemonControl = document.querySelector(`.team-slot[data-slot="${slotIndex}"]`);
    const itemControl = document.querySelector(`.team-item[data-slot="${slotIndex}"]`);
    const entry = getRosterEntry(pokemonControl?.value || "");
    if (!entry || !itemControl) return;
    const megaStone = getMegaStoneForEntry(entry);
    if (!megaStone) return;
    if (controlHasOption(itemControl, megaStone)) {
      itemControl.value = resolveControlValue(itemControl, megaStone);
    }
  }

  async function buildOptimizedDraftSet(entry, context) {
    const legalMoves = await getLegalMovesForEntry(entry);
    const abilities = await getPokemonAbilities(entry);
    const rawMoves = await chooseOptimizedMoves(entry, legalMoves, context, abilities);
    const item = getSuggestedItem(entry, context, rawMoves);
    const itemSafeMoves = await sanitizeMovesForItem(entry, rawMoves, item, context, legalMoves);
    const damagingMoves = await rankDamagingMoves(entry, legalMoves, getEntryOffenseProfile(entry), inferCoverageTargetsFromContext(context), context.requestedPressure || {}, context);
    const moves = await sanitizeFinalMoveSet(entry, itemSafeMoves, damagingMoves.map((move) => move.name), context);
    const ability = getSuggestedAbility(entry, abilities, context, moves);
    const nature = getSuggestedNature(entry, moves, context);
    const sps = getSuggestedSpSpread(entry, moves, context);
    return {
      name: entry.name,
      item,
      ability,
      nature,
      sps,
      moves
    };
  }

  async function getOptimizedDraftSetCached(entry, context) {
    const key = JSON.stringify({
      name: entry.name,
      mode: context.mode,
      focus: context.focus || "",
      notes: context.notes || "",
      enemies: (context.enemyNames || []).map((name) => normalizeNameKey(name)).sort()
      ,
      buildCounter: context.buildCounter || 0
    });
    if (optimizedSetCache.has(key)) return cloneDraftSet(optimizedSetCache.get(key));
    const set = await buildOptimizedDraftSet(entry, context);
    optimizedSetCache.set(key, set);
    return cloneDraftSet(set);
  }

  function cloneDraftSet(set) {
    return JSON.parse(JSON.stringify(set));
  }

  function applyItemClauseToDraft(draft) {
    const used = new Set();
    draft.forEach((set) => {
      const preferred = set.item || "";
      const normalizedMoves = (set.moves || []).map((move) => normalizeNameKey(move));
      const utilityHeavy = normalizedMoves.filter((move) => ["protect", "fake out", "tailwind", "trick room", "taunt", "helping hand", "icy wind", "electroweb", "parting shot", "will-o-wisp", "thunder wave", "coaching"].includes(move)).length >= 2;
      if (normalizeNameKey(preferred) === "choice scarf" && utilityHeavy) {
        set.item = findUniqueItemForSet({ ...set, item: "" }, used);
        if (set.item) used.add(normalizeNameKey(set.item));
        return;
      }
      if (preferred && !used.has(normalizeNameKey(preferred))) {
        used.add(normalizeNameKey(preferred));
        return;
      }
      const replacement = findUniqueItemForSet(set, used);
      set.item = replacement;
      if (replacement) used.add(normalizeNameKey(replacement));
    });
  }

  function enforceManualItemClause(changedControl) {
    if (!changedControl) return;
    const picked = changedControl.value || "";
    if (!picked) return;
    const normalized = normalizeNameKey(picked);
    const duplicate = Array.from(document.querySelectorAll(".team-item"))
      .find((control) => control !== changedControl && normalizeNameKey(control.value || "") === normalized);
    if (!duplicate) return;
    changedControl.value = "";
    aiBuilderOutput.innerHTML = `<div class="status-note">Item clause active: duplicate ${picked} was cleared from the edited slot.</div>`;
  }

  function findUniqueItemForSet(set, used) {
    const normalizedMoves = (set.moves || []).map((move) => normalizeNameKey(move));
    const hardTrAbuser = isRealTrAbuserSet(set) && !normalizedMoves.some((move) => ["tailwind", "icy wind", "electroweb", "thunder wave"].includes(move));
    const utilityHeavy = normalizedMoves.filter((move) => ["protect", "fake out", "tailwind", "trick room", "taunt", "helping hand", "icy wind", "electroweb", "parting shot", "will-o-wisp", "thunder wave", "coaching"].includes(move)).length >= 2;
    const preferredOrder = [
      getMegaStoneForEntry(getRosterEntry(set.name)),
      "Focus Sash",
      "Leftovers",
      ...(utilityHeavy || hardTrAbuser ? [] : ["Choice Scarf"]),
      "Covert Cloak",
      "Sitrus Berry",
      "Lum Berry",
      ...(hardTrAbuser ? ["Clear Amulet"] : []),
      "Mental Herb",
      "White Herb",
      "Scope Lens",
      "Magnet",
      "Mystic Water",
      "Charcoal",
      "Hard Stone",
      "Dragon Fang",
      "Fairy Feather",
      "Spell Tag",
      "Metal Coat"
    ].filter(Boolean);
    for (const item of preferredOrder) {
      if (legalItems.includes(item) && !used.has(normalizeNameKey(item))) return item;
    }
    const typeEntry = getRosterEntry(set.name);
    const typeOptions = typeEntry ? typeEntry.types.map((type) => ({
      Fire: "Charcoal",
      Water: "Mystic Water",
      Grass: "Miracle Seed",
      Electric: "Magnet",
      Fairy: "Fairy Feather",
      Ghost: "Spell Tag",
      Dragon: "Dragon Fang",
      Rock: "Hard Stone",
      Steel: "Metal Coat",
      Poison: "Poison Barb",
      Flying: "Sharp Beak",
      Bug: "Silver Powder",
      Ground: "Soft Sand",
      Psychic: "Twisted Spoon",
      Normal: "Silk Scarf"
    }[type])).filter(Boolean) : [];
    for (const item of typeOptions) {
      if (legalItems.includes(item) && !used.has(normalizeNameKey(item))) return item;
    }
    return legalItems.find((item) => !used.has(normalizeNameKey(item))) || "";
  }

  function formatSpSummary(sps) {
    return statOrder
      .filter((stat) => (sps?.[stat] || 0) > 0)
      .map((stat) => `${sps[stat]} ${statLabels[stat]}`)
      .join(" / ") || "0 SP";
  }

  function getSuggestedItem(entry, context, moves = []) {
    const megaStone = getMegaStoneForEntry(entry);
    if (megaStone) return megaStone;
    const buildRules = getCompetitiveBuildRules(context);
    const normalizedMoves = moves.map((move) => normalizeNameKey(move));
    const roleProfile = inferSetRoleProfile(entry, context, moves, moves);
    const utilityHeavy = normalizedMoves.filter((move) => ["protect", "fake out", "tailwind", "trick room", "taunt", "helping hand", "icy wind", "electroweb", "parting shot", "will-o-wisp", "thunder wave", "coaching"].includes(move)).length >= 2;
    const hardTrAbuser = buildRules.intent === "hard_tr" && isRealTrAbuserEntry(entry);
    if (shouldPrioritizeFocusSash(entry, context, moves)) return "Focus Sash";
    if (normalizeNameKey(entry.name) === "charizard" && legalItems.includes("Charizardite Y")) return "Charizardite Y";
    if (normalizeNameKey(entry.name) === "raichu" || normalizeNameKey(entry.name) === "raichu-alola") return legalItems.includes("Focus Sash") ? "Focus Sash" : "Magnet";
    if (normalizeNameKey(entry.name) === "scizor") return legalItems.includes("Leftovers") ? "Leftovers" : "Metal Coat";
    if (normalizeNameKey(entry.name) === "kleavor") return legalItems.includes("Hard Stone") ? "Hard Stone" : "Focus Sash";
    if (normalizeNameKey(entry.name) === "hatterene") return legalItems.includes("Mental Herb") ? "Mental Herb" : "Leftovers";
    if (normalizeNameKey(entry.name) === "meowscarada") return legalItems.includes("Focus Sash") ? "Focus Sash" : "Black Glasses";
    if (normalizeNameKey(entry.name) === "dragapult") return legalItems.includes("Focus Sash") ? "Focus Sash" : "Spell Tag";
    if (normalizeNameKey(entry.name) === "kingambit") return legalItems.includes("Black Glasses") ? "Black Glasses" : "Leftovers";
    if (normalizeNameKey(entry.name) === "sneasler") return legalItems.includes("White Herb") ? "White Herb" : (legalItems.includes("Focus Sash") ? "Focus Sash" : "Mental Herb");
    if (roleProfile.supportOrPivot) {
      if (normalizedMoves.includes("trick room")) return legalItems.includes("Mental Herb") ? "Mental Herb" : (legalItems.includes("Sitrus Berry") ? "Sitrus Berry" : "Leftovers");
      if (normalizedMoves.includes("fake out")) return legalItems.includes("Sitrus Berry") ? "Sitrus Berry" : (legalItems.includes("Covert Cloak") ? "Covert Cloak" : "Leftovers");
      if (roleProfile.wantsPivotMove) return legalItems.includes("Sitrus Berry") ? "Sitrus Berry" : (legalItems.includes("Leftovers") ? "Leftovers" : (legalItems.includes("Covert Cloak") ? "Covert Cloak" : ""));
      return legalItems.includes("Leftovers") ? "Leftovers" : (legalItems.includes("Sitrus Berry") ? "Sitrus Berry" : "");
    }
    if (roleProfile.primaryRole === "bulky_special_attacker" || roleProfile.primaryRole === "bulky_physical_attacker") {
      const preferredTypeItem = entry.types.includes("Water") ? "Mystic Water"
        : entry.types.includes("Dark") ? "Black Glasses"
        : entry.types.includes("Dragon") ? "Dragon Fang"
        : entry.types.includes("Ghost") ? "Spell Tag"
        : entry.types.includes("Fairy") ? "Fairy Feather"
        : "";
      if (roleProfile.wantsProtect && legalItems.includes("Leftovers")) return "Leftovers";
      if (preferredTypeItem && legalItems.includes(preferredTypeItem)) return preferredTypeItem;
      if (legalItems.includes("Leftovers")) return "Leftovers";
    }
    if (hardTrAbuser) {
      if (normalizedMoves.includes("protect") && legalItems.includes("Leftovers")) return "Leftovers";
      if (legalItems.includes("Clear Amulet")) return "Clear Amulet";
      if (legalItems.includes("White Herb")) return "White Herb";
      if (legalItems.includes("Black Glasses") && entry.types.includes("Dark")) return "Black Glasses";
      if (legalItems.includes("Mystic Water") && entry.types.includes("Water")) return "Mystic Water";
      if (legalItems.includes("Hard Stone") && entry.types.includes("Rock")) return "Hard Stone";
      return legalItems.includes("Leftovers") ? "Leftovers" : (legalItems[0] || "");
    }
    if (HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))) return (!utilityHeavy && legalItems.includes("Choice Scarf") && entry.baseSpeed >= 95 && roleProfile.pureOffense) ? "Choice Scarf" : (legalItems.includes("Spell Tag") && entry.types.includes("Ghost") ? "Spell Tag" : (legalItems.includes("Fairy Feather") && entry.types.includes("Fairy") ? "Fairy Feather" : "Leftovers"));
    if (HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))) return legalItems.includes("Focus Sash") && entry.baseSpeed >= 95 ? "Focus Sash" : ((!utilityHeavy && legalItems.includes("Choice Scarf") && roleProfile.pureOffense) ? "Choice Scarf" : "Leftovers");
    if (context.mode === "counter") {
      if (entry.types.includes("Ghost")) return "Focus Sash";
      if (entry.types.includes("Steel")) return "Leftovers";
    }
    if (normalizedMoves.includes("trick room")) return legalItems.includes("Mental Herb") ? "Mental Herb" : "Sitrus Berry";
    if (normalizedMoves.includes("fake out")) return legalItems.includes("Covert Cloak") ? "Covert Cloak" : "Sitrus Berry";
    if (normalizedMoves.some((move) => ["tailwind", "icy wind", "electroweb"].includes(move))) return legalItems.includes("Focus Sash") ? "Focus Sash" : "Sitrus Berry";
    if (entry.name === "Garchomp") return !utilityHeavy && legalItems.includes("Choice Scarf") ? "Choice Scarf" : "Yache Berry";
    if (entry.baseSpeed >= 110 && !entry.types.includes("Steel")) return legalItems.includes("Focus Sash") ? "Focus Sash" : "";
    if (entry.types.includes("Rock")) return legalItems.includes("Hard Stone") ? "Hard Stone" : "";
    if (entry.types.includes("Dragon")) return legalItems.includes("Dragon Fang") ? "Dragon Fang" : "";
    if (entry.types.includes("Fire")) return legalItems.includes("Charcoal") ? "Charcoal" : "";
    if (entry.types.includes("Water")) return legalItems.includes("Mystic Water") ? "Mystic Water" : "";
    if (entry.types.includes("Electric")) return legalItems.includes("Magnet") ? "Magnet" : "";
    if (entry.types.includes("Fairy")) return legalItems.includes("Fairy Feather") ? "Fairy Feather" : "";
    if (entry.types.includes("Grass")) return legalItems.includes("Miracle Seed") ? "Miracle Seed" : "";
    if (entry.types.includes("Ghost")) return legalItems.includes("Spell Tag") ? "Spell Tag" : "";
    if (entry.types.includes("Steel")) return legalItems.includes("Metal Coat") ? "Metal Coat" : "";
    if (entry.baseStats[1] >= 120 && !utilityHeavy && legalItems.includes("Choice Scarf") && roleProfile.pureOffense) return "Choice Scarf";
    return legalItems.includes("Leftovers") ? "Leftovers" : (legalItems[0] || "");
  }

  function shouldPrioritizeFocusSash(entry, context, moves) {
    if (!legalItems.includes("Focus Sash")) return false;
    if (isMegaEntry(entry)) return false;
    const key = normalizeNameKey(entry.name);
    const bulk = (entry.baseStats[0] || 0) + (entry.baseStats[2] || 0) + (entry.baseStats[4] || 0);
    const speed = entry.baseSpeed || 0;
    const moveKeys = moves.map((move) => normalizeNameKey(move));
    const utilityLead = moveKeys.some((move) => ["tailwind", "taunt", "encore", "follow me", "fake out", "beat up", "trick room"].includes(move));
    const poisonWeak = entry.types.includes("Grass") && entry.types.includes("Fairy");
    if (FOCUS_SASH_PRIORITY.has(key)) return true;
    if (poisonWeak && speed >= 100) return true;
    return bulk <= 220 && (speed >= 100 || utilityLead);
  }

  function getSuggestedAbility(entry, abilities, context, moves = []) {
    const weatherContext = inferMoveRequirementContext(entry, context, moves);
    const merged = [...new Set([...(entry.abilities || []), ...abilities])];
    if (entry.name === "Charizard" && merged.some((ability) => normalizeNameKey(ability) === "blaze") && legalItems.includes("Charizardite Y")) return "Blaze";
    if (entry.name === "Raichu" && merged.some((ability) => normalizeNameKey(ability) === "lightning rod")) return "Lightning Rod";
    if (entry.name === "Raichu-Alola" && merged.some((ability) => normalizeNameKey(ability) === "surge surfer")) return "Surge Surfer";
    if (entry.name === "Garchomp" && merged.some((ability) => normalizeNameKey(ability) === "rough skin")) return "Rough Skin";
    if (entry.name === "Sneasler" && merged.some((ability) => normalizeNameKey(ability) === "unburden")) return "Unburden";
    if (entry.name === "Scizor" && merged.some((ability) => normalizeNameKey(ability) === "technician")) return "Technician";
    if (entry.name === "Kleavor" && merged.some((ability) => normalizeNameKey(ability) === "sharpness")) return "Sharpness";
    if (entry.name === "Incineroar" && merged.some((ability) => normalizeNameKey(ability) === "intimidate")) return "Intimidate";
    if (entry.name === "Primarina" && merged.some((ability) => normalizeNameKey(ability) === "liquid voice")) return "Liquid Voice";
    if (entry.name === "Polteageist" && merged.some((ability) => normalizeNameKey(ability) === "cursed body")) return "Cursed Body";
    if (entry.name === "Infernape" && merged.some((ability) => normalizeNameKey(ability) === "iron fist")) return "Iron Fist";
    if (entry.name === "Serperior" && merged.some((ability) => normalizeNameKey(ability) === "contrary")) return "Contrary";
    if (entry.name === "Greninja" && merged.some((ability) => normalizeNameKey(ability) === "protean")) return "Protean";
    if (entry.name === "Lucario" && merged.some((ability) => normalizeNameKey(ability) === "justified")) return "Justified";
    if (entry.name === "Ninetales-Alola" && merged.some((ability) => normalizeNameKey(ability) === "snow warning")) return "Snow Warning";
    if (entry.name === "Pelipper" && merged.some((ability) => normalizeNameKey(ability) === "drizzle")) return "Drizzle";
    if (entry.name === "Whimsicott" && merged.some((ability) => normalizeNameKey(ability) === "prankster")) return "Prankster";
    if (entry.name === "Farigiraf" && merged.some((ability) => normalizeNameKey(ability) === "armor tail")) return "Armor Tail";
    if (entry.name === "Hatterene" && merged.some((ability) => normalizeNameKey(ability) === "magic bounce")) return "Magic Bounce";
    if (entry.name === "Meowscarada" && merged.some((ability) => normalizeNameKey(ability) === "protean")) return "Protean";
    const wantsTrickRoom = moves.some((move) => normalizeNameKey(move) === "trick room");
    if (wantsTrickRoom) {
      const nonPrankster = merged.find((ability) => normalizeNameKey(ability) !== "prankster");
      if (nonPrankster) return nonPrankster;
    }
    if (weatherContext.sand) {
      const sandAbility = merged.find((ability) => ["sand rush", "sand stream", "sand force"].includes(normalizeNameKey(ability)));
      if (sandAbility) return sandAbility;
    }
    if (weatherContext.snow) {
      const snowAbility = merged.find((ability) => ["snow warning", "snow cloak"].includes(normalizeNameKey(ability)));
      if (snowAbility) return snowAbility;
    }
    if (entry.abilities?.length) return entry.abilities[0];
    if (!abilities.length) return "";
    const preferred = ["intimidate", "technician", "adaptability", "pixilate", "mold breaker", "magic bounce", "prankster", "clear body", "defiant", "competitive", "multiscale", "armor tail", "contrary", "unburden"];
    const match = abilities.find((ability) => preferred.includes(normalizeNameKey(ability)));
    return match || abilities[0];
  }

  async function chooseOptimizedMoves(entry, legalMoves, context, abilities = []) {
    const normalizedPool = new Map(legalMoves.map((move) => [normalizeNameKey(move), move]));
    const picked = [];
    const chosenEntries = (context.chosen || []).filter(Boolean);
    const teamFastCount = chosenEntries.filter((candidate) => candidate.baseSpeed >= 100).length;
    const teamSlowCount = chosenEntries.filter((candidate) => candidate.baseSpeed <= 65).length;
    const wantsTrickRoom = !!context?.requestedModes?.trickRoom && normalizedPool.has("trick room");
    const wantsSpeedControl = teamFastCount >= 2 || context.mode === "counter";
    const weatherContext = inferMoveRequirementContext(entry, context, legalMoves);
    const currentDraft = context.currentDraft || [];
    const currentSupportCount = currentDraft.reduce((sum, set) => sum + set.moves.filter((move) => ["helping hand", "tailwind", "trick room", "icy wind", "electroweb"].includes(normalizeNameKey(move))).length, 0);
    const currentHelpingHandCount = currentDraft.reduce((sum, set) => sum + set.moves.filter((move) => normalizeNameKey(move) === "helping hand").length, 0);
    const offenseProfile = getEntryOffenseProfile(entry);
    const forceSupport = context.forceSupport === true;
    const preferredTypeTargets = inferCoverageTargetsFromContext(context);
    const requestedModes = context.requestedModes || {};
    const requestedPressure = context.requestedPressure || {};
    const hasPranksterAbility = abilities.some((ability) => normalizeNameKey(ability) === "prankster");
    const moveContext = inferMoveRequirementContext(entry, context, legalMoves);
    const buildRules = getCompetitiveBuildRules(context);
    const roleProfile = inferSetRoleProfile(entry, context, [], legalMoves);
    const draftMoveCounts = new Map();
    currentDraft.forEach((set) => {
      getSetMoveKeys(set).forEach((move) => draftMoveCounts.set(move, (draftMoveCounts.get(move) || 0) + 1));
    });
    const currentTrSetterCount = currentDraft.filter((set) => getSetMoveKeys(set).includes("trick room")).length;
    const currentTailwindCount = currentDraft.filter((set) => getSetMoveKeys(set).includes("tailwind")).length;
    const currentSpeedSupportCount = currentDraft.filter((set) => getSetMoveKeys(set).some((move) => ["icy wind", "electroweb", "thunder wave"].includes(move))).length;
    const currentWeatherModes = inferTeamWeatherProfile(currentDraft).modes;
    const hardTrSupportCount = currentDraft.filter((set) => isMeaningfulTrSupportSet(set)).length;
    const addMove = (name) => {
      const found = normalizedPool.get(normalizeNameKey(name));
      if (!found || picked.includes(found) || picked.length >= 4) return;
      if (!isMoveUsefulInCurrentWeather(found, moveContext)) return;
      if (isMoveContextuallyInvalid(entry, found, context, legalMoves)) return;
      if (!isMoveSafeForCurrentTeam(entry, found, context)) return;
      const foundKey = normalizeNameKey(found);
      if (foundKey === "trick room" && hasPranksterAbility) return;
      if (buildRules.intent === "hard_tr" && !buildRules.hybridSpeed && ["icy wind", "electroweb", "tailwind", "thunder wave"].includes(foundKey)) return;
      if (foundKey === "trick room") {
        if (!buildRules.isTrickRoom) return;
        if (currentTrSetterCount + picked.filter((move) => normalizeNameKey(move) === "trick room").length >= buildRules.maxTrSetters) return;
      }
      if (foundKey === "tailwind") {
        if (buildRules.isTrickRoom && !buildRules.hybridSpeed) return;
        if (!buildRules.isTailwind && !buildRules.hybridSpeed && !requestedModes.tailwind) return;
        if (currentTailwindCount + picked.filter((move) => normalizeNameKey(move) === "tailwind").length >= 1 && !buildRules.hybridSpeed) return;
      }
      if (["icy wind", "electroweb", "thunder wave"].includes(foundKey)) {
        if (buildRules.isTrickRoom && !buildRules.hybridSpeed && currentSpeedSupportCount + picked.filter((move) => ["icy wind", "electroweb", "thunder wave"].includes(normalizeNameKey(move))).length >= 1) return;
        if ((draftMoveCounts.get(foundKey) || 0) >= 1) return;
      }
      if (["rain dance", "sunny day", "sandstorm", "snowscape"].includes(foundKey) && currentWeatherModes.length) {
        const forcedWeather = buildRules.weather || currentWeatherModes[0];
        const moveWeather = foundKey === "rain dance" ? "rain" : foundKey === "sunny day" ? "sun" : foundKey === "sandstorm" ? "sand" : "snow";
        if (forcedWeather && moveWeather !== forcedWeather) return;
      }
      if (buildRules.hyperOffense && getSupportMoveKeySet().has(foundKey) && foundKey !== "protect" && picked.filter((move) => getSupportMoveKeySet().has(normalizeNameKey(move)) && normalizeNameKey(move) !== "fake out").length >= 1 && !["trick room", "tailwind"].includes(foundKey)) return;
      if (foundKey === "fake out" && !roleProfile.wantsFakeOut) return;
      if (PIVOT_MOVE_KEYS.has(foundKey) && !roleProfile.wantsPivotMove && roleProfile.pureOffense) return;
      if (SELF_DROP_MOVE_KEYS.has(foundKey) && roleProfile.avoidSelfDrop) return;
      if (foundKey === "quick guard" && picked.some((move) => normalizeNameKey(move) === "protect")) return;
      if (foundKey === "protect" && picked.some((move) => normalizeNameKey(move) === "quick guard")) {
        const quickGuardIndex = picked.findIndex((move) => normalizeNameKey(move) === "quick guard");
        if (quickGuardIndex >= 0) picked.splice(quickGuardIndex, 1);
      }
      picked.push(found);
    };
    const supportPriority = getRoleAwareSupportPriority(entry, roleProfile);
    const stabAttackPriority = getStabPriorityMoves(entry, offenseProfile);
    getRoleAwareSpeciesMovePriority(entry, roleProfile).forEach(addMove);
    if (normalizeNameKey(entry.name) === "sneasler") {
      ["Dire Claw", "Close Combat", "Fake Out", "Protect", "Coaching", "Rock Tomb", "Throat Chop", "Rock Slide"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "raichu") {
      ["Electroweb", "Thunderbolt", "Volt Switch", "Fake Out", "Protect", "Nuzzle"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "raichu-alola") {
      ["Electroweb", "Thunderbolt", "Volt Switch", "Psychic", "Encore", "Protect"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "kleavor") {
      ["Stone Axe", "X-Scissor", "U-turn", "Protect", "Rock Slide", "Night Slash"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "whimsicott") {
      ["Tailwind", "Protect", "Taunt", "Moonblast", "Encore", "Helping Hand"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "charizard" || normalizeNameKey(entry.name) === "mega charizard y") {
      ["Heat Wave", "Flamethrower", "Protect", "Air Slash", "Weather Ball", "Dragon Pulse"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "hatterene") {
      ["Trick Room", "Psychic", "Dazzling Gleam", "Protect", "Mystical Fire", "Life Dew"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "meowscarada") {
      ["Flower Trick", "Knock Off", "U-turn", "Protect", "Sucker Punch", "Triple Axel", "Taunt"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "dragapult") {
      const useDragonDarts = (aiBuildCounter % 2) === 0;
      (useDragonDarts
        ? ["Dragon Darts", "Phantom Force", "Dragon Dance", "Protect", "Sucker Punch", "U-turn"]
        : ["Dragon Claw", "Phantom Force", "Dragon Dance", "Protect", "Sucker Punch", "U-turn"]
      ).forEach(addMove);
      ["Shadow Ball", "Draco Meteor", "Flamethrower", "Thunderbolt", "Protect", "Will-O-Wisp"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "scizor") {
      ["U-turn", "Bullet Punch", "Protect", "Dual Wingbeat", "Close Combat", "Swords Dance"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "polteageist") {
      ["Trick Room", "Shadow Ball", "Protect", "Will-O-Wisp", "Hex"].forEach(addMove);
    }
    if (normalizeNameKey(entry.name) === "mega slowbro" || normalizeNameKey(entry.name) === "slowbro") {
      ["Trick Room", "Scald", "Psychic", "Ice Beam", "Protect", "Slack Off"].forEach(addMove);
    }
    if (requestedModes.tailwind) addMove("Tailwind");
    if (requestedModes.trickRoom) addMove("Trick Room");
    if (requestedModes.fakeOut) addMove("Fake Out");
    if (wantsTrickRoom) addMove("Trick Room");
    if (wantsSpeedControl && !(buildRules.intent === "hard_tr" && !buildRules.hybridSpeed)) ["Tailwind", "Icy Wind", "Electroweb", "Thunder Wave"].forEach(addMove);
    if (forceSupport) {
      ["Protect", "Fake Out", "Taunt", "Will-O-Wisp", "Parting Shot", "Encore", "Disable", "Follow Me", "Rage Powder", "Helping Hand"].forEach(addMove);
    }
    supportPriority.forEach(addMove);
    if (buildRules.intent === "hard_tr" && hardTrSupportCount < buildRules.minSupport) {
      ["Fake Out", "Rage Powder", "Follow Me", "Helping Hand", "Parting Shot", "Taunt"].forEach(addMove);
    }
    if (currentHelpingHandCount < 1 && currentSupportCount < 4 && canUseHelpingHand(entry, offenseProfile)) addMove("Helping Hand");
    stabAttackPriority.forEach(addMove);
    if (context.mode === "counter") {
      ["Protect", "Taunt", "Will-O-Wisp", "Icy Wind", "Fake Out"].forEach(addMove);
    }
    if (context.mode === "archetype") {
      ["Tailwind", "Protect", "Substitute", "Swords Dance", "Nasty Plot"].forEach(addMove);
    }
    if (context.mode === "pokemon") {
      ["Protect", "Tailwind", "Parting Shot"].forEach(addMove);
    }
    const damagingMoves = await rankDamagingMoves(entry, legalMoves, offenseProfile, preferredTypeTargets, requestedPressure, context);
    damagingMoves.forEach((move) => addMove(move.name));
    return await finalizeMoveSet(entry, picked.slice(0, 4), damagingMoves.map((move) => move.name), forceSupport, context);
  }

  async function finalizeMoveSet(entry, pickedMoves, damagingMovePool, forceSupport = false, context = {}) {
    const supportMoveKeys = getSupportMoveKeySet();
    const buildRules = getCompetitiveBuildRules(context);
    const roleProfile = inferSetRoleProfile(entry, { ...context, forceSupport }, pickedMoves, [...pickedMoves, ...damagingMovePool]);
    const isSupport = forceSupport || SUPPORT_ROLE_LOCKS.has(normalizeNameKey(entry.name)) || (!HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name))
      && !HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))
      && !HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))
      && ((entry.baseStats[1] || 0) < 115 && (entry.baseStats[3] || 0) < 115));
    const damagingPicked = pickedMoves.filter((move) => !supportMoveKeys.has(normalizeNameKey(move)) || normalizeNameKey(move) === "fake out");
    const supportPicked = pickedMoves.filter((move) => supportMoveKeys.has(normalizeNameKey(move)) && normalizeNameKey(move) !== "fake out");
    const remainingDamaging = damagingMovePool.filter((move) => !damagingPicked.includes(move));

    if (isSupport) {
      while (damagingPicked.length < 1 && remainingDamaging.length) {
        damagingPicked.push(remainingDamaging.shift());
      }
      const supportLimit = buildRules.hyperOffense ? 1 : 3;
      const finalMoves = [...supportPicked.slice(0, supportLimit), ...damagingPicked.slice(0, buildRules.hyperOffense ? 3 : 2)].slice(0, 4);
      while (finalMoves.length < 4 && remainingDamaging.length) {
        const nextDamage = remainingDamaging.shift();
        if (nextDamage && !finalMoves.includes(nextDamage)) finalMoves.push(nextDamage);
      }
      while (finalMoves.length < 4 && supportPicked.length) {
        const nextSupport = supportPicked.shift();
        if (nextSupport && !finalMoves.includes(nextSupport)) finalMoves.push(nextSupport);
      }
      let diversifiedSupport = await diversifyMoveTypes(finalMoves.slice(0, 4), damagingMovePool, entry);
      diversifiedSupport = enforceSpeciesRoleCorrections(entry, diversifiedSupport, damagingMovePool, "support");
      diversifiedSupport = await enforceRoleProfileMoveCorrections(entry, diversifiedSupport, damagingMovePool, roleProfile, context);
      while (diversifiedSupport.length < 4 && remainingDamaging.length) {
        const nextDamage = remainingDamaging.shift();
        if (nextDamage && !diversifiedSupport.includes(nextDamage)) diversifiedSupport.push(nextDamage);
      }
      return await sanitizeFinalMoveSet(entry, diversifiedSupport.slice(0, 4), damagingMovePool, context);
    }

    while (damagingPicked.length < (buildRules.hyperOffense ? 3 : 3) && remainingDamaging.length) {
      damagingPicked.push(remainingDamaging.shift());
    }
    const protect = pickedMoves.find((move) => normalizeNameKey(move) === "protect");
    const finalMoves = [...damagingPicked.slice(0, 4)];
    if (protect && finalMoves.length < 4) finalMoves.push(protect);
    while (finalMoves.length < 4 && supportPicked.length) {
      const nextSupport = supportPicked.shift();
      if (nextSupport && !finalMoves.includes(nextSupport)) finalMoves.push(nextSupport);
    }
    if (roleProfile.wantsProtect && !roleProfile.canDropProtect && !finalMoves.some((move) => normalizeNameKey(move) === "protect")) {
      finalMoves.push("Protect");
    }
    const diversified = await diversifyMoveTypes(finalMoves.slice(0, 4), damagingMovePool, entry);
    const mixedSafe = await enforceMixedLockMoveCap(entry, diversified, damagingMovePool);
    let corrected = enforceSpeciesRoleCorrections(entry, mixedSafe, damagingMovePool, "attacker");
    corrected = await enforceRoleProfileMoveCorrections(entry, corrected, damagingMovePool, roleProfile, context);
    const refillPool = damagingMovePool.filter((move) => !corrected.includes(move));
    while (corrected.length < 4 && refillPool.length) {
      const nextDamage = refillPool.shift();
      if (nextDamage && !corrected.includes(nextDamage)) corrected.push(nextDamage);
    }
    return await sanitizeFinalMoveSet(entry, corrected.slice(0, 4), damagingMovePool, context);
  }

  async function sanitizeFinalMoveSet(entry, moves, damagingMovePool, context = {}) {
    const result = [];
    const roleProfile = inferSetRoleProfile(entry, context, moves, [...moves, ...damagingMovePool]);
    const replacementPool = [
      ...damagingMovePool,
      ...getStabPriorityMoves(entry, getEntryOffenseProfile(entry)),
      "Protect",
      "Fake Out",
      "Parting Shot",
      "Helping Hand",
      "Taunt",
      "Will-O-Wisp"
    ].filter(Boolean);
    const tryAddReplacement = () => {
      for (const candidate of replacementPool) {
        if (!candidate || result.includes(candidate)) continue;
        if (isMoveContextuallyInvalid(entry, candidate, context, replacementPool)) continue;
        const key = normalizeNameKey(candidate);
        if (RECHARGE_OR_BAD_COMMIT_MOVES.has(key)) continue;
        if (STRONGLY_DISCOURAGED_MOVES.has(key)) continue;
        if (SELF_DROP_MOVE_KEYS.has(key) && roleProfile.avoidSelfDrop) continue;
        if (key === "fake out" && !roleProfile.wantsFakeOut) continue;
        if (PIVOT_MOVE_KEYS.has(key) && !roleProfile.wantsPivotMove && roleProfile.pureOffense) continue;
        result.push(candidate);
        return true;
      }
      return false;
    };
    (moves || []).forEach((move) => {
      if (!move || result.includes(move)) return;
      if (isMoveContextuallyInvalid(entry, move, context, replacementPool)) return;
      const key = normalizeNameKey(move);
      if (SELF_DROP_MOVE_KEYS.has(key) && roleProfile.avoidSelfDrop) return;
      if (key === "fake out" && !roleProfile.wantsFakeOut) return;
      if (PIVOT_MOVE_KEYS.has(key) && !roleProfile.wantsPivotMove && roleProfile.pureOffense) return;
      result.push(move);
    });
    if (roleProfile.dislikesRedundantVoiceWater && result.includes("Sparkling Aria") && result.includes("Hyper Voice")) {
      const remove = result.indexOf("Hyper Voice");
      if (remove >= 0) result.splice(remove, 1);
    }
    if (roleProfile.wantsProtect && !roleProfile.canDropProtect && !result.some((move) => normalizeNameKey(move) === "protect")) {
      const replaceIndex = result.findIndex((move) => {
        const key = normalizeNameKey(move);
        return key !== "protect" && !entry.types.some((type) => key.includes(type.toLowerCase())) && !POSITIONING_MOVE_KEYS.has(key);
      });
      if (replaceIndex >= 0) result.splice(replaceIndex, 1, "Protect");
      else if (!result.includes("Protect")) result.push("Protect");
    }
    while (result.length < 4 && tryAddReplacement()) {}
    return result.slice(0, 4);
  }

  async function enforceRoleProfileMoveCorrections(entry, moves, damagingMovePool, roleProfile, context = {}) {
    let result = [...moves];
    const fallbackPool = [...new Set([
      ...damagingMovePool,
      ...getStabPriorityMoves(entry, getEntryOffenseProfile(entry)),
      ...getRoleAwareSpeciesMovePriority(entry, roleProfile),
      ...getRoleAwareSupportPriority(entry, roleProfile)
    ])];
    const replaceFirst = (predicate) => {
      const index = result.findIndex((move) => predicate(normalizeNameKey(move), move));
      if (index < 0) return false;
      for (const candidate of fallbackPool) {
        const candidateKey = normalizeNameKey(candidate);
        if (!candidate || result.includes(candidate)) continue;
        if (isMoveContextuallyInvalid(entry, candidate, context, fallbackPool)) continue;
        if (SELF_DROP_MOVE_KEYS.has(candidateKey) && roleProfile.avoidSelfDrop) continue;
        if (candidateKey === "fake out" && !roleProfile.wantsFakeOut) continue;
        if (PIVOT_MOVE_KEYS.has(candidateKey) && !roleProfile.wantsPivotMove && roleProfile.pureOffense) continue;
        result.splice(index, 1, candidate);
        return true;
      }
      return false;
    };
    while (result.some((move) => SELF_DROP_MOVE_KEYS.has(normalizeNameKey(move)) && roleProfile.avoidSelfDrop)) {
      if (!replaceFirst((key) => SELF_DROP_MOVE_KEYS.has(key))) break;
    }
    while (result.some((move) => normalizeNameKey(move) === "fake out") && !roleProfile.wantsFakeOut) {
      if (!replaceFirst((key) => key === "fake out")) break;
    }
    while (result.some((move) => PIVOT_MOVE_KEYS.has(normalizeNameKey(move))) && !roleProfile.wantsPivotMove && roleProfile.pureOffense) {
      if (!replaceFirst((key) => PIVOT_MOVE_KEYS.has(key))) break;
    }
    if (roleProfile.dislikesRedundantVoiceWater && result.includes("Sparkling Aria") && result.includes("Hyper Voice")) {
      if (!replaceFirst((key) => key === "hyper voice")) {
        const idx = result.findIndex((move) => normalizeNameKey(move) === "hyper voice");
        if (idx >= 0) result.splice(idx, 1);
      }
    }
    if (roleProfile.wantsProtect && !roleProfile.canDropProtect && !result.some((move) => normalizeNameKey(move) === "protect")) {
      if (!result.includes("Protect")) {
        if (!replaceFirst((key) => !POSITIONING_MOVE_KEYS.has(key) && !entry.types.some((type) => key.includes(type.toLowerCase())))) {
          result.push("Protect");
        }
      }
    }
    return result.slice(0, 4);
  }

  function enforceSpeciesRoleCorrections(entry, moves, damagingMovePool, roleMode) {
    const key = normalizeNameKey(entry.name);
    let result = [...moves];
    const replaceMove = (badMoves, preferredMoves) => {
      const badIndex = result.findIndex((move) => badMoves.includes(normalizeNameKey(move)));
      if (badIndex < 0) return;
      const replacement = preferredMoves.find((move) => !result.includes(move)) || damagingMovePool.find((move) => preferredMoves.includes(move) && !result.includes(move));
      if (replacement) result.splice(badIndex, 1, replacement);
    };
    if (key === "dragapult") {
      replaceMove(["body slam"], ["Protect", "Dragon Darts", "Dragon Claw", "Shadow Ball"]);
    }
    if (key === "zoroark-hisui") {
      const preferred = ["Hyper Voice", "Shadow Ball", "Dark Pulse", "Protect", "Nasty Plot", "Will-O-Wisp", "Taunt"];
      preferred.forEach((move) => {
        if (result.length < 4 && !result.includes(move) && (damagingMovePool.includes(move) || preferred.includes(move))) result.push(move);
      });
    }
    if (key === "kingambit") {
      replaceMove(["throat chop"], ["Kowtow Cleave", "Protect", "Sucker Punch", "Iron Head"]);
      if (!result.includes("Kowtow Cleave") && damagingMovePool.includes("Kowtow Cleave")) {
        if (result.length < 4) result.push("Kowtow Cleave");
        else replaceMove(["throat chop", "low kick"], ["Kowtow Cleave"]);
      }
    }
    if (key === "meowscarada") {
      result = result.filter((move) => normalizeNameKey(move) !== "trick room");
      const preferred = ["Flower Trick", "Knock Off", "U-turn", "Protect", "Sucker Punch", "Triple Axel", "Low Kick"];
      preferred.forEach((move) => {
        if (result.length < 4 && !result.includes(move) && damagingMovePool.includes(move)) result.push(move);
      });
    }
    if (key === "hatterene") {
      const keep = ["Trick Room", "Protect", "Psychic", "Dazzling Gleam", "Mystical Fire", "Life Dew"];
      result = result.filter((move) => keep.includes(move));
      ["Trick Room", "Protect", "Psychic", "Dazzling Gleam"].forEach((move) => {
        if (result.length < 4 && !result.includes(move) && (damagingMovePool.includes(move) || keep.includes(move))) result.push(move);
      });
    }
    if (["mega camerupt", "charizard", "mega charizard y", "whimsicott"].includes(key)) {
      result = result.filter((move) => !["solar beam", "solar blade"].includes(normalizeNameKey(move)));
      const fallbackPool = ["Protect", "Moonblast", "Earth Power", "Air Slash", "Dragon Pulse", "Icy Wind"];
      fallbackPool.forEach((move) => {
        if (result.length < 4 && !result.includes(move) && damagingMovePool.includes(move)) result.push(move);
      });
    }
    return result.slice(0, 4);
  }

  async function diversifyMoveTypes(moves, damagingMovePool, entry) {
    const allowedDuplicates = new Set(["weather ball", "heat wave", "eruption"]);
    const typeBuckets = new Map();
    for (const move of moves) {
      const detail = await getMoveDetail(move);
      const typeName = detail?.type?.name ? prettyMoveName(detail.type.name) : "";
      const key = typeName || move;
      const current = typeBuckets.get(key) || [];
      current.push(move);
      typeBuckets.set(key, current);
    }
    for (const [typeName, typedMoves] of typeBuckets.entries()) {
      if (typedMoves.length <= 1) continue;
      const keepCount = typedMoves.every((move) => allowedDuplicates.has(normalizeNameKey(move))) ? 2 : 1;
      while (typedMoves.length > keepCount) {
        const removed = typedMoves.pop();
        const index = moves.findIndex((move) => move === removed);
        if (index >= 0) moves.splice(index, 1);
        const replacement = await findReplacementDamagingMove(damagingMovePool, moves, entry, typeName);
        if (replacement && !moves.includes(replacement)) moves.push(replacement);
      }
    }
    return moves.slice(0, 4);
  }

  async function findReplacementDamagingMove(damagingMovePool, currentMoves, entry, blockedType) {
    for (const move of damagingMovePool) {
      if (currentMoves.includes(move)) continue;
      const detail = await getMoveDetail(move);
      const moveType = detail?.type?.name ? prettyMoveName(detail.type.name) : "";
      if (!moveType || moveType === blockedType) continue;
      if (RECHARGE_OR_BAD_COMMIT_MOVES.has(normalizeNameKey(move))) continue;
      return move;
    }
    return null;
  }

  async function enforceMixedLockMoveCap(entry, moves, damagingMovePool) {
    if (!HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))) return moves.slice(0, 4);
    const supportMoveKeys = new Set(["protect", "tailwind", "trick room", "helping hand", "quick guard", "parting shot", "taunt", "will-o-wisp", "fake out", "substitute", "swords dance", "nasty plot", "agility", "thunder wave", "icy wind", "electroweb", "coaching"]);
    const result = [...moves];
    const mainLean = getMoveCategoryLean(result, entry) === "special" ? "special" : "physical";
    const classify = (move) => {
      const key = normalizeNameKey(move);
      if (supportMoveKeys.has(key) && key !== "fake out") return "support";
      if (isLikelySpecialMove(key) && !isLikelyPhysicalMove(key)) return "special";
      if (isLikelyPhysicalMove(key) && !isLikelySpecialMove(key)) return "physical";
      return mainLean;
    };
    const getDamaging = () => result.filter((move) => classify(move) !== "support");
    const getMainCount = () => getDamaging().filter((move) => classify(move) === mainLean).length;
    const getOffMoves = () => getDamaging().filter((move) => classify(move) !== mainLean);
    const replacementPool = damagingMovePool.filter((move) => !result.includes(move));

    while (getOffMoves().length > 2) {
      const offMove = getOffMoves().pop();
      const index = result.findIndex((move) => move === offMove);
      if (index < 0) break;
      const replacement = replacementPool.find((candidate) => classify(candidate) === mainLean && !result.includes(candidate));
      if (replacement) {
        result.splice(index, 1, replacement);
      } else {
        result.splice(index, 1);
      }
    }

    while (getMainCount() < 2) {
      const replacement = replacementPool.find((candidate) => classify(candidate) === mainLean && !result.includes(candidate));
      if (!replacement) break;
      const offIndex = result.findIndex((move) => classify(move) !== "support" && classify(move) !== mainLean);
      if (offIndex >= 0) {
        result.splice(offIndex, 1, replacement);
      } else if (result.length < 4) {
        result.push(replacement);
      } else {
        break;
      }
    }

    return result.slice(0, 4);
  }

  async function sanitizeMovesForItem(entry, moves, item, context, legalMoves) {
    const normalizedItem = normalizeNameKey(item || "");
    const buildRules = getCompetitiveBuildRules(context);
    if (buildRules.intent === "hard_tr") {
      return moves
        .filter((move) => !["icy wind", "electroweb", "tailwind", "thunder wave"].includes(normalizeNameKey(move)))
        .slice(0, 4);
    }
    if (normalizedItem !== "choice scarf") return moves.slice(0, 4);
    const result = moves.filter((move) => normalizeNameKey(move) !== "protect");
    if (result.length >= 4) return result.slice(0, 4);
    const ranked = await rankDamagingMoves(entry, legalMoves, getEntryOffenseProfile(entry), inferCoverageTargetsFromContext(context), context.requestedPressure || {}, context);
    for (const candidate of ranked.map((row) => row.name)) {
      const key = normalizeNameKey(candidate);
      if (result.includes(candidate)) continue;
      if (["protect", "trick room", "tailwind", "thunder wave", "taunt", "helping hand", "icy wind", "electroweb", "parting shot", "will-o-wisp"].includes(key)) continue;
      result.push(candidate);
      if (result.length >= 4) break;
    }
    return result.slice(0, 4);
  }

  function inferMoveRequirementContext(entry, context, legalMoves) {
    const sourceText = `${context.focus || ""} ${context.notes || ""}`.toLowerCase();
    const chosenEntries = (context.chosen || []).filter(Boolean);
    const chosenNames = chosenEntries.map((candidate) => normalizeNameKey(candidate.name));
    const teamNames = new Set([...chosenNames, normalizeNameKey(entry.name)]);
    const allyEntries = [
      ...chosenEntries,
      ...((context.currentDraft || []).map((set) => getRosterEntry(set.name)).filter(Boolean))
    ].filter((candidate) => normalizeNameKey(candidate.name) !== normalizeNameKey(entry.name));
    const chosenMoves = [
      ...legalMoves.map((move) => normalizeNameKey(move)),
      ...((context.currentDraft || []).flatMap((set) => set.moves || []).map((move) => normalizeNameKey(move)))
    ];
    const terrainMoves = ["electric terrain", "grassy terrain", "psychic terrain", "misty terrain"];
    return {
      sun: sourceText.includes("sun") || ["mega charizard y"].some((name) => teamNames.has(name)) || chosenMoves.includes("sunny day"),
      rain: sourceText.includes("rain") || ["pelipper"].some((name) => teamNames.has(name)) || chosenMoves.includes("rain dance"),
      sand: sourceText.includes("sand") || ["tyranitar", "mega tyranitar"].some((name) => teamNames.has(name)) || chosenMoves.includes("sandstorm"),
      snow: sourceText.includes("snow") || ["ninetales-alola", "abomasnow", "mega abomasnow", "froslass", "mega froslass"].some((name) => teamNames.has(name)) || chosenMoves.includes("snowscape"),
      terrain: sourceText.includes("terrain") || terrainMoves.some((move) => chosenMoves.includes(move)),
      hasDragonAlly: allyEntries.some((candidate) => candidate.types.includes("Dragon"))
    };
  }

  function isMoveUsefulInCurrentWeather(moveName, weatherContext) {
    const key = normalizeNameKey(moveName);
    if (RECHARGE_OR_BAD_COMMIT_MOVES.has(key)) {
      return false;
    }
    if (["double team", "minimize"].includes(key)) {
      return weatherContext.sand || weatherContext.snow;
    }
    if (key === "solar beam" || key === "solarblade" || key === "solar blade") {
      return weatherContext.sun;
    }
    if (key === "stored power") {
      return false;
    }
    if (key === "steel roller") {
      return weatherContext.terrain;
    }
    if (key === "dragon cheer") {
      return weatherContext.hasDragonAlly;
    }
    if (key === "aurora veil") {
      return weatherContext.snow;
    }
    if (key === "blizzard") {
      return weatherContext.snow;
    }
    if (key === "hurricane" || key === "thunder") {
      return weatherContext.rain;
    }
    if (key === "weather ball") {
      return weatherContext.sun || weatherContext.rain || weatherContext.sand || weatherContext.snow;
    }
    return true;
  }

  function isMoveSafeForCurrentTeam(entry, moveName, context) {
    const key = normalizeNameKey(moveName);
    const chosenEntries = (context.chosen || []).filter(Boolean);
    if (!chosenEntries.length) return true;
    if (key === "steel beam") return false;
    if (["earthquake", "bulldoze", "magnitude"].includes(key)) {
      const allies = chosenEntries.filter((candidate) => candidate.name !== entry.name);
      if (!allies.length) return true;
      const safeAllies = allies.filter((ally) => ally.types.includes("Flying") || (ally.abilities || []).some((ability) => normalizeNameKey(ability) === "levitate")).length;
      return safeAllies >= 2;
    }
    if (["sludge wave", "lava plume", "discharge", "surf"].includes(key)) {
      const allies = chosenEntries.filter((candidate) => candidate.name !== entry.name);
      if (!allies.length) return true;
      let safeAllies = 0;
      if (key === "sludge wave") {
        safeAllies = allies.filter((ally) => ally.types.includes("Steel") || (ally.abilities || []).some((ability) => normalizeNameKey(ability) === "magic guard")).length;
      } else if (key === "lava plume") {
        safeAllies = allies.filter((ally) => ally.types.includes("Fire") || (ally.abilities || []).some((ability) => ["flash fire", "water veil", "water bubble"].includes(normalizeNameKey(ability)))).length;
      } else if (key === "discharge") {
        safeAllies = allies.filter((ally) => ally.types.includes("Ground") || (ally.abilities || []).some((ability) => ["lightning rod", "motor drive", "volt absorb"].includes(normalizeNameKey(ability)))).length;
      } else if (key === "surf") {
        safeAllies = allies.filter((ally) => ally.types.includes("Water") || (ally.abilities || []).some((ability) => ["storm drain", "water absorb", "dry skin"].includes(normalizeNameKey(ability)))).length;
      }
      return safeAllies >= 2;
    }
    return true;
  }

  function scoreWeatherArchetypeFit(entry, chosen) {
    const teamNames = new Set((chosen || []).map((candidate) => normalizeNameKey(candidate.name)));
    const fireWeak = getTypeEffectiveness("Fire", entry.types);
    const waterWeak = getTypeEffectiveness("Water", entry.types);
    let score = 0;
    if (teamNames.has("mega charizard y") || teamNames.has("charizard")) {
      if (["Fire", "Ground", "Rock"].some((type) => entry.types.includes(type))) score += 10;
      if (waterWeak > 1) score += 6;
      if (fireWeak > 1) score -= fireWeak >= 4 ? 18 : 10;
      if (waterWeak < 1) score += 3;
    }
    if (teamNames.has("pelipper")) {
      if (["Grass", "Bug", "Steel"].some((type) => entry.types.includes(type))) score += 10;
      if (fireWeak > 1) score += 6;
      if (waterWeak > 1) score -= waterWeak >= 4 ? 18 : 10;
      if (fireWeak < 1) score += 3;
    }
    return score;
  }

  function getStabPriorityMoves(entry, offenseProfile = "physical") {
    const moveTable = {
      Fire: { physical: ["Flare Blitz"], special: ["Heat Wave", "Overheat", "Flamethrower", "Fire Blast"] },
      Water: { physical: ["Waterfall", "Liquidation"], special: ["Sparkling Aria", "Hyper Voice", "Surf", "Muddy Water", "Hydro Pump"] },
      Grass: { physical: ["Power Whip", "Grassy Glide"], special: ["Leaf Storm", "Energy Ball", "Giga Drain"] },
      Electric: { physical: ["Thunder Punch"], special: ["Thunderbolt", "Thunder", "Volt Switch"] },
      Ice: { physical: ["Icicle Crash", "Ice Spinner"], special: ["Ice Beam", "Blizzard"] },
      Fighting: { physical: ["Close Combat", "Drain Punch", "Low Kick", "Body Press"], special: [] },
      Poison: { physical: ["Gunk Shot", "Poison Jab"], special: ["Sludge Bomb", "Sludge Wave"] },
      Ground: { physical: ["Earthquake", "Stomping Tantrum", "High Horsepower"], special: ["Earth Power"] },
      Flying: { physical: ["Brave Bird", "Acrobatics"], special: ["Hurricane", "Air Slash"] },
      Psychic: { physical: ["Zen Headbutt"], special: ["Psychic", "Psyshock", "Expanding Force"] },
      Bug: { physical: ["U-turn", "Leech Life", "X-Scissor"], special: ["Bug Buzz"] },
      Rock: { physical: ["Stone Axe", "Rock Slide", "Stone Edge", "Accelerock"], special: ["Power Gem"] },
      Ghost: { physical: ["Shadow Sneak", "Poltergeist"], special: ["Shadow Ball", "Bitter Malice"] },
      Dragon: { physical: ["Dragon Claw", "Outrage"], special: ["Draco Meteor", "Dragon Pulse"] },
      Dark: { physical: ["Knock Off", "Crunch", "Throat Chop"], special: ["Dark Pulse"] },
      Steel: { physical: ["Iron Head", "Heavy Slam"], special: ["Flash Cannon", "Steel Beam"] },
      Fairy: { physical: ["Play Rough"], special: ["Moonblast", "Dazzling Gleam", "Draining Kiss"] },
      Normal: { physical: ["Double-Edge", "Body Slam", "Extreme Speed"], special: ["Hyper Voice"] }
    };
    return entry.types.flatMap((type) => {
      const typed = moveTable[type];
      if (!typed) return [];
      if (offenseProfile === "special") return [...typed.special];
      if (offenseProfile === "mixed") return [...typed.physical, ...typed.special];
      return [...typed.physical];
    });
  }

  function isLikelyDamagingMoveForEntry(entry, move) {
    const key = normalizeNameKey(move);
    const supportMoves = new Set(["protect", "tailwind", "trick room", "helping hand", "quick guard", "parting shot", "taunt", "will-o-wisp", "fake out", "substitute", "swords dance", "nasty plot", "agility", "thunder wave"]);
    if (supportMoves.has(key)) return false;
    const physicalBias = entry.baseStats[1] >= entry.baseStats[3];
    const physicalNames = ["punch", "kick", "edge", "slide", "quake", "jab", "claw", "crash", "fang", "slam", "head", "blade", "combat", "drain punch", "poltergeist", "fake out"];
    const specialNames = ["beam", "bolt", "blast", "wave", "pulse", "ball", "gleam", "storm", "voice", "power", "meteor"];
    if (physicalBias) {
      return physicalNames.some((fragment) => key.includes(fragment)) || entry.types.some((type) => key.includes(type.toLowerCase()));
    }
    return specialNames.some((fragment) => key.includes(fragment)) || entry.types.some((type) => key.includes(type.toLowerCase()));
  }

  function getEntryOffenseProfile(entry) {
    if (HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name))) return (entry.baseStats[1] || 0) >= (entry.baseStats[3] || 0) ? "physical" : "special";
    if (normalizeNameKey(entry.name) === "sneasler") return "physical";
    if (HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))) return "special";
    if (HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))) return "mixed";
    if ((entry.baseStats[1] || 0) >= (entry.baseStats[3] || 0) + 15) return "physical";
    if ((entry.baseStats[3] || 0) >= (entry.baseStats[1] || 0) + 15) return "special";
    return entry.baseStats[1] >= entry.baseStats[3] ? "physical" : "special";
  }

  function getMoveCategoryLean(moves, entry) {
    const moveKeys = moves.map((move) => normalizeNameKey(move)).filter(Boolean);
    const physicalHits = moveKeys.filter((move) => isLikelyPhysicalMove(move)).length;
    const specialHits = moveKeys.filter((move) => isLikelySpecialMove(move)).length;
    if (physicalHits > specialHits) return "physical";
    if (specialHits > physicalHits) return "special";
    return getEntryOffenseProfile(entry) === "mixed"
      ? ((entry.baseStats[1] || 0) >= (entry.baseStats[3] || 0) ? "physical" : "special")
      : getEntryOffenseProfile(entry);
  }

  function canUseHelpingHand(entry, offenseProfile) {
    if (HARD_ATTACKER_LOCKS.has(normalizeNameKey(entry.name))) return false;
    if (HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))) return false;
    if (HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))) return false;
    if ((entry.baseStats[1] || 0) >= 120 || (entry.baseStats[3] || 0) >= 120) return false;
    const offenses = (entry.baseStats[1] || 0) + (entry.baseStats[3] || 0);
    const bulk = (entry.baseStats[0] || 0) + (entry.baseStats[2] || 0) + (entry.baseStats[4] || 0);
    return offenses < 220 || (bulk > offenses + 20 && offenseProfile !== "physical");
  }

  function inferCoverageTargetsFromContext(context) {
    const desired = new Set(["Fairy", "Steel", "Electric", "Ice", "Rock", "Water"]);
    const lowered = `${context.focus || ""} ${context.notes || ""}`.toLowerCase();
    Object.keys(TYPE_CHART).forEach((type) => {
      if (lowered.includes(type.toLowerCase())) desired.add(type);
    });
    return [...desired];
  }

  async function rankDamagingMoves(entry, legalMoves, offenseProfile, preferredTypeTargets, requestedPressure = {}, context = {}) {
    const ranked = [];
    const moveRequirementContext = inferMoveRequirementContext(entry, context, legalMoves);
    const roleProfile = inferSetRoleProfile(entry, context, [], legalMoves);
    for (const moveName of legalMoves) {
      const key = normalizeNameKey(moveName);
      if (RECHARGE_OR_BAD_COMMIT_MOVES.has(key)) continue;
      if (STRONGLY_DISCOURAGED_MOVES.has(key)) continue;
      if (isPolicyHardDiscouraged(entry, moveName)) continue;
      if (!isMoveUsefulInCurrentWeather(moveName, moveRequirementContext)) continue;
      if (isMoveContextuallyInvalid(entry, moveName, context, legalMoves)) continue;
      if (isPolicyConditionallyDiscouraged(entry, moveName, context, legalMoves)) continue;
      if (!isMoveSafeForCurrentTeam(entry, moveName, context)) continue;
      if (!isLikelyDamagingMoveForEntry(entry, moveName)) continue;
      const detail = await getMoveDetail(moveName);
      const typeName = detail?.type?.name ? prettyMoveName(detail.type.name) : "";
      const category = detail?.damage_class?.name || "";
      const power = Number(detail?.power) || estimateMovePower(moveName);
      const accuracy = Number(detail?.accuracy) || 100;
      if (!typeName || !power) continue;
      let score = power;
      const moveKey = normalizeNameKey(moveName);
      if (entry.types.includes(typeName)) score += 20;
    if (normalizeNameKey(entry.name) === "primarina" && ["sparkling aria", "hyper voice", "alluring voice", "moonblast", "icy wind"].includes(moveKey)) score += 22;
    if (normalizeNameKey(entry.name) === "primarina" && moveKey === "hydro pump") score -= 18;
    if (normalizeNameKey(entry.name) === "raichu" && ["electroweb", "thunderbolt", "volt switch", "nuzzle", "fake out"].includes(moveKey)) score += 18;
    if (normalizeNameKey(entry.name) === "raichu-alola" && ["electroweb", "thunderbolt", "volt switch", "psychic", "encore"].includes(moveKey)) score += 18;
    if (normalizeNameKey(entry.name) === "kleavor" && ["stone axe", "x-scissor", "u-turn", "rock slide", "night slash"].includes(moveKey)) score += 16;
    if (normalizeNameKey(entry.name) === "incineroar" && ["close combat", "earthquake", "fire punch"].includes(moveKey)) score -= 26;
    if (normalizeNameKey(entry.name) === "meowscarada" && ["flower trick", "knock off", "u-turn", "triple axel", "sucker punch"].includes(moveKey)) score += 20;
    if (normalizeNameKey(entry.name) === "meowscarada" && ["trick room"].includes(moveKey)) score -= 40;
    if (normalizeNameKey(entry.name) === "hatterene" && ["trick room", "psychic", "dazzling gleam", "protect", "mystical fire"].includes(moveKey)) score += 20;
    if (normalizeNameKey(entry.name) === "dragapult" && ["dragon darts", "dragon claw", "phantom force", "shadow ball", "draco meteor", "flamethrower", "thunderbolt", "dragon dance", "u-turn"].includes(moveKey)) score += 16;
    if (normalizeNameKey(entry.name) === "dragapult" && ["body slam", "dragon cheer"].includes(moveKey)) score -= 28;
    if (normalizeNameKey(entry.name) === "whimsicott" && ["solar beam", "solar blade"].includes(moveKey)) score -= 40;
      if (moveKey === "dragon cheer" && !moveRequirementContext.hasDragonAlly) score -= 40;
      if (offenseProfile === "physical") {
        if (category === "physical") score += 18;
        if (category === "special") score -= 18;
      } else if (offenseProfile === "special") {
        if (category === "special") score += 18;
        if (category === "physical") score -= 18;
      } else {
        if (category === "physical" || category === "special") score += 10;
      }
      score += preferredTypeTargets.reduce((sum, type) => sum + (getSingleTypeEffectiveness(typeName, type) > 1 ? 6 : 0), 0);
      score += metaThreats.reduce((sum, threat) => sum + (threat.types.some((type) => getSingleTypeEffectiveness(typeName, type) > 1) ? Math.min(4, threat.weight / 12) : 0), 0);
      if (requestedPressure.counterMeta || requestedPressure.ohko) {
        if (power >= 90) score += 10;
        if (entry.types.includes(typeName)) score += 8;
      }
      score += getRoleAwareMoveAdjustment(entry, moveName, roleProfile);
      if (accuracy < 100) score -= Math.min(28, Math.max(8, (100 - accuracy)));
      if (accuracy < 90) score -= 18;
      if (accuracy === 100) score += 4;
      if (power < 60) score -= 6;
      if (["Protect", "Helping Hand"].includes(moveName)) score = -999;
      ranked.push({ name: moveName, score });
    }
    return ranked.sort((a, b) => b.score - a.score);
  }

  function estimateMovePower(moveName) {
    const key = normalizeNameKey(moveName);
    const multiHitAdjusted = {
      "bonemerang": 100,
      "double hit": 70,
      "double iron bash": 120,
      "double kick": 60,
      "dragon darts": 100,
      "dual wingbeat": 80,
      "gear grind": 100,
      "population bomb": 200,
      "triple axle": 120,
      "triple kick": 80,
      "twin beam": 80,
      "twineedle": 50
    };
    if (multiHitAdjusted[key]) return multiHitAdjusted[key];
    if (["draco meteor", "leaf storm", "close combat", "flare blitz", "hydro pump", "earthquake", "heat wave", "moonblast", "flash cannon", "poison jab", "rock slide", "knock off"].includes(key)) {
      return 90;
    }
    if (["dragon claw", "earth power", "shadow ball", "ice beam", "thunderbolt", "energy ball"].includes(key)) {
      return 80;
    }
    return 70;
  }

  function getSuggestedNature(entry, moves, context = {}) {
    const moveLean = getMoveCategoryLean(moves, entry);
    const moveKeys = moves.map((move) => normalizeNameKey(move));
    const roleProfile = inferSetRoleProfile(entry, context, moves, moves);
    const speedLean = entry.baseSpeed >= 100;
    const physicalLean = entry.baseStats[1] >= entry.baseStats[3];
    const specialLean = entry.baseStats[3] > entry.baseStats[1];
    const bulkyLean = entry.baseStats[2] + entry.baseStats[4] >= 210 && !speedLean;
    if (normalizeNameKey(entry.name) === "kingambit") return "Adamant";
    if (normalizeNameKey(entry.name) === "sneasler") return "Jolly";
    if (moveKeys.includes("trick room")) return specialLean ? "Sassy" : "Relaxed";
    if (isRealTrAbuserEntry(entry) && !moveKeys.some((move) => ["tailwind", "icy wind", "electroweb", "thunder wave"].includes(move))) return specialLean ? "Quiet" : "Brave";
    if (roleProfile.primaryRole === "pivot_support" || roleProfile.primaryRole === "bulky_support" || roleProfile.primaryRole === "disruption_support") {
      if (specialLean) return entry.baseStats[4] >= entry.baseStats[2] ? "Calm" : "Bold";
      return entry.baseStats[4] >= entry.baseStats[2] ? "Careful" : "Impish";
    }
    if (roleProfile.primaryRole === "bulky_special_attacker") return speedLean ? "Modest" : "Calm";
    if (roleProfile.primaryRole === "bulky_physical_attacker") return speedLean ? "Adamant" : "Impish";
    if (roleProfile.primaryRole === "cleaner") return specialLean ? "Timid" : "Jolly";
    if (HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))) return speedLean ? "Timid" : "Modest";
    if (HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))) return moveLean === "physical"
      ? (speedLean ? "Jolly" : "Adamant")
      : (speedLean ? "Timid" : "Modest");
    if (speedLean && physicalLean) return "Jolly";
    if (speedLean && specialLean) return "Timid";
    if (physicalLean && bulkyLean) return "Adamant";
    if (specialLean && bulkyLean) return "Modest";
    if (entry.baseStats[4] > entry.baseStats[2]) return specialLean ? "Calm" : "Careful";
    return physicalLean ? "Adamant" : "Modest";
  }

  function getSuggestedSpSpread(entry, moves, context = {}) {
    const moveKeys = moves.map((move) => normalizeNameKey(move));
    const moveLean = getMoveCategoryLean(moves, entry);
    const physicalLean = entry.baseStats[1] >= entry.baseStats[3];
    const speedLean = entry.baseSpeed >= 95;
    const roleProfile = inferSetRoleProfile(entry, context, moves, moves);
    if (normalizeNameKey(entry.name) === "kingambit") return { hp: 20, atk: 32, def: 6, spa: 0, spd: 8, spe: 0 };
    if (normalizeNameKey(entry.name) === "sneasler") return { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 };
    if (HARD_SPECIAL_LOCKS.has(normalizeNameKey(entry.name))) return speedLean
      ? { hp: 0, atk: 0, def: 0, spa: 32, spd: 2, spe: 32 }
      : { hp: 20, atk: 0, def: 6, spa: 32, spd: 8, spe: 0 };
    if (HARD_MIXED_LOCKS.has(normalizeNameKey(entry.name))) return moveLean === "physical"
      ? (speedLean ? { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 } : { hp: 20, atk: 32, def: 6, spa: 0, spd: 8, spe: 0 })
      : (speedLean ? { hp: 0, atk: 0, def: 0, spa: 32, spd: 2, spe: 32 } : { hp: 20, atk: 0, def: 6, spa: 32, spd: 8, spe: 0 });
    if (moveKeys.includes("trick room")) return physicalLean
      ? { hp: 28, atk: 32, def: 4, spa: 0, spd: 2, spe: 0 }
      : { hp: 28, atk: 0, def: 4, spa: 32, spd: 2, spe: 0 };
    if (isRealTrAbuserEntry(entry) && !moveKeys.some((move) => ["tailwind", "icy wind", "electroweb", "thunder wave"].includes(move))) return physicalLean
      ? { hp: 28, atk: 32, def: 4, spa: 0, spd: 2, spe: 0 }
      : { hp: 28, atk: 0, def: 4, spa: 32, spd: 2, spe: 0 };
    if (roleProfile.primaryRole === "pivot_support" || roleProfile.primaryRole === "bulky_support" || roleProfile.primaryRole === "disruption_support") {
      return physicalLean
        ? { hp: 28, atk: 24, def: 8, spa: 0, spd: 6, spe: 0 }
        : { hp: 28, atk: 0, def: 8, spa: 24, spd: 6, spe: 0 };
    }
    if (roleProfile.primaryRole === "bulky_special_attacker") return { hp: 24, atk: 0, def: 6, spa: 32, spd: 4, spe: 0 };
    if (roleProfile.primaryRole === "bulky_physical_attacker") return { hp: 24, atk: 32, def: 6, spa: 0, spd: 4, spe: 0 };
    if (roleProfile.primaryRole === "cleaner") {
      return physicalLean
        ? { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 }
        : { hp: 0, atk: 0, def: 0, spa: 32, spd: 2, spe: 32 };
    }
    if (moveKeys.some((move) => ["tailwind", "icy wind", "electroweb", "thunder wave"].includes(move))) return physicalLean
      ? { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 }
      : { hp: 0, atk: 0, def: 0, spa: 32, spd: 2, spe: 32 };
    if (physicalLean && speedLean) return { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 };
    if (!physicalLean && speedLean) return { hp: 0, atk: 0, def: 0, spa: 32, spd: 2, spe: 32 };
    if (physicalLean) return { hp: 20, atk: 32, def: 6, spa: 0, spd: 8, spe: 0 };
    return { hp: 20, atk: 0, def: 6, spa: 32, spd: 8, spe: 0 };
  }

  function computeDefensiveTypeScore(weaknessRows, teamSize) {
    const totalPenalty = weaknessRows.reduce((sum, row) => {
      if (row.weakCount >= 3) return sum + row.weakCount * 1.5;
      if (row.weakCount === 2) return sum + (row.answerCount ? 0.5 : 1);
      return sum + row.weakCount;
    }, 0);
    return clampScore(100 - totalPenalty * 8 - Math.max(0, weaknessRows.length - Math.ceil(teamSize / 2)) * 6);
  }

  function computeMetaMatchupScore(threatRows) {
    if (!threatRows.length) return 50;
    const weightedSum = threatRows.reduce((sum, row) => sum + row.matchupScore * row.threat.weight, 0);
    const totalWeight = threatRows.reduce((sum, row) => sum + row.threat.weight, 0);
    return clampScore(weightedSum / totalWeight);
  }

  function getTypeEffectiveness(attackType, defenderTypes) {
    return defenderTypes.reduce((total, defenderType) => total * getSingleTypeEffectiveness(attackType, defenderType), 1);
  }

  function getSingleTypeEffectiveness(attackType, defenderType) {
    const canonicalAttackType = canonicalizeTypeName(attackType);
    const canonicalDefenderType = canonicalizeTypeName(defenderType);
    return TYPE_CHART[canonicalAttackType]?.[canonicalDefenderType] ?? 1;
  }

  function severityClassForWeakness(weakCount) {
    if (weakCount >= 3) return "severity-high";
    if (weakCount === 2) return "severity-medium";
    return "severity-good";
  }

  function severityClassForScore(score) {
    if (score >= 75) return "severity-good";
    if (score >= 50) return "severity-medium";
    return "severity-high";
  }

  function scoreMetaAdaptability(teamState) {
    const occupiedSlots = teamState
      .filter((slot) => slot.name)
      .map((slot) => ({ slot, entry: getRosterEntry(slot.name) }))
      .filter((row) => row.entry);

    if (!occupiedSlots.length) {
      return {
        fakeOut: { score: 0, summary: "No team loaded." },
        intimidate: { score: 0, summary: "No team loaded." },
        summary: "unrated"
      };
    }

    const fakeOutProtected = occupiedSlots.filter(({ slot, entry }) => hasFakeOutCounterplay(slot, entry));
    const fakeOutWeak = occupiedSlots.filter(({ slot, entry }) => !hasFakeOutCounterplay(slot, entry));
    const fakeOutSpeedReliant = occupiedSlots.filter(({ entry }) => entry.baseSpeed >= 95).length;
    const fakeOutScore = clampScore(
      40
      + fakeOutProtected.length * 14
      - fakeOutWeak.length * 9
      - Math.max(0, fakeOutSpeedReliant - fakeOutProtected.length) * 4
    );

    const intimidateImmune = occupiedSlots.filter(({ slot, entry }) => hasIntimidateImmunity(slot, entry));
    const intimidatePunish = occupiedSlots.filter(({ slot }) => punishesIntimidate(slot));
    const intimidateLowConcern = occupiedSlots.filter(({ slot, entry }) => isIntimidateLowConcern(slot, entry));
    const intimidateWeak = occupiedSlots.filter(({ slot, entry }) => isIntimidateWeak(slot, entry));
    const intimidateScore = clampScore(
      38
      + intimidateImmune.length * 14
      + intimidatePunish.length * 12
      + intimidateLowConcern.length * 8
      - intimidateWeak.length * 10
    );

    return {
      fakeOut: {
        score: fakeOutScore,
        summary: buildFakeOutSummary(fakeOutProtected, fakeOutWeak)
      },
      intimidate: {
        score: intimidateScore,
        summary: buildIntimidateSummary(intimidateImmune, intimidatePunish, intimidateLowConcern, intimidateWeak)
      },
      summary: describeMetaSummary(Math.round((fakeOutScore + intimidateScore) / 2))
    };
  }

  function hasFakeOutCounterplay(slot, entry) {
    const ability = normalizeNameKey(slot.ability || "");
    const item = normalizeNameKey(slot.item || "");
    const moves = slot.moves.map((move) => normalizeNameKey(move));
    return entry.types.includes("Ghost")
      || ["inner focus", "shield dust"].includes(ability)
      || item === "covert cloak"
      || moves.some((move) => ["protect", "detect", "quick guard"].includes(move));
  }

  function hasIntimidateImmunity(slot, entry) {
    const ability = normalizeNameKey(slot.ability || "");
    const item = normalizeNameKey(slot.item || "");
    const abilityImmunities = ["clear body", "white smoke", "full metal body", "mirror armor", "inner focus", "own tempo", "oblivious", "scrappy", "guard dog", "hyper cutter"];
    return item === "clear amulet" || abilityImmunities.includes(ability) || punishesIntimidate(slot);
  }

  function resolveBattleEntry(slot) {
    const baseEntry = getRosterEntry(slot?.name || "");
    if (!baseEntry) return null;
    const megaEntry = getMegaEntryForItem(slot?.item || "", baseEntry.name);
    return megaEntry || baseEntry;
  }

  function getMegaEntryForItem(itemName, baseName) {
    const normalizedItem = normalizeNameKey(itemName || "");
    if (!normalizedItem) return null;
    return championsRoster.find((entry) => isMegaEntry(entry) && normalizeNameKey(entry.baseName || "") === normalizeNameKey(baseName) && normalizeNameKey(getMegaStoneForEntry(entry)) === normalizedItem) || null;
  }

  function pkmnHelpMatchupFor({ attackType, defenseTypes, abilityName }) {
    let n = 1;
    const canonicalAttackType = canonicalizeTypeName(attackType);
    const ability = normalizeNameKey(abilityName || "");
    const modifierTable = DEFENSIVE_ABILITY_TYPE_MODIFIERS[ability];
    if (modifierTable && Object.prototype.hasOwnProperty.call(modifierTable, canonicalAttackType)) {
      n *= modifierTable[canonicalAttackType];
    }
    for (const defenseType of defenseTypes || []) {
      const canonicalDefenseType = canonicalizeTypeName(defenseType);
      if (!canonicalDefenseType) continue;
      let x = getSingleTypeEffectiveness(canonicalAttackType, canonicalDefenseType);
      if (canonicalDefenseType === "Flying" && ability === "delta stream" && x > 1) {
        x = 1;
      }
      n *= x;
    }
    if (ability === "wonder guard" && n <= 1) {
      n = 0;
    }
    if (PKMN_HELP_REDUCER_ABILITIES.has(ability) && n > 1) {
      n *= 0.75;
    }
    if (ability === "tera shell" && n > 0) {
      n = 0.5;
    }
    return n;
  }

  function getEffectiveTypeEffectiveness(attackType, slot, entry) {
    const ability = normalizeNameKey(slot?.ability || "");
    return pkmnHelpMatchupFor({
      attackType,
      defenseTypes: entry.types || [],
      abilityName: ability
    });
  }

  function punishesIntimidate(slot) {
    const ability = normalizeNameKey(slot.ability || "");
    return ["defiant", "competitive", "contrary"].includes(ability);
  }

  function isIntimidateLowConcern(slot, entry) {
    const stats = entry.baseStats || legalPokemonData[entry.baseName || entry.calcName]?.baseStats || [];
    const atk = stats[1] || 0;
    const spa = stats[3] || 0;
    const moves = slot.moves.map((move) => normalizeNameKey(move));
    return spa >= atk + 10 || moves.includes("body press");
  }

  function isIntimidateWeak(slot, entry) {
    if (hasIntimidateImmunity(slot, entry) || isIntimidateLowConcern(slot, entry)) return false;
    const stats = entry.baseStats || legalPokemonData[entry.baseName || entry.calcName]?.baseStats || [];
    const atk = stats[1] || 0;
    const spa = stats[3] || 0;
    return atk >= spa;
  }

  function buildFakeOutSummary(protectedSlots, weakSlots) {
    const protectedNames = protectedSlots.map(({ entry }) => entry.name);
    const weakNames = weakSlots.map(({ entry }) => entry.name);
    if (!weakSlots.length) {
      return "Very solid into Fake Out. The whole team has either immunity, shielding, or safe button coverage.";
    }
    if (!protectedSlots.length) {
      return `Very exposed to Fake Out. Right now ${weakNames.join(", ")} all rely on positioning rather than direct protection.`;
    }
    return `${protectedNames.join(", ")} give you real counterplay, but ${weakNames.join(", ")} can still get pinned by common Fake Out leads.`;
  }

  function buildIntimidateSummary(immuneSlots, punishSlots, lowConcernSlots, weakSlots) {
    const immuneNames = immuneSlots.map(({ entry }) => entry.name);
    const punishNames = punishSlots.map(({ entry }) => entry.name);
    const weakNames = weakSlots.map(({ entry }) => entry.name);
    const lowConcernNames = lowConcernSlots.map(({ entry }) => entry.name);
    if (!weakSlots.length) {
      return "Good Intimidate matchup. Your team is mostly special, protected, or actively benefits from the drop.";
    }
    const positiveBits = [
      punishNames.length ? `${punishNames.join(", ")} can punish Intimidate` : "",
      immuneNames.length ? `${immuneNames.join(", ")} stay stable into it` : "",
      lowConcernNames.length ? `${lowConcernNames.join(", ")} do not care much about Attack drops` : ""
    ].filter(Boolean).join(". ");
    return `${positiveBits || "You have limited direct answers."}${positiveBits ? " " : ""}${weakNames.join(", ")} still look like the most Intimidate-sensitive slots.`;
  }

  function describeMetaSummary(score) {
    if (score >= 75) return "well adapted";
    if (score >= 50) return "playable but still patchable";
    return "pretty strained by common support pressure";
  }

  function clampScore(score) {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function applyStage(value, stage) {
    if (stage >= 0) return Math.floor(value * ((2 + stage) / 2));
    return Math.floor(value * (2 / (2 + Math.abs(stage))));
  }

  function getRosterEntry(name) {
    if (!name) return null;
    const normalized = normalizeNameKey(name);
    const alias = aliases.get(normalized);
    return rosterByName.get((alias || name).toLowerCase()) || rosterByName.get(normalized) || null;
  }

  function normalizeNameKey(name) {
    return name.toLowerCase().trim().replace(/[.'"]/g, "").replace(/\s+/g, " ");
  }

  function normalizeApiName(name) {
    return name.toLowerCase().trim().replace(/\./g, "").replace(/[':]/g, "").replace(/\s+/g, "-");
  }

  function prettyMoveName(name) {
    return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function getTypeColor(typeName) {
    const colors = {
      Normal: "#b8b7a9", Fire: "#ff7a63", Water: "#5da9ff", Electric: "#f7cf45", Grass: "#6fd38f", Ice: "#8fe9ff",
      Fighting: "#d96a58", Poison: "#b678d9", Ground: "#d0ab67", Flying: "#8cb5ff", Psychic: "#ff85c0", Bug: "#98c957",
      Rock: "#c0aa67", Ghost: "#8e7cff", Dragon: "#7d88ff", Dark: "#7a6a63", Steel: "#b5c2d3", Fairy: "#ffb0eb", Status: "#c5c7d8"
    };
    return colors[typeName] || colors.Status;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(text) {
    return escapeHtml(text);
  }

  function activateTab(target) {
    tabButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.tabTrigger === target));
    tabPanels.forEach((panel) => {
      const isTarget = panel.dataset.tabPanel === target;
      panel.classList.toggle("is-active", isTarget);
      panel.toggleAttribute("hidden", !isTarget);
      if (isTarget) {
        panel.classList.add("is-entering");
        window.setTimeout(() => panel.classList.remove("is-entering"), 220);
      } else {
        panel.classList.remove("is-entering");
      }
    });
  }

  function generateBugReport() {
    const report = buildBugReport();
    bugOutput.value = report;
    bugStatus.textContent = "Report generated. You can send it straight to GitHub, copy it, or download it.";
    return report;
  }

  function buildBugReport() {
    const attacker = document.getElementById("attacker-name").value || "(none)";
    const defender = document.getElementById("defender-name").value || "(none)";
    const move = document.getElementById("attacker-move").value || "(none)";
    const attackerSp = JSON.stringify(getSpSpread("attacker"));
    const defenderSp = JSON.stringify(getSpSpread("defender"));
    const team = getTeamBuilderState().filter((slot) => slot.name).map((slot) => {
      const details = [slot.item, slot.ability, slot.nature, slot.moves.filter(Boolean).join(" / "), `SP ${JSON.stringify(slot.sps)}`].filter(Boolean).join(" | ");
      return details ? `${slot.name} | ${details}` : slot.name;
    });

    return [
      `Title: ${document.getElementById("bug-title").value || "(untitled bug)"}`,
      `Severity: ${document.getElementById("bug-severity").value}`,
      `Expected: ${document.getElementById("bug-expected").value || "(not provided)"}`,
      `Actual: ${document.getElementById("bug-actual").value || "(not provided)"}`,
      `Steps: ${document.getElementById("bug-steps").value || "(not provided)"}`,
      `Contact: ${document.getElementById("bug-contact").value || "(not provided)"}`,
      "",
      "Context",
      `Attacker: ${attacker}`,
      `Attacker item: ${document.getElementById("attacker-item").value || "(none)"}`,
      `Attacker ability: ${document.getElementById("attacker-ability").value || "(none)"}`,
      `Attacker nature: ${document.getElementById("attacker-nature").value || "(none)"}`,
      `Attacker SP: ${attackerSp}`,
      `Defender: ${defender}`,
      `Defender item: ${document.getElementById("defender-item").value || "(none)"}`,
      `Defender ability: ${document.getElementById("defender-ability").value || "(none)"}`,
      `Defender nature: ${document.getElementById("defender-nature").value || "(none)"}`,
      `Defender SP: ${defenderSp}`,
      `Move: ${move}`,
      `Speed calc target: ${document.getElementById("speed-pokemon").value || "(none)"}`,
      `Team builder: ${team.length ? team.join(", ") : "(empty)"}`,
      `User agent: ${navigator.userAgent}`,
      `Timestamp: ${new Date().toISOString()}`
    ].join("\n");
  }

  async function copyBugReport() {
    const report = bugOutput.value || generateBugReport();
    try {
      await navigator.clipboard.writeText(report);
      bugStatus.textContent = "Report copied to clipboard.";
    } catch (error) {
      bugStatus.textContent = "Clipboard copy failed. Use the preview box and copy manually.";
    }
  }

  function sendBugReportToGitHub() {
    const report = bugOutput.value || generateBugReport();
    const title = document.getElementById("bug-title").value?.trim() || "Bug report";
    const body = `${report}\n\n---\nSubmitted from Master Ball War Room`;
    const url = `${GITHUB_ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    bugStatus.textContent = "Opened a prefilled GitHub issue in a new tab.";
  }

  function downloadBugReport() {
    const report = bugOutput.value || generateBugReport();
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `champions-bug-report-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    bugStatus.textContent = "Report downloaded.";
  }

  function buildTeamExportText() {
    const team = getTeamBuilderState()
      .map((slot, slotIndex) => ({ ...slot, originalSlotIndex: slotIndex }))
      .filter((slot) => slot.name);
    if (!team.length) return "";
    return team.map((slot) => {
      const header = `${slot.name}${slot.item ? ` @ ${slot.item}` : ""}`;
      const lines = [header];
      if (slot.ability) lines.push(`Ability: ${slot.ability}`);
      if (slot.nature) lines.push(`${slot.nature} Nature`);
      const spread = statOrder
        .filter((stat) => (slot.sps?.[stat] || 0) > 0)
        .map((stat) => `${slot.sps[stat]} ${statLabels[stat]}`)
        .join(" / ");
      if (spread) lines.push(`SPs: ${spread}`);
      slot.moves.filter(Boolean).forEach((move) => lines.push(`- ${move}`));
      return lines.join("\n");
    }).join("\n\n");
  }

  async function copyTeamExport() {
    const text = buildTeamExportText();
    if (!text) {
      teamExportStatus.textContent = "Add at least one Pokemon before exporting.";
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      teamExportStatus.textContent = "Team export copied to clipboard.";
    } catch (error) {
      teamExportStatus.textContent = "Clipboard copy failed. Download the text export instead.";
    }
  }

  function downloadTeamExport() {
    const text = buildTeamExportText();
    if (!text) {
      teamExportStatus.textContent = "Add at least one Pokemon before exporting.";
      return;
    }
    downloadTextFile(text, `champions-team-${Date.now()}.txt`);
    teamExportStatus.textContent = "Team text downloaded.";
  }

  async function downloadTeamImage() {
    const team = getTeamBuilderState().filter((slot) => slot.name);
    if (!team.length) {
      teamExportStatus.textContent = "Add at least one Pokemon before exporting.";
      return;
    }
    try {
      const canvas = await renderTeamExportCanvas(team);
      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `champions-team-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      teamExportStatus.textContent = "Team image downloaded as PNG.";
    } catch (error) {
      downloadTeamExport();
      teamExportStatus.textContent = "PNG export failed, so the team text export was downloaded instead.";
    }
  }

  async function verifyTeamExportResources(team) {
    const filledTeam = (team || []).filter((slot) => slot?.name);
    const spriteChecks = [];
    for (const slot of filledTeam) {
      const entry = getRosterEntry(slot.name);
      spriteChecks.push(resolveExportSpriteDataUrl(slot, entry, slot.originalSlotIndex ?? filledTeam.indexOf(slot)));
    }
    const spriteResults = await Promise.all(spriteChecks);
    const spritesReady = spriteResults.every((result) => String(result || "").startsWith("data:image/"));
    return {
      spritesReady,
      spriteCount: spriteResults.length
    };
  }

  async function renderTeamExportCanvas(team) {
    try {
      const verification = await verifyTeamExportResources(team);
      const svgMarkup = await buildTeamExportSvg(team);
      const dimensions = getTeamExportDimensions(team.length);
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
      const exportImage = await loadImageForExport(svgDataUrl);
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      ctx.drawImage(exportImage, 0, 0, dimensions.width, dimensions.height);
      console.log({
        export_mode: "svg",
        sprites_ready: verification.spritesReady,
        sprite_count: verification.spriteCount,
        type_display_mode: "svg-pill",
        stat_bars_rendered: true
      });
      return canvas;
    } catch (error) {
      console.warn("SVG export failed, falling back to legacy canvas export.", error);
      return renderLegacyTeamExportCanvas(team);
    }
  }

  async function renderLegacyTeamExportCanvas(team) {
    const width = 1600;
    const rowHeight = 190;
    const headerHeight = 150;
    const height = headerHeight + team.length * rowHeight + 40;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#120f26");
    gradient.addColorStop(0.5, "#1b1537");
    gradient.addColorStop(1, "#221841");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawRoundRect(ctx, 18, 18, width - 36, height - 36, 24, "rgba(0,0,0,0)");
    ctx.strokeStyle = "rgba(138,99,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#f7eefe";
    ctx.font = "700 52px Georgia";
    ctx.fillText("Pokemon Champions Team Export", 54, 88);
    ctx.fillStyle = "#cab7f7";
    ctx.font = "24px 'Segoe UI'";
    ctx.fillText("Level 50 | Legal items, abilities, nature, SP, and moves", 56, 126);

    for (let index = 0; index < team.length; index += 1) {
      const slot = team[index];
      const entry = getRosterEntry(slot.name);
      const top = 152 + index * rowHeight;

      drawRoundRect(ctx, 42, top, width - 84, 160, 18, "rgba(255,255,255,0.04)");
      ctx.strokeStyle = "rgba(255,124,168,0.18)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      const sprite = await getExportSpriteImage(slot, entry, slot.originalSlotIndex ?? index);
      ctx.drawImage(sprite, 62, top + 18, 96, 96);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 30px 'Segoe UI'";
      ctx.fillText(slot.name, 182, top + 42);

      const summaryText = [slot.item, slot.ability, slot.nature].filter(Boolean).join(" | ") || "No item / ability / nature set";
      ctx.fillStyle = "#d7c7ff";
      ctx.font = "22px 'Segoe UI'";
      drawWrappedLines(ctx, summaryText, 182, top + 74, 1220, 26, 2);

      const spreadText = statOrder
        .filter((stat) => (slot.sps?.[stat] || 0) > 0)
        .map((stat) => `${slot.sps[stat]} ${statLabels[stat]}`)
        .join(" / ") || "0 SP";
      ctx.fillStyle = "#ffcfde";
      ctx.font = "20px 'Segoe UI'";
      ctx.fillText(spreadText, 182, top + 110);

      ctx.fillStyle = "#f7eefe";
      ctx.font = "18px 'Segoe UI'";
      const moves = slot.moves.filter(Boolean).slice(0, 4);
      const leftMoves = moves.slice(0, 2);
      const rightMoves = moves.slice(2, 4);
      leftMoves.forEach((move, moveIndex) => {
        ctx.fillText(`- ${move}`, 182, top + 130 + moveIndex * 22);
      });
      rightMoves.forEach((move, moveIndex) => {
        ctx.fillText(`- ${move}`, 760, top + 130 + moveIndex * 22);
      });
    }

    return canvas;
  }

  async function getExportSpriteUrl(slot, entry, slotIndex) {
    const liveSprite = document.getElementById(`team-sprite-${slotIndex}`)?.getAttribute("src");
    if (liveSprite && liveSprite.startsWith("data:")) return liveSprite;
    if (!entry) return liveSprite || POKEBALL_PLACEHOLDER;
    const apiName = entry.apiName || toApiSpeciesName(entry.name);
    const exportApiName = EXPORT_SPRITE_API_NAME_OVERRIDES[apiName] || apiName;
    const overrideUrl = SPRITE_URL_OVERRIDES[apiName];
    if (exportSpriteUrlCache.has(exportApiName)) {
      return exportSpriteUrlCache.get(exportApiName);
    }
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${exportApiName}`);
      if (!response.ok) throw new Error("Missing export sprite metadata");
      const payload = await response.json();
      const spriteUrl = overrideUrl
        || payload?.sprites?.other?.["official-artwork"]?.front_default
        || payload?.sprites?.front_default
        || getSpriteUrl(apiName)
        || liveSprite
        || POKEBALL_PLACEHOLDER;
      exportSpriteUrlCache.set(exportApiName, spriteUrl);
      return spriteUrl;
    } catch (error) {
      const fallback = overrideUrl || getSpriteUrl(apiName) || liveSprite || POKEBALL_PLACEHOLDER;
      exportSpriteUrlCache.set(exportApiName, fallback);
      return fallback;
    }
  }

  async function tryFetchImageAsDataUrl(url) {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Missing image");
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return "";
    }
  }

  async function resolveExportSpriteDataUrl(slot, entry, slotIndex) {
    const liveSprite = document.getElementById(`team-sprite-${slotIndex}`)?.getAttribute("src") || "";
    if (liveSprite.startsWith("data:")) return liveSprite;
    const resolvedUrl = await getExportSpriteUrl(slot, entry, slotIndex);
    const candidates = [
      resolvedUrl,
      liveSprite,
      entry ? getSpriteUrl(entry.apiName || toApiSpeciesName(entry.name)) : "",
      POKEBALL_PLACEHOLDER
    ].filter(Boolean);
    for (const candidate of candidates) {
      if (candidate.startsWith("data:")) return candidate;
      const dataUrl = await tryFetchImageAsDataUrl(candidate);
      if (dataUrl) return dataUrl;
    }
    return POKEBALL_PLACEHOLDER;
  }

  async function getExportSpriteImage(slot, entry, slotIndex) {
    const spriteDataUrl = await resolveExportSpriteDataUrl(slot, entry, slotIndex);
    return loadImageForExport(spriteDataUrl || POKEBALL_PLACEHOLDER);
  }

  async function loadImageForExport(url) {
    const safeUrl = url || POKEBALL_PLACEHOLDER;
    try {
      const dataUrl = safeUrl.startsWith("data:") ? safeUrl : await fetchImageAsDataUrl(safeUrl);
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl || POKEBALL_PLACEHOLDER;
      });
    } catch (error) {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = POKEBALL_PLACEHOLDER;
      });
    }
  }

  function drawRoundRect(ctx, x, y, width, height, radius, fillStyle) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
  }

  function drawWrappedLines(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const trial = current ? `${current} ${word}` : word;
      if (ctx.measureText(trial).width <= maxWidth) {
        current = trial;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    lines.slice(0, maxLines).forEach((line, index) => {
      const rendered = index === maxLines - 1 && lines.length > maxLines
        ? `${line.replace(/\s+\S*$/, "")}...`
        : line;
      ctx.fillText(rendered, x, y + index * lineHeight);
    });
  }

  function downloadTextFile(text, filename, mimeType = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getTeamExportDimensions(teamLength) {
    return {
      width: 1520,
      headerHeight: 150,
      cardHeight: 282,
      gap: 18,
      padding: 28,
      get height() {
        return this.headerHeight + teamLength * (this.cardHeight + this.gap) + this.padding;
      }
    };
  }

  function getExportStatPercent(value) {
    const numeric = Number(value || 0);
    return Math.max(0, Math.min(100, (numeric / SP_MAX_PER_STAT) * 100));
  }

  function getExportTypeBadgeWidth(typeName) {
    const label = String(typeName || "");
    return Math.max(88, 44 + label.length * 9);
  }

  function buildExportTypeIcons(entry, baseX, baseY) {
    const types = (entry?.types || []).map((type) => canonicalizeTypeName(type)).filter(Boolean).slice(0, 2);
    let cursorX = baseX;
    return types.map((type) => {
      const width = getExportTypeBadgeWidth(type);
      const fill = getTypeColor(type);
      const markup = `
        <g transform="translate(${cursorX} ${baseY})">
          <rect width="${width}" height="28" rx="14" fill="${fill}" fill-opacity="0.95"/>
          <rect width="${width}" height="28" rx="14" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>
          <text class="export-type-pill-text" x="${width / 2}" y="19">${escapeXml(type)}</text>
        </g>
      `;
      cursorX += width + 10;
      return markup;
    }).join("");
  }

  function truncateExportText(text, maxLength) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    return raw.length > maxLength ? `${raw.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...` : raw;
  }

  function getExportSlotDetails(slot) {
    return [
      { label: "Item", value: slot.item || "No item" },
      { label: "Ability", value: slot.ability || "No ability" },
      { label: "Nature", value: slot.nature || "Neutral" }
    ];
  }

  function buildExportMoveRows(slot, baseX, baseY) {
    const moves = slot.moves.filter(Boolean).slice(0, 4);
    const renderedMoves = moves.length ? moves : ["No move selected"];
    return renderedMoves.map((move, index) => `
      <text class="export-move-bullet" x="${baseX}" y="${baseY + index * 34}">&#8226;</text>
      <text class="export-move-text" x="${baseX + 18}" y="${baseY + index * 34}">${escapeXml(truncateExportText(move, 28))}</text>
    `).join("");
  }

  function buildExportStatBars(slot, baseX, baseY, columnGap = 318, rowGap = 30) {
    return statOrder.map((stat, index) => {
      const value = Number(slot.sps?.[stat] || 0);
      const percent = getExportStatPercent(value);
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = baseX + col * columnGap;
      const y = baseY + row * rowGap;
      const fillWidth = Math.max(0, Math.round((162 * percent) / 100));
      return `
        <g class="export-stat-row" transform="translate(${x} ${y})">
          <text class="export-stat-label" x="0" y="12">${statLabels[stat]}</text>
          <rect class="export-stat-track" x="48" y="2" width="162" height="10" rx="4"/>
          <rect x="48" y="2" width="${fillWidth}" height="10" rx="4" fill="${EXPORT_STAT_BAR_COLORS[stat] || "#c084fc"}"/>
          <text class="export-stat-value" x="236" y="12">${value}</text>
        </g>
      `;
    }).join("");
  }

  async function buildExportCardSvg(slot, index, dimensions) {
    const entry = getRosterEntry(slot.name);
    const top = dimensions.headerHeight + index * (dimensions.cardHeight + dimensions.gap);
    const left = dimensions.padding;
    const cardWidth = dimensions.width - dimensions.padding * 2;
    const spriteHref = await resolveExportSpriteDataUrl(slot, entry, slot.originalSlotIndex ?? index);
    const spriteX = left + 30;
    const spriteY = top + 34;
    const spriteSize = 136;
    const leftColX = spriteX + spriteSize + 26;
    const rightColX = left + 932;
    const typeIcons = buildExportTypeIcons(entry, leftColX, top + 64);
    const detailRows = getExportSlotDetails(slot).map((row, rowIndex) => `
      <text class="export-detail-label" x="${leftColX}" y="${top + 118 + rowIndex * 27}">${row.label}</text>
      <text class="export-detail-value" x="${leftColX + 84}" y="${top + 118 + rowIndex * 27}">${escapeXml(truncateExportText(row.value, 34))}</text>
    `).join("");
    return `
      <g class="export-card" transform="translate(0 0)">
        <rect class="export-card-bg" x="${left}" y="${top}" width="${cardWidth}" height="${dimensions.cardHeight}" rx="24"/>
        <rect class="export-card-accent" x="${left}" y="${top}" width="10" height="${dimensions.cardHeight}" rx="5"/>
        <image href="${spriteHref}" x="${spriteX}" y="${spriteY}" width="${spriteSize}" height="${spriteSize}" preserveAspectRatio="xMidYMid meet"/>
        <text class="export-name" x="${leftColX}" y="${top + 44}">${escapeXml(truncateExportText(slot.name || "Open Slot", 24))}</text>
        ${typeIcons}
        ${detailRows}
        <text class="export-section-label" x="${rightColX}" y="${top + 42}">Moves</text>
        ${buildExportMoveRows(slot, rightColX, top + 78)}
        <line class="export-divider" x1="${left + 24}" y1="${top + 184}" x2="${left + cardWidth - 24}" y2="${top + 184}"/>
        <text class="export-section-label" x="${left + 28}" y="${top + 210}">Stat Spread</text>
        ${buildExportStatBars(slot, left + 28, top + 226)}
      </g>
    `;
  }

  async function buildTeamExportSvg(team) {
    const dimensions = getTeamExportDimensions(team.length);
    const rows = await Promise.all(team.map((slot, index) => buildExportCardSvg(slot, index, dimensions)));
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
  <defs>
    <linearGradient id="exportBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1729"/>
      <stop offset="55%" stop-color="#151f36"/>
      <stop offset="100%" stop-color="#101827"/>
    </linearGradient>
    <linearGradient id="cardAccent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <style>
      text { text-rendering: geometricPrecision; }
      .export-shell { fill: url(#exportBg); }
      .export-frame { fill: none; stroke: rgba(148, 163, 184, 0.18); stroke-width: 2; }
      .export-title { fill: #f8fafc; font: 700 42px 'Segoe UI', Arial, sans-serif; }
      .export-subtitle { fill: #cbd5e1; font: 500 18px 'Segoe UI', Arial, sans-serif; }
      .export-card-bg { fill: rgba(15, 23, 42, 0.88); stroke: rgba(148, 163, 184, 0.18); stroke-width: 1.5; }
      .export-card-accent { fill: url(#cardAccent); }
      .export-name { fill: #ffffff; font: 700 30px 'Segoe UI', Arial, sans-serif; }
      .export-type-pill-text { fill: #ffffff; font: 700 13px 'Segoe UI', Arial, sans-serif; text-anchor: middle; letter-spacing: 0.03em; }
      .export-section-label { fill: #e2e8f0; font: 700 17px 'Segoe UI', Arial, sans-serif; letter-spacing: 0.5px; text-transform: uppercase; }
      .export-detail-label { fill: #94a3b8; font: 600 14px 'Segoe UI', Arial, sans-serif; }
      .export-detail-value { fill: #f8fafc; font: 500 15px 'Segoe UI', Arial, sans-serif; }
      .export-move-bullet { fill: #f472b6; font: 700 20px 'Segoe UI', Arial, sans-serif; }
      .export-move-text { fill: #f8fafc; font: 600 17px 'Segoe UI', Arial, sans-serif; }
      .export-divider { stroke: rgba(148, 163, 184, 0.16); stroke-width: 1; }
      .export-stat-label { fill: #cbd5e1; font: 600 14px 'Segoe UI', Arial, sans-serif; }
      .export-stat-track { fill: #243041; }
      .export-stat-value { fill: #f8fafc; font: 700 14px 'Segoe UI', Arial, sans-serif; text-anchor: end; }
    </style>
  </defs>
  <rect class="export-shell" width="${dimensions.width}" height="${dimensions.height}" rx="30"/>
  <rect class="export-frame" x="18" y="18" width="${dimensions.width - 36}" height="${dimensions.height - 36}" rx="24"/>
  <text class="export-title" x="${dimensions.padding}" y="68">Pokemon Champions Team Export</text>
  <text class="export-subtitle" x="${dimensions.padding}" y="100">Competitive team sheet with role details, move slots, type icons, and SP bar spreads</text>
  ${rows.join("")}
</svg>`;
  }

  async function fetchImageAsDataUrl(url) {
    if (!url) return POKEBALL_PLACEHOLDER;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Missing sprite");
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return POKEBALL_PLACEHOLDER;
    }
  }

  function escapeXml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function getTeamBuilderState() {
    return Array.from({ length: 6 }, (_, slotIndex) => ({
      name: document.querySelector(`.team-slot[data-slot="${slotIndex}"]`)?.value || "",
      item: document.querySelector(`.team-item[data-slot="${slotIndex}"]`)?.value || "",
      ability: document.querySelector(`.team-ability[data-slot="${slotIndex}"]`)?.value || "",
      nature: document.querySelector(`.team-nature[data-slot="${slotIndex}"]`)?.value || "",
      sps: getTeamSlotSpSpread(slotIndex),
      moves: Array.from(document.querySelectorAll(`.team-move[data-slot="${slotIndex}"]`)).map((select) => select.value || "")
    }));
  }

  window.MBWR_APP_API = {
    get championsRoster() {
      return championsRoster;
    },
    get metaThreats() {
      return metaThreats;
    },
    get TYPE_CHART() {
      return TYPE_CHART;
    },
    calculateLiveDamageBenchmark,
    cloneDraftSet,
    evaluateLiveTeamState,
    evaluateTeamState,
    getLegalMovesForEntry,
    getRosterEntry,
    getTeamBuilderState,
    normalizeNameKey,
    padTeamState,
    parseBuilderRequest
  };
})();
