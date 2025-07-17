const express = require('express');
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');
const { constants } = require('buffer');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin:"*",
        methods: ["POST", "GET"]
    }
});

let roomUsers = {};
let initialDrawing = {};

io.on("connection", (socket) => {
    // console.log("User is conneted", socket.id);

    socket.on("draw", (data) => {
        // console.log(data);
        let {fromX, fromY, toX, toY, clr, sz, roomId} = data;
        // console.log(data.roomId);
        if (!initialDrawing[roomId]) {
            initialDrawing[roomId] = [];
        } 
        initialDrawing[roomId].push({fromX, fromY, toX, toY, clr, sz});
        // console.log(initialDrawing[roomId]);
        io.to(data.roomId).emit("draw", data);
    });

    socket.on("clear", (roomId) => {
        initialDrawing[roomId] = [];
        io.to(roomId).emit("clear");
    })

    socket.on("joinRoom", ({username, roomId}) => {
        const id = socket.id;
        socket.join(roomId);
        
        if (!roomUsers[roomId]) {
            roomUsers[roomId] = {};
        }
        roomUsers[roomId][id] = username;
        // console.log(roomUsers[roomId]);
        io.to(id).emit("initialDraw", initialDrawing[roomId]);
        io.to(roomId).emit("userList", roomUsers[roomId]);
    })

    socket.on("userDrawing", (data) => {
        if (data.x === -1) {
            socket.to(data.room).emit("userDrawing", null);
            return;
        }
        socket.to(data.room).emit("userDrawing", data);
        // console.log
    })

    socket.on("disconnect", () => {
        for (const roomId in roomUsers) {
            if (roomUsers[roomId][socket.id]) {
                delete roomUsers[roomId][socket.id];
                io.to(roomId).emit("userList", roomUsers[roomId]);
            }
        }
    })

})

// app.get('/', (req, res) => {
//     res.send('coll   ab whiteboard...!');
// });

server.listen(5000, () => {
    console.log('server runnig in port : http://localhost:5000');
});