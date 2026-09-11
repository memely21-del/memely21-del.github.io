// Two jobs:
//  1. Click-to-play - nothing but the poster JPG is downloaded until the visitor asks.
//  2. ES|EN switch per tile - the bilingual claim stops being a sentence and becomes a demo.
//
// One <video> per tile, created once and reused. Tearing the element down and building
// a new one on every language switch is what leaves iOS Safari playing audio over a
// black frame, so the switch only ever changes .src and calls load().
(function () {
  var playing = null;

  function stopOthers(except) {
    if (playing && playing !== except) {
      playing.pause();
      var host = playing.closest('.player');
      if (host) host.classList.remove('is-playing');
    }
  }

  function srcFor(btn) {
    var lang = btn.dataset.lang || 'es';
    var src = btn.getAttribute('data-' + lang) || btn.getAttribute('data-es');
    // the media file gets its own cache key, so a stale/partial copy can't stick around
    return src + (src.indexOf('?') < 0 ? '?v=24' : '&v=24');
  }

  function videoFor(btn) {
    var v = btn.querySelector('video');
    if (v) return v;

    v = document.createElement('video');
    v.controls = true;
    v.preload = 'none';
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    var poster = btn.querySelector('img');
    if (poster) v.poster = poster.getAttribute('src');

    v.addEventListener('error', function () {
      var tile = btn.closest('.tile');
      var warn = tile && tile.querySelector('.lang-warn');
      if (!warn && tile) {
        warn = document.createElement('p');
        warn.className = 'lang-warn';
        tile.appendChild(warn);
      }
      if (warn) warn.textContent = 'That language is not ready yet.';
      btn.classList.remove('is-playing');
    });
    v.addEventListener('playing', function () {
      btn.classList.add('is-playing');
      if (poster) poster.style.visibility = 'hidden';
    });
    v.addEventListener('ended', function () { btn.classList.remove('is-playing'); });

    btn.appendChild(v);
    return v;
  }

  function play(btn) {
    var v = videoFor(btn);
    var want = srcFor(btn);
    if (v.getAttribute('src') !== want) {
      v.setAttribute('src', want);
      v.load();                       // iOS needs the explicit reload after a src swap
    }
    stopOthers(v);
    playing = v;
    var p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { /* blocked: the controls are already there */ });
    }
  }

  document.querySelectorAll('.player').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.querySelector('video');
      if (v && !v.paused) { v.pause(); btn.classList.remove('is-playing'); return; }
      play(btn);
    });
  });

  document.querySelectorAll('.langs').forEach(function (group) {
    var tile = group.closest('.tile');
    var btn = tile && tile.querySelector('.player');
    if (!btn) return;

    group.querySelectorAll('.lang').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (chip.classList.contains('is-on')) return;
        group.querySelectorAll('.lang').forEach(function (c) { c.classList.remove('is-on'); });
        chip.classList.add('is-on');
        btn.dataset.lang = chip.dataset.lang;

        var warn = tile.querySelector('.lang-warn');
        if (warn) warn.remove();

        // The thumbnail has to move too. Nizoral's English cut is different footage, and
        // leaving the Spanish still on the tile made the whole thing look unchanged - Jose
        // pressed play, got Spanish (the default), and reported "same video as always".
        var poster = btn.querySelector('img');
        if (poster) {
          var alt = btn.getAttribute('data-poster-' + chip.dataset.lang);
          if (!poster.dataset.posterEs) { poster.dataset.posterEs = poster.getAttribute('src'); }
          poster.setAttribute('src', alt || poster.dataset.posterEs);
        }

        var v = btn.querySelector('video');
        if (v) {
          if (poster) { v.poster = poster.getAttribute('src'); }
          if (v.getAttribute('src')) play(btn);      // already watching -> swap language now
        }
      });
    });
  });

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
