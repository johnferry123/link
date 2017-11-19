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

contract('Crowdsale', function ([owner, wallet, bountyWallet, devWallet, foundersWallet, teamWallet, advisersWallet, investor, someone]) {

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
  })

  let crowdsale, token, devTokenTimelock,
  foundersTokenTimelock, teamTokenTimelock,
  advisersTokenTimelock, startTime, preICOstartTime,
  ICOstartTime, endTime,
  afterEndTime, devReleaseTime, foundersReleaseTime,
  teamReleaseTime, advisersReleaseTime,
  RATE, CAP, TOKEN_PRESALE_CAP, TOKEN_PREICO_CAP,
  TOKEN_CAP, BOUNTY_SUPPLY, ADVISERS_SUPPLY, TEAM_SUPPLY,
  FOUNDERS_SUPPLY, DEV_SUPPLY

  beforeEach(async function () {
    startTime = latestTime() + duration.weeks(1);
    preICOstartTime = startTime + 600 // pre sale lasts 10 minutes
    ICOstartTime = preICOstartTime + 600 // pre ICO lasts 10 minutes
    endTime = ICOstartTime + 600          // ICO lasts 10 minutes
    afterEndTime = endTime + duration.seconds(1);
    devReleaseTime = endTime + 600
    foundersReleaseTime = endTime + 2*600
    teamReleaseTime = endTime + 3*600
    advisersReleaseTime = endTime + 4*600

    crowdsale = await LinkCoinCrowdsale.new(
      startTime,
      preICOstartTime,
      ICOstartTime,
      endTime,
      wallet,
      bountyWallet,
      devWallet,
      devReleaseTime,
      foundersWallet,
      foundersReleaseTime,
      teamWallet,
      teamReleaseTime,
      advisersWallet,
      advisersReleaseTime);

    token = LinkCoin.at(await crowdsale.token());

    //timeLocks
    devTokenTimelock = TokenTimelock.at(await crowdsale.devTokenTimelock())
    foundersTokenTimelock = TokenTimelock.at(await crowdsale.foundersTokenTimelock())
    teamTokenTimelock = TokenTimelock.at(await crowdsale.teamTokenTimelock())
    advisersTokenTimelock = TokenTimelock.at(await crowdsale.advisersTokenTimelock())

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

  it('should allocate bounty tokens', async function () {
    (await token.balanceOf(bountyWallet)).should.be.bignumber.equal(BOUNTY_SUPPLY);
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

  it('should disable token transfers until ICO end except bountyWallet', async function () {
    await token.transfer(someone, 1, { from: bountyWallet }).should.be.fulfilled

    await increaseTimeTo(startTime);
    await crowdsale.buyTokens(investor, {value: 1, from: investor})
    await token.transfer(someone, 1, { from: investor }).should.be.rejected

    await increaseTimeTo(afterEndTime);
    // await token.transfer(someone, 1, { from: investor }).should.be.fulfilled
  });

  it('should not accept payments before start', async function () {
    await crowdsale.send(ether(1)).should.be.rejected;
    await crowdsale.buyTokens(investor, {from: investor, value: ether(1)}).should.be.rejected
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
    await crowdsale.send(ether(1)).should.be.rejected
    await crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejected;
  });

  it.skip('should reject payments over cap', async function () {
    await increaseTimeTo(endTime - 1);
    await crowdsale.send(CAP);
    await crowdsale.send(1).should.be.rejected;
  });

  it('should reject payments over TOKEN_PRESALE_CAP and TOKEN_PREICO_CAP', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.send(TOKEN_PRESALE_CAP.div(RATE)).should.be.fulfilled;
    await crowdsale.send(1).should.be.rejected;

    await increaseTimeTo(preICOstartTime);
    await crowdsale.send(TOKEN_PREICO_CAP.div(RATE)).should.be.fulfilled;
    await crowdsale.send(1).should.be.rejected;

  });

  it('should reject payments over TOKEN_CAP', async function () {
    await increaseTimeTo(startTime);
    await crowdsale.send(1)

    await increaseTimeTo(preICOstartTime);
    await crowdsale.send(1)

    await increaseTimeTo(ICOstartTime);
    await crowdsale.send(TOKEN_CAP.div(RATE).floor().sub(2)).should.be.fulfilled;
    await crowdsale.send(1).should.be.rejected;
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
