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

    UtilsInstance.setProduceBlocks(true)
    setInterval(() => {
        UtilsInstance.generateBtcBlock()
    }, 1000)
    await Utils.delay(1500)

    const bobWalletBalance = await bob.walletBalance({})
    const bobChannelBalance = await bob.channelBalance({})
    

    const bobAlicePaymentResponse = await bob.sendPayment({ payment_request: paymentRequest })
    console.log('bobAlicePaymentResponse', bobAlicePaymentResponse)
    console.log('bob WALLET balance delta', UserLightning.countDeltaWalletBalance(bobWalletBalance, await bob.walletBalance({})))
    console.log('bob CHANNEL balance delta', UserLightning.countDeltaChannelBalance(bobChannelBalance, await bob.channelBalance({})))
    process.exit()
}
main()