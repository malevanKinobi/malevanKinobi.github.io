// сразу переводим фокус на окно, чтобы можно было начать игру
window.focus();

// объявляем переменные ThreeJS — камеру, сцену и рендер
let camera, scene, renderer;
// и сразу объявляем физический мир CannonJs
let world;
// время последней анимации
let lastTime;
// тут храним части пирамиды, которые уже стоят друг на друге
let stack;
// падающие части деталей, которые не поместились в границы пирамиды
let overhangs;
// высота каждой детали
const boxHeight = 1;
// исходная высота и ширина каждой детали
const originalBoxSize = 3;

// переменные для игры на автопилоте и конца игры
let autopilot;
let gameEnded;
// точность, с которой алгоритм будет играть на заставке
let robotPrecision;
let is_started = false;
let startDelay = 500;
let canHandleEvent = false;
// получаем доступ на странице к разделам с очками, правилами и результатами
const scoreElement = document.getElementById("score");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");

const btn_start = document.getElementById("btn_start");
const btn_again = document.getElementById("btn_again");



// добавление нового слоя
function addLayer(x, z, width, depth, direction) {
    // получаем высоту, на которой будем работать
    const y = boxHeight * stack.length;
    // создаём новый слой на этой высоте
    const layer = generateBox(x, y, z, width, depth, false);
    // устанавливаем направление движения
    layer.direction = direction;
    // добавляем слой в массив с пирамидой
    stack.push(layer);
}

// отрисовка игрового блока
function generateBox(x, y, z, width, depth, falls) {
    // используем ThreeJS для создания коробки
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    // создаём цвет, материал и полигональную сетку, которая создаст нам коробку
    const color = new THREE.Color(`hsl(${283 + stack.length * 10}, 50%, 50%)`);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    // устанавливаем координаты новой полигональной сетки
    mesh.position.set(x, y, z);
    // добавляем сетку-коробку в сцену
    scene.add(mesh);

    // применяем физику CannonJS
    // создаём новый виртуальный блок, который совпадает с отрисованной на предыдущем этапе
    const shape = new CANNON.Box(
        new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
    );
    // смотрим по входным параметрам, падает такой блок или нет
    let mass = falls ? 5 : 0;
    // уменьшаем массу блока пропорционально его размерам
    mass *= width / originalBoxSize;
    mass *= depth / originalBoxSize;
    // создаём новую фигуру на основе блока
    const body = new CANNON.Body({ mass, shape });
    // помещаем его в нужное место
    body.position.set(x, y, z);
    // добавляем фигуру в физический мир
    world.addBody(body);

    // возвращаем полигональные сетки и физические объекты, которые у нас получились после создания нового игрового блока
    return {
        threejs: mesh,
        cannonjs: body,
        width,
        depth
    };
}

// рисуем отрезанную часть блока
function addOverhang(x, z, width, depth) {
    // получаем высоту, на которой будем работать
    const y = boxHeight * (stack.length - 1);
    // создаём новую фигуру, которая вышла за свес
    const overhang = generateBox(x, y, z, width, depth, true);
    // добавляем её в свой массив
    overhangs.push(overhang);
}


// обрезаем игровой блок
function cutBox(topLayer, overlap, size, delta) {
    // получаем направление движения
    const direction = topLayer.direction;
    // и новую ширину и глубину
    const newWidth = direction == "x" ? overlap : topLayer.width;
    const newDepth = direction == "z" ? overlap : topLayer.depth;

    // обновляем параметры верхнего блока
    topLayer.width = newWidth;
    topLayer.depth = newDepth;

    // обновляем верхний блок в ThreeJS
    topLayer.threejs.scale[direction] = overlap / size;
    topLayer.threejs.position[direction] -= delta / 2;

    // обновляем верхний блок в CannonJS
    topLayer.cannonjs.position[direction] -= delta / 2;

    // заменяем верхний блок меньшим, обрезанным блоком
    const shape = new CANNON.Box(
        new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
    );
    // добавляем обрезанную часть фигуры в физическую модель сцены
    topLayer.cannonjs.shapes = [];
    topLayer.cannonjs.addShape(shape);
}

// подготавливаемся к запуску и показываем демку на автопилоте
init();

// подготовка игры к запуску
function init() {
    // включаем автопилот
    autopilot = true;
    // игра не закончилась
    gameEnded = false;
    // анимации ещё не было
    lastTime = 0;
    // в пирамиде и в обрезках ничего нет
    stack = [];
    overhangs = [];
    // задаём точность игры на автопилое
    robotPrecision = Math.random() * 1 - 0.1;

    // запускаем движок CannonJS
    world = new CANNON.World();
    // формируем гравитацию
    world.gravity.set(0, -10, 0);
    // включаем алгоритм, который находит сталкивающиеся объекты
    world.broadphase = new CANNON.NaiveBroadphase();
    // точность работы физики (по умолчанию — 10)
    world.solver.iterations = 40;

    // высчитываем соотношения высоты и ширины, чтобы пирамида выглядела пропорционально окну браузера
    const aspect = window.innerWidth / window.innerHeight;
    const width = 7;
    const height = width / aspect;

    // Включаем ThreeJs и добавляем камеру, от лица которой мы будем смотреть на пирамиду
    camera = new THREE.OrthographicCamera(
        width / -2,
        width / 2,
        height / 2,
        height / -2,
        0,
        100
    );

    // устанавливаем камеру в нужную точку и говорим, что она смотрит точно на центр сцены
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 1, 0);

    // создаём новую сцену
    scene = new THREE.Scene();
    scene.background = null;

    // основание пирамиды
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // первый слой
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

    // Настраиваем свет в сцене
    // фоновая подсветка
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    // прямой свет на пирамиду
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 0);
    scene.add(dirLight);

    // настройки рендера
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animation);
    renderer.setClearColor(new THREE.Color(0xc8b1ed), 0.9);
    // добавляем на страницу отрендеренную сцену
    document.body.appendChild(renderer.domElement);
    renderer.render(scene, camera);

}

// запуск игры
function startGame() {
    // выключаем автопилот
    autopilot = false;
    // сбрасываем все настройки
    gameEnded = false;
    lastTime = 0;
    stack = [];
    overhangs = [];

    // если на экране есть инструкции или результат — скрываем их
    if (instructionsElement) instructionsElement.style.display = "none";
    if (resultsElement) resultsElement.style.display = "none";
    // если видны очки — обнуляем их
    if (scoreElement) scoreElement.innerText = 0;

    // если физический мир уже создан — убираем из него все объекты
    if (world) {
        while (world.bodies.length > 0) {
            world.remove(world.bodies[0]);
        }
    }

    // если сцена уже есть, тоже убираем из неё всё, что было
    if (scene) {
        while (scene.children.find((c) => c.type == "Mesh")) {
            const mesh = scene.children.find((c) => c.type == "Mesh");
            scene.remove(mesh);
        }

        // добавляем основание
        addLayer(0, 0, originalBoxSize, originalBoxSize);

        // и первый слой
        addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
    }

    // если уже есть камера — сбрасываем её настройки
    if (camera) {
        camera.position.set(4, 4, 4);
        camera.lookAt(0, 0, 0);
    }
}





// отслеживаем нажатия на клавиши и мышь
//window.addEventListener("mousedown", eventHandler);

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



// своя оббраотка нажатия пробела
function eventHandler() {
    if (!is_started  || !canHandleEvent) return;
    // если включено демо — запускаем игру
    if (autopilot) startGame();
    // иначе обрезаем блок как есть и запускаем следующий
    else splitBlockAndAddNextOneIfOverlaps();
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
    console.log(cutPercentage)
    // если есть что отрезать (если есть свес)
    if (overlap > 0) {

        if (cutPercentage > 10)
        {
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
            // Устанавливаем блок точно по центру предыдущего слоя
            topLayer.threejs.position[direction] = previousLayer.threejs.position[direction];
            topLayer.cannonjs.position[direction] = previousLayer.threejs.position[direction];

            // Обнуляем скорость и угловую скорость блока в физическом мире, чтобы он оставался на месте
            topLayer.cannonjs.velocity.set(0, 0, 0);
            topLayer.cannonjs.angularVelocity.set(0, 0, 0);



            // Трижды моргаем цветом при постановке блока
            flashColorWithVibrationAndSound(topLayer.threejs, 0xFFFFDD, '374615055f77af8.mp3'); // Меняем цвет на желтый

            // формируем следующий блок
            // отодвигаем их подальше от пирамиды на старте
            const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
            const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
            // новый блок получает тот же размер, что и текущий верхний
            const newWidth = topLayer.width;
            const newDepth = topLayer.depth;
            console.log({newWidth, newDepth})
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

            // Если это первый раз, добавляем вибрацию
            if (currentTime === 0 && navigator.vibrate) {
                navigator.vibrate([100, 100, 100]); // Вибрация на 200 мс, пауза 100 мс, затем снова вибрация 200 мс
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