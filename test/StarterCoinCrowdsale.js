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

contract('Crowdsale', function ([owner, wallet89, wallet10, wallet1, bountyWallet, devWallet, foundersWallet, teamWallet, advisersWallet, investor]) {

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
  })

  let crowdsale, token, devTokenTimelock,
  foundersTokenTimelock, teamTokenTimelock,
  advisersTokenTimelock, startTime, timings, bonuses, endTime,
  afterEndTime, devReleaseTime, foundersReleaseTime,
  teamReleaseTime, advisersReleaseTime,
  RATE, CAP, TOKEN_CAP, BOUNTY_SUPPLY, ADVISERS_SUPPLY,
  TEAM_SUPPLY, FOUNDERS_SUPPLY, DEV_SUPPLY

  beforeEach(async function () {
    startTime = latestTime() + duration.weeks(1);

    timings = []
    for(var i = 0; i < 11; i++) {
      timings[i] = startTime + 300 * i;
    }
    endTime = timings[timings.length - 1]

    bonuses = [70, 50, 40, 30, 20, 10, 20, 10, 30, 20]
    afterEndTime = endTime + duration.seconds(1);
    devReleaseTime = endTime + 600
    foundersReleaseTime = endTime + 2*600
    teamReleaseTime = endTime + 3*600
    advisersReleaseTime = endTime + 4*600

    crowdsale = await StarterCoinCrowdsale.new(
      timings,
      bonuses,
      [ wallet89, wallet10, wallet1 ],
      bountyWallet,
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
    devTokenTimelock = TokenTimelock.at(await crowdsale.devTokenTimelock());
    foundersTokenTimelock = TokenTimelock.at(await crowdsale.foundersTokenTimelock());
    teamTokenTimelock = TokenTimelock.at(await crowdsale.teamTokenTimelock());
    advisersTokenTimelock = TokenTimelock.at(await crowdsale.advisersTokenTimelock());

    // crowdsale constants
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
    (await crowdsale.wallet89()).should.be.equal(wallet89);
    (await crowdsale.wallet10()).should.be.equal(wallet10);
    (await crowdsale.wallet1()).should.be.equal(wallet1);
    (await crowdsale.CAP()).should.be.bignumber.equal(CAP);
    (await crowdsale.TOKEN_CAP()).should.be.bignumber.equal(TOKEN_CAP);
  });

  it('should send tokens to bounty wallet', async function () {
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

  it('should disable token transfers until ICO end (except bountyWallet)', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.buyTokens(investor, {value: 100, from: investor})
    await token.transfer(owner, 1, { from: investor }).should.be.rejected
    await token.transfer(owner, 1, { from: bountyWallet }).should.be.fulfilled

    await increaseTimeTo(afterEndTime);
    await token.transfer(owner, 1, { from: investor }).should.be.fulfilled
  });

  it('should not accept payments before start', async function () {
    await crowdsale.send(ether(1)).should.be.rejected;
    await crowdsale.buyTokens(investor, {from: investor, value: ether(1)}).should.be.rejected
  });

  it('should accept payments during ICO', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.sendTransaction({value:100, from: investor}).should.be.fulfilled;
    var balance = await token.balanceOf(investor);
    balance.should.be.bignumber.greaterThan(0);
    await crowdsale.buyTokens(owner, {from: investor, value: ether(1)}).should.be.fulfilled
    balance = await token.balanceOf(owner);
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

    async function batchBonusCheck(purchaseTime, bonus1) {
      await checkBonus(purchaseTime, ether(1), bonus1);
      await checkBonus(purchaseTime + 1, ether(3), bonus1+10);
      await checkBonus(purchaseTime + 2, ether(5), bonus1+30);
      await checkBonus(purchaseTime + 3, ether(10), bonus1+50);
      await checkBonus(purchaseTime + 4, ether(30), bonus1+70);
      await checkBonus(purchaseTime + 5, ether(50), bonus1+80);
    }

    for (var i = 0; i < bonuses.length; i++) {
      await batchBonusCheck(timings[i], bonuses[i])
    }
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

  it('should reject payments over TOKEN_CAP', async function () {
    const actual_ico_rate = RATE.mul(250).div(100)
    const max_ico_wei = TOKEN_CAP.div(actual_ico_rate).floor()

    await increaseTimeTo(startTime);
    await crowdsale.send(max_ico_wei).should.be.fulfilled;
    await crowdsale.send(100).should.be.rejected;
  });

  it('should allow Off Chain Contribution', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.addOffChainContribution(investor, 1, 2, "18hKLwrY3LU9NtfQ88tm3ne9bFt7uDBkSx").should.be.fulfilled

    const weiRaised = await crowdsale.weiRaised();
    const balance = await token.balanceOf(investor);
    weiRaised.should.be.bignumber.equal(1)
    balance.should.be.bignumber.equal(2)
  });

  it('should split funds between 3 wallets in proportion 89/10/1', async function () {
    await increaseTimeTo(startTime);
    var balance89Before = await web3.eth.getBalance(wallet89);
    var balance10Before = await web3.eth.getBalance(wallet10);
    var balance1Before = await web3.eth.getBalance(wallet1);
    await crowdsale.send(100);
    var balance89After = await web3.eth.getBalance(wallet89);
    var balance10After = await web3.eth.getBalance(wallet10);
    var balance1After = await web3.eth.getBalance(wallet1);
    balance89After.minus(balance89Before).should.be.bignumber.equal(89)
    balance10After.minus(balance10Before).should.be.bignumber.equal(10)
    balance1After.minus(balance1Before).should.be.bignumber.equal(1)
  });
});
