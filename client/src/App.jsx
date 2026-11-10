import React, { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CATALOGUE, findPriceQuestion, findRestockItem, inferCustomer, parseOrder } from "./orderLogic.js";

const ACCOUNTS = [
  { id: "sharma", name: "Sharma ji (demo)" },
  { id: "asha", name: "Asha ben (demo)" },
  { id: "ravi", name: "Ravi bhai (demo)" },
  { id: "walkin", name: "Walk-in (demo)" }
];
const DEMO_KEYS = { ledger: "dukaan-suno-demo-khata-v1", aliases: "dukaan-suno-aliases-v1", aliasDates: "dukaan-suno-alias-dates-v1", demand: "dukaan-suno-demand-log-v1", stock: "dukaan-suno-stock-v1", queue: "dukaan-suno-order-queue-v1", restock: "dukaan-suno-restock-v1", custom: "dukaan-suno-custom-v1", prices: "dukaan-suno-price-overrides-v1", history: "dukaan-suno-history-v1", vpa: "dukaan-suno-vpa-v1" };
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch { return fallback; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing may block local storage. */ } };
const freshLedger = () => ({ accounts: Object.fromEntries(ACCOUNTS.map((person) => [person.id, { balance: 0, entries: [] }])) });
const getCatalogue = () => {
  const overrides = readLocal(DEMO_KEYS.prices, {});
  const custom = readLocal(DEMO_KEYS.custom, []);
  const list = DEFAULT_CATALOGUE.map((product) => ({ ...product, terms: [...product.terms] }));
  for (const item of custom) if (!list.some((product) => product.name.toLowerCase() === item.name.toLowerCase())) list.push(item);
  return list.map((product) => ({ ...product, price: Number(overrides[product.name]) || product.price }));
};

function FadeText({ value, className = "" }) {
  const nextText = String(value ?? "");
  const [shownText, setShownText] = useState(nextText);
  const [phase, setPhase] = useState("in");
  const shownRef = useRef(nextText);

  useEffect(() => {
    if (shownRef.current === nextText) return undefined;
    setPhase("out");
    const timer = window.setTimeout(() => {
      shownRef.current = nextText;
      setShownText(nextText);
      setPhase("in");
    }, 150);
    return () => window.clearTimeout(timer);
  }, [nextText]);

  return <span className={`fade-copy fade-${phase} ${className}`.trim()}>{shownText}</span>;
}

function Icon({ name, size = 18 }) {
  const paths = {
    sound: <><path d="M4 10v4h4l5 4V6l-5 4H4z"/><path d="M17 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    bag: <><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.sound}</svg>;
}

function TopBar({ apiReady, page, setPage }) {
  const links = [["Overview", "overview", "◫"], ["Voice orders", "orders", "◉"], ["Khata ledger", "khata", "₹"], ["Catalogue & insights", "catalogue", "▦"]];
  return <aside className="sidebar">
    <a className="brand" href="#overview" onClick={() => setPage("overview")}><span className="brand-mark">द</span><span><b>Dukaan Suno</b><small>VOICE-FIRST KIRANA COUNTER</small></span></a>
    <div className="side-label">WORKSPACE</div>
    <nav className="side-nav">{links.map(([label, id, icon]) => <button key={id} className={page === id ? "side-link active" : "side-link"} onClick={() => { setPage(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span className="side-icon">{icon}</span>{label}</button>)}</nav>
    <div className="sidebar-bottom"><div className="status-tile"><span className={apiReady ? "status-dot ready" : "status-dot"}/><div><b><FadeText value={apiReady ? "Gnani connected" : "Gnani not connected"}/></b><small><FadeText value={apiReady ? "Prisma · Timbre ready" : "Add your key with start.ps1"}/></small></div></div><div className="profile"><span className="avatar">SS</span><span><b>Shop demo</b><small>Local workspace</small></span><span className="chevron">⌄</span></div></div>
  </aside>;
}

function Metric({ label, value, note, tone = "" }) {
  return <div className="metric"><div className="metric-top"><span>{label}</span><span className={"metric-icon " + tone}>{tone === "mint" ? "↗" : tone === "peach" ? "₹" : tone === "violet" ? "✦" : "◷"}</span></div><strong><FadeText value={value}/></strong><small><FadeText value={note}/></small></div>;
}

function OrderItem({ item, catalogue, onAlias, onSubstitute, outOfStock, selectedVariant, onVariant }) {
  const [target, setTarget] = useState("");
  const product = catalogue.find((row) => row.name === (item.sourceName || item.catalogueName || item.name));
  return <div className={"order-item " + (item.needsReview ? "needs-review" : "")}>
    <div className="item-symbol">{item.name.startsWith("Unmatched") ? "?" : "▣"}</div>
    <div className="item-copy"><b><FadeText value={item.name}/></b><span className={item.needsReview ? "item-issue" : ""}><FadeText value={item.needsReview ? item.issue : `${item.quantity} ${item.unit} × ${money(item.unitPrice)}`}/></span>
      {item.name.startsWith("Unmatched:") && <div className="inline-tools"><select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Match to catalogue…</option>{catalogue.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</select><button onClick={() => onAlias(item.name.slice(11), target)}>Learn phrase</button></div>}
      {item.stockIssue && <div className="inline-tools"><span>Suggested:</span><button onClick={() => onSubstitute(item.sourceName, item.suggestedSubstitute || (item.sourceName === "Maggi" ? "Top Ramen" : "Britannia biscuits"))}>{item.suggestedSubstitute || (item.sourceName === "Maggi" ? "Top Ramen" : "Britannia biscuits")}</button></div>}
      {!item.needsReview && product?.variants?.length > 1 && <select className="variant-select" value={selectedVariant || item.variantLabel || ""} onChange={(e) => onVariant(item.sourceName || product.name, e.target.value)}><option value="">Choose brand / pack</option>{product.variants.map(([label]) => <option key={label} value={label}>{label}</option>)}</select>}
    </div><strong className="item-total"><FadeText value={item.needsReview ? "Check" : money(item.total)}/></strong>
  </div>;
}

function RecorderCard({ transcript, setTranscript, source, setSource, busy, recording, recordSeconds, onRecord, onUpload, onBuild, onSample, language, status, fileRef }) {
  return <section className="surface recorder-card" id="orders">
    <div className="section-title"><div><span className="kicker">STEP 01 · CAPTURE</span><h2>Hear the customer</h2></div><span className={recording ? "record-live" : "record-idle"}><i/>{recording ? "Listening" : "Ready"}</span></div>
    <div className={recording ? "record-stage recording" : "record-stage"}>
      <div className="sound-orbit orbit-one"/><div className="sound-orbit orbit-two"/>
      <button className="record-button" onClick={onRecord} disabled={busy} aria-label={recording ? "Stop recording" : "Start recording"}><Icon name="mic" size={26}/></button>
      <h3><FadeText value={recording ? "Listening… tap to finish" : "Tap to record an order"}/></h3>
      <p><FadeText value={recording ? `Recording · 00:${String(recordSeconds).padStart(2, "0")} / 00:20` : "Hindi, Hinglish and everyday product names are welcome."}/></p>
      <span className="audio-caption"><span className="wave-bars"><i/><i/><i/><i/><i/></span> Audio is processed for this order and not stored here</span>
    </div>
    <div className="record-actions"><label className="btn btn-light" htmlFor="voice-file">↑ &nbsp; Upload voice note</label><input ref={fileRef} id="voice-file" type="file" accept="audio/*" onChange={onUpload} hidden/><button className="btn btn-light" onClick={() => onSample("khata")}>Try a sample</button><button className="btn btn-dark" onClick={onBuild} disabled={!transcript.trim() || busy}>Build order <Icon name="arrow" size={15}/></button></div>
    <div className="transcript-editor"><div className="editor-head"><label htmlFor="transcript">TRANSCRIPT <span>EDITABLE</span></label><small><FadeText value={source === "live" ? "Live · Gnani Prisma v3" : source === "sample" ? "Illustrative sample · no API call" : "Correct anything you heard"}/></small></div><textarea id="transcript" value={transcript} onChange={(e) => { setTranscript(e.target.value); setSource(source === "sample" ? "sample" : "edited"); }} placeholder="Your transcript will appear here. You can correct item names and quantities before building the order." spellCheck="false"/><div className="editor-foot"><span><FadeText value={language ? `Detected language · ${language}` : "Prisma v3 · Indic language auto-detection"}/></span><span><FadeText value={`${transcript.length} characters`}/></span></div></div>
    <div className="record-status"><span className="status-spark">✦</span><FadeText value={status}/></div>
  </section>;
}

function KhataPanel({ payment, setPayment, customer, setCustomer, ledger, currentTotal, reviewed, hasIssues, alreadyRecorded, onRecord, onReset }) {
  const account = ledger.accounts?.[customer] || { balance: 0, entries: [] };
  return <div className="khata-card" id="khata">
    <div className="khata-heading"><div><span className="kicker">VOICE KHATA</span><h3>Running credit balance</h3></div><span className="demo-badge">FICTIONAL DEMO</span></div>
    <div className="payment-options"><button className={payment === "cash" ? "selected" : ""} onClick={() => setPayment("cash")}>Cash</button><button className={payment === "upi" ? "selected" : ""} onClick={() => setPayment("upi")}>UPI</button><button className={payment === "credit" ? "selected" : ""} onClick={() => setPayment("credit")}>Udhaar</button></div>
    <label className="field-label">Customer account<select value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={payment !== "credit"}>{ACCOUNTS.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    <div className="balance-row"><span>Current demo balance</span><strong><FadeText value={money(account.balance)}/></strong></div>
    <div className="khata-actions"><button className="btn btn-green" disabled={payment !== "credit" || !reviewed || hasIssues || currentTotal <= 0 || alreadyRecorded} onClick={onRecord}><FadeText value={alreadyRecorded ? "✓ Added to Khata" : "＋  Record in Khata"}/></button><button className="icon-btn" onClick={onReset} title="Reset demo ledger">↺</button></div>
    <div className="khata-foot">A sale is recorded only after review and your click. Demo data stays in this browser.</div>
    {account.entries?.slice(0, 2).map((entry, i) => <div className="ledger-entry" key={entry.at + i}><span>{entry.label} · {new Date(entry.at).toLocaleDateString("en-IN")}</span><b>+{money(entry.amount)}</b></div>)}
  </div>;
}

function OrderPanel({ items, catalogue, total, subtotal, discount, reviewed, onBuild, onAlias, onSubstitute, onVariant, variantSelections, payment, setPayment, customer, setCustomer, ledger, creditRecorded, onRecordCredit, onResetLedger, onSpeak, apiReady, transcript, onShare, onDone, basketSuggestion, onBasket, onOpenDisplay }) {
  const issues = items.filter((item) => item.needsReview);
  return <section className="surface order-panel">
    <div className="section-title"><div><span className="kicker">STEP 02 · REVIEW</span><h2>Quick order slip</h2><p>Check every quantity before reading it back.</p></div><span className={reviewed && !issues.length ? "order-chip ready-chip" : "order-chip"}><FadeText value={reviewed && !issues.length ? "REVIEWED" : "DRAFT · NOT SENT"}/></span></div>
    <div className="order-list">{items.length ? items.map((item, i) => <OrderItem key={item.sourceName + item.name + i} item={item} catalogue={catalogue} onAlias={onAlias} onSubstitute={onSubstitute} selectedVariant={variantSelections[item.sourceName]} onVariant={onVariant}/>) : <div className="empty-order"><span className="empty-bag"><Icon name="bag" size={24}/></span><b>Your order will show up here</b><span>Record a voice order or try a sample.</span></div>}</div>
    {basketSuggestion && <div className="basket-suggestion"><span>✦</span><div><b>{basketSuggestion}</b><small>Commonly added with this order</small></div><button onClick={onBasket}>Add</button></div>}
    <div className="total-lines">{discount > 0 && <div><span>Subtotal</span><span><FadeText value={money(subtotal)}/></span></div>}{discount > 0 && <div className="discount-line"><span>Discount</span><span><FadeText value={`− ${money(discount)}`}/></span></div>}<div className="grand-total"><span><FadeText value={discount ? "Total after discount" : "Estimated total"}/></span><strong><FadeText value={money(total)}/></strong></div></div>
    <div className={issues.length ? "review-alert warning" : "review-alert"}><span>{issues.length ? "!" : "✓"}</span><div><b><FadeText value={issues.length ? `${issues.length} detail${issues.length === 1 ? "" : "s"} need a human check` : reviewed ? "Draft reviewed" : "Human check before confirming"}/></b><small><FadeText value={issues.length ? "Fix the transcript or choose a suggested replacement before read-back." : "Prices are illustrative. Confirm quantities and total with the customer."}/></small></div></div>
    <div className="confirm-actions"><button className="btn btn-light" onClick={onOpenDisplay}>▣ &nbsp; Customer screen</button><button className="btn btn-dark" onClick={onSpeak} disabled={!apiReady || !reviewed || issues.length > 0}>▶ &nbsp; Hear with Timbre</button></div>
    <KhataPanel payment={payment} setPayment={setPayment} customer={customer} setCustomer={setCustomer} ledger={ledger} currentTotal={total} reviewed={reviewed} hasIssues={issues.length > 0} alreadyRecorded={creditRecorded} onRecord={onRecordCredit} onReset={onResetLedger}/>
    <div className="secondary-actions"><button onClick={onShare}>Share order on WhatsApp ↗</button><button onClick={onDone}>Mark order done</button></div>
  </section>;
}

function ToolsPanel({ tab, setTab, catalogue, outOfStock, onStock, order, total, reviewed, aliases, aliasDates, demandLog, queue, onQueue, onLoadQueue, onRemoveQueue, address, setAddress, slot, setSlot, manualDiscount, setManualDiscount, vpa, setVpa, onQr, qrCanvas, restock, restockInput, setRestockInput, onRestock, onRemoveRestock, onShareRestock, customerWords, setCustomerWords, shopkeeperWords, setShopkeeperWords, onSpeakerBuild, photoRef, onPhoto, ocrText, setOcrText, onOcr, onImport, onExport, qna, onSpeakAnswer, apiReady }) {
  const tabs = [["smart", "Smart suggestions"], ["delivery", "Delivery & queue"], ["payment", "Payments"], ["restock", "Restock"], ["catalogue", "Catalogue & export"], ["speakers", "Speaker turns"]];
  const sevenDays = Date.now() - 7 * 86400000;
  const learnedThisWeek = Object.values(aliasDates).filter((date) => new Date(date).getTime() >= sevenDays).length;
  const recentDemand = demandLog.filter((entry) => new Date(entry.at).getTime() >= sevenDays);
  const byPhrase = Object.groupBy ? Object.groupBy(recentDemand, (entry) => entry.phrase) : recentDemand.reduce((acc, entry) => ((acc[entry.phrase] ||= []).push(entry), acc), {});
  return <section className="surface tools-panel" id="catalogue">
    <div className="tools-heading"><div><span className="kicker">COUNTER WORKFLOWS</span><h2>Everything around the order</h2></div><span className="tools-label">LOCAL DEMO TOOLS</span></div>
    <div className="tool-tabs">{tabs.map(([id, name]) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{name}</button>)}</div>
    <div className="tools-content">
      {tab === "smart" && <div className="tools-grid"><div className="tool-card"><h3>Stock and substitutions</h3><p>Mark demo items out of stock. The order then waits for a shopkeeper-approved replacement.</p>{["Parle-G", "Maggi"].map((name) => <label className="toggle-row" key={name}><input type="checkbox" checked={Boolean(outOfStock[name])} onChange={(e) => onStock(name, e.target.checked)}/><span><b>{name}</b><small>{outOfStock[name] ? "Out of stock" : "In stock"}</small></span></label>)}</div><div className="tool-card"><h3>Shop learning · last 7 days</h3><div className="learning-numbers"><div><strong>{learnedThisWeek}</strong><span>phrases learned</span></div><div><strong>{recentDemand.length}</strong><span>unmatched / OOS requests</span></div></div>{Object.entries(byPhrase).sort((a, b) => b[1].length - a[1].length).slice(0, 4).map(([phrase, entries]) => <div className="insight-row" key={phrase}><span>{phrase} <small>· {entries[0].reason || "unmatched"}</small></span><b>{entries.length} {entries.length === 1 ? "request" : "requests"}</b></div>)}{!recentDemand.length && <p className="quiet">Live unmatched and out-of-stock requests will appear here.</p>}</div></div>}
      {tab === "delivery" && <div className="tools-grid"><div className="tool-card"><h3>Home delivery</h3><p>Capture the delivery details for the spoken read-back.</p><label className="field-label">Address<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, street, landmark"/></label><label className="field-label">Delivery slot<input value={slot} onChange={(e) => setSlot(e.target.value)} placeholder="Today 6–7 PM"/></label></div><div className="tool-card"><h3>Waiting queue <span className="count-pill">{queue.length}/3</span></h3><p>Save up to three reviewed orders while customers wait.</p><button className="btn btn-green" onClick={onQueue} disabled={!reviewed || queue.length >= 3}>＋ Add reviewed order</button><div className="queue-list">{queue.map((ticket, i) => <div className="queue-row" key={ticket.id}><span><b>{i + 1}. {ticket.customer}</b><small>{money(ticket.total)} · {new Date(ticket.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small></span><button onClick={() => onLoadQueue(ticket)}>Load</button><button onClick={() => onRemoveQueue(ticket.id)}>×</button></div>)}{!queue.length && <p className="quiet">No waiting orders.</p>}</div></div></div>}
      {tab === "payment" && <div className="tools-grid"><div className="tool-card"><h3>Voice discount</h3><p>“Das rupaye kam kar do” is reflected in the reviewed total.</p><label className="field-label">Discount in rupees<input type="number" min="0" value={manualDiscount ?? order.discount ?? ""} onChange={(e) => setManualDiscount(e.target.value === "" ? null : Number(e.target.value))} placeholder="0"/></label><div className="payment-note">Final demo amount <b>{money(total)}</b></div></div><div className="tool-card"><h3>Exact-amount UPI QR</h3><p>Enter your shop VPA. QR generation happens in this browser.</p><div className="field-with-action"><input value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="shop@upi"/><button className="btn btn-dark" onClick={onQr} disabled={!reviewed || total <= 0}>Create QR</button></div><canvas ref={qrCanvas} className="qr-canvas"/><p className="quiet">Payment is not verified by this prototype.</p></div></div>}
      {tab === "restock" && <div className="tools-grid"><div className="tool-card"><h3>Voice restock</h3><p>Or say “Maggi khatam ho gaya” in the transcript to add it to the supplier list.</p><div className="field-with-action"><input value={restockInput} onChange={(e) => setRestockInput(e.target.value)} placeholder="Item name"/><button className="btn btn-dark" onClick={onRestock}>Add item</button></div><div className="queue-list">{restock.map((name) => <div className="queue-row" key={name}><b>{name}</b><button onClick={() => onRemoveRestock(name)}>Remove</button></div>)}{!restock.length && <p className="quiet">Supplier list is empty.</p>}</div><button className="text-action" onClick={onShareRestock} disabled={!restock.length}>Share list on WhatsApp ↗</button></div><div className="tool-card"><h3>Customer Q&A</h3><p>Ask “atta ka rate kya hai?” in the transcript and click Build order.</p><div className="answer-box">{qna || "The demo catalogue answer will appear here."}</div><button className="btn btn-green" onClick={onSpeakAnswer} disabled={!apiReady || !qna}>Speak with Timbre</button></div></div>}
      {tab === "catalogue" && <div className="tools-grid"><div className="tool-card"><h3>Start a catalogue from a photo</h3><p>Upload a price list. Browser OCR creates editable text; review every item before import.</p><input ref={photoRef} type="file" accept="image/*" onChange={onPhoto}/><textarea className="ocr-area" value={ocrText} onChange={(e) => setOcrText(e.target.value)} placeholder="OCR text appears here. Use lines like ‘Atta 52/kg’."/><div className="button-row"><button className="btn btn-light" onClick={onOcr}>Read photo</button><button className="btn btn-green" onClick={onImport}>Import reviewed rows</button></div><p className="quiet">This is OCR plus human review, not an AI vision model.</p></div><div className="tool-card"><h3>ONDC / Beckn-style export</h3><p>Download a draft order structure for future ONDC integration. Nothing is sent automatically.</p><div className="export-preview"><span>Items</span><b>{order.items.length}</b><span>Delivery details</span><b>{address || "Not set"}</b><span>Payment</span><b>₹{total}</b></div><button className="btn btn-dark" onClick={onExport} disabled={!reviewed}>Export draft JSON</button><p className="quiet">The export is a local prototype file, not a live ONDC connection.</p></div></div>}
      {tab === "speakers" && <div className="speaker-grid"><div className="tool-card"><h3>Customer words</h3><textarea value={customerWords} onChange={(e) => setCustomerWords(e.target.value)} placeholder="2 kilo atta de do"/></div><div className="tool-card"><h3>Shopkeeper words</h3><textarea value={shopkeeperWords} onChange={(e) => setShopkeeperWords(e.target.value)} placeholder="Aur kuch chahiye?"/></div><div className="speaker-footer"><p>Label each speaker's words, then use only the customer's words to build the order. Automatic audio diarization is not connected.</p><button className="btn btn-green" onClick={onSpeakerBuild}>Use customer words only</button></div></div>}
    </div>
  </section>;
}

function CustomerDisplay({ open, onClose, items, total, onConfirm, onCorrect, canConfirm }) {
  if (!open) return null;
  return <div className="display-backdrop"><div className="customer-display"><button className="display-close" onClick={onClose}>Close ×</button><span className="kicker">DUKAAN SUNO · PLEASE CHECK</span><h1>Your order</h1><div className="display-items">{items.length ? items.map((item, i) => <div key={i}><span>{item.quantity ?? "?"} {item.unit} {item.name}</span><b>{item.needsReview ? "Check" : money(item.total)}</b></div>) : <p>Your order will appear here.</p>}</div><div className="display-total"><span>Total</span><strong>{money(total)}</strong></div><div className="display-actions"><button className="btn btn-green" onClick={onConfirm} disabled={!canConfirm}>Yes, that’s right</button><button className="btn btn-light" onClick={onCorrect}>I need a correction</button></div></div></div>;
}

export default function App() {
  const [catalogue, setCatalogue] = useState(getCatalogue);
  const [aliases, setAliases] = useState(() => readLocal(DEMO_KEYS.aliases, {}));
  const [aliasDates, setAliasDates] = useState(() => readLocal(DEMO_KEYS.aliasDates, {}));
  const [demandLog, setDemandLog] = useState(() => readLocal(DEMO_KEYS.demand, []));
  const [outOfStock, setOutOfStock] = useState(() => readLocal(DEMO_KEYS.stock, {}));
  const [ledger, setLedger] = useState(() => readLocal(DEMO_KEYS.ledger, freshLedger()));
  const [queue, setQueue] = useState(() => readLocal(DEMO_KEYS.queue, []));
  const [restock, setRestock] = useState(() => readLocal(DEMO_KEYS.restock, []));
  const [history, setHistory] = useState(() => readLocal(DEMO_KEYS.history, []));
  const [payment, setPayment] = useState("cash");
  const [customer, setCustomer] = useState("sharma");
  const [transcript, setTranscript] = useState("");
  const [source, setSource] = useState("empty");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [apiReady, setApiReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [status, setStatus] = useState("Ready. Record or upload a fictional customer order.");
  const [toast, setToast] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [creditRecordedForDraft, setCreditRecordedForDraft] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(null);
  const [variantSelections, setVariantSelections] = useState({});
  const [substitutions, setSubstitutions] = useState({});
  const [address, setAddress] = useState("");
  const [slot, setSlot] = useState("");
  const [restockInput, setRestockInput] = useState("");
  const [qna, setQna] = useState("");
  const [toolsTab, setToolsTab] = useState("smart");
  const [page, setPage] = useState("overview");
  const [displayOpen, setDisplayOpen] = useState(false);
  const [customerWords, setCustomerWords] = useState("");
  const [shopkeeperWords, setShopkeeperWords] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [vpa, setVpa] = useState(() => localStorage.getItem(DEMO_KEYS.vpa) || "");
  const audioInput = useRef(null), photoInput = useRef(null), qrCanvas = useRef(null), recorderRef = useRef(null), chunksRef = useRef([]), streamRef = useRef(null), timerRef = useRef(null), toastTimer = useRef(null), photoFile = useRef(null), activeQueueId = useRef("");

  const parsed = useMemo(() => parseOrder(transcript, { catalogue, aliases, outOfStock, substitutions, variants: variantSelections }), [transcript, catalogue, aliases, outOfStock, substitutions, variantSelections]);
  const items = parsed.items;
  const issues = items.filter((item) => item.needsReview);
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discount = Math.min(subtotal, Math.max(0, manualDiscount ?? parsed.discount));
  const total = Math.max(0, subtotal - discount);
  const basketSuggestion = items.some((item) => item.catalogueName === "Aloo paratha") && !items.some((item) => ["Curd", "Pickle"].includes(item.catalogueName)) ? "Aloo paratha pairs well with dahi or achaar" : items.some((item) => item.catalogueName === "Atta") && !items.some((item) => item.catalogueName === "Cooking oil") ? "Customers often add cooking oil with atta" : "";
  const creditTotal = Object.values(ledger.accounts || {}).reduce((sum, account) => sum + (account.balance || 0), 0);
  const weekStart = Date.now() - 7 * 86400000;
  const weeklyDemand = demandLog.filter((entry) => new Date(entry.at).getTime() >= weekStart).length;
  const weeklyAliases = Object.values(aliasDates).filter((at) => new Date(at).getTime() >= weekStart).length;

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((data) => setApiReady(Boolean(data.apiReady))).catch(() => setApiReady(false));
  }, []);
  useEffect(() => { writeLocal(DEMO_KEYS.aliases, aliases); }, [aliases]);
  useEffect(() => { writeLocal(DEMO_KEYS.aliasDates, aliasDates); }, [aliasDates]);
  useEffect(() => { writeLocal(DEMO_KEYS.demand, demandLog); }, [demandLog]);
  useEffect(() => { writeLocal(DEMO_KEYS.stock, outOfStock); }, [outOfStock]);
  useEffect(() => { writeLocal(DEMO_KEYS.ledger, ledger); }, [ledger]);
  useEffect(() => { writeLocal(DEMO_KEYS.queue, queue); }, [queue]);
  useEffect(() => { writeLocal(DEMO_KEYS.restock, restock); }, [restock]);
  useEffect(() => { writeLocal(DEMO_KEYS.history, history); }, [history]);
  useEffect(() => () => { clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  function notify(message) { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 3200); }
  function cleanNewTranscript(text, mode = "edited") {
    setTranscript(text); setSource(mode); setReviewed(false); setCreditRecordedForDraft(false); setManualDiscount(null); setSubstitutions({}); setQna(""); setAddress(""); setSlot("");
    const who = inferCustomer(text);
    if (/khata|khate|udhaar|udhhar|credit|खाते|उधार/i.test(text)) { setPayment("credit"); if (who !== "walkin") setCustomer(who); }
    else if (/\bupi\b|यूपीआई/i.test(text)) setPayment("upi"); else setPayment("cash");
    if (who !== "walkin" && !/khata|khate|udhaar|udhhar|credit|खाते|उधार/i.test(text)) setCustomer(who);
  }

  async function fileToWav(file) {
    if (file.type === "audio/wav" || file.name.toLowerCase().endsWith(".wav")) return file;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    try {
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      const mono = new Float32Array(decoded.length);
      for (let c = 0; c < decoded.numberOfChannels; c++) { const channel = decoded.getChannelData(c); for (let i = 0; i < channel.length; i++) mono[i] += channel[i] / decoded.numberOfChannels; }
      const rate = 16000, length = Math.floor(mono.length * rate / decoded.sampleRate), pcm = new Int16Array(length);
      for (let i = 0; i < length; i++) { const s = mono[Math.floor(i * decoded.sampleRate / rate)]; pcm[i] = Math.max(-1, Math.min(1, s)) * (s < 0 ? 32768 : 32767); }
      const buffer = new ArrayBuffer(44 + pcm.length * 2), view = new DataView(buffer);
      const write = (at, value) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
      write(0, "RIFF"); view.setUint32(4, 36 + pcm.length * 2, true); write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i], true);
      return new File([buffer], "order.wav", { type: "audio/wav" });
    } finally { await context.close(); }
  }

  async function transcribe(file) {
    if (!apiReady) return notify("Gnani API key is not active on the server yet.");
    if (file.size > 16 * 1024 * 1024) return notify("Keep the audio under 16 MB.");
    setBusy(true); setStatus("Preparing audio for Gnani Prisma…");
    try {
      const wav = await fileToWav(file), form = new FormData(); form.append("audio", wav, wav.name || "order.wav");
      const response = await fetch("/api/transcribe", { method: "POST", body: form }), data = await response.json();
      if (!response.ok) throw new Error((data.error || "Could not transcribe the audio.") + ` (HTTP ${data.status || response.status}${data.code ? " · " + data.code : ""})`);
      const text = data.transcript || ""; cleanNewTranscript(text, "live"); setDetectedLanguage(data.detected_language_code || ""); setStatus("Transcribed by Prisma. Review the words and build the order.");
      const result = parseOrder(text, { catalogue, aliases, outOfStock, substitutions, variants: variantSelections });
      const newMentions = result.items.filter((item) => item.name.startsWith("Unmatched:") || item.stockIssue).map((item) => ({ phrase: item.name.startsWith("Unmatched:") ? item.name.slice(11) : item.catalogueName, at: new Date().toISOString(), reason: item.stockIssue ? "out of stock" : "not in catalogue" }));
      if (newMentions.length) setDemandLog((prev) => [...newMentions, ...prev].slice(0, 1000));
      notify("Gnani transcript ready. Review it before confirming.");
    } catch (error) { setStatus("Transcription could not complete."); notify(error.message); }
    finally { setBusy(false); }
  }

  async function toggleRecording() {
    if (recording) { recorderRef.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia) return notify("Microphone recording needs localhost or HTTPS.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      streamRef.current = stream; const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => { stream.getTracks().forEach((track) => track.stop()); streamRef.current = null; clearInterval(timerRef.current); setRecording(false); setRecordSeconds(0); const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }); await transcribe(new File([blob], "recording.webm", { type: blob.type })); };
      recorder.start(); setRecording(true); setRecordSeconds(0); setStatus("Listening… tap the microphone again when finished.");
      const start = Date.now(); timerRef.current = setInterval(() => { const seconds = Math.floor((Date.now() - start) / 1000); setRecordSeconds(Math.min(seconds, 20)); if (seconds >= 20 && recorder.state === "recording") recorder.stop(); }, 250);
    } catch (error) { notify(error.message || "Microphone permission was not available."); }
  }

  function handleBuild() {
    if (!transcript.trim()) return notify("Record or type an order first.");
    const namedCustomer = inferCustomer(transcript);
    if (/khata|khate|udhaar|udhhar|credit|खाते|उधार/i.test(transcript)) { setPayment("credit"); if (namedCustomer !== "walkin") setCustomer(namedCustomer); }
    else if (/\bupi\b|यूपीआई/i.test(transcript)) setPayment("upi");
    else if (/\bcash\b|नकद/i.test(transcript)) setPayment("cash");
    const question = findPriceQuestion(transcript, catalogue);
    if (question) {
      const isTata = question.name === "Salt" && /\btata\b/i.test(transcript), price = isTata ? 30 : question.price;
      const answer = `${isTata ? "Tata Salt" : question.name} ka demo rate ${money(price)} per ${question.unit} hai.`;
      setQna(answer); setStatus("Customer price question answered from the demo catalogue."); setToolsTab("restock");
      if (apiReady) speakText(answer).catch((error) => notify(error.message));
      return;
    }
    const restockItem = findRestockItem(transcript, catalogue);
    if (restockItem) { setRestock((prev) => prev.includes(restockItem.name) ? prev : [restockItem.name, ...prev]); setToolsTab("restock"); setStatus(`${restockItem.name} added to the supplier restock list.`); return notify(`${restockItem.name} added to restock list.`); }
    if (!items.length) return notify("No catalogue items matched. Check the transcript.");
    if (issues.length) { setReviewed(false); setStatus("Order held for review. Correct each flagged item before confirmation."); return notify("Fix the flagged details, then build the order again."); }
    setReviewed(true); setStatus("Draft reviewed. Read it back or add it to the queue."); notify("Order looks complete. Confirm the items with the customer.");
  }

  async function speakText(text) {
    if (!apiReady) throw new Error("Connect Gnani first to use Timbre.");
    const response = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Timbre could not speak this text."); }
    const audio = new Audio(URL.createObjectURL(await response.blob())); await audio.play();
  }
  function confirmationText() {
    const list = items.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(", ");
    const paymentLine = payment === "credit" ? ` Udhaar, ${ACCOUNTS.find((row) => row.id === customer)?.name.replace(" (demo)", "")} ke khate mein note kar doon?` : payment === "upi" ? " Payment UPI se." : " Payment cash.";
    const discountLine = discount ? ` Discount ${Math.round(discount)} rupaye.` : "";
    const deliveryLine = address ? ` Delivery to ${address}.` : "";
    const slotLine = slot ? ` Delivery slot ${slot}.` : "";
    return `Bhaiya, order confirm kar doon? ${list}. Total ${Math.round(total)} rupaye.${paymentLine}${discountLine}${deliveryLine}${slotLine}`;
  }

  function onAlias(phrase, target) {
    if (!target) return notify("Choose the matching catalogue item first.");
    const key = phrase.toLowerCase().replace(/[.,;:!?।]/g, " ").replace(/\s+/g, " ").trim();
    setAliases((prev) => ({ ...prev, [key]: target })); setAliasDates((prev) => ({ ...prev, [key]: new Date().toISOString() })); setReviewed(false); notify(`Learned “${key}” as ${target}. Build the order again.`);
  }
  function onSubstitute(sourceName, replacement) { setSubstitutions((prev) => ({ ...prev, [sourceName]: replacement })); setReviewed(false); }
  function onVariant(sourceName, label) { setVariantSelections((prev) => ({ ...prev, [sourceName]: label })); setReviewed(false); }
  function addCredit() {
    if (payment !== "credit" || !reviewed || issues.length || total <= 0 || creditRecordedForDraft) return;
    const label = items.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(", ");
    setLedger((prev) => { const next = structuredClone(prev); const account = next.accounts[customer]; account.balance += total; account.entries.unshift({ amount: total, label, at: new Date().toISOString() }); return next; });
    setCreditRecordedForDraft(true); setReviewed(false); notify(`Added ${money(total)} to the fictional demo Khata.`);
  }
  function resetLedger() { setLedger(freshLedger()); setCreditRecordedForDraft(false); notify("Demo Khata balances reset in this browser."); }
  function markDone() {
    if (!reviewed || issues.length || !items.length) return notify("Build a clean order first.");
    setHistory((prev) => [{ at: new Date().toISOString(), customer: ACCOUNTS.find((row) => row.id === customer)?.name || "Walk-in (demo)", total, text: transcript }, ...prev]);
    if (activeQueueId.current) setQueue((prev) => prev.filter((ticket) => ticket.id !== activeQueueId.current));
    activeQueueId.current = ""; notify("Order saved to today’s demo summary."); setReviewed(false);
    if (payment === "credit") addCredit();
  }
  function addToQueue() {
    if (!reviewed || issues.length) return notify("Build a clean order before adding it to the queue.");
    if (queue.length >= 3) return notify("Three tickets are already waiting. Load or remove one first.");
    const named = inferCustomer(transcript), person = payment === "credit" ? customer : named;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setQueue((prev) => [...prev, { id, customer: ACCOUNTS.find((row) => row.id === person)?.name || "Walk-in (demo)", text: transcript, total, at: new Date().toISOString() }]); notify("Order added to the waiting queue.");
  }
  function loadQueue(ticket) { activeQueueId.current = ticket.id; cleanNewTranscript(ticket.text, "edited"); setPayment(/khata|khate|udhaar|credit/i.test(ticket.text) ? "credit" : "cash"); setCustomer(inferCustomer(ticket.text)); setReviewed(false); setStatus("Queued order loaded. Review and build it before confirmation."); setPage("orders"); document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" }); }
  function addRestock(item = restockInput) {
    const match = catalogue.find((product) => product.name.toLowerCase() === String(item).toLowerCase() || product.terms.some((term) => String(item).toLowerCase().includes(term.toLowerCase())));
    if (!match) return notify("Choose a catalogue item, e.g. Maggi.");
    setRestock((prev) => prev.includes(match.name) ? prev : [match.name, ...prev]); setRestockInput(""); notify(`${match.name} added to the restock list.`);
  }
  function removeRestock(item) { setRestock((prev) => prev.filter((name) => name !== item)); }
  function useCustomerWords() {
    if (!customerWords.trim()) return notify("Enter the customer's words first.");
    cleanNewTranscript(`Customer: ${customerWords.trim()}\nShopkeeper: ${shopkeeperWords.trim()}`, "edited"); setToolsTab("smart"); notify("Built from customer words only. Review the order.");
  }
  function addBasketSuggestion() {
    const product = items.some((item) => item.catalogueName === "Aloo paratha") ? "Curd" : "Cooking oil";
    const unit = catalogue.find((row) => row.name === product)?.unit || "pack";
    const phrase = `1 ${unit} ${product.toLowerCase()}`;
    setTranscript((prev) => `${prev.replace(/[.!?]+$/, "")}, ${phrase}`); setReviewed(false); notify(`${product} added to the editable transcript. Build the order again.`);
  }
  function shareOrder() {
    if (!reviewed || issues.length) return notify("Build a clean order first.");
    const text = `*Your order*\n${items.map((item) => `• ${item.quantity} ${item.unit} ${item.name} — ${money(item.total)}`).join("\n")}\n*Total: ${money(total)}*\n— Dukaan Suno`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
  }
  async function makeQr() {
    if (!/^[\w.-]+@[\w.-]+$/.test(vpa)) return notify("Enter a valid shop UPI ID first.");
    if (!reviewed || issues.length || total <= 0) return notify("Build a clean order with a positive total first.");
    localStorage.setItem(DEMO_KEYS.vpa, vpa);
    try {
      if (!window.QRCode) await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"; script.onload = resolve; script.onerror = reject; document.head.append(script); });
      await window.QRCode.toCanvas(qrCanvas.current, `upi://pay?pa=${encodeURIComponent(vpa)}&pn=Dukaan%20Suno&am=${total.toFixed(2)}&cu=INR`, { width: 176, margin: 1 }); notify("Exact-amount UPI payment intent is ready.");
    } catch { notify("QR generator could not load. Check internet access and try again."); }
  }
  async function readPhoto() {
    const file = photoFile.current; if (!file) return notify("Choose a price-list photo first.");
    try {
      if (!window.Tesseract) await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"; script.onload = resolve; script.onerror = reject; document.head.append(script); });
      notify("Reading the photo in your browser…"); const result = await window.Tesseract.recognize(file, "eng+hin"); setOcrText(result.data.text || ""); notify("OCR draft ready. Review every detected name and price.");
    } catch { notify("Browser OCR could not load. Check internet access and try again."); }
  }
  function importPhotoRows() {
    const custom = readLocal(DEMO_KEYS.custom, []), overrides = readLocal(DEMO_KEYS.prices, {}), nextCatalogue = [...catalogue]; let added = 0;
    for (const line of ocrText.split(/\n+/)) {
      const match = line.match(/^\s*(.+?)\s+(?:₹|rs\.?\s*)?(\d{1,5}(?:\.\d{1,2})?)\s*(?:\/\s*(kg|kilo|litre|liter|pack|piece))?\s*$/i); if (!match) continue;
      const name = match[1].replace(/[•*|]+/g, " ").trim(), price = Number(match[2]); if (!name || !price) continue;
      const exists = nextCatalogue.find((product) => product.name.toLowerCase() === name.toLowerCase());
      if (exists) { exists.price = price; overrides[exists.name] = price; added++; continue; }
      const rawUnit = (match[3] || "pack").toLowerCase(), unit = /kg|kilo/.test(rawUnit) ? "kg" : /lit/.test(rawUnit) ? "litre" : rawUnit;
      const product = { name: name.slice(0, 40), terms: [name.toLowerCase()], unit, price }; nextCatalogue.push(product); custom.push(product); added++;
    }
    if (!added) return notify("No name-and-price rows found. Edit lines as ‘Atta 52/kg’ and retry.");
    writeLocal(DEMO_KEYS.custom, custom); writeLocal(DEMO_KEYS.prices, overrides); setCatalogue(nextCatalogue); notify(`Imported ${added} reviewed catalogue rows.`);
  }
  function exportOndc() {
    if (!reviewed || issues.length) return notify("Build a clean order before exporting.");
    const payload = { format: "Beckn-style order draft (prototype; not an ONDC submission)", context: { domain: "ONDC:RET10", action: "init", country: "IND", currency: "INR", created_at: new Date().toISOString() }, order: { customer: ACCOUNTS.find((row) => row.id === customer)?.name || "Walk-in (demo)", items: items.map(({ name, quantity, unit, unitPrice, total: lineTotal }) => ({ name, quantity, unit, unit_price: unitPrice, total: lineTotal })), discount, total, delivery: { address, slot }, payment_mode: payment } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "dukaan-suno-beckn-style-draft.json"; link.click(); URL.revokeObjectURL(link.href); notify("Downloaded a Beckn-style draft; nothing was sent to ONDC.");
  }
  async function speakAnswer() { try { await speakText(qna); } catch (error) { notify(error.message); } }

  function handleSample(kind) {
    const samples = {
      khata: "Sharma ji ke khate mein likh do: 2 kilo atta, thoda butter aur milk bhi bhej dena.",
      substitution: "1 packet Parle-G khatam hai, Britannia okay?",
      discount: "2 kilo atta, das rupaye kam kar do",
      question: "Atta ka rate kya hai?",
      restock: "Shopkeeper: Maggi khatam ho gaya"
    };
    cleanNewTranscript(samples[kind] || samples.khata, "sample"); setStatus("Illustrative sample only. No Gnani transcription was called.");
  }

  const todayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <div className="app-shell">
    <TopBar apiReady={apiReady} page={page} setPage={setPage}/>
    <main className="main-area" id="overview">
      <header className="top-header"><div className="breadcrumb">Workspace <span>/</span> Counter</div><div className="top-actions"><span className="today-label">{todayLabel}</span><button className="avatar-button" title="Shop demo">SS</button></div></header>
      <div className="welcome-row"><div><span className="kicker">YOUR DIGITAL COUNTER</span><h1>Good evening, Sanjay <span>✦</span></h1><p>Voice orders in. Clear, checked slips out.</p></div><div className="welcome-actions"><span className="secure-pill">● &nbsp; Demo workspace</span></div></div>
      <section className="metrics-grid"><Metric label="Orders today" value={history.filter((entry) => new Date(entry.at).toDateString() === new Date().toDateString()).length.toString().padStart(2, "0")} note="Saved in this browser" tone="mint"/><Metric label="Demo Khata balance" value={money(creditTotal)} note="Across fictional accounts" tone="peach"/><Metric label="Phrases learned" value={String(weeklyAliases)} note="Last 7 days" tone="violet"/><Metric label="Demand signals" value={String(weeklyDemand)} note="Unmatched or out of stock"/></section>
      <div className="workspace-grid"><RecorderCard transcript={transcript} setTranscript={(value) => { setTranscript(value); setReviewed(false); setCreditRecordedForDraft(false); setManualDiscount(null); setSubstitutions({}); }} source={source} setSource={setSource} busy={busy} recording={recording} recordSeconds={recordSeconds} onRecord={toggleRecording} onUpload={(event) => { const file = event.target.files?.[0]; if (file) transcribe(file); event.target.value = ""; }} onBuild={handleBuild} onSample={handleSample} language={detectedLanguage} status={status} fileRef={audioInput}/><OrderPanel items={items} catalogue={catalogue} total={total} subtotal={subtotal} discount={discount} reviewed={reviewed} onBuild={handleBuild} onAlias={onAlias} onSubstitute={onSubstitute} onVariant={onVariant} variantSelections={variantSelections} payment={payment} setPayment={setPayment} customer={customer} setCustomer={setCustomer} ledger={ledger} creditRecorded={creditRecordedForDraft} onRecordCredit={addCredit} onResetLedger={resetLedger} onSpeak={() => speakText(confirmationText()).then(() => notify("Timbre read-back is playing.")).catch((error) => notify(error.message))} apiReady={apiReady} transcript={transcript} onShare={shareOrder} onDone={markDone} basketSuggestion={basketSuggestion} onBasket={addBasketSuggestion} onOpenDisplay={() => setDisplayOpen(true)}/></div>
      <ToolsPanel tab={toolsTab} setTab={setToolsTab} catalogue={catalogue} outOfStock={outOfStock} onStock={(name, checked) => { setOutOfStock((prev) => ({ ...prev, [name]: checked })); setSubstitutions((prev) => { const next = { ...prev }; delete next[name]; return next; }); setReviewed(false); }} order={{ items, discount, total }} total={total} reviewed={reviewed} aliases={aliases} aliasDates={aliasDates} demandLog={demandLog} queue={queue} onQueue={addToQueue} onLoadQueue={loadQueue} onRemoveQueue={(id) => setQueue((prev) => prev.filter((ticket) => ticket.id !== id))} address={address} setAddress={(value) => { setAddress(value); setReviewed(false); }} slot={slot} setSlot={(value) => { setSlot(value); setReviewed(false); }} manualDiscount={manualDiscount} setManualDiscount={(value) => { setManualDiscount(value); setReviewed(false); }} vpa={vpa} setVpa={setVpa} onQr={makeQr} qrCanvas={qrCanvas} restock={restock} restockInput={restockInput} setRestockInput={setRestockInput} onRestock={addRestock} onRemoveRestock={removeRestock} onShareRestock={() => { if (!restock.length) return; window.open("https://wa.me/?text=" + encodeURIComponent("Supplier restock list:\n" + restock.map((name) => "• " + name).join("\n")), "_blank", "noopener,noreferrer"); }} customerWords={customerWords} setCustomerWords={setCustomerWords} shopkeeperWords={shopkeeperWords} setShopkeeperWords={setShopkeeperWords} onSpeakerBuild={useCustomerWords} photoRef={photoInput} onPhoto={(event) => { photoFile.current = event.target.files?.[0] || null; }} ocrText={ocrText} setOcrText={setOcrText} onOcr={readPhoto} onImport={importPhotoRows} onExport={exportOndc} qna={qna} onSpeakAnswer={speakAnswer} apiReady={apiReady}/>
      <footer className="page-footer"><span><b>Dukaan Suno</b> · A voice counter for neighbourhood shops</span><span>Prices and customer accounts are illustrative demo data.</span></footer>
    </main>
    <CustomerDisplay open={displayOpen} onClose={() => setDisplayOpen(false)} items={items} total={total} canConfirm={reviewed && !issues.length && items.length > 0} onConfirm={() => { markDone(); setDisplayOpen(false); }} onCorrect={() => { setDisplayOpen(false); document.getElementById("transcript")?.focus(); }}/>
    {toast && <div className="toast-message" role="status">{toast}</div>}
  </div>;
}
