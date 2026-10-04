import { FaceLandmarker, HandLandmarker } from "@mediapipe/tasks-vision";

/**
 * Landmark indices worth knowing for the hamster overlay.
 * The face mesh has 478 points; these are the handful you'll use for
 * positioning, scaling, rotating, and "is a hand near the cheek?" checks.
 */
export const KEY_POINTS = [
  { idx: 10, label: "10 forehead" },
  { idx: 1, label: "1 nose" },
  { idx: 152, label: "152 chin" },
  { idx: 33, label: "33 eye" },
  { idx: 263, label: "263 eye" },
  { idx: 234, label: "234 cheek" },
  { idx: 454, label: "454 cheek" },
  { idx: 13, label: "13 lip" },
  { idx: 14, label: "14 lip" },
];

const PINK = "#ff8fb8";
const SOFT_WHITE = "rgba(255, 255, 255, 0.55)";

/**
 * Draws tracking results onto a 2D canvas that is the same size as the video.
 *
 * MIRRORING: the <video> is flipped with CSS so it feels like a mirror, but the
 * canvas is NOT flipped. So we flip x ourselves (x -> 1 - x) when drawing.
 * Doing it this way means text and, later, the hamster image won't be
 * mirrored.
 *
 * @param ctx      CanvasRenderingContext2D
 * @param du       DrawingUtils instance bound to ctx
 * @param results  resultsRef.current from useFaceHandTracker
 * @param layers   { mesh, contours, points, hands } booleans
 */
export function drawDebug(ctx, du, results, layers) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);

  const faceLm = results.face?.faceLandmarks?.[0];
  const handsLm = results.hands?.landmarks ?? [];

  // --- Drawn with DrawingUtils under a horizontal flip ---------------------
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  if (faceLm) {
    if (layers.mesh) {
      du.drawConnectors(faceLm, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: "rgba(255, 255, 255, 0.35)",
        lineWidth: 0.6,
      });
    }
    if (layers.contours) {
      du.drawConnectors(faceLm, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
        color: PINK,
        lineWidth: 2,
      });
    }
  }

  if (layers.hands) {
    for (const hand of handsLm) {
      du.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, {
        color: SOFT_WHITE,
        lineWidth: 3,
      });
      du.drawLandmarks(hand, {
        color: PINK,
        fillColor: "#ffffff",
        lineWidth: 2,
        radius: 4,
      });
    }
  }

  ctx.restore();

  // --- Labelled key points, drawn un-flipped so text reads correctly -------
  if (faceLm && layers.points) {
    ctx.font = `600 ${Math.max(12, Math.round(h * 0.022))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;

    for (const { idx, label } of KEY_POINTS) {
      const p = faceLm[idx];
      const x = (1 - p.x) * w;
      const y = p.y * h;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = PINK;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(120, 40, 80, 0.75)";
      ctx.strokeText(label, x + 9, y - 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 9, y - 7);
    }
  }
}