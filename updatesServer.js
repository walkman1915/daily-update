// Express stuff
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var urlencodedParser = bodyParser.urlencoded({ extended: false })

// AWS stuff
var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-east-1",
  endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

var table = "Updates";
var secondsInDay = 86400;

app.use(express.static('public'));


// ################# Adding a new movie ####################
app.get('/newupdate.htm', function (req, res) {
   res.sendFile( __dirname + "/" + "new_update_form_post.htm" );
})

app.post('/process_new_update_post', urlencodedParser, function (req, res) {

   var userId = req.body.userId;
   var message = req.body.message;
   var time = Math.floor(new Date().getTime() / 1000);

   var params = {
       TableName:table,
       Item: {
           "UserId": userId,
           "UpdateTimestamp": time,
           "Message": message
       }
   };

   console.log("Submitting a new message for", userId);

   docClient.put(params, function(err, data) {
       if (err) {
           console.error("Unable to submit message. Error JSON:", JSON.stringify(err, null, 2));
           res.end("Error: message not submitted");
       } else {
           console.log("Added item:", JSON.stringify(data, null, 2));
           res.end("Message submitted");
       }
   });
})


// ################# Looking up a specific message with UNIX timestamp ####################
app.get('/findupdate.htm', function (req, res) {
   res.sendFile(__dirname + "/" + "find_update_form_post.htm");
})

app.post('/process_find_update_post', urlencodedParser, function(req, res) {
   var userId = req.body.userId;
   var timestamp = Number(req.body.timestamp);

   console.log(req.body.timestamp);
   console.log(timestamp);

   var params = {
    TableName: table,
    Key: {
      "UserId": userId,
      "UpdateTimestamp": timestamp
    }
   };

   docClient.get(params, function(err, data) {
      if (err) {
         console.error("Unable to find update. Error JSON:", JSON.stringify(err, null, 2));
         res.end("Error: couldn't find update");
      } else {
         console.log("Find update succeeded:", JSON.stringify(data, null, 2));
         res.end(JSON.stringify(data, null, 2));
      }
   });

})


// ################ Query for all messages on a given day ####################
app.get('/findupdatedate.htm', function (req, res) {
   res.sendFile(__dirname + "/" + "find_update_date_form_post.htm");
})

app.post('/process_find_update_date_post', urlencodedParser, function(req, res) {
  var userId = req.body.userId;
  var date = req.body.date;

  // the user enters info as MM/DD/YYYY, so we need to convert that to a range of UNIX times since
  // the sort key is based off of that, and we want to query all messages within this range
  var startTimeUNIX = Math.floor(new Date(date).getTime() / 1000);
  var endTimeUNIX = startTimeUNIX + secondsInDay;


  var params = {
      TableName: table,
      // ProjectionExpression: "#uid, #uts, Message",
      KeyConditionExpression: "#uid = :userId and #uts between :start_time and :end_time",
      ExpressionAttributeNames: {
          "#uid": "UserId",
          "#uts": "UpdateTimestamp"
      },
      ExpressionAttributeValues: {
           ":userId": userId,
           ":start_time": startTimeUNIX,
           ":end_time": endTimeUNIX 
      }
  };

  docClient.query(params, function(err, data) {
      if (err) {
          console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
          console.log("Query succeeded.");

          var allMessages = "";
          var count = 1;
          data.Items.forEach(function(item) {
              console.log(item.Message);
              allMessages += "Message " + count + ": " + item.Message + "\n";
              count++;
          });

          res.end(allMessages);
      }
  });
})

function isEmptyObject(obj) {
    var name;
    for (name in obj) {
        if (obj.hasOwnProperty(name)) {
            return false;
        }
    }
    return true;
}

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)

})