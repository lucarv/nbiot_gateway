'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const name = 'master';
const cluster = require('cluster');
const settings = require('./data/config.json');

var worker;
var dev2ip = [],
	ip2dev = [];

const getId = (IP) => {
	let id = ip2dev.find(o => o.ip === IP);
	return id;
}

const getIp = (ID) => {
	let ip = dev2ip.find(o => o.id === ID);
	return ip;
}

var start = () => {
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
				var found = false;
				switch (msg.type) {
					case 'pdp_ON':
						debug(`${name}: [gw aaa] PDP_ON -------> [master]: ${msg.device.id}`);
						var found = ip2dev.find(o => o.ip === msg.device.ip);
						if (!found) {
							dev2ip.push({
								"id": msg.device.id,
								"ip": msg.device.ip
							});
							ip2dev.push({
								"ip": msg.device.ip,
								"id": msg.device.id
							});
							worker.send({
								type: 'conn_DEV',
								device: msg.device
							});
							worker.send({
								type: 'store_device',
								device: msg.device
							});
							worker.send({
								devices: dev2ip
							})
						} else
							debug(`${name}: ignore faulty radius`);
						break;
					case 'pdp_OFF':
						debug(`${name}: [gw aaa] PDP_OFF ------> [master]: ${msg.device.id}`);
						var found = ip2dev.find(o => o.ip === msg.device.ip);
						if (found) {
							let index = ip2dev.indexOf(found);
							console.log(index)
							if (index > -1) {
								ip2dev.splice(index, 1);
							}
						}
						worker.send({
							type: 'delete_device',
							device: msg.device
						});
						worker.send({
							type: 'disconn_DEV',
							device: msg.device
						});
						break;
					case 'observe':
						debug(`${name}: [hub server] OBSERVE ------> [master]: ${msg.device.id}`);
						worker.send({
							type: 'observe',
							device: msg.device
						});
						break;
					case 'coap_get':
						debug(`${name}: [hub server] COAP GET ------> [master]: ${msg.ctx.request.query}`);
						worker.send({
							type: 'get_value',
							ctx: msg.ctx
						});
						break;
					case 'd2c':
						debug(`${name}: [(coap/udp) server] d2c ------> [master]`);
						found = getId(msg.deviceIp);
						if (found) {
							worker.send({
								type: 'd2c',
								deviceId: found.id,
								payload: msg.payload
							});
							worker.send({
								type: 'cache_write',
								deviceId: found.id,
								payload: msg.payload
							});
						} else
							debug(`${name}: no such device when d2c`)
						break;
					case 'c2d':
						debug(`${name}: [udp server] c2d ------> [master]: to (${msg.deviceId})`);
						msg.type = 'get_IP';
						worker.send(msg);
						break;
					case 'got_IP':
						found = getIp(msg.deviceId);
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
	console.log('not configured. run npm run-script config on the console');
} else start();


module.exports.start = start;