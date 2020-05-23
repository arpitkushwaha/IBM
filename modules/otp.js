var mongoose = require("mongoose");

var otpSchema = new mongoose.Schema({
    number: Number,
    otp: Number,
    time: Date,
    attempt: {
        type: Number,
        default: 1
    },
    valid: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model("otp", otpSchema);
