import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


let camera, scene, renderer, controls;

const objects = [];
let raycaster;

let gunModel;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let isSprinting = false;
const normalSpeed = 450.0;
const sprintSpeed = 700.0;
const jumpForce = 75.0;
const jumpGravity = 25.0;

const normalFOV = 70;
const sprintFOV = 90;
const fovTransitionSpeed = 9;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

init();

function init() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.y = 10;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
  });

  scene.add(controls.object);

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Space":
        if (canJump === true) velocity.y += jumpForce;
        canJump = false;
        break;

      case "ShiftLeft":
        isSprinting = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;

      case "ShiftLeft":
        isSprinting = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1, 0),
    0,
    10
  );

  // Floor
  const floorTexture = new THREE.TextureLoader().load(
    "./resources/devtiles.png"
  );
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(70, 70);

  const floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture });

  const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
  floorGeometry.rotateX(-Math.PI / 2);

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floor);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const time = performance.now();

  if (controls.isLocked === true) {
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

    if (onObject === true) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
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
