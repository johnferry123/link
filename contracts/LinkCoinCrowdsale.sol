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
    uint256 public preSaleFirstDay;
    uint256 public preICOstartTime;
    uint256 public ICOstartTime;
    uint256 public ICOweek1;
    uint256 public ICOweek2;
    uint256 public ICOweek3;
    uint256 public ICOweek4;
    uint256 public endTime;

    // address where funds are collected
    address public wallet;

    // how many token units a buyer gets per wei
    uint256 public constant RATE = 4500;

    // amount of raised money in wei
    uint256 public weiRaised;
    uint256 public tokenSoldPreSale;
    uint256 public tokenSoldPreICO;
    uint256 public tokenSold;

    uint256 public constant CAP = 154622 ether;
    uint256 public constant TOKEN_PRESALE_CAP = 45000000 * (10 ** uint256(18));
    uint256 public constant TOKEN_PREICO_CAP = 62797500 * (10 ** uint256(18));
    uint256 public constant TOKEN_CAP = 695797500 * (10 ** uint256(18)); // 45000000+62797500+588000000 LINK

    address public bountyWallet;

    TokenTimelock public devTokenTimelock;
    TokenTimelock public foundersTokenTimelock;
    TokenTimelock public teamTokenTimelock;
    TokenTimelock public advisersTokenTimelock;

    uint256 public constant BOUNTY_SUPPLY = 78400000 * (10 ** uint256(18));
    uint256 public constant DEV_SUPPLY = 78400000 * (10 ** uint256(18));
    uint256 public constant FOUNDERS_SUPPLY = 59600000 * (10 ** uint256(18));
    uint256 public constant TEAM_SUPPLY = 39200000 * (10 ** uint256(18));
    uint256 public constant ADVISERS_SUPPLY = 29400000 * (10 ** uint256(18));


    function LinkCoinCrowdsale(
        uint256 [9] timing,
        address _wallet,
        address _bountyWallet,
        address devWallet,
        uint64 devReleaseTime,
        address foundersWallet,
        uint64 foundersReleaseTime,
        address teamWallet,
        uint64 teamReleaseTime,
        address advisersWallet,
        uint64 advisersReleaseTime
        ) {
            startTime = timing[0];
            preSaleFirstDay = timing[1];
            preICOstartTime = timing[2];
            ICOstartTime = timing[3];
            ICOweek1 = timing[4];
            ICOweek2 = timing[5];
            ICOweek3 = timing[6];
            ICOweek4 = timing[7];
            endTime = timing[8];

            require(startTime >= now);
            require(preSaleFirstDay >= startTime);
            require(preICOstartTime >= preSaleFirstDay);
            require(ICOstartTime >= preICOstartTime);
            require(ICOweek1 >= ICOstartTime);
            require(ICOweek2 >= ICOweek1);
            require(ICOweek3 >= ICOweek2);
            require(ICOweek4 >= ICOweek3);
            require(endTime >= ICOweek4);

            require(devReleaseTime >= endTime);
            require(foundersReleaseTime >= endTime);
            require(teamReleaseTime >= endTime);
            require(advisersReleaseTime >= endTime);

            require(_wallet != 0x0);
            require(_bountyWallet != 0x0);
            require(devWallet != 0x0);
            require(foundersWallet != 0x0);
            require(teamWallet != 0x0);
            require(advisersWallet != 0x0);

            wallet = _wallet;
            bountyWallet = _bountyWallet;

            token = new LinkCoin(bountyWallet, endTime);

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
            require(validPurchase());

            uint256 weiAmount = msg.value;

            // calculate period bonus
            uint256 periodBonus;
            if (now < preSaleFirstDay) {
            periodBonus = 2250; // 50% bonus for RATE 4500
            } else if (now < preICOstartTime) {
            periodBonus = 1800; // 40% bonus for RATE 4500
            } else if (now < ICOstartTime) {
            periodBonus = 1350; // 30% bonus for RATE 4500
            } else if (now < ICOweek1) {
            periodBonus = 1125; // 25% bonus for RATE 4500
            } else if (now < ICOweek2) {
            periodBonus = 900; // 20% bonus for RATE 4500
            } else if (now < ICOweek3) {
            periodBonus = 675; // 15% bonus for RATE 4500
            } else if (now < ICOweek4) {
            periodBonus = 450; // 10% bonus for RATE 4500
            } else {
            periodBonus = 225; // 5% bonus for RATE 4500
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

            // check for tokenCAP
            if (now < preICOstartTime) {
            // presale
            tokenSoldPreSale = tokenSoldPreSale.add(tokens);
            require(tokenSoldPreSale <= TOKEN_PRESALE_CAP);
            } else if (now < ICOstartTime) {
            // preICO
            tokenSoldPreICO = tokenSoldPreICO.add(tokens);
            require(tokenSoldPreICO <= TOKEN_PREICO_CAP);
            } else {
            // ICO
            require(tokenSold <= TOKEN_CAP);
            }


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
