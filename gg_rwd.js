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
    // bottomH 量測用「內容自然高度」(不含 flex:1 撐開的量)，讓遊戲畫面盡量大；
    // 但 slot-bottom 本身仍撐滿剩餘空間 —— 面板內部用 .control-block(貼上緣，靠近遊戲)
    // 跟 .panel-foot(margin-top:auto，貼下緣) 分工，剩餘空間變成兩者之間刻意的安全間距，
    // 不是死白留白(死白留白 bug 是「主控制器本身被推到面板正中間」，已在 CSS 修掉)。
    bottom.style.flex = '';
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