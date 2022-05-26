const router = require('express').Router()
const { addCard, getCard } = require('../../controllers/card')

router.post('/card', addCard)
router.get('/card/:regNumber', getCard)

module.exports = router;