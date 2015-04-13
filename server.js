// --- Setup
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var https = require("https");
var http = require("http");

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;

var router = express.Router(); // get an instance of the express Router

// -- Main logic
router.post('/fromJiraToFlow', function(req, res) {
    //console.log("Incoming:\n" + req.body);

    var messageToFlow = createFlowMessage(req);

    if (messageToFlow) {
        var jsonMessage = JSON.stringify(messageToFlow, null, ' ');

        console.log("Message to Flow:\n" + jsonMessage);

        sendToFlow(jsonMessage);

        res.json({
            message: 'ok'
        });
    }else {
    	console.log("No message to flow");
    	res.json({
            message: 'noop'
        });
    }
});

// routes will be prefixed with /api
app.use('/api', router);

//startup
app.listen(port);
console.log('Magic happens on port ' + port);

// --- Functions for mapping the data

function createFlowMessage(request) {
    var requestJson = request.body;
    var flowToken = request.query.flow_token;
    var baseurl = request.query.jira_baseurl;

    //don't bother spamming with subtasks
    if (requestJson.issue.fields.issuetype.subtask) {
        return null;
    }

    var message = {};
    message.flow_token = flowToken;
    message.event = "activity";
    message.author = {};
    message.author.name = requestJson.user.displayName;
    message.author.avatar = requestJson.user.avatarUrls["48x48"];
    message.title = mapTitle(requestJson);
    message.external_thread_id = requestJson.issue.key;

    message.thread = {};
    message.thread.title = requestJson.issue.key + ": " + requestJson.issue.fields.summary;
    message.thread.body = valueOrEmpty(requestJson.issue.fields.description);
    message.thread.external_url = baseurl + "/browse/" + requestJson.issue.key;
    message.thread.status = {};
    message.thread.status.color = mapColor(requestJson.issue.fields.status.statusCategory.colorName);
    message.thread.status.value = requestJson.issue.fields.status.name;

    message.thread.fields = [];

    addField(message, request, "Type", requestJson.issue.fields.issuetype.name);

    //story points
    if (requestJson.issue.fields.customfield_10005) {
        var pointValue = requestJson.issue.fields.customfield_10005;
        addField(message, request, "Story points", pointValue);
    }

    return message;
}

function mapTitle(request) {
    if (request.webhookEvent) {
        if ("jira:issue_created" == request.webhookEvent) {
            return "created issue";
        } else if ("jira:issue_updated" == request.webhookEvent) {
            return "updated issue";
        } else {
            return "unknown webhook " + request.webhookEvent;
        }
    } else if (request.transition) {
        return "moved issue to " + request.transition.transitionName;
    } else {
        return "unkown state";
    }
}

function mapColor(jiraColor) {
    if ("blue-gray" == jiraColor) {
        return "blue";
    } else {
        return jiraColor;
    }
}

function addField(message, request, label, value) {
    var field = {};
    field.label = label;
    field.value = value;
    message.thread.fields[message.thread.fields.length] = field;
}

function valueOrEmpty(optional) {
    if (optional)
        return optional;
    else
        return "";
}

function sendToFlow(message) {
    //from https://github.com/wolfie/gerrit-flowdock
    var headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(message, 'utf8')
    };

    var options = {
        "host": "api.flowdock.com",
        "path": "/messages",
        //"host": "requestb.in", // remember: requestb.in requires http, not https
        //"path": "15btc821",
        "method": "POST",
        "headers": headers
    };

    var req = https.request(options, function(res) {
        res.setEncoding("utf-8");

        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });

        res.on('end', function() {
            console.dir("Response:");
            console.dir(responseString);
        })
    });

    req.on('error', function(e) {
        console.dir("error:");
        console.dir(e);
        process.exit(1);
    });

    req.write(message);
    req.end();
}
