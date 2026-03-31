let video;
let showCamera = true;

let bodyPose;
let connections;

let currentFit = { x: 0, y: 0, scale: 1, sceneW: 640, sceneH: 480 };

let poses = [];

const LERP_AMT = 0.1;
const MIN_CONF = 0.2;
const JOINTS = [
  "left_ear","right_ear",
  "left_shoulder","right_shoulder",
  "left_elbow","right_elbow",
  "left_wrist","right_wrist",
  "left_hip","right_hip",
  "left_knee","right_knee",
  "left_ankle","right_ankle"
];

let smoothedPoses = [];

//charcters
let rock;

// simple character system
let characters = [];

function preload(){
    // bodyPose = ml5.bodyPose("BlazePose", {flipped:true});
    bodyPose = ml5.bodyPose("Movenet", {flipped:true});

    rock = {
        name: "rock",

        head: loadImage("assets/rock/head.png"),
        torso: loadImage("assets/rock/torso.png"),

        leftUpperArm: loadImage("assets/rock/left-upper-arm.png"),
        leftLowerArm: loadImage("assets/rock/left-lower-arm.png"),
        rightUpperArm: loadImage("assets/rock/right-upper-arm.png"),
        rightLowerArm: loadImage("assets/rock/right-lower-arm.png"),

        leftUpperLeg: loadImage("assets/rock/left-upper-leg.png"),
        leftLowerLeg: loadImage("assets/rock/left-lower-leg.png"),
        rightUpperLeg: loadImage("assets/rock/right-upper-leg.png"),
        rightLowerLeg: loadImage("assets/rock/right-lower-leg.png")
        };
    }

function mousePressed(){
    console.log(poses);
}

// function gotPose(results){
//     // console.log(results);
//     poses = results;
// }
function gotPose(results){
  poses = results.map((pose, i) => {
    let prev = smoothedPoses[i] || {};
    let smoothPose = { ...pose };

    JOINTS.forEach(joint => {
      let p = pose[joint];
      if (!p || p.confidence < MIN_CONF) return smoothPose[joint] = null;

      let old = prev[joint] || p;
      smoothPose[joint] = {
        ...p,
        x: lerp(old.x, p.x, LERP_AMT),
        y: lerp(old.y, p.y, LERP_AMT)
      };
    });

    return smoothPose;
  });

  smoothedPoses = poses;
}

function setup(){
  createCanvas(windowWidth, windowHeight);
    video = createCapture(VIDEO, {flipped:true});
    video.size(640, 480);
    video.hide();

    //"detectStart" for continuous call, "getPose" for call back function anytime we get results
    bodyPose.detectStart(video, gotPose)
    connections = bodyPose.getSkeleton();
    console.log(connections);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function getContainFit(srcW, srcH, dstW, dstH) {
    const scale = min(dstW / srcW, dstH / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    return {
      x: (dstW - drawW) / 2,
      y: (dstH - drawH) / 2,
      scale,
      sceneW: srcW,
      sceneH: srcH
    };
}


////////////////////////////
/// helpers / draw functions
/////////////////////////////

function drawHead(pose, character) {
    let leftEar = pose.left_ear;
    let rightEar = pose.right_ear;

    if (!leftEar || !rightEar) return;

    let centerX = (leftEar.x + rightEar.x) / 2;
    let centerY = (leftEar.y + rightEar.y) / 2;

    let faceWidth = dist(leftEar.x, leftEar.y, rightEar.x, rightEar.y);
    let angle = atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);

    let w = faceWidth * 2.2;
    let h = w * (character.head.height / character.head.width);

    push();
    translate(centerX, centerY);
    rotate(angle);
    imageMode(CENTER);
    image(character.head, 0, -h * 0.1, w, h);
    pop();
}

function drawTorso(pose, character) {
  let leftShoulder = pose.left_shoulder;
  let rightShoulder = pose.right_shoulder;
  let leftHip = pose.left_hip;
  let rightHip = pose.right_hip;

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

  let shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  let shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;

  let hipCenterX = (leftHip.x + rightHip.x) / 2;
  let hipCenterY = (leftHip.y + rightHip.y) / 2;

//   let centerX = (shoulderCenterX + hipCenterX) / 2;
//   let centerY = (shoulderCenterY + hipCenterY) / 2; 

  let torsoWidth = dist(leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y);

  // auto height based on image proportions
  let torsoHeight = torsoWidth * (character.torso.height / character.torso.width);

  let angle = atan2(hipCenterY - shoulderCenterY, hipCenterX - shoulderCenterX) + HALF_PI;

  push();
  translate(shoulderCenterX, shoulderCenterY);
  rotate(angle + PI);
  imageMode(CENTER);
  // offset by half height so the top edge of the torso aligns with the shoulder line
  image(character.torso, 0, torsoHeight / 2, torsoWidth, torsoHeight);
  pop();
}

function drawLimbSegment(start, end, img, widthScale) {
  if (!start || !end || !img) return;

  let centerX = (start.x + end.x) / 2;
  let centerY = (start.y + end.y) / 2;

  let segmentLength = dist(start.x, start.y, end.x, end.y);
  let angle = atan2(end.y - start.y, end.x - start.x);

  let segmentWidth = segmentLength * widthScale;
  let segmentHeight = segmentWidth * (img.height / img.width);

  push();
  translate(centerX, centerY);
  rotate(angle - PI / 2);
  imageMode(CENTER);
  image(img, 0, 0, segmentWidth, segmentHeight);
  pop();
}

function drawLeftArm(pose, character) {
  let shoulder = pose.left_shoulder;
  let elbow = pose.left_elbow;
  let wrist = pose.left_wrist;

  if (!shoulder || !elbow || !wrist) return;

  drawLimbSegment(shoulder, elbow, character.leftUpperArm, 0.7);
  drawLimbSegment(elbow, wrist, character.leftLowerArm, 0.7);
}

function drawRightArm(pose, character) {
  let shoulder = pose.right_shoulder;
  let elbow = pose.right_elbow;
  let wrist = pose.right_wrist;

  if (!shoulder || !elbow || !wrist) return;

  drawLimbSegment(shoulder, elbow, character.rightUpperArm, 0.5);
  drawLimbSegment(elbow, wrist, character.rightLowerArm, 0.5);
}

function drawLeftLeg(pose, character) {
  let hip = pose.left_hip;
  let knee = pose.left_knee;
  let ankle = pose.left_ankle;

  if (!hip || !knee || !ankle) return;

  drawLimbSegment(hip, knee, character.leftUpperLeg, 0.7);
  drawLimbSegment(knee, ankle, character.leftLowerLeg, 0.7);
}

function drawRightLeg(pose, character) {
  let hip = pose.right_hip;
  let knee = pose.right_knee;
  let ankle = pose.right_ankle;

  if (!hip || !knee || !ankle) return;

  drawLimbSegment(hip, knee, character.rightUpperLeg, 0.5);
  drawLimbSegment(knee, ankle, character.rightLowerLeg, 0.5);
}
function keyPressed() {
  if (key === "v" || key === "V") showCamera = !showCamera;
}

////////////////////////////
/// draw function
/////////////////////////////
function draw(){
  background(0);

  const sceneW = video.width || 640;
  const sceneH = video.height || 480;
  currentFit = getContainFit(sceneW, sceneH, width, height);

  push();
  translate(currentFit.x, currentFit.y);
  scale(currentFit.scale);

  if (showCamera) image(video, 0, 0, sceneW, sceneH);

    if ( poses.length > 0){
        // Loop through all detected poses
        for (let poseIndex = 0; poseIndex < poses.length; poseIndex++){
            let pose = poses[poseIndex];
            // Default to rock for all poses
            let character = characters[poseIndex] || rock;

            /////////////////////////
            // individual keypoints
            /////////////////////////

            // let x = pose.nose.x;
            // let y = pose.nose.y;
           

            // let rx = pose.right_wrist.x;
            // let ry = pose.right_wrist.y;

            // let lx = pose.left_wrist.x;
            // let ly = pose.left_wrist.y;

            // let d = dist(rx, ry, lx, ly);

            // fill(0, 255, 0);
            // circle(rx, ry, 20);
            // circle(lx, ly, 20);

            // fill(255, 0, 0);
            // circle(x, y, d/2);

            /////////////////////////
            // draw connections
            /////////////////////////


            // for ( let i = 0; i < pose.keypoints.length; i++){
            //    let keypoint = pose.keypoints[i];
            //    fill(0, 0, 255);
            //    noStroke();
            //    if (keypoint.confidence > 0.1){
            //         circle(keypoint.x, keypoint.y, 10);
            //    }
            // }

            // for (let i = 0; i < connections.length; i++){

            //     let connection = connections[i];

            //     let a = connection[0];
            //     let b = connection[1];

            //     let keyPointA = pose.keypoints[a];
            //     let keyPointB = pose.keypoints[b];

            //     let confA = keyPointA.confidence;
            //     let confB = keyPointB.confidence;

            //     if (confA > 0.1 && confB > 0.1){
            //         stroke(255, 0, 255);
            //         strokeWeight(8);
            //         line(keyPointA.x, keyPointA.y, keyPointB.x, keyPointB.y);
            //     }
                
            // }

            drawLeftLeg(pose, character);
            drawLeftArm(pose, character);
            drawRightArm(pose, character);
            drawRightLeg(pose, character);
            drawTorso(pose, character);
            drawHead(pose, character);
        }
    }

        pop();
}