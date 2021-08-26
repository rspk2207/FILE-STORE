const express = require('express');
const path = require('path');
const User = require('./models/user');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const {google} = require('googleapis');
const fs = require('fs');
const upload = require('express-fileupload');
const CLIENT_ID = '985561057953-r6srkjtdl18endt2k9o8ab5berjrqe9s.apps.googleusercontent.com';
const CLIENT_SECRET = 'mxLT7gwQZK4Cq5wuyP5CPMsB';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04wgaSngLFViSCgYIARAAGAQSNwF-L9IrSBU-8bpJiMr721lhgaY6q0usMy54KmBtiVIds2WxNs6TnYgCmNHUYl48g9pnlRISUKw';
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oauth2Client.setCredentials({refresh_token: REFRESH_TOKEN});
const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
})
mongoose.connect('mongodb://Localhost:27017/onsites3',{ useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
app.use(upload());

require('./models/passport')(passport);
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: "Welcome to your workspace",
    resave: true,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug');
app.get('/',(req, res) => {
    res.render('index');
});

app.get('/registration',(req,res) =>{
    res.render('registration');
});
app.get('/login',(req,res) =>{
    res.render('login');
});
app.post('/registration',async (req,res) =>{
    let errors = [];
    let rname= req.body.name; 
    let rusername= req.body.username;
    let rpassword= req.body.password;
    if(!rname || !rusername || !rpassword)
    {
        errors.push({msg: 'please fill in all fields'});
        res.redirect('/registration');
    }
    if(errors.length>0)
    {
        res.render('registration',errors,rname,rusername,rpassword);
    }
    else
    {
        await User.findOne({username: rusername})
            .then( async (user)=>{
            if(user)
            res.render('registration',errors,rname,rusername,rpassword);
            else
            {
                let newUser = new User({
                    name: rname,
                    username: rusername,
                    password: rpassword,
                    filecount: 0
                });

                await bcrypt.genSalt(10, async (err,salt)=>{
                    bcrypt.hash(newUser.password, salt, async (err, hash) => {
                        if (err){
                        console.log(newUser.password);
                        console.log(salt);
                        console.log(err);
                        }
                        else{
                        newUser.password = hash;
                        await newUser.save()
                            .then(async (user) => {
                                res.redirect('/login');
                            })
                            .catch(err => console.log(err));
                    }})
                })
            }
        })
        .catch(err=>console.log(err));
    }
});
app.post('/login', async (req,res,next) =>{
    await passport.authenticate("local", {
          successRedirect: '/filink',
          failureRedirect: '/login'
    })(req,res,next);
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});
function loggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}
app.get('/filink',loggedIn,(req,res)=>{
    if(req.user.filecount<1)
    {
        res.render('filink',{user: req.user});
    }
    else
    {
        let stringy = JSON.stringify(req.user.filedata[req.user.filecount-1]);
        res.render('filink',{user: req.user, strdata: stringy});
    }
});
app.post('/fileup',loggedIn,async (req,res)=>{
    var fileup = req.files.file;
    console.log(fileup)
    var fname = fileup.name;
    console.log(fname);
    filePath = path.join(__dirname,'uploads',fname);
    console.log(filePath)
    fileup.mv(filePath,(err)=>{
        if(err)
        {
            res.send(err);
        }
        else
        {
            console.log("hope successful");
        }
    });
    const response = await drive.files.create({
        requestBody:{
            name: fname,
            mimeType: 'image/jpg'
        },
        media:{
            mimeType: 'image/jpg',
            body: fs.createReadStream(filePath)
        }
    });
    const fileId = response.data.id;
    await drive.permissions.create({
        fileId: fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    })
    const result = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink, webContentLink'
    })
    console.log(result.data);
    let srcsite = result.data.webContentLink;
    let tabsite = result.data.webViewLink;
    var array = {fname: fname, srcsite: srcsite, tabsite: tabsite};
    console.log(srcsite,tabsite,req.user.filecount);
    req.user.filedata.push(array);
    req.user.filecount++;
    req.user.markModified('filedata');
    req.user.save();
    res.redirect('/filink');
})
/*
async function uploadFile(req,res){
    try{
        const res = await drive.files.create({
            requestBody:{
                name: req.files.name,
                mimeType: 'image/jpg'
            },
            media:{
                mimeType: 'image/jpg',
            }
        })
    }
    catch(error){
        console.log(error.message);
    }
}
*/
app.listen(3000, () => {
    console.log('started on port 3000');
});