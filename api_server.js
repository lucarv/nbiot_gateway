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
    tls: {
        servername: settings.redis.url
    }
});

const start =


    redis_client.on('connect', function () {
        redis_client.auth(settings.redis.key, (err) => {
            if (err) debug(err);
            else debug(`${name} spawned: ${process.pid}`);

        })
    });
app.get('/', function (req, res) {
    res.send('Nothing Here Mat')
})

app.get('/devices', function (req, res) {
    redis_client.get("devices", function (err, reply) {
        debug(`[app] get devices ---->${name}: ${JSON.stringify(reply)}`);
        res.send(device_array);
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

debug(`${name}:  [pid:${process.pid}] listening on port: ${settings.ports.api}`);

module.exports.app = app;