const mongoose= require('mongoose');
const Schema= mongoose.Schema;
const passportLocalMongoose= require('passport-local-mongoose');

const userschema= new Schema({
    fullname: String,
    username: String,
    email: String,
    phone: Number,
    post: String
});

userschema.plugin(passportLocalMongoose);

module.exports=mongoose.model('User',userschema);