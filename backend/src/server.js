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

//3 Initialize Socket.IO with CORS settings allowed for our React frontend
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],// retrieve items and add them to the database
    },
});

//Track every connection (socket.id is the username). The same name can appear more than once here.
const onlineUsers = new Map();

//Unique usernames only, so a name stays listed until its last connection leaves.
const getUserList = () => Array.from(new Set(onlineUsers.values()));

//4 create the connection with MongoDB
console.log("Attempting to connect...");
const MONGO_URI = "mongodb://127.0.0.1:27017/lost-wire";
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.log("MongoDB connection error:", err));

//5 REST API Endpoint load historical messages when the app is opened
expressApp.get("/api/messages", async (req, res) => {
    try {
    const {user, with: target} = req.query;
    const filter = target //"?" target exists and matches one of these:  do this: , ":" target does not exist do this:
        ? { $or: [{ user, target }, { user: target, target: user }] } // this DM conversation
        : { target: null };//Public chat 
    const messages = await Message.find(filter).sort({ timestamp: 1  });
    console.log(`Fetched ${messages.length} messages from DB`);
    res.json(messages);
  } catch (err) {
    console.error("Failed to retrieve messages", err.message);
    res.status(500).json([]);
  }
});

//6 Socket.IO event handlers
//Socket.IO handles the link between the requests of client machines, which allows for instant messaging without reloading the app
//Handle a new user connection
io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    //Store the username for this socket and broadcast the unique username list.
    socket.on("join", (username) => {
        onlineUsers.set(socket.id, username);
        socket.join(username);//add each user to its own socket.io room to be able to handshake between individual clients for dm
        io.emit("user_list", getUserList());
    });
    //Listen for send_message event from a client machine when they press send on a message
    socket.on("send_message", async (data) => {
        console.log("Received message event on backend:", data);
        try{
            //Create and save the entered message in MongoDB
            const newMessage = new Message({
                user: data.user,
                text: data.text,
                target: data.target || null
            });
            const savedMessage = await newMessage.save()//Waits for other operations such as waiting on the database before saving the new message just created to the db
            console.log("Successfully saved to MongoDB", savedMessage);
            if(data.target){
                io.to(data.target).to(data.user).emit("receive_message", savedMessage);//emit to recipient room+sender room
            }
            else{
                io.emit("receive_message", savedMessage);//emit to public chat
            }
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });
    // Handle socket disconnection
    socket.on("disconnect", () => {
        onlineUsers.delete(socket.id);
        io.emit("user_list", getUserList());
        console.log(`Client disconnected: ${socket.id}`);
    });
});

//7 Continue listening for further processes
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`)
})