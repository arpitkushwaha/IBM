// Database design for transaction

var mongoose = require("mongoose");

var transactionSchema = new mongoose.Schema({
    time: Date,
    donor: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        },
        loc: {
            type: { type: String },
            coordinates: [Number],
        }
    },
    consumer: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        },
        loc: {
            type: { type: String },
            coordinates: [Number],
        },
        gender:{
            type:String,
            default:"user"
        },
        uid:{
            type:Number,
            default:0
        }
    },
    dropPoint: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        },
        loc: {
            type: { type: String },
            coordinates: [Number],
        },
        desc: {
            type:String,
            default:"Drop-Point"
        },
        contact: Number
    },
    status: String,
    matchKey: Number,
    quantity: {
        adult: Number,
        child: Number
    },
    slot: Number,
    type: String
})

transactionSchema.index({ "consumer.loc": "2dsphere" });

module.exports = mongoose.model("transaction", transactionSchema);
