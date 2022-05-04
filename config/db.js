const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI)
.then(data => console.log(`Database connected ${data}`))
.catch(err => console.log(`Database ${err}`))