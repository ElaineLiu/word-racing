import * as THREE from 'three';

export function createTreeModel() {
  const group = new THREE.Group();
  group.name = 'tree-decoration';

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41, flatShading: true }),
  );
  trunk.position.y = 0.25;

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.7, 7),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true }),
  );
  canopy.position.y = 0.85;

  group.add(trunk);
  group.add(canopy);
  return group;
}