
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import os, json, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
repo = Path(r"c:\Users\jfrab\OneDrive\Escritorio\PKM coding\Pokemon Damage Calc")
out_dir = repo / 'tmp_verify'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(repo), **kwargs)
server = ThreadingHTTPServer(('127.0.0.1', 8123), Handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
team = ["Incineroar", "Starmie", "Garchomp", "Whimsicott", "Kingambit", "Pelipper"]
options = Options()
options.add_argument('--headless=new')
options.add_argument('--window-size=1440,2600')
options.binary_location = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
try:
    driver.get('http://127.0.0.1:8123/index.html')
    wait = WebDriverWait(driver, 25)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.team-slot[data-slot="0"]')))
    time.sleep(1.5)
    for idx, name in enumerate(team):
        el = driver.find_element(By.CSS_SELECTOR, f'.team-slot[data-slot="{idx}"]')
        driver.execute_script("arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', {bubbles:true})); arguments[0].dispatchEvent(new Event('change', {bubbles:true}));", el, name)
        time.sleep(0.45)
    driver.find_element(By.ID, 'build-team').click()
    time.sleep(5)
    speed_slider_exists = len(driver.find_elements(By.ID, 'speed-ev')) > 0
    speed_value_exists = len(driver.find_elements(By.ID, 'speed-ev-value')) > 0
    sections = driver.find_elements(By.CSS_SELECTOR, '#live-war-room-intel .live-war-room-section')
    meta_section = None
    for sec in sections:
        if 'Meta Threats' in sec.text:
            meta_section = sec
            break
    items = meta_section.find_elements(By.CSS_SELECTOR, '.live-war-room-list__item') if meta_section else []
    rows = []
    for idx, item in enumerate(items[:5]):
        sev_nodes = item.find_elements(By.CSS_SELECTOR, '.live-war-room-severity')
        sev = sev_nodes[0] if sev_nodes else None
        rows.append({
            'index': idx,
            'text': item.text,
            'class': item.get_attribute('class'),
            'text_color': driver.execute_script('return arguments[0] ? getComputedStyle(arguments[0]).color : null;', sev),
            'background': driver.execute_script('return getComputedStyle(arguments[0]).backgroundColor;', item),
            'border': driver.execute_script('return getComputedStyle(arguments[0]).borderTopColor;', item)
        })
    driver.find_element(By.ID, 'live-war-room-intel').screenshot(str(out_dir / 'live-war-room-after.png'))
    speed_panel = driver.find_element(By.ID, 'speed-result').find_element(By.XPATH, './..')
    speed_size = speed_panel.size
    if speed_size.get('width', 0) > 0 and speed_size.get('height', 0) > 0:
        speed_panel.screenshot(str(out_dir / 'speed-panel-after.png'))
    slot_values = [driver.find_element(By.CSS_SELECTOR, f'.team-slot[data-slot=\"{idx}\"]').get_attribute('value') for idx in range(6)]
    team_analysis_text = driver.find_element(By.ID, 'team-analysis').text
    (out_dir / 'live_war_room_verify.json').write_text(json.dumps({
        'speed_slider_exists': speed_slider_exists,
        'speed_slider_value_exists': speed_value_exists,
        'meta_threat_count': len(items),
        'meta_threat_rows': rows,
        'speed_panel_size': speed_size,
        'slot_values': slot_values,
        'team_analysis_text': team_analysis_text
    }, indent=2), encoding='utf-8')
finally:
    driver.quit()
    server.shutdown()
    server.server_close()
