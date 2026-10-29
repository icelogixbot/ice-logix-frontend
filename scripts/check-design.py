"""
Проверка новых и изменённых строк на соответствие дизайн-системе ICE LOGIX.

Запуск из папки ice-logix-frontend:   python scripts/check-design.py
Проверяются только ДОБАВЛЕННЫЕ строки (git diff относительно HEAD и новые файлы), старый код не ругается.

Ошибки (код выхода 1): акцентные цвета Tailwind (cyan, purple, pink...), текст «BYN» в интерфейсе.
Предупреждения: эмодзи вместо SVG-иконок, шестнадцатеричные цвета в JS/HTML, новый !important, font-mono.
Правила: скилл ice-design-system и DESIGN_TOKENS.md.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

SKIP = ("vendor/", "ice-redesign.css", "ice-redesign-compat.css", "/data/", "marketplace-logos-data", "reviews-platforms-data", "icons-data.js", "pvz-data", "belarus-organs", "ui-dict.js")
EXT = (".js", ".css", ".html")

ACCENT = re.compile(r"(?<![\w-])(?:text|bg|border|from|to|via|ring|shadow)-(?:cyan|sky|teal|indigo|purple|violet|fuchsia|pink)-\d{2,3}")
BYN = re.compile(r"(?<![\w_.])BYN(?![\w_])")
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿⭐⬆✅❌]")
HEX = re.compile(r"#[0-9a-fA-F]{6}\b")
IMPORTANT = re.compile(r"!important")
MONO = re.compile(r"(?<![\w-])font-mono(?![\w-])")


def run(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="ignore").stdout


def wanted(path):
    p = path.replace("\\", "/")
    return p.endswith(EXT) and not any(s in p for s in SKIP) and (p.startswith("public/") or p == "index.html")


added = {}  # путь -> [(номер строки, текст)]

diff = run("git", "diff", "HEAD", "-U0", "--", "public", "index.html")
cur, ln = None, 0
for line in diff.splitlines():
    if line.startswith("+++ b/"):
        cur = line[6:]
        continue
    m = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", line)
    if m:
        ln = int(m.group(1))
        continue
    if line.startswith("+") and not line.startswith("+++") and cur and wanted(cur):
        added.setdefault(cur, []).append((ln, line[1:]))
        ln += 1

for f in run("git", "ls-files", "--others", "--exclude-standard").splitlines():
    if wanted(f):
        with open(os.path.join(ROOT, f), encoding="utf-8", errors="ignore") as fh:
            added[f] = list(enumerate(fh.read().splitlines(), 1))

errors, warnings = [], []
for path, lines in sorted(added.items()):
    is_css = path.endswith(".css")
    for n, text in lines:
        t = text.strip()
        if t.startswith(("//", "*", "/*", "<!--")):
            continue
        if "design-ok" in text:  # строка помечена вручную: это данные, а не текст интерфейса
            continue
        if not is_css and ACCENT.search(text):
            errors.append((path, n, "акцентный цвет Tailwind (cyan/purple/pink...): используй rd-* классы или --rd-* переменные", t))
        if not is_css and BYN.search(text) and "price_byn" not in text:
            errors.append((path, n, "текст «BYN» в интерфейсе: нужен символ рубля (window.bynSign / formatBYN)", t))
        if not is_css and EMOJI.search(text) and "console." not in text:
            warnings.append((path, n, "эмодзи вместо SVG-иконки", t))
        if not is_css and HEX.search(text):
            warnings.append((path, n, "шестнадцатеричный цвет: бери из --rd-* переменных", t))
        if is_css and IMPORTANT.search(text):
            warnings.append((path, n, "!important в новом CSS: нужен только если перебиваешь старый слой", t))
        if not is_css and MONO.search(text):
            warnings.append((path, n, "font-mono: цены и цифры уже с ровными цифрами в Inter", t))


def show(kind, items):
    for path, n, why, text in items[:60]:
        print(f"{kind} {path}:{n}  {why}\n      {text[:140]}")
    if len(items) > 60:
        print(f"... и ещё {len(items) - 60}")


show("ОШИБКА", errors)
show("внимание", warnings)
print(f"\nПроверено файлов: {len(added)}. Ошибок: {len(errors)}, предупреждений: {len(warnings)}.")
sys.exit(1 if errors else 0)
