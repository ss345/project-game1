export class MedalSystem {
    constructor() {
        this.count = 100;
        this.updateDisplay();
    }

    modify(amount) {
        this.count += amount;
        this.updateDisplay();
    }

    updateDisplay() {
        const el = document.getElementById('medal-count');
        if (el) el.textContent = this.count;
    }
}

export class EXSystem {
    constructor() {
        this.value = 0;
        this.max = 100;
        this.updateDisplay();
    }

    add(amount) {
        this.value += amount;
        if (this.value > this.max) this.value = this.max;
        this.updateDisplay();

        // Visual feedback when full
        const container = document.getElementById('ex-gauge-container');
        if (container) {
            if (this.value >= this.max) {
                container.classList.add('ex-full');
            } else {
                container.classList.remove('ex-full');
            }
        }
    }

    reset() {
        this.value = 0;
        this.updateDisplay();
        const container = document.getElementById('ex-gauge-container');
        if (container) container.classList.remove('ex-full');
    }

    updateDisplay() {
        const bar = document.getElementById('ex-gauge-bar');
        if (bar) {
            bar.style.width = `${(this.value / this.max) * 100}%`;
        }
    }
}
