/**
 * Car3D - 3D赛车类（继承Car）
 * 管理3D模型和物理同步
 */

import { Car } from '../../js/car.js';
import { CarModel } from '../models/car-model.js';

export class Car3D extends Car {
    constructor(x, y, angle, scene) {
        super(x, y, angle);
        this.scene = scene;
        this.carModel = new CarModel();

        // Add model to scene
        if (scene) {
            scene.add(this.carModel.mesh);
        }

        // Speed boost (for word bubbles)
        this.speedBoostMultiplier = 1.0;
        this.speedBoostTimer = 0;

        // Collision penalty
        this.collisionPenalty = 0;

        // Sync initial position
        this.sync3DPosition();
    }

    get model() {
        return this.carModel;
    }

    /**
     * Update car physics and sync 3D model
     * @param {Track} track - the track object
     * @param {number} totalLaps - total laps to complete
     * @param {number} deltaTime - time step in seconds (default 1/60)
     */
    update(track, totalLaps = 3, deltaTime = 1/60) {
        // Apply speed boost if active
        const originalMaxSpeed = this.maxSpeed;
        const originalNitroMaxSpeed = this.nitroMaxSpeed;

        if (this.speedBoostTimer > 0) {
            this.maxSpeed *= this.speedBoostMultiplier;
            this.nitroMaxSpeed *= this.speedBoostMultiplier;
            this.speedBoostTimer -= deltaTime;
        }

        const previousState = {
            x: this.x,
            y: this.y,
            angle: this.angle,
            speed: this.speed,
        };

        if (this.collisionPenalty > 0) {
            this.collisionPenalty -= deltaTime;
            const savedInput = { ...this.input };
            this.input.up = false;
            this.input.left = false;
            this.input.right = false;
            super.update(track, totalLaps, deltaTime);
            this.input = savedInput;
        } else {
            super.update(track, totalLaps, deltaTime);
        }

        if (track.checkCollision && track.checkCollision(this)) {
            this._handleCollision(track, previousState, deltaTime);
        }

        // Restore original max speeds
        this.maxSpeed = originalMaxSpeed;
        this.nitroMaxSpeed = originalNitroMaxSpeed;

        // Sync 3D model position
        this.sync3DPosition();

        // Update wheel rotation
        this.carModel.updateWheelRotation(this.speed);
    }

    /**
     * Handle collision with barrier
     * @param {Track} track - the track object
     * @param {number} deltaTime - time step
     * @private
     */
    _handleCollision(track, previousState, deltaTime) {
        const impactSpeed = Math.abs(this.speed || previousState.speed);
        const normal = track.getTrackNormal(this.x, this.y);
        const reboundSpeed = Math.min(impactSpeed * 0.35, this.maxSpeed * 0.35);

        this.x = previousState.x + normal.x * 1.5;
        this.y = previousState.y + normal.y * 1.5;
        this.angle = previousState.angle + Math.PI;
        this.speed = -reboundSpeed;

        if (track.checkCollision && track.checkCollision(this)) {
            this.x = previousState.x;
            this.y = previousState.y;
            this.angle = previousState.angle;
        }

        this.collisionPenalty = 0.5;

        if (this.eventBus) {
            this.eventBus.emit('car:collision', { x: this.x, y: this.y });
        }

        const dist = track.getNearestDistance(this.x, this.y);
        const maxDist = track.trackWidth / 2 + 30;
        if (dist > maxDist) {
            this._rescueToTrack(track);
        }
    }

    /**
     * Get current gear (1-6)
     * Based on speed percentage
     */
    getGear() {
        const speedPercent = Math.abs(this.speed) / this.maxSpeed;
        if (speedPercent < 0.15) return 1;
        if (speedPercent < 0.30) return 2;
        if (speedPercent < 0.50) return 3;
        if (speedPercent < 0.70) return 4;
        if (speedPercent < 0.90) return 5;
        return 6;
    }

    /**
     * Get current RPM (0-8000)
     * Based on gear and speed within gear range
     */
    getRPM() {
        const gear = this.getGear();
        const speedPercent = Math.abs(this.speed) / this.maxSpeed;

        // Calculate RPM within each gear (0-8000 range)
        const gearRanges = [
            [0, 0.15],    // 1st gear
            [0.15, 0.30], // 2nd gear
            [0.30, 0.50], // 3rd gear
            [0.50, 0.70], // 4th gear
            [0.70, 0.90], // 5th gear
            [0.90, 1.0]   // 6th gear
        ];

        const [min, max] = gearRanges[gear - 1];
        const gearProgress = (speedPercent - min) / (max - min);

        // RPM cycles 0-8000 within each gear
        return Math.min(8000, Math.max(0, gearProgress * 8000));
    }

    /**
     * Get display speed in km/h
     */
    getDisplaySpeed() {
        return Math.round(Math.abs(this.speed) * 50);
    }

    /**
     * Sync 2D position to 3D model
     * Converts: 2D (x, y) → 3D (x, 0, z)
     */
    sync3DPosition() {
        // 2D Y → 3D Z
        this.carModel.mesh.position.set(this.x, 0, this.y);

        // 2D angle → 3D rotation (rotate around Y axis)
        // In 2D: angle=0 points right (+X), angle=Math.PI/2 points down (+Y)
        // In 3D: we want angle=0 to point right (+X), angle=Math.PI/2 to point backward (-Z)
        // So we need to negate the angle for correct rotation
        this.carModel.mesh.rotation.y = -this.angle;
    }

    /**
     * Apply temporary speed boost (for word bubbles)
     * @param {number} multiplier - speed multiplier (e.g., 1.5 = 50% speed boost)
     * @param {number} duration - duration in seconds
     */
    applySpeedBoost(multiplier, duration) {
        this.speedBoostMultiplier = multiplier;
        this.speedBoostTimer = duration;
    }

    /**
     * Reset car to start position
     * @param {number} x - start x position
     * @param {number} y - start y position
     * @param {number} angle - start angle
     */
    reset(x, y, angle) {
        super.reset(x, y, angle);
        this.speedBoostMultiplier = 1.0;
        this.speedBoostTimer = 0;
        this.sync3DPosition();
    }
}
