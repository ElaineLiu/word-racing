import * as THREE from 'three';

export function createBuildingModel({ height = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'building-decoration';

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, height, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x607d8b, flatShading: true }),
  );
  building.position.y = height / 2;
  group.add(building);

  return group;
}