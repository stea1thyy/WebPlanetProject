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

// background video sphere
const video = document.createElement("video");
video.src = "./space.mov";
video.muted = true;
video.loop = true;
video.playsInline = true;
video.autoplay = true;
video.play();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.generateMipmaps = false;

const videoSpace = new THREE.Mesh(
  new THREE.SphereGeometry(95, 64, 64),
  new THREE.MeshBasicMaterial({
    map: videoTexture,
    side: THREE.BackSide
  })
);
scene.add(videoSpace);

// static image layer on top of video
const spaceImage = new THREE.TextureLoader().load(
  "./NightSkyHDRI008_4K_TONEMAPPED.jpg"
);
spaceImage.colorSpace = THREE.SRGBColorSpace;

const imageSpace = new THREE.Mesh(
  new THREE.SphereGeometry(100, 64, 64),
  new THREE.MeshBasicMaterial({
    map: spaceImage,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
scene.add(imageSpace);

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

// earth mesh
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(PLANET_RADIUS, 128, 128),
  earthMaterial
);

// axial tilt
planet.rotation.z = THREE.MathUtils.degToRad(23.5);
scene.add(planet);

// info text for continents
const INFO_CONTENT = {
  Earth: {
    title: "🌍 Welcome to Earth",
    text: `
Earth is the third planet from the Sun and the only known world confirmed to support life.
Formed over 4.5 billion years ago, Earth developed a stable atmosphere, liquid water, and
a protective magnetic field that shields life from harmful radiation.

Its surface is divided into continents and oceans, shaped by tectonic movement and
climate systems that regulate temperature and weather.
`
  },
  "North America": { title: "🌎 North America", text: "North America stretches from the icy Arctic regions to warm tropical areas near the equator. It features dramatic landscapes such as the Rocky Mountains, vast forests, and deep canyons. Indigenous peoples lived here for thousands of years before modern nations formed. Today, North America is known for its economic power, cultural influence, and technological development." },
  "South America": { title: "🌎 South America", text: "South America is dominated by powerful natural features, including the Amazon Rainforest and the Andes Mountains, the longest mountain range in the world. The continent is rich in biodiversity, with millions of plant and animal species. Ancient civilisations such as the Incas once ruled vast areas of this land. Today, South America blends ancient history, colonial influence, and vibrant modern cultures." },
  Europe: { title: "🌍 Europe", text: "Europe may be small compared to other continents, but it has had a huge impact on world history. It was the centre of the Roman Empire, the Renaissance, and the Industrial Revolution. Europe is known for its mix of old and new, where medieval castles sit beside modern cities. The continent has a mild climate in many areas, making it ideal for farming, trade, and early settlement." },
  Africa: { title: "🌍 Africa", text: "Africa is the world’s second-largest continent and is often called the cradle of humanity, as the earliest human ancestors evolved here. It has an incredible range of environments, from the scorching Sahara Desert in the north to dense rainforests near the equator and wide savannas filled with wildlife. Africa is also home to the longest river in the world, the Nile, and the tallest mountain on the continent, Mount Kilimanjaro. With thousands of cultures, languages, and traditions, Africa is one of the most diverse places on Earth." },
  Asia: { title: "🌏 Asia", text: "Asia is the largest and most populated continent, containing more than half of the world’s population. It is home to some of the planet’s most extreme geography, including Mount Everest, the highest point on Earth, and vast deserts like the Gobi. Asia has been the birthplace of many major civilisations, religions, and technologies that shaped human history. From ancient temples to modern megacities, Asia blends tradition and innovation on an enormous scale." },
  Australia: { title: "🌏 Australia", text: "Australia is both a country and a continent, making it unique in the world. Much of its interior is dry and sparsely populated, known as the Outback, while most people live along the coast. Australia is famous for its unusual wildlife, including kangaroos and koalas, found nowhere else on Earth. The continent is also home to the Great Barrier Reef, the largest coral reef system on the planet." },
  Antarctica: { title: "❄️ Antarctica", text: "Antarctica is the coldest, driest, and windiest continent on Earth. It has no permanent human population and is mostly covered by thick ice sheets that hold the majority of the world’s fresh water. Scientists from many countries work here to study climate change, space, and extreme life conditions. Despite its harsh environment, Antarctica supports unique wildlife such as penguins and seals." }
};

// simple info popup
const infoPanel = document.createElement("div");
infoPanel.style.position = "absolute";
infoPanel.style.top = "50%";
infoPanel.style.left = "50%";
infoPanel.style.transform = "translate(-50%, -50%)";
infoPanel.style.width = "420px";
infoPanel.style.padding = "20px";
infoPanel.style.background = "rgba(20,40,80,0.75)";
infoPanel.style.border = "1px solid rgba(120,180,255,0.4)";
infoPanel.style.borderRadius = "10px";
infoPanel.style.color = "#dcecff";
infoPanel.style.fontFamily = "sans-serif";
infoPanel.style.boxShadow = "0 0 25px rgba(80,150,255,0.35)";
infoPanel.style.backdropFilter = "blur(6px)";
infoPanel.style.display = "none";

const infoTitle = document.createElement("div");
infoTitle.style.fontSize = "20px";
infoTitle.style.fontWeight = "bold";
infoTitle.style.marginBottom = "10px";

const infoClose = document.createElement("div");
infoClose.textContent = "✕";
infoClose.style.position = "absolute";
infoClose.style.top = "8px";
infoClose.style.right = "10px";
infoClose.style.cursor = "pointer";
infoClose.onclick = () => infoPanel.style.display = "none";

const infoText = document.createElement("div");
infoText.style.fontSize = "14px";
infoText.style.lineHeight = "1.5";

infoPanel.append(infoTitle, infoClose, infoText);
document.body.appendChild(infoPanel);

function showInfo(key) {
  const data = INFO_CONTENT[key];
  if (!data) return;

  infoTitle.textContent = data.title;
  infoText.innerHTML = data.text.replace(/\n/g, "<br>");
  infoPanel.style.display = "block";
}

// clickable continent markers
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

// rough positions, tweaked by eye
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

// click to select buttons
renderer.domElement.addEventListener("click", e => {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(buttons);

  if (!hits.length) return;

  const btn = hits[0].object;

  if (!btn.userData.clicked) {
    btn.material = GREEN.clone();
    btn.userData.clicked = true;
  }

  showInfo(btn.userData.label);
});

// decide whether dragging planet or camera
renderer.domElement.addEventListener("mousedown", e => {
  if (e.button !== 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  draggingPlanet = raycaster.intersectObject(planet).length > 0;
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
  cameraDistance = THREE.MathUtils.clamp(
    cameraDistance + e.deltaY * 0.002,
    2,
    20
  );
});

function animate() {
  requestAnimationFrame(animate);

  videoSpace.rotation.y += 0.00005;
  imageSpace.rotation.y += 0.00002;

  planet.rotation.x = rotX;
  planet.rotation.y = rotY;

  camera.position.set(
    Math.sin(camYaw) * Math.cos(camPitch) * cameraDistance,
    Math.sin(camPitch) * cameraDistance,
    Math.cos(camYaw) * Math.cos(camPitch) * cameraDistance
  );

  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

animate();

// show earth info on load
showInfo("Earth");

// resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
