const fetch = require('node-fetch');
const qs = require('querystring');
const routes = require("express").Router();
const axios = require("axios");
const SearchTerm = require("../models/searchTerm").SearchTerm;
const SearchTermResult = require("../models/searchTermResult").SearchTermResult;

routes.get("/", async (req, res) => {
	const terms = await SearchTerm.find({}).limit(50);

  const results = await getTermsResults(terms);
  res.render("pages/home", { results });
});

routes.post("/add-term", async (req, res) => {
  const term = req.body["input-term"];
  if (term == "") return res.render("pages/home", {});

  SearchTerm.findOneAndUpdate(
    { name: term },
    { name: term },
    { upsert: true, new: true }
  ).exec();

  res.redirect("/");
});

routes.post("/change-score", async (req, res) => {
  const { score, resultID } = req.body;

  await SearchTermResult.findOneAndUpdate(
    { resultID },
    { score },
    { upsert: true, new: true }
  ).exec();

  res.send({});
});

/**
 * @param {Array} terms Array of terms.
 * @return {Array} Terms and their results.
 */
const getTermsResults = async terms => {
  const promise = callMystique(terms);
  const termsResults = await registerTermsResults(promise);

  //get scores of individual terms results
  const dbp = getScoreTermsResults(termsResults.results);

  //calculate term score
  const termWithScore = getTermScore(termsResults.terms);

  Promise.all(dbp);
  await Promise.all(termWithScore.map(i => i.score)).then();
  await termWithScore.forEach(e =>
    e.score.then(v => (e.score = parseFloat(v).toFixed(1)))
  ); // resolve score promise

  return generalQuery(termWithScore, termsResults.results);
};

/**
 * Get scores of individual terms results.
 * @param {Array} termsResults Array of objects
 * @return {Array} Array of promises.
 */
const getScoreTermsResults = termsResults => {
  const dbp = [];
  termsResults.forEach(async res => {
    const promise = await SearchTermResult.find({ resultID: res.resultID })
      .exec()
      .then(prod => {
        if (prod[0] && prod[0].score) res.score = prod[0].score;
      });

    dbp.push(promise);
  });
  return dbp;
};

/**
 * Calculates term score.
 * @param {Array} terms Array of objects
 * @return {Array} Array of objects with promises within.
 */
const getTermScore = terms => {
  const termWithScore = [];
  terms.forEach(e => {
    const scorePromise = calculateTermScore(e.name);
    termWithScore.push({ name: e.name, score: scorePromise, totalResults: e.totalResults });
  });

  return termWithScore;
};

// calculate term score
// FIXME: tá gambita ainda
const calculateTermScore = async term => {
  const qryRes = [];
  let ret = 0;

  await SearchTermResult.find({ resultID: new RegExp("_" + term + "$", "i") })
    .exec()
    .then(docs => {
      docs.forEach(e => e.score && qryRes.push(e.score));

      ret = qryRes.reduce((prev, el) => prev + el, 0);
    });

  return ret / qryRes.length;
};

/**
 * Return formated general query result.
 * @param {Array} terms Array of objects
 * @param {Array} termsResults Array of objects
 * @return {Object} Object with general result.
 */
const generalQuery = (terms, termsResults) => {
  const ret = {};
  const returnObj = { terms: {} };

  ret.terms = terms;
//console.log(terms)
  // mount terms
  ret.terms.forEach(e => {
    returnObj.terms = Object.assign(returnObj.terms, {
      [e.name]: {
        name: e.name,
        score: e.score,
        totalResults: e.totalResults,
        results: []
      }
    });
  });
  // mount results
  termsResults.forEach(e => {
    returnObj.terms[e.searchTerm].results.push(e);
  });

  return returnObj;
};

/**
 * Call Mystique url.
 * @param {Array} terms Array of terms.
 * @return {Object} A new promise.
 */
const callMystique = async terms => {
  const requests = terms.map(async ({ name: searchTerm }) => {

    const response = await fetch("https://latency-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=latency&x-algolia-api-key=6be0576ff61c053d5f9a3225e2a90f76", {
      "method": "POST",
      "headers": {
        "content-type": "application/json"
      },
      "body": JSON.stringify({
        "requests": [
          {
            "indexName": "instant_search",
            "params": `query=${searchTerm}`
          }
        ]
      })
    });

    const body = await response.json();

    return {
      query: searchTerm,
      hits: body.results[0].hits.map(hit => ({
        id: hit.objectID,
        searchTerm,
        name: hit.name,
        image: hit.image,
        productID: hit.objectID,
      })),
    };
  });

  return Promise.all(requests);
};

/**
 * Register search terms results.
 * @param {Object} promise of request.
 * @return {Array} Array of search terms results (objects).
 */
const registerTermsResults = async promise => {
  const results = [];
  const terms = [];

  await promise.then(requests =>
    requests.forEach(request => {
      const { query, hits } = request;

      terms.push({
        name: query,
        totalResults: 999,
      });

      hits.forEach(hit => {
        const resultID = `${hit.id}_${query}`;
        const newProduct = {
          resultID,
          searchTerm: query,
          name: hit.name,
          image: hit.image,
          productID: hit.id,
        };
        results.push(newProduct);
      });
    })
  );

  return { results, terms };
};

module.exports = routes;
