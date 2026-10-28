"""
Генератор public/css/ice-redesign-compat.css

Старые экраны написаны на Tailwind с акцентами cyan / sky / teal / indigo / purple / violet / fuchsia / pink / blue.
Новый дизайн использует один акцент (синий). Скрипт находит в коде ТОЛЬКО реально используемые классы с такими цветами
и выпускает правила, которые переводят их в палитру из ice-redesign.css. Смысловые цвета (amber, emerald/green, red) не трогаем.

Запуск из папки ice-logix-frontend:  python scripts/gen-redesign-compat.py
После добавления новых экранов запускать снова (но новые экраны должны использовать rd-* классы, см. скилл ice-design-system).
"""
import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))

FAMILIES = "cyan|sky|teal|indigo|purple|violet|fuchsia|pink|blue"
TOKEN = re.compile(
    r"(?<![\w-])((?:hover:|focus:|active:|group-hover:)?)(text|bg|border|ring|shadow|from|via|to)-(" + FAMILIES + r")-(\d{2,3})(?:/(\d{1,3}))?(?![\w-])"
)

RGB = "77, 163, 255"

sources = []
for pat in ("public/js/**/*.js", "public/*.js", "public/*.html", "index.html"):
    sources += glob.glob(os.path.join(ROOT, pat), recursive=True)

found = set()
for f in sources:
    if f.endswith(".min.js") or os.sep + "vendor" + os.sep in f:
        continue
    with open(f, encoding="utf-8", errors="ignore") as fh:
        for m in TOKEN.finditer(fh.read()):
            found.add(m.groups())

out = []
w = out.append
w("/* ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/gen-redesign-compat.py. Руками не править. */")
w("/* Перевод акцентных утилит Tailwind в палитру нового дизайна: только те классы, что реально есть в коде. */\n")

gradient_families = set()
for state, kind, fam, shade, op in sorted(found, key=lambda g: tuple(x or "" for x in g)):
    shade_i = int(shade)
    esc = f"{kind}-{fam}-{shade}" + (f"\\/{op}" if op else "")
    if state:
        sname = state.rstrip(":")
        if sname == "group-hover":
            selector = f"html body .group:hover .group-hover\\:{esc}"
        else:
            selector = f"html body .{sname}\\:{esc}:{sname}"
    else:
        selector = f"html body .{esc}"
    alpha = (int(op) / 100) if op else None

    if kind == "text":
        if alpha is not None:
            w(f"{selector} {{ color: rgba({RGB}, {max(alpha, 0.6)}) !important; }}")
        else:
            col = "var(--rd-b300)" if shade_i <= 300 else "var(--rd-b400)"
            w(f"{selector} {{ color: {col} !important; }}")
    elif kind == "bg":
        if alpha is not None:
            w(f"{selector} {{ background-color: rgba({RGB}, {alpha}) !important; }}")
        else:
            col = "var(--rd-blue)" if shade_i >= 500 else "var(--rd-blue-hi)"
            w(f"{selector} {{ background-color: {col} !important; }}")
    elif kind == "border":
        a = min((alpha if alpha is not None else 0.4) + 0.1, 0.8)
        w(f"{selector} {{ border-color: rgba({RGB}, {a}) !important; }}")
    elif kind == "ring":
        w(f"{selector} {{ --tw-ring-color: rgba({RGB}, 0.5) !important; }}")
    elif kind == "shadow":
        w(f"{selector} {{ --tw-shadow-color: transparent !important; box-shadow: none !important; }}")
    elif kind in ("from", "via", "to"):
        if kind == "from":
            gradient_families.add(fam)

w("""
/* градиенты с акцентными цветами: плоская заливка вместо неонового перелива.
   Со слэшем (from-cyan-500/20) это мягкая подложка, без слэша это сплошная синяя заливка. */""")
for fam in sorted(gradient_families):
    w(f'html body [class*="from-{fam}-"] {{ background-image: none !important; background-color: var(--rd-blue) !important; }}')
    w(f'html body [class*="from-{fam}-"][class*="/"] {{ background-color: rgba({RGB}, 0.14) !important; }}')

w("""
/* цветные свечения у теней: убираем */
html body [class*="shadow-cyan"], html body [class*="shadow-purple"], html body [class*="shadow-pink"],
html body [class*="shadow-blue"], html body [class*="shadow-sky"], html body [class*="shadow-indigo"] { box-shadow: none !important; }
""")

path = os.path.join(ROOT, "public", "css", "ice-redesign-compat.css")
with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(out) + "\n")
print("найдено разных классов:", len(found), "| правил:", len(out), "| размер, КБ:", round(os.path.getsize(path) / 1024, 1))
