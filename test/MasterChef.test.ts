import {ethers} from "hardhat";
import {expect} from "chai";
import {advanceBlock, advanceBlockAdd, advanceBlockTo} from "./utilities";
import exp = require("constants");

describe ("MasterChef", function () {
    before(async function () {
        this.PerBlock = 100
        this.StartBlock = 2000
        this.MaxMint = 100000

        this.signers = await ethers.getSigners()
        this.alice = this.signers[0]
        this.bob = this.signers[1]
        this.carol = this.signers[2]
        this.jerry = this.signers[3]
        this.minter = this.signers[4]
        this.fee = this.signers[5]

        this.CDzToken = await ethers.getContractFactory("CDzToken")
        this.MasterChef = await ethers.getContractFactory("MasterChef")
        this.BEP20Mock = await ethers.getContractFactory("BEP20Mock", this.minter)
    })

    beforeEach(async function() {
        // deploy cdz token
        this.cdz = await this.CDzToken.deploy()
        await this.cdz.deployed()

        // mint cdz to alice and bob
        await this.cdz['mint(address,uint256)'](this.alice.address, 1000)
        await this.cdz['mint(address,uint256)'](this.bob.address, 1000)
        // deploy master chef
        this.chef = await this.MasterChef.deploy(this.cdz.address, this.PerBlock, this.StartBlock, 10000)
        await this.chef.deployed()

        // set master chef
        await this.cdz.transferOwnership(this.chef.address)
    })

    it("Should set correct state variables", async function () {
        const cdz = await this.chef.cdz()
        const owner = await this.cdz.owner()
        const perBlock = await this.chef.cdzPerBlock()
        const startBlock = await this.chef.startBlock()
        const maxMint = await this.chef.cdzMaxMint()

        expect(cdz).to.equal(this.cdz.address)
        expect(owner).to.equal(this.chef.address)
        expect(perBlock).to.equal(this.PerBlock)
        expect(startBlock).to.equal(this.StartBlock)
        expect(maxMint).to.equal(10000)
    })

    it("Should update fee addr ok", async function() {
        await this.chef.setFeeAddr(this.fee.address)
        const feeAddr = await this.chef.feeAddr()
        expect(feeAddr).to.equal(this.fee.address)
    })

    it("Should update max mint", async function () {
        await this.chef.setMaxMint(this.MaxMint)
        const maxMint = await this.chef.cdzMaxMint()
        expect(maxMint).to.equal(this.MaxMint)
    })

    it("Should update fee block limit", async function () {
        await this.chef.setFeeBlockLimit(28800)
        const limit = await this.chef.feeBlockLimit()
        expect(limit).to.equal(28800)
    })


    it("Should set pool ok", async function () {
        await this.chef.set(0, 2000, true)
        const cdzPool = await this.chef.poolInfo(0)
        const totalAlloc = await this.chef.totalAllocPoint()
        expect(cdzPool["allocPoint"]).to.equal(2000)
        expect(totalAlloc).to.equal(2000)
    })

    describe("CDzToken pool", function () {
        beforeEach(async function () {
            await this.cdz.connect(this.alice).approve(this.chef.address, 10000)
            await this.cdz.connect(this.bob).approve(this.chef.address, 10000)
        })
        it("Should set correct CDzToken pool variables", async function () {
            const poolLength = await this.chef.poolLength()
            const poolInfo = await this.chef.poolInfo(0)
            const lpToken = poolInfo["lpToken"]
            const allocPoint = poolInfo["allocPoint"]
            const lastRewardBlock = poolInfo["lastRewardBlock"]
            const accCDZPerShare = poolInfo["accCDZPerShare"]
            expect(poolLength).to.equal(1)
            expect(lpToken).to.equal(this.cdz.address)
            expect(allocPoint).to.equal(1000)
            expect(lastRewardBlock).to.equal(2000)
            expect(accCDZPerShare).to.equal(0)
        })

        it("Should deposit and calculate pending ok", async function () {
            await this.chef.connect(this.alice).deposit(0, 300)
            await this.chef.connect(this.bob).deposit(0, 200)
            await advanceBlockTo(2010)
            const alicePending = await this.chef.pendingCDZ(0, this.alice.address)
            const bobPending = await this.chef.pendingCDZ(0, this.bob.address)
            // ((1010 - 1000) * 100 * 300) / 500 = 600
            expect(alicePending).to.equal(600)
            // ((1010 - 1000) * 100 * 200) / 500 = 600
            expect(bobPending).to.equal(400)
        })

        it("Should withdraw ok", async function () {
            await this.chef.connect(this.alice).deposit(0, 400)
            await this.chef.connect(this.alice).withdraw(0, 200)
            const aliceBal = await this.cdz.balanceOf(this.alice.address)
            // 800 + 100 = 900
            expect(aliceBal).to.equal(900)
        })

        it("Should harvest ok", async function () {
            await this.chef.connect(this.alice).deposit(0, 500)
            await this.chef.connect(this.alice).withdraw(0,0)
            const aliceBal = await this.cdz.balanceOf(this.alice.address)

            expect(aliceBal).to.equal(600)
        })

        it ("Should withdraw with fee ok", async function () {
            await this.chef.setFeeAddr(this.fee.address)
            await this.chef.connect(this.alice).deposit(0, 500)
            await this.chef.connect(this.alice).withdraw(0, 100)
            const aliceBal = await this.cdz.balanceOf(this.alice.address)
            expect(aliceBal).to.equal(698)
        })

        it ("Should harvest with fee ok", async function () {
            await this.chef.setFeeAddr(this.fee.address)
            await this.chef.connect(this.alice).deposit(0, 500)
            await this.chef.connect(this.alice).withdraw(0, 0)
            const aliceBal = await this.cdz.balanceOf(this.alice.address)
            expect(aliceBal).to.equal(598)
        })

        it ("Should emergencyWithdraw ok", async function () {
            await this.chef.connect(this.alice).deposit(0, 400)
            await this.chef.connect(this.alice).emergencyWithdraw(0)
            const bal = await this.cdz.balanceOf(this.alice.address)
            expect(bal).to.equal(1000)
        })

    })
    
    describe("LpToken pool", function () {
        beforeEach(async function (){
            this.lpToken = await this.BEP20Mock.deploy("LpToken1", "LPT1", 100000000)
            const result = await this.lpToken.deployed()
            await this.lpToken.transfer(this.carol.address, 1000)
            await this.lpToken.transfer(this.jerry.address, 1000)
            await this.lpToken.connect(this.carol).approve(this.chef.address, 10000)
            await this.lpToken.connect(this.jerry,).approve(this.chef.address, 10000)
            await this.chef.connect(this.alice).add(1000, this.lpToken.address, true)
        })
        
        it("Should add pool ok", async function () {
            let lastBlock = await ethers.provider.getBlockNumber()
            const poolLength = await this.chef.poolLength()
            const poolInfo = await this.chef.poolInfo(1)
            const lpToken = poolInfo["lpToken"]
            const allocPoint = poolInfo["allocPoint"]
            const lastRewardBlock = poolInfo["lastRewardBlock"]
            const accCDZPerShare = poolInfo["accCDZPerShare"]
            const totalAllocPoint = await this.chef.totalAllocPoint()
            expect(poolLength).to.equal(2)
            expect(lpToken).to.equal(this.lpToken.address)
            expect(allocPoint).to.equal(1000)
            expect(lastRewardBlock).to.equal(lastBlock)
            expect(accCDZPerShare).to.equal(0)
            expect(totalAllocPoint).to.equal(2000)
        })

        it("Should deposit ok", async function () {
            await this.chef.connect(this.carol).deposit(1, 300)
            await this.chef.connect(this.jerry).deposit(1, 200)
            await advanceBlockAdd(10)
            const carolPending = await this.chef.pendingCDZ(1, this.carol.address)
            const jerryPending = await this.chef.pendingCDZ(1, this.jerry.address)
            // (1 * 50) + ((10 * 50 * 300) / 500) - 1 = 349
            expect(carolPending).to.equal(349)
            // (10 * 50 * 200) / 500 = 200
            expect(jerryPending).to.equal(200)
            await expect(this.chef.connect(this.carol).deposit(1, 0)).to.be.revertedWith("deposit: amount must greater than zero")
            await this.chef.connect(this.carol).deposit(1, 100)
            const carolCDZPending = await this.cdz.balanceOf(this.carol.address)
            expect(carolCDZPending).to.equal(409)
        })

        it("Should withdraw ok", async function () {
            await this.chef.connect(this.carol).deposit(1, 400)
            await this.chef.connect(this.carol).withdraw(1, 200)
            const lpBal = await this.lpToken.balanceOf(this.carol.address)
            const cdzBal = await this.cdz.balanceOf(this.carol.address)
            expect(lpBal).to.equal(800)
            expect(cdzBal).to.equal(50)
        })

        it("Should withdraw with fee ok", async function(){
            await this.chef.setFeeAddr(this.fee.address)
            await this.chef.connect(this.carol).deposit(1, 400)
            await this.chef.connect(this.carol).withdraw(1, 200)
            const lpBal = await this.lpToken.balanceOf(this.carol.address)
            const cdzBal = await this.cdz.balanceOf(this.carol.address)
            expect(lpBal).to.equal(800)
            expect(cdzBal).to.equal(49)
        })

        it("Shoud harvest ok", async function () {
            await this.chef.connect(this.carol).deposit(1, 400)
            await this.chef.connect(this.carol).withdraw(1, 0)
            const lpBal = await this.lpToken.balanceOf(this.carol.address)
            const cdzBal = await this.cdz.balanceOf(this.carol.address)
            expect(lpBal).to.equal(600)
            expect(cdzBal).to.equal(50)
        })

        it("Shoud harvest with fee ok", async function () {
            await this.chef.setFeeAddr(this.fee.address)
            await this.chef.connect(this.carol).deposit(1, 400)
            await this.chef.connect(this.carol).withdraw(1, 0)
            const lpBal = await this.lpToken.balanceOf(this.carol.address)
            const cdzBal = await this.cdz.balanceOf(this.carol.address)
            expect(lpBal).to.equal(600)
            expect(cdzBal).to.equal(49)
        })

        it ("Should emergencyWithdraw ok", async function () {
            await this.chef.connect(this.carol).deposit(1, 400)
            await this.chef.connect(this.carol).emergencyWithdraw(1)
            const lpBal = await this.lpToken.balanceOf(this.carol.address)
            const cdzBal = await this.cdz.balanceOf(this.carol.address)
            expect(lpBal).to.equal(1000)
            expect(cdzBal).to.equal(0)
        })
    })
})
