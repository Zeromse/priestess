const canvas = document.getElementById("reconstructCanvas");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const handle = document.getElementById("compareHandle");
const strength = document.getElementById("strength");
const detail = document.getElementById("detail");
const stability = document.getElementById("stability");
const strengthValue = document.getElementById("strengthValue");
const detailValue = document.getElementById("detailValue");
const stabilityValue = document.getElementById("stabilityValue");
const score = document.getElementById("score");
const statusPanel = document.querySelector(".status-panel");
const statusText = document.getElementById("statusText");
const timecode = document.getElementById("timecode");
const queueCount = document.getElementById("queueCount");

const state = {
  split: 0.55,
  mode: "surface",
  running: false,
  frame: 0,
  layers: {
    geometry: true,
    texture: false,
    lighting: false,
  },
};

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(bounds.width * ratio);
  canvas.height = Math.floor(bounds.height * ratio);
  canvas.style.width = `${bounds.width}px`;
  canvas.style.height = `${bounds.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const splitX = width * state.split;
  const t = state.frame * 0.012;

  ctx.clearRect(0, 0, width, height);
  drawBase(width, height, t);

  ctx.save();
  ctx.beginPath();
  ctx.rect(splitX, 0, width - splitX, height);
  ctx.clip();
  drawReconstructed(width, height, t);
  ctx.restore();

  drawNodeMap(width, height, t, splitX);
  handle.style.left = `${state.split * 100}%`;
}

function drawBase(width, height, t) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#11191f");
  gradient.addColorStop(0.46, "#182027");
  gradient.addColorStop(1, "#11180f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawObject(width, height, t, false);

  ctx.globalAlpha = 0.34;
  for (let i = 0; i < 180; i += 1) {
    const x = ((i * 47 + Math.sin(t + i) * 22) % width + width) % width;
    const y = ((i * 83 + Math.cos(t * 0.8 + i) * 18) % height + height) % height;
    ctx.fillStyle = i % 4 === 0 ? "#ff7d6f" : "#6d797a";
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
}

function drawReconstructed(width, height, t) {
  const modeTint = {
    surface: ["rgba(93, 232, 210, 0.34)", "rgba(155, 236, 120, 0.16)"],
    depth: ["rgba(118, 163, 255, 0.36)", "rgba(93, 232, 210, 0.16)"],
    repair: ["rgba(255, 125, 111, 0.34)", "rgba(255, 193, 79, 0.18)"],
  }[state.mode];

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0e1718");
  gradient.addColorStop(0.52, "#13201d");
  gradient.addColorStop(1, "#19170f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.54, height * 0.45, 20, width * 0.54, height * 0.45, width * 0.45);
  glow.addColorStop(0, modeTint[0]);
  glow.addColorStop(1, modeTint[1]);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  drawObject(width, height, t, true);
}

function drawObject(width, height, t, clean) {
  const cx = width * 0.5;
  const cy = height * 0.51;
  const scale = Math.min(width, height) * 0.28;
  const strengthFactor = Number(strength.value) / 100;
  const detailFactor = Number(detail.value) / 100;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 0.5) * 0.035);

  const rings = clean ? 18 : 9;
  for (let r = rings; r >= 1; r -= 1) {
    const progress = r / rings;
    const radiusX = scale * (0.34 + progress * 0.86);
    const radiusY = scale * (0.14 + progress * 0.5);
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.08) {
      const wobble = clean
        ? Math.sin(a * 5 + t + r) * (4 - detailFactor * 2)
        : Math.sin(a * 3 + t * 1.7 + r) * 12;
      const x = Math.cos(a) * (radiusX + wobble);
      const y = Math.sin(a) * (radiusY + wobble * 0.35);
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = clean
      ? `rgba(93, 232, 210, ${0.08 + progress * 0.16 + strengthFactor * 0.1})`
      : `rgba(162, 173, 171, ${0.04 + progress * 0.09})`;
    ctx.lineWidth = clean ? 1.2 : 0.8;
    ctx.stroke();
  }

  const fillGradient = ctx.createLinearGradient(-scale, -scale, scale, scale);
  fillGradient.addColorStop(0, clean ? "rgba(93, 232, 210, 0.3)" : "rgba(255, 255, 255, 0.08)");
  fillGradient.addColorStop(0.56, clean ? "rgba(239, 247, 245, 0.12)" : "rgba(255, 125, 111, 0.11)");
  fillGradient.addColorStop(1, clean ? "rgba(255, 193, 79, 0.2)" : "rgba(0, 0, 0, 0.2)");
  ctx.fillStyle = fillGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, scale * 0.92, scale * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.layers.lighting || clean) {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = clean ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 193, 79, 0.08)";
    ctx.beginPath();
    ctx.ellipse(-scale * 0.24, -scale * 0.12, scale * 0.26, scale * 0.11, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.restore();
}

function drawNodeMap(width, height, t, splitX) {
  const count = state.layers.geometry ? 44 : 22;
  const points = [];

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.sin(t * 0.3) * 0.08;
    const radius = Math.min(width, height) * (0.18 + (i % 7) * 0.012);
    points.push({
      x: width * 0.5 + Math.cos(angle) * radius * (1.42 + Math.sin(i) * 0.08),
      y: height * 0.51 + Math.sin(angle) * radius * (0.72 + Math.cos(i) * 0.06),
    });
  }

  ctx.save();
  ctx.globalAlpha = state.layers.geometry ? 0.78 : 0.32;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 3) % points.length];
    ctx.beginPath();
    ctx.moveTo(current.x, current.y);
    ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = current.x > splitX ? "rgba(93, 232, 210, 0.34)" : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = current.x > splitX ? 1 : 0.7;
    ctx.stroke();
  }

  points.forEach((point, index) => {
    const reconstructed = point.x > splitX;
    ctx.beginPath();
    ctx.arc(point.x, point.y, reconstructed ? 2.8 : 1.7, 0, Math.PI * 2);
    ctx.fillStyle = reconstructed
      ? index % 5 === 0
        ? "#ffc14f"
        : "#5de8d2"
      : "rgba(255, 255, 255, 0.35)";
    ctx.fill();
  });
  ctx.restore();
}

function updateNumbers() {
  strengthValue.value = `${strength.value}%`;
  detailValue.value = `${detail.value}%`;
  stabilityValue.value = `${stability.value}%`;

  const computedScore = Math.round(
    Number(strength.value) * 0.32 + Number(detail.value) * 0.38 + Number(stability.value) * 0.3,
  );
  score.textContent = String(computedScore);
}

function setSplitFromEvent(event) {
  const rect = stage.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  state.split = Math.min(0.92, Math.max(0.08, (clientX - rect.left) / rect.width));
  draw();
}

function startDrag(event) {
  setSplitFromEvent(event);
  window.addEventListener("pointermove", setSplitFromEvent);
  window.addEventListener("pointerup", endDrag, { once: true });
}

function endDrag() {
  window.removeEventListener("pointermove", setSplitFromEvent);
}

function runReconstruction() {
  if (state.running) return;
  state.running = true;
  statusPanel.classList.add("running");
  statusText.textContent = "Reconstruction in progress";
  document.getElementById("runScan").textContent = "运行中";

  let progress = 0;
  const timer = window.setInterval(() => {
    progress += 1;
    state.split = Math.min(0.86, state.split + 0.005);
    timecode.textContent = `00:${String(14 + Math.floor(progress / 4)).padStart(2, "0")}.${String((progress * 7) % 100).padStart(2, "0")}`;
    queueCount.textContent = String(Math.max(0, 3 - Math.floor(progress / 26))).padStart(2, "0");
    if (progress >= 82) {
      window.clearInterval(timer);
      state.running = false;
      statusPanel.classList.remove("running");
      statusText.textContent = "Reconstruction complete";
      document.getElementById("runScan").innerHTML = '<span class="button-light"></span>重新运行';
      queueCount.textContent = "00";
    }
  }, 55);
}

function resetView() {
  state.split = 0.55;
  state.mode = "surface";
  strength.value = 62;
  detail.value = 48;
  stability.value = 76;
  queueCount.textContent = "03";
  timecode.textContent = "00:14.62";
  statusText.textContent = "Ready for reconstruction";
  statusPanel.classList.remove("running");
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === "surface");
  });
  updateNumbers();
  draw();
}

function animate() {
  state.frame += 1;
  draw();
  window.requestAnimationFrame(animate);
}

stage.addEventListener("pointerdown", startDrag);
window.addEventListener("resize", resizeCanvas);

[strength, detail, stability].forEach((input) => {
  input.addEventListener("input", () => {
    updateNumbers();
    draw();
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    statusText.textContent = `${button.dataset.mode} mode selected`;
    draw();
  });
});

document.querySelectorAll(".layer").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.layer;
    state.layers[name] = !state.layers[name];
    button.classList.toggle("active", state.layers[name]);
    button.querySelector("em").textContent = state.layers[name] ? "On" : "Off";
    draw();
  });
});

document.querySelectorAll(".clip").forEach((clip) => {
  clip.addEventListener("click", () => {
    document.querySelectorAll(".clip").forEach((item) => item.classList.remove("active"));
    clip.classList.add("active");
    statusText.textContent = `${clip.textContent.trim()} phase selected`;
  });
});

document.querySelectorAll(".rail-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".rail-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    statusText.textContent = `${button.title} view selected`;
  });
});

document.getElementById("toggleOverlay").addEventListener("click", () => {
  stage.classList.toggle("overlay-off");
});

document.getElementById("shuffleLayers").addEventListener("click", () => {
  const stack = document.getElementById("layerStack");
  stack.appendChild(stack.firstElementChild);
});

document.getElementById("runScan").addEventListener("click", runReconstruction);
document.getElementById("resetView").addEventListener("click", resetView);

updateNumbers();
resizeCanvas();
animate();
