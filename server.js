const cpen322 = require('./cpen322-tester.js');
const ws = require('ws');
const path = require('path');
const fs = require('fs');
const express = require('express');
const Database = require('./Database');
const SessionManager = require("./SessionManager");
const crypto = require('crypto');

const db = new Database("mongodb://localhost:27017", "cpen322-messenger");
const sessionManager = new SessionManager();


const messageBlockSize = 10;

var messages={};
db.getRooms().then((rooms)=>{

	rooms.forEach((room)=>{
		messages[room._id]=[];
	});

});

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}
function sanitize(string) {
	const map = {
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;',
		"/": '&#x2F;',
	};
	const reg = /[<>"'/]/ig;
	return string.replace(reg, (match)=>(map[match]));
}

function middlewareErrHandler(err, req, res, next){
	if (err instanceof SessionManager.Error) {
		let format = req.headers.accept;
		if (format === 'application/json') res.status(401).json(err);
		else res.redirect('/login');
	} else {
		res.status(500).send();
	}
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');
//broker
var broker = new ws.Server({ port: 8000 });
broker.on('connection', (client, request) => {
	var cookie = request.headers['cookie'];
	if (cookie != null) cookie = cookie.split('=')[1];
	if (cookie == null || sessionManager.getUsername(cookie) == null) {
		broker.clients.forEach(function (receiver) {
			if (receiver === client && receiver.readyState === ws.OPEN) {
				receiver.close();
			}
		});
	}
	client.on('message', (msg) => {
		let message = JSON.parse(msg);
		message.username = sessionManager.getUsername(cookie);
		message.text = sanitize(message.text);
		broker.clients.forEach((receiver) => {
			if (receiver !== client && client.readyState === ws.OPEN) {
				receiver.send(JSON.stringify(message));
			}
		});

		let new_message = {
			username: message.username,
			text: message.text
		}
		messages[message.roomId].push(new_message);
		if (messages[message.roomId].length === messageBlockSize){
			db.addConversation({
				room_id:message.roomId,
				timestamp:Date.now(),
				messages:messages[message.roomId]
			}).then((conversation) => {
				messages[conversation.room_id] = [];
			})
		}
	})
})
// express app
let app = express();
app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug

// serve static files (client-side)
app.use(['/app.js',],sessionManager.middleware,express.static(clientApp + '/app.js'))
app.use(['/index','/index.html',/^\/$/i],sessionManager.middleware,express.static(clientApp + '/index.html'))
app.use('/',express.static(clientApp, { extensions: ['html'] }));
app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});
app.route('/chat').get(sessionManager.middleware, function(req, res){

	db.getRooms().then((rooms) => {
		rooms.forEach((room) => {
			room["messages"] = messages[room._id];
		});
		res.send(rooms);
	});
})

app.route('/chat/:room_id').get(sessionManager.middleware, function(req, res){
	let request = req.params;
	db.getRoom(request.room_id).then(
		(room) => {
			if (room) {
				res.send(room);
			} else {
				let error = new Error("Room" + request.room_id + " was not found");
				res.status(404).send(error);
			}
		}
	);

})

app.route('/chat/:room_id/messages').get(sessionManager.middleware, function(req, res){
	let room_id = req.params.room_id;
	let before = req.query.before;
	db.getLastConversation(room_id,before).then(
		(conversation) => {
			if(conversation == null){
				res.status(404).send("conversation with room_id ${room_id} was not found");
			}else {
				res.send(conversation);
			}
		}
	)
})

// parse application/json
var bodyParser = require('body-parser')
app.use(bodyParser.json())
app.route('/chat').post( sessionManager.middleware, function(req, res, next){
	var data = req.body;
	if (data.name) {
		let room = {
			name:data.name,
			image:data.image
		}
		db.addRoom(room).then((room) => {
			messages[room._id] = [];
			res.status(200).send(JSON.stringify(room));
		});
	} else {
		let error = new Error("The data does not have a name field");
		res.status(400).send(error);
	}
})

function isCorrectPassword(password, saltedHash) {
	var salt = saltedHash.substring(0, 20);
	var calculatedPassword = crypto.createHash("sha256").update(password + salt).digest("base64");
	var correctPassword = saltedHash.substring(20);
	return calculatedPassword === correctPassword;
}
app.route('/login').post(function(req, res) {
	console.log(req.body);
	var username = req.body.username;
	var password = req.body.password;
	console.log(username);
	console.log(password);
	db.getUser(username).then((result) => {
		if (result === null){
			res.redirect("/login");
		} else {
			if (isCorrectPassword(password, result.password)){
				sessionManager.createSession(res, username);
				res.redirect("/")
			} else {
				res.redirect("/login");
			}
		}
	})
})

app.route('/profile').get(sessionManager.middleware, function (req, res){
	res.status(200).send({username: req.username});
})

app.route('/logout').get(async function(req, res){
	sessionManager.deleteSession(req);
	res.redirect("/login")
})

app.use(middlewareErrHandler);

cpen322.connect('http://99.79.42.146/cpen322/test-a5-server.js');
cpen322.export(__filename, { app, db, messages, messageBlockSize, sessionManager, isCorrectPassword});