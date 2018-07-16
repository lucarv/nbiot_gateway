# nbiot-gw

Super simple NBIOT -> Azure IoT HuB cloud-gw  

## Disclaimer

**The code provided in this sample is not production ready and was built for demonstration and illustration purposes. Hence, the code has sample quality. We have done some basic and scalability testing but no in depth validation.**  




  
**Use Case 1:**  
An udp device sends a raw datagram to the GW that forwards to IoT Hub over AMQP.  
The message can be anything you want and in the device simulator included in this repo you can type whatever you like at the command prompt.  
![](static/telemetry.png?raw=true)
  
**Use Case 2:**  
An application requests to send a message to a device as a raw datagram via the GW.    
![](static/c2d.png?raw=true)

## How to run it locally
1. Provision your devices on your IoT Hub.
2. Start the GW (npm start). Edit the environment variables to point at the correct IoT Hub.
3. Get the [AAA Simulator](github.lucarv/aaa_electron).  
4. Get an [NBIOT device simulator](https://github.com/lucarv/nbiot_dev_sim).  
  

## Gateway considerations
The gateway is a cluster with as many worker nodes as there are CPUs in the host machine. start by just typing _npm start_ at the command prompt.  
The device communication can be done on IPv4 or IPv6, all the other communication will be over IPv4.  
The GW can be deployed in a kubernets cluster (yaml in this repo, as a monolithical docker application (docker pull lucarv/nbiot-gateway) or on any machine with node installed.  
The GW uses The following ports:
* UDP port 1812 for RADIUS
* UDP port 41234 for UDP control messages
* UDP port 51000 for UDP payloads
* TCP port 8080 for API calls  

**NOTE**  
Both the GW and the IoT Hub are payload agnostic, and it is up to the application layer to parse the raw message.

**urgents todo:** 
* CoAP Support
