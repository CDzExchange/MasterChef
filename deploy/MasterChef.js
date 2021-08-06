module.exports = async function ({ ethers, getNamedAccounts, deployments }) {
    const { deploy } = deployments
    const { deployer, dev } = await getNamedAccounts()

    const cdzToken = await ethers.getContract("CDzToken", deployer)
    const perBlock = "12000000000000000000"
    const startBlock = "1"
    const maxMint = "12000000000000000000000000"

    const { address } = await deploy("MasterChef", {
        from: deployer,
        log: true,
        args: [cdzToken.address, perBlock, startBlock, maxMint],
        deterministicDeployment: false
    })

    if (await cdzToken.owner() !== address) {
        // for test
        await (await cdzToken["mint(address,uint256)"](deployer, "10000000000000000000000000")).wait()
        await (await cdzToken.transferOwnership(address)).wait()
        console.log("Transfer CDzToken owner to MasterChef:", address)
    }

    const chef = await ethers.getContract("MasterChef")
    await (await chef.setFeeAddr(dev)).wait()

    module.exports.tags = ["MasterChef"]
    module.exports.dependencies = ["CDzToken"]
}