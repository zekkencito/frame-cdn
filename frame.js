(function() {
  function run() {

  // 0b. YOUTUBE IFrame API CONSTANTS + SAFE COMMAND ROUTER
  // Every audio command must be sent over the POST-MESSAGE channel with the correct
  // target origin, and only from a trusted user-activation context. This helper is the
  // single chokepoint so we never scatter '*' (origin-agnostic) sends.
  //
  // PlayerProxy handshake: YouTube throws a "PlayerProxy error in method call" when a
  // postMessage command arrives before the embedded player has finished building its
  // internal proxy bridge. To avoid that race we gate every command on a per-window
  // readiness flag (set by YouTube's onReady/infoDelivery handshake), queue commands
  // that arrive too early, and flush them the moment the player signals ready (with a
  // bounded 2.5s fallback so nothing is ever permanently dropped).
  //
  // NOTE: readiness/queues are tracked in PAGE-LOCAL memory (Set/Map keyed by the
  // cross-origin contentWindow reference), NEVER as properties written/read on the
  // cross-origin window itself. Cross-origin Windows only expose a few allowed
  // members (postMessage foremost); synchronously reading an arbitrary property like
  // `win.__ytReady` throws a SecurityError and would abort the whole scroll/audio
  // sync chain. State therefore lives here, and all we ever do to the iframe window
  // is call the cross-origin-safe postMessage().
  var YT_ORIGIN = 'https://www.youtube.com';
  var ytReadyWins = new Set();   // contentWindows that have confirmed the proxy bridge
  var ytQueues = new Map();      // contentWindow -> array of deferred payloads
  var ytTimers = new Map();      // contentWindow -> 2.5s fallback flush timer id
  function ytSend(win, payload) {
    if (!win) return false;
    try { win.postMessage(JSON.stringify(payload), YT_ORIGIN); return true; }
    catch (e) { return false; }
  }
  function ytFlush(win) {
    if (!win || !ytQueues.has(win)) return;
    var q = ytQueues.get(win);
    ytQueues.delete(win);
    for (var i = 0; i < q.length; i++) ytSend(win, q[i]);
  }
  function ytMarkReady(win) {
    if (!win) return;
    ytReadyWins.add(win);
    if (ytTimers.has(win)) { clearTimeout(ytTimers.get(win)); ytTimers.delete(win); }
    ytFlush(win);
  }
  function ytPost(targetWin, func, args) {
    if (!targetWin) return false;
    var payload = { event: 'command', func: func, args: args === undefined ? '' : args };
    if (ytReadyWins.has(targetWin)) return ytSend(targetWin, payload);
    // Player not confirmed ready yet: defer the command until the handshake fires.
    if (!ytQueues.has(targetWin)) ytQueues.set(targetWin, []);
    ytQueues.get(targetWin).push(payload);
    if (!ytTimers.has(targetWin)) {
      ytTimers.set(targetWin, setTimeout(function() {
        ytReadyWins.add(targetWin);
        if (ytTimers.has(targetWin)) { clearTimeout(ytTimers.get(targetWin)); ytTimers.delete(targetWin); }
        ytFlush(targetWin);
      }, 2500));
    }
    return true;
  }
  // Mark each embedded player ready the moment YouTube signals it, then flush any
  // commands that were deferred while the proxy bridge was still initializing.
  document.addEventListener('message', function(ev) {
    var raw = ev.data;
    if (!raw || typeof raw !== 'string') return;
    var msg = null;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (msg && (msg.event === 'onReady' || msg.event === 'infoDelivery')) {
      ytMarkReady(ev.source);
    }
  });

  // 0a. INSTANT YOUTUBE PRELOADER: preconnect network handshakes
  ['https://www.youtube.com', 'https://www.google.com', 'https://shared.akamai.steamstatic.com', 'https://i.ytimg.com'].forEach(function(h){
    var l = document.createElement('link');
    l.rel = 'preconnect'; l.href = h;
    document.head.appendChild(l);
    var d = document.createElement('link');
    d.rel = 'dns-prefetch'; d.href = h;
    document.head.appendChild(d);
  });

  document.head.insertAdjacentHTML('beforeend', `<style>
    html, body, .section, .container { overflow-y: auto !important; overflow-x: hidden !important; height: auto !important; min-height: 100vh !important; display: block !important; }
    .moment-grid { display: block !important; position: relative !important; width: 100% !important; z-index: 1 !important; }
    body { background: #08080a !important; color: #e6e6e9; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; transition: background 1.2s ease !important; }
    .frame-canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; overflow: hidden; background: #08080a; transition: background 1.4s ease; }
    .frame-canvas::before { content: ""; position: absolute; inset: 0; background: radial-gradient(1200px 800px at 80% -10%, var(--glow, rgba(229,57,53,0.16)), transparent 60%); transition: background 1.4s ease; }

    .moment-card { min-height: 200vh !important; content-visibility: auto; contain-intrinsic-size: 200vh; }
    .video-slot { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; transition: opacity 0.35s ease; transform: translateZ(0); backface-visibility: hidden; will-change: opacity, transform; -webkit-transform: translateZ(0); -webkit-backface-visibility: hidden; }
    .video-slot.is-active { opacity: 1; pointer-events: auto; transform: translateZ(0); }
    .video-slot .yt-iframe { backface-visibility: hidden; will-change: transform; -webkit-backface-visibility: hidden; }
    .video-slot.is-active .yt-iframe { transform: translate3d(-50%,-50%,0); }
    .moment-card { transition: opacity 0.9s ease, transform 0.9s ease; opacity: 1; }
    .moment-card.dimmed { opacity: 0.3; }

    /* ===== STAGGERED CASCADE (IN & OUT) — one-by-one clean wave, center-of-screen trigger ===== */
    .reveal-target { opacity: 0; transform: translateY(40px); transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); transition-delay: calc(var(--index, 0) * 0.12s); will-change: opacity, transform; }
    .reveal-target.is-visible { opacity: 1; transform: translateY(0); }
    .reveal-target.is-leaving { opacity: 0; transform: translateY(-24px); }
    .gallery-grid img { opacity: 0; transform: translateY(30px); transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); transition-delay: calc(var(--index, 0) * 0.12s); will-change: opacity, transform; }
    .gallery-grid figure { --fi: 0; }
    .gallery-grid figure[data-index] { --fi: var(--index, 0); }
    .gallery-grid figure[data-index] img { --index: var(--fi, 0); }
    .gallery-grid.gallery-in img { opacity: 1; transform: translateY(0); }
    .gallery-grid.gallery-out img { opacity: 0; transform: translateY(-16px); }

    /* ===== GALLERY HOVER ZOOM + LIGHTBOX ===== */
    .gallery-grid img { cursor: pointer; transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.7s cubic-bezier(0.16,1,0.3,1); transform: translateY(30px) scale(1); will-change: transform, opacity; }
    .gallery-grid figure { overflow: hidden; }
    .gallery-grid.gallery-in img { opacity: 1; transform: translateY(0) scale(1); }
    .gallery-grid.gallery-out img { opacity: 0; transform: translateY(-16px) scale(1); }
    .gallery-grid figure:hover img { transform: translateY(0) scale(1.06); }
    .frame-lightbox { position: fixed; inset: 0; z-index: 10000; background: rgba(6,6,8,0.95); backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.35s cubic-bezier(0.16,1,0.3,1); }
    .frame-lightbox.is-open { opacity: 1; pointer-events: auto; }
    .frame-lightbox figure { margin: 0; max-width: 92vw; max-height: 90vh; position: relative; }
    .frame-lightbox img { max-width: 92vw; max-height: 90vh; width: auto; height: auto; object-fit: contain; display: block; box-shadow: 0 30px 120px rgba(0,0,0,0.85); border: 1px solid #2e2e35; }
    .frame-lightbox .lb-close { position: absolute; top: 24px; right: 28px; background: none; border: 1px solid #3a3a42; color: #fff; font-size: 18px; width: 48px; height: 48px; cursor: pointer; transition: all 0.25s ease; z-index: 2; display: flex; align-items: center; justify-content: center; }
    .frame-lightbox .lb-close:hover { background: #e53935; border-color: #e53935; color: #08080a; }
    .frame-lightbox .lb-caption { position: absolute; left: 0; bottom: -44px; font-family: 'SFMono-Regular','Menlo','Consolas',monospace; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #8A8F98; }

    /* ===== BLOOD RAIN: dark neon-crimson cinematic grade ===== */
    .bloodrain .gallery-grid img { filter: brightness(0.72) contrast(1.32) saturate(1.55) drop-shadow(0 4px 22px rgba(216,27,96,0.45)) hue-rotate(-6deg); }
    .bloodrain .game-info .editorial-hero img { filter: brightness(0.74) contrast(1.3) saturate(1.5) drop-shadow(0 6px 30px rgba(216,27,96,0.42)) hue-rotate(-6deg); }

    /* ===== ANTI-SLOP EDITORIAL: sharp brutalist framing ===== */
    .game-info { --accent: #e53935; }
    .editorial-kicker { font-family: 'SFMono-Regular', 'Menlo', 'Consolas', monospace; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #7a7a82; }
    .editorial-rule { height: 1px; background: #26262b; }
    .editorial-rule.accent { background: var(--accent); height: 2px; }
    .editorial-ghost { font-family: 'SFMono-Regular','Menlo','Consolas',monospace; font-size: 12px; letter-spacing: 0.2em; color: #2c2c33; text-transform: uppercase; }
    .perf-cell { border: 1px solid #232329; background: transparent; border-radius: 0; }

    /* ===== GLOBAL FLOATING STICKY AUDIO DOCK: glassmorphism bar synced to active section ===== */
    .frame-dock {
      position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%);
      z-index: 9000; display: flex; align-items: center; gap: 16px;
      padding: 12px 18px; min-width: min(680px, 92vw); max-width: 92vw;
      background: rgba(15,15,19,0.66); border: 1px solid rgba(255,255,255,0.10);
      border-radius: 20px; backdrop-filter: blur(22px) saturate(150%);
      -webkit-backdrop-filter: blur(22px) saturate(150%);
      box-shadow: 0 18px 60px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease;
      opacity: 1;
    }
    .frame-dock.is-dock-hidden { transform: translateX(-50%) translateY(140%); opacity: 0; }
    .frame-dock .dock-play {
      width: 52px; height: 52px; flex: 0 0 52px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.05);
      color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.25s ease; position: relative;
    }
    .frame-dock .dock-play:hover { background: var(--accent); border-color: var(--accent); color: #08080a; }
    .frame-dock .dock-play .ico-play, .frame-dock .dock-play .ico-pause { position: absolute; line-height: 1; transition: opacity 0.2s ease, transform 0.2s ease; }
    .frame-dock .dock-play .ico-pause { opacity: 0; transform: scale(0.6); }
    .frame-dock.is-playing .dock-play .ico-play { opacity: 0; transform: scale(0.6); }
    .frame-dock.is-playing .dock-play .ico-pause { opacity: 1; transform: scale(1); }
    .frame-dock .dock-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .frame-dock .dock-label { font-family:'SFMono-Regular','Menlo','Consolas',monospace; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: #8A8F98; }
    .frame-dock .dock-title { font-size: 15px; font-weight: 800; letter-spacing: 0.02em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .frame-dock .dock-wave { display: flex; align-items: center; gap: 3px; height: 30px; }
    .frame-dock .dock-wave i { width: 4px; height: 100%; display: block; background: var(--accent); opacity: 0.28; transform: scaleY(0.3); transition: opacity 0.4s ease; }
    .frame-dock.is-feeding .dock-wave i { opacity: 0.7; }
    .frame-dock.is-playing .dock-wave i { animation: wave 1s ease-in-out infinite; }
    .frame-dock.is-playing .dock-wave i:nth-child(2n) { animation-delay: 0.1s; }
    .frame-dock.is-playing .dock-wave i:nth-child(3n) { animation-delay: 0.2s; }
    .frame-dock.is-playing .dock-wave i:nth-child(4n) { animation-delay: 0.3s; }
    .frame-dock.is-playing .dock-wave i:nth-child(5n) { animation-delay: 0.4s; }
    .frame-dock.is-playing .dock-wave i:nth-child(7n) { animation-delay: 0.5s; }
    @keyframes wave { 0%,100% { transform: scaleY(0.22); } 50% { transform: scaleY(1); } }
    .frame-dock .dock-fader { flex: 0 0 110px; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.16); border-radius: 999px; outline: none; cursor: pointer; }
    .frame-dock .dock-fader::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); border: none; box-shadow: 0 0 0 4px rgba(255,255,255,0.06); }
    .frame-dock .dock-fader::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); border: none; }
    .frame-dock .dock-vol { font-family:'SFMono-Regular','Menlo','Consolas',monospace; font-size: 10px; letter-spacing: 0.12em; color: #9a9aa4; min-width: 30px; text-align: right; }
    /* ABSOLUTE HIDING: soundtrack iframes are fully detached from layout and never
       visible — YouTube must never render its info-card / mini-player on screen.
       They stay in the DOM for zero-lag audio, but contribute zero pixels. */
    .track-iframe,
    .track-iframe.is-live {
      position: absolute !important; left: -9999px !important; top: -9999px !important;
      width: 0 !important; height: 0 !important; min-width: 0 !important; min-height: 0 !important;
      max-width: 0 !important; max-height: 0 !important; opacity: 0 !important;
      pointer-events: none !important; border: 0 !important; visibility: hidden !important;
      overflow: hidden !important; clip: rect(0 0 0 0) !important; clip-path: inset(50%) !important;
      display: block !important; margin: 0 !important; padding: 0 !important;
    }
    @media (max-width: 767px) {
      .frame-dock { padding: 10px 14px; gap: 10px; bottom: 12px; }
      .frame-dock .dock-fader { flex-basis: 64px; }
      .frame-dock .dock-title { font-size: 13px; max-width: 42vw; }
      .frame-dock .dock-play { width: 44px; height: 44px; flex-basis: 44px; }
      .frame-dock .dock-wave { display: none; }
      .frame-dock .dock-label { display: none; }
      .frame-dock .dock-vol { display: none; }
      .track-iframe, .track-iframe.is-live { display: block !important; width: 0 !important; height: 0 !important; }
    }
    @media (prefers-reduced-motion: reduce) { .frame-dock.is-playing .dock-wave i { animation: none; } }

  </style>`);

  // 0. Dynamic cinematic background canvas (fixed, behind everything)
  document.body.insertAdjacentHTML('afterbegin', `<div class="frame-canvas" id="frame-canvas"></div>`);

  // 1. Audio Unlock Overlay with Cinematic Collage Background
  // Cinematic collage is now ANIMATED: generated GIFs (from the game trailers) instead of static cover art
  const GIF_BASE = "https://cdn.prod.website-files.com/6a8b9105521b76306e937add/";
  const overlayGifs = [
    GIF_BASE + "6a94d3e4aff009655df6cf44_frame-pragmata.gif",
    GIF_BASE + "6a94d3e4dd1abbc7c34eb4d3_frame-007.gif",
    GIF_BASE + "6a94d3e4dd1abbc7c34eb4e9_frame-crimson.gif",
    GIF_BASE + "6a94d3e473873630ee5cf89e_frame-clair.gif",
    GIF_BASE + "6a94d3e51aa809513b453e7a_frame-stellar.gif",
    GIF_BASE + "6a94d3e52e1ae2b1a1d28da3_frame-control.gif",
    GIF_BASE + "6a94d3e6aff009655df6cf5f_frame-spine.gif",
    GIF_BASE + "6a94d3e62e8689190bfb8a82_frame-stranger.gif",
    GIF_BASE + "6a94d3e6aff21b4a39b4ca9f_frame-witcher.gif"
  ];
  const collageImgs = overlayGifs.map(url => `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`).join('');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="audio-unlock" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(8,8,10,0.94);backdrop-filter:blur(20px);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity 0.8s ease-out;overflow:hidden;">
      <div style="position:absolute;top:-10%;left:-10%;width:120%;height:120%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:18px;opacity:0.16;pointer-events:none;transform:rotate(-4deg) scale(1.1);filter:grayscale(35%) contrast(130%);">${collageImgs}</div>
      <div style="position:relative;z-index:2;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center;border-top:1px solid rgba(229,57,53,0.6);border-bottom:1px solid rgba(229,57,53,0.6);padding:60px 90px;">
        <h1 style="font-size:clamp(64px,11vw,160px);font-weight:900;letter-spacing:-0.04em;margin:0 0 18px;line-height:0.95;text-transform:uppercase;">FRAME</h1>
        <p style="font-family:'SFMono-Regular','Menlo','Consolas',monospace;font-size:12px;letter-spacing:0.42em;text-transform:uppercase;color:#8A8F98;margin:0 0 44px;">The Moments We Never Forgot</p>
        <button style="padding:20px 56px;font-size:14px;font-weight:700;background:transparent;color:#fff;border:1px solid #E53935;border-radius:0;cursor:pointer;letter-spacing:0.32em;text-transform:uppercase;transition:all 0.25s ease;">Enter With Sound</button>
      </div>
    </div>
  `);

  let audioUnlocked = false;
  document.getElementById('audio-unlock').addEventListener('click', function() {
    audioUnlocked = true;
    this.style.opacity = '0';
    setTimeout(() => this.remove(), 800);
    setTimeout(() => {
      const active = document.querySelector('.video-slot.is-active .yt-iframe');
      if (active && active.contentWindow) {
        ytPost(active.contentWindow, 'playVideo');
        ytPost(active.contentWindow, 'unMute');
        ytPost(active.contentWindow, 'setVolume', [100]);
      }
    }, 500);
  });

  // ======================= LIGHTBOX: full-screen gallery viewer =======================
  document.body.insertAdjacentHTML('beforeend', `
    <div class="frame-lightbox" id="frame-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" tabindex="-1">
      <button class="lb-close" aria-label="Close">&#10005;</button>
      <figure><img src="" alt=""><figcaption class="lb-caption"></figcaption></figure>
    </div>
  `);
  const lightbox = document.getElementById('frame-lightbox');
  const lbImg = lightbox.querySelector('img');
  const lbCaption = lightbox.querySelector('.lb-caption');

  function openLightbox(src, caption) {
    lbImg.src = src;
    lbImg.alt = caption || '';
    lbCaption.textContent = caption || '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('.gallery-grid figure').forEach(fig => {
    fig.addEventListener('click', function(ev) {
      ev.stopPropagation();
      if (ev.target.tagName !== 'IMG') return;
      openLightbox(fig.getAttribute('data-zoom'), fig.getAttribute('data-caption'));
    });
  });
  lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function(ev) {
    if (ev.target === lightbox || ev.target === lightbox.querySelector('figure')) closeLightbox();
  });
  document.addEventListener('keydown', function(ev) {
    if (ev.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
  });

  // ======================= DATA — 9 GAMES (+ soundtrack track names) =======================
  const gameData = [
    {
      id: "cWBdELprqqk", start: 26, music: "zmesYuQciYc", musicStart: 31, gif: GIF_BASE + "6a94d3e4aff009655df6cf44_frame-pragmata.gif", accent: "#e53935", track: "Pragmata — Main Theme",
      title: "PRAGMATA",
      desc: "From Capcom comes a breathtaking sci-fi action adventure set in a doomed, dystopian lunar colony. A shipwrecked astronaut and a mysterious little girl must escape a world where nothing is as it seems.",
      lore: "Hundreds of years in the future, Earth's scattered survivors have been forced into the cold vacuum of space. When shipwrecked astronaut David and a mysterious little girl named Luka are stranded on a decaying lunar colony, they must rely on each other to survive one impossible escape. Beneath the colony's rusted corridors and drifting zero-gravity wreckage hides a tragedy older than either of them can remember — and a truth that will rewrite everything humanity thought it knew.",
      combat: [
        "Seamless physics-driven action that reacts to every blow in real time.",
        "Dynamic close-quarters gunplay blended with inhibitor-empowered mobility.",
        "A single CG-quality cinematic continuous take, carrying the entire story.",
        "Encounter design built around gravity: disorienting, thrilling, unforgettable."
      ],
      perf: [
        "Capcom's RE engine scales beautifully — target 60fps with DLSS Quality on PC.",
        "Enable ray-traced reflections for the neon-drenched colony to truly pop.",
        "Reduce shadow quality first if GPU-bound; character detail is well-optimized.",
        "Use an SSD to keep seamless world-streaming stagger-free during zero-G shifts."
      ],
      img1: "https://i.ytimg.com/vi/cWBdELprqqk/maxresdefault.jpg",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/62486c0475c7bf1a14889d61a51ad24f09e5f044/ss_62486c0475c7bf1a14889d61a51ad24f09e5f044.1920x1080.jpg?t=1777351016",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/9699288b90d0aad320e998f107b59edd27e9ea61/ss_9699288b90d0aad320e998f107b59edd27e9ea61.1920x1080.jpg?t=1777351016", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/62486c0475c7bf1a14889d61a51ad24f09e5f044/ss_62486c0475c7bf1a14889d61a51ad24f09e5f044.1920x1080.jpg?t=1777351016", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/26773713a2435c8edc2eac5e7eb234324b3b002f/ss_26773713a2435c8edc2eac5e7eb234324b3b002f.1920x1080.jpg?t=1777351016", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/8913ab7128c72ddd1b407c274e9615b2f6e658a2/ss_8913ab7128c72ddd1b407c274e9615b2f6e658a2.1920x1080.jpg?t=1777351016", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/24bebf802a598b3d5d6838828cf074e4445ec939/ss_24bebf802a598b3d5d6838828cf074e4445ec939.1920x1080.jpg?t=1777351016", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/47776629e71f7769f2482259258a1aeb9babe31c/ss_47776629e71f7769f2482259258a1aeb9babe31c.1920x1080.jpg?t=1777351016", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/5b6a007e52e0b2d4a36b74736ea2fa416830bf6f/ss_5b6a007e52e0b2d4a36b74736ea2fa416830bf6f.1920x1080.jpg?t=1777351016", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/c83fa1a03cf350ae0f049579daaa117414c9c745/ss_c83fa1a03cf350ae0f049579daaa117414c9c745.1920x1080.jpg?t=1777351016"]
    },
    {
      id: "nTUoIyTMw0Q", start: 88, music: "fA82c4YkAZ4", musicStart: 52, gif: GIF_BASE + "6a94d3e4dd1abbc7c34eb4d3_frame-007.gif", accent: "#f39c12", track: "James Bond: First Light — Main Theme",
      title: "007 FIRST LIGHT",
      desc: "From IO Interactive, creators of HITMAN, comes a wholly original James Bond origin story. Earn your 00 status in a brand-new espionage thriller that launched May 2026 on PS5, Windows and Xbox Series X|S.",
      lore: "Before the tuxedos, the martinis and the world-saving, James Bond was a penniless young naval officer with everything to prove. First Light is the studio's definitive Bond origin — a gritty, human spy thriller about the making of the man who would become 007. Across misty Berlin streets, snowbound Nordic estates and the halls of MI6 itself, Bond must earn his licence to kill one impossible mission at a time.",
      combat: [
        "IO Interactive's signature sandbox: every approach is a valid, playable strategy.",
        "Gunfights, stealth takedowns and brutal escape sequences in equal measure.",
        "Iconic supporting cast — M, Q and Moneypenny — woven into brand-new missions.",
        "Reactive, systemic levels where no two runs play the same way."
      ],
      perf: [
        "Aim for 1440p/120fps on high-end rigs; the Glaciert engine is extremely scalable.",
        "Tweak crowd density first — spy-thriller set pieces love packed streetscapes.",
        "DLSS 3 Frame Generation gives 4K HDR playtime a big headroom boost.",
        "Fast NVMe drives cut the taut, filmic scene transitions to near-instant."
      ],
      img1: "https://i.ytimg.com/vi/nTUoIyTMw0Q/maxresdefault.jpg",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/ef374e5e4ede8c71f32d455652bc00f2fa7c035e/ss_ef374e5e4ede8c71f32d455652bc00f2fa7c035e.1920x1080.jpg?t=1786116490",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/ef374e5e4ede8c71f32d455652bc00f2fa7c035e/ss_ef374e5e4ede8c71f32d455652bc00f2fa7c035e.1920x1080.jpg?t=1786116490", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/18787f52adabf0e5248548ed83562e6aac88f94d/ss_18787f52adabf0e5248548ed83562e6aac88f94d.1920x1080.jpg?t=1786116490", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/c5e19e3879ed6da308e952d1e8d7bdc4cd835b4c/ss_c5e19e3879ed6da308e952d1e8d7bdc4cd835b4c.1920x1080.jpg?t=1786116490", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/6ad4e419c1eb043e3a12b9cc37166cdf204725c1/ss_6ad4e419c1eb043e3a12b9cc37166cdf204725c1.1920x1080.jpg?t=1786116490", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/2e3f04c42cca344dd3ca0be30c5078719bce23ed/ss_2e3f04c42cca344dd3ca0be30c5078719bce23ed.1920x1080.jpg?t=1786116490", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/d076a739da6136dc4da2c48750eb6f780d4f826d/ss_d076a739da6136dc4da2c48750eb6f780d4f826d.1920x1080.jpg?t=1786116490", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/4c81e0e09db3feb0ccf680418a1b766989c8173a/ss_4c81e0e09db3feb0ccf680418a1b766989c8173a.1920x1080.jpg?t=1786116490", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/7683959b09f7863c5eb23bfdbcf039269765b5d6/ss_7683959b09f7863c5eb23bfdbcf039269765b5d6.1920x1080.jpg?t=1786116490"]
    },
    {
      id: "YHhwdyWkwTQ", start: 26, music: "vh_kXkCvpmo", musicStart: 17, gif: GIF_BASE + "6a94d3e4dd1abbc7c34eb4e9_frame-crimson.gif", accent: "#8e24aa", track: "Crimson Desert — Main Theme",
      title: "CRIMSON DESERT",
      desc: "A sweeping open-world action-adventure from the creators of Black Desert. Follow mercenary Macduff and his companions as they fight to survive the brutal, unforgiving continent of Pywel.",
      lore: "On the war-ravaged continent of Pywel, mercenaries are the only currency that still buys survival. Macduff and the Grey Mane company roam a land of feuding lords, monstrous beasts and the ghosts of a shattered kingdom. Every contract tests their bonds, every battlefield reshapes the map — and somewhere beyond the blood-soaked frontier lies the crimson desert where the company's true fate will be decided.",
      combat: [
        "Massive, cinematic boss fights that push the engine to its absolute limits.",
        "Fast, weighty melee combos with mounted combat across an open frontier.",
        "Dynamic weather, day/night and ecosystems that fight back in real time.",
        "A living mercenary economy where reputation and coin decide your next move."
      ],
      perf: [
        "Pearl Abyss's bespoke engine favors raw GPU grunt — keep DLSS/FSR Balanced.",
        "Streaming is heavy; a quality SSD materially reduces pop-in during mounted travel.",
        "Dial back ultra particle effects first if frame-rate dips in the big battles.",
        "Lock to 60 and let the engine's animation fidelity shine at 4K."
      ],
      img1: "https://i.ytimg.com/vi/YHhwdyWkwTQ/maxresdefault.jpg",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/b154a083ff9a746c71a1513334042e1bb9403a8b/ss_b154a083ff9a746c71a1513334042e1bb9403a8b.1920x1080.jpg?t=1787909144",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/667d1763ae26137aafbc3140963621f530b43289/ss_667d1763ae26137aafbc3140963621f530b43289.1920x1080.jpg?t=1787909144", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/b154a083ff9a746c71a1513334042e1bb9403a8b/ss_b154a083ff9a746c71a1513334042e1bb9403a8b.1920x1080.jpg?t=1787909144", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/286938f408f5f0c6409f49584f33e8d497433123/ss_286938f408f5f0c6409f49584f33e8d497433123.1920x1080.jpg?t=1787909144", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/91f6ddd6a4cc0f704bee1956701a3f36447fe02a/ss_91f6ddd6a4cc0f704bee1956701a3f36447fe02a.1920x1080.jpg?t=1787909144", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/a14943bf53cb2d32075ed7c42ee50ea085e49fea/ss_a14943bf53cb2d32075ed7c42ee50ea085e49fea.1920x1080.jpg?t=1787909144", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/b24b12cb001104fe90753f043a7f788c705593c2/ss_b24b12cb001104fe90753f043a7f788c705593c2.1920x1080.jpg?t=1787909144", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/669119c3747653f41a46c59f213168448d094e04/ss_669119c3747653f41a46c59f213168448d094e04.1920x1080.jpg?t=1787909144", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/4b178bdd24ed576458116d8d3383b5352dad0fae/ss_4b178bdd24ed576458116d8d3383b5352dad0fae.1920x1080.jpg?t=1787909144"]
    },
    {
      id: "2VaLOc1FpSo", start: 57, music: "3kMbTzomh94", musicStart: 69, gif: GIF_BASE + "6a94d3e473873630ee5cf89e_frame-clair.gif", accent: "#1e88e5", track: "Clair Obscur: Expedition 33 — Main Theme",
      title: "CLAIR OBSCUR: EXPEDITION 33",
      desc: "A turn-based, story-driven RPG from Sandfall Interactive set in a haunted Belle Époque France. Every year the Paintress awakens to paint a number that dooms that age — and you must mount Expedition 33 to end her.",
      lore: "In a France frozen in the beauty of the Belle Époque, the Paintress awakens each year to paint a single number — and every citizen who reaches that age is erased from existence. When the number 33 falls, the last generation able to fight decides to fight back. Expedition 33 is a desperate, cinematic journey of gorgeous melancholy and quiet defiance, where hope is measured in the years left on a clock no one can stop.",
      combat: [
        "Turn-based strategy fused with real-time dodges, parries and combo execution.",
        "A painterly momentum system that rewards bold, aggressive positioning.",
        "Party synergy and character-specific skill trees with deep build variety.",
        "Boss encounters built around breathtaking, slow-burning theatrics."
      ],
      perf: [
        "Unreal Engine 5 with Lumen — enable hardware ray tracing for the painterly light.",
        "Nanite handles the dense Belle Époque architecture with no LOD pop-in.",
        "HDR is a must: the watercolor worlds and aurora skies are the star.",
        "Cap at 60; the cinematic combat already reads beautifully at 4K clarity."
      ],
      img1: "https://i.ytimg.com/vi/2VaLOc1FpSo/maxresdefault.jpg",
      img2: "https://i.ytimg.com/vi/2VaLOc1FpSo/maxresdefault.jpg",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_483a27df5072beb3a4650634a764bda750fbcb82.1920x1080.jpg?t=1782830877", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_e49800e906e8a0f00707458c836567c933603bac.1920x1080.jpg?t=1782830877", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_b8089016095e6a16e324a59c45b2f24a439bd0b3.1920x1080.jpg?t=1782830877", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_8439c07d7b1f2fcfc6449db5f051f8d0867f4785.1920x1080.jpg?t=1782830877", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_9e050e6a61a4d9f4fe54bc62c8c73da38e9a63b0.1920x1080.jpg?t=1782830877", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_d3a10809f5cc2a8df7773f41acd1493f4fb900ec.1920x1080.jpg?t=1782830877", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_ec16f873c7d14fc4a4f17966b25f9712dc486b4a.1920x1080.jpg?t=1782830877", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/ss_c130295c9e1169dc0c63eaae0618e64d06a88c92.1920x1080.jpg?t=1782830877"]
    },
    {
      id: "4aVoaSixc0E", start: 169, music: "RzqcwOcnfs0", musicStart: 14, gif: GIF_BASE + "6a94d3e51aa809513b453e7a_frame-stellar.gif", accent: "#d81b60", bloodRain: true, track: "Stellar Blade: Blood Rain — Original Score",
      title: "STELLAR BLADE: BLOOD RAIN",
      desc: "The direct sequel to Stellar Blade from SHIFT UP, self-published and aimed at a day-one multiplatform launch. Follow new protagonist Evie through a rain-soaked urban warzone against the Naytiba.",
      lore: "In the aftermath of the Colony's war against the Naytiba, a rain-slicked megacity is all that stands between humanity and extinction. Follow Evie, a field agent reshaped by loss, as she cuts a path through streets that breed monsters. With a sentient combat system growing ever more sentient beside her, BLOOD RAIN is a personal, storm-lit story about how far one person will go to pay back the dead.",
      combat: [
        "Gauntlet-driven, acrobatic melee with reverse-grip blades in close quarters.",
        "A ruthless parry-and-punish loop tuned for high-skill, high-reward play.",
        "Dynamic, storm-lit urban arenas that warp mid-fight.",
        "Multiplatform-ready combat built for speed and spectacle alike."
      ],
      perf: [
        "Blur and rain particles are GPU-heavy — DLSS Quality keeps 4K smooth.",
        "Enable ray-traced wet reflections for the neon-soaked streets to shine.",
        "Unreal Engine 5 scales well; pair high textures with a strong GPU.",
        "Expect excellent 60fps headroom on current-gen PC hardware."
      ],
      img1: "https://i.ytimg.com/vi/4aVoaSixc0E/maxresdefault.jpg",
      img2: "https://i.ytimg.com/vi/4aVoaSixc0E/maxresdefault.jpg",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_4291827e357008499d4d5a17bc50d3e93869dd43.1920x1080.jpg?t=1776466244", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_9d4d62e118a167333d53db94354671e10416b25d.1920x1080.jpg?t=1776466244", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_bcb3946482dc5a1221c024098d2ac09e80255f3e.1920x1080.jpg?t=1776466244", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_1ae903bf4153fa2c2b3ee4381eb355532ba79eab.1920x1080.jpg?t=1776466244", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_0a156afe90170ba75773a6fe901153c4dd318980.1920x1080.jpg?t=1776466244", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_590074c0cfa8c7098358a128f656b0198af8f0be.1920x1080.jpg?t=1776466244", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_02282b4eb4c8b13129a13908b85840dbf2168644.1920x1080.jpg?t=1776466244", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/ss_2d4ad1a81618920416e7b68d02dc266ac898f144.1920x1080.jpg?t=1776466244"]
    },
    {
      id: "lTHTfqPTQ1k", start: 35, music: "Qo8VOF3hmqE", musicStart: 0, gif: GIF_BASE + "6a94d3e52e1ae2b1a1d28da3_frame-control.gif", accent: "#6a1b9a", track: "Control: Resonant — Main Theme",
      title: "CONTROL RESONANT",
      desc: "From Remedy Entertainment — the long-awaited sequel to CONTROL, arriving September 24 2026. Guide Dylan as Manhattan is reshaped and reality is redefined by a godlike paranatural force.",
      lore: "The Oldest House was only the beginning. Now reality itself is fraying across a Manhattan that no longer plays by its own rules. Step into the boots of Dylan Faden as he searches for meaning inside a cityscape constantly rewriting itself. Resonant is Remedy at the height of its powers — conspiracy, cryptic entities and reality-warping chaos that pulls the rug from under every expectation.",
      combat: [
        "A Devil May Cry-esque evolution, built on mastering paranatural powers.",
        "Weave gunplay, objects and levitation into fluid, airborne combos.",
        "Reality-warping arenas that reshape the battlefield in your favor.",
        "A deep progression system that defines how Dylan's abilities manifest."
      ],
      perf: [
        "Remedy's Northlight engine shines with DLSS 3 + ray-traced global illumination.",
        "Crowded NYC street scenes love a strong CPU — balance core/graphics settings.",
        "Enable HDR to sell the shifting, otherworldly light across Manhattan.",
        "An SSD keeps the surreal reality-transitions seamless and lag-free."
      ],
      img1: "https://i.ytimg.com/vi/lTHTfqPTQ1k/maxresdefault.jpg",
      img2: "https://i.ytimg.com/vi/lTHTfqPTQ1k/maxresdefault.jpg",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/422f3eed36d3033c4b0f4fde485c29b980e49454/ss_422f3eed36d3033c4b0f4fde485c29b980e49454.1920x1080.jpg?t=1787683983", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/8b78ebe9024b52aded07863c0da0cbb08c1a966f/ss_8b78ebe9024b52aded07863c0da0cbb08c1a966f.1920x1080.jpg?t=1787683983", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/4ce55d730791b45afae9fe2573ff764b34103a75/ss_4ce55d730791b45afae9fe2573ff764b34103a75.1920x1080.jpg?t=1787683983", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/3cd16ad00ff2e2f7a2e5c5d7781597fdd32ed6c0/ss_3cd16ad00ff2e2f7a2e5c5d7781597fdd32ed6c0.1920x1080.jpg?t=1787683983", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/75b1cde9947eea89eed52cf8f6471683f2e666a9/ss_75b1cde9947eea89eed52cf8f6471683f2e666a9.1920x1080.jpg?t=1787683983", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/36eb4c588274f15ea0d958af6db8b2283602cb55/ss_36eb4c588274f15ea0d958af6db8b2283602cb55.1920x1080.jpg?t=1787683983", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/08b6018c06d5125a39ff34a395e0dcfdede8bde8/ss_08b6018c06d5125a39ff34a395e0dcfdede8bde8.1920x1080.jpg?t=1787683983", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/062a27d1b18679df1ecd4faf90af2c3f52e41dc1/ss_062a27d1b18679df1ecd4faf90af2c3f52e41dc1.1920x1080.jpg?t=1787683983"]
    },
    {
      id: "BoHg3zeUSWI", start: 36, music: "UHqq-HDH7_U", musicStart: 21, gif: GIF_BASE + "6a94d3e6aff009655df6cf5f_frame-spine.gif", accent: "#00acc1", track: "Spine — Cyberpunk Underscore",
      title: "SPINE",
      desc: "A cinematic single-player Gun Fu action game from Nekki. Step into a cyberpunk world as street artist Redline and her sentient combat implant Spine, defying an autocratic AI regime.",
      lore: "In a neon-drenched dystopia run by a cold autocratic AI, street artist Redline is nothing — until she finds Spine, a sentient combat implant that turns her raw fury into lethal choreography. Together they hunt the regime that took her brother, painting the city red one impossible gun-fu sequence at a time. SPINE is a kinetic, stylish love letter to the Gun Fu genre, with a partner dynamic at the heart of every fight.",
      combat: [
        "Flow-state gun fu: gunplay, martial arts and slow-mo woven into one.",
        "Partner-driven combat where Spine and Redline move as one.",
        "Choreographed takedowns that feel like an interactive action film.",
        "A stylish, brutal close-quarters system built on momentum and timing."
      ],
      perf: [
        "Fast-paced choreography rewards locked 60fps — prefer smoothness over ultra.",
        "Motion-blur and slow-mo effects are GPU-light; keep them high for impact.",
        "Nekki's own animation tech means buttery transitions on modest hardware.",
        "HDR + high contrast settings make the neon-noir cityscape sing."
      ],
      img1: "https://i.ytimg.com/vi/BoHg3zeUSWI/maxresdefault.jpg",
      img2: "https://i.ytimg.com/vi/BoHg3zeUSWI/maxresdefault.jpg",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/9d51f7e4288d8c6d2bdb8db8ef6cd60026cae6b7/ss_9d51f7e4288d8c6d2bdb8db8ef6cd60026cae6b7.1920x1080.jpg?t=1787846453", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/26abb28c619d242fb2b01b059ad0b27b4b2ff804/ss_26abb28c619d242fb2b01b059ad0b27b4b2ff804.1920x1080.jpg?t=1787846453", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/ss_4a61343924dfa845b6d84270057eb88125028e44.1920x1080.jpg?t=1787846453", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/8a102bbc7d71ce6336d4703f4ba76976040139e7/ss_8a102bbc7d71ce6336d4703f4ba76976040139e7.1920x1080.jpg?t=1787846453", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/f7d747741c9749bc64309f4601c1c8148e1e768e/ss_f7d747741c9749bc64309f4601c1c8148e1e768e.1920x1080.jpg?t=1787846453", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/ss_cd498c0db069fcfd8ac81bd07755170de64a5f05.1920x1080.jpg?t=1787846453", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/ss_abb055621c4eb52fb23a3181949a2c846a23f208.1920x1080.jpg?t=1787846453", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/d403db2fd19af6c188153b13edbc57feeb8bcf0d/ss_d403db2fd19af6c188153b13edbc57feeb8bcf0d.1920x1080.jpg?t=1787846453"]
    },
    {
      id: "avpTgTNadh4", start: 216, music: "slBdjhrz2SE", musicStart: 42, gif: GIF_BASE + "6a94d3e62e8689190bfb8a82_frame-stranger.gif", accent: "#c62828", track: "Stranger Than Heaven — Showman Suite",
      title: "STRANGER THAN HEAVEN",
      desc: "A fifty-year action-adventure saga from Ryu Ga Gotoku Studio and SEGA. Follow marginalized men fighting to survive and thrive as showmen across five cities and eras of modern Japan.",
      lore: "Japan, fifty years — and the same desperate men searching for a place to call home. From the ashes of post-war streets to the neon glow of the modern era, Stranger Than Heaven chronicles the outcasts who found family in each other and a living on the stage. It is Ryu Ga Gotoku's most ambitious and emotional saga yet: brutal, funny and unapologetically human.",
      combat: [
        "Raw, extreme-melee combat fused with a music-forward showman fantasy.",
        "Five era-hopping protagonists with distinct, era-appropriate playstyles.",
        "A sprawling open world spanning five cities and fifty years of Japan.",
        "Themed fights that turn every brawl into a stage-worthy spectacle."
      ],
      perf: [
        "Dragon Engine is CPU-lean; a mid-range GPU excels at 1440p/60.",
        "Keep texture streaming on fast storage to avoid pop-in across eras.",
        "Dial dynamic resolution on to hold a steady 60 during crowded brawls.",
        "Rich Japanese voice + subtitles preserve the showman spectacle."
      ],
      img1: "https://i.ytimg.com/vi/avpTgTNadh4/maxresdefault.jpg",
      img2: "https://i.ytimg.com/vi/avpTgTNadh4/maxresdefault.jpg",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/f65464e2f5e566b75133e70b66835eaa1426b346/ss_f65464e2f5e566b75133e70b66835eaa1426b346.1920x1080.jpg?t=1787806014", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/b5e06a575d1056516057e17f5480df5469025eab/ss_b5e06a575d1056516057e17f5480df5469025eab.1920x1080.jpg?t=1787806014", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/34f79225201d7b3101c919ff4f54f6b3a66d7997/ss_34f79225201d7b3101c919ff4f54f6b3a66d7997.1920x1080.jpg?t=1787806014", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/7bba5e7ff5f318e7e53aba322b45a4b47b69aecc/ss_7bba5e7ff5f318e7e53aba322b45a4b47b69aecc.1920x1080.jpg?t=1787806014", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/3e647a8f13db648173828e0ab5f98361b3695617/ss_3e647a8f13db648173828e0ab5f98361b3695617.1920x1080.jpg?t=1787806014", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/fa52330262734f26bca624c886fbd50ab0995dc1/ss_fa52330262734f26bca624c886fbd50ab0995dc1.1920x1080.jpg?t=1787806014", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/4d4cd5c94d9a0bd645bbbf2a484626260bb8ee20/ss_4d4cd5c94d9a0bd645bbbf2a484626260bb8ee20.1920x1080.jpg?t=1787806014", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/dde75984ccd7f1a6c957174b23cd4344bd0dbe44/ss_dde75984ccd7f1a6c957174b23cd4344bd0dbe44.1920x1080.jpg?t=1787806014"]
    },
    {
      id: "SB3siHVCHpY", start: 21, music: "viM0-3PXef0", musicStart: 26, gif: GIF_BASE + "6a94d3e6aff21b4a39b4ca9f_frame-witcher.gif", accent: "#2e7d32", track: "The Witcher 3: Sons of the Past — Lets Play",
      title: "THE WITCHER 3: SONGS OF THE PAST",
      desc: "The third expansion to The Witcher 3 from CD PROJEKT RED and Fool's Theory. Return to the role of Geralt of Rivia for a brand-new adventure in the land of Letten, arriving 2027.",
      lore: "The Path calls Geralt once more — this time to the war-scarred land of Letten, where a haunting melody draws the White Wolf into a web of new quests, weathered faces and buried secrets. Songs of the Past is the long-awaited third expansion, co-developed by CD PROJEKT RED and the veterans of Fool's Theory. But the Path is never straightforward, and just below the surface of Letten's misty valleys lurks something far more sinister.",
      combat: [
        "The acclaimed dark-fantasy combat, refined for new foes and systems.",
        "A deep skill/build system letting you define your own witcher.",
        "New quests and characters woven into the emotional heart of TW3.",
        "Unforgettable monster hunts that reward preparation and lore-knowledge."
      ],
      perf: [
        "The Witcher 3 received a next-gen update — leverage ray tracing + DLSS.",
        "Ultra+ textures sing at 4K; a strong GPU keeps 60fps in heavy fights.",
        "Stock settings already run great; use FSR on mid-range hardware.",
        "Mod support makes Songs of the Past endlessly replayable on PC."
      ],
      img1: "https://i.ytimg.com/vi/SB3siHVCHpY/maxresdefault.jpg",
      img2: "https://i.ytimg.com/vi/SB3siHVCHpY/maxresdefault.jpg",
      shots: ["https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/e6adbc6674a2cd6ae9dd59917a1ce3bf8c219e48/ss_e6adbc6674a2cd6ae9dd59917a1ce3bf8c219e48.1920x1080.jpg?t=1787926037", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/11c2ab33bdd2fe545eba5daa0ef4dd143b27ec02/ss_11c2ab33bdd2fe545eba5daa0ef4dd143b27ec02.1920x1080.jpg?t=1787926037", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/ed0058ce7306085223d52dedb078309295916a97/ss_ed0058ce7306085223d52dedb078309295916a97.1920x1080.jpg?t=1787926037", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/18d00b2ddbe8deb70a8028da9726517be88d7af0/ss_18d00b2ddbe8deb70a8028da9726517be88d7af0.1920x1080.jpg?t=1787926037", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/271acc7cebd1faeaa848997e60eb8f5a92ff94fd/ss_271acc7cebd1faeaa848997e60eb8f5a92ff94fd.1920x1080.jpg?t=1787926037", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/9f1c3c1d58fa8d6349ad5c6d1203d6f5fdedf682/ss_9f1c3c1d58fa8d6349ad5c6d1203d6f5fdedf682.1920x1080.jpg?t=1787926037", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/29507154017a32021d8e948f1fe4938d3f307a6a/ss_29507154017a32021d8e948f1fe4938d3f307a6a.1920x1080.jpg?t=1787926037", "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/e204d9208c5e1cf37e5d0287d27ce725c91ed98b/ss_e204d9208c5e1cf37e5d0287d27ce725c91ed98b.1920x1080.jpg?t=1787926037"]
    }
  ];

  // ======================= AUTOGEN: inject ALL 9 iframes immediately =======================
  const wrapper = document.querySelector('.frame-wrapper') || document.body;
  let gridContainer = document.querySelector('.moment-grid');
  if (!gridContainer) {
    gridContainer = document.createElement('div');
    gridContainer.className = 'moment-grid';
    wrapper.appendChild(gridContainer);
  }

  // Build every card with a persistent, preloaded (hidden) iframe — zero load delay
  gameData.forEach((g) => {
    gridContainer.insertAdjacentHTML('beforeend', `
      <div class="moment-card section${g.bloodRain ? ' bloodrain' : ''}" data-accent="${g.accent}" data-index="${gameData.indexOf(g)}" style="position:relative;width:100%;display:block;">
        <div class="video-container" style="height:85vh;position:relative;clip-path:polygon(10% 0,100% 0,90% 100%,0 100%);">
          <div class="video-slot">
            <iframe class="yt-iframe" title="${g.title}" src="https://www.youtube.com/embed/${g.id}?autoplay=0&mute=1&controls=0&loop=1&playlist=${g.id}&start=${g.start}&enablejsapi=1" allow="autoplay; fullscreen" style="position:absolute;top:50%;left:50%;width:130vw;height:130vh;transform:translate3d(-50%,-50%,0);transform:translate(-50%,-50%) translateZ(0);backface-visibility:hidden;-webkit-backface-visibility:hidden;border:0;"></iframe>
          </div>
        </div>
      </div>
    `);
  });

  // Hero intro
  gridContainer.insertAdjacentHTML('afterbegin', `
    <div style="height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 5%;width:100%;">
      <p class="reveal-target" style="--index:0;font-family:'SFMono-Regular','Menlo','Consolas',monospace;font-size:12px;letter-spacing:0.42em;text-transform:uppercase;color:#7a7a82;margin:0 0 22px;">A Cinematic Anthology</p>
      <h2 class="reveal-target" style="--index:1;font-size:clamp(40px,6vw,88px);color:#fff;text-transform:uppercase;letter-spacing:-0.03em;margin:0 0 40px;font-weight:900;line-height:0.95;">Scroll Down<br>to Begin</h2>
      <div class="reveal-target" style="--index:2;width:1px;height:140px;background:linear-gradient(to bottom,#E53935,transparent);"></div>
    </div>
  `);

  // ======================= INJECT DEEP-DIVE CONTENT =======================
  const cards = document.querySelectorAll('.moment-card');
  cards.forEach((card, index) => {
    const d = gameData[index] || gameData[0];
    card.style.paddingBottom = '18vh';

    const combatItems = d.combat.map((l, i) => `<li style="display:flex;gap:18px;align-items:baseline;padding:15px 0;border-bottom:1px solid #1f1f24;"><span class="editorial-ghost" style="flex:0 0 34px;">0${i+1}</span><span style="font-size:17px;line-height:1.6;color:#cfcfd5;">${l}</span></li>`).join('');

    card.insertAdjacentHTML('beforeend', `
      <div class="game-info" data-accent="${d.accent}" style="display:flex;flex-direction:column;gap:0;padding:110px 5% 40px;max-width:1400px;margin:0 auto;width:100%;">

        <!-- EDITORIAL HERO: sharp framed header, left rail accent -->
        <div class="reveal-target editorial-hero" style="--index:0;width:100%;border-left:2px solid ${d.accent};padding-left:32px;margin-bottom:16px;">
          <p class="editorial-kicker" style="margin:0 0 22px;">FRAME / 0${index+1} // FEATURED</p>
          <h3 style="font-size:clamp(52px,7.5vw,116px);line-height:0.92;margin:0 0 26px;color:#fff;font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;">${d.title}</h3>
          <p style="font-size:clamp(17px,1.6vw,22px);line-height:1.65;color:#b9b9c3;max-width:820px;margin:0;">${d.desc}</p>
        </div>
        <div class="reveal-target editorial-rule accent" style="--index:1;width:100%;margin-bottom:26px;"></div>

        <div class="reveal-target" style="--index:2;width:100%;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:48px;align-items:start;margin-bottom:90px;">
          <div style="min-width:0;border-top:1px solid #26262b;">
            <img src="${d.img1}" style="width:100%;display:block;object-fit:cover;aspect-ratio:16/9;filter:grayscale(12%) contrast(108%);">
            <div class="editorial-rule" style="width:100%;"></div>
            <p class="editorial-ghost" style="margin:10px 0 0;text-align:right;">CAP.01 — SHOT 0${index+1}</p>
          </div>
          <div style="min-width:0;">
            <p class="editorial-kicker" style="margin:0 0 18px;">The Lore</p>
            <p style="font-size:17px;line-height:1.85;color:#cfcfd5;margin:0;">${d.lore}</p>
          </div>
        </div>

        <div class="reveal-target" style="--index:3;width:100%;display:grid;grid-template-columns:1fr;gap:0;margin-bottom:90px;border-top:1px solid #26262b;">
          <p class="editorial-kicker" style="margin:26px 0 6px;">Combat System</p>
          <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:56px;">
            ${combatItems}
          </ul>
        </div>

        <div class="reveal-target" style="--index:4;width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin-bottom:90px;border-top:1px solid #26262b;">
          ${d.perf.map((l, i) => `<div class="perf-cell" style="padding:22px 18px;border-right:1px solid #232329;${i===0?'border-left:1px solid #232329;':''}"><p class="editorial-ghost" style="margin:0 0 12px;">PERF.0${i+1}</p><p style="font-size:14px;line-height:1.6;color:#9a9aa4;margin:0;">${l}</p></div>`).join('')}
        </div>

        <div class="reveal-target" style="--index:5;width:100%;margin-bottom:40px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid #26262b;padding-bottom:16px;">
            <h4 style="font-size:13px;color:#fff;text-transform:uppercase;font-weight:700;letter-spacing:0.2em;margin:0;">The Gallery</h4>
            <span class="editorial-ghost">08 SHOTS</span>
          </div>
          <div class="gallery-grid" data-gallery="${index}" data-gallery-idx="${index}" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:24px;display:grid;">${(d.gif?'<figure style="margin:0;position:relative;border:1px solid #202027;grid-column:1 / -1;--index:0;" data-zoom="'+d.gif+'" data-caption="'+d.title+' — Motion Loop"><img loading="lazy" decoding="async" src="'+d.gif+'" alt="'+d.title+' motion loop" style="width:100%;height:100%;object-fit:cover;aspect-ratio:21/9;display:block;"><figcaption class="editorial-ghost" style="position:absolute;top:10px;left:12px;margin:0;color:#fff;mix-blend-mode:difference;">MOTION</figcaption></figure>':'')}${(d.shots||d.combat.slice(0,6).map(function(){return d.img1})).map(function(s,i){ var span=(i===0)?'grid-column:1 / -1;':'';var isize=(i===0)?'aspect-ratio:21/9;':'aspect-ratio:16/10;'; return '<figure style="margin:0;position:relative;border:1px solid #202027;--index:'+(i+1)+';" data-index="'+(i+1)+'" data-zoom="'+s+'" data-caption="'+d.title+' — Shot 0'+(i+1)+'"><img loading="lazy" decoding="async" src="'+s+'" alt="'+d.title+' shot '+(i+1)+'" style="width:100%;height:100%;object-fit:cover;'+isize+';display:block;'+'"><figcaption class="editorial-ghost" style="position:absolute;top:10px;left:12px;margin:0;color:#fff;mix-blend-mode:difference;">0'+(i+1)+'</figcaption></figure>';}).join('')}</div>
        </div>

      </div>
    `);
  });

  // ======================= STAGGERED CASCADE OBSERVER (IN & OUT) =======================
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        entry.target.classList.remove('is-leaving');
      } else {
        entry.target.classList.add('is-leaving');
        entry.target.classList.remove('is-visible');
      }
    });
  }, { rootMargin: '-20% 0px -20% 0px' });
  document.querySelectorAll('.reveal-target').forEach(el => revealObs.observe(el));

  // Gallery stagger: each image inherits --index from its figure; drive in/out on the grid
  const galleryObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const grid = entry.target;
      if (entry.isIntersecting) {
        grid.classList.add('gallery-in');
        grid.classList.remove('gallery-out');
      } else {
        grid.classList.add('gallery-out');
        grid.classList.remove('gallery-in');
      }
    });
  }, { rootMargin: '-20% 0px -20% 0px' });
  document.querySelectorAll('.gallery-grid').forEach(gg => galleryObs.observe(gg));

  // ======================= ZERO-LAG VIDEO SWITCHING + DYNAMIC BG + SECTION-LOCKED SOUNDTRACK =======================
  const canvas = document.getElementById('frame-canvas');

  function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0,2), 16), g = parseInt(h.substring(2,4), 16), b = parseInt(h.substring(4,6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function shiftBackground(accent) {
    if (!canvas) return;
    canvas.style.cssText = `--glow:${hexToRgba(accent, 0.2)};`;
    canvas.style.background = `radial-gradient(1200px 800px at 80% -10%, ${hexToRgba(accent, 0.32)}, transparent 60%), radial-gradient(1000px 700px at 10% 110%, #11131f, transparent 60%)`;
  }

  // ==========================================================================
  // GLOBAL FLOATING AUDIO DOCK + BIDIRECTIONAL SCROLL AUDIO MANAGEMENT
  // A single persistent glass dock (play/pause, equalizer bars, title, volume)
  // that syncs to the ACTIVE section's soundtrack, and enforces strict
  // mute/pause whenever the user scrolls BACKWARD or a video trailer is on
  // screen — guaranteeing that no two audio streams ever overlap.
  // ==========================================================================
  const trackFrames = {};  // idx -> { iframe, playing }

  // audio state machine
  const dock = {
    activeIdx: 0,
    playing: false,      // dock is genuinely driving audio right now
    playIntended: true,  // user wants the soundtrack for the current section
    volume: 90,
    lastY: window.pageYOffset || 0,
    scrollDir: 1,        // 1 = forward (down), -1 = backward (up)
    videoActive: false   // true while the active section's trailer is on screen
  };

  document.querySelectorAll('.moment-card').forEach((card, idx) => {
    const g = gameData[idx];
    const f = document.createElement('iframe');
    f.className = 'track-iframe';
    f.setAttribute('allow', 'autoplay');
    f.title = 'Soundtrack player';
    f.src = `https://www.youtube.com/embed/${g.music}?autoplay=0&mute=1&controls=0&enablejsapi=1&playlist=${g.music}&loop=1&start=${g.musicStart}&playsinline=1&iv_load_policy=3&modestbranding=1`;
    document.body.appendChild(f);
    trackFrames[idx] = { iframe: f, playing: false };
  });

  // --- lifecycle of the single promoted visible player --------------------
  function setLiveIframe(idx) {
    Object.keys(trackFrames).forEach(k => {
      trackFrames[k].iframe.classList.toggle('is-live', parseInt(k, 10) === idx);
    });
  }

  // --- dock DOM ------------------------------------------------------------
  const dockEl = document.createElement('div');
  dockEl.className = 'frame-dock';
  dockEl.innerHTML = `
    <button class="dock-play" aria-label="Play or pause soundtrack">
      <span class="ico-play" style="font-size:17px;">&#9654;</span>
      <span class="ico-pause" style="font-size:15px;">&#10073;&#10073;</span>
    </button>
    <div class="dock-meta">
      <span class="dock-label">FRAME / Now Syncing</span>
      <span class="dock-title">${gameData[0].track || gameData[0].title}</span>
    </div>
    <div class="dock-wave">${'<i></i>'.repeat(20)}</div>
    <input class="dock-fader" type="range" min="0" max="100" value="90" aria-label="Volume">
    <span class="dock-vol">90</span>
  `;
  // DOCK GATE: the floating dock starts hidden and only appears once the user scrolls
  // past the first hero video (PRAGMATA) — never before.
  dockEl.classList.add('is-dock-hidden');
  document.body.appendChild(dockEl);
  const dockPlayBtn = dockEl.querySelector('.dock-play');
  const dockTitle = dockEl.querySelector('.dock-title');
  const dockVol = dockEl.querySelector('.dock-vol');
  const dockFader = dockEl.querySelector('.dock-fader');

  function postTrack(idx, cmd, args) {
    const t = trackFrames[idx];
    if (!t || !t.iframe.contentWindow) return false;
    return ytPost(t.iframe.contentWindow, cmd, args);
  }

  // Route the section's game iframe (its cinematic trailer score) to take over audio.
  function commandGameAudio(idx) {
    const card = document.querySelectorAll('.moment-card')[idx];
    const slot = card ? card.querySelector('.video-slot') : null;
    const gFrame = slot ? slot.querySelector('.yt-iframe') : null;
    if (gFrame && gFrame.contentWindow) {
      ytPost(gFrame.contentWindow, 'unMute');
      ytPost(gFrame.contentWindow, 'setVolume', [100]);
    }
  }

  function dockPlay() {
    // single-source playback: pause every other section stream
    Object.keys(trackFrames).forEach(k => {
      const ki = parseInt(k, 10);
      if (ki !== dock.activeIdx && trackFrames[ki].playing) {
        postTrack(ki, 'pauseVideo');
        trackFrames[ki].playing = false;
      }
    });
    setLiveIframe(dock.activeIdx);
    postTrack(dock.activeIdx, 'playVideo');
    postTrack(dock.activeIdx, 'unMute');
    postTrack(dock.activeIdx, 'setVolume', dock.volume);
    trackFrames[dock.activeIdx].playing = true;
    dock.playing = true;
    dockEl.classList.add('is-playing');
  }

  function dockPause() {
    postTrack(dock.activeIdx, 'pauseVideo');
    // hard-mute too: guarantee this soundtrack contributes zero audio right now
    postTrack(dock.activeIdx, 'mute');
    if (trackFrames[dock.activeIdx]) trackFrames[dock.activeIdx].playing = false;
    dock.playing = false;
    dockEl.classList.remove('is-playing');
  }

  // ZERO-OVERLAP GUARANTEE: unconditionally silence the soundtrack stream — both a
  // hard pause AND a mute are pushed so no audio can bleed while a trailer is on screen.
  function killTrackAudio(idx) {
    const i = idx === undefined ? dock.activeIdx : idx;
    postTrack(i, 'pauseVideo');
    postTrack(i, 'mute');
    if (trackFrames[i]) trackFrames[i].playing = false;
    if (i === dock.activeIdx) {
      dock.playing = false;
      dockEl.classList.remove('is-playing');
    }
  }

  // BIDIRECTIONAL STRICT MUTE + MUTUAL EXCLUSIVITY: the instant a video trailer is
  // active (videoActive === true) the soundtrack is hard-paused AND muted — the two
  // streams can NEVER overlap. Soundtrack resumes ONLY when no trailer is on screen,
  // the user is not scrolling backward, and the user is listening via the dock.
  function syncAudio() {
    if (typeof audioUnlocked === 'undefined' || !audioUnlocked) return;
    // hard mutual-exclusivity gate: trailer on screen -> soundtrack must be silent
    if (dock.videoActive) {
      killTrackAudio();
      return;
    }
    const blocked = dock.scrollDir === -1;
    if (blocked) {
      if (dock.playing) dockPause();
    } else if (dock.playIntended) {
      if (!dock.playing) dockPlay();
    }
  }

  dockPlayBtn.addEventListener('click', function() {
    dock.playIntended = !dock.playing;
    if (dock.playIntended) dockPlay(); else dockPause();
    syncAudio();
  });

  dockFader.addEventListener('input', function() {
    dock.volume = parseInt(dockFader.value, 10);
    dockVol.textContent = dock.volume;
    postTrack(dock.activeIdx, 'setVolume', [dock.volume]);
  });

  // expose dock so the active observer can sync section state
  function syncDockState(idx) {
    dock.activeIdx = idx;
    const g = gameData[idx] || gameData[0];
    dockTitle.textContent = g.track || g.title;
    dockEl.style.setProperty('--accent', g.accent || '#e53935');
    setLiveIframe(idx);
  }

  // --- scroll-direction tracking (bidirectional) --------------------------
  let scrollRAF = false;
  function onScrollTick() {
    const y = window.pageYOffset || 0;
    if (y > dock.lastY + 2) dock.scrollDir = 1;
    else if (y < dock.lastY - 2) dock.scrollDir = -1;
    dock.lastY = y;
    updateDockGate();
    syncActiveSection();
    syncAudio();
    scrollRAF = false;
  }
  function onScroll() {
    if (!scrollRAF) { scrollRAF = true; requestAnimationFrame(onScrollTick); }
  }
  document.addEventListener('scroll', onScroll, { passive: true });

  // DOCK GATE: the dock stays hidden while the first hero video (PRAGMATA) is on
  // screen; the instant that video's bottom edge clears the top of the window the
  // dock glides in. It never appears before then.
  let dockGated = true;
  const firstCard = document.querySelector('.moment-card');
  const firstVidEdge = firstCard ? firstCard.querySelector('.video-container') : null;
  function updateDockGate() {
    if (!dockGated) return;
    if (firstVidEdge) {
      const r = firstVidEdge.getBoundingClientRect();
      if (r.bottom <= 0) dockGated = false; // scrolled past the first video
    }
    dockEl.classList.toggle('is-dock-hidden', dockGated);
  }

  // ENGAGE POINT / SECTION TRACKING -----------------------------
  // A section's audio begins the moment its game title reaches the top of the
  // window. Instead of a fragile zero-height IntersectionObserver, this is driven
  // directly from the scroll handler: each tick we compare the title's document
  // position against scrollY, so the engage (and exit) is deterministic and always
  // fires the first time — no "scroll down, scroll back up" to trigger it.
  const sectionCards = Array.from(document.querySelectorAll('.moment-card'));
  sectionCards.forEach(c => {
    c.querySelectorAll('.video-slot.is-active').forEach(s => s.classList.remove('is-active'));
  });
  // which sections have had their audio engaged (trailer playing / videoActive)
  const engaged = new Set();
  // offset so the "top" is reached when the title is ~just pinned under the viewport top
  const TITLE_TOP_LINE = 12;

  function engageSection(idx, card, slot, iframe, accent) {
    engaged.add(idx);
    document.querySelectorAll('.video-slot.is-active').forEach(s => {
      if (s !== slot) {
        s.classList.remove('is-active');
        const f = s.querySelector('.yt-iframe');
        if (f && f.contentWindow) ytPost(f.contentWindow, 'pauseVideo');
      }
    });
    if (slot) slot.classList.add('is-active');
    document.querySelectorAll('.moment-card').forEach((c, ci) => {
      if (ci < idx) c.classList.add('dimmed');
      else c.classList.remove('dimmed');
    });
    shiftBackground(accent);
    dock.videoActive = true;
    syncDockState(idx);
    dock.playIntended = true;
    // INSTANT VIDEO RENDER / BLACK-SCREEN FIX: force a synchronous layout reflow on
    // the freshly-activated slot (reading layout metrics forces the browser to recompute
    // and promote the compositor layer), THEN fire playVideo on the next paint frame
    // (double-rAF) so the first visible frame is painted before playback starts. Sending
    // playVideo synchronously at the same tick opacity reaches 0->1 can drop the iframe's
    // paint layer and render a permanent black screen until a manual scroll repaints it.
    if (slot) { void slot.offsetHeight; void slot.getBoundingClientRect(); }
    if (iframe) { iframe.style.visibility = 'hidden'; void iframe.offsetHeight; iframe.style.visibility = ''; }
    const paintThenPlay = function() {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          if (iframe && iframe.contentWindow) {
            ytPost(iframe.contentWindow, 'playVideo');
            if (typeof audioUnlocked !== 'undefined' && audioUnlocked) {
              ytPost(iframe.contentWindow, 'unMute');
              ytPost(iframe.contentWindow, 'setVolume', [100]);
            }
          }
        });
      });
    };
    paintThenPlay();
    syncAudio();
  }

  function releaseSection(idx, iframe) {
    engaged.delete(idx);
    if (iframe && iframe.contentWindow) {
      ytPost(iframe.contentWindow, 'pauseVideo');
    }
    dock.videoActive = false;
    syncAudio();
  }

  // Walk every title each scroll tick; engage the highest title that has reached
  // the top, and release every other engaged section.
  function syncActiveSection() {
    const y = window.pageYOffset || 0;
    const cur = sectionCards.map((c, i) => {
      const hero = c.querySelector('.editorial-hero');
      const r = hero ? hero.getBoundingClientRect() : null;
      return { idx: i, card: c, top: r ? (r.top + y) : Infinity };
    });
    let active = -1;
    for (let i = 0; i < cur.length; i++) {
      if (cur[i].top - TITLE_TOP_LINE <= y) { active = i; }
    }
    // --- release any previously-engaged section that is no longer the active one ---
    const toRelease = Array.from(engaged).filter(idx => idx !== active);
    toRelease.forEach(idx => {
      const c = sectionCards[idx];
      const slot = c ? c.querySelector('.video-slot') : null;
      const iframe = slot ? slot.querySelector('.yt-iframe') : null;
      releaseSection(idx, iframe);
    });
    // --- engage the active one if not already ---
    if (active !== -1 && !engaged.has(active)) {
      const c = sectionCards[active];
      const slot = c.querySelector('.video-slot');
      const iframe = slot ? slot.querySelector('.yt-iframe') : null;
      const accent = c.getAttribute('data-accent') || '#e53935';
      engageSection(active, c, slot, iframe, accent);
    }
  }

  // ======================= PREDICTIVE N+1 PRE-LOAD (instant video, zero lag) =======================
  function postToFrame(container, payload) {
    const f = container ? container.querySelector('.yt-iframe') : null;
    if (!f || !f.contentWindow) return;
    // Same readiness gating as ytPost (page-local Set/Map) so preload commands never
    // hit the PlayerProxy race and never read cross-origin window properties.
    const win = f.contentWindow;
    if (ytReadyWins.has(win)) { try { win.postMessage(payload, YT_ORIGIN); } catch (e) {} return; }
    if (!ytQueues.has(win)) ytQueues.set(win, []);
    ytQueues.get(win).push(payload);
    if (!ytTimers.has(win)) {
      ytTimers.set(win, setTimeout(function() {
        ytReadyWins.add(win);
        if (ytTimers.has(win)) { clearTimeout(ytTimers.get(win)); ytTimers.delete(win); }
        ytFlush(win);
      }, 2500));
    }
  }
  function prepNext(nextIndex) {
    if (nextIndex >= gameData.length) nextIndex = 0;
    const target = document.querySelectorAll('.moment-card')[nextIndex];
    const slot = target ? target.querySelector('.video-slot') : null;
    if (!slot) return;
    const g = gameData[nextIndex];
    postToFrame(slot, '{"event":"command","func":"playVideo","args":""}');
    postToFrame(slot, '{"event":"command","func":"seekTo","args":[' + (g ? g.start : 0) + ']}');
    setTimeout(() => { postToFrame(slot, '{"event":"command","func":"pauseVideo","args":""}'); }, 1200);
  }
  const prepObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = parseInt(entry.target.getAttribute('data-gallery-idx') || '0', 10);
        prepNext(idx + 1);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.gallery-grid').forEach(gg => prepObs.observe(gg));

  }
  run();
})();
