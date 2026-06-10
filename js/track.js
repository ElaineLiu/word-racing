/**
 * Track - 赛道定义与渲染模块
 * 使用 Catmull-Rom 样条生成平滑赛道
 * 支持碰撞检测、进度计算
 *
 * Phase 1.2 - Converted to ES6 module
 */
import { TRACK, DISPLAY } from '../config/game-config.js';

export class Track {
    constructor(waypoints = null, trackWidth = null) {
        this.points = [];       // Smooth track center points
        this.trackWidth = trackWidth != null ? trackWidth : TRACK.WIDTH;
        this.startPos = { x: 0, y: 0, angle: 0 };

        // Define control waypoints for the circuit
        const sourceWp = waypoints || TRACK.WAYPOINTS;
        this.waypoints = sourceWp.map(wp => ({ ...wp }));

        this._generateSmoothCurve(TRACK.SAMPLES_PER_SEGMENT);
        this._calculateStartPos();
    }

    get centerline() {
        return this.points.map(p => ({ ...p }));
    }

    /**
     * Catmull-Rom spline interpolation
     */
    _catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return 0.5 * (
            (2 * p1) +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );
    }

    /**
     * Generate smooth curve from waypoints using Catmull-Rom
     */
    _generateSmoothCurve(samplesPerSegment) {
        this.points = [];
        const wp = this.waypoints;
        const n = wp.length;

        for (let i = 0; i < n; i++) {
            const p0 = wp[(i - 1 + n) % n];
            const p1 = wp[i];
            const p2 = wp[(i + 1) % n];
            const p3 = wp[(i + 2) % n];

            for (let j = 0; j < samplesPerSegment; j++) {
                const t = j / samplesPerSegment;
                this.points.push({
                    x: this._catmullRom(p0.x, p1.x, p2.x, p3.x, t),
                    y: this._catmullRom(p0.y, p1.y, p2.y, p3.y, t)
                });
            }
        }
    }

    /**
     * Calculate start position and angle
     */
    _calculateStartPos() {
        const p0 = this.points[0];
        const p1 = this.points[1];
        this.startPos = {
            x: p0.x,
            y: p0.y,
            angle: Math.atan2(p1.y - p0.y, p1.x - p0.x)
        };
    }

    /**
     * Get distance from point to nearest track center point
     */
    getNearestDistance(x, y) {
        let minDist = Infinity;
        for (const p of this.points) {
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = dx * dx + dy * dy; // squared distance (faster)
            if (dist < minDist) minDist = dist;
        }
        return Math.sqrt(minDist);
    }

    /**
     * Check if a position is on the track
     */
    isOnTrack(x, y) {
        return this.getNearestDistance(x, y) < this.trackWidth / 2;
    }

    /**
     * Get car progress along track (0.0 - 1.0)
     */
    getProgress(x, y) {
        let minDist = Infinity;
        let nearestIdx = 0;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = i;
            }
        }
        return nearestIdx / this.points.length;
    }

    /**
     * Get track normal at nearest point (for off-track push)
     */
    getTrackNormal(x, y) {
        let minDist = Infinity;
        let nearestIdx = 0;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = i;
            }
        }

        const p0 = this.points[nearestIdx];
        const p1 = this.points[(nearestIdx + 1) % this.points.length];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        // Normal pointing from track center to car position
        const nx = -dy / len;
        const ny = dx / len;

        // Make sure normal points towards the car
        const toCarX = x - p0.x;
        const toCarY = y - p0.y;
        const dot = nx * toCarX + ny * toCarY;

        return {
            x: dot >= 0 ? nx : -nx,
            y: dot >= 0 ? ny : -ny,
            nearestPoint: p0
        };
    }

    /**
     * Render the track
     */
    render(ctx, scale = 1) {
        const w = this.trackWidth;

        // Draw night ground background
        ctx.fillStyle = '#0B1622';
        ctx.fillRect(0, 0, DISPLAY.CANVAS_WIDTH, DISPLAY.CANVAS_HEIGHT);

        // Draw subtle grid texture (telemetry-style)
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 1;
        for (let y = 0; y < DISPLAY.CANVAS_HEIGHT; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(DISPLAY.CANVAS_WIDTH, y);
            ctx.stroke();
        }
        for (let x = 0; x < DISPLAY.CANVAS_WIDTH; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, DISPLAY.CANVAS_HEIGHT);
            ctx.stroke();
        }

        // Draw track glow/shadow (ambient glow beneath track)
        ctx.save();
        ctx.strokeStyle = 'rgba(0,176,255,0.08)';
        ctx.lineWidth = w + 14 / scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Draw track edge (white border)
        ctx.strokeStyle = '#E8E8E8';
        ctx.lineWidth = w + 6 / scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw track edge kerbs (red-white stripes at corners)
        this._drawKerbs(ctx, scale, w);

        // Draw main track surface (dark asphalt)
        ctx.strokeStyle = '#2D2D2D';
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw track inner detail (slightly lighter asphalt center)
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = w * 0.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw center line (dashed)
        ctx.save();
        ctx.setLineDash([14, 14]);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Draw start/finish line
        this._drawStartLine(ctx, scale, w);
    }

    /**
     * Draw kerbs at corners
     */
    _drawKerbs(ctx, scale, w) {
        const halfW = w / 2;
        const kerbWidth = 6;
        const total = this.points.length;

        for (let i = 0; i < total; i++) {
            const prev = this.points[(i - 3 + total) % total];
            const curr = this.points[i];
            const next = this.points[(i + 3) % total];

            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            let angleDiff = Math.abs(angle2 - angle1);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

            if (angleDiff > 0.26) {
                const dx = next.x - prev.x;
                const dy = next.y - prev.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;

                const isRed = (Math.floor(i / 8) % 2) === 0;
                ctx.fillStyle = isRed ? '#E53935' : '#FFFFFF';

                ctx.fillRect(
                    curr.x + nx * (halfW - kerbWidth) - 3,
                    curr.y + ny * (halfW - kerbWidth) - 3,
                    6, 6
                );
                ctx.fillRect(
                    curr.x - nx * (halfW - kerbWidth) - 3,
                    curr.y - ny * (halfW - kerbWidth) - 3,
                    6, 6
                );
            }
        }
    }

    /**
     * Draw start/finish line
     */
    _drawStartLine(ctx, scale, w) {
        const sp = this.startPos;
        const halfW = w / 2;

        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(sp.angle);

        // Checkered pattern
        const squareSize = 6;
        const cols = 3;
        const rows = Math.ceil(w / squareSize);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#222222';
                ctx.fillRect(
                    -cols * squareSize / 2 + c * squareSize,
                    -halfW + r * squareSize,
                    squareSize, squareSize
                );
            }
        }
        ctx.restore();
    }

}
