import { useEffect, useRef, useState } from "react";
import { DrawingUtils } from "@mediapipe/tasks-vision";
import { drawDebug } from "@/lib/drawDebug";

/**
 * The framed camera view: mirrored <video> with a transparent <canvas> on top.
 *
 * Layer order (bottom -> top):
 *   1. <video>   mirrored with CSS
 *   2. <canvas>  debug drawing now; the hamster overlay will draw here later
 *   3. children  any extra absolutely-positioned UI (toasts, badges)
 *
 * The canvas's internal resolution matches the video's real pixel size, so
 * landmark coordinates (0..1) map straight to canvas pixels. CSS then scales
 * both to fit the frame.
 */
export default function CameraStage({
  videoRef,
  resultsRef,
  cameraReady,
  layers,
  message, // optional: text shown over the stage (loading / errors)
  children,
}) {
  const canvasRef = useRef(null);
  const [aspect, setAspect] = useState(16 / 9);

  // Redraw loop. Reads results from the ref, so React never re-renders per frame.
  useEffect(() => {
    if (!cameraReady) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    const du = new DrawingUtils(ctx);
    let rafId = 0;

    const tick = () => {
      if (video.videoWidth && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      drawDebug(ctx, du, resultsRef.current, layers);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => cancelAnimationFrame(rafId);
  }, [cameraReady, layers, videoRef, resultsRef]);

  return (
    <div
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border-8 border-white bg-secondary shadow-xl shadow-pink-300/40"
      style={{ aspectRatio: aspect }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        onLoadedMetadata={(e) => {
          const { videoWidth, videoHeight } = e.currentTarget;
          if (videoWidth && videoHeight) setAspect(videoWidth / videoHeight);
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {children}

      {message && (
        <div className="absolute inset-0 grid place-items-center bg-white/60 p-6 text-center text-sm font-medium text-foreground backdrop-blur-sm">
          {message}
        </div>
      )}
    </div>
  );
}