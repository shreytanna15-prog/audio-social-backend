# Lyrics & Beats Pipeline

This document outlines the planned execution for **Pre-existing Copyright-Free Beats** and the **Artist-Uploaded Synced Lyrics** feature.

---

## 1. Feature 1: Copyright-Free Beats Catalog

### What it is
A curated in-app library of royalty-free / copyright-free backing tracks (Hip-Hop, Trap, Pop, R&B, Lo-Fi, Acoustic) that singers and artists can select, play, and sing over without worrying about copyright strikes.

### Execution Plan

1. **Beat Metadata & Storage:**
   - Hosted on our cloud object storage (Cloudflare R2 / Supabase Storage).
   - Each beat stores essential musical metadata:
     - `title`, `genre`, `audioUrl`, `coverUrl`, `durationSec`
     - **`key`** (e.g., "C", "F#") and **`scale`** (e.g., "minor", "major")
     - **`bpm`** (Tempo, e.g., 120)
2. **Backend API (`audio-social-backend`):**
   - Prisma model `Beat` (or catalog items) with a `GET /api/beats?genre=...` endpoint.
3. **Mobile App Studio Flow (`audio-social-app`):**
   - In the recording/multitrack screen, an **"Add Beat"** / **"Browse Beats"** button alongside the existing device file picker.
   - The artist can preview beats.
   - Tapping "Use Beat" downloads the file locally via `expo-file-system`, transcodes it to 48kHz WAV via our existing `beat-import.service`, and automatically pre-fills the project's **Key, Scale, and BPM**!

---

## 2. Feature 2: Artist-Uploaded & Synced Lyrics

### What it is
Instead of relying on fragile 3rd-party APIs or automated transcription that often mishears singing and autotune, **artists add their own lyrics directly**, and sync them easily to the song.

### Why this approach?
- **$0 Cost Forever:** No expensive monthly API licenses or third-party service limits.
- **100% Accuracy:** The artist knows their exact lyrics, slang, and artistic phrasing.
- **Familiar UX:** Uses the exact same "Tap-to-Sync" pattern popularised by Musixmatch, Instagram Stories, and TikTok.

---

### Step-by-Step Execution Plan

#### Step 1: Artist Enters Lyrics (Publish / Edit Track)
- The artist opens the "Lyrics" section in the Publish screen or Studio.
- They paste or type their lyrics into a simple multiline text field.
- The app automatically splits the text by line breaks into an array of clean lines:
  ```json
  [
    "I was running through the dark",
    "Looking for a spark",
    "Now we're flying high",
    "Underneath the sky"
  ]
  ```

#### Step 2: In-App "Tap-to-Sync" Tool
- The artist taps **"Sync Lyrics"**.
- The song starts playing inside a dedicated sync screen.
- A prominent button is displayed: **"Tap for Next Line"** (or they tap the line itself).
- As the music plays and the singer hears each line start:
  - They tap the button.
  - The app stamps the exact millisecond (`sound.currentTime`) to that line.
  - The screen highlights the next line automatically.
- Once finished, the artist can test playback or re-tap any line to adjust the timing.

#### Step 3: Data Model & Storage
The synced lyrics are saved as a lightweight JSON structure in the database on the `Track`:
```json
[
  { "text": "I was running through the dark", "timeMs": 3200 },
  { "text": "Looking for a spark", "timeMs": 7450 },
  { "text": "Now we're flying high", "timeMs": 11800 },
  { "text": "Underneath the sky", "timeMs": 15600 }
]
```

- **Prisma Schema (`audio-social-backend`):**
  - Add `lyricsText String?` (plain text fallback)
  - Add `lyricsSynced Json?` (timestamped line array)
  - Update track publish/update validators and DTOs.

#### Step 4: Social Player Experience (Listener View)
- When a listener plays the track on the social player:
  - If synced lyrics exist, a **"Lyrics"** sheet or widget can be expanded.
  - As the song plays, the player matches `currentTimeMs` to the lines.
  - The active line lights up with smooth auto-scrolling, delivering a high-quality Spotify-like experience at zero external cost.
