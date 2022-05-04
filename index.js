const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express();

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
