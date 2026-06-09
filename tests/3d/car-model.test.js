/**
 * CarModel Tests
 * Tests the low-poly 3D car model
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CarModel } from '../../3d/models/car-model.js';
import * as THREE from 'three';

describe('CarModel', () => {
  let carModel;

  beforeEach(() => {
    carModel = new CarModel();
  });

  describe('initialization', () => {
    it('should create a Three.js Group', () => {
      expect(carModel.mesh).toBeInstanceOf(THREE.Group);
    });

    it('should have wheels array', () => {
      expect(carModel.wheels).toBeInstanceOf(Array);
      expect(carModel.wheels.length).toBe(4);
    });

    it('should have low vertex count (< 500)', () => {
      let totalVertices = 0;
      carModel.mesh.traverse((child) => {
        if (child.isMesh) {
          totalVertices += child.geometry.attributes.position.count;
        }
      });
      expect(totalVertices).toBeLessThan(500);
    });
  });

  describe('mesh composition', () => {
    it('should contain body mesh', () => {
      const meshes = [];
      carModel.mesh.traverse((child) => {
        if (child.isMesh) meshes.push(child);
      });
      expect(meshes.length).toBeGreaterThan(0);
    });

    it('should have red body color (#E53935)', () => {
      let foundBody = false;
      carModel.mesh.traverse((child) => {
        if (child.isMesh && child.material.color.getHex() === 0xE53935) {
          foundBody = true;
        }
      });
      expect(foundBody).toBe(true);
    });

    it('should have black cockpit color (#222222)', () => {
      let foundCockpit = false;
      carModel.mesh.traverse((child) => {
        if (child.isMesh && child.material.color.getHex() === 0x222222) {
          foundCockpit = true;
        }
      });
      expect(foundCockpit).toBe(true);
    });

    it('should have dark red wings color (#B71C1C)', () => {
      let foundWings = false;
      carModel.mesh.traverse((child) => {
        if (child.isMesh && child.material.color.getHex() === 0xB71C1C) {
          foundWings = true;
        }
      });
      expect(foundWings).toBe(true);
    });

    it('should have black wheels color (#1A1A1A)', () => {
      let wheelCount = 0;
      for (const wheel of carModel.wheels) {
        if (wheel.material.color.getHex() === 0x1A1A1A) {
          wheelCount++;
        }
      }
      expect(wheelCount).toBe(4);
    });
  });

  describe('updateWheelRotation', () => {
    it('should rotate wheels based on speed', () => {
      const initialRotations = carModel.wheels.map(w => w.rotation.x);

      carModel.updateWheelRotation(1.0);

      for (let i = 0; i < carModel.wheels.length; i++) {
        expect(carModel.wheels[i].rotation.x).toBeGreaterThan(initialRotations[i]);
      }
    });

    it('should handle zero speed', () => {
      const initialRotations = carModel.wheels.map(w => w.rotation.x);

      carModel.updateWheelRotation(0);

      for (let i = 0; i < carModel.wheels.length; i++) {
        expect(carModel.wheels[i].rotation.x).toBe(initialRotations[i]);
      }
    });

    it('should rotate backwards for negative speed', () => {
      const initialRotations = carModel.wheels.map(w => w.rotation.x);

      carModel.updateWheelRotation(-1.0);

      for (let i = 0; i < carModel.wheels.length; i++) {
        expect(carModel.wheels[i].rotation.x).toBeLessThan(initialRotations[i]);
      }
    });
  });
});
