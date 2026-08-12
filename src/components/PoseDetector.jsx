// PoseDetector.jsx
import { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer, FaceLandmarker } from "@mediapipe/tasks-vision";

export default function PoseDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [gesture, setGesture] = useState("none");
  const [expression, setExpression] = useState("none");

  useEffect(() => {
    let gestureRecognizer, faceLandmarker, rafId;
    let stream;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task" },
        runningMode: "VIDEO"
      });
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO"
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

      setGesture(g.gestures[0]?.[0]?.categoryName ?? "none");
      // (expression scoring logic from before goes here)

      rafId = requestAnimationFrame(loop);
    }

    init();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%" }} />
      <canvas ref={canvasRef} />
      <p>Gesture: {gesture} | Expression: {expression}</p>
    </div>
  );
}