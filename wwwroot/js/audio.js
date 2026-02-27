let audioContext = null;
let sourceNode = null;
let gainNode = null;
let filterNode = null;
let modulatorNode = null;
let modulatorGain = null;
let isPlaying = false;

function ensureContext() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function generateWhiteNoise(ctx, duration) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }
    return buffer;
}

function generatePinkNoise(ctx, duration) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    }
    return buffer;
}

function generateBrownNoise(ctx, duration) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (last + (0.02 * white)) / 1.02;
            last = data[i];
            data[i] *= 3.5;
        }
    }
    return buffer;
}

export function createNoiseGenerator(type) {
    stop();
    const ctx = ensureContext();
    gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;

    const duration = 4;
    let buffer;

    switch (type.toLowerCase()) {
        case 'white':
            buffer = generateWhiteNoise(ctx, duration);
            break;
        case 'pink':
            buffer = generatePinkNoise(ctx, duration);
            break;
        case 'brown':
            buffer = generateBrownNoise(ctx, duration);
            break;
        case 'rain':
            buffer = generateWhiteNoise(ctx, duration);
            filterNode = ctx.createBiquadFilter();
            filterNode.type = 'bandpass';
            filterNode.frequency.value = 800;
            filterNode.Q.value = 0.5;
            // Add amplitude modulation for rain patter
            modulatorNode = ctx.createOscillator();
            modulatorGain = ctx.createGain();
            modulatorNode.frequency.value = 3;
            modulatorGain.gain.value = 0.3;
            modulatorNode.connect(modulatorGain);
            modulatorGain.connect(gainNode.gain);
            modulatorNode.start();
            break;
        case 'ocean':
            buffer = generateBrownNoise(ctx, duration);
            filterNode = ctx.createBiquadFilter();
            filterNode.type = 'lowpass';
            filterNode.frequency.value = 500;
            // Slow modulation for wave-like effect
            modulatorNode = ctx.createOscillator();
            modulatorGain = ctx.createGain();
            modulatorNode.frequency.value = 0.15;
            modulatorGain.gain.value = 0.4;
            modulatorNode.connect(modulatorGain);
            modulatorGain.connect(gainNode.gain);
            modulatorNode.start();
            break;
        case 'wind':
            buffer = generatePinkNoise(ctx, duration);
            filterNode = ctx.createBiquadFilter();
            filterNode.type = 'bandpass';
            filterNode.frequency.value = 300;
            filterNode.Q.value = 0.3;
            // Wind gusts modulation
            modulatorNode = ctx.createOscillator();
            modulatorGain = ctx.createGain();
            modulatorNode.frequency.value = 0.5;
            modulatorGain.gain.value = 0.35;
            modulatorNode.connect(modulatorGain);
            modulatorGain.connect(gainNode.gain);
            modulatorNode.start();
            break;
        default:
            buffer = generateWhiteNoise(ctx, duration);
    }

    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = true;

    if (filterNode) {
        sourceNode.connect(filterNode);
        filterNode.connect(gainNode);
    } else {
        sourceNode.connect(gainNode);
    }

    gainNode.connect(ctx.destination);
    sourceNode.start();
    isPlaying = true;
}

export function setVolume(level) {
    if (gainNode && audioContext) {
        gainNode.gain.setValueAtTime(level, audioContext.currentTime);
    }
}

export function stop() {
    if (sourceNode) {
        try { sourceNode.stop(); } catch { }
        sourceNode.disconnect();
        sourceNode = null;
    }
    if (filterNode) {
        filterNode.disconnect();
        filterNode = null;
    }
    if (modulatorNode) {
        try { modulatorNode.stop(); } catch { }
        modulatorNode.disconnect();
        modulatorNode = null;
    }
    if (modulatorGain) {
        modulatorGain.disconnect();
        modulatorGain = null;
    }
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
    isPlaying = false;
}

export function getIsPlaying() {
    return isPlaying;
}
