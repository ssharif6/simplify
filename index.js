'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'hello world') {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]

		let sender = event.sender.id
		console.log("id" + sender.id);
	    if (event.message && event.message.text) {
			let text = event.message.text
			let input = parseMessage(text, "");
			callAPI(input, sender);
		}	
		// Checking for attachments
		else if (event.message && event.message.attachments) {
			let attachment = event.message.attachments[0];
			// Checking if attachment is an image
			if (attachment.type === "image") {
			console.log("IT'S AN IMAGE")
				let url = attachment.payload.url;
				console.log(url);
				let picture = parseMessage("empty", url);
				callImageApi(picture, sender);
			} 
	 	}
    }
    res.sendStatus(200)
});

function sendTextMessage(sender, text) {
	console.log(sender);
	const token = process.env.FB_TOKEN;
	console.log(token);
    let messageData = { text:text }
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
	    method: 'POST',
		json: {
		    recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
		    console.log('Error sending messages: ', error)
		} else if (response.body.error) {
		    console.log('Error: ', response.body.error)
	    }
    })
}

// TODO: Eventually handle things that aren't text like stickers or images
function parseMessage(text, url) {
	var obj = {
		"input": text,
		"url": url
	}
	return JSON.stringify(obj);
}

function callAPI(userInput, sender) {
	var https = require("https");
	var options = {
	  hostname: 'simplify.api.shaheensharifian.me',
	  path: '/v1/simplify/text',
	  method: 'POST',
	  headers: {
		  'Content-Type': 'application/json',
	  }
	};
	
	var req = https.request(options, function(res) {
		// console.log('Status: ' + res.statusCode);
		// console.log('Headers: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		var response = "";		
		var shit = "";
		res.on('data', function(body) {
			shit += body;
		});
		res.on('end', function() {

			parseJson(shit, sender);
		  });
	});
	req.on('error', function(e) {
	console.log('problem with request: ' + e.message);
	});
	// write data to request body
//   req.write('{"string": "Hello, World"}');
	req.write(userInput);
	req.end();
}

function callImageApi(userInput, sender) {
	var https = require("https");
	var options = {
	  hostname: 'simplify.api.shaheensharifian.me',
	  path: '/v1/simplify/image',
	  method: 'POST',
	  headers: {
		  'Content-Type': 'application/json',
	  }
	};
	
	var req = https.request(options, function(res) {
		// console.log('Status: ' + res.statusCode);
		// console.log('Headers: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		var response = "";		
		var shit = "";
		res.on('data', function(body) {
			shit += body;
		});
		res.on('end', function() {

			parseImageJson(shit, sender);
		  });
	});
	req.on('error', function(e) {
	console.log('problem with request: ' + e.message);
	});
	// write data to request body
//   req.write('{"string": "Hello, World"}');
	req.write(userInput);
	req.end();
}

function parseImageJson(json, sender) {
	console.log("GOT TO PARSE")
	let responseObj = JSON.parse(json);
	console.log(responseObj);
	var array = [];
	var texts = responseObj["texts"];
	var labels = responseObj["labels"];
	var sum = 0;
	if (texts && labels && (texts.length*5 > labels.length)) {
		if (texts && texts.length > 0) {
			for(var i = 1; i < texts.length; i++) {
				var obj = texts[i];
				if (sum + obj.length <= 300) {
					sum += obj.length
					array.push(obj);
				} else {
					break
				}
			}
		} 

	} else {
		if (labels && labels.length > 0) {
			for(var i = 0; i < labels.length; i++) {
				var obj = labels[i];
				if (sum + obj.length <= 300) {
					sum += obj.length
					array.push(obj);
				} else {
					break
				}
			}
		}

	}

	sendTextMessage(sender, array.join(" "));
}

function parseJson(json, sender) {
	let responseObj = JSON.parse(json);
	var array = [];
	var t1objectArr = responseObj["t1objects"];
	if (t1objectArr && t1objectArr.length > 0) {
		for (var i = 0; i < 1; i++) {
			var t1 = t1objectArr[i];
			if (t1) {
				console.log(t1["body"])
				if (t1["body"].length >= 640) {
					sendTextMessage(sender, t1["body"].substring(0,600));
				} else {
					sendTextMessage(sender, t1["body"]);
				}
			}
	}

	}

}
