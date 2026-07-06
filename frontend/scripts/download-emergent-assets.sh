#!/bin/bash
# Run this ONCE, from the frontend/ folder, in Cursor's terminal (your own machine —
# my sandbox can't reach this domain, but your machine can).
#   cd frontend
#   bash scripts/download-emergent-assets.sh
#
# Downloads the 6 hero/character images that design.js used to load from Emergent's
# CDN, saves them locally, so the app never depends on Emergent's servers again.
# Do this THE MOMENT you read this — these URLs may stop resolving at any time now
# that the Emergent subscription is cancelled.

set -e
DEST="src/assets/emergent"
mkdir -p "$DEST"

declare -A FILES=(
  ["hero.png"]="https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/4d1c4412c0db8eb926168ed4c837ed65609fd13aba3c6108f8361583dc6f7e50.png"
  ["student.png"]="https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/e107b7c106d7f97f7b92fe570b755516063dd742f39bda9bfdc80c5213b92569.png"
  ["parent.png"]="https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/987e9a1d69803b87fa479a643b0520655a522c8361dafedb4f2a26b2e6e3001d.png"
  ["teacher.png"]="https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/8d82900a1847a03f1fce8b9e38d362729bd7947de1accea5aed70d1729c95e85.png"
  ["camera-bg.png"]="https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/6e359f7aeed7399df32d3f855ac94ea52eda4c4f129027368e87bbc2b194f29c.png"
  ["boss.png"]="https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/5ebfb4090fa6c80b07c42cecf7edb828703141e03a55306d0d9ff91931ba91aa.png"
  ["world-map.png"]="https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/fb2a9fe3bdb1a067d60f4a31b84027120084335d5995788dca166ce209fd8337.png"
)

for name in "${!FILES[@]}"; do
  echo "Downloading $name ..."
  curl -sSL -f -o "$DEST/$name" "${FILES[$name]}" && echo "  ✓ saved to $DEST/$name" \
    || echo "  ✗ FAILED — this URL may already be dead. If so, you'll need to re-create/re-source this image (it's the: ${name%.png})."
done

echo ""
echo "Done. src/lib/design.js already imports these local files — no further code change needed."
echo "If any download FAILED above, that specific image is lost; swap in a replacement image of your choosing at $DEST/<name>.png with the same filename."
