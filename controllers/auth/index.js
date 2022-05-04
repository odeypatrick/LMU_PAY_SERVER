const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const User = require('../../models/User')

exports.signup = (req, res) => {
    const { fullname, email, password } = req.body
    if (!email || !password || !fullname) {
        res.json({  success: false, msg: 'Enter all fields' })
    }
    else {
        User.findOne({ email }, (err, user) => {
            //check for server errors
            if(err) {
                return res.status(500).json({ success: false, error: "Something went wrong" })
            }
            
            // verify if email already exist
            if(user) {
                return res.status(401).json({ success: false, error: "Email Already Taken" })
            }
                //if every thing is fine. then create user
                const newUser = User(req.body);
                newUser.save(function (err, newUser) {
                    if (err) {
                        res.json({success: false, error: `Failed to save - ${err}`})
                    }
                    else {
                        res.json({success: true, msg: 'Successfully saved'})
                    }
                })
        })
    }
}

exports.login = (req, res) => {
    const { email, password } = req.body
    User.findOne({
        email
    }, function (err, user) {
        // Handle server errors
            if (err) return res.status(500).send({success: false, msg: 'Something went wrong'})
            // Check if user exists
            if (!user) return res.status(403).send({success: false, msg: 'Authentication Failed, User not found'})
            user.comparePassword(password, (err, isMatch) => {
                if (isMatch && !err) {
                    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.SECRET_KEY)
                    res.status(200).json({success: true, token: token, role: user.role, userId: user._id})
                }
                else {
                    return res.status(403).send({success: false, msg: 'Authentication failed, wrong password'})
                }
            })
    })
}

exports.getUserData = (req, res) => {
    User.findOne({ _id: req.user.userId }).exec()
    .then(user => {
        const { _id, name, email, role, profileImage, phone } = user
        res.status(200).json({
            _id,
            name,
            email,
            phone,
            profileImage,
            role
        })
    })
}

exports.isAuthenticated = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.sendStatus(401)

    // Verify Token
    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if(err) return res.sendStatus(403)
        req.user = user
        next()
    })
}