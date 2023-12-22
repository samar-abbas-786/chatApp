// index.js

const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// MongoDB connection URL
const mongoURL = "mongodb://localhost:27017"; // Change this to your MongoDB server URL
const dbName = "chatApp";
const client = new MongoClient(mongoURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.static("public")); // Serve static files from the 'public' directory

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Add route handler to handle setting the username through POST request
app.post("/setUsername", express.json(), (req, res) => {
  const userName = req.body.userName;
  res.json({ success: true, userName: userName });

  // Now you can use the userName as needed, for example, broadcasting it to other users
  io.emit("chat message", {
    user: "System",
    message: `${userName} has joined the chat`,
  });

  // Insert the user's registration message into MongoDB
  client.connect((err) => {
    if (err) throw err;
    const db = client.db(dbName);
    const messagesCollection = db.collection("messages");
    messagesCollection.insertOne({
      user: "System",
      message: `${userName} has joined the chat`,
    });
  });
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("a user connected");

  // Listen for chat messages
  socket.on("chat message", (data) => {
    io.emit("chat message", { user: socket.userName, message: data.message });

    // Insert the chat message into MongoDB
    client.connect((err) => {
      if (err) throw err;
      const db = client.db(dbName);
      const messagesCollection = db.collection("messages");
      messagesCollection.insertOne({
        user: socket.userName,
        message: data.message,
      });
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    io.emit("chat message", {
      user: "System",
      message: `${socket.userName} has left the chat`,
    });
    console.log("user disconnected");

    // Insert a system message into MongoDB
    client.connect((err) => {
      if (err) throw err;
      const db = client.db(dbName);
      const messagesCollection = db.collection("messages");
      messagesCollection.insertOne({
        user: "System",
        message: `${socket.userName} has left the chat`,
      });
    });
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
