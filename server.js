var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var request = require('request');
var config = require('./config');
var host = "http://localhost:"+config.port;

var app = express();

mongoose.connect(config.database, function(err) {
	if(err) {
		console.log(err);
	} else {
		console.log('Connected to the Database!');
	}
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(morgan('dev'));

var api = require('./app/api')(app, express);
app.use('/api', api);

app.get('/subjects', function(req, res) {
	request(host+'/api/subjects', function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    console.log(body) // Print the google web page.
	  }
	  res.send(body);
	});
});

app.listen(config.port, function(err) {
	if(err) {
		console.log(err);
	} else {
		console.log("Listening on port "+config.port);
	}
})