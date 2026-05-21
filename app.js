// ===== Academy Awardzzorz slideshow =====
// Loads results.json, builds one slide per award, and reveals bronze -> silver -> gold.

const PLACES = [
  { key: "bronze", label: "3", medal: "3", placeWord: "BRONZE" },
  { key: "silver", label: "2", medal: "2", placeWord: "SILVER" },
  { key: "gold",   label: "1", medal: "1", placeWord: "GOLD"   },
];

const colorMap = {
  gold:   { burst: ["#ffe27a", "#ffd24a", "#b8860b", "#fff7c2"] },
  silver: { burst: ["#fafbff", "#d8d8e0", "#8a8a9a", "#ffffff"] },
  bronze: { burst: ["#f1b97e", "#d68a4c", "#7a4a1f", "#ffd4a6"] },
};

function initials(name) {
  return name
    .replace(/[^a-zA-Z ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0].toUpperCase())
    .join("");
}

async function loadResults() {
  const resp = await fetch("results.json");
  return await resp.json();
}

function makeAwardSlide(award, idx) {
  const slide = document.createElement("section");
  slide.className = "slide award-slide";
  slide.dataset.stage = "award";
  slide.dataset.idx = String(idx);

  const top3 = award.results.slice(0, 3);
  // If we have fewer than 3 distinct results, fill with placeholders so the podium layout still works.
  while (top3.length < 3) top3.push({ name: "—", votes: 0 });

  const placements = {
    gold:   top3[0],
    silver: top3[1],
    bronze: top3[2],
  };

  const title = document.createElement("h2");
  title.className = "award-title";
  title.textContent = award.title;

  const sub = document.createElement("div");
  sub.className = "award-sub";
  sub.textContent = "— and the nominees are —";

  const podium = document.createElement("div");
  podium.className = "podium-wrap";

  for (const place of PLACES) {
    const data = placements[place.key];
    const spot = document.createElement("div");
    spot.className = `spot ${place.key}`;
    spot.dataset.place = place.key;

    const fig = document.createElement("div");
    fig.className = "figure";

    if (place.key === "gold") {
      const crown = document.createElement("div");
      crown.className = "crown";
      crown.textContent = "👑";
      fig.appendChild(crown);
    }

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = initials(data.name) || "?";

    const card = document.createElement("div");
    card.className = "name-card";
    const nameEl = document.createElement("div");
    nameEl.className = "name";
    nameEl.textContent = data.name;
    const votesEl = document.createElement("div");
    votesEl.className = "votes";
    votesEl.textContent = `${data.votes} vote${data.votes === 1 ? "" : "s"}`;
    card.appendChild(nameEl);
    card.appendChild(votesEl);

    const medal = document.createElement("div");
    medal.className = `medal ${place.key}`;
    medal.textContent = place.medal;

    fig.appendChild(avatar);
    fig.appendChild(card);
    fig.appendChild(medal);

    const block = document.createElement("div");
    block.className = `block ${place.key}`;
    const placeLbl = document.createElement("div");
    placeLbl.className = "place-label";
    placeLbl.textContent = place.label;
    block.appendChild(placeLbl);

    spot.appendChild(fig);
    spot.appendChild(block);
    podium.appendChild(spot);
  }

  slide.appendChild(title);
  slide.appendChild(sub);
  slide.appendChild(podium);
  return slide;
}

// ===== State machine =====
const state = {
  slides: [],          // array of section elements (intro, awards..., outro)
  awardSlides: [],     // just the award slides
  cur: 0,              // index in slides
  reveal: 0,           // 0..3 reveal state for current award slide (0=none, 1=bronze, 2=silver, 3=gold)
};

function currentSlide() {
  return state.slides[state.cur];
}

function setActive(idx) {
  state.slides.forEach((s, i) => s.classList.toggle("active", i === idx));
  state.cur = idx;
  state.reveal = 0;
  resetReveals();
  updateHUD();
}

function resetReveals() {
  const slide = currentSlide();
  if (!slide || slide.dataset.stage !== "award") return;
  slide.querySelectorAll(".spot").forEach(s => s.classList.remove("revealed"));
}

function updateHUD() {
  const counter = document.getElementById("counter");
  const awardName = document.getElementById("award-name");
  const slide = currentSlide();
  if (slide.dataset.stage === "award") {
    const idx = parseInt(slide.dataset.idx, 10);
    counter.textContent = `AWARD ${idx + 1} / ${state.awardSlides.length}`;
    awardName.textContent = slide.querySelector(".award-title").textContent;
  } else if (slide.dataset.stage === "intro") {
    counter.textContent = "WELCOME";
    awardName.textContent = "";
  } else {
    counter.textContent = "FIN.";
    awardName.textContent = "";
  }
}

// ===== Advance / Back =====
function advance() {
  const slide = currentSlide();
  if (slide.dataset.stage === "award" && state.reveal < 3) {
    state.reveal += 1;
    const key = PLACES[state.reveal - 1].key;
    const spot = slide.querySelector(`.spot.${key}`);
    spot.classList.add("revealed");
    sfx(key);
    burst(spot, key);
    if (key === "gold") {
      bigBurst();
    }
    return;
  }
  if (state.cur < state.slides.length - 1) {
    setActive(state.cur + 1);
  }
}

function back() {
  const slide = currentSlide();
  if (slide.dataset.stage === "award" && state.reveal > 0) {
    state.reveal -= 1;
    const key = PLACES[state.reveal] ? PLACES[state.reveal].key : null;
    if (key) {
      const spot = slide.querySelector(`.spot.${key}`);
      spot.classList.remove("revealed");
    }
    return;
  }
  if (state.cur > 0) {
    setActive(state.cur - 1);
    // Jump straight to fully revealed when going backwards into an award slide.
    const prev = currentSlide();
    if (prev.dataset.stage === "award") {
      prev.querySelectorAll(".spot").forEach(s => s.classList.add("revealed"));
      state.reveal = 3;
    }
  }
}

// ===== Confetti =====
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");
function fitCanvas() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

const particles = [];
function spawn(x, y, colors, count = 40, speed = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = (Math.random() * 4 + 2) * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - Math.random() * 3,
      g: 0.12 + Math.random() * 0.05,
      life: 90 + Math.random() * 60,
      color: colors[(Math.random() * colors.length) | 0],
      size: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    });
  }
}

function burst(el, placeKey) {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height * 0.3;
  spawn(x, y, colorMap[placeKey].burst, 60, 1);
}

function bigBurst() {
  const colors = ["#ffe27a", "#ffd24a", "#b8860b", "#fff7c2", "#ff7eb6", "#7ab8ff"];
  const w = window.innerWidth, h = window.innerHeight;
  spawn(w * 0.2, h * 0.5, colors, 80, 1.5);
  spawn(w * 0.5, h * 0.4, colors, 100, 1.6);
  spawn(w * 0.8, h * 0.5, colors, 80, 1.5);
}

function tick() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    if (p.life <= 0 || p.y > window.innerHeight + 50) {
      particles.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 60));
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
    ctx.restore();
  }
  requestAnimationFrame(tick);
}
tick();

// ===== Audio (WebAudio synth, no external assets) =====
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function tone(freq, duration = 0.25, type = "sine", gain = 0.15, when = 0) {
  const ctx = getAudio();
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function sfx(placeKey) {
  if (placeKey === "bronze") {
    tone(330, 0.35, "triangle", 0.12);
    tone(440, 0.45, "sine", 0.08, 0.05);
  } else if (placeKey === "silver") {
    tone(440, 0.35, "triangle", 0.13);
    tone(660, 0.45, "sine", 0.09, 0.05);
  } else if (placeKey === "gold") {
    // Fanfare
    [523, 659, 784, 1047].forEach((f, i) => {
      tone(f, 0.5, "triangle", 0.14, i * 0.12);
    });
    tone(1568, 0.7, "sine", 0.08, 0.5);
  }
}

// ===== Keyboard =====
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
    e.preventDefault();
    advance();
  } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
    e.preventDefault();
    back();
  } else if (e.key === "f" || e.key === "F") {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  } else if (e.key === "Home") {
    setActive(0);
  } else if (e.key === "End") {
    setActive(state.slides.length - 1);
  }
});

// Click anywhere to advance (but not on hint/HUD).
document.addEventListener("click", (e) => {
  if (e.target.closest("#hud") || e.target.closest("#hint")) return;
  advance();
});

// ===== Boot =====
(async () => {
  const data = await loadResults();
  const container = document.getElementById("awards-container");
  const intro = document.querySelector(".intro");
  const outro = document.querySelector(".outro");

  data.awards.forEach((award, idx) => {
    const slide = makeAwardSlide(award, idx);
    container.appendChild(slide);
  });

  state.slides = [intro, ...container.children, outro];
  state.awardSlides = Array.from(container.children);
  setActive(0);
})();
