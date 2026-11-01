// Замок экрана загрузки (заставка с логотипом и экран блокировки). Хранит отпечатки кода и картинки.
// Проверка:  node scripts/splash-lock.js          (код 1, если что-то из этого кто-то изменил)
// Перезапись отпечатков (ТОЛЬКО по прямой просьбе пользователя):  node scripts/splash-lock.js --update
// Что защищено:
//  - block:   блок от «#iceSplash{» до первого «</script>» в public/app.html (стили, тайминги, SVG, скрипт показа/скрытия заставки и перехода);
//  - png:     файл public/assets/splash-logo-hd.png;
//  - lockjs:  public/js/modules/app-lock.js целиком (экран блокировки, PIN, Face ID);
//  - lockcss: строки public/css/ice-screens.css с .lk-*, lk-open, lk-up, sp-out, iceSplash.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const lockFile = path.join(__dirname, 'splash-lock.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
function current() {
  const html = rd('public/app.html');
  const a = html.indexOf('#iceSplash{'), b = html.indexOf('</script>', a);
  if (a < 0 || b < 0) throw new Error('блок заставки не найден в app.html');
  const cssLines = rd('public/css/ice-screens.css').split('\n')
    .filter(l => /\.lk-|lk-open|lk-up|sp-out|iceSplash/.test(l)).join('\n');
  return {
    block: sha(html.slice(a, b)),
    png: sha(fs.readFileSync(path.join(root, 'public/assets/splash-logo-hd.png'))),
    lockjs: sha(rd('public/js/modules/app-lock.js')),
    lockcss: sha(cssLines),
  };
}
const names = {
  block: 'код/тайминги заставки в app.html',
  png: 'картинка splash-logo-hd.png',
  lockjs: 'js/modules/app-lock.js (экран блокировки, Face ID)',
  lockcss: 'стили экрана блокировки/заставки в ice-screens.css',
};
const cur = current();
if (process.argv.includes('--update')) {
  fs.writeFileSync(lockFile, JSON.stringify(cur, null, 2) + '\n');
  console.log('Замок заставки обновлён.'); process.exit(0);
}
const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
const bad = Object.keys(names).filter(k => cur[k] !== lock[k]);
if (bad.length) {
  console.error('ОШИБКА: заморожено и изменено: ' + bad.map(k => names[k]).join(', ') + '.\n' +
    'Это утверждено пользователем и заморожено. Верни как было (git checkout для этих строк) или, если пользователь прямо просил менять, после правки выполни: node scripts/splash-lock.js --update');
  process.exit(1);
}
console.log('Заставка и экран блокировки не изменены: ок.');
