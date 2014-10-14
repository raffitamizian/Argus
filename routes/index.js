var express = require('express');
var router = express.Router();
var dotenv = require('dotenv');
var PUBNUB = require('pubnub');
var request = require('request');
var url = require('url');
var contextio = require('contextio');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

//PubNub integration to retrieve sensor data from Wunderbar
router.get('/pubnub', function(req, res) {
   var pubnub = PUBNUB.init({
    ssl: true,
    subscribe_key : "sub-c-a84c8b9a-1314-11e4-8bd3-02ee2ddab7fe",
    cipher_key: "539bec9821d31cdbcdc06d17c8b77bcf820370445bd4dad01837ec164d564e51",
    auth_key: '2bc19f65-fd26-4f84-a27a-2830fa3a699e'
  });
	var array = [];
	var counter = 0;
    var gyroavg =[];
    var accelavg = [];
   pubnub.subscribe({
   	channel : ["a9ea2e09-6d56-4a0c-9334-a94853358885:aa99fb4c-c6ea-4c78-8eb7-ed4f798d878a", //Snd
   			   "a739786c-a2a0-4543-94a9-54d1de4d1cd8:b1943121-35f6-46b9-ac98-3ef5443c268e",], //Accel
    
    message : function(data){
		var information = JSON.parse(data);
		var timetolerance;
		
		if(information.snd_level != undefined)
		{
			console.log("snd")
			var latestsound = information.snd_level;
			if(chksound(latestsound)) {
				console.log('TRIGGERSOUND')
				soundrequest();
			}
		}
		else if (information.temp != undefined) {
			console.log("temp")
			var latesttemp = information.temp;
			if(chktemp(latesttemp)) {
				console.log("TRIGGERTEMP")
				soundrequest();
			}
		}
		else if(information.light != undefined) {
			console.log("light")
			var latestlight = information.light;
			if(chklight(latestlight)) {
				console.log("TRIGGERLIGHT")
				soundrequest();
			}
		}
		else {
			console.log("gps")
			if(counter < 10) {
	    		array.push(information)
	    		console.log('less than 10');
	    	}
	    	else {
	    		var gyrox, gyroy, gyroz, accelx, accely, accelz =0;
	    		var count = 0;
	    		array.forEach(function(item){
	    			var gyro = item.gyro;
	      			var accel = item.accel;

	      			gyrox += gyro.x;
	      			gyroy += gyro.y;
	      			gyroz += gyro.z;
	      			accelx += accel.x;
	      			accely += accel.y;
	      			accelz += accel.z;
	      			count++;
	    		});
	    		gyroavg = [gyrox / count, gyroy / count, gyroz / count]
	    		accelavg = [accelx / count, accely / count, accelz / count]

	    		array.pop()
	      		array.push(information)
	    	}
	    	var gyro = information.gyro;
	        var accel = information.accel;

	        var trigger = false;

	        if(chkdiff(gyro.x, gyroavg[0]) || chkdiff(gyro.y, gyroavg[1]) 
	        							  || chkdiff(gyro.z, gyroavg[2]) 
	        							  || chkdiff(accel.x, accelavg[0])  
	        							  || chkdiff(accel.y, accelavg[1])  
	        							  || chkdiff(accel.z, accelavg[2])) {
	        	trigger = true;
	      		console.log('TRIGGER')
	      		var date = new Date();
				var current_mins = date.getMinutes();
	      		timetolerance = current_mins;
	        }
	        else {
	        	console.log('all is good')
	        }

	        if(trigger) {

	        	fallrequest();
	        }
	        counter++;
			} 
        }
    }); 
});

function chkdiff(val1, val2) {
	//Needs calibration
	var tolerance = 1.45;
	if(val1 - val2 > tolerance || val2 - val1 > tolerance) {
		return true;
	}
	return false;
}

function chktemp(temp) {
	//Needs calibration
	var tooCold = 10;
	var tooHot = 35;
	
	if(temp < tooCold || temp > tooHot) {
		return true;
	} 
	return false;
}

function chksound(db) {
	//Needs calibration
	var maxdb = 170;
	var date = new Date();
	var current_hour = date.getHours();
	if((db > maxdb) && ((current_hour < 7) || (current_hour > 23))) {
		return true;
	}
	return false;
}

function chklight(light) {
	//Needs calibration
	var tooDark = 5;
	
	if(temp < tooDark) {
		return true;
	} 
	return false;
}

function fallrequest() {
	//Creates twilio voice call to primary contact
	//request("",function(error,response,body) {
	//	console.log(body);
	//});
}

function soundrequest() {
//Send an email using Sendgrid to the 5 most sent-to addresses in the user's inbox using Context.io
  var ctxioClient = new contextio.Client({
  	//key: <Context.IO Client key>,
  	//secret: <Context.IO Secret>
  });

  var recipients = []
  	/*
	ctxioClient.accounts(<Context.IO Target Account>).contacts().get({limit:5}, function (err, response) {
	    if (err) throw err;
	    console.log(response.body);
	});
*/
	dotenv.load();
	var to = "email@test.com";
	
	//var sendgrid_username   = <SendGrid Username>
	//var sendgrid_password   = <SendGrid Password>;

	var sendgrid   = require('sendgrid')(sendgrid_username, sendgrid_password);
	var email      = new sendgrid.Email();

	email.addTo(to);
	email.setFrom(to);
	email.setSubject('Argus Alert!');
	email.setHtml('<style> body {background-color:lightblue} h1   {color:green} p    {color:green}</style><p style="text-align:center">&nbsp;</p><p style="text-align:center">&nbsp;</p><p style="text-align:center"></p><h1 style="text-align:center">Hi %Name%,</h1><p style="text-align:center">This is a notification from Argus to inform you that your relative, %user%,  is expieriencing loud noise.</p><p style="text-align:center">You can find more information on what happened in the Argus app on your phone.</p><p style="text-align:center">&nbsp;</p><p style="text-align:center">All the best,</p><p style="text-align:center">Your Argus team</p>');
	email.addSubstitution("%user%", "Cristiano");
	email.addSubstitution("%action%", "fallen down");
	email.addSubstitution("%Name%", "Relative");
	email.addHeader('X-Sent-Using', 'SendGrid-API');
	email.addHeader('X-Transport', 'web');

	sendgrid.send(email, function(err, json) {
	  if (err) { return console.error(err); }
	  console.log(json);
	});
}

module.exports = router;