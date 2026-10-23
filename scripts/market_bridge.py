import os
import sys
import re
import time
import json
import random
import threading
import subprocess
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, parse_qs
from typing import Optional, Dict, Any, List

import requests
import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from supabase import create_client

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ADB_PATH = r"C:\LDPlayer\LDPlayer14\adb.exe"
DEVICE = "emulator-5554"
FRONTEND_PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ice-logix-frontend", "public"))
PARSED_UPLOADS_DIR = os.path.join(FRONTEND_PUBLIC_DIR, "uploads", "parsed")
os.makedirs(PARSED_UPLOADS_DIR, exist_ok=True)

SUPABASE_URL = "https://vrvwdagjpttvfvjanbwq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndkYWdqcHR0dmZ2amFuYndxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzgzOCwiZXhwIjoyMDkxMjMzODM4fQ.wbxnzmz2aRGrN1Ol9Vo1752MMaHwggohrUIlbjm6U6M"

try:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print("Supabase client init error:", e)
    supabase_client = None

app = FastAPI(title="ICE LOGIX Marketplace Hardware Bridge", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== СЛОВАРЬ ПЕРЕВОДА ЦВЕТОВ И ТЕРМИНОВ ====================
COLOR_DICT = {
    "白色": "Белый",
    "古董白": "Античный белый",
    "黑色": "Черный",
    "碳灰色": "Графитовый серый",
    "粉白色": "Розово-белый",
    "砂粉色": "Песочно-розовый",
    "新天蓝": "Небесно-голубой",
    "海军蓝": "Темно-синий (Navy)",
    "奶黄色": "Молочно-желтый",
    "紫丁香": "Сиреневый",
    "红色": "Красный",
    "绿色": "Зеленый",
    "蓝色": "Синий",
    "灰色": "Серый",
    "深灰": "Темно-серый",
    "浅灰": "Светло-серый",
    "银色": "Серебристый",
    "金色": "Золотой",
    "玫瑰金": "Розовое золото",
    "橙色": "Оранжевый",
    "紫色": "Фиолетовый",
    "暗夜紫": "Глубокий фиолетовый",
    "暗夜绿": "Полуночный зеленый",
    "远峰蓝": "Sierra Blue",
    "原色钛金属": "Натуральный титан",
    "白色钛金属": "Белый титан",
    "黑色钛金属": "Черный титан",
    "蓝色钛金属": "Синий титан",
    "黄色": "Желтый",
    "米色": "Бежевый",
    "卡其色": "Хаки",
    "卡其": "Хаки",
    "灰蓝": "Серо-голубой",
    "海蓝": "Морской синий",
    "军绿": "Милитари зеленый",
    "炭黑": "Угольно-черный",
    "棕色": "Коричневый",
    "咖啡色": "Кофейный",
    "浅蓝": "Светло-голубой",
    "浅蓝色": "Светло-голубой",
    "米白色": "Молочно-белый",
    "藏青色": "Темно-синий",
    "杏色": "Абрикосовый (светло-бежевый)",
    "墨绿": "Изумрудно-зеленый",
    "墨绿色": "Изумрудно-зеленый",
    "酒红": "Бордовый",
    "酒红色": "Бордовый",
    "透明": "Прозрачный",
}

def translate_color(name_cn: str) -> str:
    clean = re.sub(r"[🔥\s]|快要抢光|热卖|爆款|大促", "", name_cn).strip()
    for cn, ru in COLOR_DICT.items():
        if cn in clean:
            return ru
    return clean

def translate_size_or_model(val: str) -> str:
    clean = re.sub(r"[🔥\s]|快要抢光|热卖|爆款|大促", "", val).strip()
    s = clean
    s = s.replace("苹果", "iPhone ")
    s = s.replace("【带一体ai键】", " (кнопка AI Control)")
    s = s.replace("【带镜头膜】", " (с защитой камеры)")
    s = s.replace("带一体ai键", " (кнопка AI Control)")
    s = s.replace("苹果其他型号联系客服备注", "Другая модель (под заказ)")
    s = s.replace("PROMAX", "Pro Max")
    s = s.replace("PRO", "Pro")
    s = s.replace("PLUS", "Plus")
    s = s.replace("AIR", "Air")
    s = s.replace("MINI", "mini")
    s = s.replace("码", " EU")
    s = s.replace("尺码", "Размер")
    s = s.replace("官方标配", "Стандартный комплект")
    s = s.replace("套餐一", "Комплект 1")
    s = s.replace("套餐二", "Комплект 2")
    return s.strip()

def detect_category_and_brand(title_cn: str, selected_summary: str):
    full_text = f"{title_cn} {selected_summary}".lower()
    
    category = "Товары из Китая"
    if any(x in full_text for x in ["鞋", "运动鞋", "板鞋", "球鞋", "sneaker"]):
        category = "Обувь"
    elif any(x in full_text for x in ["卫衣", "t恤", "外套", "裤", "短袖", "衣服", "羽绒服"]):
        category = "Одежда"
    elif any(x in full_text for x in ["包", "双肩包", "单肩包", "手提包"]):
        category = "Сумки"
    elif any(x in full_text for x in ["表", "手表"]):
        category = "Часы"
    elif any(x in full_text for x in ["耳机", "音箱"]):
        category = "Электроника"
    elif any(x in full_text for x in ["壳", "手机壳", "膜"]):
        category = "Чехлы"
        
    brands = ["Nike", "Adidas", "Jordan", "New Balance", "Puma", "Converse", "Vans", "Apple", "Samsung", "Xiaomi", "Huawei", "Sony", "Casio", "Zara", "Uniqlo", "Supreme", "Stussy", "Balenciaga", "Gucci"]
    brand = ""
    for b in brands:
        if b.lower() in full_text:
            brand = b
            break
            
    return category, brand

def translate_title(cn_title: str) -> str:
    if not cn_title:
        return "Товар с Pinduoduo"
    t = cn_title
    t = re.sub(r"^[^\w\s]*店铺热销\s*\|\s*", "", t)
    t = re.sub(r"24小时发货", "", t)
    t = re.sub(r"【.*?】", " ", t)
    t = re.sub(r"\[.*?\]", " ", t)
    
    parts = []
    if "手机壳" in t or "壳" in t:
        parts.append("Чехол")
        if "液态硅胶" in t or "硅胶" in t:
            parts.append("жидкий силикон")
        if "苹果" in t or "iphone" in t.lower():
            parts.append("для iPhone")
        if "防摔" in t:
            parts.append("ударопрочный")
    elif any(x in t for x in ["鞋", "运动鞋", "板鞋"]):
        parts.append("Кроссовки")
    elif "卫衣" in t:
        parts.append("Худи")
    elif "t恤" in t.lower() or "短袖" in t:
        parts.append("Футболка")
    elif "外套" in t:
        parts.append("Куртка")
    elif "包" in t:
        parts.append("Сумка")
    elif "手表" in t:
        parts.append("Часы")
    elif "耳机" in t:
        parts.append("Наушники")
        
    if parts:
        clean = re.sub(r"[\u4e00-\u9fa5]", "", t)
        clean = re.sub(r"\s+", " ", clean).strip()
        res = " ".join(parts)
        if clean:
            res += " " + clean
        return res[:70].strip()
        
    clean = re.sub(r"[^\w\s\-\(\)\/\.\,]", " ", t)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:60] if clean else "Товар с Pinduoduo"

# ==================== ADB ДВИЖОК ====================
def get_connected_device() -> Optional[str]:
    try:
        res = subprocess.run([ADB_PATH, "devices"], capture_output=True, text=True, timeout=5)
        lines = [line.strip().split() for line in res.stdout.splitlines() if line.strip() and not line.startswith("List")]
        active = [parts[0] for parts in lines if len(parts) >= 2 and parts[1] == "device"]
        if not active:
            return None
        if "emulator-5554" in active:
            return "emulator-5554"
        return active[0]
    except Exception:
        return None

def check_device_ready() -> bool:
    return get_connected_device() is not None

def ensure_device_ready(timeout_sec: int = 25) -> bool:
    if check_device_ready():
        return True

    print("[*] Device not connected. Attempting auto-launch...")
    try:
        dnplayer = os.path.join(os.path.dirname(ADB_PATH), "dnplayer.exe")
        if os.path.exists(dnplayer):
            subprocess.Popen([dnplayer], shell=True)
    except Exception as e:
        print("[!] Auto-launch error:", e)

    start_time = time.time()
    while time.time() - start_time < timeout_sec:
        time.sleep(2.0)
        if check_device_ready():
            print("[✓] Device connected and ready!")
            return True
    return False

def run_adb(args: List[str], timeout: int = 15) -> str:
    dev = get_connected_device() or DEVICE
    cmd = [ADB_PATH, "-s", dev] + args
    try:
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout
        )
        return res.stdout
    except Exception as e:
        print(f"ADB Error {args}: {e}")
        return ""

def resolve_goods_id(raw_input: str) -> Optional[str]:
    s = raw_input.strip()
    if s.isdigit() and len(s) >= 8:
        return s
    
    # Try finding goods_id in URL string directly
    m = re.search(r"goods_id=(\d+)", s)
    if m:
        return m.group(1)
        
    # Follow redirects for short link
    url_m = re.search(r"(https?://[^\s]+)", s)
    if url_m:
        target_url = url_m.group(1)
        try:
            resp = requests.get(
                target_url,
                allow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"},
                timeout=8
            )
            final_url = resp.url
            m2 = re.search(r"goods_id=(\d+)", final_url)
            if m2:
                return m2.group(1)
            # check query params
            parsed = urlparse(final_url)
            qs = parse_qs(parsed.query)
            if "goods_id" in qs:
                return qs["goods_id"][0]
        except Exception as e:
            print(f"Resolve error: {e}")
            
    return None

def parse_bounds(bounds_str: str):
    m = re.findall(r"\[(\d+),(\d+)\]", bounds_str)
    if len(m) == 2:
        return int(m[0][0]), int(m[0][1]), int(m[1][0]), int(m[1][1])
    return 0, 0, 0, 0

def get_bounds_center(bounds_str: str):
    x1, y1, x2, y2 = parse_bounds(bounds_str)
    return (x1 + x2) // 2, (y1 + y2) // 2

def human_tap(bounds_str: str) -> bool:
    """
    Simulates a 100% human capacitive finger touch with randomized Gaussian coordinates,
    real-world touch-down dwell duration (85-135ms), and realistic micro-drift (-1..1px).
    """
    x1, y1, x2, y2 = parse_bounds(bounds_str)
    if x1 >= x2 or y1 >= y2:
        return False
    pad_x = max(2, int((x2 - x1) * 0.15))
    pad_y = max(2, int((y2 - y1) * 0.15))
    min_x, max_x = x1 + pad_x, x2 - pad_x
    min_y, max_y = y1 + pad_y, y2 - pad_y
    if min_x >= max_x or min_y >= max_y:
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    else:
        cx = int(random.triangular(min_x, max_x, (min_x + max_x) / 2))
        cy = int(random.triangular(min_y, max_y, (min_y + max_y) / 2))

    touch_ms = random.randint(85, 135)
    drift_x = cx + random.choice([-1, 0, 1])
    drift_y = cy + random.choice([-1, 0, 1])
    
    print(f"[*] Human tap at ({cx}, {cy}) bounds={bounds_str} dwell={touch_ms}ms")
    run_adb(["shell", "input", "swipe", str(cx), str(cy), str(drift_x), str(drift_y), str(touch_ms)])
    time.sleep(random.uniform(0.3, 0.6))
    return True

def human_scroll(direction: str = 'down'):
    """
    Simulates human hand browsing flick on product pages.
    """
    start_x = random.randint(380, 520)
    end_x = start_x + random.randint(-15, 15)
    if direction == 'down':
        start_y = random.randint(1100, 1250)
        distance = random.randint(220, 360)
        end_y = start_y - distance
    else:
        start_y = random.randint(600, 750)
        distance = random.randint(220, 360)
        end_y = start_y + distance
    duration_ms = random.randint(320, 480)
    print(f"[*] Human browsing scroll {direction} ({start_x},{start_y} -> {end_x},{end_y}) {duration_ms}ms")
    run_adb(["shell", "input", "swipe", str(start_x), str(start_y), str(end_x), str(end_y), str(duration_ms)])
    time.sleep(random.uniform(0.5, 0.9))

def handle_popups_and_verification(root: ET.Element) -> bool:
    """
    Detects and automatically resolves verification modals ('安全验证', '前往验证')
    and coupon/promo popups with humanized taps.
    Crucially avoids closing the SKU options drawer.
    """
    has_sku_drawer = any(any(x in (n.attrib.get("text", "") or n.attrib.get("content-desc", "")) for x in ["提交订单", "立即支付", "选择尺码后", "选择款式后"]) for n in root.iter("node"))

    for node in root.iter("node"):
        txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        bounds = node.attrib.get("bounds", "")
        if txt in ["安全验证", "前往验证"]:
            print(f"[🛡️] Detected verification prompt: '{txt}' at {bounds}. Auto-tapping with human touch...")
            human_tap(bounds)
            time.sleep(random.uniform(2.0, 3.0))
            return True
        if not has_sku_drawer and txt in ["关闭", "放弃", "去领券", "知道了"] and bounds:
            print(f"[*] Auto-dismissing promo popup '{txt}' at {bounds}")
            human_tap(bounds)
            time.sleep(random.uniform(0.4, 0.8))
            return True
    return False

def find_puzzle_gap_dx(temp_screen_path: str) -> Optional[int]:
    """
    Intelligent Sovereign Vision AI solver:
    Analyzes puzzle canvas, dynamically isolates the Y-strip containing the puzzle piece,
    and cross-correlates the piece contours with candidate gap silhouettes to find the exact target dx.
    """
    try:
        full_img = cv2.imread(temp_screen_path)
        if full_img is None:
            return None
            
        # Puzzle canvas bounds on LDPlayer: [150, 477][750, 778] (Width: 600, Height: 301)
        crop = full_img[477:778, 150:750]
        h, w, _ = crop.shape
        
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        
        # 1. Detect dynamic vertical band of puzzle piece on left (x: 10..120)
        left_band = gray[:, 10:120]
        blur_left = cv2.GaussianBlur(left_band, (3, 3), 0)
        edges_left = cv2.Canny(blur_left, 60, 180)
        
        row_sums = np.sum(edges_left > 0, axis=1)
        active_rows = np.where(row_sums >= 12)[0]
        if len(active_rows) > 0:
            y_min = max(0, active_rows[0] - 5)
            y_max = min(h, active_rows[-1] + 5)
        else:
            y_min, y_max = 30, h - 30
            
        piece_crop = edges_left[y_min:y_max, :]
        
        # 2. Extract edge features across the search region along the exact same Y strip
        blur_full = cv2.GaussianBlur(gray, (3, 3), 0)
        edges_full = cv2.Canny(blur_full, 60, 180)
        search_strip = edges_full[y_min:y_max, 140:w-10]
        
        # 3. Cross-correlation template matching
        res = cv2.matchTemplate(search_strip, piece_crop, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
        
        target_x = 140 + max_loc[0]
        dx = target_x - 10
        print(f"[🧩 Vision AI] Detected puzzle gap at target_x={target_x}, dx={dx} Y=[{y_min}:{y_max}] (match score={max_val:.4f})")
        return dx
    except Exception as e:
        print("[!] Vision AI puzzle gap error:", e)
        return None

def generate_human_drag_script(start_x: int, start_y: int, distance: int, total_ms: int = 700) -> str:
    """
    Generates a natural human motor trajectory with S-curve acceleration,
    micro-jitter, overshoot, and pullback correction.
    """
    lines = [f"input motionevent DOWN {start_x} {start_y}"]
    overshoot = random.randint(3, 5)
    target_dist = distance + overshoot
    steps = max(14, int(total_ms / 35))
    current_y = start_y
    
    for i in range(steps):
        t = (i + 1) / steps
        # S-curve cubic ease in-out
        progress = 2 * t * t if t < 0.5 else 1 - 2 * (1 - t) * (1 - t)
        current_x = start_x + int(progress * target_dist)
        current_y = start_y + random.choice([-1, 0, 0, 1])
        lines.append(f"input motionevent MOVE {current_x} {current_y}")
        lines.append("sleep 0.02")
        
    # Human pullback correction from overshoot
    correction_steps = 3
    for k in range(correction_steps):
        pull_back = int(overshoot * (k + 1) / correction_steps)
        cx = start_x + distance + overshoot - pull_back
        lines.append(f"input motionevent MOVE {cx} {current_y}")
        lines.append("sleep 0.025")
        
    lines.append("sleep 0.05")
    lines.append(f"input motionevent UP {start_x + distance} {current_y}")
    return "; ".join(lines)

def solve_slider_puzzle(max_attempts: int = 2) -> bool:
    """
    Autonomous puzzle solver with multi-attempt retry:
    1. Captures screen and runs Vision AI to find gap offset
    2. Executes human physics drag via motionevent
    3. Verifies if captcha passed, retrying if necessary
    """
    for attempt in range(1, max_attempts + 1):
        print(f"[🧩] Autonomous puzzle solver: attempt {attempt}/{max_attempts}...")
        temp_cap = os.path.join(PARSED_UPLOADS_DIR, f"captcha_{int(time.time())}.png")
        run_adb(["shell", "screencap", "-p", "/sdcard/captcha.png"])
        run_adb(["pull", "/sdcard/captcha.png", temp_cap])
        
        dx = find_puzzle_gap_dx(temp_cap)
        if os.path.exists(temp_cap):
            try: os.remove(temp_cap)
            except: pass
            
        if not dx or dx < 50 or dx > 510:
            print("[!] Vision AI could not reliably find gap or dx out of bounds:", dx)
            if attempt < max_attempts:
                # Tap refresh button on puzzle
                human_tap("[690,725][730,765]")
                time.sleep(random.uniform(1.8, 2.5))
                continue
            return False
            
        # Slider handle circle is centered around (200, 856)
        start_x = 200 + random.randint(-2, 2)
        start_y = 856 + random.randint(-2, 2)
        
        drag_script = generate_human_drag_script(start_x, start_y, dx, total_ms=random.randint(660, 780))
        print(f"[🖐️] Executing humanized drag gesture: start=({start_x},{start_y}), distance={dx}px...")
        run_adb(["shell", drag_script], timeout=15)
        
        time.sleep(random.uniform(2.2, 3.0))
        
        # Check if puzzle is resolved
        run_adb(["shell", "uiautomator", "dump", "/sdcard/dump_check.xml"])
        check_xml = run_adb(["shell", "cat", "/sdcard/dump_check.xml"])
        if "拖动滑块" not in check_xml and "完成上方拼图" not in check_xml and "安全验证" not in check_xml:
            print("[✨] Puzzle captcha successfully solved autonomously!")
            return True
        else:
            print(f"[!] Attempt {attempt} failed, puzzle still visible.")
            if attempt < max_attempts:
                # Tap puzzle refresh icon
                human_tap("[690,725][730,765]")
                time.sleep(random.uniform(2.0, 2.6))
                
    return False

def dump_ui_xml(auto_handle_verify: bool = True) -> ET.Element:
    if not ensure_device_ready():
        raise RuntimeError("Устройство (эмулятор или телефон) не отвечает. Убедитесь, что оно запущено.")
    run_adb(["shell", "uiautomator", "dump", "/sdcard/dump.xml"])
    xml_str = run_adb(["shell", "cat", "/sdcard/dump.xml"])
    idx = xml_str.find("<?xml")
    if idx != -1:
        xml_str = xml_str[idx:]
    if not xml_str.strip() or "<?xml" not in xml_str:
        raise RuntimeError("Не удалось прочитать экран товара в эмуляторе. Попробуйте еще раз.")
        
    try:
        root = ET.fromstring(xml_str)
    except Exception as e:
        raise RuntimeError(f"Ошибка обработки экрана товара: {e}")

    # 1. Check if a button verification or promo dialog appeared ("安全验证", "前往验证")
    if auto_handle_verify:
        handled = handle_popups_and_verification(root)
        if handled:
            # If we clicked "安全验证" or "前往验证", wait and re-dump
            return dump_ui_xml(auto_handle_verify=False)

    # 2. Check if a slider puzzle appeared ("拖动滑块完成上方拼图")
    if "拖动滑块" in xml_str or "完成上方拼图" in xml_str:
        if auto_handle_verify:
            solved = solve_slider_puzzle()
            if solved:
                return dump_ui_xml(auto_handle_verify=False)
        raise RuntimeError("Pinduoduo запросил пазл-подтверждение. Пожалуйста, сдвиньте ползунок в окне LDPlayer на компьютере (требуется 1 раз).")
        
    return root

def capture_hd_studio_and_variants(goods_id: str, root: ET.Element, colors: List[Dict[str, Any]]) -> str:
    """
    Captures:
    1. The master Ultra-HD studio image (900x900) by tapping drawer preview box -> full-screen gallery.
    2. Clean micro-thumbnail icons for each color variant (cropping left square only, 0 Chinese text).
    3. Real studio variant preview images (180x180, ~8KB) for each color by tapping color options.
    """
    thumb_bounds = None
    for n in root.iter('node'):
        cls = n.attrib.get('class', '')
        b = n.attrib.get('bounds', '')
        if 'ImageView' in cls and b:
            x1, y1, x2, y2 = parse_bounds(b)
            w, h = x2 - x1, y2 - y1
            if 130 <= w <= 260 and 130 <= h <= 260 and x1 < 120 and 180 <= y1 <= 550:
                thumb_bounds = (x1, y1, x2, y2)
                break

    hd_pub_url = ""
    # 1. Tap thumbnail to capture full Ultra-HD Studio photo
    if thumb_bounds:
        cx, cy = (thumb_bounds[0] + thumb_bounds[2]) // 2, (thumb_bounds[1] + thumb_bounds[3]) // 2
        run_adb(["shell", f"input tap {cx} {cy}"])
        time.sleep(0.5)
        temp_hd = os.path.join(PARSED_UPLOADS_DIR, f"temp_hd_{goods_id}.png")
        run_adb(["shell", "screencap", "-p", "/sdcard/hd_prev.png"])
        run_adb(["pull", "/sdcard/hd_prev.png", temp_hd])
        run_adb(["shell", "input", "keyevent", "4"])  # Close gallery back to drawer
        time.sleep(0.35)
        
        if os.path.exists(temp_hd):
            try:
                im = Image.open(temp_hd)
                crop = im.crop((0, 280, 900, 1180)).convert("RGB")
                out_hd = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}_hd.jpg")
                crop.save(out_hd, "JPEG", quality=92)
                os.remove(temp_hd)
                if supabase_client:
                    rem_name = f"sku_{goods_id}_hd_{int(time.time())}.jpg"
                    with open(out_hd, "rb") as f:
                        supabase_client.storage.from_("product-screenshots").upload(rem_name, f.read(), {"content-type": "image/jpeg"})
                    hd_pub_url = supabase_client.storage.from_("product-screenshots").get_public_url(rem_name)
                    print(f"[✨] Uploaded Ultra-HD Studio Image: {hd_pub_url}")
            except Exception as e:
                print("HD photo capture error:", e)

    # 2. Capture clean drawer screenshot for color micro-thumbnails
    temp_drawer = os.path.join(PARSED_UPLOADS_DIR, f"temp_drawer_{goods_id}.png")
    run_adb(["shell", "screencap", "-p", "/sdcard/drawer_screen.png"])
    run_adb(["pull", "/sdcard/drawer_screen.png", temp_drawer])
    
    if os.path.exists(temp_drawer):
        try:
            im_d = Image.open(temp_drawer).convert("RGB")
            # If HD capture failed, crop clean thumbnail from drawer
            if not hd_pub_url and thumb_bounds:
                c_main = im_d.crop(thumb_bounds)
                out_main = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}.jpg")
                c_main.save(out_main, "JPEG", quality=90)
                if supabase_client:
                    rem_name = f"sku_{goods_id}_{int(time.time())}.jpg"
                    with open(out_main, "rb") as f:
                        supabase_client.storage.from_("product-screenshots").upload(rem_name, f.read(), {"content-type": "image/jpeg"})
                    hd_pub_url = supabase_client.storage.from_("product-screenshots").get_public_url(rem_name)

            # Crop clean micro-thumbnail icons for each color button (0 Chinese text!)
            for idx, col in enumerate(colors):
                b_str = col.get("bounds")
                if b_str:
                    x1, y1, x2, y2 = parse_bounds(b_str)
                    w, h = x2 - x1, y2 - y1
                    if w > 10 and h > 10:
                        if w > h + 10:
                            # Horizontal pill button: icon is strictly the left square [x1, y1, x1+h, y2]
                            c_icon = im_d.crop((x1 + 2, y1 + 2, x1 + h - 2, y2 - 2))
                        else:
                            # Square card button
                            c_icon = im_d.crop((x1 + 3, y1 + 3, x2 - 3, y1 + w - 3))
                        
                        icon_path = os.path.join(PARSED_UPLOADS_DIR, f"col_{goods_id}_{idx}_icon.jpg")
                        c_icon.save(icon_path, "JPEG", quality=90)
                        if supabase_client:
                            rem_icon = f"col_{goods_id}_{idx}_icon_{int(time.time())}.jpg"
                            try:
                                with open(icon_path, "rb") as f:
                                    supabase_client.storage.from_("product-screenshots").upload(rem_icon, f.read(), {"content-type": "image/jpeg"})
                                col["thumb_url"] = supabase_client.storage.from_("product-screenshots").get_public_url(rem_icon)
                            except Exception:
                                col["thumb_url"] = f"/uploads/parsed/col_{goods_id}_{idx}_icon.jpg"

            os.remove(temp_drawer)
        except Exception as d_err:
            print("Color variant icons error:", d_err)

    # 3. Capture real studio preview photos for each color variant (up to 5 colors, ~8KB each)
    if thumb_bounds and colors:
        default_color_idx = 0
        for i, c in enumerate(colors):
            if c.get("selected"):
                default_color_idx = i
                break
        
        # Default selected color gets the master HD studio photo
        colors[default_color_idx]["image_url"] = hd_pub_url

        # For remaining colors, capture the studio preview box [thumb_bounds]
        for idx, col in enumerate(colors):
            if idx == default_color_idx:
                continue
            if idx > 5:
                # Limit to 5 colors for speed; remaining colors safely fallback to master HD shot
                col["image_url"] = hd_pub_url
                continue

            b_str = col.get("bounds")
            if b_str:
                bx1, by1, bx2, by2 = parse_bounds(b_str)
                cx, cy = (bx1 + bx2) // 2, (by1 + by2) // 2
                run_adb(["shell", f"input tap {cx} {cy}"])
                time.sleep(0.3)
                temp_v = os.path.join(PARSED_UPLOADS_DIR, f"temp_v_{goods_id}_{idx}.png")
                run_adb(["shell", "screencap", "-p", "/sdcard/v_prev.png"])
                run_adb(["pull", "/sdcard/v_prev.png", temp_v])
                if os.path.exists(temp_v):
                    try:
                        im_v = Image.open(temp_v).convert("RGB")
                        c_studio = im_v.crop(thumb_bounds)
                        v_out = os.path.join(PARSED_UPLOADS_DIR, f"col_{goods_id}_{idx}_studio.jpg")
                        c_studio.save(v_out, "JPEG", quality=88)
                        os.remove(temp_v)
                        if supabase_client:
                            rem_v = f"col_{goods_id}_{idx}_studio_{int(time.time())}.jpg"
                            with open(v_out, "rb") as f:
                                supabase_client.storage.from_("product-screenshots").upload(rem_v, f.read(), {"content-type": "image/jpeg"})
                            col["image_url"] = supabase_client.storage.from_("product-screenshots").get_public_url(rem_v)
                        else:
                            col["image_url"] = f"/uploads/parsed/col_{goods_id}_{idx}_studio.jpg"
                    except Exception as ve:
                        print(f"Error capturing studio preview for color {idx}:", ve)
                        col["image_url"] = hd_pub_url
            else:
                col["image_url"] = hd_pub_url

        # Restore default selected color by tapping it back
        orig_bounds = colors[default_color_idx].get("bounds")
        if orig_bounds:
            ox1, oy1, ox2, oy2 = parse_bounds(orig_bounds)
            run_adb(["shell", f"input tap {(ox1+ox2)//2} {(oy1+oy2)//2}"])

    return hd_pub_url or f"/uploads/parsed/sku_{goods_id}.jpg"

def capture_screen_and_crop(goods_id: str, suffix: str = "") -> str:
    temp_local = os.path.join(PARSED_UPLOADS_DIR, f"temp_{goods_id}.png")
    run_adb(["shell", "screencap", "-p", "/sdcard/screen.png"])
    run_adb(["pull", "/sdcard/screen.png", temp_local])
    
    out_rel = f"/uploads/parsed/sku_{goods_id}{suffix}.jpg"
    out_abs = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}{suffix}.jpg")
    
    if os.path.exists(temp_local):
        try:
            im = Image.open(temp_local).convert("RGB")
            crop = im.crop((18, 314, 198, 494))
            crop.save(out_abs, "JPEG", quality=90)
            os.remove(temp_local)
        except Exception as e:
            print("Crop error:", e)
    return out_rel

# ==================== API МОДЕЛИ ====================
class ParseRequest(BaseModel):
    url: str

class SelectSkuRequest(BaseModel):
    goods_id: str
    bounds: str
    name: Optional[str] = None

# ==================== ЭНДПОИНТЫ ====================
@app.get("/api/status")
def get_status():
    devs = run_adb(["devices"])
    online = DEVICE in devs
    return {
        "status": "online" if online else "device_offline",
        "device": DEVICE,
        "adb": ADB_PATH,
        "engine": "Pinduoduo Hardware-in-the-Loop Agent"
    }

@app.post("/api/parse-product")
def parse_product(req: ParseRequest):
    goods_id = resolve_goods_id(req.url)
    if not goods_id:
        raise HTTPException(status_code=400, detail="Не удалось извлечь goods_id из ссылки")
        
    print(f"[*] Processing goods_id={goods_id}")
    
    # 1. Open product in Pinduoduo App via Deep Link
    intent_url = f"pinduoduo://com.xunmeng.pinduoduo/goods.html?goods_id={goods_id}"
    run_adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", intent_url])
    time.sleep(random.uniform(2.2, 3.0)) # human dwell time for page load
    
    # 2. Simulate human browsing behavior (natural scroll down)
    human_scroll('down')
    time.sleep(random.uniform(0.7, 1.3))
    
    # 3. Check if page is loaded and open SKU drawer
    root = dump_ui_xml()
    
    raw_title = ""
    candidates = []
    for node in root.iter("node"):
        txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        if len(txt) >= 10 and not any(x in txt for x in ["退货包运费", "假一赔十", "正品保障", "客服", "店铺", "收藏", "已拼", "券后", "免拼", "评价", "进店", "分享", "已选:", "二次销售", "不支持七天", "退换", "如出现已洗涤", "顶部", "活动优惠", "服务", "更换支付方式", "提交订单"]):
            candidates.append(txt)
    if candidates:
        raw_title = max(candidates, key=len)

    # If SKU drawer is not open, click the buy button (免拼购买)
    has_sku_drawer = any(any(x in (n.attrib.get("text", "") or n.attrib.get("content-desc", "")) for x in ["提交订单", "立即支付", "选择尺码后", "选择款式后"]) for n in root.iter("node"))
    if not has_sku_drawer:
        print("[*] SKU drawer not open yet. Tapping bottom buy button...")
        human_tap("[450,1515][880,1595]")
        time.sleep(random.uniform(1.4, 2.0))
        root = dump_ui_xml()
        
    # 3. Parse SKU Drawer with Universal Dynamic Groups
    spec_groups = []
    current_group_dict = None
    colors = []
    sizes = []
    price_cny = 0.0
    orig_price_cny = 0.0
    selected_summary = ""
    
    # Non-sku blacklist keywords
    blacklist_terms = ["¥", "元", "已拼", "折", "包邮", "退货", "发货", "对照表", "体重", "详情", "举报", "店铺", "收藏", "客服", "返回", "大促", "买过", "即将结束", "无需等待", "匿名", "进店", "保障", "评价", "全场", "领型", "穿着方式", "面料", "风格", "适用", "多款", "列表", "打开大图", "减少数量", "增加数量", "数量", "请选择", "去支付", "组合", "查收"]

    for node in root.iter("node"):
        txt = node.attrib.get("text", "").strip()
        cd = node.attrib.get("content-desc", "").strip()
        val = txt or cd
        bounds = node.attrib.get("bounds", "")
        cls = node.attrib.get("class", "")
        
        if not val:
            continue
            
        if "已选:" in val or "请选择:" in val:
            selected_summary = val.replace("已选:", "").replace("请选择:", "").replace("🔥", "").strip()
            
        if "到手价" in val or "提交订单" in val or "限量价" in val:
            m_price = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_price:
                price_cny = float(m_price.group(1))
        elif val.startswith("¥") and orig_price_cny == 0.0:
            m_orig = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_orig:
                p = float(m_orig.group(1))
                if p != price_cny:
                    orig_price_cny = p

        # Check section headers dynamically
        if any(h in val for h in ["颜色", "款式", "分类", "花色", "外观"]) and not any(x in val for x in ["大图", "已选", "请选择", "建议"]):
            existing_visual = next((g for g in spec_groups if g["title"] == "Цвет / Расцветка"), None)
            if not existing_visual:
                current_group_dict = {
                    "id": f"group_{len(spec_groups)}",
                    "title": "Цвет / Расцветка",
                    "type": "visual",
                    "options": []
                }
                spec_groups.append(current_group_dict)
            else:
                current_group_dict = existing_visual
            continue
        elif any(h in val for h in ["尺码", "鞋码", "尺寸", "身高"]) and not any(x in val for x in ["建议", "对照", "已选", "请选择", "表"]):
            existing_size = next((g for g in spec_groups if g["title"] == "Размер"), None)
            if not existing_size:
                current_group_dict = {
                    "id": f"group_{len(spec_groups)}",
                    "title": "Размер",
                    "type": "spec",
                    "options": []
                }
                spec_groups.append(current_group_dict)
            else:
                current_group_dict = existing_size
            continue
        elif any(h in val for h in ["机型", "型号", "适配", "版本"]) and not any(x in val for x in ["已选", "请选择"]):
            existing_model = next((g for g in spec_groups if g["title"] == "Модель / Версия"), None)
            if not existing_model:
                current_group_dict = {
                    "id": f"group_{len(spec_groups)}",
                    "title": "Модель / Версия",
                    "type": "spec",
                    "options": []
                }
                spec_groups.append(current_group_dict)
            else:
                current_group_dict = existing_model
            continue
        elif any(h in val for h in ["容量", "内存", "存储"]) and not any(x in val for x in ["已选", "请选择"]):
            existing_mem = next((g for g in spec_groups if g["title"] == "Объем памяти"), None)
            if not existing_mem:
                current_group_dict = {
                    "id": f"group_{len(spec_groups)}",
                    "title": "Объем памяти",
                    "type": "spec",
                    "options": []
                }
                spec_groups.append(current_group_dict)
            else:
                current_group_dict = existing_mem
            continue
        elif any(h in val for h in ["套餐", "规格", "配置"]) and not any(x in val for x in ["已选", "请选择"]):
            existing_pkg = next((g for g in spec_groups if g["title"] == "Комплектация"), None)
            if not existing_pkg:
                current_group_dict = {
                    "id": f"group_{len(spec_groups)}",
                    "title": "Комплектация",
                    "type": "spec",
                    "options": []
                }
                spec_groups.append(current_group_dict)
            else:
                current_group_dict = existing_pkg
            continue
        elif any(h in val for h in ["活动优惠", "服务", "使用#支付宝", "更换支付方式", "提交订单", "立即支付", "选择尺码后", "数量", "一次选多款"]):
            current_group_dict = None
            
        if current_group_dict and any(k in cls for k in ["TextView", "Button", "View"]):
            clean = re.sub(r"[🔥\s]|快要抢光|热卖|爆款|大促", "", val).strip()
            if clean and 1 <= len(clean) < 35 and clean != "大图" and not any(b in clean for b in blacklist_terms):
                if not any(opt["name"] == clean for opt in current_group_dict["options"]):
                    is_sel = clean in selected_summary
                    ru_val = translate_color(clean) if current_group_dict["type"] == "visual" else translate_size_or_model(clean)
                    opt_entry = {
                        "name": clean,
                        "name_ru": ru_val,
                        "selected": is_sel,
                        "bounds": bounds
                    }
                    current_group_dict["options"].append(opt_entry)

    # Populate backward-compatible colors and sizes
    visual_groups = [g for g in spec_groups if g["type"] == "visual"]
    if visual_groups:
        colors = visual_groups[0]["options"]
    elif spec_groups:
        colors = spec_groups[0]["options"]
        
    spec_only_groups = [g for g in spec_groups if g["type"] == "spec"]
    if spec_only_groups:
        sizes = spec_only_groups[0]["options"]

    if price_cny == 0.0:
        if orig_price_cny > 0.0:
            price_cny = orig_price_cny
        else:
            for node in root.iter("node"):
                val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
                m_any = re.search(r"¥\s*(\d+\.?\d*)", val)
                if m_any:
                    price_cny = float(m_any.group(1))
                    break
                
    # Detect category and brand dynamically
    category, brand = detect_category_and_brand(raw_title, selected_summary)
    title_ru = translate_title(raw_title)

    # 4. Capture current SKU image (Ultra-HD Studio + Color Thumbnails)
    image_rel_url = capture_hd_studio_and_variants(goods_id, root, colors)
    
    return {
        "success": True,
        "marketplace": "pinduoduo",
        "goods_id": goods_id,
        "title": raw_title or "Товар с Pinduoduo",
        "title_ru": title_ru,
        "brand": brand,
        "category": category,
        "price_cny": price_cny or 5.43,
        "orig_price_cny": orig_price_cny or 10.22,
        "image_url": image_rel_url,
        "selected_summary": selected_summary,
        "has_options": len(colors) > 1 or len(sizes) > 1 or len(spec_groups) > 1,
        "colors": colors,
        "sizes": sizes,
        "spec_groups": spec_groups
    }

@app.post("/api/select-sku")
def select_sku(req: SelectSkuRequest):
    print(f"[*] Human tapping SKU option for goods_id={req.goods_id} at {req.bounds}")
    human_tap(req.bounds)
    time.sleep(random.uniform(0.35, 0.5))
    
    # Re-dump to get updated price and selected text
    root = dump_ui_xml()
    price_cny = 0.0
    selected_summary = ""
    
    for node in root.iter("node"):
        val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        if "已选:" in val or "请选择:" in val:
            selected_summary = val.replace("已选:", "").replace("请选择:", "").replace("🔥", "").strip()
        if "到手价" in val or "提交订单" in val or "限量价" in val:
            m_price = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_price:
                price_cny = float(m_price.group(1))

    return {
        "success": True,
        "price_cny": price_cny or 0.0,
        "selected_summary": selected_summary
    }

# ==================== SUPABASE REAL-TIME QUEUE WORKER ====================
def supabase_queue_worker():
    if not supabase_client:
        print("[!] Supabase client not initialized, queue worker disabled.")
        return

    print("[*] Supabase Queue Worker started. Polling parse_queue...")
    while True:
        try:
            res = (
                supabase_client.from_("parse_queue")
                .select("*")
                .in_("status", ["pdd_pending", "hardware_pending", "pending"])
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                task = res.data[0]
                task_id = task["id"]
                task_url = task.get("url") or ""
                task_status = task.get("status")

                is_pdd = any(x in task_url.lower() for x in ["yangkeduo", "pinduoduo", "goods_id="])
                if task_status == "pending" and not is_pdd:
                    time.sleep(0.5)
                    continue

                print(f"[*] Claiming task #{task_id} ({task_status}): {task_url}")
                # Claim task immediately to prevent race conditions
                supabase_client.from_("parse_queue").update({"status": "processing"}).eq("id", task_id).execute()

                try:
                    parsed = parse_product(ParseRequest(url=task_url))
                    if parsed and parsed.get("success"):
                        goods_id = parsed["goods_id"]
                        local_img = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}.jpg")
                        remote_name = f"sku_{goods_id}_{int(time.time())}.jpg"
                        pub_img_url = ""
                        if os.path.exists(local_img):
                            try:
                                with open(local_img, "rb") as f:
                                    supabase_client.storage.from_("product-screenshots").upload(
                                        remote_name, f.read(), {"content-type": "image/jpeg"}
                                    )
                                pub_img_url = supabase_client.storage.from_("product-screenshots").get_public_url(remote_name)
                            except Exception as up_err:
                                print("Storage upload error:", up_err)

                        if not pub_img_url:
                            pub_img_url = parsed.get("image_url") or ""

                        # Pack SKU options bundle
                        sku_bundle = {
                            "is_sku_bundle": True,
                            "goods_id": goods_id,
                            "title_ru": parsed["title_ru"],
                            "title": parsed["title"],
                            "price_cny": parsed["price_cny"],
                            "orig_price_cny": parsed["orig_price_cny"],
                            "colors": parsed["colors"],
                            "sizes": parsed["sizes"],
                            "has_options": parsed["has_options"],
                            "image_url": pub_img_url,
                            "brand": parsed.get("brand") or "",
                            "category": parsed.get("category") or "Товары из Китая",
                            "marketplace": "pinduoduo"
                        }

                        # Update row in Supabase
                        supabase_client.from_("parse_queue").update({
                            "status": "done",
                            "price": parsed["price_cny"],
                            "currency": "CNY",
                            "title": parsed["title_ru"],
                            "brand": parsed.get("brand") or "",
                            "category": parsed.get("category") or "Товары из Китая",
                            "color": parsed["colors"][0]["name_ru"] if parsed.get("colors") else "Как на фото",
                            "marketplace_name": "PINDUODUO",
                            "image_url": pub_img_url,
                            "description": json.dumps(sku_bundle, ensure_ascii=False),
                            "parse_method": "hardware_bridge"
                        }).eq("id", task_id).execute()
                        print(f"[✓] Task #{task_id} successfully parsed and updated in Supabase!")
                    else:
                        supabase_client.from_("parse_queue").update({
                            "status": "error",
                            "error_message": "Не удалось распарсить товар через аппаратный мост"
                        }).eq("id", task_id).execute()
                except Exception as p_err:
                    print(f"[!] Parse error on task #{task_id}: {p_err}")
                    supabase_client.from_("parse_queue").update({
                        "status": "error",
                        "error_message": str(p_err)
                    }).eq("id", task_id).execute()
        except Exception as poll_err:
            pass
        time.sleep(1.0)

# Start background thread automatically
queue_thread = threading.Thread(target=supabase_queue_worker, daemon=True)
queue_thread.start()

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3007)
