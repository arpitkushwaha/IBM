require('dotenv').config({ path: __dirname + '/.env' })
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var uniqueValidator = require("mongoose-unique-validator");
var bcrypt = require("bcrypt");
var compression = require('compression');
const helmet = require('helmet');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// compress all responses
app.use(compression());
app.use(helmet());


//flash message 
var flash = require('connect-flash');
app.use(flash());

//Passport for authentication
var passport = require('passport');
var passportLocal = require('passport-local');

//For Persistent-login
var MongoDBStore = require('connect-mongodb-session')(session);

//**************************************************
//Database Stuff
//**************************************************
//mongoose
var mongoose = require("mongoose");
mongoose.connect(process.env.MongoServer, { useNewUrlParser: true })
  .then((us) => console.log('Connection to MongoDB successful'))
  .catch((err) => console.error(err));
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

//User
var user = require("./modules/user");


//**************************************************
//Authentication
//**************************************************
// =================== Express Session ========================
var store = new MongoDBStore({
  uri: process.env.MongoServer,
  collection: 'mySessions'
});

// Catch errors
store.on('error', function (error) {
  console.log(error);
});

app.use(session({
  secret: process.env.expKey,
  store: store,
  saveUninitialized: false,
  resave: false,
  cookie: { maxAge: -1 },
  unset: 'destroy'
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  user.findById(id, function (err, user) {
    done(err, user);
  });
});

var local = new passportLocal((username, password, done) => {
  user.findOne({ username })
    .then(user => {
      if (!user || !user.validPassword(password)) {
        done(null, false, { message: "Invalid username/password" });
      } else {
        done(null, user);
      }
    })
    .catch(e => done(e));
});
passport.use("local", local);

//**************************************************
//MiddleWare
//**************************************************

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.Ferror = req.flash("error");
  res.locals.Fsuccess = req.flash("success");
  next();
})


//**************************************************
//Routes
//**************************************************
var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');


app.use('/', indexRouter);
app.use('/', authRouter);

//default
app.get("*", function (req, res) {
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    res.send({ "error": "Invalid Route" })
  } else {
    res.render("error");
  }
})



//**************************************************
//Start Server
//*************************************************

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
  res.send("sorry")
});

module.exports = app;
