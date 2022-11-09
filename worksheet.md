lncli --network=simnet getinfo
alice   pubkey 02c273c5b12c88c238fb380380c3586e58d3e5c74369254c8c3397dcb78edf2692
bob   pubkey 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc
kirill   pubkey 03e93f28e88b7ca1e900a76d9e1cbc74e8b573ac7590943358b131ee7bf9b0546b

    lncli --network=simnet disconnect 02c273c5b12c88c238fb380380c3586e58d3e5c74369254c8c3397dcb78edf2692 
    lncli --network=simnet disconnect 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc 
    lncli --network=simnet disconnect 03e93f28e88b7ca1e900a76d9e1cbc74e8b573ac7590943358b131ee7bf9b0546b 

alice 172.30.0.3
bob 172.30.0.4
kirill 172.30.0.5

отпрвить multihop

1 alice connect bob
lncli --network=simnet connect 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc@172.30.0.4
2 charlie connect to bob
lncli --network=simnet connect 024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc@172.30.0.4

3 open alice bob channel
 lncli --network=simnet openchannel --node_key=0287393b2f9285c617824a0270c213f1c8a7bd89fa4b52584affeb5375d448cacf --local_amt=1000000
4 open charlie bob channel
 lncli --network=simnet openchannel --node_key=024837a2fc6dedd6869f283af2054688866df6f4cfad07384e3d3cf08de31ed3dc --local_amt=50000 --push_amt=20000
5 проводим транзу
 docker exec -it btcd /start-btcctl.sh generate 6

5.1 ждем 1-2 мин!!! важно, без этого будут ошибки

6 charlie выставляет invoice
lncli --network=simnet addinvoice --amt=1000
7 alice платит invoice
 lncli --network=simnet sendpayment --pay_req=lnsb10u1p3k5xfypp5j2rhsruwuddcja73ww3tppgwwgldlyzp4933ah3lf2ccf0f9mlgqdqqcqzpgxqyz5vqsp5anx728swc0nkxe9vedxhf3ad6068h3sasn0zywgm5jkjad2l0kpq9qyyssqx80x0zwj82jzwlvnadh6v5rj23fq3sky6r6yga4fx4nqu2u6edd4x68pf7v7gfwtcj3ntjpuahhz74cr5hs62q3zsp5du6njd4tm2eqqjqf0rt


 


close
    lncli --network=simnet listchannels
  lncli --network=simnet closechannel --funding_txid=6801fc36e446fc69fe8236f7ded28cabf1f593d3f06efbdd162c07ff2fa08a15 --output_index=1
  lncli --network=simnet listpeers
    lncli --network=simnet disconnect 03e93f28e88b7ca1e900a76d9e1cbc74e8b573ac7590943358b131ee7bf9b0546b



    lncli --network=simnet channelbalance 
до
alice
    "local_balance": {
        "sat": "985527",
    },
    "remote_balance": {
        "sat": "11002",
    },
bob
    "local_balance": {
        "sat": "20002",
    },
    "remote_balance": {
        "sat": "1023057",
    },
charlie
    "local_balance": {
        "sat": "37530",
    },
    "remote_balance": {
        "sat": "9000",
    },


после
alice
    "local_balance": {
        "sat": "984526", //-1001
    },
    "remote_balance": {
        "sat": "12003",//+1001
    },
bob
   "local_balance": {
        "sat": "20003", // +1
    },
    "remote_balance": {
        "sat": "1023056", // -1
    },
charlie
  "local_balance": {
        "sat": "38530", //+1000
    },
    "remote_balance": {
        "sat": "8000", //-1000
    },
    
получается средства перетекают через боба, alice платит 1сат за комиссию



 lncli --network=simnet decodepayreq  lnsb10u1p3k585lpp5l2xv0hsgf936efhaf9evae9r7nmnvlgdcrs35p77dayzu6az8vssdqqcqzpgxqyz5vqsp5uprv0v47u8c0exftv8xn6r205pe80zw9408aynr5j923vzsp44vq9qyyssqhe7kcdagx228gy4dnytx403hxn29knsvas3qu264zp8k9wa3c8ghn2270t05fj7mpgwhevm74m6hng3t2py5exx6hmacdrdfx6xd75gqq9ypgl
 lncli --network=simnet lookupinvoice  fa8cc7de084963aca6fd4972cee4a3f4f7367d0dc0e11a07de6f482e6ba23b21 