const fs = require('fs');
let content = fs.readFileSync('supabase/functions/search-by-image/index.ts', 'utf8');

// 1. Add authenticity_tier parsing after descriptionHint
content = content.replace(
    /const descriptionHint = \(body\.descriptionHint \|\| ""\)\.trim\(\);/,
    const descriptionHint = (body.descriptionHint || "").trim();

  let authenticity_tier: string | null = null;
  const descLower = descriptionHint.toLowerCase();
  if (descLower.includes("копия") || descLower.includes("реплика") || descLower.includes("1:1") || descLower.includes("aaa") || descLower.includes("fake")) {
    authenticity_tier = "replica";
  }
);

// 2. Extract authenticity_tier from callSearchProducts
content = content.replace(
    /const spData = sp as \{ ok\?: boolean; results\?: Array<Record<string, unknown>> \};/,
    const spData = sp as { ok?: boolean; results?: Array<Record<string, unknown>>; authenticity_tier?: string | null };
      if (spData.authenticity_tier) {
        authenticity_tier = spData.authenticity_tier;
      }
);

// 3. Inject authenticity_tier into the first successful return (combined.length >= 2)
content = content.replace(
    /results: combined,/,
    esults: combined,
        authenticity_tier,
);

// 4. Inject authenticity_tier into the fallback return
content = content.replace(
    /vision_query: visionResult\.query,/,
    ision_query: visionResult.query,
      authenticity_tier: authenticity_tier || (searchResp as any)?.authenticity_tier || null,
);

fs.writeFileSync('supabase/functions/search-by-image/index.ts', content, 'utf8');
console.log('Modified search-by-image/index.ts');
