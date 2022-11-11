const { InvoiceLightning } = require("./src/invoice_lightning");
const { UserLightning } = require("./src/user_lightning");
const { Utils } = require("./src/utils");
const { config } = require('./src/config')

process.env.GRPC_SSL_CIPHER_SUITES = config.GRPC_SSL_CIPHER_SUITES;;

const alice = new UserLightning('alice', config.ALICE_MARACOON_PATH, config.ALICE_TLS_PATH, config.ALICE_HOST)
const bob = new UserLightning('bob', config.BOB_MARACOON_PATH, config.BOB_TLS_PATH, config.BOB_HOST)
const charlie = new UserLightning('charlie', config.CHARLIE_MARACOON_PATH, config.CHARLIE_TLS_PATH, config.CHARLIE_HOST)
const UtilsInstance = new Utils()

async function main() {
  await alice.disconnectAllPeers()
  await bob.disconnectAllPeers()
  await charlie.disconnectAllPeers()

  const bobPubKey = await bob.getIdenityPubkey()
  const charliePubKey = await charlie.getIdenityPubkey()

  const aliceBobConnectResponse = await alice.connectPeer({
    addr: {
      pubkey: bobPubKey,
      host: config.BOB_HOST
    },
    perm: true,
    timeout: 10000
  })
  console.log('aliceBobConnectResponse', aliceBobConnectResponse)
  const charlieBobConnectResponse = await charlie.connectPeer({
    addr: {
      pubkey: bobPubKey,
      host: config.BOB_HOST
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
      local_funding_amount: 1000000
    })
  } catch (e) {
    console.log(e)
    process.exit()
  }
  // const channels = await alice.listChannels({})
  // console.log(channels)

  const aliceWalletBalance = await alice.walletBalance({})
  const bobWalletBalance = await bob.walletBalance({})
  const charlieWalletBalance = await charlie.walletBalance({})
  const bobInvoices = new InvoiceLightning('bob', config.BOB_MARACOON_PATH, config.BOB_TLS_PATH, config.BOB_HOST)

  //pay from alice to bob (alice-bob) SIGNLEHOP
  const bobInvoice = await bob.addInvoice({
    value: 10000
  })

  //should using await until invoice will be payed , but pay in same process, so its impossible 
  bobInvoices.subscribeSingleInvoice({ r_hash: bobInvoice.r_hash })
  const aliceBobPaymentResponse = await alice.sendPayment({ payment_request: bobInvoice.payment_request })
  console.log('aliceBobPaymentResponse', aliceBobPaymentResponse)

  // pay from alice to charlie (alice-bob-charlie) MULTIHOP
  const charlieInvoices = new InvoiceLightning('bob', config.CHARLIE_MARACOON_PATH, config.CHARLIE_TLS_PATH, config.CHARLIE_HOST)
  const charlieInvoice = await charlie.addInvoice({
    value: 10000
  })
  charlieInvoices.subscribeSingleInvoice({ r_hash: charlieInvoice.r_hash })

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
      try {
        const routes = await alice.queryRoutes({ pub_key: charliePubKey, amt: 10000 })
        console.log(routes.routes[0])
      } catch (e) {
        console.log(e)
      }
    } while (payment_error)

    UtilsInstance.setProduceBlocks(true)
    await Utils.timerWithCountDown(1, 5)

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

  console.log('alice wallet balance', UserLightning.countDeltaBalance(aliceWalletBalance, await alice.walletBalance({})))
  console.log('bob wallet balance', UserLightning.countDeltaBalance(bobWalletBalance, await bob.walletBalance({})))
  console.log('charlie wallet balance', UserLightning.countDeltaBalance(charlieWalletBalance, await charlie.walletBalance({})))
  process.exit()
}
main()