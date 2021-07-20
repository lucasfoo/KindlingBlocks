// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;
import "./TokenVote1202.sol";

contract MyTokenVote {
    address owner;
    TokenVote1202[] public ballots;
    mapping(uint => uint) public ballotExpiry;
    string[] yesNoOptions = ['no', 'yes'];

    function createYesNoVote(string memory _ballotName) public returns(uint){
        owner = msg.sender;
        TokenVote1202 ballot = new TokenVote1202(yesNoOptions, _ballotName);
        ballots.push(ballot);
        uint ballotIndex =  ballots.length - 1;
        ballotExpiry[ballotIndex] =  block.timestamp + 300 seconds;
        return ballotIndex;
    }

    function getNumberOfBallots() public view returns (uint) {
        return ballots.length;
    }

    function closeBallot(uint index) public{
        require(msg.sender == owner, 'not owner');
        require(block.timestamp >= ballotExpiry[index], 'not expired');
        ballots[index].setStatus(false);
    }
}
