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
  const preSaleFirstDay = startTime + 300
  const preICOstartTime = startTime + 600 // pre sale lasts 10 minutes
  const ICOstartTime = preICOstartTime + 600 // pre ICO lasts 10 minutes
  const ICOweek1End = ICOstartTime + 120 // in 2 minutes
  const ICOweek2End = ICOstartTime + 240 // in 4 minutes
  const ICOweek3End = ICOstartTime + 360 // in 6 minutes
  const ICOweek4End = ICOstartTime + 480 // in 8 minutes
  const endTime = ICOstartTime + 600          // ICO lasts 10 minutes
  const bountyReleaseTime = endTime + 600
  const devReleaseTime = endTime + 600
  const foundersReleaseTime = endTime + 2*600
  const teamReleaseTime = endTime + 3*600
  const advisersReleaseTime = endTime + 4*600

  deployer.deploy(
    LinkCoinCrowdsale,
    [startTime, preSaleFirstDay, preICOstartTime, ICOstartTime, ICOweek1End, ICOweek2End, ICOweek3End, ICOweek4End, endTime],
    wallet,
    bountyWallet,
    bountyReleaseTime,
    devWallet,
    devReleaseTime,
    foundersWallet,
    foundersReleaseTime,
    teamWallet,
    teamReleaseTime,
    advisersWallet,
    advisersReleaseTime)
}
