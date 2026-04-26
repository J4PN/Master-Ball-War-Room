from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import json
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options


repo = Path(r"c:\Users\jfrab\OneDrive\Escritorio\PKM coding\Pokemon Damage Calc")
out_dir = repo / "tmp_verify"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(repo), **kwargs)


server = ThreadingHTTPServer(("127.0.0.1", 8123), Handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()

options = Options()
options.add_argument("--headless=new")
options.add_argument("--window-size=1440,2400")
options.binary_location = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

try:
    driver.get("http://127.0.0.1:8123/index.html")
    wait = WebDriverWait(driver, 30)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".team-slot[data-slot='0']")))
    time.sleep(2)

    result = driver.execute_async_script(
        """
        const done = arguments[arguments.length - 1];
        (async () => {
          const evalExport = window.__MBWR_EXPORT_DEBUG.evaluateFinalExportCoherence;
          const stab = window.__MBWR_STABILIZATION_DEBUG;
          const baseSet = (name, moves, item = "", ability = "", nature = "Serious") => ({
            name,
            item,
            ability,
            nature,
            sps: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            moves
          });
          const testA = [
            baseSet("Mega Camerupt", ["Heat Wave", "Earth Power", "Protect", "Flamethrower"], "Cameruptite", "Sheer Force", "Quiet"),
            baseSet("Pelipper", ["Tailwind", "Hurricane", "Muddy Water", "Protect"], "Damp Rock", "Drizzle", "Timid"),
            baseSet("Kingambit", ["Kowtow Cleave", "Sucker Punch", "Iron Head", "Protect"]),
            baseSet("Dragonite", ["Extreme Speed", "Dragon Claw", "Protect", "Fire Punch"]),
            baseSet("Whimsicott", ["Tailwind", "Moonblast", "Encore", "Protect"], "Focus Sash", "Prankster", "Timid"),
            baseSet("Mega Sharpedo", ["Crunch", "Liquidation", "Protect", "Ice Fang"])
          ];
          const reportA = evalExport(testA);

          const hardTr = [
            baseSet("Sinistcha", ["Matcha Gotcha", "Shadow Ball", "Rage Powder", "Protect"], "Leftovers", "Hospitality", "Sassy"),
            baseSet("Mega Camerupt", ["Heat Wave", "Earth Power", "Protect", "Flamethrower"], "Cameruptite", "Sheer Force", "Quiet"),
            baseSet("Kingambit", ["Kowtow Cleave", "Sucker Punch", "Iron Head", "Protect"]),
            baseSet("Mega Gallade", ["Psycho Cut", "Close Combat", "Protect", "Leaf Blade"]),
            baseSet("Mega Gardevoir", ["Hyper Voice", "Moonblast", "Protect", "Psychic"]),
            baseSet("Conkeldurr", ["Drain Punch", "Mach Punch", "Knock Off", "Protect"], "Flame Orb", "Guts", "Brave")
          ];
          const detectedB = stab.detectTeamArchetype(hardTr);
          const repairedB = await stab.repairTeamPreservingArchetype(hardTr, reportA.issues, detectedB, {
            mode: "archetype",
            focus: "",
            notes: "hard trick room mega camerupt",
            enemyNames: [],
            desiredTypes: [],
            pool: [],
            requiredEntries: [],
            promptLocks: { trickRoom: true, specificMega: "Mega Camerupt" },
            request: { requestedModes: { trickRoom: true }, requestedPressure: {}, requestedPokemon: [] }
          });
          const reportB = evalExport(repairedB);
          const repairedNamesB = repairedB.map((set) => set.name);

          const supportDraft = [
            baseSet("Whimsicott", ["Moonblast", "Giga Drain", "Protect", "Energy Ball"], "Focus Sash", "Prankster", "Timid"),
            baseSet("Pelipper", ["Muddy Water", "Protect", "Roost", "U-turn"], "Damp Rock", "Drizzle", "Timid"),
            baseSet("Kingambit", ["Kowtow Cleave", "Sucker Punch", "Iron Head", "Protect"]),
            baseSet("Dragonite", ["Extreme Speed", "Dragon Claw", "Protect", "Fire Punch"]),
            baseSet("Incineroar", ["Fake Out", "Flare Blitz", "Parting Shot", "Knock Off"], "Sitrus Berry", "Intimidate"),
            baseSet("Garchomp", ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"])
          ];
          const repairedD = await stab.repairTeamPreservingArchetype(supportDraft, [], stab.detectTeamArchetype(supportDraft), {
            mode: "archetype",
            focus: "",
            notes: "support move repair",
            enemyNames: [],
            desiredTypes: [],
            pool: [],
            requiredEntries: [],
            promptLocks: {},
            request: { requestedModes: {}, requestedPressure: {}, requestedPokemon: [] }
          });

          done({
            testA: {
              valid: reportA.isValid,
              blockers: reportA.blockers.map((issue) => issue.code),
              issues: reportA.issues.map((issue) => issue.code)
            },
            testB: {
              detected: detectedB,
              valid: reportB.isValid,
              blockers: reportB.blockers.map((issue) => issue.code),
              issues: reportB.issues.map((issue) => issue.code),
              names: repairedNamesB,
              moves: Object.fromEntries(repairedB.map((set) => [set.name, set.moves]))
            },
            testC: {
              gastlyFiller: stab.isAutoRepairFillerPokemon("Gastly"),
              sinisteaFiller: stab.isAutoRepairFillerPokemon("Sinistea"),
              noDowngrade: !repairedNamesB.includes("Sinistea")
            },
            testD: {
              whimsicottMoves: repairedD.find((set) => set.name === "Whimsicott").moves,
              pelipperMoves: repairedD.find((set) => set.name === "Pelipper").moves
            },
            repairDebug: window.__MBWR_REPAIR_DEBUG
          });
        })().catch((error) => done({ error: String(error), stack: error && error.stack }));
        """
    )
    invalid_team = ["Mega Camerupt", "Pelipper", "Kingambit", "Dragonite", "Whimsicott", "Mega Sharpedo"]
    for idx, name in enumerate(invalid_team):
        el = driver.find_element(By.CSS_SELECTOR, f".team-slot[data-slot='{idx}']")
        driver.execute_script(
            "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', {bubbles:true})); arguments[0].dispatchEvent(new Event('change', {bubbles:true}));",
            el,
            name,
        )
        time.sleep(0.25)
    time.sleep(1)
    driver.find_element(By.ID, "download-team-image").click()
    time.sleep(0.5)
    export_status = driver.find_element(By.ID, "team-export-status").text
    result["exportImageGate"] = {
        "status": export_status,
        "blocked": "Export blocked:" in export_status,
        "offersPreservingFix": "preserving archetype" in export_status,
    }
    (out_dir / "stabilization_verify.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
finally:
    driver.quit()
    server.shutdown()
    server.server_close()
