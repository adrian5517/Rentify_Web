const multer = require('multer')

// Use memory storage to avoid writing files to disk on the server
const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

module.exports = upload
