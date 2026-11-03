// Штамп версий при сборке на Vercel: к каждому ?v= у своих файлов в public/app.html дописывается отпечаток
// содержимого файла (?v=20261103_rv3.1a2b3c4d), к ice_app_v / V — отпечаток всей страницы.
// Зачем: /js и /css отдаются как immutable на год, и если ?v= случайно повторили (так было с 20261103_rv3),
// Telegram навсегда показывает старый файл из кэша, а автообновление не видит разницы версий.
// С отпечатком новый файл = новый адрес, а новая страница = новая ice_app_v, всегда.
// Блок заставки (до первого </script> после #iceSplash{) не трогается.
// Запуск: node scripts/stamp-versions.js           — только показать, что изменится
//         node scripts/stamp-versions.js --write   — записать (делается само при сборке на Vercel, VERCEL=1)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const pub = path.join(__dirname, '..', 'public');
const file = path.join(pub, 'app.html');
const write = process.argv.includes('--write') && (process.env.VERCEL || process.argv.includes('--force'));
const h8 = b => crypto.createHash('sha1').update(b).digest('hex').slice(0, 8);
const strip = v => v.replace(/\.[0-9a-f]{8}$/, '');

const html = fs.readFileSync(file, 'utf8');
const a = html.indexOf('#iceSplash{');
const cut = a < 0 ? 0 : html.indexOf('</script>', a);
if (cut < 0) { console.error('stamp-versions: не найден конец блока заставки, пропускаю'); process.exit(0); }
const head = html.slice(0, cut);
let tail = html.slice(cut), files = 0, missing = [];

tail = tail.replace(/((?:src|href)=")(\/[^"?#]+)\?v=([^"&#]+)"/g, (m, pre, p, v) => {
  const f = path.join(pub, decodeURIComponent(p));
  if (!f.startsWith(pub) || !fs.existsSync(f)) { missing.push(p); return m; }
  files++;
  return `${pre}${p}?v=${strip(v)}.${h8(fs.readFileSync(f))}"`;
});

const appV = h8(head + tail.replace(/(ice_app_v','|var V=')[\w.-]+'/g, '$1')); // без самих версий — повторный прогон даёт то же
let vHits = 0;
// Только «словесные» версии: регэксп в скрипте автообновления (ice_app_v','([^']+)') не задевается.
tail = tail.replace(/(ice_app_v',')([\w.-]+)(')/g, (m, p1, v, p3) => (vHits++, p1 + strip(v) + '.' + appV + p3))
           .replace(/(var V=')([\w.-]+)(')/g, (m, p1, v, p3) => (vHits++, p1 + strip(v) + '.' + appV + p3));

console.log(`stamp-versions: файлов с отпечатком ${files}, версия страницы .${appV} (${vHits} мест)` +
  (missing.length ? `, без файла: ${missing.join(', ')}` : '') + (write ? ' — записано' : ' — пробный прогон'));
if (vHits < 2) { console.error('stamp-versions: не найдены ice_app_v и V в app.html — автообновление не будет работать'); }
if (write) fs.writeFileSync(file, head + tail);
