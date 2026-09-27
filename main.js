// ========================================================
// WATER IN HOME - วิกฤตน้ำท่วมบ้าน (2D Survival / Exploration)
// ========================================================

// --------------------------------------------------------
// 1. SETTINGS & LOCAL STORAGE
// --------------------------------------------------------
const STORAGE_KEY = 'water_in_home_config_v2';
const DEFAULT_SETTINGS = {
  musicVolume: 70,
  sfxVolume: 80,
  showTimer: true,
  showWaterLevel: true,
  graphicsQuality: 'high', // 'low', 'medium', 'high'
};

let gameSettings = { ...DEFAULT_SETTINGS };
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) gameSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
} catch (e) {}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameSettings));
  } catch (e) {}
}

// --------------------------------------------------------
// 2. AUDIO SYNTHESIZER (Pure Web Audio API - Zero External Files)
// --------------------------------------------------------
let audioCtx = null;
let bgmInterval = null;
let bgmStep = 0;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function getVol(type = 'sfx') {
  if (!audioCtx) return 0;
  if (type === 'music') return (gameSettings.musicVolume / 100);
  return (gameSettings.sfxVolume / 100);
}

function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
  const vol = getVol('sfx') * gainVal;
  if (vol <= 0 || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

const AudioSFX = {
  click() {
    playTone(600, 'sine', 0.05, 0.1);
  },
  footstep() {
    playTone(130 + Math.random() * 30, 'triangle', 0.06, 0.08);
  },
  splash() {
    const vol = getVol('sfx') * 0.16;
    if (vol <= 0 || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.18);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.19);
    } catch (e) {}
  },
  itemCollected() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 'triangle', 0.22, 0.18);
      }, idx * 60);
    });
  },
  stairs() {
    playTone(220, 'sawtooth', 0.08, 0.1);
    setTimeout(() => playTone(330, 'sawtooth', 0.1, 0.12), 100);
  },
  warningAlarm() {
    playTone(880, 'square', 0.09, 0.12);
  },
  dash() {
    const vol = getVol('sfx') * 0.22;
    if (vol <= 0 || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, audioCtx.currentTime + 0.14);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  },
  questComplete() {
    const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 'triangle', 0.28, 0.22), i * 75);
    });
  },
  zap() {
    playTone(180, 'sawtooth', 0.12, 0.25);
    setTimeout(() => playTone(90, 'square', 0.15, 0.25), 50);
  },
  stageClear() {
    const fanfare = [440, 554, 659, 880, 1108];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.3, 0.22), i * 90);
    });
  },
  victory() {
    const fanfare = [523, 659, 784, 1046, 1174, 1318];
    fanfare.forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.35, 0.2), i * 100);
    });
  },
  gameOver() {
    const chord = [392, 349, 311, 261];
    chord.forEach((f, i) => {
      setTimeout(() => playTone(f, 'sawtooth', 0.45, 0.15), i * 150);
    });
  }
};

// Procedural Dynamic Background Music that builds tension as water rises
function startBGM() {
  if (bgmInterval) clearInterval(bgmInterval);
  bgmStep = 0;

  bgmInterval = setInterval(() => {
    const vol = getVol('music') * 0.1;
    if (vol <= 0 || !audioCtx || Game.state !== 'PLAYING') return;

    const waterPct = WaterSystem.level;
    // Base melody notes
    const bass = [110, 110, 130.81, 146.83, 110, 98, 123.47, 164.81];
    const lead = [440, 0, 523.25, 587.33, 0, 440, 659.25, 0];
    const tenseLead = [659.25, 698.46, 659.25, 783.99, 880, 783.99, 698.46, 659.25];

    const currentLead = waterPct > 60 ? tenseLead : lead;

    // Bass note
    const bFreq = bass[bgmStep % bass.length];
    if (bFreq > 0) {
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = waterPct > 50 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(bFreq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol * 0.9, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.19);
      } catch (e) {}
    }

    // Lead melody note
    const lFreq = currentLead[bgmStep % currentLead.length];
    if (lFreq > 0) {
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(lFreq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol * 0.8, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      } catch (e) {}
    }

    // High water alarm tick
    if (waterPct >= 75 && bgmStep % 4 === 0) {
      AudioSFX.warningAlarm();
    }

    bgmStep++;
  }, 230);
}

function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

// --------------------------------------------------------
// 3. 10 IMPORTANT ITEMS SPECIFICATION
// --------------------------------------------------------
// --------------------------------------------------------
// 3. STAGES CONFIGURATION (5 Progressive Difficulty Stages)
// --------------------------------------------------------
const STAGES_CONFIG = [
  {
    stage: 1,
    name: 'น้ำท่วมเริ่มต้น (Flash Flood Alert)',
    difficulty: 'EASY (ง่าย)',
    diffColor: '#10b981',
    totalTime: 180,
    risePerSec: 100 / 180, // Normal flood speed
    initialWater: 0,
    requiredItems: 6,
    hazardText: '🟢 ไม่มีอันตรายพิเศษ',
    hasDebris: false,
    hasSparks: false,
    hasCurrent: false,
    itemsPool: ['phone', 'keys', 'medicine', 'flashlight', 'bread', 'water', 'documents', 'money'],
  },
  {
    stage: 2,
    name: 'พายุฝนกระหน่ำ (Heavy Storm)',
    difficulty: 'MEDIUM (ปานกลาง)',
    diffColor: '#3b82f6',
    totalTime: 150,
    risePerSec: 100 / 140, // 1.3x speed
    initialWater: 12,
    requiredItems: 8,
    hazardText: '📦 ขอนไม้และลังไม้ลอยน้ำขวางทาง',
    hasDebris: true,
    hasSparks: false,
    hasCurrent: false,
    itemsPool: ['phone', 'keys', 'medicine', 'flashlight', 'bread', 'water', 'battery', 'documents', 'money', 'firstaid'],
  },
  {
    stage: 3,
    name: 'ไฟฟ้าลัดวงจร (Electrical Storm)',
    difficulty: 'HARD (ยาก)',
    diffColor: '#f59e0b',
    totalTime: 120,
    risePerSec: 100 / 105, // 1.7x speed
    initialWater: 24,
    requiredItems: 10,
    hazardText: '⚡ สายไฟรั่วในน้ำ ช็อตสตั๊น & ลังลอยน้ำ',
    hasDebris: true,
    hasSparks: true,
    hasCurrent: false,
    itemsPool: ['phone', 'keys', 'medicine', 'flashlight', 'camera', 'bread', 'water', 'battery', 'documents', 'money', 'laptop', 'firstaid'],
  },
  {
    stage: 4,
    name: 'คลื่นพายุซัด (Raging Torrent)',
    difficulty: 'VERY HARD (ยากมาก)',
    diffColor: '#ef4444',
    totalTime: 95,
    risePerSec: 100 / 80, // 2.2x speed
    initialWater: 35,
    requiredItems: 12,
    hazardText: '🌊 กระแสน้ำวนพัดพา + ⚡ ไฟฟ้ารั่ว + 📦 ลังลอย',
    hasDebris: true,
    hasSparks: true,
    hasCurrent: true,
    itemsPool: ['phone', 'keys', 'medicine', 'flashlight', 'camera', 'bread', 'water', 'battery', 'documents', 'money', 'laptop', 'firstaid', 'radio', 'lifevest'],
  },
  {
    stage: 5,
    name: 'วิกฤตสึนามิถล่ม (Mega Tsunami Surge)',
    difficulty: 'NIGHTMARE (สุดหิน / Boss)',
    diffColor: '#a855f7',
    totalTime: 75,
    risePerSec: 100 / 60, // 3.0x speed
    initialWater: 45,
    requiredItems: 15,
    hazardText: '🚨 สึนามิน้ำท่วมเร็วสุดขีด + ทุกอันตรายรวมกัน!',
    hasDebris: true,
    hasSparks: true,
    hasCurrent: true,
    itemsPool: ['phone', 'keys', 'medicine', 'flashlight', 'camera', 'bread', 'water', 'battery', 'documents', 'money', 'laptop', 'firstaid', 'radio', 'lifevest', 'flare'],
  }
];

// --------------------------------------------------------
// 4. IMPORTANT ITEMS SPECIFICATION (15 ITEMS - FIXED FLOOR 2 CLEARANCE)
// --------------------------------------------------------
const ITEMS_DATA = [
  // Floor 1 Items
  { id: 'phone', name: 'โทรศัพท์ (Phone)', icon: '📱', desc: 'สมาร์ทโฟนสำหรับติดต่อขอความช่วยเหลือฉุกเฉิน', floor: 1, x: 260, y: 560, room: 'living' },
  { id: 'keys', name: 'กุญแจ (Keys)', icon: '🔑', desc: 'พวงกุญแจสำหรับปลดล็อกประตูฉุกเฉินและทางหนี', floor: 1, x: 620, y: 720, room: 'hallway' },
  { id: 'medicine', name: 'ยา (Medicine)', icon: '💊', desc: 'กล่องยาสามัญประจำบ้านสำหรับปฐมพยาบาล', floor: 1, x: 960, y: 220, room: 'bathroom' },
  { id: 'flashlight', name: 'ไฟฉาย (Flashlight)', icon: '🔦', desc: 'ไฟฉายส่องสว่างพลังงานสูงกันน้ำ', floor: 1, x: 220, y: 240, room: 'storage' },
  { id: 'camera', name: 'กล้อง (Camera)', icon: '📷', desc: 'กล้องถ่ายภาพเก็บความทรงจำของครอบครัว', floor: 1, x: 140, y: 440, room: 'living' },
  { id: 'bread', name: 'อาหาร (Bread / Food)', icon: '🍞', desc: 'เสบียงอาหารแห้งและขนมปังประทังชีวิต', floor: 1, x: 950, y: 560, room: 'kitchen' },
  { id: 'water', name: 'น้ำดื่ม (Water Bottle)', icon: '💧', desc: 'ขวดน้ำดื่มสะอาดบริสุทธิ์เพื่อการอยู่รอด', floor: 1, x: 1080, y: 440, room: 'kitchen' },
  { id: 'battery', name: 'แบตเตอรี่ (Battery)', icon: '🔋', desc: 'พาวเวอร์แบงก์และถ่านสำรองสำหรับอุปกรณ์', floor: 1, x: 340, y: 160, room: 'storage' },
  
  // Floor 2 Items (Safe, Spacious & No Collider Overlap)
  { id: 'documents', name: 'เอกสารสำคัญ (Documents)', icon: '📄', desc: 'เอกสารประจำตัว ทะเบียนบ้าน และกรมธรรม์', floor: 2, x: 180, y: 460, room: 'bedroom' },
  { id: 'money', name: 'เงินสด (Money)', icon: '💰', desc: 'กระเป๋าสตางค์และเงินสดสำรองยามวิกฤต', floor: 2, x: 340, y: 640, room: 'bedroom' },
  { id: 'laptop', name: 'โน้ตบุ๊ก (Laptop)', icon: '💻', desc: 'คอมพิวเตอร์พกพาเก็บข้อมูลงานสำคัญ', floor: 2, x: 180, y: 640, room: 'bedroom' },
  { id: 'firstaid', name: 'ชุดปฐมพยาบาล (First Aid)', icon: '🩹', desc: 'ชุดทำแผลและผ้าพันแผลฉุกเฉิน', floor: 2, x: 650, y: 600, room: 'hallway2' },
  { id: 'radio', name: 'วิทยุสื่อสาร (Radio)', icon: '📻', desc: 'วิทยุสื่อสารคลื่นสั้นแจ้งเตือนภัย', floor: 2, x: 500, y: 460, room: 'hallway2' },
  { id: 'lifevest', name: 'เสื้อชูชีพ (Life Jacket)', icon: '🦺', desc: 'เสื้อชูชีพนิรภัยป้องกันการจมน้ำ', floor: 2, x: 880, y: 280, room: 'roof' },
  { id: 'flare', name: 'พลุสัญญาณ (Flare Gun)', icon: '🎆', desc: 'พลุส่องสว่างส่งสัญญาณขอความช่วยเหลือ', floor: 2, x: 940, y: 620, room: 'roof' },
];

// --------------------------------------------------------
// 5. HOUSE MAP & ROOM LAYOUT
// --------------------------------------------------------
const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 860;

const ROOMS_CONFIG = [
  // FLOOR 1
  { id: 'porch', name: 'บริเวณหน้าบ้าน (Front Yard)', floor: 1, x: 420, y: 740, w: 360, h: 120, color: '#1a365d' },
  { id: 'hallway', name: 'ทางเดิน & โถงบันได (Hallway)', floor: 1, x: 420, y: 320, w: 360, h: 420, color: '#1e293b' },
  { id: 'living', name: 'ห้องนั่งเล่น (Living Room)', floor: 1, x: 40, y: 320, w: 380, h: 420, color: '#1e2238' },
  { id: 'kitchen', name: 'ห้องครัว (Kitchen)', floor: 1, x: 780, y: 320, w: 380, h: 420, color: '#27272a' },
  { id: 'storage', name: 'ห้องเก็บของ (Storage Room)', floor: 1, x: 40, y: 40, w: 380, h: 280, color: '#1c1917' },
  { id: 'bathroom', name: 'ห้องน้ำ (Bathroom)', floor: 1, x: 780, y: 40, w: 380, h: 280, color: '#164e63' },
  
  // FLOOR 2
  { id: 'hallway2', name: 'โถงชั้น 2 (2nd Floor Landing)', floor: 2, x: 420, y: 280, w: 360, h: 460, color: '#1e293b' },
  { id: 'bedroom', name: 'ห้องนอน (Bedroom)', floor: 2, x: 40, y: 200, w: 380, h: 540, color: '#2e1065' },
  { id: 'roof', name: 'ดาดฟ้า & จุดหนีภัย (Roof Escape)', floor: 2, x: 780, y: 200, w: 380, h: 540, color: '#0c4a6e', isEscape: true },
];

// Solid colliders for walls, furniture, and objects
const COLLIDERS = {
  1: [
    // Outer boundary walls (Floor 1)
    { x: 30, y: 30, w: 10, h: 720 },
    { x: 1160, y: 30, w: 10, h: 720 },
    { x: 30, y: 30, w: 1140, h: 10 },
    { x: 30, y: 740, w: 390, h: 10 },
    { x: 780, y: 740, w: 390, h: 10 },
    { x: 410, y: 850, w: 380, h: 10 },

    // Interior walls with doorways
    { x: 420, y: 40, w: 10, h: 150 },
    { x: 420, y: 260, w: 10, h: 220 },
    { x: 420, y: 560, w: 10, h: 180 },
    { x: 40, y: 320, w: 160, h: 10 },
    { x: 260, y: 320, w: 160, h: 10 },

    { x: 780, y: 40, w: 10, h: 150 },
    { x: 780, y: 260, w: 10, h: 220 },
    { x: 780, y: 560, w: 10, h: 180 },
    { x: 780, y: 320, w: 160, h: 10 },
    { x: 1000, y: 320, w: 160, h: 10 },

    // Furniture Colliders (Floor 1)
    { x: 120, y: 600, w: 140, h: 70, name: 'Sofa' },
    { x: 120, y: 420, w: 60, h: 120, name: 'TV Cabinet' },
    { x: 320, y: 340, w: 80, h: 50, name: 'Bookshelf' },
    { x: 920, y: 540, w: 140, h: 70, name: 'Dining Table' },
    { x: 1060, y: 360, w: 80, h: 100, name: 'Fridge' },
    { x: 800, y: 340, w: 120, h: 60, name: 'Kitchen Counter' },
    { x: 100, y: 60, w: 120, h: 70, name: 'Storage Crates' },
    { x: 300, y: 60, w: 100, h: 70, name: 'Storage Shelf' },
    { x: 1000, y: 60, w: 130, h: 70, name: 'Bathtub' },
    { x: 820, y: 60, w: 60, h: 50, name: 'Toilet' },
  ],
  2: [
    // Outer boundary walls (Floor 2)
    { x: 30, y: 190, w: 10, h: 560 },
    { x: 1160, y: 190, w: 10, h: 560 },
    { x: 30, y: 190, w: 1140, h: 10 },
    { x: 30, y: 740, w: 1140, h: 10 },

    // Interior walls
    { x: 420, y: 200, w: 10, h: 220 },
    { x: 420, y: 520, w: 10, h: 220 },
    { x: 780, y: 200, w: 10, h: 220 },
    { x: 780, y: 520, w: 10, h: 220 },

    // Furniture Colliders (Floor 2) - Adjusted with clean clearance
    { x: 90, y: 220, w: 150, h: 120, name: 'King Bed' },
    { x: 300, y: 220, w: 80, h: 110, name: 'Wardrobe' },
    { x: 260, y: 440, w: 110, h: 60, name: 'Study Desk' },
    { x: 450, y: 620, w: 70, h: 80, name: 'Lounge Seat' },
  ]
};

// Stairs Positions
const STAIRS = {
  1: { x: 570, y: 350, w: 80, h: 70, targetFloor: 2, targetX: 580, targetY: 420, label: 'บันไดขึ้นชั้น 2 (Upstairs)' },
  2: { x: 570, y: 310, w: 80, h: 70, targetFloor: 1, targetX: 580, targetY: 460, label: 'บันไดลงชั้น 1 (Downstairs)' }
};

// Roof Escape Zone on Floor 2
const ESCAPE_ZONE = {
  floor: 2,
  x: 930,
  y: 420,
  radius: 80,
};

// --------------------------------------------------------
// 6. HAZARDS SYSTEM (Debris, Electric Sparks, Water Current)
// --------------------------------------------------------
const HazardSystem = {
  debrisList: [],
  sparksList: [],
  zapCooldown: 0,

  init(stageConfig) {
    this.debrisList = [];
    this.sparksList = [];
    this.zapCooldown = 0;

    // 1. Floating Debris
    if (stageConfig.hasDebris) {
      const debrisCount = stageConfig.stage * 3 + 2;
      for (let i = 0; i < debrisCount; i++) {
        this.debrisList.push({
          x: 120 + Math.random() * (WORLD_WIDTH - 240),
          y: 120 + Math.random() * (WORLD_HEIGHT - 240),
          w: 38 + Math.random() * 20,
          h: 38 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 45,
          vy: (Math.random() - 0.5) * 45,
          floor: Math.random() > 0.4 ? 1 : 2,
          type: Math.random() > 0.5 ? 'crate' : 'log'
        });
      }
    }

    // 2. Electric Sparks on Flooded Floor
    if (stageConfig.hasSparks) {
      const sparkPositions = [
        { floor: 1, x: 280, y: 480, r: 65, label: 'Living Wire' },
        { floor: 1, x: 920, y: 450, r: 75, label: 'Kitchen Wire' },
        { floor: 1, x: 200, y: 180, r: 60, label: 'Storage Breaker' },
        { floor: 2, x: 300, y: 380, r: 65, label: 'Bedroom Lamp' },
      ];
      this.sparksList = sparkPositions.slice(0, stageConfig.stage).map(p => ({
        ...p,
        timer: Math.random() * 3,
        active: false,
      }));
    }
  },

  update(dt, stageConfig) {
    if (Game.state !== 'PLAYING') return;

    if (this.zapCooldown > 0) this.zapCooldown -= dt;

    // 1. Update Floating Debris Movement
    this.debrisList.forEach(d => {
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      if (d.x < 60 || d.x > WORLD_WIDTH - 60) d.vx *= -1;
      if (d.y < 60 || d.y > WORLD_HEIGHT - 60) d.vy *= -1;

      // Collision with player
      if (d.floor === Player.floor) {
        const dist = Math.hypot(Player.x - (d.x + d.w / 2), Player.y - (d.y + d.h / 2));
        if (dist < Player.radius + 18) {
          const angle = Math.atan2(Player.y - (d.y + d.h / 2), Player.x - (d.x + d.w / 2));
          Player.x += Math.cos(angle) * 3;
          Player.y += Math.sin(angle) * 3;
        }
      }
    });

    // 2. Update Electric Sparks
    this.sparksList.forEach(s => {
      s.timer += dt;
      const cycle = s.timer % 2.6;
      s.active = cycle > 1.4;

      if (s.active && s.floor === Player.floor && WaterSystem.level > 18) {
        const dist = Math.hypot(Player.x - s.x, Player.y - s.y);
        if (dist < s.r && this.zapCooldown <= 0) {
          this.zapCooldown = 1.2;
          AudioSFX.zap();
          Player.stamina = Math.max(0, Player.stamina - 30);
          UI.showItemToast('⚡ โดนไฟฟ้าช็อตในน้ำ! (-30 Stamina)');
        }
      }
    });

    // 3. Water Currents in Stage 4 & 5
    if (stageConfig.hasCurrent && WaterSystem.level > 20) {
      const currentPush = (WaterSystem.level / 100) * 28 * dt;
      Player.x += currentPush * 0.7;
      Player.y += currentPush * 0.5;
    }
  },

  render(ctx, floor, time) {
    // 1. Render Debris
    this.debrisList.forEach(d => {
      if (d.floor !== floor) return;
      ctx.save();
      ctx.translate(d.x, d.y);
      if (d.type === 'crate') {
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(0, 0, d.w, d.h);
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, d.w, d.h);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(d.w, d.h);
        ctx.moveTo(d.w, 0); ctx.lineTo(0, d.h);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#713f12';
        ctx.beginPath();
        ctx.roundRect(0, 0, d.w, d.h * 0.6, 6);
        ctx.fill();
      }
      ctx.restore();
    });

    // 2. Render Electric Sparks
    this.sparksList.forEach(s => {
      if (s.floor !== floor || WaterSystem.level < 15) return;
      ctx.save();
      if (s.active) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', s.x, s.y + 10);
      } else {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = '12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ DANGER', s.x, s.y + 4);
      }
      ctx.restore();
    });
  }
};

// --------------------------------------------------------
// 7. WATER SYSTEM
// --------------------------------------------------------
const WaterSystem = {
  level: 0, // 0% to 100%
  speed: 1.0, // base flood speed
  risePerSec: 100 / 180,
  waves: [],
  bubbles: [],

  init(stageConfig) {
    this.level = stageConfig ? stageConfig.initialWater : 0;
    this.risePerSec = stageConfig ? stageConfig.risePerSec : 100 / 180;
    this.waves = [];
    this.bubbles = [];
    for (let i = 0; i < 40; i++) {
      this.bubbles.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        speed: 0.6 + Math.random() * 1.5,
        radius: 2 + Math.random() * 4,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  },

  update(dt) {
    if (Game.state !== 'PLAYING') return;

    this.level = Math.min(100, this.level + this.risePerSec * dt);

    // Update bubbles
    this.bubbles.forEach(b => {
      b.y -= b.speed * 60 * dt;
      b.wobble += dt * 3;
      b.x += Math.sin(b.wobble) * 0.4;
      if (b.y < 0) {
        b.y = WORLD_HEIGHT;
        b.x = Math.random() * WORLD_WIDTH;
      }
    });

    // Check critical death
    if (this.level >= 100) {
      Game.triggerGameOver('น้ำท่วมเต็มบ้านจนมิดหัว ไม่สามารถหายใจเอาชีวิตรอดได้!');
    }
  },

  getPlayerSpeedMultiplier() {
    const floor = Player.floor;
    if (floor === 1) {
      if (this.level < 30) return 1.0;
      if (this.level < 60) return 0.78;
      if (this.level < 80) return 0.58;
      return 0.45;
    } else {
      if (this.level < 60) return 1.0;
      if (this.level < 85) return 0.8;
      return 0.55;
    }
  },

  isSubmerged() {
    if (Player.floor === 1) return this.level >= 60;
    return this.level >= 85;
  },

  render(ctx, time) {
    if (this.level <= 0) return;

    const floor = Player.floor;
    let waterOpacity = 0;
    let waterY = WORLD_HEIGHT;

    if (floor === 1) {
      waterOpacity = Math.min(0.72, 0.15 + (this.level / 100) * 0.55);
      waterY = WORLD_HEIGHT - (WORLD_HEIGHT * (this.level / 100));
    } else {
      if (this.level > 60) {
        const floor2Level = (this.level - 60) / 40;
        waterOpacity = Math.min(0.68, 0.15 + floor2Level * 0.5);
        waterY = WORLD_HEIGHT - (WORLD_HEIGHT * floor2Level);
      } else {
        return;
      }
    }

    ctx.save();
    ctx.fillStyle = `rgba(6, 78, 119, ${waterOpacity})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.fillStyle = `rgba(56, 189, 248, ${waterOpacity * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(0, WORLD_HEIGHT);
    for (let x = 0; x <= WORLD_WIDTH; x += 30) {
      const wave = Math.sin(x * 0.015 + time * 3) * 8 + Math.cos(x * 0.03 - time * 2) * 5;
      ctx.lineTo(x, Math.max(0, waterY + wave));
    }
    ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    ctx.lineTo(0, WORLD_HEIGHT);
    ctx.closePath();
    ctx.fill();

    if (gameSettings.graphicsQuality !== 'low') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      this.bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }
};

// --------------------------------------------------------
// 6. TIMER SYSTEM
// --------------------------------------------------------
const TimerSystem = {
  totalSeconds: 180,
  remaining: 180,

  reset(totalSec = 180) {
    this.totalSeconds = totalSec;
    this.remaining = totalSec;
  },

  update(dt) {
    if (Game.state !== 'PLAYING') return;

    this.remaining = Math.max(0, this.remaining - dt);

    if (this.remaining <= 0) {
      Game.triggerGameOver('หมดเวลาแล้ว (TIME\'S UP)! น้ำท่วมฉับพลันจนหนีไม่ทัน');
    }
  },

  getFormattedTime() {
    const mins = Math.floor(this.remaining / 60);
    const secs = Math.floor(this.remaining % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  getSurvivedTime() {
    const elapsed = this.totalSeconds - this.remaining;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
};

// --------------------------------------------------------
// 7. INVENTORY SYSTEM
// --------------------------------------------------------
const Inventory = {
  items: [],
  collectedIds: new Set(),

  init(itemsPool) {
    this.collectedIds = new Set();
    const availableItems = itemsPool 
      ? ITEMS_DATA.filter(item => itemsPool.includes(item.id))
      : ITEMS_DATA;
    this.items = availableItems.map(item => ({
      ...item,
      collected: false,
      hoverOffset: Math.random() * Math.PI * 2,
    }));
    this.updateChecklistUI();
  },

  collect(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item || item.collected) return false;

    item.collected = true;
    this.collectedIds.add(itemId);

    // Audio SFX
    AudioSFX.itemCollected();

    // Show floating toast
    UI.showItemToast(item.name);

    // Update Checklist UI
    this.updateChecklistUI();

    // Check Quest Progress
    QuestSystem.checkProgress();

    return true;
  },

  getCollectedCount() {
    return this.collectedIds.size;
  },

  getTotalCount() {
    return this.items.length;
  },

  hasKey() {
    return this.collectedIds.has('keys');
  },

  updateChecklistUI() {
    const countEl = document.getElementById('hud-items-count');
    const drawerCountEl = document.getElementById('checklist-counter');
    const gridEl = document.getElementById('checklist-grid');
    if (!countEl || !gridEl) return;

    const count = this.getCollectedCount();
    const total = this.getTotalCount();
    countEl.textContent = `${count} / ${total}`;
    if (drawerCountEl) drawerCountEl.textContent = `${count} / ${total}`;

    gridEl.innerHTML = '';
    this.items.forEach(item => {
      const isDone = this.collectedIds.has(item.id);
      const row = document.createElement('div');
      row.className = `check-item ${isDone ? 'collected' : ''}`;
      row.innerHTML = `
        <div class="check-item-info">
          <span>${item.icon}</span>
          <span>${item.name.split(' ')[0]}</span>
        </div>
        <span>${isDone ? '✓' : `ชั้น ${item.floor}`}</span>
      `;
      gridEl.appendChild(row);
    });
  }
};

// --------------------------------------------------------
// 7.5. STAGE SYSTEM (5 Progressive Stages & Persistence)
// --------------------------------------------------------
const StageSystem = {
  currentStage: 1,
  unlockedStage: 1,
  stageStars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },

  init() {
    try {
      const saved = localStorage.getItem('water_in_home_stages_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.unlockedStage = parsed.unlockedStage || 1;
        this.stageStars = parsed.stageStars || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      }
    } catch (e) {}
  },

  save() {
    try {
      localStorage.setItem('water_in_home_stages_v2', JSON.stringify({
        unlockedStage: this.unlockedStage,
        stageStars: this.stageStars,
      }));
    } catch (e) {}
  },

  getStageConfig(stageNumber = this.currentStage) {
    return STAGES_CONFIG.find(s => s.stage === stageNumber) || STAGES_CONFIG[0];
  },

  startStage(stageNumber) {
    const num = Math.max(1, Math.min(5, parseInt(stageNumber, 10) || 1));
    this.currentStage = num;
    UI.hideModal('stage-select-modal');
    UI.hideModal('stage-clear-modal');
    UI.hideModal('victory-modal');
    Game.startNewGame(num);
  },

  completeStage(itemsCount, minRequired, remainingTime) {
    const config = this.getStageConfig(this.currentStage);
    AudioSFX.stageClear();

    // Calculate stars (1-3 stars)
    let stars = 1;
    if (itemsCount >= config.requiredItems && remainingTime > 25) stars = 3;
    else if (itemsCount >= config.requiredItems) stars = 2;

    this.stageStars[this.currentStage] = Math.max(this.stageStars[this.currentStage] || 0, stars);

    // Unlock next stage if currently at highest unlocked
    if (this.currentStage < 5 && this.unlockedStage <= this.currentStage) {
      this.unlockedStage = this.currentStage + 1;
    }
    this.save();

    // Score calculation
    const score = (itemsCount * 300) + Math.floor(remainingTime * 15) + (stars * 500);

    // If Stage 5 is completed, show Victory Modal as final boss victory
    if (this.currentStage === 5) {
      Game.triggerVictory();
      return;
    }

    // Populate Stage Clear Modal
    const badgeEl = document.getElementById('sc-stage-badge');
    const titleEl = document.getElementById('sc-title');
    const starsEl = document.getElementById('sc-stars');
    const descEl = document.getElementById('sc-desc');
    const itemsEl = document.getElementById('sc-stat-items');
    const timeEl = document.getElementById('sc-stat-time');
    const scoreEl = document.getElementById('sc-stat-score');
    const nextEl = document.getElementById('sc-stat-next');

    if (badgeEl) badgeEl.textContent = `STAGE ${this.currentStage} COMPLETED!`;
    if (titleEl) titleEl.textContent = `ผ่านด่าน ${this.currentStage}: ${config.name}`;
    if (starsEl) starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    if (descEl) descEl.textContent = `กู้ภัยสำเร็จในระดับความยาก ${config.difficulty}! ด่านถัดไปปลดล็อกแล้ว`;
    if (itemsEl) itemsEl.textContent = `${itemsCount} / ${config.requiredItems}`;
    if (timeEl) timeEl.textContent = TimerSystem.getFormattedTime();
    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    if (nextEl) nextEl.textContent = `STAGE ${this.currentStage + 1}`;

    UI.showModal('stage-clear-modal');
  },

  renderStageListModal() {
    const grid = document.getElementById('stage-list-grid');
    if (!grid) return;
    grid.innerHTML = '';

    STAGES_CONFIG.forEach(st => {
      const isUnlocked = st.stage <= this.unlockedStage;
      const isCurrent = st.stage === this.currentStage;
      const starsCount = this.stageStars[st.stage] || 0;
      const starsDisplay = isUnlocked ? ('⭐'.repeat(starsCount) + '☆'.repeat(3 - starsCount)) : '🔒 LOCKED';

      const card = document.createElement('div');
      card.className = `stage-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`;
      card.innerHTML = `
        <div class="stage-card-header">
          <div class="stage-card-num" style="background: ${st.diffColor};">STAGE ${st.stage}</div>
          <div class="stage-card-diff" style="color: ${st.diffColor};">${st.difficulty}</div>
        </div>
        <div class="stage-card-title">${st.name}</div>
        <div class="stage-card-info">
          <span>⏱️ เวลา: ${st.totalTime}s</span>
          <span>🎒 ต้องเก็บ: ${st.requiredItems} ชิ้น</span>
        </div>
        <div class="stage-card-hazard">${st.hazardText}</div>
        <div class="stage-card-footer">
          <span class="stage-card-stars">${starsDisplay}</span>
          ${isUnlocked ? `<button class="btn-play-stage" data-stage="${st.stage}">▶ เล่นด่านนี้</button>` : `<span class="locked-badge">🔒 ล็อกอยู่</span>`}
        </div>
      `;

      if (isUnlocked) {
        card.querySelector('.btn-play-stage')?.addEventListener('click', () => {
          AudioSFX.click();
          this.startStage(st.stage);
        });
      }

      grid.appendChild(card);
    });
  },

  updateHUD() {
    const config = this.getStageConfig(this.currentStage);
    const badgeEl = document.getElementById('hud-stage-badge');
    const nameEl = document.getElementById('hud-stage-name');
    if (badgeEl) {
      badgeEl.textContent = `STAGE ${this.currentStage}`;
      badgeEl.style.background = config.diffColor;
    }
    if (nameEl) {
      nameEl.textContent = config.name.split(' ')[0];
    }
  }
};

// --------------------------------------------------------
// 8. QUEST SYSTEM (Dynamic Survival Quests Per Stage)
// --------------------------------------------------------
const QuestSystem = {
  quests: [],
  activeQuestIndex: 0,

  init(stageNumber = 1) {
    this.activeQuestIndex = 0;
    const config = StageSystem.getStageConfig(stageNumber);

    if (stageNumber === 1) {
      this.quests = [
        {
          id: 'quest_1',
          tag: '📜 QUEST 1',
          title: 'เตรียมรับมือน้ำท่วม (Emergency Ready)',
          desc: 'รวบรวมสิ่งของฉุกเฉิน 3 ชิ้นแรกในบ้าน',
          items: ['phone', 'flashlight', 'medicine'],
          rewardText: '⚡ วิ่งเร็วขึ้นถาวร + Stamina สูงสุด + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_2',
          tag: '📜 QUEST 2',
          title: 'เสบียงและกุญแจสำคัญ (Supplies & Key)',
          desc: 'ค้นหากุญแจสำรอง น้ำดื่ม และอาหารแห้งประทังชีวิต',
          items: ['keys', 'water', 'bread'],
          rewardText: '⚡ Stamina ฟื้นฟูเร็วขึ้น 2 เท่า + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_3',
          tag: '📜 QUEST 3',
          title: 'เอกสารและอพยพหนีภัย (Roof Escape)',
          desc: 'เก็บเอกสารสำคัญและเงินสด แล้วขึ้นจุดหนีภัยดาดฟ้า',
          items: ['documents', 'money'],
          rewardText: '🏆 ปลดล็อกทางหนีฉุกเฉินสู่ STAGE 2!',
          completed: false,
        }
      ];
    } else if (stageNumber === 2) {
      this.quests = [
        {
          id: 'quest_1',
          tag: '📜 QUEST 1',
          title: 'ชุดอุปกรณ์ฉุกเฉิน & ไฟฉาย',
          desc: 'ค้นหาไฟฉาย ยา และแบตเตอรี่สำรองในห้องเก็บของ',
          items: ['flashlight', 'medicine', 'battery'],
          rewardText: '⚡ วิ่งเร็วขึ้นถาวร + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_2',
          tag: '📜 QUEST 2',
          title: 'เสบียง & กล่องปฐมพยาบาลชั้น 2',
          desc: 'ขึ้นบันไดเก็บชุดปฐมพยาบาล และกุญแจสำคัญ',
          items: ['firstaid', 'keys', 'bread'],
          rewardText: '⚡ Stamina ฟื้นฟูเร็วขึ้น 2 เท่า + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_3',
          tag: '📜 QUEST 3',
          title: 'ทรัพย์สินสำคัญ & หนีภัยดาดฟ้า',
          desc: 'เก็บเอกสาร ทะเบียนบ้าน และเงินสดในห้องนอนชั้น 2',
          items: ['documents', 'money', 'phone'],
          rewardText: '🏆 ปลดล็อกทางหนีฉุกเฉินสู่ STAGE 3!',
          completed: false,
        }
      ];
    } else if (stageNumber === 3) {
      this.quests = [
        {
          id: 'quest_1',
          tag: '📜 QUEST 1',
          title: 'ระวังสายไฟรั่ว & กู้เครื่องมือ',
          desc: 'หลบสายไฟช็อตและเก็บโทรศัพท์ ยา และกล้อง',
          items: ['phone', 'medicine', 'camera'],
          rewardText: '⚡ ต้านทานไฟฟ้า + วิ่งเร็วขึ้น + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_2',
          tag: '📜 QUEST 2',
          title: 'กู้โน้ตบุ๊ก & ชุดทำแผลชั้น 2',
          desc: 'เก็บโน้ตบุ๊กทำงาน และชุดปฐมพยาบาลในห้องนอน',
          items: ['laptop', 'firstaid', 'keys'],
          rewardText: '⚡ Stamina เต็มทันที + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_3',
          tag: '📜 QUEST 3',
          title: 'ทรัพย์สิน & อพยพดาดฟ้า',
          desc: 'เก็บเอกสารสำคัญ เงินสด และแบตเตอรี่สำรอง',
          items: ['documents', 'money', 'battery'],
          rewardText: '🏆 ปลดล็อกทางหนีฉุกเฉินสู่ STAGE 4!',
          completed: false,
        }
      ];
    } else if (stageNumber === 4) {
      this.quests = [
        {
          id: 'quest_1',
          tag: '📜 QUEST 1',
          title: 'วิทยุเตือนภัย & สู้กระแสน้ำวน',
          desc: 'ค้นหาวิทยุสื่อสารและไฟฉายส่องทางฝ่ากระแสน้ำ',
          items: ['radio', 'flashlight', 'keys'],
          rewardText: '⚡ ต้านทานกระแสน้ำวน + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_2',
          tag: '📜 QUEST 2',
          title: 'เสื้อชูชีพนิรภัย & โน้ตบุ๊ก',
          desc: 'เก็บเสื้อชูชีพบนดาดฟ้า และโน้ตบุ๊กในห้องนอน',
          items: ['lifevest', 'laptop', 'firstaid'],
          rewardText: '⚡ ความเร็วว่ายน้ำสูงสุด + เวลา +15s!',
          completed: false,
        },
        {
          id: 'quest_3',
          tag: '📜 QUEST 3',
          title: 'กู้ข้อมูลทรัพย์สินทั้งหมด',
          desc: 'เก็บเอกสาร เงินสด น้ำดื่ม และกล้องบันทึกภาพ',
          items: ['documents', 'money', 'water', 'camera'],
          rewardText: '🏆 ปลดล็อก FINAL BOSS STAGE 5!',
          completed: false,
        }
      ];
    } else {
      // Stage 5 Nightmare Tsunami
      this.quests = [
        {
          id: 'quest_1',
          tag: '📜 QUEST 1',
          title: 'วิกฤตสึนามิ: กู้ชีพเร่งด่วน',
          desc: 'กู้โทรศัพท์ วิทยุสื่อสาร ยา และกุญแจหนีภัย',
          items: ['phone', 'radio', 'medicine', 'keys'],
          rewardText: '⚡ ซูเปอร์สปีดสูงสุด + เวลา +20s!',
          completed: false,
        },
        {
          id: 'quest_2',
          tag: '📜 QUEST 2',
          title: 'เสบียง & เสื้อชูชีพหนีตาย',
          desc: 'เก็บเสื้อชูชีพ อาหาร น้ำดื่ม และชุดปฐมพยาบาล',
          items: ['lifevest', 'bread', 'water', 'firstaid'],
          rewardText: '⚡ Stamina ไม่จำกัดชั่วคราว + เวลา +20s!',
          completed: false,
        },
        {
          id: 'quest_3',
          tag: '📜 QUEST 3',
          title: 'จุดพลุสัญญาณกู้ภัยเฮลิคอปเตอร์!',
          desc: 'เก็บพลุสัญญาณ เอกสาร เงิน โน้ตบุ๊ก แล้วขึ้นดาดฟ้า',
          items: ['flare', 'documents', 'money', 'laptop'],
          rewardText: '👑 เอาชีวิตรอดจากสึนามิระดับ NIGHTMARE สำเร็จ!',
          completed: false,
        }
      ];
    }

    this.updateHUD();
  },

  getCurrentQuest() {
    return this.quests[this.activeQuestIndex] || null;
  },

  checkProgress() {
    const q = this.getCurrentQuest();
    if (!q || q.completed) return;

    const allDone = q.items.every(itemId => Inventory.collectedIds.has(itemId));
    if (allDone) {
      this.completeQuest(this.activeQuestIndex);
    } else {
      this.updateHUD();
    }
  },

  completeQuest(index) {
    const q = this.quests[index];
    if (!q || q.completed) return;
    q.completed = true;

    // Play Quest Complete Audio Fanfare
    AudioSFX.questComplete();

    // Rewards
    TimerSystem.remaining = Math.min(TimerSystem.totalSeconds, TimerSystem.remaining + 15);
    if (index === 0) {
      Player.baseSpeed += 40; // Permanent speed boost
      Player.maxStamina += 30;
      Player.stamina = Player.maxStamina;
    } else if (index === 1) {
      Player.staminaRecoveryRate *= 1.8;
    }

    // Show Quest Complete Toast Banner
    UI.showQuestCompleteToast(q.title, q.rewardText);

    // Advance to next quest
    if (this.activeQuestIndex < this.quests.length - 1) {
      this.activeQuestIndex++;
    }

    setTimeout(() => {
      this.updateHUD();
    }, 400);
  },

  updateHUD() {
    const card = document.getElementById('hud-quest-card');
    if (!card) return;

    const q = this.getCurrentQuest();
    if (!q) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'flex';

    const tagEl = document.getElementById('quest-tag');
    const progEl = document.getElementById('quest-progress-badge');
    const titleEl = document.getElementById('quest-title');
    const descEl = document.getElementById('quest-desc');
    const listEl = document.getElementById('quest-objectives-list');
    const rewardEl = document.getElementById('quest-reward-hint');

    let doneCount = 0;
    q.items.forEach(id => {
      if (Inventory.collectedIds.has(id)) doneCount++;
    });

    if (tagEl) tagEl.textContent = q.tag;
    if (progEl) progEl.textContent = `${doneCount} / ${q.items.length}`;
    if (titleEl) titleEl.textContent = q.title;
    if (descEl) descEl.textContent = q.desc;
    if (rewardEl) rewardEl.innerHTML = `<span>🎁 รางวัล:</span> <strong>${q.rewardText}</strong>`;

    if (listEl) {
      listEl.innerHTML = '';
      q.items.forEach(itemId => {
        const itemData = ITEMS_DATA.find(i => i.id === itemId);
        const isDone = Inventory.collectedIds.has(itemId);
        const stepDiv = document.createElement('div');
        stepDiv.className = `quest-step ${isDone ? 'completed' : ''}`;
        stepDiv.innerHTML = `
          <span class="quest-step-check">${isDone ? '✓' : '○'}</span>
          <span>${itemData ? `${itemData.icon} ${itemData.name.split(' ')[0]} (ชั้น ${itemData.floor})` : itemId}</span>
        `;
        listEl.appendChild(stepDiv);
      });
    }
  }
};

// --------------------------------------------------------
// 9. PLAYER CHARACTER (Fish Head + Raincoat + E Sprint Boost)
// --------------------------------------------------------
const Player = {
  x: 600,
  y: 650,
  radius: 20,
  baseSpeed: 220,
  speed: 220, // px per sec
  sprintMultiplier: 1.85, // [E] Sprint Boost Multiplier
  floor: 1,
  direction: 'down', // 'up', 'down', 'left', 'right'
  state: 'idle', // 'idle', 'walk', 'swim', 'sprint'
  
  // Stamina for Sprint Boost [E]
  stamina: 100,
  maxStamina: 100,
  staminaDrainRate: 36,
  staminaRecoveryRate: 30,
  isSprinting: false,
  sprintTrails: [], // Ghost afterimages

  walkTimer: 0,
  stepCycle: 0,
  blinkTimer: 0,
  isBlinking: false,
  sprintFxTimer: 0,

  init(floor = 1, x = 600, y = 650) {
    this.floor = floor;
    this.x = x;
    this.y = y;
    this.direction = 'down';
    this.state = 'idle';
    this.baseSpeed = 220;
    this.speed = 220;
    this.stamina = 100;
    this.maxStamina = 100;
    this.isSprinting = false;
    this.sprintTrails = [];
    this.walkTimer = 0;
    this.stepCycle = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
  },

  update(dt, input) {
    if (Game.state !== 'PLAYING') return;

    // Eye blinking
    this.blinkTimer += dt;
    if (this.blinkTimer > 3.5) {
      this.isBlinking = true;
      if (this.blinkTimer > 3.7) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Update Sprint Ghost Afterimage Trails
    for (let i = this.sprintTrails.length - 1; i >= 0; i--) {
      this.sprintTrails[i].alpha -= dt * 3.5;
      if (this.sprintTrails[i].alpha <= 0) {
        this.sprintTrails.splice(i, 1);
      }
    }

    // Direction vector
    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    const isMoving = dx !== 0 || dy !== 0;

    // Sprint Boost Logic when pressing/holding E (or Shift)
    const wantsSprint = (input.sprint || input.interact || input.shift);
    if (wantsSprint && isMoving && this.stamina > 5) {
      if (!this.isSprinting) {
        AudioSFX.dash();
      }
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * dt);
      this.speed = this.baseSpeed * this.sprintMultiplier;

      // Spawn sprint ghost trail
      this.sprintFxTimer += dt;
      if (this.sprintFxTimer > 0.05) {
        this.sprintFxTimer = 0;
        this.sprintTrails.push({
          x: this.x,
          y: this.y,
          floor: this.floor,
          direction: this.direction,
          alpha: 0.6,
          stepCycle: this.stepCycle
        });
      }
    } else {
      this.isSprinting = false;
      this.speed = this.baseSpeed;
      // Recover stamina when not sprinting
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecoveryRate * dt);
    }

    if (isMoving) {
      // Normalize
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;

      // Determine facing direction
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else {
        this.direction = dy > 0 ? 'down' : 'up';
      }

      // Check swim state vs sprint vs walk
      if (WaterSystem.isSubmerged()) {
        this.state = 'swim';
      } else if (this.isSprinting) {
        this.state = 'sprint';
      } else {
        this.state = 'walk';
      }

      // Apply water drag multiplier
      const spd = this.speed * WaterSystem.getPlayerSpeedMultiplier();
      const moveX = dx * spd * dt;
      const moveY = dy * spd * dt;

      // Wall collision handling with smooth sliding
      this.moveWithCollision(moveX, moveY);

      // Auto-collect nearby items on contact
      this.autoPickupNearbyItem();

      // Footstep & Splash audio
      this.walkTimer += dt;
      const stepInterval = this.isSprinting ? 0.16 : 0.28;
      if (this.walkTimer > stepInterval) {
        this.walkTimer = 0;
        if (WaterSystem.level > 20 && this.floor === 1) {
          AudioSFX.splash();
        } else {
          AudioSFX.footstep();
        }
      }

      this.stepCycle += dt * (this.isSprinting ? 18 : 10);
    } else {
      if (WaterSystem.isSubmerged()) {
        this.state = 'swim';
      } else {
        this.state = 'idle';
      }
      this.walkTimer = 0;
    }

    // Track room exploration
    const currentRoom = this.getCurrentRoom();
    if (currentRoom) {
      Game.exploredRooms.add(currentRoom.id);
      UI.updateRoomBanner(currentRoom.name, this.floor);
    }
  },

  autoPickupNearbyItem() {
    for (const item of Inventory.items) {
      if (!item.collected && item.floor === this.floor) {
        const dist = Math.hypot(this.x - item.x, this.y - item.y);
        if (dist < 55) {
          Inventory.collect(item.id);
          return;
        }
      }
    }
  },

  moveWithCollision(dx, dy) {
    const colliders = COLLIDERS[this.floor] || [];

    // Try moving X first
    let newX = this.x + dx;
    let canMoveX = true;
    for (const c of colliders) {
      if (this.checkCircleRect(newX, this.y, this.radius, c)) {
        canMoveX = false;
        break;
      }
    }
    if (canMoveX) this.x = newX;

    // Try moving Y next
    let newY = this.y + dy;
    let canMoveY = true;
    for (const c of colliders) {
      if (this.checkCircleRect(this.x, newY, this.radius, c)) {
        canMoveY = false;
        break;
      }
    }
    if (canMoveY) this.y = newY;

    // World clamp
    this.x = Math.max(this.radius + 30, Math.min(WORLD_WIDTH - this.radius - 30, this.x));
    this.y = Math.max(this.radius + 30, Math.min(WORLD_HEIGHT - this.radius - 30, this.y));
  },

  checkCircleRect(cx, cy, r, rect) {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const distSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;
    return distSq < (r ** 2);
  },

  getCurrentRoom() {
    return ROOMS_CONFIG.find(r => 
      r.floor === this.floor &&
      this.x >= r.x && this.x <= r.x + r.w &&
      this.y >= r.y && this.y <= r.y + r.h
    );
  },

  render(ctx, time) {
    // 1. Render Sprint Ghost Trails
    this.sprintTrails.forEach(trail => {
      if (trail.floor !== this.floor) return;
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.globalAlpha = trail.alpha * 0.55;
      
      // Golden / Cyan Speed Ghost Silhouette
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(0, -6, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fish head silhouette
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, -24, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    ctx.save();
    ctx.translate(this.x, this.y);

    const isSwimming = this.state === 'swim';
    const isSprint = this.isSprinting;
    const bob = Math.sin(time * 6) * (isSwimming ? 4 : (isSprint ? 3 : 2));
    const stepBob = (this.state === 'walk' || isSprint) ? Math.sin(this.stepCycle) * (isSprint ? 4 : 3) : 0;

    // Speed Boost Aura Glow when Sprinting with E
    if (isSprint) {
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(0, 5, 26 + Math.sin(time * 12) * 3, 14, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Speed lines
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const offset = (time * 20 + i * 15) % 30;
        ctx.beginPath();
        ctx.moveTo(-15 + i * 10, -25 + offset);
        ctx.lineTo(-15 + i * 10, -15 + offset);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Water Ripple / Splash under feet
    if (WaterSystem.level > 10 && this.floor === 1) {
      ctx.fillStyle = isSprint ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 22, (isSprint ? 28 : 22) + Math.sin(time * 8) * 3, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. HUMAN BODY (Yellow Raincoat / Blue Hoodie + Boots)
    const bodyY = -6 + bob + stepBob;

    // Walking / Running Legs
    if (this.state === 'walk' || isSprint) {
      const legOffset = Math.sin(this.stepCycle) * (isSprint ? 9 : 7);
      // Left leg
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-10, bodyY + 14, 7, 14 + legOffset);
      ctx.fillStyle = '#f59e0b'; // rain boot
      ctx.fillRect(-11, bodyY + 24 + legOffset, 9, 6);

      // Right leg
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(3, bodyY + 14, 7, 14 - legOffset);
      ctx.fillStyle = '#f59e0b'; // rain boot
      ctx.fillRect(2, bodyY + 24 - legOffset, 9, 6);
    } else {
      // Standing legs
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-9, bodyY + 14, 6, 12);
      ctx.fillRect(3, bodyY + 14, 6, 12);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-10, bodyY + 22, 8, 6);
      ctx.fillRect(2, bodyY + 22, 8, 6);
    }

    // Torso (Yellow Raincoat)
    ctx.fillStyle = isSprint ? '#facc15' : '#eab308'; // brighter yellow when sprinting
    ctx.beginPath();
    ctx.roundRect(-14, bodyY - 2, 28, 20, 6);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Coat zipper / buttons
    ctx.strokeStyle = '#854d0e';
    ctx.beginPath();
    ctx.moveTo(0, bodyY);
    ctx.lineTo(0, bodyY + 16);
    ctx.stroke();

    // Arms
    const armSwing = (this.state === 'walk' || isSprint) ? Math.sin(this.stepCycle) * (isSprint ? 9 : 6) : 0;
    ctx.fillStyle = isSprint ? '#facc15' : '#eab308';
    ctx.fillRect(-18, bodyY + 1 + armSwing, 5, 12);
    ctx.fillRect(13, bodyY + 1 - armSwing, 5, 12);

    // 3. FISH HEAD (Cute Salmon / Tuna head with expressive eye and dorsal fin)
    const headY = bodyY - 18;

    // Dorsal Fin on back/top
    ctx.fillStyle = '#f43f5e'; // vibrant coral fin
    ctx.beginPath();
    if (this.direction === 'up') {
      ctx.moveTo(-6, headY - 12);
      ctx.lineTo(0, headY - 22);
      ctx.lineTo(6, headY - 12);
    } else if (this.direction === 'left') {
      ctx.moveTo(4, headY - 10);
      ctx.lineTo(14, headY - 18);
      ctx.lineTo(8, headY - 2);
    } else {
      ctx.moveTo(-4, headY - 10);
      ctx.lineTo(-14, headY - 18);
      ctx.lineTo(-8, headY - 2);
    }
    ctx.closePath();
    ctx.fill();

    // Fish Head Shape
    ctx.fillStyle = '#ff6b4a'; // lively salmon orange
    ctx.beginPath();
    ctx.ellipse(0, headY, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Gills on side
    ctx.strokeStyle = '#be123c';
    ctx.beginPath();
    ctx.arc(this.direction === 'left' ? 4 : -4, headY + 2, 6, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Big Cute Eyes
    if (!this.isBlinking) {
      if (this.direction === 'down') {
        // Both eyes front
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-7, headY - 2, 5, 0, Math.PI * 2);
        ctx.arc(7, headY - 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-6, headY - 1, 2.5, 0, Math.PI * 2);
        ctx.arc(8, headY - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.direction === 'left') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, headY - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-10, headY - 1, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.direction === 'right') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, headY - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(10, headY - 1, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Facing Up (back of fish head)
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(0, headY - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Blinking lines
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, headY - 2);
      ctx.lineTo(-4, headY - 2);
      ctx.moveTo(4, headY - 2);
      ctx.lineTo(10, headY - 2);
      ctx.stroke();
    }

    // Fish Mouth (pouting fish lips)
    if (this.direction === 'down') {
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.ellipse(0, headY + 8, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

// --------------------------------------------------------
// 9. GAME ENGINE & RENDERING
// --------------------------------------------------------
const Game = {
  canvas: null,
  ctx: null,
  state: 'MENU', // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
  lastTime: 0,
  exploredRooms: new Set(),

  input: {
    up: false,
    down: false,
    left: false,
    right: false,
    interact: false,
  },

  camera: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  },

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupControls();
    this.setupUIEvents();

    // Initialize Stages
    StageSystem.init();

    // Expose for runtime access
    window.Game = this;
    window.Player = Player;
    window.Inventory = Inventory;
    window.StageSystem = StageSystem;
    window.HazardSystem = HazardSystem;
    window.QuestSystem = QuestSystem;
    window.WaterSystem = WaterSystem;
    window.TimerSystem = TimerSystem;
    window.UI = UI;

    // Start Mascot animation in Main Menu
    this.initMascotCanvas();

    // Main animation loop
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.gameLoop(t));
  },

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  startNewGame(stageNumber = 1) {
    initAudio();
    this.state = 'PLAYING';
    this.exploredRooms = new Set();

    const num = Math.max(1, Math.min(5, parseInt(stageNumber, 10) || 1));
    const stageConfig = StageSystem.getStageConfig(num);
    StageSystem.currentStage = num;
    StageSystem.updateHUD();

    WaterSystem.init(stageConfig);
    TimerSystem.reset(stageConfig.totalTime);
    Inventory.init(stageConfig.itemsPool);
    HazardSystem.init(stageConfig);
    QuestSystem.init(num);
    Player.init(1, 600, 680);

    UI.hideAllModals();
    UI.showHUD(true);
    startBGM();
  },

  restartCurrentGame() {
    this.startNewGame(StageSystem.currentStage);
  },

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    UI.showModal('pause-modal');
  },

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    UI.hideModal('pause-modal');
  },

  quitToMenu() {
    this.state = 'MENU';
    stopBGM();
    UI.hideAllModals();
    UI.showHUD(false);
    document.getElementById('main-menu-screen').classList.remove('hidden');
  },

  triggerGameOver(reason) {
    this.state = 'GAMEOVER';
    stopBGM();
    AudioSFX.gameOver();

    document.getElementById('game-over-detail').textContent = reason || 'น้ำท่วมบ้านจนมิดหัว ไม่สามารถเอาชีวิตรอดได้!';
    document.getElementById('stat-go-time').textContent = TimerSystem.getSurvivedTime();
    document.getElementById('stat-go-items').textContent = `${Inventory.getCollectedCount()} / ${Inventory.getTotalCount()}`;
    document.getElementById('stat-go-water').textContent = `${Math.floor(WaterSystem.level)}%`;
    document.getElementById('stat-go-rooms').textContent = `${this.exploredRooms.size} / 7`;

    UI.showModal('game-over-modal');
  },

  triggerVictory() {
    this.state = 'VICTORY';
    stopBGM();
    AudioSFX.victory();

    const count = Inventory.getCollectedCount();
    const total = Inventory.getTotalCount();
    let rank = 'RANK B';
    if (count === total) rank = 'RANK S (PERFECT MASTER!)';
    else if (count >= Math.floor(total * 0.8)) rank = 'RANK A (EXCELLENT)';

    document.getElementById('stat-vic-items').textContent = `${count} / ${total}`;
    document.getElementById('stat-vic-time').textContent = TimerSystem.getFormattedTime();
    document.getElementById('stat-vic-rooms').textContent = `${this.exploredRooms.size} / 7`;
    document.getElementById('stat-vic-rank').textContent = rank;

    UI.showModal('victory-modal');
  },

  setupControls() {
    window.addEventListener('keydown', e => {
      initAudio();

      if (e.key === 'Escape') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
        return;
      }

      if (e.key === 'Tab' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const panel = document.getElementById('items-checklist-panel');
        if (panel) panel.classList.toggle('open');
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') this.input.up = true;
      if (key === 's' || e.key === 'ArrowDown') this.input.down = true;
      if (key === 'a' || e.key === 'ArrowLeft') this.input.left = true;
      if (key === 'd' || e.key === 'ArrowRight') this.input.right = true;
      if (key === 'shift') this.input.shift = true;
      if (key === 'e') {
        this.input.sprint = true;
        this.input.interact = true;
        this.handleInteraction();
      }
    });

    window.addEventListener('keyup', e => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') this.input.up = false;
      if (key === 's' || e.key === 'ArrowDown') this.input.down = false;
      if (key === 'a' || e.key === 'ArrowLeft') this.input.left = false;
      if (key === 'd' || e.key === 'ArrowRight') this.input.right = false;
      if (key === 'shift') this.input.shift = false;
      if (key === 'e') {
        this.input.sprint = false;
        this.input.interact = false;
      }
    });

    // Mobile / Touch controls
    const bindTouch = (id, keyName) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        initAudio();
        this.input[keyName] = true;
      });
      btn.addEventListener('pointerup', () => this.input[keyName] = false);
      btn.addEventListener('pointerleave', () => this.input[keyName] = false);
    };

    bindTouch('t-up', 'up');
    bindTouch('t-down', 'down');
    bindTouch('t-left', 'left');
    bindTouch('t-right', 'right');

    const touchInteract = document.getElementById('t-interact');
    if (touchInteract) {
      touchInteract.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        initAudio();
        this.input.sprint = true;
        this.input.interact = true;
        this.handleInteraction();
      });
      touchInteract.addEventListener('pointerup', () => {
        this.input.sprint = false;
        this.input.interact = false;
      });
      touchInteract.addEventListener('pointerleave', () => {
        this.input.sprint = false;
        this.input.interact = false;
      });
    }
  },

  handleInteraction() {
    if (this.state !== 'PLAYING') return;

    // 1. Check Collectible Item Proximity
    for (const item of Inventory.items) {
      if (!item.collected && item.floor === Player.floor) {
        const dist = Math.hypot(Player.x - item.x, Player.y - item.y);
        if (dist < 75) {
          Inventory.collect(item.id);
          return;
        }
      }
    }

    // 2. Check Stairs Transition
    const currentStairs = STAIRS[Player.floor];
    if (currentStairs) {
      const dist = Math.hypot(Player.x - (currentStairs.x + currentStairs.w / 2), Player.y - (currentStairs.y + currentStairs.h / 2));
      if (dist < 60) {
        Player.floor = currentStairs.targetFloor;
        Player.x = currentStairs.targetX;
        Player.y = currentStairs.targetY;
        AudioSFX.stairs();
        UI.showItemToast(`ย้ายไปชั้นที่ ${Player.floor}`);
        return;
      }
    }

    // 3. Check Escape Zone (Roof on Floor 2)
    if (Player.floor === ESCAPE_ZONE.floor) {
      const dist = Math.hypot(Player.x - ESCAPE_ZONE.x, Player.y - ESCAPE_ZONE.y);
      if (dist < ESCAPE_ZONE.radius) {
        const count = Inventory.getCollectedCount();
        const config = StageSystem.getStageConfig();
        if (count >= config.requiredItems || Inventory.hasKey()) {
          this.state = 'VICTORY';
          stopBGM();
          StageSystem.completeStage(count, config.requiredItems, TimerSystem.remaining);
        } else {
          UI.showItemToast(`⚠️ ต้องเก็บของอย่างน้อย ${config.requiredItems} ชิ้น หรือหากุญแจเพื่อหนี! (มี ${count}/${Inventory.getTotalCount()})`);
        }
      }
    }
  },

  setupUIEvents() {
    // Main Menu Buttons
    document.getElementById('btn-play-game')?.addEventListener('click', () => {
      AudioSFX.click();
      this.startNewGame(StageSystem.currentStage);
    });

    document.getElementById('btn-open-stages')?.addEventListener('click', () => {
      AudioSFX.click();
      StageSystem.renderStageListModal();
      UI.showModal('stage-select-modal');
    });

    document.getElementById('btn-open-guide')?.addEventListener('click', () => {
      AudioSFX.click();
      UI.showModal('how-to-play-modal');
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      AudioSFX.click();
      UI.showModal('settings-modal');
    });

    document.getElementById('btn-open-credits')?.addEventListener('click', () => {
      AudioSFX.click();
      UI.showModal('credits-modal');
    });

    // Close buttons for modals
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioSFX.click();
        const modalId = btn.getAttribute('data-close');
        UI.hideModal(modalId);
      });
    });

    // Stage Clear Modal Buttons
    document.getElementById('btn-next-stage')?.addEventListener('click', () => {
      AudioSFX.click();
      StageSystem.startStage(StageSystem.currentStage + 1);
    });

    document.getElementById('btn-stageclear-stageselect')?.addEventListener('click', () => {
      AudioSFX.click();
      UI.hideModal('stage-clear-modal');
      StageSystem.renderStageListModal();
      UI.showModal('stage-select-modal');
    });

    document.getElementById('btn-stageclear-menu')?.addEventListener('click', () => {
      AudioSFX.click();
      UI.hideModal('stage-clear-modal');
      this.quitToMenu();
    });

    // In-game Pause button
    document.getElementById('btn-hud-pause')?.addEventListener('click', () => {
      AudioSFX.click();
      this.pauseGame();
    });

    // Pause Modal Buttons
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      AudioSFX.click();
      this.resumeGame();
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      AudioSFX.click();
      UI.showModal('settings-modal');
    });

    document.getElementById('btn-pause-guide')?.addEventListener('click', () => {
      AudioSFX.click();
      UI.showModal('how-to-play-modal');
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      AudioSFX.click();
      this.restartCurrentGame();
    });

    document.getElementById('btn-quit-to-menu')?.addEventListener('click', () => {
      AudioSFX.click();
      this.quitToMenu();
    });

    // Game Over & Victory Buttons
    document.getElementById('btn-retry')?.addEventListener('click', () => {
      AudioSFX.click();
      this.restartCurrentGame();
    });

    document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
      AudioSFX.click();
      this.quitToMenu();
    });

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      AudioSFX.click();
      this.restartCurrentGame();
    });

    document.getElementById('btn-victory-menu')?.addEventListener('click', () => {
      AudioSFX.click();
      this.quitToMenu();
    });

    // Checklist Panel Toggle
    document.getElementById('hud-items-card')?.addEventListener('click', () => {
      const panel = document.getElementById('items-checklist-panel');
      if (panel) panel.classList.toggle('open');
    });

    // Settings Controls
    const sliderMusic = document.getElementById('slider-music');
    const txtMusic = document.getElementById('txt-music-val');
    sliderMusic?.addEventListener('input', e => {
      gameSettings.musicVolume = Number(e.target.value);
      if (txtMusic) txtMusic.textContent = `${gameSettings.musicVolume}%`;
      saveSettings();
    });

    const sliderSfx = document.getElementById('slider-sfx');
    const txtSfx = document.getElementById('txt-sfx-val');
    sliderSfx?.addEventListener('input', e => {
      gameSettings.sfxVolume = Number(e.target.value);
      if (txtSfx) txtSfx.textContent = `${gameSettings.sfxVolume}%`;
      saveSettings();
    });

    const toggleTimer = document.getElementById('toggle-timer');
    toggleTimer?.addEventListener('change', e => {
      gameSettings.showTimer = e.target.checked;
      document.getElementById('hud-timer-container').style.display = gameSettings.showTimer ? 'flex' : 'none';
      saveSettings();
    });

    const toggleWater = document.getElementById('toggle-water-level');
    toggleWater?.addEventListener('change', e => {
      gameSettings.showWaterLevel = e.target.checked;
      document.getElementById('hud-water-container').style.display = gameSettings.showWaterLevel ? 'flex' : 'none';
      saveSettings();
    });

    document.querySelectorAll('#control-graphics .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#control-graphics .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameSettings.graphicsQuality = btn.getAttribute('data-quality');
        saveSettings();
      });
    });
  },

  initMascotCanvas() {
    const mascotCanvas = document.getElementById('mascot-canvas');
    if (!mascotCanvas) return;
    const mctx = mascotCanvas.getContext('2d');

    const animateMascot = (t) => {
      mctx.clearRect(0, 0, mascotCanvas.width, mascotCanvas.height);
      const timeSec = t * 0.001;

      // Draw mini animated fish character
      mctx.save();
      mctx.translate(60, 65);

      // Body
      mctx.fillStyle = '#eab308';
      mctx.beginPath();
      mctx.roundRect(-16, -6, 32, 22, 6);
      mctx.fill();

      // Fish Head
      mctx.fillStyle = '#ff6b4a';
      mctx.beginPath();
      mctx.ellipse(0, -22, 20, 18, 0, 0, Math.PI * 2);
      mctx.fill();
      mctx.strokeStyle = '#e11d48';
      mctx.lineWidth = 2;
      mctx.stroke();

      // Fin
      mctx.fillStyle = '#f43f5e';
      mctx.beginPath();
      mctx.moveTo(-6, -38);
      mctx.lineTo(0, -48);
      mctx.lineTo(6, -38);
      mctx.fill();

      // Big Eyes
      const blink = (Math.sin(timeSec * 2) > 0.95);
      if (!blink) {
        mctx.fillStyle = '#ffffff';
        mctx.beginPath();
        mctx.arc(-8, -24, 6, 0, Math.PI * 2);
        mctx.arc(8, -24, 6, 0, Math.PI * 2);
        mctx.fill();

        mctx.fillStyle = '#0f172a';
        mctx.beginPath();
        mctx.arc(-7, -23, 3, 0, Math.PI * 2);
        mctx.arc(9, -23, 3, 0, Math.PI * 2);
        mctx.fill();
      } else {
        mctx.strokeStyle = '#0f172a';
        mctx.lineWidth = 2;
        mctx.beginPath();
        mctx.moveTo(-11, -24);
        mctx.lineTo(-5, -24);
        mctx.moveTo(5, -24);
        mctx.lineTo(11, -24);
        mctx.stroke();
      }

      // Mouth
      mctx.fillStyle = '#be123c';
      mctx.beginPath();
      mctx.ellipse(0, -12, 4, 3, 0, 0, Math.PI * 2);
      mctx.fill();

      mctx.restore();

      if (this.state === 'MENU') {
        requestAnimationFrame(animateMascot);
      }
    };

    requestAnimationFrame(animateMascot);
  },

  gameLoop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;
    const timeSec = currentTime * 0.001;

    // Update
    if (this.state === 'PLAYING') {
      const stageConfig = StageSystem.getStageConfig();
      Player.update(dt, this.input);
      WaterSystem.update(dt);
      TimerSystem.update(dt);
      HazardSystem.update(dt, stageConfig);
      this.updateHUD();
      this.updateCamera();
    }

    // Render
    this.render(timeSec);

    requestAnimationFrame(t => this.gameLoop(t));
  },

  updateCamera() {
    // Center camera on player with smooth lerp
    const targetX = this.canvas.width / 2 - Player.x;
    const targetY = this.canvas.height / 2 - Player.y;

    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;
  },

  updateHUD() {
    // Water level display
    const waterPct = Math.floor(WaterSystem.level);
    const barEl = document.getElementById('hud-water-bar');
    const pctEl = document.getElementById('hud-water-pct');
    const statusEl = document.getElementById('hud-water-status');

    if (barEl) barEl.style.width = `${waterPct}%`;
    if (pctEl) pctEl.textContent = `${waterPct}%`;

    if (statusEl) {
      if (waterPct < 30) {
        statusEl.textContent = 'ปกติ (Normal)';
        statusEl.style.color = '#38bdf8';
      } else if (waterPct < 60) {
        statusEl.textContent = 'เริ่มอันตราย (Rising)';
        statusEl.style.color = '#facc15';
      } else if (waterPct < 80) {
        statusEl.textContent = 'บ้านเริ่มจมน้ำ (Flooding)';
        statusEl.style.color = '#f97316';
      } else {
        statusEl.textContent = 'อันตรายมาก! (CRITICAL)';
        statusEl.style.color = '#ef4444';
      }
    }

    // Timer display
    const timerTextEl = document.getElementById('hud-timer-text');
    if (timerTextEl) {
      timerTextEl.textContent = TimerSystem.getFormattedTime();
      if (TimerSystem.remaining < 30) {
        timerTextEl.classList.add('warning');
      } else {
        timerTextEl.classList.remove('warning');
      }
    }

    // Stamina / Sprint Gauge display
    const staminaFill = document.getElementById('stamina-bar-fill');
    const staminaPct = document.getElementById('stamina-pct');
    if (staminaFill && staminaPct) {
      const pct = Math.max(0, Math.min(100, Math.floor((Player.stamina / Player.maxStamina) * 100)));
      staminaFill.style.width = `${pct}%`;
      staminaPct.textContent = `${pct}%`;
      if (pct < 20) {
        staminaFill.style.background = '#ef4444';
      } else {
        staminaFill.style.background = 'linear-gradient(90deg, #eab308 0%, #38bdf8 100%)';
      }
    }

    // Interaction tooltip prompt
    const tooltip = document.getElementById('interact-tooltip');
    const tooltipText = document.getElementById('interact-text');
    let nearbyText = null;

    // Check near item
    for (const item of Inventory.items) {
      if (!item.collected && item.floor === Player.floor) {
        if (Math.hypot(Player.x - item.x, Player.y - item.y) < 75) {
          nearbyText = `กด [E] เก็บ ${item.name.split(' ')[0]}`;
          break;
        }
      }
    }

    // Check near stairs
    if (!nearbyText) {
      const stairs = STAIRS[Player.floor];
      if (stairs && Math.hypot(Player.x - (stairs.x + stairs.w / 2), Player.y - (stairs.y + stairs.h / 2)) < 60) {
        nearbyText = `กด [E] เพื่อขึ้น/ลง ${stairs.label}`;
      }
    }

    // Check near escape
    if (!nearbyText && Player.floor === ESCAPE_ZONE.floor) {
      if (Math.hypot(Player.x - ESCAPE_ZONE.x, Player.y - ESCAPE_ZONE.y) < ESCAPE_ZONE.radius) {
        nearbyText = `กด [E] เพื่อหนีภัย (ESCAPE!)`;
      }
    }

    if (nearbyText) {
      tooltipText.textContent = nearbyText;
      tooltip.classList.add('active');
    } else {
      tooltip.classList.remove('active');
    }
  },

  render(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'MENU') {
      // Animated Menu Background
      this.renderMenuBackground(ctx, time);
      return;
    }

    // In-Game Scene with Camera Transform
    ctx.save();
    ctx.translate(Math.round(this.camera.x), Math.round(this.camera.y));

    // 1. Render House Rooms & Floors
    this.renderHouseFloor(ctx, Player.floor);

    // 2. Render Furniture & Colliders
    this.renderFurniture(ctx, Player.floor);

    // 3. Render Stairs
    this.renderStairs(ctx, Player.floor);

    // 4. Render Escape Zone (Floor 2)
    if (Player.floor === ESCAPE_ZONE.floor) {
      this.renderEscapeZone(ctx, time);
    }

    // 5. Render Collectible Items
    this.renderItems(ctx, Player.floor, time);

    // 5.5 Render Hazards Layer (Floating Debris, Electric Sparks)
    HazardSystem.render(ctx, Player.floor, time);

    // 6. Render Player Character
    Player.render(ctx, time);

    // 7. Render Dynamic Water Simulation Layer
    WaterSystem.render(ctx, time);

    ctx.restore();
  },

  renderMenuBackground(ctx, time) {
    // Beautiful deep water gradients and floating bubbles for menu
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#070e1b');
    grad.addColorStop(0.6, '#0f172a');
    grad.addColorStop(1, '#0e7490');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Dynamic wave ripples in menu
    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, this.canvas.height);
    for (let x = 0; x <= this.canvas.width; x += 40) {
      const y = this.canvas.height - 120 + Math.sin(x * 0.01 + time * 2) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.canvas.width, this.canvas.height);
    ctx.closePath();
    ctx.fill();
  },

  renderHouseFloor(ctx, floor) {
    // Outer house wall shadow
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 20, WORLD_WIDTH - 40, WORLD_HEIGHT - 40);

    // Render each room on this floor
    ROOMS_CONFIG.filter(r => r.floor === floor).forEach(r => {
      // Room floor tile
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      // Floor grid / wooden plank lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let gx = r.x; gx < r.x + r.w; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, r.y);
        ctx.lineTo(gx, r.y + r.h);
        ctx.stroke();
      }
      for (let gy = r.y; gy < r.y + r.h; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(r.x, gy);
        ctx.lineTo(r.x + r.w, gy);
        ctx.stroke();
      }

      // Room Name Banner on Floor
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText(r.name, r.x + 14, r.y + 24);
    });

    // Walls
    const colliders = COLLIDERS[floor] || [];
    ctx.fillStyle = '#334155';
    colliders.forEach(c => {
      if (!c.name) {
        // Wall
        ctx.fillStyle = '#475569';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x, c.y, c.w, c.h);
      }
    });
  },

  renderFurniture(ctx, floor) {
    const colliders = COLLIDERS[floor] || [];
    colliders.forEach(c => {
      if (c.name) {
        // Draw Furniture
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;

        if (c.name.includes('Sofa')) {
          ctx.fillStyle = '#1e3a8a';
          ctx.beginPath();
          ctx.roundRect(c.x, c.y, c.w, c.h, 10);
          ctx.fill();
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(c.x + 10, c.y + 10, c.w - 20, c.h - 20);
        } else if (c.name.includes('Bed')) {
          ctx.fillStyle = '#4c1d95';
          ctx.beginPath();
          ctx.roundRect(c.x, c.y, c.w, c.h, 8);
          ctx.fill();
          ctx.fillStyle = '#f8fafc'; // pillows
          ctx.fillRect(c.x + 15, c.y + 10, 40, 25);
          ctx.fillRect(c.x + 65, c.y + 10, 40, 25);
          ctx.fillStyle = '#6d28d9'; // blanket
          ctx.fillRect(c.x + 10, c.y + 45, c.w - 20, c.h - 55);
        } else if (c.name.includes('Fridge')) {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.roundRect(c.x, c.y, c.w, c.h, 6);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(c.x + 8, c.y + 35, c.w - 16, 2);
        } else if (c.name.includes('Table') || c.name.includes('Desk')) {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(c.x, c.y, c.w, c.h, 6);
          ctx.fill();
          ctx.fillStyle = '#92400e';
          ctx.fillRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
        } else if (c.name.includes('Bathtub')) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(c.x, c.y, c.w, c.h, 16);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(c.x + 12, c.y + 12, c.w - 24, c.h - 24);
        } else {
          // General wooden cabinet/storage
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.roundRect(c.x, c.y, c.w, c.h, 4);
          ctx.fill();
        }

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Outfit, sans-serif';
        ctx.fillText(c.name, c.x + 6, c.y + c.h - 6);

        ctx.restore();
      }
    });
  },

  renderStairs(ctx, floor) {
    const s = STAIRS[floor];
    if (!s) return;

    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(s.x, s.y, s.w, s.h);

    // Step treads
    ctx.fillStyle = '#b45309';
    for (let sy = s.y; sy < s.y + s.h; sy += 14) {
      ctx.fillRect(s.x, sy, s.w, 10);
    }

    // Direction arrow
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText(floor === 1 ? '▲ ไปชั้น 2' : '▼ ลงชั้น 1', s.x + 10, s.y + s.h / 2 + 4);
    ctx.restore();
  },

  renderEscapeZone(ctx, time) {
    const ez = ESCAPE_ZONE;
    ctx.save();
    // Safety hazard striped circle
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(ez.x, ez.y, ez.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Rescue Boat / Helicopter Beacon
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.beginPath();
    ctx.arc(ez.x, ez.y, ez.radius - 10, 0, Math.PI * 2);
    ctx.fill();

    // Beacon pulsing light
    const pulse = Math.sin(time * 6) * 10;
    ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
    ctx.beginPath();
    ctx.arc(ez.x, ez.y, 25 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚤', ez.x, ez.y + 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('ESCAPE POINT (จุดหนีภัย)', ez.x, ez.y + 45);
    ctx.restore();
  },

  renderItems(ctx, floor, time) {
    Inventory.items.forEach(item => {
      if (item.collected || item.floor !== floor) return;

      const floatY = Math.sin(time * 4 + item.hoverOffset) * 5;
      const x = item.x;
      const y = item.y + floatY;

      ctx.save();
      // Glowing aura
      ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Item icon
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, x, y);

      // Name tag
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillText(item.name.split(' ')[0], x, y + 20);

      ctx.restore();
    });
  }
};

// --------------------------------------------------------
// 10. UI CONTROLLER
// --------------------------------------------------------
const UI = {
  showModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  hideAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.getElementById('main-menu-screen')?.classList.add('hidden');
  },

  showHUD(show) {
    const hud = document.getElementById('game-hud');
    if (hud) {
      if (show) hud.classList.add('active');
      else hud.classList.remove('active');
    }
  },

  updateRoomBanner(roomName, floor) {
    const roomEl = document.getElementById('hud-room-name');
    const floorEl = document.getElementById('hud-floor-indicator');
    if (roomEl) roomEl.textContent = `📍 ${roomName}`;
    if (floorEl) floorEl.textContent = `ชั้น ${floor}`;
  },

  showItemToast(itemName) {
    const toast = document.getElementById('item-collected-toast');
    const nameEl = document.getElementById('toast-item-name');
    if (!toast || !nameEl) return;

    nameEl.textContent = itemName;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  },

  showQuestCompleteToast(title, rewardText) {
    const toast = document.getElementById('quest-complete-toast');
    const titleEl = document.getElementById('quest-complete-title');
    const rewardEl = document.getElementById('quest-complete-reward');
    if (!toast) return;

    if (titleEl) titleEl.textContent = title;
    if (rewardEl) rewardEl.textContent = `ได้รับ: ${rewardText}`;

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }
};

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
