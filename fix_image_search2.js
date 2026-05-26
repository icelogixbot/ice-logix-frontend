const fs = require('fs');
let content = fs.readFileSync('supabase/functions/search-by-image/index.ts', 'utf8');

content = content.replace(
    /const descriptionHint = \(body\.descriptionHint \|\| ""\)\.trim\(\);/,
    "const descriptionHint = (body.descriptionHint || '').trim();\n\n" +
    "  let authenticity_tier: string | null = null;\n" +
    "  const descLower = descriptionHint.toLowerCase();\n" +
    "  if (descLower.includes('копия') || descLower.includes('реплика') || descLower.includes('1:1') || descLower.includes('aaa') || descLower.includes('fake')) {\n" +
    "    authenticity_tier = 'replica';\n" +
    "  }"
);

content = content.replace(
    /const spData = sp as \{ ok\?: boolean; results\?: Array<Record<string, unknown>> \};/,
    "const spData = sp as { ok?: boolean; results?: Array<Record<string, unknown>>; authenticity_tier?: string | null };\n" +
    "      if (spData.authenticity_tier) {\n" +
    "        authenticity_tier = spData.authenticity_tier;\n" +
    "      }"
);

content = content.replace(
    /results: combined,/,
    "results: combined,\n        authenticity_tier,"
);

content = content.replace(
    /vision_query: visionResult\.query,/,
    "vision_query: visionResult.query,\n      authenticity_tier: authenticity_tier || (searchResp as any)?.authenticity_tier || null,"
);

fs.writeFileSync('supabase/functions/search-by-image/index.ts', content, 'utf8');
console.log('Modified search-by-image/index.ts');
