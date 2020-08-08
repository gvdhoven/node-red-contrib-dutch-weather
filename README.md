
# node-red-contrib-dutch-weather

A combination of a solar position calculation (angle & elevation) and (Dutch) weather providers in order to, for example, automate blinds and screens based on sun position (or) expected rain.

[![NPM](https://nodei.co/npm/node-red-contrib-dutch-weather.png)](https://nodei.co/npm/node-red-contrib-dutch-weather/)

Provides several nodes for receiving (Dutch) weather related events.

| Node name | Description |
| --- | --- |
| `sun-position` | Sun position based on calculation. |
| `solar-events` | Solar events based on calculation. |
| `rain-state` | Rain state based on external sources. Used are Buienradar and Buienalarm. |
| `meteoplaza` | Weather forecast based on external source. For this Meteoplaza is used. |

## Installation

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
$ npm install node-red-contrib-dutch-weather
```

## Configuration

For all nodes, you'll need to create at least one configuration. Drag one of the exposed nodes to your flow and set it up just like all other config nodes. After that, you can use the event emitters in your own code.

## Custom update interval and forcing 'updates'

By default any node will automatically refresh once on deployment of the flow. Since version 1.3.0 there is the possibility to set a custom interval for each node when it should refresh. In case you are migrating from a previous version, sane values are set. Setting a value of "-1" for the update interval disables updates entirely.
This is usefull in case you want to inject a message when you require an update. Send any payload into any of the four nodes to trigger an update of that particular node _and_ reset the update interval (if it was set at all).

## Testing locally

Since version 1.3.1, the nodes which are available have been changed and/or emit different messages. A local test can be exected with the following commands:

```bash
$ node local-test.js
```

See below for sample messages since 1.3.1.

### Node `sun-position` sample:

    {
       "azimuth":217.04,
       "elevation":57.89,
       "date":"2020-06-19T11:01:24.489Z"
    }
	

### Node `solar-events` sample:

    {
       "sunrise":"2020-06-19T05:22:17.230Z",
       "solarNoon":"2020-06-19T13:40:55.684Z",
       "sunset":"2020-06-19T21:59:34.137Z",
       "goldenHourEnd":"2020-06-19T06:16:22.761Z",
       "goldenHourStart":"2020-06-19T21:05:28.606Z"
    }

### Node `rain-state` sample:

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
	

### Node `meteoplaza` sample:

    {
       "now":{
          "icon":"C001D",
          "temp":22,
          "tempFeelsLike":25,
          "sunProbability":54,
          "precipitation":0.1,
          "pressure":1015.9,
          "humidity":52,
          "cloudCoverage":68,
          "wind":{
             "direction":"WZW",
             "speed":3,
             "speedMs":4.1,
             "speedKmh":15
          }
       },
       "today":{
          "tempMin":16,
          "tempMax":23,
          "astro":{
             "currentTime":"2020-06-19T15:41:47+02:00",
             "sunRise":"2020-06-19T05:21:00+02:00",
             "sunSet":"2020-06-19T21:58:00+02:00",
             "dayLengthHrs":"16:37",
             "moonPhase":{
                "newMoon":"2020-06-21 08:42",
                "fullMoon":"2020-07-05 06:45",
                "firstQuarter":"2020-06-28 10:17",
                "lastQuarter":"2020-07-13 01:31"
             }
          },
          "dataPerHour":{
             "15":{
                "icon":"C001D",
                "temp":22,
                "tempFeelsLike":25,
                "sunProbability":54,
                "precipitation":0.1,
                "pressure":1015.9,
                "humidity":52,
                "cloudCoverage":68,
                "wind":{
                   "direction":"WZW",
                   "speed":3,
                   "speedMs":4.1,
                   "speedKmh":15
                }
             },
             "16":{
                "icon":"C001D",
                "temp":23,
                "tempFeelsLike":25,
                "sunProbability":54,
                "precipitation":0.1,
                "pressure":1016,
                "humidity":51,
                "cloudCoverage":69,
                "wind":{
                   "direction":"WZW",
                   "speed":3,
                   "speedMs":3.9,
                   "speedKmh":14
                }
             },
             "17":{
                "icon":"A007D",
                "temp":23,
                "tempFeelsLike":25,
                "sunProbability":52,
                "precipitation":0,
                "pressure":1016.1,
                "humidity":50,
                "cloudCoverage":71,
                "wind":{
                   "direction":"W",
                   "speed":3,
                   "speedMs":3.8,
                   "speedKmh":14
                }
             },
             "18":{
                "icon":"C001D",
                "temp":22,
                "tempFeelsLike":25,
                "sunProbability":53,
                "precipitation":0.1,
                "pressure":1016.2,
                "humidity":51,
                "cloudCoverage":64,
                "wind":{
                   "direction":"WNW",
                   "speed":3,
                   "speedMs":4.2,
                   "speedKmh":15
                }
             },
             "19":{
                "icon":"C002D",
                "temp":23,
                "tempFeelsLike":25,
                "sunProbability":51,
                "precipitation":0.4,
                "pressure":1016.4,
                "humidity":54,
                "cloudCoverage":63,
                "wind":{
                   "direction":"WNW",
                   "speed":3,
                   "speedMs":4.7,
                   "speedKmh":17
                }
             },
             "20":{
                "icon":"A006D",
                "temp":20,
                "tempFeelsLike":20,
                "sunProbability":54,
                "precipitation":0,
                "pressure":1016.9,
                "humidity":63,
                "cloudCoverage":51,
                "wind":{
                   "direction":"WNW",
                   "speed":3,
                   "speedMs":4.3,
                   "speedKmh":15
                }
             },
             "21":{
                "icon":"A003D",
                "temp":18,
                "tempFeelsLike":18,
                "sunProbability":56,
                "precipitation":0,
                "pressure":1017.4,
                "humidity":73,
                "cloudCoverage":45,
                "wind":{
                   "direction":"WNW",
                   "speed":2,
                   "speedMs":3.3,
                   "speedKmh":12
                }
             },
             "22":{
                "icon":"A003N",
                "temp":17,
                "tempFeelsLike":17,
                "sunProbability":0,
                "precipitation":0,
                "pressure":1018.2,
                "humidity":81,
                "cloudCoverage":39,
                "wind":{
                   "direction":"WNW",
                   "speed":2,
                   "speedMs":2.3,
                   "speedKmh":8
                }
             },
             "23":{
                "icon":"A002N",
                "temp":16,
                "tempFeelsLike":16,
                "sunProbability":0,
                "precipitation":0,
                "pressure":1018.6,
                "humidity":87,
                "cloudCoverage":33,
                "wind":{
                   "direction":"W",
                   "speed":2,
                   "speedMs":1.6,
                   "speedKmh":6
                }
             }
          }
       }
    }

