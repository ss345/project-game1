export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.isMuted = false;
        this.currentBgmInterval = null;
        this.activeNodes = []; // To stop sounds

        // --- FX BUS ---
        // Master Compressor
        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.value = -10;
        this.masterCompressor.knee.value = 40;
        this.masterCompressor.ratio.value = 12;
        this.masterCompressor.connect(this.ctx.destination);

        // Reverb Bus
        this.reverbNode = this.createReverb();
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.0; // OFF
        this.reverbGain.connect(this.masterCompressor);
        this.reverbNode.connect(this.reverbGain);

        // Delay Bus (Ping Pong)
        this.delayL = this.ctx.createDelay();
        this.delayR = this.ctx.createDelay();
        this.delayGain = this.ctx.createGain();
        this.delayL.delayTime.value = 0.3; // dotted 8th ish
        this.delayR.delayTime.value = 0.45;
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.0; // OFF

        this.delayGain.gain.value = 0.0; // OFF
        this.delayL.connect(this.delayR); // Cross
        this.delayR.connect(this.delayL); // Feed
        this.delayL.connect(this.delayGain);
        this.delayR.connect(this.delayGain);
        this.delayGain.connect(this.masterCompressor);

        // Music Data
        this.songs = this.createSongs();
    }

    createReverb() {
        const convolver = this.ctx.createConvolver();
        // Create a simple impulse response
        const rate = this.ctx.sampleRate;
        const length = rate * 2.0; // 2 seconds
        const impulse = this.ctx.createBuffer(2, length, rate);
        const L = impulse.getChannelData(0);
        const R = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - i / length, 2);
            L[i] = (Math.random() * 2 - 1) * decay;
            R[i] = (Math.random() * 2 - 1) * decay;
        }
        convolver.buffer = impulse;
        return convolver;
    }

    // --- SYNTHESIS VOICES ---

    playSuperSaw(note, time, duration, vol = 0.1) {
        const freqs = [note, note * 1.002, note * 0.998]; // Tighter Detune (was 1.005)
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.1); // Attack
        gain.gain.setValueAtTime(vol, time + duration - 0.1); // Sustain
        gain.gain.linearRampToValueAtTime(0, time + duration + 0.2); // Release

        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f;
            osc.connect(gain);
            osc.start(time);
            osc.stop(time + duration + 0.5);
            this.activeNodes.push(osc);
            // Cleanup from list after stop
            setTimeout(() => {
                const idx = this.activeNodes.indexOf(osc);
                if (idx > -1) this.activeNodes.splice(idx, 1);
            }, (duration + 0.5) * 1000);
        });

        // Effect Sends
        gain.connect(this.masterCompressor);
        gain.connect(this.reverbNode);
        gain.connect(this.delayL);
    }

    playBass(note, time, duration, vol = 0.3) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth'; // Gritty bass
        osc.frequency.value = note;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.exponentialRampToValueAtTime(1000, time + 0.1); // Wow factor
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterCompressor);

        osc.start(time);
        osc.stop(time + duration + 0.1);
        this.activeNodes.push(osc);
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterCompressor);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        // Noise
        const len = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;

        noiseGain.gain.setValueAtTime(0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.reverbNode); // Snare reverb
        noiseGain.connect(this.masterCompressor);

        noise.start(time);

        // Body
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, time);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.3, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.connect(oscGain);
        oscGain.connect(this.masterCompressor);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playHiHat(time) {
        const len = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterCompressor);
        noise.start(time);
    }

    // --- SEQUENCER ---

    resumeCtx() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playBGM(stageNum) {
        this.stopBGM();
        if (this.isMuted) return;
        this.resumeCtx();

        const song = this.songs[stageNum] || this.songs[1]; // Default Stage 1
        const secPerBeat = 60 / song.bpm;
        const loopLength = song.length * secPerBeat; // Total seconds

        const scheduleLoop = (startTime) => {
            // Drums
            if (song.drums) {
                song.drums.forEach(d => {
                    const time = startTime + d.t * secPerBeat;
                    if (d.type === 'k') this.playKick(time);
                    if (d.type === 's') this.playSnare(time);
                    if (d.type === 'h') this.playHiHat(time);
                });
            }
            // Synths
            if (song.synths) {
                song.synths.forEach(s => {
                    const time = startTime + s.t * secPerBeat;
                    const dur = s.d * secPerBeat;
                    if (s.type === 'saw') this.playSuperSaw(s.n, time, dur);
                    if (s.type === 'bass') this.playBass(s.n, time, dur);
                });
            }
        };

        const now = this.ctx.currentTime + 0.1; // Scheduling lookahead
        scheduleLoop(now);
        this.currentBgmInterval = setInterval(() => {
            scheduleLoop(this.ctx.currentTime + 0.1);
        }, loopLength * 1000);
    }

    stopBGM() {
        if (this.currentBgmInterval) {
            clearInterval(this.currentBgmInterval);
            this.currentBgmInterval = null;
        }
        this.activeNodes.forEach(n => {
            try { n.stop(); n.disconnect(); } catch (e) { }
        });
        this.activeNodes = [];
    }

    setMute(mute) {
        this.isMuted = mute;
        if (this.isMuted) this.stopBGM();
        else this.resumeCtx();
    }

    // SFX Helpers
    playShoot() {
        try {
            if (!this.isMuted && this.ctx) {
                this.resumeCtx();
                this.playSuperSaw(880, this.ctx.currentTime, 0.1, 0.2);
            }
        } catch (e) {
            console.warn('Audio playShoot failed:', e);
        }
    }

    playHit() {
        try {
            if (!this.isMuted && this.ctx) {
                this.resumeCtx();
                this.playSnare(this.ctx.currentTime);
            }
        } catch (e) {
            console.warn('Audio playHit failed:', e);
        }
    }

    // --- SONG DATA CREATION ---
    createSongs() {
        // Hertz notes
        const N = { C3: 130, E3: 164, G3: 196, A3: 220, C4: 261, E4: 329, F4: 349, G4: 392, A4: 440, C5: 523 };

        // Stage 1: Epic Orchestral (Approximation)
        // Pattern: Kick-Hat-Snare-Hat
        const drumPattern = [];
        for (let i = 0; i < 8; i++) { // 8 Beats
            drumPattern.push({ t: i, type: 'k' });
            drumPattern.push({ t: i + 0.5, type: 'h' });
            drumPattern.push({ t: i + 0.25, type: 'h' });
            drumPattern.push({ t: i + 0.75, type: 'h' });
            if (i % 2 !== 0) drumPattern.push({ t: i, type: 's' });
        }

        const s1_synths = [
            // Bass Line
            { t: 0, d: 1, n: N.C3, type: 'bass' }, { t: 1, d: 1, n: N.C3, type: 'bass' }, { t: 2, d: 1, n: N.G3, type: 'bass' }, { t: 3, d: 1, n: N.G3, type: 'bass' },
            { t: 4, d: 1, n: N.A3, type: 'bass' }, { t: 5, d: 1, n: N.A3, type: 'bass' }, { t: 6, d: 1, n: N.F4, type: 'bass' }, { t: 7, d: 1, n: N.F4, type: 'bass' },
            // Melody (SuperSaw)
            { t: 0, d: 2, n: N.C5, type: 'saw' }, { t: 2, d: 2, n: N.E4, type: 'saw' },
            { t: 4, d: 0.5, n: N.A4, type: 'saw' }, { t: 4.5, d: 0.5, n: N.G4, type: 'saw' }, { t: 5, d: 1, n: N.F4, type: 'saw' },
            { t: 6, d: 2, n: N.C5, type: 'saw' }
        ];

        return {
            1: { bpm: 130, length: 8, drums: drumPattern, synths: s1_synths },
            2: { bpm: 100, length: 8, drums: drumPattern, synths: s1_synths }, // Fallback to S1 logic as placeholder
            3: { bpm: 160, length: 8, drums: drumPattern, synths: s1_synths }  // Fallback to S1 logic as placeholder
        };
    }
}
