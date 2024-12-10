import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initPlayer, updatePlayer, setGunModel } from './player.js';
import { createTarget } from './target.js';

let camera, scene, renderer, controls;
const objects = [];
let raycaster, gunModel, map;
let prevTime = performance.now();

init();

function init() {
  // camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    99999 // increases render distance
  );
  camera.position.y = 10;

  // scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 0, 9999);

  // lighting
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  // player controls
  controls = initPlayer(camera, objects, scene);
  scene.add(controls.object);

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

  // random targets
  createRandomTargets();

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);
}

function loadGunModel() {
  const loader = new GLTFLoader();
  loader.load(
    './resources/scene.gltf',
    (gltf) => {
      gunModel = gltf.scene;
      gunModel.scale.set(2, 2, 2);
      gunModel.position.set(1.2, -1, -1.8);
      gunModel.rotation.set(0, Math.PI, 0);
      camera.add(gunModel);
      setGunModel(gunModel);
    },
    undefined,
    (error) => {
      console.error('An error occurred while loading the gun model:', error);
    }
  );
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

  for (let i = 0; i < 1300; i++) {
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    const sphere = new THREE.Mesh(
      sphereGeometry,
      Math.random() > 0.5 ? sphereMaterial1 : sphereMaterial2
    );

    const x = Math.random() * 6400 - 3200;
    const z = Math.random() * 6400 - 3200;

    pillar.position.set(x, 50, z);
    sphere.position.set(x, 150, z);
    sphere.position.y += -40;

    scene.add(pillar);
    scene.add(sphere);
  }
}

function createRandomTargets() {
  for (let i = 0; i < 100; i++) {
    const target = createTarget();

    const x = Math.random() * 6400 - 3200;
    const z = Math.random() * 6400 - 3200;

    target.position.set(x, 10, z);

    scene.add(target);
    objects.push(target);
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
  const delta = (time - prevTime) / 1000;

  updatePlayer(delta, raycaster, objects);

  prevTime = time;
  renderer.render(scene, camera);
}
