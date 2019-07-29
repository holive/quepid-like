const mongoose = require("mongoose");
const SearchTermResult = require("../models/searchTermResult").SearchTermResult;
const SearchTerm = require("../models/searchTerm").SearchTerm;

const caseDataSchema = new mongoose.Schema({
  terms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SearchTerm' }],
  results: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SearchTermResult' }]
});

const CaseData = mongoose.model("CaseData", caseDataSchema);

module.exports = { CaseData };
