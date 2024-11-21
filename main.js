import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer, controls;
const objects = [];
let raycaster, gunModel;

// movement
let moveForward = false,
  moveBackward = false,
  moveLeft = false,
  moveRight = false;
let canJump = false,
  jumpKeyHeld = false,
  isSprinting = false;
const normalSpeed = 450.0,
  sprintSpeed = 700.0,
  jumpForce = 70.0,
  jumpGravity = 19.0;

// fov changes
const normalFOV = 70,
  sprintFOV = 90,
  fovTransitionSpeed = 8;

let prevTime = performance.now();
const velocity = new THREE.Vector3(),
  direction = new THREE.Vector3();

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

  // pointerlockcontrols module
  controls = new PointerLockControls(camera, document.body);
  setupControls();

  scene.add(controls.object);

  // keyboard input
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
  loadGunModel();

  // floor
  createFloor();

  // random pillars and spheres
  createRandomObjects();

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);
}
// pause / resume
function setupControls() {
  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');

  instructions.addEventListener('click', () => controls.lock());

  controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    blocker.style.display = 'block';
    instructions.style.display = '';
  });
}
// movement inputs
function onKeyDown(event) {
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
      if (canJump) velocity.y += jumpForce;
      canJump = false;
      break;
    case 'ShiftLeft':
      isSprinting = true;
      break;
  }
}

function onKeyUp(event) {
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
}

function loadGunModel() {
  const loader = new GLTFLoader();
  loader.load('./resources/scene.gltf', (gltf) => {
    gunModel = gltf.scene;
    gunModel.scale.set(2, 2, 2);
    gunModel.position.set(2, -1, -2);
    gunModel.rotation.set(0, Math.PI, 0.05);
    camera.add(gunModel);
  });
}
// creates floor
function createFloor() {
  const floorTexture = new THREE.TextureLoader().load(
    './resources/repeatinggrass.jpg'
  );
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(350, 350);

  const floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture });
  const floorGeometry = new THREE.PlaneGeometry(10000, 10000);
  floorGeometry.rotateX(-Math.PI / 2);

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floor);
}
// spawns random objects
function createRandomObjects() {
  const pillarGeometry = new THREE.CylinderGeometry(5, 5, 100, 32);
  const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x9b6c37 });
  const sphereGeometry = new THREE.SphereGeometry(50, 32, 32);
  const sphereMaterial1 = new THREE.MeshBasicMaterial({ color: 0xff6660 });
  const sphereMaterial2 = new THREE.MeshBasicMaterial({ color: 0xffa500 });

  for (let i = 0; i < 500; i++) {
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    const sphere = new THREE.Mesh(
      sphereGeometry,
      Math.random() > 0.5 ? sphereMaterial1 : sphereMaterial2
    );

    const x = Math.random() * 1800 - 900;
    const z = Math.random() * 1800 - 900;

    pillar.position.set(x, 50, z);
    sphere.position.set(x, 150, z);
    sphere.position.y += -40;

    scene.add(pillar);
    scene.add(sphere);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
// movement physics
function animate() {
  const time = performance.now();

  if (controls.isLocked) {
    raycaster.ray.origin.copy(controls.object.position);
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(objects, false);
    const onObject = intersections.length > 0;
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * jumpGravity * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    const speed = isSprinting ? sprintSpeed : normalSpeed;
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    if (onObject) {
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

    const targetFOV = isSprinting ? sprintFOV : normalFOV;
    camera.fov += (targetFOV - camera.fov) * fovTransitionSpeed * delta;
    camera.updateProjectionMatrix();
  }

  prevTime = time;
  renderer.render(scene, camera);
}
