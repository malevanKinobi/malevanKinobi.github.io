// Сразу переводим фокус на окно, чтобы можно было начать игру, не кликая по экрану
window.focus();

// Объявляем переменные ThreeJS — камера, сцена и рендер
let camera, scene, renderer, orthoCamera;
// Объявляем переменную для физического мира CannonJs
let world;
// Время последней анимации, используется для расчета прошедшего времени между кадрами
let lastTime;
// Массив для хранения частей пирамиды, которые уже стоят друг на друге
let stack;
// Массив для хранения частей пирамиды, которые не поместились на вершине и упали
let overhangs;
// Высота каждой детали пирамиды
const boxHeight = 1;
// Исходная ширина и глубина каждой детали пирамиды
const originalBoxSize = 3;
// задаём скорость движения
let speed = 0.004;
const baseHeight = 100; // Высота основания, например, 2 единицы
// Переменные для управления игровым процессом и его состоянием
let autopilot; // Флаг для управления режимом автопилота (демонстрационного режима)
let gameEnded; // Флаг для отслеживания конца игры
let robotPrecision; // Переменная для хранения точности автопилота
let is_started = false; // Флаг для отслеживания состояния старта игры
let startDelay = 100; // Задержка перед началом обработки событий после старта игры
let canHandleEvent = false; // Флаг для разрешения обработки событий
let correctTaps = 0; // Счетчик правильных нажатий
let animationFrameId;
let towerGroup;
let blockColor;
// Получаем доступ к элементам на странице, связанным с очками, инструкциями и результатами
const scoreElement = document.getElementById("score");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");
const blurOverlay = document.getElementById("blurOverlay");

// Кнопки для управления стартом и перезапуском игры
const btn_start = document.getElementById("btn_start");
const btn_again = document.getElementById("btn_again");
const particlesElement = document.getElementById('particles-js');

const colorsList = [
    { gradients: {start: '#3AA6D0', end: '#FF8B73'}, block: 10 },
    { gradients: {start: '#6D48D7', end: '#35C0CD'}, block: 41 },
    { gradients: {start: '#FF9D40', end: '#4869D6'}, block: 133 },
];

let colors;


// Инициализация игры и настройка всех параметров
function init() {
    blurOverlay.style.display = "block";
    autopilot = false; // Отключаем автопилот
    gameEnded = false; // Игра не закончена
    lastTime = 0; // Сбрасываем время последнего кадра
    stack = []; // Очищаем массив слоев пирамиды
    overhangs = []; // Очищаем массив обрезанных частей пирамиды
    robotPrecision = Math.random() * 1 - 0.1; // Генерируем точность автопилота

    // Выбор нового цвета при каждом старте
    colors = getRandomColorGradient(colorsList);

    // Устанавливаем исходный градиент фона при старте игры
    setInitialBackgroundGradient();

    // Инициализация физического мира
    initPhysicsWorld();

    // Инициализация камер
    initCameras();

    // Инициализация сцены
    initScene();

    // Добавляем первый слой пирамиды (основание) и второй движущийся слой
    addInitialLayers();

    // Отрисовываем сцену с текущими настройками
    renderer.render(scene, camera);
}

// Инициализация физического мира с настройкой гравитации и алгоритмов столкновений
function initPhysicsWorld() {
    world = new CANNON.World(); // Создаем новый физический мир
    world.gravity.set(0, -10, 0); // Устанавливаем гравитацию вниз
    world.broadphase = new CANNON.NaiveBroadphase(); // Алгоритм для обработки столкновений
    world.solver.iterations = 40; // Увеличиваем количество итераций для повышения точности симуляции
}

// Инициализация сцены, группы башни и освещения
function initScene() {
    scene = new THREE.Scene(); // Создаем новую сцену
    towerGroup = new THREE.Group(); // Создаем группу для башни
    scene.add(towerGroup); // Добавляем группу башни в сцену
    scene.background = null; // Задаем фон сцены

    // Добавляем фоновое освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Добавляем направленный свет
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 0);
    scene.add(dirLight);

    // Настраиваем рендерер для отрисовки сцены
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio); // Устанавливаем пиксельное соотношение для рендерера
    renderer.setSize(window.innerWidth, window.innerHeight); // Устанавливаем размер рендерера под размер окна
    renderer.setAnimationLoop(animation); // Устанавливаем цикл анимации
    document.body.appendChild(renderer.domElement); // Добавляем рендерер на страницу
}

// Функция для установки исходного цвета фона
function setInitialBackgroundGradient() {
    const startColor = colors.gradients.start; // Исходный цвет для верхней части градиента
    const endColor = colors.gradients.end; // Исходный цвет для нижней части градиента

    if (particlesElement) {
        particlesElement.style.background = `linear-gradient(to bottom, ${startColor}, ${endColor})`; // Устанавливаем исходный градиент
    }
}

// Функция для изменения оттенка цвета
function shiftHue(color, factor) {
    const hsl = new THREE.Color(color).getHSL({});
    hsl.h = (hsl.h + factor / 360) % 1; // Смещение оттенка
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l).getStyle();
}

// Функция для обновления цвета фона на основе текущей высоты башни
function updateBackgroundGradient() {
    const heightFactor = stack.length * 5; // Фактор, влияющий на изменение цвета

    // Вычисляем текущие оттенки на основе начальных цветов
    const startColor = shiftHue(colors.gradients.start, heightFactor);
    const endColor = shiftHue(colors.gradients.end, heightFactor);

    if (particlesElement) {
        particlesElement.style.background = `linear-gradient(to bottom, ${startColor}, ${endColor})`; // Применяем новый градиент к фону
    }
}
// Функция для добавления нового слоя к пирамиде и обновления градиента фона
function addLayer(x, z, width, depth, direction) {
    const y = boxHeight * stack.length;
    const layer = generateBox(x, y, z, width, depth, false);
    layer.direction = direction;
    stack.push(layer);

    // Обновляем градиент фона после первого добавления нового слоя
    if (stack.length > 1) {
        updateBackgroundGradient();
    }
}

// Функция для добавления первого слоя пирамиды (основания) и второго движущегося слоя
function addInitialLayers() {
    // Добавляем основание под первый блок
    const baseWidth = originalBoxSize; // Ширина основания больше, чем у блоков пирамиды
    const baseDepth = originalBoxSize; // Глубина основания больше, чем у блоков пирамиды
    generateBox(0, -baseHeight / 1.9809, 0, baseWidth, baseDepth, false, true); // Позиция основания с учетом высоты

    // Первый слой — основание пирамиды
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // Второй слой — движущийся блок
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
}



// Перезапуск игры с обновлением цвета
function startGame() {

    stopRotation(); // Останавливаем вращение башни

    resetTowerGroup(); // Сбрасываем башню в исходное положение

    resetGameState(); // Сбрасываем параметры состояния игры

    clearWorld(); // Очищаем физический мир от предыдущих объектов

    clearScene(); // Очищаем сцену от предыдущих объектов

    addInitialLayers(); // Добавляем первые два слоя пирамиды

    resetCamera(); // Возвращаем камеру на начальную ортографическую позицию
}

// Функция для сброса параметров состояния игры
function resetGameState() {
    autopilot = false; // Выключаем автопилот
    gameEnded = false; // Сбрасываем флаг конца игры
    lastTime = 0; // Обнуляем время последней анимации
    stack = []; // Очищаем массив слоев пирамиды
    overhangs = []; // Очищаем массив падающих частей
    correctTaps = 0; // Сбрасываем счетчик правильных нажатий

    // Скрываем элементы инструкции и результата, если они есть
    if (instructionsElement) instructionsElement.style.display = "none";
    if (resultsElement) resultsElement.style.display = "none";
    if (scoreElement) scoreElement.innerText = 0; // Сбрасываем счетчик очков
}

// Функция для очистки физического мира от предыдущих объектов
function clearWorld() {
    if (world) {
        while (world.bodies.length > 0) {
            world.remove(world.bodies[0]); // Удаляем каждый объект из физического мира
        }
    }
}

// Функция для очистки сцены от предыдущих объектов
function clearScene() {
    if (scene) {
        while (scene.children.find((c) => c.type === "Mesh")) {
            const mesh = scene.children.find((c) => c.type === "Mesh");
            scene.remove(mesh); // Удаляем каждый объект типа "Mesh" из сцены
        }
    }
}

// Функция для обрезки верхнего блока и добавления следующего
function splitBlockAndAddNextOneIfOverlaps() {
    if (gameEnded) return; // Если игра закончилась, выходим

    const topLayer = stack[stack.length - 1]; // Верхний блок
    const previousLayer = stack[stack.length - 2]; // Блок под верхним

    const direction = topLayer.direction; // Направление движения блока
    const size = direction === "x" ? topLayer.width : topLayer.depth; // Размер блока по направлению движения
    const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction]; // Разница между позициями верхнего и предыдущего блока
    const overhangSize = Math.abs(delta); // Размер свеса
    const overlap = size - overhangSize; // Размер пересечения блоков

    const cutPercentage = (overhangSize / size) * 100;

    if (overlap > 0) {
        handleOverlap(topLayer, previousLayer, direction, overlap, size, delta, cutPercentage);
    } else {
        missedTheSpot(); // Если пересечения нет, обрабатываем промах
    }
}

// Функция для обрезки верхнего блока и создания нового блока
function cutBox(topLayer, overlap, size, delta) {

    // Определение направления и новой ширины/глубины
    const direction = topLayer.direction;
    const newWidth = direction === "x" ? overlap : topLayer.width;
    const newDepth = direction === "z" ? overlap : topLayer.depth;

    // Обновление размеров и позиции верхнего блока
    topLayer.width = newWidth;
    topLayer.depth = newDepth;

    topLayer.threejs.scale[direction] = overlap / size;
    topLayer.threejs.position[direction] -= delta / 2;
    topLayer.cannonjs.position[direction] -= delta / 2;

    let soundCabinList = ['1.mp3', '3.mp3', '4.mp3', '5.mp3'];
    // Генерация случайного индекса
    let randomIndexSoundCabin = Math.floor(Math.random() * soundCabinList.length);

    // Выбор случайного элемента
    let randomSoundCabin = soundCabinList[randomIndexSoundCabin];
    // Проигрывание звука рубки
    playSound("sound/cabin/"+randomSoundCabin);

    // Обновление физического тела

    const shape = new CANNON.Box(new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2));
    topLayer.cannonjs.shapes = [];
    topLayer.cannonjs.addShape(shape);
}

// Функция для трижды изменения цвета блока с добавлением вибрации и звука
function flashColorWithVibrationAndSound(block, newColor, soundFile, duration = 50, times = 3) {
    const originalColor = block.material.color.getHex(); // Сохраняем исходный цвет блока
    playSound(soundFile); // Воспроизводим звуковой файл

    // Функция для смены цвета блока
    function toggleColor(currentTime) {
        if (currentTime < times * 2) {
            const isOriginalColor = currentTime % 2 === 0;
            block.material.color.setHex(isOriginalColor ? newColor : originalColor);

            // Добавляем вибрацию при первом изменении цвета, если это мобильное устройство
            if (isMobileDevice() && currentTime === 0 && navigator.vibrate) {
                navigator.vibrate([100, 100, 100]); // Вибрация на 100 мс, пауза 100 мс, затем снова вибрация 100 мс
            }

            // Запускаем следующий цикл изменения цвета
            setTimeout(() => toggleColor(currentTime + 1), duration);
        } else {
            block.material.color.setHex(originalColor); // Восстанавливаем исходный цвет блока
        }
    }

    toggleColor(0); // Запускаем первый цикл изменения цвета
}

// Функция для добавления свеса, который будет падать с пирамиды
function addOverhang(x, z, width, depth) {
    const y = boxHeight * (stack.length - 1);
    const overhang = generateBox(x, y, z, width, depth, true);
    overhangs.push(overhang);
}

// Функция для воспроизведения звука
function playSound(soundFile, volume = 1) {
    const cutSound = new Howl({
        src: [soundFile],  // Укажите путь к вашему аудиофайлу
        preload: true      // Предзагрузка звука
    });
    cutSound.volume(volume);
    cutSound.play();
}



// Функция для сброса камеры на начальную ортографическую позицию
function resetCamera() {
    camera = orthoCamera; // Возвращаемся к ортографической камере
    if (camera) {
        camera.position.set(4, 4, 4); // Сбрасываем позицию камеры
        camera.lookAt(0, 0, 0); // Камера смотрит на центр сцены
    }
}

// Обработчик событий для отслеживания кликов или касаний экрана
function eventHandler() {
    if (!is_started || !canHandleEvent) return; // Если игра не начата или обработка событий не разрешена, выходим

    if (autopilot) {
        startGame(); // Если включен автопилот, перезапускаем игру
    } else {
        splitBlockAndAddNextOneIfOverlaps(); // Иначе обрезаем блок и добавляем новый
    }
}

// Устанавливаем обработчики событий в зависимости от устройства (мобильное или десктоп)
function setupEventHandlers() {
    const startEvent = isMobileDevice() ? "touchstart" : "click"; // Определяем тип события

    // Устанавливаем обработчики событий для начала и перезапуска игры
    btn_start.addEventListener(startEvent, handleStartButtonClick);
    btn_again.addEventListener(startEvent, handleAgainButtonClick);

    // Устанавливаем обработчик событий для основной игры
    window.addEventListener(startEvent, eventHandler);
}

// Обработчик нажатия на кнопку старта игры
function handleStartButtonClick(event) {
    event.preventDefault();
    playSound("sound/cabin/1.mp3", 0);

    startGame(); // Запускаем игру



    is_started = true;
    canHandleEvent = false;

    // Разрешаем обработку событий после задержки
    setTimeout(() => {
        canHandleEvent = true;
    }, startDelay);
}

// Обработчик нажатия на кнопку перезапуска игры
function handleAgainButtonClick(event) {
    event.preventDefault();
    colors = getRandomColorGradient(colorsList);
    startGame(); // Перезапускаем игру
    blurOverlay.style.display = "block";
    // Выбираем новый цвет из списка при перезапуске игры

    updateBackgroundGradient(colors.gradients.start, colors.gradients.end);

    is_started = true;
    canHandleEvent = false;

    // Разрешаем обработку событий после задержки
    setTimeout(() => {
        canHandleEvent = true;
    }, startDelay);
}

// Функция для проверки, является ли устройство мобильным
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Главная функция анимации игры
function animation(time) {
    // Если прошло какое-то время с момента последней анимации
    if (lastTime) {
        // Считаем, сколько времени прошло
        const timePassed = time - lastTime;

        // Обновляем положение верхнего блока
        updateTopLayer(timePassed);

        // Поднимаем камеру при установке блока
        updateCameraPosition(timePassed);

        // Обновляем физические события
        updatePhysics(timePassed);

        // Рендерим новую сцену
        renderer.render(scene, camera);
    }

    // Устанавливаем текущее время как время последней анимации
    lastTime = time;

    TWEEN.update(); // Обновляем TWEEN-анимации
}

// Функция для обновления положения верхнего блока
function updateTopLayer(timePassed) {
    if (stack.length < 2) return; // Проверяем, есть ли хотя бы два слоя в stack

    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    if (!topLayer || !topLayer.threejs) {
        console.error('Top layer is undefined or missing threejs property');
        return;
    }

    const boxShouldMove = !gameEnded && is_started &&
        (!autopilot || (autopilot && topLayer.threejs.position[topLayer.direction] <
            previousLayer.threejs.position[topLayer.direction] + robotPrecision));

    if (boxShouldMove) {
        // Ограничиваем движение блока в пределах, например, от -10 до 10
        const boundary = 5;

        // Если блок выходит за границы, меняем направление движения
        if (topLayer.threejs.position[topLayer.direction] >= boundary) {
            topLayer.threejs.position[topLayer.direction] = boundary; // Ограничиваем движение до границы
            speed *= -1; // Меняем направление
        } else if (topLayer.threejs.position[topLayer.direction] <= -boundary) {
            topLayer.threejs.position[topLayer.direction] = -boundary; // Ограничиваем движение до границы
            speed *= -1; // Меняем направление
        }

        // Двигаем блок
        topLayer.threejs.position[topLayer.direction] += speed * timePassed;
        topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;
    }
}

// Функция для подъема камеры после установки блока
function updateCameraPosition(timePassed) {
    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
        camera.position.y += speed * timePassed;
    }
}

// Функция для создания и добавления игрового блока (кубика) на сцену
function generateBox(x, y, z, width, depth, falls, isBase = false) {
    const height = isBase ? baseHeight : boxHeight; // Используем высоту основания или стандартную высоту блока
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const color = isBase ? new THREE.Color(`hsl(${colors.block + stack.length * 5}, 70%, 70%)`) : new THREE.Color(`hsl(${colors.block + stack.length * 5}, 50%, 50%)`); // Цвет основания — коричневый, блоки — разные цвета
    console.log(colors.block + stack.length * 5)
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(x, y, z);
    scene.add(mesh);
    towerGroup.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    let mass = falls ? 5 : 0;
    mass *= (width / originalBoxSize) * (depth / originalBoxSize);
    const body = new CANNON.Body({ mass, shape });
    body.position.set(x, y, z);
    world.addBody(body);

    return { threejs: mesh, cannonjs: body, width, depth };
}
// Функция для обновления физики в игре
function updatePhysics(timePassed) {
    // Настраиваем длительность событий
    world.step(timePassed / 1000); // Шаг физического мира

    // Копируем координаты из Cannon.js в Three.js
    overhangs.forEach((element) => {
        element.threejs.position.copy(element.cannonjs.position);
        element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });
}

// Функция для создания и инициализации камер
function initCameras() {
    const aspect = window.innerWidth / window.innerHeight;

    // Ортографическая камера (по умолчанию для игры)
    const width = 7;
    const height = width / aspect;
    orthoCamera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0, 100);
    orthoCamera.position.set(4, 4, 4);  // Позиция камеры в пространстве
    orthoCamera.lookAt(0, 0, 0);  // Камера смотрит на центр сцены

    // Перспективная камера (используется при проигрыше)
    perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    perspectiveCamera.position.set(0, 0, 10);  // Позиция камеры для обзора всей башни
    perspectiveCamera.lookAt(0, 0, 0);  // Камера смотрит на центр башни

    // По умолчанию используем ортографическую камеру
    camera = orthoCamera;
}

// Функция для отображения всей пирамиды после проигрыша
function showFullPyramid() {
    const totalHeight = boxHeight * stack.length - 1; // Общая высота башни
    const halfHeight = totalHeight / 2;  // Половина высоты для центра башни

    // Рассчитываем позицию камеры на основе высоты башни
    let distance = calculateCameraDistance(totalHeight);

    const cameraY = totalHeight + distance * Math.sin(THREE.MathUtils.degToRad(30)); // Позиция по оси Y
    const cameraZ = distance * Math.cos(THREE.MathUtils.degToRad(30)); // Позиция по оси Z

    // Устанавливаем позицию камеры
    perspectiveCamera.position.set(0, cameraY, cameraZ);
    perspectiveCamera.lookAt(0, halfHeight, 0);

    // Запускаем вращение башни
    rotateTower();
}

// Функция для расчета расстояния до камеры на основе высоты башни
function calculateCameraDistance(totalHeight) {
    let distance = totalHeight; // Множитель для отдаления камеры

    if (totalHeight <= 2) {
        distance *= 12;
    } else if (totalHeight <= 10) {
        distance *= 4;
    } else {
        distance *= 1.1;
    }

    return distance;
}

// Функция для запуска анимации вращения башни
function rotateTower() {
    function animate() {
        // Вращаем всю сцену вокруг оси Y
        towerGroup.rotation.y += 0.001;

        // Продолжаем анимацию и сохраняем идентификатор
        animationFrameId = requestAnimationFrame(animate);
    }

    // Запускаем анимацию вращения
    animate();
}

// Функция для остановки вращения башни
function stopRotation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Останавливаем анимацию
        animationFrameId = null; // Сбрасываем идентификатор
    }
}

// Функция для сброса башни в исходное положение
function resetTowerGroup() {
    if (towerGroup) {
        towerGroup.clear(); // Очищаем группу от всех дочерних объектов
    }

    // Сброс позиции и ориентации группы
    towerGroup.position.set(0, 0, 0);
    towerGroup.rotation.set(0, 0, 0);
}

// Функция для обработки ситуации, когда блоки частично перекрываются
function handleOverlap(topLayer, previousLayer, direction, overlap, size, delta, cutPercentage) {
    if (cutPercentage > 10) {
        correctTaps = 0;
        cutBox(topLayer, overlap, size, delta); // Обрезаем блок

        const overhangShift = (overlap / 2 + Math.abs(delta) / 2) * Math.sign(delta);
        const overhangX = direction === "x" ? topLayer.threejs.position.x + overhangShift : topLayer.threejs.position.x;
        const overhangZ = direction === "z" ? topLayer.threejs.position.z + overhangShift : topLayer.threejs.position.z;
        const overhangWidth = direction === "x" ? Math.abs(delta) : topLayer.width;
        const overhangDepth = direction === "z" ? Math.abs(delta) : topLayer.depth;

        addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth); // Добавляем свес

        addNextLayer(topLayer, direction); // Добавляем следующий блок
    } else {
        handlePerfectTap(topLayer, previousLayer, direction); // Обработка идеального нажатия
    }
}

// Функция для добавления следующего блока после успешного размещения
function addNextLayer(topLayer, direction) {
    const nextX = direction === "x" ? topLayer.threejs.position.x : -10;
    const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;
    const newWidth = topLayer.width;
    const newDepth = topLayer.depth;
    const nextDirection = direction === "x" ? "z" : "x";

    if (scoreElement) scoreElement.innerText = stack.length - 1; // Обновляем счетчик очков
    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection); // Добавляем новый слой
}

// Функция для обработки ситуации, когда блок идеально совпадает с предыдущим
function handlePerfectTap(topLayer, previousLayer, direction) {
    correctTaps++;

    topLayer.threejs.position[direction] = previousLayer.threejs.position[direction];
    topLayer.cannonjs.position[direction] = previousLayer.threejs.position[direction];

    topLayer.cannonjs.velocity.set(0, 0, 0);
    topLayer.cannonjs.angularVelocity.set(0, 0, 0);

    flashColorWithVibrationAndSound(topLayer.threejs, 0xFFFFDD, 'sound/perfectTap/2181b19773767a7.mp3');

    if (correctTaps === 5) {
        increaseBlockSize(topLayer, 1.1, originalBoxSize);
        correctTaps = 0;
    }

    addNextLayer(topLayer, direction); // Добавляем следующий слой
}

// Функция для обработки ситуации, когда игрок промахнулся
function missedTheSpot() {
    blurOverlay.style.display = "none";

    removeLastBlock(); // Удаляем последний добавленный блок

    if (stack.length > 0) {
        const topLayer = stack[stack.length - 1];

        addOverhang(
            topLayer.threejs.position.x,
            topLayer.threejs.position.z,
            topLayer.width,
            topLayer.depth
        );

        world.remove(topLayer.cannonjs);
        scene.remove(topLayer.threejs);
        towerGroup.remove(topLayer.threejs); // Удаляем из группы
    }

    gameEnded = true;
    is_started = false;

    camera = perspectiveCamera;
    showFullPyramid();

    if (resultsElement && !autopilot) resultsElement.style.display = "flex";
}

// Функция для удаления последнего добавленного блока
function removeLastBlock() {
    if (stack.length > 0) {
        // Получаем последний добавленный блок
        const lastBlock = stack.pop();

        // Удаляем физическое тело блока из физического мира
        if (lastBlock.cannonjs) {
            world.remove(lastBlock.cannonjs);
        }

        // Удаляем визуальный объект блока из сцены
        if (lastBlock.threejs) {
            scene.remove(lastBlock.threejs);
            towerGroup.remove(lastBlock.threejs); // Удаляем из группы
        }

        // Перерисовываем сцену после удаления
        renderer.render(scene, camera);
    }
}

// Функция для увеличения размера блока на определенный множитель, но не больше указанного максимального размера
function increaseBlockSize(block, scaleMultiplier, maxSize) {

    const newWidth = Math.min(block.width * scaleMultiplier, maxSize);
    const newDepth = Math.min(block.depth * scaleMultiplier, maxSize);

    if (block.width < maxSize || block.depth < maxSize)
    {
        playSound("sound/plateMagnification.mp3");
    }

    // Обновляем масштаб блока в Three.js
    block.threejs.scale.x = newWidth / block.width;
    block.threejs.scale.z = newDepth / block.depth;



    // Обновляем физическое тело в Cannon.js
    block.cannonjs.shapes.forEach(shape => {
        shape.halfExtents.x = newWidth / 2;
        shape.halfExtents.z = newDepth / 2;
        shape.updateConvexPolyhedronRepresentation();
    });

    block.cannonjs.updateBoundingRadius();

    // Обновляем размеры блока
    block.width = newWidth;
    block.depth = newDepth;
}


// Функция для выбора случайного градиента цвета из списка
function getRandomColorGradient(list) {
    const randomIndex = Math.floor(Math.random() * list.length); // Генерация случайного индекса в пределах длины списка
    return list[randomIndex]; // Возврат случайного объекта градиента
}
init(); // Инициализируем игру
// Настраиваем обработчики событий при загрузке
setupEventHandlers();
