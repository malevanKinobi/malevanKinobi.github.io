// Сразу переводим фокус на окно, чтобы можно было начать игру, не кликая по экрану
window.focus();

// Объявляем переменные ThreeJS — камера, сцена и рендер
let camera, scene, renderer;
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

// Переменные для управления игровым процессом и его состоянием
let autopilot; // Флаг для управления режимом автопилота (демонстрационного режима)
let gameEnded; // Флаг для отслеживания конца игры
let robotPrecision; // Переменная для хранения точности автопилота
let is_started = false; // Флаг для отслеживания состояния старта игры
let startDelay = 500; // Задержка перед началом обработки событий после старта игры
let canHandleEvent = false; // Флаг для разрешения обработки событий
let correctTaps = 0; // Счетчик правильных нажатий

// Получаем доступ к элементам на странице, связанным с очками, инструкциями и результатами
const scoreElement = document.getElementById("score");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");

// Кнопки для управления стартом и перезапуском игры
const btn_start = document.getElementById("btn_start");
const btn_again = document.getElementById("btn_again");

const gradients = [
    { start: '#ff7e5f', end: '#feb47b' }, // Теплый закат
    { start: '#6a11cb', end: '#2575fc' }, // Сине-фиолетовый
    { start: '#ff9966', end: '#ff5e62' }, // Яркий апельсин
    { start: '#00c6ff', end: '#0072ff' }, // Голубой океан
    { start: '#76b852', end: '#8dc26f' }, // Зеленая трава
    { start: '#dd3e54', end: '#6be585' }, // Красно-зеленый контраст
    { start: '#f09819', end: '#edde5d' }, // Золотой свет
    { start: '#ff512f', end: '#f09819' }, // Оранжевый закат
    { start: '#c31432', end: '#240b36' }, // Красный и черный
    { start: '#3a1c71', end: '#d76d77' }, // Фиолетово-розовый
];

let colorBlock = Math.floor(Math.random() * 360);
// Функция для добавления нового слоя к пирамиде
function addLayer(x, z, width, depth, direction) {
    // Рассчитываем высоту нового слоя на основе текущего количества слоев
    const y = boxHeight * stack.length;
    // Создаем новый слой, который добавляется на вершину пирамиды
    const layer = generateBox(x, y, z, width, depth, false);
    // Устанавливаем направление движения для нового слоя
    layer.direction = direction;
    // Добавляем новый слой в массив stack, который содержит все слои пирамиды
    stack.push(layer);
}

// Функция для создания и добавления игрового блока (кубика) на сцену
function generateBox(x, y, z, width, depth, falls) {
    // Создаем геометрию кубика с использованием ThreeJS
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    // Генерируем цвет для кубика на основе его позиции в стеке
    const color = new THREE.Color(`hsl(${colorBlock + stack.length * 10}, 50%, 50%)`);
    // Создаем материал и полигональную сетку (меш) с использованием сгенерированного цвета
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    // Устанавливаем позицию кубика в сцене
    mesh.position.set(x, y, z);
    // Добавляем кубик в сцену
    scene.add(mesh);

    // Создаем физическую модель кубика с использованием CannonJS
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2));
    // Определяем массу кубика: если он должен падать, масса больше 0, иначе 0
    let mass = falls ? 5 : 0;
    // Масса пропорциональна размерам кубика
    mass *= (width / originalBoxSize) * (depth / originalBoxSize);
    // Создаем физическое тело для кубика
    const body = new CANNON.Body({ mass, shape });
    // Устанавливаем его позицию в физическом мире
    body.position.set(x, y, z);
    // Добавляем физическое тело в мир CannonJS
    world.addBody(body);

    // Возвращаем объект, содержащий как полигональную сетку (для визуализации), так и физическое тело (для симуляции)
    return { threejs: mesh, cannonjs: body, width, depth };
}

// Функция для добавления свеса, который будет падать с пирамиды
function addOverhang(x, z, width, depth) {
    // Рассчитываем высоту свеса (обрезанной части), которая совпадает с предыдущим верхним слоем
    const y = boxHeight * (stack.length - 1);
    // Создаем новую часть, которая упадет с пирамиды
    const overhang = generateBox(x, y, z, width, depth, true);
    // Добавляем эту часть в массив overhangs
    overhangs.push(overhang);
}


// Функция для обрезки верхнего блока и создания нового блока
function cutBox(topLayer, overlap, size, delta) {
    // Определяем направление движения текущего верхнего блока
    const direction = topLayer.direction;
    // Рассчитываем новые размеры верхнего блока после обрезки
    const newWidth = direction === "x" ? overlap : topLayer.width;
    const newDepth = direction === "z" ? overlap : topLayer.depth;

    // Обновляем размеры верхнего блока в массиве stack
    topLayer.width = newWidth;
    topLayer.depth = newDepth;


    let soundCabinList = ['1.mp3', '3.mp3', '4.mp3', '5.mp3'];
    // Генерация случайного индекса
    let randomIndexsoundCabin = Math.floor(Math.random() * soundCabinList.length);

// Выбор случайного элемента
    let randomsoundCabin = soundCabinList[randomIndexsoundCabin];
    playSound("sound/cabin/"+randomsoundCabin);

    // Обновляем размеры и позицию блока в сцене ThreeJS
    topLayer.threejs.scale[direction] = overlap / size;
    topLayer.threejs.position[direction] -= delta / 2;

    // Обновляем физическое тело в CannonJS, чтобы оно соответствовало новым размерам блока
    topLayer.cannonjs.position[direction] -= delta / 2;
    const shape = new CANNON.Box(new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2));
    topLayer.cannonjs.shapes = [];
    topLayer.cannonjs.addShape(shape);
}


// Функция для инициализации игры и отображения демонстрации на автопилоте
function init() {
    autopilot = true; // Включаем автопилот для демонстрационного режима
    gameEnded = false; // Игра еще не закончена
    lastTime = 0; // Обнуляем время последней анимации
    stack = []; // Очищаем массив слоев пирамиды
    overhangs = []; // Очищаем массив падающих частей
    robotPrecision = Math.random() * 1 - 0.1; // Задаем точность игры на автопилоте

    // Настраиваем физический мир CannonJS
    world = new CANNON.World();
    world.gravity.set(0, -10, 0); // Устанавливаем гравитацию вниз
    world.broadphase = new CANNON.NaiveBroadphase(); // Алгоритм для обработки столкновений
    world.solver.iterations = 40; // Увеличиваем количество итераций для повышения точности симуляции

    // Настраиваем камеру и сцену в ThreeJS
    const aspect = window.innerWidth / window.innerHeight;
    const width = 7;
    const height = width / aspect;

    // Камера будет ортографической (без перспективы)
    camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0, 100);
    camera.position.set(4, 4, 4); // Устанавливаем позицию камеры
    camera.lookAt(0, 0, 0); // Камера смотрит на центр сцены

    // Создаем сцену и задаем фон
    scene = new THREE.Scene();
    scene.background = null;

    // Добавляем первый слой пирамиды (основание)
    addLayer(0, 0, originalBoxSize, originalBoxSize);
    // Добавляем второй слой пирамиды, который будет двигаться
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

    // Настраиваем освещение в сцене
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Фоновое освещение
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); // Направленный свет
    dirLight.position.set(10, 20, 0);
    scene.add(dirLight);

    // Настраиваем рендерер для отрисовки сцены
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animation); // Устанавливаем функцию анимации для рендера
    document.body.appendChild(renderer.domElement); // Добавляем рендер на страницу
    renderer.render(scene, camera); // Отрисовываем сцену с текущими настройками
}

// Функция для запуска игры (сброс всех настроек и перезапуск)
function startGame() {
    autopilot = false; // Выключаем автопилот
    gameEnded = false; // Сбрасываем флаг конца игры
    lastTime = 0; // Обнуляем время последней анимации
    stack = []; // Очищаем массив слоев пирамиды
    overhangs = []; // Очищаем массив падающих частей

    // Если на экране есть инструкции или результаты — скрываем их
    if (instructionsElement) instructionsElement.style.display = "none";
    if (resultsElement) resultsElement.style.display = "none";
    if (scoreElement) scoreElement.innerText = 0; // Сбрасываем счетчик очков

    // Удаляем все объекты из физического мира
    if (world) {
        while (world.bodies.length > 0) {
            world.remove(world.bodies[0]);
        }
    }

    // Удаляем все объекты из сцены
    if (scene) {
        while (scene.children.find((c) => c.type === "Mesh")) {
            const mesh = scene.children.find((c) => c.type === "Mesh");
            scene.remove(mesh);
        }

        // Добавляем основание и первый движущийся слой
        addLayer(0, 0, originalBoxSize, originalBoxSize);
        addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
    }

    // Сбрасываем позицию камеры
    if (camera) {
        camera.position.set(4, 4, 4);
        camera.lookAt(0, 0, 0);
    }
}



// Обработчик событий для отслеживания кликов или касаний экрана
function eventHandler() {
    if (!is_started || !canHandleEvent) return; // Если игра не начата или обработка событий не разрешена, выходим

    if (autopilot) startGame(); // Если включен автопилот, перезапускаем игру
    else splitBlockAndAddNextOneIfOverlaps(); // Иначе обрезаем блок и добавляем новый
}

// обрезаем блок как есть и запускаем следующий
function splitBlockAndAddNextOneIfOverlaps() {
    // если игра закончилась - выходим из функции
    if (gameEnded) return;
    // берём верхний блок и тот, что под ним
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    // направление движения блока
    const direction = topLayer.direction;

    // если двигались по оси X, то берём ширину блока, а если нет (по оси Z) — то глубину
    const size = direction == "x" ? topLayer.width : topLayer.depth;
    // считаем разницу между позициями этих двух блоков
    const delta =
        topLayer.threejs.position[direction] -
        previousLayer.threejs.position[direction];
    // считаем размер свеса
    const overhangSize = Math.abs(delta);
    // размер отрезаемой части
    const overlap = size - overhangSize;

    const cutPercentage = (overhangSize / size) * 100;
    // если есть что отрезать (если есть свес)
    if (overlap > 0) {

        if (cutPercentage > 10)
        {
            correctTaps = 0;
            // отрезаем
            cutBox(topLayer, overlap, size, delta);

            // считаем размер свеса
            const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
            // если обрезка была по оси X
            const overhangX =
                direction == "x"
                    ? topLayer.threejs.position.x + overhangShift
                    : topLayer.threejs.position.x;
            // если обрезка была по оси Z
            const overhangZ =
                direction == "z"
                    // то добавляем размер свеса к начальным координатам по этой оси
                    ? topLayer.threejs.position.z + overhangShift
                    : topLayer.threejs.position.z;
            // если свес был по оси X, то получаем ширину, а если по Z — то глубину
            const overhangWidth = direction == "x" ? overhangSize : topLayer.width;
            const overhangDepth = direction == "z" ? overhangSize : topLayer.depth;

            // рисуем новую фигуру после обрезки, которая будет падать вних
            addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

            // формируем следующий блок
            // отодвигаем их подальше от пирамиды на старте
            const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
            const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
            // новый блок получает тот же размер, что и текущий верхний
            const newWidth = topLayer.width;
            const newDepth = topLayer.depth;
            // меняем направление относительно предыдущего
            const nextDirection = direction == "x" ? "z" : "x";

            // если идёт подсчёт очков — выводим текущее значение
            if (scoreElement) scoreElement.innerText = stack.length - 1;
            // добавляем в сцену новый блок
            addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
            // если свеса нет и игрок полностью промахнулся мимо пирамиды
        }
        else
        {
            correctTaps++;

            // Устанавливаем блок точно по центру предыдущего слоя
            topLayer.threejs.position[direction] = previousLayer.threejs.position[direction];
            topLayer.cannonjs.position[direction] = previousLayer.threejs.position[direction];

            // Обнуляем скорость и угловую скорость блока в физическом мире, чтобы он оставался на месте
            topLayer.cannonjs.velocity.set(0, 0, 0);
            topLayer.cannonjs.angularVelocity.set(0, 0, 0);

            // Трижды моргаем цветом при постановке блока
            flashColorWithVibrationAndSound(topLayer.threejs, 0xFFFFDD, 'sound/perfectTap/2181b19773767a7.mp3'); // Меняем цвет на желтый

            // Проверяем, если 5 правильных тапов подряд
            if (correctTaps === 5) {
                increaseBlockSize(topLayer, 1.1, originalBoxSize);
                correctTaps = 0; // Сбрасываем счетчик после увеличения
            }

            // формируем следующий блок
            // отодвигаем их подальше от пирамиды на старте
            const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
            const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
            // новый блок получает тот же размер, что и текущий верхний
            const newWidth = topLayer.width;
            const newDepth = topLayer.depth;
            // меняем направление относительно предыдущего
            const nextDirection = direction == "x" ? "z" : "x";
            if (scoreElement) scoreElement.innerText = stack.length - 1;
            addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
        }
    }
    else {
        // обрабатываем промах
        missedTheSpot();
    }
}

// Функция для увеличения размера блока на 1.1 раз, но не больше originalBoxSize
function increaseBlockSize(block, scaleMultiplier, maxSize) {
    const newWidth = Math.min(block.width * scaleMultiplier, maxSize);
    const newDepth = Math.min(block.depth * scaleMultiplier, maxSize);

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


// Функция для воспроизведения звука
function playSound(soundFile) {
    const audio = new Audio(soundFile);
    audio.play();
}

// Функция для трижды изменения цвета блока и добавления вибрации
function flashColorWithVibrationAndSound(block, newColor, soundFile, duration = 50, times = 3) {
    // Сохраняем исходный цвет
    const originalColor = block.material.color.getHex();

    // Воспроизводим звук
    playSound(soundFile);

    // Функция для моргания
    function toggleColor(currentTime) {
        // Если количество морганий ещё не достигло нужного числа
        if (currentTime < times * 2) {
            // Меняем цвет
            const isOriginalColor = currentTime % 2 === 0;
            block.material.color.setHex(isOriginalColor ? newColor : originalColor);

            if (isMobileDevice())
            {
                // Если это первый раз, добавляем вибрацию
                if (currentTime === 0 && navigator.vibrate) {
                    navigator.vibrate([100, 100, 100]); // Вибрация на 200 мс, пауза 100 мс, затем снова вибрация 200 мс
                }
            }


            // Запускаем следующий цикл через указанное время
            setTimeout(() => toggleColor(currentTime + 1), duration);
        } else {
            // Возвращаем цвет в конце, чтобы гарантировать, что он вернется к исходному
            block.material.color.setHex(originalColor);
        }
    }

    // Запускаем первый цикл
    toggleColor(0);
}

// обрабатываем промах
function missedTheSpot() {
    // получаем номер текущего блока
    const topLayer = stack[stack.length - 1];

    // формируем срез (который упадёт) полностью из всего блока
    addOverhang(
        topLayer.threejs.position.x,
        topLayer.threejs.position.z,
        topLayer.width,
        topLayer.depth
    );
    // убираем всё из физического мира и из сцены
    world.remove(topLayer.cannonjs);
    scene.remove(topLayer.threejs);
    // помечаем, что наступил конец игры
    gameEnded = true;
    is_started = false;
    // если есть результаты и сейчас не была демоигра — выводим результаты на экран
    if (resultsElement && !autopilot) resultsElement.style.display = "flex";
}

// анимация игры
function animation(time) {
    // если прошло сколько-то времени с момента прошлой анимации
    if (lastTime) {
        // считаем, сколько прошло
        const timePassed = time - lastTime;
        // задаём скорость движения
        const speed = 0.008;
        // берём верхний и предыдущий слой
        const topLayer = stack[stack.length - 1];
        const previousLayer = stack[stack.length - 2];

        // верхний блок должен двигаться
        // ЕСЛИ не конец игры
        // И это не автопилот
        // ИЛИ это всё же автопилот, но алгоритм ещё не довёл блок до нужного места
        const boxShouldMove =
            !gameEnded &&
            (!autopilot ||
                (autopilot &&
                    topLayer.threejs.position[topLayer.direction] <
                    previousLayer.threejs.position[topLayer.direction] +
                    robotPrecision));
        // если верхний блок должен двигаться
        if (boxShouldMove) {
            // двигаем блок одновременно в сцене и в физическом мире
            topLayer.threejs.position[topLayer.direction] += speed * timePassed;
            topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;

            // если блок полностью улетел за пирамиду
            if (topLayer.threejs.position[topLayer.direction] > 10) {
                // обрабатываем промах
                missedTheSpot();
            }
            // если верхний блок двигаться не должен
        } else {
            // единственная ситуация, когда это возможно, это когда автопилот только-только поставил блок на место
            // в этом случае обрезаем лишнее и запускаем следующий блок
            if (autopilot) {
                splitBlockAndAddNextOneIfOverlaps();
                robotPrecision = Math.random() * 1 - 0.5;
            }
        }

        // после установки блока поднимаем камеру
        if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
            camera.position.y += speed * timePassed;
        }
        // обновляем физические события, которые должны произойти
        updatePhysics(timePassed);
        // рендерим новую сцену
        renderer.render(scene, camera);
    }
    // ставим текущее время как время последней анимации
    lastTime = time;
}

// обновляем физические события
function updatePhysics(timePassed) {
    // настраиваем длительность событий
    world.step(timePassed / 1000); // Step the physics world

    // копируем координаты из Cannon.js в Three.js2
    overhangs.forEach((element) => {
        element.threejs.position.copy(element.cannonjs.position);
        element.threejs.quaternion.copy(element.cannonjs.quaternion);
    });
}

function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getRandomGradient() {
    const randomIndex = Math.floor(Math.random() * gradients.length);
    return gradients[randomIndex];
}

// подготавливаемся к запуску и показываем демку на автопилоте
init();


// если открыто на смартфоне то событие тач, если на компьютере то событие клик
if (isMobileDevice()) {
    window.addEventListener("touchstart", eventHandler);
    btn_start.addEventListener("touchstart", function (event) {
        event.preventDefault();
        // запускаем игру
        startGame();
        is_started = true;
        canHandleEvent = false;

        setTimeout(() => {
            canHandleEvent = true;
        }, startDelay);
        // выходим из обработчика
        return;
    });
    btn_again.addEventListener("touchstart", function (event) {
        event.preventDefault();
        // запускаем игру
        startGame();
        is_started = true;
        canHandleEvent = false;

        setTimeout(() => {
            canHandleEvent = true;
        }, startDelay);
        // выходим из обработчика
        return;
    });
}
else
{
    window.addEventListener("click", eventHandler);
    btn_start.addEventListener("click", function (event) {
        event.preventDefault();
        // запускаем игру
        startGame();
        is_started = true;
        canHandleEvent = false;

        setTimeout(() => {
            canHandleEvent = true;
        }, startDelay);
        // выходим из обработчика
        return;
    });
    btn_again.addEventListener("click", function (event) {
        event.preventDefault();
        // запускаем игру
        startGame();
        is_started = true;
        canHandleEvent = false;

        setTimeout(() => {
            canHandleEvent = true;
        }, startDelay);
        // выходим из обработчика
        return;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const gradient = getRandomGradient();
    const particlesElement = document.getElementById('particles-js');

    if (particlesElement) {
        particlesElement.style.background = `linear-gradient(to bottom, ${gradient.start}, ${gradient.end})`;
    }
});

// обрабатываем изменение размеров окна
window.addEventListener("resize", () => {
    const aspect = window.innerWidth / window.innerHeight;
    const width = 10;
    const height = width / aspect;

    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.render(scene, camera);
});