'esversion: 6';
const debug = require('debug')('nbiot_cloud_gw')
const name = 'redis-server'
var redis = require("redis");
const settings = require('./data/config.json');

var redis_client = redis.createClient(6380, settings.redis.url, {
	auth_pass: settings.redis.key,
	tls: {
		servername: settings.redis.url
	}
});

redis_client.on('connect', function () {
	redis_client.auth(settings.redis.key, (err) => {
		if (err) debug(err);
		else debug(`${name} spawned: ${process.pid}`);

	})
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'store_devices':
			debug(name + ': [master] store device ---> [az_redis] ');
			let key = 'devices';
			let devices = JSON.stringify(msg.devices);
			redis_client.set(key, devices, redis.print);
			break;
		case 'cache_write':
			debug(name + ': [master] cache write ---> [az_redis] ');
			let payload = JSON.parse(msg.payload)
			payload['timestamp'] = new Date().toISOString();
			let val = JSON.stringify(payload)
			redis_client.set(
				msg.deviceId,
				val);
			break;
		default:
			break;
	}
});

module.exports = redis_client;