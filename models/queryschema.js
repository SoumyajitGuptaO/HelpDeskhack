const mongoose = require('mongoose');

const querySchema= mongoose.Schema({
    title: String,
    body: String,
    date: String,
    author: String,
    status: String
})

module.exports= mongoose.model('Query', querySchema);