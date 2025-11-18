const path = require("path");
const express = require("express"); // use the 'express' library to start the app server
const app = express(); // make a new app
const server = require("http").Server(app); // and create an http server for the app
const io = require("socket.io")(server); // then create a socket using that server that clients can connect to

const port = 3000; // specify the port where communication will happen

let waitingUser;
/*let prompt = "what change have you made that would surprise a past version of you?";
let prompt = "what is the most sentimental object in your possession?";*/
let prompt = "what lessons can you learn from your 8 year old self?";

server.listen(port, () => {
  //set up server to listen on specified port
  console.log("server is listening on port " + port); // print to the server console to log that the server is running
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.use(express.static("public")); // make all the files in 'public' available
app.use(express.static("node_modules/p5/lib"));
app.use(express.static("node_modules/p5/lib/addons"));

io.on("connection", (socket) => {
  // when a client has connected...
  let userSubmission; // place to store newly submitted messages from new client
  let partnerSubmission; // place to store partner's submitted message
  let partnerSocket; // place to store partnered user's socket
  let partnerSocketId; // place to store partnered user's socketid
  socket.emit("prompt", prompt); // send current prompt to user

  socket.on("submission", (message) => {
    userSubmission = message;
    console.log('received message: ' + userSubmission);
    if (waitingUser) {
      // if there's a waiting user...
      console.log("there's a waiting user");
      partnerSocket = io.sockets.sockets.get(waitingUser); // pair the current user with the waiting user
      if (partnerSocket) {
        // make sure partnerSocket is valid
        partnerSocket.emit("paired", socket.id); // send current user's socket id to the waiting user...
        socket.emit("paired", waitingUser); // send waiting user's socket id to current user
      }
      waitingUser = null; // reset waiting user after pairing so that we can accommodate additional users
    } else {
      console.log('there is no existing waiting user, currently connected user has become "waiting user"!')
      waitingUser = socket.id; // the current user's id becomes the waiting user
      socket.emit("youAreWaiting", "You are waiting");
    }
  });
  
  socket.on("embrace", ({ to, message}) => {
      io.to(to).emit("embrace", { from: socket.id, message }); // send affirmation to paired user
  })

  socket.on("message", ({ to, message }) => {
    io.to(to).emit("message", { from: socket.id, message }); // send whatever was received to paired user
  });

  socket.on("storePartner", (id) => {
    partnerSocketId = id;
  });

  socket.on("waiting", (message) => {
    console.log(socket.id + " is waiting");
    if (waitingUser) {
      // if there's a waiting user...
      partnerSocket = io.sockets.sockets.get(waitingUser); // pair the current user with the waiting user
      if (partnerSocket) {
        // make sure partnerSocket is valid
        partnerSocket.emit("paired", socket.id); // send current user's socket id to the waiting user...
        socket.emit("paired", waitingUser); // send waiting user's socket id to current user
      }
      waitingUser = null; // reset waiting user after pairing so that we can accommodate additional users
    } else {
      waitingUser = socket.id; // the current user's id becomes the waiting user
    }
  });

  socket.on("touchChange", (data) => {
    //console.log(data);
    io.to(data.to).emit("incomingTouch", data);
  });

  socket.on("disconnect", (reason) => {
    socket.broadcast.emit("removeTouch", socket.id);
  });

  socket.on("disconnect", () => {
    console.log(socket.id + " just disconnected");
    if (partnerSocketId) {
      console.log(partnerSocketId + " was just sent unpair message");
      io.to(partnerSocketId).emit("unpaired", socket.id);
    }
    if (waitingUser === socket.id) {
      // if the "waiting user" left
      waitingUser = null; // reset waiting user
    }
  });
});
