# 📡 ModulationMaster — AM & FM Signal Simulator

> An interactive, browser-based RF signal calculator and visualizer for Amplitude Modulation (AM) and Frequency Modulation (FM) — built with vanilla HTML, CSS, and JavaScript.

🔗 **Live Demo:** [https://rakesh-2211.github.io/Modulation-simulator/](https://rakesh-2211.github.io/Modulation-simulator/)

---

## ✨ Features

### AM Modulation
- Input **Carrier Amplitude (Ac)** and **Message Amplitude (Am)** with unit selectors (nV → kV)
- Input **Carrier Frequency (fc)** and **Message Frequency (fm)** with unit selectors (Hz → THz)
- Calculates:
  - **Modulation Index (m)** and **Modulation Percentage**
  - **Carrier Power (Pc)**, **Total Power (Pt)**, and **Sideband Power (Psb)** (assuming R = 1Ω)
  - **Lower Sideband (LSB)** and **Upper Sideband (USB)** frequencies
- **Time Domain** waveform visualization
- **Frequency Domain** bandwidth spectrum visualization
- 🔊 Audio playback with volume control
- ▶ Animated signal playback

### FM Modulation
- Input **Frequency Deviation (Δf)** and **Max Modulating Frequency (fm)** with unit selectors
- Calculates using **Carson's Rule**:
  - **Modulation Index (β)**
  - **Total Bandwidth** — `BW = 2 × (Δf + fm)`
- **Time Domain** waveform visualization
- **Frequency Domain** bandwidth spectrum visualization
- 🔊 Audio playback with volume control
- ▶ Animated signal playback

---

## 🖥️ Screenshots

| AM Calculator | FM Calculator |
|---|---|
| Time & Frequency domain plots for AM signals | Time & Frequency domain plots for FM signals |

---

## 🚀 Getting Started

This is a pure front-end project — no build tools, no dependencies, no server required.

### Run Locally

```bash
# Clone the repository
git clone https://github.com/rakesh-2211/Modulation-simulator.git

# Navigate into the project
cd Modulation-simulator

# Open in your browser
open index.html
# or just double-click index.html
```

That's it! No `npm install`, no build step.

---

## 🧮 Formulas Used

### AM Modulation

| Parameter | Formula |
|---|---|
| Modulation Index | `m = Am / Ac` |
| Modulation % | `m × 100` |
| Carrier Power | `Pc = Ac² / 2` (R = 1Ω) |
| Total Power | `Pt = Pc × (1 + m²/2)` |
| Sideband Power | `Psb = Pt - Pc` |
| LSB Frequency | `fc - fm` |
| USB Frequency | `fc + fm` |

### FM Modulation (Carson's Rule)

| Parameter | Formula |
|---|---|
| Modulation Index | `β = Δf / fm` |
| Bandwidth | `BW = 2 × (Δf + fm)` |

---

## 🛠️ Built With

- **HTML5** — Structure and layout
- **CSS3** — Styling and responsive design
- **Vanilla JavaScript** — All calculations, animations, and audio synthesis
- **Canvas API** — Waveform and spectrum rendering
- **Web Audio API** — Real-time audio playback

---

## 📁 Project Structure

```
Modulation-simulator/
├── index.html        # Main application file
├── style.css         # Stylesheet
└── script.js         # Calculation logic, rendering & audio
```

---

## 📖 Usage

1. **Select a tab** — Choose between AM Modulation or FM Modulation.
2. **Enter values** — Fill in the required signal parameters and select appropriate units from the dropdowns.
3. **Click Calculate** — Results are instantly computed and displayed.
4. **View waveforms** — Time domain and frequency domain plots render automatically.
5. **Play audio** — Click ▶ Run / Play to hear the modulated signal. Adjust volume with the slider.

---

## 🎯 Use Cases

- Students learning communication systems and signal theory
- RF engineers verifying quick modulation calculations
- Educators demonstrating AM/FM concepts interactively
- Anyone curious about how radio modulation works!

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 👤 Author

**Rakesh**
- GitHub: [@rakesh-2211](https://github.com/rakesh-2211)

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute it.

---

> Built with ❤️ as an educational tool for RF signal modulation.
