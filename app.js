const db = require("mongoose");
const path = require("path");
const express = require("express");
const app = require("express")();
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const routes = require("./routes");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.use(express.static(__dirname + "/public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use("/", routes);

// mongo
db.connect("mongodb://localhost:27017/test", { useNewUrlParser: true });
db.connection.on("error", console.error.bind(console, "connection error:"));
db.set("useCreateIndex", true);
//FIXME: share and use the same db instance

app.listen(3000, () => console.log("App listening on port 3000"));
