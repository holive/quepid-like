const mongoose = require("mongoose");

const SearchTermsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
});

const SearchTerm = mongoose.model("SearchTerm", SearchTermsSchema);

module.exports = { SearchTerm };
