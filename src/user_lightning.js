const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { config } = require('./config')

exports.UserLightning = class UserLightning {
    constructor(name, maracoon, tls, host) {
        const defaulPort = 10009
        this._name = name
        this._maracoon = maracoon
        this._tls = tls
        this._host = `${host}:${defaulPort}`
        this._init()
    }

    _init() {
        const packageDefinition = protoLoader.loadSync(config.PROTO_PATH,  config.loaderOptions);
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
        // console.log('closeChannel', request)
        return new Promise((resolve, reject) => {
            call.on('data', function (response) {
                // console.log('closeChannel data', response);
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