//adding mongoose library
const mongoose = require("mongoose");

/*Defining the frame for a message document, 
each section provides a variable type that makes up the structure
of each message.
*/
const messageSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now, //Automatically sets to the current date and time
    },
    target: {
        type: String,
        default: null,
    }
});

// Compiling the schema into a Mongoose model named "Message"
const Message = mongoose.model("Message", messageSchema);

// Exporting the Message model AKA making it available to other parts of the app like a public variable
module.exports = Message;