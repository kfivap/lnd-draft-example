exports.config = {
    GRPC_SSL_CIPHER_SUITES: 'HIGH+ECDSA',
    loaderOptions : {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    },
    PROTO_PATH: '/mnt/storage/blockchain/lnd/lnrpc/lightning.proto',
    INVOICES_PROTO_PATH: '/mnt/storage/blockchain/lnd/lnrpc/invoicesrpc/invoices.proto',

    ALICE_MARACOON_PATH: "/mnt/docker/volumes/simnet_lnd_alice/_data/data/chain/bitcoin/simnet/admin.macaroon",
    ALICE_TLS_PATH: '/mnt/docker/volumes/simnet_lnd_alice/_data/tls.cert',
    ALICE_HOST: '172.18.0.3',

    BOB_MARACOON_PATH: "/mnt/docker/volumes/simnet_lnd_bob/_data/data/chain/bitcoin/simnet/admin.macaroon",
    BOB_TLS_PATH: '/mnt/docker/volumes/simnet_lnd_bob/_data/tls.cert',
    BOB_HOST: '172.18.0.4',

    CHARLIE_MARACOON_PATH: "/mnt/docker/volumes/simnet_lnd_charlie/_data/data/chain/bitcoin/simnet/admin.macaroon",
    CHARLIE_TLS_PATH: '/mnt/docker/volumes/simnet_lnd_charlie/_data/tls.cert',
    CHARLIE_HOST: '172.18.0.5',


}