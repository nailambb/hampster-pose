import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

// Files are served from /public. BASE_URL keeps this working if you deploy
// under a subpath (e.g. GitHub Pages).
const BASE = import.meta.env.BASE_URL;
const WASM_PATH = `${BASE}wasm`;
const FACE_MODEL = `${BASE}models/face_landmarker.task`;
const HAND_MODEL = `${BASE}models/hand_landmarker.task`;

/** Try the GPU delegate first, fall back to CPU if the browser can't. */
async function createLandmarker(Landmarker, fileset, modelAssetPath, options) {
  const make = (delegate) =>
    Landmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: "VIDEO",
      ...options,
    });
  try {
    return await make("GPU");
  } catch (err) {
    console.warn("GPU delegate failed, falling back to CPU:", err);
    return await make("CPU");
  }
}

/**
 * Runs Face Landmarker (with blendshapes) and Hand Landmarker on every new
 * video frame.
 *
 * Results go into a REF, not state. Detection runs ~30x per second and we
 * don't want React re-rendering that often. Components that draw (canvas) or
 * display numbers (DebugPanel) read resultsRef.current on their own schedule.
 *
 * resultsRef.current = {
 *   face:  FaceLandmarkerResult | null   // .faceLandmarks[0] = 478 points, .faceBlendshapes[0].categories = 52 scores
 *   hands: HandLandmarkerResult | null   // .landmarks = one array of 21 points per hand
 *   fps:   number
 * }
 */
export function useFaceHandTracker(videoRef, cameraReady) {
  const resultsRef = useRef({ face: null, hands: null, fps: 0 });
  const [status, setStatus] = useState("loading"); // "loading" | "running" | "error"
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cameraReady) return;

    let cancelled = false;
    let rafId = 0;
    let face = null;
    let hands = null;

    let lastVideoTime = -1;
    let lastTick = performance.now();
    let fps = 0;

    function loop() {
      const video = videoRef.current;

      // Only run detection when the video has a NEW frame.
      if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        // MediaPipe needs strictly increasing timestamps in VIDEO mode.
        const now = performance.now();
        const faceResult = face.detectForVideo(video, now);
        const handResult = hands.detectForVideo(video, now);

        const dt = Math.max(now - lastTick, 1);
        lastTick = now;
        fps = fps * 0.9 + (1000 / dt) * 0.1; // smoothed

        resultsRef.current = { face: faceResult, hands: handResult, fps };
      }

      rafId = requestAnimationFrame(loop);
    }

    async function init() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
        const [f, h] = await Promise.all([
          createLandmarker(FaceLandmarker, fileset, FACE_MODEL, {
            outputFaceBlendshapes: true,
            numFaces: 1,
          }),
          createLandmarker(HandLandmarker, fileset, HAND_MODEL, {
            numHands: 2,
          }),
        ]);

        if (cancelled) {
          f.close();
          h.close();
          return;
        }

        face = f;
        hands = h;
        setStatus("running");
        loop();
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err);
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      face?.close();
      hands?.close();
    };
  }, [cameraReady, videoRef]);

  return { resultsRef, status, error };
}