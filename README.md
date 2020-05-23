# node-red-contrib-dutch-weather

Combination of a solar position calculation (angle & elevation) and (Dutch) rain providers in order to, for example, automate the blinds and screens based on sun position and if it is raining or dry.
In addition it pulls an API from Meteoplaza to give you humidity, barometic pressue, min/max temp for the day, hourly temp statistics, wind direction and speed in Beaufort, m/s and km/h.

Usage:
- Install in node-red via the package manager
- Drag one of the nodes onto your flow
- Setup the configuration node with your latitude and longitude.
- Use the event emitters in your own code.