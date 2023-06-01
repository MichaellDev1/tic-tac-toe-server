const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);

    if (rooms[room]) {
      if (rooms[room].length == 2) {
        return socket.emit("notAuthorization", "not");
      } else {
        rooms[room] = [...rooms[room], { socketID: socket.id, turn: "o" }];
        socket.emit("turnSelected", "o");
      }
    } else {
      rooms[room] = [{ socketID: socket.id, turn: "x" }];
      socket.emit("turnSelected", "x");
    }
    socket.to(room).emit("startGame", room);
  });

  socket.on("verify", (room) => {
    if (rooms[room].length == 2) {
      socket.to(room).emit("start", "start");
    }
  });

  socket.on("playGame", ({ room }) =>
    socket.broadcast.to(room).emit("updateGame", "Hola")
  );

  socket.on("gameBoard", (idRoom, newSquares) => {
    console.log(rooms[idRoom]);
    socket.broadcast
      .to(idRoom)
      .emit(
        "gameEnemy",
        rooms[idRoom][0].socketID == socket.id ? "o" : "x",
        newSquares
      );
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((room) => {
      if (rooms[room].length == 2) {
        const verifyInx = rooms[room].findIndex(
          (id) => id.socketID == socket.id
        );

        console.log(verifyInx);
        if (verifyInx != -1) {
          const deletePlayer = rooms[room].splice(verifyInx, 1);
          rooms[room] = deletePlayer;
          socket.to(room).emit("disconnectUser", "userDisconnect");
        }
      } else {
        delete rooms[room];
      }
    });
  });
});

server.listen(3000, () => {
  console.log(`Server is runing`);
});
