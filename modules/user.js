// Database design for User

var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var uniqueValidator = require("mongoose-unique-validator");
var bcrypt = require("bcrypt");


//user - username,password
var userSchema = new mongoose.Schema({
  username: Number,
  passwordHash: String,
  name: String,
  age: Number,
  gender: String,
  date: Date,
  userType: String,
  email: String,
  uid: {
    type: Number,
    default: 000000
  },
  location: {
    state: String,
    city: String,
    loc: {
      type: { type: String },
      coordinates: [Number]
    }
  },
  address: String,
  transactions: [
    {
      transactionID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction"
      }
    }
  ],
  login: {
    attempt: {
      type: Number,
      default: 1
    },
    time: Date
  }
})

userSchema.plugin(uniqueValidator);

userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.passwordHash);
};

userSchema.virtual("password").set(function (value) {
  this.passwordHash = bcrypt.hashSync(value, 12);
});

userSchema.index({ "location.loc": "2dsphere" });

module.exports = mongoose.model("user", userSchema);

