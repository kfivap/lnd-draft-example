const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { config } = require('./config')


exports.InvoiceLightning = class InvoiceLightning {
    constructor(name, maracoon, tls, host) {
        const defaulPort = 10009
        this._name = name
        this._maracoon = maracoon
        this._tls = tls
        this._host = `${host}:${defaulPort}`
        this._init()
    }

    _init() {
        const packageDefinition = protoLoader.loadSync([config.PROTO_PATH, config.INVOICES_PROTO_PATH], config.loaderOptions);
        const invoicesrpc = grpc.loadPackageDefinition(packageDefinition).invoicesrpc;
        const macaroon = fs.readFileSync(this._maracoon).toString('hex');
        process.env.GRPC_SSL_CIPHER_SUITES = config.GRPC_SSL_CIPHER_SUITES;
        const lndCert = fs.readFileSync(this._tls);
        const sslCreds = grpc.credentials.createSsl(lndCert);
        const macaroonCreds = grpc.credentials.createFromMetadataGenerator(function (args, callback) {
            let metadata = new grpc.Metadata();
            metadata.add('macaroon', macaroon);
            callback(null, metadata);
        });
        let creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
        this._invoices = new invoicesrpc.Invoices(this._host, creds);
    }

    async subscribeSingleInvoice(request) {
        const call = this._invoices.subscribeSingleInvoice(request);
        return new Promise((resolve, reject) => {
            call.on('data', (response) => {
                // A response was received from the server.
                // console.log(this._name, 'subscribeSingleInvoice data', response);
            });
            call.on('status', (status) => {
                // The current status of the stream.
                console.log(this._name, 'subscribeSingleInvoice status', status);
            });
            call.on('error', (error) => {
                console.log(this._name, 'subscribeSingleInvoice error', error);
                reject(error)
            })
            call.on('end', () => {
                // The server has closed the stream.
                console.log(this._name, 'subscribeSingleInvoice end');
                resolve()
            });

        })
    }
}