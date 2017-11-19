pragma solidity ^0.4.13;

library SafeMath {
  function mul(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal constant returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function sub(uint256 a, uint256 b) internal constant returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

contract Ownable {
  address public owner;


  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  function Ownable() {
    owner = msg.sender;
  }


  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }


  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) onlyOwner public {
    require(newOwner != address(0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

}

contract RefundVault is Ownable {
  using SafeMath for uint256;

  enum State { Active, Refunding, Closed }

  mapping (address => uint256) public deposited;
  address public wallet;
  State public state;

  event Closed();
  event RefundsEnabled();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  function RefundVault(address _wallet) {
    require(_wallet != 0x0);
    wallet = _wallet;
    state = State.Active;
  }

  function deposit(address investor) onlyOwner public payable {
    require(state == State.Active);
    deposited[investor] = deposited[investor].add(msg.value);
  }

  function close() onlyOwner public {
    require(state == State.Active);
    state = State.Closed;
    Closed();
    wallet.transfer(this.balance);
  }

  function enableRefunds() onlyOwner public {
    require(state == State.Active);
    state = State.Refunding;
    RefundsEnabled();
  }

  function refund(address investor) public {
    require(state == State.Refunding);
    uint256 depositedValue = deposited[investor];
    deposited[investor] = 0;
    investor.transfer(depositedValue);
    Refunded(investor, depositedValue);
  }
}

contract Destructible is Ownable {

  function Destructible() payable { }

  /**
   * @dev Transfers the current balance to the owner and terminates the contract.
   */
  function destroy() onlyOwner public {
    selfdestruct(owner);
  }

  function destroyAndSend(address _recipient) onlyOwner public {
    selfdestruct(_recipient);
  }
}

contract ERC20Basic {
  uint256 public totalSupply;
  function balanceOf(address who) public constant returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public constant returns (uint256 balance) {
    return balances[_owner];
  }

}

contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public constant returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract LimitedTransferToken is ERC20 {

  /**
   * @dev Checks whether it can transfer or otherwise throws.
   */
  modifier canTransfer(address _sender, uint256 _value) {
   require(_value <= transferableTokens(_sender, uint64(now)));
   _;
  }

  /**
   * @dev Checks modifier and allows transfer if tokens are not locked.
   * @param _to The address that will receive the tokens.
   * @param _value The amount of tokens to be transferred.
   */
  function transfer(address _to, uint256 _value) canTransfer(msg.sender, _value) public returns (bool) {
    return super.transfer(_to, _value);
  }

  /**
  * @dev Checks modifier and allows transfer if tokens are not locked.
  * @param _from The address that will send the tokens.
  * @param _to The address that will receive the tokens.
  * @param _value The amount of tokens to be transferred.
  */
  function transferFrom(address _from, address _to, uint256 _value) canTransfer(_from, _value) public returns (bool) {
    return super.transferFrom(_from, _to, _value);
  }

  /**
   * @dev Default transferable tokens function returns all tokens for a holder (no limit).
   * @dev Overwriting transferableTokens(address holder, uint64 time) is the way to provide the
   * specific logic for limiting token transferability for a holder over time.
   */
  function transferableTokens(address holder, uint64 time) public constant returns (uint256) {
    return balanceOf(holder);
  }
}

library SafeERC20 {
  function safeTransfer(ERC20Basic token, address to, uint256 value) internal {
    assert(token.transfer(to, value));
  }

  function safeTransferFrom(ERC20 token, address from, address to, uint256 value) internal {
    assert(token.transferFrom(from, to, value));
  }

  function safeApprove(ERC20 token, address spender, uint256 value) internal {
    assert(token.approve(spender, value));
  }
}

contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) allowed;


  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));

    uint256 _allowance = allowed[_from][msg.sender];

    // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
    // require (_value <= _allowance);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = _allowance.sub(_value);
    Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender) public constant returns (uint256 remaining) {
    return allowed[_owner][_spender];
  }

  /**
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   */
  function increaseApproval (address _spender, uint _addedValue)
    returns (bool success) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  function decreaseApproval (address _spender, uint _subtractedValue)
    returns (bool success) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

contract BurnableToken is StandardToken {

    event Burn(address indexed burner, uint256 value);

    /**
     * @dev Burns a specific amount of tokens.
     * @param _value The amount of token to be burned.
     */
    function burn(uint256 _value) public {
        require(_value > 0);

        address burner = msg.sender;
        balances[burner] = balances[burner].sub(_value);
        totalSupply = totalSupply.sub(_value);
        Burn(burner, _value);
    }
}

contract MintableToken is StandardToken, Ownable {
  event Mint(address indexed to, uint256 amount);
  event MintFinished();

  bool public mintingFinished = false;


  modifier canMint() {
    require(!mintingFinished);
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
    totalSupply = totalSupply.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    Mint(_to, _amount);
    Transfer(0x0, _to, _amount);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() onlyOwner public returns (bool) {
    mintingFinished = true;
    MintFinished();
    return true;
  }
}

contract AXT is MintableToken, BurnableToken, LimitedTransferToken, Destructible  {
    string public constant name = "AXT";
    string public constant symbol = "AXT";
    uint256 public constant decimals = 18;

    bool transfersEnabled = false;

    /**
    * @dev Checks whether it can transfer or otherwise throws.
    */
    modifier canTransfer(address _sender, uint256 _value) {
        // Only contract owner can transfer irrestrictedly, regular holders need to wait until sale is finalized
        require(transfersEnabled || _sender == owner);
        _;
    }

    /**
    * @dev Enable token transfers. This is intended to be called when token sale is successfully finalized
    */
    function enableTransfers() onlyOwner public {
        transfersEnabled = true;
    }

    /**
    * @dev Overrides burn() function with onlyOwner modifier
    */
    function burn(uint256 _value) public onlyOwner {
        require(_value > 0);

        address burner = msg.sender;
        balances[burner] = balances[burner].sub(_value);
        totalSupply = totalSupply.sub(_value);
        Burn(burner, _value);
    }
}

contract AXTCrowdsale is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for AXT;

    enum KYCState { Pending, Approved, Rejected } // Pending is default

    struct Contribution {
        uint256 tokenPurchased;
        uint256 weiContributed;
        KYCState KYC;
        bool isValid;
    }

    bool public isFinalized = false;

    event Finalized();
    event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount);


    // minimum amount of funds to be raised in weis
    uint256 public goal;
    uint256 public tokenTotalCap;

    // refund vault used to hold funds while crowdsale is running
    RefundVault public vault;

    AXT public token;  // Token contract
    // start and end timestamps where investments are allowed (both inclusive)
    uint256 public startTime;
    uint256 public endTime;

    // address where funds are collected
    address public wallet;


    uint256 public constant weiPurchaseMin = 1;
    uint256 public constant tokenPurchaseCap = 100;

    // how many token units a buyer gets per wei
    uint256 public rate = 2;

    bool public lastChanceSale = false;

    // Initial distribution addresses
    address public advisersPool;
    address public foundersPool;
    address public legalExpensesWallet;

    mapping (address => Contribution) public contributions;
    address[] public participants;

    // TODO Crowdsale events

    /**
    * @dev Crowdsale contract constructor
    */
    function AXTCrowdsale(
        uint64 _startTime,
        uint64 _endTime,
        uint256 _rate,
        address _wallet,
        address _advisersPool,
        address _foundersPool,
        address _legalExpensesWallet,
        uint256 _goal,
        uint256 _tokenTotalCap)
    {
        require(_startTime >= now);
        require(_endTime >= _startTime);
        require(_rate > 0);
        require(_wallet != 0x0);
        require(_goal > 0);
        require(_tokenTotalCap > 0);
        goal = _goal;
        tokenTotalCap = _tokenTotalCap;
        startTime = _startTime;
        endTime = _endTime;
        rate = _rate;
        wallet = _wallet;
        vault = new RefundVault(wallet);
        token = new AXT();
        // mint allocated tokens
        token.mint(_advisersPool, 100);
        token.mint(_foundersPool, 100);
        token.mint(_legalExpensesWallet, 100);
    }

    // @return true if the transaction can buy tokens
    function validPurchase() internal constant returns (bool) {
        bool withinPeriod = now >= startTime && now <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        return withinPeriod && nonZeroPurchase;
    }

    // @return true if crowdsale event has ended
    function hasEnded() public constant returns (bool) {
        return now > endTime;
    }

    /**
    * @dev Must be called after crowdsale ends, to do some extra finalization
    * work. Calls the contract's finalization function.
    */
    function finalize() onlyOwner public {
        require(!isFinalized);
        require(hasEnded());

        finalization();
        Finalized();

        isFinalized = true;
    }

    /**
    * @dev Additional finalization logic. Enables token transfers.
    */
    function finalization() internal {
        if (goalReached()) {
            vault.close();
            token.enableTransfers();
            token.finishMinting();
        } else {
                vault.enableRefunds();
                token.destroyAndSend(owner);
            }
        }

        // if crowdsale is unsuccessful, investors can claim refunds here
        function claimRefund() public {
            require(isFinalized);
            require(!goalReached());

            vault.refund(msg.sender);
        }

        function goalReached() public constant returns (bool) {
            return weiRaised() >= goal;
        }


        function buyTokens() public payable {
            address participant = msg.sender;
            uint256 weiContributed = msg.value;
            uint256 tokenPurchased = msg.value * rate;

            addContribution(participant, weiContributed, tokenPurchased);

            // transfer funds to vault
            TokenPurchase(msg.sender, weiContributed, tokenPurchased);

            vault.deposit.value(weiContributed)(msg.sender);
        }

        function addOffChainContribution(address participant,  uint256 weiContributed, uint256 tokenPurchased) public {
            addContribution(participant, weiContributed, tokenPurchased);
            approve(participant);
        }

        function addContribution(address participant, uint256 weiContributed, uint256 tokenPurchased) internal {
            addParticipant(participant);

            // reject transaction if address has been KYC rejected already
            require(contributions[participant].KYC != KYCState.Rejected);

            // contribution should be within token cap
            require(token.totalSupply() + tokenPurchased <= tokenTotalCap);

            // update contributions
            contributions[participant].tokenPurchased += tokenPurchased;
            contributions[participant].weiContributed += weiContributed;

            // check for purchase restrictions
            require(contributions[participant].weiContributed >= weiPurchaseMin);
            require(contributions[participant].tokenPurchased <= tokenPurchaseCap);

            // issue tokens if address has been KYC approved already
            if (contributions[participant].KYC == KYCState.Approved) {
                token.mint(participant, tokenPurchased);
            }

            // send events
        }

        function addParticipant(address participant) internal {
            // if new participant
            if ( !contributions[participant].isValid ) {
                // initialize related contribution
                contributions[participant].isValid = true;
                // add new participant
                participants.push(participant);
            }
        }

        function rejectAllPending() public {
            address participant;
            for(uint i = 0; i < participants.length; i++) {
                participant = participants[i];
                if (contributions[participant].KYC == KYCState.Pending) {
                    contributions[participant] = Contribution({
                        tokenPurchased: 0,
                        weiContributed: 0,
                        KYC: KYCState.Rejected,
                        isValid: true
                        });
                        // release funds
                        vault.refund(participant);
                    }
                }
            }

            function approve(address participant) public {
                addParticipant(participant);
                require(contributions[participant].KYC == KYCState.Pending);
                contributions[participant].KYC = KYCState.Approved;
                // mint tokens
                token.mint(participant, contributions[participant].tokenPurchased);
            }

            function reject(address participant) public {
                addParticipant(participant);
                require(contributions[participant].KYC == KYCState.Pending);
                contributions[participant] = Contribution({
                    tokenPurchased: 0,
                    weiContributed: 0,
                    KYC: KYCState.Rejected,
                    isValid: true
                    });
                    // release funds
                    vault.refund(participant);
                }

                function weiRaised() public constant returns (uint256) {
                    uint256 funds;
                    for(uint i = 0; i < participants.length; i++) {
                        if (contributions[participants[i]].KYC == KYCState.Approved) {
                            funds += contributions[participants[i]].weiContributed;
                        }
                    }
                    return funds;
                }

                function weiPending() public constant returns (uint256) {
                    uint256 funds;
                    for(uint i = 0; i < participants.length; i++) {
                        if (contributions[participants[i]].KYC == KYCState.Pending) {
                            funds += contributions[participants[i]].weiContributed;
                        }
                    }
                    return funds;
                }
            }

