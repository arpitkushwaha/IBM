var express = require("express");
var router = express.Router();
var msgService = require(process.env.msgApiName)(process.env.msgAuthKey, process.env.msgPara1, process.env.msgPara2);

//**************************************************
//Database Models
//**************************************************

var passport = require("passport");
var user = require("../modules/user");
var counter = require("../modules/counter");
var otp = require("../modules/otp");
var transaction = require("../modules/transaction");


//**************************************************
//Middlewares
//**************************************************


function genOTP() {
    OTP = Math.floor(Math.random() * 10000);
    if (OTP < 999) {
        return genOTP();
    }
    else {
        return OTP;
    }
}

function genID(usrID) {
    counter.findOne({}, function (err, foundvalue) {
        if (foundvalue) {
            alpha = foundvalue.count;
            foundvalue.count += 1;
            foundvalue.save();
            user.findByIdAndUpdate(usrID, { uid: alpha }).exec();
        } else {
            counter.create({ count: 100000 }, function (err, counterCreated) {
                if (err) {
                    console.log(err + " Error in creating first counter");
                }
                else {
                    alpha = counterCreated.count;
                    user.findByIdAndUpdate(usrID, { uid: alpha }).exec();
                }
            });
        }
    })
}


//Check if user is Authenticated to enter a page 
function isLogged(req, res, next) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        const auth = { login: 'Anndata', password: 'Anndata' } // change this

        // parse login and password from headers
        const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
        const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

        // Verify login and password are set and correct
        if (login && password && login === auth.login && password === auth.password) {
            // Access granted...
            return next()
        }
        else {
            res.status(200).send({ "error": "Access denied" })
        }

    } else {
        if (req.isAuthenticated()) {
            return next();
        }
        else {
            req.flash("error", "Please LOGIN first!");
            res.redirect("/login");
        }
    }
}

//Check if user is authenticated and still trying to access login/registration page
function isAlreadyLogged(req, res, next) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        const auth = { login: 'Anndata', password: 'Anndata' } // change this

        // parse login and password from headers
        const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
        const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

        // Verify login and password are set and correct
        if (login && password && login === auth.login && password === auth.password) {
            // Access granted...
            return next()
        }
        else {
            res.status(200).send({ "error": "Access denied" })
        }
    } else {
        if (req.isAuthenticated()) {
            req.flash("success", "You are Already LOGGED IN!");
            res.redirect("/dashboard")
        } else {
            return next();
        }
    }
}

function checkAttempts(req, res, next) {

    at = new Date(Date.now() - 30 * 60 * 1000);

    user.findOne({ username: req.body.username }, function (err, userFound) {
        if (err || !userFound) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                res.send({ "error": "Invalid credentials" })
            } else {
                res.render("auth/login", { Ferror: "Invalid credentials" });
            }
        }
        else {
            if (at.getTime() > userFound.login.time) {
                userFound.login.attempt = 1
                userFound.login.time = Date();
                userFound.save();
                return next();
            }
            else if (userFound.login.attempt < 5) {
                userFound.login.attempt += 1
                userFound.login.time = Date();
                userFound.save();
                return next();
            }
            else {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "Too many attempts! Try Again after 30 minutes" })
                } else {
                    res.render("auth/login", { Ferror: "Too many attempts! Try Again after 30 minutes" });
                }
            }
        }
    });
}


//**************************************************
//Authentication Routes
//**************************************************

//LOGIN Form
router.get("/login", isAlreadyLogged, function (req, res) {
    res.render("auth/login", { title: 'Login' });
})

//LOGIN backend
router.post("/login", isAlreadyLogged, checkAttempts, passport.authenticate("local", {
    failWithError: true
}), function (req, res) {
    user.findOne({ username: req.body.username }, function (err, userFound) {
        userFound.login.attempt = 1;
        userFound.save();
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "success": "Successfully logged in", CurrentUser: userFound })
        } else {
            if (req.body.remember) {
                req.session.cookie.originalMaxAge = 14 * 24 * 60 * 60 * 1000 // Expires in 14 day
                res.redirect('/dashboard');
            } else {
                req.session.cookie.expires = false;
                res.redirect('/dashboard');
            }
        }
    })
}, function (err, req, res, next) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.send({ "error": "Invalid credentials" })
    } else {
        res.render("auth/login", { Ferror: "Invalid Credentials" });
    }

})


//Registration Starts
//PHONE Number Route frontend
router.get("/register", isAlreadyLogged, function (req, res) {
    res.render("auth/phone");
})

//Phone Number Backend adn directed to opt
router.post("/register/phone", isAlreadyLogged, function (req, res) {
    if (!req.body.phNumber) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.render("auth/phone", { Ferror: "Please check your number again!" });
        }

    }
    else {
        user.findOne({ username: req.body.phNumber }, function (err, userFound) {
            if (err || userFound) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "User already registered" })
                } else {
                    res.render("auth/phone", { Ferror: "User already exists with this number!" });
                }
            }
            else {
                var key;
                otp.findOne({ number: req.body.phNumber }, function (err, otpFound) {
                    if (err || !(otpFound)) {
                        key = genOTP();
                        otp.create({ number: req.body.phNumber, otp: key, time: Date(), attempt: 1 }, function (error, otpCreated) {
                            if (error) {
                                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                    res.send({ "error": "Phone number not correct" })
                                } else {
                                    res.render("auth/phone", { Ferror: "Please check your number again!" });
                                }
                            }
                            else {
                                //res.render("auth/otp", { phNumber: req.body.phNumber });
                                msgService.send(req.body.phNumber, "Your OTP for Anndata registration is: " + key, function (err, response) {
                                    if (err) {
                                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                            res.send({ "error": "Phone number not correct" })
                                        } else {
                                            res.render("auth/phone", { Ferror: "Please check your number again!" });
                                        }
                                    }
                                    else {
                                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                            res.send({ "success": "OTP sent to your Number" })
                                        } else {
                                            res.render("auth/otp", { phNumber: req.body.phNumber });
                                        }
                                    }
                                });
                            }
                        })
                    }
                    else {
                        dt = new Date(Date.now() - 3 * 60 * 1000);
                        at = new Date(Date.now() - 30 * 60 * 1000);
                        if (at.getTime() > otpFound.time) {
                            key = genOTP();
                            otpFound.otp = key;
                            otpFound.save();
                            //res.render("auth/otp", { phNumber: req.body.phNumber });
                            msgService.send(req.body.phNumber, "Your OTP for Anndata registration is: " + key, function (err, response) {
                                if (err) {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "error": "Phone number not correct" })
                                    } else {
                                        res.render("auth/phone", { Ferror: "Please check your number again!" });
                                    }
                                }
                                else {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "success": "OTP sent to your Number" })
                                    } else {
                                        res.render("auth/otp", { phNumber: req.body.phNumber });
                                    }
                                }
                            });
                        }
                        else if (dt.getTime() > otpFound.time && otpFound.attempt <= 5) {
                            key = genOTP();
                            otpFound.otp = key;
                            otpFound.save();
                            //res.render("auth/otp", { phNumber: req.body.phNumber });
                            msgService.send(req.body.phNumber, "Your OTP for Anndata registration is: " + key, function (err, response) {
                                if (err) {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "error": "Phone number not correct" })
                                    } else {
                                        res.render("auth/phone", { Ferror: "Please check your number again!" });
                                    }
                                }
                                else {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "success": "OTP sent to your Number" })
                                    } else {
                                        res.render("auth/otp", { phNumber: req.body.phNumber });
                                    }
                                }
                            });
                        }
                        else if (otpFound.attempt > 5) {
                            //res.render("auth/otp", { phNumber: req.body.phNumber });
                            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                res.send({ "error": "Limit Reached" })
                            } else {
                                res.render("auth/phone", { Ferror: "Too many attempts! Try Again after 30 minutes" });
                            }
                        }
                        else {
                            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                res.send({ "success": "OTP sent to your Number" })
                            } else {
                                res.render("auth/otp", { phNumber: req.body.phNumber });
                            }
                        }
                    }
                })
            }
        })
    }
})

//valid OTP and direct to form
router.post("/register/otp", isAlreadyLogged, function (req, res) {
    if (!req.body.phNumber || (!req.body.O1 && !(req.body.O1 == 0)) || (!req.body.O2 && !(req.body.O2 == 0)) || (!req.body.O3 && !(req.body.O3 == 0)) || (!req.body.O4 && !(req.body.O4 == 0))) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {
        var EnteredOtp = (req.body.O1 * 1000) + (req.body.O2 * 100) + (req.body.O3 * 10) + (req.body.O4 * 1);
        otp.findOne({ number: req.body.phNumber }, function (err, otpFound) {
            if (err || !(otpFound)) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "OTP not found" })
                } else {
                    res.redirect("/");
                }
            }
            else {
                at = new Date(Date.now() - 30 * 60 * 1000);

                if (at.getTime() > otpFound.time) {
                    if (otpFound.otp == EnteredOtp) {
                        otpFound.valid = true;
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "success": "OTP is correct" })
                        } else {
                            res.render("auth/register", { phNumber: req.body.phNumber })
                        }
                    }
                    else {
                        otpFound.attempt = 1;
                        otpFound.time = Date();
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "error": "OTP is incorrect" })
                        } else {
                            res.render("auth/otp", { phNumber: req.body.phNumber, Ferror: "Wrong OTP. Try Again!" })
                        }
                    }
                }

                else {

                    if (otpFound.otp == EnteredOtp && otpFound.attempt <= 5) {
                        otpFound.valid = true;
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "success": "OTP is correct" })
                        } else {
                            res.render("auth/register", { phNumber: req.body.phNumber })
                        }
                    }

                    else if (otpFound.attempt <= 5) {
                        otpFound.attempt += 1;
                        otpFound.time = Date();
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "error": "Wrong OTP. Try Again!" })
                        } else {
                            res.render("auth/otp", { phNumber: req.body.phNumber, Ferror: "Wrong OTP. Try Again!" })
                        }
                    }

                    else {
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "error": "Limit reached! Try again after 30 minutes" })
                        } else {
                            res.render("auth/phone", { phNumber: req.body.phNumber, Ferror: "Limit reached! Try again after 30 minutes" })
                        }
                    }

                }
            }
        })
    }
})


router.post("/register", isAlreadyLogged, function (req, res) {

    if (!req.body.firstname || !req.body.lastname || !req.body.username || !req.body.password || !req.body.age || !req.body.gender || !req.body.userType || !req.body.state || !req.body.city || !req.body.lon || !req.body.lat || !req.body.address) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {

        otp.findOne({ number: req.body.username }, function (err, otpFound) {
            if (err || !(otpFound)) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "OTP not verified" })
                } else {
                    res.render("auth/register", { phNumber: req.body.username, Ferror: "OTP not verified" })
                }
            }
            else {

                if (otpFound.valid == true) {
                    var User = new user({
                        name: req.body.firstname + " " + req.body.lastname,
                        username: req.body.username,
                        password: req.body.password,
                        age: req.body.age,
                        gender: req.body.gender,
                        userType: req.body.userType,
                        date: Date(),
                        location: {
                            state: req.body.state,
                            city: req.body.city,
                            loc: {
                                "type": "Point",
                                "coordinates": [req.body.lon, req.body.lat]
                            }
                        },
                        address: req.body.address
                    })

                    user.findOne({ username: req.body.username }, function (err, userFound) {
                        if (err || !(userFound)) {

                            user.create(User, function (err, userCreated) {
                                if (err) {

                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "error": "Error registering user" })
                                    } else {
                                        res.render("auth/register", { phNumber: req.body.username, Ferror: err.message })
                                    }
                                }
                                else {

                                    otpFound.valid = false;
                                    otpFound.save();
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        user.findOne({ username: req.body.username }, function (err, userFound) {
                                            genID(userCreated._id);
                                            res.send({ "success": "User successfully registered!", CurrentUser: userFound })
                                        })
                                    } else {
                                        genID(userCreated._id);
                                        req.session.cookie.expires = false;
                                        passport.authenticate("local")(req, res, function () {
                                            res.redirect("/dashboard");
                                        })
                                    }
                                }
                            })
                        }
                        else {

                            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                res.send({ "error": "User already registered!" })
                            } else {
                                res.render("auth/register", { phNumber: req.body.username, Ferror: "User already registered with this number!" })
                            }
                        }
                    })

                }
                else {

                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        res.send({ "error": "OTP not verified" })
                    } else {
                        res.render("auth/register", { phNumber: req.body.username, Ferror: "OTP not verified" })
                    }
                }
            }
        });

    }
});


//LOGOUT
router.get("/logout", isLogged, function (req, res) {
    req.logout();
    res.redirect("/");
})


//User profile edit
router.get("/dashboard/edit", isLogged, function (req, res) {
    res.render("auth/edit");
})


//User edit a profile
router.post("/dashboard/edit", isLogged, function (req, res) {
    if (!req.body.name || !req.body.age || !req.body.gender || !req.body.state || !req.body.city || !req.body.address || !req.body.id ) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {
        user.findById(req.body.id, function (err, userUpdated) {
            //Create a new User and delete no transactions
            if (err || !(userUpdated)) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "Couldn't update profile" })
                } else {
                    req.flash('error', "Couldn't update profile")
                    res.redirect('/dashboard')
                }
            } else {
                userUpdated.name = req.body.name;
                userUpdated.gender = req.body.gender;
                userUpdated.age = req.body.age;
                userUpdated.address = req.body.address;
                userUpdated.email = req.body.email;
                userUpdated.location.state = req.body.state;
                userUpdated.location.city = req.body.city;
                userUpdated.save();
            }
        });
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "success": "User Updated" })
        } else {
            res.redirect("/");
        }
    }
})

//User edit password for profile
router.post("/dashboard/password", isLogged, function (req, res) {
    if (!req.body.password || !req.body.id) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {
        user.findById(req.body.id, function (err, userUpdated) {
            //Create a new User and delete no transactions
            if (err || !(userUpdated)) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "Couldn't update profile" })
                } else {
                    req.flash('error', "Couldn't update profile")
                    res.redirect('/dashboard')
                }
            } else {
                userUpdated.password = req.body.password;
                userUpdated.save();
            }
        });
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "success": "Password Updated" })
        } else {
            res.redirect("/logout")
        }
    }
})


//Delete an Account
router.post("/dashboard/delete", isLogged, function (req, res) {
    if (!req.body.userType || !req.body.id) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {
        if (req.body.userType == "consumer") {
            transaction.find({ "consumer.user": req.body.id }, function (err, transactionsFound) {
                transactionsFound.forEach(function (transactionFound) {
                    user.updateOne({ _id: transactionFound.donor.user }, { "$pull": { "transactions": { "transactionID": transactionFound._id } } }, { safe: true, multi: true }, function (err, donorUpdated) {
                        transaction.findByIdAndDelete(transactionFound.id).exec();
                    });
                });
                user.findByIdAndDelete(req.body.id).exec();
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "success": "User Deleted" })
                } else {
                    res.redirect("/logout")
                }
            })
        }
        else if (req.body.userType == "donor") {
            transaction.find({ "donor.user": req.body.id }, function (err, transactionsFound) {
                transactionsFound.forEach(function (transactionFound) {
                    transactionFound.status = "Requested";
                    transactionFound.donor.user = null;
                    transactionFound.donor.desc = null;
                    transactionFound.donor.loc.coordinates = [];
                    transactionFound.dropPoint.loc.coordinates = [];
                    transactionFound.save();
                });
            });
            user.findByIdAndDelete(req.body.id).exec();
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                res.send({ "success": "User Deleted" })
            } else {
                res.redirect("/logout")
            }
        }
        else {
            user.findByIdAndDelete(req.body.id).exec();
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                res.send({ "success": "User Deleted" })
            } else {
                res.redirect("/logout")
            }
        }
    }
});


//Password reset starts Starts
//PHONE Number Route frontend
router.get("/password", isAlreadyLogged, function (req, res) {
    res.render("password/phone");
})

//Phone Number Backend adn directed to opt
router.post("/password/phone", isAlreadyLogged, function (req, res) {
    if (!req.body.phNumber) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {
        user.findOne({ username: req.body.phNumber }, function (err, userFound) {
            if (err || !(userFound)) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "User does not exists" })
                } else {
                    res.render("password/phone", { Ferror: "User does not exists" });
                }
            }
            else {
                var key;
                otp.findOne({ number: req.body.phNumber }, function (err, otpFound) {
                    if (err || !(otpFound)) {
                        key = genOTP();
                        otp.create({ number: req.body.phNumber, otp: key, time: Date() }, function (error, otpCreated) {
                            if (error) {
                                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                    res.send({ "error": "Check your number again number!!" })
                                } else {
                                    res.render("password/phone", { Ferror: "Check your number again number!!" });
                                }
                            }
                            else {
                                //res.render("password/otp", { phNumber: req.body.phNumber });
                                msgService.send(req.body.phNumber, "Your OTP for Anndata registration is: " + key, function (err, response) {
                                    if (err) {
                                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                            res.send({ "error": "Check your number again number!!" })
                                        } else {
                                            res.render("password/phone", { Ferror: "Check your number again number!!" });
                                        }
                                    }
                                    else {
                                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                            res.send({ "success": "OTP sent to your Number" })
                                        } else {
                                            res.render("password/otp", { phNumber: req.body.phNumber });
                                        }
                                    }
                                });
                            }
                        })
                    }
                    else {
                        dt = new Date(Date.now() - 3 * 60 * 1000);
                        at = new Date(Date.now() - 30 * 60 * 1000);

                        if (at.getTime() > otpFound.time) {
                            key = genOTP();
                            otpFound.otp = key;
                            otpFound.save();
                            //res.render("auth/otp", { phNumber: req.body.phNumber });
                            msgService.send(req.body.phNumber, "Your OTP for Anndata registration is: " + key, function (err, response) {
                                if (err) {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "error": "Check your number again number!!" })
                                    } else {
                                        res.render("password/phone", { Ferror: "Check your number again number!!" });
                                    }
                                }
                                else {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "success": "OTP sent to your Number" })
                                    } else {
                                        res.render("password/otp", { phNumber: req.body.phNumber });
                                    }
                                }
                            });
                        }
                        else if (dt.getTime() > otpFound.time && otpFound.attempt <= 5) {
                            key = genOTP();
                            otpFound.otp = key;
                            otpFound.save();
                            //res.render("auth/otp", { phNumber: req.body.phNumber });
                            msgService.send(req.body.phNumber, "Your OTP for Anndata registration is: " + key, function (err, response) {
                                if (err) {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "error": "Check your number again number!!" })
                                    } else {
                                        res.render("password/phone", { Ferror: "Check your number again number!!" });
                                    }
                                }
                                else {
                                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                        res.send({ "success": "OTP sent to your Number" })
                                    } else {
                                        res.render("password/otp", { phNumber: req.body.phNumber });
                                    }
                                }
                            });
                        }
                        else if (otpFound.attempt > 5) {
                            //res.render("auth/otp", { phNumber: req.body.phNumber });
                            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                res.send({ "error": "Limit Reached" })
                            } else {
                                res.render("password/phone", { Ferror: "Too many attempts! Try Again after 30 minutes" });
                            }
                        }
                        else {
                            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                res.send({ "success": "OTP sent to your Number" })
                            } else {
                                res.render("password/otp", { phNumber: req.body.phNumber });
                            }
                        }
                    }
                })
            }
        })
    }
})

//valid OTP and direct to form
router.post("/password/otp", isAlreadyLogged, function (req, res) {
    if (!req.body.phNumber || (!req.body.O1 && !(req.body.O1 == 0)) || (!req.body.O2 && !(req.body.O2 == 0)) || (!req.body.O3 && !(req.body.O3 == 0)) || (!req.body.O4 && !(req.body.O4 == 0))) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {
        var EnteredOtp = (req.body.O1 * 1000) + (req.body.O2 * 100) + (req.body.O3 * 10) + (req.body.O4 * 1);
        otp.findOne({ number: req.body.phNumber }, function (err, otpFound) {
            if (err || !(otpFound)) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "OTP not correct" })
                } else {
                    res.render("/");
                }
            }

            else {
                at = new Date(Date.now() - 30 * 60 * 1000);

                if (at.getTime() > otpFound.time) {
                    if (otpFound.otp == EnteredOtp) {
                        otpFound.valid = true;
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "success": "OTP is correct" })
                        } else {
                            res.render("password/forgot", { phNumber: req.body.phNumber });
                        }
                    }
                    else {
                        otpFound.attempt = 1;
                        otpFound.time = Date();
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "error": "OTP not correct" })
                        } else {
                            res.render("password/otp", { phNumber: req.body.phNumber, Ferror: "Wrong OTP. Try Again!" });
                        }
                    }
                }

                else {

                    if (otpFound.otp == EnteredOtp && otpFound.attempt <= 5) {
                        otpFound.valid = true;
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "success": "OTP is correct" })
                        } else {
                            res.render("password/forgot", { phNumber: req.body.phNumber });
                        }
                    }

                    else if (otpFound.attempt <= 5) {
                        otpFound.attempt += 1;
                        otpFound.time = Date();
                        otpFound.save();
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "error": "OTP not correct" })
                        } else {
                            res.render("password/otp", { phNumber: req.body.phNumber, Ferror: "Wrong OTP. Try Again!" });
                        }
                    }

                    else {
                        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                            res.send({ "error": "Limit reached! Try again after 30 minutes" })
                        } else {
                            res.render("password/phone", { phNumber: req.body.phNumber, Ferror: "Limit reached! Try again after 30 minutes" })
                        }
                    }

                }
            }
        })
    }
})


router.post("/password", isAlreadyLogged, function (req, res) {
    if (!req.body.username || !req.body.password) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.send({ "error": "Missing Parameters" })
        } else {
            res.redirect("/");
        }
    }
    else {
        otp.findOne({ number: req.body.username }, function (err, otpFound) {
            if (err || !(otpFound)) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    res.send({ "error": "OTP not verified" })
                } else {
                    res.render("auth/register", { phNumber: req.body.username, Ferror: "OTP not verified" })
                }
            }
            else {
                if (otpFound.valid == true) {
                    user.findOne({ username: req.body.username }, function (err, userFound) {
                        if (err || !(userFound)) {
                            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                res.send({ "error": "Error in updating password" })
                            } else {
                                res.render("password/forgot", { phNumber: req.body.username, Ferror: err.message });
                            }
                        }
                        else {
                            otpFound.valid = false;
                            otpFound.save();
                            if (!userFound.uid) { genID(userFound._id) }
                            userFound.password = req.body.password;
                            userFound.save();
                            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                                res.send({ "success": "Password changed succesfully" })
                            } else {
                                res.render("auth/login", { Fsuccess: "Please login to continue" });
                            }
                        }
                    })
                }
                else {
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        res.send({ "error": "OTP not verified" })
                    } else {
                        res.render("phone/register", { phNumber: req.body.username, Ferror: "OTP not verified" })
                    }
                }
            }
        })
    }
});

module.exports = router;
