'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw')
const name = 'api-server'
const settings = require('./data/config.json');

var express = require('express')
var app = express()
var device_array = []

const redis = require("redis");
var redis_client = redis.createClient(6380, settings.redis.url, {
    auth_pass: settings.redis.key,
    tls: { servername: settings.redis.url }
});

redis_client.on('connect', function () {
    redis_client.auth(settings.redis.key, (err) => {
        if (err) debug(err);

    })
});
app.get('/', function (req, res) {
    res.send('Nothing Here Mat')
})

app.get('/ids', function (req, res) {
    redis_client.get('ids', function (err, reply) {
        debug(`GET IDs message from [app] to [${name}]`);
        res.send(JSON.parse(reply));
    });
})

app.get('/ips', function (req, res) {
    redis_client.get('ips', function (err, reply) {
        debug(`GET IPs message from [app] to [${name}]`);
        res.send(JSON.parse(reply));
    });
})

app.get('/tag', function (req, res) {
    redis_client.get(req.query.deviceId, function (err, reply) {
        if (err)
            res.send(err)
        else {
            res.send(JSON.parse(reply));
        }
    });
})

module.exports.app = app;