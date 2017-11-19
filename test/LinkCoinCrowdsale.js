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

const LinkCoinCrowdsale = artifacts.require('LinkCoinCrowdsale');
const LinkCoin = artifacts.require('LinkCoin');
const TokenTimelock = artifacts.require('TokenTimelock');

contract('Crowdsale', function ([owner, wallet, bountyWallet, devWallet, foundersWallet, investor, someone]) {

  const RATE = new BigNumber(10);
  const CAP  = ether(20);
  const BOUNTY_SUPPLY  = 1;

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
  })

  let crowdsale, token, devTokenTimelock,
  foundersTokenTimelock, teamTokenTimelock,
  advisersTokenTimelock, startTime, endTime,
  afterEndTime, devReleaseTime, foundersReleaseTime,
  teamReleaseTime, advisersReleaseTime

  beforeEach(async function () {
    startTime = latestTime() + duration.weeks(1);
    endTime =   startTime + duration.weeks(1);
    afterEndTime = endTime + duration.seconds(1);
    devReleaseTime = startTime + 3600
    foundersReleaseTime = startTime + 2*3600

    crowdsale = await LinkCoinCrowdsale.new(
      startTime,
      endTime,
      RATE,
      CAP,
      wallet,
      bountyWallet,
      BOUNTY_SUPPLY,
      devWallet,
      devReleaseTime,
      foundersWallet,
      foundersReleaseTime);

    token = LinkCoin.at(await crowdsale.token());

    //timeLocks
    devTokenTimelock = TokenTimelock.at(await crowdsale.devTokenTimelock())
    foundersTokenTimelock = TokenTimelock.at(await crowdsale.foundersTokenTimelock())
  });


  it('should create crowdsale with correct parameters', async function () {
    crowdsale.should.exist;
    token.should.exist;

    (await crowdsale.startTime()).should.be.bignumber.equal(startTime);
    (await crowdsale.endTime()).should.be.bignumber.equal(endTime);
    (await crowdsale.rate()).should.be.bignumber.equal(RATE);
    (await crowdsale.wallet()).should.be.equal(wallet);
    (await crowdsale.cap()).should.be.bignumber.equal(CAP);
  });

  it('should allocate bounty tokens', async function () {
    (await token.balanceOf(bountyWallet)).should.be.bignumber.equal(BOUNTY_SUPPLY);
  });

  it('should set dev timelock', async function () {
    // right before dev timelock
    await devTokenTimelock.release().should.be.rejected
    await increaseTimeTo(devReleaseTime);
    await devTokenTimelock.release().should.be.fulfilled

    const DEV_SUPPLY = await crowdsale.DEV_SUPPLY();
    (await token.balanceOf(devWallet)).should.be.bignumber.equal(DEV_SUPPLY)
  });

  it.only('should set founders timelock', async function () {
    // right before dev timelock
    await foundersTokenTimelock.release().should.be.rejected
    await increaseTimeTo(foundersReleaseTime);
    await foundersTokenTimelock.release().should.be.fulfilled

    const FOUNDERS_SUPPLY = await crowdsale.FOUNDERS_SUPPLY();
    (await token.balanceOf(foundersWallet)).should.be.bignumber.equal(FOUNDERS_SUPPLY)
  });

  it('should disable token transfers until ICO end except bountyWallet', async function () {
    await token.transfer(someone, 1, { from: bountyWallet }).should.be.fulfilled

    await increaseTimeTo(startTime);
    await crowdsale.buyTokens(investor, {value: 1, from: investor})
    await token.transfer(someone, 1, { from: investor }).should.be.rejected

    await increaseTimeTo(afterEndTime);
    await token.transfer(someone, 1, { from: investor }).should.be.fulfilled
  });

  it('should not accept payments before start', async function () {
    await crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
    await crowdsale.buyTokens(investor, {from: investor, value: ether(1)}).should.be.rejectedWith(EVMThrow);
  });

  it('should accept payments during the sale', async function () {
    const investmentAmount = ether(1);
    const expectedTokenAmount = RATE.mul(investmentAmount);

    await increaseTimeTo(startTime);
    await crowdsale.buyTokens(investor, {value: investmentAmount, from: investor}).should.be.fulfilled;

    (await token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
  });

  it('should reject payments after end', async function () {
    await increaseTimeTo(afterEndTime);
    await crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
    await crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejectedWith(EVMThrow);
  });

  it.skip('should reject payments over cap', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.send(CAP);
    await crowdsale.send(1).should.be.rejectedWith(EVMThrow);
  });

  // it('should allow finalization and transfer funds to wallet if the goal is reached', async function () {
  //   await increaseTimeTo(startTime);
  //   await crowdsale.send(GOAL);
  //
  //   const beforeFinalization = web3.eth.getBalance(wallet);
  //   await increaseTimeTo(afterEndTime);
  //   await crowdsale.finalize({from: owner});
  //   const afterFinalization = web3.eth.getBalance(wallet);
  //
  //   afterFinalization.minus(beforeFinalization).should.be.bignumber.equal(GOAL);
  // });
  //
  // it('should allow refunds if the goal is not reached', async function () {
  //   const balanceBeforeInvestment = web3.eth.getBalance(investor);
  //
  //   await increaseTimeTo(startTime);
  //   await crowdsale.sendTransaction({value: ether(1), from: investor, gasPrice: 0});
  //   await increaseTimeTo(afterEndTime);
  //
  //   await crowdsale.finalize({from: owner});
  //   await crowdsale.claimRefund({from: investor, gasPrice: 0}).should.be.fulfilled;
  //
  //   const balanceAfterRefund = web3.eth.getBalance(investor);
  //   balanceBeforeInvestment.should.be.bignumber.equal(balanceAfterRefund);
  // });

});
