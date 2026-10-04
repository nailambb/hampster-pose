import { useEffect, useRef, useState } from "react";

/**
 * Opens the webcam and attaches it to a <video> element.
 * Usage: const { videoRef, ready, error } = useCamera();
 *        <video ref={videoRef} playsInline muted />
 *
 * The <video> element must be rendered on first render (don't conditionally
 * mount it), because the stream is attached as soon as the camera resolves.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        // React StrictMode mounts effects twice in dev; if we were already
        // cleaned up, release the camera immediately.
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setReady(true);
      } catch (err) {
        // play() rejects with AbortError if the stream is swapped mid-load
        if (err?.name === "AbortError") return;
        if (!cancelled) setError(err);
      }
    }

    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, ready, error };
}

/** Turns a getUserMedia error into something a person can act on. */
export function describeCameraError(error) {
  if (!error) return null;
  switch (error.name) {
    case "NotAllowedError":
      return "Camera access was blocked. Allow it in your browser's address bar, then reload.";
    case "NotFoundError":
      return "No camera found. Plug one in or check your system settings.";
    case "NotReadableError":
      return "Your camera is in use by another app. Close it and reload.";
    default:
      return `Couldn't start the camera (${error.name || "unknown error"}).`;
  }
}