(function() {
  function run() {

  document.head.insertAdjacentHTML('beforeend', `<style>html, body, .section, .container { overflow-y: auto !important; overflow-x: hidden !important; height: auto !important; min-height: 100vh !important; display: block !important; } .moment-grid { display: block !important; position: relative !important; width: 100% !important; } .reveal-target { opacity: 0; transform: translateY(80px) scale(0.92); filter: blur(15px); transition: opacity 0.8s ease-out, transform 0.8s ease-out, filter 0.8s ease-out; will-change: opacity, transform, filter; } .reveal-target.is-visible { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } body { background: #050506 !important; }</style>`);

  // 1. Immersive cinematic background (fixed, behind everything)
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="cinema-bg" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;overflow:hidden;background:#050506;">
      <div style="position:absolute;inset:0;background:radial-gradient(1200px 800px at 80% -10%, rgba(229,57,53,0.18), transparent 60%), radial-gradient(1000px 700px at 10% 110%, rgba(63,81,181,0.16), transparent 60%);"></div>
      <div style="position:absolute;top:-15%;left:-10%;width:120%;height:120%;opacity:0.05;filter:grayscale(30%);background-size:cover;background-position:center;background-image:url('https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/header.jpg');"></div>
    </div>
  `);

  // 2. Audio Unlock Overlay with Cinematic Collage Background
  document.body.insertAdjacentHTML('beforeend', `
    <div id="audio-unlock" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,5,6,0.92);backdrop-filter:blur(20px);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity 0.8s ease-out;overflow:hidden;">
      <div style="position:absolute;top:-10%;left:-10%;width:120%;height:120%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:18px;opacity:0.18;pointer-events:none;transform:rotate(-4deg) scale(1.1);filter:grayscale(30%) contrast(120%);">
        <img src="https://i.ytimg.com/vi/cWBdELprqqk/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/nTUoIyTMw0Q/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/YHhwdyWkwTQ/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/2VaLOc1FpSo/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/4aVoaSixc0E/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/NvncU_SQO5Y/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/BoHg3zeUSWI/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/avpTgTNadh4/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
        <img src="https://i.ytimg.com/vi/SB3siHVCHpY/maxresdefault.jpg" style="width:100%;height:100%;object-fit:cover;">
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

  // 2. Data with ZIG-ZAG Structure — 9 Games
  const gameData = [
    {
      id: "cWBdELprqqk", start: 26,
      title: "PRAGMATA",
      desc: "From Capcom comes a breathtaking sci-fi action adventure set in a doomed, dystopian lunar colony. A shipwrecked astronaut and a mysterious little girl must escape a world where nothing is as it seems.",
      detail1: "Seamless physics-driven action with dynamic, cinematic combat that reacts to every blow in real time.",
      img1: "https://i.ytimg.com/vi/cWBdELprqqk/maxresdefault.jpg",
      detail2: "A haunting, near-mystical narrative wrapped in Capcom's signature technical polish and next-gen presentation.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3357650/62486c0475c7bf1a14889d61a51ad24f09e5f044/ss_62486c0475c7bf1a14889d61a51ad24f09e5f044.1920x1080.jpg?t=1777351016"
    },
    {
      id: "nTUoIyTMw0Q", start: 88,
      title: "007 FIRST LIGHT",
      desc: "From IO Interactive, creators of HITMAN, comes a wholly original James Bond origin story. Earn your 00 status in a brand-new espionage thriller that launched May 2026 on PS5, Windows and Xbox Series X|S.",
      detail1: "Bond's origin — a mix of gunfights, stealth and exploration with appearances from series icons M, Q and Moneypenny.",
      img1: "https://i.ytimg.com/vi/nTUoIyTMw0Q/maxresdefault.jpg",
      detail2: "IO Interactive's signature sandbox approach delivers explosive, playable cinematic thrills from the very first mission.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3768760/ef374e5e4ede8c71f32d455652bc00f2fa7c035e/ss_ef374e5e4ede8c71f32d455652bc00f2fa7c035e.1920x1080.jpg?t=1786116490"
    },
    {
      id: "YHhwdyWkwTQ", start: 26,
      title: "CRIMSON DESERT",
      desc: "A sweeping open-world action-adventure from the creators of Black Desert. Follow mercenary Macduff and his companions as they fight to survive the brutal, unforgiving continent of Pywel.",
      detail1: "Massive, cinematic boss battles and fast, weighty melee combat that push the engine to its limits.",
      img1: "https://i.ytimg.com/vi/YHhwdyWkwTQ/maxresdefault.jpg",
      detail2: "A living, war-torn world of mounted travel, dynamic weather and mercenary-driven storylines across Pywel.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3321460/b154a083ff9a746c71a1513334042e1bb9403a8b/ss_b154a083ff9a746c71a1513334042e1bb9403a8b.1920x1080.jpg?t=1787909144"
    },
    {
      id: "2VaLOc1FpSo", start: 57,
      title: "CLAIR OBSCUR: EXPEDITION 33",
      desc: "A turn-based, story-driven RPG from Sandfall Interactive set in a haunted Belle Époque France. Every year the Paintress awakens to paint a number that dooms that age — and you must mount Expedition 33 to end her.",
      detail1: "Deep, reactive turn-based combat fused with real-time dodges, combos and stunning Unreal Engine 5 visuals.",
      img1: "https://i.ytimg.com/vi/2VaLOc1FpSo/maxresdefault.jpg",
      detail2: "A heartbreaking, cinematic tale of loss and defiance set against France's most beautiful and melancholic era.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1903340/header.jpg"
    },
    {
      id: "4aVoaSixc0E", start: 169,
      title: "STELLAR BLADE: BLOOD RAIN",
      desc: "The direct sequel to Stellar Blade from SHIFT UP, self-published and aimed at a day-one multiplatform launch. Follow new protagonist Evie through a rain-soaked urban warzone against the Naytiba.",
      detail1: "Frontier-oiled gauntlet melee combat with acrobatic, reverse-grip bladework in a moody, storm-lit metropolis.",
      img1: "https://i.ytimg.com/vi/4aVoaSixc0E/maxresdefault.jpg",
      detail2: "A personal, mission-driven story of survival cut from the same razor-sharp, cinematic cloth as its predecessor.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/header.jpg?t=1776466244"
    },
    {
      id: "NvncU_SQO5Y", start: 92,
      title: "CONTROL RESONANT",
      desc: "From Remedy Entertainment — the long-awaited sequel to CONTROL, arriving September 24 2026. Guide Dylan as Manhattan is reshaped and reality is redefined by a godlike paranatural force.",
      detail1: "A Devil May Cry-esque evolution of combat built on mastery of paranatural powers against reality-warping foes.",
      img1: "https://i.ytimg.com/vi/NvncU_SQO5Y/maxresdefault.jpg",
      detail2: "A ravaged Manhattan brimming with conspiracy, cryptic entities and the haunting, cinematic atmosphere Remedy is known for.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/header.jpg"
    },
    {
      id: "BoHg3zeUSWI", start: 36,
      title: "SPINE",
      desc: "A cinematic single-player Gun Fu action game from Nekki. Step into a cyberpunk world as street artist Redline and her sentient combat implant Spine, defying an autocratic AI regime.",
      detail1: "Flow-state gun fu choreography blending gunplay, martial arts and slow-mo close-quarters spectacle.",
      img1: "https://i.ytimg.com/vi/BoHg3zeUSWI/maxresdefault.jpg",
      detail2: "A rebellious, neon-noir journey through a dystopian cityscape in search of Redline's captured brother.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1731290/header.jpg"
    },
    {
      id: "avpTgTNadh4", start: 216,
      title: "STRANGER THAN HEAVEN",
      desc: "A fifty-year action-adventure saga from Ryu Ga Gotoku Studio and SEGA. Follow marginalized men fighting to survive and thrive as showmen across five cities and eras of modern Japan.",
      detail1: "Raw, extreme-melee combat fused with a music-forward showman fantasy that spans half a century.",
      img1: "https://i.ytimg.com/vi/avpTgTNadh4/maxresdefault.jpg",
      detail2: "A sprawling, era-hopping Japanese saga of desperate men searching for a home — dark, funny and deeply cinematic.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4260840/header.jpg"
    },
    {
      id: "SB3siHVCHpY", start: 21,
      title: "THE WITCHER 3: SONGS OF THE PAST",
      desc: "The third expansion to The Witcher 3 from CD PROJEKT RED and Fool's Theory. Return to the role of Geralt of Rivia for a brand-new adventure in the land of Letten, arriving 2027.",
      detail1: "A wealth of new quests, characters and secrets, built on the dark-fantasy combat and systems of the series peak.",
      img1: "https://i.ytimg.com/vi/SB3siHVCHpY/maxresdefault.jpg",
      detail2: "The Path is never straightforward — just below the surface of Letten lurks something sinister.",
      img2: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5006530/header.jpg"
    }
  ];

  // AUTO-GENERATE missing DOM structure for empty projects
  const wrapper = document.querySelector('.frame-wrapper') || document.body;
  let gridContainer = document.querySelector('.moment-grid');
  const totalGames = gameData.length;
  if (!gridContainer) {
    gridContainer = document.createElement('div');
    gridContainer.className = 'moment-grid';
    gridContainer.style.width = '100%';
    gridContainer.style.position = 'relative';
    gridContainer.style.zIndex = '1';

    for(let i=0; i<totalGames; i++) {
      gridContainer.insertAdjacentHTML('beforeend', '<div class="moment-card section" style="position:relative; width:100%; display:block;"><div class="video-container"></div></div>');
    }
    wrapper.appendChild(gridContainer);
  }

  // 3. Inject Hero Intro
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
    card.style.position = 'relative';
    card.style.zIndex = '1';

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
      <div class="game-info" style="display:flex;flex-direction:column;gap:120px;padding:100px 5%;max-width:1400px;margin:0 auto;width:100%;background:linear-gradient(to bottom, transparent, rgba(5,5,6,0.7));">

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

  // 4. Reveal on scroll via Native IntersectionObserver + CSS transitions
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.reveal-target').forEach(el => revealObs.observe(el));

  // 5. Video Play/Pause Sync via IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const iframe = entry.target.querySelector('.yt-iframe');
      if (!iframe) return;
      const iframeWin = iframe.contentWindow;

      if (entry.isIntersecting) {
        iframeWin.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        if (typeof audioUnlocked !== 'undefined' && audioUnlocked) {
          iframeWin.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          iframeWin.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
        }
      } else {
        iframeWin.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.video-container').forEach(vid => observer.observe(vid));

  }
  run();
})();
