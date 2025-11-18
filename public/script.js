/* global createCanvas, io, colorMode, noStroke, background, fill, HSB, ellipse, mouseX, mouseY */

const socket = io(); //use this to initialize the socket that we will use to talk to the server
const inputDiv = document.getElementById("inputDiv"); // the input
const consoleDiv = document.getElementById("console");
const promptDiv = document.getElementById("prompt");
const releaseButton = document.getElementById("release");
const introScreen = document.getElementById("introscreen");
const overlayDiv = document.getElementById("overlay");
const howtoDiv = document.getElementById("instruction");
const introContent = document.getElementById("content");
const welcome = document.getElementById("placeholder");
const statusDiv = document.getElementById("status")
const reachButton = document.getElementById("reach");
const cursorBlink = document.getElementById("cursor");
const affirmButton = document.getElementById("affirm");
const statusText = document.getElementById("statusText");
const promptAgain = document.getElementById("promptAgain");
let connected = false;
let touching = false;
let prompt;

//cursor blink stuff
var cursor = true;
var speed = 250;
setInterval(() => {
  if(cursor) {
    cursorBlink.style.opacity = 0;
    cursor = false;
  }else {
    cursorBlink.style.opacity = 1;
    cursor = true;
  }
}, speed);

/* speech rec stuff:

let myRec = new p5.SpeechRec("en-US", parseResult); // new P5.SpeechRec object
var mostrecentword = "";
myRec.continuous = true; // do continuous recognition
myRec.interimResults = true; // allow partial recognition (faster, less accurate)*/

let typing = true;
let activeScreen = "home";
let myCanvas;

let partnerId = null;

let touchTimer = 0;
let timeThreshold = 250;

let myMessage = "";

let partnerMessage = "";

window.addEventListener("keydown", function (event) {
  welcome.innerHTML = "";
  // You can add more code here to do something when a key is pressed
  inputDiv.focus();
  //inputDiv.preventZoom();
  cursorBlink.style.display = "none";
  releaseButton.disabled = false;
  
});

welcome.addEventListener("click", function () {
  inputDiv.focus();
  //inputDiv.preventZoom();
  cursorBlink.style.display = "block";
  releaseButton.disabled = false;
  welcome.innerHTML = "";
});

window.addEventListener("keydown", (event) => {
  inputDiv.focus();
  releaseButton.disabled = false;
  cursorBlink.style.display = "none";

  if (event.key === "Enter") {
    event.preventDefault(); // Prevents adding a newline in the div
    releaseButton.click();
    inputDiv.innerHTML = "";
  }
});

releaseButton.addEventListener("click", (event) => {
  myMessage = inputDiv.innerHTML.trim();
  socket.emit("submission", myMessage);
  introScreen.style.display = "none";
  howtoDiv.style.display = "block";
  overlayDiv.style.display = "block";

  // go to waiting screen
  activeScreen = "room";
});

reachButton.addEventListener("click", (event) => {
  howtoDiv.style.display = "none";
  statusDiv.style.display = "block";
  overlayDiv.style.display = "block";

  myCanvas.show();
  // go to waiting screen
  activeScreen = "room";
});

affirmButton.addEventListener("click", (event) => {
  /*introScreen.style.display = "block";
  howtoDiv.style.display = "none";
  overlayDiv.style.display = "none";
  statusDiv.style.display = "none";
  promptAgain.style.opacity = 0;

  myCanvas.hide();*/
  
  window.location.reload();

  
  //socket.emit("your message has been embraced");
  socket.emit("embrace", { to: partnerId, message: 'your message has been embraced' });
  
});

socket.on("prompt", (data) => {
  //console.log(data);
  promptDiv.innerHTML = data;
  prompt = data;
});

socket.on("message", ({ from, message }) => {
  //if data from the server is received...
  //overlayDiv.innerHTML = prompt + ": " + message; //set the displayed in our browser to the received text
  overlayDiv.innerHTML = message;

  partnerMessage = message;
});

socket.on("paired", (partner) => {
  partnerId = partner;
  socket.emit("storePartner", partnerId);
  console.log("paired with " + partner);
  //let connected = true;
  socket.emit("message", { to: partnerId, message: myMessage });
  statusText.innerHTML = "found an anon user, align with their presence to reveal their message...";
});

socket.on("unpaired", (partner) => {
  inputDiv.innerHTML = "";
  socket.emit("waiting", partnerId);
  partnerId = null;
  //consoleDiv.innerHTML = "waiting for user to connect";
});

socket.on("youAreWaiting", (data) => {
  console.log(data);
});

// --- p5JS stuff ---

let ellipseScale = 1;
let isTouchDevice;
let clientX;
let mouseIsDown = false;
let clientY;
let myIndex;
let touchers = []; // i was calling this 'touches' before but it conflicts with an array created when multi touch input is received by a mobile device
let myHue = Math.floor(Math.random() * 360);
let ellipseSize = 100 * window.devicePixelRatio;

socket.on("incomingTouch", (data) => {
  let alreadyExists = false; // create variable that checks if our client already has a "toucher" object assigned to them
  if (touchers.length > 0) {
    for (let i = 0; i < touchers.length; i++) {
      if (touchers[i].id == data.id) {
        // go through all the connected clients, see if any of their ids match the incoming ID
        alreadyExists = true; // if so, we store the new position and state of the existing toucher
        touchers[i].x = data.x;
        touchers[i].y = data.y;
        touchers[i].on = data.on;
      }
    }
  }
  if (alreadyExists == false) {
    touchers.push(data); // if this is an entirely new client, add the client to the touchers array
    console.log("received new touch: " + touchers[touchers.length - 1].id);
  }
});

socket.on("removeTouch", (data) => {
  let theIndex;
  for (let i = 0; i < touchers.length; i++) {
    if (touchers[i].id == data) {
      // the incoming message states which user id has disconnected, check to see if that id is associated with a "toucher"
      theIndex = i;
    }
  }
  if (theIndex != null) {
    console.log("removing touch");
    console.log(touchers);
    touchers.splice(theIndex, 1); // take that toucher out of the array
    console.log(touchers);
  } else {
    console.log("no touches to delete");
  }
});

if ("ontouchstart" in document.documentElement) {
  // special handling for touch device vs mouse input
  isTouchDevice = true;
} else {
  isTouchDevice = false;
}

if (isTouchDevice) {
  document.addEventListener("touchstart", (e) => {
    let event = e.changedTouches[0]; // "touchstart" tracks touches from multiple fingers, just track a single touch
    sendPos(event.clientX, event.clientY, 1); // send position on touchstart
    mouseIsDown = true;
  });

  document.addEventListener("touchmove", (e) => {
    let event = e.changedTouches[0];
    sendPos(event.clientX, event.clientY, 1); // send position on touchmove
  });
  document.addEventListener("touchend", (e) => {
    let event = e.changedTouches[0];
    sendPos(event.clientX, event.clientY, 0); // send position on touchend, noting that the touch has ended
    mouseIsDown = false;
  });
} else {
  document.addEventListener("mousedown", (e) => {
    // below does the same for standard mouse input
    sendPos(e.clientX, e.clientY, 1);
    mouseIsDown = true;
  });

  document.addEventListener("mouseup", (e) => {
    mouseIsDown = false;
    sendPos(e.offsetX, e.offsetY, 0);
  });

  document.addEventListener("mousemove", (e) => {
    if (mouseIsDown) {
      sendPos(e.offsetX, e.offsetY, 1);
    }
  });
}

function sendPos(clientX, clientY, on) {
  let x = clientX / window.innerWidth;
  let y = clientY / window.innerHeight;
  let loadingMessage = "holding out a hand...";
  let id = socket.id;
  let hue = myHue;
  let to = partnerId; //to the
  socket.emit("touchChange", { x, y, on, hue, id, to }); // sends an object containing those 4 fields
}

function setup() {
  myCanvas = createCanvas(window.innerWidth, window.innerHeight);
  colorMode(HSB);
  noStroke();
  myCanvas.hide();
  //myRec.start(); // start engine
}

function draw() {
  clear();
  fill(255);
  //draw other peoples' touches
  for (let i = 0; i < touchers.length; i++) {
    if (touchers[i].id != socket.id) {
      fill(touchers[i].hue, 50, 90, 0.8);
      ellipse(
        touchers[i].x * window.innerWidth,
        touchers[i].y * window.innerHeight,
        ellipseSize * touchers[i].on,
        ellipseSize * touchers[i].on
      );
      fill(255);
    }
  }

  if (touchers.length == 1) {
    // are both clients touching the screen at the same time?
    if (touchers[0].on == 1 && mouseIsDown) {
      let touchDistance = dist(
        touchers[0].x * window.innerWidth,
        touchers[0].y * window.innerHeight,
        mouseX,
        mouseY
      );
      if (touchDistance < ellipseSize * 0.25) {
        // how much of the circles need to be touching?
        //console.log("touching");
        touching = true;
        
        touchTimer++;
      } else {
        touchTimer--;
        touching = false;
      }
    } else {
      touchTimer = 0;
    }
  }
  /* progress bar: */
  fill("white");
  let progress = map(touchTimer, 0, timeThreshold, 0, width / 2);
  progress = constrain(progress, 0, timeThreshold);
  /*rect(width*0.25,height-(height*0.25),progress,10);
   */

  let opacity = map(progress, 0, timeThreshold, 0, 1);

  if (opacity === 1) {
    overlayDiv.style.opacity = 1;
    connected = true;
  }
  
  //console.log(connected);

  /*
  if (activeScreen == "room" && mouseIsDown) {
    howtoDiv.style.opacity = 0;
  }
  */

  //draw my own touch
  if (mouseIsDown) {
    fill(myHue, 50, 90, 0.8);
    ellipse(
      mouseX,
      mouseY,
      ellipseSize * ellipseScale,
      ellipseSize * ellipseScale
    );
  }
  
  //check status
  if (mouseIsDown && !connected && !touching) {
    statusText.innerHTML = "reaching out into the void...";
  } else if (!mouseIsDown && !connected && !touching) {
    statusText.innerHTML = "hold screen to connect";
  } else if (mouseIsDown && touching) {
    statusText.innerHTML = "conjuring message...";
  } else if (!mouseIsDown && !touching) {
    statusText.innerHTML = "hold screen to connect";
  } else if (mouseIsDown && !touching) {
    statusText.innerHTML = "hold screen to connect";
  } else if (!mouseIsDown && touching) {
    statusText.innerHTML = "hold screen to connect";
  }
  
  if (connected) {
    affirmButton.style.display = "block";
    statusText.innerHTML = "cherish this message from a stranger. when you are ready, release it back into the void.";
    promptAgain.style.opacity =0.5;
  }
  
}


function parseResult() {

  // recognition system will often append words into phrases.
  // so hack here is to only use the last word:
  let result = myRec.resultString;
  mostrecentword = myRec.resultString.split(' ').pop(); // last element of the recording
  console.log(mostrecentword);
  console.log(result);

  let wordToMatch = partnerMessage.split(' ').shift(); // gives you the first word of the "partnerMessage" string
  let wordsToMatch = partnerMessage.split(' '); //creates array of words from the partner message
  let currentWordIndex = 0;  // Track which word is being spoken
  
  for (let i = 0; i < words.length; i++) {
      if (i === currentWordIndex) {
          newText += `<span class="italic">${words[i]}</span> `;
      } else {
          newText += `${words[i]} `;
      }
  }
  
  //speechResult = speechResult + " " + mostrecentword;

  //testing whether msg and voice aligns
  //console.log(overlayDiv.innerHTML);
  //console.log(wordToMatch.toLowerCase());
  //console.log(result.toLowerCase());

  if(result == wordToMatch.toLowerCase()) {
    console.log("we have a match!");
  }
  //console.log(result);
}