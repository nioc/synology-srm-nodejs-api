'use strict'

const { PROTOCOLS_LABEL, ERRORS_LABEL } = require('./const')

const getErrorMessage = (response) => {
  if (!Object.prototype.hasOwnProperty.call(response, 'error') || !Object.prototype.hasOwnProperty.call(response.error, 'code')) {
    return 'Unknown error (no code)'
  }
  // eslint-disable-next-line security/detect-object-injection
  return ERRORS_LABEL[response.error.code] || `Unknown error (${response.error.code}) ${JSON.stringify(response.error)}`
}

class SrmClient {
  /**
   * Create an instance of SRM client
   *
   * @param {string} baseUrl Your router full URL ('https://10.0.0.1:8001')
   * @param {string} sid Previous session identifier (receive from `authenticate` method)
   * @param {object} requestConfig HTTP request configuration (see https://nodejs.org/api/https.html#httpsrequestoptions-callback)
   * @return {SrmClient} A new instance of SRM client
   */
  constructor (baseUrl, sid = null, requestConfig = {}) {
    if (!baseUrl) {
      throw new Error('Router base URL must be provided')
    }
    this.baseUrl = baseUrl
    this.requestConfig = requestConfig
    this.timeout = requestConfig.timeout || 5000
    this.rejectUnauthorized = requestConfig.rejectUnauthorized || false
    this.sid = sid
    const srmUrl = new URL(this.baseUrl)
    this.protocol = srmUrl.protocol
    this.hostname = srmUrl.hostname
    this.port = srmUrl.port
  }

  /**
   * Return protocol label
   *
   * @param {Number} protocol Protocol identifier
   * @return {string} Protocol label
   */
  getProtocolLabel (protocol) {
    // eslint-disable-next-line security/detect-object-injection
    return PROTOCOLS_LABEL[protocol] || 'Unknown'
  }

  /**
   * Low-level method for requesting SRM API
   *
   * @param {string} path API path (example: '/webapi/entry.cgi')
   * @param {Object} data Data posted in form
   * @return {Promise<Object|Array|String>} Data returned by the API
   */
  async request (path, data) {
    // prepare form data (x-www-form-urlencoded)
    const form = new URLSearchParams(data).toString()
    // prepare request options
    const options = {
      ...this.requestConfig,
      host: this.hostname,
      port: this.port,
      path,
      method: 'POST',
      rejectUnauthorized: this.rejectUnauthorized,
      timeout: this.timeout,
      headers: {
        ...this.requestConfig.headers,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(form),
      },
    }
    if (this.sid !== null) {
      // add session id in cookie
      options.headers.Cookie = `id=${this.sid}`
    }

    // use adequate http(s) library
    const httpLib = this.protocol.startsWith('https') ? require('https') : require('http')
    // do the request
    const response = await new Promise((resolve, reject) => {
      const request = httpLib.request(options, resolve)
      request.on('error', (error) => reject(error))
      request.on('timeout', () => {
        request.destroy()
        reject(new Error('Request timeout'))
      })
      request.write(form)
      request.end()
    })

    // handle returned data
    const resultData = await new Promise((resolve, reject) => {
      response.setEncoding('utf8')
      // handle HTTP status
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error(`${response.statusCode} ${response.statusMessage}`))
      }
      // handle data
      let resultRaw = ''
      response.on('data', (chunk) => (resultRaw += chunk))
      response.on('end', () => resolve(resultRaw))
    })
    const result = JSON.parse(resultData)

    // handle errors
    if (!Object.prototype.hasOwnProperty.call(result, 'success')) {
      throw new Error('Invalid response')
    }
    if (result.success === false) {
      // handle SRM error
      const error = getErrorMessage(result)
      throw new Error(error)
    }

    if (Object.prototype.hasOwnProperty.call(result, 'data')) {
      return result.data
    }
  }

  /**
   * Authenticate with user credentials
   *
   * @param {string} account Your account login ('admin')
   * @param {string} password Your account password
   * @return {Promise<string>} Session identifier
   */
  async authenticate (account = null, password = null) {
    if (!account || !password) {
      throw new Error('Credentials must be provided')
    }
    const data = {
      account,
      passwd: password,
      method: 'Login',
      version: 2,
      api: 'SYNO.API.Auth',
    }
    const response = await this.request('/webapi/auth.cgi', data)
    if (!Object.prototype.hasOwnProperty.call(response, 'sid')) {
      throw new Error('No sid returned')
    }
    this.sid = response.sid
    return response.sid
  }

  /**
   * Logout (destroy session identifier)
   *
   * @return {Promise}
   */
  async logout () {
    const data = {
      method: 'Logout',
      version: 2,
      api: 'SYNO.API.Auth',
    }
    await this.request('/webapi/auth.cgi', data)
    this.sid = null
  }

  /**
   * Retrieve WAN connection status
   *
   * @return {Promise<import("./types.d.ts").WanConnection>} WAN connection (status, ip, interface name)
   *
   */
  async getWanConnectionStatus () {
    const data = {
      method: 'get',
      version: 1,
      api: 'SYNO.Core.Network.Router.ConnectionStatus',
    }
    return (await this.request('/webapi/entry.cgi', data))
  }

  /**
   * Retrieve WAN status
   *
   * @return {Promise<Boolean>} Does WAN is ok
   */
  async getWanStatus () {
    const getWanConnectionStatus = await this.getWanConnectionStatus()
    return getWanConnectionStatus.ipv4.conn_status === 'normal' || getWanConnectionStatus.ipv6.conn_status === 'normal'
  }

  /**
   * Retrieve traffic by device
   *
   * @param {string} interval Traffic interval among `'live', 'day', 'week', 'month'` (default is `'live'`)
   * @return {Promise<import("./types.d.ts").DeviceTraffic[]>} Network traffic by device
   */
  async getTraffic (interval = 'live') {
    if (!['live', 'day', 'week', 'month'].includes(interval)) {
      throw new Error('Interval must be in [\'live\', \'day\', \'week\', \'month\']')
    }
    const data = {
      method: 'get',
      version: 1,
      mode: 'net',
      interval,
      api: 'SYNO.Core.NGFW.Traffic',
    }
    return await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Retrieve utilization by network
   *
   * @return {Promise<import("./types.d.ts").NetworkUtilizationList>} Array of network interfaces with received/transmitted and timestamp
   */
  async getNetworkUtilization () {
    const data = {
      method: 'get',
      version: 1,
      resource: JSON.stringify(['network']),
      api: 'SYNO.Core.System.Utilization',
    }
    return await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Retrieve known devices by router and information like IP, signal, etc...
   *
   * @param {string} info Info requested ('basic' or 'online' for example)
   * @param {string} conntype Connection type filter ('all' or 'wireless', default is 'all')
   * @return {Promise<import("./types.d.ts").Device[]>} Devices
   */
  async getDevices (info = null, conntype = 'all') {
    const data = {
      method: 'get',
      version: 5,
      conntype,
      api: 'SYNO.Core.Network.NSM.Device',
    }
    if (info) {
      data.info = info
    }
    return (await this.request('/webapi/entry.cgi', data)).devices
  }

  /**
   * Retrieve devices connected to Wi-Fi network and information like max rate, signal, etc...
   *
   * @return {Promise<import("./types.d.ts").Device[]>} Wifi devices
   */
  async getWifiDevices () {
    return await this.getDevices('online', 'wireless')
  }

  /**
   * Retrieve mesh nodes and information like current rate, status, number of connected devices, etc...
   *
   * @return {Promise<import("./types.d.ts").MeshNode[]>} Mesh nodes
   */
  async getMeshNodes () {
    const data = {
      method: 'get',
      version: 4,
      api: 'SYNO.Mesh.Node.List',
    }
    return (await this.request('/webapi/entry.cgi', data)).nodes
  }

  /**
   * Retrieve smart WAN gateways
   *
   * @param {string} gatewaytype Gateway type (default: `ipv4`)
   * @return {Promise<import("./types.d.ts").SmartWanGateway[]>} Smart WAN gateways list
   */
  async getSmartWanGateway (gatewaytype = 'ipv4') {
    const data = {
      api: 'SYNO.Core.Network.SmartWAN.Gateway',
      method: 'list',
      version: 1,
      gatewaytype: JSON.stringify(gatewaytype),
    }
    return (await this.request('/webapi/entry.cgi', data)).list
  }

  /**
   * Retrieve smart WAN configuration
   *
   * @return {Promise<import("./types.d.ts").SmartWanConfiguration>} Smart WAN configuration
   */
  async getSmartWan () {
    const data = {
      api: 'SYNO.Core.Network.SmartWAN.General',
      method: 'get',
      version: 1,
    }
    return await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Set smart WAN configuration
   *
   * @param {import("./types.d.ts").SmartWanConfiguration} wanConfig Updated smart WAN configuration
   * @return {Promise<import("./types.d.ts").SmartWanConfiguration>} Smart WAN configuration (example: `{ smartwan_mode: 'failover', dw_weight_ratio: 0, smartwan_ifname_1: 'wan', smartwan_ifname_2: 'lan1', smartwan_failback: true }`)
   */
  async setSmartWan (wanConfig) {
    if (typeof wanConfig !== 'object') {
      throw new Error('Invalid WAN config')
    }
    if (typeof wanConfig.dw_weight_ratio !== 'number' || wanConfig.dw_weight_ratio < 0 || wanConfig.dw_weight_ratio > 100) {
      throw new Error('Invalid dw_weight_ratio')
    }
    if (!['wan', 'lan1', '3glte', 'PPPoE-WAN', 'PPPoE-LAN1', 'vpn', 'wifi24g', 'wifi5g', 'DS-Lite', 'MapE'].includes(wanConfig.smartwan_ifname_1)) {
      throw new Error('Invalid smartwan_ifname_1')
    }
    if (!['wan', 'lan1', '3glte', 'PPPoE-WAN', 'PPPoE-LAN1', 'vpn', 'wifi24g', 'wifi5g', 'DS-Lite', 'MapE'].includes(wanConfig.smartwan_ifname_2)) {
      throw new Error('Invalid smartwan_ifname_2')
    }
    if (!['failover', 'loadbalancing_failover'].includes(wanConfig.smartwan_mode)) {
      throw new Error('Invalid smartwan_mode')
    }
    const data = {
      api: 'SYNO.Core.Network.SmartWAN.General',
      method: 'set',
      version: 1,
      ...wanConfig,
    }
    return await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Switch smart WAN interfaces
   *
   * @return {Promise<import("./types.d.ts").SmartWanConfiguration>} Smart WAN configuration
   */
  async switchSmartWan () {
    const current = await this.getSmartWan()
    const ifname1 = current.smartwan_ifname_1
    current.smartwan_ifname_1 = current.smartwan_ifname_2
    current.smartwan_ifname_2 = ifname1
    return await this.setSmartWan(current)
  }

  /**
   * Retrieve policy rules
   *
   * @return {Promise<import("./types.d.ts").PolicyRoutes[]>} Policy rules
   */
  async getPolicyRoutes () {
    const data = {
      method: 'get',
      version: 1,
      api: 'SYNO.Core.Network.Router.PolicyRoute',
      type: 'ipv4',
    }
    return (await this.request('/webapi/entry.cgi', data)).rules
  }

  /**
   * Set policy rules (require to provided all rules)
   *
   * @param {import("./types.d.ts").PolicyRoutes[]} rules Updated policy rules
   */
  async setPolicyRoutes (rules) {
    const data = {
      method: 'set',
      version: 1,
      api: 'SYNO.Core.Network.Router.PolicyRoute',
      type: 'ipv4',
      rules: JSON.stringify(rules),
    }
    await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Retrieve devices where wake on lan is configured
   *
   * @return {Promise<import("./types.d.ts").WakeOnLanDevice[]>} Devices
   */
  async getWakeOnLanDevices () {
    const data = {
      api: 'SYNO.Core.Network.WOL',
      method: 'get_devices',
      version: 1,
      findhost: false,
      client_list: JSON.stringify([]),
    }
    return await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Add wake on lan to the provided device
   *
   * @param {string} mac Device MAC address
   * @param {string} host Device hostname
   */
  async addWakeOnLan (mac, host = null) {
    const data = {
      api: 'SYNO.Core.Network.WOL',
      method: 'add_device',
      version: 1,
      mac: JSON.stringify(mac),
    }
    if (host) {
      data.host = JSON.stringify(host)
    }
    await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Wake a device from LAN
   *
   * @param {string} mac Device MAC address
   */
  async wakeOnLan (mac) {
    const data = {
      api: 'SYNO.Core.Network.WOL',
      method: 'wake',
      version: 1,
      mac: JSON.stringify(mac),
    }
    await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Retrieve Quality Of Service rules by devices (guaranteed/maximum for upload/download and protocols)
   *
   * @return {Promise<import("./types.d.ts").QosRule[]>} Devices Qos rules
   */
  async getQos () {
    const data = {
      api: 'SYNO.Core.NGFW.QoS.Rules',
      method: 'get',
      version: 1,
    }
    return (await this.request('/webapi/entry.cgi', data)).rules
  }

  /**
   * Retrieve access control groups (safe search)
   *
   * @param {Boolean} requestOnlineStatus Does the group online status has to be computed (require to request devices)
   * @param {Array} additional Additional information requested
   * @return {Promise<import("./types.d.ts").AccessControlGroup[]>} Access control groups
   */
  async getAccessControlGroups (requestOnlineStatus = false, additional = ['device', 'total_timespent']) {
    const data = {
      api: 'SYNO.SafeAccess.AccessControl.ConfigGroup',
      method: 'get',
      version: 1,
      additional: JSON.stringify(additional),
    }
    const groups = (await this.request('/webapi/entry.cgi', data)).config_groups
    if (requestOnlineStatus === true) {
      try {
        const devices = await this.getDevices('basic')
        this.computeAccessControlGroupStatus(groups, devices)
      } catch (error) {
        console.log(`Error during device recuperation: ${error.message}`)
      }
    }
    return groups
  }

  /**
   * Compute online status for each access control groups
   *
   * @param {import("./types.d.ts").AccessControlGroup[]} groups Access control groups (from `getAccessControlGroups`) on which to add `online` status
   * @param {import("./types.d.ts").Device[]} devices Knowned devices (from `getDevices`)
   */
  computeAccessControlGroupStatus (groups, devices) {
    // filter online devices
    const onlineDevices = devices
      .filter((device) => device.is_online === true)
      .map((device) => device.mac)
    // set access control group online status
    groups.forEach((group) => {
      const groupOnlineDevices = group.devices.filter(mac => onlineDevices.includes(mac))
      group.online_device_count = groupOnlineDevices.length
      group.online = group.online_device_count > 0
    })
  }

  /**
   * Retrieve Wi-Fi settings
   *
   * @return {Promise<import("./types.d.ts").WifiSettings[]>} Wi-Fi settings
   */
  async getWifiSettings () {
    const data = {
      api: 'SYNO.Wifi.Network.Setting',
      method: 'get',
      version: 1,
    }
    return (await this.request('/webapi/entry.cgi', data)).profiles
  }

  /**
   * Update Wi-Fi settings
   *
   * @param {import("./types.d.ts").WifiSettings[]} profiles Updated Wi-Fi settings
   */
  async setWifiSettings (profiles) {
    const data = {
      api: 'SYNO.Wifi.Network.Setting',
      method: 'set',
      version: 1,
      profiles: JSON.stringify(profiles),
    }
    await this.request('/webapi/entry.cgi', data)
  }

  /**
   * Enable or disable a Wi-Fi radio by its SSID
   *
   * @param {string} ssid Service Set IDentifier (Wi-Fi network name)
   */
  async switchWifiRadio (ssid) {
    if (ssid === undefined) {
      throw new Error('You must provide the network SSID')
    }
    const currentWiFiSettings = await this.getWifiSettings()
    const updatedProfile = currentWiFiSettings
      .find(profile => profile.radio_list
        .some(radio => radio.ssid === ssid))
    if (updatedProfile === undefined) {
      throw new Error('The SSID provided was not found')
    }
    updatedProfile.radio_list
      .filter(radio => radio.ssid === ssid)
      .forEach(radio => {
        radio.enable = !radio.enable
      })
    await this.setWifiSettings([updatedProfile])
  }
}

module.exports = { SrmClient }
