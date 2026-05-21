// ===== Academy Awardzzorz slideshow =====
// Loads results.json. Per award: an Honorable Mention slide (#4), then a podium
// slide that reveals bronze -> silver -> [drumroll] -> gold.

const PLACES = [
  { key: "bronze", label: "3" },
  { key: "silver", label: "2" },
  { key: "gold",   label: "1" },
];

const colorMap = {
  gold:   { burst: ["#ffe27a", "#ffd24a", "#b8860b", "#fff7c2"] },
  silver: { burst: ["#fafbff", "#d8d8e0", "#8a8a9a", "#ffffff"] },
  bronze: { burst: ["#f1b97e", "#d68a4c", "#7a4a1f", "#ffd4a6"] },
};

const GOLD_DRUMROLL_MS = 1500;

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

// ----- slide builders -----
function makeHonorableSlide(award, idx) {
  const hm = award.results[3] || null;
  const slide = document.createElement("section");
  slide.className = "slide hm-slide";
  slide.dataset.stage = "hm";
  slide.dataset.idx = String(idx);

  slide.innerHTML = `
    <div class="hm-award-title">${escapeHTML(award.title)}</div>
    <div class="hm-banner">HONORABLE MENTION</div>
    <div class="hm-figure">
      <div class="hm-ribbon">4TH PLACE</div>
      <div class="avatar hm-avatar">${escapeHTML(hm ? initials(hm.name) || "?" : "—")}</div>
      <div class="hm-name">${escapeHTML(hm ? hm.name : "—")}</div>
      <div class="hm-votes">${hm ? hm.votes : 0} vote${hm && hm.votes === 1 ? "" : "s"}</div>
    </div>
    <div class="hm-sub">so close, yet so far</div>
  `;
  return slide;
}

function makePodiumSlide(award, idx) {
  const slide = document.createElement("section");
  slide.className = "slide award-slide";
  slide.dataset.stage = "award";
  slide.dataset.idx = String(idx);

  const top3 = award.results.slice(0, 3);
  while (top3.length < 3) top3.push({ name: "—", votes: 0 });
  const placements = { gold: top3[0], silver: top3[1], bronze: top3[2] };

  const title = document.createElement("h2");
  title.className = "award-title";
  title.textContent = award.title;

  const sub = document.createElement("div");
  sub.className = "award-sub";
  sub.textContent = "— the podium —";

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

    fig.appendChild(avatar);
    fig.appendChild(card);

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

  // Drumroll overlay (hidden by default).
  const drumOverlay = document.createElement("div");
  drumOverlay.className = "drumroll-overlay";
  drumOverlay.innerHTML = `<div class="drumroll-text">AND THE WINNER IS<span class="dots"><span>.</span><span>.</span><span>.</span></span></div>`;
  slide.appendChild(drumOverlay);

  slide.appendChild(title);
  slide.appendChild(sub);
  slide.appendChild(podium);
  return slide;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// ===== State machine =====
const state = {
  slides: [],
  awardCount: 0,
  cur: 0,
  reveal: 0,      // 0..3 podium reveal state
  busy: false,    // true during drumroll, blocks input
};

function currentSlide() { return state.slides[state.cur]; }

function setActive(idx, opts = {}) {
  state.slides.forEach((s, i) => s.classList.toggle("active", i === idx));
  state.cur = idx;
  state.reveal = 0;
  resetReveals();
  if (opts.fullyReveal && currentSlide().dataset.stage === "award") {
    currentSlide().querySelectorAll(".spot").forEach(s => s.classList.add("revealed"));
    state.reveal = 3;
  }
  updateHUD();
}

function resetReveals() {
  const slide = currentSlide();
  if (!slide || slide.dataset.stage !== "award") return;
  slide.classList.remove("drumroll-active");
  slide.querySelectorAll(".spot").forEach(s => s.classList.remove("revealed"));
}

function updateHUD() {
  const counter = document.getElementById("counter");
  const awardName = document.getElementById("award-name");
  const slide = currentSlide();
  const stage = slide.dataset.stage;
  if (stage === "award" || stage === "hm") {
    const idx = parseInt(slide.dataset.idx, 10);
    counter.textContent = `AWARD ${idx + 1} / ${state.awardCount}`;
    awardName.textContent = stage === "award"
      ? slide.querySelector(".award-title").textContent
      : slide.querySelector(".hm-award-title").textContent;
  } else if (stage === "intro") {
    counter.textContent = "WELCOME";
    awardName.textContent = "";
  } else {
    counter.textContent = "FIN.";
    awardName.textContent = "";
  }
}

// ===== Advance / Back =====
function advance() {
  if (state.busy) return;
  const slide = currentSlide();
  if (slide.dataset.stage === "award" && state.reveal < 3) {
    const nextKey = PLACES[state.reveal].key;
    if (nextKey === "gold") {
      doGoldReveal(slide);
      return;
    }
    state.reveal += 1;
    const spot = slide.querySelector(`.spot.${nextKey}`);
    spot.classList.add("revealed");
    sfx(nextKey);
    setTimeout(() => burst(spot, nextKey), 150);
    return;
  }
  if (state.cur < state.slides.length - 1) {
    setActive(state.cur + 1);
  }
}

function doGoldReveal(slide) {
  state.busy = true;
  slide.classList.add("drumroll-active");
  drumrollSfx(GOLD_DRUMROLL_MS / 1000);
  setTimeout(() => {
    slide.classList.remove("drumroll-active");
    const spot = slide.querySelector(`.spot.gold`);
    spot.classList.add("revealed");
    state.reveal = 3;
    fanfareSfx();
    setTimeout(() => {
      burst(spot, "gold");
      bigBurst();
    }, 250);
    state.busy = false;
  }, GOLD_DRUMROLL_MS);
}

function back() {
  if (state.busy) return;
  const slide = currentSlide();
  if (slide.dataset.stage === "award" && state.reveal > 0) {
    state.reveal -= 1;
    const key = PLACES[state.reveal].key;
    const spot = slide.querySelector(`.spot.${key}`);
    spot.classList.remove("revealed");
    return;
  }
  if (state.cur > 0) {
    setActive(state.cur - 1, { fullyReveal: true });
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
  spawn(w * 0.5, h * 0.4, colors, 120, 1.6);
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
  }
}

function drumrollSfx(duration) {
  const ctx = getAudio();
  const start = ctx.currentTime;
  const hits = Math.floor(duration * 18); // ~18 hits/sec, accelerating
  for (let i = 0; i < hits; i++) {
    // Slight acceleration toward the end
    const progress = i / hits;
    const t = start + duration * (progress ** 0.85);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(85 + Math.random() * 25, t);
    const peak = 0.08 + progress * 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }
  // Final cymbal-ish crash at the end
  const crashT = start + duration;
  const crash = ctx.createOscillator();
  const cg = ctx.createGain();
  crash.type = "sawtooth";
  crash.frequency.setValueAtTime(1200, crashT);
  crash.frequency.exponentialRampToValueAtTime(220, crashT + 0.5);
  cg.gain.setValueAtTime(0, crashT);
  cg.gain.linearRampToValueAtTime(0.18, crashT + 0.01);
  cg.gain.exponentialRampToValueAtTime(0.001, crashT + 0.7);
  crash.connect(cg).connect(ctx.destination);
  crash.start(crashT);
  crash.stop(crashT + 0.75);
}

function fanfareSfx() {
  // Big triumphant chord sequence on gold reveal.
  [523, 659, 784, 1047].forEach((f, i) => {
    tone(f, 0.6, "triangle", 0.14, i * 0.1);
  });
  tone(1568, 0.9, "sine", 0.08, 0.45);
  tone(261, 0.9, "sawtooth", 0.06, 0); // sub
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
    container.appendChild(makeHonorableSlide(award, idx));
    container.appendChild(makePodiumSlide(award, idx));
  });

  state.slides = [intro, ...container.children, outro];
  state.awardCount = data.awards.length;
  setActive(0);
})();
