(() => {
  "use strict";

  // =========================================================================
  // 1. CSS STYLES INJECTION (ෆයිල් එක රන් වෙනකොට ස්ටයිල්ස් ටික auto එකතු වෙනවා)
  // =========================================================================
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    /* --- Thought Process Box --- */
    .thought-box {
      align-self: flex-start;
      background: #1a1d24;
      border-left: 3px solid var(--amber);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--text-dim);
      max-width: 82%;
      margin-bottom: 4px;
      font-style: italic;
      animation: upgradeFadeIn 0.3s ease-in-out;
    }
    .thought-box strong {
      color: var(--amber);
      font-style: normal;
      display: block;
      margin-bottom: 4px;
    }

    /* --- Image Bubble Style --- */
    .bubble.image-bubble {
      align-self: flex-start;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 8px;
      border-radius: var(--radius-md);
      max-width: 82%;
    }
    .generated-image {
      width: 100%;
      max-width: 300px;
      border-radius: 10px;
      display: block;
      margin-bottom: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .image-download-btn {
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      text-align: center;
      transition: background 0.2s;
    }
    .image-download-btn:hover {
      background: var(--border);
    }

    /* --- Advanced Orb Glowing & Animations --- */
    .orb.thinking {
      box-shadow: 0 0 25px rgba(255, 194, 76, 0.5);
      transition: box-shadow 0.3s ease;
    }
    .orb.generating-image {
      animation: imagePulse 1.5s infinite ease-in-out;
      box-shadow: 0 0 25px rgba(76, 141, 255, 0.6);
    }

    @keyframes imagePulse {
      0%, 100% { transform: scale(1); filter: hue-rotate(0deg); }
      50% { transform: scale(1.06); filter: hue-rotate(30deg); }
    }
    @keyframes upgradeFadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleEl);

  // =========================================================================
  // 2. CORE LOGIC INTERCEPTOR (මුල් script.js එක වෙනස් නොකර මැදින් සම්බන්ධ වීම)
  // =========================================================================
  const transcriptEl = document.getElementById("transcript");
  const heroOrb = document.getElementById("hero-orb");
  const heroStatus = document.getElementById("hero-status");

  function scrollToBottom() {
    if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  // --- Thinking Process පෙන්වීම ---
  function showThinkingProcess(text) {
    const emptyState = document.getElementById("empty-state");
    if (emptyState) emptyState.remove();
    
    const thoughtBox = document.createElement("div");
    thoughtBox.className = "thought-box";
    thoughtBox.id = "current-thought";
    thoughtBox.innerHTML = `<strong>Thinking Process...</strong> <span class="thought-content">${text}</span>`;
    
    transcriptEl.appendChild(thoughtBox);
    scrollToBottom();
  }

  function updateThinkingContent(text) {
    const box = document.querySelector("#current-thought .thought-content");
    if (box) box.textContent = text;
  }

  function finalizeThinking() {
    const box = document.getElementById("current-thought");
    if (box) box.id = ""; 
  }

  // --- Imagen 3 හරහා රූප නිර්මාණය ---
  async function generateImage(promptText) {
    const apiKey = localStorage.getItem("neo24_api_key");
    if (!apiKey) return;

    // Orb එක Image Generating ස්ටේට් එකට හැරවීම සහ ඇනිමේෂන් පණ ගැන්වීම
    heroOrb.classList.add("generating-image");
    heroStatus.textContent = "Creating your image...";

    const emptyState = document.getElementById("empty-state");
    if (emptyState) emptyState.remove();

    // චැට් එකට Placeholder එකක් දැමීම
    const imageBubble = document.createElement("div");
    imageBubble.className = "bubble image-bubble";
    imageBubble.innerHTML = `<div style="color:var(--text-dim); font-size:14px; padding:6px;">🎨 Generating: "${promptText}"...</div>`;
    transcriptEl.appendChild(imageBubble);
    scrollToBottom();

    try {
      // Google Imagen 3 API එක භාවිතා කිරීම
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          prompt: promptText,
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to generate image");

      const base64Data = data.generatedImages[0].image.imageBytes;
      const imgSrc = `data:image/jpeg;base64,${base64Data}`;

      // සාර්ථකව ඉමේජ් එක ලැබුණු පසු බබල් එක අප්ඩේට් කිරීම
      imageBubble.innerHTML = `
        <img src="${imgSrc}" class="generated-image" alt="AI Generated Image" />
        <button class="image-download-btn" id="dl-${Date.now()}">💾 Download Image</button>
      `;

      // ඩවුන්ලෝඩ් බටන් එක ක්‍රියාත්මක කිරීම
      document.getElementById(`dl-${Date.now()}`)?.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = imgSrc;
        a.download = "neo-art.jpg";
        a.click();
      });

    } catch (err) {
      imageBubble.className = "bubble error";
      imageBubble.textContent = "Image Generation Failed: " + err.message;
    } finally {
      heroOrb.classList.remove("generating-image");
      heroStatus.textContent = "Tap the mic and say something";
      scrollToBottom();
    }
  }

  // --- මුල් ක්‍රියාවලිය (sendMessage) Intercept කර පාලනය කිරීම ---
  const originalSendMessage = window.sendMessage;

  window.sendMessage = async function(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Image එකක් හදන්න කියන සිංහල/ඉංග්‍රීසි Keywords තිබේදැයි බැලීම
    const imageKeywords = ["generate image", "create image", "draw", "make a picture", "generate a photo", "පින්තූරයක් හදන්න", "රූපයක් නිර්මාණය කරන්න"];
    const isImageRequest = imageKeywords.some(keyword => trimmed.toLowerCase().includes(keyword));

    if (isImageRequest) {
      // පරිශීලකයාගේ ඉල්ලීම චැට් එකට ඇතුලත් කිරීම
      const emptyState = document.getElementById("empty-state");
      if (emptyState) emptyState.remove();
      
      const userBubble = document.createElement("div");
      userBubble.className = "bubble user";
      userBubble.textContent = trimmed;
      transcriptEl.appendChild(userBubble);
      
      // ඉන්පුට් බොක්ස් එක හිස් කිරීම
      const textInput = document.getElementById("text-input");
      if (textInput) {
        textInput.value = "";
        textInput.style.height = "auto";
      }

      await generateImage(trimmed);
    } else {
      // සාමාන්‍ය ප්‍රශ්නයක් නම්, AI එක උත්තරය දෙනතෙක් "Thinking Process" එකක් මවා පෙන්වීම
      showThinkingProcess("Analyzing context and aligning core nodes...");
      
      setTimeout(() => {
        updateThinkingContent("Drafting the most accurate concise response...");
      }, 900);

      // මුල් script.js එකේ sendMessage එක ක්‍රියාත්මක කරවීම
      if (originalSendMessage) {
        await originalSendMessage(text);
      }
      
      finalizeThinking();
    }
  };

})();
