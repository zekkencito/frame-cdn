/* FRAME — cinematic game-trailer microsite
 * Deploy: SOUNDTRACK SYNC, WAVEFORM UI & CENTER CASCADE
 */
(function () {
  'use strict';

  var ACCENT = {
    PRAGMATA: '#e53935',
    '007 FIRST LIGHT': '#f39c12',
    'CRIMSON DESERT': '#8e24aa',
    'CLAIR OBSCUR': '#1e88e5',
    'STELLAR BLADE': '#d81b60',
    'CONTROL RESONANT': '#6a1b9a',
    SPINE: '#00acc1',
    'STRANGER THAN HEAVEN': '#c62828',
    'WITCHER 3 SONGS OF THE PAST': '#2e7d32'
  };

  var gameData = [
    { name: 'PRAGMATA', yt: 'cWBdELprqqk', start: 26, accent: '#e53935' },
    { name: '007 FIRST LIGHT', yt: 'nTUoIyTMw0Q', start: 88, accent: '#f39c12' },
    { name: 'CRIMSON DESERT', yt: 'YHhwdyWkwTQ', start: 26, accent: '#8e24aa' },
    { name: 'CLAIR OBSCUR', yt: '2VaLOc1FpSo', start: 57, accent: '#1e88e5' },
    { name: 'STELLAR BLADE', yt: '4aVoaSixc0E', start: 169, accent: '#d81b60', bloodRain: true },
    { name: 'CONTROL RESONANT', yt: 'lTHTfqPTQ1k', start: 35, accent: '#6a1b9a' },
    { name: 'SPINE', yt: 'BoHg3zeUSWI', start: 36, accent: '#00acc1' },
    { name: 'STRANGER THAN HEAVEN', yt: 'avpTgTNadh4', start: 216, accent: '#c62828' },
    { name: 'WITCHER 3 SONGS OF THE PAST', yt: 'SB3siHVCHpY', start: 21, accent: '#2e7d32' }
  ];

  var trackFrames = {};
  var activeTrack = null;
  var activeIndex = -1;
  var everActive = new Set();

  function onYouTubeIframeAPIReady() { run(); }
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  if (window.YT && window.YT.Player) run();

  function postTrack(idx, command, arg) {
    var f = trackFrames[idx] ? trackFrames[idx].strip.querySelector('iframe') : null;
    if (f && f.contentWindow && f.contentWindow.postMessage) {
      f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args: arg !== undefined ? [arg] : [] }), '*');
    }
  }

  function resignTrack(idx) {
    Object.keys(trackFrames).forEach(function (k) {
      var ki = parseInt(k, 10);
      if (ki !== idx && trackFrames[ki].playing) {
        postTrack(ki, 'pauseVideo');
        trackFrames[ki].playing = false;
        trackFrames[ki].strip.classList.remove('is-playing');
      }
    });
  }

  function shiftBackground(accent) {
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.style.background =
        'radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 45%), linear-gradient(180deg, ' +
        hexToRgba(accent, 0.16) + ', rgba(8,8,12,1) 72%)';
    }
  }

  function hexToRgba(hex, a) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function run() {
    var audioUnlocked = false;
    var body = document.body;

    function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;
      Object.keys(trackFrames).forEach(function (k) {
        var f = trackFrames[k];
        if (f.yt) f.yt.unMute();
      });
    }
    body.addEventListener('pointerdown', unlockAudio, { once: true });
    body.addEventListener('keydown', unlockAudio, { once: true });

    var arch = document.querySelector('.architecture');
    var hero = document.querySelector('.hero');

    if (arch && hero) {
      arch.innerHTML = [
        '<div class="hero"><h1 class="display-1">FRAME</h1>',
        '<p class="lead">CINEMATIC GAME TRAILER GALLERY</p>',
        '<div class="aura"></div></div>',
        '<div class="soundtrack"><div class="track-deck" id="soundtrack-deck"></div></div>',
        '<div class="gallery-grid" id="gallery"></div>'
      ].join('');
    }

    var gallery = document.getElementById('gallery');
    var deck = document.getElementById('soundtrack-deck');

    // ======================= SOUNDTRACK DECK (animated music-player UI) =======================
    gameData.forEach(function (g, i) {
      var strip = document.createElement('div');
      strip.className = 'track-deck';
      strip.setAttribute('data-track-idx', i);
      strip.innerHTML =
        '<i></i>'.repeat(18) +
        '<div class="track-meta"><span class="track-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="track-name">' + g.name + '</span>' +
        '<span class="track-rule"></span>' +
        '<button class="track-play" aria-label="Play ' + g.name + '">' +
        '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
        '</button></div>';
      deck.appendChild(strip);

      var src = 'https://www.youtube.com/embed/' + g.yt + '?enablejsapi=1&autoplay=0&mute=1&controls=0&start=' + g.start;
      try {
        var yt = new YT.Player(strip.querySelector('iframe') ? strip.querySelector('iframe') : null, {
          width: '480', height: '48', videoId: g.yt, playerVars: { start: g.start, controls: 0 }
        });
      } catch (e) {
        var ifr = document.createElement('iframe');
        ifr.src = src;
        ifr.loading = 'lazy';
        ifr.allow = 'autoplay; encrypted-media';
        ifr.setAttribute('tabindex', '-1');
        strip.insertBefore(ifr, strip.firstChild);
        yt = null;
      }
      trackFrames[i] = { strip: strip, yt: yt, playing: false, armed: false };
    });

    // ======================= GALLERY CASCADE (one-by-one, center gutter) =======================
    for (var i = 0; i < gameData.length; i++) {
      var g = gameData[i];
      var card = document.createElement('figure');
      card.className = 'moment-card';
      card.setAttribute('data-gallery-idx', i);
      card.style.setProperty('--index', i);

      var slot = document.createElement('div');
      slot.className = 'video-slot' + (g.bloodRain ? ' blood-rain' : '');
      slot.setAttribute('data-accent', g.accent);

      var frame = document.createElement('div');
      frame.className = 'frame';
      var ifr = document.createElement('iframe');
      ifr.className = 'yt-iframe';
      ifr.src = 'https://www.youtube.com/embed/' + g.yt + '?enablejsapi=1&autoplay=1&mute=1&playsinline=1&controls=0&rel=0&start=' + g.start;
      ifr.allow = 'autoplay; encrypted-media; picture-in-picture';
      ifr.setAttribute('allowfullscreen', '');
      ifr.loading = 'lazy';
      frame.appendChild(ifr);
      slot.appendChild(frame);

      var fig = document.createElement('figcaption');
      fig.className = 'moment-meta';
      fig.innerHTML =
        '<span class="meta-index">/' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="meta-name">' + g.name + '</span>' +
        '<span class="editorial-ghost">Fatal Frame — cinematic sequence</span>';

      card.appendChild(slot);
      card.appendChild(fig);
      gallery.appendChild(card);
    }

    // ======================= CENTER-SCREEN ACTIVE OBSERVER =======================
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var card = entry.target;
        var idx = parseInt(card.getAttribute('data-gallery-idx') || '0', 10);
        var slot = card.querySelector('.video-slot');
        var iframe = slot ? slot.querySelector('.yt-iframe') : null;
        var accent = gameData[idx] ? gameData[idx].accent : '#fff';
        var active = entry.isIntersecting;

        if (!active) {
          // SCROLL-PAST → AUDIO HAND-OFF: release video, hand playback to soundtrack
          if (everActive.has(idx) && trackFrames[idx]) {
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
            postTrack(idx, 'playVideo');
            postTrack(idx, 'unMute');
            postTrack(idx, 'setVolume', 100);
            trackFrames[idx].playing = true;
            trackFrames[idx].strip.classList.add('is-playing');
            trackFrames[idx].strip.classList.add('is-active');
            trackFrames[idx].armed = true;
          }
          return;
        }

        everActive.add(idx);

        document.querySelectorAll('.video-slot.is-active').forEach(function (s) {
          if (s !== slot) {
            s.classList.remove('is-active');
            var f = s.querySelector('.yt-iframe');
            if (f && f.contentWindow) f.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          }
        });
        if (slot) slot.classList.add('is-active');

        document.querySelectorAll('.moment-card').forEach(function (c, ci) {
          if (ci < idx) c.classList.add('dimmed');
          else c.classList.remove('dimmed');
        });

        shiftBackground(accent);

        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          if (typeof audioUnlocked !== 'undefined' && audioUnlocked) {
            iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
          }
        }

        // SECTION-LOCKED SOUNDTRACK: arm this section's player; pause track of prior section
        resignTrack(idx);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.video-container').forEach(function (vc) { activeObserver.observe(vc); });
    document.querySelectorAll('.moment-card').forEach(function (mc) { activeObserver.observe(mc); });

    // ======================= PREDICTIVE N+1 PRE-LOAD =======================
    function postToFrame(container, payload) {
      var f = container ? container.querySelector('.yt-iframe') : null;
      if (f && f.contentWindow) f.contentWindow.postMessage(payload, '*');
    }
    function prepNext(nextIndex) {
      if (nextIndex >= gameData.length) nextIndex = 0;
      var target = document.querySelectorAll('.moment-card')[nextIndex];
      var slot = target ? target.querySelector('.video-slot') : null;
      if (!slot) return;
      var g = gameData[nextIndex];
      postToFrame(slot, '{"event":"command","func":"playVideo","args":""}');
      postToFrame(slot, '{"event":"command","func":"seekTo","args":[' + (g ? g.start : 0) + ']}');
      setTimeout(function () { postToFrame(slot, '{"event":"command","func":"pauseVideo","args":""}'); }, 1200);
    }
    var prepObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var idx = parseInt(entry.target.getAttribute('data-gallery-idx') || '0', 10);
          prepNext(idx + 1);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.gallery-grid').forEach(function (gg) { prepObs.observe(gg); });
  }

  run();
})();
