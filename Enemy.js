import { Entity } from './Entity.js';

export class Target extends Entity {
    constructor(x, y, type = 'NORMAL', image, config) {
        super(x, y, type === 'BOSS' ? 50 : 30);
        this.type = type;
        this.image = image;

        if (type === 'BOSS' && config) {
            this.hp = config.hp;
            this.maxHp = config.hp;
            this.value = config.reward;

            // Fixed Max Speed (10)
            this.speed = 10;
            this.vx = this.speed;
            this.vy = 0;

            this.isBoss = true;
            this.stageNum = config.stageNum || 1;

            // Random direction start
            if (Math.random() < 0.5) this.vx = -this.speed;
        } else {
            this.hp = type === 'RARE' ? 3 : 1;
            this.value = type === 'RARE' ? 10 : 2;
            this.maxHp = this.hp;
            this.vx = Math.random() * 2 - 1;
            this.vy = 0;
        }

        this.floatOffset = Math.random() * 100;
        this.changeDirTimer = 0;

        // Death Animation State
        this.isDying = false;
        this.deathTimer = 0;
    }

    hit(damage) {
        if (this.isDying) return; // Invincible while dying
        this.hp -= (damage || 1);
        if (this.hp <= 0) {
            if (this.isBoss) {
                // Trigger Death Animation
                this.isDying = true;
                this.deathTimer = 1.5; // 1.5s shake time
            } else {
                this.active = false;
            }
        }
    }

    update(dt) {
        if (this.isDying) {
            this.deathTimer -= dt / 1000;
            // Shake effect is visual, no logic update needed other than timer
            return;
        }

        // Boss Logic for Stage 3+ (Omni-directional)
        if (this.isBoss && this.stageNum >= 3) {
            this.changeDirTimer -= dt;
            if (this.changeDirTimer <= 0) {
                // Change direction every 0.5 - 1.5 seconds
                this.changeDirTimer = Math.random() * 1000 + 500;
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        if (!this.isBoss) {
            this.y += Math.sin((Date.now() + this.floatOffset) / 500) * 0.5;
        }

        // Bounce off walls
        const margin = this.radius;
        if (this.x < margin) { this.x = margin; this.vx *= -1; }
        if (this.x > window.innerWidth - margin) { this.x = window.innerWidth - margin; this.vx *= -1; }

        // Bounce off Ceil/Floor (for flying bosses)
        if (this.isBoss && this.stageNum >= 3) {
            if (this.y < 50) { this.y = 50; this.vy *= -1; }
            if (this.y > window.innerHeight / 2) { this.y = window.innerHeight / 2; this.vy *= -1; } // Don't get too close
        }
    }

    draw(ctx) {
        if (this.image && this.image.complete) {
            ctx.save();

            let drawX = this.x;
            let drawY = this.y;

            // Shake Effect
            if (this.isDying) {
                drawX += (Math.random() * 20 - 10);
                drawY += (Math.random() * 20 - 10);
                // Flash Red
                if (Math.floor(Date.now() / 100) % 2 === 0) {
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                }
            }

            ctx.translate(drawX, drawY);

            if (this.type === 'BOSS') {
                ctx.scale(2.0, 2.0); // Big
                ctx.filter = 'hue-rotate(180deg) saturate(200%)'; // Distinct color
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#fff';

                // HP Bar for Target Boss
                ctx.fillStyle = '#f00';
                ctx.fillRect(-20, -35, 40, 5);
                ctx.fillStyle = '#0f0';
                ctx.fillRect(-20, -35, 40 * (this.hp / this.maxHp), 5);

            } else if (this.type === 'RARE') {
                ctx.scale(1.2, 1.2);
                ctx.filter = 'hue-rotate(-45deg) saturate(200%)';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#f00';
            }

            // Circular Clipping to hide white background corners
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.clip();

            ctx.drawImage(this.image, -30, -30, 60, 60); // Base size 60x60 (radius 30)
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = this.type === 'RARE' ? '#ff3366' : '#00ffcc';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
