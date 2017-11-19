const LinkCoinCrowdsale = artifacts.require("LinkCoinCrowdsale")


module.exports = function(deployer, network, [owner, wallet, bountyWallet, devWallet, foundersWallet]) {
  if (network == "mainnet") {
    const devReleaseTime = new BigNumber(1527811200)   //  Friday, 01-Jun-18 00:00:00 UTC
    const foundersReleaseTime = new BigNumber(1546300800)   //  Tuesday, 01-Jan-19 00:00:00 UTC

  }
  const BigNumber = web3.BigNumber
  const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1
  const endTime = startTime + 3600          // One hour after startTime
  const devReleaseTime = startTime + 3600
  const foundersReleaseTime = startTime + 2*3600
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
    bountySupply,
    devWallet,
    devReleaseTime,
    foundersWallet,
    foundersReleaseTime)
}
