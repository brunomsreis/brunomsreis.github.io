/* Weather Tune: meteorologia do Porto (Open-Meteo) -> música do dia (iTunes Search).
   Vanilla JS, sem chaves de API. A música fica guardada em localStorage por dia. */
(() => {
  'use strict';

  /* ============================================================
     CONFIGURAÇÃO
     ============================================================ */
  const CONFIG = {
    lat: 41.1496, // Porto
    lon: -8.6109,
    place: 'Porto',
    country: 'PT', // loja do iTunes (PT, US, GB...)
    storageKey: 'weather-tune-v1',
    timeoutMs: 8000
  };

  /* ============================================================
     MOODS MUSICAIS: EDITA AQUI
     - terms: termos de pesquisa no iTunes (um é escolhido pela data)
     - group: se o tempo mudar de grupo, a música muda no mesmo dia.
              Mudanças dentro do mesmo grupo (ex.: limpo -> nublado)
              mantêm a música. Para mudar sempre que a categoria
              mudar, dá a cada categoria um grupo diferente.
     ============================================================ */
  const MOODS = {
    clear: {
      group: 'dry', label: 'Clear sky', icon: '☀️',
      terms: ['bossa nova', 'indie pop summer', 'feel good acoustic', 'tropical house']
    },
    cloudy: {
      group: 'dry', label: 'Cloudy', icon: '☁️',
      terms: ['dream pop', 'chillwave', 'mellow indie folk', 'trip hop']
    },
    fog: {
      group: 'fog', label: 'Fog', icon: '🌫️',
      terms: ['ambient', 'shoegaze', 'post rock', 'ethereal wave']
    },
    rain: {
      group: 'wet', label: 'Rain', icon: '🌧️',
      terms: ['lofi jazz', 'rainy day piano', 'melancholic indie', 'fado']
    },
    snow: {
      group: 'wet', label: 'Snow', icon: '❄️',
      terms: ['neoclassical', 'winter acoustic', 'ambient piano', 'nordic folk']
    },
    storm: {
      group: 'storm', label: 'Thunderstorm', icon: '⛈️',
      terms: ['dark synthwave', 'post-metal', 'cinematic epic', 'industrial']
    }
  };

  // Código meteorológico WMO -> categoria
  function categoryFromCode(code) {
    if (code <= 1) return 'clear'; // 0-1 limpo / maioritariamente limpo
    if (code <= 3) return 'cloudy'; // 2-3 parcialmente / muito nublado
    if (code === 45 || code === 48) return 'fog'; // nevoeiro
    if (code >= 51 && code <= 67) return 'rain'; // chuvisco e chuva
    if (code >= 71 && code <= 77) return 'snow'; // neve
    if (code >= 80 && code <= 82) return 'rain'; // aguaceiros
    if (code === 85 || code === 86) return 'snow'; // aguaceiros de neve
    if (code >= 95) return 'storm'; // trovoada
    return 'cloudy'; // fallback
  }

  /* ============================================================
     UTILITÁRIOS
     ============================================================ */
  const $ = (sel, root = document) => root.querySelector(sel);

  const todayStr = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  // Hash determinístico: a mesma data+categoria dá sempre o mesmo índice
  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  };

  async function getJSON(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const loadCache = () => {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)); }
    catch { return null; }
  };
  const saveCache = (data) => {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); }
    catch { /* localStorage indisponível: ignora */ }
  };

  /* ============================================================
     APIs
     ============================================================ */
  async function fetchWeather() {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}`
      + '&current=temperature_2m,weather_code&timezone=auto';
    const data = await getJSON(url);
    return {
      code: data.current.weather_code,
      temp: Math.round(data.current.temperature_2m)
    };
  }

  async function fetchTrack(category, dateStr) {
    const terms = MOODS[category].terms;
    const term = terms[hash(dateStr + category) % terms.length];
    const url = 'https://itunes.apple.com/search'
      + `?term=${encodeURIComponent(term)}&media=music&entity=song&limit=50&country=${CONFIG.country}`;
    const data = await getJSON(url);
    const list = (data.results || []).filter((r) => r.previewUrl && r.artworkUrl100);
    if (!list.length) return null;
    const t = list[hash(dateStr + term) % list.length];
    return {
      name: t.trackName,
      artist: t.artistName,
      cover: t.artworkUrl100.replace('100x100bb', '200x200bb'),
      preview: t.previewUrl,
      link: t.trackViewUrl || ''
    };
  }

  /* ============================================================
     UI
     ============================================================ */
  const root = $('#weather-tune');
  if (!root) return;

  const btn = $('.wt-btn', root);
  const cover = $('.wt-cover', root);
  const title = $('.wt-title', root);
  const meta = $('.wt-meta', root);
  let audio = null;

  const isPlaying = () => !!audio && !audio.paused;

  function setPlayingUI(on) {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Pause preview' : 'Play preview');
  }

  function render(data) {
    const mood = MOODS[data.category] || MOODS.cloudy;
    meta.textContent = `${CONFIG.place} · ${data.temp}° · ${mood.label}`;
    root.title = ''; // preenchido abaixo com o nome da faixa
    const track = data.track;

    if (audio) { audio.pause(); audio = null; }
    setPlayingUI(false);

    if (track) {
      title.textContent = '';
      const label = `${track.name} — ${track.artist}`;
      if (/^https:\/\//.test(track.link)) {
        const a = document.createElement('a');
        a.href = track.link;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = label;
        title.appendChild(a);
      } else {
        title.textContent = label;
      }
      title.title = label;
      root.title = `${label} · ${meta.textContent}`; // útil quando o texto está escondido
      cover.src = track.cover;
      cover.hidden = false;
      btn.disabled = false;
      audio = new Audio(track.preview);
      audio.preload = 'none';
      audio.addEventListener('ended', () => setPlayingUI(false));
      audio.addEventListener('pause', () => setPlayingUI(false));
      audio.addEventListener('play', () => setPlayingUI(true));
      audio.addEventListener('error', () => { btn.disabled = true; setPlayingUI(false); });
    } else {
      // Sem música (API falhou): mostra só o tempo
      title.textContent = mood.icon + ' ' + CONFIG.place;
      cover.hidden = true;
      btn.disabled = true;
    }
    root.hidden = false;
  }

  btn.addEventListener('click', async () => {
    if (!audio) return;
    try {
      if (audio.paused) await audio.play(); else audio.pause();
    } catch { setPlayingUI(false); }
  });

  /* ============================================================
     FLUXO PRINCIPAL
     ============================================================ */
  async function init() {
    const today = todayStr();
    const cache = loadCache();
    const fresh = cache && cache.date === today && cache.track && MOODS[cache.category] ? cache : null;

    // 1) Mostra logo a música guardada para hoje (sem esperar pela rede)
    if (fresh) render(fresh);

    // 2) Meteorologia atual
    let weather;
    try {
      weather = await fetchWeather();
    } catch {
      if (!fresh) root.hidden = true; // sem cache e sem tempo: esconde o widget
      return;
    }
    const category = categoryFromCode(weather.code);

    // 3) Mantém a música se o tempo ficou no mesmo grupo
    if (fresh && MOODS[fresh.category].group === MOODS[category].group) {
      if (!isPlaying()) render({ ...fresh, category, temp: weather.temp });
      return;
    }
    if (isPlaying()) return; // nunca interrompe quem está a ouvir

    // 4) Nova música (novo dia ou mudança drástica do tempo)
    let track = null;
    try { track = await fetchTrack(category, today); } catch { /* degrada */ }
    const data = { date: today, category, temp: weather.temp, track };
    if (track) saveCache(data);
    render(data);
  }

  init();
})();
