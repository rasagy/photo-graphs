//Step up: Playing with photos of stairs in Indiranagar houses
//Move mouse in diagonals to climb stairs!
// Sketch by Rasagy / data.n.coded
// Made during Indiranagar Codewalk with Chaitali.


let imgCount=5;
let thresh=0; 
let l=[]; //left images
let r=[]; //right images
let lastX=0,lastY=0;

function preload() {
  for(let a=1;a<=imgCount;a++) {
    let li = loadImage(`photos/L-${a}.jpg`);
    l.push(li);
    
    let ri = loadImage(`photos/R-${a}.jpg`);
    r.push(ri);
  }
  // console.log(l.length,r.length);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(4);
  rectMode(CENTER);
  background(0);
  noStroke();
  fill(0);
  thresh=width*0.05;
}

function draw() {
}

function mouseMoved() {
  if(!lastX) lastX=mouseX;
  if(!lastY) lastY=mouseY;
  background(0,1);
  
  let dx=abs(mouseX-lastX);
  let dy=abs(mouseY-lastY);
  
  if(dx>thresh && dy>thresh) {
    let diff=(dx>dy)? dx:dy;  
    let i=floor(random(5));
    rect(mouseX,mouseY,diff+4);
    if((mouseX>lastX && mouseY<lastY) || (mouseX<lastX && mouseY>lastY)) {
      image(l[i],mouseX-diff/2, mouseY-diff/2, diff, diff);
    } else {
      image(r[i],mouseX-diff/2, mouseY-diff/2, diff, diff);
    }
     
    lastX=mouseX;
    lastY=mouseY;
  }
}

function mousePressed() {
  background(0);
}

function touchStarted() {
  if (touches.length === 0) return false;
  let tx = touches[0].x;
  let ty = touches[0].y;

  if (!lastX) lastX = tx;
  if (!lastY) lastY = ty;

  background(0, 1);

  let dx = abs(tx - lastX);
  let dy = abs(ty - lastY);
  let diff = max(dx, dy);

  if (diff > thresh) {
    let i = floor(random(5));
    rect(tx, ty, diff + 4);
    if ((tx > lastX && ty < lastY) || (tx < lastX && ty > lastY)) {
      image(l[i], tx - diff/2, ty - diff/2, diff, diff);
    } else {
      image(r[i], tx - diff/2, ty - diff/2, diff, diff);
    }
    lastX = tx;
    lastY = ty;
  }

  return false; // prevent default tap behavior (scroll, zoom)
}

function touchMoved() {
  return false; // prevent scroll while touching canvas
}

// Dynamically resize the canvas when the user resizes the browser
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}