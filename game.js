const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let screen = 'home';
let coins = 0;
let totalCoins = 0;
let highScore = parseFloat(localStorage.getItem('skibidiHigh')) || 0;
let isNewHigh = false;
const bgMusic = document.getElementById('bgMusic');
const gameOverSound = document.getElementById('gameOverSound');
const stompSound = document.getElementById('stompSound');
stompSound.volume = 1.0; // MAX volume (1.0 is max, 0.0 is mute)
let ownedColors = JSON.parse(localStorage.getItem('ownedColors')) || ['default'];
let playerColor = localStorage.getItem('playerColor') || 'default';
let upgrades = JSON.parse(localStorage.getItem('skibidiUpgrades')) || {};
let xp = parseInt(localStorage.getItem('xp')) || 0;
let level = parseInt(localStorage.getItem('level')) || 1;
let lastLevelReward = parseInt(localStorage.getItem('lastLevelReward')) || 0;
let jetpacks = [];           // List of jetpack items on screen
let jetpackActive = false;   // Is player invincible?
let jetpackTimer = 0;        // How long jetpack lasts (frames)

let xpToNext = level * 100;
let player = { x: 200, y: 500, w: 30, h: 30, vy: 0 };
let platforms = [];
let coinItems = [];
let spikes = [];
let enemies = [];
let score = 0;
let gravity = 0.4;
let keys = {};

document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function startGame() {
  screen = 'game';

  document.getElementById('ui').style.display = 'none';
  document.getElementById('shop').style.display = 'none'; // ✅ Hide shop
  document.getElementById('tutorial').style.display = 'none';
  document.getElementById('gameCanvas').style.display = 'block'; // ✅ Ensure canvas visible

  initGame();
  requestAnimationFrame(gameLoop);

  bgMusic.currentTime = 0;
  bgMusic.volume = 0.5;
  bgMusic.play();

  // Show tutorial only once
  if (!localStorage.getItem("seenTutorial")) {
    document.getElementById('tutorial').style.display = 'block';
    localStorage.setItem("seenTutorial", "true");
  }
}
function deleteProgress() {
  document.getElementById('deleteConfirm').style.display = 'flex';
}

function confirmDelete() {
  localStorage.removeItem('xp');
  localStorage.removeItem('level');
  localStorage.removeItem('lastLevelReward');
  localStorage.removeItem('skibidiHigh');
  localStorage.removeItem('ownedColors');
  localStorage.removeItem('playerColor');
  localStorage.removeItem('skibidiUpgrades');

  xp = 0;
  level = 1;
  xpToNext = 100;
  lastLevelReward = 0;
  totalCoins = 0;
  ownedColors = ['default'];
  playerColor = 'default';
  upgrades = {};

  document.getElementById('deleteConfirm').style.display = 'none';
  goHome();
}

function cancelDelete() {
  document.getElementById('deleteConfirm').style.display = 'none';
}


function showGameOver() {
  screen = 'gameOver';
  isNewHigh = score > highScore;
  if (isNewHigh) {
    highScore = score;
    localStorage.setItem('skibidiHigh', highScore);
  }

  document.getElementById('ui').innerHTML = `
    <h1>Game Over</h1>
    <p>Score: ${Math.floor(score)}</p>
    ${isNewHigh ? '<h2 style="color: gold; text-shadow: 0 0 10px gold;">🏆 Highscore!</h2>' : ''}
    <p>Coins this run: ${coins}</p>
    <p>High Score: ${Math.floor(highScore)}</p>
    <button onclick="startGame()">Play Again</button>
    <button onclick="goHome()">Home</button>
  `;
  document.getElementById('ui').style.display = 'flex';
  localStorage.setItem('xp', xp);
localStorage.setItem('level', level);

  if (isNewHigh) launchConfetti();
}


function goHome() {
  screen = 'home';

  document.getElementById('shop').style.display = 'none';
  document.getElementById('gameCanvas').style.display = 'block';
  document.getElementById('ui').style.display = 'flex';
localStorage.setItem('xp', xp);
localStorage.setItem('level', level);

  document.getElementById('ui').innerHTML = `
    <h1>Skibidi Jumper</h1>
    <p>Total Coins: <span id="coinCount">${totalCoins}</span></p>
    <p style="color: gold; text-shadow: 0 0 8px gold;">🏆 High Score: ${Math.floor(highScore)}</p>
    <div id="xpBarHome"></div>
    <button onclick="startGame()">Play</button>
    <button onclick="openShop()">Shop</button>
    <button onclick="resetHighScore()" style="background: #f00; color: white; box-shadow: 0 0 15px red;">
      Reset Highscore
    </button>
  `;
  const xpPercent = Math.floor((xp / xpToNext) * 100);
document.getElementById('xpBarHome').innerHTML = `
  <p style="margin-bottom: 4px; color: white;">Level ${level} – XP: ${xp} / ${xpToNext}</p>
  <div style="width: 200px; height: 10px; background: #444; border: 1px solid #fff; margin: auto;">
    <div style="width: ${xpPercent}%; height: 100%; background: #0ff;"></div>
  </div>
`;

}




function initGame() {
  player = { x: 200, y: 500, w: 30, h: 30, vy: -10 };
  platforms = [];
  coinItems = [];
  spikes = [];
  enemies = [];
  score = 0;
  coins = 0;
  jetpacks = [];
jetpackActive = false;
jetpackTimer = 0;

  // Always create long safe base platform at y = 600
  platforms.push({ x: 0, y: 600, w: 400, h: 10 });
player = { x: 200, y: 500, w: 30, h: 30, vy: -10 };
player.reached1500 = false;
player.reached2500 = false;

  // Now generate other platforms ABOVE it
  for (let i = 1; i < 10; i++) {
    let y = 600 - i * 60;
    let safe = i < 4; // First 3 above base are totally safe (no spikes/enemies)
    generatePlatform(y, safe);
  }
}


function generatePlatform(y, safe = false) {
  if (y === 600) return; // just in case — skip accidental overwrite of base

  let x = Math.random() * 320;
  platforms.push({ x, y, w: 80, h: 10 });

  if (!safe && Math.random() < 0.4)
    coinItems.push({ x: x + 30, y: y - 20, r: 7 });

  if (!safe && Math.random() < 0.09) //spike
    spikes.push({ x: x + 10, y: y - 10, w: 15, h: 15 });

  if (!safe && Math.random() < 0.07) //enemies
    enemies.push({ x: x, y: y - 30, w: 30, h: 30, dir: 1 });
  if (!safe && Math.random() < 0.015) {
  jetpacks.push({ x: x + 25, y: y - 30, w: 20, h: 30 });
}
}


function gameLoop() {
  if (screen !== 'game') return;
  ctx.clearRect(0, 0, 400, 600);

  player.vy += gravity;
  player.y += player.vy;

  if (keys['ArrowLeft']) player.x -= 5;
  if (keys['ArrowRight']) player.x += 5;
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > 400) player.x = 370;
if (jetpackActive) {
  jetpackTimer--;
  if (jetpackTimer <= 0) jetpackActive = false;
}
  if (jetpackTimer <= 0){
    jetpackActive = false;
  }

  // Scroll up
  if (player.y < 300) {
    let dy = 300 - player.y;
    player.y = 300;
    for (let arr of [platforms, coinItems, spikes, enemies, jetpacks]) {
      for (let item of arr) item.y += dy;
    }
    score += dy;
  }
  
  // Platform collision
  for (let p of platforms) {
    if (player.vy > 0 &&
        player.x + player.w > p.x &&
        player.x < p.x + p.w &&
        player.y + player.h > p.y &&
        player.y + player.h < p.y + 10) {
      player.vy = -10;
    }
  }
  //jetpack
for (let i = jetpacks.length - 1; i >= 0; i--) {
  let j = jetpacks[i];
  if (
    player.x < j.x + j.w &&
    player.x + player.w > j.x &&
    player.y < j.y + j.h &&
    player.y + player.h > j.y
  ) {
    jetpacks.splice(i, 1);
    player.vy = -20;          // Big boost
    jetpackActive = true;
    jetpackTimer = 669;       // 3 seconds at 60fps
    xp += 20;
  }
}

  // Coin collision
  for (let i = coinItems.length - 1; i >= 0; i--) {
    let c = coinItems[i];
    let dx = player.x + player.w/2 - c.x;
    let dy = player.y + player.h/2 - c.y;
    if (Math.sqrt(dx*dx + dy*dy) < c.r + 15) {
  coins++;
  totalCoins++;
  xp += 2 + Math.floor(Math.random() * 2); // 2–3 XP
  coinItems.splice(i, 1);
}

  }

  // Spike collision
  for (let s of spikes) {
  const spikeTop = s.y;
  const playerBottom = player.y + player.h;

  const horizontalOverlap =
    player.x < s.x + s.w &&
    player.x + player.w > s.x;

  const verticalOverlap =
    playerBottom > spikeTop &&
    player.y < s.y + s.h;

  const isComingFromAbove =
    player.vy > 0 && playerBottom - player.vy <= spikeTop + 2;

  if (horizontalOverlap && verticalOverlap && isComingFromAbove) {
    showGameOver();
    return;
  }
}


for (let i = enemies.length - 1; i >= 0; i--) {
  let e = enemies[i];
  e.x += e.dir * 2;
  if (e.x < 0 || e.x + e.w > 400) e.dir *= -1;

  // Check collision
  if (!jetpackActive &&
    player.x < e.x + e.w &&
    player.x + player.w > e.x &&
    player.y < e.y + e.h &&
    player.y + player.h > e.y)
 {
    
    let playerBottom = player.y + player.h;
    let enemyTop = e.y;
    
    if (player.vy > 0 && playerBottom - player.vy <= enemyTop + 5) {
  // Stomp kill
  stompSound.currentTime = 0;
stompSound.play();
enemies.splice(i, 1);
player.vy = -10;
xp += 2 + Math.floor(Math.random() * 2); // 2–3 XP

  continue;
}
 else {
      // Hit from side or below
      showGameOver();
      return;
    }
  }
}


  // Generate more
  while (platforms[platforms.length - 1].y > 0) {
    generatePlatform(platforms[platforms.length - 1].y - 60);
  }

  // Clean up
  platforms = platforms.filter(p => p.y < 600);
  coinItems = coinItems.filter(c => c.y < 600);
  spikes = spikes.filter(s => s.y < 600);
  enemies = enemies.filter(e => e.y < 600);
//jetpack
ctx.fillStyle = 'orange';
ctx.font = '16px Arial';
for (let j of jetpacks) {
  ctx.fillText("🔷", j.x, j.y);
}


  // Draw coins (under everything)
ctx.fillStyle = 'gold';
ctx.font = 'bold 12px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
for (let c of coinItems) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'black';
  ctx.fillText('$', c.x, c.y);
  ctx.fillStyle = 'gold';
}

// Draw spikes (below platforms)
ctx.fillStyle = 'red';
for (let s of spikes) {
  ctx.beginPath();
  ctx.moveTo(s.x, s.y + s.h);
  ctx.lineTo(s.x + s.w / 2, s.y);
  ctx.lineTo(s.x + s.w, s.y + s.h);
  ctx.closePath();
  ctx.fill();
}

// NOW draw platforms over spikes
ctx.fillStyle = '#0f0';
for (let p of platforms)
  ctx.fillRect(p.x, p.y, p.w, p.h);

// Draw enemies
ctx.fillStyle = 'purple';
for (let e of enemies)
  ctx.fillRect(e.x, e.y, e.w, e.h);

// Draw player
let colorMap = {
  default: 'white',
  red: 'red',
  blue: 'blue',
  green: 'lime',
  gold: 'gold'
};
ctx.fillStyle = colorMap[playerColor] || 'white';
ctx.fillRect(player.x, player.y, player.w, player.h);
ctx.fillStyle = 'white';
ctx.font = 'bold 18px Arial';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
ctx.fillText('Score: ' + Math.floor(score), 10, 10);
ctx.fillText('Coins: ' + coins, 10, 35);
let barWidth = 200;
let filled = (xp / xpToNext) * barWidth;
ctx.fillStyle = '#444';
ctx.fillRect(10, 60, barWidth, 10);
ctx.fillStyle = '#0ff';
ctx.fillRect(10, 60, filled, 10);
ctx.strokeStyle = '#fff';
ctx.strokeRect(10, 60, barWidth, 10);
ctx.fillStyle = 'white';
ctx.font = '12px Arial';
ctx.fillText(`XP: ${xp}/${xpToNext}`, 10, 75);

  if (player.y > 600) {
    showGameOver();
    return;
  }
  if (!player.reached1500 && score >= 1500) {
  xp += 25;
  player.reached1500 = true;
}

if (!player.reached2500 && score >= 2500) {
  xp += 50;
  player.reached2500 = true;
}
if (xp >= xpToNext) {
  xp -= xpToNext;
  level++;
  xpToNext = level * 100;
  lastLevelReward+= 5;
  totalCoins += lastLevelReward;

  localStorage.setItem('level', level);
  localStorage.setItem('xp', xp);
  localStorage.setItem('lastLevelReward', lastLevelReward);

  showLevelUp(level, lastLevelReward);
}



  requestAnimationFrame(gameLoop);
}
function launchConfetti() {
  for (let i = 0; i < 100; i++) {
    setTimeout(() => createConfetti(), Math.random() * 1000); // random delay
  }
}

function createConfetti() {
  const confetti = document.createElement('div');
  const size = Math.random() * 6 + 4; // 4px to 10px
  const left = Math.random() * window.innerWidth;
  const color = ['#ff0', '#f0f', '#0ff', '#0f0', '#f00'][Math.floor(Math.random() * 5)];
  const duration = Math.random() * 1.5 + 1.5; // 1.5 to 3 seconds

  confetti.style.position = 'fixed';
  confetti.style.width = `${size}px`;
  confetti.style.height = `${size}px`;
  confetti.style.backgroundColor = color;
  confetti.style.left = `${left}px`;
  confetti.style.top = '-10px';
  confetti.style.opacity = '1';
  confetti.style.zIndex = 9999;
  confetti.style.borderRadius = '2px';
  confetti.style.pointerEvents = 'none';
  confetti.style.transition = `top ${duration}s ease-out, opacity ${duration}s ease-out`;

  document.body.appendChild(confetti);

  // Start the animation after rendering
  requestAnimationFrame(() => {
    confetti.style.top = window.innerHeight + 'px';
    confetti.style.opacity = '0';
  });

  setTimeout(() => {
    confetti.remove();
  }, duration * 1000 + 200);
}
function resetHighScore() {
  highScore = 0;
  localStorage.removeItem('skibidiHigh');
  goHome(); // refresh home screen UI
}
function hideTutorial() {
  document.getElementById('tutorial').style.display = 'none';
}

function startGame() {
  screen = 'game';
  document.getElementById('ui').style.display = 'none';
  initGame();
  requestAnimationFrame(gameLoop);
  bgMusic.currentTime = 0;
  bgMusic.volume = 0.5;
  bgMusic.play();

  // 👇 Show tutorial only once per player
  if (!localStorage.getItem("seenTutorial")) {
    document.getElementById('tutorial').style.display = 'block';
    localStorage.setItem("seenTutorial", "true");
  }
}
function showLevelUp(newLvl, rewardCoins) {
  document.getElementById('newLevel').textContent = `Level ${newLvl}`;
  document.getElementById('levelCoins').textContent = `+${rewardCoins}`;
  document.getElementById('levelUpPopup').style.display = 'flex';
}

function closeLevelUp() {
  document.getElementById('levelUpPopup').style.display = 'none';
}

function openShop() {
  document.getElementById('ui').style.display = 'none';
  document.getElementById('gameCanvas').style.display = 'none'; // 🔥 Hide canvas
  document.getElementById('shop').style.display = 'flex';
  document.getElementById('shopCoinCount').innerText = totalCoins;
}

window.openShop = openShop;
function buyUpgrade(name, cost) {
  if (upgrades[name]) {
    alert("Already bought!");
    return;
  }
  if (totalCoins < cost) {
    alert("Not enough coins!");
    return;
  }
  totalCoins -= cost;
  upgrades[name] = true;
  localStorage.setItem('skibidiUpgrades', JSON.stringify(upgrades));
  document.getElementById('shopCoinCount').innerText = totalCoins;
  alert(`Bought ${name} upgrade!`);
}
window.buyUpgrade = buyUpgrade;
function buyColor(color, cost) {
  if (ownedColors.includes(color)) {
    alert(`You already own ${color}`);
    return;
  }
  if (totalCoins < cost) {
    alert("Not enough coins!");
    return;
  }
  totalCoins -= cost;
  ownedColors.push(color);
  localStorage.setItem('ownedColors', JSON.stringify(ownedColors));
  document.getElementById('shopCoinCount').innerText = totalCoins;
  alert(`Unlocked ${color} skin!`);
}
window.buyColor = buyColor;

function equipColor(color) {
  if (!ownedColors.includes(color)) {
    alert("You don't own this color yet!");
    return;
  }
  playerColor = color;
  localStorage.setItem('playerColor', playerColor);
  alert(`Equipped ${color} skin!`);
}
window.equipColor = equipColor;

window.startGame = startGame;
window.goHome = goHome;
window.resetHighScore = resetHighScore;
window.hideTutorial = hideTutorial;
