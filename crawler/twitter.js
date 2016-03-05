//express module is required
var express = require('express');
var app = express();

//module restler is required
var rest = require('restler');

//module twitter is required
var twit = require('twitter'),

twitter = new twit({
   consumer_key: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
   consumer_secret: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
   access_token_key: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
   access_token_secret: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
});

//require node modules to connect to mongodb
MongoClient = require('mongodb').MongoClient, format = require('util').format;
//connect away
MongoClient.connect('mongodb://127.0.0.1:27017/got_db', function(err, db) {
  if (err) throw err;
  console.log("Connected to Database");
 });//MongoClient ends


//Enter search query
//var search_string = "game of thrones season 6";
var search_string = "tyrion lannister";
//var search_string = "joffrey baratheon";
//var search_string = "Daenerys Targaryen";

var d = new Date();
cald = d.setDate(d.getDate() - 4);
var till_date = d.getDate();
iterate = 50;
var var_max_id = '';


//Fetch the tweets using twitter api and display in console
function fetchtweet(i) {
if(i<iterate){
twitter.get('search/tweets', {q: search_string, include_entities : 'false' ,
count :100 , max_id :  var_max_id }, function(err, data, response) {


data.statuses[0].created_at.split(' ').splice(1,2).join(' ');
var split = data.statuses[0].created_at.split(' ');
var year = split[split.length-1];
var date_calc = split[split.length-4];
//console.log(date_calc);
//console.log(year, data.search_metadata.count);

try {
  var_max_id = data.statuses[99].id;
}
catch(err) {
}
//console.log(" printing id :"+data.statuses[i].id);


  for(var count = 0; count < data.search_metadata.count; count++)
  {

    console.log(data.statuses[count].lang,
                data.statuses[count].created_at,
                data.statuses[count].id,
                data.statuses[count].text ,
                data.statuses[count].retweet_count,
                data.statuses[count].favorite_count);

  //simple json record
	var document = {

    "lang"           : data.statuses[count].lang,
    "created_at"     : data.statuses[count].created_at,
    "id"             : data.statuses[count].id,
    "text"           : data.statuses[count].text ,
    "retweet_count"  : data.statuses[count].retweet_count,
    "favorite_count" : data.statuses[count].favorite_count };

/*
	//insert record
		if (err) throw err;
    db.collection('got_db').insert(document, function(err, records) {
		console.log("Record added");
	});
*/

  }//for loop ends
//
console.log(date_calc , till_date);
if (date_calc == till_date) {
}else {
  fetchtweet(i+1);
}


});//twitter ends
}//if ends
}//function ends

fetchtweet(0);
