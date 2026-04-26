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


server = ThreadingHTTPServer(("127.0.0.1", 8127), Handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()

options = Options()
options.add_argument("--headless=new")
options.add_argument("--window-size=1440,1800")
options.binary_location = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)


def click(selector):
    driver.find_element(By.CSS_SELECTOR, selector).click()


def set_value(selector, value):
    driver.execute_script(
        """
        const el = document.querySelector(arguments[0]);
        el.value = arguments[1];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        """,
        selector,
        value,
    )


team_sets = [
    ("Mega Charizard Y", "Charizardite Y", "Drought", "Timid", ["Heat Wave", "Air Slash", "Weather Ball", "Protect"], {"spa": 32, "spe": 32, "spd": 2}),
    ("Torkoal", "Charcoal", "Drought", "Quiet", ["Eruption", "Heat Wave", "Earth Power", "Protect"], {"hp": 20, "spa": 32, "def": 6, "spd": 8}),
    ("Whimsicott", "Focus Sash", "Prankster", "Timid", ["Tailwind", "Moonblast", "Encore", "Protect"], {"spa": 32, "spe": 32, "spd": 2}),
    ("Venusaur", "Miracle Seed", "Chlorophyll", "Modest", ["Sludge Bomb", "Giga Drain", "Sleep Powder", "Protect"], {"spa": 32, "hp": 20, "def": 6, "spd": 8}),
    ("Dragonite", "Leftovers", "Inner Focus", "Adamant", ["Extreme Speed", "Dragon Claw", "Stomping Tantrum", "Protect"], {"atk": 32, "hp": 20, "def": 6, "spd": 8}),
    ("Incineroar", "Sitrus Berry", "Intimidate", "Careful", ["Fake Out", "Flare Blitz", "Parting Shot", "Knock Off"], {"atk": 32, "hp": 28, "def": 4, "spd": 2}),
]

results = {}

try:
    driver.set_page_load_timeout(30)
    driver.get("http://127.0.0.1:8127/index.html")
    wait = WebDriverWait(driver, 40)
    wait.until(EC.presence_of_element_located((By.ID, "build-team")))
    wait.until(lambda d: d.execute_script("return !!window.MBWR_APP_API && document.readyState === 'complete'"))
    time.sleep(2)

    # Load a complete team through the same DOM controls export/import reads.
    driver.execute_script(
        """
        const sets = arguments[0];
        sets.forEach((row, idx) => {
          const [name, item, ability, nature, moves, sps] = row;
          document.querySelector(`.team-slot[data-slot="${idx}"]`).value = name;
          document.querySelector(`.team-item[data-slot="${idx}"]`).value = item;
          document.querySelector(`.team-ability[data-slot="${idx}"]`).value = ability;
          document.querySelector(`.team-nature[data-slot="${idx}"]`).value = nature;
          moves.forEach((move, moveIdx) => {
            document.querySelector(`.team-move[data-slot="${idx}"][data-move-slot="${moveIdx}"]`).value = move;
          });
          ["hp", "atk", "def", "spa", "spd", "spe"].forEach((stat) => {
            document.querySelector(`#team-${idx}-ev-${stat}`).value = sps[stat] || 0;
          });
        });
        document.dispatchEvent(new CustomEvent("mbwr:team-state-changed", { detail: { reason: "verify-load", slotIndex: -1 } }));
        """,
        team_sets,
    )

    click("#build-team")
    WebDriverWait(driver, 20).until(lambda d: len(d.find_elements(By.CSS_SELECTOR, ".champions-type-chart tbody tr")) >= 18)
    results["typeChart"] = {
        "displayed": len(driver.find_elements(By.CSS_SELECTOR, ".champions-type-chart tbody tr")),
        "icons": len(driver.find_elements(By.CSS_SELECTOR, ".champions-type-chart__pokemon img")),
        "hasNet": "Net" in driver.find_element(By.CSS_SELECTOR, ".champions-type-chart thead").text,
    }

    click('.team-card[data-team-card="0"]')
    wait.until(lambda d: d.find_element(By.ID, "team-slot-editor").get_attribute("class").find("is-open") >= 0)
    before_slot_2_hp = driver.execute_script("return document.querySelector('#team-1-ev-hp').value")
    set_value("#modal-sp-spd", "1")
    after_slot_1_spd = driver.execute_script("return document.querySelector('#team-0-ev-spd').value")
    after_slot_2_hp = driver.execute_script("return document.querySelector('#team-1-ev-hp').value")
    results["modal"] = {
        "opened": True,
        "slot1Spd": after_slot_1_spd,
        "slot2HpPreserved": before_slot_2_hp == after_slot_2_hp,
    }
    driver.execute_script("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));")

    set_value("#roster-search", "")
    set_value("#roster-type-filter", "Fire")
    set_value("#roster-ability-filter", "Drought")
    set_value("#roster-move-filter", "Heat Wave")
    set_value("#roster-spa-min", "100")
    time.sleep(0.5)
    roster_text = driver.find_element(By.ID, "confirmed-roster").text
    results["pokemonFilters"] = {
        "count": driver.find_element(By.ID, "roster-count").text,
        "containsCharizardOrTorkoal": "Charizard" in roster_text or "Torkoal" in roster_text,
    }

    click('[data-tab-trigger="damage"]')
    set_value("#attacker-name", "Mega Charizard Y")
    time.sleep(0.2)
    driver.execute_script("document.querySelector('#attacker-move').click()")
    wait.until(lambda d: d.find_element(By.ID, "move-picker").get_attribute("class").find("is-open") >= 0)
    set_value("#move-filter-type", "Fire")
    set_value("#move-filter-power-min", "80")
    set_value("#move-filter-accuracy-min", "90")
    WebDriverWait(driver, 8).until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#move-picker-results [data-pick-value]")) > 0)
    move_text = driver.find_element(By.ID, "move-picker-results").text
    results["moveFilters"] = {
        "containsHeatWave": "Heat Wave" in move_text,
        "rows": len(driver.find_elements(By.CSS_SELECTOR, "#move-picker-results [data-pick-value]")),
    }
    driver.execute_script("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));")

    click('[data-tab-trigger="database"]')
    set_value("#ability-db-search", "Drought")
    set_value("#ability-db-mega-filter", "yes")
    set_value("#item-db-category", "mega")
    time.sleep(0.5)
    results["abilityItemFilters"] = {
        "abilityHasDrought": "Drought" in driver.find_element(By.ID, "ability-db-results").text,
        "itemHasStone": "ite" in driver.find_element(By.ID, "item-db-results").text.lower(),
    }

    click('[data-tab-trigger="damage"]')
    set_value("#calc-team-attacker", "0")
    set_value("#calc-team-defender", "4")
    click("#calc-load-team-picks")
    time.sleep(0.6)
    results["damageUx"] = {
        "attackerLoaded": driver.find_element(By.ID, "attacker-name").get_attribute("value"),
        "defenderLoaded": driver.find_element(By.ID, "defender-name").get_attribute("value"),
        "hasModeButtons": len(driver.find_elements(By.CSS_SELECTOR, "[data-calc-mode]")),
    }

    export_text = driver.execute_script("return window.MBWR_APP_API.buildTeamExportText(window.MBWR_APP_API.getTeamBuilderState())")
    results["exportImport"] = {
        "exportHasTeam": "Mega Charizard Y" in export_text and "Dragonite" in export_text,
    }

    page_text = driver.find_element(By.TAG_NAME, "body").text
    ping_start = time.time()
    ping = driver.execute_script("return 42")
    results["freeze"] = {
        "ping": ping,
        "pingMs": round((time.time() - ping_start) * 1000),
        "perfDebug": driver.execute_script("return window.__MBWR_PERF_DEBUG || null"),
    }
    results["credits"] = {
        "mentionsPokebase": "PokéBase" in page_text or "PokeBase" in page_text,
        "hasLink": bool(driver.execute_script("return document.querySelector('a[href=\"https://pokebase.app/\"]')")),
    }
finally:
    (out_dir / "ui_ux_upgrade_verify.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    driver.quit()
    server.shutdown()
    server.server_close()
