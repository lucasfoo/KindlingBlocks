// contracts/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MyTokenVote.sol";

contract MyTokenFactory {
    function createMyToken(address addr, uint256 initialSupply) public returns(MyToken) {
        return new MyToken(addr, initialSupply);
    }
}

contract MyToken is ERC20, MyTokenVote {
    using SafeMath for uint256;

    address minter;
    constructor(address addr, uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(addr, initialSupply);
        minter = addr;
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._afterTokenTransfer(from, to, amount);
        if (to != address(0) && minter != from && minter != to ) _burn(to, amount.div(100));
    }
}
