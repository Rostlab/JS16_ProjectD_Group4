//First of all install module Sentimental for sentiment analysis
//npm install "Sentimental"
//sentiment score (+6 to -6)

var analyze = require('Sentimental').analyze,
    positivity = require('Sentimental').positivity,
    negativity = require('Sentimental').negativity;

console.log(analyze("Never forget what you are, the rest of the world will not.Wear it like armor and it can never be used to hurt you"));//score: -1
console.log(analyze("If you ever call me sister again, I'll have you strangled in your sleep"));//score: -2
console.log(analyze("I wish I was the monster you think I am"));//score: 1
