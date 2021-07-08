
# node-red-contrib-dutch-weather

A combination of a solar position calculation (angle & elevation) and (Dutch) weather providers in order to, for example, automate blinds and screens based on sun position (or) expected rain.

[![NPM](https://nodei.co/npm/node-red-contrib-dutch-weather.png)](https://nodei.co/npm/node-red-contrib-dutch-weather/)

Provides several nodes for receiving (Dutch) weather related events.

| Node name | Description |
| --- | --- |
| `dutch-weather-rain-state` | Rain state based on external sources. Used are Buienradar and Buienalarm. |
| `dutch-weather-meteoplaza` | Weather forecast based on external source. For this Meteoplaza is used. |

## Installation

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
$ npm install node-red-contrib-dutch-weather
```

## Configuration

For all nodes, you'll need to create at least one configuration. Drag one of the exposed nodes to your flow and set it up just like all other config nodes. After that, you can use the event emitters in your own code.


## Release 3.0.0

* Fixed a bug which caused the cache from Buienalarm to not be used
* Added a workaround for invalid JSON results from Buienalarm (e.g. add a retry for a max of 3 times with a delay of a second in between) to increase chances of success
* Added `lastFetched` property to all nodes. This contains the last time the node was updated.
* Changed `state` property to reflect the rainfall which is based on the average of available sources for a given time:
  * `dry` for values > 0 and < 0.2 mm/hour
  * `light rain` for values >= 0.2 and < 1
  * `moderate rain` for values >= 1.0 and < 2.5
  * `heavy rain` for values >= 2.5
* Changed `msg` property to better word the current state and prediction based on the fact if it is currently raining or not.
* Sometimes Buienalarm or Buienradar returns an invalid result, most probably due to rate limiting.
  * In case we did not have a previous result (for example, only 1 source is available) we change the `probability` to be based on the amount of sources available. Previously it was then 50%, but from now on; in case only 1 source is available the probability will be 100%.
  * In case we already had a valid result before, we re-use those results. This prevents 'flippering' values from a valid result to -1 back to a valid result etc.
* Breaking change: Changed the precipitation `in minutes` response to actual javascript dates, needed for the 'rain state at time' feature and in case either source gave an invalid result so we can re-baseline based on date/times.


## Release 2.0.12

* Made `meteo-plaza` even more resilient against failing requests.
* Changed `meteo-plaza` response `today.astro.dayLengthHrs` to `today.astro.dayLength` to match the naming of the source.


## Release 2.0.11

* Made `meteo-plaza` a bit more resilient against failing requests.
* Added 'random()' time to all requests to prevent caching.


## Release 2.0.10

* Ensured `prediction` field is present in rain-state even if the state remains thesame.

## Release 2.0.7

* Added 'lastUpdate' field.

## Release 2.0.6

* After some time the rain-node was not giving any output anymore; the time in between working and not varies from various minutes to hours. Previously the script required both Buienradar and Meteoplaza to respond with a valid response when asking for the current rain state; this is changed so that only 1 of the systems would need to provide accurate values.

## Release 2.0.3

* `dutch-weather-sun-position` (and) `dutch-weather-solar-events` **removed**: There is a much better node-red node you can use: [node-red-contrib-sun-position](https://flows.nodered.org/node/node-red-contrib-sun-position/)
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


### Node `dutch-weather-meteoplaza` sample:

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
             "dayLength":"16:37",
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

