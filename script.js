const webcam = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const cameraToggle = document.getElementById('camera-toggle');
const detectedPhrase = document.getElementById('detected-phrase');
const statusText = document.getElementById('status-text');
const spaceCanvas = document.getElementById('space-canvas');
const spaceCtx = spaceCanvas.getContext('2d');

let hands = null;
let stream = null;
let cameraRunning = false;
let currentPhrase = 'Waiting for camera';
let phraseHoldUntil = 0;
let trackerReady = false;
let manualDetectionTimer = null;
let processingFrame = false;

const starCount = 180;
const stars = [];
const phraseParticles = [];
const renderTextCanvas = document.createElement('canvas');
const renderTextCtx = renderTextCanvas.getContext('2d');

function resizeSpaceCanvas() {
  spaceCanvas.width = window.innerWidth * window.devicePixelRatio;
  spaceCanvas.height = window.innerHeight * window.devicePixelRatio;
  spaceCanvas.style.width = `${window.innerWidth}px`;
  spaceCanvas.style.height = `${window.innerHeight}px`;
  spaceCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

  renderTextCanvas.width = Math.max(600, window.innerWidth);
  renderTextCanvas.height = Math.max(240, Math.floor(window.innerHeight * 0.28));
}

function createStars() {
  stars.length = 0;
  for (let i = 0; i < starCount; i += 1) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      baseX: Math.random() * window.innerWidth,
      baseY: Math.random() * window.innerHeight,
      size: Math.random() * 2.2 + 0.5,
      speed: Math.random() * 0.15 + 0.03,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
}

function setStatus(text) { statusText.textContent = text; }

function setPhrase(phrase) {
  currentPhrase = phrase;
  detectedPhrase.textContent = phrase;
  phraseHoldUntil = performance.now() + 1400;
  buildPhraseParticles(phrase);
}

function buildPhraseParticles(text) {
  phraseParticles.length = 0;
  renderTextCtx.clearRect(0, 0, renderTextCanvas.width, renderTextCanvas.height);
  const fontSize = Math.min(renderTextCanvas.width / Math.max(text.length * 0.72, 5), 120);
  renderTextCtx.fillStyle = '#ffffff';
  renderTextCtx.textAlign = 'center';
  renderTextCtx.textBaseline = 'middle';
  renderTextCtx.font = `800 ${fontSize}px Inter, sans-serif`;
  renderTextCtx.fillText(text, renderTextCanvas.width / 2, renderTextCanvas.height / 2);
  const imageData = renderTextCtx.getImageData(0, 0, renderTextCanvas.width, renderTextCanvas.height).data;
  const step = 6;
  for (let y = 0; y < renderTextCanvas.height; y += step) {
    for (let x = 0; x < renderTextCanvas.width; x += step) {
      const index = (y * renderTextCanvas.width + x) * 4;
      if (imageData[index + 3] > 120) phraseParticles.push({ x, y });
    }
  }
}

function animateSpace() {
  const now = performance.now();
  spaceCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (let i = 0; i < stars.length; i += 1) {
    const star = stars[i];
    const hasPhrase = phraseParticles.length > 0 && now < phraseHoldUntil;
    if (hasPhrase && phraseParticles[i % phraseParticles.length]) {
      const target = phraseParticles[i % phraseParticles.length];
      const targetX = target.x + (window.innerWidth - renderTextCanvas.width) / 2;
      const targetY = target.y + 120;
      star.x += (targetX - star.x) * 0.055;
      star.y += (targetY - star.y) * 0.055;
    } else {
      star.baseY += star.speed;
      if (star.baseY > window.innerHeight + 10) {
        star.baseY = -10;
        star.baseX = Math.random() * window.innerWidth;
      }
      star.x += (star.baseX - star.x) * 0.02;
      star.y += (star.baseY - star.y) * 0.02;
    }
    const glow = 0.4 + Math.sin(now * 0.002 + star.twinkle) * 0.4;
    spaceCtx.beginPath();
    spaceCtx.fillStyle = `rgba(255,255,255,${0.45 + glow * 0.45})`;
    spaceCtx.arc(star.x, star.y, star.size + glow * 0.8, 0, Math.PI * 2);
    spaceCtx.fill();
  }
  if (phraseParticles.length > 0 && now < phraseHoldUntil) {
    spaceCtx.fillStyle = 'rgba(127,211,255,0.14)';
    spaceCtx.font = '700 18px Inter, sans-serif';
    spaceCtx.textAlign = 'center';
    spaceCtx.fillText(currentPhrase, window.innerWidth / 2, 88);
  }
  requestAnimationFrame(animateSpace);
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function isFingerExtended(tip, pip) { return tip.y < pip.y; }

function recogniseGesture(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const indexPip = landmarks[6];
  const middlePip = landmarks[10];
  const ringPip = landmarks[14];
  const pinkyPip = landmarks[18];
  const wrist = landmarks[0];
  const indexExtended = isFingerExtended(indexTip, indexPip);
  const middleExtended = isFingerExtended(middleTip, middlePip);
  const ringExtended = isFingerExtended(ringTip, ringPip);
  const pinkyExtended = isFingerExtended(pinkyTip, pinkyPip);
  const thumbUp = thumbTip.y < landmarks[3].y && thumbTip.x < indexPip.x;
  const pinch = distance(thumbTip, indexTip) < 0.06;
  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
  if (pinch) return 'PLEASE';
  if (thumbUp && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'THANK YOU';
  if (extendedCount === 4) return 'HELLO';
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && distance(wrist, middleTip) < 0.23) return 'NO';
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return 'YES';
  return null;
}

function drawLandmarks(landmarks) {
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  if (!landmarks) return;
  overlayCtx.save();
  overlayCtx.scale(-1, 1);
  overlayCtx.translate(-overlay.width, 0);
  overlayCtx.strokeStyle = 'rgba(127, 211, 255, 0.9)';
  overlayCtx.fillStyle = 'rgba(127, 211, 255, 0.95)';
  overlayCtx.lineWidth = 2;
  const connections = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]
  ];
  connections.forEach(([a,b]) => {
    overlayCtx.beginPath();
    overlayCtx.moveTo(landmarks[a].x * overlay.width, landmarks[a].y * overlay.height);
    overlayCtx.lineTo(landmarks[b].x * overlay.width, landmarks[b].y * overlay.height);
    overlayCtx.stroke();
  });
  landmarks.forEach((point) => {
    overlayCtx.beginPath();
    overlayCtx.arc(point.x * overlay.width, point.y * overlay.height, 4, 0, Math.PI * 2);
    overlayCtx.fill();
  });
  overlayCtx.restore();
}

function onResults(results) {
  processingFrame = false;
  const landmarks = results.multiHandLandmarks && results.multiHandLandmarks[0] ? results.multiHandLandmarks[0] : null;
  drawLandmarks(landmarks);
  if (landmarks) {
    const gesture = recogniseGesture(landmarks);
    if (gesture) {
      setPhrase(gesture);
      setStatus('Gesture detected');
    } else {
      setStatus('Hand detected, matching gesture');
    }
  } else {
    setStatus('Looking for a hand');
  }
}

async function setupHandTracking() {
  if (trackerReady && hands) return true;
  setStatus('Loading hand tracking');
  try {
    if (!window.Hands) throw new Error('MediaPipe Hands script missing');
    hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    hands.onResults(onResults);
    trackerReady = true;
    setStatus('Tracking ready');
    return true;
  } catch (error) {
    console.error('Tracking setup failed:', error);
    setStatus('Camera works, but hand tracking failed to load');
    return false;
  }
}

async function processCurrentFrame() {
  if (!cameraRunning || !trackerReady || !hands || processingFrame || !webcam.videoWidth) return;
  processingFrame = true;
  try {
    await hands.send({ image: webcam });
  } catch (error) {
    processingFrame = false;
    console.error('Frame processing failed:', error);
    setStatus('Tracking hit an error');
  }
}

function startFrameLoop() {
  stopFrameLoop();
  manualDetectionTimer = setInterval(processCurrentFrame, 120);
}

function stopFrameLoop() {
  if (manualDetectionTimer) {
    clearInterval(manualDetectionTimer);
    manualDetectionTimer = null;
  }
}

async function startCamera() {
  setStatus('Requesting camera access');
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    webcam.srcObject = stream;
    await new Promise((resolve) => { webcam.onloadedmetadata = () => resolve(); });
    await webcam.play();
    overlay.width = webcam.videoWidth || 640;
    overlay.height = webcam.videoHeight || 480;
    cameraRunning = true;
    cameraToggle.textContent = 'Stop Camera';
    setPhrase('Show a gesture');
    setStatus('Camera running');
    const trackingReady = await setupHandTracking();
    if (trackingReady) {
      setStatus('Looking for a hand');
      startFrameLoop();
    }
  } catch (error) {
    console.error('Camera start failed:', error);
    setStatus('Camera access denied or unavailable');
  }
}

function stopCamera() {
  cameraRunning = false;
  cameraToggle.textContent = 'Start Camera';
  setStatus('Camera off');
  detectedPhrase.textContent = 'Waiting for camera';
  currentPhrase = 'Waiting for camera';
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  stopFrameLoop();
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  webcam.srcObject = null;
}

cameraToggle.addEventListener('click', async () => {
  cameraToggle.disabled = true;
  try {
    if (cameraRunning) stopCamera();
    else await startCamera();
  } finally {
    cameraToggle.disabled = false;
  }
});

window.addEventListener('resize', () => {
  resizeSpaceCanvas();
  createStars();
  if (currentPhrase && currentPhrase !== 'Waiting for camera') buildPhraseParticles(currentPhrase);
});

resizeSpaceCanvas();
createStars();
buildPhraseParticles('HELLO');
animateSpace();
