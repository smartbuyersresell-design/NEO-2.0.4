name=script.js
(() => {
  "use strict";

  // ==================== CONSTANTS ====================
  const STORAGE_PREFIX = "neo_";
  const STORAGE_OLLAMA_URL = STORAGE_PREFIX + "ollama_url";
  const STORAGE_MODEL = STORAGE_PREFIX + "model";
  const STORAGE_TEMP = STORAGE_PREFIX + "temperature";
  const STORAGE_MAX_TOKENS = STORAGE_PREFIX + "max_tokens";
  const STORAGE_CONVERSATIONS = STORAGE_PREFIX + "conversations";
  const STORAGE_CURRENT_CONVO = STORAGE_PREFIX + "current_convo";

  // ==================== DOM ELEMENTS ====================
  const setupScreen = document.getElementById("setup-screen");
  const appScreen = document.getElementById("app-screen");
  const ollamaUrlInput = document.getElementById("ollama-url");
  const modelSelect = document.getElementById("model-select");
  const testConnBtn = document.getElementById("test-connection-btn");
  const connStatus = document.getElementById("connection-status");
  const setupStartBtn = document.getElementById("setup-start-btn");

  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const voiceBtn = document.getElementById("voice-input-btn");
  const transcriptEl = document.getElementById("transcript");
  const modelBadge = document.getElementById("model-badge");
  const heroStatus = document.getElementById("hero-status");
  const chatHero = document.getElementById("chat-hero");

  const settingsModal = document.getElementById("settings-modal");
  const settingsUrlInput = document.getElementById("settings-url");
  const settingsModelSelect = document.getElementById("settings-model-select");
  const tempSlider = document.getElementById("temp-slider");
  const maxTokensInput = document.getElementById("max-tokens-input");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const sidebarSettingsBtn = document.getElementById("sidebar-settings-btn");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  const exportModal = document.getElementById("export-modal");
  const sidebarExportBtn = document.getElementById("sidebar-export-btn");
  const exportJsonBtn = document.getElementById("export-json");
  const exportMdBtn = document.getElementById("export-markdown");
  const exportTxtBtn = document.getElementById("export-txt");

  const newConvoBtn = document.getElementById("new-convo-btn");
  const convosContainer = document.getElementById("convos-container");

  // ==================== STATE ====================
  let currentConversation = [];
  let isBusy = false;
  let recognition = null;
  let isListening = false;
  let availableModels = [];
  let currentTheme = "dark";

  // ==================== STORAGE HELPERS ====================
  function getOllamaUrl() {
    return localStorage.getItem(STORAGE_OLLAMA_URL) || "http://localhost:11434";
  }

  function setOllamaUrl(url) {
    localStorage.setItem(STORAGE_OLLAMA_URL, url);
  }

  function getModel() {
    return localStorage.getItem(STORAGE_MODEL) || "mistral";
  }

  function setModel(m) {
    localStorage.setItem(STORAGE_MODEL, m);
  }

  function getTemperature() {
    return parseFloat(localStorage.getItem(STORAGE_TEMP) || "0.7");
  }

  function setTemperature(t) {
    localStorage.setItem(STORAGE_TEMP, String(t));
  }

  function getMaxTokens() {
    return parseInt(localStorage.getItem(STORAGE_MAX_TOKENS) || "2000");
  }

  function setMaxTokens(t) {
    localStorage.setItem(STORAGE_MAX_TOKENS, String(t));
  }

  function getConversations() {
    const str = localStorage.getItem(STORAGE_CONVERSATIONS);
    return str ? JSON.parse(str) : {};
  }

  function saveConversations(convos) {
    localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(convos));
  }

  function getCurrentConvoId() {
    return localStorage.getItem(STORAGE_CURRENT_CONVO) || "default";
  }

  function setCurrentConvoId(id) {
    localStorage.setItem(STORAGE_CURRENT_CONVO, id);
  }

  // ==================== OLLAMA API ====================
  async function checkOllamaConnection() {
    try {
      const url = getOllamaUrl();
      const response = await fetch(`${url}/api/tags`, { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        availableModels = data.models ? data.models.map(m => m.name) : [];
        return { success: true, models: availableModels };
      }
      return { success: false, error: `Server responded with ${response.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function callOllama(prompt) {
    const url = getOllamaUrl();
    const model = getModel();
    const temperature = getTemperature();

    try {
      const response = await fetch(`${url}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
          temperature: temperature,
          num_predict: getMaxTokens()
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (error) {
      throw new Error("Failed to get response from Ollama: " + error.message);
    }
  }

  // ==================== UI HELPERS ====================
  function showSetup() {
    setupScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }

  function showApp() {
    setupScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
  }

  function scrollToBottom() {
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  function addBubble(text, role) {
    const emptyState = document.getElementById("empty-state");
    if (emptyState) emptyState.remove();

    const bubble = document.createElement("div");
    bubble.className = `bubble ${role === "user" ? "user" : "assistant"}`;
    bubble.textContent = text;
    transcriptEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function autoGrow() {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
  }

  function updateSendState() {
    sendBtn.disabled = chatInput.value.trim().length === 0 || isBusy;
  }

  function setHeroStatus(text) {
    heroStatus.textContent = text;
  }

  function updateModelBadge() {
    modelBadge.textContent = "Model: " + getModel();
  }

  function renderConversations() {
    convosContainer.innerHTML = "";
    const convos = getConversations();
    const currentId = getCurrentConvoId();

    Object.entries(convos).forEach(([id, convo]) => {
      const item = document.createElement("div");
      item.className = `convo-item ${id === currentId ? "active" : ""}`;
      item.textContent = convo.title || "Untitled";
      item.addEventListener("click", () => loadConversation(id));
      convosContainer.appendChild(item);
    });
  }

  function loadConversation(id) {
    const convos = getConversations();
    if (convos[id]) {
      currentConversation = convos[id].messages || [];
      setCurrentConvoId(id);
      renderChat();
      renderConversations();
    }
  }

  function renderChat() {
    transcriptEl.innerHTML = "";

    if (currentConversation.length === 0) {
      transcriptEl.innerHTML = '<div class="empty-state">Start a new conversation!</div>';
      chatHero.classList.remove("hidden");
      return;
    }

    chatHero.classList.add("hidden");
    currentConversation.forEach(msg => {
      addBubble(msg.text, msg.role);
    });
  }

  // ==================== SETUP FLOW ====================
  testConnBtn.addEventListener("click", async () => {
    const url = ollamaUrlInput.value.trim();
    if (!url) {
      connStatus.textContent = "Please enter a URL";
      connStatus.classList.remove("success");
      connStatus.classList.add("error");
      return;
    }

    testConnBtn.disabled = true;
    connStatus.textContent = "Testing...";

    const result = await checkOllamaConnection();

    if (result.success) {
      connStatus.textContent = `✓ Connected! Found ${result.models.length} model(s)`;
      connStatus.classList.add("success");
      connStatus.classList.remove("error");

      modelSelect.innerHTML = result.models
        .map(m => `<option value="${m}">${m}</option>`)
        .join("");
      setOllamaUrl(url);

      if (result.models.length > 0) {
        setupStartBtn.disabled = false;
      }
    } else {
      connStatus.textContent = `✗ Error: ${result.error}`;
      connStatus.classList.add("error");
      connStatus.classList.remove("success");
    }

    testConnBtn.disabled = false;
  });

  setupStartBtn.addEventListener("click", () => {
    const selectedModel = modelSelect.value;
    if (selectedModel) {
      setModel(selectedModel);
      showApp();
      updateModelBadge();
      renderConversations();
      renderChat();
    }
  });

  // ==================== CHAT FLOW ====================
  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    addBubble(trimmed, "user");
    currentConversation.push({ role: "user", text: trimmed });

    chatInput.value = "";
    autoGrow();
    updateSendState();

    isBusy = true;
    setHeroStatus("Thinking...");
    setHeroStatus("Generating response...");

    try {
      const response = await callOllama(trimmed);
      addBubble(response, "assistant");
      currentConversation.push({ role: "assistant", text: response });

      // Auto-save conversation
      const convos = getConversations();
      const currentId = getCurrentConvoId();
      const firstMsg = currentConversation[0]?.text.substring(0, 30) || "New Chat";
      if (!convos[currentId]) {
        convos[currentId] = { title: firstMsg, messages: [] };
      }
      convos[currentId].messages = currentConversation;
      saveConversations(convos);
      renderConversations();

      setHeroStatus("Ready");
    } catch (error) {
      addBubble("Error: " + error.message, "error");
      setHeroStatus("Error occurred");
    } finally {
      isBusy = false;
      updateSendState();
    }
  }

  chatInput.addEventListener("input", () => {
    autoGrow();
    updateSendState();
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });

  sendBtn.addEventListener("click", () => {
    sendMessage(chatInput.value);
  });

  // ==================== VOICE INPUT ====================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isListening = true;
      voiceBtn.classList.add("active");
      setHeroStatus("Listening...");
    };

    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove("active");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatInput.value = transcript;
      autoGrow();
      updateSendState();
      sendMessage(transcript);
    };

    recognition.onerror = () => {
      isListening = false;
      voiceBtn.classList.remove("active");
      setHeroStatus("Voice input failed");
    };
  }

  voiceBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (_) {}
    }
  });

  // ==================== SETTINGS ====================
  sidebarSettingsBtn.addEventListener("click", () => {
    settingsUrlInput.value = getOllamaUrl();
    tempSlider.value = getTemperature();
    document.getElementById("temp-value").textContent = getTemperature();
    maxTokensInput.value = getMaxTokens();
    settingsModal.classList.remove("hidden");

    // Populate model select
    if (availableModels.length === 0) {
      checkOllamaConnection().then(result => {
        if (result.success) {
          settingsModelSelect.innerHTML = result.models
            .map(m => `<option value="${m}" ${m === getModel() ? "selected" : ""}>${m}</option>`)
            .join("");
        }
      });
    } else {
      settingsModelSelect.innerHTML = availableModels
        .map(m => `<option value="${m}" ${m === getModel() ? "selected" : ""}>${m}</option>`)
        .join("");
    }
  });

  tempSlider.addEventListener("input", (e) => {
    document.getElementById("temp-value").textContent = e.target.value;
  });

  saveSettingsBtn.addEventListener("click", () => {
    if (settingsUrlInput.value.trim()) {
      setOllamaUrl(settingsUrlInput.value.trim());
    }
    setTemperature(parseFloat(tempSlider.value));
    setMaxTokens(parseInt(maxTokensInput.value));
    const selected = settingsModelSelect.value;
    if (selected) {
      setModel(selected);
      updateModelBadge();
    }
    settingsModal.classList.add("hidden");
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Clear all conversations?")) {
      localStorage.removeItem(STORAGE_CONVERSATIONS);
      localStorage.removeItem(STORAGE_CURRENT_CONVO);
      currentConversation = [];
      renderConversations();
      renderChat();
    }
  });

  // ==================== EXPORT ====================
  sidebarExportBtn.addEventListener("click", () => {
    exportModal.classList.remove("hidden");
  });

  document.getElementById("close-export").addEventListener("click", () => {
    exportModal.classList.add("hidden");
  });

  exportJsonBtn.addEventListener("click", () => {
    const data = JSON.stringify(currentConversation, null, 2);
    downloadFile(data, "conversation.json", "application/json");
  });

  exportMdBtn.addEventListener("click", () => {
    let md = "# Conversation\n\n";
    currentConversation.forEach(msg => {
      const role = msg.role === "user" ? "**You**" : "**Assistant**";
      md += `${role}:\n${msg.text}\n\n`;
    });
    downloadFile(md, "conversation.md", "text/markdown");
  });

  exportTxtBtn.addEventListener("click", () => {
    let txt = "CONVERSATION\n\n";
    currentConversation.forEach(msg => {
      const role = msg.role === "user" ? "You: " : "Assistant: ";
      txt += role + msg.text + "\n\n";
    });
    downloadFile(txt, "conversation.txt", "text/plain");
  });

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    exportModal.classList.add("hidden");
  }

  // ==================== CONVERSATIONS ====================
  newConvoBtn.addEventListener("click", () => {
    const id = "convo_" + Date.now();
    const convos = getConversations();
    convos[id] = { title: "New Chat", messages: [] };
    saveConversations(convos);
    setCurrentConvoId(id);
    currentConversation = [];
    renderConversations();
    renderChat();
  });

  // ==================== THEME ====================
  themeToggleBtn.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.style.colorScheme = currentTheme;
    themeToggleBtn.textContent = currentTheme === "dark" ? "☀️" : "🌙";
  });

  // ==================== INIT ====================
  window.addEventListener("load", async () => {
    if (getOllamaUrl()) {
      const result = await checkOllamaConnection();
      if (result.success && result.models.length > 0) {
        showApp();
        updateModelBadge();
        renderConversations();
        renderChat();
        updateSendState();
      } else {
        showSetup();
      }
    } else {
      showSetup();
    }
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
