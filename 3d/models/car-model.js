/**
 * CarModel - Low-polygon 3D car model
 * Uses Three.js primitives for low-poly aesthetic
 */

import * as THREE from 'three';

export class CarModel {
    constructor() {
        this.group = new THREE.Group();
        this.wheels = [];

        this._createBody();
        this._createCockpit();
        this._createWings();
        this._createWheels();
    }

    get mesh() {
        return this.group;
    }

    /**
     * Update wheel rotation based on car speed
     * @param {number} speed - car speed in pixels/frame
     */
    updateWheelRotation(speed) {
        const rotationSpeed = speed * 0.3; // Adjust multiplier for visual effect
        for (const wheel of this.wheels) {
            wheel.rotation.x += rotationSpeed;
        }
    }

    _createBody() {
        // Main body - red (scaled up 5x for better visibility)
        const bodyGeometry = new THREE.BoxGeometry(12, 3, 6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xE53935 });
        bodyMaterial.name = 'body';
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 1.5, 0);
        this.group.add(body);

        // Hood (front section)
        const hoodGeometry = new THREE.BoxGeometry(4, 1.5, 5);
        const hoodMaterial = new THREE.MeshLambertMaterial({ color: 0xE53935 });
        hoodMaterial.name = 'body';
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(6, 2.25, 0);
        this.group.add(hood);
    }

    _createCockpit() {
        // Cockpit - black (scaled up 5x)
        const cockpitGeometry = new THREE.BoxGeometry(4, 2, 4);
        const cockpitMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(-1, 3.5, 0);
        this.group.add(cockpit);
    }

    _createWings() {
        // Front wing - dark red (scaled up 5x)
        const frontWingGeometry = new THREE.BoxGeometry(0.5, 0.75, 7);
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xB71C1C });
        const frontWing = new THREE.Mesh(frontWingGeometry, wingMaterial);
        frontWing.position.set(8.25, 0.75, 0);
        this.group.add(frontWing);

        // Rear wing - dark red (scaled up 5x)
        const rearWingGeometry = new THREE.BoxGeometry(0.75, 2, 7);
        const rearWing = new THREE.Mesh(rearWingGeometry, wingMaterial);
        rearWing.position.set(-6.5, 2.5, 0);
        this.group.add(rearWing);

        // Rear wing support (scaled up 5x)
        const supportGeometry = new THREE.BoxGeometry(0.25, 1.5, 0.5);
        const support1 = new THREE.Mesh(supportGeometry, wingMaterial);
        support1.position.set(-6, 1.75, 2.5);
        this.group.add(support1);

        const support2 = new THREE.Mesh(supportGeometry, wingMaterial);
        support2.position.set(-6, 1.75, -2.5);
        this.group.add(support2);
    }

    _createWheels() {
        const wheelGeometry = new THREE.CylinderGeometry(1.25, 1.25, 1, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1A1A1A });

        // Rotate geometry so wheels face correct direction (along Z axis)
        wheelGeometry.rotateZ(Math.PI / 2);

        const wheelPositions = [
            { x: 4, y: 1.25, z: 3.5 },   // Front right
            { x: 4, y: 1.25, z: -3.5 },  // Front left
            { x: -4, y: 1.25, z: 3.5 },  // Rear right
            { x: -4, y: 1.25, z: -3.5 }  // Rear left
        ];

        for (const pos of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            this.wheels.push(wheel);
            this.group.add(wheel);
        }
    }
}
