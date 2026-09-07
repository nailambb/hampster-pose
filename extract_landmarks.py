"""
extract_landmarks.py

Turns raw subject videos into a versioned landmark CSV dataset.

Expected input layout:
    ml/data/raw_videos/<subject_id>_<label>.mp4
    e.g. subject01_thumbs_up.mp4, subject02_victory.mp4

Usage:
    python extract_landmarks.py --input_dir data/raw_videos --output data/landmarks/train.csv --sample_every 5

Each output row = one sampled frame:
    subject_id, label, frame_num, hand_x0, hand_y0, hand_z0, ..., hand_x20, hand_y20, hand_z20
(21 hand landmarks -> 63 coordinate columns. Extend similarly if you add face landmarks.)
"""

import argparse
import csv
import os
import re
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode

HAND_LANDMARK_COUNT = 21

# Same model family as the JS app's HandLandmarker (src/components/CollectPoses.jsx).
# Download once: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
DEFAULT_MODEL_PATH = "hand_landmarker.task"


def parse_subject_label(filename: str):
    """subject01_thumbs_up.mp4 -> ('subject01', 'thumbs_up')"""
    stem = Path(filename).stem
    match = re.match(r"(?P<subject>[^_]+)_(?P<label>.+)", stem)
    if not match:
        raise ValueError(
            f"Filename '{filename}' doesn't match <subject_id>_<label> pattern"
        )
    return match.group("subject"), match.group("label")


def extract_from_video(video_path: Path, subject_id: str, label: str, sample_every: int, min_detection_confidence: float):
    """Yields one row dict per sampled frame that has a detected hand."""
    cap = cv2.VideoCapture(str(video_path))
    frame_num = 0

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=min_detection_confidence,
    ) as hands:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            if frame_num % sample_every == 0:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = hands.process(rgb)

                if result.multi_hand_landmarks:
                    landmarks = result.multi_hand_landmarks[0].landmark
                    row = {"subject_id": subject_id, "label": label, "frame_num": frame_num}
                    for i, lm in enumerate(landmarks):
                        row[f"x{i}"] = lm.x
                        row[f"y{i}"] = lm.y
                        row[f"z{i}"] = lm.z
                    yield row
                # frames with no detected hand are silently skipped (logged via count below)

            frame_num += 1

    cap.release()


def build_fieldnames():
    fields = ["subject_id", "label", "frame_num"]
    for i in range(HAND_LANDMARK_COUNT):
        fields += [f"x{i}", f"y{i}", f"z{i}"]
    return fields


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input_dir", type=str, default="data/raw_videos", help="Folder of <subject>_<label>.mp4 files")
    parser.add_argument("--output", type=str, default="data/landmarks/train.csv", help="Output CSV path")
    parser.add_argument("--sample_every", type=int, default=5, help="Keep 1 out of every N frames (avoids near-duplicate rows)")
    parser.add_argument("--min_detection_confidence", type=float, default=0.6)
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    video_files = sorted([f for f in input_dir.glob("*.mp4")])
    if not video_files:
        print(f"No .mp4 files found in {input_dir}")
        return

    total_rows = 0
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=build_fieldnames())
        writer.writeheader()

        for video_path in video_files:
            subject_id, label = parse_subject_label(video_path.name)
            print(f"Processing {video_path.name}  (subject={subject_id}, label={label})...")

            rows_written = 0
            for row in extract_from_video(
                video_path, subject_id, label, args.sample_every, args.min_detection_confidence
            ):
                writer.writerow(row)
                rows_written += 1

            print(f"  -> {rows_written} labeled frames")
            total_rows += rows_written

    print(f"\nDone. Wrote {total_rows} rows to {output_path}")


if __name__ == "__main__":
    main()