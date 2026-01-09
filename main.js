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
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

// audio system

let MASTER_VOLUME = 0.5;
let MUTED = false;

const listener = new THREE.AudioListener();
camera.add(listener);

// click sound (buttons, planets)
const clickSound = new THREE.Audio(listener);
const clickLoader = new THREE.AudioLoader();
clickLoader.load("./audio/uiclick.mp3", buffer => {
  clickSound.setBuffer(buffer);
  clickSound.setVolume(MASTER_VOLUME);
});

// UI popup sound (info panels)
const popupSound = new THREE.Audio(listener);
const popupLoader = new THREE.AudioLoader();
popupLoader.load("./audio/popup.mp3", buffer => {
  popupSound.setBuffer(buffer);
  popupSound.setVolume(MASTER_VOLUME);
});

// background music
const music = new THREE.Audio(listener);
const musicLoader = new THREE.AudioLoader();
musicLoader.load("./audio/spacemusic.mp3", buffer => {
  music.setBuffer(buffer);
  music.setLoop(true);
  music.setVolume(MASTER_VOLUME);
  music.play();
});

// helpers
function playClickSound() {
  if (MUTED || !clickSound.buffer) return;
  if (clickSound.isPlaying) clickSound.stop();
  clickSound.play();
}

function playPopupSound() {
  if (MUTED || !popupSound.buffer) return;
  if (popupSound.isPlaying) popupSound.stop();
  popupSound.play();
}

function updateVolume() {
  const vol = MUTED ? 0 : MASTER_VOLUME;
  clickSound.setVolume(vol);
  popupSound.setVolume(vol);
  music.setVolume(vol);
}

//space background
const spaceTexture = new THREE.TextureLoader().load("./textures/background.jpg");
spaceTexture.colorSpace = THREE.SRGBColorSpace;

const space = new THREE.Mesh(
  new THREE.SphereGeometry(300, 64, 64),
  new THREE.MeshBasicMaterial({ map: spaceTexture, side: THREE.BackSide })
);
scene.add(space);

// basic lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.35));

const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
sunLight.position.set(6, 2, 3);
scene.add(sunLight);

// modes
let MODE = "SOLAR"; 
let ACTIVE_PLANET = "Earth";

// speed and scale
const SOLAR_TIME_SCALE = 0.10; // // slows the orbits and rotations of all planets in solar view
const SPACE_DRIFT = 0.00002; // background drift
const ORBIT_SPREAD = 1.6; // changes the distant of the planets

// planet data
const PLANETS = {
  Mercury: {
    radius: 0.22,
    orbitRadius: 5.0,
    orbitSpeed: 0.010,
    rotationSpeed: 0.010,
    texture: ".textures//mercury.jpg",
    fallbackColor: 0xb1b1b1,
    description:
      "Mercury is the closest planet to the Sun. It has extreme temperature swings because it has almost no atmosphere to hold heat, and it’s battered by solar radiation."
  },
  Venus: {
    radius: 0.33,
    orbitRadius: 7.0,
    orbitSpeed: 0.008,
    rotationSpeed: 0.004,
    texture: "./textures/venus.jpg",
    fallbackColor: 0xd9b37c,
    description:
      "Venus is similar in size to Earth, but its thick carbon-dioxide atmosphere traps heat in a runaway greenhouse effect. It’s the hottest planet in the Solar System."
  },
  Earth: {
    radius: 0.36,
    orbitRadius: 9.0,
    orbitSpeed: 0.006,
    rotationSpeed: 0.012,
    texture: "./textures/earth.jpg",
    fallbackColor: 0x2f6cff,
    description:
      "Earth is the only known planet to support life, with liquid water, a protective atmosphere, and a magnetic field that helps shield the surface from harmful solar radiation."
  },
  Mars: {
    radius: 0.28,
    orbitRadius: 11.5,
    orbitSpeed: 0.005,
    rotationSpeed: 0.011,
    texture: "./textures/mars.jpg",
    fallbackColor: 0xc05b3a,
    description:
      "Mars is a cold desert world with dust storms, polar ice caps, and towering volcanoes. Its thin atmosphere makes it hard to keep warmth, but it’s one of the most explored planets."
  },
  Jupiter: {
    radius: 0.80,
    orbitRadius: 16.0,
    orbitSpeed: 0.003,
    rotationSpeed: 0.020,
    texture: "./textures/jupiter.jpg",
    fallbackColor: 0xd2b48c,
    description:
      "Jupiter is the largest planet — a gas giant with powerful storms like the Great Red Spot. Its huge gravity shapes the Solar System by influencing asteroids and comets."
  },
  Saturn: {
    radius: 0.70,
    orbitRadius: 20.0,
    orbitSpeed: 0.0025,
    rotationSpeed: 0.018,
    texture: "./textures/saturn.jpg",
    fallbackColor: 0xe0c98a,
    description:
      "Saturn is a gas giant famous for its bright rings made of ice and rock. Its moon system is enormous, and its rings make it one of the most visually distinctive planets."
  },
  Uranus: {
    radius: 0.52,
    orbitRadius: 24.0,
    orbitSpeed: 0.0020,
    rotationSpeed: 0.013,
    texture: "./textures/uranus.jpg",
    fallbackColor: 0x8fd3ff,
    description:
      "Uranus is an ice giant that rotates on its side. This extreme tilt produces unusual seasons and makes its day/night cycle very different from most planets."
  },
  Neptune: {
    radius: 0.50,
    orbitRadius: 28.0,
    orbitSpeed: 0.0017,
    rotationSpeed: 0.014,
    texture: "./textures/neptune.jpg",
    fallbackColor: 0x2b5cff,
    description:
      "Neptune is a deep-blue ice giant with some of the fastest winds in the Solar System. Even though it’s far from the Sun, it has energetic weather systems and storms."
  }
};

// planet material
const textureLoader = new THREE.TextureLoader();

function makePlanetMaterial(planetName) {
  const p = PLANETS[planetName];

  const mat = new THREE.MeshStandardMaterial({
    roughness: 1.0,
    metalness: 0.0,
    color: p.fallbackColor ?? 0xffffff
  });

  if (!p.texture) return mat;

  textureLoader.load(
    p.texture,
    tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    },
    undefined,
    () => {
    }
  );

  return mat;
}

// instructions on how to use
const topNote = document.createElement("div");
topNote.style.position = "absolute";
topNote.style.top = "18px";
topNote.style.left = "50%";
topNote.style.transform = "translateX(-50%)";
topNote.style.padding = "10px 14px";
topNote.style.background = "rgba(0,0,0,0.45)";
topNote.style.border = "1px solid rgba(255,255,255,0.2)";
topNote.style.borderRadius = "10px";
topNote.style.color = "#eaf2ff";
topNote.style.fontFamily = "sans-serif";
topNote.style.fontSize = "14px";
topNote.style.backdropFilter = "blur(6px)";
topNote.style.pointerEvents = "none";
topNote.innerHTML =
  "☀️ <b>Solar System View</b> — Planets orbit the Sun. Click a planet (try <b>Earth</b>) to open its controls.";
document.body.appendChild(topNote);

// panel pops up when planet is clicked
const rightPanel = document.createElement("div");
rightPanel.style.position = "absolute";
rightPanel.style.top = "0";
rightPanel.style.right = "0";
rightPanel.style.height = "100%";
rightPanel.style.width = "360px";
rightPanel.style.padding = "18px";
rightPanel.style.boxSizing = "border-box";
rightPanel.style.background = "rgba(10,16,30,0.75)";
rightPanel.style.borderLeft = "1px solid rgba(120,180,255,0.22)";
rightPanel.style.backdropFilter = "blur(8px)";
rightPanel.style.fontFamily = "sans-serif";
rightPanel.style.color = "#dcecff";
rightPanel.style.display = "block";
document.body.appendChild(rightPanel);

const rpTitle = document.createElement("div");
rpTitle.style.fontSize = "18px";
rpTitle.style.fontWeight = "700";
rpTitle.style.marginBottom = "8px";

const rpDesc = document.createElement("div");
rpDesc.style.fontSize = "13px";
rpDesc.style.lineHeight = "1.5";
rpDesc.style.opacity = "0.92";
rpDesc.style.marginBottom = "12px";

function makeLabel(text) {
  const el = document.createElement("div");
  el.style.marginTop = "10px";
  el.style.fontSize = "12px";
  el.style.opacity = "0.9";
  el.textContent = text;
  return el;
}
function makeHint() {
  const el = document.createElement("div");
  el.style.marginTop = "6px";
  el.style.fontSize = "12px";
  el.style.lineHeight = "1.4";
  el.style.opacity = "0.85";
  el.style.padding = "8px 10px";
  el.style.borderRadius = "10px";
  el.style.border = "1px solid rgba(120,180,255,0.15)";
  el.style.background = "rgba(0,0,0,0.20)";
  return el;
}
function makeRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "10px";
  return row;
}
function makeValuePill() {
  const v = document.createElement("div");
  v.style.minWidth = "66px";
  v.style.textAlign = "right";
  v.style.fontSize = "12px";
  v.style.opacity = "0.9";
  return v;
}
function makeSlider(min, max, step) {
  const s = document.createElement("input");
  s.type = "range";
  s.min = String(min);
  s.max = String(max);
  s.step = String(step);
  s.style.width = "100%";
  return s;
}
function makeButton(text) {
  const b = document.createElement("button");
  b.textContent = text;
  b.style.width = "100%";
  b.style.marginTop = "12px";
  b.style.padding = "10px 12px";
  b.style.borderRadius = "10px";
  b.style.border = "1px solid rgba(120,180,255,0.25)";
  b.style.background = "rgba(40,80,160,0.25)";
  b.style.color = "#dcecff";
  b.style.cursor = "pointer";
  b.onmouseenter = () => (b.style.background = "rgba(40,80,160,0.40)");
  b.onmouseleave = () => (b.style.background = "rgba(40,80,160,0.25)");
  return b;
}

// sliders
const orbitSpeedLabel = makeLabel("Orbit speed");
const orbitSpeedRow = makeRow();
const orbitSpeedSlider = makeSlider(0.0000, 0.0200, 0.0002);
const orbitSpeedValue = makeValuePill();
orbitSpeedRow.appendChild(orbitSpeedSlider);
orbitSpeedRow.appendChild(orbitSpeedValue);
const orbitSpeedHint = makeHint();

const orbitRadiusLabel = makeLabel("Orbit radius");
const orbitRadiusRow = makeRow();
const orbitRadiusSlider = makeSlider(3.0, 32.0, 0.1);
const orbitRadiusValue = makeValuePill();
orbitRadiusRow.appendChild(orbitRadiusSlider);
orbitRadiusRow.appendChild(orbitRadiusValue);
const orbitRadiusHint = makeHint();

const rotationSpeedLabel = makeLabel("Rotation and Auto spin");
const rotationSpeedRow = makeRow();
const rotationSpeedSlider = makeSlider(0.0000, 0.0300, 0.0005);
const rotationSpeedValue = makeValuePill();
rotationSpeedRow.appendChild(rotationSpeedSlider);
rotationSpeedRow.appendChild(rotationSpeedValue);
const rotationSpeedHint = makeHint();

const planetViewBtn = makeButton("Planet View");
planetViewBtn.style.marginTop = "16px";

rightPanel.appendChild(rpTitle);
rightPanel.appendChild(rpDesc);
rightPanel.appendChild(orbitSpeedLabel);
rightPanel.appendChild(orbitSpeedRow);
rightPanel.appendChild(orbitSpeedHint);
rightPanel.appendChild(orbitRadiusLabel);
rightPanel.appendChild(orbitRadiusRow);
rightPanel.appendChild(orbitRadiusHint);
rightPanel.appendChild(rotationSpeedLabel);
rightPanel.appendChild(rotationSpeedRow);
rightPanel.appendChild(rotationSpeedHint);
rightPanel.appendChild(planetViewBtn);

// solar system view button
const backBtn = document.createElement("button");
backBtn.textContent = "Solar System";
backBtn.style.position = "absolute";
backBtn.style.left = "18px";
backBtn.style.bottom = "18px";
backBtn.style.padding = "10px 12px";
backBtn.style.borderRadius = "10px";
backBtn.style.border = "1px solid rgba(120,180,255,0.25)";
backBtn.style.background = "rgba(10,16,30,0.70)";
backBtn.style.color = "#dcecff";
backBtn.style.cursor = "pointer";
backBtn.style.backdropFilter = "blur(6px)";
backBtn.style.display = "none";
backBtn.onmouseenter = () => (backBtn.style.background = "rgba(10,16,30,0.90)");
backBtn.onmouseleave = () => (backBtn.style.background = "rgba(10,16,30,0.70)");

// settings button
const settingsBtn = document.createElement("button");
settingsBtn.textContent = "Settings";
settingsBtn.style.position = "absolute";
settingsBtn.style.left = "18px";
settingsBtn.style.top = "18px";
settingsBtn.style.padding = "10px 12px";
settingsBtn.style.borderRadius = "10px";
settingsBtn.style.border = "1px solid rgba(120,180,255,0.25)";
settingsBtn.style.background = "rgba(10,16,30,0.70)";
settingsBtn.style.color = "#dcecff";
settingsBtn.style.cursor = "pointer";
settingsBtn.style.backdropFilter = "blur(6px)";
settingsBtn.onmouseenter = () => (settingsBtn.style.background = "rgba(10,16,30,0.90)");
settingsBtn.onmouseleave = () => (settingsBtn.style.background = "rgba(10,16,30,0.70)");
document.body.appendChild(settingsBtn);

// settings panel

const settingsPanel = document.createElement("div");
settingsPanel.style.position = "absolute";
settingsPanel.style.left = "18px";
settingsPanel.style.top = "60px";
settingsPanel.style.width = "240px";
settingsPanel.style.padding = "14px";
settingsPanel.style.borderRadius = "12px";
settingsPanel.style.background = "rgba(10,16,30,0.80)";
settingsPanel.style.border = "1px solid rgba(120,180,255,0.25)";
settingsPanel.style.color = "#dcecff";
settingsPanel.style.fontFamily = "sans-serif";
settingsPanel.style.fontSize = "13px";
settingsPanel.style.backdropFilter = "blur(8px)";
settingsPanel.style.display = "none";

// title
const settingsTitle = document.createElement("div");
settingsTitle.textContent = "⚙ Settings";
settingsTitle.style.fontWeight = "700";
settingsTitle.style.marginBottom = "10px";

// volume row
const volumeRow = document.createElement("div");
volumeRow.style.display = "flex";
volumeRow.style.alignItems = "center";
volumeRow.style.gap = "10px";
volumeRow.style.marginBottom = "10px";

const volumeIcon = document.createElement("span");
volumeIcon.textContent = "🔊";

const volumeSlider = document.createElement("input");
volumeSlider.type = "range";
volumeSlider.min = "0";
volumeSlider.max = "1";
volumeSlider.step = "0.01";
volumeSlider.value = MASTER_VOLUME;
volumeSlider.style.flex = "1";

// mute button
const muteBtn = document.createElement("button");
muteBtn.textContent = "Mute";
muteBtn.style.marginTop = "6px";
muteBtn.style.width = "100%";
muteBtn.style.padding = "8px 10px";
muteBtn.style.borderRadius = "8px";
muteBtn.style.border = "1px solid rgba(120,180,255,0.25)";
muteBtn.style.background = "rgba(40,80,160,0.25)";
muteBtn.style.color = "#dcecff";
muteBtn.style.cursor = "pointer";
muteBtn.onmouseenter = () => (muteBtn.style.background = "rgba(40,80,160,0.40)");
muteBtn.onmouseleave = () => (muteBtn.style.background = "rgba(40,80,160,0.25)");

volumeRow.append(volumeIcon, volumeSlider);
settingsPanel.append(settingsTitle, volumeRow, muteBtn);
document.body.appendChild(settingsPanel);

// settings logic

settingsBtn.onclick = () => {
  playClickSound();
  settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
};

volumeSlider.oninput = e => {
  MASTER_VOLUME = parseFloat(e.target.value);
  updateVolume();
};

muteBtn.onclick = () => {
  MUTED = !MUTED;
  muteBtn.textContent = MUTED ? "Unmute" : "Mute";
  volumeIcon.textContent = MUTED ? "🔇" : "🔊";
  updateVolume();
};


document.body.appendChild(backBtn);
// info pop up for solar system and all planets
const INFO_CONTENT = {
  SolarSystem: {
    title: "☀️ Welcome to the Solar System",
    text:
      "The Solar System is our home neighbourhood in space. At the centre is the Sun, a star that contains more than 99% of the system’s mass and provides the light and heat that powers everything here.\n\n" +
      "The eight planets move around the Sun in paths called orbits. The inner planets (Mercury, Venus, Earth, Mars) are rocky worlds with solid surfaces. Beyond them lie the gas giants (Jupiter and Saturn) and the ice giants (Uranus and Neptune), which are much larger and made mostly of gases and icy materials.\n\n" +
      "Orbits and rotations matter because they control things like how long a planet’s year is, how long a day is, and how extreme its seasons can become. In this scene, the distances are compressed so you can actually see everything at once, but the relationships still feel ‘solar-system-like’.\n\n" +
      "Try clicking a planet to open its controls on the right. You can adjust how fast it orbits, how far it sits from the Sun, and (in Planet View) whether it auto-spins — then compare how different each world feels."
  },

  HabitableZone: {
    title: "🌱 Habitable Zone",
    text:
      "The habitable zone (often called the ‘Goldilocks zone’) is the region around a star where temperatures can be just right for liquid water to exist on a planet’s surface.\n\n" +
      "If a planet is too close to the Sun, water tends to boil away. Too far, and water freezes solid. Earth orbits within this zone, which is a big reason it can support life.\n\n" +
      "In real astronomy this zone depends on the star’s brightness and the planet’s atmosphere — here it’s a visual guide you can click for information."
  },

  Earth: {
    title: "🌍 Welcome to Earth",
    text:
      "Earth is the third planet from the Sun and the only known world confirmed to support life. Formed over 4.5 billion years ago, Earth developed a stable atmosphere, liquid water, and a protective magnetic field that shields life from harmful radiation.\n\n" +
      "Its surface is divided into continents and oceans, shaped by tectonic movement and climate systems that regulate temperature and weather. The presence of water in all three states (ice, liquid, vapour) helps drive Earth’s water cycle, which is a key reason the planet stays liveable.\n\n" +
      "In Planet View, you can click the red markers on Earth to learn about each continent. The markers turn green once you’ve clicked them."
  },

  "North America": {
    title: "🌎 North America",
    text:
      "North America stretches from the icy Arctic regions to warm tropical areas near the equator. It features dramatic landscapes such as the Rocky Mountains, vast forests, and deep canyons.\n\n" +
      "Indigenous peoples lived here for thousands of years before modern nations formed. Today, North America is known for its economic power, cultural influence, and technological development."
  },
  "South America": {
    title: "🌎 South America",
    text:
      "South America is dominated by powerful natural features, including the Amazon Rainforest and the Andes Mountains, the longest mountain range in the world.\n\n" +
      "The continent is rich in biodiversity, with millions of plant and animal species. Ancient civilisations such as the Incas once ruled vast areas of this land. Today, South America blends ancient history, colonial influence, and vibrant modern cultures."
  },
  Europe: {
    title: "🌍 Europe",
    text:
      "Europe may be small compared to other continents, but it has had a huge impact on world history. It was the centre of the Roman Empire, the Renaissance, and the Industrial Revolution.\n\n" +
      "Europe is known for its mix of old and new, where medieval castles sit beside modern cities. The continent has a mild climate in many areas, making it ideal for farming, trade, and early settlement."
  },
  Africa: {
    title: "🌍 Africa",
    text:
      "Africa is the world’s second-largest continent and is often called the cradle of humanity, as the earliest human ancestors evolved here.\n\n" +
      "It has an incredible range of environments, from the scorching Sahara Desert in the north to dense rainforests near the equator and wide savannas filled with wildlife. Africa is also home to the Nile and Mount Kilimanjaro, and it contains thousands of cultures and languages."
  },
  Asia: {
    title: "🌏 Asia",
    text:
      "Asia is the largest and most populated continent, containing more than half of the world’s population. It includes some of the planet’s most extreme geography, from Mount Everest to vast deserts.\n\n" +
      "Asia has been the birthplace of major civilisations, religions, and technologies that shaped human history. From ancient temples to modern megacities, Asia blends tradition and innovation on an enormous scale."
  },
  Australia: {
    title: "🌏 Australia",
    text:
      "Australia is both a country and a continent, making it unique. Much of its interior is dry and sparsely populated (the Outback), while most people live along the coast.\n\n" +
      "It’s famous for distinctive wildlife like kangaroos and koalas, and for the Great Barrier Reef, the largest coral reef system on Earth."
  },
  Antarctica: {
    title: "❄️ Antarctica",
    text:
      "Antarctica is the coldest, driest, and windiest continent. It has no permanent human population and is covered by thick ice sheets that hold most of the world’s fresh water.\n\n" +
      "Scientists from many countries work here to study climate, space, and extreme life conditions. Wildlife includes penguins, seals, and seabirds adapted to the cold."
  },

  Mercury: { title: "Mercury", text: PLANETS.Mercury.description },
  Venus: { title: "Venus", text: PLANETS.Venus.description },
  Mars: { title: "Mars", text: PLANETS.Mars.description },
  Jupiter: { title: "Jupiter", text: PLANETS.Jupiter.description },
  Saturn: { title: "Saturn", text: PLANETS.Saturn.description },
  Uranus: { title: "Uranus", text: PLANETS.Uranus.description },
  Neptune: { title: "Neptune", text: PLANETS.Neptune.description },

  // added 3 buttons to each planet 

  "Mercury:Button1": {
    title: "Caloris Basin",
    text:
      "One of the largest impact craters in the solar system, Caloris Basin is about 1,550 km wide and was formed by a massive asteroid strike early in Mercury’s history. The impact reshaped much of the planet’s surface, creating ridges, fractures, and vast lava plains that later flooded the basin."
  },
  "Mercury:Button2": {
    title: "Discovery Rupes",
    text:
      "This enormous cliff, or rupes, stretches for hundreds of kilometres and rises up to 3 km high in places. It formed as Mercury slowly cooled and shrank, causing the crust to buckle and crack, making it one of the best examples of the planet’s geological contraction."
  },
  "Mercury:Button3": {
    title: "Kuiper Crater",
    text:
      "A striking, well-preserved impact crater with bright ray patterns extending across the surface, Kuiper Crater is named after astronomer Gerard Kuiper. Its sharp edges and visible ejecta make it one of the most visually distinctive landmarks on Mercury."
  },

  "Venus:Button1": {
    title: "Spider-web Structures",
    text:
      "Spider-web structures, also known as arachnoids, are unusual circular features on Venus made up of concentric rings and radiating fractures that resemble a spider’s web. They are thought to form when hot magma rises from deep inside the planet, lifting the crust and then causing it to crack as the surface cools and settles. These structures are unique to Venus and provide important clues about how volcanic and tectonic forces shape the planet in the absence of plate tectonics." 
  },
  "Venus:Button2": {
    title: "Coronae (Ring of Fire)",
    text:
      "Coronae, often nicknamed Venus’s “Ring of Fire,” are large circular or oval geological features formed by hot material rising from deep within the planet’s mantle and pushing up the crust before collapsing inward. These structures can span hundreds of kilometres and are surrounded by ridges, fractures, and lava flows, showing that they were shaped by intense volcanic and tectonic activity. Unlike Earth, Venus has no moving tectonic plates, so coronae provide key evidence for how heat escapes from the planet’s interior and play an important role in understanding Venusian geology." 
  },
  "Venus:Button3": {
    title: "Maxwell Montes",
    text:
      "Maxwell Montes is the highest mountain range on Venus, rising about 11 kilometres above the surrounding plains and making it the tallest point on the planet. It lies in the Ishtar Terra region near the north of Venus and was mapped by radar because the planet’s thick clouds block normal imaging. The mountains are thought to have formed from powerful crustal compression, rather than plate tectonics like on Earth, and exist under extreme conditions of heat and pressure." 
  },

  "Mars:Button1": {
    title: "Olympus Mons",
    text:
      "The largest volcano in the solar system, Olympus Mons rises about 22 kilometres high and spans roughly 600 kilometres across, making it nearly three times taller than Mount Everest. It is a shield volcano formed by slow, repeated lava flows over millions of years. Because Mars has no active plate tectonics, magma kept erupting in the same location, allowing the volcano to grow to an enormous size."
  },
  "Mars:Button2": {
    title: "Valles Marineris",
    text:
      "This colossal canyon system stretches over 4,000 kilometres across the Martian surface and reaches depths of up to 7 kilometres. It is far larger than Earth’s Grand Canyon and is believed to have formed from massive crustal stretching and collapse rather than river erosion. The exposed rock layers provide scientists with valuable clues about Mars’ geological history and possible past water activity."
  },
  "Mars:Button3": {
    title: "Gale Crater",
    text:
      "A 154-kilometre-wide impact crater that contains a central mountain called Mount Sharp (Aeolis Mons), built from layered sediments over billions of years. Gale Crater was selected as the landing site for NASA’s Curiosity rover because the rock layers show evidence of ancient lakes and flowing water. This makes it one of the most important locations for studying whether Mars once had conditions suitable for life."
  },
  "Saturn:Button1": {
    title: "The Hexagon Storm",
    text:
      "A gigantic six-sided jet stream surrounding Saturn’s north pole, roughly 30,000 km wide, large enough to fit several Earths inside. Discovered by the Voyager missions and later studied in detail by Cassini, the hexagon is formed by extremely fast winds flowing at different speeds in Saturn’s atmosphere. Unlike storms on Earth, it has remained stable for decades, suggesting it is driven by deep atmospheric dynamics rather than surface weather, making it one of the most scientifically important structures on the planet."
  },
  "Saturn:Button2": {
    title: "The Great White Spot",
    text:
      "A rare, planet-wide storm that erupts approximately once every Saturnian year (about 29–30 Earth years). These storms originate deep in the atmosphere where heat builds up over long periods before violently breaking through the upper cloud layers. When active, they can grow so large that they wrap around the entire planet, producing massive lightning, turbulence, and cloud systems that allow scientists to study Saturn’s internal heat flow and atmospheric circulation."
  },
  "Saturn:Button3": {
    title: "Polar Vortices",
    text:
      "Saturn’s poles are dominated by enormous rotating storm systems similar to hurricanes but vastly larger and more powerful. The south polar vortex has a clearly defined eye surrounded by fast-moving clouds, while the north polar vortex sits at the centre of the hexagon. These vortices are powered by Saturn’s rapid rotation and internal heat rather than sunlight alone, revealing how energy moves within the planet’s thick, layered atmosphere."
  },
  "Jupiter:Button1": {
    title: "The Great Red Spot",
    text:
      "A massive, long-lasting storm system that has been raging for at least 300 years, making it the largest and oldest known storm in the solar system. It is a high-pressure anticyclone about 1.3 times the width of Earth, with wind speeds exceeding 400 km/h. The storm is powered by Jupiter’s intense internal heat and fast rotation rather than sunlight alone, and although it has slowly been shrinking, it remains one of the most iconic and scientifically important features in planetary science."
  },
  "Jupiter:Button2": {
    title: "Jupiter’s Cloud Belts and Zones",
    text:
      "Jupiter’s surface is covered in alternating dark belts and light zones that wrap around the planet in parallel bands. These bands are formed by powerful jet streams moving in opposite directions, with wind speeds reaching hundreds of kilometres per hour. Rising warm gases create bright zones, while sinking cooler gases form darker belts, producing constant turbulence, storms, and lightning. This layered atmosphere provides crucial insight into how gas giants transport heat and energy."
  },
  "Jupiter:Button3": {
    title: "The Polar Cyclones",
    text:
      "At both of Jupiter’s poles are clusters of massive cyclones arranged in geometric patterns, discovered in detail by NASA’s Juno spacecraft. The north pole contains eight cyclones surrounding a central one, while the south has five surrounding one, each storm being as large as Australia. These polar systems are remarkably stable and are driven by Jupiter’s rapid rotation and deep atmospheric dynamics, revealing how weather behaves on planets with no solid surface."
  },
  "Uranus:Button1": {
    title: "The Extreme Axial Tilt",
    text:
      "Uranus is tilted on its side at about 98 degrees, meaning its poles take turns pointing almost directly at the Sun. This causes the most extreme seasons in the solar system, with each pole experiencing 42 years of continuous daylight followed by 42 years of darkness. This unusual orientation strongly affects wind patterns, storms, and temperature distribution across the planet."
  },
  "Uranus:Button2": {
    title: "Atmospheric Bands and Storms",
    text:
      "Although Uranus appears smooth and pale blue from a distance, it has faint cloud bands and occasional powerful storms. Methane in the atmosphere absorbs red light, giving the planet its blue colour. Observations from telescopes and spacecraft have revealed massive storm systems, some large enough to swallow Earth, driven by internal heat rather than sunlight alone."
  },
  "Uranus:Button3": {
    title: "Polar Cloud Cap",
    text:
      "Uranus has a bright, persistent cloud cap over its north pole, made of methane ice clouds. This feature becomes more visible during the planet’s long summer and provides scientists with valuable information about how sunlight and internal heat interact in Uranus’ upper atmosphere."
  },
   "Neptune:Button1": {
    title: "The Great Dark Spot",
    text:
      "A massive storm system similar to Jupiter’s Great Red Spot, first observed by Voyager 2 in 1989. These dark spots are high-speed anticyclonic storms with winds exceeding 2,000 km/h, the fastest recorded in the solar system. Unlike Jupiter’s storm, Neptune’s spots can form, change, and disappear over time, revealing a highly dynamic atmosphere."
  },
  "Neptune:Button2": {
    title: "Supersonic Winds",
    text:
      "Neptune has the fastest winds of any planet, reaching speeds of over 2,000 km/h despite receiving very little sunlight due to its distance from the Sun. This suggests that Neptune is strongly powered by internal heat, which drives extreme weather systems, cloud movement, and violent storms across the planet."
  },
  "Neptune:Button3": {
    title: "South Polar Vortex",
    text:
      "A massive rotating storm system centred near Neptune’s south pole, similar to a giant hurricane. It contains bright methane-ice clouds and plays a major role in circulating heat through the atmosphere, helping scientists understand how energy moves inside ice giants."
  },
};

const infoPanel = document.createElement("div");
infoPanel.style.position = "absolute";
infoPanel.style.top = "50%";
infoPanel.style.left = "50%";
infoPanel.style.transform = "translate(-50%, -50%)";
infoPanel.style.width = "460px";
infoPanel.style.maxWidth = "85vw";
infoPanel.style.padding = "20px";
infoPanel.style.background = "rgba(20,40,80,0.75)";
infoPanel.style.border = "1px solid rgba(120,180,255,0.4)";
infoPanel.style.borderRadius = "12px";
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
infoClose.textContent = "X";
infoClose.style.position = "absolute";
infoClose.style.top = "8px";
infoClose.style.right = "10px";
infoClose.style.cursor = "pointer";
infoClose.style.opacity = "0.9";
infoClose.onclick = () => (infoPanel.style.display = "none");

const infoText = document.createElement("div");
infoText.style.fontSize = "14px";
infoText.style.lineHeight = "1.55";
infoText.style.whiteSpace = "pre-line";

infoPanel.append(infoTitle, infoClose, infoText);
document.body.appendChild(infoPanel);

function showInfo(key) {
  const data = INFO_CONTENT[key];
  if (!data) return;
  playPopupSound();
  infoTitle.textContent = data.title;
  infoText.textContent = String(data.text);
  infoPanel.style.display = "block";
}

// solar system objects
const solarSystem = new THREE.Group();
scene.add(solarSystem);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0xffcc55 })
);
solarSystem.add(sun);

function createOrbitRing(radius) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
  const points = curve.getPoints(180);
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
  const material = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.7 });
  return new THREE.LineLoop(geometry, material);
}

const planetObjects = {};

for (const name of Object.keys(PLANETS)) {
  const p = PLANETS[name];

  // the change of the orbit ring based on the sliders movement 
  const ring = createOrbitRing(p.orbitRadius * ORBIT_SPREAD);
  solarSystem.add(ring);

  const pivot = new THREE.Object3D();
  solarSystem.add(pivot);

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 32, 32), makePlanetMaterial(name));

  // scales the planets position outwards
  mesh.position.set(p.orbitRadius * ORBIT_SPREAD, 0, 0);

  mesh.userData.planetName = name;
  pivot.add(mesh);

  planetObjects[name] = { pivot, mesh, orbitRing: ring };
}

// saturns ring
if (planetObjects.Saturn) {
  const sat = planetObjects.Saturn.mesh;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.4, 64),
    new THREE.MeshBasicMaterial({ color: 0xd8caa0, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = Math.PI / 2;
  sat.add(ring);
}
// habitable zone in solar system
function buildHabitableZoneGeometry() {
  const r = (PLANETS.Earth.orbitRadius * ORBIT_SPREAD);
  return new THREE.RingGeometry(r - 0.35, r + 0.35, 160);
}

const habitableZone = new THREE.Mesh(
  buildHabitableZoneGeometry(),
  new THREE.MeshBasicMaterial({
    color: 0x33ff99,
    transparent: true,
    opacity: 0.20,
    side: THREE.DoubleSide,
    depthWrite: false // this was recommended to help avoid weird depth issues
  })
);

habitableZone.rotation.x = Math.PI / 2;
habitableZone.userData = { type: "HABITABLE_ZONE" };
solarSystem.add(habitableZone);

// planet view 
const DETAIL_PLANET_RADIUS = 1.2;
const detailPlanetMaterial = new THREE.MeshStandardMaterial({ roughness: 1.0, metalness: 0.0 });
const detailPlanet = new THREE.Mesh(new THREE.SphereGeometry(DETAIL_PLANET_RADIUS, 128, 128), detailPlanetMaterial);
detailPlanet.visible = false;
scene.add(detailPlanet);

// axial tilt
detailPlanet.rotation.z = THREE.MathUtils.degToRad(23.5);

//continent markers
const buttons = [];
const RED = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.4 });
const GREEN = new THREE.MeshStandardMaterial({ color: 0x00ff55, transparent: true, opacity: 0.6 });

function addContinentButton(label, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 24), RED.clone());
  mesh.userData = { label, clicked: false };
  mesh.position.copy(new THREE.Vector3(x, y, z).normalize()).multiplyScalar(DETAIL_PLANET_RADIUS + 0.02);
  detailPlanet.add(mesh);
  buttons.push(mesh);
}


// continent positions
addContinentButton("North America", -0.2, 0.6, 0.7);
addContinentButton("South America", 30, -10, 50);
addContinentButton("Europe", 15, 18, -5);
addContinentButton("Africa", 23, 0.1, -10);
addContinentButton("Asia", 20, 100, -150);
addContinentButton("Australia", -130, -80, -100);
addContinentButton("Antarctica", 0, -1, 0);

function setEarthMarkersVisible(visible) {
  for (const b of buttons) b.visible = visible;
}

// 3 buttons per planet except earth
const otherButtons = [];

function addPlanetButton(label, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 24), RED.clone());
  mesh.userData = { label, clicked: false };
  mesh.position.copy(new THREE.Vector3(x, y, z).normalize()).multiplyScalar(DETAIL_PLANET_RADIUS + 0.02);
  detailPlanet.add(mesh);
  otherButtons.push(mesh);
}

function clearOtherButtons() {
  for (let i = otherButtons.length - 1; i >= 0; i--) {
    detailPlanet.remove(otherButtons[i]);
    otherButtons.pop();
  }
}

const PLANET_BUTTONS = {
  Mercury: [
    { key: "Mercury:Button1", pos: [1, 0.25, 0.15] },
    { key: "Mercury:Button2", pos: [-0.7, 0.35, 0.55] },
    { key: "Mercury:Button3", pos: [-80, -0.8, 10] }
  ],
  Venus: [
    { key: "Venus:Button1", pos: [0.9, 0.2, 0.25] },
    { key: "Venus:Button2", pos: [-0.6, 0.55, 0.35] },
    { key: "Venus:Button3", pos: [0.35, -0.9, -0.10] }
  ],
  Mars: [
    { key: "Mars:Button1", pos: [0.85, 0.25, 0.25] },
    { key: "Mars:Button2", pos: [-0.55, 0.55, 0.35] },
    { key: "Mars:Button3", pos: [0.2, -0.9, 0.35] }
  ],
  Jupiter: [
    { key: "Jupiter:Button1", pos: [0.9, 0.2, 0.3] },
    { key: "Jupiter:Button2", pos: [-0.55, 0.6, 0.2] },
    { key: "Jupiter:Button3", pos: [0.15, -0.9, 0.35] }
  ],
  Saturn: [
    { key: "Saturn:Button1", pos: [12, 43, -23] },
    { key: "Saturn:Button2", pos: [3, 2, 1] },
    { key: "Saturn:Button3", pos: [-5, -10, -16] }
  ],
  Uranus: [
    { key: "Uranus:Button1", pos: [3, 12, 7] },
    { key: "Uranus:Button2", pos: [-20, -4, 0.2] },
    { key: "Uranus:Button3", pos: [5, -17, 20] }
  ],
  Neptune: [
    { key: "Neptune:Button1", pos: [3, 13, 17] },
    { key: "Neptune:Button2", pos: [-33, 23, -19] },
    { key: "Neptune:Button3", pos: [-6, -9, 3] }
  ]
};

function spawnPlanetButtons(planetName) {
  const data = PLANET_BUTTONS[planetName];
  if (!data) return;
  for (const b of data) {
    addPlanetButton(b.key, b.pos[0], b.pos[1], b.pos[2]);
  }
}

// camera controls
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const solarCam = { distance: 38, yaw: 0.8, pitch: -0.9 };
const planetCam = { distance: 5, yaw: 0, pitch: 0 };

let draggingPlanet = false;
let draggingCamera = false;
let lastX = 0;
let lastY = 0;

let planetRotX = 0;
let planetRotY = 0;

// planet view auto spin is off
let planetAutoSpinSpeed = 0;
let planetAutoSpinAngle = 0;

renderer.domElement.addEventListener("wheel", e => {
  e.preventDefault();
  const target = MODE === "SOLAR" ? solarCam : planetCam;
  target.distance = THREE.MathUtils.clamp(
    target.distance + e.deltaY * 0.01,
    MODE === "SOLAR" ? 12 : 2,
    MODE === "SOLAR" ? 95 : 20
  );
});

// drag handeling
renderer.domElement.addEventListener("mousedown", e => {
  if (e.button !== 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (MODE === "PLANET") {
    draggingPlanet = raycaster.intersectObject(detailPlanet).length > 0;
    draggingCamera = !draggingPlanet;
  } else {
    draggingPlanet = false;
    draggingCamera = true;
  }

  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener("mouseup", () => {
  draggingPlanet = false;
  draggingCamera = false;
});

window.addEventListener("mousemove", e => {
  if (!draggingCamera && !draggingPlanet) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  if (MODE === "PLANET") {
    if (draggingPlanet) {
      planetRotY += dx * 0.005;
      planetRotX += dy * 0.005;
      planetRotX = THREE.MathUtils.clamp(planetRotX, -Math.PI / 2, Math.PI / 2);
    } else {
      planetCam.yaw += dx * 0.005;
      planetCam.pitch += dy * 0.005;
      planetCam.pitch = THREE.MathUtils.clamp(planetCam.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
    }
  } else {
    solarCam.yaw += dx * 0.005;
    solarCam.pitch += dy * 0.005;
    solarCam.pitch = THREE.MathUtils.clamp(solarCam.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  }
});
// clicking
renderer.domElement.addEventListener("click", e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (MODE === "SOLAR") {
    const solarMeshes = Object.values(planetObjects).map(o => o.mesh);

    // This checks if a planet is clicked
    const planetHits = raycaster.intersectObjects(solarMeshes);
    if (planetHits.length) {
      const name = planetHits[0].object.userData.planetName;
      playClickSound();
      selectPlanet(name);
      return;
    }

    // detects if the habitable zone has been clicked
    const hzHits = raycaster.intersectObject(habitableZone, false);
    if (hzHits.length) {
      playClickSound();
      showInfo("HabitableZone");
      return;
    }

    return;
  }

  // handles all clicks on buttons for planets
  if (MODE === "PLANET") {
    const targetButtons = ACTIVE_PLANET === "Earth" ? buttons : otherButtons;
    const hits = raycaster.intersectObjects(targetButtons, true);
    if (hits.length) {
      const btn = hits[0].object;
      playClickSound();
      if (!btn.userData.clicked) {
        btn.material = GREEN.clone();
        btn.userData.clicked = true;
      }
      showInfo(btn.userData.label);
    }
  }
});

// each planets right panel will have different info about it
function sliderExplainOrbitSpeed(name) {
  if (name === "Mercury")
    return "Mercury races around the Sun because it’s so close. Orbit speed here is a visual control that helps you feel how ‘tight’ and fast its year is.";
  if (name === "Venus")
    return "Venus moves more slowly than Mercury because it’s farther out. This slider exaggerates or calms that motion so you can compare planet ‘years’ visually.";
  if (name === "Earth")
    return "Earth’s orbit speed sets the pace of its year. Changing it makes it easier to compare how the inner planets ‘lap’ the outer ones.";
  if (name === "Mars")
    return "Mars takes longer than Earth to orbit. This control helps show that outer planets naturally move slower in their paths.";
  if (name === "Jupiter")
    return "Jupiter’s year is much longer than Earth’s. Slower orbit speed helps you feel how different time is in the outer Solar System.";
  if (name === "Saturn")
    return "Saturn’s distance makes its orbit slower still. This slider is useful for balancing visibility vs realism in the scene.";
  if (name === "Uranus")
    return "Uranus has a very long year. A low orbit speed makes it feel properly ‘distant’ compared to the inner planets.";
  if (name === "Neptune")
    return "Neptune is the outermost planet here, so its orbit is the slowest. This slider lets you keep it moving without waiting ages.";
  return `Orbit speed controls how quickly ${name} goes around the Sun in Solar view.`;
}

function sliderExplainOrbitRadius(name) {
  if (name === "Mercury")
    return "Orbit radius is how close Mercury sits to the Sun. Closer means faster years and harsher sunlight (in reality). Here it also affects how tightly it circles.";
  if (name === "Venus")
    return "Venus being farther out than Mercury changes how much sunlight it gets and how long its year is. This adjusts its spacing so the system looks readable.";
  if (name === "Earth")
    return "Earth’s distance is a big reason liquid water can exist. Moving it in/out makes the Solar System spacing clearer (visual, not physically exact).";
  if (name === "Mars")
    return "Mars is noticeably farther than Earth, which contributes to its colder climate. This slider mainly controls spacing between orbits on screen.";
  if (name === "Jupiter")
    return "Jupiter is where things start feeling ‘outer Solar System’. Increasing its distance makes the inner planets feel cramped by comparison.";
  if (name === "Saturn")
    return "Saturn is far enough out that the system feels huge. This slider helps keep Saturn visible but still clearly separated from Jupiter.";
  if (name === "Uranus")
    return "Uranus sits in the cold outer reaches. Orbit radius here is about keeping that distant feel without pushing it off-screen.";
  if (name === "Neptune")
    return "Neptune’s distance is part of why it’s dark and cold. This control spaces it out but keeps it within the scene.";
  return `Orbit radius controls how far ${name} is from the Sun (visual spacing).`;
}

function sliderExplainRotation(name) {
  if (MODE === "SOLAR") {
    return `In Solar view, this controls how quickly ${name} spins in place. Faster spin = the planet’s surface rotates quicker (visual).`;
  }
  return `In Planet View, the planet starts still. This slider adds auto-spin for ${name}. Keep it at 0 if you only want manual rotation with the mouse.`;
}

// binding the data to the right panels (AI was used here in order to figure out an issue with binding)
function formatNum(n) {
  return Number(n).toFixed(4);
}

function updateRightPanel() {
  const p = PLANETS[ACTIVE_PLANET];

  rpTitle.textContent = MODE === "SOLAR" ? `🪐 ${ACTIVE_PLANET} (Solar System)` : `🌍 ${ACTIVE_PLANET} (Planet View)`;
  rpDesc.textContent = p.description || "";

  orbitSpeedSlider.value = String(p.orbitSpeed);
  orbitRadiusSlider.value = String(p.orbitRadius);

  if (MODE === "SOLAR") {
    rotationSpeedLabel.textContent = "Rotation speed (spins in place)";
    rotationSpeedSlider.value = String(p.rotationSpeed);
    rotationSpeedValue.textContent = formatNum(p.rotationSpeed);
  } else {
    rotationSpeedLabel.textContent = "Auto-spin (Planet View)";
    rotationSpeedSlider.value = String(planetAutoSpinSpeed);
    rotationSpeedValue.textContent = formatNum(planetAutoSpinSpeed);
  }

  orbitSpeedValue.textContent = formatNum(p.orbitSpeed);
  orbitRadiusValue.textContent = formatNum(p.orbitRadius);

  orbitSpeedHint.textContent = sliderExplainOrbitSpeed(ACTIVE_PLANET);
  orbitRadiusHint.textContent = sliderExplainOrbitRadius(ACTIVE_PLANET);
  rotationSpeedHint.textContent = sliderExplainRotation(ACTIVE_PLANET);

  planetViewBtn.textContent = MODE === "SOLAR" ? "🌍 Planet View" : "📘 Info";
}

orbitSpeedSlider.oninput = e => {
  const v = parseFloat(e.target.value);
  PLANETS[ACTIVE_PLANET].orbitSpeed = v;
  orbitSpeedValue.textContent = formatNum(v);
};

orbitRadiusSlider.oninput = e => {
  const v = parseFloat(e.target.value);
  PLANETS[ACTIVE_PLANET].orbitRadius = v;
  orbitRadiusValue.textContent = formatNum(v);

  const obj = planetObjects[ACTIVE_PLANET];
  if (obj) {
    // scaled position
    obj.mesh.position.x = v * ORBIT_SPREAD;

    // scaled ring
    solarSystem.remove(obj.orbitRing);
    const newRing = createOrbitRing(v * ORBIT_SPREAD);
    solarSystem.add(newRing);
    obj.orbitRing = newRing;
  }
};

rotationSpeedSlider.oninput = e => {
  const v = parseFloat(e.target.value);
  if (MODE === "SOLAR") {
    PLANETS[ACTIVE_PLANET].rotationSpeed = v;
    rotationSpeedValue.textContent = formatNum(v);
  } else {
    planetAutoSpinSpeed = v;
    rotationSpeedValue.textContent = formatNum(v);
  }
};

// planetView button
planetViewBtn.onclick = () => {
  playClickSound();
  if (MODE === "SOLAR") {
    enterPlanetView(ACTIVE_PLANET);
  } else {
    showInfo(ACTIVE_PLANET);
  }
};

// transitions 
function selectPlanet(name) {
  ACTIVE_PLANET = name;
  updateRightPanel();

  topNote.innerHTML =
    name === "Earth"
      ? "🌍 <b>Earth selected</b> — Use the sliders to experiment, then press <b>Planet View</b> to explore continents."
      : `🪐 <b>${name} selected</b> — Use the sliders to experiment, then press <b>Planet View</b> to explore the planet.`;
}

function applyPlanetTextureToDetail(name) {
  const mat = planetObjects[name]?.mesh?.material;
  if (mat && mat.map) {
    detailPlanetMaterial.map = mat.map;
    detailPlanetMaterial.color.set(0xffffff);
  } else {
    detailPlanetMaterial.map = null;
    detailPlanetMaterial.color.set(PLANETS[name]?.fallbackColor ?? 0xffffff);
  }
  detailPlanetMaterial.needsUpdate = true;
}

function enterPlanetView(name) {
  MODE = "PLANET";
  ACTIVE_PLANET = name;
  solarSystem.visible = false;
  detailPlanet.visible = true;

  setEarthMarkersVisible(name === "Earth");

  // making sure to clear the other planet buttons when entering any planet view
  clearOtherButtons();

  if (name === "Earth") {
    for (const b of buttons) {
      b.userData.clicked = false;
      b.material = RED.clone();
    }
  } else {
    spawnPlanetButtons(name);
  }

  applyPlanetTextureToDetail(name);

  backBtn.style.display = "block";
  topNote.style.display = "none";

  // start still in planet view
  planetAutoSpinSpeed = 0;
  planetAutoSpinAngle = 0;

  // make the planet face the right direction on entry
  planetRotX = 0;
  planetRotY = 0;

  updateRightPanel();
  showInfo(name === "Earth" ? "Earth" : name);
}

function enterSolarSystemView() {
  MODE = "SOLAR";
  detailPlanet.visible = false;
  solarSystem.visible = true;
  infoPanel.style.display = "none";
  backBtn.style.display = "none";
  topNote.style.display = "block";
  topNote.innerHTML =
    "☀️ <b>Solar System View</b> — Planets orbit the Sun. Click a planet (try <b>Earth</b>) to open its controls.";
  updateRightPanel();
}

backBtn.onclick = () => {
  playClickSound();
  enterSolarSystemView();
};

// the UI
selectPlanet("Earth");
updateRightPanel();
enterSolarSystemView();
showInfo("SolarSystem");

// animation always looping
function setCameraFromOrbit(targetCamState) {
  camera.position.set(
    Math.sin(targetCamState.yaw) * Math.cos(targetCamState.pitch) * targetCamState.distance,
    Math.sin(targetCamState.pitch) * targetCamState.distance,
    Math.cos(targetCamState.yaw) * Math.cos(targetCamState.pitch) * targetCamState.distance
  );
  camera.lookAt(0, 0, 0);
}

function animate() {
  requestAnimationFrame(animate);

  space.rotation.y += SPACE_DRIFT;

  if (MODE === "SOLAR") {
    for (const name of Object.keys(planetObjects)) {
      const p = PLANETS[name];
      const obj = planetObjects[name];
      obj.pivot.rotation.y += p.orbitSpeed * SOLAR_TIME_SCALE;
      obj.mesh.rotation.y += p.rotationSpeed * SOLAR_TIME_SCALE;
    }
    setCameraFromOrbit(solarCam);
  } else {
    // making sure the user can rotate the planet with mouse or make the planet auto rotate with a slider
    planetAutoSpinAngle += planetAutoSpinSpeed;
    detailPlanet.rotation.x = planetRotX;
    detailPlanet.rotation.y = planetRotY + planetAutoSpinAngle;
    setCameraFromOrbit(planetCam);
  }

  renderer.render(scene, camera);
}
animate();

// resize handeling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
