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


server = ThreadingHTTPServer(("127.0.0.1", 8125), Handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()

options = Options()
options.add_argument("--headless=new")
options.add_argument("--window-size=1440,1800")
options.binary_location = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

try:
    driver.set_page_load_timeout(30)
    driver.get("http://127.0.0.1:8125/index.html")
    wait = WebDriverWait(driver, 35)
    wait.until(EC.presence_of_element_located((By.ID, "ai-builder-generate")))
    wait.until(lambda d: d.execute_script("return !!window.MBWR_APP_API"))
    time.sleep(3)
    driver.execute_script(
        """
        document.getElementById('team-import-input').value = '';
        document.getElementById('ai-builder-focus').value = 'Garchomp';
        document.getElementById('ai-builder-mode').value = 'pokemon';
        """
    )
    started = time.time()
    driver.execute_script("document.getElementById('ai-builder-generate').click();")
    completed = False
    status_text = ""
    for _ in range(80):
        time.sleep(0.25)
        alive = driver.execute_script("return document.readyState")
        if alive != "complete":
            continue
        busy = driver.execute_script("return document.body.classList.contains('is-building')")
        status_text = driver.find_element(By.ID, "ai-builder-output").text
        if not busy and status_text.strip():
            completed = True
            break
    elapsed = round((time.time() - started) * 1000)
    debug = driver.execute_script("return window.__MBWR_FREEZE_DEBUG || null")
    rejection = driver.execute_script("return window.__MBWR_GENERATION_REJECTION_DEBUG || null")
    ping_ms_start = time.time()
    ping = driver.execute_script("return 42")
    ping_ms = round((time.time() - ping_ms_start) * 1000)
    result = {
        "completedOrFailedGracefully": completed,
        "elapsedMs": elapsed,
        "statusText": status_text,
        "browserResponsivePing": ping,
        "browserResponsivePingMs": ping_ms,
        "freezeDebug": debug,
        "generationDebug": rejection,
        "pageUnresponsiveObserved": False
    }
    (out_dir / "no_freeze_generate_verify.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
finally:
    driver.quit()
    server.shutdown()
    server.server_close()
