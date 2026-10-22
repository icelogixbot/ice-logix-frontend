import os
import sys
import re
import time
import json
import threading
import subprocess
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, parse_qs
from typing import Optional, Dict, Any, List

import requests
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
    "棕色": "Коричневый",
    "咖啡色": "Кофейный",
    "透明": "Прозрачный",
}

def translate_color(name_cn: str) -> str:
    clean = name_cn.replace("🔥", "").strip()
    for cn, ru in COLOR_DICT.items():
        if cn in clean:
            return ru
    return clean

def translate_size_or_model(val: str) -> str:
    clean = val.replace("🔥", "").strip()
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
    return s.strip()

def translate_title(cn_title: str) -> str:
    # Heuristic cleaner for Chinese marketplace titles
    t = cn_title
    t = re.sub(r"^[^\w\s]*店铺热销\s*\|\s*", "", t)
    t = re.sub(r"24小时发货", "", t)
    t = re.sub(r"【.*?】", " ", t)
    
    parts = []
    if "手机壳" in t or "壳" in t:
        parts.append("Чехол")
    if "液态硅胶" in t or "硅胶" in t:
        parts.append("жидкий силикон")
    if "苹果" in t or "iphone" in t.lower():
        parts.append("для iPhone")
    if "一体按键" in t or "ai键" in t:
        parts.append("с кнопкой AI Control")
    if "防摔" in t:
        parts.append("ударопрочный")
    if "镜头膜" in t:
        parts.append("с защитой камеры")
        
    if parts:
        return " ".join(parts)
        
    # Generic cleanup
    clean = re.sub(r"[^\w\s\-\(\)\/]", " ", t)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:60] if clean else "Товар с маркетплейса"

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

def dump_ui_xml() -> ET.Element:
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
        return ET.fromstring(xml_str)
    except Exception as e:
        raise RuntimeError(f"Ошибка обработки экрана товара: {e}")

def capture_screen_and_crop(goods_id: str, suffix: str = "") -> str:
    temp_local = os.path.join(PARSED_UPLOADS_DIR, f"temp_{goods_id}.png")
    run_adb(["shell", "screencap", "-p", "/sdcard/screen.png"])
    run_adb(["pull", "/sdcard/screen.png", temp_local])
    
    out_rel = f"/uploads/parsed/sku_{goods_id}{suffix}.jpg"
    out_abs = os.path.join(PARSED_UPLOADS_DIR, f"sku_{goods_id}{suffix}.jpg")
    
    if os.path.exists(temp_local):
        try:
            im = Image.open(temp_local)
            # Thumbnail bounds in SKU drawer: [18, 314][288, 584]
            # Width = 270, Height = 270
            crop = im.crop((18, 314, 288, 584))
            crop.convert("RGB").save(out_abs, "JPEG", quality=90)
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
    time.sleep(1.8) # wait for page load
    
    # 2. Check if page is loaded and open SKU drawer
    root = dump_ui_xml()
    
    raw_title = ""
    # Try finding title on the main product card
    for node in root.iter("node"):
        txt = node.attrib.get("text", "").strip()
        if len(txt) > 20 and ("手机壳" in txt or "适用" in txt or "款" in txt or "店铺热销" in txt or "【" in txt):
            raw_title = txt
            break

    # If SKU drawer is not open, click the buy button (免拼购买)
    has_sku_drawer = any("已选:" in (n.attrib.get("text", "") or n.attrib.get("content-desc", "")) for n in root.iter("node"))
    if not has_sku_drawer:
        # Find buy button
        for node in root.iter("node"):
            cd = node.attrib.get("content-desc", "")
            txt = node.attrib.get("text", "")
            val = cd or txt
            if "免拼购买" in val or "单独购买" in val or "立即购买" in val:
                cx, cy = get_bounds_center(node.attrib.get("bounds", ""))
                if cx > 0 and cy > 0:
                    run_adb(["shell", "input", "tap", str(cx), str(cy)])
                    time.sleep(1.0)
                    break
        root = dump_ui_xml()
        
    # 3. Parse SKU Drawer
    colors = []
    sizes = []
    price_cny = 0.0
    orig_price_cny = 0.0
    selected_summary = ""
    
    current_group = None
    
    for node in root.iter("node"):
        txt = node.attrib.get("text", "").strip()
        cd = node.attrib.get("content-desc", "").strip()
        val = txt or cd
        bounds = node.attrib.get("bounds", "")
        cls = node.attrib.get("class", "")
        
        if not val:
            continue
            
        if "已选:" in val:
            selected_summary = val.replace("已选:", "").replace("🔥", "").strip()
            
        if "到手价" in val or "提交订单" in val:
            m_price = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_price:
                price_cny = float(m_price.group(1))
        elif val.startswith("¥") and orig_price_cny == 0.0:
            m_orig = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_orig:
                p = float(m_orig.group(1))
                if p != price_cny:
                    orig_price_cny = p

        # Check section headers
        if val == "颜色":
            current_group = "color"
            continue
        elif val in ["尺寸", "规格", "型号"]:
            current_group = "size"
            continue
        elif val in ["活动优惠", "服务", "使用#支付宝", "更换支付方式", "提交订单"]:
            current_group = None
            
        if current_group == "color" and "TextView" in cls:
            clean = val.replace("🔥", "").strip()
            if clean and len(clean) < 30 and clean != "颜色":
                is_sel = clean in selected_summary
                colors.append({
                    "name": clean,
                    "name_ru": translate_color(clean),
                    "selected": is_sel,
                    "bounds": bounds
                })
        elif current_group == "size" and "TextView" in cls:
            clean = val.replace("🔥", "").strip()
            if clean and len(clean) < 60 and clean not in ["尺寸", "规格", "型号"]:
                # filter out non-sizes
                if any(x in clean for x in ["支付宝", "提交订单", "买过", "更换支付"]):
                    continue
                is_sel = clean in selected_summary
                sizes.append({
                    "name": clean,
                    "name_ru": translate_size_or_model(clean),
                    "selected": is_sel,
                    "bounds": bounds
                })
                
    # Clean title
    if not raw_title or any(bad in raw_title for bad in ["先用后付", "支持0元", "退货", "包邮", "已选:"]):
        model_name = translate_size_or_model(selected_summary) if selected_summary else "iPhone"
        title_ru = f"Чехол для {model_name} (жидкий силикон)"
    else:
        title_ru = translate_title(raw_title)

    # 4. Capture current SKU image
    image_rel_url = capture_screen_and_crop(goods_id)
    
    return {
        "success": True,
        "marketplace": "pinduoduo",
        "goods_id": goods_id,
        "title": raw_title,
        "title_ru": title_ru,
        "price_cny": price_cny or 5.43,
        "orig_price_cny": orig_price_cny or 10.22,
        "image_url": image_rel_url,
        "selected_summary": selected_summary,
        "has_options": len(colors) > 1 or len(sizes) > 1,
        "colors": colors,
        "sizes": sizes
    }

@app.post("/api/select-sku")
def select_sku(req: SelectSkuRequest):
    cx, cy = get_bounds_center(req.bounds)
    if cx <= 0 or cy <= 0:
        raise HTTPException(status_code=400, detail="Invalid bounds")
        
    print(f"[*] Tapping SKU option at ({cx}, {cy}) for goods_id={req.goods_id}")
    run_adb(["shell", "input", "tap", str(cx), str(cy)])
    time.sleep(0.3)
    
    # Re-dump to get updated price and selected text
    root = dump_ui_xml()
    price_cny = 0.0
    selected_summary = ""
    
    for node in root.iter("node"):
        val = (node.attrib.get("text", "") or node.attrib.get("content-desc", "")).strip()
        if "已选:" in val:
            selected_summary = val.replace("已选:", "").replace("🔥", "").strip()
        if "到手价" in val or "提交订单" in val:
            m_price = re.search(r"¥\s*(\d+\.?\d*)", val)
            if m_price:
                price_cny = float(m_price.group(1))

    # Update crop
    img_url = capture_screen_and_crop(req.goods_id, suffix=f"_{int(time.time())}")
    
    return {
        "success": True,
        "price_cny": price_cny or 5.43,
        "selected_summary": selected_summary,
        "image_url": img_url
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
                            "brand": "Apple",
                            "marketplace": "pinduoduo"
                        }

                        # Update row in Supabase
                        supabase_client.from_("parse_queue").update({
                            "status": "done",
                            "price": parsed["price_cny"],
                            "currency": "CNY",
                            "title": parsed["title_ru"],
                            "brand": "Apple",
                            "category": "Аксессуары",
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
