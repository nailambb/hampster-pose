# hampster-pose / ml

Python side of the project: turns recorded subject videos into a versioned landmark dataset, and (soon) trains/compares gesture classifiers on it.

## Folder structure

```
ml/
  data/
    raw_videos/          # gitignored — never committed, just source material
      subject01_thumbs_up.mp4
      subject01_victory.mp4
      subject02_thumbs_up.mp4
    landmarks/            # committed — small, versioned CSVs, the real dataset
      train.csv
      val.csv
      test.csv
  extract_landmarks.py    # raw_videos/*.mp4 -> landmarks/*.csv
  train.py                # (next) trains a classifier on landmarks/train.csv
  compare_models.py       # (next) trains + evaluates multiple model types, logs results
  requirements.txt
  README.md
```

## Why two capture paths (live in-browser + offline Python)?

They serve different jobs — this isn't redundant, it's two tools for two
different phases:

- **Live capture (`CollectPoses.jsx`, in the app)**:
fast iteration while you're deciding what gestures even work well — snap a landmark, see if it looks right, adjust. This is good for quick feedback loop. Bad for building a real dataset: it's manual per-click, single-frame, and doesn't scale to multiple subjects sitting down for a session.
- **Offline extraction (`extract_landmarks.py`)**: subjects just record a short video doing each gesture naturally (no clicking a "capture" button mid-pose), and extraction happens after the fact, in bulk, from all videos at once.

**Why not skip live capture and only do offline extraction?** Because the
live tool isn't for dataset-building at all — it's for verifying your
*detection pipeline itself* before you ask anyone else to record a video for
you. You want to know "does the recognizer reliably see my hand at this
distance/lighting" in seconds, not after processing a 2-minute video and
finding out none of it registered.

**Why not skip offline extraction and only do live capture?** Because it doesn't scale past you. Getting 5 subjects to each sit and manually button-click 30 samples per gesture is a lot of coordination friction and produces inconsistent framing per click. Handing someone a phone and saying "do this hand sign for 15 seconds" is much easier to ask of a friend, and one script processes all the resulting videos identically and reproducibly — re-run it with different `--sample_every` or confidence settings without re-recording anything.

## Usage

```bash
pip install -r requirements.txt

# put subject videos in data/raw_videos/ following <subject_id>_<label>.mp4
python extract_landmarks.py \
    --input_dir data/raw_videos \
    --output data/landmarks/train.csv \
    --sample_every 5
```

`--sample_every 5` keeps 1 out of every 5 frames — consecutive video frames
are nearly identical, so this avoids flooding the dataset with near-duplicate
rows while still capturing natural variation across the gesture.

## Dataset splitting note

When you split into train/val/test, split **by subject_id**, not randomly by
row. Frames from the same clip are highly correlated — if some frames from
subject01's video end up in train and others in test, your test accuracy
will look better than it actually generalizes.
