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


server = ThreadingHTTPServer(("127.0.0.1", 8124), Handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()

options = Options()
options.add_argument("--headless=new")
options.add_argument("--window-size=1440,2200")
options.binary_location = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

try:
    driver.get("http://127.0.0.1:8124/index.html")
    wait = WebDriverWait(driver, 35)
    wait.until(EC.presence_of_element_located((By.ID, "confirmed-roster")))
    time.sleep(2)

    result = driver.execute_script(
        """
        const setVal = (id, value) => {
          const el = document.getElementById(id);
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal('roster-type-filter', 'Fire');
        setVal('roster-spe-min', '100');
        setVal('roster-spa-min', '120');
        setVal('roster-stat-sort', 'spe');
        setVal('roster-sort-direction', 'desc');
        const rosterRows = [...document.querySelectorAll('#confirmed-roster [data-roster-pick]')].slice(0, 8).map((el) => el.dataset.rosterPick);
        const rosterValid = rosterRows.length > 0 && rosterRows.every((name) => {
          const entry = window.MBWR_APP_API.getRosterEntry(name);
          return entry.types.includes('Fire') && entry.baseStats[5] >= 100 && entry.baseStats[3] >= 120;
        });

        setVal('attacker-name', 'Basculegion');
        document.getElementById('attacker-name').dispatchEvent(new Event('input', { bubbles: true }));
        return { rosterRows, rosterValid };
        """
    )
    time.sleep(3)
    driver.find_element(By.CSS_SELECTOR, "[data-tab-trigger='damage']").click()
    time.sleep(0.5)
    driver.find_element(By.ID, "attacker-move").click()
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "move-filter-type")))
    driver.execute_script(
        """
        const setVal = (id, value) => {
          const el = document.getElementById(id);
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal('move-filter-type', 'Water');
        setVal('move-filter-power-min', '80');
        setVal('move-filter-accuracy-min', '90');
        """
    )
    time.sleep(2)
    move_result = driver.execute_script(
        """
        const rows = [...document.querySelectorAll('#move-picker-results [data-pick-value]')].slice(0, 8).map((el) => el.dataset.pickValue);
        return Promise.all(rows.map(async (move) => {
          const detail = await window.MBWR_APP_API.getMoveDetail(move);
          return {
            move,
            type: detail?.type?.name,
            power: detail?.power || 0,
            accuracy: detail?.accuracy == null ? 100 : detail.accuracy
          };
        })).then((details) => ({
          rows,
          details,
          valid: details.length > 0 && details.every((row) => row.type === 'water' && row.power >= 80 && row.accuracy >= 90)
        }));
        """
    )
    result["moveFilter"] = move_result
    driver.find_element(By.ID, "move-picker-close").click()
    driver.find_element(By.CSS_SELECTOR, "[data-tab-trigger='teambuilder']").click()
    time.sleep(0.5)

    sp_result = driver.execute_script(
        """
        const slot = document.querySelector('.team-slot[data-slot="0"]');
        slot.value = 'Garchomp';
        slot.dispatchEvent(new Event('input', { bubbles: true }));
        slot.dispatchEvent(new Event('change', { bubbles: true }));
        const hp = document.getElementById('team-0-ev-hp');
        const atk = document.getElementById('team-0-ev-atk');
        const def = document.getElementById('team-0-ev-def');
        const hpPlus = document.querySelector('[data-sp-slot="0"][data-sp-stat="hp"][data-sp-delta="1"]');
        const hpMinus = document.querySelector('[data-sp-slot="0"][data-sp-stat="hp"][data-sp-delta="-1"]');
        let inputEvents = 0;
        let changeEvents = 0;
        hp.addEventListener('input', () => inputEvents += 1);
        hp.addEventListener('change', () => changeEvents += 1);
        hpPlus.click();
        hpMinus.click();
        hp.value = '40';
        hp.dispatchEvent(new Event('input', { bubbles: true }));
        hp.dispatchEvent(new Event('change', { bubbles: true }));
        atk.value = '32';
        atk.dispatchEvent(new Event('input', { bubbles: true }));
        atk.dispatchEvent(new Event('change', { bubbles: true }));
        def.value = '32';
        def.dispatchEvent(new Event('input', { bubbles: true }));
        def.dispatchEvent(new Event('change', { bubbles: true }));
        hp.value = '32';
        hp.dispatchEvent(new Event('input', { bubbles: true }));
        hp.dispatchEvent(new Event('change', { bubbles: true }));
        const spread = window.MBWR_APP_API.getTeamBuilderState()[0].sps;
        const total = Object.values(spread).reduce((a, b) => a + b, 0);
        const hpRect = hp.getBoundingClientRect();
        const plusRect = hpPlus.getBoundingClientRect();
        const minusRect = hpMinus.getBoundingClientRect();
        return {
          inputEvents,
          changeEvents,
          spread,
          total,
          hpValue: Number(hp.value),
          maxPerStatOk: Object.values(spread).every((value) => value >= 0 && value <= 32),
          totalCapOk: total <= 66,
          stepperVisible: plusRect.width >= 38 && minusRect.width >= 38 && hpRect.width >= 50,
          noOverlap: minusRect.right <= hpRect.left && hpRect.right <= plusRect.left
        };
        """
    )
    result["sp"] = sp_result

    export_text = driver.execute_script("return window.MBWR_APP_API.buildTeamExportText ? window.MBWR_APP_API.buildTeamExportText() : document.body.innerText;")
    result["exportSpRead"] = "SPs:" in export_text and ("HP" in export_text or "Atk" in export_text)
    import_result = driver.execute_script(
        """
        const text = arguments[0];
        document.getElementById('clear-team').click();
        const input = document.getElementById('team-import-input');
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('team-parse-import').click();
        return true;
        """,
        export_text,
    )
    time.sleep(2)
    result["importSpRead"] = driver.execute_script(
        """
        const spread = window.MBWR_APP_API.getTeamBuilderState()[0].sps;
        return spread.hp === 32 && spread.atk === 32 && spread.def === 2;
        """
    )
    driver.set_window_size(390, 1200)
    time.sleep(0.5)
    result["mobileSpLayout"] = driver.execute_script(
        """
        const hp = document.getElementById('team-0-ev-hp');
        const hpPlus = document.querySelector('[data-sp-slot="0"][data-sp-stat="hp"][data-sp-delta="1"]');
        const hpMinus = document.querySelector('[data-sp-slot="0"][data-sp-stat="hp"][data-sp-delta="-1"]');
        const hpRect = hp.getBoundingClientRect();
        const plusRect = hpPlus.getBoundingClientRect();
        const minusRect = hpMinus.getBoundingClientRect();
        return {
          visible: plusRect.width >= 38 && minusRect.width >= 38 && hpRect.width >= 50,
          noOverlap: minusRect.right <= hpRect.left && hpRect.right <= plusRect.left
        };
        """
    )

    driver.save_screenshot(str(out_dir / "filters-sp-desktop.png"))
    (out_dir / "filters_sp_verify.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
finally:
    driver.quit()
    server.shutdown()
    server.server_close()
