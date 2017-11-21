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

    uint256 endTimeICO;

    function LinkCoin(uint256 _endTimeICO) {
        endTimeICO = _endTimeICO;
    }

    function transferableTokens(address holder, uint64 time) public constant returns (uint256) {
        // allow transfers after the end of ICO
        return time > endTimeICO ? balanceOf(holder) : 0;
    }

}
