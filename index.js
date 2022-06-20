const express = require('express')
require('dotenv').config()
const cors = require('cors')
const morgan = require('morgan')
require('./config/db')

const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('dev'))
app.use(cors())

// ROUTES
const userRoute = require('./routes/api/auth')
const cardRoute = require('./routes/api/card')
const IndexRoute = require('./routes/api/index')

app.use('/api', userRoute)
app.use('/api', cardRoute)
app.use('/api', IndexRoute)

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
