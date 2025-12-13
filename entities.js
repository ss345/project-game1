export class Entity {
    constructor(x, y, r) {
        this.x = x;
        this.y = y;
        this.radius = r;
        this.active = true;
    }

    intersects(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (this.radius + other.radius);
    }
}

export class Bullet extends Entity {
    constructor(x, y, angle, type, color) {
        super(x, y, 15); // Larger hitbox for visuals
        this.speed = 12;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.type = type || 'NORMAL';
        this.color = color || '#ffd700';
        this.angle = angle;
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

    hit() {
        if (this.isDying) return; // Invincible while dying
        this.hp--;
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

export class Particle extends Entity {
    constructor(x, y, color) {
        super(x, y, Math.random() * 3 + 2);
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.color = color || '#fff';
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}
