import { Entity } from './Entity.js';

export class BossTrigger extends Entity {
    constructor(x, y) {
        super(x, y, 60); // Radius 60
        this.hp = 100;
        this.maxHp = 100;
        this.type = 'TRIGGER';
        this.isBoss = true;

        // Visual State
        this.visualTimer = 0;
        this.visualIndex = 0; // 0-4
        this.visuals = [
            { type: 'circle', color: '#ff0000', eyeColor: '#fff', label: '1' }, // Red Circle
            { type: 'rect', color: '#ffff00', eyeColor: '#000', label: '2' },   // Yellow Square
            { type: 'triangle', color: '#0000ff', eyeColor: '#fff', label: '3' }, // Blue Triangle
            { type: 'circle_dark', color: '#330000', eyeColor: '#fff', label: '4' }, // Black/Red Circle
            { type: 'inv_triangle', color: '#ffffff', eyeColor: '#000', label: '5' } // White Inv Triangle
        ];

        // Movement State
        this.moveTimer = 0;
        this.vx = 2; // Slow sway
        this.vy = 2;
    }

    hit(damage) {
        this.hp -= damage;
    }

    update(dt) {
        // 1. Visual Cycle (Every 1s)
        this.visualTimer += dt / 1000;
        if (this.visualTimer >= 1.0) {
            this.visualTimer = 0;
            this.visualIndex = (this.visualIndex + 1) % 5;
        }

        // 2. Movement (Random Sway Full Screen)
        // Change direction occasionally
        if (Math.random() < 0.02) {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Bounce
        if (this.x < 50 || this.x > window.innerWidth - 50) this.vx *= -1;
        if (this.y < 50 || this.y > window.innerHeight - 150) this.vy *= -1;
    }

    draw(ctx) {
        const v = this.visuals[this.visualIndex];
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw Body
        ctx.fillStyle = v.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;

        ctx.beginPath();
        if (v.type === 'circle' || v.type === 'circle_dark') {
            ctx.arc(0, 0, 50, 0, Math.PI * 2);
            if (v.type === 'circle_dark') {
                // Add Red Rim for "Black Red" feel
                ctx.strokeStyle = '#f00';
                ctx.stroke();
            }
        } else if (v.type === 'rect') {
            ctx.rect(-50, -50, 100, 100);
        } else if (v.type === 'triangle') {
            ctx.moveTo(0, -60);
            ctx.lineTo(50, 40);
            ctx.lineTo(-50, 40);
            ctx.closePath();
        } else if (v.type === 'inv_triangle') {
            ctx.moveTo(0, 60);
            ctx.lineTo(50, -40);
            ctx.lineTo(-50, -40);
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Draw Eyes
        ctx.fillStyle = v.eyeColor;
        const eyeY = (v.type === 'inv_triangle') ? 0 : -10;

        ctx.beginPath();
        ctx.arc(-20, eyeY, 10, 0, Math.PI * 2);
        ctx.arc(20, eyeY, 10, 0, Math.PI * 2);
        ctx.fill();

        // HP Bar
        this.drawHP(ctx);

        ctx.restore();
    }

    drawHP(ctx) {
        const barW = 100;
        const barH = 10;
        const yOffset = 70;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barW / 2, yOffset, barW, barH);
        ctx.fillStyle = '#f00';
        ctx.fillRect(-barW / 2, yOffset, barW * (this.hp / this.maxHp), barH);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(-barW / 2, yOffset, barW, barH);
    }
}

export class RealBoss extends Entity {
    constructor(x, y, visualIndex) {
        super(x, y, 50);
        this.hp = 50;
        this.maxHp = 50;
        this.value = 250; // High Reward
        this.type = 'BOSS';
        this.isBoss = true;

        this.visualIndex = visualIndex || 0;
        // Re-use visuals def from Trigger for consistency, or copy simple Logic
        this.visuals = [
            { type: 'circle', color: '#ff0000', eyeColor: '#fff' },
            { type: 'rect', color: '#ffff00', eyeColor: '#000' },
            { type: 'triangle', color: '#0000ff', eyeColor: '#fff' },
            { type: 'circle_dark', color: '#330000', eyeColor: '#fff' },
            { type: 'inv_triangle', color: '#ffffff', eyeColor: '#000' }
        ];

        // Movement: Fast & Teleport
        this.moveTimer = 0;
        this.targetX = x;
        this.targetY = y;
    }

    hit(damage) {
        this.hp -= damage;
    }

    update(dt) {
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            // Teleport / Pick new fast destination
            this.moveTimer = 500 + Math.random() * 1000; // 0.5s - 1.5s
            this.targetX = Math.random() * (window.innerWidth - 100) + 50;
            this.targetY = Math.random() * (window.innerHeight - 200) + 50;
        }

        // Lerp fast
        this.x += (this.targetX - this.x) * 0.1;
        this.y += (this.targetY - this.y) * 0.1;
    }

    draw(ctx) {
        const v = this.visuals[this.visualIndex];
        ctx.save();
        ctx.translate(this.x, this.y);

        // Flashy Effect for Real Boss
        ctx.shadowBlur = 20;
        ctx.shadowColor = v.color;

        // Draw Body (Same logic)
        ctx.fillStyle = v.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (v.type === 'circle' || v.type === 'circle_dark') {
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            if (v.type === 'circle_dark') ctx.strokeStyle = '#f00';
        } else if (v.type === 'rect') {
            ctx.rect(-40, -40, 80, 80);
        } else if (v.type === 'triangle') {
            ctx.moveTo(0, -50);
            ctx.lineTo(40, 30);
            ctx.lineTo(-40, 30);
            ctx.closePath();
        } else if (v.type === 'inv_triangle') {
            ctx.moveTo(0, 50);
            ctx.lineTo(40, -30);
            ctx.lineTo(-40, -30);
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Eyes
        ctx.fillStyle = v.eyeColor;
        const eyeY = (v.type === 'inv_triangle') ? 0 : -10;
        ctx.shadowBlur = 0; // Reset shadow for eyes
        ctx.beginPath();
        ctx.arc(-15, eyeY, 8, 0, Math.PI * 2);
        ctx.arc(15, eyeY, 8, 0, Math.PI * 2);
        ctx.fill();

        // HP Bar
        const barW = 80;
        const barH = 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barW / 2, 60, barW, barH);
        ctx.fillStyle = '#f00';
        ctx.fillRect(-barW / 2, 60, barW * (this.hp / this.maxHp), barH);

        ctx.restore();
    }
}
