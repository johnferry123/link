const LinkCoinCrowdsale = artifacts.require("LinkCoinCrowdsale")


module.exports = function(deployer, network, [owner, wallet, bountyWallet]) {
  const BigNumber = web3.BigNumber
  const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1000
  const endTime = startTime + 3600          // One hour after startTime
  const rate = new BigNumber(2)
  const cap = new BigNumber(154622*10**18) // 154,622 ETH
  const bountySupply = new BigNumber(10*10**18)

  deployer.deploy(
    LinkCoinCrowdsale,
    startTime,
    endTime,
    rate,
    cap,
    wallet,
    bountyWallet,
    bountySupply)
}
