const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const router = require("./Router/router");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());


// Rotas
app.use("/api", router);

module.exports = app;
