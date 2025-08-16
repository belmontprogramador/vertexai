const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "./uploads/planilhas",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `import-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

module.exports = upload;
