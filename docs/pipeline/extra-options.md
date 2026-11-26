# Extra Options (Studio & Audio Settings)

This document outlines the planned execution for the **3-dot menu** studio options in the recording / multitrack screen: Audio Format Export, Time Shift (Latency Compensation), and Audio Safe Mode.

---

## 1. Context & Motivation

In mobile vocal recording (similar to Voloco), artists face common hardware and workflow challenges:
- They need studio-quality exports for external desktop DAWs, as well as lightweight formats for quick sharing.
- Bluetooth and Android audio paths introduce latency, making vocals sound delayed or off-beat relative to the backing track.
- Lower-end Android devices or heavy CPU tasks can cause buffer underruns (glitches, clicks, distortion).

To solve these, we will provide a **3-dot / Settings menu** right in the recording screen.

---

## 2. Feature Breakdown

### A. Export Options (WAV & Other Formats)

- **What it does:**
  - Gives the user a choice when exporting their project or stems instead of fixing it to a single type:
    - **WAV (Lossless 16/24-bit 48kHz):** Uncompressed, professional studio grade for music production and desktop DAWs.
    - **M4A / AAC / MP3 (Compressed):** Lightweight files (~3–5 MB) ideal for sharing via WhatsApp, messaging, or social platforms.
- **Execution Plan:**
  - We already use WAV internally (`mix.wav`, `stem.wav`, `source.wav`).
  - When user taps **Export**, prompt with an export sheet: "Export as WAV (Studio Quality)" or "Export as MP3/M4A (Compressed)".
  - Use our existing `@wokcito/ffmpeg-kit-react-native` service to convert the WAV bounce into an AAC/M4A/MP3 when requested, then trigger `expo-sharing`.

---

### B. Time Shift (Latency Compensation)

- **What it does:**
  - Solves the #1 issue in mobile audio: **playback-to-recording delay**.
  - Bluetooth headphones (AirPods, etc.) have 150ms–300ms delay. Even wired connections or Android drivers can lag by 20ms–60ms.
  - Allows the artist to adjust a slider ranging from **-1000ms to +100ms** to shift their vocal timing relative to the backing track.
- **Execution Plan:**
  - **UI:** A slider with presets for "Wired (default ~0ms to -30ms)" and "Bluetooth (default ~ -180ms to -250ms)" plus fine adjustment.
  - **Storage:** Persisted in project settings and local user preferences (`useAudioSessionStore` / `AsyncStorage`).
  - **Audio Engine:**
    - When rendering layers together or playing back multitrack lanes, apply the configured offset (adjust layer `startOffsetMs` or FFmpeg audio delay filter `adelay` / trim) so vocals sit locked on the beat.

---

### C. Audio Safe Mode

- **What it does:**
  - A toggle switch: *"Turn on if you are experiencing glitchy or distorted audio."*
  - Relaxes real-time CPU demands and increases the audio buffer size (e.g., from 128/256 samples to 512/1024 samples) to prevent buffer underruns (robotic crackles, pops, and stuttering).
- **Execution Plan:**
  - **UI:** Toggle switch inside the 3-dot audio settings modal.
  - **Native Bridge:**
    - Pass a `safeMode: boolean` flag to our native modules (`superpowered-audio` and `input-monitor`).
    - When enabled, initialize audio session with a larger buffer frame size and conservative DSP processing to ensure smooth recording across all Android device tiers.

---

## 3. UI Placement & Flow

1. **Entry Point:** 3-dot icon button (`MoreVertical`) in the top bar of the recording / multitrack editor.
2. **Settings Sheet:**
   - **Project Audio:**
     - Time Shift Slider (`-1000ms` to `+100ms`) with real-time test preview.
   - **Performance:**
     - Safe Mode Toggle (Switch on/off).
   - **Actions:**
     - Export Audio (Choice of WAV vs. M4A/MP3).
