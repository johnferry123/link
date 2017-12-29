pragma solidity ^0.4.11;


import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/LimitedTransferToken.sol";


/**
* @title StarterCoin
*/
contract StarterCoin is MintableToken, LimitedTransferToken {

    string public constant name = "StarterCoin";
    string public constant symbol = "STC";
    uint8 public constant decimals = 18;

    uint256 public endTimeICO;
    address public bountyWallet;

    function StarterCoin(uint256 _endTimeICO, address _bountyWallet) {
        endTimeICO = _endTimeICO;
        bountyWallet = _bountyWallet;
    }

    function transferableTokens(address holder, uint64 time) public constant returns (uint256) {
        // allow transfers after the end of ICO
        return (time > endTimeICO) || (holder == bountyWallet) ? balanceOf(holder) : 0;
    }

}
