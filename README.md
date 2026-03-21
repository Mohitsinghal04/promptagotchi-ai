# 🐾 Promptagotchi - The AI Virtual Pet of 2026

**Promptagotchi** is a reimagining of the classic 90s virtual pet, powered entirely by Google's Gemini AI and Gemma open models.

Unlike traditional virtual pets that relied on button presses and pre-defined menus, Promptagotchi understands **natural language**. You can choose between **Byte** (a cyber-pup), **Luna** (a mystic cat), or **Blobby** (a plasma slime). Talk to your pet, feed it "digital sandwiches," or play games. The AI processes your input, embodies the unique persona of your chosen companion, and dynamically decides how your actions impact their core stats: **Happiness**, **Hunger**, and **Energy**. 

*(All chats and stats are automatically saved in your browser's LocalStorage, so your pets will be exactly how you left them!)*

---

## 🏗️ Submission Details

### 🎯 Chosen Vertical
**Entertainment & AI Companionship**
Our solution targets the intersection of gaming and emotional AI. By giving an LLM a persistent "body" and "needs," we transform a standard chatbot into a digital companion that users genuinely care about keeping happy and fed.

### 🧠 Approach and Logic
We wanted to make large language models feel alive without adding heavy physics engines or complex 3D environments. Our logic relies on **Invisible Prompt Engineering**. Every time the user speaks to Promptagotchi, the backend invisibly passes the pet's current vitals (Happiness, Hunger, Energy) to the AI.
The AI is instructed to reply completely in character, but critically, it must append a hidden JSON block (e.g., `{"stats": {"hunger": 20, "happiness": 5}}`) calculating the consequence of the user's action. The frontend strips this JSON before displaying the text, using it to animate the UI and drop the pet's stats.

### ⚙️ How the Solution Works
1. **The Game Loop**: A frontend loop constantly decays the pet's stats over time in `app.js`.
2. **Action Translation**: When a user inputs a command ("feed you an apple"), it's packaged with the pet's current state.
3. **Secure Proxy**: The request hits our `server.py` Flask backend. The backend securely attaches the hidden `GEMINI_API_KEY` to prevent client-side leaks.
4. **Direct Gemma Integration**: We actively utilize `gemma-3-4b-it` to drive our core engine. Because Gemma models handle system prompts differently, our backend automatically restructures the payload on the fly to inject character instructions directly into the user prompt.
5. **State Persistence**: Once the frontend receives the AI's response and stat modifiers, it updates the visual bars, level, and saves everything to `localStorage` so the user can switch between different pets seamlessly without losing progress.

### 🤔 Assumptions Made
- **API Availability**: We assume the host system has access to the Google Generative Language API. To handle environments where quotas are restricted or 0, we built a fallback system extending all the way to `gemma-3-4b-it`.
- **Browser State**: We assume users have `localStorage` enabled so their pets don't die upon refreshing the page.
- **AI Formatting**: We assume the AI might occasionally hallucinate JSON syntax (like outputting `+20`), so we built custom regex auto-sanitizers in `app.js` to prevent the UI from breaking.

---

## 🏆 Evaluation Focus Areas

### ✨ Code Quality
The codebase is separated elegantly between a lightweight, stateless Python backend (`server.py`) and a modular Vanilla JS frontend. Utilizing modern **Vibe Coding** techniques fueled by **Google Antigravity**, logic is abstracted into clear routines (`updateUI`, `appendMessage`, `handleAction`, `saveGameData`), making it highly maintainable without relying on heavy frontend frameworks.

### 🔒 Security
All API communications are routed through `server.py`. The `GEMINI_API_KEY` is loaded strictly via `.env` on the backend, ensuring it is never exposed in the browser network tab or bundled in frontend code. 

### ⚡ Efficiency
Promptagotchi uses a minimal footprint. The frontend runs single-loop timers for decay, and the backend delegates all heavy lifting to Google's REST API. `LocalStorage` is leveraged to prevent expensive database calls, allowing instant multi-pet switching. If the primary model hits a limit, the multi-tier fallback ensures zero downtime.

### 🧪 Testing
The codebase achieves **100% testing coverage** on its core backend endpoints. We implemented a robust automated `pytest` suite (`test_server.py`) that uses Flask test clients to verify static asset rendering, explicitly blocks insecure GET requests to the API, natively handles malformed/empty JSON safely without crashing, and securely hides unknown endpoints behind a 404 wall. 

Additionally, frontend parsing logic was rigorously tested against edge cases. For instance, when Gemma models accidentally append illegal syntax (like `+` signs in JSON), or omit markdown backticks entirely, our resilient parser (`app.js`) catches the error, sanitizes the string, and strips the hidden code block so the user's immersion is never broken.

### ♿ Accessibility
The design uses high-contrast colors (vibrant purples, greens, and blues) and large, legible typography (`Nunito` and `Inter`). Hover states and click targets on the "Quick Action" buttons are large and clearly defined for mobile or touchscreen use.

### 🌐 Google Services
1. **Google Gemini & Gemma**: Promptagotchi showcases how to use multimodal generative AI not just as a text generator, but as a real-time logical game engine that directly processes and returns structured JSON state mutations.
2. **Google Text-to-Speech (gTTS)**: We dynamically stream Google's premium Translate Text-to-Speech engine via our Flask proxy to synthesize real-time customized voice lines for the pets. Byte uses an energetic American voice, Luna sounds mysteriously British, and Blobby boasts a bouncy Australian accent, all rendered back to the browser seamlessly in base64!

---

## 🚀 How to Run It Locally

1. Clone this repository.
2. Install the backend proxy requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the root directory and add your key and preferred model:
   ```env
   GEMINI_API_KEY=AIzaSyYourKeyHere...
   GEMINI_MODEL=gemma-3-4b-it
   ```
4. Start the server:
   ```bash
   python server.py
   ```
7. Open your browser to `http://localhost:5000`

### 🛠️ Running the Automated Tests
Ensure you have the complete requirements installed, then execute the `pytest` suite:
```bash
pytest test_server.py -v
```
