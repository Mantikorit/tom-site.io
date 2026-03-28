let config = {};
let currentDensity = 1;


// Получение URL конфига 
const scriptElement = document.currentScript;
const configUrlFromAttr = scriptElement?.getAttribute('data-config'); // Например: data-config="my-config.json"
const configUrl = configUrlFromAttr;

// Жёсткий вариант
// const configUrl = 'config.json';

// Функция загрузки конфига из JSON
async function loadConfigFromJson(url) {
  if (!url) {
    console.info('Config URL не указан — будут использованы настройки по умолчанию');
    return null;
  }

  try {
    // Добавляем cache-buster, чтобы не кэшировался старый конфиг при разработке
    const response = await fetch(url + '?' + Date.now());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const loadedConfig = await response.json();
    console.log('Конфиг успешно загружен из:', url);
    return loadedConfig;
  } catch (error) {
    console.error('Ошибка загрузки конфига из', url, error);
    return null;
  }
}

// Дефолтный конфиг (fallback, если ничего не загрузилось)
const defaultConfig = {
  parallax: {
    enabled: true,
    intensity: 30,
    smoothness: 0.1,
    maxOffset: 50,
    useGyro: true
  },
  nebulaLayerDepth: 0.6,
  nebula: {
    count: 8,
    minSize: 300,
    maxSize: 800,
    blur: [40, 80],
    opacity: [0.15, 0.4],
    palettes: [
      ['#00000080', '#00000080', '#00000080']
      // Добавляй свои палитры сюда
    ]
  },
  stars: {
    depths: [0.3, 0.5, 0.8, 1.0],
    layers: [
      { count: 300, size: [0.8, 1.8], opacity: [0.6, 1], twinkleChance: 0.3 },
      { count: 150, size: [1.2, 2.5], opacity: [0.7, 1], twinkleChance: 0.4 },
      { count: 80,  size: [1.8, 3.5], opacity: [0.8, 1], twinkleChance: 0.5 },
      { count: 30,  size: [3.0, 6.0], opacity: [0.9, 1], twinkleChance: 0.7 }
    ]
  }
};


// Утилита vmin
function vmin() { return Math.min(innerWidth, innerHeight) / 100; }

// Расчёт плотности от размера экрана
function getDensity() {
    const d = Math.sqrt(innerWidth**2 + innerHeight**2);
    if (d < 920)  return 0.35;
    if (d < 1200) return 0.50;
    if (d < 1600) return 0.75;  
    return 1.0;
}

// Пересоздание всего космоса
function regenerateSpace() {
    const layers = document.querySelectorAll('.layer');
    const nebulaLayer = document.getElementById('nebula-layer');

    // ВАЖНО: восстанавливаем data-depth (иначе параллакс их не двигает)
    nebulaLayer.dataset.depth = config.nebulaLayerDepth;
    config.stars.depths.forEach((depth, i) => {
        layers[i + 1].dataset.depth = depth;
    });

    // Очищаем
    layers.forEach(l => l.innerHTML = '');

    // Туманности
    const nebulaCount = Math.round(config.nebula.count * currentDensity);
    for (let i = 0; i < nebulaCount; i++) {
        createNebula(nebulaLayer);
    }

    // Звёзды
    const sizeMul = Math.sqrt(currentDensity);
    config.stars.layers.forEach((cfg, i) => {
        const count = Math.round(cfg.count * currentDensity);
        for (let j = 0; j < count; j++) {
            createStar(layers[i + 1], {
                ...cfg,
                size: cfg.size.map(s => s * sizeMul),
                twinkleChance: cfg.twinkleChance * currentDensity
            });
        }
    });
}

function createNebula(layer) {
    const nebula = document.createElement('div');
    const size = config.nebula.minSize + Math.random() * (config.nebula.maxSize - config.nebula.minSize);
    const palette = config.nebula.palettes[Math.floor(Math.random() * config.nebula.palettes.length)];

    const gradient = `
        radial-gradient(circle at ${35+Math.random()*30}% ${35+Math.random()*30}%, ${palette[0].replace(/0\.\d+/,'0.25')} 0%, transparent 30%),
        radial-gradient(circle at ${20+Math.random()*60}% ${20+Math.random()*60}%, ${palette[1]} 0%, transparent 55%),
        radial-gradient(circle at ${10+Math.random()*80}% ${10+Math.random()*80}%, ${palette[2]} 0%, transparent 70%)
    `;

    nebula.style.cssText = `
        position:absolute;
        width:${size}px; height:${size}px;
        background:${gradient};
        filter:blur(${config.nebula.blur[0] + Math.random()*(config.nebula.blur[1]-config.nebula.blur[0])}px);
        mix-blend-mode:screen;
        left:${Math.random()*100}%; top:${Math.random()*100}%;
        transform:translate(-50%,-50%);
        opacity:${config.nebula.opacity[0] + Math.random()*(config.nebula.opacity[1]-config.nebula.opacity[0])};
        pointer-events:none;
    `;
    layer.appendChild(nebula);
}

function createStar(layer, cfg) {
    const size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
    const opacity = cfg.opacity[0] + Math.random() * (cfg.opacity[1] - cfg.opacity[0]);

    const s = document.createElement('div');
    s.style.cssText = `
        position:absolute;
        width:${size}px; height:${size}px;
        background: #858585;
        border-radius:50%;
        left:${Math.random()*100}%;
        top:${Math.random()*100}%;
        opacity:${opacity};
        pointer-events:none;
        box-shadow:0 0 ${size*4}px #fff;
    `;

    if (Math.random() < cfg.twinkleChance) {
        let t = Math.random()*10;
        const anim = () => {
            t += 0.02;
            const tw = Math.sin(t*1.3)*Math.sin(t*0.8)*Math.sin(t*0.5);
            s.style.opacity = Math.max(0.2, opacity + tw*0.35);
            requestAnimationFrame(anim);
        };
        anim();
    }
    layer.appendChild(s);
}

// Параллакс
function startParallax() {
    let cx = 0, cy = 0, tx = 0, ty = 0;

    const update = (x, y) => {
        if (!config.parallax.enabled) return;
        tx = (x / innerWidth - 0.5) * config.parallax.intensity;
        ty = (y / innerHeight - 0.5) * config.parallax.intensity;
    };

    document.addEventListener('mousemove', e => update(e.clientX, e.clientY));
    document.addEventListener('touchmove', e => e.touches[0] && update(e.touches[0].clientX, e.touches[0].clientY), {passive:true});

    // Гироскоп
    if (config.parallax.useGyro && 'ontouchstart' in window) {
        const req = () => {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().then(r => r==='granted' && window.addEventListener('deviceorientation', gyro));
            } else {
                window.addEventListener('deviceorientation', gyro);
            }
        };
        document.body.addEventListener('touchend', req, {once:true});
    }
    function gyro(e) {
        if (!e.gamma || !e.beta) return;
        update((e.gamma/90 + 1)*innerWidth/2, (e.beta/180 + 0.5)*innerHeight);
    }

    function loop() {
        cx += (tx - cx) * config.parallax.smoothness;
        cy += (ty - cy) * config.parallax.smoothness;
        const x = Math.max(-config.parallax.maxOffset, Math.min(config.parallax.maxOffset, cx));
        const y = Math.max(-config.parallax.maxOffset, Math.min(config.parallax.maxOffset, cy));

        document.querySelectorAll('.layer').forEach(l => {
            const d = parseFloat(l.dataset.depth) || 0;
            l.style.transform = `translate(${x*d}px, ${y*d}px)`;
        });
        requestAnimationFrame(loop);
    }
    loop();
}

// Инициализация с гибкой загрузкой конфига
async function init() {
    // Пробуем загрузить внешний конфиг
    const loadedConfig = await loadConfigFromJson(configUrl);

    // Если загрузился — используем его, иначе — дефолтный
    config = loadedConfig || defaultConfig;

    // Создаём слои (один раз)
    const space = document.createElement('div');
    space.className = 'space';
    space.innerHTML = `
        <div class="layer" id="nebula-layer" data-depth="${config.nebulaLayerDepth}"></div>
        <div class="layer" data-depth="${config.stars.depths[0]}"></div>
        <div class="layer" data-depth="${config.stars.depths[1]}"></div>
        <div class="layer" data-depth="${config.stars.depths[2]}"></div>
        <div class="layer" data-depth="${config.stars.depths[3]}"></div>
    `;
    document.body.appendChild(space);

    // Первая генерация космоса
    currentDensity = getDensity();
    regenerateSpace();
    startParallax();

    // Реакция на ресайз
    window.addEventListener('resize', () => {
        clearTimeout(window.rt);
        window.rt = setTimeout(() => {
            const newD = getDensity();
            if (Math.abs(newD - currentDensity) > 0.1) {
                currentDensity = newD;
                regenerateSpace();
            }
        }, 250);
    });
}

document.addEventListener('DOMContentLoaded', init);