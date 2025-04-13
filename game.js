
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
  initGame();
  requestAnimationFrame(gameLoop);
  bgMusic.currentTime = 0;
bgMusic.volume = 0.5;
bgMusic.play();

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

  if (isNewHigh) launchConfetti();
}


function goHome() {
  screen = 'home';
  document.getElementById('shop').style.display = 'none'; // hide shop
  document.getElementById('gameCanvas').style.display = 'block'; // 🔥 Show canvas
  document.getElementById('ui').innerHTML = `
    <h1>Skibidi Jumper</h1>
    <p>Total Coins: <span id="coinCount">${totalCoins}</span></p>
    <p style="color: gold; text-shadow: 0 0 8px gold;">🏆 High Score: ${Math.floor(highScore)}</p>
    <button onclick="startGame()">Play</button>
    <button onclick="openShop()">Shop</button>
    <button onclick="resetHighScore()" style="background: #f00; color: white; box-shadow: 0 0 15px red;">Reset Highscore</button>
  `;
  document.getElementById('ui').style.display = 'flex';
}



function initGame() {
  player = { x: 200, y: 500, w: 30, h: 30, vy: -10 };
  platforms = [];
  coinItems = [];
  spikes = [];
  enemies = [];
  score = 0;
  coins = 0;

  // Always create long safe base platform at y = 600
  platforms.push({ x: 0, y: 600, w: 400, h: 10 });

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

  if (!safe && Math.random() < 0.15)
    spikes.push({ x: x + 10, y: y - 10, w: 15, h: 15 });

  if (!safe && Math.random() < 0.25)
    enemies.push({ x: x, y: y - 30, w: 30, h: 30, dir: 1 });
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

  // Scroll up
  if (player.y < 300) {
    let dy = 300 - player.y;
    player.y = 300;
    for (let arr of [platforms, coinItems, spikes, enemies]) {
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

  // Coin collision
  for (let i = coinItems.length - 1; i >= 0; i--) {
    let c = coinItems[i];
    let dx = player.x + player.w/2 - c.x;
    let dy = player.y + player.h/2 - c.y;
    if (Math.sqrt(dx*dx + dy*dy) < c.r + 15) {
      coins++;
      totalCoins++;
      coinItems.splice(i, 1);
    }
  }

  // Spike collision
  for (let s of spikes) {
    if (player.x < s.x + s.w &&
        player.x + player.w > s.x &&
        player.y < s.y + s.h &&
        player.y + player.h > s.y) {
      showGameOver();
      return;
    }
  }

for (let i = enemies.length - 1; i >= 0; i--) {
  let e = enemies[i];
  e.x += e.dir * 2;
  if (e.x < 0 || e.x + e.w > 400) e.dir *= -1;

  // Check collision
  if (player.x < e.x + e.w &&
      player.x + player.w > e.x &&
      player.y < e.y + e.h &&
      player.y + player.h > e.y) {
    
    let playerBottom = player.y + player.h;
    let enemyTop = e.y;
    
    if (player.vy > 0 && playerBottom - player.vy <= enemyTop + 5) {
  // Stomp kill
  stompSound.currentTime = 0;
  stompSound.play();
  enemies.splice(i, 1);
  player.vy = -10; // bounce
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


  if (player.y > 600) {
    showGameOver();
    return;
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
