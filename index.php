<!DOCTYPE html>
<html lang="ru" >
<head>
    <meta charset="UTF-8">
    <title>Пирамида</title>
    <!-- подключаем стили -->
    <link rel="stylesheet" href="css/style.css">
    <meta name="viewport" content="width=device-width, initial-scale=1">


</head>
<body>
<div id="blurOverlay"></div>
<div id="particles-js"></div>
<div id="instructions">

    <div class="content">
        <button id="btn_start">НАЧАТЬ</button>
    </div>
</div>
<!-- блок с результатами игры -->
<div id="results">

    <div class="content">
        <button id="btn_again">ЗАНОВО</button>
<!--        <p>Вы промахнулись</p>-->
<!--        <p>Для перезапуска игры нажмите R</p>-->
    </div>
</div>
<!-- блок с очками -->

<div id="score">0</div>

<div class="container-for-word">
    <div class="row">
        <div class="letter">*</div>
        <div class="letter">*</div>
        <div class="letter">*</div>
        <div class="letter">*</div>
        <div class="letter">*</div>
    </div>
</div>

<script src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r124/three.min.js'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js'></script>
<script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js"></script>

<script  src="js/script.js"></script>

<script>
    particlesJS("particles-js", {"particles":{"number":{"value":20,"density":{"enable":true,"value_area":700}},"color":{"value":"#fefeff"},"shape":{"type":"circle","stroke":{"width":0,"color":"#000000"},"polygon":{"nb_sides":5},"image":{"src":"img/github.svg","width":100,"height":100}},"opacity":{"value":1,"random":true,"anim":{"enable":true,"speed":1,"opacity_min":0,"sync":false}},"size":{"value":10,"random":true,"anim":{"enable":true,"speed":4,"size_min":0.3,"sync":false}},"line_linked":{"enable":false,"distance":150,"color":"#ffffff","opacity":0.4,"width":1},"move":{"enable":true,"speed":1,"direction":"none","random":true,"straight":false,"out_mode":"out","bounce":false,"attract":{"enable":false,"rotateX":600,"rotateY":600}}},"interactivity":{"detect_on":"canvas","events":{"onhover":{"enable":true,"mode":"bubble"},"onclick":{"enable":true,"mode":"repulse"},"resize":true},"modes":{"grab":{"distance":400,"line_linked":{"opacity":1}},"bubble":{"distance":250,"size":0,"duration":2,"opacity":0,"speed":3},"repulse":{"distance":400,"duration":0.4},"push":{"particles_nb":4},"remove":{"particles_nb":2}}},"retina_detect":true});var count_particles, stats, update; stats = new Stats; stats.setMode(0); stats.domElement.style.position = 'absolute'; stats.domElement.style.left = '0px'; stats.domElement.style.top = '0px'; document.body.appendChild(stats.domElement); count_particles = document.querySelector('.js-count-particles'); update = function() { stats.begin(); stats.end(); if (window.pJSDom[0].pJS.particles && window.pJSDom[0].pJS.particles.array) { count_particles.innerText = window.pJSDom[0].pJS.particles.array.length; } requestAnimationFrame(update); }; requestAnimationFrame(update);;
</script>


</body>
</html>