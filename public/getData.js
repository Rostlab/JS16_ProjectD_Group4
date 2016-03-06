// Provides some usable data for testing. Will handle DB interactions later.
"use strict";
var characters = [
    "Joffrey Baratheon",
    "Jon Snow",
    "Arya Stark",
    "Tyrion Lannister",
    "Khal Drogo"
];
var data = [];

// Absolute border for popularity. Could be set to the most amount of popularityPoints ever received by one character on a day.
function maxPopularity() {
    return 10;
}

// Initializes the data
/*(function () {
    var i, c, d = new Date();
    for (c in characters) {
        for (i = Date(2016, 2, 1); i <= d; i = i + 1) {
            data.push(c, i, (Math.random() - 0.5) * 2 * maxPopularity());
        }
    }
}());*/

// Checks whether a character exists in the db
function exists(name) {
    var c;
    for (c in characters) {
        if (characters[c] === name) {
            return true;
        }
    }
    return false;
}

// Returns the popularityPoints for that character in that Date Range. For now fake data.
function returnData(name, startDate, endDate) {
    var i;
    var dateRange = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    var data = [];
    for (i = 0; i <= dateRange; i += 1) {
        data.push(((Math.random() / 2) + 0.3) * 10);
    }
    return data;
}
