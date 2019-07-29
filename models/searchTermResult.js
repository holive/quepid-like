const mongoose = require("mongoose");

const resultSearchTermSchema = new mongoose.Schema({
  resultID: {
    type: String,
    required: true,
    unique: true
  },
  score: Number
});

const SearchTermResult = mongoose.model(
  "searchTermResult",
  resultSearchTermSchema
);

module.exports = { SearchTermResult };
