import { Entity } from './Entity.js';

export class Bullet extends Entity {
    constructor(x, y, angle, type, color, damage) {
        super(x, y, 15); // Larger hitbox for visuals
        this.speed = 12;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.type = type || 'NORMAL';
        this.color = color || '#ffd700';
        this.angle = angle;
        this.damage = damage || 1;
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.y < -50 || this.x < -50 || this.x > window.innerWidth + 50) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2); // Rotate to face direction

        if (this.type === 'せんし') {
            // Sword / Slash
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(10, 10);
            ctx.lineTo(0, 5);
            ctx.lineTo(-10, 10);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        } else if (this.type === 'まほうつかい') {
            // Magic Ball
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            // Inner core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'ドラゴン') {
            // Fire Breath
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f00';
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.quadraticCurveTo(10, 0, 0, 15);
            ctx.quadraticCurveTo(-10, 0, 0, -15);
            ctx.fill();
        } else {
            // Default Coin
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}
