const mongoose = require("mongoose");

const cardSchema = mongoose.Schema({
    cardNumber: {
        required: true,
        trim: true,
        type: String,
        unique: true
    },
    cardHolder: {
        required: true,
        trim: true,
        type: String,
    },
    expiryMonth: String,
    expiryYear: String,
    cvv: String,
    cardType: {
        type: String,
        required: true
    },
    regNumber: {
        type: Number,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true })

module.exports = mongoose.model("Card", cardSchema);