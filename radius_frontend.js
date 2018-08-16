const debug = require('debug')('nbiot_cloud_gw')
const name = 'radius-fe';

var radius = require('./lib/radius');
const settings = require('./data/config.json');
var dgram = require("dgram");
const ipv = settings.ipVersion;
var radiusfe = dgram.createSocket(ipv);

radiusfe.on("message", function (msg, rinfo) {
  try {
    var packet = radius.decode_without_secret({
        packet: msg
      }),
      type;
      
    switch (packet.attributes["Acct-Status-Type"]) {
      case 'Start':
        type = 'PDP_ON';
        debug(`PDP_ON  message from [core network] to [${name}]`);

        break;
      case 'Stop':
        type = 'PDP_OFF';
        debug(`PDP_OFF message from [core network] to [${name}]`);
        break;
      default:
        debug(name+': not a valid accounting operation, ignoring');
        break;
    }

    process.send({
      type: type,
      device: {
        id: packet.attributes["3GPP-IMSI"],
        ip: packet.attributes["Framed-IP-Address"]
      }
    });
  } catch (e) {
    debug(name+': Failed to decode radius packet, silently dropping', e);
    return;
  }
});

module.exports = radiusfe;