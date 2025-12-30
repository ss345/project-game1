import { Game } from './game.js';

window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');
    const game = new Game(canvas);

    // UI Bindings
    const startBtn = document.getElementById('start-btn');
    const titleScreen = document.getElementById('title-screen');
    const deckScreen = document.getElementById('deck-select-screen');
    const battleStartBtn = document.getElementById('battle-start-btn');
    const returnTitleBtn = document.getElementById('return-title-btn');
    const resultScreen = document.getElementById('result-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverBtn = document.getElementById('game-over-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const pauseScreen = document.getElementById('pause-screen');
    const resumeBtn = document.getElementById('resume-btn');
    const quitBtn = document.getElementById('quit-btn');
    const endingBtn = document.getElementById('ending-btn');
    const endingScreen = document.getElementById('happy-ending-screen');
    const hud = document.getElementById('hud');

    // 1. Data State (Must be declared before functions using it)
    let selectedMonsters = [];

    // 2. Element Checks
    if (!startBtn) return;

    // 3. Helper Functions
    function renderMonsterList() {
        const list = document.getElementById('monster-list');
        list.innerHTML = '';

        // Stats: 1-3 stars. Buff: Text.
        const monsters = [
            { id: 1, name: 'せんし', color: '#f00', atk: 2, bullets: 1, cost: 1, buff: '画面内にいるモンスター（トリガーモンスター以外）を倒してコインを獲得' },
            { id: 2, name: 'まほうつかい', color: '#00f', atk: 1, bullets: 3, cost: 1, buff: '20秒間 攻撃力12倍' },
            { id: 3, name: 'ドラゴン', color: '#0f0', atk: 3, bullets: 1, cost: 3, buff: '30秒間 メダル獲得5倍' }
        ];

        const toStars = (val) => {
            let s = '';
            for (let i = 0; i < 3; i++) {
                s += (i < val) ? '★' : '☆';
            }
            return s;
        };

        monsters.forEach(m => {
            const card = document.createElement('div');
            card.className = 'monster-card';
            // Custom Layout for stats
            card.innerHTML = `
                <div style="font-weight:bold; font-size:1.1em; margin-bottom:5px;">${m.name}</div>
                <div style="font-size:0.8em; text-align:left; width:90%;">
                    <div>攻撃力: <span style="color:#ff0">${toStars(m.atk)}</span></div>
                    <div>発射数: <span style="color:#ff0">${toStars(m.bullets)}</span></div>
                    <div>コスト: <span style="color:#ff0">${toStars(m.cost)}</span></div>
                    <div style="margin-top:4px; font-size:0.9em; border-top:1px solid #666; padding-top:2px;">効果: ${m.buff}</div>
                </div>
            `;
            card.style.backgroundColor = m.color;
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'center';
            card.style.alignItems = 'center';
            card.style.textAlign = 'center';
            card.style.width = '140px'; // Wider for text
            card.style.height = '180px'; // Taller for stats

            card.onclick = () => {
                // Single Selection Mode
                const allCards = document.querySelectorAll('.monster-card');
                allCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedMonsters = [m];
                console.log('Selection Update:', selectedMonsters);
                battleStartBtn.disabled = false;
            };
            list.appendChild(card);
        });

        selectedMonsters = [];
        battleStartBtn.disabled = true;
    }

    const togglePause = (e) => {
        e.preventDefault(); // Prevent ghost clicks
        game.paused = true;
        pauseScreen.classList.remove('hidden');
    };

    // 4. Event Listeners
    startBtn.addEventListener('click', () => {
        titleScreen.classList.add('hidden');
        deckScreen.classList.remove('hidden');
        renderMonsterList();
    });

    returnTitleBtn.addEventListener('click', () => {
        resultScreen.classList.add('hidden');
        titleScreen.classList.remove('hidden');
        game.reset(); // Reset game state
    });

    gameOverBtn.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        titleScreen.classList.remove('hidden');
        game.reset();
    });

    endingBtn.addEventListener('click', () => {
        endingScreen.classList.add('hidden');
        titleScreen.classList.remove('hidden');
        game.reset();
    });

    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
        pauseBtn.addEventListener('touchstart', togglePause);
    }

    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            game.paused = false;
            pauseScreen.classList.add('hidden');
        });
    }

    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            game.paused = false;
            pauseScreen.classList.add('hidden');
            hud.classList.add('hidden');
            game.reset();
            titleScreen.classList.remove('hidden');
        });
    }

    battleStartBtn.addEventListener('click', () => {
        console.log('Battle Start Button Clicked!');
        deckScreen.classList.add('hidden');
        hud.classList.remove('hidden');
        // Pass team data
        game.startBattle(selectedMonsters);
    });

    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            if (game.audio.isMuted) {
                game.audio.setMute(false);
                soundToggleBtn.textContent = 'SOUND: OFFにする'; // Now playing, so action is OFF
                soundToggleBtn.style.background = '#666'; // Reset color
            } else {
                game.audio.setMute(true);
                soundToggleBtn.textContent = 'SOUND: ONにする'; // Now muted, so action is ON
                soundToggleBtn.style.background = '#333'; // Darker
            }
        });
    }

    // Handle Resize
    window.addEventListener('resize', () => {
        game.resize();
    });
});
