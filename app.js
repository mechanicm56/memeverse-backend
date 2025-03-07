require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const Routes = require('./routes');

// configure database 
mongoose.connect(`${process.env.MONGO_CONNECTION}/${process.env.MONGODB_NAME}`)
.then(() => [
    console.log("Database connected successfully")
])
.catch(err => {
    console.log("DB Connection Error: " + err)
})

app.use('/public' ,express.static('public'));
app.use(express.json({ limit: '5mb' }))
app.use(cors());
app.use(express.static('public'))

// routes
app.use('/api', Routes);

app.listen(process.env.PORT, () => {
    console.log("SERVER RUNNING ON PORT: " + process.env.PORT)
})