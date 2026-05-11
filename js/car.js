/**
 * Car - 赛车物理与操控模块
 * 支持键盘和触控操作，含氮气加速系统
 */
class Car {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;

        this.speed = 0;
        this.maxSpeed = 4.0;
        this.acceleration = 0.08;
        this.brakeForce = 0.15;
        this.friction = 0.988;
        this.offTrackFriction = 0.96;
        this.turnSpeed = 0.045;

        // Nitro system
        this.nitroCharges = 0;
        this.nitroActive = false;
        this.nitroTimer = 0;
        this.nitroDuration = 180; // frames (~3 seconds at 60fps)
        this.nitroMaxSpeed = 8;
        this.nitroAccel = 0.2;

        // Lap tracking
        this.lastProgress = 0;
        this.lap = 0;
        this.lapTimes = [];
        this.lapStartTime = 0;
        this.bestLapTime = Infinity;
        this.finished = false;

        // Visual
        this.color = '#E53935';
        this.width = 34;
        this.height = 18;

        // Skid marks
        this.skidMarks = [];

        // Particles (nitro flame)
        this.particles = [];

        // Input state
        this.input = { up: false, down: false, left: false, right: false, nitro: false };
    }

    /**
     * Reset car to start position
     */
    reset(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 0;
        this.nitroActive = false;
        this.nitroTimer = 0;
        this.lastProgress = 0;
        this.lap = 0;
        this.lapTimes = [];
        this.lapStartTime = 0;
        this.bestLapTime = Infinity;
        this.finished = false;
        this.skidMarks = [];
        this.particles = [];
    }

    /**
     * Add nitro charges
     */
    addNitro(count = 1) {
        this.nitroCharges += count;
    }

    /**
     * Activate nitro boost
     */
    activateNitro() {
        if (this.nitroCharges > 0 && !this.nitroActive && this.speed > 0.5) {
            this.nitroActive = true;
            this.nitroTimer = this.nitroDuration;
            this.nitroCharges--;
        }
    }

    /**
     * Main update - physics and input
     */
    update(track, totalLaps = 3) {
        if (this.finished) return;

        // Handle nitro
        if (this.input.nitro && !this.nitroActive) {
            this.activateNitro();
        }

        if (this.nitroActive) {
            this.nitroTimer--;
            if (this.nitroTimer <= 0) {
                this.nitroActive = false;
            }
        }

        const maxSpd = this.nitroActive ? this.nitroMaxSpeed : this.maxSpeed;
        const accel = this.nitroActive ? this.nitroAccel : this.acceleration;

        // Acceleration
        if (this.input.up) {
            this.speed = Math.min(this.speed + accel, maxSpd);
        }

        // Braking
        if (this.input.down) {
            this.speed -= this.brakeForce;
            if (this.speed < -1.5) this.speed = -1.5; // Allow slight reverse
        }

        // Steering: more responsive at low speeds
        const turnFactor = Math.min(Math.abs(this.speed) / 1.2, 1);
        if (this.input.left) {
            this.angle -= this.turnSpeed * turnFactor;
        }
        if (this.input.right) {
            this.angle += this.turnSpeed * turnFactor;
        }

        // Apply friction
        const onTrack = track.isOnTrack(this.x, this.y);
        const friction = onTrack ? this.friction : this.offTrackFriction;
        this.speed *= friction;

        // 松开方向键时强摩擦——快速停止，增强操控感
        if (!this.input.up && !this.input.down) {
            this.speed *= 0.72;
        }

        // Very slow speeds: stop completely
        if (Math.abs(this.speed) < 0.05) this.speed = 0;

        // Move car
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Off-track: slow down + hard boundary clamp
        if (!onTrack) {
            this.speed *= 0.75; // heavy friction off-track
            // Hard clamp: keep car within reasonable bounds
            const maxDist = track.trackWidth / 2 + 20;
            const dist = track.getNearestDistance(this.x, this.y);
            if (dist > maxDist) {
                // Teleport car back to track edge
                const info = track.getTrackNormal(this.x, this.y);
                this.x = info.nearestPoint.x + info.x * (track.trackWidth / 2 - 5);
                this.y = info.nearestPoint.y + info.y * (track.trackWidth / 2 - 5);
                this.speed = 0;
            }
        }

        // Boundary clamping (keep car in game world)
        this.x = Math.max(20, Math.min(900, this.x));
        this.y = Math.max(20, Math.min(600, this.y));

        // Add skid marks when turning at speed
        if ((this.input.left || this.input.right) && Math.abs(this.speed) > 2.5) {
            this.skidMarks.push({
                x: this.x, y: this.y, angle: this.angle, alpha: 0.4
            });
        }

        // Fade old skid marks
        for (let i = this.skidMarks.length - 1; i >= 0; i--) {
            this.skidMarks[i].alpha -= 0.003;
            if (this.skidMarks[i].alpha <= 0) {
                this.skidMarks.splice(i, 1);
            }
        }
        // Limit total skid marks
        if (this.skidMarks.length > 100) {
            this.skidMarks.splice(0, this.skidMarks.length - 100);
        }

        // Add nitro particles
        if (this.nitroActive && this.speed > 1) {
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: this.x - Math.cos(this.angle) * 18 + (Math.random() - 0.5) * 6,
                    y: this.y - Math.sin(this.angle) * 18 + (Math.random() - 0.5) * 6,
                    vx: -Math.cos(this.angle) * (1 + Math.random()) + (Math.random() - 0.5),
                    vy: -Math.sin(this.angle) * (1 + Math.random()) + (Math.random() - 0.5),
                    life: 20 + Math.random() * 15,
                    maxLife: 35,
                    size: 3 + Math.random() * 4
                });
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.size *= 0.96;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Lap tracking
        const progress = track.getProgress(this.x, this.y);
        // Detect crossing from ~0.95+ to ~0.05- (finish line)
        if (this.lastProgress > 0.9 && progress < 0.1 && this.speed > 1) {
            this.lap++;
            const now = Date.now();
            if (this.lapStartTime > 0) {
                const lapTime = now - this.lapStartTime;
                this.lapTimes.push(lapTime);
                if (lapTime < this.bestLapTime) {
                    this.bestLapTime = lapTime;
                }
            }
            this.lapStartTime = now;

            if (this.lap >= totalLaps) {
                this.finished = true;
                this.speed *= 0.5;
            }
        }
        this.lastProgress = progress;
    }

    /**
     * Render the car
     */
    render(ctx, scale = 1) {
        this._renderSkidMarks(ctx, scale);
        this._renderParticles(ctx, scale);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const w = this.width;
        const h = this.height;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(2, 3, w * 0.55, h * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#1A1A1A';
        const wheelW = 7;
        const wheelH = 4;
        ctx.fillRect(8, -h / 2 - wheelH + 1, wheelW, wheelH);
        ctx.fillRect(8,  h / 2 - 1, wheelW, wheelH);
        ctx.fillRect(-12, -h / 2 - wheelH + 1, wheelW, wheelH);
        ctx.fillRect(-12,  h / 2 - 1, wheelW, wheelH);

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(w * 0.52, 0);
        ctx.lineTo(w * 0.2, -h * 0.4);
        ctx.lineTo(-w * 0.35, -h * 0.45);
        ctx.lineTo(-w * 0.45, -h * 0.3);
        ctx.lineTo(-w * 0.45, h * 0.3);
        ctx.lineTo(-w * 0.35, h * 0.45);
        ctx.lineTo(w * 0.2, h * 0.4);
        ctx.closePath();
        ctx.fill();

        // Darker shade
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.moveTo(w * 0.52, 0);
        ctx.lineTo(w * 0.2, -h * 0.4);
        ctx.lineTo(-w * 0.35, -h * 0.45);
        ctx.lineTo(-w * 0.45, -h * 0.3);
        ctx.lineTo(-w * 0.45, 0);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.ellipse(2, 0, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit highlight
        ctx.fillStyle = 'rgba(100,200,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(3, -1, 4, 2.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Front wing
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(w * 0.4, -h * 0.55, 3, h * 1.1);

        // Rear wing
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(-w * 0.48, -h * 0.6, 4, h * 1.2);
        ctx.fillRect(-w * 0.5, -h * 0.6, 6, 2);
        ctx.fillRect(-w * 0.5,  h * 0.6 - 2, 6, 2);

        // Number
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1', -4, 0.5);

        // Nitro glow
        if (this.nitroActive) {
            ctx.shadowColor = '#FF6D00';
            ctx.shadowBlur = 15;
            ctx.fillStyle = 'rgba(255,109,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    _renderSkidMarks(ctx, scale) {
        for (const mark of this.skidMarks) {
            ctx.save();
            ctx.globalAlpha = mark.alpha;
            ctx.translate(mark.x, mark.y);
            ctx.rotate(mark.angle);
            ctx.fillStyle = '#333';
            ctx.fillRect(-3, -6, 2, 3);
            ctx.fillRect(-3, 3, 2, 3);
            ctx.restore();
        }
    }

    _renderParticles(ctx, scale) {
        for (const p of this.particles) {
            const lifeRatio = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = lifeRatio * 0.8;

            if (lifeRatio > 0.6) {
                ctx.fillStyle = '#FFEB3B';
            } else if (lifeRatio > 0.3) {
                ctx.fillStyle = '#FF9800';
            } else {
                ctx.fillStyle = '#F44336';
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * Get speed in km/h (display value)
     */
    getDisplaySpeed() {
        return Math.round(Math.abs(this.speed) * 50); // Scale for display
    }

    /**
     * Get nitro status
     */
    getNitroStatus() {
        return {
            charges: this.nitroCharges,
            active: this.nitroActive,
            progress: this.nitroActive ? this.nitroTimer / this.nitroDuration : 0
        };
    }
}
