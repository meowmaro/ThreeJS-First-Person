import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer, controls;

const objects = [];
let raycaster;

let gunModel;

// movement
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let jumpKeyHeld = false;
let isSprinting = false;
const normalSpeed = 450.0;
const sprintSpeed = 700.0;
const jumpForce = 75.0;
const jumpGravity = 25.0;

// fov changes
const normalFOV = 70;
const sprintFOV = 90;
const fovTransitionSpeed = 9;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

init();

function init() {
  // camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.y = 10;

  // scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  // lighting
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  // controls setup
  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');

  instructions.addEventListener('click', function () {
    controls.lock();
  });

  controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
  });

  controls.addEventListener('unlock', function () {
    blocker.style.display = 'block';
    instructions.style.display = '';
  });

  scene.add(controls.object);

  // keyboard input
  const onKeyDown = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = true;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = true;
        break;

      case 'ArrowDown':
      case 'KeyS':
        moveBackward = true;
        break;

      case 'ArrowRight':
      case 'KeyD':
        moveRight = true;
        break;

      case 'Space':
        jumpKeyHeld = true;
        if (canJump === true) velocity.y += jumpForce;
        canJump = false;
        break;

      case 'ShiftLeft':
        isSprinting = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = false;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = false;
        break;

      case 'ArrowDown':
      case 'KeyS':
        moveBackward = false;
        break;

      case 'ArrowRight':
      case 'KeyD':
        moveRight = false;
        break;

      case 'Space':
        jumpKeyHeld = false;
        break;

      case 'ShiftLeft':
        isSprinting = false;
        break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // raycaster setup
  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1, 0),
    0,
    10
  );

  // gun model loading
  const loader = new GLTFLoader();
  loader.load('./resources/scene.gltf', function (gltf) {
    gunModel = gltf.scene;
    gunModel.scale.set(2, 2, 2);
    gunModel.position.set(2, -1, -2);
    gunModel.rotation.set(0, Math.PI, 0.05);
    camera.add(gunModel);
  });

  // floor
  const floorTexture = new THREE.TextureLoader().load(
    './resources/devtiles.png'
  );
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(200, 200);

  const floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture });

  const floorGeometry = new THREE.PlaneGeometry(10000, 10000);
  floorGeometry.rotateX(-Math.PI / 2);

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floor);

  // random pillars and spheres
  const pillarGeometry = new THREE.CylinderGeometry(5, 5, 100, 32);
  const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
  const sphereGeometry = new THREE.SphereGeometry(50, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff6660 });
  for (let i = 0; i < 500; i++) {
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    const x = Math.random() * 1800 - 900;
    const z = Math.random() * 1800 - 900;

    pillar.position.set(x, 50, z);
    sphere.position.set(x, 150, z);

    sphere.position.y += -40;

    scene.add(pillar);
    scene.add(sphere);
  }

  // renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  // window resize
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const time = performance.now();

  if (controls.isLocked === true) {
    // raycast check
    raycaster.ray.origin.copy(controls.object.position);
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(objects, false);

    const onObject = intersections.length > 0;
    // keeps time between frames consistent
    const delta = (time - prevTime) / 1000;

    // velocity damping
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    // gravity effect
    velocity.y -= 9.8 * jumpGravity * delta;

    // movement direction
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    const speed = isSprinting ? sprintSpeed : normalSpeed;

    // apply movement
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    if (onObject === true) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
    }

    if (jumpKeyHeld && canJump) {
      velocity.y += jumpForce;
      canJump = false;
    }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.object.position.y += velocity.y * delta;

    if (controls.object.position.y < 10) {
      velocity.y = 0;
      controls.object.position.y = 10;

      canJump = true;
    }

    // fov transition
    const targetFOV = isSprinting ? sprintFOV : normalFOV;
    camera.fov += (targetFOV - camera.fov) * fovTransitionSpeed * delta;
    camera.updateProjectionMatrix();
  }

  prevTime = time;

  renderer.render(scene, camera);
}
