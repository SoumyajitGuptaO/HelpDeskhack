const mongoose= require('mongoose');
const Schema= mongoose.Schema;
const passportLocalMongoose= require('passport-local-mongoose');
const Query= require('./queryschema.js');

const userschema= new Schema({
    fullname: String,
    username: String,
    email: String,
    phone: Number,
    post: String,
    address: String,
    city: String,
    country: String,
    queries: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Query'
        }
    ]
});

userschema.plugin(passportLocalMongoose);

module.exports=mongoose.model('User',userschema);