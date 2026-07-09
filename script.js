(() => {
  "use strict";

  const STORAGE_KEY = "neo24_api_key";
  const STORAGE_MODEL = "neo24_model";
  const STORAGE_VOICE = "neo24_voice_on";
  const DEFAULT_MODEL = "gemini-2.5-flash";

  const $ = (id) => document.getElementById(id);

  const loginScreen   = $("login-screen");
  const appScreen     = $("app-screen");
  const apiKeyInput   = $("api-key-input");
  const toggleKeyBtn  = $("toggle-key-visibility");
  const loginBtn      = $("login-btn");
  const loginError    = $("login-error");

  const heroEl        = $("hero");
  const heroOrb        = $("hero-orb");
  const heroStatus     = $("hero-status");
  const transcriptEl  = $("transcript");
  const emptyState    = $("empty-state");
  const textInput     = $("text-input");
  const micBtn        = $("mic-btn");
  const sendBtn       = $("send-btn");
  const settingsBtn   = $("settings-btn");
  const clearBtn      = $("clear-btn");

  const settingsModal    = $("settings-modal");
  const settingsApiKey    = $("settings-api-key");
  const settingsModel     = $("settings-model");
  const settingsVoice     = $("settings-voice-toggle");
  const settingsSaveBtn   = $("settings-save-btn");
  const settingsCloseBtn  = $("settings-close-btn");
  const logoutBtn         = $("logout-btn");

  let history = [];       // [{role:"user"|"model", text:"..."}]
  let isBusy = false;
  let recognition = null;
  let isListening = false;

  // ---------------- storage helpers ----------------

  function getApiKey() { return localStorage.getItem(STORAGE_KEY) || ""; }
  function setApiKey(k) { localStorage.setItem(STORAGE_KEY, k); }
  function clearApiKey() { localStorage.removeItem(STORAGE_KEY); }

  function getModel() { return localStorage.getItem(STORAGE_MODEL) || DEFAULT_MODEL; }
  function setModel(m) { localStorage.setItem(STORAGE_MODEL, m); }

  function getVoiceOn() {
    const v = localStorage.getItem(STORAGE_VOICE);
    return v === null ? true : v === "true";
  }
  function setVoiceOn(v) { localStorage.setItem(STORAGE_VOICE, String(v)); }

  // ---------------- screen switching ----------------

  function showLogin() {
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }

  function showApp() {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
  }

  // ---------------- Gemini API ----------------

  async function callGemini(apiKey, model, contents) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: "You are NEO, a concise, friendly voice assistant. Keep answers clear and not overly long unless the user asks for detail." }]
        }
      })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : `Request failed (${res.status})`;
      throw new Error(msg);
    }

    const candidate = data && data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    const text = parts ? parts.map((p) => p.text || "").join("").trim() : "";

    if (!text) throw new Error("The model returned an empty response.");
    return text;
  }

  // ---------------- Login flow ----------------

  toggleKeyBtn.addEventListener("click", () => {
    const showing = apiKeyInput.type === "text";
    apiKeyInput.type = showing ? "password" : "text";
    toggleKeyBtn.textContent = showing ? "Show" : "Hide";
  });

  apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  loginBtn.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    loginError.textContent = "";

    if (!key) {
      loginError.textContent = "Please enter your Gemini API key.";
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Verifying…";

    try {
      await callGemini(key, getModel(), [
        { role: "user", parts: [{ text: "Say hello in one short word." }] }
      ]);
      setApiKey(key);
      loginBtn.disabled = false;
      loginBtn.textContent = "Continue";
      showApp();
    } catch (err) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Continue";
      loginError.textContent = "Couldn't verify that key: " + err.message;
    }
  });

  // ---------------- Chat rendering ----------------

  function scrollTranscriptToBottom() {
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  function addBubble(text, kind) {
    if (emptyState) emptyState.remove();
    const bubble = document.createElement("div");
    bubble.className = `bubble ${kind}`;
    bubble.textContent = text;
    transcriptEl.appendChild(bubble);
    scrollTranscriptToBottom();
    return bubble;
  }

  function setHeroState(state, statusText) {
    heroOrb.classList.remove("listening", "thinking");
    heroEl.classList.toggle("compact", state !== "idle" || history.length > 0);
    if (state === "listening") heroOrb.classList.add("listening");
    if (state === "thinking") heroOrb.classList.add("thinking");
    heroStatus.textContent = statusText;
  }

  function speak(text) {
    if (!getVoiceOn()) return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (_) { /* ignore */ }
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    const apiKey = getApiKey();
    if (!apiKey) { showLogin(); return; }

    addBubble(trimmed, "user");
    history.push({ role: "user", parts: [{ text: trimmed }] });

    textInput.value = "";
    autoGrow();
    updateSendState();

    isBusy = true;
    setHeroState("thinking", "Thinking…");

    try {
      const reply = await callGemini(apiKey, getModel(), history);
      history.push({ role: "model", parts: [{ text: reply }] });
      addBubble(reply, "assistant");
      speak(reply);
      setHeroState("idle", "Tap the mic and say something");
    } catch (err) {
      addBubble("Something went wrong: " + err.message, "error");
      setHeroState("idle", "Tap the mic and say something");
    } finally {
      isBusy = false;
    }
  }

  // ---------------- Text input ----------------

  function autoGrow() {
    textInput.style.height = "auto";
    textInput.style.height = Math.min(textInput.scrollHeight, 110) + "px";
  }

  function updateSendState() {
    sendBtn.disabled = textInput.value.trim().length === 0 || isBusy;
  }

  textInput.addEventListener("input", () => { autoGrow(); updateSendState(); });
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textInput.value);
    }
  });

  sendBtn.addEventListener("click", () => sendMessage(textInput.value));

  // ---------------- Voice input ----------------

  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognitionImpl) {
    recognition = new SpeechRecognitionImpl();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add("active");
      setHeroState("listening", "Listening…");
    };

    recognition.onerror = () => {
      isListening = false;
      micBtn.classList.remove("active");
      setHeroState("idle", "Tap the mic and say something");
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove("active");
    };

    recognition.onresult = (event) => {
      const said = event.results[0][0].transcript;
      sendMessage(said);
    };
  } else {
    micBtn.title = "Voice input isn't supported in this browser — you can still type.";
  }

  micBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      return;
    }
    if (isBusy) return;
    try { recognition.start(); } catch (_) { /* already running */ }
  });

  // ---------------- Top bar actions ----------------

  clearBtn.addEventListener("click", () => {
    history = [];
    transcriptEl.innerHTML = '<div class="empty-state" id="empty-state">Ask me anything, or tap the microphone to talk.</div>';
    setHeroState("idle", "Tap the mic and say something");
  });

  settingsBtn.addEventListener("click", () => {
    settingsApiKey.value = getApiKey();
    settingsModel.value = getModel();
    settingsVoice.checked = getVoiceOn();
    settingsModal.classList.remove("hidden");
  });

  settingsCloseBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

  settingsSaveBtn.addEventListener("click", () => {
    const newKey = settingsApiKey.value.trim();
    if (newKey) setApiKey(newKey);
    setModel(settingsModel.value);
    setVoiceOn(settingsVoice.checked);
    settingsModal.classList.add("hidden");
  });

  logoutBtn.addEventListener("click", () => {
    clearApiKey();
    history = [];
    transcriptEl.innerHTML = '<div class="empty-state" id="empty-state">Ask me anything, or tap the microphone to talk.</div>';
    settingsModal.classList.add("hidden");
    apiKeyInput.value = "";
    loginError.textContent = "";
    showLogin();
  });

  // ---------------- Boot ----------------

  updateSendState();

  if (getApiKey()) {
    showApp();
  } else {
    showLogin();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* offline shell is optional */ });
    });
  }
})();
