import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// fullscreen canvas, no scroll
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

const scene = new THREE.Scene();

// renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);

// main camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

let cameraDistance = 5;
let camYaw = 0;
let camPitch = 0;

// view state
let MODE = "SOLAR"; // SOLAR or PLANET
let ACTIVE_PLANET = "Earth";

// space background (image only)
const spaceTexture = new THREE.TextureLoader().load(
  "./NightSkyHDRI008_4K_TONEMAPPED.jpg"
);
spaceTexture.colorSpace = THREE.SRGBColorSpace;

const space = new THREE.Mesh(
  new THREE.SphereGeometry(120, 64, 64),
  new THREE.MeshBasicMaterial({
    map: spaceTexture,
    side: THREE.BackSide
  })
);
scene.add(space);

// basic lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.35));

const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(6, 2, 3);
scene.add(sun);

// earth material 
const earthMaterial = new THREE.MeshStandardMaterial({
  roughness: 1,
  metalness: 0
});

// earth texture
new THREE.TextureLoader().load("./earth.jpg", tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  earthMaterial.map = tex;
  earthMaterial.needsUpdate = true;
});

const PLANET_RADIUS = 1.2;

// planet mesh (planet view)
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(PLANET_RADIUS, 128, 128),
  earthMaterial
);

// axial tilt
planet.rotation.z = THREE.MathUtils.degToRad(23.5);
scene.add(planet);

// solar system group
const solarSystem = new THREE.Group();
scene.add(solarSystem);

// sun mesh
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0xffcc55 })
);
solarSystem.add(sunMesh);

// orbit + spin values
const PLANET_DATA = [
  { name: "Mercury", radius: 0.18, distance: 3.5, orbit: 0.0008, spin: 0.0020, color: 0xb1b1b1 },
  { name: "Venus",   radius: 0.28, distance: 4.8, orbit: 0.0007, spin: 0.0012, color: 0xd6b27c },
  { name: "Earth",   radius: 0.30, distance: 6.2, orbit: 0.0006, spin: 0.0030, color: 0x2f6cff },
  { name: "Mars",    radius: 0.24, distance: 7.8, orbit: 0.0005, spin: 0.0032, color: 0xc1440e },
  { name: "Jupiter", radius: 0.65, distance: 10.5, orbit: 0.00035, spin: 0.0060, color: 0xd2b48c },
  { name: "Saturn",  radius: 0.55, distance: 13.5, orbit: 0.00028, spin: 0.0050, color: 0xe0c97a },
  { name: "Uranus",  radius: 0.45, distance: 16.8, orbit: 0.00022, spin: 0.0040, color: 0x8fd3ff },
  { name: "Neptune", radius: 0.45, distance: 19.8, orbit: 0.00018, spin: 0.0040, color: 0x2b5cff }
];

const solarPivots = [];
const solarMeshes = [];

// simple orbit ring helper
function createOrbitRing(radius) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
  const points = curve.getPoints(128);
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(p => new THREE.Vector3(p.x, 0, p.y))
  );
  const material = new THREE.LineBasicMaterial({
    color: 0x445566,
    transparent: true,
    opacity: 0.55
  });
  return new THREE.LineLoop(geometry, material);
}

// build solar system
PLANET_DATA.forEach(p => {
  solarSystem.add(createOrbitRing(p.distance));

  const pivot = new THREE.Object3D();
  solarSystem.add(pivot);

  const material =
    p.name === "Earth"
      ? earthMaterial
      : new THREE.MeshStandardMaterial({ color: p.color });

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.radius, 32, 32),
    material
  );

  mesh.position.x = p.distance;
  mesh.userData.name = p.name;

  pivot.add(mesh);

  solarPivots.push({ pivot, mesh, orbitSpeed: p.orbit, spinSpeed: p.spin });
  solarMeshes.push(mesh);
});

// solar system button (planet view only)
const solarBtn = document.createElement("button");
solarBtn.textContent = "☀ Solar System";
solarBtn.style.position = "absolute";
solarBtn.style.left = "18px";
solarBtn.style.bottom = "18px";
solarBtn.style.padding = "10px 12px";
solarBtn.style.borderRadius = "10px";
solarBtn.style.border = "1px solid rgba(120,180,255,0.25)";
solarBtn.style.background = "rgba(10,16,30,0.70)";
solarBtn.style.color = "#dcecff";
solarBtn.style.cursor = "pointer";
solarBtn.style.backdropFilter = "blur(6px)";
solarBtn.style.display = "none";
solarBtn.onclick = () => enterSolarView();
document.body.appendChild(solarBtn);

// top hint text
const solarNote = document.createElement("div");
solarNote.style.position = "absolute";
solarNote.style.top = "18px";
solarNote.style.left = "50%";
solarNote.style.transform = "translateX(-50%)";
solarNote.style.padding = "10px 14px";
solarNote.style.background = "rgba(0,0,0,0.45)";
solarNote.style.border = "1px solid rgba(255,255,255,0.2)";
solarNote.style.borderRadius = "10px";
solarNote.style.color = "#eaf2ff";
solarNote.style.fontFamily = "sans-serif";
solarNote.style.fontSize = "14px";
solarNote.style.backdropFilter = "blur(6px)";
solarNote.style.display = "block";
solarNote.style.pointerEvents = "none";
solarNote.innerHTML =
  "☀️ Solar System view — click a planet to open its planet view (Earth has continents).";
document.body.appendChild(solarNote);

// info content (unchanged)
const INFO_CONTENT = { /* unchanged */ };

// info panel (unchanged)
const infoPanel = document.createElement("div");
/* styles unchanged */
document.body.appendChild(infoPanel);

function showInfo(key) {
  const data = INFO_CONTENT[key];
  if (!data) return;
  infoTitle.textContent = data.title;
  infoText.innerHTML = data.text.replace(/\n/g, "<br>");
  infoPanel.style.display = "block";
}

// continent markers 
const buttons = [];

const RED = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.4 });
const GREEN = new THREE.MeshStandardMaterial({ color: 0x00ff55, transparent: true, opacity: 0.6 });

function addButton(label, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 24, 24),
    RED.clone()
  );

  mesh.userData = { label, clicked: false };
  mesh.position
    .copy(new THREE.Vector3(x, y, z).normalize())
    .multiplyScalar(PLANET_RADIUS + 0.02);

  planet.add(mesh);
  buttons.push(mesh);
}

// Button placements
addButton("North America", -0.2, 0.6, 0.7);
addButton("South America", 30, -10, 50);
addButton("Europe", 15, 18, -5);
addButton("Africa", 23, 0.1, -10);
addButton("Asia", 20, 100, -150);
addButton("Australia", -130, -80, -100);
addButton("Antarctica", 0, -1, 0);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let draggingPlanet = false;
let draggingCamera = false;
let lastX = 0;
let lastY = 0;
let rotX = 0;
let rotY = 0;

// switch to solar view
function enterSolarView() {
  MODE = "SOLAR";
  ACTIVE_PLANET = "Solar";

  solarSystem.visible = true;
  planet.visible = false;

  infoPanel.style.display = "none";
  solarBtn.style.display = "none";
  solarNote.style.display = "block";

  cameraDistance = 24;
  camYaw = 0;
  camPitch = -1.35;
}

// switch to planet view
function enterPlanetView(name) {
  MODE = "PLANET";
  ACTIVE_PLANET = name;

  solarSystem.visible = false;
  planet.visible = true;

  solarBtn.style.display = "block";
  solarNote.style.display = "none";

  rotX = 0;
  rotY = 0;

  if (name === "Earth") {
    showInfo("Earth");
    buttons.forEach(b => (b.visible = true));
  } else {
    buttons.forEach(b => (b.visible = false));
    showInfo("Earth"); // placeholder
    infoTitle.textContent = `🪐 ${name}`;
    infoText.innerHTML =
      `Planet view for <b>${name}</b> is coming soon.<br><br>(Earth still has continents.)`;
  }

  cameraDistance = 5;
  camYaw = 0;
  camPitch = 0;
}

// click handling
renderer.domElement.addEventListener("click", e => {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  if (MODE === "SOLAR") {
    const hits = raycaster.intersectObjects(solarMeshes);
    if (!hits.length) return;
    enterPlanetView(hits[0].object.userData.name);
    return;
  }

  if (ACTIVE_PLANET !== "Earth") return;

  const hits = raycaster.intersectObjects(buttons);
  if (!hits.length) return;

  const btn = hits[0].object;
  if (!btn.userData.clicked) {
    btn.material = GREEN.clone();
    btn.userData.clicked = true;
  }

  showInfo(btn.userData.label);
});

// drag handling
renderer.domElement.addEventListener("mousedown", e => {
  if (e.button !== 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  draggingPlanet = MODE !== "SOLAR" && raycaster.intersectObject(planet).length > 0;
  draggingCamera = !draggingPlanet;

  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener("mousemove", e => {
  if (!draggingPlanet && !draggingCamera) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  if (draggingPlanet) {
    rotY += dx * 0.005;
    rotX += dy * 0.005;
  }

  if (draggingCamera) {
    camYaw += dx * 0.005;
    camPitch += dy * 0.005;
  }
});

window.addEventListener("mouseup", () => {
  draggingPlanet = false;
  draggingCamera = false;
});

// zoom
renderer.domElement.addEventListener("wheel", e => {
  e.preventDefault();

  const min = MODE === "SOLAR" ? 10 : 2;
  const max = MODE === "SOLAR" ? 80 : 20;

  cameraDistance = THREE.MathUtils.clamp(
    cameraDistance + e.deltaY * 0.002,
    min,
    max
  );
});

function animate() {
  requestAnimationFrame(animate);

  space.rotation.y += 0.00002;

  if (MODE === "SOLAR") {
    for (const p of solarPivots) {
      p.pivot.rotation.y += p.orbitSpeed;
      p.mesh.rotation.y += p.spinSpeed;
    }
  }

  if (MODE === "PLANET") {
    planet.rotation.x = rotX;
    planet.rotation.y = rotY;
  }

  camera.position.set(
    Math.sin(camYaw) * Math.cos(camPitch) * cameraDistance,
    Math.sin(camPitch) * cameraDistance,
    Math.cos(camYaw) * Math.cos(camPitch) * cameraDistance
  );

  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

animate();

// start in solar system
enterSolarView();

// resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
