const mongoose = require('mongoose');
const Message = require('../models/message');

mongoose.connect('mongodb://127.0.0.1:27017/lost-wire')
  .then(async () => {
    await Message.deleteMany({});
    console.log('All messages deleted successfully!');
    mongoose.connection.close();
  })
  .catch((err) => console.error(err));