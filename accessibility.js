/* =========================================================
   ACESSIBILIDADE (LIBRAS, AUDIODESCRIÇÃO, DALTONISMO) + reCAPTCHA
   ========================================================= */

const A11Y_STORAGE_KEY = "escoamento_certo_a11y_v1";
const RECAPTCHA_SITE_KEY = window.RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

function getA11ySessionId() {
  let sid = localStorage.getItem("escoamento_certo_sid");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem("escoamento_certo_sid", sid);
  }
  return sid;
}

function getA11yPrefs() {
  const defaults = {
    colorBlindMode: "none",
    audioDescription: false,
    librasEnabled: false
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(A11Y_STORAGE_KEY) || "{}") };
  } catch (_) {
    return defaults;
  }
}

function applyA11yPrefs(prefs) {
  document.body.classList.remove(
    "cb-protanopia",
    "cb-deuteranopia",
    "cb-tritanopia",
    "cb-high-contrast"
  );
  if (prefs.colorBlindMode && prefs.colorBlindMode !== "none") {
    document.body.classList.add("cb-" + prefs.colorBlindMode);
  }

  document.querySelectorAll(".audio-desc-box").forEach(el => {
    el.classList.toggle("hidden", !prefs.audioDescription);
  });

  const librasPanel = document.getElementById("libras-assistant-panel");
  if (librasPanel) {
    librasPanel.classList.toggle("hidden", !prefs.librasEnabled);
  }
}

async function saveA11yPrefs(partial) {
  const current = getA11yPrefs();
  const next = { ...current, ...partial };
  localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
  applyA11yPrefs(next);

  const apiBase = window.API_BASE || "http://127.0.0.1:8000";
  try {
    await fetch(`${apiBase}/api/accessibility/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getA11ySessionId(),
        colorBlindMode: next.colorBlindMode,
        audioDescription: next.audioDescription,
        librasEnabled: next.librasEnabled
      })
    });
  } catch (_) {
    // Mantém preferência local caso o backend esteja offline
  }
}

function updateSpeechButtons(state) {
  const playBtn = document.getElementById("btn-play-pause-speech");
  const stopBtn = document.getElementById("btn-stop-speech");
  if (!playBtn || !stopBtn) return;

  if (state === "speaking") {
    playBtn.textContent = "⏸ Pausar";
    playBtn.setAttribute("aria-pressed", "true");
    stopBtn.classList.remove("hidden");
  } else if (state === "paused") {
    playBtn.textContent = "▶ Continuar";
    playBtn.setAttribute("aria-pressed", "true");
    stopBtn.classList.remove("hidden");
  } else {
    playBtn.textContent = "▶ Ler Tela";
    playBtn.setAttribute("aria-pressed", "false");
    stopBtn.classList.add("hidden");
  }
}

function stopSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  updateSpeechButtons("idle");
}

function pickPortugueseVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  return (
    voices.find(v => v.lang && v.lang.toLowerCase().startsWith("pt-br")) ||
    voices.find(v => v.lang && v.lang.toLowerCase().startsWith("pt")) ||
    null
  );
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("Seu navegador não suporta leitura em voz alta. Texto: " + text);
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const ptVoice = pickPortugueseVoice();
  if (ptVoice) {
    utter.voice = ptVoice;
  }
  utter.lang = "pt-BR";
  utter.rate = 1.0;

  utter.onstart = () => updateSpeechButtons("speaking");
  utter.onend = () => updateSpeechButtons("idle");
  utter.onerror = (ev) => {
    if (ev.error !== "interrupted" && ev.error !== "canceled") {
      console.warn("Erro na leitura por voz:", ev.error);
    }
    updateSpeechButtons("idle");
  };

  setTimeout(() => {
    synth.speak(utter);
    updateSpeechButtons("speaking");
  }, 50);
}

function togglePlayPauseSpeech() {
  if (!("speechSynthesis" in window)) {
    const main = document.querySelector("main");
    const txt = main ? main.innerText.replace(/\s+/g, " ").trim().slice(0, 1200) : "";
    alert("Seu navegador não suporta leitura em voz alta. Texto: " + txt);
    return;
  }

  const synth = window.speechSynthesis;

  if (synth.speaking && !synth.paused) {
    synth.pause();
    updateSpeechButtons("paused");
    return;
  }

  if (synth.paused) {
    synth.resume();
    updateSpeechButtons("speaking");
    return;
  }

  const main = document.querySelector("main");
  const rawText = main ? main.innerText : document.body.innerText;
  const cleanText = (rawText || "").replace(/\s+/g, " ").trim().slice(0, 1200);

  if (!cleanText) {
    alert("Não há texto visível para ler nesta tela.");
    return;
  }

  speakText("Audiodescrição da tela. " + cleanText);
}

function renderAccessibilityBar() {
  if (document.querySelector(".a11y-bar")) return;

  const prefs = getA11yPrefs();
  const bar = document.createElement("div");
  bar.className = "a11y-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Barra de Acessibilidade");

  bar.innerHTML = `
    <div class="a11y-bar-inner">
      <span><strong>Acessibilidade:</strong> Libras, Audiodescrição e Daltonismo</span>
      <div class="a11y-controls">
        <label for="a11y-color-mode" class="hidden">Modo de cores e daltonismo</label>
        <select id="a11y-color-mode" class="a11y-select" onchange="saveA11yPrefs({ colorBlindMode: this.value })">
          <option value="none" ${prefs.colorBlindMode === "none" ? "selected" : ""}>Cores Padrão</option>
          <option value="deuteranopia" ${prefs.colorBlindMode === "deuteranopia" ? "selected" : ""}>Daltonismo: Deuteranopia</option>
          <option value="protanopia" ${prefs.colorBlindMode === "protanopia" ? "selected" : ""}>Daltonismo: Protanopia</option>
          <option value="tritanopia" ${prefs.colorBlindMode === "tritanopia" ? "selected" : ""}>Daltonismo: Tritanopia</option>
          <option value="high-contrast" ${prefs.colorBlindMode === "high-contrast" ? "selected" : ""}>Alto Contraste</option>
        </select>

        <button
          type="button"
          id="btn-toggle-audiodesc"
          class="a11y-btn"
          aria-pressed="${prefs.audioDescription}"
          onclick="toggleAudioDesc()"
        >
          🔊 Audiodescrição
        </button>

        <button
          type="button"
          id="btn-play-pause-speech"
          class="a11y-btn"
          aria-pressed="false"
          onclick="togglePlayPauseSpeech()"
          title="Ler, pausar ou continuar a leitura da tela"
        >
          ▶ Ler Tela
        </button>

        <button
          type="button"
          id="btn-stop-speech"
          class="a11y-btn hidden"
          onclick="stopSpeech()"
          title="Parar leitura da tela"
        >
          ⏹ Parar
        </button>

        <button
          type="button"
          id="btn-toggle-libras"
          class="a11y-btn"
          aria-pressed="${prefs.librasEnabled}"
          onclick="toggleLibras()"
        >
          🤟 Libras
        </button>
      </div>
    </div>
  `;

  document.body.insertBefore(bar, document.body.firstChild);

  if (!document.getElementById("libras-assistant-panel")) {
    const librasBox = document.createElement("aside");
    librasBox.id = "libras-assistant-panel";
    librasBox.className = "libras-panel" + (prefs.librasEnabled ? "" : " hidden");
    librasBox.setAttribute("aria-label", "Assistente de Tradução em Libras");
    librasBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
        <strong style="font-size:0.9rem;color:var(--brand-primary);">🤟 Intérprete Virtual Libras</strong>
        <button type="button" class="a11y-btn" style="color:#0f172a;background:#e2e8f0;" onclick="toggleLibras()">✕</button>
      </div>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.5rem;">
        Janela de apoio em Libras ativa. Utilize também o widget VLibras no canto da tela para tradução em língua de sinais.
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:0.65rem;font-size:0.8rem;font-weight:700;color:#0f172a;">
        Sinal ativo: "Alerta de nível do rio e limpeza preventiva de ralo"
      </div>
    `;
    document.body.appendChild(librasBox);
  }

  if (!document.querySelector('script[src*="vlibras.gov.br"]')) {
    const vw = document.createElement("div");
    vw.setAttribute("vw", "");
    vw.className = "enabled";
    vw.innerHTML = `
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
    `;
    document.body.appendChild(vw);

    const s = document.createElement("script");
    s.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    s.async = true;
    s.onload = () => {
      if (window.VLibras) {
        new window.VLibras.Widget("https://vlibras.gov.br/app");
      }
    };
    document.body.appendChild(s);
  }

  if ("speechSynthesis" in window && typeof window.speechSynthesis.getVoices === "function") {
    window.speechSynthesis.getVoices();
  }

  applyA11yPrefs(prefs);
}

function toggleAudioDesc() {
  const next = !getA11yPrefs().audioDescription;
  document.getElementById("btn-toggle-audiodesc").setAttribute("aria-pressed", String(next));
  saveA11yPrefs({ audioDescription: next });
}

function toggleLibras() {
  const next = !getA11yPrefs().librasEnabled;
  document.getElementById("btn-toggle-libras").setAttribute("aria-pressed", String(next));
  saveA11yPrefs({ librasEnabled: next });
}

function mountRecaptchaWidget(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="g-recaptcha" data-sitekey="${RECAPTCHA_SITE_KEY}"></div>
    <span class="form-hint">Proteção anti-spam via reCAPTCHA.</span>
  `;
  if (!document.querySelector('script[src*="google.com/recaptcha/api.js"]')) {
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
}

function getRecaptchaResponseToken() {
  if (window.grecaptcha && typeof window.grecaptcha.getResponse === "function") {
    return window.grecaptcha.getResponse();
  }
  return "dev-bypass-token";
}

window.addEventListener("beforeunload", stopSpeech);
document.addEventListener("DOMContentLoaded", renderAccessibilityBar);