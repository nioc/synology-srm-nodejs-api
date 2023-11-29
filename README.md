# synology-srm-nodejs-api

[![license: AGPLv3](https://img.shields.io/badge/license-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Build Status](https://img.shields.io/github/workflow/status/nioc/synology-srm-nodejs-api/Commit%20check%20(lint%2C%20tests))](https://github.com/nioc/synology-srm-nodejs-api/actions/workflows/commit.yml)
[![Coverage Status](https://coveralls.io/repos/github/nioc/synology-srm-nodejs-api/badge.svg?branch=master)](https://coveralls.io/github/nioc/synology-srm-nodejs-api?branch=master)
[![GitHub release](https://img.shields.io/github/release/nioc/synology-srm-nodejs-api.svg)](https://github.com/nioc/synology-srm-nodejs-api/releases/latest)
[![npms.io (final)](https://img.shields.io/npms-io/final-score/synology-srm-nodejs-api)](https://www.npmjs.com/package/synology-srm-nodejs-api)
[![npm](https://img.shields.io/npm/dt/synology-srm-nodejs-api)](https://www.npmjs.com/package/synology-srm-nodejs-api)

Node.js wrapper for Synology SRM API.

## Key features
-    authentication
-    get WAN status,
-    get WAN connection (ip, status, interface name),
-    get network utilization,
-    get devices with status, IP, etc... ,
-    get wifi devices with link quality, signal strength, max rate, band used, etc... ,
-    get devices traffic usage (live, day, week, month),
-    get mesh nodes with status, connected devices, etc... ,
-    get and update policy rules,
-    get access control groups with devices, online status, etc... ,
-    get Quality Of Service rules by devices,
-    get Smart WAN configuration (gateways list with status, load balancing / failover),
-    set Smart WAN configuration and switch WAN gateway,
-    get wake-on-lan devices,
-    add wake-on-lan on a device,
-    wake-on-lan a device.

## Installation

``` bash
npm install synology-srm-nodejs-api
```

## Usage

### Basic example
```js
const { SrmClient } = require('synology-srm-nodejs-api')

// you need to set your own information
const baseUrl = 'https://10.0.0.1:8001'
const login = 'admin-user'
const password = 'admin-password'

async function main () {
  try {
    // create client
    const client = new SrmClient(baseUrl, null, { timeout: 5000 })

    // authenticate
    const sid = await client.authenticate(login, password)
    console.log(`Session Id for further usage: ${sid}`)

    // get WAN status
    const wanStatus = await client.getWanStatus()
    console.log(`WAN is connected: ${wanStatus}`)

    // get known devices
    const devices = await client.getDevices()
    console.log(`Known devices: ${JSON.stringify(devices)}`)

    // get control groups
    const groups = await client.getAccessControlGroups(true)
    console.log(`Control groups: ${JSON.stringify(groups)}`)

    // update policy rules
    const rules = await client.getPolicyRoutes()
    console.log(`${JSON.stringify(rules)}`)
    // change something before set
    await client.setPolicyRoutes(rules)
  } catch (error) {
    console.log('error (main)', error.message)
  }
}

main()
```

## Versioning

synology-srm-nodejs-api is maintained under the [semantic versioning](https://semver.org/) guidelines.

See the [releases](https://github.com/nioc/synology-srm-nodejs-api/releases) on this repository for changelog.

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE.md) file for details
