# node-red-contrib-dutch-weather

Combination of a solar position calculation (angle & elevation) and (Dutch) rain providers in order to automate the blinds and screens based on sun position and if it is raining or dry.
In addition it pulls an API from Meteoplaza to give you humidity, barometic pressue, min/max temp for the day, hourly temp statistics, wind direction and speed in Beaufort, m/s and km/h.

Usage:
- Update `config/default.json` with your latitude and longitude
- Execute `EXPORT DEBUG=webunity:weather:*`
- Run `node test.js`
- Use the event emitters in your own code (see `test.js`)
https://fontawesome.com/v4.7.0/icon/wrench