import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const OCR_SPACE_API_KEY = Deno.env.get("OCR_SPACE_API_KEY") || "helloworld";
const VISION_MODEL = Deno.env.get("OPENROUTER_VISION_MODEL") || "google/gemini-2.0-flash-001";
const TEXT_MODEL = "google/gemini-2.0-flash-001";
const STORAGE_BUCKET = "product-screenshots";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Fallback currency rates
const FALLBACK_RATES: Record<string, number> = {
  USD_to_BYN: 3.27,
  EUR_to_BYN: 3.59,
  CNY_to_BYN: 0.45,
  PLN_to_BYN: 0.83,
  RUB_to_BYN: 0.034,
};

async function fetchOneRate(abbr: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.nbrb.by/exrates/rates/${abbr}?parammode=2`, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    const v = data.Cur_OfficialRate / data.Cur_Scale;
    return Number.isFinite(v) ? v : null;
  } catch (_e) {
    return null;
  }
}

async function getExchangeRates(): Promise<Record<string, number>> {
  const currencies = ["USD", "EUR", "CNY", "RUB", "PLN"];
  const results = await Promise.allSettled(currencies.map(c => fetchOneRate(c)));
  const rates = { ...FALLBACK_RATES };
  currencies.forEach((code, i) => {
    const res = results[i];
    const v = res.status === "fulfilled" ? res.value : null;
    if (v && Number.isFinite(v) && v > 0) {
      rates[`${code}_to_BYN`] = v;
    }
  });
  return rates;
}

function parseAssistantJson(raw: string): Record<string, any> {
  const s = (raw || "").trim();
  if (!s) return {};

  // 1. Try finding all code blocks with json (start from the last one)
  const codeBlocks = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
  if (codeBlocks && codeBlocks.length > 0) {
    for (let i = codeBlocks.length - 1; i >= 0; i--) {
      const clean = codeBlocks[i].replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      try {
        const obj = JSON.parse(clean);
        if (obj && typeof obj === "object") return obj;
      } catch (_) {}
    }
  }

  // 2. Find balanced JSON object from the end of string
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace !== -1) {
    for (let i = s.lastIndexOf("{"); i >= 0; i = s.lastIndexOf("{", i - 1)) {
      try {
        const candidate = s.slice(i, lastBrace + 1).replace(/,\s*([}\]])/g, "$1");
        const obj = JSON.parse(candidate);
        if (obj && typeof obj === "object" && (obj.id_number || obj.last_name || obj.ok !== undefined || obj.weight !== undefined)) {
          return obj;
        }
      } catch (_) {}
    }
  }

  // 3. Fallback regex-based key-value extraction ("key": "value")
  const fallbackRes: Record<string, any> = {};
  const extract = (key: string) => {
    const match = s.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "i"));
    return match ? match[1].trim() : "";
  };
  const keys = [
    "raw_mrz", "last_name", "first_name", "patronymic", "series_number", "birth_date", "gender", "id_number", "issue_date", "issued_by",
    "address_region", "address_city", "address_street", "address_house", "address_building", "address_apartment", "address_postcode",
    "region", "city", "street", "house", "building", "apartment", "postcode"
  ];
  for (const k of keys) {
    const val = extract(k);
    if (val) fallbackRes[k] = val;
  }
  // Нормализация синонимов адреса
  if (fallbackRes.city && !fallbackRes.address_city) fallbackRes.address_city = fallbackRes.city;
  if (fallbackRes.region && !fallbackRes.address_region) fallbackRes.address_region = fallbackRes.region;
  if (fallbackRes.street && !fallbackRes.address_street) fallbackRes.address_street = fallbackRes.street;
  if (fallbackRes.house && !fallbackRes.address_house) fallbackRes.address_house = fallbackRes.house;
  if (fallbackRes.building && !fallbackRes.address_building) fallbackRes.address_building = fallbackRes.building;
  if (fallbackRes.apartment && !fallbackRes.address_apartment) fallbackRes.address_apartment = fallbackRes.apartment;
  if (fallbackRes.postcode && !fallbackRes.address_postcode) fallbackRes.address_postcode = fallbackRes.postcode;

  if (Object.keys(fallbackRes).length > 0) {
    return fallbackRes;
  }

  // 4. Free-form text extraction from reasoning / thinking process
  const freeRes: Record<string, any> = {};

  const mLastName = s.match(/(?:Фамилия|Last name)[^:\n]*:\s*([А-Яа-яЁёA-Za-z]+)/i);
  if (mLastName) freeRes.last_name = mLastName[1].trim().toUpperCase();

  const mFirstName = s.match(/(?:Имя|First name|Given names)[^:\n]*:\s*([А-Яа-яЁёA-Za-z]+)/i);
  if (mFirstName) freeRes.first_name = mFirstName[1].trim().toUpperCase();

  const mPatronymic = s.match(/(?:Отчество|Patronymic)[^:\n]*:\s*([А-Яа-яЁёA-Za-z]+)/i);
  if (mPatronymic) freeRes.patronymic = mPatronymic[1].trim().toUpperCase();

  const mIdNum = s.match(/(?:Идентификационный|Personal No|личный номер)[^:\n]*:\s*`?([0-9][0-9A-Za-z]{13})`?/i);
  if (mIdNum) freeRes.id_number = mIdNum[1].trim().toUpperCase();

  const mSeries = s.match(/(?:Номер паспорта|Passport No|Серия)[^:\n]*:\s*`?([A-Za-z]{2}\d{7}|\d{9})`?/i);
  if (mSeries) freeRes.series_number = mSeries[1].trim().toUpperCase();

  const mBirth = s.match(/(?:Дата рождения|Date of birth)[^:\n]*:\s*`?([0-9]{2,4}[.\/-][0-9]{2}[.\/-][0-9]{2,4})`?/i);
  if (mBirth) {
    const rawB = mBirth[1].trim().replace(/\//g, '.').replace(/-/g, '.');
    const parts = rawB.split('.');
    if (parts.length === 3) {
      if (parts[0].length === 4) freeRes.birth_date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      else freeRes.birth_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const mSex = s.match(/(?:Пол|Sex)[^:\n]*:\s*`?(M|МУЖ|Male|F|ЖЕН|Female)`?/i);
  if (mSex) {
    const v = mSex[1].toUpperCase();
    freeRes.gender = (v.startsWith('M') || v.startsWith('МУЖ')) ? 'Мужской' : 'Женский';
  }

  const mIssueDate = s.match(/(?:Дата выдачи|Date of issue)[^:\n]*:\s*`?([0-9]{2,4}[.\/-][0-9]{2}[.\/-][0-9]{2,4})`?/i);
  if (mIssueDate) {
    const rawI = mIssueDate[1].trim().replace(/\//g, '.').replace(/-/g, '.');
    const parts = rawI.split('.');
    if (parts.length === 3) {
      if (parts[0].length === 4) freeRes.issue_date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      else freeRes.issue_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const mIssuedBy = s.match(/(?:Орган, выдавший паспорт|Орган выдачи|Issued by)[^:\n]*:\s*(?:"|'|`)?([А-Яа-яЁё\s.A-Za-z]+?)(?:"|'|`|\n|$)/i);
  if (mIssuedBy) freeRes.issued_by = mIssuedBy[1].trim().replace(/^[":']+|[":']+$/g, '');

  const mrz1 = s.match(/P<BLR[A-Z0-9<]{10,40}/i);
  const mrz2 = s.match(/([A-Z]{2}\d{7}\d?BLR[A-Z0-9<]{10,35})/i);
  if (mrz1 && mrz2) {
    freeRes.raw_mrz = `${mrz1[0]}\n${mrz2[0]}`;
  }

  // Извлечение полей адреса регистрации из текста/рассуждений
  const mCity = s.match(/(?:address_city|Город|Населенный пункт|Населены пункт)[^:\n]*:\s*(?:"|'|`)?([А-Яа-яЁё.\s-]+?)(?:"|'|`|\n|,|$)/i);
  if (mCity) freeRes.address_city = mCity[1].trim();

  const mRegion = s.match(/(?:address_region|Область|Вобласць)[^:\n]*:\s*(?:"|'|`)?([А-Яа-яЁё.\s-]+?)(?:"|'|`|\n|,|$)/i);
  if (mRegion) freeRes.address_region = mRegion[1].trim();

  const mStreet = s.match(/(?:address_street|Улица|Вуліца|ул\.|вул\.)[^:\n]*:\s*(?:"|'|`)?([А-Яа-яЁё0-9.\s-]+?)(?:"|'|`|\n|,|$)/i);
  if (mStreet) {
    let st = mStreet[1].trim();
    if (st.startsWith('вул.')) st = 'ул.' + st.slice(4);
    if (st.startsWith('Вуліца')) st = 'Улица ' + st.slice(6);
    freeRes.address_street = st;
  }

  const mHouse = s.match(/(?:address_house|Номер дома|Дом|д\.)[^:\n]*:\s*(?:"|'|`)?([0-9]+[А-Яа-яA-Za-z]?(?:[\/-][0-9А-Яа-яA-Za-z]+)?)(?:"|'|`|\n|,|\s|$)/i);
  if (mHouse) freeRes.address_house = mHouse[1].trim();

  const mBuilding = s.match(/(?:address_building|Корпус|корп\.)[^:\n]*:\s*(?:"|'|`)?([0-9]+[А-Яа-яA-Za-z]?)(?:"|'|`|\n|,|\s|$)/i);
  if (mBuilding) freeRes.address_building = mBuilding[1].trim();

  const mApartment = s.match(/(?:address_apartment|Квартира|Кватэра|кв\.|пакой)[^:\n]*:\s*(?:"|'|`)?([0-9]+[А-Яа-яA-Za-z\/-]?)(?:"|'|`|\n|,|\s|$)/i);
  if (mApartment) freeRes.address_apartment = mApartment[1].trim();

  const mPostcode = s.match(/(?:address_postcode|Индекс|Почтовый индекс)[^:\n]*:\s*(?:"|'|`)?([0-9]{6})(?:"|'|`|\n|,|\s|$)/i);
  if (mPostcode) freeRes.address_postcode = mPostcode[1].trim();

  return freeRes;
}

// Словарь райцентров и городов Беларуси для автоопределения области
const BELARUS_REGION_MAP: Record<string, string> = {
  // Брестская область
  "брест": "Брестская область", "барановичи": "Брестская область", "пинск": "Брестская область",
  "кобрин": "Брестская область", "берез": "Брестская область", "лунинец": "Брестская область",
  "ивацевич": "Брестская область", "пружан": "Брестская область", "столин": "Брестская область",
  "дрогичин": "Брестская область", "ганцевич": "Брестская область", "жабинк": "Брестская область",
  "иванов": "Брестская область", "каменец": "Брестская область", "ляхович": "Брестская область",
  "малорит": "Брестская область", "белоозерск": "Брестская область", "высокое": "Брестская область",
  "микашевичи": "Брестская область",

  // Витебская область
  "витебск": "Витебская область", "новополоцк": "Витебская область", "полоцк": "Витебская область",
  "орша": "Витебская область", "глубок": "Витебская область", "лепель": "Витебская область",
  "постав": "Витебская область", "браслав": "Витебская область", "докшиц": "Витебская область",
  "миор": "Витебская область", "городок": "Витебская область", "чашник": "Витебская область",
  "толочин": "Витебская область", "верхнедвинск": "Витебская область", "сенно": "Витебская область",
  "бешенкович": "Витебская область", "дубровно": "Витебская область", "шумилин": "Витебская область",
  "лиозно": "Витебская область", "шарковщин": "Витебская область", "россон": "Витебская область",
  "ушач": "Витебская область", "барань": "Витебская область",

  // Гомельская область
  "гомель": "Гомельская область", "мозыр": "Гомельская область", "жлобин": "Гомельская область",
  "светлогорск": "Гомельская область", "речиц": "Гомельская область", "калинкович": "Гомельская область",
  "рогачев": "Гомельская область", "добруш": "Гомельская область", "житкович": "Гомельская область",
  "хойник": "Гомельская область", "петриков": "Гомельская область", "ельск": "Гомельская область",
  "буда-кошелев": "Гомельская область", "ветк": "Гомельская область", "лельчиц": "Гомельская область",
  "чечерск": "Гомельская область", "брагин": "Гомельская область", "корм": "Гомельская область",
  "лоев": "Гомельская область", "октябрьск": "Гомельская область", "наровл": "Гомельская область",
  "василевичи": "Гомельская область", "туров": "Гомельская область",

  // Гродненская область
  "гродно": "Гродненская область", "лид": "Гродненская область", "слоним": "Гродненская область",
  "волковыск": "Гродненская область", "сморгон": "Гродненская область", "новогрудок": "Гродненская область",
  "новогруд": "Гродненская область", "островец": "Гродненская область", "ошмян": "Гродненская область",
  "щучин": "Гродненская область", "мост": "Гродненская область", "дятлов": "Гродненская область",
  "ивь": "Гродненская область", "корелич": "Гродненская область", "зельв": "Гродненская область",
  "воронов": "Гродненская область", "свислоч": "Гродненская область", "берестовиц": "Гродненская область",
  "скидель": "Гродненская область",

  // Минская область
  "борисов": "Минская область", "солигорск": "Минская область", "молодечно": "Минская область",
  "жодино": "Минская область", "слуцк": "Минская область", "дзержинск": "Минская область",
  "вилейк": "Минская область", "смолевич": "Минская область", "столбц": "Минская область",
  "несвиж": "Минская область", "фанипол": "Минская область", "заславл": "Минская область",
  "логойск": "Минская область", "березин": "Минская область", "клецк": "Минская область",
  "любан": "Минская область", "старые дороги": "Минская область", "стародорож": "Минская область",
  "воложин": "Минская область", "узден": "Минская область", "червен": "Минская область",
  "копыл": "Минская область", "крупк": "Минская область", "мядел": "Минская область",
  "колодищ": "Минская область", "боровлян": "Минская область", "сениц": "Минская область",
  "гатов": "Минская область", "мачулищ": "Минская область", "тарасов": "Минская область",
  "озерц": "Минская область", "хатежин": "Минская область", "прилук": "Минская область",
  "ратомк": "Минская область", "лесной": "Минская область", "жданович": "Минская область",

  // Могилевская область
  "могилев": "Могилевская область", "бобруйск": "Могилевская область", "горки": "Могилевская область",
  "горецк": "Могилевская область", "осипович": "Могилевская область", "кричев": "Могилевская область",
  "быхов": "Могилевская область", "климович": "Могилевская область", "шклов": "Могилевская область",
  "костюкович": "Могилевская область", "чаус": "Могилевская область", "мстиславл": "Могилевская область",
  "белынич": "Могилевская область", "кировск": "Могилевская область", "чериков": "Могилевская область",
  "славгород": "Могилевская область", "круглое": "Могилевская область", "круглян": "Могилевская область",
  "кличев": "Могилевская область", "глуск": "Могилевская область", "дрибин": "Могилевская область",
  "хотимск": "Могилевская область", "краснопол": "Могилевская область"
};

function detectRegionByCity(city: string): string | null {
  const c = (city || "").toLowerCase().trim().replace(/колодиц/g, "колодищ").replace(/тарасав/g, "тарасов").replace(/баровлян/g, "боровлян");
  if (!c) return null;

  // 1. Минский район или Минская область
  if (c.includes("минский р") || c.includes("минский район") || c.includes("минская обл") || c.includes("мінскі р") || c.includes("мінская вобл")) {
    return "Минская область";
  }

  // 2. Если строго город Минск (столица)
  if (/^(?:г\.?\s*)?минск(?:\s*|$)/i.test(c) || /^(?:г\.?\s*)?мінск(?:\s*|$)/i.test(c)) {
    return "г. Минск";
  }

  // 3. Другие области явно в строке (например "д. Черни, Брестский р-н")
  if (c.includes("брестск") || c.includes("брэсцк")) return "Брестская область";
  if (c.includes("витебск") || c.includes("віцебск")) return "Витебская область";
  if (c.includes("гомельск") || c.includes("гомель")) return "Гомельская область";
  if (c.includes("гродненск") || c.includes("гродзенск") || c.includes("гродно") || c.includes("гродна")) return "Гродненская область";
  if (c.includes("могилевск") || c.includes("магілёўск") || c.includes("могилев") || c.includes("магілёў")) return "Могилевская область";
  if (c.includes("брест") || c.includes("брэст")) return "Брестская область";
  if (c.includes("витебск") || c.includes("віцебск")) return "Витебская область";

  // 4. Сверяем по словарю райцентров и городов Беларуси
  for (const [key, region] of Object.entries(BELARUS_REGION_MAP)) {
    if (key === "минск") continue;
    if (c.includes(key)) {
      return region;
    }
  }

  return null;
}

const VALID_RB_REGIONS = [
  "г. Минск",
  "Минская область",
  "Брестская область",
  "Витебская область",
  "Гомельская область",
  "Гродненская область",
  "Могилевская область"
];

function normalizeBelarusRegion(region?: string, city?: string): string {
  const r = (region || "").trim();
  const c = (city || "").trim();

  // 1. Точное совпадение
  for (const valid of VALID_RB_REGIONS) {
    if (r.toLowerCase() === valid.toLowerCase()) return valid;
  }

  const combined = `${r} ${c}`.toLowerCase();

  // 2. Минская область или Минский район -> СТРОГО "Минская область"!
  if (combined.includes("минская") || combined.includes("мінская") || combined.includes("минский") || combined.includes("мінскі") || combined.includes("минск. обл") || combined.includes("мінск. вобл")) {
    return "Минская область";
  }

  // 3. г. Минск (столица) - только если строго Минск и НЕТ слов область / район
  if (/^(?:г\.?\s*)?минск(?:\s*|$)/i.test(r) || /^(?:г\.?\s*)?минск(?:\s*|$)/i.test(c)) {
    if (!combined.includes("район") && !combined.includes("р-н") && !combined.includes("рн") && !combined.includes("област") && !combined.includes("воблас")) {
      return "г. Минск";
    } else {
      return "Минская область";
    }
  }

  // 4. Проверяем корни областей
  if (combined.includes("брест") || combined.includes("брэст")) return "Брестская область";
  if (combined.includes("витеб") || combined.includes("віцеб")) return "Витебская область";
  if (combined.includes("гомел")) return "Гомельская область";
  if (combined.includes("гродн") || combined.includes("гродна")) return "Гродненская область";
  if (combined.includes("могил") || combined.includes("магіл")) return "Могилевская область";
  if (combined.includes("минск") || combined.includes("мінск")) return "Минская область";

  // 5. Проверяем по справочнику райцентров
  const detected = detectRegionByCity(c) || detectRegionByCity(r);
  if (detected) return detected;

  return "Минская область";
}

// Справочник почтовых индексов Белпочты для райцентров, городов и агрогородков
const BELARUS_TOWNS_POSTAL: Record<string, string> = {
  // Минский район и агрогородки
  "колодищ": "223051", "тарасов": "223018", "боровлян": "223053", "лесной": "223053", "лесковк": "223053",
  "сениц": "223056", "жданович": "223028", "ратомк": "223035", "озерц": "223021", "хатежин": "223037",
  "прилук": "223011", "заславл": "223034", "мачулищ": "223017", "гатов": "223017", "самохвалович": "223016",
  "миханович": "223075", "лошан": "223036", "щомыслиц": "223049", "острошицкий": "223054",
  "чурилович": "223068", "большевик": "223043", "юзуфов": "223041", "петришк": "223038",
  "новый двор": "223016", "крупиц": "223012", "атолин": "223011", "копищ": "223053", "дроздов": "223053",
  "зацень": "223035", "цнянк": "223053", "юбилейный": "223056", "сокол": "220044", "фанипол": "222750",

  // Несвижский район и окрестности
  "несвиж": "222603", "городе": "222610", "снов": "222620", "лань": "222631", "сейлович": "222628",
  "альб": "222603", "карцевич": "222603", "островк": "222634", "грицкевич": "222623", "юшевич": "222638",
  "солтановщин": "222632", "погорельц": "222620", "козл": "222617", "леонович": "222617",

  // Столбцовский, Клецкий, Копыльский, Дзержинский районы
  "столбц": "222660", "новый свержен": "222660", "рубежевич": "222675", "налибок": "222684", "заямн": "222660",
  "клецк": "222531", "синявк": "222543", "заостровеч": "222541", "мороч": "222540",
  "копыл": "222811", "тимкович": "222830", "семежев": "222843", "грозов": "222822",
  "дзержинск": "222720", "станьков": "222731", "негорел": "222740",

  // Брестская область
  "барановичи": "225400", "пинск": "225710", "кобрин": "225300", "берез": "225210", "лунинец": "225640",
  "ивацевич": "225295", "пружан": "225133", "столин": "225510", "дрогичин": "225612", "ганцевич": "225432",
  "жабинк": "225101", "иванов": "225800", "каменец": "225050", "ляхович": "225370", "малорит": "225903",
  "белоозерск": "225215", "микашевичи": "225680", "высокое": "225080",

  // Витебская область
  "новополоцк": "211440", "полоцк": "211400", "орша": "211030", "глубок": "211800", "лепель": "211174",
  "постав": "211871", "браслав": "211970", "докшиц": "211720", "миор": "211287", "городок": "211573",
  "чашник": "211149", "толочин": "211092", "верхнедвинск": "211631", "сенно": "211117", "бешенкович": "211361",
  "дубровно": "211040", "шумилин": "211259", "лиозно": "211220", "шарковщин": "211910", "россон": "211470",
  "ушач": "211524", "барань": "211011",

  // Гомельская область
  "мозыр": "247760", "жлобин": "247210", "светлогорск": "247430", "речиц": "247500", "калинкович": "247710",
  "рогачев": "247671", "добруш": "247050", "житкович": "247960", "хойник": "247618", "петриков": "247920",
  "ельск": "247873", "буда-кошелев": "247350", "ветк": "247120", "лельчиц": "247841", "чечерск": "247381",
  "брагин": "247632", "корм": "247172", "лоев": "247080", "октябрьск": "247319", "наровл": "247802",
  "василевичи": "247540", "туров": "247980",

  // Гродненская область
  "лид": "231300", "слоним": "231800", "волковыск": "231900", "сморгон": "231000", "новогруд": "231400",
  "островец": "231201", "ошмян": "231103", "щучин": "231513", "мост": "231600", "дятлов": "231471",
  "ивь": "231337", "корелич": "231430", "зельв": "231940", "воронов": "231391", "свислоч": "231969",
  "берестовиц": "231778", "скидель": "231761",

  // Минская область (города)
  "борисов": "222120", "солигорск": "223710", "молодечно": "222310", "жодино": "222160", "слуцк": "223610",
  "вилейк": "222410", "смолевич": "222201",
  "логойск": "223110", "березин": "223311", "любан": "223812", "старые дороги": "222932",
  "воложин": "222357", "узден": "223411", "червен": "223232", "крупк": "222001",
  "мядел": "222397", "марьина горка": "222810", "пухович": "222810", "руденск": "222850",
  "радошкович": "222322", "плещениц": "223130", "смилович": "223214", "чисть": "222330",

  // Могилевская область
  "бобруйск": "213800", "горки": "213410", "горецк": "213410", "осипович": "213760", "кричев": "213500",
  "быхов": "213352", "климович": "213633", "шклов": "213004", "костюкович": "213640", "чаус": "213206",
  "мстиславл": "213453", "белынич": "213160", "кировск": "213931", "чериков": "213533", "славгород": "213915",
  "круглое": "213188", "кличев": "213910", "глуск": "213879", "дрибин": "213971", "хотимск": "213660",
  "краснопол": "213561"
};

function lookupBelarusPostcode(city?: string, street?: string, house?: string): string | null {
  const clean = (s: string) => (s || "")
    .replace(/^(?:г|д|аг|пос|пгт|рп|город|деревня|агрогородок|поселок)\.?\s+/gi, "")
    .replace(/^(?:ул|вул|пр-т|просп|пр|пер|бул|б-р|тракт|ш|наб|пл)\.?\s+/gi, "")
    .toLowerCase().replace(/[,\/]/g, " ").trim();
  const c = clean(city || "");
  const s = clean(street || "");
  const hNum = parseInt((house || "").replace(/\D+/g, ""), 10) || 0;

  // 1. Минск (столичные проспекты и улицы)
  const isMinsk = (c === "минск" || c === "мінск" || c.startsWith("минск ") || c.startsWith("мінск "));
  if (isMinsk) {
    if (s.includes("победител") || s.includes("пераможц")) {
      if (hNum > 65) return "220062";
      if (hNum > 20) return "220020";
      return "220035";
    }
    if (s.includes("независимост") || s.includes("незалежнас") || s.includes("скорин")) {
      if (hNum > 160) return "220056";
      if (hNum > 115) return "220114";
      if (hNum > 85) return "220012";
      if (hNum > 50) return "220013";
      if (hNum > 25) return "220005";
      return "220030";
    }
    if (s.includes("притыцк") || s.includes("прытыцк")) {
      if (hNum > 110) return "220140";
      if (hNum > 90) return "220136";
      if (hNum > 60) return "220121";
      if (hNum > 30) return "220082";
      return "220073";
    }
    if (s.includes("дзержинск")) {
      if (hNum > 100) return "220025";
      if (hNum > 70) return "220116";
      if (hNum > 30) return "220089";
      return "220036";
    }
    if (s.includes("рокоссовск")) {
      if (hNum > 100) return "220017";
      if (hNum > 50) return "220085";
      return "220095";
    }
    if (s.includes("пушкин")) {
      if (hNum > 65) return "220092";
      if (hNum > 35) return "220082";
      return "220015";
    }
    if (s.includes("партизанск")) {
      if (hNum > 120) return "220070";
      if (hNum > 80) return "220021";
      if (hNum > 40) return "220026";
      return "220033";
    }
    if (s.includes("газеты правда")) return "220116";
    if (s.includes("газеты звязда")) return "220117";
    if (s.includes("любимов")) return "220117";
    if (s.includes("немиг")) return "220004";
    if (s.includes("ленин")) return "220030";
    if (s.includes("машеров")) return "220002";
    if (s.includes("богданович")) return "220029";
    if (s.includes("сурганов")) return "220012";
    if (s.includes("колас")) return "220013";
    if (s.includes("орловск")) return "220053";
    if (s.includes("маяковск")) return "220006";
    if (s.includes("кальварийск")) return "220004";
    if (s.includes("аэродромн")) return "220007";
    if (s.includes("одинцов")) return "220018";
    if (s.includes("лобанк")) return "220019";
    if (s.includes("сухаревск")) return "220019";
    if (s.includes("рафиев")) return "220051";
    if (s.includes("есенин")) return "220025";
    if (s.includes("шарангович")) return "220019";
    if (s.includes("тимирязев")) return "220035";
    if (s.includes("казинц")) return "220099";
    if (s.includes("кижеватов")) return "220024";
    if (s.includes("городецк")) return "220125";
    if (s.includes("гинтовт")) return "220125";
    if (s.includes("руссиянов")) return "220141";
    if (s.includes("шафарнянск")) return "220125";
    if (s.includes("калиновск")) return "220086";
    return "220050"; // Минск Главпочтамт
  }

  // 2. Областные центры
  if (c.includes("брест") || c.includes("брэст")) {
    if (s.includes("машеров")) return "224030";
    if (s.includes("советск")) return "224005";
    if (s.includes("московск")) return "224023";
    return "224000";
  }
  if (c.includes("витебск") || c.includes("віцебск")) {
    if (s.includes("ленин")) return "210015";
    if (s.includes("московск")) return "210038";
    if (s.includes("строител")) return "210032";
    return "210000";
  }
  if (c.includes("гомель")) {
    if (s.includes("советск")) return "246050";
    if (s.includes("ленин")) return "246017";
    if (s.includes("речицк")) return "246045";
    return "246000";
  }
  if (c.includes("гродно") || c.includes("гродна")) {
    if (s.includes("советск")) return "230023";
    if (s.includes("горьк")) return "230015";
    if (s.includes("клецков")) return "230026";
    if (s.includes("купал")) return "230027";
    return "230000";
  }
  if (c.includes("могилев") || c.includes("магілёў")) {
    if (s.includes("первомайск")) return "212030";
    if (s.includes("пушкин")) return "212002";
    if (s.includes("мир")) return "212022";
    return "212000";
  }

  // 3. Бобруйск (крупнейший необластной город)
  if (c.includes("бобруйск")) {
    if (s.includes("минск")) return "213827";
    return "213800";
  }

  // 4. Поиск по словарю райцентров, поселков и агрогородков
  const normalizedC = c
    .replace(/колодиц/g, "колодищ")
    .replace(/тарасав/g, "тарасов")
    .replace(/баровлян/g, "боровлян")
    .replace(/гарадзе/g, "городе")
    .replace(/нясвіж/g, "несвиж");

  for (const [key, code] of Object.entries(BELARUS_TOWNS_POSTAL)) {
    if (normalizedC.includes(key) || key.includes(normalizedC)) {
      return code;
    }
  }

  return null;
}

// Запрос почтового индекса через геокодер OSM (с тайм-аутом 2.5 сек)
async function fetchPostcodeOsm(city?: string, street?: string, house?: string): Promise<string | null> {
  const clean = (s: string) => (s || "").replace(/^(?:г|д|аг|пос|пгт|рп|ул|вул|пр-т|просп|пр|пер|бул|б-р|тракт|ш|наб|пл)\.?\s+/gi, "").replace(/[,\/]/g, " ").trim();
  const c = clean(city || "");
  const s = clean(street || "");
  const h = clean(house || "");

  const queryCandidates = [
    `${c} ${s} ${h}`,
    `${c} ${s}`,
    `${c}`
  ].filter(q => q.trim().length > 2);

  for (const q of queryCandidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=by&limit=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "IceLogix-Customs/2.0 (contact@icelogix.by)" },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const j = await res.json();
        const pc = j[0]?.address?.postcode;
        if (pc && /^\d{6}$/.test(pc)) {
          return pc;
        }
      }
    } catch (_) {}
  }
  return null;
}

async function enrichBelarusAddress(addr: Record<string, any>): Promise<Record<string, any>> {
  const result = { ...addr };

  // Очистка от ошибочного попадания названия области в поле города или улицы
  if (result.address_city && /область|вобласць/i.test(result.address_city) && !/г\.|город|аг\.|д\./i.test(result.address_city)) {
    if (!result.address_region) {
      result.address_region = normalizeBelarusRegion(result.address_city, "");
    }
    result.address_city = "";
  }
  if (result.address_street && /область|вобласць/i.test(result.address_street)) {
    result.address_street = "";
  }

  // 1. Номер дома, корпуса и квартиры: извлечение и очистка
  let h = (result.address_house || "").trim();
  h = h.replace(/^(?:дом|д\.?|№)\s*/i, "").replace(/[-.\/]+$/, "").trim();

  let b = (result.address_building || "").trim();
  if (!b || b === "-" || b === "—" || b === "нет" || b === "null") {
    b = "-";
  }

  let apt = (result.address_apartment || "").trim();
  if (apt === "-" || apt === "—" || apt.toLowerCase() === "нет" || apt.toLowerCase() === "null") {
    apt = "";
  }
  apt = apt.replace(/^кв\.?\s*/i, "").replace(/[-.\/]+$/, "").trim();

  // 1.1. Если квартира или корпус случайно попали в строку улицы (например "ул. Советская, 12 кв. 45" или "пр-т Мира, 74/3 корп. 2 кв. 277")
  if (result.address_street) {
    const mAptInStreet = result.address_street.match(/(?:,\s*|\s+)(?:кв\.?|кватэра|пакой|комн?\.?)\s*([0-9]+[А-Яа-яA-Za-z]?)/i);
    if (mAptInStreet) {
      if (!apt) apt = mAptInStreet[1].trim();
      result.address_street = result.address_street.slice(0, mAptInStreet.index).trim().replace(/,\s*$/, "");
    }

    const mCorpInStreet = result.address_street.match(/(?:,\s*|\s+)(?:корп\.?|корпус)\s*([0-9]+[А-Яа-яA-Za-z]?|-)/i);
    if (mCorpInStreet) {
      if (b === "-") b = mCorpInStreet[1].trim();
      result.address_street = result.address_street.slice(0, mCorpInStreet.index).trim().replace(/,\s*$/, "");
    }

    const mHouseInStreet = result.address_street.match(/(?:,\s*|\s+)(?:дом\s*|д\.?\s*)?([0-9]+[А-Яа-яA-Za-z]?(?:[\/-][0-9А-Яа-яA-Za-z]+)?)$/i);
    if (mHouseInStreet && !h) {
      h = mHouseInStreet[1].trim();
      result.address_street = result.address_street.slice(0, mHouseInStreet.index).trim().replace(/,\s*$/, "");
    }
  }

  // 1.2. Если квартира попала в поле номера дома (например "12 кв. 45" или "12-45" или "12/45")
  if (h && /(?:,\s*|\s+)(?:кв\.?|кватэра|пакой)\s*([0-9]+[А-Яа-яA-Za-z]?)/i.test(h)) {
    const m = h.match(/^(.*?)(?:,\s*|\s+)(?:кв\.?|кватэра|пакой)\s*([0-9]+[А-Яа-яA-Za-z]?)/i);
    if (m) {
      h = m[1].trim();
      if (!apt) apt = m[2].trim();
    }
  }
  if (h && /^[0-9]+[А-Яа-яA-Za-z]?-[0-9]+$/.test(h) && !apt) {
    const parts = h.split("-");
    h = parts[0].trim();
    apt = parts[1].trim();
  }

  result.address_house = h;
  result.address_building = b;
  result.address_apartment = apt;

  // 2. Автоопределение и строгая нормализация области РБ к 7 официальным регионам
  result.address_region = normalizeBelarusRegion(result.address_region, result.address_city);

  // 3. Автоопределение почтового индекса Белпочты (приоритет официальному справочнику)
  const authoritativePc = lookupBelarusPostcode(result.address_city, result.address_street, result.address_house);
  if (authoritativePc) {
    result.address_postcode = authoritativePc;
  } else {
    const osmPc = await fetchPostcodeOsm(result.address_city, result.address_street, result.address_house);
    if (osmPc) {
      result.address_postcode = osmPc;
    } else if (!result.address_postcode || !/^\d{6}$/.test(result.address_postcode) || result.address_postcode === "220000" || result.address_postcode === "220050") {
      const regDefaults: Record<string, string> = {
        "Брестская область": "224000",
        "Витебская область": "210000",
        "Гомельская область": "246000",
        "Гродненская область": "230000",
        "Минская область": "222603",
        "Могилевская область": "212000",
        "г. Минск": "220050",
      };
      result.address_postcode = regDefaults[result.address_region] || "220050";
    }
  }

  return result;
}

// ==========================================
// 🚀 БЕСПЛАТНЫЙ ОПТИЧЕСКИЙ OCR-ДВИЖОК
// 0 кредитов, 0 рублей, мгновенное считывание паспорта РБ и штампа
// ==========================================

async function runOCRSpaceImage(base64Image: string, lang = "rus"): Promise<string> {
  let img = (base64Image || "").trim();
  if (!img) return "";
  if (!img.startsWith("data:")) {
    img = `data:image/jpeg;base64,${img}`;
  }

  const form = new URLSearchParams();
  form.append("base64Image", img);
  form.append("language", lang);
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "apikey": OCR_SPACE_API_KEY },
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    const data = await res.json();
    return data?.ParsedResults?.[0]?.ParsedText || "";
  } catch (err) {
    clearTimeout(timer);
    console.warn("OCR.space network error:", err);
    return "";
  }
}

function parsePage31FromText(text: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/фамилия|прозвішча|sumame|surname/i.test(l) && lines[i + 1]) {
      result.last_name = lines[i + 1].replace(/[^А-Яа-яЁёA-Za-z-]/g, "").toUpperCase();
    }
    if (/^імя|^имя|given names/i.test(l) && !/бацьку|отчество/i.test(l) && lines[i + 1]) {
      result.first_name = lines[i + 1].replace(/[^А-Яа-яЁёA-Za-z-]/g, "").toUpperCase();
    }
    if (/отчество|бацьку/i.test(l) && lines[i + 1]) {
      result.patronymic = lines[i + 1].replace(/[^А-Яа-яЁёA-Za-z-]/g, "").toUpperCase();
    }
    if (/орган/i.test(l)) {
      const nextParts: string[] = [];
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (/дата|date|паспорт|passport/i.test(lines[j])) break;
        nextParts.push(lines[j]);
      }
      if (nextParts.length > 0) {
        result.issued_by = nextParts.join(" ").replace(/^[":']+|[":']+$/g, "").trim();
      }
    }
    const mDate = l.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);
    if (mDate && !result.issue_date) {
      result.issue_date = `${mDate[3]}-${mDate[2]}-${mDate[1]}`;
    }
  }

  return result;
}

function parsePage33FromText(text: string): Record<string, any> {
  const result: Record<string, any> = {};
  const clean = text.replace(/\r/g, "");

  const m1 = clean.match(/P<BLR([A-Z<]+)/i);
  if (m1) {
    const names = m1[1].split("<<");
    if (names[0]) result.last_name_lat = names[0].replace(/</g, "").trim();
    if (names[1]) result.first_name_lat = names[1].replace(/</g, "").trim();
  }

  const m2 = clean.match(/([A-Z]{2}\d{7})\d?BLR(\d{6})\d?([MF])(\d{6})\d?([A-Z0-9]{14})/i);
  if (m2) {
    result.series_number = m2[1].toUpperCase();
    const yy = parseInt(m2[2].slice(0, 2), 10);
    const mm = m2[2].slice(2, 4);
    const dd = m2[2].slice(4, 6);
    const century = yy > 30 ? "19" : "20";
    result.birth_date = `${century}${yy.toString().padStart(2, "0")}-${mm}-${dd}`;
    result.gender = m2[3].toUpperCase() === "M" ? "Мужской" : "Женский";
    result.id_number = m2[5].toUpperCase();
    result.raw_mrz = `P<BLR${m1 ? m1[1] : ""}\n${m2[0]}`;
  } else {
    const mPass = clean.match(/\b([A-Z]{2}\d{7})\b/i);
    if (mPass) result.series_number = mPass[1].toUpperCase();

    const mId = clean.match(/\b([0-9][0-9]{6}[A-Z][0-9]{3}[A-Z]{2}[0-9])\b/i);
    if (mId) result.id_number = mId[1].toUpperCase();

    const mBirth = clean.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
    if (mBirth) result.birth_date = `${mBirth[3]}-${mBirth[2]}-${mBirth[1]}`;
  }

  return result;
}

function parseRegistrationStampFromText(text: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // 1. Населенный пункт
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/населены пункт|нас\.\s*пункт/i.test(l)) {
      const inline = l.replace(/^.*(?:населены пункт|нас\.\s*пункт)[^:]*[:\s]*/i, "").trim();
      if (inline && !/вуліца|улица|дом|корп|кв|дата/i.test(inline)) {
        result.address_city = inline;
        break;
      }
      if (lines[i + 1] && !/вуліца|улица|дом|корп|кв|дата/i.test(lines[i + 1])) {
        result.address_city = lines[i + 1].trim();
        break;
      }
    } else if (!/населены|па месцы|зарэгістр|жыхарства/i.test(l) && /(?:^|\s)(?:г\.|аг\.|д\.|пос\.|пгт)\s*([А-Яа-яЁё-]+(?:\s+[А-Яа-яЁё-]+)?)/i.test(l)) {
      const m = l.match(/(?:^|\s)(?:г\.|аг\.|д\.|пос\.|пгт)\s*([А-Яа-яЁё-]+(?:\s+[А-Яа-яЁё-]+)?)/i);
      result.address_city = m![0].trim();
      break;
    }
  }
  if (!result.address_city) {
    for (const l of lines) {
      if (/минск|брест|витебск|гомель|гродно|могилев|колодищ|тарасов|боровлян|фанипол|заславл|бобруйск/i.test(l) && !/рувд|паспорт|зарегистр|жыхарств/i.test(l)) {
        result.address_city = l.trim();
        break;
      }
    }
  }

  // Очистка города от случайных пробелов внутри названия (напр. 'Колодищ и' -> 'Колодищи')
  if (result.address_city) {
    result.address_city = result.address_city
      .replace(/([А-Яа-яЁё]{2,})\s+([А-Яа-яЁё]{1,2})$/, "$1$2")
      .replace(/колодиц[ие]/gi, "Колодищи");
  }

  // 2. Улица / проспект
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/вуліца|улица.*пр-т/i.test(l)) {
      const inline = l.replace(/^.*(?:вуліца|улица)[^:]*[:\s]*/i, "").trim();
      if (inline && !/дом|корп|кв|дата/i.test(inline)) {
        result.address_street = inline;
        break;
      }
      if (lines[i + 1] && !/дом|корп|кв|дата/i.test(lines[i + 1])) {
        result.address_street = lines[i + 1].trim();
        break;
      }
    } else if (!/вуліца|улица|место|нас\.|пункт|па месцы/i.test(l) && /(?:пр-т|просп|ул\.|вул\.|тракт|пер\.|бул\.)\s*([А-Яа-яЁё0-9.\s-]+)/i.test(l)) {
      result.address_street = l.trim();
      break;
    }
  }
  if (!result.address_street) {
    for (const l of lines) {
      if (/независимост|победител|притыцк|советск|центральн|тюленин|минск/i.test(l) && !/г\.|город|орган|жыхарств/i.test(l)) {
        result.address_street = l.trim();
        break;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/(?:Дом|д\.)[:\s]*([0-9]+[А-Яа-яA-Za-z]?(?:[\/-][0-9А-Яа-яA-Za-z]+)?)/i);
    if (m && m[1]) {
      result.address_house = m[1].trim();
      break;
    } else if (/^дом[:\s]*$/i.test(l) && lines[i + 1] && /^\d+/.test(lines[i + 1])) {
      result.address_house = lines[i + 1].trim();
      break;
    }
  }

  result.address_building = "-";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/(?:Корп\.?|Корпус)[:\s]*([0-9]+[А-Яа-яA-Za-z]?)/i);
    if (m && m[1]) {
      result.address_building = m[1].trim();
      break;
    } else if (/^корп\.?[:\s]*$/i.test(l) && lines[i + 1] && /^[0-9]+$/.test(lines[i + 1])) {
      result.address_building = lines[i + 1].trim();
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/(?:Кв\.?|Кватэра|пакой)[:\s]*([0-9]+)/i);
    if (m && m[1]) {
      result.address_apartment = m[1].trim();
      break;
    } else if (/^(?:кв\.?|кватэра)[:\s]*$/i.test(l) && lines[i + 1] && /^\d+$/.test(lines[i + 1])) {
      result.address_apartment = lines[i + 1].trim();
      break;
    }
  }
  if (!result.address_apartment) {
    const digitLines = lines.filter(l => /^\d{1,4}$/.test(l));
    if (digitLines.length > 0 && digitLines[digitLines.length - 1] !== result.address_house && digitLines[digitLines.length - 1] !== result.address_building) {
      result.address_apartment = digitLines[digitLines.length - 1];
    }
  }

  return result;
}

async function parsePassportWithFreeOCR(frame1?: string, frame2?: string, frame3?: string): Promise<Record<string, any> | null> {
  try {
    const [t33, t31, tStamp] = await Promise.all([
      frame2 ? runOCRSpaceImage(frame2, "eng").catch(() => "") : Promise.resolve(""),
      frame1 ? runOCRSpaceImage(frame1, "rus").catch(() => "") : Promise.resolve(""),
      frame3 ? runOCRSpaceImage(frame3, "rus").catch(() => "") : Promise.resolve("")
    ]);

    const data33 = frame2 ? parsePage33FromText(t33) : {};
    const data31 = frame1 ? parsePage31FromText(t31) : {};
    const dataStamp = frame3 ? parseRegistrationStampFromText(tStamp) : {};

    const combined: Record<string, any> = {
      ok: true,
      ...data33,
      ...data31,
      ...dataStamp
    };

    if (combined.id_number || combined.series_number || combined.last_name) {
      return combined;
    }
    return null;
  } catch (err) {
    console.warn("Free OCR Engine error:", err);
    return null;
  }
}

async function callVisionChatWithFallback(messages: any[], maxTokens = 3500, title = "ICE LOGIX Vision"): Promise<any> {
  const models = [
    Deno.env.get("OPENROUTER_VISION_MODEL"),
    "dots-studio/dots-3-note-preview:free",
    "thinkingmachines/inkling:free",
    "thinkingmachines/inkling-small:free",
    "nvidia/nemotron-3.5-super-vl:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "google/gemini-2.5-flash",
    "google/gemini-3.5-flash",
    "openai/gpt-4o-mini",
    "qwen/qwen-2.5-vl-72b-instruct",
  ];

  // Remove duplicates and blanks
  const uniqueModels = [...new Set(models.filter(Boolean))];

  // Ensure system instruction is first if not already present
  const preparedMessages = [...messages];
  if (!preparedMessages.some(m => m.role === "system")) {
    preparedMessages.unshift({
      role: "system",
      content: "You are an automated document recognition OCR engine. Output strictly valid JSON format. Do not write thinking process, explanations, markdown quotes or conversational text. Start immediately with '{'."
    });
  }

  // 1. Приоритетный бесплатный Groq Cloud API (14,400 запросов/день, ~300мс)
  if (GROQ_API_KEY) {
    const groqModels = ["llama-3.2-90b-vision-preview", "llama-3.2-11b-vision-preview"];
    for (const gModel of groqModels) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: gModel,
            messages: preparedMessages,
            temperature: 0.01,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (content) {
            console.log(`Success with Groq model: ${gModel}`);
            return json;
          }
        } else {
          console.warn(`Groq ${gModel} status ${res.status}:`, await res.text().catch(() => ""));
        }
      } catch (gErr) {
        console.warn(`Groq error (${gModel}):`, gErr);
      }
    }
  }

  // 2. Приоритетный бесплатный Google Gemini API напрямую (1500 запросов/день)
  if (GEMINI_API_KEY) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const geminiParts: any[] = [];
      for (const m of preparedMessages) {
        if (typeof m.content === "string") {
          geminiParts.push({ text: m.content });
        } else if (Array.isArray(m.content)) {
          for (const item of m.content) {
            if (item.type === "text") {
              geminiParts.push({ text: item.text });
            } else if (item.type === "image_url" && item.image_url?.url) {
              const url = item.image_url.url;
              const match = url.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                geminiParts.push({
                  inline_data: {
                    mime_type: match[1],
                    data: match[2]
                  }
                });
              }
            }
          }
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const gRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: geminiParts }],
          generationConfig: {
            temperature: 0.01,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (gRes.ok) {
        const gJson = await gRes.json();
        const text = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log("Success with direct Gemini 2.0 Flash API!");
          return {
            choices: [{
              message: { content: text }
            }]
          };
        }
      } else {
        console.warn("Direct Gemini API error:", await gRes.text().catch(() => ""));
      }
    } catch (geminiErr) {
      console.warn("Direct Gemini exception:", geminiErr);
    }
  }

  const errorLog: string[] = [];
  for (const model of uniqueModels) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://icelogix.app",
          "X-Title": title,
        },
        body: JSON.stringify({
          model,
          messages: preparedMessages,
          temperature: 0.01,
          max_tokens: maxTokens,
          reasoning: { effort: "none" },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        if (json?.error) {
          const errStr = `${model} body-err: ${json.error?.message || JSON.stringify(json.error)}`;
          console.warn(errStr);
          errorLog.push(errStr);
          continue;
        }
        const msgContent = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.message?.reasoning;
        if (msgContent) {
          return json;
        }
        const errStr = `${model} empty-choices`;
        console.warn(errStr);
        errorLog.push(errStr);
        continue;
      }

      const errTxt = await res.text().catch(() => "");
      const errStr = `${model} HTTP ${res.status}: ${errTxt.slice(0, 150)}`;
      errorLog.push(errStr);
      console.warn(`Vision model failed: ${errStr}. Trying next fallback...`);
    } catch (e) {
      const errStr = `${model} exception: ${e.message}`;
      errorLog.push(errStr);
      console.warn(errStr);
    }
  }

  throw new Error(`All vision models failed. Attempts: ${errorLog.join(" | ")}`);
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action } = payload;



    if (action === "estimate_weight") {
      const { description, screenshotPath, image } = payload;

      let imageUrl = "";
      if (typeof image === "string" && image.trim().length > 0) {
        let img = image.trim();
        if (!img.startsWith("data:") && !img.startsWith("http")) {
          img = `data:image/jpeg;base64,${img}`;
        }
        imageUrl = img;
      } else if (screenshotPath) {
        const { data: urlData, error: urlErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(screenshotPath, 600);
        if (!urlErr && urlData?.signedUrl) {
          imageUrl = urlData.signedUrl;
        }
      }

      if (!description && !imageUrl) {
        return new Response(
          JSON.stringify({ ok: false, error: "Provide description or photo" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build weight estimation prompt
      const prompt = `You are a weight estimator assistant for ICE LOGIX delivery.
Analyze the product description or image provided by the user and estimate the typical shipping weight of this item in kilograms.
Here are typical weights:
- T-shirt / Polo / Socks / Hat: 0.2 - 0.3 kg
- Jeans / Pants / Shorts / Hoodie / Sweatshirt: 0.7 - 0.8 kg
- Light jacket / Windbreaker: 0.8 - 1.0 kg
- Winter down jacket / Heavy coat / Boots: 1.5 - 2.5 kg
- Sneakers / Casual shoes: 1.2 kg (standard)
- Small bag / Wallet / Accessories: 0.3 - 0.5 kg
- Backpack / Large bag: 0.8 - 1.2 kg

Return ONLY a JSON object:
{
  "weight": number (estimated weight in kg, e.g. 1.2 or 0.7),
  "product_name": "string (short Russian name of the identified product, e.g. 'Кроссовки Nike' or 'Худи Calvin Klein')"
}`;

      const messages: any[] = [];
      if (imageUrl) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: prompt + (description ? `\nUser hint: "${description}"` : "") },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        });
      } else {
        messages.push({
          role: "user",
          content: prompt + `\nUser product query: "${description}"`,
        });
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://icelogix.app",
          "X-Title": "ICE LOGIX ai-weight-estimator",
        },
        body: JSON.stringify({
          model: imageUrl ? VISION_MODEL : TEXT_MODEL,
          messages,
          temperature: 0.1,
          max_tokens: 150,
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        throw new Error(`OpenRouter HTTP ${res.status}: ${errTxt}`);
      }

      const data = await res.json();
      const rawOutput = data?.choices?.[0]?.message?.content || "";
      const parsed = parseAssistantJson(rawOutput);
      const estWeight = typeof parsed.weight === "number" && !isNaN(parsed.weight) ? parsed.weight : 1.0;

      return new Response(
        JSON.stringify({ 
          ok: true, 
          weight: estWeight, 
          estimated_weight: estWeight, 
          product_name: parsed.product_name || "" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "calculate") {
      const { title, price, currency, country, weight, local_delivery, additional_services } = payload;

      if (!title || price === undefined || !currency || !country) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing required fields" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rates = await getExchangeRates();

      // Convert product price to BYN
      const rateKey = `${currency}_to_BYN`;
      const rate = rates[rateKey] || 1;
      const productCostBYN = price * rate;

      // 30% Service Commission
      const commissionBYN = productCostBYN * 0.30;

      // Estimate weight if not provided
      let finalWeight = parseFloat(weight) || 0;
      let aiEstimated = false;
      let notes = "";

      if (finalWeight <= 0) {
        aiEstimated = true;
        // Ask LLM to quickly estimate weight based on title
        const prompt = `You are a weight estimator assistant for ICE LOGIX.
Analyze the product title: "${title}". Estimate its shipping weight in kg.
Return ONLY a JSON object:
{
  "weight": number,
  "explanation": "string (1-sentence Russian note why this weight was chosen)"
}`;
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: TEXT_MODEL,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.1,
              max_tokens: 150,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const parsed = parseAssistantJson(data?.choices?.[0]?.message?.content || "");
            finalWeight = parseFloat(parsed.weight) || 1.0;
            notes = parsed.explanation || "";
          } else {
            finalWeight = 1.0;
          }
        } catch (_) {
          finalWeight = 1.0;
        }
      }

      // Check additional packaging weight reduction
      const removeBox = !!additional_services?.remove_box;
      let calcWeight = finalWeight;
      if (removeBox) {
        calcWeight = Math.max(0.1, finalWeight - 0.3);
      }

      // Calculate international shipping
      // China = weight * 10 USD. Europe/Poland = weight * 8 USD. Russia = weight * 7 USD.
      let ratePerKgUSD = 10;
      if (country === "EU" || country === "PL") ratePerKgUSD = 8;
      if (country === "RU") ratePerKgUSD = 7;

      const usdToByn = rates["USD_to_BYN"] || 3.27;
      const internationalShippingBYN = calcWeight * ratePerKgUSD * usdToByn;

      // Additional services costs in BYN
      let additionalServicesBYN = 0;
      const servicesList = [];
      if (additional_services?.detailed_photo) {
        additionalServicesBYN += 5;
        servicesList.push("Детальный фотоотчет (5 BYN)");
      }
      if (additional_services?.video_360) {
        additionalServicesBYN += 10;
        servicesList.push("Видеообзор 360° (10 BYN)");
      }
      if (additional_services?.fragile_packaging) {
        additionalServicesBYN += 10; // default fee for fragile
        servicesList.push("Упаковка для хрупкого (10 BYN)");
      }

      // 2% Mandatory Insurance
      const insuranceBYN = productCostBYN * 0.02;

      // Belarus logistics
      let localDeliveryBYN = 0;
      if (local_delivery === "belpost") localDeliveryBYN = 7;
      if (local_delivery === "europost") localDeliveryBYN = 5;
      if (local_delivery === "pickup") localDeliveryBYN = 0;

      // Customs duty (RB Limit: 200 EUR, 15% exceeding + 10 BYN fee)
      const eurToByn = rates["EUR_to_BYN"] || 3.59;
      const costEUR = productCostBYN / eurToByn;
      let customsDutyBYN = 0;
      if (costEUR > 200) {
        customsDutyBYN += (costEUR - 200) * 0.15 * eurToByn + 10;
      }
      if (calcWeight > 31) {
        customsDutyBYN += (calcWeight - 31) * 5;
      }

      // Total BYN
      const totalBYN = productCostBYN + commissionBYN + internationalShippingBYN + additionalServicesBYN + insuranceBYN + localDeliveryBYN + customsDutyBYN;

      return new Response(
        JSON.stringify({
          ok: true,
          rates,
          calc_details: {
            product_cost_byn: Number(productCostBYN.toFixed(2)),
            commission_byn: Number(commissionBYN.toFixed(2)),
            weight_kg: Number(finalWeight.toFixed(2)),
            calc_weight_kg: Number(calcWeight.toFixed(2)),
            ai_estimated: aiEstimated,
            international_shipping_byn: Number(internationalShippingBYN.toFixed(2)),
            insurance_byn: Number(insuranceBYN.toFixed(2)),
            local_delivery_byn: Number(localDeliveryBYN.toFixed(2)),
            additional_services_byn: Number(additionalServicesBYN.toFixed(2)),
            customs_duty_byn: Number(customsDutyBYN.toFixed(2)),
            total_byn: Number(totalBYN.toFixed(2)),
            currency_rateUsed: Number(rate.toFixed(4)),
            notes,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "resolve_address") {
      const { city, street, house, region } = payload;
      const pc = lookupBelarusPostcode(city, street, house);
      const reg = normalizeBelarusRegion(region, city);
      return new Response(
        JSON.stringify({ ok: true, region: reg, postcode: pc }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "parse_passport") {
      const { image } = payload;
      if (!image) {
        return new Response(
          JSON.stringify({ ok: false, error: "Фотография паспорта не предоставлена" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let imageUrl = typeof image === "string" ? image.trim() : "";
      if (!imageUrl.startsWith("data:") && !imageUrl.startsWith("http")) {
        imageUrl = `data:image/jpeg;base64,${imageUrl}`;
      }

      const prompt = `Ты — эксперт по оптическому распознаванию паспортов и ID-карт Республики Беларусь (РБ).
Твоя задача — внимательно изучить предоставленное изображение разворота паспорта РБ (страницы 31-33) или двусторонней ID-карты гражданина Беларуси и извлечь паспортные данные на русском языке.

Белорусский паспорт содержит следующие ключевые поля:
1. Фамилия (русскими буквами, например "ИВАНОВ")
2. Имя (русскими буквами, например "ИВАН")
3. Отчество (русскими буквами, если указано, например "ИВАНОВИЧ")
4. Пол (строго "Мужской" или "Женский")
5. Дата рождения (в формате YYYY-MM-DD, например "2000-05-15")
6. Идентификационный (личный) номер РБ: ровно 14 символов (цифры и заглавные латинские буквы, например "7010204A001PB5", "3051089A012PB4"). Будь предельно точен: латинские A, B, C, E, H, K, M, O, P, T, X и цифры 0, 1, 8.
7. Серия и номер паспорта: 2 заглавные латинские буквы + 7 цифр (например "MP1234567", "AB2345678", "BM3456789", "HB4567890", "KH5678901", "MC6789012", "KB7890123", "PP8901234") либо 9 цифр для биометрической ID-карты.
8. Дата выдачи (в формате YYYY-MM-DD, например "2021-08-10")
9. Кем выдан: орган МВД РБ на русском языке (например "ФРУНЗЕНСКИМ РУВД Г. МИНСКА", "МОСКОВСКИМ РУВД Г. МИНСКА", "БОРИСОВСКИМ РУВД", "ГОМЕЛЬСКИМ РОВД", "МВД").

ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON-ОБЪЕКТ СЛЕДУЮЩЕГО ФОРМАТА (без markdown-блоков, без кавычек \`\`\`json):
{
  "last_name": "Иванов",
  "first_name": "Иван",
  "patronymic": "Иванович",
  "gender": "Мужской",
  "birth_date": "2000-05-15",
  "id_number": "7010204A001PB5",
  "series_number": "MP1234567",
  "issue_date": "2021-08-10",
  "issued_by": "ФРУНЗЕНСКИМ РУВД Г. МИНСКА"
}`;

      const data = await callVisionChatWithFallback(
        [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        3500,
        "ICE LOGIX Passport OCR"
      );

      const choice = data?.choices?.[0]?.message;
      const contentStr = (choice?.content || "").trim();
      const reasoningStr = (choice?.reasoning || "").trim();
      const combined = (contentStr ? contentStr + "\n" : "") + reasoningStr;

      let parsed = parseAssistantJson(contentStr);
      if (!parsed || (!parsed.id_number && !parsed.series_number && !parsed.last_name)) {
        parsed = parseAssistantJson(combined);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          passport_data: parsed,
          raw_output: combined,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "parse_passport_alipay") {
      const { frame1, frame2, frame3, mode } = payload;
      if (!frame2) {
        return new Response(
          JSON.stringify({ ok: false, error: "Отсутствует кадр 2 (страница с MRZ)" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let img1 = typeof frame1 === "string" ? frame1.trim() : "";
      if (img1 && !img1.startsWith("data:") && !img1.startsWith("http")) {
        img1 = `data:image/jpeg;base64,${img1}`;
      }

      let img2 = typeof frame2 === "string" ? frame2.trim() : "";
      if (img2 && !img2.startsWith("data:") && !img2.startsWith("http")) {
        img2 = `data:image/jpeg;base64,${img2}`;
      }

      let img3 = typeof frame3 === "string" ? frame3.trim() : "";
      if (img3 && !img3.startsWith("data:") && !img3.startsWith("http")) {
        img3 = `data:image/jpeg;base64,${img3}`;
      }

      const prompt = `Ты — эксперт по оптическому считыванию и декодированию паспортов и ID-карт Республики Беларусь (стандарт ICAO 9303).
Тебе предоставлены изображения документа одного гражданина Беларуси:
${img1 ? "- Кадр 1: Должен быть разворотом страницы 31 паспорта или лицевой стороной ID (ФИО на русском языке, орган выдачи МВД)." : ""}
- Кадр 2: Должен быть разворотом страницы 33 паспорта или обратной стороной ID (фотография, 14-значный личный номер и в самом низу обязательные две строки машиночитаемой зоны MRZ со знаками <<<).
${img3 ? `- Кадр 3: Разворот со штампом регистрации (прописки) по месту жительства (страницы 25-28 паспорта РБ).
ВНИМАНИЕ К ДЕТАЛЯМ ШТАМПА И РУКОПИСНОМУ ТЕКСТУ РУЧКОЙ:
- Штамп прямоугольный синий или фиолетовый ('ЗАРЭГІСТРАВАНЫ / ЗАРЕГИСТРИРОВАН').
- Записи сделаны от руки шариковой ручкой (на русском или белорусском языке).
- Населенный пункт: может быть город ('г.'), агрогородок ('аг.'), деревня ('д.'), поселок ('пос.'/'п.'), городской поселок ('г.п.'). Если указан район (например 'Несвижский р-н', 'Минский р-н', 'Смолевичский р-н'), обязательно учти его.
- Улица/проспект: может быть проспект ('пр-т'/'просп.'), переулок ('пер.'), бульвар ('бул.'), тракт, шоссе ('ш.'), проезд ('пр-д'), улица ('ул.'). Переводи белорусские сокращения: 'вул.' -> 'ул.', 'зав.' -> 'пер.', 'пр-т' -> 'пр-т'.
- НОМЕР ДОМА (address_house): ОБЯЗАТЕЛЬНО ИЗВЛЕКИ РУКОПИСНЫЕ ЦИФРЫ ДОМА!
  * Цифры дома находятся либо в ячейке после слова «дом» / «д.», либо написаны над чертой, либо вписаны в конце строки улицы (например «ул. Советская 12» -> дом 12, «пр-т Мира 74/3» -> дом 74/3).
  * Если номер дома содержит дробь или букву (например '12', '12А', '14/1', '74/3', '5Б', '18'), обязательно сохрани её!
  * Не оставляй поле дома пустым, если в штампе есть написанные ручкой цифры дома!
- КОРПУС (address_building): цифра после слова «корп.». Если там прочерк '-', слово 'нет' или пусто — верни строго '-'.
- НОМЕР КВАРТИРЫ (address_apartment): ОБЯЗАТЕЛЬНО ИЗВЛЕКИ РУКОПИСНЫЕ ЦИФРЫ КВАРТИРЫ!
  * Цифры квартиры находятся после слова «кв.» / «кватэра» / «пакой» (например '45', '12', '277', '8').
  * Не оставляй поле квартиры пустым, если в графе «кв.» есть рукописные цифры!
  * Только если это частный дом в деревне или в графе «кв.» стоит явный прочерк '-', верни пустую строку "".
- ОБЛАСТЬ (address_region):
  * СТРОГО ОДНО ИЗ 7 ЗНАЧЕНИЙ: 'г. Минск', 'Минская область', 'Брестская область', 'Витебская область', 'Гомельская область', 'Гродненская область', 'Могилевская область'.
  * Запрещено возвращать 'Минский район' — если населенный пункт в Минской области или районе (Несвиж, Колодищи, Хатежино, Борисов и др.) — укажи строго 'Минская область'!
  * Только для столицы Минск (без слова район) укажи 'г. Минск'.
- ПОЧТОВЫЙ ИНДЕКС (address_postcode): верни строго пустую строку "", так как в штампе индекс не пишется — сервер подставит точный индекс Белпочты автоматически по официальной базе.` : ""}

КРИТИЧЕСКИ ВАЖНАЯ ВАЛИДАЦИЯ СТРАНИЦ:
1. Если Кадр 1 не является разворотом страницы 31 с русскими ФИО (например, это посторонний предмет, стол, коврик, одежда или страница 33):
   ВЕРНИ ТОЛЬКО JSON:
   {"ok": false, "error_step": 1, "error": "Кадр 1 не является страницей 31 с русскими ФИО. Пожалуйста, сфотографируйте разворот стр. 31."}

2. Если Кадр 2 не является страницей 33 (нет фото, нет строк MRZ с символами <<<) или является повтором Кадра 1 / ковриком / посторонним предметом:
   ВЕРНИ ТОЛЬКО JSON:
   {"ok": false, "error_step": 2, "error": "Кадр 2 не содержит строки MRZ со знаками <<<. Пожалуйста, переверните паспорт на страницу 33 (с фото и строками <<<)."}

${img3 ? `3. Если Кадр 3 не содержит штампа регистрации/прописки по месту жительства (например, пустая страница, стол или посторонний предмет):
   (Если штампа нет или он поврежден, верни пустые строки в полях адреса, но НЕ выдавай ошибку).` : ""}

Если кадры корректны — извлеки данные в формате строгого JSON:
1. raw_mrz: ровно две строки по 44 символа со знаками < (напр. P<BLR...\\nMP12345678BLR...)
2. last_name: Фамилия (русскими буквами)
3. first_name: Имя (русскими буквами)
4. patronymic: Отчество (русскими буквами, если указано)
5. series_number: Серия и номер паспорта (например MP1234567)
6. birth_date: Дата рождения (YYYY-MM-DD)
7. gender: Пол ("Мужской" или "Женский")
8. id_number: Идентификационный номер РБ (14 символов)
9. issue_date: Дата выдачи документа (YYYY-MM-DD)
10. issued_by: Орган выдачи документа на русском языке (например "ФРУНЗЕНСКИМ РУВД Г. МИНСКА")
${img3 ? `11. address_region: Область РБ (строго одно из: "г. Минск", "Минская область", "Брестская область", "Витебская область", "Гомельская область", "Гродненская область", "Могилевская область")
12. address_city: Населенный пункт на русском языке (например "г. Несвиж", "г. Минск", "аг. Хатежино", "г. Брест")
13. address_street: Улица/проспект/переулок на русском языке (например "ул. Советская", "пр-т Мира", "ул. Ленина")
14. address_house: Номер дома со штампа (число или число с буквой/дробью, например "12", "14Б", "74/3", "5")
15. address_building: Корпус дома (если нет корпуса или прочерк — строго "-", если есть — например "1" или "2")
16. address_apartment: Номер квартиры (если есть — например "45", "12", "277", если частный дом — "")
17. address_postcode: строго пустая строка ""` : ""}

ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON-ОБЪЕКТ СЛЕДУЮЩЕЙ СТРУКТУРЫ (без \`\`\`json markdown):
{
  "ok": true,
  "raw_mrz": "P<BLR...\\nMP...",
  "last_name": "Иванов",
  "first_name": "Иван",
  "patronymic": "Иванович",
  "series_number": "MP1234567",
  "birth_date": "2000-05-15",
  "gender": "Мужской",
  "id_number": "3010195A012PB3",
  "issue_date": "2021-08-10",
  "issued_by": "ФРУНЗЕНСКИМ РУВД Г. МИНСКА"${img3 ? `,
  "address_region": "Минская область",
  "address_city": "г. Несвиж",
  "address_street": "ул. Советская",
  "address_house": "12",
  "address_building": "-",
  "address_apartment": "45",
  "address_postcode": ""` : ""}
}`;

      const contentItems: any[] = [{ type: "text", text: prompt }];
      if (img1) {
        contentItems.push({ type: "image_url", image_url: { url: img1 } });
      }
      contentItems.push({ type: "image_url", image_url: { url: img2 } });
      if (img3) {
        contentItems.push({ type: "image_url", image_url: { url: img3 } });
      }

      const data = await callVisionChatWithFallback(
        [
          {
            role: "user",
            content: contentItems,
          },
        ],
        4000,
        "ICE LOGIX Alipay MRZ Scanner"
      );

      const choice = data?.choices?.[0]?.message;
      const contentStr = (choice?.content || "").trim();
      const reasoningStr = (choice?.reasoning || "").trim();
      const combined = (contentStr ? contentStr + "\n" : "") + reasoningStr;

      let parsed = parseAssistantJson(contentStr);
      if (!parsed || (!parsed.id_number && !parsed.series_number && !parsed.raw_mrz && !parsed.last_name)) {
        parsed = parseAssistantJson(combined);
      }

      if (parsed?.ok === false) {
        return new Response(
          JSON.stringify({
            ok: false,
            error_step: parsed.error_step || 2,
            error: parsed.error || "Не удалось различить реквизиты документа",
            raw_output: combined,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hasRequiredFields = parsed && (parsed.id_number || parsed.series_number || parsed.last_name || parsed.first_name || parsed.raw_mrz);
      if (!hasRequiredFields) {
        return new Response(
          JSON.stringify({
            ok: false,
            error_step: 0,
            error: "Не удалось различить реквизиты документа на фотографии. Пожалуйста, держите документ ровно и избегайте бликов.",
            raw_output: combined,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Очистка идентификационного номера (строго 14 символов стандарта РБ / ICAO 9303: [1-7]\d{6}[A-Z]\d{3}[A-Z]{2}\d)
      let cleanId = "";
      if (parsed.id_number) {
        const mId = String(parsed.id_number).match(/[1-7]\d{6}[A-Z]\d{3}[A-Z]{2}\d/i);
        if (mId) {
          cleanId = mId[0].toUpperCase();
        }
      }
      if (!cleanId && parsed.raw_mrz) {
        const mrzLines = String(parsed.raw_mrz).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const l2 = mrzLines.find(l => l.length >= 42 && /BLR/i.test(l)) || (mrzLines.length > 1 ? mrzLines[1] : "");
        if (l2 && l2.length >= 42) {
          const candidate = l2.slice(28, 42).replace(/</g, "").toUpperCase();
          if (/[1-7]\d{6}[A-Z]\d{3}[A-Z]{2}\d/i.test(candidate)) {
            cleanId = candidate;
          }
        }
      }
      if (cleanId) {
        parsed.id_number = cleanId;
      } else if (parsed.id_number) {
        parsed.id_number = String(parsed.id_number).replace(/[^A-Z0-9]/gi, "").slice(0, 14).toUpperCase();
      }

      // 2. Очистка серии и номера паспорта (2 буквы + 7 цифр = 9 символов) / ID карты (9 цифр)
      if (parsed.series_number) {
        let s = String(parsed.series_number).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        const mSeries = s.match(/([A-Z]{2}\d{7})/i);
        if (mSeries) {
          s = mSeries[1].toUpperCase();
        } else if (/^[A-Z]{2}\d{8}$/i.test(s)) {
          s = s.slice(0, 9);
        }
        parsed.series_number = s;
      }

      // 3. Очистка ФИО (строго русская кириллица, удаление двуязычных слешей, замена белорусских букв)
      const cleanCyrillicName = (val?: any): string => {
        if (!val) return "";
        let s = String(val).trim();
        if (s.includes("/") || s.includes("\\")) {
          const parts = s.split(/[\/\\]/).map(p => p.trim()).filter(Boolean);
          s = parts.find(p => /[А-Яа-яЁё]/.test(p)) || parts[0];
        }
        s = s.replace(/І/g, "И").replace(/і/g, "и").replace(/Ў/g, "У").replace(/ў/g, "у");
        return s.replace(/[^А-Яа-яЁё\s-]/g, "").trim().toUpperCase();
      };

      if (parsed.last_name) parsed.last_name = cleanCyrillicName(parsed.last_name);
      if (parsed.first_name) parsed.first_name = cleanCyrillicName(parsed.first_name);
      if (parsed.patronymic) parsed.patronymic = cleanCyrillicName(parsed.patronymic);

      // 4. Очистка органа выдачи МВД
      if (parsed.issued_by) {
        parsed.issued_by = String(parsed.issued_by)
          .replace(/І/g, "И").replace(/і/g, "и")
          .replace(/^[":']+|[":']+$/g, "")
          .trim().toUpperCase();
      }

      // 5. Интеллектуальное обогащение адреса: автоопределение области, почтового индекса Белпочты и нормализация корпуса
      if (img3 && parsed) {
        try {
          parsed = await enrichBelarusAddress(parsed);
        } catch (enrichErr) {
          console.warn("Address enrichment error:", enrichErr);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          result: parsed,
          engine: "vision-ai",
          raw_output: combined,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    const rawMsg = err.message || "";
    console.error("ai-calculator fatal error:", rawMsg);
    let userMsg = "Не удалось распознать документ на фотографии. Пожалуйста, попробуйте еще раз или заполните поля вручную.";
    if (rawMsg.includes("All vision models failed") || rawMsg.includes("OpenRouter") || rawMsg.includes("credits") || rawMsg.includes("Rate limit")) {
      userMsg = "Сервер распознавания временно исчерпал лимит запросов OpenRouter. Пожалуйста, повторите попытку позже или введите данные вручную.";
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: userMsg,
        technical_details: rawMsg,
        error_step: 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
