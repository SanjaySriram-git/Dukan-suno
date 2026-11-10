## 🤖 Gnani AI Integration

Dukaan Suno integrates **Gnani AI's Prisma v3.0 and Timbre v2.5** to bring voice-first interaction to traditional kirana stores.

The integration enables shopkeepers to capture spoken customer orders, review transcribed items and quantities, and provide audio confirmations in a natural voice.

### 1. Gnani Prisma v3.0 – Speech-to-Text

**Purpose:** Convert customer voice orders into editable text.

- Captures spoken grocery orders through the application's voice input.
- Processes natural speech in Hindi, Hinglish, and English, depending on API-supported language handling.
- Converts speech into text for order processing.
- Displays the transcribed order in an editable order slip.
- Allows the shopkeeper to verify product names and quantities before confirmation.

**Example voice input:**

```text
"Sharma ji ke khate mein likh do:
2 kilo atta aur 1 packet butter."
```

**Expected order representation:**

| Product | Quantity |
|---|---:|
| Atta | 2 kg |
| Butter | 1 packet |

### 2. Gnani Timbre v2.5 – Text-to-Speech

**Purpose:** Convert order confirmations into spoken audio.

- Generates spoken confirmation from the reviewed order.
- Reads the order details aloud.
- Helps shopkeepers verify the recognized items and quantities through audio.
- Provides a more natural, voice-first interaction experience.

### 3. End-to-End Voice Workflow

```text
Customer speaks an order
          |
          v
   Voice Input Capture
          |
          v
 Gnani Prisma v3.0
    (Speech-to-Text)
          |
          v
  Editable Order Slip
          |
          v
 Shopkeeper Reviews Order
          |
          v
    Build Order
          |
          v
 Gnani Timbre v2.5
    (Text-to-Speech)
          |
          v
 Spoken Order Confirmation
          |
          v
 Shopkeeper Records Sale
          |
          v
      Demo Khata
```

### 4. Why Gnani AI?

Integrating Gnani AI makes Dukaan Suno more accessible to local kirana shopkeepers by reducing dependence on manual order entry.

Key benefits:

- **Multilingual Interaction:** Supports natural voice-based ordering across supported Indian languages.
- **Reduced Manual Entry:** Converts spoken orders into structured, editable order information.
- **Audio Confirmation:** Allows shopkeepers to hear the reviewed order.
- **Human-in-the-Loop:** Keeps the shopkeeper responsible for reviewing and confirming every order.

### 5. Technology Stack

| Component | Technology |
|---|---|
| Speech-to-Text | Gnani Prisma v3.0 |
| Text-to-Speech | Gnani Timbre v2.5 |
| Frontend | React / Vite |
| Backend | Node.js |
| Voice Processing | Gnani AI APIs |

### 6. Demo Disclaimer

Dukaan Suno is a demonstration project developed to showcase voice-first workflows for kirana stores.

- Product prices and customer Khata accounts are illustrative demo data.
- Orders are not automatically placed with suppliers.
- Shopkeepers review and confirm orders before recording sales.
- API credentials are maintained outside the public source code.

---

**Built by:** Sanjay Sriram

**Project:** Dukaan Suno

**Challenge:** Great Indian AI Internship Challenge

**AI Technologies:** Gnani Prisma v3.0 and Gnani Timbre v2.5

#GnaniAI #GreatIndianAIInternshipChallenge
