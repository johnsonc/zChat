$(function () {

	var connection;
	var timer;
	var nick, partnerNick;
	var rsaParams;
	var aesKey;
	var hmacKey;

	var messageTemplate = $('#messages-div > div:first').clone();

	$('#connect-btn').click(function () {
		nick = $('#nick-input').val();
		if (nick.length == 0) {
			modalDialog('Validation', 'Empty nick not allowed');
			return;
		}

		$('#connect-div').hide();
		$('#connection-process-div').show();

		connection = new Connection();

		connection.onConnect(function () {
			connection.sendNick(nick, function () {
				$('#connection-process-div').hide();
				$('#choose-partner-div').show();
				$('#nick-h4').text('Your nick: ' + nick);
			}, function (msg) {
				connection.close();
				modalDialog('Error while registering nick', msg);
				$('#connection-process-div').hide();
				$('#connect-div').show();
			});
		});

		connection.onSocketError(function () {
			modalDialog('Error', 'WebSocket error');
		});

		connection.onDisconnect(function () {
			$('#connection-process-div').hide();
			$('#choose-partner-div').hide();
			$('#choose-partner-request-div').hide();
			$('#choose-partner-response-div').hide();
			$('#session-init-div').hide();
			$('#chat-div').hide();
			$('#connect-div').show();
			connection = null;
		});

		connection.onChatRequest(function (partnerNick) {
			$('#choose-partner-div').hide();
			$('#choose-partner-response-div').show();
			$('#chat-inviting-p').text(partnerNick + ' is inviting you for chatting.');

			var maxTime = 300;
			var startTime = new Date();
			var bar = $('#choose-partner-response-div .progress-bar');
			bar.attr('aria-valuenow', maxTime);
			bar.css('width', '100%');
			var timerFunction = function () {
				var time = maxTime - Math.round((new Date() - startTime) / 100);
				if (time <= 0)
					clearInterval(timer);
				bar.attr('aria-valuenow', time);
				bar.css('width', Math.round(400 * time / maxTime) + 'px');
			};
			timer = setInterval(timerFunction, 100);
		});

		connection.onRsaParams(function (data) {
			var parts = data.split(':');
			rsaParams = new RSAParameters();
			rsaParams.keyLength = parseInt(parts[0]);
			rsaParams.messageLength = parseInt(parts[1]);
			rsaParams.publicKey = {
				n: BigInt.parse(parts[2], 16),
				e: BigInt.parse(parts[3], 16)
			};

			if (rsaParams.keyLength != 1024)
				throw 'Invalid RSA key length';
			if (rsaParams.messageLength != 32)
				throw 'Invalid message length';

			aesKey = random.SHA2PRNG.getUint8Array(16);
			hmacKey = random.SHA2PRNG.getUint8Array(16);
			var message = new Uint8Array(32);
			message.set(aesKey, 0);
			message.set(hmacKey, 16);

			var data = rsa.encode(message, rsaParams);
			rsaParams = null;
			connection.sendSessionKey(bh.byteArrayToHex(data));
		});

		connection.onSessionKey(function (data) {
			var message = rsa.decode(bh.hexToByteArray(data), rsaParams);
			aesKey = message.subarray(0, 16);
			hmacKey = message.subarray(16, 32);
		});

		connection.onSessionInit(function (_partnerNick) {
			partnerNick = _partnerNick;
			$('#session-init-div').hide();
			$('#chat-div').show();
			setChatDivHeight();
		});

		connection.onMessage(function (message) {
			addMessage('panel-warning', partnerNick, decrypt(message));
		});

		connection.onPartnerDisconnect(function () {
			$('#choose-partner-request-div').hide();
			$('#choose-partner-response-div').hide();
			$('#session-init-div').hide();
			$('#chat-div').hide();
			$('#choose-partner-div').show();
			modalDialog('Information', 'You partner was disconnected from server');
		});
	});

	var intFormat = function (int) {
		return int < 10 ? '0' + int : int.toString();
	};

	var currentDate = function () {
		var date = new Date();
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var seconds = date.getSeconds();
		return intFormat(hours) + ':' + intFormat(minutes) + ':' + intFormat(seconds);
	};

	var addMessage = function (cssClass, title, body) {
		var msgDiv = messageTemplate.clone();
		msgDiv.removeClass('panel-primary');
		msgDiv.addClass(cssClass);
		msgDiv.find('.panel-title:first').text(title);
		msgDiv.find('.panel-title:last').text(currentDate());
		msgDiv.find('.panel-body').text(body);
		msgDiv.appendTo($('#messages-div'));
		msgDiv.data('date', new Date());

		// if contains scroll bar
		if ($('#messages-div')[0].scrollHeight > $('#messages-div').height()) {
			$('#messages-div').finish();
			$('#messages-div').animate({ scrollTop: $('#messages-div')[0].scrollHeight }, 400);
		}
	};

	$('#random-nick-btn').click(function () {
		$('#nick-input').val('anon' + Math.floor(100000 + 900000 * Math.random()));
	});

	$('#chat-invite-btn').click(function () {
		partnerNick = $('#partner-input').val();
		if (partnerNick.length == 0) {
			modalDialog('Validation', 'Empty nick not allowed');
			return;
		}
		$('#choose-partner-div').hide();
		$('#choose-partner-request-div').show();

		connection.inviteForChatting(partnerNick, function () {
			var maxTime = 300;
			var startTime = new Date();
			var bar = $('#choose-partner-request-div .progress-bar');
			bar.attr('aria-valuenow', maxTime);
			bar.css('width', '100%');
			var gotResponse = false;
			var timerFunction = function () {
				var time = maxTime - Math.round((new Date() - startTime) / 100);
				if (time <= 0) {
					clearInterval(timer);
					$('#choose-partner-request-div').hide();
					$('#choose-partner-div').show();		
					return;
				}
				if (gotResponse) {
					clearInterval(timer);
					return;
				}
				bar.attr('aria-valuenow', time);
				bar.css('width', Math.round(400 * time / maxTime) + 'px');
			};
			timer = setInterval(timerFunction, 100);

			connection.waitForInviteResponse(function () {
				gotResponse = true;

				$('#choose-partner-request-div').hide();
				$('#session-init-div').show();

				rsaParams = rsa.generateParameters(1024, 32);
				connection.sendRsaParams(
					rsaParams.keyLength + ':' +
					rsaParams.messageLength + ':' +
					rsaParams.publicKey.n.toString(16) + ':' +
					rsaParams.publicKey.e.toString(16));
			}, function (msg) {
				gotResponse = true;

				$('#choose-partner-request-div').hide();
				$('#choose-partner-div').show();
				modalDialog('Error while waiting for user response', msg);
			});
		}, function (msg) {
			modalDialog('Error while sending chat invitation', msg);
			$('#choose-partner-request-div').hide();
			$('#choose-partner-div').show();
		});
	});

	$('#accept-invite-btn').click(function () {
		connection.acceptInvite();
		clearInterval(timer);
		$('#choose-partner-response-div').hide();
		$('#session-init-div').show();
	});

	$('#decline-invite-btn').click(function () {
		connection.declineInvite();
		clearInterval(timer);
		$('#choose-partner-response-div').hide();
		$('#choose-partner-div').show();
	});

	var sendMessage = function () {
		var text = $('#text-input-div input').val();
		if (text.length == 0)
			return;
		$('#text-input-div input').val('');
		connection.sendMessage(encrypt(text));
		addMessage('panel-success', nick, text);
	}

	$('#send-btn').click(sendMessage);

	$('#text-input-div input').on('keypress', function (e) {
		if (e.which == 13)
			sendMessage();
	});

	var encrypt = function (text) {
		var bytes = bh.stringToByteArray(text);
		var encBytes = aes.encrypt(bytes, aesKey, paddings.PKCS7);
		return bh.byteArrayToHex(encBytes);
	};

	var decrypt = function (text) {
		var bytes = bh.hexToByteArray(text);
		var decBytes = aes.decrypt(bytes, aesKey, paddings.PKCS7);
		return bh.byteArrayToString(decBytes);
	};

	var setChatDivHeight = function () {
		$('#messages-div').css('height', ($(window).height() - 150) + 'px');
	};

	$(window).resize(function () {
		if ($('#chat-div').is(':visible'))
			setChatDivHeight();
	});

	$('#clear-all-link').click(function () {
		$('#messages-div').empty();
	});

	var clearMessages = function (seconds) {
		var now = new Date();
		$('#messages-div > div').each(function () {
			var msgDate = $(this).data('date');
			if (msgDate == undefined || now - msgDate >= seconds * 1000)
				$(this).remove();
		});
	};

	$('#clear-1min-link').click(function () { clearMessages(60); });
	$('#clear-5min-link').click(function () { clearMessages(5 * 60); });
	$('#clear-15min-link').click(function () { clearMessages(15 * 60); });
	$('#clear-1hour-link').click(function () { clearMessages(60 * 60); });

	var modalDialog = function (title, text) {
		$('#modal-dialog-div .modal-title').text(title);
		$('#modal-dialog-div .modal-body').text(text);		
		$('#modal-dialog-div').modal();
	};

	$('#disconnect-link').click(function () {
		connection.close();
	});

	$('#terminate-session-link').click(function () {
		modalDialog('!', 'Not implemented');
	});

});