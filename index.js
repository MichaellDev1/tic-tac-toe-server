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
  socket.on("joinRoom", (room) => {
    socket.join(room);
    if (rooms[room]) {
      //Verifica si la sala esta llena o no, en caso de serlo emitira y eliminara al usuario que se unio a la sala.
      if (rooms[room].length == 2) {
        socket.leave(room);
        return socket.emit("notAuthorization", "not");
      } else {
        rooms[room] = [...rooms[room], { socketID: socket.id, turn: "o" }];
        socket.emit("turnSelected", "o");
      }
    } else {
      rooms[room] = [{ socketID: socket.id, turn: "x" }];
      socket.emit("turnSelected", "x");
    }

    //Emite si el juego es posible empezar o no.
    socket.to(room).emit("startGame", room);
  });

  //Verifica si en la sala existen 2 usuarios, en caso de no se asi, no emitira el start
  socket.on("verify", (room) => {
    if (rooms[room].length == 2) {
      socket.to(room).emit("start", "start");
    }
  });

  socket.on("resetGame", (room) => {
    socket.broadcast.to(room).emit("resetGame", "reset");
  });

  //Crea y emite un mensaje globalmente
  socket.on("createMessageGlobal", (message) => {
    socket.broadcast.emit("newMessageGlobal", message);
  });

  //Envia un mensaje a la sala
  socket.on("createMessageSingle", (message, room) => {
    socket.broadcast.to(room).emit("newMessageSingle", message);
  });

  //Inicia el juego
  socket.on("playGame", ({ room }) =>
    socket.broadcast.to(room).emit("updateGame", "Hola")
  );

  //Emite que turno es el siguiente, en caso de escuchar un click
  socket.on("gameBoard", (idRoom, newSquares) => {
    socket.broadcast
      .to(idRoom)
      .emit(
        "gameEnemy",
        rooms[idRoom][0].socketID == socket.id ? "o" : "x",
        newSquares
      );
  });

  //Si un usuario se desconecta sera eliminado de la sala y en caso de que los dos oponents se desconecten se eliminara la sala por completo.
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((room) => {
      if (rooms[room].length == 2) {
        const verifyInx = rooms[room].findIndex(
          (id) => id.socketID == socket.id
        );

        if (verifyInx != -1) {
          const deletePlayer = rooms[room].filter(
            (id) => id.socketID !== socket.id
          );

          deletePlayer[0].turn = "x";

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
