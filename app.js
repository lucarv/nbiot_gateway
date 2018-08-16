'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw');
const name = 'master';
const cluster = require('cluster');
const settings = require('./data/config.json');
var redis = require("redis");
var redis_client = redis.createClient(6380, settings.redis.url, {
	auth_pass: settings.redis.key,
	tls: {
		servername: settings.redis.url
	}
});
redis_client.on('connect', function () {
	redis_client.auth(settings.redis.key, (err) => {
		if (err) debug(err);
		else {
			redis_client.flushdb(function (err, reply) { // make sure no older registrations are lingering on the cache
				if (err) debug(`${name}: err`);
			});
		}
	})
});
var worker;
var dev2ip = [],
	ip2dev = [];

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
							worker.send({ // add to AMQP connection Pool
								type: 'conn_DEV',
								device: msg.device
							});
							// add to maps and store in redis
							dev2ip.push({
								"id": msg.device.id,
								"ip": msg.device.ip
							});
							ip2dev.push({
								"ip": msg.device.ip,
								"id": msg.device.id
							});
							redis_client.set('ids', JSON.stringify(dev2ip));
							redis_client.set('ips', JSON.stringify(ip2dev));
						} else
							debug(`${name}: ignore faulty radius`);
						break;
					case 'pdp_OFF':
						debug(`${name}: [gw aaa] PDP_OFF ------> [master]: ${msg.device.id}`);
						var found = ip2dev.find(o => o.ip === msg.device.ip);
						if (found) { // remove this device from the maps and redis
							worker.send({ // remove from AMQP Connection Pool
								type: 'disconn_DEV',
								device: msg.device
							});
							// remove from maps and redis
							let indexIP = ip2dev.indexOf(found);
							ip2dev.splice(indexIP, 1);
							redis_client.set('ips', JSON.stringify(ip2dev));
							let indexDEV = dev2ip.indexOf({
								"id": found.id,
								"ip": found.ip
							})
							dev2ip.splice(indexDEV, 1);
							redis_client.set('ids', JSON.stringify(dev2ip));
						} else
							debug(`${name}: ignore faulty radius`);
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
						redis_client.get('ips', function (err, reply) {
							if (err) debug(`${name}: err`);
							else {
								let deviceArray = JSON.parse(reply);
								if (deviceArray) {
									let found = deviceArray.find(o => o.ip === msg.deviceIp);
									if (found) {
										worker.send({ // send to IoT Hub
											type: 'd2c',
											deviceId: found.id,
											payload: msg.payload
										});
										worker.send({ // save last sent message from device
											type: 'cache_write',
											deviceId: found.id,
											payload: msg.payload
										});
									} else debug(`${name}: device not registered, discarding message`);
								} else debug(`${name}: NO devices registered, discarding message`);
							}
						});
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