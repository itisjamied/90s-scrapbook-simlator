import {
  FilesetResolver,
  PoseLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

const canvas = document.getElementById("overlay");
const fallbackCanvas = document.getElementById("membrane");
const activeCanvas = canvas || fallbackCanvas;

if (!activeCanvas) {
  throw new Error("Canvas element not found. Expected #overlay or #membrane.");
}

const ctx = activeCanvas.getContext("2d");

if (!ctx) {
  throw new Error("2D canvas context is unavailable.");
}
const video = document.getElementById("webcam");

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

let poseLandmarker = null;
let lastVideoTime = -1;
let poseResult = null;
const landmarkHistory = new Map();

const LANDMARK_SMOOTHING = 0.75;
const MAX_LANDMARK_STEP_PX = 60;

// Swap these paths with your own scrapbook image cutouts.
const CUTOUT_PATHS = {
  head: "rock-head.png",
  // torso: "assets/torso.png",
  // leftFoot: "assets/left-foot.png",
  // rightFoot: "assets/right-foot.png"
};

function loadCutout(src) {
  const image = new Image();
  const state = {
    image,
    ready: false,
    configured: Boolean(src)
  };

  if (!src) {
    return state;
  }

  image.onload = () => {
    state.ready = true;
  };

  image.onerror = () => {
    state.ready = false;
  };

  image.src = src;
  return state;
}

const cutouts = {
  head: loadCutout(CUTOUT_PATHS.head),
  torso: loadCutout(CUTOUT_PATHS.torso),
  leftFoot: loadCutout(CUTOUT_PATHS.leftFoot),
  rightFoot: loadCutout(CUTOUT_PATHS.rightFoot)
};

const SHOW_SKELETON = false;
const FALLBACK_TO_SKELETON_WHEN_CUTOUTS_MISSING = true;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = activeCanvas.clientWidth;
  height = activeCanvas.clientHeight;

  if (!width || !height) {
    return;
  }

  activeCanvas.width = width * dpr;
  activeCanvas.height = height * dpr;
  activeCanvas.style.width = width + "px";
  activeCanvas.style.height = height + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

async function setupPoseTracking() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: 640,
      height: 480
    },
    audio: false
  });

  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
}

function updatePose() {
  if (!poseLandmarker || video.readyState < 2) return;
  if (video.currentTime === lastVideoTime) return;

  lastVideoTime = video.currentTime;
  poseResult = poseLandmarker.detectForVideo(video, performance.now());

  if (!poseResult?.landmarks?.length) {
    landmarkHistory.clear();
  }
}

function drawBackground() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width, height);
}

function getLandmark(index) {
  if (!poseResult?.landmarks?.length) return null;

  const lm = poseResult.landmarks[0][index];
  if (!lm) return null;

  const rawPoint = {
    x: (1 - lm.x) * width, // mirror for selfie view
    y: lm.y * height,
    z: lm.z,
    visibility: lm.visibility ?? 0
  };

  const previous = landmarkHistory.get(index);
  if (!previous) {
    landmarkHistory.set(index, rawPoint);
    return rawPoint;
  }

  const deltaX = rawPoint.x - previous.x;
  const deltaY = rawPoint.y - previous.y;
  const limitedX = previous.x + Math.max(-MAX_LANDMARK_STEP_PX, Math.min(MAX_LANDMARK_STEP_PX, deltaX));
  const limitedY = previous.y + Math.max(-MAX_LANDMARK_STEP_PX, Math.min(MAX_LANDMARK_STEP_PX, deltaY));

  const smoothed = {
    x: previous.x * LANDMARK_SMOOTHING + limitedX * (1 - LANDMARK_SMOOTHING),
    y: previous.y * LANDMARK_SMOOTHING + limitedY * (1 - LANDMARK_SMOOTHING),
    z: previous.z * LANDMARK_SMOOTHING + rawPoint.z * (1 - LANDMARK_SMOOTHING),
    visibility: previous.visibility * LANDMARK_SMOOTHING + rawPoint.visibility * (1 - LANDMARK_SMOOTHING)
  };

  landmarkHistory.set(index, smoothed);
  return smoothed;
}

function drawDot(point, color = "hotpink", size = 8) {
  if (!point) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
  ctx.fill();
}

function drawLine(a, b, color = "white", lineWidth = 3) {
  if (!a || !b) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawCutout(part, x, y, widthPx, heightPx, rotation = 0, offsetY = 0) {
  const sprite = cutouts[part];

  if (!sprite?.ready) {
    return false;
  }

  ctx.save();
  ctx.translate(x, y + offsetY);
  ctx.rotate(rotation);
  ctx.drawImage(sprite.image, -widthPx / 2, -heightPx / 2, widthPx, heightPx);
  ctx.restore();
  return true;
}

function hasReadyCutout(part) {
  return Boolean(cutouts[part]?.ready);
}

function shouldShowFallbackSkeleton() {
  if (!FALLBACK_TO_SKELETON_WHEN_CUTOUTS_MISSING) return false;

  return !hasReadyCutout("head") || !hasReadyCutout("torso") || !hasReadyCutout("leftFoot") || !hasReadyCutout("rightFoot");
}

function drawSkeleton() {
  const nose = getLandmark(0);
  const leftShoulder = getLandmark(11);
  const rightShoulder = getLandmark(12);
  const leftElbow = getLandmark(13);
  const rightElbow = getLandmark(14);
  const leftWrist = getLandmark(15);
  const rightWrist = getLandmark(16);
  const leftHip = getLandmark(23);
  const rightHip = getLandmark(24);
  const leftKnee = getLandmark(25);
  const rightKnee = getLandmark(26);
  const leftAnkle = getLandmark(27);
  const rightAnkle = getLandmark(28);

  drawLine(leftShoulder, rightShoulder);
  drawLine(leftShoulder, leftElbow);
  drawLine(leftElbow, leftWrist);
  drawLine(rightShoulder, rightElbow);
  drawLine(rightElbow, rightWrist);
  drawLine(leftShoulder, leftHip);
  drawLine(rightShoulder, rightHip);
  drawLine(leftHip, rightHip);
  drawLine(leftHip, leftKnee);
  drawLine(leftKnee, leftAnkle);
  drawLine(rightHip, rightKnee);
  drawLine(rightKnee, rightAnkle);
  drawDot(leftShoulder, "yellow", 6);
  drawDot(rightShoulder, "yellow", 6);
  drawDot(leftHip, "lime", 6);
  drawDot(rightHip, "lime", 6);
}

function drawScrapbookBlocks() {
  const leftShoulder = getLandmark(11);
  const rightShoulder = getLandmark(12);
  const leftHip = getLandmark(23);
  const rightHip = getLandmark(24);
  const leftAnkle = getLandmark(27);
  const rightAnkle = getLandmark(28);
  const nose = getLandmark(0);

  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const torsoX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
    const torsoY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;

    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const torsoHeight = Math.abs(((leftHip.y + rightHip.y) / 2) - ((leftShoulder.y + rightShoulder.y) / 2));
    const torsoRotation = Math.atan2(
      rightShoulder.y - leftShoulder.y,
      rightShoulder.x - leftShoulder.x
    );

    const drewTorso = drawCutout(
      "torso",
      torsoX,
      torsoY,
      shoulderWidth * 0.95,
      torsoHeight * 1.15,
      torsoRotation
    );

    if (!drewTorso) {
      ctx.save();
      ctx.translate(torsoX, torsoY);
      ctx.rotate(torsoRotation);
      ctx.fillStyle = "rgba(255, 60, 140, 0.7)";
      ctx.fillRect(
        -shoulderWidth * 0.7 / 2,
        -torsoHeight * 0.45,
        shoulderWidth * 0.7,
        torsoHeight * 0.9
      );
      ctx.restore();
    }
  }

  if (nose) {
    const shoulderWidth = leftShoulder && rightShoulder
      ? Math.abs(rightShoulder.x - leftShoulder.x)
      : 100;
    const stickerSize = Math.max(64, Math.min(140, shoulderWidth * 0.9));
    const drewHead = drawCutout(
      "head",
      nose.x,
      nose.y,
      stickerSize,
      stickerSize,
      0,
      -32
    );

    if (!drewHead) {
      drawDot({ x: nose.x, y: nose.y - 30 }, "cyan", stickerSize * 0.18);
    }
  }

  if (leftAnkle) {
    const drewLeftFoot = drawCutout("leftFoot", leftAnkle.x, leftAnkle.y, 72, 36, 0, -4);

    if (!drewLeftFoot) {
      ctx.fillStyle = "rgba(255,255,0,0.8)";
      ctx.fillRect(leftAnkle.x - 24, leftAnkle.y - 10, 48, 20);
    }
  }

  if (rightAnkle) {
    const drewRightFoot = drawCutout("rightFoot", rightAnkle.x, rightAnkle.y, 72, 36, 0, -4);

    if (!drewRightFoot) {
      ctx.fillStyle = "rgba(255,255,0,0.8)";
      ctx.fillRect(rightAnkle.x - 24, rightAnkle.y - 10, 48, 20);
    }
  }
}

function animate() {
  updatePose();
  drawBackground();
  if (SHOW_SKELETON || shouldShowFallbackSkeleton()) {
    drawSkeleton();
  }
  drawScrapbookBlocks();
  requestAnimationFrame(animate);
}

async function init() {
  resize();
  window.addEventListener("resize", resize);

  try {
    await setupPoseTracking();
    animate();
  } catch (error) {
    console.error(error);
    drawBackground();
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText(
      "Camera / MediaPipe failed to start. Run on localhost and allow camera access.",
      24,
      40
    );
  }
}

init();