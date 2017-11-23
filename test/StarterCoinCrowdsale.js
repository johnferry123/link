import ether from './helpers/ether'
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMThrow from './helpers/EVMThrow'

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const StarterCoinCrowdsale = artifacts.require('StarterCoinCrowdsale');
const StarterCoin = artifacts.require('StarterCoin');
const TokenTimelock = artifacts.require('TokenTimelock');

contract('Crowdsale', function ([owner, wallet, bountyWallet, devWallet, foundersWallet, teamWallet, advisersWallet, investor, someone]) {

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
  })

  let crowdsale, token, bountyTokenTimelock, devTokenTimelock,
  foundersTokenTimelock, teamTokenTimelock,
  advisersTokenTimelock, startTime, preSaleFirstDay, preICOstartTime,
  ICOstartTime, ICOweek1End, ICOweek2End, ICOweek3End, ICOweek4End, endTime,
  afterEndTime, bountyReleaseTime, devReleaseTime, foundersReleaseTime,
  teamReleaseTime, advisersReleaseTime,
  RATE, CAP, TOKEN_PRESALE_CAP, TOKEN_PREICO_CAP,
  TOKEN_CAP, BOUNTY_SUPPLY, ADVISERS_SUPPLY, TEAM_SUPPLY,
  FOUNDERS_SUPPLY, DEV_SUPPLY

  beforeEach(async function () {
    startTime = latestTime() + duration.weeks(1);
    preSaleFirstDay = startTime + 300
    preICOstartTime = startTime + 600 // pre sale lasts 10 minutes
    ICOstartTime = preICOstartTime + 600 // pre ICO lasts 10 minutes
    ICOweek1End = ICOstartTime + 120 // in 2 minutes
    ICOweek2End = ICOstartTime + 240 // in 4 minutes
    ICOweek3End = ICOstartTime + 360 // in 6 minutes
    ICOweek4End = ICOstartTime + 480 // in 8 minutes
    endTime = ICOstartTime + 600          // ICO lasts 10 minutes
    afterEndTime = endTime + duration.seconds(1);
    bountyReleaseTime = endTime + 600
    devReleaseTime = endTime + 600
    foundersReleaseTime = endTime + 2*600
    teamReleaseTime = endTime + 3*600
    advisersReleaseTime = endTime + 4*600

    crowdsale = await StarterCoinCrowdsale.new(
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
      advisersReleaseTime);

    token = StarterCoin.at(await crowdsale.token());

    //timeLocks
    bountyTokenTimelock = TokenTimelock.at(await crowdsale.bountyTokenTimelock());
    devTokenTimelock = TokenTimelock.at(await crowdsale.devTokenTimelock());
    foundersTokenTimelock = TokenTimelock.at(await crowdsale.foundersTokenTimelock());
    teamTokenTimelock = TokenTimelock.at(await crowdsale.teamTokenTimelock());
    advisersTokenTimelock = TokenTimelock.at(await crowdsale.advisersTokenTimelock());

    // crowdsale constants
    TOKEN_PRESALE_CAP = await crowdsale.TOKEN_PRESALE_CAP();
    TOKEN_PREICO_CAP = await crowdsale.TOKEN_PREICO_CAP();
    TOKEN_CAP = await crowdsale.TOKEN_CAP();
    CAP = await crowdsale.CAP();
    RATE = await crowdsale.RATE();
    BOUNTY_SUPPLY = await crowdsale.BOUNTY_SUPPLY();
    ADVISERS_SUPPLY = await crowdsale.ADVISERS_SUPPLY();
    TEAM_SUPPLY = await crowdsale.TEAM_SUPPLY();
    FOUNDERS_SUPPLY = await crowdsale.FOUNDERS_SUPPLY();
    DEV_SUPPLY = await crowdsale.DEV_SUPPLY();
  });


  it('should create crowdsale with correct parameters', async function () {
    crowdsale.should.exist;
    token.should.exist;

    (await crowdsale.startTime()).should.be.bignumber.equal(startTime);
    (await crowdsale.endTime()).should.be.bignumber.equal(endTime);
    (await crowdsale.RATE()).should.be.bignumber.equal(RATE);
    (await crowdsale.wallet()).should.be.equal(wallet);
    (await crowdsale.CAP()).should.be.bignumber.equal(CAP);
    (await crowdsale.TOKEN_PRESALE_CAP()).should.be.bignumber.equal(TOKEN_PRESALE_CAP);
    (await crowdsale.TOKEN_PREICO_CAP()).should.be.bignumber.equal(TOKEN_PREICO_CAP);
    (await crowdsale.TOKEN_CAP()).should.be.bignumber.equal(TOKEN_CAP);
  });

  it('should set bounty timelock', async function () {
    // right before bounty timelock
    await bountyTokenTimelock.release().should.be.rejected
    await increaseTimeTo(bountyReleaseTime);
    await bountyTokenTimelock.release().should.be.fulfilled;

    (await token.balanceOf(bountyWallet)).should.be.bignumber.equal(BOUNTY_SUPPLY)
  });

  it('should set dev timelock', async function () {
    // right before dev timelock
    await devTokenTimelock.release().should.be.rejected
    await increaseTimeTo(devReleaseTime);
    await devTokenTimelock.release().should.be.fulfilled;

    (await token.balanceOf(devWallet)).should.be.bignumber.equal(DEV_SUPPLY)
  });

  it('should set founders timelock', async function () {
    // right before founders timelock
    await foundersTokenTimelock.release().should.be.rejected
    await increaseTimeTo(foundersReleaseTime);
    await foundersTokenTimelock.release().should.be.fulfilled;

    (await token.balanceOf(foundersWallet)).should.be.bignumber.equal(FOUNDERS_SUPPLY)
  });

  it('should set team timelock', async function () {
    // right before team timelock
    await teamTokenTimelock.release().should.be.rejected
    await increaseTimeTo(teamReleaseTime);
    await teamTokenTimelock.release().should.be.fulfilled;

    (await token.balanceOf(teamWallet)).should.be.bignumber.equal(TEAM_SUPPLY)
  });

  it('should set advisers timelock', async function () {
    // right before advisers timelock
    await advisersTokenTimelock.release().should.be.rejected
    await increaseTimeTo(advisersReleaseTime);
    await advisersTokenTimelock.release().should.be.fulfilled;

    (await token.balanceOf(advisersWallet)).should.be.bignumber.equal(ADVISERS_SUPPLY)
  });

  it('should disable token transfers until ICO end', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.buyTokens(investor, {value: 1, from: investor})
    await token.transfer(someone, 1, { from: investor }).should.be.rejected

    await increaseTimeTo(afterEndTime);
    await token.transfer(someone, 1, { from: investor }).should.be.fulfilled
  });

  it('should not accept payments before start', async function () {
    await crowdsale.send(ether(1)).should.be.rejected;
    await crowdsale.buyTokens(investor, {from: investor, value: ether(1)}).should.be.rejected
  });

  it('should accept payments during ICO', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.sendTransaction({value:1, from: investor}).should.be.fulfilled;
    var balance = await token.balanceOf(investor);
    balance.should.be.bignumber.greaterThan(0);
    await crowdsale.buyTokens(someone, {from: investor, value: ether(1)}).should.be.fulfilled
    balance = await token.balanceOf(someone);
    balance.should.be.bignumber.greaterThan(0);
  });

  it('should apply bonus', async function () {
    var balanceBefore, balanceAfter, bonus, weiAmount;

    async function checkBonus(purchaseTime, purchaseAmount, expectedBonus) {
      bonus = () => { return balanceAfter.minus(balanceBefore).div(purchaseAmount).minus(RATE).div(RATE).mul(100) }

      await increaseTimeTo(purchaseTime);
      balanceBefore = await token.balanceOf(investor);
      await crowdsale.buyTokens(investor, {value: purchaseAmount, from: investor}).should.be.fulfilled;
      balanceAfter = await token.balanceOf(investor);
      bonus().should.be.bignumber.equal(expectedBonus)
    }

    async function batchBonusCheck(purchaseTime, bonus1, bonus3, bonus5, bonus10, bonus30, bonus50) {
      await checkBonus(purchaseTime, ether(1), bonus1);
      await checkBonus(purchaseTime + 1, ether(3), bonus3);
      await checkBonus(purchaseTime + 2, ether(5), bonus5);
      await checkBonus(purchaseTime + 3, ether(10), bonus10);
      await checkBonus(purchaseTime + 4, ether(30), bonus30);
      await checkBonus(purchaseTime + 5, ether(50), bonus50);
    }
    // preSale first day
    await batchBonusCheck(startTime, 50, 60, 80, 100, 120, 130);

    // preSale after first day
    await batchBonusCheck(preSaleFirstDay, 40, 50, 70, 90, 110, 120);

    // preICO
    await batchBonusCheck(preICOstartTime, 30, 40, 60, 80, 100, 110);

    // ICOweek1End
    await batchBonusCheck(ICOstartTime, 25, 35, 55, 75, 95, 105);

    // ICOweek2End
    await batchBonusCheck(ICOweek1End, 20, 30, 50, 70, 90, 100);

    // ICOweek3End
    await batchBonusCheck(ICOweek2End, 15, 25, 45, 65, 85, 95);

    // ICOweek4End
    await batchBonusCheck(ICOweek3End, 10, 20, 40, 60, 80, 90);

    // last 2 days
    await batchBonusCheck(ICOweek4End, 5, 15, 35, 55, 75, 85);
  });

  it('should reject payments after end', async function () {
    await increaseTimeTo(afterEndTime);
    await crowdsale.send(ether(1)).should.be.rejected
    await crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejected;
  });

  // skipped since CAP is unreachable with current settings
  it.skip('should reject payments over cap', async function () {
    await increaseTimeTo(endTime - 1);
    await crowdsale.send(CAP);
    await crowdsale.send(1).should.be.rejected;
  });

  it('should reject payments over TOKEN_PRESALE_CAP and TOKEN_PREICO_CAP', async function () {
    await increaseTimeTo(startTime);
    const actual_presale_rate = RATE.mul(230).div(100)
    const max_presale_wei = TOKEN_PRESALE_CAP.div(actual_presale_rate).floor()
    await crowdsale.send(max_presale_wei).should.be.fulfilled;
    await crowdsale.send(1).should.be.rejected;

    await increaseTimeTo(preICOstartTime);
    const actual_preico_rate = RATE.mul(210).div(100)
    const max_preico_wei = TOKEN_PREICO_CAP.div(actual_preico_rate).floor()
    await crowdsale.send(max_preico_wei).should.be.fulfilled;
    await crowdsale.send(1).should.be.rejected;

  });

  it('should reject payments over TOKEN_CAP', async function () {
    const actual_ico_rate = RATE.mul(185).div(100)
    const max_ico_wei = TOKEN_CAP.div(actual_ico_rate).floor()

    await increaseTimeTo(endTime - 1);
    await crowdsale.send(max_ico_wei).should.be.fulfilled;
    await crowdsale.send(1).should.be.rejected;
  });

  it('should allow Off Chain Contribution', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.addOffChainContribution(investor, 1, 2, "18hKLwrY3LU9NtfQ88tm3ne9bFt7uDBkSx").should.be.fulfilled

    const weiRaised = await crowdsale.weiRaised();
    const balance = await token.balanceOf(investor);
    weiRaised.should.be.bignumber.equal(1)
    balance.should.be.bignumber.equal(2)
  });
});
