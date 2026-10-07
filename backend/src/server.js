//adding libraries
console.log("wassup");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io"); //{ } means multiple items required

//Import mongoose model
const Message = require("../models/message");

//1 initialize express and cors(Our middleware)
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json()); //Allows express to parse incoming JSON request bodies

//2 wrap the express app inside an HTTP server
//Socket.IO needs access to the HTTP server to handle websocket handshakes
const server = http.createServer(expressApp);

// 3 Initialize Socket.IO with CORS settings allowed for our React frontend
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],// retrieve items and add them to the database
    },
});

//4 create the connection with MongoDB
console.log("Attempting to connect...");
const MONGO_URI = "mongodb://127.0.0.1:27017/lost-wire";
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.log("MongoDB connection error:", err));

//5 REST API Endpoint load historical messages when the app is opened
expressApp.get("/api/messages", async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp : 1});
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch and load messages" });
    }
});

//6 Socket.IO event handlers
//Socket.IO handles the link between the requests of client machines, which allows for instant messaging without reloading the app
io.on("connection", (socket) => {
    console.log("New client connected: ${socket.id}");
    
    //Listen for send_message event from a client machine when they press send on a message
    socket.on("send_message", async (data) => {
        console.log('Received message event on backend:', data); // Diagnostic log
        try{
            //Create and save the entered message in MongoDB
            const newMessage = new Message({
                user: data.user,
                text: data.text,
            });
            const savedMessage = await newMessage.save()//Waits for other operations such as waiting on the database before saving the new message just created to the db
            console.log("Successfully saved to MongoDB", savedMessage);
            //Broadcast the saved message back to all connected clients in real time
            io.emit("receive_message", newMessage);
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });
    // Handle socket disconnection
    io.on("disconnet", () => {
        console.log("Client disconnected: socket.id");
    });
});

//7 Continue listening on port 5000 for further processes
const PORT = 5000;
server.listen(PORT, () => {
    console.log("Server listening on localhost:5000")
})
