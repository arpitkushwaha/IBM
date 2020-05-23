// Database design for producers

var mongoose = require("mongoose");

var counterSchema = new mongoose.Schema({
    count: {
        type:Number,
        default:000000
    }
})

module.exports = mongoose.model("counter",counterSchema);
