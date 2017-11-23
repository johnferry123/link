# StarterCoin token and crowdsale contracts

## Flattening and ABI
```solidity_flattener --solc-paths=zeppelin-solidity=$(pwd)/node_modules/zeppelin-solidity/ contracts/StarterCoinCrowdsale.sol --output deploy/StarterCoinCrowdsale.sol```

```solc --abi deploy/StarterCoinCrowdsale.sol -o ABI --overwrite```

## Deploy

Set up variables in `deploy/web3_deploy.js` and copy/paste it to web3 console.
