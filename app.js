'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const name = 'master';
const cluster = require('cluster');
const testFolder = './data/';
const settings = require('./data/config.json');

var worker;
var devices = [];

var start = function () {

	if (cluster.isMaster) {
		// Count the machine's CPUs
		var cpuCount = require('os').cpus().length;
		require('dns').lookup(require('os').hostname(), function (err, add, fam) {
			debug(name + ' running on: ' + add + ' not useful if running in a container');
		})

		// Create a worker for each CPU
		for (var i = 0; i < cpuCount; i += 1) {

			worker = cluster.fork();

			worker.on('message', (msg) => {
				switch (msg.type) {
					case 'pdp_ON':
						debug(`${name}: [gw aaa] PDP_ON -------> [master]: ${msg.device.id}`);
						devices.push(msg.device);
						worker.send({
							type: 'conn_DEV',
							device: msg.device
						});
						worker.send({
							type: 'store_device',
							device: msg.device
						});
						worker.send({
							type: 'observe',
							device: msg.device
						});						
						break;
					case 'pdp_OFF':
						debug(`${name}: [gw aaa] PDP_OFF ------> [naster]: ${msg.device.id}`);
						worker.send({
							type: 'dddelete_device',
							device: msg.device
						});
						break;
					case 'd2c':
						debug(`${name}: [udp server] d2c ------> [master]: from (${(msg.deviceIp)})`);
						worker.send({
							type: 'get_ID',
							deviceIp: msg.deviceIp
						});
						break;
					case 'got_ID':
						debug(`${name}: [az redis] gotID ------> [master]: (${(msg.deviceId)})`);
						var found = devices.find(o => o.id === msg.deviceId);
						if (!found)
							debug(`device at ${msg.deviceId} not currently registered, ignore the message`)
						else
							worker.send({
								type: 'd2c',
								deviceId: found.id
							});
						break;
					case 'c2d':
						debug(`${name}: [udp server] c2d ------> [master]: to (${msg.deviceId})`);
						msg.type = 'get_IP';
						worker.send(msg);
						break;
					case 'got_IP':
						debug(`${name}: [az redis] gotIP ------> [master]: (${(msg.deviceIp)})`);
						var found = devices.find(o => o.ip === msg.deviceIp);
						if (!found)
							debug(`device at ${msg.deviceIp} not currently registered, ignore the message`)
						else {
							debug(msg)
							msg.type = 'c2d';
							msg.deviceIp = found.ip;
							worker.send(msg);
						}
						break;
						case 'coap_observe':
						debug(`[api_server] coap_observe ------> [${name}]: (${msg.deviceId})`);
						worker.send({
							type: 'observe',
							deviceId: msg.deviceId
						});
						break;
					default:
						break;
				}
			});
		}

		// Listen for dying workers
		cluster.on('exit', function () {
			cluster.fork();
		});
	} else {
		require('./launcher');
	}
}

if (!settings.hasOwnProperty('hostname')) {
	console.log('not configured. type npm run-script config on the console');
} else start();

module.exports.start = start;