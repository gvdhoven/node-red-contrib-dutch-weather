
# node-red-contrib-dutch-weather

A combination of a solar position calculation (angle & elevation) and (Dutch) weather providers in order to, for example, automate blinds and screens based on sun position (or) expected rain.

[![NPM](https://nodei.co/npm/node-red-contrib-dutch-weather.png)](https://nodei.co/npm/node-red-contrib-dutch-weather/)

Provides several nodes for receiving (Dutch) weather related events.

| Node name | Description |
| --- | --- |
| `dutch-weather-rain-state` | Rain state based on external sources. Used are Buienradar and Buienalarm. |

## Installation

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
$ npm install node-red-contrib-dutch-weather
```

## Configuration

For all nodes, you'll need to create at least one configuration. Drag one of the exposed nodes to your flow and set it up just like all other config nodes. After that, you can use the event emitters in your own code.

## Release 3.0.0

* Fixed issue where `prediction` field was not present in rain-data payload.
* Node `dutch-weather-meteoplaza` was **removed**: Meteoplaza has been acquired by Buienradar and the original API used in this code is no longer accessible. You should decide yourself if you are going to keep using this node for rain prediction (since it is still based on both Buienalarm and Buienradar)


## Release 2.0.7

* Added 'lastUpdate' field.

## Release 2.0.6

* After some time the rain-node was not giving any output anymore; the time in between working and not varies from various minutes to hours. Previously the script required both Buienradar and Meteoplaza to respond with a valid response when asking for the current rain state; this is changed so that only 1 of the systems would need to provide accurate values.

## Release 2.0.3

* Node `dutch-weather-sun-position` (and) `dutch-weather-solar-events` **removed**: There is a much better node-red node you can use: [node-red-contrib-sun-position](https://flows.nodered.org/node/node-red-contrib-sun-position/)
* **Automatic refresh removed**: The javascript timers sometimes stopped working, which in the worst case led to rain being reported while it was already dry for days; since Node-red has timer nodes built in, i've removed the javascript timers from the code completely. In order to get updated data you have to send a message on the input of a node **with payload** `{ trigger: true }` for it to update.

## Release 2.0.0

* **Backwards compatible breaking change:** The nodes have been renamed to prevent a conflict with the `node-red-contrib-sun-position` package.

## Testing locally

Since version 1.3.1, the nodes which are available have been changed and/or emit different messages. A local test can be exected with the following commands:

```bash
$ node local-test.js
```

See below for sample messages since 2.0.x

### Node `dutch-weather-rain-state` sample:

    {
       "now":{
          "atTimeIso8601":"2020-06-19T15:30:00.000+02:00",
          "inMinutes":0,
          "state":"dry",
          "probability":100,
          "precipitation":{
             "buienRadar":0,
             "buienAlarm":0
          },
          "message":"It is dry."
       },
       "prediction":{
          "atTimeIso8601":"2020-06-19T16:30:00.000+02:00",
          "inMinutes":60,
          "state":"raining",
          "probability":100,
          "precipitation":{
             "buienRadar":5,
             "buienAlarm":3.2
          },
          "message":"..."
       }
    }
	