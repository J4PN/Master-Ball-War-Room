
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out_dir = Path(r"c:\Users\jfrab\OneDrive\Escritorio\PKM coding\Pokemon Damage Calc\tmp_verify")
out_dir.mkdir(exist_ok=True)
team = ["Incineroar", "Starmie", "Garchomp", "Whimsicott", "Kingambit", "Pelipper"]
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 2200}, device_scale_factor=1)
    page.goto('http://127.0.0.1:8123/index.html', wait_until='networkidle')
    page.wait_for_timeout(1500)
    for idx, name in enumerate(team):
        sel = f'.team-slot[data-slot="{idx}"]'
        page.locator(sel).fill(name)
        page.locator(sel).dispatch_event('input')
        page.wait_for_timeout(120)
        page.locator(sel).dispatch_event('change')
        page.wait_for_timeout(250)
    page.wait_for_timeout(2500)
    speed_exists = page.locator('#speed-ev').count() > 0
    speed_value_exists = page.locator('#speed-ev-value').count() > 0
    threat_sections = page.locator('#live-war-room-intel .live-war-room-section')
    meta_index = None
    for i in range(threat_sections.count()):
        if 'Meta Threats' in threat_sections.nth(i).inner_text():
            meta_index = i
            break
    threat_items = threat_sections.nth(meta_index).locator('.live-war-room-list__item') if meta_index is not None else page.locator('nope')
    count = threat_items.count()
    rows = []
    for i in range(min(count, 5)):
        item = threat_items.nth(i)
        text = item.inner_text()
        cls = item.get_attribute('class') or ''
        sev = item.locator('.live-war-room-severity')
        color = sev.evaluate("el => getComputedStyle(el).color") if sev.count() else None
        bg = item.evaluate("el => getComputedStyle(el).backgroundColor")
        border = item.evaluate("el => getComputedStyle(el).borderTopColor")
        rows.append({"index": i, "text": text, "class": cls, "color": color, "background": bg, "border": border})
    page.locator('#speed-result').locator('..').screenshot(path=str(out_dir / 'speed-panel-after.png'))
    page.locator('#live-war-room-intel').screenshot(path=str(out_dir / 'live-war-room-after.png'))
    (out_dir / 'live_war_room_verify.json').write_text(json.dumps({
        "speed_slider_exists": speed_exists,
        "speed_slider_value_exists": speed_value_exists,
        "meta_threat_count": count,
        "meta_threat_rows": rows
    }, indent=2), encoding='utf-8')
    browser.close()
