pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/token/TokenTimelock.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./StarterCoin.sol";

/**
* @title StarterCoinCrowdsale
*/
contract StarterCoinCrowdsale is Ownable {
    using SafeMath for uint256;
    // The token being sold
    MintableToken public token;

    // start and end timestamps where investments are allowed (both inclusive)
    uint256 public startTime;
    uint256 public endTime;

    uint256[11] public timings;
    uint8[10] public bonuses;

    // address where funds are collected
    address public wallet89;
    address public wallet10;
    address public wallet1;

    // how many token units a buyer gets per wei
    uint256 public constant RATE = 4500;

    // amount of raised money in wei
    uint256 public weiRaised;

    uint256 public tokenSold;

    uint256 public constant CAP = 154622 ether;
    uint256 public constant TOKEN_CAP = 695797500 * (10 ** uint256(18)); // 45000000+62797500+588000000 STC

    TokenTimelock public devTokenTimelock;
    TokenTimelock public foundersTokenTimelock;
    TokenTimelock public teamTokenTimelock;
    TokenTimelock public advisersTokenTimelock;

    uint256 public constant BOUNTY_SUPPLY = 78400000 * (10 ** uint256(18));
    uint256 public constant DEV_SUPPLY = 78400000 * (10 ** uint256(18));
    uint256 public constant FOUNDERS_SUPPLY = 59600000 * (10 ** uint256(18));
    uint256 public constant TEAM_SUPPLY = 39200000 * (10 ** uint256(18));
    uint256 public constant ADVISERS_SUPPLY = 29400000 * (10 ** uint256(18));


    function StarterCoinCrowdsale(
        uint256 [11] _timings,
        uint8 [10] _bonuses,
        address [3] _wallets,
        address bountyWallet,
        address devWallet,
        uint64 devReleaseTime,
        address foundersWallet,
        uint64 foundersReleaseTime,
        address teamWallet,
        uint64 teamReleaseTime,
        address advisersWallet,
        uint64 advisersReleaseTime
        ) {
            require(_timings[0] >= now);

            for(uint i = 1; i < timings.length; i++) {
              require(_timings[i] >= _timings[i-1]);
            }

            timings = _timings;
            bonuses = _bonuses;
            startTime = timings[0];
            endTime = timings[timings.length-1];

            require(devReleaseTime >= endTime);
            require(foundersReleaseTime >= endTime);
            require(teamReleaseTime >= endTime);
            require(advisersReleaseTime >= endTime);

            require(_wallets[0] != 0x0);
            require(_wallets[1] != 0x0);
            require(_wallets[2] != 0x0);

            require(bountyWallet != 0x0);
            require(devWallet != 0x0);
            require(foundersWallet != 0x0);
            require(teamWallet != 0x0);
            require(advisersWallet != 0x0);

            wallet89 = _wallets[0];
            wallet10 = _wallets[1];
            wallet1 = _wallets[2];

            token = new StarterCoin(endTime, bountyWallet);

            token.mint(bountyWallet, BOUNTY_SUPPLY);

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
            require(msg.value >= 100); // required for proper splitting funds between 3 wallets

            uint256 weiAmount = msg.value;

            // calculate period bonus
            uint256 periodBonus;

            for (uint8 i = 1; i < timings.length; i++) {
              if ( now < timings[i] ) {
                periodBonus = RATE.mul(uint256(bonuses[i-1])).div(100);
                break;
              }
            }

            // calculate bulk purchase bonus
            uint256 bulkPurchaseBonus;
            if (weiAmount >= 50 ether) {
            bulkPurchaseBonus = 3600; // 80% bonus for RATE 4500
            } else if (weiAmount >= 30 ether) {
            bulkPurchaseBonus = 3150; // 70% bonus for RATE 4500
            } else if (weiAmount >= 10 ether) {
            bulkPurchaseBonus = 2250; // 50% bonus for RATE 4500
            } else if (weiAmount >= 5 ether) {
            bulkPurchaseBonus = 1350; // 30% bonus for RATE 4500
            } else if (weiAmount >= 3 ether) {
            bulkPurchaseBonus = 450; // 10% bonus for RATE 4500
            }

            uint256 actualRate = RATE.add(periodBonus).add(bulkPurchaseBonus);

            // calculate token amount to be created
            uint256 tokens = weiAmount.mul(actualRate);

            // update state
            weiRaised = weiRaised.add(weiAmount);
            tokenSold = tokenSold.add(tokens);

            require(validPurchase());

            token.mint(beneficiary, tokens);
            TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

            forwardFunds();
        }

        // send ether to the fund collection wallet
        // override to create custom fund forwarding mechanisms
        function forwardFunds() internal {
          uint256 wei89 = msg.value.mul(89).div(100);
          uint256 wei10 = msg.value.div(10);
          uint256 wei1 = msg.value.sub(wei89).sub(wei10);
          wallet89.transfer(wei89);
          wallet10.transfer(wei10);
          wallet1.transfer(wei1);
        }

        // add off chain contribution. BTC address of contribution added for transparency
        function addOffChainContribution(address beneficiar, uint256 weiAmount, uint256 tokenAmount, string btcAddress) onlyOwner public {
            require(beneficiar != 0x0);
            require(weiAmount > 0);
            require(tokenAmount > 0);
            weiRaised += weiAmount;
            tokenSold += tokenAmount;
            require(validPurchase());
            token.mint(beneficiar, tokenAmount);
        }


        // overriding Crowdsale#validPurchase to add extra CAP logic
        // @return true if investors can buy at the moment
        function validPurchase() internal constant returns (bool) {
            bool withinCap = weiRaised <= CAP;
            bool withinPeriod = now >= startTime && now <= endTime;
            bool withinTokenCap = tokenSold <= TOKEN_CAP;
            return withinPeriod && withinCap && withinTokenCap;
        }

        // overriding Crowdsale#hasEnded to add CAP logic
        // @return true if crowdsale event has ended
        function hasEnded() public constant returns (bool) {
            bool capReached = weiRaised >= CAP;
            return now > endTime || capReached;
        }

    }
