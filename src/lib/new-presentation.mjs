// Preserve the supplied file; add isolation and a review notice only to the displayed copy.
function replaceOnce(source, before, after) {
  const start = source.indexOf(before);
  if (start < 0 || source.indexOf(before, start + before.length) >= 0)
    throw new Error("La structure de la présentation ne correspond pas au fichier attendu.");
  return source.slice(0, start) + after + source.slice(start + before.length);
}
export function buildNewPresentation(source, cairo, reem) {
  if (!cairo.startsWith("data:") || !reem.startsWith("data:"))
    throw new Error("Police locale indisponible.");
  let result = source.replace(/\r\n?/g, "\n");
  result = replaceOnce(
    result,
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">`,
  );
  result = replaceOnce(
    result,
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&family=Reem+Kufi:wght@600;700&display=swap" rel="stylesheet">',
    `<style>@font-face{font-family:Cairo;src:url('${cairo}') format('truetype');font-style:normal;font-weight:400 800;font-display:swap}@font-face{font-family:'Reem Kufi';src:url('${reem}') format('truetype');font-style:normal;font-weight:600 700;font-display:swap}</style>`,
  );
  result = replaceOnce(
    result,
    "</style></head><body>",
    `.rmm-source-notice{position:fixed;z-index:100;top:0;inset-inline:0;padding:6px 12px;background:#54350c;color:#fff;font:600 13px/1.4 Cairo,Tahoma,sans-serif;text-align:center;pointer-events:none}.slide{top:45px}#ov{top:45px}@media(max-width:600px){.rmm-source-notice{font-size:11px}.slide{top:58px}#ov{top:58px}}</style></head><body><div class="rmm-source-notice" role="note">نصّ المصدر الأصلي للمراجعة فقط: معلومات وأرقام وادعاءات غير متحقّق منها، ليست حقائق أو وعوداً معتمدة، ولا يجوز نشرها أو استخدامها تجارياً.</div>`,
  );
  return result;
}
