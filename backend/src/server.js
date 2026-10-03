//adding libraries
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io"); //{ } means multiple items required

//Import mongoose model
const Message = require("./models/Message");

//First initialize express and cors(Our middleware)
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json()); //Allows express to parse incoming JSON request bodies

// Second wrap the express app inside an HTTP server
//Socket.IO needs access to the HTTP server to handle websocket handshakes
const server = http.createServer(expressApp);

// Third Initialize Socket.IO with CORS settings allowed for our React frontend
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",// this is Vite's default React url
        methods: ["GET", "POST"],// retrieve items and add them to the database
    },
});

// Four create the connection with MongoDB
const MONGO_URI = "mongodb://localhost:27017/lost-wire";
mongoose.connect(MONGO_URI);
