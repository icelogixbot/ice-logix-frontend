import os
import sys

# Safe stdout/stderr redirection for background pythonw.exe execution
LOG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "logs"))
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "market_bridge.log")

if hasattr(sys.stdout, "reconfigure") and sys.stdout is not None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure") and sys.stderr is not None:
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    log_fp = open(LOG_FILE, "a", encoding="utf-8", buffering=1, errors="replace")
    if sys.stdout is None:
        sys.stdout = log_fp
    if sys.stderr is None:
        sys.stderr = log_fp
except Exception:
    pass

def _handle_exception(exc_type, exc_value, exc_traceback):
    import traceback
    err_text = "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    try:
        with open(LOG_FILE, "a", encoding="utf-8", errors="replace") as f:
            f.write("\n[CRITICAL UNCAUGHT EXCEPTION]\n" + err_text + "\n")
    except Exception:
        pass
    if sys.__stderr__:
        try:
            sys.__stderr__.write(err_text)
        except Exception:
            pass

sys.excepthook = _handle_exception

import re
import time
import json
import random
import threading
import subprocess
from concurrent.futures import ThreadPoolExecutor
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
    "浅灰色": "Светло-серый",
    "深灰色": "Темно-серый",
    "粉红色": "Розовый",
    "花灰色": "Меланж серый",
    "燕麦色": "Овсяный",
    "驼色": "Верблюжий",
    "焦糖色": "Карамельный",
    "冰川蓝": "Ледниковый синий",
    "蜜桃粉": "Персиковый розовый",
    "藏青": "Темно-синий",
}

# ==================== FASHION & LUXURY INTELLIGENCE ENGINE ====================
BRAND_RULES = [
    (["acne studios", "acne", "ac", "ac同款"], "Acne Studios"),
    (["bottega veneta", "bottega", "bv", "葆蝶家"], "Bottega Veneta"),
    (["balenciaga", "巴黎世家", "3xl", "defender", "triple s", "runner"], "Balenciaga"),
    (["maison margiela", "margiela", "马吉拉", "德训", "tabi"], "Maison Margiela"),
    (["rick owens", "大匡威", "ro暗黑"], "Rick Owens"),
    (["c.p. company", "cp company", "cp公司", "护目镜", "goggle"], "C.P. Company"),
    (["stone island", "石头岛", "罗盘"], "Stone Island"),
    (["arc'teryx", "arcteryx", "始祖鸟"], "Arc'teryx"),
    (["salomon", "萨洛蒙", "xt-6", "xt6", "acs pro"], "Salomon"),
    (["nike", "耐克", "dunk", "jordan", "air force", "kobe", "vomero"], "Nike"),
    (["adidas", "阿迪达斯", "samba", "gazelle", "yeezy", "spezial", "campus", "bad bunny"], "Adidas"),
    (["new balance", "nb", "1906r", "2002r", "9060", "530", "990"], "New Balance"),
    (["asics", "亚瑟士", "kayano", "gt-2160", "nimbus"], "Asics"),
    (["on running", "昂跑", "cloudmonster", "cloudtilt"], "On Running"),
    (["hoka", "霍卡", "clifton", "bondi", "tor ultra"], "Hoka One One"),
    (["casio", "卡西欧", "g-shock", "edifice"], "Casio"),
    (["rolex", "劳力士", "submariner", "daytona", "datejust"], "Rolex"),
    (["tissot", "天梭", "prx"], "Tissot"),
    (["apple", "苹果", "iphone", "airpods"], "Apple"),
    (["supreme"], "Supreme"),
    (["stussy", "斯图西"], "Stussy"),
    (["trapstar"], "Trapstar"),
    (["syna world", "syna"], "Syna World"),
    (["corteiz", "crtz"], "Corteiz"),
    (["hellstar"], "Hellstar"),
    (["represent"], "Represent"),
    (["fear of god", "essentials", "fog"], "Essentials (FOG)"),
    (["rhude"], "Rhude"),
    (["amiri"], "Amiri"),
    (["off-white", "off white", "ow"], "Off-White"),
    (["palm angels"], "Palm Angels"),
    (["vetements"], "Vetements"),
    (["jacquemus"], "Jacquemus"),
    (["gucci", "古驰"], "Gucci"),
    (["prada", "普拉达"], "Prada"),
    (["louis vuitton", "lv", "路易威登"], "Louis Vuitton"),
    (["dior", "迪奥"], "Dior"),
    (["celine", "思琳"], "Celine"),
    (["saint laurent", "ysl", "圣罗兰"], "Saint Laurent"),
    (["loewe", "罗意威"], "Loewe"),
    (["miu miu", "缪缪"], "Miu Miu"),
    (["moncler", "盟可睐", "蒙口"], "Moncler"),
    (["zara"], "Zara"),
    (["uniqlo", "优衣库"], "Uniqlo"),
]

CHINESE_FASHION_SUBST = {
    "老爹鞋": " массивные кроссовки ",
    "面包鞋": " дутые кеды ",
    "德训鞋": " кеды Replica ",
    "小白鞋": " белые кеды ",
    "板鞋": " кеды ",
    "运动鞋": " кроссовки ",
    "球鞋": " кроссовки ",
    "雪地靴": " зимние угги ",
    "马丁靴": " ботинки ",
    "切尔西靴": " ботинки челси ",
    "羽绒服": " пуховик ",
    "冲锋衣": " мембранная ветровка ",
    "棒球服": " куртка-бомбер ",
    "夹克": " куртка ",
    "外套": " куртка ",
    "皮衣": " кожаная куртка ",
    "卫衣": " худи ",
    "长袖T恤": " лонгслив ",
    "长袖t恤": " лонгслив ",
    "短袖T恤": " футболка ",
    "T恤": " футболка ",
    "t恤": " футболка ",
    "做旧": " винтажный с потертостями ",
    "磨破洞": " с рваным эффектом ",
    "防晒": " легкий ",
    "圆领": " с круглым вырезом ",
    "卫裤": " спортивные брюки ",
    "工装裤": " брюки карго ",
    "牛仔裤": " джинсы ",
    "短裤": " шорты ",
    "手表": " часы наручные ",
    "机械表": " механические часы ",
    "石英表": " кварцевые часы ",
    "手机壳": " чехол для iPhone ",
    "只配鞋盒和防尘袋": " (коробка + пыльник) ",
    "配鞋盒和防尘袋": " (коробка + пыльник) ",
    "防尘袋": " пыльник ",
    "鞋盒": " коробка ",
    "带鞋盒": " (с коробкой) ",
    "原装盒": " (фирменная коробка) ",
    "加绒": " с утеплением ",
    "加厚": " утепленный ",
    "薄款": " облегченный ",
    "黑武士": " Black Phantom ",
    "白冰蓝": " Ice Blue ",
    "灰橙": " Beluga ",
    "男女同款": " унисекс ",
    "情侣款": " унисекс ",
    "男女款": " унисекс ",
    "男女": " унисекс ",
    "同款": " ",
    "外贸": " ",
    "爆款": " ",
    "热卖": " ",
    "百搭": " ",
    "休闲": " ",
    "增高": " ",
    "厚底": " на платформе ",
    "官方标配": "Стандартный комплект",
    "套餐一": "Комплект 1",
    "套餐二": "Комплект 2",
}

def translate_raw_gtx(text: str) -> str:
    if not text or not text.strip():
        return ""
    try:
        r = requests.get(
            "https://translate.googleapis.com/translate_a/single",
            params={"client": "gtx", "sl": "zh-CN", "tl": "ru", "dt": "t", "q": text},
            timeout=3.5
        )
        if r.ok:
            return "".join([p[0] for p in r.json()[0] if p and p[0]]).strip()
    except Exception:
        pass
    return text

def preprocess_fashion_text(t: str) -> str:
    res = re.sub(r"【.*?】|\[.*?\]|店铺热销|24小时发货|快要抢光|爆款|大促|官方正品|原装|🔥|颜值逆天|贼好|很满意|走时很准", " ", t)
    for cn, ru in CHINESE_FASHION_SUBST.items():
        res = res.replace(cn, ru)
    res = re.sub(r"\s+", " ", res).strip()
    return res

def clean_and_translate_option(name_cn: str, is_color: bool = True) -> str:
    clean = re.sub(r"[🔥\s]|快要抢光|热卖|爆款|大促", " ", name_cn).strip()
    
    # 1. Direct dictionary match
    for cn, ru in COLOR_DICT.items():
        if clean == cn:
            return ru
            
    # 2. Preprocess specialized fashion terms
    pre = preprocess_fashion_text(clean)
    
    # 3. Model replacements (iPhone, sizes)
    pre = pre.replace("苹果", "iPhone ")
    pre = pre.replace("PROMAX", "Pro Max").replace("PRO", "Pro").replace("PLUS", "Plus")
    pre = pre.replace("码", " EU").replace("尺码", "Размер ")
    
    # If contains Chinese characters, run live neural translate
    if re.search(r"[\u4e00-\u9fa5]", pre):
        trans = translate_raw_gtx(pre)
        if trans and trans != pre:
            trans = re.sub(r"поставляется только с коробкой для обуви и мешком для сбора пыли|с коробкой для обуви и мешком для сбора пыли|только коробка для обуви и мешок для пыли", "(коробка + пыльник)", trans, flags=re.IGNORECASE)
            trans = re.sub(r"с коробкой для обуви|только коробка для обуви", "(с коробкой)", trans, flags=re.IGNORECASE)
            trans = re.sub(r"белый круг", "белый ободок", trans, flags=re.IGNORECASE)
            trans = re.sub(r"синяя поверхность", "синий циферблат", trans, flags=re.IGNORECASE)
            trans = re.sub(r"черная поверхность", "черный циферблат", trans, flags=re.IGNORECASE)
            trans = re.sub(r"белая поверхность", "белый циферблат", trans, flags=re.IGNORECASE)
            trans = re.sub(r"серебряный пояс|серебряный ремень", "серебряный корпус", trans, flags=re.IGNORECASE)
            trans = re.sub(r"золотой пояс|золотой ремень", "золотой корпус", trans, flags=re.IGNORECASE)
            trans = re.sub(r"черный пояс", "черный корпус", trans, flags=re.IGNORECASE)
            trans = re.sub(r"пояс|ремень", "кожаный ремешок", trans, flags=re.IGNORECASE)
            trans = re.sub(r"\s+", " ", trans).strip()
            return trans.capitalize()
            
    return pre.strip()

def detect_category_and_brand(title_cn: str, selected_summary: str = ""):
    full_text = f"{title_cn} {selected_summary}".lower()
    
    detected_brand = ""
    for patterns, bname in BRAND_RULES:
        if any(p in full_text for p in patterns):
            detected_brand = bname
            break
            
    category = "Товары из Китая"
    if any(x in full_text for x in ["鞋", "运动鞋", "板鞋", "球鞋", "sneaker", "靴"]):
        category = "Обувь"
    elif any(x in full_text for x in ["卫衣", "t恤", "外套", "裤", "短袖", "衣服", "羽绒服", "夹克", "牛仔", "长裤", "卫裤", "休闲裤", "工装裤", "运动裤", "短裤"]):
        category = "Одежда"
    elif any(x in full_text for x in ["包", "双肩包", "单肩包", "手提包", "斜挎包"]):
        category = "Сумки"
    elif any(x in full_text for x in ["表", "手表", "石英表", "机械表", "watch"]):
        category = "Часы"
    elif any(x in full_text for x in ["耳机", "音箱"]):
        category = "Электроника"
    elif any(x in full_text for x in ["壳", "手机壳", "膜"]):
        category = "Чехлы"
        
    return category, detected_brand

def synthesize_smart_title(raw_title: str, brand: str, category: str) -> str:
    if not raw_title:
        return "Товар с Pinduoduo"
        
    pre = preprocess_fashion_text(raw_title)
    trans = translate_raw_gtx(pre)
    
    # Filter e-commerce garbage words
    clean_ru = re.sub(
        r"Внешняя торговля|Одинаковая обувь|повседневная и универсальная|для мужчин и женщин|для пап|туфли|одинаковая|рекомендация блогера|горячая распродажа|24 часа|взрывная модель|чистый красный|в наличии",
        " ",
        trans,
        flags=re.IGNORECASE
    )
    clean_ru = re.sub(r"\s+", " ", clean_ru).strip(" ,.-")
    
    lead = ""
    if category == "Обувь":
        lead = "Кроссовки" if not any(k in clean_ru.lower() for k in ["кеды", "ботинки", "угги", "сапоги", "лоферы"]) else ""
    elif category == "Часы":
        lead = "Часы" if "часы" not in clean_ru.lower() else ""
    elif category == "Одежда":
        lead = "Одежда" if not any(k in clean_ru.lower() for k in ["пуховик", "куртка", "худи", "брюки", "джинсы", "футболка", "ветровка"]) else ""
    elif category == "Чехлы":
        lead = "Чехол" if "чехол" not in clean_ru.lower() else ""
        
    title_parts = []
    if lead:
        title_parts.append(lead)
    if brand:
        title_parts.append(brand)
        
    words = clean_ru.split()
    for w in words[:6]:
        low = w.lower()
        if low not in " ".join(title_parts).lower() and len(w) > 2 and low not in ["очень", "сверху", "снизу", "просто"]:
            title_parts.append(w)
            
    res = " ".join(title_parts).strip()
    return res.capitalize() if res else (f"{lead} {brand}".strip() or "Товар с Pinduoduo")

def translate_color(name_cn: str) -> str:
    return clean_and_translate_option(name_cn, is_color=True)

def translate_size_or_model(val: str) -> str:
    return clean_and_translate_option(val, is_color=False)

def translate_title(cn_title: str) -> str:
    cat, br = detect_category_and_brand(cn_title)
    return synthesize_smart_title(cn_title, br, cat)

# ==================== ADB ДВИЖОК ====================
def get_connected_device() -> Optional[str]:
    try:
        res = subprocess.run([ADB_PATH, "devices"], capture_output=True, text=True, timeout=5)
        lines = [line.strip().split() for line in res.stdout.splitlines() if line.strip() and not line.startswith("List")]
        active = [parts[0] for parts in lines if len(parts) >= 2 and parts[1] == "device"]
        if not active:
            return None
        if "127.0.0.1:5555" in active:
            return "127.0.0.1:5555"
        if "emulator-5554" in active:
            return "emulator-5554"
        return active[0]
    except Exception:
        return None

def check_device_ready() -> bool:
    return get_connected_device() is not None

def bring_ldplayer_to_front():
    """
    Restores the LDPlayer emulator window from minimized/background
    and brings it actively to the foreground on the user's desktop.
    """
    # 1. Native Windows API via win32gui
    try:
        import win32gui, win32con
        def _enum_cb(hwnd, _):
            if win32gui.IsWindowVisible(hwnd) or win32gui.IsIconic(hwnd):
                title = win32gui.GetWindowText(hwnd)
                cls = win32gui.GetClassName(hwnd)
                if any(k in title.lower() for k in ["ldplayer", "dnplayer"]) or any(k in cls.lower() for k in ["ldplayer", "dnplayer", "render"]):
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                    win32gui.SetForegroundWindow(hwnd)
            return True
        win32gui.EnumWindows(_enum_cb, None)
    except Exception:
        pass

    # 2. PowerShell / WScript.Shell AppActivate
    try:
        subprocess.run([
            "powershell", "-NoProfile", "-Command",
            "(New-Object -ComObject WScript.Shell).AppActivate('LDPlayer'); "
            "(New-Object -ComObject WScript.Shell).AppActivate('LDPlayer-1'); "
            "(New-Object -ComObject WScript.Shell).AppActivate('dnplayer')"
        ], timeout=4, capture_output=True)
    except Exception:
        pass

def ensure_device_ready(timeout_sec: int = 45) -> bool:
    if check_device_ready():
        bring_ldplayer_to_front()
        return True

    print("[*] Device not connected. Launching LDPlayer on user screen...")
    ld_dir = os.path.dirname(ADB_PATH)
    desktop_lnk = r"C:\Users\kiril_6yx2ik9\OneDrive\Desktop\LDPlayer 14.lnk"
    try:
        if os.path.exists(desktop_lnk):
            os.startfile(desktop_lnk)
        else:
            dnplayer = os.path.join(ld_dir, "dnplayer.exe")
            if os.path.exists(dnplayer):
                subprocess.Popen(f'cmd /c "cd /d {ld_dir} && dnplayer.exe"', shell=True)
    except Exception as e:
        print("[!] Auto-launch error:", e)

    start_time = time.time()
    while time.time() - start_time < timeout_sec:
        time.sleep(2.0)
        try:
            subprocess.run([ADB_PATH, "connect", "127.0.0.1:5555"], capture_output=True, timeout=3)
        except Exception:
            pass
        if check_device_ready():
            print("[OK] Device connected and ready!")
            bring_ldplayer_to_front()
            return True
    return False

def run_adb(args: List[str], timeout: int = 15) -> str:
    dev = get_connected_device() or DEVICE
    flat_args = []
    for a in args:
        if isinstance(a, str) and (" " in a and any(k in a for k in ["input ", "am ", "screencap ", "cat ", "pm "])):
            flat_args.extend(a.split())
        else:
            flat_args.append(str(a))
    cmd = [ADB_PATH, "-s", dev] + flat_args
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

    print(f"[*] Human tap at ({cx}, {cy}) bounds={bounds_str}")
    run_adb(["shell", "input", "tap", str(cx), str(cy)])
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

        # Handle Network error screen ("手机网络有问题", "请检查网络", "刷新")
        if any(net in txt for net in ["手机网络有问题", "请检查网络", "网络开小差", "刷新", "重新加载"]) and bounds:
            if "刷新" in txt or "重新加载" in txt:
                print(f"[🔄] Detected network retry button: '{txt}' at {bounds}. Auto-tapping Refresh...")
                human_tap(bounds)
                time.sleep(random.uniform(2.5, 3.5))
                return True
            elif "手机网络有问题" in txt or "请检查网络" in txt:
                print(f"[🔄] Detected network error screen '{txt}'. Tapping refresh button...")
                human_tap("[352,944][547,1003]")
                time.sleep(random.uniform(2.5, 3.5))
                return True

        if not has_sku_drawer and txt in ["关闭", "放弃", "去领券", "知道了"] and bounds:
            print(f"[*] Auto-dismissing promo popup '{txt}' at {bounds}")
            human_tap(bounds)
            time.sleep(random.uniform(0.4, 0.8))
            return True
    return False

def cv2_imread_safe(path: str) -> Optional[np.ndarray]:
    try:
        data = np.fromfile(path, dtype=np.uint8)
        return cv2.imdecode(data, cv2.IMREAD_COLOR)
    except Exception:
        return None

def find_puzzle_gap_dx(temp_screen_path: str) -> Optional[int]:
    """
    Intelligent Sovereign Vision AI solver:
    Analyzes puzzle canvas, dynamically isolates the Y-strip containing the puzzle piece,
    and cross-correlates the piece contours with candidate gap silhouettes to find the exact target dx.
    """
    try:
        full_img = cv2_imread_safe(temp_screen_path)
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
    2. Clean micro-thumbnail icons for each color variant (cropping left square only, 0 Chinese text),
       uploaded concurrently in parallel via ThreadPoolExecutor for lightning speed (< 2-3s total).
    """
    # 0. Check if "大图" mode exists on screen to get high-res 156x143 card photographs
    for n in root.iter('node'):
        t_val = (n.attrib.get('text', '') or n.attrib.get('content-desc', '')).strip()
        if t_val == "大图":
            b_dt = n.attrib.get('bounds', '')
            if b_dt:
                print(f"[*] Activating High-Res Studio Grid Mode ('大图') at {b_dt}...")
                human_tap(b_dt)
                time.sleep(0.4)
                root = dump_ui_xml()
                break

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
        run_adb(["shell", "input", "tap", str(cx), str(cy)])
        time.sleep(0.4)
        temp_hd = os.path.join(PARSED_UPLOADS_DIR, f"temp_hd_{goods_id}.png")
        run_adb(["shell", "screencap", "-p", "/sdcard/hd_prev.png"])
        run_adb(["pull", "/sdcard/hd_prev.png", temp_hd])
        run_adb(["shell", "input", "keyevent", "4"])  # Close gallery back to drawer
        time.sleep(0.3)
        
        if os.path.exists(temp_hd):
            try:
                im = Image.open(temp_hd)
                crop = im.crop((0, 280, 900, 1180)).convert("RGB")
                out_hd = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}_hd.jpg")
                crop.save(out_hd, "JPEG", quality=92)
                try:
                    os.remove(temp_hd)
                except Exception:
                    pass
                if supabase_client:
                    rem_name = f"sku_{goods_id}_hd_{int(time.time())}.jpg"
                    with open(out_hd, "rb") as f:
                        supabase_client.storage.from_("product-screenshots").upload(rem_name, f.read(), {"content-type": "image/jpeg"})
                    hd_pub_url = supabase_client.storage.from_("product-screenshots").get_public_url(rem_name)
                    print(f"[+] Uploaded Ultra-HD Studio Image: {hd_pub_url}")
            except Exception as e:
                print("HD photo capture error:", e)

    # 2. Capture clean drawer screenshot for color micro-thumbnails
    temp_drawer = os.path.join(PARSED_UPLOADS_DIR, f"temp_drawer_{goods_id}.png")
    run_adb(["shell", "screencap", "-p", "/sdcard/drawer_screen.png"])
    run_adb(["pull", "/sdcard/drawer_screen.png", temp_drawer])
    
    upload_tasks = []
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
                    try:
                        with open(out_main, "rb") as f:
                            supabase_client.storage.from_("product-screenshots").upload(rem_name, f.read(), {"content-type": "image/jpeg"})
                        hd_pub_url = supabase_client.storage.from_("product-screenshots").get_public_url(rem_name)
                    except Exception as me:
                        print("Failed main thumbnail upload:", me)

            # Crop clean high-resolution studio icons for each color option (0 Chinese text!)
            for idx, col in enumerate(colors):
                if col.get("selected"):
                    col["image_url"] = hd_pub_url or f"/uploads/parsed/sku_{goods_id}.jpg"
                else:
                    col["image_url"] = None

                b_str = col.get("bounds")
                if b_str:
                    x1, y1, x2, y2 = parse_bounds(b_str)
                    w, h = x2 - x1, y2 - y1
                    if w > 10 and h > 10:
                        # Check if this card has an image above its text (in '大图' card grid: text is below the 156x143 image!)
                        if y1 >= 220 and w >= 80:
                            # Card layout: image is directly above the button text
                            c_icon = im_d.crop((x1 + 2, max(0, y1 - 145), x2 - 2, y1 - 2))
                        elif w > h + 10:
                            # Horizontal pill button: icon is strictly the left square [x1, y1, x1+h, y2]
                            c_icon = im_d.crop((x1 + 2, y1 + 2, x1 + h - 2, y2 - 2))
                        else:
                            # Square button
                            c_icon = im_d.crop((x1 + 3, y1 + 3, x2 - 3, y1 + w - 3))
                        
                        icon_path = os.path.join(PARSED_UPLOADS_DIR, f"col_{goods_id}_{idx}_icon.jpg")
                        c_icon.save(icon_path, "JPEG", quality=92)
                        col["thumb_url"] = f"/uploads/parsed/col_{goods_id}_{idx}_icon.jpg"
                        
                        if supabase_client:
                            rem_icon = f"col_{goods_id}_{idx}_icon_{int(time.time())}_{idx}.jpg"
                            upload_tasks.append((idx, icon_path, rem_icon))

            # Concurrently upload micro-thumbnails to Supabase
            if supabase_client and upload_tasks:
                def _do_upload(task):
                    i, p, r = task
                    try:
                        with open(p, "rb") as fl:
                            supabase_client.storage.from_("product-screenshots").upload(r, fl.read(), {"content-type": "image/jpeg"})
                        return i, supabase_client.storage.from_("product-screenshots").get_public_url(r)
                    except Exception:
                        return i, None

                with ThreadPoolExecutor(max_workers=min(len(upload_tasks), 6)) as ex:
                    for i, pub_url in ex.map(_do_upload, upload_tasks):
                        if pub_url:
                            colors[i]["thumb_url"] = pub_url

            # Ensure every color variant has a dedicated distinct image_url
            for col in colors:
                if not col.get("image_url"):
                    col["image_url"] = col.get("thumb_url") or hd_pub_url or f"/uploads/parsed/sku_{goods_id}.jpg"

            try:
                os.remove(temp_drawer)
            except Exception:
                pass
        except Exception as d_err:
            print("Color variant icons error:", d_err)

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
    if not ensure_device_ready(timeout_sec=45):
        raise HTTPException(status_code=503, detail="Не удалось запустить эмулятор Pinduoduo. Пожалуйста, откройте LDPlayer вручную.")

    goods_id = resolve_goods_id(req.url)
    if not goods_id:
        raise HTTPException(status_code=400, detail="Не удалось извлечь goods_id из ссылки")
        
    print(f"[*] Processing goods_id={goods_id}")
    
    # 0. Dismiss any open modals, SKU drawers or previous dialogs
    try:
        run_adb(["shell", "input", "keyevent", "4"])
        time.sleep(0.3)
    except Exception:
        pass

    # 1. Open product in Pinduoduo App via Deep Link (with CLEAR_TOP / NEW_TASK flag)
    intent_url = f"pinduoduo://com.xunmeng.pinduoduo/goods.html?goods_id={goods_id}"
    run_adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", intent_url, "-f", "0x14000000"])
    time.sleep(random.uniform(2.5, 3.2)) # human dwell time for page load
    
    # 2. Capture title & page price directly from initial page state
    root_init = dump_ui_xml()
    
    # Save initial price from the main product screen as rock-solid fallback
    page_price_cny = 0.0
    for node in root_init.iter("node"):
        txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        m_p = re.search(r"¥\s*(\d+\.?\d*)", txt)
        if m_p:
            try:
                p = float(m_p.group(1))
                if p > 0:
                    page_price_cny = p
                    break
            except Exception:
                pass

    raw_title = ""
    # Review/marketing blacklist to guarantee 0 buyer review pollution
    review_and_ad_junk = [
        "收到了", "退货", "假一赔十", "正品保障", "客服", "店铺", "收藏", "已拼", "券后", "免拼", 
        "评价", "进店", "分享", "已选:", "二次销售", "不支持七天", "退换", "如出现已洗涤", "顶部", 
        "活动优惠", "服务", "更换支付方式", "提交订单", "在拼", "参与可立即", "拼单即将结束", 
        "去拼单", "元", "¥", "电影", "男神", "人好评", "人说", "买过", "回头客", "满意", "很喜欢", 
        "太好看", "很棒", "穿上", "很帅", "推荐", "超赞", "好看", "质量", "材质", "手感", "面料",
        "配送", "收货地址", "工业区", "横路", "外箱唛头", "唛头", "转 注", "街道", "社区", "自提", "门牌", "邮政", "编码", "号.", "省", "市"
    ]
    
    # Primary title sweep: wide product header text below main photo (y1 between 450 and 1150)
    for node in root_init.iter("node"):
        txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        b = node.attrib.get("bounds", "")
        if b and len(txt) >= 8:
            x1, y1, x2, y2 = parse_bounds(b)
            # Must be in main product header zone, not phantom, wide width >= 250
            if 350 <= y1 <= 1450 and (x2 - x1) >= 250:
                if not any(x in txt for x in review_and_ad_junk):
                    cleaned_txt = re.sub(r'^\d+人(收藏|关注|购买|好评|说)\s*#?\s*', '', txt).strip()
                    cleaned_txt = re.sub(r'#.*', '', cleaned_txt).strip()
                    if len(cleaned_txt) > len(raw_title):
                        raw_title = cleaned_txt

    # Secondary title sweep if still empty: search for branded brackets or fashion keywords
    if not raw_title:
        candidates = []
        for node in root_init.iter("node"):
            txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
            b = node.attrib.get("bounds", "")
            x1, y1, x2, y2 = parse_bounds(b) if b else (0,0,0,0)
            if (x1 > 0 or y1 > 0) and len(txt) >= 8 and not any(x in txt for x in review_and_ad_junk):
                score = len(txt)
                if txt.startswith("【") or txt.startswith("["):
                    score += 50
                if any(k in txt for k in ["同款", "T恤", "短袖", "长袖", "卫衣", "外套", "羽绒服", "裤", "鞋", "手表", "表", "包", "壳", "帽", "老爹鞋", "男鞋", "女鞋", "运动鞋"]):
                    score += 50
                cleaned_txt = re.sub(r'^\d+人(收藏|关注|购买|好评|说)\s*#?\s*', '', txt).strip()
                cleaned_txt = re.sub(r'#.*', '', cleaned_txt).strip()
                candidates.append((score, cleaned_txt))
        if candidates:
            candidates.sort(key=lambda c: c[0], reverse=True)
            raw_title = candidates[0][1]

    # 3. Check if SKU drawer is open, or tap buy button
    has_sku_drawer = any(any(x in (n.attrib.get("text", "") or n.attrib.get("content-desc", "")) for x in ["提交订单", "立即支付", "选择尺码后", "选择款式后", "大图"]) for n in root_init.iter("node"))
    if not has_sku_drawer:
        print("[*] SKU drawer not open yet. Locating bottom buy button...", flush=True)
        clicked_btn = False
        # First priority: find explicit action buttons in the bottom navigation bar
        for target_text in ["发起拼单", "单独购买", "免拼购买", "立即购买", "去拼单"]:
            for n in root_init.iter("node"):
                t = (n.attrib.get("text", "") or n.attrib.get("content-desc", "")).strip()
                b = n.attrib.get("bounds", "")
                if target_text in t and b:
                    x1, y1, x2, y2 = parse_bounds(b)
                    if y1 >= 1400:
                        human_tap(b)
                        clicked_btn = True
                        break
            if clicked_btn:
                break
        
        # Second fallback: tap standard bottom action area
        if not clicked_btn:
            human_tap("[675,1550]")

        time.sleep(random.uniform(1.8, 2.3))
        root = dump_ui_xml()
        has_sku_drawer = any(any(x in (n.attrib.get("text", "") or n.attrib.get("content-desc", "")) for x in ["提交订单", "立即支付", "选择尺码后", "选择款式后", "大图"]) for n in root.iter("node"))
    else:
        root = root_init
        
    # 4. Parse SKU Drawer with Universal Dynamic Groups
    spec_groups = []
    current_group_dict = None
    colors = []
    sizes = []
    price_cny = 0.0
    orig_price_cny = 0.0
    selected_summary = ""
    
    # Non-sku blacklist keywords
    blacklist_terms = ["¥", "元", "已拼", "折", "包邮", "退货", "发货", "对照表", "体重", "详情", "举报", "店铺", "收藏", "客服", "返回", "大促", "买过", "即将结束", "无需等待", "匿名", "进店", "保障", "评价", "全场", "领型", "穿着方式", "面料", "风格", "适用", "多款", "列表", "打开大图", "减少数量", "增加数量", "数量", "请选择", "去支付", "组合", "查收", "尺码建议", "查看尺码建议", "建议", "关闭弹窗", "当前收货地址", "送达", "同行", "马上卖完", "抢光", "热卖", "爆款"]

    for node in root.iter("node"):
        txt = node.attrib.get("text", "").strip()
        cd = node.attrib.get("content-desc", "").strip()
        val = txt or cd
        bounds = node.attrib.get("bounds", "")
        cls = node.attrib.get("class", "")
        
        if not val or not bounds:
            continue

        x1, y1, x2, y2 = parse_bounds(bounds)
        # Filter phantom nodes with (0,0) or zero dimensions (e.g. background review tags)
        if (x1 == 0 and y1 == 0 and x2 == 0 and y2 == 0) or (x2 - x1 < 10) or (y2 - y1 < 10):
            continue
            
        if "已选:" in val or "请选择:" in val or "请选择" in val:
            selected_summary = val.replace("已选:", "").replace("请选择:", "").replace("请选择", "").replace("🔥", "").strip()
            
        m_price = re.search(r"¥\s*(\d+\.?\d*)", val)
        if m_price:
            p_val = float(m_price.group(1))
            if any(k in val for k in ["到手价", "提交订单", "限量价", "限1件", "券后"]):
                price_cny = p_val
            elif price_cny == 0.0:
                price_cny = p_val
        elif val.startswith("¥") and orig_price_cny == 0.0:
            m_orig = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_orig:
                p = float(m_orig.group(1))
                if p != price_cny:
                    orig_price_cny = p

        # Check section headers dynamically (visible on screen, short title <= 6 chars)
        if len(val) <= 6 and any(h in val for h in ["颜色", "款式", "分类", "花色", "外观"]) and not any(x in val for x in ["大图", "已选", "请选择", "建议"]):
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
        elif len(val) <= 6 and any(h in val for h in ["尺码", "鞋码", "尺寸", "身高"]) and not any(x in val for x in ["建议", "对照", "已选", "请选择", "表"]):
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
        elif len(val) <= 6 and any(h in val for h in ["机型", "型号", "适配", "版本"]) and not any(x in val for x in ["已选", "请选择"]):
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
        elif len(val) <= 6 and any(h in val for h in ["容量", "内存", "存储"]) and not any(x in val for x in ["已选", "请选择"]):
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
        elif len(val) <= 6 and any(h in val for h in ["套餐", "规格", "配置"]) and not any(x in val for x in ["已选", "请选择"]):
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
        elif any(h in val for h in ["活动优惠", "服务", "使用#支付宝", "更换支付方式", "提交订单", "立即支付", "选择尺码后", "选择款式后", "数量", "一次选多款"]):
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

    # Filter out marketing badges from colors
    marketing_junk = ["马上卖完", "抢光", "热卖", "爆款", "大促", "降价", "限时", "秒杀", "包邮", "已选", "请选择"]
    colors = [c for c in colors if not any(j in c.get("name", "") for j in marketing_junk) and len(c.get("name", "").strip()) > 0]
    if visual_groups:
        visual_groups[0]["options"] = colors

    if price_cny == 0.0:
        if orig_price_cny > 0.0:
            price_cny = orig_price_cny
        elif page_price_cny > 0.0:
            price_cny = page_price_cny
        else:
            for node in root.iter("node"):
                val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
                m_any = re.search(r"¥\s*(\d+\.?\d*)", val)
                if m_any:
                    price_cny = float(m_any.group(1))
                    break

    if price_cny == 0.0 and page_price_cny > 0.0:
        price_cny = page_price_cny

    # Detect category and brand dynamically
    category, brand = detect_category_and_brand(raw_title, selected_summary)
    title_ru = synthesize_smart_title(raw_title, brand, category)

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
        "price_cny": price_cny or page_price_cny or 0.0,
        "orig_price_cny": orig_price_cny or price_cny or page_price_cny or 0.0,
        "image_url": image_rel_url,
        "selected_summary": selected_summary,
        "has_options": len(colors) > 0 or len(sizes) > 0 or len(spec_groups) > 0,
        "colors": colors,
        "sizes": sizes,
        "spec_groups": spec_groups
    }

@app.post("/api/select-sku")
def select_sku(req: SelectSkuRequest):
    print(f"[*] Human tapping SKU option for goods_id={req.goods_id} at {req.bounds}")
    human_tap(req.bounds)
    time.sleep(random.uniform(0.35, 0.45))
    
    # Re-dump to get updated price, summary and thumbnail bounds
    root = dump_ui_xml()
    price_cny = 0.0
    selected_summary = ""
    updated_img_url = ""
    
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

    for node in root.iter("node"):
        val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        if "已选:" in val or "请选择:" in val:
            selected_summary = val.replace("已选:", "").replace("请选择:", "").replace("🔥", "").strip()
        if "到手价" in val or "提交订单" in val or "限量价" in val:
            m_price = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_price:
                price_cny = float(m_price.group(1))

    # Dynamic studio preview capture for selected variant
    if thumb_bounds:
        try:
            temp_sel = os.path.join(PARSED_UPLOADS_DIR, f"temp_sel_{req.goods_id}.png")
            run_adb(["shell", "screencap", "-p", "/sdcard/sel_prev.png"])
            run_adb(["pull", "/sdcard/sel_prev.png", temp_sel])
            if os.path.exists(temp_sel):
                im_sel = Image.open(temp_sel).convert("RGB")
                c_sel = im_sel.crop(thumb_bounds)
                out_name = f"sku_{req.goods_id}_sel_{int(time.time())}.jpg"
                out_path = os.path.join(PARSED_UPLOADS_DIR, out_name)
                c_sel.save(out_path, "JPEG", quality=92)
                try: os.remove(temp_sel)
                except Exception: pass
                if supabase_client:
                    try:
                        with open(out_path, "rb") as f:
                            supabase_client.storage.from_("product-screenshots").upload(out_name, f.read(), {"content-type": "image/jpeg"})
                        updated_img_url = supabase_client.storage.from_("product-screenshots").get_public_url(out_name)
                    except Exception as up_err:
                        print("Dynamic option upload error:", up_err)
                if not updated_img_url:
                    updated_img_url = f"/uploads/parsed/{out_name}"
        except Exception as sel_err:
            print("Select SKU photo error:", sel_err)

    return {
        "success": True,
        "price_cny": price_cny or 0.0,
        "selected_summary": selected_summary,
        "image_url": updated_img_url
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
                .order("id", desc=True)
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
                # Claim task immediately to update mobile UI status to 'processing'
                try:
                    supabase_client.from_("parse_queue").update({"status": "processing"}).eq("id", task_id).execute()
                except Exception:
                    pass

                if not ensure_device_ready(timeout_sec=65):
                    print(f"[!] Device failed to become ready for task #{task_id}")
                    supabase_client.from_("parse_queue").update({
                        "status": "error",
                        "error_message": "Эмулятор не смог запуститься автоматически. Запустите ярлык LDPlayer 14 на рабочем столе."
                    }).eq("id", task_id).execute()
                    continue

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
                        pub_img_url = parsed.get("image_url") or ""
                        if not pub_img_url or not pub_img_url.startswith("http"):
                            local_img = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}.jpg")
                            remote_name = f"sku_{goods_id}_{int(time.time())}.jpg"
                            if os.path.exists(local_img):
                                try:
                                    with open(local_img, "rb") as f:
                                        supabase_client.storage.from_("product-screenshots").upload(
                                            remote_name, f.read(), {"content-type": "image/jpeg"}
                                        )
                                    pub_img_url = supabase_client.storage.from_("product-screenshots").get_public_url(remote_name)
                                except Exception as up_err:
                                    print("Storage upload error:", up_err)

                        effective_price = parsed.get("price_cny") or parsed.get("page_price_cny") or 0.0
                        has_opts = parsed.get("has_options") or bool(parsed.get("colors")) or bool(parsed.get("sizes"))

                        if effective_price <= 0.0 and not has_opts:
                            print(f"[!] Warning: task #{task_id} price is 0 and no options, marking as error")
                            supabase_client.from_("parse_queue").update({
                                "status": "error",
                                "error_message": "Не удалось автоматически считать цену для этого товара. Пожалуйста, введите цену вручную."
                            }).eq("id", task_id).execute()
                            continue

                        sku_bundle = {
                            "is_sku_bundle": True,
                            "goods_id": goods_id,
                            "title_ru": parsed.get("title_ru") or parsed.get("title") or "Товар",
                            "title": parsed.get("title") or "",
                            "price_cny": effective_price,
                            "orig_price_cny": parsed.get("orig_price_cny") or effective_price,
                            "visual_options": parsed.get("visual_options") or parsed.get("colors") or [],
                            "spec_options": parsed.get("spec_options") or parsed.get("sizes") or [],
                            "colors": parsed.get("colors") or [],
                            "sizes": parsed.get("sizes") or [],
                            "spec_groups": parsed.get("spec_groups") or [],
                            "has_options": parsed.get("has_options", True),
                            "image_url": pub_img_url,
                            "brand": parsed.get("brand") or "",
                            "category": parsed.get("category") or "Товары из Китая",
                            "marketplace": "pinduoduo"
                        }

                        # Update row in Supabase
                        supabase_client.from_("parse_queue").update({
                            "status": "done",
                            "price": effective_price,
                            "currency": "CNY",
                            "title": parsed.get("title_ru") or parsed.get("title") or "Товар",
                            "brand": parsed.get("brand") or "",
                            "category": parsed.get("category") or "Товары из Китая",
                            "color": parsed["colors"][0]["name_ru"] if parsed.get("colors") else "Как на фото",
                            "marketplace_name": "PINDUODUO",
                            "image_url": pub_img_url,
                            "description": json.dumps(sku_bundle, ensure_ascii=False),
                            "parse_method": "hardware_bridge"
                        }).eq("id", task_id).execute()
                        print(f"[OK] Task #{task_id} successfully parsed and updated in Supabase!")
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

def ldplayer_watchdog():
    while True:
        try:
            if not check_device_ready():
                try:
                    subprocess.run([ADB_PATH, "connect", "127.0.0.1:5555"], capture_output=True, timeout=3)
                except Exception:
                    pass
        except Exception:
            pass
        time.sleep(15)

# Start background threads automatically
queue_thread = threading.Thread(target=supabase_queue_worker, daemon=True)
queue_thread.start()

watchdog_thread = threading.Thread(target=ldplayer_watchdog, daemon=True)
watchdog_thread.start()

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3007)
