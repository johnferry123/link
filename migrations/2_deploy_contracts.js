const LinkCoinCrowdsale = artifacts.require("LinkCoinCrowdsale")


module.exports = function(deployer, network, [owner, wallet, bountyWallet, devWallet, foundersWallet, teamWallet, advisersWallet]) {
  if (network == "mainnet") {
    const devReleaseTime = new BigNumber(1527811200)   //  Friday, 01-Jun-18 00:00:00 UTC
    const foundersReleaseTime = new BigNumber(1546300800)   //  Tuesday, 01-Jan-19 00:00:00 UTC
    const teamReleaseTime = new BigNumber(1525132800)   //  Tuesday, 01-May-18 00:00:00 UTC
    const advisersReleaseTime = new BigNumber(1526601600)   //  Friday, 18-May-18 00:00:00 UTC
    const preICOstartTime = startTime + 600 // TODO
    const ICOstartTime = preICOstartTime + 600 // TODO
  }
  const BigNumber = web3.BigNumber
  const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1 // actually pre sale
  const preICOstartTime = startTime + 600 // pre sale lasts 10 minutes
  const ICOstartTime = preICOstartTime + 600 // pre ICO lasts 10 minutes
  const endTime = ICOstartTime + 600          // ICO lasts 10 minutes
  const devReleaseTime = endTime + 600
  const foundersReleaseTime = endTime + 2*600
  const teamReleaseTime = endTime + 3*600
  const advisersReleaseTime = endTime + 4*600
  const bountySupply = new BigNumber(10*10**18)

  deployer.deploy(
    LinkCoinCrowdsale,
    startTime,
    preICOstartTime,
    ICOstartTime,
    endTime,
    wallet,
    bountyWallet,
    bountySupply,
    devWallet,
    devReleaseTime,
    foundersWallet,
    foundersReleaseTime,
    teamWallet,
    teamReleaseTime,
    advisersWallet,
    advisersReleaseTime)
}
