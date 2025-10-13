// renderer.js - WebRTC Audio Out con WHEP y persistencia de configuración

(async () => {
  const audioEl = document.getElementById("audio");
  const stEl = document.getElementById("st");
  const devEl = document.getElementById("dev");
  const outSel = document.getElementById("outSel");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const urlInput = document.getElementById("urlInput");
  const btnRefresh = document.getElementById("btnRefresh");
  const btnConnect = document.getElementById("btnConnect");
  const btnTest = document.getElementById("btnTest");

  // Volumeter estéreo - Canvas y contextos
  const volumeterCanvasLeft = document.getElementById("volumeterLeft");
  const volumeterCanvasRight = document.getElementById("volumeterRight");
  const volumeterValueLeft = document.getElementById("volumeterValueLeft");
  const volumeterValueRight = document.getElementById("volumeterValueRight");
  const volumeterCtxLeft = volumeterCanvasLeft.getContext("2d");
  const volumeterCtxRight = volumeterCanvasRight.getContext("2d");

  const btnStreamInfo = document.getElementById("btnStreamInfo");
  const streamInfoModal = document.getElementById("streamInfoModal");
  const closeModal = document.getElementById("closeModal");
  const btnSettings = document.getElementById("btnSettings");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsModal = document.getElementById("closeSettingsModal");
  const btnPlugins = document.getElementById("btnPlugins");
  const pluginsModal = document.getElementById("pluginsModal");
  const closePluginsModal = document.getElementById("closePluginsModal");
  const autostartToggle = document.getElementById("autostartToggle");
  const debugToggle = document.getElementById("debugToggle");
  const autoConnectToggle = document.getElementById("autoConnectToggle");
  const fontSizeBtns = document.querySelectorAll(".font-size-btn");

  // Configuración por defecto
  const DEFAULT_WHEP_URL =
    "https://example.com:1935/rtc/v1/whep/?app=live&stream=audiostream";
  const DEFAULT_RECONNECT_MS = 3000;
  const DEFAULT_VOLUME = 100;
  const DEFAULT_DEBUG = false;
  const DEFAULT_AUTO_CONNECT = false;

  let WHEP_URL = "";
  let RECONNECT_MS = DEFAULT_RECONNECT_MS;
  let VOLUME = DEFAULT_VOLUME;
  let DEBUG_MODE = DEFAULT_DEBUG;
  let AUTO_CONNECT = DEFAULT_AUTO_CONNECT;
  let pc = null;
  let abortReconnect = false;

  // AudioContext para control de volumen
  let audioCtx = null;
  let gainNode = null;
  let sourceNode = null;
  let destinationNode = null; // MediaStreamDestination para setSinkId
  let isAudioSetup = false; // Flag para evitar recrear MediaElementSource

  // Para análisis de volumen (volumeter estéreo)
  let analyserNodeLeft = null;
  let analyserNodeRight = null;
  let splitterNode = null;
  let volumeterAnimationId = null;

  // Para complementos de audio
  let eqNodes = []; // Array de 10 filtros para ecualizador
  let compressorNode = null;
  let limiterNode = null;
  let delayNode = null;
  let delayFeedback = null;
  let delayWetGain = null;
  let delayDryGain = null;

  // Para "Probar tono"
  let testCtx = null,
    testOsc = null,
    testGain = null,
    prevStream = null;

  // ========== FUNCIONES DE DEBUG ==========
  function debugLog(...args) {
    if (DEBUG_MODE) {
      console.log(...args);
    }
  }

  function debugWarn(...args) {
    if (DEBUG_MODE) {
      console.warn(...args);
    }
  }

  function debugError(...args) {
    // Los errores siempre se muestran
    console.error(...args);
  }

  // Cargar configuración guardada
  async function loadConfig() {
    try {
      const savedUrl = await window.webrtcCfg.get("WHEP_URL", DEFAULT_WHEP_URL);
      const savedReconnect = await window.webrtcCfg.get(
        "RECONNECT_MS",
        String(DEFAULT_RECONNECT_MS)
      );
      const savedVolume = await window.webrtcCfg.get(
        "VOLUME",
        String(DEFAULT_VOLUME)
      );
      const savedDebug = await window.webrtcCfg.get(
        "DEBUG_MODE",
        String(DEFAULT_DEBUG)
      );
      const savedAutoConnect = await window.webrtcCfg.get(
        "AUTO_CONNECT",
        String(DEFAULT_AUTO_CONNECT)
      );

      WHEP_URL = savedUrl;
      RECONNECT_MS = parseInt(savedReconnect, 10);
      VOLUME = parseInt(savedVolume, 10);
      DEBUG_MODE = savedDebug === "true" || savedDebug === true;
      AUTO_CONNECT = savedAutoConnect === "true" || savedAutoConnect === true;

      urlInput.value = WHEP_URL;
      volumeSlider.value = VOLUME;
      debugToggle.checked = DEBUG_MODE;
      autoConnectToggle.checked = AUTO_CONNECT;
      updateVolumeDisplay();

      if (DEBUG_MODE) {
        console.log("🔍 Modo Debug ACTIVADO");
      }
    } catch (e) {
      console.error("Error al cargar config:", e);
      WHEP_URL = DEFAULT_WHEP_URL;
      VOLUME = DEFAULT_VOLUME;
      DEBUG_MODE = DEFAULT_DEBUG;
      AUTO_CONNECT = DEFAULT_AUTO_CONNECT;
      urlInput.value = WHEP_URL;
      volumeSlider.value = VOLUME;
      debugToggle.checked = DEBUG_MODE;
      autoConnectToggle.checked = AUTO_CONNECT;
      updateVolumeDisplay();
    }
  }

  // Guardar URL cuando cambie
  urlInput.addEventListener("blur", async () => {
    const newUrl = urlInput.value.trim();
    if (newUrl) {
      WHEP_URL = newUrl;
      await window.webrtcCfg.set("WHEP_URL", WHEP_URL);
      setStatus("URL guardada", "ok");
      setTimeout(() => {
        if (!pc) setStatus("desconectado", "muted");
      }, 2000);
    }
  });

  urlInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      urlInput.blur();
    }
  });

  // Control de volumen
  volumeSlider.addEventListener("input", () => {
    VOLUME = parseInt(volumeSlider.value, 10);
    updateVolumeDisplay();
    applyVolume();
  });

  volumeSlider.addEventListener("change", async () => {
    await window.webrtcCfg.set("VOLUME", String(VOLUME));
  });

  function updateVolumeDisplay() {
    volumeValue.textContent = `${VOLUME}%`;
    // Cambiar color si está por encima del 100%
    if (VOLUME > 100) {
      volumeValue.classList.add("high");
    } else {
      volumeValue.classList.remove("high");
    }
  }

  // === Funciones del Volumeter Estéreo ===
  // Canal izquierdo
  let currentLevelLeft = 0;
  let peakLevelLeft = 0;
  let peakHoldTimeLeft = 0;
  let currentDbLeft = -Infinity;
  let peakDbLeft = -Infinity;

  // Canal derecho
  let currentLevelRight = 0;
  let peakLevelRight = 0;
  let peakHoldTimeRight = 0;
  let currentDbRight = -Infinity;
  let peakDbRight = -Infinity;

  function startVolumeter() {
    if (volumeterAnimationId || !analyserNodeLeft || !analyserNodeRight) {
      debugLog("Volumeter ya iniciado o analyserNodes no disponibles");
      return;
    }

    const bufferLength = analyserNodeLeft.fftSize;
    const dataArrayLeft = new Uint8Array(bufferLength);
    const dataArrayRight = new Uint8Array(bufferLength);

    // Resetear valores de suavizado
    currentLevelLeft = 0;
    peakLevelLeft = 0;
    peakHoldTimeLeft = 0;
    currentDbLeft = -Infinity;
    peakDbLeft = -Infinity;

    currentLevelRight = 0;
    peakLevelRight = 0;
    peakHoldTimeRight = 0;
    currentDbRight = -Infinity;
    peakDbRight = -Infinity;

    debugLog("Volumeter estéreo iniciado - Buffer length:", bufferLength);

    function draw() {
      volumeterAnimationId = requestAnimationFrame(draw);

      // Obtener datos de ambos canales
      analyserNodeLeft.getByteTimeDomainData(dataArrayLeft);
      analyserNodeRight.getByteTimeDomainData(dataArrayRight);

      // Debug: Ver primeros valores del array
      if (DEBUG_MODE && Math.random() < 0.002) {
        debugLog(
          "Left channel sample:",
          Array.from(dataArrayLeft.slice(0, 5)),
          "Right channel sample:",
          Array.from(dataArrayRight.slice(0, 5))
        );
      }

      // ========== CANAL IZQUIERDO ==========
      let sumLeft = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArrayLeft[i] - 128) / 128;
        sumLeft += normalized * normalized;
      }
      const rmsLeft = Math.sqrt(sumLeft / bufferLength);
      const instantLevelLeft = Math.min(rmsLeft * 5, 1.0);

      // Suavizado exponencial
      const smoothingFactorLeft =
        instantLevelLeft > currentLevelLeft ? 0.3 : 0.1;
      currentLevelLeft =
        currentLevelLeft * (1 - smoothingFactorLeft) +
        instantLevelLeft * smoothingFactorLeft;

      // Mantener nivel de pico
      if (instantLevelLeft > peakLevelLeft) {
        peakLevelLeft = instantLevelLeft;
        peakHoldTimeLeft = 30;
      } else if (peakHoldTimeLeft > 0) {
        peakHoldTimeLeft--;
      } else {
        peakLevelLeft = peakLevelLeft * 0.95;
      }

      // Calcular dB
      let instantDbLeft = -Infinity;
      if (rmsLeft > 0.0001) {
        instantDbLeft = 20 * Math.log10(rmsLeft);
      }

      // Suavizado del valor de dB
      if (currentDbLeft === -Infinity) {
        currentDbLeft = instantDbLeft;
      } else if (instantDbLeft === -Infinity) {
        currentDbLeft = currentDbLeft * 0.92;
        if (currentDbLeft < -60) currentDbLeft = -Infinity;
      } else {
        const dbSmoothingFactorLeft =
          instantDbLeft > currentDbLeft ? 0.15 : 0.08;
        currentDbLeft =
          currentDbLeft * (1 - dbSmoothingFactorLeft) +
          instantDbLeft * dbSmoothingFactorLeft;
      }

      // Mantener pico de dB
      if (instantDbLeft > peakDbLeft || peakDbLeft === -Infinity) {
        peakDbLeft = instantDbLeft;
        peakHoldTimeLeft = 30;
      } else if (peakHoldTimeLeft > 0) {
        peakHoldTimeLeft--;
      } else {
        peakDbLeft = peakDbLeft - 0.5; // Decaimiento de 0.5 dB por frame
        if (peakDbLeft < -60) peakDbLeft = -Infinity;
      }

      // ========== CANAL DERECHO ==========
      let sumRight = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArrayRight[i] - 128) / 128;
        sumRight += normalized * normalized;
      }
      const rmsRight = Math.sqrt(sumRight / bufferLength);
      const instantLevelRight = Math.min(rmsRight * 5, 1.0);

      // Suavizado exponencial
      const smoothingFactorRight =
        instantLevelRight > currentLevelRight ? 0.3 : 0.1;
      currentLevelRight =
        currentLevelRight * (1 - smoothingFactorRight) +
        instantLevelRight * smoothingFactorRight;

      // Mantener nivel de pico
      if (instantLevelRight > peakLevelRight) {
        peakLevelRight = instantLevelRight;
        peakHoldTimeRight = 30;
      } else if (peakHoldTimeRight > 0) {
        peakHoldTimeRight--;
      } else {
        peakLevelRight = peakLevelRight * 0.95;
      }

      // Calcular dB
      let instantDbRight = -Infinity;
      if (rmsRight > 0.0001) {
        instantDbRight = 20 * Math.log10(rmsRight);
      }

      // Suavizado del valor de dB
      if (currentDbRight === -Infinity) {
        currentDbRight = instantDbRight;
      } else if (instantDbRight === -Infinity) {
        currentDbRight = currentDbRight * 0.92;
        if (currentDbRight < -60) currentDbRight = -Infinity;
      } else {
        const dbSmoothingFactorRight =
          instantDbRight > currentDbRight ? 0.15 : 0.08;
        currentDbRight =
          currentDbRight * (1 - dbSmoothingFactorRight) +
          instantDbRight * dbSmoothingFactorRight;
      }

      // Mantener pico de dB
      if (instantDbRight > peakDbRight || peakDbRight === -Infinity) {
        peakDbRight = instantDbRight;
        peakHoldTimeRight = 30;
      } else if (peakHoldTimeRight > 0) {
        peakHoldTimeRight--;
      } else {
        peakDbRight = peakDbRight - 0.5; // Decaimiento de 0.5 dB por frame
        if (peakDbRight < -60) peakDbRight = -Infinity;
      }

      // Log ocasional para debugging
      if (DEBUG_MODE && Math.random() < 0.005) {
        debugLog(
          `L: RMS=${rmsLeft.toFixed(4)}, dB=${currentDbLeft.toFixed(
            1
          )} | R: RMS=${rmsRight.toFixed(4)}, dB=${currentDbRight.toFixed(1)}`
        );
      }

      // Dibujar ambos canales
      drawVolumeter(
        volumeterCtxLeft,
        volumeterValueLeft,
        currentLevelLeft,
        peakLevelLeft,
        instantDbLeft,
        currentDbLeft,
        peakDbLeft
      );
      drawVolumeter(
        volumeterCtxRight,
        volumeterValueRight,
        currentLevelRight,
        peakLevelRight,
        instantDbRight,
        currentDbRight,
        peakDbRight
      );
    }

    draw();
  }

  function stopVolumeter() {
    if (volumeterAnimationId) {
      cancelAnimationFrame(volumeterAnimationId);
      volumeterAnimationId = null;
      clearVolumeter();
    }
  }

  function clearVolumeter() {
    const width = volumeterCanvasLeft.width;
    const height = volumeterCanvasLeft.height;

    // Limpiar canal izquierdo
    volumeterCtxLeft.fillStyle = "#151a22";
    volumeterCtxLeft.fillRect(0, 0, width, height);
    volumeterValueLeft.textContent = "-∞ dBFS";
    volumeterValueLeft.style.color = "#2ecc71";

    // Limpiar canal derecho
    volumeterCtxRight.fillStyle = "#151a22";
    volumeterCtxRight.fillRect(0, 0, width, height);
    volumeterValueRight.textContent = "-∞ dBFS";
    volumeterValueRight.style.color = "#2ecc71";
  }

  function drawVolumeter(
    ctx,
    valueElement,
    level,
    peakLevel,
    instantDb,
    displayDb,
    peakDb
  ) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Limpiar canvas
    ctx.fillStyle = "#151a22";
    ctx.fillRect(0, 0, width, height);

    // Calcular ancho de la barra basándose en dBFS, no en level
    // Rango: -60 dBFS (silencio) a 0 dBFS (máximo)
    const dbToBarWidth = (db) => {
      if (db <= -60 || db === -Infinity) return 0;
      if (db >= 0) return width;
      // Mapear -60dB a 0dB como 0% a 100%
      return width * ((db + 60) / 60);
    };

    const barWidth = dbToBarWidth(displayDb);

    // Estándares profesionales de dBFS:
    // Verde: < -12 dBFS (operación segura)
    // Amarillo: -12 a -6 dBFS (precaución)
    // Naranja: -6 a -3 dBFS (picos altos)
    // Rojo: ≥ -3 dBFS (peligro de clipping)

    // Convertir dB a posiciones en el gradiente (0 dB = 100%, -60 dB ≈ 0%)
    const dbToPosition = (dbValue) => {
      // Mapear -60dB a 0dB como 0.0 a 1.0
      return Math.max(0, Math.min(1, (dbValue + 60) / 60));
    };

    const greenEnd = dbToPosition(-12); // ~0.8 (< -12 dBFS)
    const yellowEnd = dbToPosition(-6); // ~0.9 (-12 a -6 dBFS)
    const orangeEnd = dbToPosition(-3); // ~0.95 (-6 a -3 dBFS)
    // Rojo desde orangeEnd hasta 1.0 (≥ -3 dBFS)

    // Crear gradiente con los estándares profesionales
    let gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#2ecc71"); // Verde desde el inicio
    gradient.addColorStop(greenEnd, "#2ecc71"); // Verde hasta -12 dBFS
    gradient.addColorStop(greenEnd, "#f1c40f"); // Inicio amarillo
    gradient.addColorStop(yellowEnd, "#f1c40f"); // Amarillo hasta -6 dBFS
    gradient.addColorStop(yellowEnd, "#f39c12"); // Inicio naranja
    gradient.addColorStop(orangeEnd, "#f39c12"); // Naranja hasta -3 dBFS
    gradient.addColorStop(orangeEnd, "#e74c3c"); // Inicio rojo
    gradient.addColorStop(1, "#e74c3c"); // Rojo hasta 0 dBFS

    // Dibujar barra de nivel principal
    if (barWidth > 0) {
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, Math.max(barWidth, 2), height);
    }

    // Dibujar indicador de pico (línea vertical) basado en dBFS
    const peakWidth = dbToBarWidth(peakDb);
    if (peakWidth > 0 && peakDb > displayDb) {
      // Determinar color del pico basado en peakDb
      let peakColor;
      if (peakDb >= -3) {
        peakColor = "#e74c3c"; // Rojo: ≥ -3 dBFS
      } else if (peakDb >= -6) {
        peakColor = "#f39c12"; // Naranja: -6 a -3 dBFS
      } else if (peakDb >= -12) {
        peakColor = "#f1c40f"; // Amarillo: -12 a -6 dBFS
      } else {
        peakColor = "#2ecc71"; // Verde: < -12 dBFS
      }
      ctx.fillStyle = peakColor;
      ctx.fillRect(peakWidth - 2, 0, 2, height);
    }

    // Dibujar líneas de división (cada 10%)
    ctx.strokeStyle = "#2a3240";
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Actualizar valor de dB (usar valor suavizado para el display)
    if (displayDb === -Infinity || displayDb < -60) {
      valueElement.textContent = "-∞ dBFS";
    } else {
      valueElement.textContent = `${displayDb.toFixed(1)} dBFS`;
    }

    // Cambiar color del texto según estándares dBFS (usar valor suavizado)
    if (displayDb >= -3) {
      valueElement.style.color = "#e74c3c"; // Rojo: ≥ -3 dBFS (peligro)
    } else if (displayDb >= -6) {
      valueElement.style.color = "#f39c12"; // Naranja: -6 a -3 dBFS
    } else if (displayDb >= -12) {
      valueElement.style.color = "#f1c40f"; // Amarillo: -12 a -6 dBFS
    } else {
      valueElement.style.color = "#2ecc71"; // Verde: < -12 dBFS (seguro)
    }
  }

  function clearVolumeter() {
    const widthLeft = volumeterCanvasLeft.width;
    const heightLeft = volumeterCanvasLeft.height;
    volumeterCtxLeft.fillStyle = "#151a22";
    volumeterCtxLeft.fillRect(0, 0, widthLeft, heightLeft);
    volumeterValueLeft.textContent = "-∞ dBFS";
    volumeterValueLeft.style.color = "#2ecc71";

    const widthRight = volumeterCanvasRight.width;
    const heightRight = volumeterCanvasRight.height;
    volumeterCtxRight.fillStyle = "#151a22";
    volumeterCtxRight.fillRect(0, 0, widthRight, heightRight);
    volumeterValueRight.textContent = "-∞ dBFS";
    volumeterValueRight.style.color = "#2ecc71";
  }

  function applyVolume() {
    // Control de volumen directo en el elemento de audio
    // Ya no usamos GainNode, solo el volumen HTML5
    if (audioEl) {
      // Para volumen <= 100%, usar directamente
      if (VOLUME <= 100) {
        audioEl.volume = VOLUME / 100;
      } else {
        // Para volumen > 100%, poner el elemento en 1.0
        // (no podemos amplificar sin Web Audio API completo)
        audioEl.volume = 1.0;
      }
      debugLog(
        `Volumen aplicado: ${VOLUME}% (audioEl.volume: ${audioEl.volume})`
      );
    }
  }

  // ========== COMPLEMENTOS DE AUDIO ==========

  function initAudioPlugins() {
    if (!audioCtx) {
      debugWarn("AudioContext no disponible para init plugins");
      return;
    }

    // Inicializar Ecualizador (10 bandas)
    const eqFrequencies = [
      32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
    ];
    eqNodes = eqFrequencies.map((freq) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      return filter;
    });

    // Inicializar Compresor
    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.threshold.value = -24;
    compressorNode.knee.value = 30;
    compressorNode.ratio.value = 12;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;

    // Inicializar Limitador (otro compresor con parámetros extremos)
    limiterNode = audioCtx.createDynamicsCompressor();
    limiterNode.threshold.value = -0.1;
    limiterNode.knee.value = 0;
    limiterNode.ratio.value = 20;
    limiterNode.attack.value = 0.001;
    limiterNode.release.value = 0.01;

    // Inicializar Delay/Reverb
    delayNode = audioCtx.createDelay(2.0);
    delayNode.delayTime.value = 0.5;

    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = 0.3;

    delayWetGain = audioCtx.createGain();
    delayWetGain.gain.value = 0;

    delayDryGain = audioCtx.createGain();
    delayDryGain.gain.value = 1;

    // Conectar delay feedback loop
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWetGain);

    debugLog("✅ Complementos de audio inicializados");
  }

  function reconnectAudioGraph() {
    if (!sourceNode || !gainNode || !destinationNode) {
      debugWarn("Nodos de audio no disponibles para reconectar");
      return;
    }

    try {
      // Desconectar todo primero (evitar loops o conexiones dobles)
      try {
        sourceNode.disconnect();
      } catch (e) {}
      try {
        gainNode.disconnect();
      } catch (e) {}
      if (limiterNode)
        try {
          limiterNode.disconnect();
        } catch (e) {}
      if (compressorNode)
        try {
          compressorNode.disconnect();
        } catch (e) {}
      eqNodes.forEach((node) => {
        try {
          node.disconnect();
        } catch (e) {}
      });
      if (delayNode)
        try {
          delayNode.disconnect();
        } catch (e) {}
      if (delayDryGain)
        try {
          delayDryGain.disconnect();
        } catch (e) {}
      if (delayWetGain)
        try {
          delayWetGain.disconnect();
        } catch (e) {}

      let currentNode = sourceNode;
      debugLog("🔗 Iniciando reconexión desde sourceNode");

      // Conectar EQ si está habilitado
      const eqToggleEl = document.getElementById("eqToggle");
      const eqEnabled = eqToggleEl ? eqToggleEl.checked : false;
      if (eqEnabled && eqNodes.length > 0) {
        currentNode.connect(eqNodes[0]);
        for (let i = 0; i < eqNodes.length - 1; i++) {
          eqNodes[i].connect(eqNodes[i + 1]);
        }
        currentNode = eqNodes[eqNodes.length - 1];
        debugLog("✅ EQ conectado (10 bandas)");
      }

      // Conectar Compresor si está habilitado
      const compToggleEl = document.getElementById("compressorToggle");
      const compEnabled = compToggleEl ? compToggleEl.checked : false;
      if (compEnabled && compressorNode) {
        currentNode.connect(compressorNode);
        currentNode = compressorNode;
        debugLog("✅ Compresor conectado");
      }

      // Conectar Delay/Reverb si está habilitado
      const reverbToggleEl = document.getElementById("reverbToggle");
      const reverbEnabled = reverbToggleEl ? reverbToggleEl.checked : false;
      if (reverbEnabled && delayNode && delayDryGain && delayWetGain) {
        // Dry path: currentNode → delayDryGain → gainNode
        currentNode.connect(delayDryGain);
        delayDryGain.connect(gainNode);

        // Wet path: currentNode → delayNode → delayWetGain → gainNode
        currentNode.connect(delayNode);
        delayNode.connect(delayWetGain);
        delayWetGain.connect(gainNode);

        debugLog("✅ Delay/Reverb conectado (wet+dry mix)");
      } else {
        // Sin delay: currentNode → gainNode directamente
        currentNode.connect(gainNode);
        debugLog("🔗 Ruta directa a gainNode (sin delay)");
      }

      // Conectar Limitador si está habilitado
      const limiterToggleEl = document.getElementById("limiterToggle");
      const limiterEnabled = limiterToggleEl ? limiterToggleEl.checked : false;

      let finalNode = gainNode;

      if (limiterEnabled && limiterNode) {
        gainNode.connect(limiterNode);
        finalNode = limiterNode;
        debugLog("✅ Limitador conectado");
      }

      // Conectar a audioCtx.destination (salida directa del sistema)
      finalNode.connect(audioCtx.destination);
      debugLog(
        "🔗 Conectado a audioCtx.destination (salida directa con complementos)"
      );

      // Reconectar volumeter (tap desde gainNode)
      if (splitterNode && analyserNodeLeft && analyserNodeRight) {
        try {
          // Desconectar splitter primero para evitar errores
          try {
            splitterNode.disconnect();
          } catch (e) {}

          // Reconectar: gainNode → splitter → analysers
          gainNode.connect(splitterNode);
          splitterNode.connect(analyserNodeLeft, 0);
          splitterNode.connect(analyserNodeRight, 1);
          debugLog("🔗 Volumeter reconectado (tap desde gainNode)");
        } catch (e) {
          debugError("Error reconectando volumeter:", e);
        }
      }

      debugLog("✅ Cadena de audio reconectada completamente");
    } catch (e) {
      debugError("❌ Error al reconectar cadena de audio:", e);
      // Fallback: conectar directo
      try {
        sourceNode.connect(gainNode);
        gainNode.connect(destinationNode);
        debugLog("⚠️ Fallback: sourceNode → gainNode → destinationNode");
      } catch (e2) {
        debugError("❌ Error crítico en fallback:", e2);
      }
    }
  }

  // Función para guardar configuración de complementos
  async function savePluginsConfig() {
    try {
      const config = {
        // Estados de activación
        eqEnabled: document.getElementById("eqToggle")?.checked || false,
        compressorEnabled:
          document.getElementById("compressorToggle")?.checked || false,
        limiterEnabled:
          document.getElementById("limiterToggle")?.checked || false,
        reverbEnabled:
          document.getElementById("reverbToggle")?.checked || false,

        // EQ (10 bandas)
        eq: {
          band32: parseFloat(document.getElementById("eq32")?.value || 0),
          band64: parseFloat(document.getElementById("eq64")?.value || 0),
          band125: parseFloat(document.getElementById("eq125")?.value || 0),
          band250: parseFloat(document.getElementById("eq250")?.value || 0),
          band500: parseFloat(document.getElementById("eq500")?.value || 0),
          band1k: parseFloat(document.getElementById("eq1k")?.value || 0),
          band2k: parseFloat(document.getElementById("eq2k")?.value || 0),
          band4k: parseFloat(document.getElementById("eq4k")?.value || 0),
          band8k: parseFloat(document.getElementById("eq8k")?.value || 0),
          band16k: parseFloat(document.getElementById("eq16k")?.value || 0),
        },

        // Compresor
        compressor: {
          threshold: parseFloat(
            document.getElementById("compThreshold")?.value || -24
          ),
          knee: parseFloat(document.getElementById("compKnee")?.value || 30),
          ratio: parseFloat(document.getElementById("compRatio")?.value || 12),
          attack: parseFloat(
            document.getElementById("compAttack")?.value || 0.003
          ),
          release: parseFloat(
            document.getElementById("compRelease")?.value || 0.25
          ),
        },

        // Limitador
        limiter: {
          ceiling: parseFloat(
            document.getElementById("limiterCeiling")?.value || -0.1
          ),
        },

        // Delay/Reverb
        reverb: {
          time: parseFloat(document.getElementById("delayTime")?.value || 0.5),
          feedback: parseFloat(
            document.getElementById("delayFeedback")?.value || 0.3
          ),
          mix: parseFloat(document.getElementById("reverbMix")?.value || 0),
        },
      };

      await window.webrtcCfg.set("pluginsConfig", JSON.stringify(config));
      debugLog("✅ Configuración de complementos guardada");
    } catch (e) {
      debugError("Error guardando configuración de complementos:", e);
    }
  }

  // Función para cargar configuración de complementos
  async function loadPluginsConfig() {
    try {
      const configStr = await window.webrtcCfg.get("pluginsConfig", null);
      if (!configStr) {
        debugLog("No hay configuración de complementos guardada");
        return;
      }

      const config = JSON.parse(configStr);
      debugLog("📂 Cargando configuración de complementos...");

      // Cargar estados de activación
      if (document.getElementById("eqToggle")) {
        document.getElementById("eqToggle").checked = config.eqEnabled || false;
      }
      if (document.getElementById("compressorToggle")) {
        document.getElementById("compressorToggle").checked =
          config.compressorEnabled || false;
      }
      if (document.getElementById("limiterToggle")) {
        document.getElementById("limiterToggle").checked =
          config.limiterEnabled || false;
      }
      if (document.getElementById("reverbToggle")) {
        document.getElementById("reverbToggle").checked =
          config.reverbEnabled || false;
      }

      // Cargar EQ
      if (config.eq) {
        const eqIds = [
          "eq32",
          "eq64",
          "eq125",
          "eq250",
          "eq500",
          "eq1k",
          "eq2k",
          "eq4k",
          "eq8k",
          "eq16k",
        ];
        const eqKeys = [
          "band32",
          "band64",
          "band125",
          "band250",
          "band500",
          "band1k",
          "band2k",
          "band4k",
          "band8k",
          "band16k",
        ];

        eqIds.forEach((id, index) => {
          const slider = document.getElementById(id);
          const value = config.eq[eqKeys[index]] || 0;
          if (slider) {
            slider.value = value;
            const valueSpan = slider.nextElementSibling;
            if (valueSpan) {
              valueSpan.textContent = `${value >= 0 ? "+" : ""}${value.toFixed(
                1
              )} dB`;
            }
            if (eqNodes[index]) {
              eqNodes[index].gain.value = value;
            }
          }
        });
      }

      // Cargar Compresor
      if (config.compressor) {
        if (document.getElementById("compThreshold")) {
          document.getElementById("compThreshold").value =
            config.compressor.threshold;
          document.getElementById(
            "compThresholdValue"
          ).textContent = `${config.compressor.threshold} dB`;
          if (compressorNode)
            compressorNode.threshold.value = config.compressor.threshold;
        }
        if (document.getElementById("compKnee")) {
          document.getElementById("compKnee").value = config.compressor.knee;
          document.getElementById(
            "compKneeValue"
          ).textContent = `${config.compressor.knee} dB`;
          if (compressorNode)
            compressorNode.knee.value = config.compressor.knee;
        }
        if (document.getElementById("compRatio")) {
          document.getElementById("compRatio").value = config.compressor.ratio;
          document.getElementById(
            "compRatioValue"
          ).textContent = `${config.compressor.ratio}:1`;
          if (compressorNode)
            compressorNode.ratio.value = config.compressor.ratio;
        }
        if (document.getElementById("compAttack")) {
          document.getElementById("compAttack").value =
            config.compressor.attack;
          document.getElementById("compAttackValue").textContent = `${(
            config.compressor.attack * 1000
          ).toFixed(0)} ms`;
          if (compressorNode)
            compressorNode.attack.value = config.compressor.attack;
        }
        if (document.getElementById("compRelease")) {
          document.getElementById("compRelease").value =
            config.compressor.release;
          document.getElementById("compReleaseValue").textContent = `${(
            config.compressor.release * 1000
          ).toFixed(0)} ms`;
          if (compressorNode)
            compressorNode.release.value = config.compressor.release;
        }
      }

      // Cargar Limitador
      if (config.limiter && document.getElementById("limiterCeiling")) {
        document.getElementById("limiterCeiling").value =
          config.limiter.ceiling;
        document.getElementById(
          "limiterCeilingValue"
        ).textContent = `${config.limiter.ceiling.toFixed(1)} dB`;
        if (limiterNode) limiterNode.threshold.value = config.limiter.ceiling;
      }

      // Cargar Delay/Reverb
      if (config.reverb) {
        if (document.getElementById("delayTime")) {
          document.getElementById("delayTime").value = config.reverb.time;
          document.getElementById("delayTimeValue").textContent = `${(
            config.reverb.time * 1000
          ).toFixed(0)} ms`;
          if (delayNode) delayNode.delayTime.value = config.reverb.time;
        }
        if (document.getElementById("delayFeedback")) {
          document.getElementById("delayFeedback").value =
            config.reverb.feedback;
          document.getElementById("delayFeedbackValue").textContent = `${(
            config.reverb.feedback * 100
          ).toFixed(0)}%`;
          if (delayFeedback) delayFeedback.gain.value = config.reverb.feedback;
        }
        if (document.getElementById("reverbMix")) {
          document.getElementById("reverbMix").value = config.reverb.mix;
          document.getElementById(
            "reverbMixValue"
          ).textContent = `${config.reverb.mix.toFixed(0)}%`;
          const mixValue = config.reverb.mix / 100;
          if (delayWetGain) delayWetGain.gain.value = mixValue;
          if (delayDryGain) delayDryGain.gain.value = 1 - mixValue;
        }
      }

      // Reconectar el grafo de audio con la configuración cargada
      reconnectAudioGraph();

      debugLog("✅ Configuración de complementos cargada");
    } catch (e) {
      debugError("Error cargando configuración de complementos:", e);
    }
  }

  async function setupAudioProcessing(stream) {
    try {
      debugLog("=== setupAudioProcessing iniciado ===");
      debugLog("Stream recibido:", stream);

      const audioTracks = stream.getAudioTracks();
      debugLog("Tracks de audio:", audioTracks);

      // Verificar configuración de cada track
      audioTracks.forEach((track, idx) => {
        const settings = track.getSettings();
        debugLog(`🎵 Track ${idx}:`, {
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: settings, // sampleRate, channelCount, etc.
        });

        // Listeners para detectar cambios
        track.onmute = () => debugWarn(`⚠️ Track ${idx} MUTED`);
        track.onunmute = () => debugLog(`✅ Track ${idx} UNMUTED`);
        track.onended = () => debugError(`❌ Track ${idx} ENDED`);
      });

      // PRIMERO: Configurar Web Audio API para procesamiento y análisis
      // Crear AudioContext si no existe, con soporte para sinkId
      if (!audioCtx) {
        const currentDeviceId = outSel.value || "default";

        // Intentar crear AudioContext con sinkId (característica moderna)
        try {
          const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

          // Verificar si AudioContext soporta sinkId
          if (
            AudioContextClass.prototype.hasOwnProperty("setSinkId") ||
            AudioContextClass.prototype.setSinkId
          ) {
            debugLog("✅ AudioContext soporta setSinkId!");
            audioCtx = new AudioContextClass({ sinkId: currentDeviceId });
            debugLog(`AudioContext creado con sinkId: ${currentDeviceId}`);
          } else {
            debugLog(
              "⚠️ AudioContext NO soporta setSinkId, usando constructor normal"
            );
            audioCtx = new AudioContextClass();
          }

          debugLog("AudioContext state:", audioCtx.state);
        } catch (e) {
          debugError("Error al crear AudioContext con sinkId:", e);
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          debugLog("AudioContext creado sin sinkId (fallback)");
        }

        // Inicializar complementos de audio
        initAudioPlugins();

        // Cargar configuración guardada de los complementos
        await loadPluginsConfig();
      }

      // IMPORTANTE: Desconectar y recrear nodos cada vez que hay un nuevo stream
      if (sourceNode) {
        try {
          sourceNode.disconnect();
          debugLog("SourceNode anterior desconectado");
        } catch (e) {}
      }

      if (gainNode) {
        try {
          gainNode.disconnect();
        } catch (e) {}
      }

      if (destinationNode) {
        try {
          destinationNode.disconnect();
        } catch (e) {}
      }

      // Crear MediaStreamSource desde el stream WebRTC
      sourceNode = audioCtx.createMediaStreamSource(stream);
      debugLog("MediaStreamSource creado desde stream WebRTC");

      // Crear GainNode si no existe
      if (!gainNode) {
        gainNode = audioCtx.createGain();
        gainNode.gain.value = VOLUME / 100;
        debugLog("GainNode creado");
      }

      // Crear MediaStreamDestination para poder usar setSinkId
      if (!destinationNode) {
        destinationNode = audioCtx.createMediaStreamDestination();
        debugLog("MediaStreamDestination creado");
      }

      // Verificar que el stream tenga tracks activos
      const activeTracks = stream
        .getAudioTracks()
        .filter((t) => t.readyState === "live" && t.enabled);
      debugLog(
        "Tracks activos en el stream para analyser:",
        activeTracks.length
      );
      if (activeTracks.length === 0) {
        debugWarn("⚠️ No hay tracks activos en el stream!");
      }

      // Crear AnalyserNodes y ChannelSplitter si no existen
      if (!analyserNodeLeft || !analyserNodeRight || !splitterNode) {
        // Crear el splitter para separar canales L/R
        splitterNode = audioCtx.createChannelSplitter(2);
        debugLog("ChannelSplitter creado (2 canales)");

        // Crear analyser para canal izquierdo
        analyserNodeLeft = audioCtx.createAnalyser();
        analyserNodeLeft.fftSize = 256;
        analyserNodeLeft.smoothingTimeConstant = 0.8;
        debugLog(
          "AnalyserNode LEFT creado - FFT:",
          analyserNodeLeft.fftSize,
          "Smoothing:",
          analyserNodeLeft.smoothingTimeConstant
        );

        // Crear analyser para canal derecho
        analyserNodeRight = audioCtx.createAnalyser();
        analyserNodeRight.fftSize = 256;
        analyserNodeRight.smoothingTimeConstant = 0.8;
        debugLog(
          "AnalyserNode RIGHT creado - FFT:",
          analyserNodeRight.fftSize,
          "Smoothing:",
          analyserNodeRight.smoothingTimeConstant
        );
      }

      // Asegurar que el AudioContext esté en estado running ANTES de conectar
      if (audioCtx.state === "suspended") {
        debugLog("⚠️ AudioContext suspendido, resumiendo...");
        await audioCtx.resume();
        debugLog("✅ AudioContext resumed, state:", audioCtx.state);
      }

      // CONECTAR LA CADENA DE AUDIO CON COMPLEMENTOS
      // Esto conectará: sourceNode → [EQ] → [Compressor] → [Delay] → gainNode → [Limiter] → destinationNode
      reconnectAudioGraph();

      // TAP del gainNode para volumeter (sin interrumpir la cadena principal)
      try {
        gainNode.connect(splitterNode);
        splitterNode.connect(analyserNodeLeft, 0); // Canal izquierdo (0)
        splitterNode.connect(analyserNodeRight, 1); // Canal derecho (1)
        // Los analysers NO se conectan a nada más, solo se usan para leer datos
        debugLog("Volumeter conectado (tap desde gainNode)");
      } catch (e) {
        debugError("Error conectando volumeter:", e);
      }

      debugLog("Cadena de audio completa conectada con complementos");
      isAudioSetup = true;

      // CONFIGURAR audioEl para reproducir el stream procesado
      // El audio pasará por: stream → sourceNode → [complementos] → gainNode → [limiter] → destinationNode
      // Y luego: destinationNode.stream → audioEl → setSinkId → speaker seleccionado

      debugLog("📊 Estado del destinationNode:", {
        exists: !!destinationNode,
        streamExists: !!destinationNode?.stream,
        streamActive: destinationNode?.stream?.active,
        audioTracks: destinationNode?.stream?.getAudioTracks()?.length || 0,
      });

      if (destinationNode && destinationNode.stream) {
        const destTracks = destinationNode.stream.getAudioTracks();
        debugLog("🎵 Tracks en destinationNode.stream:", destTracks.length);
        destTracks.forEach((track, idx) => {
          debugLog(`  Track ${idx}:`, {
            id: track.id,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            label: track.label,
          });
        });
      }

      // NOTA: destinationNode.stream no funciona bien en Electron
      // SOLUCIÓN: NO usar audioEl, usar SOLO audioCtx.destination
      // Desventaja: No se puede usar setSinkId (selector de dispositivo)
      debugLog("🔊 Usando SOLO audioCtx.destination (sin audioEl)");
      debugLog(
        "⚠️  Nota: El selector de dispositivo NO funcionará en este modo"
      );
      debugLog(
        "⚠️  El audio saldrá por el dispositivo por defecto del sistema"
      );

      // Mantener audioEl con el stream original pero SILENCIADO
      // (solo para que el stream se mantenga vivo)
      audioEl.srcObject = stream;
      audioEl.volume = 0;
      audioEl.muted = true;

      debugLog("audioEl configurado:", {
        srcObject: !!audioEl.srcObject,
        volume: audioEl.volume,
        muted: audioEl.muted,
        paused: audioEl.paused,
        readyState: audioEl.readyState,
      });

      // Reproducir el audioEl (aunque está silenciado, mantiene el stream vivo)
      try {
        await audioEl.play();
        debugLog("✅ audioEl iniciado (silenciado, mantiene stream vivo)");
      } catch (e) {
        debugError("❌ Error al iniciar audioEl:", e);
      }

      debugLog("✅ CONFIGURACIÓN FINAL:");
      debugLog(
        "   - Stream: WebRTC → Web Audio API (complementos) → audioCtx.destination"
      );
      debugLog("   - AudioContext.sinkId:", audioCtx.sinkId || "default");
      debugLog("   - Complementos: ACTIVOS y funcionales ✅");
      debugLog(
        "   - Selector de dispositivo:",
        audioCtx.setSinkId ? "ACTIVO ✅" : "NO SOPORTADO ⚠️"
      );

      // Iniciar visualización del volumeter
      startVolumeter();

      debugLog(
        `AudioContext configurado - Volumen: ${VOLUME}%, State: ${audioCtx.state}`
      );

      // Log completo del estado de audio
      debugLog("Estado completo de audio:", {
        audioElement: {
          volume: audioEl.volume,
          muted: audioEl.muted,
          paused: audioEl.paused,
          srcObject: !!audioEl.srcObject,
        },
        webAudio: {
          contextState: audioCtx.state,
          analyserFFT: analyserNodeLeft?.fftSize || 0,
          sourceConnected: !!sourceNode,
          volumeterRunning: !!volumeterAnimationId,
        },
      });

      // Asegurar que el AudioContext esté running
      if (audioCtx.state === "suspended") {
        audioCtx
          .resume()
          .then(() => {
            debugLog("AudioContext resumed");
          })
          .catch((e) => {
            debugError("Error resuming AudioContext:", e);
          });
      }

      return stream;
    } catch (e) {
      debugError("Error en setupAudioProcessing:", e);
      // Fallback: usar stream directo sin procesamiento
      audioEl.srcObject = stream;
      audioEl.play().catch((err) => console.error("Play error:", err));
      return stream;
    }
  }

  function setStatus(txt, cls = "muted") {
    stEl.className = `status ${cls}`;
    stEl.textContent = txt;
  }

  function updateConnectButton(isConnected) {
    if (isConnected) {
      btnConnect.textContent = "⏹ Desconectar";
      btnConnect.className = "btn-danger";
    } else {
      btnConnect.textContent = "▶ Conectar";
      btnConnect.className = "btn-primary";
    }
  }

  async function ensureLabels() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {}
  }

  async function listAudioOutputs() {
    await ensureLabels();
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter((d) => d.kind === "audiooutput");
  }

  async function fillSelect(devices, selectedId = "") {
    outSel.innerHTML = "";

    // Opción por defecto
    const optDef = document.createElement("option");
    optDef.value = "default";
    optDef.textContent = "Default (Sistema)";
    outSel.appendChild(optDef);

    for (const d of devices) {
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label || `Salida ${d.deviceId.slice(0, 6)}…`;
      outSel.appendChild(o);
    }

    // Cargar dispositivo guardado
    const savedId =
      selectedId || (await window.webrtcCfg.get("DEVICE_ID", "default"));

    if (savedId && [...outSel.options].some((o) => o.value === savedId)) {
      outSel.value = savedId;
    } else {
      // Fallback a nombre legacy si existe
      const legacyName = await window.webrtcCfg.get("DEVICE_NAME", "");
      if (legacyName) {
        const m = [...outSel.options].find((o) =>
          o.textContent.toLowerCase().includes(legacyName.toLowerCase())
        );
        outSel.value = m ? m.value : "default";
      } else {
        outSel.value = "default";
      }
    }
  }

  async function applySink(deviceId) {
    const label =
      outSel.selectedOptions[0]?.textContent ||
      (deviceId === "default" ? "Default (Sistema)" : "device");

    // Intentar cambiar el sinkId del AudioContext (modo complementos activos)
    if (audioCtx && audioCtx.setSinkId) {
      try {
        await audioCtx.setSinkId(deviceId);
        debugLog(`✅ AudioContext.setSinkId aplicado: ${deviceId}`);

        // Guardar en configuración
        await window.webrtcCfg.set("DEVICE_ID", deviceId);
        await window.webrtcCfg.set("DEVICE_LABEL", label);

        devEl.textContent = label;
        return true;
      } catch (e) {
        debugError("❌ Error al aplicar AudioContext.setSinkId:", e);
        // Intentar fallback con audioEl
      }
    }

    // Fallback: intentar con audioEl.setSinkId (modo sin complementos)
    if (audioEl.setSinkId) {
      try {
        await audioEl.setSinkId(deviceId);
        debugLog(`✅ audioEl.setSinkId aplicado: ${deviceId}`);

        // Guardar en configuración
        await window.webrtcCfg.set("DEVICE_ID", deviceId);
        await window.webrtcCfg.set("DEVICE_LABEL", label);

        devEl.textContent = label;
        return true;
      } catch (e) {
        debugError("❌ Error al aplicar audioEl.setSinkId:", e);
      }
    }

    // Si nada funciona
    debugWarn("⚠️ setSinkId no soportado en ningún modo");
    setStatus("setSinkId no soportado; usando salida por defecto", "bad");
    devEl.textContent = "default";
    return false;
  }

  async function refreshOutputs() {
    const outs = await listAudioOutputs();
    const currentId = await window.webrtcCfg.get("DEVICE_ID", "default");
    await fillSelect(outs, currentId);
    await applySink(outSel.value);
  }

  async function connectWHEP() {
    // Validar URL
    const url = urlInput.value.trim();
    if (!url) {
      setStatus("Por favor ingresa una URL WHEP", "bad");
      return;
    }
    WHEP_URL = url;
    await window.webrtcCfg.set("WHEP_URL", WHEP_URL);

    setStatus("conectando…", "muted");
    abortReconnect = false;

    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Listeners de estado de conexión
    pc.onconnectionstatechange = () => {
      debugLog("🔗 Connection state:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      debugLog("🧊 ICE connection state:", pc.iceConnectionState);
    };

    pc.onicegatheringstatechange = () => {
      debugLog("📡 ICE gathering state:", pc.iceGatheringState);
    };

    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = async (ev) => {
      const [stream] = ev.streams;
      debugLog("🎵 ontrack event recibido!");
      debugLog("Event streams:", ev.streams);
      debugLog("Event track:", ev.track);
      debugLog("Stream recibido:", stream);
      debugLog("Audio tracks:", stream.getAudioTracks());

      // Verificar que el track esté habilitado
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        debugError("❌ No hay tracks de audio en el stream!");
        setStatus("error: sin audio en stream", "bad");
        return;
      }

      audioTracks.forEach((track, idx) => {
        const settings = track.getSettings();
        debugLog(`🎵 Track ${idx}:`, {
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: settings, // Incluye sampleRate, channelCount, etc.
        });

        // Asegurar que el track esté habilitado
        track.enabled = true;

        // Listeners para detectar cambios
        track.onmute = () => debugWarn(`⚠️ Track ${idx} muted!`);
        track.onunmute = () => debugLog(`✅ Track ${idx} unmuted`);
        track.onended = () => debugWarn(`⚠️ Track ${idx} ended!`);
      });

      // Aplicar procesamiento de audio con control de volumen
      await setupAudioProcessing(stream);

      // Iniciar monitor de bytes recibidos
      startBytesMonitor();

      // Aplicar dispositivo de salida después de que el audio esté estable
      setTimeout(() => {
        const currentDeviceId = outSel.value || "default";
        debugLog("Aplicando dispositivo de salida (delayed):", currentDeviceId);
        applySink(currentDeviceId)
          .then(() => {
            debugLog("Dispositivo de salida aplicado correctamente");
          })
          .catch((err) => {
            debugError("Error al aplicar dispositivo:", err);
          });
      }, 1000);

      // Verificar estado del audio después de un momento
      setTimeout(() => {
        debugLog("Audio element estado final:", {
          srcObject: !!audioEl.srcObject,
          paused: audioEl.paused,
          muted: audioEl.muted,
          volume: audioEl.volume,
          sinkId: audioEl.sinkId || "default",
          readyState: audioEl.readyState,
        });

        // Forzar play si está pausado
        if (audioEl.paused) {
          debugLog("⚠️ Audio está pausado, forzando play...");
          audioEl.play().catch((e) => debugError("Error forzando play:", e));
        }
      }, 1500);

      setStatus("reproduciendo ✓", "ok");
      updateConnectButton(true);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    debugLog("📤 SDP Offer creado:");
    debugLog(offer.sdp);

    // Analizar el SDP offer
    const offerCodecs = offer.sdp.match(/a=rtpmap:\d+ ([^\/]+)/g);
    debugLog("Codecs en offer:", offerCodecs);

    // Esperar a que se completen los candidatos ICE (no-trickle)
    await new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") return resolve();

      const onIceGathering = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", onIceGathering);
          resolve();
        }
      };

      pc.addEventListener("icegatheringstatechange", onIceGathering);

      // Timeout de seguridad
      setTimeout(resolve, 3000);
    });

    let resp;
    try {
      resp = await fetch(WHEP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          Accept: "application/sdp",
        },
        body: pc.localDescription.sdp,
      });
    } catch (e) {
      console.error("WHEP fetch() network error:", e);
      setStatus("error de red: " + (e?.message || "network"), "bad");
      throw e;
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("WHEP HTTP error", resp.status, txt);
      setStatus(`Error HTTP ${resp.status}`, "bad");
      throw new Error(`WHEP ${resp.status} ${txt}`);
    }

    const answerSDP = await resp.text();

    debugLog("📥 SDP Answer recibido:");
    debugLog(answerSDP);

    // Analizar el SDP answer
    const answerCodecs = answerSDP.match(/a=rtpmap:\d+ ([^\/]+)/g);
    debugLog("Codecs en answer:", answerCodecs);

    // Verificar si hay línea de audio
    const hasAudioLine = answerSDP.includes("m=audio");
    debugLog("SDP tiene línea m=audio:", hasAudioLine);

    // Verificar dirección del audio
    const audioDirection = answerSDP.match(
      /a=(sendrecv|sendonly|recvonly|inactive)/
    );
    debugLog("Dirección del audio:", audioDirection?.[1] || "no especificada");

    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

    // Aplicar dispositivo de audio seleccionado
    await applySink(outSel.value || "default");

    // Monitorear estado de conexión ICE
    pc.addEventListener("iceconnectionstatechange", () => {
      const s = pc.iceConnectionState;
      debugLog("ICE connection state:", s);

      if (["failed", "disconnected", "closed"].includes(s) && !abortReconnect) {
        setStatus(`ICE ${s} — reconectando…`, "bad");
        cleanupAndMaybeReconnect();
      }
    });

    setStatus("conectado ✓", "ok");
  }

  function cleanupAndMaybeReconnect() {
    try {
      pc && pc.close();
    } catch {}
    pc = null;

    if (abortReconnect) return;

    setStatus(`reconectando en ${RECONNECT_MS / 1000}s…`, "muted");
    updateConnectButton(false);

    setTimeout(() => {
      connectWHEP().catch((e) => {
        console.error("Reconnect error:", e);
        setStatus(`error: ${e.message} — reintento…`, "bad");
        updateConnectButton(false);
        cleanupAndMaybeReconnect();
      });
    }, RECONNECT_MS);
  }

  function disconnectWHEP() {
    abortReconnect = true;
    try {
      pc && pc.close();
    } catch {}
    pc = null;

    // Detener monitor de bytes
    if (bytesMonitorInterval) {
      clearInterval(bytesMonitorInterval);
      bytesMonitorInterval = null;
    }

    // Solo limpiar el stream, NO los nodos de audio (se reutilizan)
    audioEl.srcObject = null;

    // Detener volumeter
    stopVolumeter();

    setStatus("desconectado", "muted");
    updateConnectButton(false);
  } // ---- Test tone (440 Hz) para verificar la tarjeta de salida ----
  function startTestTone() {
    if (testCtx) return; // ya sonando

    prevStream = audioEl.srcObject; // guarda lo que haya

    // Crear AudioContext con latencia baja
    const contextOptions = {
      latencyHint: "interactive",
      sampleRate: 48000,
    };

    testCtx = new (window.AudioContext || window.webkitAudioContext)(
      contextOptions
    );

    debugLog(`AudioContext creado - Sample rate: ${testCtx.sampleRate} Hz`);

    testOsc = testCtx.createOscillator();
    testGain = testCtx.createGain();
    // Ajustar volumen del tono según el volumen configurado
    testGain.gain.value = (0.05 * VOLUME) / 100; // volumen bajito multiplicado por el porcentaje

    const dest = testCtx.createMediaStreamDestination();
    testOsc.type = "sine";
    testOsc.frequency.value = 440;
    testOsc.connect(testGain);
    testGain.connect(dest);
    testOsc.start();

    audioEl.srcObject = dest.stream;
    setStatus(`🔊 tono de prueba (440 Hz) - Vol: ${VOLUME}%`, "ok");
    btnTest.textContent = "⏹ Detener tono";
  }

  async function stopTestTone() {
    if (!testCtx) return;

    try {
      testOsc?.stop();
    } catch {}
    try {
      await testCtx.close();
    } catch {}

    testCtx = testOsc = testGain = null;
    audioEl.srcObject = prevStream || null;
    prevStream = null;

    setStatus(pc ? "reproduciendo ✓" : "desconectado", pc ? "ok" : "muted");
    btnTest.textContent = "🔊 Probar tono";
  }

  // ========== DIAGNÓSTICO COMPLETO ==========
  let bytesMonitorInterval = null;

  function startBytesMonitor() {
    // Detener monitor anterior si existe
    if (bytesMonitorInterval) {
      clearInterval(bytesMonitorInterval);
    }

    let lastBytes = 0;
    let lastTime = Date.now();

    bytesMonitorInterval = setInterval(async () => {
      if (!pc || pc.connectionState !== "connected") {
        clearInterval(bytesMonitorInterval);
        bytesMonitorInterval = null;
        return;
      }

      try {
        const stats = await pc.getStats();
        let inboundAudio = null;

        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.kind === "audio") {
            inboundAudio = report;
          }
        });

        if (inboundAudio) {
          const currentBytes = inboundAudio.bytesReceived || 0;
          const currentTime = Date.now();
          const bytesDiff = currentBytes - lastBytes;
          const timeDiff = (currentTime - lastTime) / 1000;

          if (lastBytes > 0) {
            const bytesPerSec = bytesDiff / timeDiff;
            const kbps = (bytesPerSec * 8) / 1000;

            if (bytesPerSec > 0) {
              debugLog(
                `📊 Audio data: ${bytesPerSec.toFixed(
                  0
                )} bytes/s (${kbps.toFixed(1)} kbps)`
              );
            } else {
              debugWarn("⚠️ NO se están recibiendo bytes de audio!");
            }
          }

          lastBytes = currentBytes;
          lastTime = currentTime;
        } else {
          debugWarn("⚠️ Monitor: No hay inbound-rtp stats");
        }
      } catch (e) {
        debugError("Error en monitor de bytes:", e);
      }
    }, 2000); // Cada 2 segundos
  }

  window.diagnosticarAudio = async function () {
    console.log("\n========== 🔍 DIAGNÓSTICO DE AUDIO ==========\n");

    // 1. Estado de conexión WebRTC
    console.log("1️⃣ Estado de conexión WebRTC:");
    if (!pc) {
      console.log("❌ No hay RTCPeerConnection activa");
    } else {
      console.log("✅ RTCPeerConnection activa");
      console.log("   - Connection state:", pc.connectionState);
      console.log("   - ICE connection state:", pc.iceConnectionState);
      console.log("   - ICE gathering state:", pc.iceGatheringState);
      console.log("   - Signaling state:", pc.signalingState);

      // 2. SDP
      console.log("\n2️⃣ SDP Local:");
      console.log(pc.localDescription?.sdp || "N/A");
      console.log("\n2️⃣ SDP Remote:");
      console.log(pc.remoteDescription?.sdp || "N/A");

      // 3. Tracks
      console.log("\n3️⃣ Receivers y Tracks:");
      const receivers = pc.getReceivers();
      console.log(`Total receivers: ${receivers.length}`);
      receivers.forEach((receiver, idx) => {
        const track = receiver.track;
        const settings = track.getSettings();
        console.log(`Receiver ${idx}:`, {
          kind: track.kind,
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: settings,
        });
      });

      // 4. Stats
      console.log("\n4️⃣ Estadísticas WebRTC:");
      try {
        const stats = await pc.getStats();
        const reportTypes = {};
        let inboundAudio = null;

        stats.forEach((report) => {
          reportTypes[report.type] = (reportTypes[report.type] || 0) + 1;
          if (report.type === "inbound-rtp" && report.kind === "audio") {
            inboundAudio = report;
          }
        });

        console.log("Tipos de reports:", reportTypes);

        if (inboundAudio) {
          console.log("\n✅ Inbound RTP Audio encontrado:");
          console.log("   - Bytes recibidos:", inboundAudio.bytesReceived);
          console.log("   - Paquetes recibidos:", inboundAudio.packetsReceived);
          console.log("   - Paquetes perdidos:", inboundAudio.packetsLost);
          console.log("   - Jitter:", inboundAudio.jitter);
          console.log("   - Codec ID:", inboundAudio.codecId);

          if (inboundAudio.codecId) {
            const codec = stats.get(inboundAudio.codecId);
            if (codec) {
              console.log("\n📦 Codec info:");
              console.log("   - MIME type:", codec.mimeType);
              console.log("   - Clock rate:", codec.clockRate);
              console.log("   - Channels:", codec.channels);
            }
          }
        } else {
          console.log("❌ No se encontró inbound-rtp audio");
        }
      } catch (e) {
        console.error("Error obteniendo stats:", e);
      }
    }

    // 5. Audio Element
    console.log("\n5️⃣ Estado del elemento <audio>:");
    console.log({
      srcObject: !!audioEl.srcObject,
      paused: audioEl.paused,
      muted: audioEl.muted,
      volume: audioEl.volume,
      sinkId: audioEl.sinkId || "default",
      readyState: audioEl.readyState,
      currentTime: audioEl.currentTime,
      duration: audioEl.duration,
    });

    if (audioEl.srcObject) {
      console.log("\n6️⃣ Stream del audio element:");
      const stream = audioEl.srcObject;
      const tracks = stream.getAudioTracks();
      console.log(`Total audio tracks: ${tracks.length}`);
      tracks.forEach((track, idx) => {
        const settings = track.getSettings();
        console.log(`Track ${idx}:`, {
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: settings,
        });
      });
    }

    // 7. Web Audio API
    console.log("\n7️⃣ Web Audio API (AnalyserNodes - Stereo):");
    if (audioCtx) {
      console.log("✅ AudioContext creado");
      console.log("   - State:", audioCtx.state);
      console.log("   - Sample rate:", audioCtx.sampleRate);

      if (analyserNodeLeft && analyserNodeRight) {
        console.log("✅ AnalyserNodes creados (L/R)");
        console.log("   - FFT size:", analyserNodeLeft.fftSize);
        console.log("   - Smoothing:", analyserNodeLeft.smoothingTimeConstant);

        // Leer datos actuales del canal izquierdo
        const dataArray = new Uint8Array(analyserNodeLeft.frequencyBinCount);
        analyserNodeLeft.getByteTimeDomainData(dataArray);

        // Verificar si hay variación (señal de audio)
        const min = Math.min(...dataArray);
        const max = Math.max(...dataArray);
        const hasVariation = max - min > 2;

        console.log(
          `   - Datos actuales (L): min=${min}, max=${max}, variación=${
            max - min
          }`
        );
        console.log(
          `   - ${
            hasVariation ? "✅ HAY señal" : "❌ NO hay señal"
          } (muestras no están todas en 128)`
        );

        // Calcular RMS actual
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        console.log(`   - RMS actual: ${rms.toFixed(4)}`);
      }
    } else {
      console.log("❌ No hay AudioContext");
    }

    console.log("\n========================================\n");
  };
  // ---------------------------------------------------------------

  // UI events
  outSel.addEventListener("change", async () => {
    await applySink(outSel.value);
  });

  btnRefresh.addEventListener("click", async () => {
    setStatus("refrescando dispositivos…", "muted");
    await refreshOutputs();
    setStatus(pc ? "reproduciendo ✓" : "listo", pc ? "ok" : "muted");
  });

  btnConnect.addEventListener("click", async () => {
    // Si ya está conectado, desconectar
    if (pc) {
      disconnectWHEP();
      return;
    }

    try {
      // Asegurar que el AudioContext esté activo (requiere interacción del usuario)
      if (audioCtx && audioCtx.state === "suspended") {
        await audioCtx.resume();
        console.log("AudioContext resumed on user interaction");
      }

      await connectWHEP();
    } catch (e) {
      console.error("Connect error:", e);
      setStatus("error: " + e.message, "bad");
      updateConnectButton(false);
    }
  });

  btnTest.addEventListener("click", async () => {
    if (!testCtx) {
      startTestTone();
    } else {
      await stopTestTone();
    }
  });

  // Detectar cambios en dispositivos (hotplug)
  navigator.mediaDevices.addEventListener("devicechange", async () => {
    console.log("Dispositivos cambiados, refrescando lista...");
    await refreshOutputs();
  });

  // ============ STREAM INFO MODAL ============

  // Abrir modal
  btnStreamInfo.addEventListener("click", () => {
    streamInfoModal.classList.add("show");
    updateStreamInfo();
  });

  // Cerrar modal
  closeModal.addEventListener("click", () => {
    streamInfoModal.classList.remove("show");
  });

  // Cerrar modal al hacer clic fuera
  streamInfoModal.addEventListener("click", (e) => {
    if (e.target === streamInfoModal) {
      streamInfoModal.classList.remove("show");
    }
  });

  // Función para actualizar la información del stream
  async function updateStreamInfo() {
    // Estado de conexión
    document.getElementById("info-state").textContent = pc
      ? pc.connectionState
      : "Desconectado";
    document.getElementById("info-ice-state").textContent = pc
      ? pc.iceConnectionState
      : "N/A";

    // Sistema
    const selectedDevice = outSel.options[outSel.selectedIndex];
    document.getElementById("info-device").textContent = selectedDevice
      ? selectedDevice.text
      : "Default";
    document.getElementById("info-volume").textContent = VOLUME + "%";

    // Si no hay conexión activa
    if (!pc || pc.connectionState !== "connected") {
      document.getElementById("info-codec").textContent = "N/A";
      document.getElementById("info-sample-rate").textContent = "N/A";
      document.getElementById("info-channels").textContent = "N/A";
      document.getElementById("info-bitrate").textContent = "N/A";
      document.getElementById("info-bytes").textContent = "N/A";
      document.getElementById("info-packets").textContent = "N/A";
      document.getElementById("info-packets-lost").textContent = "N/A";
      document.getElementById("info-jitter").textContent = "N/A";
      return;
    }

    // Obtener estadísticas de WebRTC
    try {
      const stats = await pc.getStats();
      let inboundAudio = null;
      let codecInfo = null;
      let remoteInbound = null;

      debugLog("📊 Obteniendo estadísticas de WebRTC...");

      // Log de todos los tipos de reports para depuración
      const reportTypes = {};
      stats.forEach((report) => {
        reportTypes[report.type] = (reportTypes[report.type] || 0) + 1;

        if (report.type === "inbound-rtp" && report.kind === "audio") {
          inboundAudio = report;
          debugLog("✅ Inbound RTP encontrado:", report);
        }
        if (report.type === "codec" && report.mimeType?.includes("audio")) {
          codecInfo = report;
          debugLog("✅ Codec info encontrado:", report);
        }
        if (report.type === "remote-inbound-rtp" && report.kind === "audio") {
          remoteInbound = report;
        }
      });

      debugLog("Tipos de reports encontrados:", reportTypes);

      if (inboundAudio) {
        // Codec - buscar el codec asociado
        if (!codecInfo && inboundAudio.codecId) {
          codecInfo = stats.get(inboundAudio.codecId);
          console.log("Codec encontrado vía codecId:", codecInfo);
        }

        if (codecInfo) {
          document.getElementById("info-codec").textContent =
            codecInfo.mimeType || "Unknown";
          document.getElementById("info-sample-rate").textContent =
            codecInfo.clockRate ? codecInfo.clockRate + " Hz" : "N/A";
          document.getElementById("info-channels").textContent =
            codecInfo.channels || "N/A";
        } else {
          // Fallback: mostrar info básica
          document.getElementById("info-codec").textContent = "Audio";
          document.getElementById("info-sample-rate").textContent = "N/A";
          document.getElementById("info-channels").textContent = "N/A";
        }

        // Bitrate (calcular desde bytes)
        const bytesReceived = inboundAudio.bytesReceived || 0;
        const timestamp = inboundAudio.timestamp || 0;

        // Guardar valores previos para calcular bitrate
        if (!updateStreamInfo.prevBytes) {
          updateStreamInfo.prevBytes = bytesReceived;
          updateStreamInfo.prevTime = timestamp;
        }

        const bytesDiff = bytesReceived - updateStreamInfo.prevBytes;
        const timeDiff = (timestamp - updateStreamInfo.prevTime) / 1000; // a segundos

        if (timeDiff > 0) {
          const bitrate = (bytesDiff * 8) / timeDiff / 1000; // kbps
          document.getElementById("info-bitrate").textContent =
            bitrate.toFixed(1) + " kbps";
        }

        updateStreamInfo.prevBytes = bytesReceived;
        updateStreamInfo.prevTime = timestamp;

        // Bytes recibidos
        const mb = (bytesReceived / (1024 * 1024)).toFixed(2);
        document.getElementById("info-bytes").textContent = mb + " MB";

        // Paquetes
        document.getElementById("info-packets").textContent =
          inboundAudio.packetsReceived || "0";
        document.getElementById("info-packets-lost").textContent =
          inboundAudio.packetsLost || "0";

        // Jitter
        const jitter = inboundAudio.jitter || 0;
        document.getElementById("info-jitter").textContent =
          (jitter * 1000).toFixed(2) + " ms";
      } else {
        // NO se encontró inbound-rtp
        debugWarn("⚠️ NO se encontró 'inbound-rtp' en las estadísticas");
        debugWarn("Esto indica que NO hay datos de audio llegando");
        debugWarn("Posibles causas:");
        debugWarn("  1. El servidor SRS no está enviando audio");
        debugWarn("  2. La negociación SDP falló");
        debugWarn("  3. El stream en el servidor no tiene audio");
        debugWarn("  4. Firewall bloqueando el tráfico RTP");

        // Mostrar mensaje en la UI
        document.getElementById("info-codec").textContent = "Sin datos";
        document.getElementById("info-sample-rate").textContent = "Sin datos";
        document.getElementById("info-channels").textContent = "Sin datos";
        document.getElementById("info-bitrate").textContent = "0 kbps";
        document.getElementById("info-bytes").textContent = "0 MB";
        document.getElementById("info-packets").textContent = "0";
        document.getElementById("info-packets-lost").textContent = "0";
        document.getElementById("info-jitter").textContent = "0 ms";
      }
    } catch (e) {
      console.error("❌ Error obteniendo estadísticas:", e);
    }
  }

  // ============ CONFIGURACIÓN MODAL ============

  // Abrir modal de configuración
  btnSettings.addEventListener("click", async () => {
    settingsModal.classList.add("show");
    await loadSettings();
  });

  // Cerrar modal de configuración
  closeSettingsModal.addEventListener("click", () => {
    settingsModal.classList.remove("show");
  });

  // Cerrar modal al hacer clic fuera
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove("show");
    }
  });

  // Abrir modal de complementos
  btnPlugins.addEventListener("click", () => {
    pluginsModal.classList.add("show");
  });

  // Cerrar modal de complementos
  closePluginsModal.addEventListener("click", () => {
    pluginsModal.classList.remove("show");
  });

  // Cerrar modal al hacer clic fuera
  pluginsModal.addEventListener("click", (e) => {
    if (e.target === pluginsModal) {
      pluginsModal.classList.remove("show");
    }
  });

  // ========== EVENT LISTENERS PARA COMPLEMENTOS ==========

  // Ecualizador
  document.getElementById("eqToggle").addEventListener("change", () => {
    reconnectAudioGraph();
    savePluginsConfig();
  });

  const eqIds = [
    "eq32",
    "eq64",
    "eq125",
    "eq250",
    "eq500",
    "eq1k",
    "eq2k",
    "eq4k",
    "eq8k",
    "eq16k",
  ];
  eqIds.forEach((id, index) => {
    const slider = document.getElementById(id);
    const valueSpan = slider.nextElementSibling;

    slider.addEventListener("input", () => {
      const value = parseFloat(slider.value);
      valueSpan.textContent = `${value >= 0 ? "+" : ""}${value.toFixed(1)} dB`;
      if (eqNodes[index]) {
        eqNodes[index].gain.value = value;
      }
      savePluginsConfig();
    });
  });

  document.getElementById("eqReset").addEventListener("click", () => {
    eqIds.forEach((id, index) => {
      const slider = document.getElementById(id);
      slider.value = 0;
      slider.nextElementSibling.textContent = "0 dB";
      if (eqNodes[index]) {
        eqNodes[index].gain.value = 0;
      }
    });
    savePluginsConfig();
  });

  // Compresor
  document.getElementById("compressorToggle").addEventListener("change", () => {
    reconnectAudioGraph();
    savePluginsConfig();
  });

  document.getElementById("compThreshold").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("compThresholdValue").textContent = `${value} dB`;
    if (compressorNode) compressorNode.threshold.value = value;
    savePluginsConfig();
  });

  document.getElementById("compKnee").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("compKneeValue").textContent = `${value} dB`;
    if (compressorNode) compressorNode.knee.value = value;
    savePluginsConfig();
  });

  document.getElementById("compRatio").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("compRatioValue").textContent = `${value}:1`;
    if (compressorNode) compressorNode.ratio.value = value;
    savePluginsConfig();
  });

  document.getElementById("compAttack").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("compAttackValue").textContent = `${(
      value * 1000
    ).toFixed(0)} ms`;
    if (compressorNode) compressorNode.attack.value = value;
    savePluginsConfig();
  });

  document.getElementById("compRelease").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("compReleaseValue").textContent = `${(
      value * 1000
    ).toFixed(0)} ms`;
    if (compressorNode) compressorNode.release.value = value;
    savePluginsConfig();
  });

  // Limitador
  document.getElementById("limiterToggle").addEventListener("change", () => {
    reconnectAudioGraph();
    savePluginsConfig();
  });

  document.getElementById("limiterCeiling").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById(
      "limiterCeilingValue"
    ).textContent = `${value.toFixed(1)} dB`;
    if (limiterNode) limiterNode.threshold.value = value;
    savePluginsConfig();
  });

  // Reverb/Delay
  document.getElementById("reverbToggle").addEventListener("change", () => {
    reconnectAudioGraph();
    savePluginsConfig();
  });

  document.getElementById("delayTime").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("delayTimeValue").textContent = `${(
      value * 1000
    ).toFixed(0)} ms`;
    if (delayNode) delayNode.delayTime.value = value;
    savePluginsConfig();
  });

  document.getElementById("delayFeedback").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById("delayFeedbackValue").textContent = `${(
      value * 100
    ).toFixed(0)}%`;
    if (delayFeedback) delayFeedback.gain.value = value;
    savePluginsConfig();
  });

  document.getElementById("reverbMix").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value) / 100;
    document.getElementById("reverbMixValue").textContent = `${(
      value * 100
    ).toFixed(0)}%`;
    if (delayWetGain) delayWetGain.gain.value = value;
    if (delayDryGain) delayDryGain.gain.value = 1 - value;
    savePluginsConfig();
  });

  // Cargar configuración guardada
  async function loadSettings() {
    // Cargar tamaño de fuente
    const fontSize = await window.webrtcCfg.get("fontSize", "medium");
    applyFontSize(fontSize);

    // Actualizar botones activos
    fontSizeBtns.forEach((btn) => {
      if (btn.dataset.size === fontSize) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Cargar autostart - Sincronizar con el estado real del sistema
    try {
      const systemAutostart = await window.electronAPI.getAutostart();
      const savedAutostart = await window.webrtcCfg.get("autostart", "false");

      // Si hay discrepancia, priorizar el estado guardado en config
      if ((savedAutostart === "true") !== systemAutostart) {
        console.log(
          `Sincronizando autostart: config=${savedAutostart}, sistema=${systemAutostart}`
        );
        await window.electronAPI.setAutostart(savedAutostart === "true");
      }

      autostartToggle.checked = savedAutostart === "true";
    } catch (e) {
      console.error("Error al cargar autostart:", e);
      autostartToggle.checked = false;
    }
  }

  // Aplicar tamaño de fuente
  function applyFontSize(size) {
    document.body.classList.remove("font-small", "font-medium", "font-large");
    document.body.classList.add(`font-${size}`);
  }

  // Cambiar tamaño de fuente
  fontSizeBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const size = btn.dataset.size;

      // Actualizar UI
      fontSizeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Aplicar y guardar
      applyFontSize(size);
      await window.webrtcCfg.set("fontSize", size);
    });
  });

  // Toggle autostart
  autostartToggle.addEventListener("change", async () => {
    const enabled = autostartToggle.checked;
    await window.webrtcCfg.set("autostart", enabled ? "true" : "false");

    // Llamar al IPC para configurar autostart en el sistema
    try {
      await window.electronAPI.setAutostart(enabled);
      console.log("Autostart configurado:", enabled);
    } catch (e) {
      console.error("Error al configurar autostart:", e);
      autostartToggle.checked = !enabled; // Revertir si falla
    }
  });

  // Toggle debug mode
  debugToggle.addEventListener("change", async () => {
    DEBUG_MODE = debugToggle.checked;
    await window.webrtcCfg.set("DEBUG_MODE", DEBUG_MODE ? "true" : "false");

    if (DEBUG_MODE) {
      console.log("🔍 Modo Debug ACTIVADO - Se mostrarán logs detallados");
      console.log("Estado actual:", {
        conexion: pc ? pc.connectionState : "Sin conexión",
        ice: pc ? pc.iceConnectionState : "N/A",
        audio: audioEl.paused ? "Pausado" : "Reproduciendo",
        volumen: VOLUME + "%",
      });
    } else {
      console.log("🔍 Modo Debug DESACTIVADO");
    }
  });

  autoConnectToggle.addEventListener("change", async () => {
    AUTO_CONNECT = autoConnectToggle.checked;
    await window.webrtcCfg.set("AUTO_CONNECT", AUTO_CONNECT ? "true" : "false");

    if (AUTO_CONNECT) {
      console.log(
        "🔌 Auto Conectar ACTIVADO - Se conectará automáticamente al iniciar"
      );
    } else {
      console.log("🔌 Auto Conectar DESACTIVADO");
    }
  });

  // ============ ARRANQUE INICIAL ============
  setStatus("iniciando…", "muted");

  try {
    // Cargar configuración
    await loadConfig();

    // Cargar configuración de UI
    await loadSettings();

    // Listar y seleccionar dispositivos
    await refreshOutputs();

    setStatus("listo para conectar", "muted");

    // Auto-conectar si está habilitado en configuración
    if (AUTO_CONNECT) {
      setTimeout(async () => {
        try {
          debugLog("🔌 Auto-conectando...");
          await connectWHEP();
        } catch (e) {
          console.error("Error en conexión automática:", e);
          setStatus("error al auto-conectar: " + e.message, "bad");
        }
      }, 500);
    }
  } catch (e) {
    console.error("Error en arranque:", e);
    setStatus("error de arranque: " + e.message, "bad");
  }
})();
