// gg_rwd.js － 僅負責 RWD 與遊戲畫面尺寸

const body   = document.body;
const center = document.getElementById('slot-center');
const bottom = document.getElementById('slot-bottom');
const slotL  = document.getElementById('slot-left');
const slotR  = document.getElementById('slot-right');
const panelL = document.getElementById('panel-leaf');
const panelR = document.getElementById('panel-geek');
const game   = document.getElementById('game');

function move(parent, child) {
  if (parent && child && child.parentNode !== parent) {
    parent.appendChild(child);
  }
}

function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isLandscape = w >= h;

  body.classList.toggle('landscape', isLandscape);
  body.classList.toggle('portrait', !isLandscape);

  if (isLandscape) {
    move(slotL, panelL);
    move(slotR, panelR);
  } else {
    move(bottom, panelL);
    move(bottom, panelR);
  }

  let size;

  if (isLandscape) {
    // ★ 回到橫版：先把直版時塞進去的 inline style 全清掉
    center.style.flex   = '';
    center.style.height = '';
    bottom.style.flex   = '';

    const rect = center.getBoundingClientRect();
    size = Math.min(rect.width, rect.height);
  } else {
    // 直版：上半部 = 正方形遊戲區；下半部 = panel
    const bottomH = bottom.offsetHeight || 0;
    const maxW = w;
    const maxH = h - bottomH;
    size = Math.min(maxW, maxH);

    center.style.height = size + 'px';
    center.style.flex   = '0 0 ' + size + 'px';
    bottom.style.flex   = '1 1 auto';
  }

  game.style.width  = size + 'px';
  game.style.height = size + 'px';
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
window.addEventListener('load', layout);