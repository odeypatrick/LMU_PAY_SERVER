const Card = require('../models/Card')

// ADD CARD DETAILS
exports.addCard = (req, res) => {
    Card.create(req.body)
    .then(card => {
        if(card){
            res.status(200).json({ msg: "Card added successfully" })
        }
    })
}

exports.getCard = (req, res) => {
    Card.findOne({ regNumber: req.params.regNumber }).populate('user').exec()
    .then(card => res.status(200).json(card))
    .catch(err => res.status(500).json(err))
}