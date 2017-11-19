pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/token/TokenTimelock.sol";
import "./LinkCoin.sol";

/**
* @title LinkCoinCrowdsale
*/
contract LinkCoinCrowdsale {
    using SafeMath for uint256;
    // The token being sold
    MintableToken public token;

    // start and end timestamps where investments are allowed (both inclusive)
    uint256 public startTime;
    uint256 public endTime;

    // address where funds are collected
    address public wallet;

    // how many token units a buyer gets per wei
    uint256 public constant RATE = 4500;

    // amount of raised money in wei
    uint256 public weiRaised;

    uint256 public constant CAP = 154622 ether;

    address public bountyWallet;

    TokenTimelock public devTokenTimelock;
    TokenTimelock public foundersTokenTimelock;
    TokenTimelock public teamTokenTimelock;
    TokenTimelock public advisersTokenTimelock;

    uint256 public constant DEV_SUPPLY = 78400000 * (10 ** uint256(18));
    uint256 public constant FOUNDERS_SUPPLY = 59600000 * (10 ** uint256(18));
    uint256 public constant TEAM_SUPPLY = 39200000 * (10 ** uint256(18));
    uint256 public constant ADVISERS_SUPPLY = 29400000 * (10 ** uint256(18));


    function LinkCoinCrowdsale(
        uint256 _startTime,
        uint256 _endTime,
        address _wallet,
        address _bountyWallet,
        uint256 _bountySupply,
        address devWallet,
        uint64 devReleaseTime,
        address foundersWallet,
        uint64 foundersReleaseTime,
        address teamWallet,
        uint64 teamReleaseTime,
        address advisersWallet,
        uint64 advisersReleaseTime
        ) {
            require(_startTime >= now);
            require(devReleaseTime >= now);
            require(foundersReleaseTime >= now);
            require(teamReleaseTime >= now);
            require(advisersReleaseTime >= now);
            require(_endTime >= _startTime);
            require(_wallet != 0x0);
            require(_bountyWallet != 0x0);
            require(devWallet != 0x0);
            require(foundersWallet != 0x0);
            require(teamWallet != 0x0);
            require(advisersWallet != 0x0);

            bountyWallet = _bountyWallet;
            endTime = _endTime;
            startTime = _startTime;
            wallet = _wallet;

            token = new LinkCoin(bountyWallet, endTime);
            token.mint(bountyWallet, _bountySupply);

            devTokenTimelock = new TokenTimelock(token, devWallet, devReleaseTime);
            token.mint(devTokenTimelock, DEV_SUPPLY);

            foundersTokenTimelock = new TokenTimelock(token, foundersWallet, foundersReleaseTime);
            token.mint(foundersTokenTimelock, FOUNDERS_SUPPLY);

            teamTokenTimelock = new TokenTimelock(token, teamWallet, teamReleaseTime);
            token.mint(teamTokenTimelock, TEAM_SUPPLY);

            advisersTokenTimelock = new TokenTimelock(token, advisersWallet, advisersReleaseTime);
            token.mint(advisersTokenTimelock, ADVISERS_SUPPLY);
        }




        /**
        * event for token purchase logging
        * @param purchaser who paid for the tokens
        * @param beneficiary who got the tokens
        * @param value weis paid for purchase
        * @param amount amount of tokens purchased
        */
        event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

        // creates the token to be sold.
        // override this method to have crowdsale of a specific mintable token.
        function createTokenContract() internal returns (MintableToken) {
            return new MintableToken();
        }


        // fallback function can be used to buy tokens
        function () payable {
            buyTokens(msg.sender);
        }

        // low level token purchase function
        function buyTokens(address beneficiary) public payable {
            require(beneficiary != 0x0);
            require(validPurchase());

            uint256 weiAmount = msg.value;

            // calculate token amount to be created
            uint256 tokens = weiAmount.mul(RATE);

            // update state
            weiRaised = weiRaised.add(weiAmount);

            token.mint(beneficiary, tokens);
            TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

            forwardFunds();
        }

        // send ether to the fund collection wallet
        // override to create custom fund forwarding mechanisms
        function forwardFunds() internal {
            wallet.transfer(msg.value);
        }




        // overriding Crowdsale#validPurchase to add extra CAP logic
        // @return true if investors can buy at the moment
        function validPurchase() internal constant returns (bool) {
            bool withinCap = weiRaised.add(msg.value) <= CAP;
            bool withinPeriod = now >= startTime && now <= endTime;
            bool nonZeroPurchase = msg.value != 0;
            return withinPeriod && nonZeroPurchase && withinCap;
        }

        // overriding Crowdsale#hasEnded to add CAP logic
        // @return true if crowdsale event has ended
        function hasEnded() public constant returns (bool) {
            bool capReached = weiRaised >= CAP;
            return now > endTime || capReached;
        }

    }
