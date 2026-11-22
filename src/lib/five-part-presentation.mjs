// Never alter the uploaded source files; hardening and navigation are applied only to the iframe copy.
function replaceOnce(source, before, after) {
  const start = source.indexOf(before);
  if (start < 0 || source.indexOf(before, start + before.length) >= 0)
    throw new Error("La structure de la présentation ne correspond pas au fichier attendu.");
  return source.slice(0, start) + after + source.slice(start + before.length);
}
export function buildPartPresentation(source, part, cairo, reem) {
  if (!Number.isInteger(part) || part < 1 || part > 5) throw new Error("Partie invalide.");
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
  // Part 3 contains a Cloudflare challenge injector unrelated to the presentation; never run it.
  if (part === 3) {
    const cloudflare = result.match(
      /<script>\(function\(\)\{function c\(\)\{var b=a\.contentDocument[\s\S]*?<\/script>/g,
    );
    if (
      !cloudflare ||
      cloudflare.length !== 1 ||
      !cloudflare[0].includes("/cdn-cgi/challenge-platform/")
    )
      throw new Error("Script externe inattendu.");
    result = replaceOnce(result, cloudflare[0], "");
  }
  result = replaceOnce(
    result,
    "</style></head><body>",
    `.rmm-source-notice{position:fixed;z-index:1000;top:0;inset-inline:0;padding:6px 12px;background:#54350c;color:#fff;font:600 13px/1.4 Cairo,Tahoma,sans-serif;text-align:center;pointer-events:none}.slide{top:var(--rmm-notice-height,48px)}#ov,#lov{top:var(--rmm-notice-height,48px)}#ov #pn{max-height:calc(100dvh - var(--rmm-notice-height,48px) - 32px)}*{scrollbar-width:none}*::-webkit-scrollbar{display:none}.rmm-next{margin-top:16px;align-self:flex-start}@media(max-width:600px){.rmm-source-notice{font-size:11px}#nav{gap:5px}#dots{gap:4px;max-width:calc(100vw - 106px);flex-wrap:wrap;justify-content:center}}</style></head><body><div class="rmm-source-notice" role="note">نصّ المصدر للمراجعة فقط: المعلومات والأرقام والادعاءات غير متحقّق منها، وليست حقائق أو وعوداً معتمدة، ولا يجوز نشرها أو استخدامها تجارياً.</div>`,
  );
  const bridge = `<script>(function(){const notice=document.querySelector('.rmm-source-notice');function measure(){document.documentElement.style.setProperty('--rmm-notice-height',notice.offsetHeight+'px')}measure();addEventListener('resize',measure);if(document.fonts)document.fonts.ready.then(measure);document.querySelectorAll('.slide').forEach(s=>s.setAttribute('tabindex','0'));${part < 5 ? `const last=document.querySelector('.slide:last-of-type .in');if(last){const b=document.createElement('button');b.className='cta rmm-next';b.type='button';b.textContent='الانتقال إلى الجزء ${part + 1} ◂';b.addEventListener('click',()=>parent.postMessage({type:'rmm-next-part',part:${part}},'*'));last.appendChild(b)}` : ""}})();</script>`;
  return replaceOnce(result, "</body></html>", `${bridge}</body></html>`);
}
