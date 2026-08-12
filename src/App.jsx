import { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer, FaceLandmarker } from "@mediapipe/tasks-vision";
import "./App.css";

const GESTURE_IMAGE_MAP = {
  Thumb_Up: "👍", Thumb_Down: "👎", Victory: "✌️",
  Open_Palm: "🖐️", Closed_Fist: "✊", Pointing_Up: "☝️", ILoveYou: "🤟"
};
const FACE_IMAGE_MAP = { smiling: "😄", surprised: "😲", frowning: "☹️" };
const COMBO_IMAGE_MAP = {
  "Thumb_Up+smiling": "🎉",
  "Victory+surprised": "🤩"
};

function readExpression(blendshapes) {
  const scores = {};
  for (const b of blendshapes) scores[b.categoryName] = b.score;
  const smile = (scores.mouthSmileLeft || 0) + (scores.mouthSmileRight || 0);
  const jawOpen = scores.jawOpen || 0;
  const browUp = scores.browInnerUp || 0;
  const frown = (scores.mouthFrownLeft || 0) + (scores.mouthFrownRight || 0);
  if (jawOpen > 0.5 && browUp > 0.4) return "surprised";
  if (smile > 0.6) return "smiling";
  if (frown > 0.4) return "frowning";
  return "neutral";
}

function resolveTrigger(gestureName, expression) {
  const hasHand = gestureName && gestureName !== "none";
  const hasFace = expression && expression !== "none" && expression !== "neutral";
  const comboKey = hasHand && hasFace ? `${gestureName}+${expression}` : null;
  if (comboKey && COMBO_IMAGE_MAP[comboKey]) return { key: comboKey, image: COMBO_IMAGE_MAP[comboKey] };
  if (hasHand && GESTURE_IMAGE_MAP[gestureName]) return { key: "g:" + gestureName, image: GESTURE_IMAGE_MAP[gestureName] };
  if (hasFace && FACE_IMAGE_MAP[expression]) return { key: "f:" + expression, image: FACE_IMAGE_MAP[expression] };
  return null;
}

function App() {
  const videoRef = useRef(null);
  const [gesture, setGesture] = useState("none");
  const [expression, setExpression] = useState("none");
  const [popup, setPopup] = useState("🙂");

  useEffect(() => {
    let stream, gestureRecognizer, faceLandmarker, rafId, lastKey = null;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task" },
        runningMode: "VIDEO", numHands: 2
      });
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
        outputFaceBlendshapes: true, runningMode: "VIDEO", numFaces: 1
      });

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      loop();
    }

    function loop() {
      const now = performance.now();
      const g = gestureRecognizer.recognizeForVideo(videoRef.current, now);
      const f = faceLandmarker.detectForVideo(videoRef.current, now);

      const gestureName = g.gestures[0]?.[0]?.categoryName ?? "none";
      const expr = f.faceBlendshapes[0] ? readExpression(f.faceBlendshapes[0].categories) : "none";

      setGesture(gestureName);
      setExpression(expr);

      const trigger = resolveTrigger(gestureName, expr);
      if (trigger && trigger.key !== lastKey) {
        lastKey = trigger.key;
        setPopup(trigger.image);
      }

      rafId = requestAnimationFrame(loop);
    }

    init();
    return () => {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "500px" }} />
      <p>Hand: {gesture} | Face: {expression}</p>
      <div style={{ fontSize: "4rem" }}>{popup}</div>
    </div>
  );
}

export default App;