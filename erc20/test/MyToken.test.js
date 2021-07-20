// test/Box.test.js
// Load dependencies
const { expect, assert } = require("chai");
const { expectRevert, time } = require("@openzeppelin/test-helpers");

const MyToken = artifacts.require("MyToken");
const MyTokenFactory = artifacts.require("MyTokenFactory");
const TokenVote1202 = artifacts.require("TokenVote1202");
const Crowdfund = artifacts.require("Crowdfund");
const Campaign = artifacts.require("Campaign");
const MAX_ALLOWABLE_GAS = 0.01;
// Load compiled artifacts
describe("token", () => {
  contract("MyToken", function (accounts) {
    let myTokenInstance;
    let contractAddress;
    before(async function () {
      accounts = await web3.eth.getAccounts();
      myTokenInstance = await MyToken.deployed();
      contractAddress = myTokenInstance.address;
      console.log(contractAddress);
    });

    // Test case
    it("should get balance of deployer account", async function () {
      assert.equal(
        (await myTokenInstance.balanceOf(accounts[0])).toNumber(),
        10000
      );
      assert.equal(
        (await myTokenInstance.balanceOf(accounts[1])).toNumber(),
        0
      );
    });

    it("should transfer amount specified", async function () {
      await myTokenInstance.transfer(accounts[1], 200, {
        from: accounts[0],
      });
      // console.log(result)
      assert.equal(
        (await myTokenInstance.balanceOf(accounts[0])).toNumber(),
        9800
      );
      assert.equal(
        (await myTokenInstance.balanceOf(accounts[1])).toNumber(),
        200
      );
    });

    it("should be deflationary", async function () {
      await myTokenInstance.transfer(accounts[2], 100, {
        from: accounts[1],
      });
      assert.equal(
        (await myTokenInstance.balanceOf(accounts[1])).toNumber(),
        100
      );
      assert.equal(
        (await myTokenInstance.balanceOf(accounts[2])).toNumber(),
        99
      );
    });

    it("should create vote when called", async function () {
      await myTokenInstance.createYesNoVote("Test ballot");
      assert.equal((await myTokenInstance.getNumberOfBallots()).toNumber(), 1);
      const ballotAddr = await myTokenInstance.ballots(0);

      const voteInstance = await TokenVote1202.at(ballotAddr);
      const issueDescription = await voteInstance.issueDescription();
      assert.equal(issueDescription, "Test ballot");

      await voteInstance.vote(1, { from: accounts[0] });
      let weightedVoteCountsOf1 = await voteInstance.weightedVoteCountsOf(1);
      assert.equal(weightedVoteCountsOf1, 9800);

      await voteInstance.vote(2, { from: accounts[0] });
      weightedVoteCountsOf1 = await voteInstance.weightedVoteCountsOf(1);
      assert.equal(weightedVoteCountsOf1, 0);

      // const gasEstimate =  await myTokenInstance.createYesNoVote.estimateGas();
      // const tx = await myTokenInstance.createYesNoVote('Test ballot 2',{
      //   gas: gasEstimate
      // });
      // console.log(gasEstimate);
      // assert(tx);
    });
  });
});

describe("TokenFactory", () => {
  contract("MyTokenFactory", function (accounts) {
    let myTokenFactoryInstance;
    let contractAddress;
    before(async function () {
      accounts = await web3.eth.getAccounts();
      myTokenFactoryInstance = await MyTokenFactory.deployed();
      contractAddress = myTokenFactoryInstance.address;
      console.log(contractAddress);
    });

    // Test case
    it("should create myToken", async function () {
      console.log(await myTokenFactoryInstance.createMyToken(accounts[0], 100));
    });
  });
});

describe("Crowdfund", () => {
  contract("Crowdfund", function (accounts) {
    let crowdfundInstance;
    let contractAddress;
    before(async function () {
      myTokenFactoryInstance = await MyTokenFactory.deployed();
      crowdfundInstance = await Crowdfund.deployed();
      contractAddress = crowdfundInstance.address;
      console.log(contractAddress);
    });

    // Test case
    it("should start a campaign", async function () {
      console.log(await crowdfundInstance.getNumberOfCampaigns());
      await crowdfundInstance.createCampaign(
        "Test campaign 1",
        web3.utils.toWei("100", "ether"),
        { from: accounts[3] }
      );
      assert.equal(
        (await crowdfundInstance.getNumberOfCampaigns()).toNumber(),
        1
      );
      const campaignAddr = await crowdfundInstance.campaigns(0);
      console.log("campaignAddr", campaignAddr);
      const campaignInstance = await Campaign.at(campaignAddr);
      const campaignName = await campaignInstance.campaignName();
      assert.equal(campaignName, "Test campaign 1");
    });

    describe("Campaign", () => {
      let campaignAddr;
      let campaignInstance;
      let campaignTokenAddr;
      let campaignTokenInstance;
      before(async function () {
        campaignAddr = await crowdfundInstance.campaigns(0);
        campaignInstance = await Campaign.at(campaignAddr);
        campaignTokenAddr = await campaignInstance.campaignToken();
        campaignTokenInstance = await MyToken.at(campaignTokenAddr);
      });

      it("should be able to pledge", async function () {
        // await crowdfundInstance.newCampaign('Test campaign 2', 10000, {from: accounts[0]} )
        await campaignInstance.pledge({
          from: accounts[1],
          value: web3.utils.toWei("22"),
        });

        await campaignInstance.pledge({
          from: accounts[2],
          value: web3.utils.toWei("30"),
        });

        const contractBalance = web3.utils.fromWei(
          await web3.eth.getBalance(campaignAddr)
        );
        assert.equal(contractBalance, 52);
        assert.equal(
          await campaignTokenInstance.balanceOf(accounts[1]),
          220000
        );
        assert.equal(
          await campaignTokenInstance.balanceOf(accounts[2]),
          300000
        );

        const contractTokenBalance = await campaignTokenInstance.balanceOf(
          campaignAddr
        );
        assert.equal(contractTokenBalance, 480000);
      });

      it("should be able to unpledge when still in funding phase", async function () {

        // await crowdfundInstance.newCampaign('Test campaign 2', 10000, {from: accounts[0]} )
        await campaignInstance.pledge({
          from: accounts[4],
          value: web3.utils.toWei("20"),
        });

        const contractBalance = web3.utils.fromWei(
          await web3.eth.getBalance(campaignAddr)
        );
        assert.equal(contractBalance, 72);
        assert.equal(
          await campaignTokenInstance.balanceOf(accounts[4]),
          200000
        );

        const contractTokenBalance = await campaignTokenInstance.balanceOf(
          campaignAddr
        );
        assert.equal(contractTokenBalance.toNumber(), 280000);

        await campaignTokenInstance.approve(
          campaignInstance.address,
          await campaignTokenInstance.balanceOf(accounts[4]),
          { from: accounts[4] }
        );

        await campaignInstance.unpledge({
          from: accounts[4],
        });

        assert.equal(
          web3.utils.fromWei(
            await campaignInstance.pendingWithdrawals(accounts[4])
          ),
          20
        );

        await campaignInstance.withdraw({
          from: accounts[4],
        });

        assert.equal(
          web3.utils.fromWei(await web3.eth.getBalance(campaignAddr)),
          52
        );

        assert.equal(
          (await campaignTokenInstance.balanceOf(accounts[4])).toNumber(),
          0
        );
        assert.equal(
          await campaignTokenInstance.balanceOf(campaignAddr),
          480000
        );

        assert.isTrue(
          web3.utils.fromWei(await web3.eth.getBalance(campaignAddr)) + 0.001 >
            100
        );
      });

      it("should be able to get extra pledged amount back", async function () {
    
        await campaignInstance.pledge({
          from: accounts[4],
          value: web3.utils.toWei('30', 'ether'),
        });
    
        assert.equal(
          (await campaignTokenInstance.balanceOf(accounts[4])).toNumber(),
          300000
        );

        await campaignInstance.pledge({
          from: accounts[5],
          value: web3.utils.toWei('20', 'ether'),
        });

        assert.equal(
          (await campaignTokenInstance.balanceOf(accounts[5])).toNumber(),
          180000
        );
       

        const contractBalance = web3.utils.fromWei(
          await web3.eth.getBalance(campaignAddr)
        );
        assert.equal(contractBalance, 102);
        const contractTokenBalance = await campaignTokenInstance.balanceOf(
          campaignAddr
        );
        assert.equal(contractTokenBalance.toNumber(), 0);

        assert.equal(
          web3.utils.fromWei(
            await campaignInstance.pendingWithdrawals(accounts[5])
          ),
          2
        );

        await campaignInstance.withdraw({
          from: accounts[5],
        });

        assert.equal(
          web3.utils.fromWei(await web3.eth.getBalance(campaignAddr)),
          100
        );

      });

      it("should not able to initiate withdrawal when still in funding phase", async function () {
        await expectRevert.unspecified(
          campaignInstance.initiateWithdrawProposal(
            web3.utils.toWei("10", "ether"),
            "withdraw test 1",
            {
              from: accounts[3],
            }
          )
        );
      });

      it("should be able close the campaign if goalAmt is not reached", async() => {
        await time.increase(time.duration.days(7));
        await campaignInstance.closeCampaign({from: accounts[3]});
      })

      it("should not be able to initiate withdrawal from funded proposal if not owner", async function () {
        await expectRevert.unspecified( campaignInstance.initiateWithdrawProposal(
          web3.utils.toWei("10", "ether"),
          "withdraw test 2",
          {
            from: accounts[4],
            gas: 3000000,
          }
        ));
      });

      it("should be able to initiate withdrawal from funded proposal", async function () {
        await campaignInstance.initiateWithdrawProposal(
          web3.utils.toWei("10", "ether"),
          "withdraw test 2",
          {
            from: accounts[3],
            gas: 3000000,
          }
        );

        const campaignTokenAddr = await campaignInstance.campaignToken();
        const campaignTokenInstance = await MyToken.at(campaignTokenAddr);
        const ballotAddr = await campaignTokenInstance.ballots(0);

        const ballotInstance = await TokenVote1202.at(ballotAddr);
        const issueDescription = await ballotInstance.issueDescription();
        const options = await ballotInstance.availableOptions();
        const status = await ballotInstance.getStatus();
        assert.equal(issueDescription, "withdraw test 2");
        assert.equal(status, true);

        assert.deepEqual(options, ["", "no", "yes"]);

        //TODO VERIFY WINNING VOTE WORKS,  FRONT END
      });

      it("should be able to vote on withdrawal proposal", async () => {
        const campaignTokenAddr = await campaignInstance.campaignToken();
        const campaignTokenInstance = await MyToken.at(campaignTokenAddr);
        const ballotAddr = await campaignTokenInstance.ballots(0);

        const ballotInstance = await TokenVote1202.at(ballotAddr);

        await ballotInstance.vote(2, {
          from: accounts[1],
        });

        assert.equal(await ballotInstance.weightedVoteCountsOf(2), 220000);

        assert.equal(await ballotInstance.winningOption(), 2);

        await ballotInstance.vote(1, {
          from: accounts[2],
        });

        assert.equal(await ballotInstance.weightedVoteCountsOf(1), 300000);

        assert.equal(await ballotInstance.winningOption(), 1);

        await expectRevert.unspecified(ballotInstance.setStatus(false));

        await ballotInstance.vote(2, {
          from: accounts[2],
        });

        assert.equal(await ballotInstance.weightedVoteCountsOf(2), 520000);
        assert.equal(await ballotInstance.winningOption(), 2);
      });

      it("should not be able to withdraw from unfinished ballot", async () => {
        const campaignTokenAddr = await campaignInstance.campaignToken();
        const campaignTokenInstance = await MyToken.at(campaignTokenAddr);

        await expectRevert.unspecified(campaignTokenInstance.closeBallot(0));

        await expectRevert.unspecified(
          campaignInstance.withdrawFromProposal(0, { from: accounts[3] })
        );
      });

      it("should be able to withdraw from finished ballot", async () => {
        const campaignTokenAddr = await campaignInstance.campaignToken();
        const campaignTokenInstance = await MyToken.at(campaignTokenAddr);

        // console.log((await time.latest()).toNumber())
        await time.increase(time.duration.days(1));
        // console.log((await time.latest()).toNumber())

        await expectRevert.unspecified(
          campaignTokenInstance.closeBallot(0, { from: accounts[3] })
        );

        assert.equal(
          web3.utils.fromWei(await campaignInstance.getProposalAmount(0)),
          10
        );
        const beforeBalance = web3.utils.fromWei(
          await web3.eth.getBalance(accounts[3])
        );

        await campaignInstance.withdrawFromProposal(0, { from: accounts[3] });

        const pendingWithdrawal = await campaignInstance.pendingWithdrawals(
          accounts[3]
        );

        assert.equal(web3.utils.fromWei(pendingWithdrawal), 10);

        await campaignInstance.withdraw({ from: accounts[3] });

        const afterBalance = web3.utils.fromWei(
          await web3.eth.getBalance(accounts[3])
        );

        console.log(beforeBalance, afterBalance)

        assert.isTrue(afterBalance - beforeBalance + MAX_ALLOWABLE_GAS >= 10);

        await time.advanceBlock();
        assert.equal(
          web3.utils.fromWei(await campaignInstance.getProposalAmount(0)),
          0
        );
      });
    });
  });
});
