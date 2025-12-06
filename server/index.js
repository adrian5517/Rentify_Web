const path = require('path')
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 4000

// Basic middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
const uploadRoute = require('./routes/upload')
app.use('/api/upload', uploadRoute)

app.get('/', (req, res) => {
  res.json({ message: 'Rentify upload helper service running' })
})

app.listen(PORT, () => {
  console.log(`Upload helper listening on port ${PORT}`)
})
