# hampster-pose <3

Make a face (and maybe a hand pose), and a matching hamster meme pops up on top of your webcam video. It runs entirely in the browser using [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/guide) for face and hand tracking.

> **Status:** early development. The camera, face mesh, hand tracking, and live expression scores work. The hamster overlay and expression matching are next (see [Roadmap](#roadmap)).

<!-- will add a demo GIF here once the overlay works: ![demo](docs/demo.gif) -->

## How it works

```
webcam frame
  → MediaPipe Face Landmarker   478 face points + 52 expression scores (blendshapes)
  → MediaPipe Hand Landmarker   21 points per hand
  → features                    one fixed-length list of numbers      (planned)
  → matcher                     which hamster, if any                 (planned)
  → overlay                     transparent PNG scaled, rotated and
                                placed on your face                   (planned)
```

Hamsters are meant to appear **on purpose, not on a blank face**. Each one is triggered by a deliberate expression plus a hand position (tongue out, kissy lips with a hand by the eye, hands squishing your cheeks), and the matcher requires the pose to be held for a moment before showing anything.

## Quick start

**Requirements:** Node 20+ and a webcam. Use `localhost` or HTTPS, since browsers only allow camera access on secure origins.

```bash
git clone https://github.com/nailambb/hampster-pose.git
cd hampster-pose
npm install
```

### One-time model setup

The tracking models and MediaPipe's WebAssembly runtime are served from `public/`:

```bash
mkdir -p public/models public/wasm
cp -r node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/

curl -L -o public/models/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
curl -L -o public/models/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

Copying the wasm from `node_modules` guarantees it matches the installed `@mediapipe/tasks-vision` version. To redo the copy automatically after every install, add this to the `scripts` in `package.json`:

```json
"postinstall": "mkdir -p public/wasm && cp -r node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/"
```

### Run it

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) and allow camera access.

## What you'll see right now

- Your webcam in a mirrored, framed view
- The face mesh, face outline, hand skeletons, and labeled key points (each toggleable)
- A panel with fps, how many face points and hands are detected, and live bars for the expression scores most relevant to the hamsters (`jawOpen`, `tongueOut`, `mouthPucker`, `cheekPuff`, smile, blink, brows)

Use the bars to see which expressions are easy to tell apart before deciding which hamsters to support.

## Tech stack

- [React](https://react.dev) + [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) for the pink, cutesy interface
- [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision) for Face Landmarker and Hand Landmarker
- Python (`ml/`) for building the dataset and training the classifier (planned)

## Project structure

```
hampster-pose/
  public/
    hamsters/              transparent PNGs, one per hamster (planned)
    models/                MediaPipe .task files (+ classifier.json, planned)
    wasm/                  MediaPipe runtime, copied from node_modules
  src/
    components/
      ui/                  shadcn components (card, badge, switch)
      CameraStage.jsx      mirrored video + canvas drawing layer
      DebugPanel.jsx       fps, detection status, layer toggles, expression bars
      HamsterOverlay.jsx   draws the active hamster on the face       (planned)
      CollectPoses.jsx     records labeled samples for training       (planned)
    hooks/
      useCamera.js         webcam stream into a <video>
      useFaceHandTracker.js  runs both landmarkers every frame
      useHamsterMatcher.js   picks a hamster with hold time/cooldown   (planned)
    lib/
      drawDebug.js         draws mesh, hands, and key points on the canvas
      features.js          landmarks → fixed-length feature vector     (planned)
      classifier.js        runs the trained model in the browser       (planned)
      overlay.js           anchor math: scale, rotate, position        (planned)
      utils.js             shadcn helper
    data/
      hamsters.json        registry of hamsters and their anchor points (planned)
    App.jsx  main.jsx  index.css
  ml/                      Python data + training pipeline (see ml/README.md)
```

### Design notes

- **Results live in a ref, not React state.** Detection runs about 30 times per second. `useFaceHandTracker` writes to `resultsRef`, and the canvas and debug panel read it on their own schedule, so React doesn't re-render every frame.
- **Mirroring happens at draw time.** The `<video>` is flipped with CSS, but the canvas is not. Drawing code flips x itself (`1 - x`), so text and hamster images are never mirrored. Features must always be computed from the raw, unmirrored landmarks.
- **GPU first, CPU fallback.** Both landmarkers try the GPU delegate and fall back to CPU if the browser can't.

## Adding a new hamster (planned workflow)

1. Save a transparent PNG as `public/hamsters/<id>.png`. Roughly 1000 px on the long side is plenty.
2. Add an entry to `src/data/hamsters.json` with the image path and anchor points (where its eyes and nose are in the PNG), plus a size and position offset.
3. Record several people doing that expression and pose, plus more "none" clips of normal faces and near-misses (yawning, scratching your nose, sipping a drink).
4. Extract features, add the new label, and retrain with the scripts in `ml/`.
5. Check the confusion matrix and the false-triggers-per-minute number on idle video, then ship the new `classifier.json`.

Retraining is one small model over all labels, so adding a hamster never means training a separate model.

## Roadmap

- [x] Webcam capture and mirrored stage
- [x] Face mesh, hand tracking, and key-point visualization
- [x] Live expression score panel
- [ ] `features.js`: shared feature extraction
- [ ] Single hamster attached to the face (`overlay.js`, `HamsterOverlay.jsx`)
- [ ] Rule-based triggers for the first three hamsters, with hold time and cooldown
- [ ] Calibration step (capture your resting face and subtract it as a baseline)
- [ ] In-browser data collection (`CollectPoses.jsx`)
- [ ] Training pipeline and `classifier.js`
- [ ] Pink, cutesy polish: rounded font, pop-in animation, sticker outline

## Troubleshooting

| Problem | What to check |
|---|---|
| Page shows old UI or the wrong component | `src/App.jsx` should import `useCamera` and `useFaceHandTracker`. Restart `npm run dev` after big changes. |
| "Failed to resolve import `@/...`" | The `@` alias must exist in both `vite.config.js` and `jsconfig.json`. Restart the dev server after editing. |
| "Couldn't load the tracking models" | Confirm `public/models/*.task` and `public/wasm/` exist, and look for 404s in the browser Network tab. |
| Camera doesn't start | Allow camera permission, close other apps using the camera, and use `localhost` or HTTPS. |
| Low fps | The CPU fallback is slower than GPU. Close other heavy tabs or try Chrome. |
| shadcn init says it can't find path aliases | Add a `jsconfig.json` (or `tsconfig.json`) with `"paths": { "@/*": ["./src/*"] }`, then re-run init. |

## Notes on the hamster art

The hamster images are meme-style artwork. Before publishing the app publicly, make sure you have the right to use them (or replace them with your own art), and remove any watermarks from the source images.

## Machine learning

The data and training side lives in [`ml/`](./ml/README.md): turning recorded videos into a landmark dataset, and training and comparing gesture classifiers on it.