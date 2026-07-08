(() => {
  "use strict";

  // =========================================================================
  // 1. CSS STYLES INJECTION (ඇනිමේෂන් සහ ස්ටයිල්ස්)
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
      background: #262a33;
      min-height: 200px;
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

    /* --- බලහත්කාරයෙන් ඇනිමේෂන් ක්‍රියාත්මක කරන Keyframes --- */
    @keyframes upgradedThinkingGlow {
      0%, 100% { box-shadow: 0 0 15px rgba(255, 194, 76, 0.4); transform: scale(1); }
      50% { box-shadow: 0 0 30px rgba(255, 194, 76, 0.8); transform: scale(1.03); }
    }

    @keyframes upgradedImageGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(76, 141, 255, 0.5); transform: scale(1) rotate(0deg); }
      50% { box-shadow: 0 0 40px rgba(76, 141, 255, 0.9); transform: scale(1.08) rotate(180deg); }
    }

    @keyframes upgradeFadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleEl);

  // =========================================================================
  // 2. CORE LOGIC INTERCEPTOR
  // =========================================================================
  const transcriptEl = document.getElementById("transcript");
  const heroOrb = document.getElementById("hero-orb");
  const heroStatus = document.getElementById("hero-status");

  function scrollToBottom() {
    if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  // --- Orb එකට Thinking ඇනිමේෂන් එක දැමීම ---
  function startThinkingAnimation() {
    if (heroOrb) {
      heroOrb.style.animation = "upgradedThinkingGlow 1.2s infinite ease-in-out";
      heroOrb.style.border = "2px solid var(--amber)";
    }
  }

  // --- Orb එකට Image Generating ඇනිමේෂන් එක දැමීම ---
  function startImageAnimation() {
    if (heroOrb) {
      heroOrb.style.animation = "upgradedImageGlow 1.5s infinite ease-in-out";
      heroOrb.style.border = "2px solid var(--blue)";
    }
  }

  // --- ඇනිමේෂන් නවතා පරණ තත්වයට පත් කිරීම ---
  function resetOrbAnimation() {
    if (heroOrb) {
      heroOrb.style.animation = "";
      heroOrb.style.border = "";
      // මුල් script.js එකේ තියෙන default බ්‍රීදින්ග් එකට ඉඩ දීම
      if (heroOrb.classList.contains("listening")) {
        heroOrb.style.animation = "pulse 1.5s infinite ease-in-out";
      }
    }
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
    startThinkingAnimation(); // 👈 ඇනිමේෂන් එක පටන් ගන්නවා
  }

  function updateThinkingContent(text) {
    const box = document.querySelector("#current-thought .thought-content");
    if (box) box.textContent = text;
  }

  function finalizeThinking() {
    const box = document.getElementById("current-thought");
    if (box) box.id = ""; 
    resetOrbAnimation(); // 👈 ඇනිමේෂන් එක නවත්වනවා
  }

  // --- Image Generation ක්‍රියාවලිය ---
  async function generateImage(promptText) {
    startImageAnimation(); // 👈 Image Pulse ඇනිමේෂන් එක පටන් ගන්නවා
    heroStatus.textContent = "Creating your image...";

    const emptyState = document.getElementById("empty-state");
    if (emptyState) emptyState.remove();

    const imageBubble = document.createElement("div");
    imageBubble.className = "bubble image-bubble";
    const uniqueId = "img-" + Date.now();
    imageBubble.innerHTML = `<div style="color:var(--text-dim); font-size:14px; padding:6px;">🎨 Generating: "${promptText}"...</div>`;
    transcriptEl.appendChild(imageBubble);
    scrollToBottom();

    try {
      const cleanPrompt = encodeURIComponent(promptText.toLowerCase().replace("generate image", "").replace("create image", "").trim());
      const imgSrc = `https://image.pollinations.ai/p/${cleanPrompt}?width=512&height=512&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;

      const imgCheck = new Image();
      imgCheck.src = imgSrc;
      
      imgCheck.onload = () => {
        imageBubble.innerHTML = `
          <img src="${imgSrc}" class="generated-image" alt="AI Generated Image" />
          <button class="image-download-btn" id="dl-${uniqueId}">💾 Download Image</button>
        `;

        document.getElementById(`dl-${uniqueId}`)?.addEventListener("click", async () => {
          try {
            const response = await fetch(imgSrc);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = "neo-art.jpg";
            a.click();
            window.URL.revokeObjectURL(blobUrl);
          } catch (e) {
            window.open(imgSrc, '_blank');
          }
        });
        
        resetOrbAnimation(); // 👈 ඇනිමේෂන් එක රීසෙට් කරනවා
        heroStatus.textContent = "Tap the mic and say something";
        scrollToBottom();
      };

      imgCheck.onerror = () => {
        throw new Error("Image source failed to load.");
      };

    } catch (err) {
      imageBubble.className = "bubble error";
      imageBubble.textContent = "Image Generation Failed. Please try another prompt.";
      resetOrbAnimation();
      heroStatus.textContent = "Tap the mic and say something";
      scrollToBottom();
    }
  }

  // --- sendMessage Intercept කිරීම ---
  const originalSendMessage = window.sendMessage;

  window.sendMessage = async function(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const imageKeywords = ["generate image", "create image", "draw", "make a picture", "generate a photo", "පินතූරයක් හදන්න", "රූපයක් නිර්මාණය කරන්න"];
    const isImageRequest = imageKeywords.some(keyword => trimmed.toLowerCase().includes(keyword));

    if (isImageRequest) {
      const emptyState = document.getElementById("empty-state");
      if (emptyState) emptyState.remove();
      
      const userBubble = document.createElement("div");
      userBubble.className = "bubble user";
      userBubble.textContent = trimmed;
      transcriptEl.appendChild(userBubble);
      
      const textInput = document.getElementById("text-input");
      if (textInput) {
        textInput.value = "";
        textInput.style.height = "auto";
      }

      await generateImage(trimmed);
    } else {
      showThinkingProcess("Analyzing context and aligning core nodes...");
      
      setTimeout(() => {
        updateThinkingContent("Drafting the most accurate concise response...");
      }, 900);

      if (originalSendMessage) {
        await originalSendMessage(text);
      }
      
      finalizeThinking();
    }
  };

})();
