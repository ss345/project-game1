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
        const monsters = [
            { id: 1, name: 'せんし', color: '#f00', stats: '攻撃:高い 速度:普通' },
            { id: 2, name: 'まほうつかい', color: '#00f', stats: '攻撃:低い 範囲:広い' },
            { id: 3, name: 'ドラゴン', color: '#0f0', stats: '攻撃:最強 コスト:3枚' }
        ];

        monsters.forEach(m => {
            const card = document.createElement('div');
            card.className = 'monster-card';
            card.innerHTML = `<strong>${m.name}</strong><br><span style="font-size:0.8em">${m.stats}</span>`;
            card.style.backgroundColor = m.color;
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'center';
            card.style.alignItems = 'center';
            card.style.textAlign = 'center';
            card.onclick = () => {
                // Single Selection Mode
                // 1. Deselect All Visuals
                const allCards = document.querySelectorAll('.monster-card');
                allCards.forEach(c => c.classList.remove('selected'));

                // 2. Select This Visual
                card.classList.add('selected');

                // 3. Update Data (Single Item Array)
                selectedMonsters = [m];

                console.log('Selection Update:', selectedMonsters);
                battleStartBtn.disabled = false;
            };
            list.appendChild(card);
        });

        // Auto-select first one or leave empty?
        // Let's leave empty to force choice, or select first?
        // User asked for "select logic", so probably starts empty.
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
