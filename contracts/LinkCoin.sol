pragma solidity ^0.4.11;


import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/LimitedTransferToken.sol";


/**
* @title LinkCoin
*/
contract LinkCoin is MintableToken, LimitedTransferToken {

    string public constant name = "LinkCoin";
    string public constant symbol = "LINK";
    uint8 public constant decimals = 18;

    address bountyWallet;
    uint256 endTimeICO;

    function LinkCoin(address _bountyWallet, uint256 _endTimeICO) {
        bountyWallet = _bountyWallet;
        endTimeICO = _endTimeICO;
    }

    function transferableTokens(address holder, uint64 time) public constant returns (uint256) {
        // allow transfers only from bountyWallet before the end of ICO
        return ((holder == bountyWallet) || (time > endTimeICO)) ? balanceOf(holder) : 0;
    }

}
