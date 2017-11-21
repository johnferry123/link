# LinkCoin token and crowdsale contracts

## Flattening and ABI
```solidity_flattener --solc-paths=zeppelin-solidity=$(pwd)/node_modules/zeppelin-solidity/ contracts/LinkCoinCrowdsale.sol --output deploy/LinkCoinCrowdsale.sol```

```solc --abi deploy/LinkCoinCrowdsale.sol -o ABI --overwrite```
