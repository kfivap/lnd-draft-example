const { UserLightning } = require("./src/user_lightning");
const { Utils } = require("./src/utils");

process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';

const ALICE_MARACOON_PATH = "/mnt/docker/volumes/simnet_lnd_alice/_data/data/chain/bitcoin/simnet/admin.macaroon"
const ALICE_TLS_PATH = '/mnt/docker/volumes/simnet_lnd_alice/_data/tls.cert'
const ALICE_HOST = '172.18.0.3'

const BOB_MARACOON_PATH = "/mnt/docker/volumes/simnet_lnd_bob/_data/data/chain/bitcoin/simnet/admin.macaroon"
const BOB_TLS_PATH = '/mnt/docker/volumes/simnet_lnd_bob/_data/tls.cert'
const BOB_HOST = '172.18.0.4'

const CHARLIE_MARACOON_PATH = "/mnt/docker/volumes/simnet_lnd_charlie/_data/data/chain/bitcoin/simnet/admin.macaroon"
const CHARLIE_TLS_PATH = '/mnt/docker/volumes/simnet_lnd_charlie/_data/tls.cert'
const CHARLIE_HOST = '172.18.0.5'

const alice = new UserLightning('alice', ALICE_MARACOON_PATH, ALICE_TLS_PATH, ALICE_HOST)
const bob = new UserLightning('bob', BOB_MARACOON_PATH, BOB_TLS_PATH, BOB_HOST)
const charlie = new UserLightning('charlie', CHARLIE_MARACOON_PATH, CHARLIE_TLS_PATH, CHARLIE_HOST)
const UtilsInstance= new Utils()

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
  UtilsInstance.setProduceBlocks(true)
  setInterval(() => {
    UtilsInstance.generateBtcBlock()
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
  // const channels = await alice.listChannels({})
  // console.log(channels)

  console.log('alice wallet balance', await alice.walletBalance({}))
  console.log('bob wallet balance', await bob.walletBalance({}))
  console.log('charlie wallet balance', await charlie.walletBalance({}))


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
    await Utils.timerWithCountDown(2, 5)
    UtilsInstance.setProduceBlocks(false)
    do {
      await Utils.timerWithCountDown(5, 5)
      attemptCounter++
      const aliceCharliePaymentResponse = await alice.sendPayment({ payment_request: charlieInvoice.payment_request })
      console.log('aliceCharliePaymentResponse', aliceCharliePaymentResponse, 'attempt', attemptCounter)
      payment_error = aliceCharliePaymentResponse.payment_error
    } while (payment_error)

    UtilsInstance.setProduceBlocks(true)
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

  console.log('alice wallet balance', await alice.walletBalance({}))
  console.log('bob wallet balance', await bob.walletBalance({}))
  console.log('charlie wallet balance', await charlie.walletBalance({}))
  process.exit()
}
main()