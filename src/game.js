import { Bullet, Boss, Target, Particle } from './entities.js';
import { MedalSystem, EXSystem } from './mechanics.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.resize();

        this.state = 'TITLE';
        this.lastTime = 0;

        // Entities
        this.bullets = [];
        this.targets = [];
        this.particles = [];
        this.boss = null;

        // Mechanics
        this.medalSystem = new MedalSystem();
        this.exSystem = new EXSystem();

        // Input
        this.inputDown = false;
        this.inputPos = { x: 0, y: 0 };
        this.fireRate = 100; // ms
        this.lastShotTime = 0;

        this.paused = false;

        // Stage System
        this.stage = 1;
        this.medalsSpentInStage = 0;
        this.stageClearTargetActive = false;

        // Stages (Japan Tour)
        this.stageInfo = [
            { name: "北海道：札幌時計台", bg: "assets/bg1.png" },
            { name: "東京：東京タワー", bg: "assets/bg2.png" },
            { name: "京都：金閣寺", bg: "assets/bg3.png" },
            { name: "大阪：大阪城", bg: "assets/bg4.png" },
            { name: "沖縄：エメラルドビーチ", bg: "assets/bg5.png" }
        ];

        // Visuals
        this.cutInActive = false;
        this.cutInTimer = 0;
        this.cutInText = '';
        this.storyActive = false;

        this.bgImage = new Image();
        // this.bgImage.src will be set in startBattle or dynamic loader

        this.mobImage = new Image();
        this.mobImage.src = 'assets/mob_slime.png';

        // Character Mechanics
        this.mageDamageBuffTime = 0;
        this.dragonMedalBuffTime = 0;

        this.bindEvents();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    bindEvents() {
        const startInput = (e) => {
            if (this.state !== 'BATTLE') return;
            // Check if clicking EX Gauge when full
            if (this.checkEXClick(e)) return;

            this.inputDown = true;
            this.updateInputPos(e);
            this.tryShoot();
        };

        const moveInput = (e) => {
            this.updateInputPos(e); // Always update aim
            if (this.inputDown) {
                this.tryShoot();
            }
        };

        const endInput = () => {
            this.inputDown = false;
        };

        this.canvas.addEventListener('mousedown', startInput);
        this.canvas.addEventListener('mousemove', moveInput);
        this.canvas.addEventListener('mouseup', endInput);
        this.canvas.addEventListener('mouseleave', endInput);

        this.canvas.addEventListener('touchstart', (e) => startInput(e.touches[0]));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            moveInput(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchend', endInput);
    }

    updateInputPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.inputPos.x = e.clientX - rect.left;
        this.inputPos.y = e.clientY - rect.top;
    }

    checkEXClick(e) {
        // Simplified check: if EX is full and click is near bottom right
        // Ideally we check DOM element bounds, but canvas click is separate from HUD.
        // Actually, the HUD is an overlay. We should attach click to the EX gauge DOM element.
        return false;
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    startBattle(monsters) {
        console.log('startBattle called with:', monsters);
        try {
            this.state = 'BATTLE';
            this.boss = new Boss(this.width / 2, 100);
            this.bullets = [];
            this.targets = [];
            this.particles = [];
            this.exSystem.reset();

            // Store Team
            this.team = monsters && monsters.length > 0 ? monsters : [{ name: 'せんし', color: '#ff0000' }];

            // Bind EX Click (ensure single binding)
            const exContainer = document.getElementById('ex-gauge-container');
            if (exContainer) {
                exContainer.onclick = () => {
                    if (this.exSystem.value >= this.exSystem.max) {
                        this.triggerEX();
                    }
                };
            }

            // Load Shooter Images
            this.shooterImages = {
                'せんし': new Image(),
                'まほうつかい': new Image(),
                'ドラゴン': new Image()
            };
            this.shooterImages['せんし'].src = 'assets/shooter_warrior.svg';
            this.shooterImages['まほうつかい'].src = 'assets/shooter_mage.svg';
            this.shooterImages['ドラゴン'].src = 'assets/shooter_dragon.svg';

            // Stages (Konan City)
            this.stageInfo = [
                { name: "のいち動物公園", bg: "assets/bg1.png" },
                { name: "創造広場アクトランド", bg: "assets/bg2.png" },
                { name: "ヤ・シィパーク", bg: "assets/bg3.png" },
                { name: "絵金蔵", bg: "assets/bg4.png" },
                { name: "手結港可動橋", bg: "assets/bg5.png" }
            ];

            // Initial BG
            // Use stageInfo from constructor which is now corrected
            this.bgImage.src = this.stageInfo[0].bg;

            // Opening Sequence
            this.showStory("香南市を救え！", "モンスター軍団が現れた！");

            // Delayed Stage Announcement
            setTimeout(() => {
                this.showStory(`Stage 1`, this.stageInfo[0].name);
            }, 3000);

            for (let i = 0; i < 5; i++) {
                this.spawnTarget();
            }
        } catch (e) {
            console.error('Error in startBattle:', e);
            alert('Error starting battle: ' + e.message);
        }
    }

    triggerEX() {
        if (this.cutInActive) return;

        this.exSystem.reset();
        this.cutInActive = true;
        this.cutInTimer = 2.0; // 2 seconds animation
        // Use Leader Name
        this.cutInText = `${this.team[0].name}のEXわざ！`;

        const leaderName = this.team[0].name;

        if (leaderName === 'まほうつかい') {
            // Mage EX: 20s Damage Buff (1 hit)
            this.mageDamageBuffTime = 20; // seconds
        } else if (leaderName === 'ドラゴン') {
            // Dragon EX: 30s Medal Buff (5x)
            this.dragonMedalBuffTime = 30; // seconds
        } else {
            // Warrior (Default): Clear Screen
            this.targets.forEach(t => {
                if (t.type === 'BOSS') return; // Immune to EX
                t.hit(50); // Massive damage to normal mobs
                this.createExplosion(t.x, t.y, '#fff', 5);
                this.medalSystem.modify(t.value);
            });
            // Filter out dead targets
            this.targets = this.targets.filter(t => t.active);
        }
    }

    reset() {
        this.state = 'TITLE';
        this.bullets = [];
        this.targets = [];
        this.boss = null;
        this.mageDamageBuffTime = 0;
        this.dragonMedalBuffTime = 0;
    }

    tryShoot() {
        if (this.cutInActive || this.storyActive) return; // No shooting during cut-in or story
        const now = Date.now();
        if (now - this.lastShotTime > this.fireRate && this.inputDown) {
            this.shoot();
            this.lastShotTime = now;
        }
    }



    shoot() {
        if (this.medalSystem.count <= 0) return;

        const leader = this.team[0];
        let cost = 1;
        if (leader.name === 'ドラゴン') cost = 3;

        if (this.medalSystem.count < cost) return;

        this.medalSystem.modify(-cost);
        this.medalsSpentInStage += cost;

        // Trigger Stage Clear Target
        if (!this.stageClearTargetActive && this.medalsSpentInStage >= 70) {
            this.spawnStageTarget();
        }

        const startX = this.width / 2;
        const startY = this.height - 50;

        // Dragon Slide Logic calculation for Shooter Pos
        // Note: Real shooter position logic needs to be consistent between draw and shoot.
        // For Dragon, shooter X follows inputPos.x
        let shooterX = startX;
        if (leader.name === 'ドラゴン') {
            shooterX = Math.max(30, Math.min(this.width - 30, this.inputPos.x));
        }

        if (leader.name === 'まほうつかい') {
            // Mage: 3 Way (90, 60, 120 deg) -> -90, -60, -120 in canvas (Up is -90)
            // User said: Vertical, 60, 120. If Vertical is -90.
            // 60 deg relative? Or absolute? 
            // -90 is up. 60 deg from 0 is down-right?
            // "Vertical and 60 and 120" usually means radial spread.
            // Let's interpret as: Center(-90), Left(-120), Right(-60).
            const angles = [-Math.PI / 2, -Math.PI / 3, -2 * Math.PI / 3];
            const dmg = this.mageDamageBuffTime > 0 ? 1 : 0.25;

            angles.forEach(a => {
                this.bullets.push(new Bullet(startX, startY, a, leader.name, leader.color, dmg));
            });
        } else if (leader.name === 'ドラゴン') {
            // Dragon: Vertical only, High dmg
            const angle = -Math.PI / 2; // Straight Up
            this.bullets.push(new Bullet(shooterX, startY, angle, leader.name, leader.color, 3));
        } else {
            // Warrior (Default): Aimed
            const targetX = this.inputPos.x + (Math.random() * 20 - 10);
            const targetY = this.inputPos.y + (Math.random() * 20 - 10);
            const angle = Math.atan2(targetY - startY, targetX - shooterX);
            this.bullets.push(new Bullet(shooterX, startY, angle, leader.name, leader.color, 1));
        }
    }

    spawnStageTarget() {
        this.stageClearTargetActive = true;

        // Flashy Effect (Reuse cut-in for now or new effect)
        this.cutInActive = true;
        this.cutInTimer = 2.0;
        this.cutInText = `STAGE ${this.stage} BOSS!`;

        // Wait for cut-in to finish then spawn? Or spawn immediately behind?
        // Let's spawn after cut-in logic or effectively during

        const x = this.width / 2;
        const y = 100;

        // Stage Config
        const config = this.getStageConfig(this.stage);
        config.stageNum = this.stage; // Pass stage number for AI logic

        this.targets.push(new Target(x, y, 'BOSS', this.mobImage, config));
    }

    getStageConfig(stage) {
        switch (stage) {
            case 1: return { hp: 2, reward: 50 };
            case 2: return { hp: 5, reward: 200 };
            case 3: return { hp: 10, reward: 500 };
            case 4: return { hp: 15, reward: 1000 };
            case 5: return { hp: 25, reward: 1000 };
            default: return { hp: 50, reward: 1000 }; // Endless?
        }
    }

    spawnTarget() {
        const x = Math.random() * (this.width - 60) + 30;
        const y = Math.random() * (this.height / 2) + 50;
        const type = Math.random() < 0.2 ? 'RARE' : 'NORMAL';
        this.targets.push(new Target(x, y, type, this.mobImage));
    }

    createExplosion(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    loop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.state === 'BATTLE') {
            if (!this.paused) {
                if (this.inputDown) this.tryShoot();
                this.update(dt);
            }
            this.draw();
        } else {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        requestAnimationFrame(this.loop);
    }

    update(dt) {
        if (this.cutInActive) {
            this.cutInTimer -= dt / 1000;
            if (this.cutInTimer <= 0) {
                this.cutInActive = false;
            }
            // Update particles even during cut-in
            this.particles.forEach(p => p.update(dt));
            return;
        }

        // Buff Timers
        if (this.mageDamageBuffTime > 0) this.mageDamageBuffTime -= dt / 1000;
        if (this.dragonMedalBuffTime > 0) this.dragonMedalBuffTime -= dt / 1000;

        this.bullets = this.bullets.filter(b => b.active);
        this.targets = this.targets.filter(t => t.active);
        this.particles = this.particles.filter(p => p.active);

        this.bullets.forEach(b => b.update(dt));
        this.targets.forEach(t => t.update(dt));
        this.particles.forEach(p => p.update(dt));

        // Check for Dying Bosses
        this.targets.forEach(t => {
            if (t.isDying && t.deathTimer <= 0 && t.active) {
                t.active = false;
                // BIG EXPLOSION
                this.createExplosion(t.x, t.y, '#fff', 50);
                this.createExplosion(t.x, t.y, '#f00', 30);
                this.createExplosion(t.x, t.y, '#ff0', 30);

                // Actual Stage Clear Logic
                this.handleStageClear();
            }
        });

        if (this.boss) {
            this.boss.update(dt);
            if (this.boss.hp <= 0) {
                // Boss Defeated (Now Bonus)
                this.medalSystem.modify(50);
                this.createExplosion(this.boss.x, this.boss.y, '#ff0000', 30);
                this.boss = null; // Remove boss
                // Do NOT end game
            }
        }

        this.checkCollisions();

        // Game Over Check
        if (this.state === 'BATTLE' && this.medalSystem.count <= 0 && this.bullets.length === 0 && !this.cutInActive) {
            // Wait a bit to ensure no bullets are flying? 
            // Simplified: Game Over
            this.state = 'GAMEOVER';
            document.getElementById('ui-layer').style.pointerEvents = 'auto';
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('game-over-screen').classList.remove('hidden');
        }

        if (Math.random() < 0.02 && this.targets.length < 10) {
            this.spawnTarget();
        }
    }

    handleStageClear() {
        this.stageClearTargetActive = false;
        this.medalsSpentInStage = 0; // Reset for next stage

        if (this.stage === 5) {
            // Trigger Happy Ending
            this.state = 'ENDING';
            document.getElementById('ui-layer').style.pointerEvents = 'auto';
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('happy-ending-screen').classList.remove('hidden');
        } else {
            this.stage++;
            // Stage Clear Effect
            this.cutInActive = true;
            this.cutInTimer = 2.0;
            this.cutInText = 'STAGE CLEAR!';

            // Change BG & Show Story
            const nextStageIdx = this.stage - 1;
            if (this.stageInfo[nextStageIdx]) {
                this.bgImage.src = this.stageInfo[nextStageIdx].bg;
                setTimeout(() => {
                    this.showStory(`Stage ${this.stage}`, this.stageInfo[nextStageIdx].name);
                    // Respawn Bonus Boss for new stage
                    if (!this.boss) this.boss = new Boss(this.width / 2, 100);
                }, 2000);
            }
        }
    }

    checkCollisions() {
        for (const b of this.bullets) {
            for (const t of this.targets) {
                if (b.intersects(t)) {
                    b.active = false;
                    t.hit(b.damage || 1); // Use bullet damage
                    this.createExplosion(b.x, b.y, '#fff', 5);

                    if (!t.active) {
                        // Normal death logic (or non-boss)
                        let value = t.value;
                        if (this.dragonMedalBuffTime > 0) value *= 5; // Dragon Buff

                        this.medalSystem.modify(value);
                        this.exSystem.add(5);
                        this.createExplosion(t.x, t.y, t.type === 'RARE' ? '#ff3366' : '#00ffcc', 15);
                    } else if (t.isDying) {
                        // Boss is entering dying state, just awarded medals?
                        // Target hit() handles isDying check, if it just turned true, maybe award points here?
                        // Let's just award points on final death to avoid double counting?
                        // Or award on hit that kills it?
                        if (t.hp <= 0 && t.deathTimer >= 1.4) { // Initial kill hit
                            // First frame of dying
                            let value = t.value;
                            if (this.dragonMedalBuffTime > 0) value *= 5;
                            this.medalSystem.modify(value);
                            this.exSystem.add(5);
                        }
                    }
                    break;
                }
            }
            if (b.active && this.boss && b.intersects(this.boss)) {
                b.active = false;
                this.boss.hit(b.damage);
                this.createExplosion(b.x, b.y, '#ffaa00', 5);
                this.exSystem.add(1);
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background
        if (this.bgImage) {
            // Fill contain or cover? Cover.
            const scale = Math.max(this.width / this.bgImage.width, this.height / this.bgImage.height);
            const x = (this.width / 2) - (this.bgImage.width / 2) * scale;
            const y = (this.height / 2) - (this.bgImage.height / 2) * scale;
            this.ctx.drawImage(this.bgImage, x, y, this.bgImage.width * scale, this.bgImage.height * scale);

            // Dark Overlay for readability
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
            grad.addColorStop(0, '#1a1a2e');
            grad.addColorStop(1, '#16213e');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Grid
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.beginPath();
        for (let i = 0; i < this.width; i += 50) {
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.height);
        }
        for (let i = 0; i < this.height; i += 50) {
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.width, i);
        }
        this.ctx.stroke();

        if (this.boss) this.boss.draw(this.ctx);
        this.targets.forEach(t => t.draw(this.ctx));
        this.bullets.forEach(b => b.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));

        // Draw Shooter & Aim
        // Aim Line
        // Determine start position based on character
        const leaderInfo = this.team && this.team[0] ? this.team[0] : { name: 'せんし' };
        let aimStartX = this.width / 2;
        if (leaderInfo.name === 'ドラゴン') {
            aimStartX = Math.max(30, Math.min(this.width - 30, this.inputPos.x));
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        // Start from player position
        this.ctx.moveTo(aimStartX, this.height - 50);

        if (leaderInfo.name === 'ドラゴン') {
            this.ctx.lineTo(aimStartX, 0); // Straight up from player pos
        } else {
            this.ctx.lineTo(this.inputPos.x, this.inputPos.y);
        }

        this.ctx.stroke();
        this.ctx.restore();

        // Draw Shooter Character (Leader)
        const leader = this.team && this.team[0] ? this.team[0] : { name: 'せんし' };
        const shooterImg = this.shooterImages[leader.name];
        if (shooterImg && shooterImg.complete) {
            let sx = this.width / 2;
            const sy = this.height - 50;
            let angle = -Math.PI / 2; // Default up

            if (leader.name === 'ドラゴン') {
                // Slide Logic
                sx = Math.max(30, Math.min(this.width - 30, this.inputPos.x));
            } else {
                // Rotate Logic
                angle = Math.atan2(this.inputPos.y - sy, this.inputPos.x - sx);
            }

            this.ctx.save();
            this.ctx.translate(sx, sy);
            this.ctx.rotate(angle + Math.PI / 2);
            this.ctx.drawImage(shooterImg, -30, -30, 60, 60);
            this.ctx.restore();

            // Aim Line update for Dragon
            if (leader.name === 'ドラゴン') {
                // Redraw Aim Line for Dragon since position changed
                // Ideally clear previous and draw here, but simpler to just draw over or accept previous is slightly off?
                // Actually logic above in draw() draws aim line from center. That's wrong for Dragon.
                // We should move Aim Line logic down here or update it.
            }
        }

        // Cut-In Overlay
        if (this.cutInActive) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.save();
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.rotate(-0.1);
            this.ctx.scale(1.5, 1.5);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.shadowColor = '#f00';
            this.ctx.shadowBlur = 20;
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.cutInText, 0, 0);
            this.ctx.restore();
        }
    }

    showStory(title, subtitle) {
        const overlay = document.getElementById('story-overlay');
        const titleEl = document.getElementById('story-title');
        const subEl = document.getElementById('story-subtitle');

        if (!overlay || !titleEl || !subEl) {
            console.error('Story elements missing!');
            return;
        }

        titleEl.textContent = title;
        subEl.textContent = subtitle;

        overlay.classList.remove('hidden');
        overlay.style.opacity = 1;

        this.storyActive = true; // Block Input

        setTimeout(() => {
            overlay.style.opacity = 0;
            setTimeout(() => {
                overlay.classList.add('hidden');
                this.storyActive = false; // Enable Input
            }, 500);
        }, 2500); // Show for 2.5s
    }
}
