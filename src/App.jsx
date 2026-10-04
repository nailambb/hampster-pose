import { useState } from "react";
import { useCamera, describeCameraError } from "@/hooks/useCamera";
import { useFaceHandTracker } from "@/hooks/useFaceHandTracker";
import CameraStage from "@/components/CameraStage";
import DebugPanel from "@/components/DebugPanel";

export default function App() {
  const { videoRef, ready, error: cameraError } = useCamera();
  const { resultsRef, status, error: trackerError } = useFaceHandTracker(videoRef, ready);

  const [layers, setLayers] = useState({
    mesh: true,
    contours: true,
    points: true,
    hands: true,
  });

  let message = null;
  if (cameraError) message = describeCameraError(cameraError);
  else if (!ready) message = "Starting your camera…";
  else if (trackerError)
    message =
      "Couldn't load the tracking models. Check that public/models and public/wasm exist (see README).";
  else if (status === "loading") message = "Loading tracking models…";

  return (
    <main className="min-h-screen bg-linear-to-br from-pink-50 via-rose-50 to-orange-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground">hampster-pose</h1>
          <p className="text-sm text-muted-foreground">
            first working on mesh and hand tracking with mediapipe and react
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <CameraStage
            videoRef={videoRef}
            resultsRef={resultsRef}
            cameraReady={ready}
            layers={layers}
            message={message}
          />
          <DebugPanel
            resultsRef={resultsRef}
            status={trackerError ? "error" : status}
            layers={layers}
            onLayersChange={setLayers}
          />
        </div>
      </div>
    </main>
  );
}