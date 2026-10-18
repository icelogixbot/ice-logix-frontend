import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
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

  const mHouse = s.match(/(?:address_house|Дом|д\.)[^:\n]*:\s*(?:"|'|`)?([0-9]+[А-Яа-яA-Za-z\/-]?)(?:"|'|`|\n|,|\s|$)/i);
  if (mHouse) freeRes.address_house = mHouse[1].trim();

  const mBuilding = s.match(/(?:address_building|Корпус|корп\.)[^:\n]*:\s*(?:"|'|`)?([0-9]+[А-Яа-яA-Za-z]?)(?:"|'|`|\n|,|\s|$)/i);
  if (mBuilding) freeRes.address_building = mBuilding[1].trim();

  const mApartment = s.match(/(?:address_apartment|Квартира|Кватэра|кв\.)[^:\n]*:\s*(?:"|'|`)?([0-9]+)(?:"|'|`|\n|,|\s|$)/i);
  if (mApartment) freeRes.address_apartment = mApartment[1].trim();

  const mPostcode = s.match(/(?:address_postcode|Индекс|Почтовый индекс)[^:\n]*:\s*(?:"|'|`)?([0-9]{6})(?:"|'|`|\n|,|\s|$)/i);
  if (mPostcode) freeRes.address_postcode = mPostcode[1].trim();

  return freeRes;
}

async function callVisionChatWithFallback(messages: any[], maxTokens = 3500, title = "ICE LOGIX Vision"): Promise<any> {
  const models = [
    Deno.env.get("OPENROUTER_VISION_MODEL"),
    "dots-studio/dots-3-note-preview:free",
    "thinkingmachines/inkling:free",
    "thinkingmachines/inkling-small:free",
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

  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
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
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.error) {
          console.warn(`OpenRouter returned body error for ${model}:`, json.error);
          lastError = new Error(`OpenRouter (${model}): ${json.error?.message || JSON.stringify(json.error)}`);
          continue;
        }
        const msgContent = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.message?.reasoning;
        if (msgContent) {
          return json;
        }
        console.warn(`OpenRouter returned empty choices for ${model}:`, json);
        lastError = new Error(`Empty content returned by ${model}`);
        continue;
      }

      const errTxt = await res.text().catch(() => "");
      lastError = new Error(`OpenRouter HTTP ${res.status} (${model}): ${errTxt}`);
      console.warn(`Vision model ${model} failed (${res.status}): ${errTxt}. Retrying with next fallback...`);
    } catch (e) {
      lastError = e;
      console.warn(`Exception invoking ${model}:`, e);
    }
  }

  throw lastError || new Error("All vision models failed");
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
${img3 ? "- Кадр 3: Разворот со штампом регистрации (прописки) по месту жительства (страницы 25-28 паспорта РБ). Внимание: штамп прямоугольный синий/фиолетовый ('ЗАРЭГІСТРАВАНЫ / ЗАРЕГИСТРИРОВАН'), а адресные реквизиты в нем обычно написаны от руки синей/черной шариковой ручкой (на русском или белорусском языке: 'г. Мінск' / 'г. Минск', 'вул. Прытыцкага' / 'ул. Притыцкого', дом, корпус, квартира)." : ""}

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
12. address_city: Город или населенный пункт на русском языке (например "г. Минск", "г. Брест", "г. Борисов")
13. address_street: Улица/проспект/переулок на русском языке (например "ул. Притыцкого", "пр-т Независимости", переведи с белорусского 'вул.' -> 'ул.')
14. address_house: Номер дома (например "28", "12А")
15. address_building: Корпус дома (например "1" или "")
16. address_apartment: Номер квартиры (например "114" или "")
17. address_postcode: Почтовый индекс (6 цифр, если виден/известен, например "220073" или "")` : ""}

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
  "address_region": "г. Минск",
  "address_city": "г. Минск",
  "address_street": "ул. Притыцкого",
  "address_house": "28",
  "address_building": "1",
  "address_apartment": "114",
  "address_postcode": "220073"` : ""}
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

      return new Response(
        JSON.stringify({
          ok: true,
          result: parsed,
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
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
