(function(){
  'use strict';
  // Initialize from window.__SLIDES which is set per page.
  // Each slide: { img, text_is, text_en, caption_is?, caption_en? }
  const slides = window.__SLIDES || [];
  const stage = document.getElementById('stage');
  const captionEl = document.getElementById('caption');
  const stepTag = document.getElementById('step-tag');
  const progressFill = document.getElementById('progress-fill');
  const stepCounter = document.getElementById('step-counter');
  const playBtn = document.getElementById('play-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const replayBtn = document.getElementById('replay-btn');
  const voiceSelect = document.getElementById('voice-select');
  const voiceWarn = document.getElementById('voice-warn');
  const langToggle = document.getElementById('lang-toggle');
  const thumbs = document.getElementById('thumbs');

  // Pre-build images and thumbnails
  const imgs = slides.map((s, i) => {
    const img = document.createElement('img');
    img.src = s.img;
    img.alt = s.text_is || s.text_en || '';
    img.loading = i === 0 ? 'eager' : 'lazy';
    if (i === 0) img.classList.add('active');
    stage.appendChild(img);
    return img;
  });

  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.idx = i;
    b.innerHTML = '<span class="n">' + (i+1) + '</span><img src="' + s.img + '" alt="">';
    b.addEventListener('click', () => goTo(i, true));
    if (i === 0) b.classList.add('active');
    thumbs.appendChild(b);
  });

  let idx = 0;
  let playing = false;
  let utt = null;
  let voices = [];
  let chosenVoice = null;
  let lang = localStorage.getItem('slokk_video_lang') || 'en';

  function pickAutoLang() {
    // Default English; previously preferred Icelandic if a voice was installed.
    return 'en';
  }
  function effectiveLang() {
    return lang === 'auto' ? pickAutoLang() : lang;
  }
  function textForSlide(s) {
    const l = effectiveLang();
    if (l === 'en') return s.text_en || s.text_is || '';
    return s.text_is || s.text_en || '';
  }
  function captionForSlide(s) {
    const l = effectiveLang();
    if (l === 'en') return s.caption_en || s.text_en || s.caption_is || s.text_is || '';
    return s.caption_is || s.text_is || s.caption_en || s.text_en || '';
  }

  function loadVoices() {
    voices = speechSynthesis.getVoices() || [];
    // Sort priority:
    //   1. en-US first (the default we want)
    //   2. en-* second
    //   3. Icelandic third
    //   4. everything else
    voices.sort((a,b) => {
      const la = a.lang.toLowerCase();
      const lb = b.lang.toLowerCase();
      function bucket(l) {
        if (l === 'en-us') return 0;
        if (l.startsWith('en')) return 1;
        if (l.startsWith('is')) return 2;
        return 3;
      }
      const ai = bucket(la), bi = bucket(lb);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
    voiceSelect.innerHTML = '';
    voices.forEach((v, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = v.name + ' (' + v.lang + ')';
      voiceSelect.appendChild(o);
    });
    autoPickVoice();
  }
  function autoPickVoice() {
    const want = effectiveLang();
    let v = null;
    if (want === 'en') {
      // Prefer en-US explicitly so we don't get UK voices like Microsoft Hazel.
      v = voices.find(x => x.lang.toLowerCase() === 'en-us');
      if (!v) v = voices.find(x => x.lang.toLowerCase().startsWith('en'));
    } else {
      v = voices.find(x => x.lang.toLowerCase().startsWith(want));
    }
    if (!v) v = voices.find(x => x.lang.toLowerCase().startsWith('en'));
    if (!v) v = voices[0];
    chosenVoice = v || null;
    if (chosenVoice) voiceSelect.value = voices.indexOf(chosenVoice);
    const hasIS = voices.some(v => v.lang.toLowerCase().startsWith('is'));
    voiceWarn.classList.toggle('show', !hasIS && effectiveLang() === 'is');
  }

  loadVoices();
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  voiceSelect.addEventListener('change', () => {
    chosenVoice = voices[+voiceSelect.value] || null;
    if (playing) { stopUtt(); speak(textForSlide(slides[idx])); }
  });

  // Language toggle
  function applyLangBtn() {
    const l = effectiveLang();
    langToggle.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    document.documentElement.lang = l === 'en' ? 'en' : 'is';
  }
  langToggle.addEventListener('click', e => {
    const b = e.target.closest('button[data-lang]');
    if (!b) return;
    lang = b.dataset.lang;
    localStorage.setItem('slokk_video_lang', lang);
    applyLangBtn();
    autoPickVoice();
    render();
    if (playing) { stopUtt(); speak(textForSlide(slides[idx])); }
  });
  applyLangBtn();

  function render() {
    imgs.forEach((im, i) => im.classList.toggle('active', i === idx));
    captionEl.innerHTML = captionForSlide(slides[idx]);
    stepTag.textContent = (idx+1) + ' / ' + slides.length;
    const stepLabel = effectiveLang() === 'en' ? 'Step' : 'Skref';
    const ofLabel = effectiveLang() === 'en' ? 'of' : 'af';
    stepCounter.textContent = stepLabel + ' ' + (idx+1) + ' ' + ofLabel + ' ' + slides.length;
    progressFill.style.width = ((idx+1) / slides.length * 100) + '%';
    Array.from(thumbs.children).forEach((b, i) => b.classList.toggle('active', i === idx));
    prevBtn.disabled = idx === 0;
    const last = idx === slides.length - 1;
    nextBtn.textContent = last
      ? (effectiveLang() === 'en' ? '⏹ End' : '⏹ Endir')
      : (effectiveLang() === 'en' ? '⏭ Next' : '⏭ Næsta');
    updatePlayBtn();
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    stopUtt();
    if (!text) return;
    utt = new SpeechSynthesisUtterance(text);
    utt.lang = chosenVoice ? chosenVoice.lang : (effectiveLang() === 'en' ? 'en-US' : 'is-IS');
    utt.voice = chosenVoice || null;
    utt.rate = 0.95;
    utt.pitch = 1.0;
    utt.onend = () => {
      if (!playing) return;
      if (idx < slides.length - 1) {
        idx++;
        render();
        speak(textForSlide(slides[idx]));
      } else {
        playing = false;
        updatePlayBtn();
      }
    };
    speechSynthesis.speak(utt);
  }

  function stopUtt() {
    try { speechSynthesis.cancel(); } catch(e){}
    utt = null;
  }

  function updatePlayBtn() {
    if (playing) {
      playBtn.innerHTML = effectiveLang() === 'en' ? '⏸ Pause' : '⏸ Bíðum';
    } else {
      playBtn.innerHTML = effectiveLang() === 'en' ? '▶ Play with narration' : '▶ Spila með talsetningu';
    }
  }

  function play() {
    playing = true;
    updatePlayBtn();
    speak(textForSlide(slides[idx]));
  }
  function pause() {
    playing = false;
    stopUtt();
    updatePlayBtn();
  }
  function goTo(i) {
    if (i < 0 || i >= slides.length) return;
    idx = i;
    render();
    if (playing) speak(textForSlide(slides[idx]));
    else stopUtt();
  }

  playBtn.addEventListener('click', () => playing ? pause() : play());
  prevBtn.addEventListener('click', () => goTo(idx - 1));
  nextBtn.addEventListener('click', () => {
    if (idx === slides.length - 1) pause();
    else goTo(idx + 1);
  });
  replayBtn.addEventListener('click', () => { goTo(0); play(); });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') goTo(idx + 1);
    else if (e.key === 'ArrowLeft') goTo(idx - 1);
  });

  window.addEventListener('beforeunload', stopUtt);

  render();
})();
