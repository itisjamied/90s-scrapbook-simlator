let video;

let bodyPose;
let connections;

let poses = [];

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

        leftArm: loadImage("assets/rock/left-arm.png"),
        rightArm: loadImage("assets/rock/right-arm.png"),

        leftLeg: loadImage("assets/rock/left-leg.png"),
        rightLeg: loadImage("assets/rock/right-leg.png")
  };
}

function mousePressed(){
    console.log(poses);
}

function gotPose(results){
    // console.log(results);
    poses = results;
}

function setup(){
    createCanvas(640, 480);
    // createCanvas(1280, 960);
    video = createCapture(VIDEO, {flipped:true});
    video.hide();

    //"detectStart" for continuous call, "getPose" for call back function anytime we get results
    bodyPose.detectStart(video, gotPose)
    connections = bodyPose.getSkeleton();
    console.log(connections);
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

function drawLeftArm(pose, character) {
  let shoulder = pose.left_shoulder;
  let wrist = pose.left_wrist;

  if (!shoulder || !wrist) return;

  let centerX = (shoulder.x + wrist.x) / 2;
  let centerY = (shoulder.y + wrist.y) / 2;

  let armLength = dist(shoulder.x, shoulder.y, wrist.x, wrist.y);
  let angle = atan2(wrist.y - shoulder.y, wrist.x - shoulder.x);

  // width follows the arm length
  let armWidth = armLength * 0.3;

  // height auto-scales from the image ratio
  let armHeight = armWidth * (character.leftArm.height / character.leftArm.width);

  push();
  translate(centerX, centerY);
  rotate(angle - PI / 2);
  imageMode(CENTER);
  image(character.leftArm, 0, 0, armWidth, armHeight);
  pop();
}

function drawRightArm(pose, character) {
  let shoulder = pose.right_shoulder;
  let wrist = pose.right_wrist;

  if (!shoulder || !wrist) return;

  let centerX = (shoulder.x + wrist.x) / 2;
  let centerY = (shoulder.y + wrist.y) / 2;

  let armLength = dist(shoulder.x, shoulder.y, wrist.x, wrist.y);
  let angle = atan2(wrist.y - shoulder.y, wrist.x - shoulder.x);

  // SAME logic as left arm
  let armWidth = armLength * 0.3;

  // preserve image ratio
  let armHeight = armWidth * (character.rightArm.height / character.rightArm.width);

  push();
  translate(centerX, centerY);

  // mirror rotation behavior
  rotate(angle - PI / 2);

  imageMode(CENTER);
  image(character.rightArm, 0, 0, armWidth, armHeight);

  pop();
}

function drawLeftLeg(pose, character) {
  let hip = pose.left_hip;
  let ankle = pose.left_ankle;

  if (!hip || !ankle) return;

  let centerX = (hip.x + ankle.x) / 2;
  let centerY = (hip.y + ankle.y) / 2;

  let legLength = dist(hip.x, hip.y, ankle.x, ankle.y);
  let angle = atan2(ankle.y - hip.y, ankle.x - hip.x);

  let legWidth = legLength * 0.5;
  let legHeight = legWidth * (character.leftLeg.height / character.leftLeg.width);

  push();
  translate(centerX, centerY);
  rotate(angle - PI / 2);
  imageMode(CENTER);
  image(character.leftLeg, 0, 0, legWidth, legHeight);
  pop();
}

function drawRightLeg(pose, character) {
  let hip = pose.right_hip;
  let ankle = pose.right_ankle;

  if (!hip || !ankle) return;

  let centerX = (hip.x + ankle.x) / 2;
  let centerY = (hip.y + ankle.y) / 2;

  let legLength = dist(hip.x, hip.y, ankle.x, ankle.y);
  let angle = atan2(ankle.y - hip.y, ankle.x - hip.x);

  let legWidth = legLength* 0.5;
  let legHeight = legWidth * (character.rightLeg.height / character.rightLeg.width);

  push();
  translate(centerX, centerY);
  rotate(angle - PI / 2);
  imageMode(CENTER);
  image(character.rightLeg, 0, 0, legWidth, legHeight);
  pop();
}

////////////////////////////
/// draw function
/////////////////////////////
function draw(){
    image(video, 0, 0);

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


            for ( let i = 0; i < pose.keypoints.length; i++){
               let keypoint = pose.keypoints[i];
               fill(0, 0, 255);
               noStroke();
               if (keypoint.confidence > 0.4){
                    circle(keypoint.x, keypoint.y, 10);
               }
            }

            for (let i = 0; i < connections.length; i++){

                let connection = connections[i];

                let a = connection[0];
                let b = connection[1];

                let keyPointA = pose.keypoints[a];
                let keyPointB = pose.keypoints[b];

                let confA = keyPointA.confidence;
                let confB = keyPointB.confidence;

                if (confA > 0.1 && confB > 0.1){
                    stroke(255, 0, 255);
                    strokeWeight(8);
                    line(keyPointA.x, keyPointA.y, keyPointB.x, keyPointB.y);
                }
                
            }

            // drawHead(pose, character);
            // drawTorso(pose, character);
            // drawArms(pose, character);
            // drawLegs(pose, character);
       
            drawLeftLeg(pose, character);
            drawLeftArm(pose, character);
            drawRightArm(pose, character);
            drawRightLeg(pose, character);
            drawTorso(pose, character);
            drawHead(pose, character);
        }
    }
}