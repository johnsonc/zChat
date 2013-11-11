var ws = require('ws');
var settings = require('./settings');

module.exports = {};

module.exports.start = function () {
	var wsServer = new ws.Server({ port: settings.wsPort });
	wsServer.on('connection', function (socket) {
		socket.on('message', function (message) {
			onMessage(socket, message);
		});
		socket.on('close', function () {
			onClose(socket);
		});
	});
	wsServer.on('error', function (error) {
		console.log('WebSocket error');
	});
	console.log('WebSocket server started');
};

var pck = { srv: {}, cl: {} };
pck.cl.nick = 1;
pck.cl.chatInvite = 2;
pck.cl.acceptInvite = 3;
pck.cl.declineInvite = 4;
pck.cl.rsaParams = 5;
pck.cl.sessionKey = 6;
pck.cl.message = 7;
pck.srv.nickResponse = 1;
pck.srv.otherUserChatInvite = 2;
pck.srv.chatInviteResponse = 3;
pck.srv.userInviteResponse = 4;
pck.srv.rsaParams = 5;
pck.srv.sessionKey = 6;
pck.srv.sessionInit = 7;
pck.srv.message = 8;
pck.srv.partnerDisconnect = 9;

var state = {
	INITIAL: 1,
	WAIT_FOR_INVITE_RESPONSE: 3,
	INVITING_PROCESS: 4,
	RSA_PARAMS_SENDING: 6,
	WAITING_FOR_RSA_PARAMS: 7,
	SESSION_KEY_SENDING: 8,
	WAITING_FOR_SESSION_KEY: 9,
	CHATTING_PRIMARY: 10,
	CHATTING_SECONDARY: 11
};

var okMessage = 'ok';

var users = {};

var onMessage = function (socket, message) {
	console.log('received: %s', message);

	var delimiterIndex = message.indexOf(':');
	var id = message.substring(0, delimiterIndex);
	id = parseInt(id);
	var data = message.substring(delimiterIndex + 1);

	if (id == pck.cl.nick) {
		onNickPacket(socket, data);
		return;
	}
	if (id == pck.cl.chatInvite) {
		onChatInvite(socket, data);
		return;
	}
	if (id == pck.cl.acceptInvite) {
		onAcceptInvite(socket);
		return;
	}
	if (id == pck.cl.declineInvite) {
		onDeclineInvite(socket);
		return;
	}
	if (id == pck.cl.rsaParams) {
		onRsaParams(socket, data);
		return;
	}
	if (id == pck.cl.sessionKey) {
		onSessionKey(socket, data);
		return;
	}
	if (id == pck.cl.message) {
		onMessagePacket(socket, data);
		return;
	}
};

var onClose = function (socket) {
	var user = users[socket._nick];
	if (user == undefined)
		return;
	
	delete users[socket._nick];

	if (user.state == state.CHATTING_PRIMARY || user.state == state.CHATTING_SECONDARY) {
		var partner = users[user.partner];
		if (partner != undefined) {
			users[user.partner].socket.send(pck.srv.partnerDisconnect + ':');
			users[user.partner].state = state.INITIAL;
		}
	}
};

var onNickPacket = function (socket, nick) {
	if (socket._nick != undefined) {
		console.log('Nick packet already sended!');
		return;
	}
	if (users[nick] == undefined) {
		socket._nick = nick;
		users[nick] = { state: state.INITIAL, socket: socket, nick: nick };
		socket.send(pck.srv.nickResponse + ':' + okMessage);
	} else {
		socket.send(pck.srv.nickResponse + ':Nick is already used by another user.');
	}
};

var onChatInvite = function (socket, partnerNick) {
	var nick = socket._nick;
	if (nick == undefined) {
		console.log('User did not send nick.');
		return;
	}
	if (users[nick] == undefined) {
		console.log('User is not in the list.');
		return;
	}
	if (users[nick].state != state.INITIAL) {
		console.log('User already in busy state.');
		return;
	}
	if (nick == partnerNick) {
		socket.send(pck.srv.chatInviteResponse + ':You cannot chat with self.');
		return;
	}
	if (users[partnerNick] == undefined) {
		socket.send(pck.srv.chatInviteResponse + ':User is not online now.');
		return;
	}
	var partner = users[partnerNick];
	if (partner.state == state.WAIT_FOR_INVITE_RESPONSE) {
		socket.send(pck.srv.chatInviteResponse + ':This user is inviting another user now.');
		return;
	}
	if (partner.state == state.INVITING_PROCESS) {
		socket.send(pck.srv.chatInviteResponse + ':Someone else is inviting this user for chatting.');
		return;
	}
	if (partner.state == state.CHATTING_PRIMARY || partner.state == state.CHATTING_SECONDARY) {
		socket.send(pck.srv.chatInviteResponse + ':This user is already chatting with someone.');
		return;
	}
	socket.send(pck.srv.chatInviteResponse + ':' + okMessage);
	partner.socket.send(pck.srv.otherUserChatInvite + ':' + nick);

	users[nick].state = state.WAIT_FOR_INVITE_RESPONSE;
	users[nick].inviting = partnerNick;

	partner.state = state.INVITING_PROCESS;
	partner.invitedBy = nick;
};

var onAcceptInvite = function (socket) {
	var nick = socket._nick;
	var partner = users[nick];
	var user = users[partner.invitedBy];

	user.state = state.RSA_PARAMS_SENDING;
	partner.state = state.WAITING_FOR_RSA_PARAMS;

	user.partner = partner.nick;
	partner.partner = user.nick;

	user.socket.send(pck.srv.userInviteResponse + ':' + okMessage);
};

var onDeclineInvite = function (socket) {
	var nick = socket._nick;
	var partner = users[nick];
	var user = users[partner.invitedBy];

	user.state = state.INITIAL;
	partner.state = state.INITIAL;

	user.socket.send(pck.srv.userInviteResponse + ':User declined your invite.');
};

var onRsaParams = function (socket, data) {
	var nick = socket._nick;
	if (nick == undefined) {
		console.log('User did not send nick.');
		return;
	}
	var user = users[nick];
	if (user == undefined) {
		console.log('User is not in the list.');
		return;
	}
	if (user.state != state.RSA_PARAMS_SENDING) {
		console.log('User is not in RSA_PARAMS_SENDING state.');
		return;
	}
	if (user.partner == undefined) {
		console.log('User does not have a partner.');
		return;
	}
	var partner = users[user.partner];
	if (partner == undefined) {
		console.log('User partner is not in the list');
		return;
	}
	if (partner.state != state.WAITING_FOR_RSA_PARAMS) {
		console.log('Partner is not in WAITING_FOR_RSA_PARAMS state');
		return;
	}

	user.state = state.WAITING_FOR_SESSION_KEY;
	partner.state = state.SESSION_KEY_SENDING;

	partner.socket.send(pck.srv.rsaParams + ':' + data);
};

var onSessionKey = function (socket, data) {
	var nick = socket._nick;
	if (nick == undefined) {
		console.log('User did not send nick.');
		return;
	}
	var user = users[nick];
	if (user == undefined) {
		console.log('User is not in the list.');
		return;
	}
	if (user.state != state.SESSION_KEY_SENDING) {
		console.log('User is not in SESSION_KEY_SENDING state.');
		return;
	}
	if (user.partner == undefined) {
		console.log('User does not have a partner.');
		return;
	}
	var partner = users[user.partner];
	if (partner == undefined) {
		console.log('User partner is not in the list');
		return;
	}
	if (partner.state != state.WAITING_FOR_SESSION_KEY) {
		console.log('Partner is in invalid state');
		return;
	}

	user.state = state.CHATTING_SECONDARY;
	partner.state = state.CHATTING_PRIMARY;

	partner.socket.send(pck.srv.sessionKey + ':' + data);

	user.socket.send(pck.srv.sessionInit + ':' + partner.nick);
	partner.socket.send(pck.srv.sessionInit + ':' + user.nick);
};

var onMessagePacket = function (socket, message) {
	var user = users[socket._nick];
	var partner = users[user.partner];

	partner.socket.send(pck.srv.message + ':' + message);
};