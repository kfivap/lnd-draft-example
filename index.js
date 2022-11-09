const fs = require('fs');
const util = require('util');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { resolve } = require('path');
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};
const { exec } = require("child_process");

let produce_blocks = true

class Utils {
  static async generateBtcBlock(quantity = 1) {
    if (!produce_blocks) {
      return
    }
    await new Promise((resolve, reject) => {
      exec(`docker exec  btcd /start-btcctl.sh generate ${quantity}`, (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          reject(error)
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          reject(stderr)
          return;
        }
        // console.log(`stdout: ${stdout}`);
        console.log('generatedBlock', JSON.parse(stdout))
        resolve(stdout)
      });
    })
  }

  static async delay(ms) {
    return new Promise(r => setTimeout(r, ms))
  }

  static async timerWithCountDown(seconds, everyX) {
    console.log(`${new Date()} start timer for ${seconds}`)
    let secondsLeft = seconds
    let interval
    await new Promise((resolve) => {
      interval = setInterval(() => {
        if (secondsLeft % everyX === 0) {
          console.log(`${new Date()} timer left ${secondsLeft}`)
        }
        if (secondsLeft-- === 0) {
          resolve()
        }
      }, 1000)
    })
    clearInterval(interval)
  }
}



process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
const PROTO_PATH = '/mnt/storage/blockchain/lnd/lnrpc/lightning.proto'

const ALICE_MARACOON_PATH = "/mnt/docker/volumes/simnet_lnd_alice/_data/data/chain/bitcoin/simnet/admin.macaroon"
const ALICE_TLS_PATH = '/mnt/docker/volumes/simnet_lnd_alice/_data/tls.cert'
const ALICE_HOST = '172.18.0.3'

const BOB_MARACOON_PATH = "/mnt/docker/volumes/simnet_lnd_bob/_data/data/chain/bitcoin/simnet/admin.macaroon"
const BOB_TLS_PATH = '/mnt/docker/volumes/simnet_lnd_bob/_data/tls.cert'
const BOB_HOST = '172.18.0.4'

const CHARLIE_MARACOON_PATH = "/mnt/docker/volumes/simnet_lnd_charlie/_data/data/chain/bitcoin/simnet/admin.macaroon"
const CHARLIE_TLS_PATH = '/mnt/docker/volumes/simnet_lnd_charlie/_data/tls.cert'
const CHARLIE_HOST = '172.18.0.5'



let request = {};

class UserLightning {
  constructor(name, maracoon, tls, host) {
    const defaulPort = 10009
    this._name = name
    this._maracoon = maracoon
    this._tls = tls
    this._host = `${host}:${defaulPort}`
    this._init()
  }

  _init() {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, loaderOptions);
    const lnrpc = grpc.loadPackageDefinition(packageDefinition).lnrpc;
    const macaroon = fs.readFileSync(this._maracoon).toString('hex');
    const lndCert = fs.readFileSync(this._tls);
    const sslCreds = grpc.credentials.createSsl(lndCert);
    const macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (args, callback) {
      let metadata = new grpc.Metadata();
      metadata.add('macaroon', macaroon);
      callback(null, metadata);
    });
    let creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
    let lightning = new lnrpc.Lightning(this._host, creds);
    this._lightning = lightning
  }

  get client() {
    return this._lightning
  }

  _promisify(method, params) {
    return new Promise((resolve, reject) => {
      this._lightning[method](params, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }

  walletBalance(request) {
    return this._promisify('walletBalance', request)
  }

  async getIdenityPubkey() {
    const data = await this._promisify('getInfo', {})
    // console.log('getIdenityPubkey', data)
    return data.identity_pubkey
  }

  async connectPeer(request) {
    return this._promisify('connectPeer', request)
  }

  async listPeers(request) {
    return this._promisify('listPeers', request)
  }

  async disconnectPeer(request) {
    return this._promisify('disconnectPeer', request)
  }

  async disconnectAllPeers(request) {
    const { peers } = await this.listPeers({ latest_error: false })
    console.log('disconnectAllPeers peers', peers.length)
    for (const peer of peers) {
      const disconnected = await this.disconnectPeer({ pub_key: peer.pub_key })
      console.log('disconnectAllPeersd disconnected', disconnected)
    }
  }

  async openChannel(request) {
    const call = this._lightning.openChannel(request)
    // console.log('openChannel', request)
    return new Promise((resolve, reject) => {
      call.on('data', function (response) {
        console.log('openChannel data', response);
      });
      call.on('status', function (status) {
        console.log('openChannel status', status);
      });
      call.on('error', function (error) {
        console.log('openChannel error', error);
        reject(error)
      });
      call.on('end', function () {
        console.log('openChannel end')
        resolve()
      });
    })
  }

  async closeChannel(request) {
    const call = this._lightning.closeChannel(request)
    console.log('closeChannel', request)
    return new Promise((resolve, reject) => {
      call.on('data', function (response) {
        console.log('closeChannel data', response);
      });
      // call.on('status', function (status) {
      //   console.log('closeChannel status', status);
      // });
      call.on('error', function (error) {
        console.log('closeChannel error', error);
        reject(error)
      });
      call.on('end', function () {
        console.log('closeChannel end')
        resolve()
      });
    })
  }


  async listChannels(request) {
    return this._promisify('listChannels', request)
  }

  async closeAllChannels() {
    const { channels } = await this.listChannels({})
    console.log('close all channels', channels.length)
    for (const channel of channels) {
      const channel_point = UserLightning.getChannelPoint(channel.channel_point)
      console.log('channel_point', channel_point)

      await this.closeChannel({ channel_point })
    }
  }

  static getChannelPoint(channelPointString) {
    const [funding_txid_str, output_index] = channelPointString.split(':')
    return {
      funding_txid_str, output_index: Number(output_index)
    }
  }

  async addInvoice(request) {
    return this._promisify('addInvoice', request)
  }

  async sendPayment(request) {
    return this._promisify('sendPaymentSync', request)
  }
}

const alice = new UserLightning('alice', ALICE_MARACOON_PATH, ALICE_TLS_PATH, ALICE_HOST)
const bob = new UserLightning('bob', BOB_MARACOON_PATH, BOB_TLS_PATH, BOB_HOST)
const charlie = new UserLightning('charlie', CHARLIE_MARACOON_PATH, CHARLIE_TLS_PATH, CHARLIE_HOST)

async function main() {
  await alice.disconnectAllPeers()
  await bob.disconnectAllPeers()
  await charlie.disconnectAllPeers()

  const bobPubKey = await bob.getIdenityPubkey()
  const charliePubKey = await charlie.getIdenityPubkey()

  const aliceBobConnectResponse = await alice.connectPeer({
    addr: {
      pubkey: bobPubKey,
      host: BOB_HOST
    },
    perm: true,
    timeout: 10000
  })
  console.log('aliceBobConnectResponse', aliceBobConnectResponse)
  const charlieBobConnectResponse = await charlie.connectPeer({
    addr: {
      pubkey: bobPubKey,
      host: BOB_HOST
    },
    perm: true,
    timeout: 10000
  })
  console.log('charlieBobConnectResponse', charlieBobConnectResponse)
  setInterval(() => {
    Utils.generateBtcBlock()
  }, 1000)
  await Utils.delay(1500)
  await alice.closeAllChannels()
  await bob.closeAllChannels()
  await charlie.closeAllChannels()

  // const listPeers = await alice.listPeers({ latest_error: false })
  // console.log(listPeers)

  console.log('before open channel')
  try {
    await alice.openChannel({
      node_pubkey_string: bobPubKey,
      node_pubkey: Buffer.from(bobPubKey, 'hex'),
      local_funding_amount: 100000
    })
    await bob.openChannel({
      node_pubkey_string: charliePubKey,
      node_pubkey: Buffer.from(charliePubKey, 'hex'),
      local_funding_amount: 100000
    })
  } catch (e) {
    console.log(e)
    process.exit()
  }

  // await new Promise((r) => setTimeout(r, 3000))

  // const channels = await alice.listChannels({})
  // console.log(channels)

  console.log('alice wallet balance', await alice.walletBalance(request))
  console.log('bob wallet balance', await bob.walletBalance(request))
  console.log('charlie wallet balance', await charlie.walletBalance(request))


  //pay from alice to bob (alice-bob) SIGNLEHOP
  const bobInvoice = await bob.addInvoice({
    value: 1000
  })
  const aliceBobPaymentResponse = await alice.sendPayment({ payment_request: bobInvoice.payment_request })
  console.log('aliceBobPaymentResponse', aliceBobPaymentResponse)

  // pay from alice to charlie (alice-bob-charlie) MULTIHOP
  const charlieInvoice = await charlie.addInvoice({
    value: 1000
  })
  try {
    let payment_error
    let attemptCounter = 0
    do {
      await Utils.timerWithCountDown(5, 5)
      produce_blocks = false

      attemptCounter++
      const aliceCharliePaymentResponse = await alice.sendPayment({ payment_request: charlieInvoice.payment_request })
      console.log('aliceCharliePaymentResponse', aliceCharliePaymentResponse, 'attempt', attemptCounter)
      payment_error = aliceCharliePaymentResponse.payment_error
    } while (payment_error)

    produce_blocks = true
  } catch (e) {
    console.error(e)
    process.exit()
  }


  while (true) {
    try {
      await alice.closeAllChannels()
      await charlie.closeAllChannels()
      break
    } catch (e) {
      console.log(e)
      continue
    }
  }

  // await alice.disconnectPeer({ pub_key: bobPubKey })
  await alice.disconnectAllPeers()
  await bob.disconnectAllPeers()
  await charlie.disconnectAllPeers()

  console.log('alice wallet balance', await alice.walletBalance(request))
  console.log('bob wallet balance', await bob.walletBalance(request))
  console.log('charlie wallet balance', await charlie.walletBalance(request))
  process.exit()
}
main()