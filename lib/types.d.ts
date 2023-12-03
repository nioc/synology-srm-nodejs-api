type IpWanConnection = {
  /**
   * Connection status ('normal' or 'not available')
   */
  conn_status: string,
  /**
   * Interface name
   */
  ifname: string,
  /**
   * External IP address
   */
  ip: string,
  /**
   * Point-to-Point Protocol over Ethernet
   */
  pppoe: boolean,
  vpn_profile?: string
}

export type WanConnection = {
  ipv4: IpWanConnection,
  ipv6: IpWanConnection
}
type RecordProtocol = {
  /**
   * Download expressed in Bytes
   */
  download: number,
  download_packets: number,
  /**
   * Identifier of the protocol
   */
  protocol: number,
  /**
   * Upload expressed in Bytes
   */
  upload: number,
  upload_packets: number
}

type Record = {
  download: number,
  download_packets: number,
  /**
   * List of traffic per protocol during the record period
   */
  protocollist: RecordProtocol[],
  /**
   * Timestamp of the record period
   */
  time: number,
  /**
   * Upload expressed in Bytes
   */
  upload: number,
  upload_packets: number
}

export type DeviceTraffic = {
  /**
   * Device MAC address
   */
  deviceID: string,
  /**
   * Download expressed in Bytes
   */
  download: number,
  download_packets: number,
  /**
   * Records (periods) list
   */
  recs: Record[],
  /**
   * Timestamp of the last record
   */
  timeEnd?: number,
  /**
   * Timestamp of the first record
   */
  timeStart?: number,
  timezone?: number,
  /**
   * Upload expressed in Bytes
   */
  upload: number,
  upload_packets: number
}

type NetworkUtilization = {
  device: string,
  /**
   * Receive rate in Bytes
   */
  rx: number,
  /**
   * Transmit rate in Bytes
   */
  tx: number
}

export type NetworkUtilizationList = {
  /**
   * List of network uses
   */
  network: NetworkUtilization[],
  time: number
}

export type Device = {
  /**
   * Wi-Fi band used
   */
  band?: string,
  /**
   * Connection mode: 'wifi' or 'ethernet'
   */
  connection?: string,
  /**
   * Current Wi-Fi rate in Mbps
   */
  current_rate?: number,
  /**
   * Device type (for icon)
   */
  dev_type: string,
  hostname: string,
  ip6_addr: string,
  ip_addr: string,
  is_baned: boolean,
  is_beamforming_on: boolean,
  /**
   * Guest Wi-Fi network
   */
  is_guest: boolean,
  is_high_qos: boolean,
  is_low_qos: boolean,
  is_manual_dev_type: boolean,
  is_manual_hostname: boolean,
  is_online: boolean,
  is_qos: boolean,
  is_wireless: boolean,
  mac: string,
  /**
   * Max Wi-Fi rate in Mbps
   */
  max_rate: number,
  /**
   * Node identifier when connected to Mesh Wi-Fi
   */
  mesh_node_id?: number,
  /**
   * Node label when connected to Mesh Wi-Fi
   */
  mesh_node_name?: string,
  network?: string,
  rate_quality?: string,
  /**
   * Signal strength in % when connected to Wi-Fi
   */
  signalstrength?: number,
  transferRXRate?: number,
  transferTXRate?: number,
  wifi_network_id?: number,
  wifi_profile_name?: string,
  wifi_ssid?: string
}

type MeshNodeCapabilities = {
  support_custom_topology: boolean,
  support_force_ethernet: boolean
}

export type MeshNode = {
  band: string,
  blinking: boolean,
  capability: MeshNodeCapabilities,
  connected_devices: number,
  /**
   * Current receive rate in Bytes
   */
  current_rate_rx: number,
  /**
   * Current transmit rate in Bytes
   */
  current_rate_tx: number,
  custom_topology_mode: string,
  is_dual_band: boolean,
  is_wireless: boolean,
  led_mode: string,
  name: string,
  /**
   * 'online' is the normal value
   */
  network_status: string,
  node_id: number,
  node_status: string,
  node_status_msg: string,
  parent_node_id: number,
  signalstrength: number
}

export type SmartWanGateway = {
  displayname: string,
  enable_priority_check: boolean,
  failed_site_name: string,
  failed_site_num: number,
  /**
   * Access IP address (ISP modem for example)
   */
  gatewayip: string,
  /**
   * Interface name like 'eth0', 'eth2', ...
   */
  ifname: string,
  /**
   * 'enabled' or 'disabled'
   */
  netstatus: string,
  ping_failed_cnt: number,
  ping_succ_cnt: number
}

export type SmartWanConfiguration = {
  dw_weight_ratio: number,
  smartwan_failback: boolean,
  smartwan_ifname_1: string,
  smartwan_ifname_2: string,
  smartwan_mode: string
}

export type PolicyRoutes = {
  /**
   * 'Enabled' or 'Disabled'
   */
  active: string,
  displayname: string,
  dst_subnet: string,
  enable: boolean,
  gateway: string,
  ifname: string,
  src_subnet: string
}

export type WakeOnLanDevice = {
  dsm_version: number,
  host?: string,
  mac: string,
  status: string,
  support_wol: boolean
}

type QosBandwidth = {
  /**
   * Download bandwidth in kilobytes (kB)
   */
  download: number,
  /**
   * Upload bandwidth rate in Bytes
   */
  upload: number
}

type QosProtocol = {
  enable: boolean,
  guaranteed: QosBandwidth,
  maximum: QosBandwidth,
  priority: number,
  protocolID: number
}

export type QosRule = {
  hostname?: string,
  deviceID: string,
  enable: boolean,
  ip_addr?: string,
  guaranteed_bw_dl?: number,
  guaranteed_bw_ul?: number,
  maximum_bw_dl?: number,
  maximum_bw_ul?: number,
  guaranteed: QosBandwidth,
  maximum: QosBandwidth,
  priority: number,
  protocollist: QosProtocol[]
}

type AccessControlGroupTimespentDetail = {
  /**
   * Number of minutes
   */
  normal: number,
  /**
   * Number of minutes
   */
  reward: number
}

type AccessControlGroupTimespent = {
  has_quota: boolean,
  quota: number,
  total_spent: AccessControlGroupTimespentDetail
}

export type AccessControlGroup = {
  config_group_id: number,
  device_count: number,
  devices: string[],
  name: string,
  pause: boolean,
  profile_id: number,
  timespent: AccessControlGroupTimespent
}
