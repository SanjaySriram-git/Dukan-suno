# Dukaan Suno

A voice counter for neighborhood shops. A customer speaks naturally in Hindi, Hinglish or English; the shopkeeper reviews a draft order and can read the confirmation back aloud.

The interface is built with React and Vite. The local Node server still keeps the Gnani key private and handles Prisma/Timbre requests.

## Gnani models used

- **Gnani Prisma v3.0** transcribes short recorded or uploaded voice orders. The app requests Indic auto-detection, digit-friendly transcription, a grocery-order topic hint and a short catalogue keyterm list.
- **Gnani Timbre v2.5** speaks the Hinglish order confirmation using the Poorvi voice.

Order matching and the illustrative price list are local demo logic. If an item is not in the small demo catalogue, a quantity is missing, or the unit sounds wrong, Dukaan Suno flags it and keeps the Timbre read-back locked. The shopkeeper edits the transcript and rebuilds the draft before confirmation. The app does not place a sale automatically; WhatsApp sharing and local Khata recording require an explicit click.

## Extra kirana workflow features

- **Voice Khata:** phrases such as “Sharma ji ke khate mein likh do” select a fictional customer account and Udhaar payment mode. After reviewing a complete order, click **Record in demo Khata** to add the amount to that account's running balance. These demo balances are saved in this browser only and can be cleared with **Reset Khata**.
- **Voice-note upload:** upload a downloaded audio or WhatsApp voice-note file and get the same transcript and editable order flow as a microphone recording. This is manual file upload; the app does not connect to or forward messages through WhatsApp.
- **Shopkeeper-approved aliases:** for an unmatched phrase, select the intended catalogue item and click **Learn phrase**. Dukaan Suno remembers the phrase in this browser and can match it next time.
- **Demand gaps:** unmatched product phrases from successful live Prisma transcripts are counted locally. The sample and typed edits do not increase this count.
- **Sanity checks:** missing quantities, mismatched units, quantities above 100 and repeated mentions of the same catalogue item hold the order for review.
- **Substitution and basket suggestions:** an out-of-stock Parle-G or Maggi can be replaced after shopkeeper approval; simple pairings suggest curd or pickle with aloo paratha.
- **Brand/pack picker and customer Q&A:** select a demo brand price for salt, atta or rice, or ask “atta ka rate kya hai?” for a catalogue answer that Timbre can read aloud.
- **Discount and delivery fields:** recognised rupee-off phrases reduce the reviewed total; delivery address and slot can be entered or extracted from common spoken formats.
- **Queue and customer display:** keep up to three reviewed orders in a local waiting queue and show the current order in a large customer-facing confirmation screen. The app also accepts a voice yes/no confirmation.
- **UPI, restock and export:** generate a local exact-amount UPI QR after entering the shop VPA, share a restock list through WhatsApp, and export a Beckn-style JSON draft.
- **Photo-assisted catalogue setup:** upload a price-list photo, run browser OCR, review the detected lines and import confirmed name/price rows. OCR is not a Gnani vision model.
- **Speaker turn review:** label customer and shopkeeper text separately and build the order from customer words only. This is a manual review aid, not automatic audio diarization.

The QR and OCR controls load their browser libraries from jsDelivr only when used. The UPI payload is assembled and encoded in the browser; the price-list OCR is also performed in the browser, then requires a human to confirm the extracted rows.

All balances, learned aliases and demand counts are local demo data stored in the browser. They are not a production ledger, shared across devices, or backed by a database.

## What still needs a real integration

This is a local, single-browser prototype. WhatsApp voice notes are uploaded as saved audio files; the app does not receive forwarded messages through a WhatsApp Business account. Speaker labels are manual; automatic diarization needs a diarization-capable API. The photo workflow runs OCR in the browser and needs human review; it does not use a vision model. UPI QR generation creates a payment intent but does not verify payment. The Beckn-style JSON is a draft only and is not submitted to ONDC. Khata, inventory, queue, aliases and demand counts are local demo data, not shared across devices or backed by a production database.

“Try unclear sample” loads fictional text only: Sharma ji's demo Khata is selected, with two missing quantities. It makes no Gnani call and does not affect demand counts. Change “thoda butter” to “1 packet butter” and add “1 litre milk”, then click Build order to clear the flags. Record the reviewed sale in the demo Khata to show the running balance. This demonstrates the review guard; it is not a model result.

## Run on Windows

Requires Node.js 20 or later and an internet connection on first launch so React and Vite can be installed.

1. Extract the updated ZIP and open PowerShell in its folder.
2. Run `start.ps1`. On first launch it installs the React app dependencies, builds the interface, and asks for your Gnani API key with hidden input.
3. Open http://127.0.0.1:4173.

If you start the app manually instead, run `npm install` once and then `npm start`.

`start.ps1` asks for your API key with hidden input, keeps the key only in the server process environment, and clears it when the server exits. You do not need to paste the key into chat or save it in the project.

Allow microphone access. Browser recordings are converted to mono 16 kHz WAV before transcription. You can also upload a supported audio clip up to 30 seconds.

If Node.js or npm is not recognized, install the current Node.js LTS release and reopen PowerShell.

## Keep the public demo connected

The API key is read only by the server and is never sent to the browser. For a hosted demo, set GNANI_API_KEY in the host's private environment settings. Do not put the key in the HTML, a public repository, a screenshot or a demo video. The included server binds to localhost for safe local use; a hosted service should set HOST to 0.0.0.0 and PORT to the host-provided port.

If the server starts without a key, sample mode is available. It is labelled as an illustrative sample and cannot be presented as a Gnani transcription.

## Demo flow

1. Set the API key on the server and confirm the header reads “Gnani APIs connected”.
2. Record yourself acting out a fictional Hindi/Hinglish order for Sharma ji that includes “khate mein likh do”.
3. Show Prisma's live transcript, check the editable items, and click Build order.
4. Play the Timbre read-back and click **Record in demo Khata** to show the fictional running balance.
5. If you have a live unmatched item, show its demand count and teach the phrase to a catalogue item. Explain that balances and learning signals stay in this browser.

## Solo contribution

**Sanjay Sriram —** product concept, React/Vite interface, browser audio capture and conversion, Prisma v3.0 and Timbre v2.5 integrations, editable transcript and review guards, fictional Voice Khata, local alias learning, and unmet-demand counts.

## Challenge submission copy

**Project:** Dukaan Suno  
**Problem:** A rushed or unclear spoken grocery order can leave a shopkeeper guessing the item or quantity.  
**For:** Neighborhood kirana stores and customers placing everyday grocery orders.  
**Gnani technology:** Prisma v3.0 for Indic auto-detected speech transcription; Timbre v2.5 (Poorvi) for a spoken Hinglish order confirmation.  
**Contribution:** Built solo by Sanjay Sriram: end-to-end app, Prisma/Timbre integrations, audio and voice-note upload, editable transcript, review guards, fictional Voice Khata, alias learning, unmet-demand counts, substitutions, retail Q&A, discounts, delivery fields, queue, customer display, local UPI QR, restock sharing, browser OCR and Beckn-style export.

## Authentic demo note

Do not present the illustrative sample text as a model result. Show the “Live · Prisma V3” badge after a genuine API transcription and play the Timbre output generated by the app. The challenge asks participants to use synthetic data; record yourself acting out a fictional order, not a real customer call. Publish the demo only after the API is connected and the real recording has worked.
