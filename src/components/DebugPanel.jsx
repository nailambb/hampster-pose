import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// the blendshapes most relevant to the hamster expressions so far...
// the full list of 52: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
const WATCH = [
  "jawOpen",
  "tongueOut",
  "mouthPucker",
  "mouthFunnel",
  "cheekPuff",
  "mouthSmileLeft",
  "mouthSmileRight",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "browInnerUp",
];

const LAYER_LABELS = [
  ["mesh", "Face mesh"],
  ["contours", "Face outline"],
  ["points", "Key points"],
  ["hands", "Hands"],
];

const EMPTY = { fps: 0, faceFound: false, landmarkCount: 0, hands: 0, scores: {} };

export default function DebugPanel({ resultsRef, status, layers, onLayersChange }) {
  // Snapshot the live results ~10x/second. Reading every frame would make
  // the numbers unreadable and re-render far more than needed.
  const [snap, setSnap] = useState(EMPTY);

  useEffect(() => {
    const id = setInterval(() => {
      const r = resultsRef.current;
      const categories = r.face?.faceBlendshapes?.[0]?.categories ?? [];
      const scores = {};
      for (const c of categories) scores[c.categoryName] = c.score;

      setSnap({
        fps: r.fps,
        faceFound: Boolean(r.face?.faceLandmarks?.length),
        landmarkCount: r.face?.faceLandmarks?.[0]?.length ?? 0,
        hands: r.hands?.landmarks?.length ?? 0,
        scores,
      });
    }, 100);
    return () => clearInterval(id);
  }, [resultsRef]);

  const statusLabel =
    status === "running" ? "Tracking" : status === "error" ? "Model error" : "Loading models";

  return (
    <Card className="w-full rounded-[1.5rem] border-white bg-white/80 shadow-lg shadow-pink-200/50">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">What the camera sees</CardTitle>
          <Badge variant={status === "error" ? "destructive" : "secondary"}>{statusLabel}</Badge>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="fps" value={Math.round(snap.fps)} />
          <Stat label="face points" value={snap.landmarkCount} />
          <Stat label="hands" value={snap.hands} />
        </dl>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Show on video</h3>
          {LAYER_LABELS.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm">
              {label}
              <Switch
                checked={layers[key]}
                onCheckedChange={(on) => onLayersChange({ ...layers, [key]: on })}
              />
            </label>
          ))}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Expression scores</h3>
          {!snap.faceFound && (
            <p className="text-sm text-muted-foreground">No face yet. Look at the camera.</p>
          )}
          {snap.faceFound &&
            WATCH.map((name) => (
              <Bar key={name} name={name} score={snap.scores[name] ?? 0} />
            ))}
          {snap.faceFound && (
            <p className="pt-1 text-xs text-muted-foreground">
              Each score runs 0 to 1. Make a face and watch which bars jump.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary px-2 py-2">
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function Bar({ name, score }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{name}</span>
        <span className="tabular-nums text-muted-foreground">{score.toFixed(2)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-100"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </div>
    </div>
  );
}