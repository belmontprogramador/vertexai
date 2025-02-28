const helloWord = (req, res) => {
  res.json({ message: "Hello, World!" });
};

module.exports = { helloWord };