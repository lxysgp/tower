
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
stompSound.volume = 1.0;

let player = { x: 200, y: 500, w: 30, h: 30, vy: 0 };
let platforms = [], coinItems = [], spikes = [], enemies = [];
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

  if (!localStorage.getItem("seenTutorial")) {
    document.getElementById('tutorial').style.display = 'block';
    localStorage.setItem("seenTutorial", "true");
  }
}

function hideTutorial() {
  document.getElementById('tutorial').style.display = 'none';
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
  bgMusic.pause();
  gameOverSound.currentTime = 0;
  gameOverSound.play();
}

function goHome() {
  screen = 'home';
  document.getElementById('ui').innerHTML = `
  <h1>Skibidi Jumper</h1>
  <p>Total Coins: <span id="coinCount">${totalCoins}</span></p>
  <p style="color: gold; text-shadow: 0 0 8px gold;">🏆 High Score: ${Math.floor(highScore)}</p>
  <button onclick="startGame()">Play</button>
  <button onclick="alert('Shop coming soon!')">Shop</button>
  <button onclick="resetHighScore()" style="background: #f00; color: white; box-shadow: 0 0 15px red;">
    Reset Highscore
  </button>
`;
  document.getElementById('ui').style.display = 'flex';
  bgMusic.pause();
}

function resetHighScore() {
  highScore = 0;
  localStorage.removeItem('skibidiHigh');
  goHome();
}
