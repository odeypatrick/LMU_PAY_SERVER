const router = require('express').Router();
const { signup, login, isAuthenticated, getUserData } = require('../../controllers/auth')

router.post('/signup', signup)
router.post('/login', login)
router.get('/user', isAuthenticated, getUserData)


module.exports = router;