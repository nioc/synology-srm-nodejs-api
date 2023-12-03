/* eslint-disable node/no-unpublished-require */
const { describe, it, before, beforeEach, after } = require('mocha')
const assert = require('assert')
const sinon = require('sinon')

const nock = require('nock')
const { SrmClient } = require('../lib/')

const baseUrl = 'http://localhost:8000'
const baseUrlHttps = 'https://localhost:8001'
const pathAuth = '/webapi/auth.cgi'
const pathEntry = '/webapi/entry.cgi'
const requestConfig = { dummy: '1', timeout: 100 }
const account = 'admin'
const password = 'mypassword'
const sid = '0123456789abcdef'
const devices = [{ dev_type: 'cam', hostname: 'Camera', ip6_addr: '', ip_addr: '10.0.0.2', is_online: false, is_wireless: true, mac: 'aa:aa:aa:aa:aa:01', mesh_node_id: -1 }, { band: '2.4G', current_rate: 65, dev_type: 'air_conditioner', hostname: 'AC', ip6_addr: '', ip_addr: '10.0.0.3', is_guest: false, is_manual_dev_type: true, is_manual_hostname: true, is_online: true, is_wireless: true, mac: 'aa:aa:aa:aa:aa:02', max_rate: 86, mesh_node_id: 0, rate_quality: 'high', signalstrength: 49, transferRXRate: 0, transferTXRate: 0 }, { dev_type: 'default', hostname: 'rpi4', ip6_addr: '', ip_addr: '10.0.0.4', is_manual_dev_type: true, is_manual_hostname: true, is_online: true, is_wireless: false, mac: 'aa:aa:aa:aa:aa:03', mesh_node_id: -1 }, { dev_type: 'nb', hostname: 'Laptop', ip6_addr: '', ip_addr: '10.0.0.5', is_online: false, is_wireless: true, mac: 'aa:aa:aa:aa:aa:04', mesh_node_id: -1 }]
const groups = [{ config_group_id: 2, device_count: 2, devices: ['aa:aa:aa:aa:aa:01', 'aa:aa:aa:aa:aa:02'], name: 'Admin', pause: false, profile_id: 2, timespent: { has_quota: false, quota: 0, total_spent: { normal: 735, reward: 0 } } }, { config_group_id: 3, device_count: 3, devices: ['aa:aa:aa:aa:aa:03', 'aa:aa:aa:aa:aa:04'], name: 'Guest', pause: false, profile_id: 3, timespent: { has_quota: false, quota: 0, total_spent: { normal: 735, reward: 0 } } }]
const profiles = [{ id: 0, radio_list: [{ ssid: 'MyPrimary', enable: true, radio_type: 'SmartConnect' }] }, { id: 1, radio_list: [{ ssid: 'MyGuest', enable: false, radio_type: 'SmartConnect' }] }]

before(() => {
  nock.disableNetConnect()
})

beforeEach(() => {
  nock.cleanAll()
})

after(() => {
  nock.enableNetConnect()
})

describe('Create SrmClient', () => {
  it('should throw error if no base url is provided', () => {
    assert.throws(() => new SrmClient(null, null, requestConfig), Error)
  })
  it('should throw error if base url provided is invalid', () => {
    assert.throws(() => new SrmClient('localhost/', null, requestConfig), Error)
  })
  it('should return a new instance of SrmClient with valid parameters', () => {
    const requestConfigFull = {
      rejectUnauthorized: true,
      timeout: 200,
      headers: {
        'user-agent': 'test',
      },
    }
    const client = new SrmClient(baseUrl, null, requestConfigFull)
    assert.strictEqual(client instanceof SrmClient, true)
    assert.strictEqual(client.requestConfig, requestConfigFull)
    assert.strictEqual(client.timeout, 200)
    assert.strictEqual(client.protocol, 'http:')
    assert.strictEqual(client.rejectUnauthorized, true)
  })
  it('should return a new instance of SrmClient even without request config provided', () => {
    const client = new SrmClient(baseUrl)
    assert.strictEqual(client instanceof SrmClient, true)
    assert.strictEqual(client.timeout, 5000)
    assert.strictEqual(client.protocol, 'http:')
    assert.strictEqual(client.hostname, 'localhost')
    assert.strictEqual(client.port, '8000')
    assert.strictEqual(client.rejectUnauthorized, false)
  })
  it('should return a new instance of SrmClient using https', () => {
    const client = new SrmClient(baseUrlHttps)
    assert.strictEqual(client instanceof SrmClient, true)
    assert.strictEqual(client.timeout, 5000)
    assert.strictEqual(client.protocol, 'https:')
    assert.strictEqual(client.hostname, 'localhost')
    assert.strictEqual(client.port, '8001')
  })
  it('should return a new instance of SrmClient with sid provided', () => {
    const client = new SrmClient(baseUrl, sid)
    assert.strictEqual(client instanceof SrmClient, true)
    assert.strictEqual(client.sid, sid)
  })
})

describe('Get protocol label', () => {
  it('should return the correct label for a valid code', () => {
    const client = new SrmClient(baseUrl)
    assert.strictEqual(client.getProtocolLabel(100), 'SIP')
  })
  it('should return "Unknown" for an invalid code', () => {
    const client = new SrmClient(baseUrl)
    assert.strictEqual(client.getProtocolLabel(100000), 'Unknown')
  })
})

describe('Request', () => {
  it('throw error in case of HTTP 500 error', async () => {
    nock(baseUrl)
      .post('/http500')
      .reply(500)
    const client = new SrmClient(baseUrl, sid, requestConfig)
    await assert.rejects(async () => await client.request('/http500', {}), { name: 'Error', message: '500 null' })
  })
  it('throw error in case of HTTP 101', async () => {
    nock(baseUrl)
      .post('/http101')
      .reply(101)
    const client = new SrmClient(baseUrl, sid, requestConfig)
    await assert.rejects(async () => await client.request('/http101', {}), { name: 'Error', message: '101 null' })
  })
  it('throw error in case of timeout', async () => {
    nock(baseUrl)
      .post('/timeout')
      .delay(200)
      .reply(200, { data: {}, success: true })
    const client = new SrmClient(baseUrl, sid, requestConfig)
    assert.strictEqual(client.timeout, 100)
    await assert.rejects(async () => await client.request('/timeout', {}), { name: 'Error', message: 'Request timeout' })
  })
  it('throw error if status is missing', async () => {
    nock(baseUrl)
      .post('/missing_success')
      .reply(200, { data: {} })
    const client = new SrmClient(baseUrl, sid, requestConfig)
    assert.strictEqual(client.timeout, 100)
    await assert.rejects(async () => await client.request('/missing_success', {}), { name: 'Error', message: 'Invalid response' })
  })
  it('throw error with custom message for error without code', async () => {
    nock(baseUrl)
      .post('/unknown_error_code')
      .reply(200, { error: { }, success: false })
    const client = new SrmClient(baseUrl, sid, requestConfig)
    await assert.rejects(async () => await client.request('/unknown_error_code', {}), { name: 'Error', message: 'Unknown error (no code)' })
  })
  it('throw error with custom message for unknown code', async () => {
    nock(baseUrl)
      .post('/unknown_error_code')
      .reply(200, { error: { code: 12345 }, success: false })
    const client = new SrmClient(baseUrl, sid, requestConfig)
    await assert.rejects(async () => await client.request('/unknown_error_code', {}), { name: 'Error', message: 'Unknown error (12345) {"code":12345}' })
  })
  it('should works if data is missing', async () => {
    nock(baseUrl)
      .post('/missing_data')
      .reply(200, { success: true })
    const client = new SrmClient(baseUrl, sid, requestConfig)
    const result = await client.request('/missing_data', {})
    assert.strictEqual(result, undefined)
  })
  it('should works with https', async () => {
    nock(baseUrlHttps)
      .post('/')
      .reply(200, { data: { key: 'value' }, success: true })
    const client = new SrmClient(baseUrlHttps, sid, requestConfig)
    const result = await client.request('/', {})
    assert.strictEqual(result.key, 'value')
  })
  it('should send cookie with sid', async () => {
    nock(baseUrl, {
      reqheaders: {
        cookie: `id=${sid}`,
      },
    })
      .post('/')
      .reply(200, { data: { key: 'value' }, success: true })
    const client = new SrmClient(baseUrl, sid, requestConfig)
    const result = await client.request('/', {})
    assert.strictEqual(result.key, 'value')
  })
})

describe('Authenticate', () => {
  beforeEach(() => {
    nock(baseUrl)
      // valid auth
      .post(pathAuth, `account=${account}&passwd=${password}&method=Login&version=2&api=SYNO.API.Auth`)
      .delay(10)
      .reply(200, { data: { sid }, success: true })
      // valid auth (no sid)
      .post(pathAuth, 'account=nosid&passwd=nosid&method=Login&version=2&api=SYNO.API.Auth')
      .delay(10)
      .reply(200, { data: {}, success: true })
      // invalid auth (bad credentials)
      .post(pathAuth)
      .delay(10)
      .reply(200, { error: { code: 400 }, success: false })
  })

  it('throw error if account is not provided', async () => {
    const client = new SrmClient(baseUrl)
    await assert.rejects(async () => await client.authenticate(undefined, 'dummy'), { name: 'Error', message: 'Credentials must be provided' })
  })
  it('throw error if password is not provided', async () => {
    const client = new SrmClient(baseUrl)
    await assert.rejects(async () => await client.authenticate('dummy'), { name: 'Error', message: 'Credentials must be provided' })
  })
  it('throw error with invalid credential', async () => {
    const client = new SrmClient(baseUrl)
    await assert.rejects(async () => await client.authenticate('dummy', 'dummy'), { name: 'Error', message: 'Invalid credentials' })
  })
  it('throw error if response is not valid', async () => {
    const client = new SrmClient(baseUrl)
    await assert.rejects(async () => await client.authenticate('nosid', 'nosid'), { name: 'Error', message: 'No sid returned' })
  })
  it('should return a session identifier with valid credential', async () => {
    const client = new SrmClient(baseUrl)
    const sidReceived = await client.authenticate(account, password)
    assert.strictEqual(sidReceived, sid)
  })
})

describe('Logout', () => {
  it('should call API and clean session id', async () => {
    const scope = nock(baseUrl)
      .post(pathAuth, 'method=Logout&version=2&api=SYNO.API.Auth')
      .delay(10)
      .reply(200, { data: {}, success: true })
    const client = new SrmClient(baseUrl, sid)
    assert.strictEqual(client instanceof SrmClient, true)
    assert.strictEqual(client.sid, sid)
    await client.logout()
    assert.strictEqual(scope.isDone(), true)
    assert.strictEqual(client.sid, null)
  })
})

describe('get WAN connection status', () => {
  it('should return an object with ipv4 and ipv6 attributes', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=1&api=SYNO.Core.Network.Router.ConnectionStatus')
      .reply(200, { data: { ipv4: { conn_status: 'normal', ifname: 'eth0', ip: '192.168.1.16', pppoe: false, vpn_profile: '' }, ipv6: { conn_status: 'not available', ifname: '', ip: '', pppoe: true } }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getWanConnectionStatus()
    assert.strictEqual(result.ipv4.ip, '192.168.1.16')
    assert.strictEqual(result.ipv4.conn_status, 'normal')
    assert.strictEqual(result.ipv6.conn_status, 'not available')
  })
})

describe('get WAN status', () => {
  it('should return true if there is an IPv4 connection', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=1&api=SYNO.Core.Network.Router.ConnectionStatus')
      .reply(200, { data: { ipv4: { conn_status: 'normal', ifname: 'eth0', ip: '192.168.1.16', pppoe: false, vpn_profile: '' }, ipv6: { conn_status: 'not available', ifname: '', ip: '', pppoe: true } }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getWanStatus()
    assert.strictEqual(result, true)
  })
  it('should return true if there is an IPv6 connection', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=1&api=SYNO.Core.Network.Router.ConnectionStatus')
      .reply(200, { data: { ipv4: { conn_status: 'not available', ifname: '', ip: '', pppoe: true }, ipv6: { conn_status: 'normal', ifname: 'eth0', ip: '2001:0db8:0000:85a3:0000:0000:ac1f:8001', pppoe: false, vpn_profile: '' } }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getWanStatus()
    assert.strictEqual(result, true)
  })
  it('should return false if there is no connection', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=1&api=SYNO.Core.Network.Router.ConnectionStatus')
      .reply(200, { data: { ipv4: { conn_status: 'not available', ifname: '', ip: '', pppoe: true }, ipv6: { conn_status: 'not available', ifname: '', ip: '', pppoe: true } }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getWanStatus()
    assert.strictEqual(result, false)
  })
})

describe('get traffic', () => {
  it('throw error if interval is not in list', async () => {
    const client = new SrmClient(baseUrl)
    await assert.rejects(async () => await client.getTraffic('invalid'), { name: 'Error', message: 'Interval must be in [\'live\', \'day\', \'week\', \'month\']' })
  })
  it('should return a array with default interval', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=1&mode=net&interval=live&api=SYNO.Core.NGFW.Traffic')
      .reply(200, { data: [], success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getTraffic()
    assert.deepEqual(result, [])
  })
})

describe('get network utilization', () => {
  it('should return an object with network array and time', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=1&resource=%5B%22network%22%5D&api=SYNO.Core.System.Utilization')
      .reply(200, { data: { network: [], time: 1234 }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getNetworkUtilization()
    assert.deepEqual(result.network, [])
    assert.strictEqual(result.time, 1234)
  })
})

describe('get devices', () => {
  it('should return a array with default info', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=5&conntype=all&api=SYNO.Core.Network.NSM.Device')
      .reply(200, { data: { devices: [] }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getDevices()
    assert.deepEqual(result, [])
  })
})

describe('get wifi devices', () => {
  it('should return a array', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=5&conntype=wireless&api=SYNO.Core.Network.NSM.Device&info=online')
      .reply(200, { data: { devices: [] }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getWifiDevices()
    assert.deepEqual(result, [])
  })
})

describe('get mesh nodes', () => {
  it('should return a array', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=4&api=SYNO.Mesh.Node.List')
      .reply(200, { data: { nodes: [] }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getMeshNodes()
    assert.deepEqual(result, [])
  })
})

describe('get Smart WAN gateways', () => {
  it('should return a array', async () => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.Network.SmartWAN.Gateway&method=list&version=1&gatewaytype=%22ipv4%22')
      .reply(200, { data: { list: [] }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getSmartWanGateway()
    assert.deepEqual(result, [])
  })
})

describe('get Smart WAN general configuration', () => {
  it('should return configuration object', async () => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.Network.SmartWAN.General&method=get&version=1')
      .reply(200, { data: {}, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getSmartWan()
    assert.deepEqual(result, {})
  })
})

describe('set Smart WAN general configuration', () => {
  it('throw error if WAN config is not provided or invalid', async () => {
    const client = new SrmClient(baseUrl, sid)
    await assert.rejects(async () => await client.setSmartWan(), { name: 'Error', message: 'Invalid WAN config' })
    await assert.rejects(async () => await client.setSmartWan('dummy'), { name: 'Error', message: 'Invalid WAN config' })
  })
  it('throw error if dw_weight_ratio is not provided or invalid', async () => {
    const client = new SrmClient(baseUrl, sid)
    await assert.rejects(async () => await client.setSmartWan({}), { name: 'Error', message: 'Invalid dw_weight_ratio' })
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 'dummy' }), { name: 'Error', message: 'Invalid dw_weight_ratio' })
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 1000 }), { name: 'Error', message: 'Invalid dw_weight_ratio' })
  })
  it('throw error if smartwan_ifname_1 or smartwan_ifname_2 are not provided or invalids', async () => {
    const client = new SrmClient(baseUrl, sid)
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 100 }), { name: 'Error', message: 'Invalid smartwan_ifname_1' })
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 100, smartwan_ifname_1: 'dummy' }), { name: 'Error', message: 'Invalid smartwan_ifname_1' })
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 100, smartwan_ifname_1: 'wan' }), { name: 'Error', message: 'Invalid smartwan_ifname_2' })
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 100, smartwan_ifname_1: 'wan', smartwan_ifname_2: 'dummy' }), { name: 'Error', message: 'Invalid smartwan_ifname_2' })
  })
  it('throw error if smartwan_mode is not provided or invalid', async () => {
    const client = new SrmClient(baseUrl, sid)
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 100, smartwan_ifname_1: 'wan', smartwan_ifname_2: 'lan1' }), { name: 'Error', message: 'Invalid smartwan_mode' })
    await assert.rejects(async () => await client.setSmartWan({ dw_weight_ratio: 100, smartwan_ifname_1: 'wan', smartwan_ifname_2: 'lan1', smartwan_mode: 'dummy' }), { name: 'Error', message: 'Invalid smartwan_mode' })
  })
  it('should set config successfully and return it', async () => {
    const config = { dw_weight_ratio: 100, smartwan_ifname_1: 'wan', smartwan_ifname_2: 'lan1', smartwan_mode: 'failover' }
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.Network.SmartWAN.General&method=set&version=1&dw_weight_ratio=100&smartwan_ifname_1=wan&smartwan_ifname_2=lan1&smartwan_mode=failover')
      .reply(200, { data: config, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.setSmartWan(config)
    assert.deepEqual(result, config)
  })
  it('should switch gateway successfully and return udpated config', async () => {
    const config = { dw_weight_ratio: 100, smartwan_ifname_1: 'wan', smartwan_ifname_2: 'lan1', smartwan_mode: 'failover' }
    const config2 = { dw_weight_ratio: 100, smartwan_ifname_1: 'lan1', smartwan_ifname_2: 'wan', smartwan_mode: 'failover' }
    nock(baseUrl)
      // get config
      .post(pathEntry, 'api=SYNO.Core.Network.SmartWAN.General&method=get&version=1')
      .reply(200, { data: config, success: true })
      // set config
      .post(pathEntry, 'api=SYNO.Core.Network.SmartWAN.General&method=set&version=1&dw_weight_ratio=100&smartwan_ifname_1=lan1&smartwan_ifname_2=wan&smartwan_mode=failover')
      .reply(200, { data: config2, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.switchSmartWan()
    assert.deepEqual(result, config2)
  })
})

describe('get policy rules', () => {
  it('should return a array', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=1&api=SYNO.Core.Network.Router.PolicyRoute&type=ipv4')
      .reply(200, { data: { rules: [] }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getPolicyRoutes()
    assert.deepEqual(result, [])
  })
})

describe('set policy rules', () => {
  it('should successs silently', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=set&version=1&api=SYNO.Core.Network.Router.PolicyRoute&type=ipv4&rules=%5B%5D')
      .reply(200, { success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.setPolicyRoutes([])
    assert.deepEqual(result, undefined)
  })
})

describe('get wake on lan devices', () => {
  it('should return a array', async () => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.Network.WOL&method=get_devices&version=1&findhost=false&client_list=%5B%5D')
      .reply(200, { data: [], success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getWakeOnLanDevices()
    assert.deepEqual(result, [])
  })
})

describe('add wake on lan device', () => {
  it('should successs silently without hostname', async () => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.Network.WOL&method=add_device&version=1&mac=%22aa%3Aaa%3Aaa%3Aaa%3Aaa%3A01%22')
      .reply(200, { success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.addWakeOnLan('aa:aa:aa:aa:aa:01')
    assert.deepEqual(result, undefined)
  })
  it('should successs silently with hostname', async () => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.Network.WOL&method=add_device&version=1&mac=%22aa%3Aaa%3Aaa%3Aaa%3Aaa%3A01%22&host=%22mydevice%22')
      .reply(200, { success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.addWakeOnLan('aa:aa:aa:aa:aa:01', 'mydevice')
    assert.deepEqual(result, undefined)
  })
})

describe('wake on lan', () => {
  it('should successs silently', async () => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.Network.WOL&method=wake&version=1&mac=%22aa%3Aaa%3Aaa%3Aaa%3Aaa%3A01%22')
      .reply(200, { success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.wakeOnLan('aa:aa:aa:aa:aa:01')
    assert.deepEqual(result, undefined)
  })
})

describe('get QoS', () => {
  it('should return a array', async () => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Core.NGFW.QoS.Rules&method=get&version=1')
      .reply(200, { data: { rules: [] }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getQos()
    assert.deepEqual(result, [])
  })
})

describe('get access control groups', () => {
  beforeEach(() => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.SafeAccess.AccessControl.ConfigGroup&method=get&version=1&additional=%5B%22device%22%2C%22total_timespent%22%5D')
      .reply(200, { data: { config_groups: groups }, success: true })
  })
  it('should return a array of groups without online status if not requested', async () => {
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getAccessControlGroups()
    assert.deepEqual(result, groups)
  })
  it('should return a array of groups with online status if requested', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=5&conntype=all&api=SYNO.Core.Network.NSM.Device&info=basic')
      .reply(200, { data: { devices }, success: true })
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getAccessControlGroups(true)
    assert.equal(result.length, groups.length)
    result.forEach((dev) => {
      assert.equal(Object.hasOwnProperty.call(dev, 'online'), true)
      assert.equal(Object.hasOwnProperty.call(dev, 'online_device_count'), true)
    })
  })
  it('should return a array of groups without online status if requested but failed and log error', async () => {
    nock(baseUrl)
      .post(pathEntry, 'method=get&version=5&conntype=all&api=SYNO.Core.Network.NSM.Device&info=basic')
      .reply(200, { error: { code: 101 }, success: false })
    sinon.replace(console, 'log', sinon.fake())
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getAccessControlGroups(true)
    assert.equal(result.length, groups.length)
    assert(console.log.calledWith('Error during device recuperation: Invalid parameters'))
    sinon.restore()
  })
})

describe('get Wi-Fi settings', () => {
  beforeEach(() => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Wifi.Network.Setting&method=get&version=1')
      .reply(200, { data: { profiles }, success: true })
  })
  it('should return a array of Wi-Fi profiles', async () => {
    const client = new SrmClient(baseUrl, sid)
    const result = await client.getWifiSettings()
    assert.deepEqual(result, profiles)
  })
})

describe('set Wi-Fi settings', () => {
  beforeEach(() => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Wifi.Network.Setting&method=set&version=1&profiles=%5B%7B%22id%22%3A0%2C%22radio_list%22%3A%5B%7B%22ssid%22%3A%22MyPrimary%22%2C%22enable%22%3Atrue%2C%22radio_type%22%3A%22SmartConnect%22%7D%5D%7D%2C%7B%22id%22%3A1%2C%22radio_list%22%3A%5B%7B%22ssid%22%3A%22MyGuest%22%2C%22enable%22%3Afalse%2C%22radio_type%22%3A%22SmartConnect%22%7D%5D%7D%5D')
      .reply(200, { success: true })
  })
  it('should successs silently', async () => {
    const client = new SrmClient(baseUrl, sid)
    const result = await client.setWifiSettings(profiles)
    assert.deepEqual(result, undefined)
  })
})

describe('switch Wi-Fi radio', () => {
  beforeEach(() => {
    nock(baseUrl)
      .post(pathEntry, 'api=SYNO.Wifi.Network.Setting&method=get&version=1')
      .reply(200, { data: { profiles }, success: true })
      .post(pathEntry, 'api=SYNO.Wifi.Network.Setting&method=set&version=1&profiles=%5B%7B%22id%22%3A1%2C%22radio_list%22%3A%5B%7B%22ssid%22%3A%22MyGuest%22%2C%22enable%22%3Atrue%2C%22radio_type%22%3A%22SmartConnect%22%7D%5D%7D%5D')
      .reply(200, { success: true })
  })
  it('throw error if SSID is not provided', async () => {
    const client = new SrmClient(baseUrl, sid)
    await assert.rejects(async () => await client.switchWifiRadio(), { name: 'Error', message: 'You must provide the network SSID' })
  })
  it('throw error if SSID provided was not found', async () => {
    const client = new SrmClient(baseUrl, sid)
    await assert.rejects(async () => await client.switchWifiRadio('DummySsid'), { name: 'Error', message: 'The SSID provided was not found' })
  })
  it('should successs silently with a known SSID', async () => {
    const client = new SrmClient(baseUrl, sid)
    const result = await client.switchWifiRadio('MyGuest')
    assert.deepEqual(result, undefined)
  })
})
