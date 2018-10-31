"use strict";
const settings = require('./data/config.json');
const name = 'hub-proxy';

var connectionString = settings.connectionString;
const debug = require('debug')('nbiot_cloud_gw');

const azure_iot_common = require("azure-iot-common");
const iothub = require('azure-iothub');
const registry = iothub.Registry.fromConnectionString(connectionString);
const Message = require('azure-iot-device').Message;
const Gateway = require('azure-iot-multiplexing-gateway').Gateway;
const gateway = new Gateway();
var devices = [];
var addDevicePromises = [];

function foundId(id) {
	debug('id: ' + id);
}
gateway.on('message', function (message) {
	let payload = message.data.toString();
	let deviceId = message.to.toString().split("/")[2];
	debug(`C2D message from [app] to [${name}]`);

	//to do - check what is the device type and choose the message type below accordingly
	//currently assuming UDP

	let msg_type = ´C2D_UDP',
	process.send({
		type: msg_type,
		deviceId: deviceId,
		payload: payload
	});
});

const start = async function () {
	try {
		await gateway.open(connectionString);
	} catch (error) {
		debug(`${name}: ${error}`);
	}
};

process.on('message', async function (msg) {
	switch (msg.type) {
		case 'CONN_DEV':
			// check if device has been provisioned, if not, silently drop it
			registry.getTwin(msg.device.id, (err, twin) => {
				if (err) debug(`${err}`);
				else {
					let t = twin.tags.deviceType
					debug(`CONN_DEV message from [master] to [${name}]`);
					if (t === 'coap')
						process.send({
							type: 'OBSERVE',
							device: msg.device
						});
				}
			});
			devices.push(msg.device);
			let p = gateway.addDevice(msg.device.id);
			addDevicePromises.push(p);
			await Promise.all(addDevicePromises);
			break;
		case 'DISCONN_DEV':
			debug(`DISCONN_DEV message from [master] to [${name}]`);
			let detached = gateway.removeDevice(msg.device.id);
			let index = addDevicePromises.indexOf(detached);
			if (index > -1) {
				addDevicePromises.splice(index, 1);
			}
			await Promise.all(addDevicePromises);
			break;
		case 'D2C':
			//send this datagram to the ipAddress of the imsi
			debug(`D2C message from [master] to [${name}]`);
			var message = new Message(msg.payload);
			try {
				await gateway.sendMessage(msg.deviceId, message);

			} catch (error) {
				debug(name + ': Could not send message to IoT Hub: ' + error);
			}
			break;
		default:
			break;
	}
});

start();