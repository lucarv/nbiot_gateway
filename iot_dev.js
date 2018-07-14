'use strict';
'esversion:6';
require('dotenv').config();

const Protocol = require('azure-iot-device-amqp').Amqp;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const iothub = require('azure-iothub');
var registry = iothub.Registry.fromConnectionString(process.env.HUBCS);
var iot_client = null;
var msgCounter = 0;
var devArray = [];
var hub_cli = null;

var connectCallback = (err) => {
	if (err) {
		console.error('Could not connect: ' + err.message);
	} else {
		console.log(`azure iot client spawned: ${process.pid}`);


		iot_client.on('message', (msg) => {
			console.log('[service_app] c2d ------> [iot_dev]');
			let data = JSON.parse(msg.data);
			var ip = '';

			for (var i = 0; i < devArray.length; i++) {
				console.log(i + ': ' + typeof devArray[i].id + ' ==> ' + typeof data.id)

				if (devArray[i].id === data.id) {
					ip = devArray[i].ip;
				}
				else
					console.log('device not connected');
			}

			process.send({
				type: 'c2d',
				deviceIp: ip,
				payload: data.message
			});

			iot_client.complete(msg, printResultFor('completed'));
		});

		iot_client.on('error', (err) => {
			console.error(err.message);
		});

		iot_client.on('disconnect', () => {
			iot_client.removeAllListeners();
		});
	}
};

// Helper function to print results in the console
function printResultFor(op) {
	return function printResult(err, res) {
		if (err) console.log(op + ' error: ' + err.toString());
		if (res) console.log(op + ' status: ' + res.constructor.name);
	};
}

process.on('message', (msg) => {
	switch (msg.type) {
		case 'conn_DEV':
			console.log(`[master] CONN_DEV ----> [iotdev]`);
			var deviceID = msg.device.id;
			var deviceIP = msg.device.ip;

			registry.get(deviceID, (err, res) => {
				if (err) console.log(err.name)
				else {
					let dev_cs = process.env.HOSTNAME + ';DeviceId=' + deviceID + ';SharedAccessKey=' + res.authentication.symmetricKey.primaryKey;
					iot_client = Client.fromConnectionString(dev_cs, Protocol);
					let device = {
						"ip": deviceIP,
						"id": deviceID,
						"client": iot_client
					}
					devArray.push(device);
					iot_client.open(connectCallback);
				}
			});
			break;
		case 'disconn_DEV':
			console.log(`[master] disCONN_DEV ----> [iotdev]`);
			console.log('devices in array: ' + devArray.length);

			var deviceIP = msg.device.ip;
			for (var i = 0; i < devArray.length; i++) {
				if (devArray[i].ip === msg.device.ip)
					hub_cli = devArray[i].client;
				else
					console.log(`${deviceIP} not connected`);
			}
			hub_cli.close((err, res) => {
				if (err) console.log('error closing iot cevice client: ' + err);
			});
			let rem = devArray.filter(function (el) {
				return el.ip !== deviceIP;
			});
			devArray = rem;
			console.log('devices in array: ' + devArray.length)
			break;
		case 'd2c':
			//send this UDP datagram to the ipAddress of the imsi
			console.log(`[master] d2c ----> [iotdev]`);
			for (var i = 0; i < devArray.length; i++) {
				if (devArray[i].ip === msg.ip) {
					hub_cli = devArray[i].client
					let json = {
						payload: msg.payload
					};

					let message = new Message(JSON.stringify(json));
					hub_cli.sendEvent(message, (err, res) => {
						if (err)
							console.log('Message sending error: ' + err.toString());
						else {
							msgCounter++;
							console.log(`[iotdev] d2c ----> [iothub]`);

						}
					});
				} else
					console.log('not connected');
			}
			break;
		default:
			break;
	}
});
 
module.exports = iot_client;
