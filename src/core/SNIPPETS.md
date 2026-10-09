# Team Code Snippets & Guide: Reading & Writing State in Proteus Engine

This document provides quick copy-paste snippets for **P2 (Intelligence)**, **P3 (Control Panel)**, **P4 (Sound)**, and **P5 (Content)** to interact with the central shared state created by **P1**.

---

### 1. How to import state and functions
```javascript
import { state, updateState, onStateChange } from './state.js';
```

---

### 2. How to Read from State
You can read any property synchronously anytime:
```javascript
// Read current emotion label
const currentMood = state.affect.label; // 'calm', 'content', 'excited', 'tense', 'sad'

// Read current valence and arousal
const v = state.affect.valence; // -1.0 to 1.0
const a = state.affect.arousal; // -1.0 to 1.0

// Read UI mode
const activeMode = state.ui.mode; // 'Mirror', 'Proteus', 'Mask'
```

---

### 3. How to Write to State
Always use `updateState(path, value)` so other teammates' components update automatically!

#### For P2 (Intelligence / Emotion Engine):
```javascript
// Update real-time valence & arousal from facial landmark calculations
updateState('affect.valence', calculatedValence);
updateState('affect.arousal', calculatedArousal);
updateState('affect.label', 'excited');

// Update blendshapes for avatar face animation
updateState('blendshapes.mouthSmileLeft', 0.85);
updateState('blendshapes.mouthSmileRight', 0.82);
updateState('blendshapes.jawOpen', 0.15);
updateState('blendshapes.eyeBlinkLeft', 0.0);

// Update head pose & gaze
updateState('gaze.yaw', headYawAngle);
updateState('gaze.pitch', headPitchAngle);
```

#### For P3 (Control Panel):
```javascript
// User changes mode buttons
updateState('ui.mode', 'Proteus');

// User changes target emotion dropdown
updateState('ui.targetMood', 'confident');

// User moves Proteus intensity slider (0.0 to 1.0)
updateState('ui.proteusIntensity', parseFloat(slider.value));

// User pauses camera tracking (Privacy)
updateState('ui.trackingPaused', true);
```

#### For P4 (Sound System):
```javascript
// Reacting to mood label changes to crossfade audio
onStateChange('affect.label', (newMood, oldMood) => {
  console.log(`Emotion shifted from ${oldMood} to ${newMood}`);
  playMood(newMood);
});

// Reacting to arousal to modulate volume or filter
onStateChange('affect.arousal', (arousal) => {
  setAudioExcitement(arousal);
});
```

---

### 4. How to React When a Value Changes (Subscribers)
```javascript
// Listen to a specific path
const unsubscribe = onStateChange('scene.auraColor', (newColor) => {
  console.log('Aura color updated to:', newColor);
});

// Listen to all state changes (Wildcard)
onStateChange('*', (path, value) => {
  // console.log(`State [${path}] changed to:`, value);
});

// Cleanup when unmounting/stopping
// unsubscribe();
```

---

### 5. Browser Console Testing
You can inspect or test everything directly in DevTools Console:
```javascript
window.__PROTEUS_STATE__.affect.valence = 0.9;
window.__updateState__('affect.label', 'excited');
```
