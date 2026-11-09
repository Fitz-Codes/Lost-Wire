//adding mongoose library
const mongoose = require("mongoose");

//defining the frame of a user
const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    password: {
        
    }
})