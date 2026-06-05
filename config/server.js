const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

app.get("/", (req, res) => {
  res.send("Chat API Running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("sendMessage", (message) => {
    const receiverSocket =
      onlineUsers.get(message.receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit(
        "receiveMessage",
        message
      );
    }
  });

  socket.on("typing", (data) => {
    const receiverSocket =
      onlineUsers.get(data.receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit(
        "typing",
        data.senderId
      );
    }
  });

  socket.on("stopTyping", (data) => {
    const receiverSocket =
      onlineUsers.get(data.receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit(
        "stopTyping",
        data.senderId
      );
    }
  });

  socket.on("disconnect", () => {
    for (let [key, value] of onlineUsers.entries()) {
      if (value === socket.id) {
        onlineUsers.delete(key);
      }
    }

    io.emit("onlineUsers",
      Array.from(onlineUsers.keys())
    );

    console.log("Disconnected:", socket.id);
  });
});

const PORT =
  process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
