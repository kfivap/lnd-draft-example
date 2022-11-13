const { UserLightning } = require("../../src/user_lightning");
const { Utils } = require("../../src/utils");
const { config } = require('../../src/config')

process.env.GRPC_SSL_CIPHER_SUITES = config.GRPC_SSL_CIPHER_SUITES;;

const alice = new UserLightning('alice', config.ALICE_MARACOON_PATH, config.ALICE_TLS_PATH, config.ALICE_HOST)
const bob = new UserLightning('bob', config.BOB_MARACOON_PATH, config.BOB_TLS_PATH, config.BOB_HOST)
const UtilsInstance = new Utils()

async function main() {
    const paymentRequest = process.argv[2]
    if (!paymentRequest) {
        throw new Error('payment request not passed in cli options')
    }
    await alice.disconnectAllPeers()
    await bob.disconnectAllPeers()

    const alicePubKey = await alice.getIdenityPubkey()

    const bobAliceConnectResponse = await bob.connectPeer({
        addr: {
            pubkey: alicePubKey,
            host: config.ALICE_HOST
        },
        perm: true,
        timeout: 10000
    })
    console.log('bobAliceConnectResponse', bobAliceConnectResponse)
    UtilsInstance.setProduceBlocks(true)
    setInterval(() => {
        UtilsInstance.generateBtcBlock()
    }, 1000)
    await Utils.delay(1500)
    await alice.closeAllChannels()
    await bob.closeAllChannels()

    const bobWalletBalance = await bob.walletBalance({})


    console.log('before open channel')
    try {
        await bob.openChannel({
            node_pubkey_string: alicePubKey,
            node_pubkey: Buffer.from(alicePubKey, 'hex'),
            local_funding_amount: 100000
        })
        const bobAliceChannelBalance = await bob.channelBalance({})
        console.log(bobAliceChannelBalance)
    } catch (e) {
        console.log(e)
        process.exit()
    }

    const bobAlicePaymentResponse = await bob.sendPayment({ payment_request: paymentRequest })
    console.log('bobAlicePaymentResponse', bobAlicePaymentResponse)
    // await alice.closeAllChannels()
    // await bob.closeAllChannels()
    // await alice.disconnectAllPeers()
    // await bob.disconnectAllPeers()
    console.log('bob wallet balance delta', UserLightning.countDeltaWalletBalance(bobWalletBalance, await bob.walletBalance({})))
    process.exit()
}
main()