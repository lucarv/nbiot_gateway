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
	})
});

process.on('message', (msg) => {
	switch (msg.type) {
		case 'CACHE_WRITE':
			debug(`CACHE_WRITE message from [cluster_master] to [${name}]`);
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