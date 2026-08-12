import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export default function CollectPoses() {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const [label, setLabel] = useState("rock_on");
  const [count, setCount] = useState(0);
  const dataRef = useRef([]);

  useEffect(() => {
    let stream;
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" },
        runningMode: "VIDEO", numHands: 1
      });
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    init();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  function capture() {
    const result = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
    if (result.landmarks.length === 0) return alert("No hand detected");
    const flat = result.landmarks[0].flatMap((p) => [p.x, p.y, p.z]);
    dataRef.current.push({ label, features: flat });
    setCount(dataRef.current.length);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(dataRef.current)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hand_pose_dataset.json";
    a.click();
  }

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "500px" }} />
      <input value={label} onChange={(e) => setLabel(e.target.value)} />
      <button onClick={capture}>Capture sample ({count})</button>
      <button onClick={exportData}>Export dataset</button>
    </div>
  );
}