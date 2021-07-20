// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;
import "./MyToken.sol";
import "./MyTokenVote.sol";
import "./TokenVote1202.sol";

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Crowdfund {
    Campaign[] public campaigns;
    MyTokenFactory myTokenFactory;

    constructor(address myTokenFactoryAddr) {
        myTokenFactory = MyTokenFactory(myTokenFactoryAddr);
    }

    function createCampaign(string memory _name, uint256 _goalAmt)
        public
        returns (address, uint256)
    {
        Campaign campaign = new Campaign(
            _name,
            _goalAmt,
            msg.sender,
            myTokenFactory
        );
        campaigns.push(campaign);
        return (address(campaign), campaigns.length);
    }

    function getNumberOfCampaigns() public view returns (uint256) {
        return campaigns.length;
    }
}

contract Campaign {
    using SafeMath for uint256;
    uint256 public goalAmt;
    address public owner;
    string public campaignName;
    uint256 public endTime;
    MyTokenFactory myTokenFactory;
    MyToken public campaignToken;
    bool public isOpen;

    mapping(uint256 => uint256) withdrawBallotAmount;
    mapping(address => uint256) public pendingWithdrawals; /* in wei */

    constructor(
        string memory _name,
        uint256 _goalAmt,
        address proposer,
        MyTokenFactory myTokenFactoryAddr
    ) payable {
        myTokenFactory = MyTokenFactory(myTokenFactoryAddr);
        endTime = block.timestamp + 300 seconds;
        campaignName = _name;
        owner = proposer;
        goalAmt = _goalAmt;
        campaignToken = myTokenFactory.createMyToken(address(this), 1000000);
        isOpen = true;
    }

    function pledge() public payable {
        require(block.timestamp < endTime, "campaign closed");
        uint256 refundAmt = 0;
        if (address(this).balance > goalAmt) {
            refundAmt = address(this).balance - goalAmt;
        }
        uint256 pledgeAmt = msg.value - refundAmt;
        uint256 tokensToSend = pledgeAmt.mul(campaignToken.totalSupply()).div(
            goalAmt
        );

        campaignToken.transfer(msg.sender, tokensToSend);
        pendingWithdrawals[msg.sender] = refundAmt;
    }

    function withdraw() public {
        uint256 amount = pendingWithdrawals[msg.sender];
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function unpledge() public {
        require(isOpen);
        if (block.timestamp > endTime) {
            require(address(this).balance < goalAmt, 'campaign closed');
        }
        uint256 returnedTokens = campaignToken.balanceOf(msg.sender);
        campaignToken.transferFrom(msg.sender, address(this), returnedTokens);
        uint256 refundAmt = returnedTokens.mul(goalAmt).div(
            campaignToken.totalSupply()
        );
        pendingWithdrawals[msg.sender] = refundAmt;
    }

    function initiateWithdrawProposal(uint256 amt, string memory message)
        public
        onlyOwner
    {
        require(isOpen == false);
        require(amt <= address(this).balance);
        uint256 ballotIndex = campaignToken.createYesNoVote(message);
        withdrawBallotAmount[ballotIndex] = amt;
    }

    function withdrawFromProposal(uint256 ballotIndex) public onlyOwner {
        // TokenVote1202 ballot = campaignToken.ballots(ballotIndex);
        // require(ballot.winningOption() == 2);
        campaignToken.closeBallot(ballotIndex);
        require(withdrawBallotAmount[ballotIndex] > 0);
        uint256 availableToWithdraw = withdrawBallotAmount[ballotIndex];
        withdrawBallotAmount[ballotIndex] = 0;
        pendingWithdrawals[owner] = availableToWithdraw;
    }

    function closeCampaign() public onlyOwner {
        require(block.timestamp >= endTime, "not expired");
        require(address(this).balance >= goalAmt, "not goal");
        isOpen = false;
    }

    function getProposalAmount(uint256 ballotIndex)
        public
        view
        returns (uint256)
    {
        return withdrawBallotAmount[ballotIndex];
    }

    modifier requireSucessfulCampaign() {
        require(block.timestamp >= endTime && !isOpen);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
}
