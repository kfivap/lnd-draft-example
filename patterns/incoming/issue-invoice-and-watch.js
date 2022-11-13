const { InvoiceLightning } = require("../../src/invoice_lightning");
const { UserLightning } = require("../../src/user_lightning");
const { config } = require('../../src/config')
const { Utils } = require("../../src/utils");

process.env.GRPC_SSL_CIPHER_SUITES = config.GRPC_SSL_CIPHER_SUITES;;

const alice = new UserLightning('alice', config.ALICE_MARACOON_PATH, config.ALICE_TLS_PATH, config.ALICE_HOST)

async function main() {

  const aliceInvoices = new InvoiceLightning('bob', config.ALICE_MARACOON_PATH, config.ALICE_TLS_PATH, config.ALICE_HOST)
  const aliceInvoice = await alice.addInvoice({
    value: 10000
  })

  console.log(aliceInvoice.payment_request)
  console.log('waiting for invoice paid...')
  const aliceWalletBalance = await alice.walletBalance({})
  await aliceInvoices.subscribeSingleInvoice({ r_hash: aliceInvoice.r_hash })
  await Utils.delay(3500)
 
  console.log('alice wallet balance delta', UserLightning.countDeltaWalletBalance(aliceWalletBalance, await alice.walletBalance({})))

}
main()