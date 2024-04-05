const express= require('express');
const app= express();
const path= require('path');
const session= require('express-session');
const ejsMate= require('ejs-mate');
const User= require('./models/userschema.js');
const passport= require('passport');
const LocalStrategy= require('passport-local');
const MongoDBStore= require("connect-mongo");
const mongoose= require('mongoose');
const dbUrl= 'mongodb://localhost:27017/helpdesk';
const secret= 'idontknow';
const {isLoggedIn}= require('./middleware.js');

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(dbUrl);

const db= mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", ()=>{
    console.log("Database Connected");
});

const store = new MongoDBStore({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24*60*60 //time is in seconds
});

store.on('error', function(err){
    console.log("Error!", err);
})

const sessionConfig= {
    store,
    name: 'emotionanalytics',
    httpOnly: true,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + (1000*60*60*24*7),
        maxAge: (1000*60*60*24*7)
    }
}

app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new LocalStrategy(User.authenticate()));

app.get('/', (req, res)=>{
    res.redirect('/register');
})

app.get('/register', (req, res)=>{
    res.render('templates/register.ejs');
})

app.post('/register', async(req, res)=>{
    try{
        const {fullname, username, email, phone, post, password}= req.body;
        const u = new User({fullname, username, email, phone, post});
        const newUser= await User.register(u, password);
        res.redirect('/home');
    }catch(error){
        console.log('ERROR', error)
        res.redirect('/register');
    }
})

app.get('/login', (req, res)=>{
    res.render('templates/login.ejs');
})

app.post('/login', passport.authenticate('local', {failureRedirect: '/login'}), async(req, res)=>{
   const data= req.body;
   const u= await User.find({username: data.username})

   res.redirect('/home');
})

app.get('/home', isLoggedIn, (req, res)=>{
    res.render('templates/home.ejs')
})

app.listen(8080, ()=>{
    console.log("server started successfully on port 8080");
})