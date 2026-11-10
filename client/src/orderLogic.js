export const DEFAULT_CATALOGUE = [
  { name: "Atta", terms: ["atta", "aata", "flour", "आटा"], unit: "kg", price: 52, variants: [["Local chakki", 52], ["Aashirvaad · 1 kg pack", 58], ["Aashirvaad · 5 kg bag", 55], ["Fortune · 5 kg bag", 54]] },
  { name: "Milk", terms: ["milk", "doodh", "dudh", "दूध"], unit: "litre", price: 30 },
  { name: "Amul butter", terms: ["amul butter", "butter", "मक्खन"], unit: "pack", price: 56 },
  { name: "Rice", terms: ["rice", "chawal", "chaval", "चावल"], unit: "kg", price: 64, variants: [["Regular rice", 64], ["India Gate basmati · 1 kg", 120], ["India Gate basmati · 5 kg", 108], ["Daawat basmati · 5 kg", 110]] },
  { name: "Sugar", terms: ["sugar", "chini", "cheeni", "shakkar", "चीनी", "शक्कर"], unit: "kg", price: 46 },
  { name: "Eggs", terms: ["eggs", "egg", "ande", "anda", "अंडे"], unit: "piece", price: 7 },
  { name: "Tea", terms: ["tea", "chai", "chay", "चाय"], unit: "pack", price: 120 },
  { name: "Maggi", terms: ["maggi", "noodles"], unit: "pack", price: 15 },
  { name: "Cooking oil", terms: ["cooking oil", "oil", "tel", "तेल"], unit: "litre", price: 145 },
  { name: "Dal", terms: ["dal", "daal", "दाल"], unit: "kg", price: 110 },
  { name: "Aloo paratha", terms: ["aloo paratha", "aloo parantha", "alu paratha", "आलू पराठा", "आलू परांठा"], unit: "pack", price: 60 },
  { name: "Salt", terms: ["tata namak", "tata salt", "salt", "namak", "नमक"], unit: "kg", price: 28, variants: [["Loose salt", 28], ["Tata Salt · 1 kg pack", 30], ["Tata Salt · 500 g pack", 32], ["Aashirvaad Salt · 1 kg pack", 32]] },
  { name: "Curd", terms: ["curd", "dahi", "दही"], unit: "pack", price: 35 },
  { name: "Parle-G", terms: ["parle-g", "parle g", "parleg"], unit: "pack", price: 10 },
  { name: "Britannia biscuits", terms: ["britannia", "britannia biscuit", "good day"], unit: "pack", price: 12 },
  { name: "Top Ramen", terms: ["top ramen", "topramen"], unit: "pack", price: 20 },
  { name: "Pickle", terms: ["pickle", "achar", "achaar", "अचार"], unit: "pack", price: 35 }
];

const numberWords = { one: 1, a: 1, an: 1, ek: 1, एक: 1, two: 2, do: 2, दो: 2, three: 3, teen: 3, तीन: 3, four: 4, char: 4, चार: 4, five: 5, paanch: 5, पांच: 5, छह: 6, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12, darjan: 12, dedh: 1.5, dhai: 2.5, paav: 0.25 };
const stops = new Set("bhaiya bhai ji ke mein khata khate likh udhaar udhar credit sharma asha ravi kal aaj delivery deliver to home house flat floor no number near address street road gali lane colony sector landmark slot around at kar dena dene de do bhej bhejna bhejdo bhejo please plz upi cash dunga doon karunga karo karna bhi toh and aur plus send order the this some thoda thodi little quantity one a an ek एक two दो three teen तीन four चार five paanch पांच six छह seven eight nine ten rupaye rupaya rupees rs discount off kam kar do customer shopkeeper suno rate kya hai how much price hai available okay not isn't is Britannia".split(" "));

const digitize = (text) => text.replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d)));
const norm = (text) => digitize(String(text || "").toLowerCase()).replace(/[.,;:!?।]/g, " ").replace(/\s+/g, " ").trim();

function parseQuantity(context, defaultUnit) {
  const text = norm(context);
  if (/\b(?:some|thoda|thodi|kuch|little|few|several)\b/.test(text)) return { quantity: null, unit: defaultUnit, explicit: false };
  const q = "(\\d+(?:[.,]\\d+)?|one|a|an|ek|two|do|three|teen|four|char|five|paanch|six|seven|eight|nine|ten|dozen|darjan|dedh|dhai|paav|एक|दो|तीन|चार|पांच|छह)";
  const u = "(kg|kgs|kilo|kilos|kilogram|g|gram|grams|litre|liter|ltr|l|pack|packet|packets|piece|pieces|pc|pcs)?";
  const matches = [...text.matchAll(new RegExp("(?:^|\\s)" + q + "\\s*" + u + "(?=\\s|$)", "gi"))];
  const m = matches[matches.length - 1];
  if (!m) return { quantity: null, unit: defaultUnit, explicit: false };
  const raw = m[1];
  let quantity = Number(raw.replace(",", ".")) || numberWords[raw] || 1;
  const suffix = (m[2] || "").toLowerCase();
  let unit = defaultUnit;
  if (/^(?:kg|kgs|kilo|kilos|kilogram)$/.test(suffix)) unit = "kg";
  else if (/^(?:g|gram|grams)$/.test(suffix)) { unit = "kg"; quantity /= 1000; }
  else if (/^(?:litre|liter|ltr|l)$/.test(suffix)) unit = "litre";
  else if (/^(?:pack|packet|packets)$/.test(suffix)) unit = "pack";
  else if (/^(?:piece|pieces|pc|pcs)$/.test(suffix)) unit = "piece";
  return { quantity, unit, explicit: true };
}

function clauseAt(text, position) {
  const sep = /(?:,|;|\band\b|\baur\b|\bplus\b)/ig;
  let start = 0, end = text.length, m;
  while ((m = sep.exec(text))) {
    if (m.index < position) start = m.index + m[0].length;
    else { end = m.index; break; }
  }
  return { start, end };
}

function spokenDiscount(text) {
  const m = text.match(/(?:₹\s*)?(\d{1,4}|das|dus|bees|bis|pachaas|pachas|sau|दस|बीस|पचास|सौ)\s*(?:rupees?|rupaye|rupaya|rs\.?|रुपये|रुपए)\s*(?:kam|off|discount|less|कम|छूट)(?:\s*(?:kar\s*)?(?:do|dijiye|कर\s*दो))?/i)
    || text.match(/(?:discount|छूट)\s*(?:of\s*)?(?:₹\s*)?(\d{1,4})/i);
  if (!m) return { amount: 0, phrase: "" };
  const words = { das: 10, dus: 10, bees: 20, bis: 20, pachaas: 50, pachas: 50, sau: 100, दस: 10, बीस: 20, पचास: 50, सौ: 100 };
  return { amount: Number(m[1]) || words[m[1].toLowerCase()] || 0, phrase: m[0] };
}

export function parseOrder(rawText, { catalogue = DEFAULT_CATALOGUE, aliases = {}, outOfStock = {}, substitutions = {}, variants = {} } = {}) {
  const raw = String(rawText || "");
  const discount = spokenDiscount(raw);
  const cleanedRaw = discount.phrase ? raw.replace(discount.phrase, " ") : raw;
  let text = cleanedRaw;
  const speakerLines = cleanedRaw.split(/\n+/);
  if (speakerLines.some((line) => /^(?:customer|shopkeeper|ग्राहक|दुकानदार)\s*:/i.test(line.trim()))) {
    text = speakerLines.filter((line) => /^(?:customer|ग्राहक)\s*:/i.test(line.trim())).map((line) => line.replace(/^(?:customer|ग्राहक)\s*:/i, "")).join(", ");
  }
  text = norm(text);
  text = text.replace(/(?:deliver(?:y)?\s+to|address\s+is|ghar\s+pe)\s+([^,.;]+)/ig, " ")
    .replace(/\b(?:today|tomorrow|kal|aaj)\s*(?:at|around)?\s*\d{0,2}(?::\d{2})?\s*(?:am|pm|baje)?\b/ig, " ");
  const substitution = {};
  const intent = /(?:not available|isn't available|is not available|khatam|out of stock|nahi hai|नहीं है|खत्म)/i.test(raw);
  if (intent && /parle\s*-?g/i.test(raw) && /britannia/i.test(raw)) substitution["Parle-G"] = "Britannia biscuits";
  if (intent && /maggi/i.test(raw) && /top\s*ramen/i.test(raw)) substitution.Maggi = "Top Ramen";
  if (substitution["Parle-G"]) text = text.replace(/britannia(?:\s+biscuit)?(?:\s+(?:okay|ok|theek|chalega))?/ig, " ").replace(/(?:not available|isn't available|is not available|khatam|out of stock|nahi hai|नहीं है|खत्म|okay|ok|theek|chalega)/ig, " ");
  if (substitution.Maggi) text = text.replace(/top\s*ramen(?:\s+(?:okay|ok|theek|chalega))?/ig, " ").replace(/(?:not available|isn't available|is not available|khatam|out of stock|nahi hai|नहीं है|खत्म|okay|ok|theek|chalega)/ig, " ");

  const items = [];
  const knownTerms = [];
  for (const product of catalogue) {
    const terms = [...product.terms, ...Object.entries(aliases).filter(([, target]) => target === product.name).map(([phrase]) => phrase)];
    knownTerms.push(...terms.map(norm));
    const mentions = [];
    for (const term of terms) {
      const needle = norm(term); if (!needle) continue;
      let from = 0;
      while (from < text.length) {
        const at = text.indexOf(needle, from); if (at < 0) break;
        mentions.push({ at, term: needle }); from = at + needle.length;
      }
    }
    mentions.sort((a, b) => a.at - b.at || b.term.length - a.term.length);
    const unique = mentions.filter((m, i) => !mentions.slice(0, i).some((p) => m.at < p.at + p.term.length && p.at < m.at + m.term.length));
    if (!unique.length) continue;
    const found = unique[0], bounds = clauseAt(text, found.at);
    const before = text.slice(Math.max(bounds.start, found.at - 45), found.at);
    const after = text.slice(found.at + found.term.length, Math.min(bounds.end, found.at + found.term.length + 28));
    let qty = parseQuantity(before, product.unit);
    if (!qty.explicit && /^\s*(?:\d+|one|a|an|ek|एक|two|do|दो|three|teen|तीन|four|char|चार|five|paanch|पांच|six|seven|eight|nine|ten)\b/i.test(after)) qty = parseQuantity(after, product.unit);
    const issues = [];
    if (!qty.explicit) issues.push("Quantity unclear");
    if (qty.explicit && qty.unit !== product.unit) issues.push("Unit may not match");
    if (qty.quantity !== null && qty.quantity > 100) issues.push("Quantity looks unusually high");
    if (unique.length > 1) issues.push("Repeated mention — combine quantities");
    const source = product.name;
    const suggested = substitution[source] || "";
    const targetName = substitutions[source] || "";
    const target = targetName ? catalogue.find((p) => p.name === targetName) : product;
    const unavailable = Boolean(outOfStock[source] || suggested);
    if (unavailable && !targetName) issues.push(source + " is unavailable — choose a substitute");
    if (target && target.unit !== product.unit && qty.explicit) issues.push("Substitute uses a different unit");
    const variant = variants[source] || (source === "Salt" && /\btata\b/i.test(raw) ? "Tata Salt · 1 kg pack" : source === "Atta" && /\baashirvaad\b/i.test(raw) ? "Aashirvaad · 1 kg pack" : source === "Rice" && /\bindia\s*gate\b/i.test(raw) ? "India Gate basmati · 1 kg" : "");
    const variantRecord = product.variants?.find(([label]) => label === variant);
    const price = target ? (targetName ? target.price : variantRecord?.[1] ?? product.price) : product.price;
    const name = targetName ? targetName + " (instead of " + source + ")" : variant ? source + " · " + variant.split(" · ")[0] : product.name;
    items.push({ name, sourceName: source, catalogueName: targetName || source, quantity: qty.quantity, unit: qty.unit, unitPrice: price, total: issues.length ? null : qty.quantity * price, needsReview: issues.length > 0, issue: issues.join(" · "), position: found.at, stockIssue: unavailable && !targetName, suggestedSubstitute: suggested, variantLabel: variant });
  }
  const chunks = text.split(/(?:,|;|\band\b|\baur\b|\bplus\b)/i);
  const seen = new Set();
  for (const chunk of chunks) {
    if (knownTerms.some((term) => term && chunk.includes(term))) continue;
    const words = chunk.replace(/\d+(?:[.,]\d+)?/g, " ").split(/\s+/).map((w) => w.replace(/[.,;:!?।]/g, "")).filter((w) => w && !stops.has(w) && !/^(kg|kgs|kilo|litre|liter|ltr|gram|grams|pack|packet|piece|pieces|pcs)$/i.test(w));
    const phrase = words.join(" ").trim(); if (!phrase || seen.has(phrase)) continue; seen.add(phrase);
    const q = parseQuantity(chunk, "pack");
    items.push({ name: "Unmatched: " + phrase, catalogueName: "", quantity: q.quantity, unit: q.unit, unitPrice: null, total: null, needsReview: true, issue: "Not in the demo catalogue", position: text.indexOf(chunk), stockIssue: false });
  }
  return { items: items.sort((a, b) => a.position - b.position), discount: discount.amount };
}

export function findPriceQuestion(text, catalogue = DEFAULT_CATALOGUE) {
  if (!/(?:rate|price|kitne\s*(?:ka|ki)|bhav|daam|how\s+much|cost|कितने|दाम|भाव)/i.test(text)) return null;
  return catalogue.find((product) => product.terms.some((term) => norm(text).includes(norm(term)))) || null;
}

export function findRestockItem(text, catalogue = DEFAULT_CATALOGUE) {
  if (!/(?:khatam|finished|out of stock|no stock|stock over|खत्म)/i.test(text)) return null;
  if (/(?:parle\s*-?g.*britannia|maggi.*top\s*ramen)/i.test(text) && /(?:not available|isn't available|khatam|out of stock|nahi hai|खत्म)/i.test(text)) return null;
  return catalogue.find((product) => product.terms.some((term) => norm(text).includes(norm(term)))) || null;
}

export function inferCustomer(text) {
  if (/sharma|शर्मा/i.test(text)) return "sharma";
  if (/asha|आशा/i.test(text)) return "asha";
  if (/ravi|रवि/i.test(text)) return "ravi";
  return "walkin";
}
