/**
 * Car3D - 3D赛车类（继承Car）
 * 管理3D模型和物理同步
 */

import { Car } from '../../js/car.js';
import { CarModel } from '../models/car-model.js';
import { DISPLAY, PHYSICS_3D } from '../../config/game-config.js';

export class Car3D extends Car {
    constructor(x, y, angle, scene) {
        super(x, y, angle, {
            maxSpeed: PHYSICS_3D.MAX_SPEED_KMH / DISPLAY.SPEED_DISPLAY_MULTIPLIER,
            acceleration: 100 / DISPLAY.SPEED_DISPLAY_MULTIPLIER / PHYSICS_3D.ZERO_TO_100_SECONDS / 60,
            linearAcceleration: true,
        });
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

        this._throttleLevel = 0;
        this._brakeLevel = 0;
        this._steeringLevel = 0;
        this._reverseBlockedUntilRelease = false;

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
            this.collisionPenalty = Math.max(0, this.collisionPenalty - deltaTime);
        }
        // Collision feedback must not lock steering. The player keeps control
        // while the boundary response removes only the outward movement.
        super.update(track, totalLaps, deltaTime);

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

    _updateLongitudinalSpeed({ maxSpd, onTrack, deltaTime }) {
        const throttleTarget = this.input.up ? 1 : 0;
        const brakeTarget = this.input.down ? 1 : 0;
        const throttleRate = throttleTarget > this._throttleLevel
            ? PHYSICS_3D.THROTTLE_RESPONSE_PER_SECOND
            : PHYSICS_3D.THROTTLE_RELEASE_PER_SECOND;
        this._throttleLevel = this._moveToward(
            this._throttleLevel, throttleTarget, throttleRate * deltaTime
        );
        this._brakeLevel = this._moveToward(
            this._brakeLevel, brakeTarget, PHYSICS_3D.BRAKE_RESPONSE_PER_SECOND * deltaTime
        );

        if (this.speed > 0 && this.input.down) {
            this._reverseBlockedUntilRelease = true;
        } else if (!this.input.down && Math.abs(this.speed) < 0.02) {
            this._reverseBlockedUntilRelease = false;
        }

        if (this.speed > 0.02) {
            if (this._brakeLevel > 0) {
                this.speed = Math.max(0,
                    this.speed - PHYSICS_3D.BRAKE_DECELERATION_PER_SECOND * this._brakeLevel * deltaTime);
            } else if (this._throttleLevel > 0) {
                const speedRatio = Math.min(1, this.speed / maxSpd);
                let acceleration = this.nitroActive
                    ? PHYSICS_3D.NITRO_ACCELERATION_PER_SECOND
                    : PHYSICS_3D.FORWARD_ACCELERATION_PER_SECOND;
                if (this.speedBoostTimer > 0) {
                    acceleration *= PHYSICS_3D.BOOST_ACCELERATION_MULTIPLIER;
                }
                this.speed += acceleration * (1 - speedRatio) * this._throttleLevel * deltaTime;
            } else {
                this._applyCoastingDrag(maxSpd, deltaTime);
            }
        } else if (this.speed < -0.02) {
            if (this._throttleLevel > 0) {
                this.speed = Math.min(0,
                    this.speed + PHYSICS_3D.BRAKE_DECELERATION_PER_SECOND * this._throttleLevel * deltaTime);
            } else if (this._brakeLevel > 0) {
                const reverseMax = PHYSICS_3D.REVERSE_MAX_SPEED_KMH / DISPLAY.SPEED_DISPLAY_MULTIPLIER;
                this.speed = Math.max(-reverseMax,
                    this.speed - PHYSICS_3D.REVERSE_ACCELERATION_PER_SECOND * this._brakeLevel * deltaTime);
            } else {
                this._applyCoastingDrag(maxSpd, deltaTime);
            }
        } else {
            if (this._throttleLevel > 0 && !this.input.down) {
                this.speed = Math.max(0, this.speed)
                    + PHYSICS_3D.FORWARD_ACCELERATION_PER_SECOND
                    * this._throttleLevel * deltaTime;
            } else if (this.input.down && this._brakeLevel > 0 && !this._reverseBlockedUntilRelease) {
                this.speed = Math.min(0, this.speed)
                    - PHYSICS_3D.REVERSE_ACCELERATION_PER_SECOND
                    * this._brakeLevel * deltaTime;
            } else {
                this.speed = 0;
            }
        }

        if (!onTrack) {
            this.speed *= Math.pow(this.offTrackFriction, deltaTime * 60);
        }
        this.speed = Math.max(-PHYSICS_3D.REVERSE_MAX_SPEED_KMH / DISPLAY.SPEED_DISPLAY_MULTIPLIER,
            Math.min(maxSpd, this.speed));
        if (Math.abs(this.speed) < 0.002 && !this.input.up && !this.input.down) this.speed = 0;
    }

    _applyCoastingDrag(maxSpd, deltaTime) {
        const direction = Math.sign(this.speed);
        const speedRatio = Math.min(1, Math.abs(this.speed) / maxSpd);
        const drag = PHYSICS_3D.COAST_ROLLING_RESISTANCE
            + PHYSICS_3D.COAST_AERO_DRAG * speedRatio * speedRatio;
        const nextMagnitude = Math.max(0, Math.abs(this.speed) - drag * deltaTime);
        this.speed = direction * nextMagnitude;
    }

    _updateSteering(_track, _frameScale, deltaTime) {
        const steeringTarget = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
        const steeringRate = steeringTarget === 0
            ? PHYSICS_3D.STEERING_RETURN_PER_SECOND
            : PHYSICS_3D.STEERING_RESPONSE_PER_SECOND;
        this._steeringLevel = this._moveToward(
            this._steeringLevel, steeringTarget, steeringRate * deltaTime
        );

        const speedRatio = Math.min(1, Math.abs(this.speed) / this.maxSpeed);
        const lowSpeedAuthority = Math.min(1, Math.abs(this.speed) / 0.6);
        const highSpeedGrip = 1 / (1 + PHYSICS_3D.HIGH_SPEED_STEERING_LOSS * speedRatio * speedRatio);
        const brakingGrip = 1 - 0.35 * this._brakeLevel;
        this.angle += this._steeringLevel * PHYSICS_3D.MAX_STEERING_RATE_PER_SECOND
            * lowSpeedAuthority * highSpeedGrip * brakingGrip * deltaTime;
    }

    _moveToward(current, target, maxDelta) {
        if (current < target) return Math.min(target, current + maxDelta);
        return Math.max(target, current - maxDelta);
    }

    /**
     * Handle collision with barrier
     * @param {Track} track - the track object
     * @param {number} deltaTime - time step
     * @private
     */
    _handleCollision(track, previousState, deltaTime) {
        const impactSpeed = Math.abs(this.speed || previousState.speed);
        const attemptedDx = this.x - previousState.x;
        const attemptedDy = this.y - previousState.y;
        const contact = track.getBoundaryContact(this.x, this.y);
        const along = attemptedDx * contact.tangent.x + attemptedDy * contact.tangent.y;

        // First preserve the component that advances along the road. This
        // makes a glancing contact slide instead of bouncing or turning around.
        this.x = previousState.x + contact.tangent.x * along;
        this.y = previousState.y + contact.tangent.y * along;

        if (track.checkCollision(this)) {
            const corrected = track.getBoundaryContact(this.x, this.y);
            const maxOffset = Math.max(0, track.trackWidth / 2 - this.height / 2 - 1);
            this.x = corrected.nearestPoint.x + corrected.normal.x * maxOffset;
            this.y = corrected.nearestPoint.y + corrected.normal.y * maxOffset;
        }

        // Preserve heading and speed sign. A shallow scrape loses little
        // speed; a near head-on impact loses substantially more.
        const forwardX = Math.cos(this.angle);
        const forwardY = Math.sin(this.angle);
        const normalImpact = Math.min(1, Math.abs(
            forwardX * contact.normal.x + forwardY * contact.normal.y
        ));
        const retainedSpeed = 0.82 - normalImpact * 0.52;
        const speedSign = Math.sign(previousState.speed || this.speed || 1);
        this.speed = speedSign * Math.min(impactSpeed * retainedSpeed, this.maxSpeed);
        this.collisionPenalty = 0.12;

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
        return super.getDisplaySpeed();
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
        this._throttleLevel = 0;
        this._brakeLevel = 0;
        this._steeringLevel = 0;
        this._reverseBlockedUntilRelease = false;
        this.sync3DPosition();
    }
}
