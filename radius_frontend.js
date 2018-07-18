const debug = require('debug')('nbiot_cloud_gw')
var radius = require('./lib/radius');
var dgram = require("dgram");
var radiusfe = dgram.createSocket("udp4");

radiusfe.on("message", function (msg, rinfo) {
  try {
    var packet = radius.decode_without_secret({
        packet: msg
      }),
      type;
      
    switch (packet.attributes["Acct-Status-Type"]) {
      case 'Start':
        type = 'pdp_ON';
        debug('[cn aaa] ACC_START ----> [gw aaa]: ' + rinfo.address);
        break;
      case 'Stop':
        type = 'pdp_OFF';
        debug('[cn aaa] PDP_OFF----> [gw aaa]');
        break;
      default:
        debug('not a valid accounting operation, ignoring');
        break;
    }

    process.send({
      type: type,
      device: {
        id: packet.attributes["3GPP-IMEISV"],
        ip: packet.attributes["Framed-IP-Address"]
      }
    });
  } catch (e) {
    debug("Failed to decode radius packet, silently dropping:", e);
    return;
  }
});

debug(`radius client spawned: ${process.pid}`);
module.exports = radiusfe;