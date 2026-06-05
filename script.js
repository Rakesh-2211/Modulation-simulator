document.addEventListener('DOMContentLoaded', () => {
    let amChartInstance = null;
    let fmChartInstance = null;
    let amSpectrumChartInstance = null;
    let fmSpectrumChartInstance = null;

    // --- Audio State & Context ---
    let audioCtx = null;

    // AM Audio/Animation State
    let amAudioPlaying = false;
    let amMessageOsc = null;
    let amCarrierOsc = null;
    let amCarrierGain = null;
    let amMessageGain = null;
    let amMasterGain = null;
    let amMuteState = false;
    let amAnimFrameId = null;
    let amTimeOffset = 0;
    let amLastTime = 0;
    let amIsRunning = false;

    // FM Audio/Animation State
    let fmAudioPlaying = false;
    let fmMessageOsc = null;
    let fmCarrierOsc = null;
    let fmModGain = null;
    let fmMasterGain = null;
    let fmMuteState = false;
    let fmAnimFrameId = null;
    let fmTimeOffset = 0;
    let fmLastTime = 0;
    let fmIsRunning = false;

    // Last validated parameters for safety during loops
    let amStateAc = 10;
    let amStateAm = 5;
    let amStateFc = 1000;
    let amStateFm = 10;

    let fmStateDev = 75000;
    let fmStateFm = 15000;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // --- Bessel Function Helper ---
    // Computes J_n(x) using numerical cosine integration: J_n(x) = (1/pi) * integral_0_pi cos(n*t - x*sin(t)) dt
    function besselJ(n, x) {
        const steps = 100;
        let sum = 0;
        for (let i = 0; i < steps; i++) {
            const theta = (i / steps) * Math.PI;
            sum += Math.cos(n * theta - x * Math.sin(theta));
        }
        return sum / steps;
    }

    // --- Chart Drawing Helpers ---
    function drawChart(canvasId, labels, datasets) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        if (canvasId === 'am-chart' && amChartInstance) {
            amChartInstance.destroy();
        }
        if (canvasId === 'fm-chart' && fmChartInstance) {
            fmChartInstance.destroy();
        }

        const newChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeOutQuart' },
                scales: {
                    x: {
                        display: false,
                        title: { display: true, text: 'Time', color: '#94a3b8' }
                    },
                    y: {
                        display: true,
                        title: { display: true, text: 'Amplitude', color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { 
                        labels: { 
                            font: { family: "'Outfit', sans-serif", size: 13, weight: 300 },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            generateLabels: function(chart) {
                                const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                labels.forEach(label => {
                                    if (label.hidden) {
                                        label.hidden = false;
                                        label.fontColor = 'rgba(248, 250, 252, 0.3)';
                                        label.fillStyle = 'rgba(248, 250, 252, 0.1)';
                                    } else {
                                        label.fontColor = '#f8fafc';
                                    }
                                });
                                return labels;
                            }
                        } 
                    }
                }
            }
        });

        if (canvasId === 'am-chart') amChartInstance = newChart;
        if (canvasId === 'fm-chart') fmChartInstance = newChart;
    }

    function drawSpectrumChart(canvasId, labels, dataPoints, xLabel, yLabel, barColor) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        if (canvasId === 'am-spectrum-chart' && amSpectrumChartInstance) {
            amSpectrumChartInstance.destroy();
        }
        if (canvasId === 'fm-spectrum-chart' && fmSpectrumChartInstance) {
            fmSpectrumChartInstance.destroy();
        }

        const newChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: dataPoints,
                    backgroundColor: barColor,
                    borderColor: barColor,
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.1,
                    maxBarThickness: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Amplitude: ${context.parsed.y.toFixed(3)} V`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: xLabel, color: '#94a3b8', font: { family: 'Outfit', size: 12 } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                    },
                    y: {
                        title: { display: true, text: yLabel, color: '#94a3b8', font: { family: 'Outfit', size: 12 } },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } },
                        beginAtZero: true
                    }
                }
            }
        });

        if (canvasId === 'am-spectrum-chart') amSpectrumChartInstance = newChart;
        if (canvasId === 'fm-spectrum-chart') fmSpectrumChartInstance = newChart;
    }

    function formatFreq(hz) {
        if (hz >= 1e12) return (hz / 1e12).toFixed(2) + ' <span class="unit">THz</span>';
        if (hz >= 1e9) return (hz / 1e9).toFixed(2) + ' <span class="unit">GHz</span>';
        if (hz >= 1e6) return (hz / 1e6).toFixed(2) + ' <span class="unit">MHz</span>';
        if (hz >= 1e3) return (hz / 1e3).toFixed(2) + ' <span class="unit">kHz</span>';
        return hz.toFixed(2) + ' <span class="unit">Hz</span>';
    }

    function formatPower(w) {
        if (w >= 1e6) return (w / 1e6).toFixed(2) + ' <span class="unit">MW</span>';
        if (w >= 1e3) return (w / 1e3).toFixed(2) + ' <span class="unit">kW</span>';
        if (w >= 1) return w.toFixed(2) + ' <span class="unit">W</span>';
        if (w >= 1e-3) return (w * 1e3).toFixed(2) + ' <span class="unit">mW</span>';
        if (w >= 1e-6) return (w * 1e6).toFixed(2) + ' <span class="unit">µW</span>';
        if (w === 0) return '0 <span class="unit">W</span>';
        return w.toExponential(2) + ' <span class="unit">W</span>';
    }

    function getUnitText(selectId) {
        const select = document.getElementById(selectId);
        return select.options[select.selectedIndex].text;
    }

    // --- Tab Switching Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const calcSections = document.querySelectorAll('.calc-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            calcSections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Pause both when switching tabs for isolation
            pauseAM();
            pauseFM();
        });
    });

    // --- AM Audio Synthesis ---
    function startAMAudio(ac, am, fc, fm) {
        initAudio();
        stopAMAudio();

        // Audio Frequency Scaling
        const ratio = fm / fc;
        const fcAudible = 400; // Base carrier pitch (A4)
        let fmAudible = fcAudible * ratio;

        // Clamp to rich tremolo/vibrato range for audio clarity
        if (fmAudible < 0.5) fmAudible = 0.5;
        if (fmAudible > 150) fmAudible = 150;

        const m = am / ac;
        const carrierBaseGain = 0.25;

        document.getElementById('am-audio-note').innerHTML = 
            `🎵 Audible Scale: Carrier = ${fcAudible}Hz | Modulator = ${fmAudible.toFixed(1)}Hz`;

        amCarrierOsc = audioCtx.createOscillator();
        amCarrierOsc.frequency.value = fcAudible;
        amCarrierOsc.type = 'sine';

        amMessageOsc = audioCtx.createOscillator();
        amMessageOsc.frequency.value = fmAudible;
        amMessageOsc.type = 'sine';

        amCarrierGain = audioCtx.createGain();
        amCarrierGain.gain.value = carrierBaseGain;

        amMessageGain = audioCtx.createGain();
        amMessageGain.gain.value = carrierBaseGain * m;

        amMasterGain = audioCtx.createGain();
        const vol = parseFloat(document.getElementById('am-volume').value);
        amMasterGain.gain.value = amMuteState ? 0 : vol;

        // Connections
        amMessageOsc.connect(amMessageGain);
        amMessageGain.connect(amCarrierGain.gain);

        amCarrierOsc.connect(amCarrierGain);
        amCarrierGain.connect(amMasterGain);
        amMasterGain.connect(audioCtx.destination);

        amCarrierOsc.start();
        amMessageOsc.start();
        amAudioPlaying = true;
    }

    function stopAMAudio() {
        if (amAudioPlaying) {
            try {
                if (amCarrierOsc) {
                    amCarrierOsc.stop();
                    amCarrierOsc.disconnect();
                }
                if (amMessageOsc) {
                    amMessageOsc.stop();
                    amMessageOsc.disconnect();
                }
                if (amCarrierGain) amCarrierGain.disconnect();
                if (amMessageGain) amMessageGain.disconnect();
                if (amMasterGain) amMasterGain.disconnect();
            } catch (e) {
                console.warn("Error stopping AM audio:", e);
            }
            amAudioPlaying = false;
        }
    }

    // --- AM Calculator & Playback Loop ---
    const amBtn = document.getElementById('calc-am-btn');
    const amPlayBtn = document.getElementById('am-play-btn');
    const amMuteBtn = document.getElementById('am-mute-btn');
    const amVolumeSlider = document.getElementById('am-volume');

    const amAcInput = document.getElementById('am-ac');
    const amAmInput = document.getElementById('am-am');
    const amFcInput = document.getElementById('am-fc');
    const amFmInput = document.getElementById('am-fm');

    const resM = document.getElementById('am-res-m');
    const resPercent = document.getElementById('am-res-percent');
    const resPc = document.getElementById('am-res-pc');
    const resPt = document.getElementById('am-res-pt');
    const resPsb = document.getElementById('am-res-psb');
    const resLsb = document.getElementById('am-res-lsb');
    const resUsb = document.getElementById('am-res-usb');

    function calculateAM() {
        const ac_val = parseFloat(amAcInput.value);
        const am_val = parseFloat(amAmInput.value);
        const fc_val = parseFloat(amFcInput.value);
        const fm_val = parseFloat(amFmInput.value);

        if (isNaN(ac_val) || isNaN(am_val) || isNaN(fc_val) || isNaN(fm_val)) {
            alert("Please fill in all AM input fields with valid numbers.");
            return;
        }

        const ac = ac_val * parseFloat(document.getElementById('am-ac-unit').value);
        const am = am_val * parseFloat(document.getElementById('am-am-unit').value);
        const fc = fc_val * parseFloat(document.getElementById('am-fc-unit').value);
        const fm = fm_val * parseFloat(document.getElementById('am-fm-unit').value);

        if (ac === 0) {
            resM.textContent = "Error: Ac cannot be 0";
            return;
        }

        // Store validated parameters safely
        amStateAc = ac;
        amStateAm = am;
        amStateFc = fc;
        amStateFm = fm;

        const m = am / ac;
        const percent = m * 100;
        const pc = Math.pow(ac, 2) / 2;
        const pt = pc * (1 + Math.pow(m, 2) / 2);
        const psb = pt - pc;
        const lsb = fc - fm;
        const usb = fc + fm;

        resM.textContent = m.toFixed(3);
        resPercent.textContent = `${percent.toFixed(1)}%`;
        resPc.innerHTML = formatPower(pc);
        resPt.innerHTML = formatPower(pt);
        resPsb.innerHTML = formatPower(psb);
        resLsb.innerHTML = formatFreq(lsb);
        resUsb.innerHTML = formatFreq(usb);

        // Highlight results
        const outputs = [resM, resPercent, resPc, resPt, resPsb, resLsb, resUsb];
        outputs.forEach(el => {
            el.style.opacity = '0.5';
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transition = 'opacity 0.3s ease';
            }, 50);
        });

        // Enable Play Button
        amPlayBtn.removeAttribute('disabled');
        if (!amIsRunning) {
            document.getElementById('am-audio-note').textContent = "▶ Press Play/Run to listen & animate signal.";
        }

        // 1. Draw/Update Time Domain Line Chart
        if (!amIsRunning) {
            const numPoints = 1000;
            const labels = [];
            const modulatedData = [];
            const messageData = [];
            const carrierData = [];
            const maxT = 3 / amStateFm;
            let visualFc = amStateFc;
            if (amStateFc > 40 * amStateFm) visualFc = 20 * amStateFm;

            for (let i = 0; i <= numPoints; i++) {
                const t = (i / numPoints) * maxT;
                const m_t = amStateAm * Math.sin(2 * Math.PI * amStateFm * t);
                const c_t = amStateAc * Math.sin(2 * Math.PI * visualFc * t);
                const v = (amStateAc + m_t) * Math.sin(2 * Math.PI * visualFc * t);

                labels.push(i);
                messageData.push(m_t);
                carrierData.push(c_t);
                modulatedData.push(v);
            }

            const datasets = [
                {
                    label: 'Modulated AM Signal',
                    data: modulatedData,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Message Signal (Input)',
                    data: messageData,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Carrier Signal (Input)',
                    data: carrierData,
                    borderColor: 'rgba(148, 163, 184, 0.5)',
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.1
                }
            ];
            drawChart('am-chart', labels, datasets);
        } else {
            // Update live sound on-the-fly
            startAMAudio(amStateAc, amStateAm, amStateFc, amStateFm);
        }

        // 2. Draw/Update Frequency Domain Spectrum Chart
        const fcUnitScale = parseFloat(document.getElementById('am-fc-unit').value);
        const fcUnitText = getUnitText('am-fc-unit');
        
        const lsbFreqText = `${((fc - fm) / fcUnitScale).toFixed(2)} ${fcUnitText}`;
        const carrierFreqText = `${(fc / fcUnitScale).toFixed(2)} ${fcUnitText}`;
        const usbFreqText = `${((fc + fm) / fcUnitScale).toFixed(2)} ${fcUnitText}`;

        const amSpectrumLabels = [
            `LSB\n(${lsbFreqText})`, 
            `Carrier\n(${carrierFreqText})`, 
            `USB\n(${usbFreqText})`
        ];
        
        // Spectral amplitudes: Carrier=Ac, Sidebands=Am/2
        const amSpectrumAmplitudes = [am_val / 2, ac_val, am_val / 2];
        
        drawSpectrumChart(
            'am-spectrum-chart', 
            amSpectrumLabels, 
            amSpectrumAmplitudes, 
            'Spectral Component (Frequency)', 
            'Amplitude (V)', 
            '#3b82f6'
        );
    }

    function animateAM() {
        if (!amIsRunning) return;

        const now = performance.now();
        const delta = (now - amLastTime) / 1000;
        amLastTime = now;

        const ac = amStateAc;
        const am = amStateAm;
        const fc = amStateFc;
        const fm = amStateFm;

        const maxT = 3 / fm;
        amTimeOffset += delta * (maxT / 4); // Shift visible window smoothly

        let visualFc = fc;
        if (fc > 40 * fm) visualFc = 20 * fm;

        const numPoints = 250;
        const modulatedData = [];
        const messageData = [];
        const carrierData = [];

        for (let i = 0; i <= numPoints; i++) {
            const t = (i / numPoints) * maxT;
            const tMod = t + amTimeOffset;
            const m_t = am * Math.sin(2 * Math.PI * fm * tMod);
            const c_t = ac * Math.sin(2 * Math.PI * visualFc * tMod);
            const v = (ac + m_t) * Math.sin(2 * Math.PI * visualFc * tMod);

            modulatedData.push(v);
            messageData.push(m_t);
            carrierData.push(c_t);
        }

        if (amChartInstance) {
            if (amChartInstance.data.labels.length !== numPoints + 1) {
                const labels = [];
                for (let i = 0; i <= numPoints; i++) labels.push(i);
                amChartInstance.data.labels = labels;
            }
            amChartInstance.data.datasets[0].data = modulatedData;
            amChartInstance.data.datasets[1].data = messageData;
            amChartInstance.data.datasets[2].data = carrierData;
            amChartInstance.update('none');
        }

        amAnimFrameId = requestAnimationFrame(animateAM);
    }

    function playAM() {
        if (!amIsRunning) {
            amIsRunning = true;
            amPlayBtn.innerHTML = '<span class="play-icon">⏸</span> Pause';
            amPlayBtn.classList.add('playing');

            startAMAudio(amStateAc, amStateAm, amStateFc, amStateFm);
            amLastTime = performance.now();
            animateAM();
        }
    }

    function pauseAM() {
        if (amIsRunning) {
            amIsRunning = false;
            amPlayBtn.innerHTML = '<span class="play-icon">▶</span> Run / Play';
            amPlayBtn.classList.remove('playing');
            stopAMAudio();
            if (amAnimFrameId) {
                cancelAnimationFrame(amAnimFrameId);
                amAnimFrameId = null;
            }
        }
    }

    amPlayBtn.addEventListener('click', () => {
        if (amIsRunning) pauseAM();
        else playAM();
    });

    amVolumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        if (amMasterGain && !amMuteState) {
            amMasterGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.01);
        }
    });

    amMuteBtn.addEventListener('click', () => {
        amMuteState = !amMuteState;
        if (amMuteState) {
            amMuteBtn.querySelector('.mute-icon').textContent = '🔇';
            amMuteBtn.classList.add('muted');
            if (amMasterGain) amMasterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01);
        } else {
            amMuteBtn.querySelector('.mute-icon').textContent = '🔊';
            amMuteBtn.classList.remove('muted');
            const vol = parseFloat(amVolumeSlider.value);
            if (amMasterGain) amMasterGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.01);
        }
    });

    amBtn.addEventListener('click', calculateAM);

    // --- FM Audio Synthesis ---
    function startFMAudio(dev, fm) {
        initAudio();
        stopFMAudio();

        const beta = dev / fm;
        let fmAudible = 3; 
        let devAudible = 150; 

        // Dynamic FM synthesizer logic:
        // Slow modulations use a sweep siren. Audible modulations use synthesised frequencies.
        if (fm >= dev || beta < 5) {
            fmAudible = 110; 
            devAudible = Math.min(320, 110 * beta);
        }

        document.getElementById('fm-audio-note').innerHTML = 
            `🎵 Audible Scale: Carrier = 400Hz | Modulator = ${fmAudible}Hz | Dev = ${devAudible.toFixed(1)}Hz`;

        fmCarrierOsc = audioCtx.createOscillator();
        fmCarrierOsc.frequency.value = 400;
        fmCarrierOsc.type = 'sine';

        fmMessageOsc = audioCtx.createOscillator();
        fmMessageOsc.frequency.value = fmAudible;
        fmMessageOsc.type = 'sine';

        fmModGain = audioCtx.createGain();
        fmModGain.gain.value = devAudible;

        fmMasterGain = audioCtx.createGain();
        const vol = parseFloat(document.getElementById('fm-volume').value);
        fmMasterGain.gain.value = fmMuteState ? 0 : vol;

        // Connections
        fmMessageOsc.connect(fmModGain);
        fmModGain.connect(fmCarrierOsc.frequency);

        fmCarrierOsc.connect(fmMasterGain);
        fmMasterGain.connect(audioCtx.destination);

        fmCarrierOsc.start();
        fmMessageOsc.start();
        fmAudioPlaying = true;
    }

    function stopFMAudio() {
        if (fmAudioPlaying) {
            try {
                if (fmCarrierOsc) {
                    fmCarrierOsc.stop();
                    fmCarrierOsc.disconnect();
                }
                if (fmMessageOsc) {
                    fmMessageOsc.stop();
                    fmMessageOsc.disconnect();
                }
                if (fmModGain) fmModGain.disconnect();
                if (fmMasterGain) fmMasterGain.disconnect();
            } catch (e) {
                console.warn("Error stopping FM audio:", e);
            }
            fmAudioPlaying = false;
        }
    }

    // --- FM Calculator & Playback Loop ---
    const fmBtn = document.getElementById('calc-fm-btn');
    const fmPlayBtn = document.getElementById('fm-play-btn');
    const fmMuteBtn = document.getElementById('fm-mute-btn');
    const fmVolumeSlider = document.getElementById('fm-volume');

    const fmDevInput = document.getElementById('fm-dev');
    const fmFmInput = document.getElementById('fm-fm');

    const resBeta = document.getElementById('fm-res-beta');
    const resBw = document.getElementById('fm-res-bw');

    function calculateFM() {
        const dev_val = parseFloat(fmDevInput.value);
        const fm_val = parseFloat(fmFmInput.value);

        if (isNaN(dev_val) || isNaN(fm_val)) {
            alert("Please fill in all FM input fields with valid numbers.");
            return;
        }

        const dev = dev_val * parseFloat(document.getElementById('fm-dev-unit').value);
        const fm = fm_val * parseFloat(document.getElementById('fm-fm-unit').value);

        if (fm === 0) {
            resBeta.textContent = "Error";
            return;
        }

        // Store validated parameters safely
        fmStateDev = dev;
        fmStateFm = fm;

        const beta = dev / fm;
        const bw = 2 * (dev + fm);

        resBeta.textContent = beta.toFixed(3);
        resBw.innerHTML = formatFreq(bw);

        // Highlight output
        [resBeta, resBw].forEach(el => {
            el.style.opacity = '0.5';
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transition = 'opacity 0.3s ease';
            }, 50);
        });

        // Enable Play Button
        fmPlayBtn.removeAttribute('disabled');
        if (!fmIsRunning) {
            document.getElementById('fm-audio-note').textContent = "▶ Press Play/Run to listen & animate signal.";
        }

        // 1. Draw/Update FM Time Domain Waveform Chart
        if (!fmIsRunning) {
            const numPoints = 1000;
            const labels = [];
            const fmData = [];
            const messageData = [];
            const carrierData = [];
            const maxT = 3 / fmStateFm;
            const visualFc = 10 * fmStateFm;

            for (let i = 0; i <= numPoints; i++) {
                const t = (i / numPoints) * maxT;
                const m_t = Math.sin(2 * Math.PI * fmStateFm * t);
                const c_t = Math.sin(2 * Math.PI * visualFc * t);
                const v = Math.sin(2 * Math.PI * visualFc * t + beta * m_t);

                labels.push(i);
                messageData.push(m_t);
                carrierData.push(c_t);
                fmData.push(v);
            }

            const datasets = [
                {
                    label: 'Modulated FM Signal',
                    data: fmData,
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Message Signal (Input)',
                    data: messageData,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.1
                },
                {
                    label: 'Carrier Signal (Input)',
                    data: carrierData,
                    borderColor: 'rgba(148, 163, 184, 0.5)',
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.1
                }
            ];
            drawChart('fm-chart', labels, datasets);
        } else {
            // Update live sound on-the-fly
            startFMAudio(fmStateDev, fmStateFm);
        }

        // 2. Draw/Update FM Frequency Domain Spectrum Chart
        const fmUnitText = getUnitText('fm-fm-unit');
        
        // Calculate sidebands using Bessel functions
        // Significant sidebands count n_max is determined by beta (modulation index)
        const nMax = Math.max(3, Math.ceil(beta) + 2);
        
        const fmSpectrumLabels = [];
        const fmSpectrumAmplitudes = [];

        // Build labels and calculate absolute sideband amplitudes: Jn(beta)
        for (let n = -nMax; n <= nMax; n++) {
            if (n === 0) {
                fmSpectrumLabels.push('fc (Carrier)');
            } else {
                const sign = n > 0 ? '+' : '-';
                fmSpectrumLabels.push(`fc ${sign} ${Math.abs(n) * fm_val} ${fmUnitText}`);
            }
            // Jn(-n) = (-1)^n * Jn(n). The absolute value |Jn| is identical for positive and negative n.
            const sidebandAmplitude = Math.abs(besselJ(Math.abs(n), beta));
            fmSpectrumAmplitudes.push(sidebandAmplitude);
        }

        drawSpectrumChart(
            'fm-spectrum-chart',
            fmSpectrumLabels,
            fmSpectrumAmplitudes,
            `Spectral Component (Offset from Carrier in ${fmUnitText})`,
            'Relative Amplitude',
            '#8b5cf6'
        );
    }

    function animateFM() {
        if (!fmIsRunning) return;

        const now = performance.now();
        const delta = (now - fmLastTime) / 1000;
        fmLastTime = now;

        const dev = fmStateDev;
        const fm = fmStateFm;

        const beta = dev / fm;
        const maxT = 3 / fm;
        fmTimeOffset += delta * (maxT / 4);

        const visualFc = 10 * fm;
        const numPoints = 250;
        const fmData = [];
        const messageData = [];
        const carrierData = [];

        for (let i = 0; i <= numPoints; i++) {
            const t = (i / numPoints) * maxT;
            const tMod = t + fmTimeOffset;
            const m_t = Math.sin(2 * Math.PI * fm * tMod);
            const c_t = Math.sin(2 * Math.PI * visualFc * tMod);
            const v = Math.sin(2 * Math.PI * visualFc * tMod + beta * m_t);

            fmData.push(v);
            messageData.push(m_t);
            carrierData.push(c_t);
        }

        if (fmChartInstance) {
            if (fmChartInstance.data.labels.length !== numPoints + 1) {
                const labels = [];
                for (let i = 0; i <= numPoints; i++) labels.push(i);
                fmChartInstance.data.labels = labels;
            }
            fmChartInstance.data.datasets[0].data = fmData;
            fmChartInstance.data.datasets[1].data = messageData;
            fmChartInstance.data.datasets[2].data = carrierData;
            fmChartInstance.update('none');
        }

        fmAnimFrameId = requestAnimationFrame(animateFM);
    }

    function playFM() {
        if (!fmIsRunning) {
            fmIsRunning = true;
            fmPlayBtn.innerHTML = '<span class="play-icon">⏸</span> Pause';
            fmPlayBtn.classList.add('playing');

            startFMAudio(fmStateDev, fmStateFm);
            fmLastTime = performance.now();
            animateFM();
        }
    }

    function pauseFM() {
        if (fmIsRunning) {
            fmIsRunning = false;
            fmPlayBtn.innerHTML = '<span class="play-icon">▶</span> Run / Play';
            fmPlayBtn.classList.remove('playing');
            stopFMAudio();
            if (fmAnimFrameId) {
                cancelAnimationFrame(fmAnimFrameId);
                fmAnimFrameId = null;
            }
        }
    }

    fmPlayBtn.addEventListener('click', () => {
        if (fmIsRunning) pauseFM();
        else playFM();
    });

    fmVolumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        if (fmMasterGain && !fmMuteState) {
            fmMasterGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.01);
        }
    });

    fmMuteBtn.addEventListener('click', () => {
        fmMuteState = !fmMuteState;
        if (fmMuteState) {
            fmMuteBtn.querySelector('.mute-icon').textContent = '🔇';
            fmMuteBtn.classList.add('muted');
            if (fmMasterGain) fmMasterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01);
        } else {
            fmMuteBtn.querySelector('.mute-icon').textContent = '🔊';
            fmMuteBtn.classList.remove('muted');
            const vol = parseFloat(fmVolumeSlider.value);
            if (fmMasterGain) fmMasterGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.01);
        }
    });

    fmBtn.addEventListener('click', calculateFM);

    // --- Enter Key Navigation Logic ---
    function setupEnterNavigation(inputs, btn) {
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    } else {
                        btn.click();
                    }
                }
            });
        });
    }

    setupEnterNavigation([amAcInput, amAmInput, amFcInput, amFmInput], amBtn);
    setupEnterNavigation([fmDevInput, fmFmInput], fmBtn);

});
