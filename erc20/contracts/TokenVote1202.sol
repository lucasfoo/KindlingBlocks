// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;
import "./MyToken.sol";

contract TokenVote1202 {
    string internal issue;
    string[] internal options;
    bool internal isOpen;
    address Owner;
    mapping(uint256 => uint256) public weightedVoteCounts;
    mapping(address => uint256) public ballots;
    mapping(address => bool) public voted;
    MyToken token;

    constructor(string[] memory _options, string memory _issue) {
        Owner = msg.sender;
        require(_options.length >= 2);
        options.push();
        for (uint256 i = 0; i < _options.length; i++) {
            options.push(_options[i]);
        }
        token = MyToken(address(msg.sender));
        isOpen = true;
        issue = _issue;
    }

    function vote(uint256 option) public returns (bool success) {
        require(isOpen);
        // TODO check if option is valid
        require(option != 0);
        uint256 weight = token.balanceOf(msg.sender);
        uint256 previousVote = ballots[msg.sender];
        if (previousVote == 0) {
            weightedVoteCounts[option] += weight; // initial value is zero
        } else {
            weightedVoteCounts[previousVote] -= weight;
            weightedVoteCounts[option] += weight; // initial value is zero
        }
        ballots[msg.sender] = option;
        emit OnVote(msg.sender, option);
        return true;
    }

    function setStatus(bool isOpen_) public returns (bool success) {
        // Should have a sense of ownership. Only Owner should be able to set the status
        require(msg.sender == Owner);
        isOpen = isOpen_;
        emit OnStatusChange(isOpen_);
        return true;
    }

    function ballotOf(address addr) public view returns (uint256 option) {
        return ballots[addr];
    }

    function weightOf(address addr) public view returns (uint256 weight) {
        return token.balanceOf(addr);
    }

    function getStatus() public view returns (bool isOpen_) {
        return isOpen;
    }

    function weightedVoteCountsOf(uint256 option)
        public
        view
        returns (uint256 count)
    {
        return weightedVoteCounts[option];
    }

    function winningOption() public view returns (uint256 option) {
        uint256 ci = 0;
        for (uint256 i = 0; i < options.length; i++) {
            if (weightedVoteCounts[i] > weightedVoteCounts[ci]) {
                ci = i;
            } // else keep it there
        }
        return ci;
    }

    function issueDescription() public view returns (string memory desc) {
        return issue;
    }

    function availableOptions() public view returns (string[] memory options_) {
        return options;
    }

    event OnVote(address indexed _from, uint256 _value);
    event OnStatusChange(bool newIsOpen);
    event DebugMsg(string msg);
}
