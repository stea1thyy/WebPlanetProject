import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// full screen canvas, no scrollbars
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

// main scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// needed for correct texture colours
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

document.body.appendChild(renderer.domElement);

// camera that just sits back and looks at origin
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

let cameraDistance = 5;

// soft ambient light so the dark side isn’t totally black
const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.35);
scene.add(hemi);

// main directional light
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(6, 2, 3);
scene.add(sun);

// texture loader reused later if needed
const textureLoader = new THREE.TextureLoader();

// plain material, texture does most of the work
const earthMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 1,
  metalness: 0
});

// load earth texture
textureLoader.load("./earth.jpg", (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  earthMaterial.map = tex;
  earthMaterial.needsUpdate = true;
});

const PLANET_RADIUS = 1.2;

// earth mesh
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(PLANET_RADIUS, 128, 128),
  earthMaterial
);

// axial tilt
planet.rotation.z = THREE.MathUtils.degToRad(23.5);
scene.add(planet);

// small marker just to see orientation while testing
const marker = new THREE.Mesh(
  new THREE.SphereGeometry(0.06, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
marker.position.set(0, PLANET_RADIUS, 0);
planet.add(marker);

// mouse rotation state
let dragging = false;
let lastX = 0;
let lastY = 0;
let rotX = 0;
let rotY = 0;

// start rotating on left click
renderer.domElement.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

// stop rotation
window.addEventListener("mouseup", () => {
  dragging = false;
});

// rotate planet based on mouse movement
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;

  lastX = e.clientX;
  lastY = e.clientY;

  rotY += dx * 0.005;
  rotX += dy * 0.005;

  // prevent flipping upside down
  rotX = THREE.MathUtils.clamp(rotX, -Math.PI / 2, Math.PI / 2);
});

// scroll wheel zoom
renderer.domElement.addEventListener("wheel", (e) => {
  e.preventDefault();
  cameraDistance += e.deltaY * 0.002;
  cameraDistance = THREE.MathUtils.clamp(cameraDistance, 2, 20);
});

function animate() {
  requestAnimationFrame(animate);

  planet.rotation.x = rotX;
  planet.rotation.y = rotY;

  camera.position.set(0, 0, cameraDistance);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

animate();

// keep aspect ratio correct on resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
