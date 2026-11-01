// Замок экрана загрузки (заставка с логотипом). Хранит отпечатки кода и картинки заставки.
// Проверка:  node scripts/splash-lock.js          (код 1, если заставку кто-то изменил)
// Перезапись отпечатков (ТОЛЬКО по прямой просьбе пользователя):  node scripts/splash-lock.js --update
// Что защищено: блок от «#iceSplash{» до первого «</script>» в public/app.html (стили, тайминги, SVG, скрипт показа/скрытия)
// и файл картинки public/assets/splash-logo-hd.png.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const lockFile = path.join(__dirname, 'splash-lock.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function current() {
  const html = fs.readFileSync(path.join(root, 'public/app.html'), 'utf8').replace(/\r\n/g, '\n');
  const a = html.indexOf('#iceSplash{'), b = html.indexOf('</script>', a);
  if (a < 0 || b < 0) throw new Error('блок заставки не найден в app.html');
  const png = path.join(root, 'public/assets/splash-logo-hd.png');
  return { block: sha(html.slice(a, b)), png: sha(fs.readFileSync(png)) };
}
const cur = current();
if (process.argv.includes('--update')) {
  fs.writeFileSync(lockFile, JSON.stringify(cur, null, 2) + '\n');
  console.log('Замок заставки обновлён.'); process.exit(0);
}
const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
const bad = ['block', 'png'].filter(k => cur[k] !== lock[k]);
if (bad.length) {
  console.error('ОШИБКА: заставка с логотипом изменена (' + bad.map(k => k === 'block' ? 'код/тайминги в app.html' : 'картинка splash-logo-hd.png').join(', ') + ').\n' +
    'Она утверждена пользователем и заморожена. Верни как было (git checkout для этих строк) или, если пользователь прямо просил менять, после правки выполни: node scripts/splash-lock.js --update');
  process.exit(1);
}
console.log('Заставка не изменена: ок.');
