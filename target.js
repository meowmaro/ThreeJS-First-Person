import * as THREE from 'three';

export function createTarget() {
  const geometry = new THREE.BoxGeometry(11, 11, 11);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1,
  });
  const target = new THREE.Mesh(geometry, material);
  target.position.set(20, 20, 20);
  target.userData.isTarget = true;
  target.userData.hitCount = 0;
  target.userData.incrementHitCount = function (scene) {
    this.hitCount += 1;
    if (this.hitCount >= 5) {
      scene.remove(this);
    }
  };
  return target;
}
