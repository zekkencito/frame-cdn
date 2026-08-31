(function() {
  function run() {

  // 0b. YOUTUBE IFrame API CONSTANTS + SAFE COMMAND ROUTER
  // Every audio command must be sent over the POST-MESSAGE channel with the correct
  // target origin, and only from a trusted user-activation context. This helper is the
  // single chokepoint so we never scatter '*' (origin-agnostic) sends.
  var YT_ORIGIN = 'https://www.youtube.com';
  function ytPost(targetWin, func, args) {
    if (!targetWin) return false;
    var payload = { event: 'command', func: func, args: args === undefined ? '' : args };
    try {
      targetWin.postMessage(JSON.stringify(payload), YT_ORIGIN);
      return true;
    } catch (e) { return false; }
  }

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
    .video-slot { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; transition: opacity 0.5s ease; }
    .video-slot.is-active { opacity: 1; pointer-events: auto; }
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

    /* ===== SOUNDTRACK DECK: animated music player, massive breathing room below the video ===== */
    .track-deck { position: relative; display: flex; align-items: center; gap: 28px; margin: 110px auto 60px; padding: 34px 38px; max-width: 1200px; width: 100%; background: linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.006)); border: 1px solid #232329; opacity: 0.55; transition: opacity 0.6s ease, border-color 0.6s ease, transform 0.6s ease; overflow: hidden; }
    .track-deck::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(460px 130px at 6% 0%, rgba(255,255,255,0.07), transparent 60%); }
    .track-deck::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform 0.8s cubic-bezier(0.16,1,0.3,1); opacity: 0.6; }
    .track-deck.is-active { opacity: 1; border-color: #2e2e35; transform: translateY(-2px); }
    .track-deck.is-active::after { transform: scaleX(1); }
    .track-deck .track-play { width: 54px; height: 54px; flex: 0 0 54px; border: 1px solid #3a3a42; background: #101015; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: all 0.25s ease; border-radius: 50%; position: relative; z-index: 1; }
    .track-deck.is-active .track-play { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
    .track-deck .track-play:hover { background: var(--accent); border-color: var(--accent); color: #08080a; }
    .track-deck .track-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; position: relative; z-index: 1; }
    .track-deck .track-label { font-family: 'SFMono-Regular','Menlo','Consolas',monospace; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #7a7a82; }
    .track-deck .track-name { font-size: 19px; font-weight: 800; letter-spacing: 0.02em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* waveform / pulse equalizer visual */
    .track-wave { display: flex; align-items: center; gap: 3px; height: 44px; margin-left: auto; position: relative; z-index: 1; }
    .track-wave i { width: 4px; height: 100%; display: block; background: var(--accent); opacity: 0.28; transform: scaleY(0.35); transition: opacity 0.4s ease; }
    .track-deck.is-active .track-wave i { opacity: 0.7; }
    .track-deck.is-playing .track-wave i { animation: wave 1s ease-in-out infinite; }
    .track-deck.is-playing .track-wave i:nth-child(2n) { animation-delay: 0.1s; }
    .track-deck.is-playing .track-wave i:nth-child(3n) { animation-delay: 0.2s; }
    .track-deck.is-playing .track-wave i:nth-child(4n) { animation-delay: 0.3s; }
    .track-deck.is-playing .track-wave i:nth-child(5n) { animation-delay: 0.4s; }
    .track-deck.is-playing .track-wave i:nth-child(7n) { animation-delay: 0.5s; }
    @keyframes wave { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { .track-deck.is-playing .track-wave i { animation: none; } }

    /* ===== ROBUST AUDIO: explicit PLAY OST activation button =====
       The soundtrack uses YouTube's IFrame API. Modern autoplay policy only honors
       unMute/playVideo when (a) the command ships from a real user click and (b) the
       player iframe is rendered on-screen (not a hidden 1px ghost). This labeled button
       is the guaranteed-on-click activation surface, and the .is-live class promotes the
       hidden track iframe to a visible inline player so YouTube unlocks audio. */
    .track-deck .track-cta { margin-left: auto; display: flex; align-items: center; gap: 18px; position: relative; z-index: 1; }
    .track-deck .track-activate {
      font-family: 'SFMono-Regular','Menlo','Consolas',monospace; font-size: 10px; font-weight: 700;
      letter-spacing: 0.28em; text-transform: uppercase; color: #fff; background: transparent;
      border: 1px solid #3a3a42; padding: 13px 22px; cursor: pointer; transition: all 0.25s ease;
      display: inline-flex; align-items: center; gap: 10px; white-space: nowrap;
    }
    .track-deck .track-activate:hover { border-color: var(--accent); color: var(--accent); background: rgba(255,255,255,0.03); }
    .track-deck.is-playing .track-activate { border-color: var(--accent); color: #08080a; background: var(--accent); }
    .track-deck .track-activate .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 0 rgba(229,57,53,0.6); }
    .track-deck.is-playing .track-activate .dot { box-shadow: 0 0 0 0 rgba(229,57,53,0); animation: pulse 1.6s ease-out infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(229,57,53,0.6); } 70% { box-shadow: 0 0 0 10px rgba(229,57,53,0); } 100% { box-shadow: 0 0 0 0 rgba(229,57,53,0); } }
    /* the hidden 1px ghost is promoted to a real visible inline player only after the user clicks PLAY OST */
    .track-iframe { position: fixed; left: -9999px; top: 0; width: 1px; height: 1px; opacity: 0.01; pointer-events: none; border: 0; transition: width 0.3s ease, height 0.3s ease, opacity 0.3s ease; }
    .track-iframe.is-live { position: fixed; left: auto; right: 18px; bottom: 18px; width: 300px; height: 169px; opacity: 1; pointer-events: auto; z-index: 5000; border: 1px solid #2e2e35; box-shadow: 0 20px 70px rgba(0,0,0,0.7); }
    @media (max-width: 767px) { .track-iframe.is-live { right: 0; bottom: 0; width: 100%; height: 56vw; border: 0; } }

    @media (max-width: 767px) {
      .track-deck { margin: 72px auto 40px; padding: 26px 20px; gap: 20px; }
      .track-deck .track-name { max-width: 46vw; font-size: 16px; }
      .track-wave { height: 34px; gap: 2px; }
      .track-wave i { width: 3px; }
    }
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
      id: "SB3siHVCHpY", start: 21, music: "viM0-3PXef0", musicStart: 26, gif: GIF_BASE + "6a94d3e6aff21b4a39b4ca9f_frame-witcher.gif", accent: "#2e7d32", track: "The Witcher 3: Songs of the Past — Lets Play",
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
            <iframe class="yt-iframe" title="${g.title}" src="https://www.youtube.com/embed/${g.id}?autoplay=0&mute=1&controls=0&loop=1&playlist=${g.id}&start=${g.start}&enablejsapi=1" allow="autoplay; fullscreen" style="position:absolute;top:50%;left:50%;width:130vw;height:130vh;transform:translate(-50%,-50%);border:0;"></iframe>
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
    const vc = card.querySelector('.video-container');
    if (vc) vc.insertAdjacentHTML('afterend', `
        <div class="track-deck" data-track="${index}" style="max-width:1200px;margin:110px auto 60px;width:100%;">
          <button class="track-play" aria-label="Toggle soundtrack">&#9654;</button>
          <div class="track-meta">
            <span class="track-label">Soundtrack / Main Theme</span>
            <span class="track-name">${d.track || d.title}</span>
          </div>
          <div class="track-cta">
            <button class="track-activate" aria-label="Play OST"><span class="dot"></span>Play Ost</button>
            <div class="track-wave">${'<i></i>'.repeat(18)}</div>
          </div>
        </div>
      `);
