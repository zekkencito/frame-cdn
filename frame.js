(function() {
  function run() {
    const { animate, scroll } = window.Motion || {};

  document.head.insertAdjacentHTML('beforeend', '<style>html, body, .section, .container { overflow-y: auto !important; overflow-x: hidden !important; height: auto !important; min-height: 100vh !important; display: block !important; }</style>');

  // 1. Audio Unlock Overlay with Cinematic Collage Background
  document.body.insertAdjacentHTML('beforeend', `
    <div id="audio-unlock" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#050506;z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity 0.8s ease-out;overflow:hidden;">
      <div style="position:absolute;top:-10%;left:-10%;width:120%;height:120%;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(2,1fr);gap:20px;opacity:0.15;pointer-events:none;transform:rotate(-4deg) scale(1.1);filter:grayscale(30%) contrast(120%);">
        <img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3280350/6270c77b0729e2df0a17d660286eeddfd9169386/header.jpg?t=1774022345" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/header.jpg?t=1776466244" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/e9047d8ec47ae3d94bb8b464fb0fc9e9972b4ac7/header.jpg?t=1784714077" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/6646220d04fce26fc441f589e8f98d66c9e33b9c/header_alt_assets_2.jpg?t=1786116490" style="width:100%;height:100%;object-fit:cover;">
      </div>
      <div style="position:relative;z-index:2;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center;">
        <h1 style="font-size:clamp(80px,12vw,180px);font-weight:900;letter-spacing:-6px;margin-bottom:0;text-shadow:0 20px 60px rgba(229,57,53,0.6);line-height:1;">FRAME</h1>
        <h2 style="font-size:clamp(16px,2vw,28px);letter-spacing:6px;margin-bottom:50px;color:#8A8F98;">THE MOMENTS WE NEVER FORGOT</h2>
        <button style="padding:24px 64px;font-size:22px;font-weight:900;background:linear-gradient(135deg,#E53935,#b71c1c);color:#fff;border:none;border-radius:12px;cursor:pointer;letter-spacing:4px;box-shadow:0 15px 40px rgba(229,57,53,0.4);transition:transform 0.2s;">START EXPERIENCE</button>
      </div>
    </div>
  `);

  let audioUnlocked = false;
  document.getElementById('audio-unlock').addEventListener('click', function() {
    audioUnlocked = true;
    this.style.opacity = '0';
    setTimeout(() => this.remove(), 800);
    setTimeout(() => {
      const firstIframe = document.querySelector('.yt-iframe');
      if (firstIframe && firstIframe.contentWindow) {
        firstIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        firstIframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        firstIframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
      }
    }, 500);
  });

  // 2. Data with ZIG-ZAG Structure
  const gameData = [
    {
      id: "cWBdELprqqk", start: 26,
      title: "PRAGMATA",
      desc: "From Capcom comes a breathtaking sci-fi action adventure set in a doomed, dystopian lunar colony. A shipwrecked astronaut and a mysterious little girl must escape a world where nothing is as it seems.",
      detail1: "Seamless physics-driven action with dynamic, cinematic combat that reacts to every blow in real time.",
      img1: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/9699288b90d0aad320e998f107b59edd27e9ea61/ss_9699288b90d0aad320e998f107b59edd27e9ea61.1920x1080.jpg?t=1777351016",
      detail2: "A haunting, near-mystical narrative wrapped in Capcom's signature technical polish and next-gen presentation.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/62486c0475c7bf1a14889d61a51ad24f09e5f044/ss_62486c0475c7bf1a14889d61a51ad24f09e5f044.1920x1080.jpg?t=1777351016"
    },
    {
      id: "nTUoIyTMw0Q", start: 88,
      title: "007 FIRST LIGHT",
      desc: "From IO Interactive, creators of HITMAN, comes a wholly original James Bond origin story. Earn your 00 status in a brand-new espionage thriller that launched May 2026 on PS5, Windows and Xbox Series X|S.",
      detail1: "Bond's origin — a mix of gunfights, stealth and exploration with appearances from series icons M, Q and Moneypenny.",
      img1: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/6646220d04fce26fc441f589e8f98d66c9e33b9c/header_alt_assets_2.jpg?t=1786116490",
      detail2: "IO Interactive's signature sandbox approach delivers explosive, playable cinematic thrills from the very first mission.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/ef374e5e4ede8c71f32d455652bc00f2fa7c035e/ss_ef374e5e4ede8c71f32d455652bc00f2fa7c035e.1920x1080.jpg?t=1786116490"
    },
    {
      id: "YHhwdyWkwTQ", start: 26,
      title: "CRIMSON DESERT",
      desc: "A sweeping open-world action-adventure from the creators of Black Desert. Follow mercenary Macduff and his companions as they fight to survive the brutal, unforgiving continent of Pywel.",
      detail1: "Massive, cinematic boss battles and fast, weighty melee combat that push the engine to its limits.",
      img1: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/667d1763ae26137aafbc3140963621f530b43289/ss_667d1763ae26137aafbc3140963621f530b43289.1920x1080.jpg?t=1787909144",
      detail2: "A living, war-torn world of mounted travel, dynamic weather and mercenary-driven storylines across Pywel.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/b154a083ff9a746c71a1513334042e1bb9403a8b/ss_b154a083ff9a746c71a1513334042e1bb9403a8b.1920x1080.jpg?t=1787909144"
    }
  ];

  // 3. Inject Hero Intro
  const gridContainer = document.querySelector('.moment-grid');
  if(gridContainer) {
    gridContainer.insertAdjacentHTML('afterbegin', `
      <div style="height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 5%;width:100%;">
        <h2 class="reveal-target" style="font-size:clamp(30px,4vw,60px);color:#fff;text-transform:uppercase;letter-spacing:-1px;margin-bottom:40px;font-weight:800;">Scroll Down<br>To Begin</h2>
        <div class="reveal-target" style="width:2px;height:150px;background:linear-gradient(to bottom,#E53935,transparent);"></div>
      </div>
    `);
  }

  const cards = document.querySelectorAll('.moment-card');
  cards.forEach((card, index) => {
    const data = gameData[index] || gameData[0];
    card.style.height = 'auto';
    card.style.paddingBottom = '15vh';

    const vidContainer = card.querySelector('.video-container');
    vidContainer.style.height = '85vh';
    vidContainer.style.position = 'relative';
    vidContainer.style.clipPath = 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)';

    vidContainer.innerHTML = `
      <iframe class="yt-iframe" style="position:absolute;top:50%;left:50%;width:130vw;height:130vh;transform:translate(-50%,-50%);pointer-events:none;border:0;z-index:1;" 
              src="https://www.youtube.com/embed/${data.id}?autoplay=0&mute=1&controls=0&loop=1&playlist=${data.id}&start=${data.start}&enablejsapi=1" 
              allow="autoplay; fullscreen"></iframe>
    `;

    card.insertAdjacentHTML('beforeend', `
      <div class="game-info" style="display:flex;flex-direction:column;gap:120px;padding:100px 5%;max-width:1400px;margin:0 auto;width:100%;">

        <div class="reveal-target" style="width:100%;text-align:center;">
          <h3 style="font-size:clamp(60px,8vw,120px);line-height:0.9;margin-bottom:30px;color:#fff;font-weight:900;text-transform:uppercase;letter-spacing:-4px;">${data.title}</h3>
          <p style="font-size:24px;line-height:1.6;color:#EDEDEF;max-width:900px;margin:0 auto;">${data.desc}</p>
        </div>

        <div class="reveal-target" style="display:flex;flex-wrap:wrap;gap:60px;align-items:center;">
          <div style="flex:1;min-width:400px;">
            <img src="${data.img1}" style="width:100%;border-radius:16px;box-shadow:20px 20px 60px rgba(0,0,0,0.8);object-fit:cover;aspect-ratio:16/9;transform:skewX(-4deg);">
          </div>
          <div style="flex:1;min-width:300px;padding:20px;">
            <h4 style="font-size:36px;color:#E53935;margin-bottom:20px;text-transform:uppercase;font-weight:800;letter-spacing:-1px;">FEATURES</h4>
            <p style="font-size:22px;line-height:1.8;color:#8A8F98;">${data.detail1}</p>
          </div>
        </div>

        <div class="reveal-target" style="display:flex;flex-wrap:wrap;gap:60px;align-items:center;flex-direction:row-reverse;">
          <div style="flex:1;min-width:400px;">
            <img src="${data.img2}" style="width:100%;border-radius:16px;box-shadow:-20px 20px 60px rgba(0,0,0,0.8);object-fit:cover;aspect-ratio:16/9;transform:skewX(4deg);">
          </div>
          <div style="flex:1;min-width:300px;padding:20px;">
            <h4 style="font-size:36px;color:#E53935;margin-bottom:20px;text-transform:uppercase;font-weight:800;letter-spacing:-1px;">OVERVIEW</h4>
            <p style="font-size:22px;line-height:1.8;color:#8A8F98;">${data.detail2}</p>
          </div>
        </div>

      </div>
    `);
  });

  // 4. Scroll Reveal Animations
  document.querySelectorAll('.reveal-target').forEach((el) => {
    scroll(animate(el, { opacity: [0, 1], y: [100, 0] }), { target: el, offset: ["start 95%", "center 75%"] });
  });

  // 5. Video Play/Pause Sync via IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const iframe = entry.target.querySelector('.yt-iframe');
      if (!iframe) return;
      const iframeWin = iframe.contentWindow;
      if (entry.isIntersecting) {
        iframeWin.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        if (audioUnlocked) {
          iframeWin.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          iframeWin.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
        }
      } else {
        iframeWin.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    });
  }, { threshold: 0.3 });

  cards.forEach(card => observer.observe(card));

  }
  if (window.Motion && (window.Motion.animate || window.Motion.scroll)) {
    run();
  } else {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/motion@10.16.4/dist/motion.js';
    s.onload = function(){ run(); };
    s.onerror = function(){ run(); };
    document.head.appendChild(s);
  }
})();
