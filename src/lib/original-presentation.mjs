// The user-supplied source remains untouched; controlled additions are made to a sandboxed copy.
export const originalProductImages = {
  "S Factor": "s-factor.jpg",
  "S Xtra Caffe": "s-xtra-caffe.jpg",
  SHYDRO: "s-hydro.jpg",
  "3S Capsule": "3s-capsule.png",
  "B’tox Cream": "b-cream.jpg",
  "HTL بخاخ": "hydrating-toning-lotion.jpg",
  "Bio White": "bio-white-cream.jpg",
  "Sun Protector": "sun-protector.jpg",
  "S Fem Serum": "s-fem-serum.jpg",
  "Gentle Cleansing": "gentle-cleansing-cream.jpg",
  "Revitalizing Foundation": "revitalizing-foundation.jpg",
};
function replaceOnce(source, before, after) {
  const start = source.indexOf(before);
  if (start < 0 || source.indexOf(before, start + before.length) >= 0)
    throw new Error("La structure du document fourni ne correspond pas à la version attendue.");
  return source.slice(0, start) + after + source.slice(start + before.length);
}
export function buildOriginalPresentation(source, origin, cairo, reem) {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin)
    throw new Error("Origine invalide.");
  if (!cairo.startsWith("data:") || !reem.startsWith("data:"))
    throw new Error("Police locale indisponible.");
  const images = Object.fromEntries(
    Object.entries(originalProductImages).map(([name, file]) => [
      name,
      `${origin}/products/${file}`,
    ]),
  );
  let result = replaceOnce(
    source,
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src ${origin} data:; connect-src 'none'; form-action 'none'; base-uri 'none'">`,
  );
  result = replaceOnce(
    result,
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&family=Reem+Kufi:wght@600;700&display=swap" rel="stylesheet">',
    `<style>@font-face{font-family:Cairo;src:url('${cairo}') format('truetype');font-style:normal;font-weight:400 800;font-display:swap}@font-face{font-family:'Reem Kufi';src:url('${reem}') format('truetype');font-style:normal;font-weight:600 700;font-display:swap}</style>`,
  );
  result = replaceOnce(
    result,
    "</style></head><body>",
    `.rmm-source-notice{position:fixed;z-index:20;top:0;inset-inline:0;padding:6px 12px;background:#54350c;color:#fff;font:600 13px/1.4 Cairo,Tahoma,sans-serif;text-align:center;pointer-events:none}.slide{top:45px}.rmm-product-image{width:100%;height:145px;object-fit:contain;background:#f7f4ed;border-radius:8px;margin-bottom:8px}.rmm-detail-image{width:100%;height:190px;object-fit:contain;background:#f7f4ed;border-radius:10px;margin:10px 0}.rmm-detail-notice{font-size:.8em;color:var(--coral);margin-bottom:8px}@media(max-width:600px){.rmm-source-notice{font-size:11px}.slide{top:58px}}</style></head><body><div class="rmm-source-notice" role="note">نصّ المصدر الأصلي للمراجعة فقط: معلومات وأرقام وادعاءات غير متحقّق منها، ليست حقائق أو وعوداً معتمدة، ولا يجوز نشرها أو استخدامها تجارياً.</div>`,
  );
  result = replaceOnce(
    result,
    "// slide 5\nconst P=",
    `// slide 5\nconst RMM_PRODUCT_IMAGES=${JSON.stringify(images)};\nconst P=`,
  );
  result = replaceOnce(
    result,
    "+j*.07+'s\"><h3>'+p[0]",
    '+j*.07+\'s"><img class="rmm-product-image" src="\'+RMM_PRODUCT_IMAGES[p[0]]+\'" alt="صورة \'+p[0]+\'"><h3>\'+p[0]',
  );
  result = replaceOnce(
    result,
    "innerHTML='<h3>'+n+'</h3>",
    'innerHTML=\'<p class="rmm-detail-notice">نص المصدر غير معتمد؛ يلزم التحقق من المكونات والادعاءات قبل أي استعمال.</p><h3>\'+n+\'</h3><img class="rmm-detail-image" src="\'+RMM_PRODUCT_IMAGES[n]+\'" alt="صورة \'+n+\'">',
  );
  return result;
}
