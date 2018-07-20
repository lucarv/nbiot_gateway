'use strict';
'esversion:6';
const debug = require('debug')('nbiot_cloud_gw')
const name = 'api-server'
const settings = require('./data/config.json');

// Load Koa
var Koa = require('koa');
var api_server = new Koa();
var Router = require('koa-router');
var koaBody = require('koa-body');

var router = new Router();
var counter = 0;

// api_server.listen(process.env.API_PORT);

const koa_server = api_server.listen(3000, () => {
  debug(`api_server [pid:${process.pid}] listening on port: ${3000}`);
});
api_server
  .use(router.routes())
  .use(koaBody())
  .use(router.allowedMethods());


// Load Routes
router
  .get('/', (ctx, next) => {
    console.log('GET /')
    ctx.body = {
      text: "a simple counter to display how many times this api was called",
      counter: counter
    };
    counter++;
  })
  .get('/imsis', (ctx, next) => {
    //console.log('dict: ' + JSON.stringify(dict))
    ctx.body = 'now the imsis are in redis, think about this';
  })
  .get('/ip/:id', (ctx, next) => { //fix this - not working since redis
    let result = {
      error: 'unkonw imsi'
    }
    redis_client.get(ctx.params.id, function (err, reply) {
      if (err)
        result = err
      else
        result = {
          ip: reply
        }
      ctx.body = result;
    });
  })
  .post('/config', koaBody(),
    (ctx) => {
      /*
      process.send({
        type: 'c2d',
        body: ctx.request.body
      });
      */
      debug(settings);
      debug(ctx.request.body.hostname);
      /*
      ctx.body = {
        ip: ip
      };
      */
    });

module.exports = api_server;