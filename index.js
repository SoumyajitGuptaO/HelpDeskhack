if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express= require('express');
const app= express();
const path= require('path');
const multer= require('multer');
const {storage} = require('./cloudinary/cloudinary.js');
const upload= multer({storage});
const session= require('express-session');
const ejsMate= require('ejs-mate');
const User= require('./models/userschema.js');
const Query= require('./models/queryschema.js')
const passport= require('passport');
const LocalStrategy= require('passport-local');
const MongoDBStore= require("connect-mongo");
const mongoose= require('mongoose');
//const dbUrl= 'mongodb://localhost:27017/helpdesk';
const dbUrl= process.env.DB_URL;
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

app.use((req, res, next)=>{
    res.locals.currentUser= req.user;
    next();
});

app.get('/', (req, res)=>{
    res.redirect('/login');
})

app.get('/register', (req, res)=>{
    res.render('templates/register.ejs');
})

app.post('/register', upload.array('image'), async(req, res)=>{
    try{
        const {fullname, username, email, phone, post, address, city, country, password}= req.body;
        const u = new User({fullname, username, email, phone, post, address, city, country});
        u.image =req.files.map(f=>({url:f.path, filename: f.filename}));
        const newUser= await User.register(u, password);
        req.login(newUser, (err)=>
        {
            if(err) return next(err);
            res.redirect('/profile');
        });
    }catch(error){
        console.log('ERROR', error)
        res.redirect('/register');
    }
})

app.get('/login', (req, res)=>{
    res.render('templates/login.ejs');
})

app.get('/logout', (req, res)=>{
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/login'}), async(req, res)=>{
   res.redirect('/profile');
})

app.get('/profile', isLoggedIn, (req, res)=>{
    const user= req.user;
    res.render('templates/profile.ejs', {user});
})

app.get('/dashboard', isLoggedIn, async(req, res)=>{
    const user= req.user;
    const allqueries= await Query.find({});
    const resolved= await Query.find({status: 'Resolved'});
    var Q= await Query.find({})
    const arr= [allqueries.length, resolved.length]
    res.render('templates/dashboard.ejs', {user, arr, Q})
})

app.get('/queries', isLoggedIn, async(req, res)=>{
    const user= req.user;
    if(user.post=="Employee"){
        var Q= await Query.find({author: user.username});
    }else if(user.post=="Legal Team Member"){
        var Q= await Query.find({assignedto: user._id})
    }else{
        var Q= await Query.find({});
    }

    res.render('templates/queries.ejs', {user, Q});
})

app.get('/raiseticket', isLoggedIn, (req, res)=>{
    const user= req.user;
    res.render('templates/raiseticket.ejs', {user});
})

app.post('/raiseticket', isLoggedIn, async(req, res)=>{
    var today = new Date();

    var monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'
    ];
    var day = today.getDate();
    var monthIndex = today.getMonth();
    var year = today.getFullYear();
    var formattedDate = day + '-' + monthNames[monthIndex] + '-' + year;

    const user= req.user;
    const q= req.body;
    q.date= formattedDate;
    q.author= user.username;
    q.status= "Pending";

    const query= new Query(q);
    await query.save();

    user.queries.push(query);
    await user.save();

    res.redirect('/queries');
})

app.get('/:id', isLoggedIn, async(req, res)=>{
    const user= req.user;
    const users= await User.find({post: "Legal Team Member"});
    const id= req.params.id;

    var query_id;

    if(id.includes('resolve')){
        query_id= id.replace('resolve_', '');

        var q= await Query.findById(query_id);
        var u= await User.find({username: q.author})

        res.render('templates/viewquery.ejs', {user, q, u, users});
    }else if(id.includes('resolution')){
        query_id= id.replace('resolution_', '');

        var q= await Query.findById(query_id);
        var u= await User.find({username: q.author})

        var r= await User.findById(q.assignedto);
        const resolvedby= r.fullname;
        res.render('templates/viewquery.ejs', {user, q, u, resolvedby});
    }else{
        var q= await Query.findById(id);
        var u= await User.find({username: q.author})

        res.render('templates/viewquery.ejs', {user, q, u, users});
    }
})

app.post('/:id', isLoggedIn, async(req, res)=>{
    const user= req.user;

    if(user.post=="Admin"){
        const id= req.params.id.toString();

        var query_id='';
        var assign_id='';

        var idx;

        for(let i=0; i<id.length; i++){
            if(id[i]!='_'){
                query_id+=id[i];
            }else{
                idx=i;
                break;
            }
        }

        for(let i=idx+1; i<id.length; i++){
            assign_id+=id[i];
        }

        console.log({query_id, assign_id})

        const q= await Query.findById(query_id);
        q.status= 'Assigned';

        const u= await User.findById(assign_id);
        u.queries.push(q);

        q.assignedto= assign_id;

        u.save();
        q.save();

        res.redirect('/dashboard')
    }else if(user.post="Legal Team Member"){
        const id= req.params.id.toString();

        var q= id.replace('resolution_', '');
        const quer= await Query.findById(q);
        const data= req.body;
        quer.resolution= data.body;
        quer.status= "Resolved";
        quer.save();

        res.redirect('/queries');
    }
})

app.listen(8080, ()=>{
    console.log("server started successfully on port 8080");
})
