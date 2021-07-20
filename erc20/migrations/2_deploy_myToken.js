const MyToken = artifacts.require("MyToken");
const MyTokenFactory = artifacts.require("MyTokenFactory");
const Crowdfund = artifacts.require("Crowdfund");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(MyToken, accounts[0], 10000);
  deployer.deploy(MyTokenFactory).then(() => {
    return deployer.deploy(Crowdfund, MyTokenFactory.address);
  });

};
