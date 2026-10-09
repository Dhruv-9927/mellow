# P2 Intelligence & Emotion Engine Workspace

Welcome P2! Work **strictly inside `src/p2-intelligence/`** so your git commits and pushes will never conflict with other teammates.

## How your code connects to the rest of the team:
You only need to import the core state:
```javascript
import { state, updateState, onStateChange } from '../core/state.js';
```

## Your Deliverables Checklist:
1. `camera.js` / MediaPipe FaceLandmarker initialization (blendshapes, head pose, iris).
2. Write outputs to:
   - `updateState('blendshapes', blendshapeValues)`
   - `updateState('gaze', gazeValues)`
3. 3-second neutral face calibration.
4. Valence/Arousal computation & smoothed EMA -> `updateState('affect', { valence, arousal, label })`.
5. Rule-based director (fallback) + local LLM director (WebLLM/Ollama).
