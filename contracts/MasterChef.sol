// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IBEP20.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SignedSafeMath.sol";
import "./libraries/SafeBEP20.sol";
import "./CDzToken.sol";
import "./CDzBar.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

// import "@nomiclabs/buidler/console.sol";
interface IMigratorChef {
    // Perform LP token migration from legacy CDzExchange to NewCDzExchange
    // Take the current LP token address and return the new LP token address.
    // Migrator should have full access to the caller's LP token.
    // Return the new LP token address.
    //
    // XXX Migrator must have allowance access to CDzExchange LP tokens.
    // NewCDzExchange must mint EXACTLY the same amount of NewCDzExchange LP tokens or
    // else something bad will happen. Traditional CDzExchange does not
    // do that so be careful!
    function migrate(IBEP20 token) external returns (IBEP20);
}

// MasterChef is the master of CDZ. He can make CDZ and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once CDZ is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
contract MasterChef is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using SafeBEP20 for IBEP20;

    // @notice Info of each user.
    // `amount` LP Token amount the user has provided .
    // `rewardDebt` The amount of CDZ entitled to the user.
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastDepositBlock;
    }

    // @notice Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. CDZs to distribute per block.
        uint256 lastRewardBlock;  // Last block number that CDZs distribution occurs.
        uint256 accCDZPerShare; // Accumulated CDZs per share, times 1e12. See below.
    }

    // The CDZ TOKEN!
    CDzToken public cdz;

    // The reward bar
    CDzBar public bar;

    // @notice CDZ tokens created per block.
    uint256 public cdzPerBlock;
    // @notice Bonus muliplier for early cdz makers.
    uint256 public BONUS_MULTIPLIER = 1;
    // @notice The migrator contract. It has a lot of power. Can only be set through governance (owner).
    IMigratorChef public migrator;

    // @notice Info of each pool.
    PoolInfo[] public poolInfo;
    // @dev Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // @notice Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // @notice The block number when CDZ mining starts.
    uint256 public startBlock;

    // @notice The total of CDZ Token by MasterChef minted
    uint256 public cdzTotalMinted;

    // @notice The max limit of CDZ Token MasterChef mint
    uint256 public cdzMaxMint;

    // @notice the withdraw fee address
    address public feeAddr;

    // @notice fee block limit, if
    uint256 public feeBlockLimit;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event LogPoolAddition(uint256 indexed pid, uint256 allocPoint, BEP20 lpToken);
    event LogSetPool(uint256 indexed pid, uint256 allocPoint, bool overwrite);
    event LogUpdatePool(uint256 indexed pid, uint256 lastRewardBlock, uint256 lpSupply, uint256 accCDZPerShare);

    constructor(
        CDzToken _cdz,
        uint256 _cdzPerBlock,
        uint256 _startBlock,
        uint256 _cdzMaxMint
    ) {
        cdz = _cdz;
        cdzPerBlock = _cdzPerBlock;
        startBlock = _startBlock;
        cdzMaxMint = _cdzMaxMint;
        feeBlockLimit = 86500;

        // Create CDzBar contract
        bar = new CDzBar(_cdz);

        // CDzToken staking pool
        poolInfo.push(PoolInfo({
            lpToken: _cdz,
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accCDZPerShare: 0
        }));

        totalAllocPoint = 1000;
    }

    function updateMultiplier(uint256 multiplierNumber) public onlyOwner {
        BONUS_MULTIPLIER = multiplierNumber;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(uint256 _allocPoint, IBEP20 _lpToken, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accCDZPerShare: 0
        }));
    }

    // Update the given pool's CDZ allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // Set the migrator contract. Can only be called by the owner.
    function setMigrator(IMigratorChef _migrator) public onlyOwner {
        migrator = _migrator;
    }

    // Migrate lp token to another lp contract. Can be called by anyone. We trust that migrator contract is good.
    function migrate(uint256 _pid) public {
        require(address(migrator) != address(0), "migrate: no migrator");
        PoolInfo storage pool = poolInfo[_pid];
        IBEP20 lpToken = pool.lpToken;
        uint256 bal = lpToken.balanceOf(address(this));
        lpToken.safeApprove(address(migrator), bal);
        IBEP20 newLpToken = migrator.migrate(lpToken);
        require(bal == newLpToken.balanceOf(address(this)), "migrate: bad");
        pool.lpToken = newLpToken;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        return _to.sub(_from).mul(BONUS_MULTIPLIER);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // @notice Update reward variables of the given pool to be up-to-date.
    // @param `_pid` The index of the pool.
    // @return `pool` Returns the pool that was updated
    function updatePool(uint256 _pid) public returns (PoolInfo memory pool){
        pool = poolInfo[_pid];
        if (block.number > pool.lastRewardBlock) {
            uint256 lpSupply = pool.lpToken.balanceOf(address(this));
            if (lpSupply > 0) {
                uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
                uint256 cdzReward = multiplier.mul(cdzPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
                cdzReward = safeCDZMint(address(bar), cdzReward);
                pool.accCDZPerShare = pool.accCDZPerShare.add(cdzReward.mul(1e12).div(lpSupply));
            }
            pool.lastRewardBlock = block.number;
            poolInfo[_pid] = pool;
            emit LogUpdatePool(_pid, pool.lastRewardBlock, lpSupply, pool.accCDZPerShare);
        }
    }


    // View function to see pending CDZs on frontend.
    function pendingCDZ(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accCDZPerShare = pool.accCDZPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 cdzReward = multiplier.mul(cdzPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accCDZPerShare = accCDZPerShare.add(cdzReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accCDZPerShare).div(1e12).sub(user.rewardDebt);
    }

    // @notice Deposit LP tokens to MasterChef for CDZ allocation.
    // @param `_pid` The index of the pool
    // @param `_amount` LP Token amount to deposit
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        require(_amount > 0, "deposit: amount must greater than zero");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accCDZPerShare).div(1e12).sub(user.rewardDebt);
            if(pending > 0) {
                safeCDZTransfer(msg.sender, pending);
            }
        }
        pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accCDZPerShare).div(1e12);
        user.lastDepositBlock = block.number;
        emit Deposit(msg.sender, _pid, _amount);
    }

    // @notice Withdraw LP tokens from MasterChef.
    // @param `_pid` The index of pool.
    // @param `_amount` LP Token amount to withdraw
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accCDZPerShare).div(1e12).sub(user.rewardDebt);
        if (block.number.sub(user.lastDepositBlock) <= feeBlockLimit && feeAddr != address(0))  {
            uint256 fee = pending.mul(2).div(100);
            pending = pending.sub(fee);
            if (fee > 0) {
                safeCDZTransfer(feeAddr, fee);
            }
        }
        if(pending > 0) {
            safeCDZTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accCDZPerShare).div(1e12);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    // @param `_pid` The index of pool.
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // @notice Set the max mint only by owner
    // @param `_cdzMaxMint` The max of CDZ token mint by MasterChef
    function setMaxMint(uint256 _cdzMaxMint) public onlyOwner {
        require(_cdzMaxMint > cdzTotalMinted, "setMaxMint: the new max mint must be greater than current minted");
        cdzMaxMint = _cdzMaxMint;
    }

    // @notice Set the withdraw fee address
    function setFeeAddr(address _addr) public onlyOwner {
        feeAddr = _addr;
    }

    // @notice Set the withdraw fee block limit
    function setFeeBlockLimit(uint256 _limit) public onlyOwner {
        feeBlockLimit = _limit;
    }

    /**
     * @dev Transfers ownership of the CDzToken contract to a new account (`newOwner`).
     * Can only be called by the MasterChef owner.
     */
    function transferCDZOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Ownable: new owner is the zero address");
        cdz.transferOwnership(_newOwner);
    }

    // @dev Safe cdz transfer function, just in case if rounding error causes pool to not have enough CDZs.
    function safeCDZTransfer(address _to, uint256 _amount) internal {
        bar.safeCDzTransfer(_to, _amount);
    }

    // @dev Safe cdz mint
    function safeCDZMint(address _to, uint256 _amount) internal returns(uint256 minted) {
        uint256 allow = cdzMaxMint.sub(cdzTotalMinted);
        if (_amount > allow) {
            minted = allow;
        } else {
            minted = _amount;
        }
        if (minted > 0) {
            cdzTotalMinted = cdzTotalMinted.add(minted);
            cdz.mint(_to, minted);
        }
    }
}
