// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/SafeBEP20.sol";
import "./interfaces/IBEP20.sol";

// @notice CDzBar the rewarder of MasterChef
contract CDzBar is Ownable {
    using SafeBEP20 for IBEP20;

    // @notice The CDz token
    IBEP20 public cdz;

    constructor (IBEP20 _cdz) {
        require(address(_cdz) != address(0), "the _cdz address is zero");
        cdz = _cdz;
    }

    // @notice Safe cdz transfer function, just in case if rounding error causes pool to not hava enough CDZs
    function safeCDzTransfer(address _to, uint256 _amount) public onlyOwner {
        uint256 cdzBal = cdz.balanceOf(address(this));
        if (_amount > cdzBal && cdzBal > 0) {
            cdz.safeTransfer(_to, cdzBal);
        } else {
            cdz.safeTransfer(_to, _amount);
        }
    }
}