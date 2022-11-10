  export NETWORK="simnet" 

  docker volume create simnet_lnd_alice
  docker volume create simnet_lnd_bob

  docker-compose run -d --name alice --volume simnet_lnd_alice:/root/.lnd lnd
  docker exec -i -t alice bash

#alice  
 lncli --network=simnet newaddress np2wkh 


# Recreate "btcd" node and set Alice's address as mining address:
$  MINING_ADDRESS=<alice_address> docker-compose up -d btcd
   MINING_ADDRESS=rh45LQXYqjr5P3htGqBvpE2ehVNbAFwSmY docker-compose up -d btcd

# Generate 400 blocks (we need at least "100 >=" blocks because of coinbase 
# block maturity and "300 ~=" in order to activate segwit):
  docker exec -it btcd /start-btcctl.sh generate 400

# Check that segwit is active:
  docker exec -it btcd /start-btcctl.sh getblockchaininfo | grep -A 1 segwit


  Check Alice balance:
#alice  !!!
  lncli --network=simnet walletbalance

  # Run "Bob" node and log into it:
  docker-compose run -d --name bob --volume simnet_lnd_bob:/root/.lnd lnd
  docker exec -i -t bob bash

# Get the identity pubkey of "Bob" node:
#bob
  lncli --network=simnet getinfo
{
    ----->"identity_pubkey": "024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc",

    # Get the IP address of "Bob" node:
 docker inspect bob | grep IPAddress
  "IPAddress": "",
                    "IPAddress": "172.30.0.4",

 #alice
 lncli --network=simnet connect <bob_pubkey>@<bob_host>
  lncli --network=simnet connect 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc@172.30.0.4
   #alice


 # Open the channel with "Bob":
 #alice
   lncli --network=simnet openchannel --node_key=<bob_identity_pubkey> --local_amt=1000000
    lncli --network=simnet openchannel --node_key=024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc --local_amt=1000000

# Include funding transaction in block thereby opening the channel:
  docker exec -it btcd /start-btcctl.sh generate 3
  !!!!! важно. списываются средства в основном бч, не понимаю пока зачем, может это общий счет multisig ?

# Check that channel with "Bob" was opened:
# alice 
  lncli --network=simnet listchannels


  # Add invoice on "Bob" side:
#bob 
  lncli --network=simnet addinvoice --amt=10000
{
        "r_hash": "<your_random_rhash_here>", 
        "pay_req": "<encoded_invoice>", 
}

ДО
bob 
    lncli --network=simnet channelbalance 
        remote_balance  "sat": "996530" = сумма минус комиссия
    lncli --network=simnet walletbalance
        "reserved_balance_anchor_chan": "10000", остальное нули

alice  
    lncli --network=simnet channelbalance 
        local_balance  "sat": "996530" = сумма минус комиссия
    lncli --network=simnet walletbalance
         "total_balance": "1519998990613",
        "confirmed_balance": "1519998990613",
        "reserved_balance_anchor_chan": "10000", 
        "confirmed_balance": "1519998990613" 
        остальное нули


# alice
     lncli --network=simnet sendpayment --pay_req=lnsb100u1p3k3kmepp5ne8gdnrvlqe9us9gnuekneqkkucxsmmax3z9l0gcwfmnfjjma88sdqqcqzpgxqyz5vqsp5k3zuraf6xg49qe2rz8gkkhu8fra0mku2p0qrhxvwvad9ys9f0esq9qyyssqufvnkcnxjms4n4xsc44uctk0cphjsgxdhss96rccdn25fy46xck9sq4va8nu0av76d64udwgvlsr5chlm5jzk85aj0qxn6czx8h3aegqyr6dy6


После
bob 
    lncli --network=simnet channelbalance 
        local_balance  "sat": "10000",
        remote_balance  "sat": "986530",
    lncli --network=simnet walletbalance
        "reserved_balance_anchor_chan": "10000", остальное нули

alice  
    lncli --network=simnet channelbalance 
        "local_balance":  "sat": "986530",
        "remote_balance": "sat": "10000",
    lncli --network=simnet walletbalance
       "total_balance": "1519998990613",
        "confirmed_balance": "1519998990613",
        "reserved_balance_anchor_chan": "10000", 
        "confirmed_balance": "1519998990613" 
        остальное нули


alice
    lncli --network=simnet listchannels
    "channel_point": "d4e110cfeb1ba305a2c7e55764dafc462603e30ed05288e6374743d74aa47a14:0",
bob
    lncli --network=simnet listchannels
    "channel_point": "d4e110cfeb1ba305a2c7e55764dafc462603e30ed05288e6374743d74aa47a14:0",

# Channel point consists of two numbers separated by a colon. The first one 
# is "funding_txid" and the second one is "output_index":
# alice 
 lncli --network=simnet closechannel --funding_txid=<funding_txid> --output_index=<output_index>
  lncli --network=simnet closechannel --funding_txid=d4e110cfeb1ba305a2c7e55764dafc462603e30ed05288e6374743d74aa47a14 --output_index=0


 docker exec -it btcd /start-btcctl.sh getrawtransaction "25265a715223bc99eb858363ae057de522af7a894330d171683ec6790b94a936"
 docker exec -it btcd /start-btcctl.sh  decoderawtransaction "02000000000101147aa44ad7434737e68852d00ee3032646fcda6457e5c7a205a31bebcf10e1d40000000000ffffffff02384a0000000000002251206026dc13c97901514427108f5570bfc99a1dadfc8931d62c1af0986d58c31e8056d20e0000000000225120c1376af4368c4882dc5fc8a4712f36db849b1904a7354d7c6eebf679ecbb8f940400473044022048d0f195fdcbca160032adea92c885b9ab51326d3438e168df96bb753dde9c19022002a018daae39c023422c9bb74e08bfd8062b6ab83879720e48b18bb48782ed01014730440220351195fce9e87c29a886ac61ce72757530061ce8a8a6dc61c2b395b56344363402206a14d9939296de129e99eb2dc1c655249d6b2e886f5aa2788113fcfec7ff5cac01475221030ea409885998f34bcf440f7a002651a293175e362d5a6f56977727155be1175621039705b52861ca3559a52bbb40cf11820fe6615ce3286efd3d7118ea3ad8c6c2ca52ae00000000"

 блокчейн - отправили 20000 bob и остаток alice

======
  lncli --network=simnet listpeers
  lncli --network=simnet disconnect 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc


   lncli --network=simnet listchannels
      lncli --network=simnet closechannel --funding_txid=b6e41c94d1fff3ee4d75a589c273bd6caeae46580f9cd44faed27b675736ec43 --output_index=0

      ======

 третье лицо
 docker-compose run -d --name kirill --volume simnet_lnd_kirill:/root/.lnd lnd
 схема alice->kirill->bob

connect alice to bob
    lncli --network=simnet getinfo
    lncli --network=simnet connect 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc@172.30.0.4

    % connect alice to kirill
%   lncli --network=simnet getinfo
    % lncli --network=simnet connect 03e93f28e88b7ca1e900a76d9e1cbc74e8b573ac7590943358b131ee7bf9b0546b@172.30.0.5


connect kirill to bob
   lncli --network=simnet getinfo
    lncli --network=simnet connect 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc@172.30.0.4

open alice-bob channel
    lncli --network=simnet openchannel --node_key=024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc --local_amt=1000000 

% open alice-kirill channel
    % lncli --network=simnet openchannel --node_key=03e93f28e88b7ca1e900a76d9e1cbc74e8b573ac7590943358b131ee7bf9b0546b --local_amt=10000000 --push_amt=200000

open kirill-bob channel
    lncli --network=simnet openchannel --node_key=024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc --local_amt=30000


send singlehop
 bob
    lncli --network=simnet addinvoice --amt=10000
 alice
    lncli --network=simnet sendpayment --pay_req=lnsb100u1p3k3ukhpp52e5l3c7uh0lhphd25c0aa6lscusz5r9dpqv0hqzthhejhp3uwh9qdqqcqzpgxqyz5vqsp5e9s5ppe74rnnu8uglgg5fpjrfy4thgx3n4fc4ttrjs9lu04fldks9qyyssqw4t8vja7h95aa7sda0l45ukxreltzp7gnql86hndl406cus55fjxh7f0zrwdp2z0l4wxpz6slm7ua9e7jxqjksp5uplkvjvky5rqlqgqmgfcnq


send multihop
 kirill
    lncli --network=simnet addinvoice --amt=10000
 alice
    lncli --network=simnet sendpayment --pay_req=lnsb100u1p3k3u73pp5nv6566txxvdh76gfldkv2an6gc6nm48kmxc38gcsnq2wf64280usdqqcqzpgxqyz5vqsp5h78emkg74drfswpn0kw2jw5gvgz2t2dad2sp2pp8tzq05tejzc7q9qyyssq9she44d7s8ndx6r45l2ntdhq2ayc5wq090euhmdwy4rf7kppp3e50qx0slte4jcngc2tlsus9gv4u25mvhlyv8rdux22ffy49rtje9qqyd3rpz


    
  