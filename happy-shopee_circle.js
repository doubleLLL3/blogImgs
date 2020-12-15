const P_SIZE = 50;
const C_ORANGE = '#EE4D3D';
const C_BLUE = '#113366';

const sleep = t => new Promise(rsv => setTimeout(rsv, t));
const writtenShopee = '[[]]';

const elementInViewport = el => {
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = el.offsetHeight;

  while(el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return (
    top < (window.pageYOffset + window.innerHeight) &&
    left < (window.pageXOffset + window.innerWidth) &&
    (top + height) > window.pageYOffset &&
    (left + width) > window.pageXOffset
  );
}

const HackAllTexts = () => {
  const createML = txt => {
    const m = document.createElement('ML');
    m.innerText = txt;
    return m;
  };
  
  [...document.querySelectorAll('body *:not(style):not(script):not(noscript)')]
    .forEach(e => {
      if (e && e.childNodes && e.children && e.children.length !== e.childNodes.length) {
        e.childNodes.forEach(a => a.nodeName === '#text' && e.replaceChild(createML(a.textContent), a));
      }

      if (e && e.style) {
        const s = getComputedStyle(e);
        (s.color === 'transparent' || s.display === 'none' || `${s.opacity}` === '0') && e.classList.add('xhidden');
      }
    });
  
  const validEles = [...document.querySelectorAll('body :not(.xhidden) *:not(style):not(script):not(noscript)')]
    .filter(e => e && e.offsetParent && !e.children.length && e.innerText && e.innerText.trim())
    .filter(e => elementInViewport(e))

  validEles.forEach(e => (e.innerHTML = Array.from(e.innerText).map(c => c === ' ' ? c : `<mn>${c}</mn>`).join('')));
  return [...document.querySelectorAll('mn')];
}

const CreateCanvas = () => {
  const canvas = document.createElement('canvas');
        canvas.style.height = '100%';
        canvas.style.width = '100%';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '9999999999';
        canvas.onresizecallback = () => {
          canvas.width  = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }
        window.addEventListener('resize', () => {
          canvas.onresizecallback();
          mainBank = normalizeBank(mainBank);
        });
        setTimeout(() => {
          canvas.onresizecallback();
        }, 10);
  document.body.appendChild(canvas);

  return canvas;
}

class Asset {
  fetchCache = {};

  fetch(char, style) {
    const hash = `${char}/${style.fontSize}/${style.fontFamily}/${style.color}`;
    if (this.fetchCache[hash]) return this.fetchCache[hash];

    virtualCtx.clearRect(0, 0, P_SIZE, P_SIZE);
    virtualCtx.font = `${style.fontSize} ${style.fontFamily}`;
    virtualCtx.fillStyle = style.color;
    virtualCtx.fillText(char, P_SIZE / 2, P_SIZE / 2);
    const image = new Image();
    image.src = virtualCanvas.toDataURL();
    this.fetchCache[hash] = image;

    return image;
  }

  // 0 <= t <= 2PI
  pointOnBigCircle(t) {
    t -= Math.PI;
    return new Point(
      (300) * Math.sin(t),
      (300) * Math.cos(t),
    );
    return new Point(
      160 * Math.pow(Math.sin(t), 3),
      // 130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25,
      - 130 * Math.cos(t) + 50 * Math.cos(2 * t) + 20 * Math.cos(3 * t) + 10 * Math.cos(4 * t) - 25,
    ).scale(8 / 18 * canvas.height / 320);
  }

  // 0 <= t <= 2PI
  pointOnCircle(t) {
    t -= Math.PI;
    return new Point(
      (Math.random() * 140) * Math.sin(t),
      (Math.random() * 140) * Math.cos(t),
    );
  }

  center() {
    return new Point().canvasCentered();
  }

  scaling(v, a, b, x, y) {
    return (v - a) / (b - a) * (y - x) + x;
  }

  // statics
  Shake = [[-1, 0], [0, 1], [1, 0], [0, -1]];
}
const CanvasAsset = new Asset();

class Point {
  constructor(x, y) {
    if (x && x.length) {
      this.x = x[0] || 0;
      this.y = x[1] || 0;
    } else {
      this.x = x || 0;
      this.y = y || 0;
    }
  }

  clone() {
    return new Point(this.x, this.y);
  }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  set length(length) {
    this.normalize();
    this.x *= length;
    this.y *= length;
  }

  normalize() {
    const length = this.length();
    this.x /= length;
    this.y /= length;
    return this;
  }

  scale(factor) {
    this.x *= factor;
    this.y *= factor;
    return this;
  }

  add(vector) {
    if (vector instanceof Point) {
      this.x += vector.x;
      this.y += vector.y;
    } else {
      this.x += vector[0];
      this.y += vector[1];
    }
    return this;
  }

  sub(vector) {
    return this.add([-(vector.x || vector[0] || 0), -(vector.y || vector[1] || 0)]);
  }

  to(vector) {
    return Math.pow(this.x - vector.x, 2) + Math.pow(this.y - vector.y, 2);
  }

  update(point) {
    this.x = point.x;
    this.y = point.y;
  }

  canvasCentered() {
    this.x += canvas.width / 2;
    this.y += canvas.height / 2;
    return this;
  }
}

class Particle {
  constructor(position, { char='❤', style={} } = {}) {
    this.index = Particle.index++;
    Particle.all.push(this);

    this.originalPosition = position || new Point();
    this.position = this.originalPosition.clone();

    style = {
      color: C_ORANGE,
      fontSize: '12px',
      fontFamily: 'monospace',
      ...style,
    };
    this.updateAsset(char, style);
    
    this.frame = 0;
    this.age = 0;
    this.opacity = 1;
    this.scale = 1;
  }

  updateAsset(char, style={}) {
    this.char = char;
    this.style = {
      ...this.style,
      ...style,
    };
    this.asset = CanvasAsset.fetch(char, style);
  }

  move(ts) {
    let position = this.position.clone();

    if (ts < 3000) {
      // shake
      position.update(this.originalPosition);
      position.add(CanvasAsset.Shake[parseInt(this.index + this.frame / 2, 10) % 4]);
    }

    if (3000 < ts && ts < 5000) {
      // move in a circle
      const targetPosition = CanvasAsset.pointOnCircle(this.index / Particle.index * Math.PI * 2).canvasCentered();
      targetPosition.sub(this.originalPosition).scale((ts - 3000) / 2000).add(this.originalPosition);
      position.update(targetPosition);
      // shake
      position.add(CanvasAsset.Shake[parseInt(this.index + this.frame / 2, 10) % 4]);
    }

    if (5000 < ts && ts < 7000) {
      // random jump and scale
      const scaleFactor = 1 - ((ts - 5000) / 2000 * (7/8));
      const targetPosition = CanvasAsset.pointOnCircle(Math.random() * Math.PI * 2).scale(scaleFactor).canvasCentered();
      position.update(targetPosition);
      // scale font
      this.scale = Math.min(1, this.scale + 0.001);
      this.opacity = Math.max(0.3, this.opacity - 0.005);
    }

    if (7000 < ts && ts < 9000) {
      const actionIndex = (this.index / Particle.index) * 1000 + 7000;
      if (ts < actionIndex) {
        const frameIndex = parseInt(this.frame / 2, 10);
        position.add(CanvasAsset.Shake[(this.index + frameIndex) % 4]);
      } else {
        // update color
        if (this.state !== 1) {
          this.updateAsset(this.char, { color: 'IiLlOoVvEeUuOoYy'.includes(this.char) ? C_BLUE : C_ORANGE });
          this.state = 1;
        }
        position = CanvasAsset.pointOnBigCircle((ts - actionIndex) / 200 * Math.PI * 2 + Math.PI).scale(CanvasAsset.scaling(ts - actionIndex, 0, 2000, 0.2, 5)).canvasCentered();
        position.add(new Point(CanvasAsset.Shake[parseInt(this.index + this.frame / 2, 10) % 4]).scale(Math.random() * 3));
        this.originalPosition = position;
      }
    }

    if (8000 < ts && ts < 9000) {
      // random jump and scale
      const scaleFactor = (ts - 8000) / 1000;
      const targetPosition = CanvasAsset.center().sub(this.originalPosition).scale(scaleFactor).add(this.originalPosition);
      position.update(targetPosition);
      position.add(new Point(CanvasAsset.Shake[parseInt(this.index + this.frame / 2, 10) % 4]).scale(Math.random() * 3));
      // scale font
      this.scale = 1 - scaleFactor;
      this.opacity = 1 - scaleFactor;
      this.endFrame = this.frame;

      canvas.style.backgroundColor = `rgba(0, 0, 0, ${scaleFactor})`;
    }

    // every full animation takes 120 frames
    const P_FRAME = 120;

    // shift heart
    let offsetY = 0;
    if (ts >= 16000) {
      offsetY = 1;
    } else if (ts >= 14000) {
      const x = CanvasAsset.scaling(ts, 14000, 16000, -Math.PI/2, Math.PI/2);
      offsetY = (Math.sin(x) + 1) / 2;
    }

    // generate heart
    if (ts >= 9000) {
      // reset state
      if ((!this.lastStart && (this.frame - this.endFrame) * 1.4 > this.index)
        || (this.lastEnd && this.frame - this.lastEnd > P_FRAME / 2)) { // rest for P_FRAME/2 frames
        
        // // move in a circle
        // const targetPosition = CanvasAsset.pointOnCircle(this.index / Particle.index * Math.PI * 2).canvasCentered();
        // targetPosition.sub(this.originalPosition).scale((ts - 3000) / 2000).add(this.originalPosition);
        // position.update(targetPosition);
        // // shake
        // position.add(CanvasAsset.Shake[parseInt(this.index + this.frame / 2, 10) % 4]);

        this.toPosition = CanvasAsset.pointOnBigCircle(2 * Math.PI * Math.random()).canvasCentered();
        this.lastStart = this.frame;
        this.lastEnd = null;
      }
      
      // compute
      if (this.toPosition) {
        const x = CanvasAsset.scaling(this.frame - this.lastStart, 0, P_FRAME, 0, 2);
        const v = 1 - Math.pow(x - 1, 2);
        position = this.toPosition.clone().sub(CanvasAsset.center()).scale(v).add(CanvasAsset.center());
        position.y -= offsetY * (3 / 18) * canvas.height;

        this.scale = 1 - Math.abs(x - 1);
        this.opacity = 1 - Math.abs(x - 1);

        if (x >= 2) {
          this.toPosition = null;
          this.lastEnd = this.frame;
        }
      }
    }

    this.position.update(position);
    this.frame += 1;
    this.age = ts;
  }

  draw() {
    const size = this.scale * P_SIZE;
    context.globalAlpha = this.opacity;
    context.drawImage(this.asset, this.position.x - size / 2, this.position.y - size / 2, size, size);
  }
}
Particle.index = 0;
Particle.all = [];
Particle.new = (x, y, char, ext) => new Particle(new Point(x, y), { char, ...ext });

const drawBankPoint = (p, alpha) => {
  context.fillStyle = "#ffffff";
  context.globalAlpha = alpha;
  context.beginPath();
  context.arc(p.x, p.y, 3, 0, 2 * Math.PI);
  context.fill();
}

const normalizeBank = (bank) => {
  let [top, left, bottom, right] = [bank[0].y, bank[0].x, bank[0].y, bank[0].x];
  bank.forEach(b => {
    top = Math.min(top, b.y);
    left = Math.min(left, b.x);
    bottom = Math.max(bottom, b.y);
    right = Math.max(right, b.x);
  });

  const offsetX = canvas.width / 2 - (left + right) / 2;
  const offsetY = canvas.height * (13 / 18) - (top + bottom) / 2;

  bank.forEach(b => b.add([offsetX, offsetY]));
  return bank;
}

let T_START = 0;
let bankFrame = 0;
let startFrame = 0;
function render() {
  requestAnimationFrame(render);

  T_START = T_START || Date.now();
  const ts = Date.now() - T_START;

  Particle.all.forEach(p => p.move(ts));
  setTimeout(() => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    Particle.all.forEach(p => p.draw());

    // draw main bank
    if (ts > 16000) {
      bankFrame += 1
      const lastIndex = Math.min(mainBank.length, bankFrame);
      for (let i = startFrame; i < lastIndex; i++) {
        mainBank[i].age = mainBank[i].age || 0;
        mainBank[i].age += 1;
        if (mainBank[i].age >= 100) startFrame = i + 1;
        drawBankPoint(mainBank[i], (100 - mainBank[i].age) / 100);
      }

      if (startFrame >= mainBank.length) {
        mainBank.forEach(p => {
          if (p.age > 0) p.age -= 2;
          drawBankPoint(p, (100 - p.age) / 100);
        });
      }
    }

    // draw mouse track
    const activeLen = bank.length;
    for (let i = activeIndex; i < activeLen; i++) {
      bank[i].age = bank[i].age || 0;
      bank[i].age += 1;
      if (bank[i].age >= 100) activeIndex = i + 1;
      drawBankPoint(bank[i], (100 - bank[i].age) / 100);
    }
  }, 0);
}

const eles = HackAllTexts();
const canvas = CreateCanvas();
const context = canvas.getContext('2d');
const virtualCanvas = document.createElement('canvas');
      virtualCanvas.width  = P_SIZE;
      virtualCanvas.height = P_SIZE;
const virtualCtx = virtualCanvas.getContext('2d');
      virtualCtx.font = `${P_SIZE}px monospace`;
      virtualCtx.textBaseline = 'middle';
      virtualCtx.textAlign = 'center';

(async () => {

  context.clearRect(0, 0, canvas.width, canvas.height);
  eles.forEach(el => {
    const elSty = getComputedStyle(el);
    const elPos = el.getBoundingClientRect();
    const elTxt = el.innerText;
    Particle.new(elPos.x + 8, elPos.y + 10, elTxt, {
      style: {
        color: elSty.color,
        fontSize: elSty.fontSize,
        fontFamily: elSty.fontFamily,
      }
    });
  });

  setTimeout(() => {
    const newClass = document.createElement('style');
    newClass.innerHTML = 'mn { color: transparent !important; }';
    document.body.append(newClass);
    
    mainBank = normalizeBank(importBank(writtenShopee));
    render();
  }, 3000);

})();

// track mouse
let activeIndex = 0;
let start = false;
let bank = [];
let lastPoint = new Point();
const exportBank = bank => JSON.stringify(bank.map(b => [b.x, b.y]));
const importBank = str => JSON.parse(str).map(p => new Point(p));
const replayBank = () => { const _bank = bank; bank = []; activeIndex = 0; const sec = setInterval(() => { if (!_bank.length) { clearTimeout(sec); return; } _bank[0].age = 0; bank.push(_bank.shift()) }, 1000 / 60)};
canvas.onmousedown = () => start = true;
canvas.onmouseup = () => start = false;
canvas.onmousemove = e => {
  if (start && window.trackpointer == true) {
    const p = new Point(e.clientX, e.clientY);
    if (p.to(lastPoint) > 9) {
      bank.push(p);
      lastPoint = p;
    }
  }
}

let mainBank = [];
