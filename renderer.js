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
  const btnDisconnect = document.getElementById("btnDisconnect");
  const btnTest = document.getElementById("btnTest");
  const volumeterCanvas = document.getElementById("volumeter");
  const volumeterValue = document.getElementById("volumeterValue");
  const volumeterCtx = volumeterCanvas.getContext("2d");
  const btnStreamInfo = document.getElementById("btnStreamInfo");
  const streamInfoModal = document.getElementById("streamInfoModal");
  const closeModal = document.getElementById("closeModal");
  const btnSettings = document.getElementById("btnSettings");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsModal = document.getElementById("closeSettingsModal");
  const autostartToggle = document.getElementById("autostartToggle");
  const debugToggle = document.getElementById("debugToggle");
  const fontSizeBtns = document.querySelectorAll(".font-size-btn");

  // Configuración por defecto
  const DEFAULT_WHEP_URL =
    "https://example.com:1935/rtc/v1/whep/?app=live&stream=audiostream";
  const DEFAULT_RECONNECT_MS = 3000;
  const DEFAULT_VOLUME = 100;
  const DEFAULT_DEBUG = false;

  let WHEP_URL = "";
  let RECONNECT_MS = DEFAULT_RECONNECT_MS;
  let VOLUME = DEFAULT_VOLUME;
  let DEBUG_MODE = DEFAULT_DEBUG;
  let pc = null;
  let abortReconnect = false;

  // AudioContext para control de volumen
  let audioCtx = null;
  let gainNode = null;
  let sourceNode = null;
  let destinationNode = null; // MediaStreamDestination para setSinkId
  let isAudioSetup = false; // Flag para evitar recrear MediaElementSource

  // Para análisis de volumen (volumeter)
  let analyserNode = null;
  let volumeterAnimationId = null;

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

      WHEP_URL = savedUrl;
      RECONNECT_MS = parseInt(savedReconnect, 10);
      VOLUME = parseInt(savedVolume, 10);
      DEBUG_MODE = savedDebug === "true" || savedDebug === true;

      urlInput.value = WHEP_URL;
      volumeSlider.value = VOLUME;
      debugToggle.checked = DEBUG_MODE;
      updateVolumeDisplay();

      if (DEBUG_MODE) {
        console.log("🔍 Modo Debug ACTIVADO");
      }
    } catch (e) {
      console.error("Error al cargar config:", e);
      WHEP_URL = DEFAULT_WHEP_URL;
      VOLUME = DEFAULT_VOLUME;
      DEBUG_MODE = DEFAULT_DEBUG;
      urlInput.value = WHEP_URL;
      volumeSlider.value = VOLUME;
      debugToggle.checked = DEBUG_MODE;
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

  // === Funciones del Volumeter ===
  let currentLevel = 0; // Nivel actual para suavizado
  let peakLevel = 0; // Nivel pico para mantener picos visibles
  let peakHoldTime = 0; // Tiempo de retención del pico
  let currentDb = -Infinity; // dB actual para suavizado

  function startVolumeter() {
    if (volumeterAnimationId || !analyserNode) {
      debugLog("Volumeter ya iniciado o analyserNode no disponible");
      return;
    }

    const bufferLength = analyserNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    // Resetear valores de suavizado
    currentLevel = 0;
    peakLevel = 0;
    peakHoldTime = 0;
    currentDb = -Infinity;

    debugLog("Volumeter iniciado - Buffer length:", bufferLength);

    function draw() {
      volumeterAnimationId = requestAnimationFrame(draw);

      // Usar getByteTimeDomainData para análisis de forma de onda (mejor para VU meter)
      analyserNode.getByteTimeDomainData(dataArray);

      // Debug: Ver primeros valores del array
      if (DEBUG_MODE && Math.random() < 0.002) {
        debugLog(
          "Primeros 10 valores del array:",
          Array.from(dataArray.slice(0, 10))
        );
      }

      // Calcular RMS (Root Mean Square) para nivel de volumen más preciso
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128; // Normalizar de -1 a 1
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Convertir a escala 0-1 con mayor sensibilidad
      const instantLevel = Math.min(rms * 5, 1.0);

      // Suavizado exponencial para una animación más fluida
      const smoothingFactor = instantLevel > currentLevel ? 0.3 : 0.1; // Subida rápida, bajada lenta
      currentLevel =
        currentLevel * (1 - smoothingFactor) + instantLevel * smoothingFactor;

      // Mantener nivel de pico por un tiempo
      if (instantLevel > peakLevel) {
        peakLevel = instantLevel;
        peakHoldTime = 30; // Mantener por 30 frames (~0.5 segundos a 60fps)
      } else if (peakHoldTime > 0) {
        peakHoldTime--;
      } else {
        peakLevel = peakLevel * 0.95; // Caída lenta del pico
      }

      // Calcular dB (aproximado)
      let instantDb = -Infinity;
      if (rms > 0.0001) {
        instantDb = 20 * Math.log10(rms);
      }

      // Suavizado del valor de dB para el display
      if (currentDb === -Infinity) {
        currentDb = instantDb;
      } else if (instantDb === -Infinity) {
        currentDb = currentDb * 0.9; // Decae hacia -Infinity
      } else {
        // Suavizado más agresivo para el texto (más lento que la barra visual)
        const dbSmoothingFactor = instantDb > currentDb ? 0.15 : 0.08;
        currentDb =
          currentDb * (1 - dbSmoothingFactor) + instantDb * dbSmoothingFactor;
      }

      // Log ocasional para debugging
      if (DEBUG_MODE && Math.random() < 0.005) {
        debugLog(
          `RMS: ${rms.toFixed(4)}, Instant: ${instantLevel.toFixed(
            3
          )}, Smoothed: ${currentLevel.toFixed(3)}, dB: ${currentDb.toFixed(1)}`
        );
      }

      // Dibujar en canvas (usar instantDb para colores precisos, currentDb para display)
      drawVolumeter(currentLevel, peakLevel, instantDb, currentDb);
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

  function drawVolumeter(level, peakLevel, instantDb, displayDb) {
    const width = volumeterCanvas.width;
    const height = volumeterCanvas.height;

    // Limpiar canvas
    volumeterCtx.fillStyle = "#151a22";
    volumeterCtx.fillRect(0, 0, width, height);

    // Calcular ancho de la barra principal
    const barWidth = width * level;

    // Estándares profesionales de dBFS:
    // Verde: < -12 dBFS (operación segura)
    // Amarillo: -12 a -6 dBFS (precaución)
    // Naranja: -6 a -3 dBFS (picos altos)
    // Rojo: ≥ -3 dBFS (peligro de clipping)

    // Convertir dB a posiciones en el gradiente (0 dB = 100%, -60 dB ≈ 0%)
    // Aproximación: 0 dB = level 1.0, -60 dB = level 0.0
    const dbToPosition = (dbValue) => {
      // Mapear -60dB a 0dB como 0.0 a 1.0
      return Math.max(0, Math.min(1, (dbValue + 60) / 60));
    };

    const greenEnd = dbToPosition(-12); // ~0.8 (< -12 dBFS)
    const yellowEnd = dbToPosition(-6); // ~0.9 (-12 a -6 dBFS)
    const orangeEnd = dbToPosition(-3); // ~0.95 (-6 a -3 dBFS)
    // Rojo desde orangeEnd hasta 1.0 (≥ -3 dBFS)

    // Crear gradiente con los estándares profesionales
    let gradient = volumeterCtx.createLinearGradient(0, 0, width, 0);
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
      volumeterCtx.fillStyle = gradient;
      volumeterCtx.fillRect(0, 0, Math.max(barWidth, 2), height);
    }

    // Dibujar indicador de pico (línea vertical) usando los mismos estándares
    const peakWidth = width * peakLevel;
    if (peakWidth > 0 && peakLevel > level) {
      // Determinar color del pico basado en dB instantáneo (no suavizado)
      let peakColor;
      if (instantDb >= -3) {
        peakColor = "#e74c3c"; // Rojo: ≥ -3 dBFS
      } else if (instantDb >= -6) {
        peakColor = "#f39c12"; // Naranja: -6 a -3 dBFS
      } else if (instantDb >= -12) {
        peakColor = "#f1c40f"; // Amarillo: -12 a -6 dBFS
      } else {
        peakColor = "#2ecc71"; // Verde: < -12 dBFS
      }
      volumeterCtx.fillStyle = peakColor;
      volumeterCtx.fillRect(peakWidth - 2, 0, 2, height);
    }

    // Dibujar líneas de división (cada 10%)
    volumeterCtx.strokeStyle = "#2a3240";
    volumeterCtx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const x = (width / 10) * i;
      volumeterCtx.beginPath();
      volumeterCtx.moveTo(x, 0);
      volumeterCtx.lineTo(x, height);
      volumeterCtx.stroke();
    }

    // Actualizar valor de dB (usar valor suavizado para el display)
    if (displayDb === -Infinity || displayDb < -60) {
      volumeterValue.textContent = "-∞ dBFS";
    } else {
      volumeterValue.textContent = `${displayDb.toFixed(1)} dBFS`;
    }

    // Cambiar color del texto según estándares dBFS (usar valor suavizado)
    if (displayDb >= -3) {
      volumeterValue.style.color = "#e74c3c"; // Rojo: ≥ -3 dBFS (peligro)
    } else if (displayDb >= -6) {
      volumeterValue.style.color = "#f39c12"; // Naranja: -6 a -3 dBFS
    } else if (displayDb >= -12) {
      volumeterValue.style.color = "#f1c40f"; // Amarillo: -12 a -6 dBFS
    } else {
      volumeterValue.style.color = "#2ecc71"; // Verde: < -12 dBFS (seguro)
    }
  }

  function clearVolumeter() {
    const width = volumeterCanvas.width;
    const height = volumeterCanvas.height;
    volumeterCtx.fillStyle = "#151a22";
    volumeterCtx.fillRect(0, 0, width, height);
    volumeterValue.textContent = "-∞ dB";
    volumeterValue.style.color = "#2ecc71";
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

  function setupAudioProcessing(stream) {
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

      // PRIMERO: Establecer el stream directamente en el elemento de audio
      audioEl.srcObject = stream;
      audioEl.volume = Math.min(VOLUME / 100, 1.0);
      audioEl.muted = false;

      debugLog("audioEl configurado:", {
        srcObject: !!audioEl.srcObject,
        volume: audioEl.volume,
        muted: audioEl.muted,
        paused: audioEl.paused,
        readyState: audioEl.readyState,
      });

      // Reproducir DESPUÉS de un pequeño delay para evitar interferencias
      setTimeout(() => {
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              debugLog("✅ Audio reproduciendo correctamente");
              debugLog("audioEl después de play:", {
                paused: audioEl.paused,
                currentTime: audioEl.currentTime,
                duration: audioEl.duration,
              });
            })
            .catch((e) => {
              debugError("❌ Error al reproducir audio:", e);
              debugLog("Intentando reproducir sin audio (muted) primero...");
              // Workaround: iniciar muted y luego unmute
              audioEl.muted = true;
              audioEl
                .play()
                .then(() => {
                  debugLog("Audio iniciado en modo muted");
                  // Esperar un poco y luego unmute
                  setTimeout(() => {
                    audioEl.muted = false;
                    debugLog("Audio unmuted - debería sonar ahora");
                  }, 100);
                })
                .catch((err) => {
                  console.error(
                    "No se pudo iniciar el audio incluso muted:",
                    err
                  );
                });
            });
        }
      }, 100); // Pequeño delay para estabilizar

      // SEGUNDO: Configurar Web Audio API solo para el volumeter (análisis)
      // Crear AudioContext si no existe
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        debugLog("AudioContext creado, state:", audioCtx.state);
      }

      // IMPORTANTE: Desconectar y recrear el source cada vez que hay un nuevo stream
      // porque MediaStreamSource solo funciona con el stream original
      if (sourceNode) {
        try {
          sourceNode.disconnect();
          debugLog("SourceNode anterior desconectado");
        } catch (e) {}
      }

      // Crear MediaStreamSource desde el stream WebRTC directamente (SOLO para análisis)
      sourceNode = audioCtx.createMediaStreamSource(stream);
      debugLog(
        "MediaStreamSource creado desde stream WebRTC (solo para volumeter)"
      );

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

      // Crear AnalyserNode si no existe
      if (!analyserNode) {
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;
        debugLog(
          "AnalyserNode creado - FFT:",
          analyserNode.fftSize,
          "Smoothing:",
          analyserNode.smoothingTimeConstant
        );
      }

      // Conectar SOLO para análisis (volumeter)
      // NO conectamos a destination porque el audio ya sale por audioEl
      try {
        sourceNode.disconnect();
      } catch (e) {}

      sourceNode.connect(analyserNode);
      // analyserNode NO se conecta a nada, solo se usa para leer datos

      debugLog("AnalyserNode conectado (solo para lectura, no para audio)");
      isAudioSetup = true;

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
          analyserFFT: analyserNode.fftSize,
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
    if (!audioEl.setSinkId) {
      setStatus("setSinkId no soportado; usando salida por defecto", "bad");
      devEl.textContent = "default";
      return false;
    }

    try {
      await audioEl.setSinkId(deviceId);
      const label =
        outSel.selectedOptions[0]?.textContent ||
        (deviceId === "default" ? "Default (Sistema)" : "device");

      // Guardar en configuración persistente
      await window.webrtcCfg.set("DEVICE_ID", deviceId);
      await window.webrtcCfg.set("DEVICE_LABEL", label);

      devEl.textContent = label;
      return true;
    } catch (e) {
      console.error("Error al cambiar salida de audio:", e);
      setStatus("Error al cambiar salida de audio", "bad");
      return false;
    }
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

    pc.ontrack = (ev) => {
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
      setupAudioProcessing(stream);

      // Iniciar monitor de bytes recibidos
      startBytesMonitor();

      // NO aplicar dispositivo de salida inmediatamente para evitar conflictos
      // Se aplicará después de que el audio esté estable
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
      }, 1000); // Esperar 1 segundo para que el stream se estabilice

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

    setTimeout(() => {
      connectWHEP().catch((e) => {
        console.error("Reconnect error:", e);
        setStatus(`error: ${e.message} — reintento…`, "bad");
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
    console.log("\n7️⃣ Web Audio API (AnalyserNode):");
    if (audioCtx) {
      console.log("✅ AudioContext creado");
      console.log("   - State:", audioCtx.state);
      console.log("   - Sample rate:", audioCtx.sampleRate);

      if (analyserNode) {
        console.log("✅ AnalyserNode creado");
        console.log("   - FFT size:", analyserNode.fftSize);
        console.log("   - Smoothing:", analyserNode.smoothingTimeConstant);

        // Leer datos actuales
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteTimeDomainData(dataArray);

        // Verificar si hay variación (señal de audio)
        const min = Math.min(...dataArray);
        const max = Math.max(...dataArray);
        const hasVariation = max - min > 2;

        console.log(
          `   - Datos actuales: min=${min}, max=${max}, variación=${max - min}`
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
    if (pc) {
      setStatus("ya conectado", "ok");
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
    }
  });

  btnDisconnect.addEventListener("click", () => {
    disconnectWHEP();
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

    // Cargar autostart
    const autostart = await window.webrtcCfg.get("autostart", "false");
    autostartToggle.checked = autostart === "true";
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

    // Auto-conectar si quieres (opcional, comenta si no lo deseas)
    setTimeout(async () => {
      try {
        await connectWHEP();
      } catch (e) {
        console.error("Error en conexión inicial:", e);
        setStatus("error inicial: " + e.message, "bad");
      }
    }, 500);
  } catch (e) {
    console.error("Error en arranque:", e);
    setStatus("error de arranque: " + e.message, "bad");
  }
})();
