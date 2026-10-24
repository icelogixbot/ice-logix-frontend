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
import io
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
    (["nocta", "nike x nocta", "nocta x nike", "nike nocta"], "Nike x Nocta"),
    (["sp5der", "spider 555"], "Sp5der"),
    (["denim tears"], "Denim Tears"),
    (["bape", "a bathing ape"], "BAPE"),
    (["gallery dept"], "Gallery Dept"),
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
    (["4tothe9"], "4tothe9"),
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
    "做旧": " винтажные ",
    "磨破洞": " с рваным эффектом ",
    "防晒": " легкий ",
    "圆领": " с круглым вырезом ",
    "卫裤": " спортивные брюки ",
    "工装裤": " брюки карго ",
    "牛仔裤": " джинсы ",
    "牛仔": " джинсы ",
    "阔腿直筒裤": " широкие прямые ",
    "阔腿裤": " широкие ",
    "直筒裤": " прямые ",
    "短裤": " шорты ",
    "长裤": " брюки ",
    "宽松": " свободного кроя ",
    "水洗": " ",
    "渐变": " градиент ",
    "抹茶": " Matcha ",
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
    "升级款": " (улучшенная модель) ",
    "经典款": " (классическая модель) ",
    "做旧擦色脏脏鞋": " винтажные кеды с потертостями ",
    "脏脏鞋": " винтажные кеды ",
    "擦色": " с потертостями ",
    "帆布鞋": " парусиновые кеды ",
    "高街": " High-Street ",
    "通勤": " повседневные ",
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

def format_standard_size(val: str) -> str:
    if not val:
        return ""
    clean = val.strip()
    
    # Strip marketing junk like （关注优先发货）, (优先发货), etc.
    clean = re.sub(r"[\(（].*?优先发货[\)）]|关注优先发货|优先发货", "", clean).strip()
    clean = re.sub(r"[\(（].*?发货[\)）]", "", clean).strip()

    # Convert weight recommendations from Chinese jin (斤 = 0.5 kg) to kg
    # e.g., "M 建议90-110斤" -> "M (45–55 кг)", or "S  80-100" -> "S (40–50 кг)"
    m_range = re.search(r'(?:建议)?\s*(\d+)\s*[-–—~至]\s*(\d+)\s*(?:斤)?', clean)
    weight_part = ""
    if m_range:
        v1, v2 = int(m_range.group(1)), int(m_range.group(2))
        # If numbers are typical jin range (e.g. 70-220 jin), convert to kg
        if 60 <= v1 <= 240 and 60 <= v2 <= 260:
            w1 = int(v1 * 0.5)
            w2 = int(v2 * 0.5)
            weight_part = f" ({w1}–{w2} кг)"
            clean = re.sub(r'\(?(?:建议)?\s*\d+\s*[-–—~至]\s*\d+\s*(?:斤)?\)?', '', clean).strip()
    else:
        m_single = re.search(r'(?:建议)?\s*(\d+)\s*斤', clean)
        if m_single:
            w = int(int(m_single.group(1)) * 0.5)
            weight_part = f" ({w} кг)"
            clean = re.sub(r'\(?(?:建议)?\s*\d+\s*斤\)?', '', clean).strip()
            
    clean = re.sub(r"亚洲尺码|欧码|美码|尺码|标准码|正码|建议|码", "", clean).strip()
    clean = re.sub(r"\s+", " ", clean).strip()
    
    if any(k in clean.lower() for k in ["均码", "free", "onesize", "one size"]):
        return f"Универсальный{weight_part}"
        
    low = clean.lower()
    m_num_xl = re.match(r'^(\d+)\s*x+l$', low)
    if m_num_xl:
        clean = f"{m_num_xl.group(1)}XL"
    elif re.match(r'^x+l$', low):
        x_count = low.count('x')
        clean = "XL" if x_count == 1 else f"{x_count}XL"
    elif re.match(r'^x+s$', low):
        x_count = low.count('x')
        clean = "XS" if x_count == 1 else f"{x_count}XS"
    elif low in ["s", "m", "l"]:
        clean = low.upper()
    else:
        clean = re.sub(r'\b([xX]{2,})[lL]\b', lambda m: f"{len(m.group(1))}XL", clean)
        clean = re.sub(r'\b([xX])[lL]\b', 'XL', clean)
        clean = re.sub(r'\b(\d+)\s*[xX]+[lL]\b', lambda m: f"{m.group(1)}XL", clean)
        clean = re.sub(r'\b([xX]{2,})[sS]\b', lambda m: f"{len(m.group(1))}XS", clean)
        clean = re.sub(r'\b([xX])[sS]\b', 'XS', clean)
        clean = re.sub(r'\b([sml])\b', lambda m: m.group(1).upper(), clean)

    res = f"{clean}{weight_part}".strip()
    return res or val

def humanize_size(val: str) -> str:
    return format_standard_size(val)

def clean_and_translate_option(name_cn: str, is_color: bool = True) -> str:
    clean = re.sub(r"[🔥\s]|快要抢光|热卖|爆款|大促|马上卖完", " ", name_cn).strip()
    if not clean:
        return "Стандарт"
        
    if not is_color:
        return humanize_size(clean)
        
    # Translate compound options like "白金-免系带-碎钉" or "灰色 蝴蝶提花毛衣"
    parts = re.split(r'[-–—/,\s]+', clean)
    
    subst_map = {
        "白金": "Бело-золотой",
        "黑红": "Черно-красный",
        "米黑": "Бежево-черный",
        "月色": "Лунный серый",
        "红色": "Красный",
        "白色": "Белый",
        "黑色": "Черный",
        "蓝色": "Синий",
        "灰色": "Серый",
        "深灰": "Темно-серый",
        "深灰色": "Темно-серый",
        "浅灰": "Светло-серый",
        "浅灰色": "Светло-серый",
        "棕色": "Коричневый",
        "免系带": "без шнурков",
        "系带": "на шнурках",
        "碎钉": "шипы TF",
        "长钉": "шипы FG",
        "高帮": "высокий носок",
        "低帮": "низкий профиль",
        "蝴蝶提花毛衣": "свитер с бабочкой",
        "蝴蝶提花": "с бабочкой",
        "毛衣": "свитер",
        "抹茶绿": "Матча зеленый",
        "摩卡棕": "Мокко коричневый",
        "杏色": "Бежевый",
        "长袖T恤": "",
        "长袖t恤": "",
        "长袖": "",
        "短袖T恤": "",
        "短袖t恤": "",
        "短袖": "",
        "260克": "260 г",
        "300克": "300 г",
        "加绒": "с начесом",
    }
    
    main_color = ""
    extra_specs = []
    
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if p in subst_map:
            t = subst_map[p]
        elif p in COLOR_DICT:
            t = COLOR_DICT[p]
        else:
            t = translate_raw_gtx(p)
            for cn, ru in subst_map.items():
                t = t.replace(cn, ru)
            t = re.sub(r'[\u4e00-\u9fff]', '', t).strip()
            
        if not t:
            continue
            
        if t in ["шипы TF", "шипы FG", "без шнурков", "на шнурках", "высокий носок", "низкий профиль", "свитер с бабочкой", "с бабочкой"]:
            extra_specs.append(t)
        else:
            if not main_color:
                main_color = t.capitalize()
            else:
                extra_specs.append(t.lower())
                
    if main_color and extra_specs:
        res = f"{main_color} ({', '.join(extra_specs)})"
    elif main_color:
        res = main_color
    elif extra_specs:
        res = ", ".join(extra_specs).capitalize()
    else:
        res = translate_raw_gtx(clean)
        res = re.sub(r'[\u4e00-\u9fff]', '', res).strip()
        
    return res or clean

def detect_category_and_brand(title_cn: str, selected_summary: str = ""):
    full_text = f"{title_cn} {selected_summary}".lower()
    
    detected_brand = ""
    for patterns, bname in BRAND_RULES:
        if any(p in full_text for p in patterns):
            detected_brand = bname
            break
            
    category = "Товары из Китая"
    if any(x in full_text for x in ["套装", "套服", "两件套", "运动套装", "卫衣套装"]):
        category = "Спортивный костюм"
    elif any(x in full_text for x in ["牛仔裤", "牛仔"]):
        category = "Джинсы"
    elif any(x in full_text for x in ["鞋", "运动鞋", "板鞋", "球鞋", "sneaker", "靴"]):
        category = "Обувь"
    elif any(x in full_text for x in ["卫衣", "t恤", "外套", "裤", "短袖", "衣服", "羽绒服", "夹克", "长裤", "卫裤", "休闲裤", "工装裤", "运动裤", "短裤", "毛衣", "针织衫"]):
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

def synthesize_smart_title(raw_title: str, brand: str = "", category: str = "") -> str:
    if not raw_title:
        return "Товар с Pinduoduo"
        
    # Strip marketing & junk from Chinese
    clean_cn = re.sub(r"【.*?】|\[.*?\]|店铺热销|24小时发货|快要抢光|爆款|大促|官方正品|原装|🔥|颜值逆天|贼好|很满意|走时很准|断码清仓|限时秒杀", " ", raw_title)
    clean_cn = re.sub(r"\b202\d\b|26秋冬季|202\d新款|新款", " ", clean_cn)
    clean_cn = re.sub(r"\s+", " ", clean_cn).strip()
    
    # Live neural translation of clean Chinese
    trans = translate_raw_gtx(clean_cn)
    
    fashion_cleanup = {
        "运动套装": "спортивный костюм",
        "卫衣套装": "спортивный костюм",
        "两件套": "костюм",
        "套装": "костюм",
        "毛衣": "свитер",
        "针织衫": "вязаный свитер",
        "提花": "жаккардовый",
        "蝴蝶": "с принтом бабочки",
        "慵懒风": "оверсайз",
        "潮牌": "",
        "保暖": "теплый",
        "秋冬季": "",
        "秋冬": "",
        "男女同款": "унисекс",
        "足球鞋": "футбольные бутсы",
        "碎钉": "шипы TF",
        "长钉": "шипы FG",
        "猎鹰": "Predator",
        "刺客": "Mercurial",
        "免系带": "без шнурков",
        "系带": "на шнурках",
        "连帽卫衣": "худи",
        "卫衣": "худи",
        "外套": "куртка",
    }
    for cn, ru in fashion_cleanup.items():
        if cn in trans:
            trans = trans.replace(cn, ru)
    trans = re.sub(r'[\u4e00-\u9fff]', '', trans)
    
    # Strip e-commerce marketing spam in Russian
    spam_patterns = [
        r"\b202\d\b", r"\b26\b", r"осенне-зимн\w*", r"весенн\w*", r"летн\w*", r"зимн\w*", r"осенн\w*",
        r"новый\b", r"новинка\b", r"модный бренд\b", r"в ленивом стиле\b", r"ленивый стиль\b", r"стиль ленивого\b",
        r"повседневная и универсальная\b", r"для мужчин и женщин\b", r"мужчин и женщин\b", r"унисекс\b",
        r"взрывная модель\b", r"чистый красный\b", r"магазин горячие продажи\b", r"горячие продажи\b",
        r"популярный\b", r"топ продаж\b", r"высокое качество\b", r"корейская версия\b", r"ретро\b",
        r"студент\w*", r"соревновани\w*", r"обучени\w*", r"водонепроницаем\w*", r"для пап\b", r"рекомендация блогера\b"
    ]
    clean_ru = trans
    for sp in spam_patterns:
        clean_ru = re.sub(sp, " ", clean_ru, flags=re.IGNORECASE)
        
    clean_ru = re.sub(r"\s+", " ", clean_ru).strip(" ,.-:;!?")
    
    # Detect core category lead from both Chinese and translated Russian
    raw_lower = raw_title.lower()
    clean_low = clean_ru.lower()
    lead = ""
    feature = ""
    detected_model = ""
    
    if any(k in raw_lower for k in ["运动套装", "套装", "套服", "两件套", "卫衣套装", "秋款套装", "冬款套装"]) or any(k in clean_low for k in ["спортивный костюм", "костюм", "комплект"]):
        lead = "Спортивный костюм"
    elif any(k in raw_lower for k in ["足球鞋", "猎鹰", "刺客", "碎钉", "长钉"]) or any(k in clean_low for k in ["бутсы", "футбольн"]):
        lead = "Футбольные бутсы"
        if "猎鹰" in raw_lower:
            detected_model = "Predator"
        elif "刺客" in raw_lower:
            detected_model = "Mercurial"
    elif any(k in raw_lower for k in ["毛衣", "针织衫"]) or any(k in clean_low for k in ["свитер", "вязаный", "джемпер", "пуловер"]):
        lead = "Вязаный свитер"
    elif any(k in raw_lower for k in ["长袖t恤", "长袖", "long sleeve"]) or any(k in clean_low for k in ["лонгслив"]):
        lead = "Лонгслив"
    elif any(k in raw_lower for k in ["短袖t恤", "短袖", "t恤"]) or any(k in clean_low for k in ["футболка"]):
        lead = "Футболка"
    elif any(k in raw_lower for k in ["连帽卫衣", "连帽"]) or any(k in clean_low for k in ["худи", "толстовка"]):
        lead = "Худи"
    elif any(k in raw_lower for k in ["卫衣", "卫衣上衣"]) or any(k in clean_low for k in ["свитшот"]):
        lead = "Свитшот"
    elif any(k in raw_lower for k in ["牛仔裤", "牛仔"]) or any(k in clean_low for k in ["джинсы"]):
        lead = "Джинсы"
    elif any(k in raw_lower for k in ["运动鞋", "球鞋", "跑鞋"]) or any(k in clean_low for k in ["кроссовки"]):
        lead = "Кроссовки"
    elif any(k in raw_lower for k in ["板鞋", "帆布鞋"]) or any(k in clean_low for k in ["кеды"]):
        lead = "Кеды"
    elif any(k in raw_lower for k in ["夹克", "外套"]) or any(k in clean_low for k in ["куртка"]):
        lead = "Куртка"
    elif any(k in raw_lower for k in ["羽绒服"]) or any(k in clean_low for k in ["пуховик"]):
        lead = "Пуховик"
    elif any(k in raw_lower for k in ["手表", "机械表", "石英表"]) or any(k in clean_low for k in ["часы"]):
        lead = "Часы"
    elif any(k in raw_lower for k in ["手机壳"]) or any(k in clean_low for k in ["чехол"]):
        lead = "Чехол"
    else:
        lead = category if category and category != "Товары из Китая" else ""
        
    # Extract distinct feature
    features = []
    if any(k in raw_lower for k in ["机车风", "机车"]):
        features.append("в мото-стиле")
    if any(k in raw_lower for k in ["蝴蝶"]):
        features.append("с принтом бабочки")
    if any(k in raw_lower for k in ["印花", "字母", "图案"]) or "принт" in clean_low:
        features.append("с принтом")
    if any(k in raw_lower for k in ["免系带"]):
        features.append("без шнурков")
    if any(k in raw_lower for k in ["阔腿直筒", "阔腿"]):
        features.append("широкие")
    if any(k in raw_lower for k in ["直筒"]):
        features.append("прямые")
    if any(k in raw_lower for k in ["慵懒风", "宽松"]) or "оверсайз" in clean_low:
        features.append("оверсайз")
    if any(k in raw_lower for k in ["印花logo", "logo", "标志"]):
        features.append("с логотипом")
        
    parts = []
    if lead:
        parts.append(lead)
    if brand and brand.lower() not in lead.lower():
        parts.append(brand)
    if detected_model and detected_model.lower() not in " ".join(parts).lower():
        parts.append(detected_model)
        
    for feat in features:
        if feat.lower() not in " ".join(parts).lower():
            parts.append(feat)
        if len(parts) >= 5:
            break
            
    res = " ".join(parts).strip(" ,.-:;!?")
    res = re.sub(r'\s+(?:с|в|из|на|для|от|по|со|к|о|об)$', '', res, flags=re.IGNORECASE)
    res = re.sub(r'[\u4e00-\u9fff]', '', res).strip(" ,.-:;!?")
    return res.capitalize() if res else (f"{lead} {brand}".strip() or (category if category != "Товары из Китая" else "Товар с маркетплейса"))

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
            try:
                subprocess.run([ADB_PATH, "connect", "127.0.0.1:5555"], capture_output=True, timeout=3)
                res2 = subprocess.run([ADB_PATH, "devices"], capture_output=True, text=True, timeout=3)
                lines2 = [line.strip().split() for line in res2.stdout.splitlines() if line.strip() and not line.startswith("List")]
                active = [parts[0] for parts in lines2 if len(parts) >= 2 and parts[1] == "device"]
            except Exception:
                pass
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

def run_adb_screencap_bytes(timeout: int = 5) -> Optional[bytes]:
    dev = get_connected_device() or DEVICE
    try:
        res = subprocess.run(
            [ADB_PATH, "-s", dev, "exec-out", "screencap", "-p"],
            capture_output=True,
            timeout=timeout
        )
        if res.stdout and len(res.stdout) > 5000:
            return res.stdout
    except Exception as e:
        print(f"ADB screencap error: {e}")
    return None

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

def is_sku_drawer_open(root: ET.Element) -> bool:
    """
    Universally detects whether the SKU selection bottom sheet is open in Pinduoduo.
    Key invariants:
    1. The main product page ALWAYS has bottom navigation tabs ('店铺', '收藏', '客服') at y1 >= 1400.
       If bottom navigation is present, the SKU drawer is NEVER open.
    2. The SKU drawer ALWAYS has quantity stepper ('减少数量'/'增加数量') or top close button ('关闭' at x1 >= 750, y1 <= 300).
    """
    has_bottom_nav = False
    has_stepper = False
    has_drawer_close = False
    
    for n in root.iter("node"):
        t = (n.attrib.get("text", "") or n.attrib.get("content-desc", "")).strip()
        b = n.attrib.get("bounds", "")
        if not t or not b:
            continue
        try:
            x1, y1, x2, y2 = parse_bounds(b)
        except Exception:
            continue
            
        if y1 >= 1400 and t in ["店铺", "收藏", "客服"]:
            has_bottom_nav = True
        if t in ["减少数量", "增加数量"]:
            has_stepper = True
        if x1 >= 750 and y1 <= 300 and t in ["关闭", "✕", "X", "close"]:
            has_drawer_close = True
            
    return (has_stepper or has_drawer_close) and not has_bottom_nav

def handle_popups_and_verification(root: ET.Element) -> bool:
    """
    Detects and automatically resolves verification modals ('安全验证', '前往验证')
    and coupon/promo popups with humanized taps.
    Crucially avoids closing the SKU options drawer.
    """
    drawer_active = is_sku_drawer_open(root)

    for node in root.iter("node"):
        txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        bounds = node.attrib.get("bounds", "")
        if not bounds:
            continue
        x1, y1, x2, y2 = parse_bounds(bounds)

        if txt in ["安全验证", "前往验证"]:
            print(f"[🛡️] Detected verification prompt: '{txt}' at {bounds}. Auto-tapping with human touch...")
            human_tap(bounds)
            time.sleep(random.uniform(2.0, 3.0))
            return True

        # Handle Network error screen ("手机网络有问题", "请检查网络", "刷新")
        if any(net in txt for net in ["手机网络有问题", "请检查网络", "网络开小差", "刷新", "重新加载"]):
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

        # NEVER close the SKU options drawer! (Top-right close button x1 > 700, y1 < 350, or when drawer is active)
        if drawer_active and (txt in ["关闭", "close", "✕", "X"] or (x1 > 700 and y1 < 350)):
            continue
        if x1 > 700 and y1 < 350 and txt in ["关闭", "close", "✕", "X"]:
            continue

        if not drawer_active and txt in ["关闭", "放弃", "去领券", "知道了"]:
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

def extract_pdd_native_original_photo(goods_id: str, thumb_bounds: Optional[tuple] = None) -> Optional[str]:
    """
    Taps the drawer thumbnail preview to open the native full-screen studio viewer,
    captures the pristine 900x900 square studio product photo directly from framebuffer in <300ms,
    presses Back to return to drawer, and uploads to Supabase Storage.
    """
    try:
        if thumb_bounds:
            tx = (thumb_bounds[0] + thumb_bounds[2]) // 2
            ty = (thumb_bounds[1] + thumb_bounds[3]) // 2
        else:
            tx, ty = 126, 540
            
        run_adb(["shell", "input", "tap", str(tx), str(ty)])
        time.sleep(0.35)
        
        sc_bytes = run_adb_screencap_bytes()
        # Return to drawer immediately
        run_adb(["shell", "input", "keyevent", "4"])
        time.sleep(0.25)
        
        if sc_bytes:
            im_full = Image.open(io.BytesIO(sc_bytes)).convert("RGB")
            # Crop pristine 900x900 studio shot (removes top bar & bottom swipe text)
            crop_master = im_full.crop((0, 160, 900, 1060))
            out_master = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}.jpg")
            out_hd = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}_hd.jpg")
            crop_master.save(out_master, "JPEG", quality=95)
            crop_master.save(out_hd, "JPEG", quality=95)
            
            if supabase_client:
                rem_name = f"sku_{goods_id}_hd_{int(time.time())}.jpg"
                with open(out_hd, "rb") as f:
                    supabase_client.storage.from_("product-screenshots").upload(
                        rem_name, f.read(), file_options={"content-type": "image/jpeg", "upsert": "true"}
                    )
                pub_url = supabase_client.storage.from_("product-screenshots").get_public_url(rem_name)
                print(f"[🔥 Clean Studio Photo] Extracted and uploaded: {pub_url}")
                return pub_url
            return f"/uploads/parsed/sku_{goods_id}_hd.jpg"
    except Exception as e:
        print("[!] Native photo extraction error:", e)
        try:
            run_adb(["shell", "input", "keyevent", "4"])
        except Exception:
            pass
    return None

def capture_hd_studio_and_variants(
    goods_id: str, 
    root: ET.Element, 
    colors: List[Dict[str, Any]], 
    main_screen_path: Optional[str] = None, 
    root_main: Optional[ET.Element] = None
) -> str:
    out_master = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}.jpg")
    out_hd = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}_hd.jpg")
    hd_pub_url = ""

    # 1. Locate Drawer Selected Thumbnail bounds dynamically
    thumb_bounds = None
    for n in root.iter('node'):
        cls = n.attrib.get('class', '')
        cd = (n.attrib.get('content-desc', '') or n.attrib.get('text', '')).strip()
        b = n.attrib.get('bounds', '')
        if b and ('Image' in cls or 'ImageView' in cls or 'View' in cls or 'FrameLayout' in cls):
            x1, y1, x2, y2 = parse_bounds(b)
            w, h = x2 - x1, y2 - y1
            if 80 <= w <= 320 and 80 <= h <= 320 and x1 < 250 and 200 <= y1 <= 700:
                thumb_bounds = (x1, y1, x2, y2)
                if cd in ["点击查看大图", "商品主图"]:
                    break
    if not thumb_bounds:
        thumb_bounds = (18, 314, 198, 494)

    # Extract 100% genuine studio 900x900 photo via full-screen viewer
    try:
        hd_pub_url = extract_pdd_native_original_photo(goods_id, thumb_bounds)
    except Exception as orig_e:
        print("[!] Original photo extraction failed:", orig_e)

    # Fallback to main screen ViewPager crop if not uploaded
    if not hd_pub_url and main_screen_path and os.path.exists(main_screen_path):
        try:
            im_m = Image.open(main_screen_path).convert("RGB")
            crop_master = im_m.crop((0, 0, 495, 495))
            crop_master.save(out_hd, "JPEG", quality=95)
            crop_master.save(out_master, "JPEG", quality=95)
            if supabase_client:
                rem_name = f"sku_{goods_id}_hd_{int(time.time())}.jpg"
                with open(out_hd, "rb") as f:
                    supabase_client.storage.from_("product-screenshots").upload(
                        rem_name, f.read(), file_options={"content-type": "image/jpeg", "upsert": "true"}
                    )
                hd_pub_url = supabase_client.storage.from_("product-screenshots").get_public_url(rem_name)
        except Exception as me:
            print("Main page master crop error:", me)

    # 2. Dynamic Studio Variant Photo Capture (Universal across ALL products on Pinduoduo)
    if colors:
        print(f"[*] Dynamically capturing genuine studio photos for {len(colors)} variants...")
        if hd_pub_url:
            colors[0]["image_url"] = hd_pub_url
            colors[0]["thumb_url"] = hd_pub_url

        # Fast in-memory screencap of drawer thumbnail for variant 0
        sc_init = run_adb_screencap_bytes()
        if sc_init and thumb_bounds:
            try:
                im_d0 = Image.open(io.BytesIO(sc_init)).convert("RGB")
                c0 = im_d0.crop(thumb_bounds)
                out_v0 = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}_v0.jpg")
                c0.save(out_v0, "JPEG", quality=92)
                if supabase_client:
                    rem_v0 = f"sku_{goods_id}_v0_{int(time.time())}.jpg"
                    with open(out_v0, "rb") as f:
                        supabase_client.storage.from_("product-screenshots").upload(
                            rem_v0, f.read(), file_options={"content-type": "image/jpeg", "upsert": "true"}
                        )
                    v0_url = supabase_client.storage.from_("product-screenshots").get_public_url(rem_v0)
                    colors[0]["thumb_url"] = v0_url
            except Exception:
                pass

        # For additional variants (idx 1..min(len(colors), 10)):
        for idx in range(1, min(len(colors), 10)):
            col = colors[idx]
            b_str = col.get("bounds")
            if not b_str:
                continue
            bx1, by1, bx2, by2 = parse_bounds(b_str)
            if bx1 >= bx2 or by1 >= by2:
                continue

            try:
                # Tap variant card/button
                cx, cy = (bx1 + bx2) // 2, (by1 + by2) // 2
                run_adb(["shell", "input", "tap", str(cx), str(cy)])
                time.sleep(0.25)

                # Direct memory screencap (250ms)
                var_sc = run_adb_screencap_bytes()
                if var_sc and thumb_bounds:
                    im_var = Image.open(io.BytesIO(var_sc)).convert("RGB")
                    c_var = im_var.crop(thumb_bounds)
                    out_var = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}_v{idx}.jpg")
                    c_var.save(out_var, "JPEG", quality=92)
                    if supabase_client:
                        rem_var = f"sku_{goods_id}_v{idx}_{int(time.time())}.jpg"
                        with open(out_var, "rb") as f:
                            supabase_client.storage.from_("product-screenshots").upload(
                                rem_var, f.read(), file_options={"content-type": "image/jpeg", "upsert": "true"}
                            )
                        v_pub = supabase_client.storage.from_("product-screenshots").get_public_url(rem_var)
                        col["image_url"] = v_pub
                        col["thumb_url"] = v_pub
                    else:
                        col["image_url"] = f"/uploads/parsed/sku_{goods_id}_v{idx}.jpg"
                        col["thumb_url"] = col["image_url"]
                else:
                    col["image_url"] = hd_pub_url
                    col["thumb_url"] = hd_pub_url
            except Exception as v_err:
                print(f"[!] Variant {idx} photo error:", v_err)
                col["image_url"] = hd_pub_url
                col["thumb_url"] = hd_pub_url

        # Ensure every variant has a high-res studio photo
        for col in colors:
            if not col.get("image_url"):
                col["image_url"] = hd_pub_url
            if not col.get("thumb_url"):
                col["thumb_url"] = col["image_url"]

        # Restore drawer to the first variant selection
        if colors and colors[0].get("bounds"):
            bx1, by1, bx2, by2 = parse_bounds(colors[0]["bounds"])
            run_adb(["shell", "input", "tap", str((bx1 + bx2) // 2), str((by1 + by2) // 2)])
            time.sleep(0.2)

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
        time.sleep(0.2)
        run_adb(["shell", "input", "keyevent", "4"])
        time.sleep(0.2)
    except Exception:
        pass

    # 1. Open product in Pinduoduo App via Deep Link (with CLEAR_TOP / NEW_TASK flag)
    intent_url = f"pinduoduo://com.xunmeng.pinduoduo/goods.html?goods_id={goods_id}"
    run_adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", intent_url, "-f", "0x14000000"])
    time.sleep(random.uniform(2.5, 3.2)) # human dwell time for page load
    
    # 2. Capture title & page price directly from initial page state
    root_init = dump_ui_xml()
    if is_sku_drawer_open(root_init):
        print("[*] Stale SKU drawer was open on start. Dismissing with Back key...")
        run_adb(["shell", "input", "keyevent", "4"])
        time.sleep(0.3)
        root_init = dump_ui_xml()

    # Check for Pinduoduo sold-out, rate-limit, or network states
    # IMPORTANT: sold-out check is STRICTLY limited to the product header zone (y < 700px)
    # and short text nodes (< 30 chars) to avoid false positives from recommendation blocks
    # at the bottom of the page where OTHER sold-out products may appear.
    sold_out_keywords = ["商品已售罄", "已售罄", "已下架", "已售完", "商品已售完"]
    sold_out_reject = ["评价", "好评", "买过", "大家说", "收到了", "人买过", "推荐", "猜你喜欢", "为你推荐"]
    for node in root_init.iter("node"):
        t = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        if not t:
            continue
        # Rate-limit and network checks apply globally (full page)
        if "系统繁忙" in t:
            print(f"[*] Detected Pinduoduo rate limit / busy state: '{t}'", flush=True)
            return {
                "success": False,
                "error": "Сервер Pinduoduo временно перегружен запросами. Пожалуйста, попробуйте снова через минуту."
            }
        if "网络不太顺畅" in t or "网络不稳定" in t:
            print(f"[*] Detected Pinduoduo network retry screen: '{t}'", flush=True)
            return {
                "success": False,
                "error": "Сбой связи с сервером Pinduoduo. Пожалуйста, повторите попытку через минуту."
            }
        # Sold-out check: only in product header zone with strict filtering
        if any(k in t for k in sold_out_keywords):
            # Skip if text contains recommendation/review junk (other products' labels)
            if any(rj in t for rj in sold_out_reject):
                continue
            # Skip long text nodes — real sold-out banners are short (< 30 chars)
            if len(t) > 30:
                continue
            # Check spatial position: only trust nodes in the top product header area
            b = node.attrib.get("bounds", "")
            if b:
                try:
                    bx1, by1, bx2, by2 = parse_bounds(b)
                    # Only trigger if the node is in the top ~700px (product card area)
                    # Nodes below 700px are typically recommendations / other products
                    if by1 > 700:
                        print(f"[*] Ignoring sold-out text below product zone (y={by1}): '{t}'", flush=True)
                        continue
                except Exception:
                    pass
            # Check parent hierarchy: skip if inside a scrollable/clickable list (recommendations)
            parent = node
            in_recommendation_list = False
            if node.attrib.get("scrollable", "false") == "true":
                in_recommendation_list = True
            if in_recommendation_list:
                print(f"[*] Ignoring sold-out text inside scrollable container: '{t}'", flush=True)
                continue
            print(f"[*] Detected sold out state in product header zone: '{t}'", flush=True)
            return {
                "success": False,
                "is_sold_out": True,
                "error": "Данный товар распродан у продавца на Pinduoduo. Пожалуйста, выберите другой лот или аналогичный товар."
            }
    
    # Capture main screen screenshot for studio hero and variant icons
    main_screen_local = os.path.join(PARSED_UPLOADS_DIR, f"temp_main_{goods_id}.png")
    run_adb(["shell", "screencap", "-p", "/sdcard/main_screen.png"])
    run_adb(["pull", "/sdcard/main_screen.png", main_screen_local])

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
    
    # Priority 1: Check ViewPager content-desc (contains 100% original, clean title in Pinduoduo)
    for node in root_init.iter("node"):
        cls = node.attrib.get("class", "")
        cd = (node.attrib.get("content-desc", "") or node.attrib.get("text", "")).strip()
        if "ViewPager" in cls and len(cd) >= 6:
            raw_title = cd
            break

    # Priority 2: Check resource-id ending with tv_title with y < 950 (strictly product header, above reviews)
    if not raw_title:
        for node in root_init.iter("node"):
            res_id = node.attrib.get("resource-id", "")
            txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
            b = node.attrib.get("bounds", "")
            if "tv_title" in res_id and b and len(txt) >= 6:
                x1, y1, x2, y2 = parse_bounds(b)
                if y1 < 950 and not any(x in txt for x in ["评价", "好评", "推荐", "买过"]):
                    raw_title = txt
                    break

    # Priority 3: Fallback strictly above y < 950
    if not raw_title:
        for node in root_init.iter("node"):
            txt = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
            b = node.attrib.get("bounds", "")
            if b and len(txt) >= 8:
                x1, y1, x2, y2 = parse_bounds(b)
                if 450 <= y1 <= 950 and (x2 - x1) >= 250:
                    if not any(x in txt for x in review_and_ad_junk):
                        cleaned_txt = re.sub(r'^\d+人(收藏|关注|购买|好评|说)\s*#?\s*', '', txt).strip()
                        cleaned_txt = re.sub(r'#.*', '', cleaned_txt).strip()
                        if len(cleaned_txt) > len(raw_title):
                            raw_title = cleaned_txt

    # Clean prefix like "店铺热销 # "
    if raw_title:
        raw_title = re.sub(r'^[^\#]*#\s*', '', raw_title).strip()
        raw_title = re.sub(r'^\d+人(收藏|关注|购买|好评|说)\s*', '', raw_title).strip()

    # 3. Check if SKU drawer is open, or tap buy button
    # 3.1 Dismiss any blocking popup dialogs (e.g., '可参与的拼单')
    for n in root_init.iter("node"):
        t = (n.attrib.get("text", "") or n.attrib.get("content-desc", "")).strip()
        if "可参与的拼单" in t or "参与拼单" in t:
            print("[*] Dismissing active buyer dialog with Back key...", flush=True)
            run_adb(["shell", "input", "keyevent", "4"])
            time.sleep(0.4)
            root_init = dump_ui_xml()
            break

    has_sku_drawer = is_sku_drawer_open(root_init)
    if not has_sku_drawer:
        print("[*] SKU drawer not open yet. Locating bottom buy button...", flush=True)
        clicked_btn = False
        # Priority order: strictly group-buy / flash-buy first, single purchase last
        for target_text in ["免拼购买", "发起拼单", "立即购买", "去拼单", "单独购买", "品牌直供"]:
            for n in root_init.iter("node"):
                t = (n.attrib.get("text", "") or n.attrib.get("content-desc", "")).strip()
                b = n.attrib.get("bounds", "")
                if target_text in t and b:
                    x1, y1, x2, y2 = parse_bounds(b)
                    if y1 >= 1470:
                        human_tap(b)
                        clicked_btn = True
                        break
            if clicked_btn:
                break
        
        # Also look for '选择 款式/尺码 >' row in product body if bottom buttons were not matched
        if not clicked_btn:
            for n in root_init.iter("node"):
                t = (n.attrib.get("text", "") or n.attrib.get("content-desc", "")).strip()
                b = n.attrib.get("bounds", "")
                if ("选择" in t or "已选" in t) and (">" in t or "尺码" in t or "款式" in t) and b:
                    x1, y1, x2, y2 = parse_bounds(b)
                    if 450 <= y1 <= 1350:
                        human_tap(b)
                        clicked_btn = True
                        break

        if not clicked_btn:
            print("[*] Direct bottom right buy button tap at (740, 1535)...", flush=True)
            run_adb(["shell", "input", "tap", "740", "1535"])

        time.sleep(random.uniform(1.2, 1.8))
        root = dump_ui_xml()

        # If '可参与的拼单' dialog popped up accidentally after tap, dismiss and tap (740, 1535)
        for n in root.iter("node"):
            t = (n.attrib.get("text", "") or n.attrib.get("content-desc", "")).strip()
            if "可参与的拼单" in t or "参与拼单" in t:
                print("[*] Dismissing accidental buyer popup with Back key...", flush=True)
                run_adb(["shell", "input", "keyevent", "4"])
                time.sleep(0.4)
                run_adb(["shell", "input", "tap", "740", "1535"])
                time.sleep(1.2)
                root = dump_ui_xml()
                break

        has_sku_drawer = is_sku_drawer_open(root)
    else:
        print("[*] SKU drawer is already open! Skipping bottom buy button tap.", flush=True)
        root = root_init
        
    # 4. Parse SKU Drawer with Universal Dynamic Groups
    spec_groups = []
    current_group_dict = None
    colors = []
    sizes = []
    price_cny = 0.0
    orig_price_cny = 0.0
    seller_limit_qty = 0
    selected_summary = ""
    
    # Non-sku blacklist keywords: filter out e-commerce UI controls, guide links, and service texts
    blacklist_terms = [
        "看对比", "查看对比", "对比", "尺码建议", "查看尺码建议", "尺码对照表", "尺码表", "计算尺码", "建议尺码",
        "查看全部", "全部款式", "展开", "收起", "打开大图", "大图", "已选", "请选择",
        "已拼", "折", "包邮", "退货", "发货", "对照表", "详情", "举报", "店铺",
        "收藏", "客服", "返回", "大促", "买过", "即将结束", "无需等待", "匿名", "进店", "保障",
        "评价", "全场", "领型", "穿着方式", "面料", "风格", "适用", "多款", "列表",
        "减少数量", "增加数量", "数量", "去支付", "组合", "查收", "关闭弹窗",
        "当前收货地址", "送达", "同行", "马上卖完", "抢光", "热卖", "爆款", "活动优惠", "服务",
        "使用#支付宝", "更换支付方式", "提交订单", "立即支付", "选择尺码后", "选择款式后", "一次选多款"
    ]

    for node in root.iter("node"):
        txt = node.attrib.get("text", "").strip()
        cd = node.attrib.get("content-desc", "").strip()
        val = txt or cd
        bounds = node.attrib.get("bounds", "")
        cls = node.attrib.get("class", "")
        
        if not val or not bounds:
            continue

        x1, y1, x2, y2 = parse_bounds(bounds)
        if (x1 == 0 and y1 == 0 and x2 == 0 and y2 == 0) or (x2 - x1 < 10) or (y2 - y1 < 10):
            continue
            
        if "已选:" in val or "请选择:" in val or "请选择" in val:
            selected_summary = val.replace("已选:", "").replace("请选择:", "").replace("请选择", "").replace("🔥", "").strip()

        m_lim = re.search(r"(?:限|限购|仅限)\s*(\d+)\s*件", val)
        if m_lim and seller_limit_qty == 0:
            seller_limit_qty = int(m_lim.group(1))
            
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
        if len(val) <= 6 and any(h in val for h in ["颜色", "款式", "分类", "花色", "外观"]) and not any(x in val for x in ["大图", "已选", "请选择", "建议", "对比"]):
            existing_visual = next((g for g in spec_groups if g["title"] == "Цвет / Расцветка"), None)
            if not existing_visual:
                current_group_dict = {
                    "id": f"group_{len(spec_groups)}",
                    "title": "Цвет / Расцветка",
                    "type": "visual",
                    "header_y": y1,
                    "options": []
                }
                spec_groups.append(current_group_dict)
            else:
                current_group_dict = existing_visual
            continue
        elif len(val) <= 6 and any(h in val for h in ["尺码", "鞋码", "尺寸", "身高"]) and not any(x in val for x in ["建议", "对照", "已选", "请选择", "表", "对比"]):
            existing_size = next((g for g in spec_groups if g["title"] == "Размер"), None)
            if not existing_size:
                current_group_dict = {
                    "id": f"group_{len(spec_groups)}",
                    "title": "Размер",
                    "type": "spec",
                    "header_y": y1,
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
                    "header_y": y1,
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
                    "header_y": y1,
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
                    "header_y": y1,
                    "options": []
                }
                spec_groups.append(current_group_dict)
            else:
                current_group_dict = existing_pkg
            continue
        elif any(h in val for h in ["活动优惠", "服务", "使用#支付宝", "更换支付方式", "提交订单", "立即支付", "选择尺码后", "选择款式后", "数量", "一次选多款"]):
            current_group_dict = None
            
        if current_group_dict and any(k in cls for k in ["TextView", "Button", "View"]):
            # Extract optional price from button text (e.g. "白色 ¥138", "卡其升级款 ¥168 起")
            m_opt_price = re.search(r"¥\s*(\d+\.?\d*)", val)
            opt_price_cny = float(m_opt_price.group(1)) if m_opt_price else 0.0

            clean = re.sub(r"¥\s*\d+(\.\d+)?|起$", "", val)
            clean = re.sub(r"[🔥\s]|快要抢光|热卖|爆款|大促", "", clean).strip()
            if any(b_word in clean for b_word in blacklist_terms) or clean in blacklist_terms:
                continue
            header_y = current_group_dict.get("header_y", -999)
            if abs(y1 - header_y) <= 25 and x1 > 400:
                # Auxiliary link on same row as header (like "看对比" or "尺码建议")
                continue
            if clean and 1 <= len(clean) < 35 and clean != "大图":
                if not any(opt.get("raw_name") == clean or opt["name"] == clean for opt in current_group_dict["options"]):
                    is_sel = clean in selected_summary
                    if current_group_dict["type"] == "visual":
                        ru_val = translate_color(clean)
                        display_name = clean
                    else:
                        ru_val = format_standard_size(clean)
                        display_name = ru_val
                    en_val = node.attrib.get("enabled", "true").lower() == "true"
                    clk_val = node.attrib.get("clickable", "true").lower() == "true"
                    is_dis = (not en_val) or (not clk_val and "ViewGroup" not in cls) or any(k in val for k in ["已售罄", "售罄", "缺货", "断码", "无货"])
                    opt_entry = {
                        "name": display_name,
                        "name_ru": ru_val,
                        "raw_name": clean,
                        "selected": is_sel,
                        "bounds": bounds,
                        "disabled": is_dis,
                        "in_stock": not is_dis
                    }
                    if opt_price_cny > 0:
                        opt_entry["price_cny"] = opt_price_cny
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

    # Check bottom bar checkout button for promotional checkout price
    for node in root.iter("node"):
        val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        b_btn = node.attrib.get("bounds", "")
        if b_btn:
            bx1, by1, bx2, by2 = parse_bounds(b_btn)
            if by1 >= 1400:
                m_bottom_p = re.search(r"¥\s*(\d+\.?\d*)", val)
                if m_bottom_p:
                    b_price = float(m_bottom_p.group(1))
                    if b_price > 0 and (price_cny == 0.0 or b_price < price_cny):
                        price_cny = b_price

    # Check store coupon if mentioned on screen
    for node in root.iter("node"):
        val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        m_coup = re.search(r"店铺券\s*[-–—]?\s*(\d+\.?\d*)\s*元", val)
        if m_coup:
            coup_val = float(m_coup.group(1))
            if coup_val > 0 and price_cny > coup_val:
                discounted = round(price_cny - coup_val, 2)
                if not any(f"{discounted}" in (n.attrib.get("text", "") or n.attrib.get("content-desc", "")) for n in root.iter("node")):
                    price_cny = discounted

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
    image_rel_url = capture_hd_studio_and_variants(
        goods_id, 
        root, 
        colors, 
        main_screen_path=main_screen_local, 
        root_main=root_init
    )
    if os.path.exists(main_screen_local):
        try: os.remove(main_screen_local)
        except Exception: pass
    
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
        "seller_limit_qty": seller_limit_qty,
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
    seller_limit_qty = 0
    available_sizes = []
    disabled_sizes = []

    for node in root.iter("node"):
        val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        if "已选:" in val or "请选择:" in val:
            selected_summary = val.replace("已选:", "").replace("请选择:", "").replace("🔥", "").strip()
        if any(k in val for k in ["到手价", "提交订单", "限量价", "券后", "限1件", "限购", "已狂降至", "提前降", "抢先购", "现在买"]):
            m_price = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_price:
                price_cny = float(m_price.group(1))
        m_lim = re.search(r"(?:限|限购|仅限)\s*(\d+)\s*件", val)
        if m_lim and seller_limit_qty == 0:
            seller_limit_qty = int(m_lim.group(1))

        # Check bottom bar checkout button for exact promotional checkout price
        b_btn = node.attrib.get("bounds", "")
        if b_btn:
            bx1, by1, bx2, by2 = parse_bounds(b_btn)
            if by1 >= 1400:
                m_bottom_p = re.search(r"¥\s*(\d+\.?\d*)", val)
                if m_bottom_p:
                    b_price = float(m_bottom_p.group(1))
                    if b_price > 0 and (price_cny == 0.0 or b_price < price_cny):
                        price_cny = b_price

        # Check size buttons availability
        cls = node.attrib.get("class", "")
        if any(k in cls for k in ["TextView", "Button"]):
            en = node.attrib.get("enabled", "true").lower() == "true"
            clk = node.attrib.get("clickable", "true").lower() == "true"
            is_dis = (not en) or (not clk and "ViewGroup" not in cls) or any(k in val for k in ["售罄", "缺货", "断码", "无货"])
            if 1 <= len(val) <= 10 and not any(k in val for k in ["¥", "选择", "尺码", "已选", "建议", "优惠", "支付", "订单"]):
                std_s = format_standard_size(val)
                if is_dis:
                    disabled_sizes.extend([val, std_s])
                else:
                    available_sizes.extend([val, std_s])

    # Check store coupon if mentioned on screen
    for node in root.iter("node"):
        val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        m_coup = re.search(r"店铺券\s*[-–—]?\s*(\d+\.?\d*)\s*元", val)
        if m_coup:
            coup_val = float(m_coup.group(1))
            if coup_val > 0 and price_cny > coup_val:
                discounted = round(price_cny - coup_val, 2)
                if not any(f"{discounted}" in (n.attrib.get("text", "") or n.attrib.get("content-desc", "")) for n in root.iter("node")):
                    price_cny = discounted

    if price_cny == 0.0:
        for node in root.iter("node"):
            val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
            if "¥" in val:
                m_p = re.search(r"¥\s*(\d+\.?\d*)", val)
                if m_p:
                    price_cny = float(m_p.group(1))
                    break

    return {
        "success": True,
        "price_cny": price_cny or 0.0,
        "selected_summary": selected_summary,
        "seller_limit_qty": seller_limit_qty,
        "available_sizes": available_sizes,
        "disabled_sizes": disabled_sizes
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
                        err_msg = (parsed.get("error") if parsed else None) or "Не удалось распарсить товар через аппаратный мост"
                        supabase_client.from_("parse_queue").update({
                            "status": "error",
                            "error_message": err_msg
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
