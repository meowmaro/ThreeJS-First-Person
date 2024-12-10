import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// movement
let camera, controls;
const velocity = new THREE.Vector3(),
  direction = new THREE.Vector3();
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
let isFlying = false;
const flyUpSpeed = 50.0;
const flyDownSpeed = 50.0;

// fov changes
const normalFOV = 70,
  sprintFOV = 90,
  fovTransitionSpeed = 8;

let bobbingTime = 0;
const originalGunPosition = new THREE.Vector3(1.2, -1, -2);
const gunReturnSpeed = 1.5;
let gunModel;

let score = 0;
let objects = [];
let scene;

let isMouseDown = false;

document.addEventListener('click', onMouseClick);
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.getElementById('saveScoreButton').addEventListener('click', saveScore);

export function initPlayer(cameraInstance, sceneObjects, sceneInstance) {
  camera = cameraInstance;
  controls = new PointerLockControls(camera, document.body);
  objects = sceneObjects;
  scene = sceneInstance;
  setupControls();
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  return controls;
}

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
    resetMovementStates();
  });
}

function resetMovementStates() {
  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
  isSprinting = false;
  jumpKeyHeld = false;
  velocity.set(0, 0, 0);
}

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
    case 'KeyC':
      isFlying = !isFlying;
      if (isFlying) {
        velocity.y = 0;
      }
      break;
    case 'Space':
      if (isFlying) {
        velocity.y = flyUpSpeed;
      } else {
        jumpKeyHeld = true;
        if (canJump) velocity.y += jumpForce;
        canJump = false;
      }
      break;
    case 'KeyQ':
      if (isFlying) {
        velocity.y = -flyDownSpeed;
      }
      break;
    case 'ShiftLeft':
      if (moveForward && !moveBackward) {
        isSprinting = true;
      }
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
      isSprinting = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
    case 'Space':
      if (isFlying) {
        velocity.y = 0;
      } else {
        jumpKeyHeld = false;
      }
      break;
    case 'ControlLeft':
      if (isFlying) {
        velocity.y = 0;
      }
      break;
    case 'ShiftLeft':
      isSprinting = false;
      break;
    case 'KeyQ':
      if (isFlying) {
        velocity.y = 0;
      }
      break;
  }
}

function onMouseDown(event) {
  if (controls.isLocked) {
    isMouseDown = true;
  }
}

function onMouseUp(event) {
  isMouseDown = false;
}

function onMouseClick(event) {
  if (controls.isLocked && isMouseDown) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const target = intersects[0].object;
      if (target.userData.isTarget) {
        score += 1;
        updateScoreDisplay();
        target.userData.incrementHitCount(scene);
      }
    }
  }
}

function updateScoreDisplay() {
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
    scoreElement.textContent = `Score: ${score}`;
  }
}

async function saveScore() {
  const playerName = prompt('Enter your name:');
  if (!playerName) return;

  try {
    const response = await fetch('http://localhost:5000/save-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ player: playerName, score }),
    });

    if (response.ok) {
      alert('Score saved successfully');
    } else {
      alert('Failed to save score');
    }
  } catch (err) {
    console.error('Error saving score:', err);
    alert('Failed to save score');
  }
}

export function updatePlayer(delta, raycaster, objects) {
  if (controls.isLocked) {
    raycaster.ray.origin.copy(controls.object.position);
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(objects, false);
    const onObject = intersections.length > 0;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    if (!isFlying) {
      velocity.y -= 9.8 * jumpGravity * delta;
    }

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    const speed = isSprinting ? sprintSpeed : normalSpeed;
    const flySpeedMultiplier = isFlying ? 2 : 1;
    if (moveForward || moveBackward)
      velocity.z -= direction.z * speed * flySpeedMultiplier * delta;
    if (moveLeft || moveRight)
      velocity.x -= direction.x * speed * flySpeedMultiplier * delta;

    if (!moveForward) {
      isSprinting = false;
    }

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

    if (isFlying) {
      controls.object.position.y += velocity.y * delta;
    } else {
      controls.object.position.y += velocity.y * delta;

      if (controls.object.position.y < 10) {
        velocity.y = 0;
        controls.object.position.y = 10;
        canJump = true;
      }
    }

    const targetFOV = isSprinting ? sprintFOV : normalFOV;
    const fovDelta = (targetFOV - camera.fov) * fovTransitionSpeed * delta;
    camera.fov += fovDelta;
    camera.updateProjectionMatrix();

    if (gunModel) {
      gunModel.position.z += fovDelta * 0.03;
      gunModel.scale.z -= fovDelta * 0.03;

      if (moveForward || moveBackward || moveLeft || moveRight) {
        bobbingTime += delta * 6;
        gunModel.position.y += Math.sin(bobbingTime) * 0.002;
      } else {
        bobbingTime = 0;
        gunModel.position.lerp(originalGunPosition, delta * gunReturnSpeed);
      }

      const leanAmount = 0.2;
      if (moveLeft) {
        gunModel.rotation.z = THREE.MathUtils.lerp(
          gunModel.rotation.z,
          -leanAmount,
          delta * 5
        );
      } else if (moveRight) {
        gunModel.rotation.z = THREE.MathUtils.lerp(
          gunModel.rotation.z,
          leanAmount,
          delta * 5
        );
      } else {
        gunModel.rotation.z = THREE.MathUtils.lerp(
          gunModel.rotation.z,
          0,
          delta * 5
        );
      }
    }
  }

  if (isMouseDown) {
    onMouseClick();
  }
}

export function setGunModel(model) {
  gunModel = model;
  gunModel.userData.isGun = true;
}
