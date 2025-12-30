import { Bullet } from './entities/Bullet.js';
import { BossTrigger, RealBoss } from './entities/Boss.js';
import { Target } from './entities/Enemy.js';
import { Particle } from './entities/Particle.js';
import { MedalSystem, EXSystem } from './systems/mechanics.js';
import { AudioManager } from './systems/audio.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.resize();

        this.state = 'TITLE';
        this.lastTime = 0;

        // Mechanics
        this.medalSystem = new MedalSystem();
        this.exSystem = new EXSystem();
        this.audio = new AudioManager();

        // Entities
        this.bullets = [];
        this.targets = [];
        this.particles = [];
        this.boss = null; // Can be Trigger or RealBoss


        // Input
        this.inputDown = false;
        this.inputPos = { x: 0, y: 0 };
        this.fireRate = 100; // ms
        this.lastShotTime = 0;

        this.paused = false;

        // Stage System (Dynamic)
        this.bossTimer = 0;
        this.isBossPhase = false;

        // Use v0.1.0 Stage Data as Base
        this.stageInfo = [
            { name: "のいち動物公園", bg: "assets/bg1.png" },
            { name: "創造広場アクトランド", bg: "assets/bg2.png" },
            { name: "ヤ・シィパーク", bg: "assets/bg3.png" },
            { name: "絵金蔵", bg: "assets/bg4.png" },
            { name: "手結港可動橋", bg: "assets/bg5.png" }
        ];

        // Visuals
        this.cutInActive = false;
        this.cutInTimer = 0;
        this.cutInText = '';
        this.storyActive = false;

        this.bgImage = new Image();
        this.mobImage = new Image();
        this.mobImage.src = 'assets/mob_slime.png';

        // Character Mechanics
        this.mageDamageBuffTime = 0;
        this.dragonMedalBuffTime = 0;

        this.bindEvents();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    reset() {
        this.state = 'TITLE';
        this.subState = 'NORMAL';
        this.paused = false;
        this.inputDown = false;
        this.boss = null;
        this.bullets = [];
        this.targets = [];
        this.particles = [];
        this.audio.stopBGM();
        this.exSystem.reset();

        // Hide UI Elements
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('happy-ending-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.add('hidden');
        this.hideTitleButton();

        // Reset buffs
        this.mageDamageBuffTime = 0;
        this.dragonMedalBuffTime = 0;
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

    tryShoot() {
        try {
            const now = Date.now();
            if (now - this.lastShotTime < this.fireRate) return;

            const leader = this.team && this.team[0] ? this.team[0] : { name: 'せんし' };
            let cost = 1;
            if (leader.name === 'ドラゴン') cost = 3;

            // Check Cost
            if (this.medalSystem.count < cost) {
                return;
            }

            // this.medalSystem.modify(-cost);
            this.medalSystem.modify(-cost);
            this.lastShotTime = now;

            // Audio
            try {
                this.audio.playShoot();
            } catch (ignore) { }

            // Spawn Bullets
            let startX = this.width / 2;
            const startY = this.height - 50;

            if (leader.name === 'ドラゴン') {
                startX = Math.max(30, Math.min(this.width - 30, this.inputPos.x));
                // Dragon: Single vertical shot
                const angle = -Math.PI / 2;
                const damage = 3;
                // Dragon Color #0f0
                this.bullets.push(new Bullet(startX, startY, angle, leader.name, '#0f0', damage));
            } else if (leader.name === 'まほうつかい') {
                // Mage: 3 Way
                const dx = this.inputPos.x - startX;
                const dy = this.inputPos.y - startY;
                const baseAngle = Math.atan2(dy, dx);
                const spread = Math.PI / 6; // 30 deg
                const angles = [baseAngle, baseAngle - spread, baseAngle + spread]; // Center, Left, Right

                let damage = 0.25;
                if (this.mageDamageBuffTime > 0) damage = 1; // Buff

                angles.forEach(a => {
                    this.bullets.push(new Bullet(startX, startY, a, leader.name, '#00f', damage));
                });
            } else {
                // Warrior: Single shot to cursor
                const dx = this.inputPos.x - startX;
                const dy = this.inputPos.y - startY;
                const angle = Math.atan2(dy, dx);
                this.bullets.push(new Bullet(startX, startY, angle, leader.name, '#f00', 1));
            }
        } catch (e) {
            console.error('CRITICAL ERROR IN tryShoot:', e);
            // this.inputDown = false; // Removed to keep trying even if one frame fails
        }
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

        // Ensure Audio is Ready (User Gesture)
        if (this.audio.ctx.state === 'suspended') {
            this.audio.ctx.resume();
        }

        try {
            this.state = 'BATTLE';
            this.subState = 'NORMAL'; // NORMAL or BOSS_PHASE
            this.bossTimer = 0;
            this.boss = new BossTrigger(this.width / 2, 100);
            this.bullets = [];
            this.targets = [];
            this.particles = [];
            this.exSystem.reset();

            // UI: Show Title Button
            this.showTitleButton();

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
                { name: "のいち動物公園（三宝山）", bg: "assets/bg_sanposan.png", bossImg: "assets/boss1.png" },
                { name: "創造広場アクトランド", bg: "assets/bg2.png", bossImg: "assets/boss2.png" },
                { name: "ヤ・シィパーク", bg: "assets/bg3.png", bossImg: "assets/boss3.png" },
                { name: "絵金蔵", bg: "assets/bg4.png", bossImg: "assets/boss4.png" },
                { name: "手結港可動橋", bg: "assets/bg5.png", bossImg: "assets/boss5.png" }
            ];

            // Load Boss Images
            this.bossImages = [];
            this.stageInfo.forEach((info, index) => {
                const img = new Image();
                img.src = info.bossImg;
                this.bossImages[index] = img;
            });
            this.normalBg = "assets/bg_sanposan.png"; // New Castle BG
            this.bgImage.src = this.normalBg;

            // Opening Sequence
            this.showStory("香南市を救え！", "モンスター軍団が現れた！");

            // Start BGM
            this.audio.playBGM(1); // Default to Stage 1 track

            // Spawn some initial mobs
            for (let i = 0; i < 5; i++) {
                this.spawnTarget();
            }
        } catch (e) {
            console.error('Error in startBattle:', e);
            alert('Error starting battle: ' + e.message);
        }
    }

    triggerEX() {
        const leader = this.team && this.team[0] ? this.team[0] : { name: 'せんし' };

        // Reset Gauge
        this.exSystem.reset();

        // 1. Cut-In Effect
        this.cutInActive = true;
        this.cutInTimer = 2.0;

        // 2. Apply Effect based on Leader
        if (leader.name === 'ドラゴン') {
            this.cutInText = 'ゴールドラッシュ！';
            this.dragonMedalBuffTime = 30.0;
            this.currentBuffMaxTime = 30.0;
            this.audio.playHit(); // Play sound
        } else if (leader.name === 'まほうつかい') {
            this.cutInText = 'マジカルバースト！';
            this.mageDamageBuffTime = 20.0;
            this.currentBuffMaxTime = 20.0;
            this.audio.playHit();
        } else {
            // Warrior (Default) - Big Damage to all
            this.cutInText = 'ギガスラッシュ！';
            this.targets.forEach(t => {
                t.hit(50);
                this.createExplosion(t.x, t.y, '#fff', 30);
            });
            if (this.boss) {
                this.boss.hit(50);
                this.createExplosion(this.boss.x, this.boss.y, '#f00', 50);
            }
            this.audio.playHit();
        }
    }

    spawnStageTarget(visualIndex) {
        // Change Substate
        this.subState = 'BOSS_PHASE';
        this.bossTimer = 30.0; // 30 seconds limit

        this.cutInActive = true;
        this.cutInTimer = 2.0;
        this.cutInText = `ボス出現！`;

        // Change BG based on Visual Index
        // Visual Index: 0=Stage1, 1=Stage2, 2=Stage3, 3=Stage4, 4=Stage5
        if (this.stageInfo[visualIndex]) {
            const info = this.stageInfo[visualIndex];
            this.bgImage.src = info.bg;
        }

        // Play Stage BGM
        this.audio.playBGM(visualIndex + 1);

        const x = this.width / 2;
        const y = 100;

        const config = { hp: 50, reward: 250, stageNum: 3 }; // Enable moving logic
        let bossImg = this.mobImage;
        if (this.bossImages && this.bossImages[visualIndex]) {
            bossImg = this.bossImages[visualIndex];
        }
        this.targets.push(new Target(x, y, 'BOSS', bossImg, config));
    }

    returnToNormalStage() {
        this.subState = 'NORMAL';
        this.bossTimer = 0;
        this.bgImage.src = this.normalBg; // Reset BG

        // Reset BGM to Stage 1
        this.audio.playBGM(1);

        // Remove existing Boss (if any)
        this.targets = this.targets.filter(t => t.type !== 'BOSS');

        // Respawn Trigger
        if (!this.boss) {
            this.boss = new BossTrigger(this.width / 2, 100);
        }

        this.cutInActive = true;
        this.cutInTimer = 1.5;
        this.cutInText = 'ステージリセット';
    }

    // UI: Show Title (Stop) Button
    showTitleButton() {
        let btn = document.getElementById('hud-return-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'hud-return-btn';
            btn.textContent = '✕';
            btn.title = 'プレイストップ';
            btn.style.position = 'absolute';
            btn.style.bottom = '20px';
            btn.style.left = '20px';
            btn.style.width = '50px';
            btn.style.height = '50px';
            btn.style.padding = '0';
            btn.style.background = 'rgba(255, 60, 60, 0.9)';
            btn.style.color = '#fff';
            btn.style.border = '3px solid #fff';
            btn.style.borderRadius = '50%';
            btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            btn.style.cursor = 'pointer';
            btn.style.zIndex = '99999';
            btn.style.pointerEvents = 'auto';
            btn.style.fontFamily = 'Arial, sans-serif';
            btn.style.fontSize = '24px';
            btn.style.fontWeight = 'bold';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'center';
            btn.style.alignItems = 'center';
            btn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('タイトル画面に戻りますか？')) {
                    location.reload();
                }
            };
            const uiLayer = document.getElementById('ui-layer');
            if (uiLayer) {
                uiLayer.appendChild(btn);
            } else {
                document.body.appendChild(btn);
            }
        }
        btn.style.display = 'block';
    }

    hideTitleButton() {
        const btn = document.getElementById('hud-return-btn');
        if (btn) btn.style.display = 'none';
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

        try {
            if (this.state === 'BATTLE') {
                if (!this.paused) {
                    if (this.inputDown) this.tryShoot();
                    this.update(dt);
                }
                this.draw();
            } else {
                this.ctx.clearRect(0, 0, this.width, this.height);
            }
        } catch (e) {
            console.error('Game Loop Error:', e);
            // Optionally pause or reset if critical, but for "never stop", we just log.
        }

        requestAnimationFrame(this.loop);
    }

    update(dt) {
        if (this.cutInActive) {
            this.cutInTimer -= dt / 1000;
            if (this.cutInTimer <= 0) {
                this.cutInActive = false;
            }
            this.particles.forEach(p => p.update(dt));
            return;
        }

        // Buff Timers
        if (this.mageDamageBuffTime > 0) {
            this.mageDamageBuffTime -= dt / 1000;
            // Update EX Gauge as Timer
            const ratio = Math.max(0, this.mageDamageBuffTime / this.currentBuffMaxTime);
            document.getElementById('ex-gauge-bar').style.width = `${ratio * 100}%`;
            if (this.mageDamageBuffTime <= 0) {
                this.mageDamageBuffTime = 0;
                this.exSystem.reset(); // Reset to empty when done
            }
        }
        if (this.dragonMedalBuffTime > 0) {
            this.dragonMedalBuffTime -= dt / 1000;
            // Update EX Gauge as Timer
            const ratio = Math.max(0, this.dragonMedalBuffTime / this.currentBuffMaxTime);
            document.getElementById('ex-gauge-bar').style.width = `${ratio * 100}%`;
            if (this.dragonMedalBuffTime <= 0) {
                this.dragonMedalBuffTime = 0;
                this.exSystem.reset();
            }
        }

        // Boss Timer
        if (this.subState === 'BOSS_PHASE') {
            this.bossTimer -= dt / 1000;
            // UPDATE TIMER UI? (Maybe draw it)
            if (this.bossTimer <= 0) {
                // Time Over
                this.returnToNormalStage();
            }
        }

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
                this.createExplosion(t.x, t.y, '#fff', 50);

                if (t.type === 'BOSS') {
                    // Boss Defeated
                    let value = t.value || 250;
                    if (this.dragonMedalBuffTime > 0) value *= 5;
                    this.medalSystem.modify(value);

                    // Return to Normal
                    setTimeout(() => this.returnToNormalStage(), 500);
                }
            }
        });

        if (this.boss) {
            this.boss.update(dt);
            if (this.boss.hp <= 0) {
                // Boss Trigger Defeated
                this.medalSystem.modify(50);
                this.createExplosion(this.boss.x, this.boss.y, '#ff0000', 30);

                const visualIdx = this.boss.visualIndex; // Capture visual
                this.boss = null; // Remove trigger

                // Spawn Boss Phase
                this.spawnStageTarget(visualIdx);
            }
        }

        this.checkCollisions();

        // Game Over Check
        const leader = this.team && this.team[0];
        let gameOverThreshold = 0;
        // Dragon Game Over if Medals <= 3 (Cost is 3)
        // User requested: "3以下" (<= 3). This effectively means if you have 3 medals, you can shoot once more, 
        // but the rule says "Become Game Over if <= 3". This would mean you can't use the last 3 medals?
        // Let's stick to strict interpretation: if (medals <= 3) -> Game Over.
        // Wait, if I have 3 medals, I can shoot. Shooting costs 3. Count becomes 0.
        // If I have 3 medals, should I be able to shoot?
        // If the rule is "Game Over if <= 3", then having 3 means Game Over immediately?
        // Or does it mean "If cannot shoot"?
        // Usually such rules mean "If you cannot afford to shoot". Dragon costs 3.
        // So strict "Cannot shoot" would be < 3.
        // But user said "3以下" (<= 3).
        // If I make it strict "count <= 3", then having 3 medals results in Game Over.
        // I will implement "count <= 3" for Dragon as requested.

        if (leader && leader.name === 'ドラゴン') {
            gameOverThreshold = 3;
        }

        if (this.state === 'BATTLE' && this.medalSystem.count <= gameOverThreshold && this.bullets.length === 0 && !this.cutInActive) {
            this.state = 'GAMEOVER';
            document.getElementById('ui-layer').style.pointerEvents = 'auto';
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('game-over-screen').classList.remove('hidden');
            this.hideTitleButton();
        }

        if (Math.random() < 0.02 && this.targets.length < 10 && this.subState === 'NORMAL') {
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
            this.cutInText = 'ステージクリア！';

            // Change BG & Show Story
            const nextStageIdx = this.stage - 1;
            if (this.stageInfo[nextStageIdx]) {
                this.bgImage.src = this.stageInfo[nextStageIdx].bg;
                setTimeout(() => {
                    this.showStory(`Stage ${this.stage} `, this.stageInfo[nextStageIdx].name);
                    // Respawn Bonus Boss for new stage
                    if (!this.boss) this.boss = new BossTrigger(this.width / 2, 100);
                }, 2000);
            }
        }
    }

    checkCollisions() {
        for (const b of this.bullets) {
            for (const t of this.targets) {
                if (b.intersects(t)) {
                    b.active = false;

                    // Difficulty Scaling: 
                    // Medals >= 1000: Non-Boss targets have 2.0x Defense
                    // Medals >= 500: Non-Boss targets have 1.5x Defense
                    let dmg = b.damage || 1;
                    if (!t.isBoss) {
                        if (this.medalSystem.count >= 1000) {
                            dmg = dmg / 2.0;
                        } else if (this.medalSystem.count >= 500) {
                            dmg = dmg / 1.5;
                        }
                    }

                    t.hit(dmg); // Use calculated damage
                    try { this.audio.playHit(); } catch (ignore) { } // Hit SFX
                    this.createExplosion(b.x, b.y, '#fff', 5);

                    if (!t.active) {
                        // Normal death logic (or non-boss)
                        let value = t.value;
                        if (this.dragonMedalBuffTime > 0) value *= 5; // Dragon Buff

                        this.medalSystem.modify(value);
                        if (this.mageDamageBuffTime <= 0 && this.dragonMedalBuffTime <= 0) {
                            this.exSystem.add(5);
                        }
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
                this.boss.hit(b.damage || 1);
                try { this.audio.playHit(); } catch (ignore) { } // Hit SFX
                this.createExplosion(b.x, b.y, '#ffaa00', 5);
                if (this.mageDamageBuffTime <= 0 && this.dragonMedalBuffTime <= 0) {
                    this.exSystem.add(1);
                }
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background
        if (this.bgImage) {
            // Fill Stretch (Show entire image)
            this.ctx.drawImage(this.bgImage, 0, 0, this.width, this.height);

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
            this.ctx.stroke();
        } else if (leaderInfo.name === 'まほうつかい') {
            // Mage: 3 Way Aim Lines
            const startX = aimStartX;
            const startY = this.height - 50;

            // Base Angle to Cursor
            const dx = this.inputPos.x - startX;
            const dy = this.inputPos.y - startY;
            const baseAngle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const lineLen = Math.max(dist, 500); // Draw nice long lines

            const spread = Math.PI / 6; // 30 degrees
            const angles = [baseAngle, baseAngle - spread, baseAngle + spread];

            angles.forEach(a => {
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(startX + Math.cos(a) * lineLen, startY + Math.sin(a) * lineLen);
                this.ctx.stroke();
            });
        } else {
            this.ctx.lineTo(this.inputPos.x, this.inputPos.y);
            this.ctx.stroke();
        }

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

        // Draw Boss Timer if Active
        if (this.subState === 'BOSS_PHASE' && !this.cutInActive) {
            this.ctx.save();
            this.ctx.font = 'bold 30px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            // Draw at top center
            this.ctx.strokeText(`残り: ${Math.ceil(this.bossTimer)}`, this.width / 2, 50);
            this.ctx.fillText(`残り: ${Math.ceil(this.bossTimer)}`, this.width / 2, 50);
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
