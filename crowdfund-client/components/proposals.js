import React from "react";
import Web3 from "web3";
import Campaign from "../../erc20/build/contracts/Campaign.json";
import MyToken from "../../erc20/build/contracts/MyToken.json";
import TokenVote from "../../erc20/build/contracts/TokenVote1202.json";

export default class ProposalComponent extends React.Component {
  web3 = new Web3(Web3.givenProvider || "http://localhost:9545");

  constructor(props) {
    super(props);
    this.state = {
      campaignContract: undefined,
      tokenContract: undefined,
      accounts: [],
      proposals: [],
    };
  }

  async componentDidMount() {
    this.getContractInfo();
  }

  async getContractInfo() {
    const accounts = await this.web3.eth.getAccounts();
    const campaignContract = new this.web3.eth.Contract(
      Campaign.abi,
      this.props.campaignAddr,
      {
        from: accounts[0], // default from address
        gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
      }
    );
    const tokenAddress = await campaignContract.methods.campaignToken().call();

    const tokenContract = new this.web3.eth.Contract(
      MyToken.abi,
      tokenAddress,
      {
        from: accounts[0], // default from address
        gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
      }
    );

    const noOfProposals = await tokenContract.methods
      .getNumberOfBallots()
      .call();

    console.log("proposals", noOfProposals);

    const withdrawalProposals = [];

    for (let i = 0; i < noOfProposals; i++) {
      const tokenVoteAddr = await tokenContract.methods.ballots(i).call();
      const tokenVoteContract = new this.web3.eth.Contract(
        TokenVote.abi,
        tokenVoteAddr,
        {
          from: accounts[0], // default from address
          gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
        }
      );

      const issue = await tokenVoteContract.methods.issueDescription().call();
      const options = await tokenVoteContract.methods.availableOptions().call();

      if ((issue = "withdrawal proposal")) {
        const isOpen = await tokenVoteContract.methods.getStatus().call();
        console.log("isopen", isOpen);
        const proposalAmt = await campaignContract.methods
          .getProposalAmount(i)
          .call();
        const noVotes = await tokenVoteContract.methods
          .weightedVoteCountsOf(1)
          .call();
        const yesVotes = await tokenVoteContract.methods
          .weightedVoteCountsOf(2)
          .call();
        const endTime = await tokenContract.methods.ballotExpiry(i).call();
        const accountVoted = await tokenVoteContract.methods
          .ballotOf(accounts[0])
          .call();

        const totalVotes =
          Number(yesVotes) + Number(noVotes) > 0
            ? Number(yesVotes) + Number(noVotes)
            : 1;
        console.log(noVotes, yesVotes, totalVotes, accountVoted);

        if (proposalAmt > 0) {
          withdrawalProposals.push({
            ballotIndex: i,
            proposalAmt: proposalAmt,
            noVotes: noVotes,
            yesVotes: yesVotes,
            totalVotes: totalVotes,
            tokenVoteContract: tokenVoteContract,
            isOpen: isOpen,
            accountVoted: accountVoted,
            endTime: endTime,
          });
        }
      }
      console.log(issue);
      console.log(options);
    }

    this.setState({
      campaignContract: campaignContract,
      tokenContract: tokenContract,
      accounts: accounts,
      proposals: withdrawalProposals,
    });
  }

  render() {
    return (
      <div>
        {this.state.proposals.map((proposal, i) => {
          return (
            <div key={i}>
              Withdrawl Proposal:{" "}
              {this.web3.utils.fromWei(proposal.proposalAmt)} Ether
              <div>
                Status: {proposal.isOpen ? "Open" : "Closed"} Ends{" "}
                {new Date(proposal.endTime * 1000).toTimeString()}
              </div>
              <button
                className="btn"
                onClick={() => {
                  this.vote(2, proposal.tokenVoteContract);
                }}
              >
                {proposal.accountVoted == 2 ? "You voted" : ""} Yes{" "}
                {(proposal.yesVotes / proposal.totalVotes) * 100} %
              </button>
              <button
                className="btn"
                onClick={() => {
                  this.vote(1, proposal.tokenVoteContract);
                }}
              >
                {proposal.accountVoted == 1 ? "You voted" : ""} No{" "}
                {(proposal.noVotes / proposal.totalVotes) * 100} %
              </button>
              {this.props.owner == this.state.accounts[0] &&
              new Date() > new Date(proposal.endTime * 1000) ? (
                <button
                  className="btn"
                  onClick={() => {
                    this.withdraw(proposal.ballotIndex);
                  }}
                >
                  Withdraw
                </button>
              ) : (
                <div></div>
              )}
            </div>
          );
        })}
        {this.props.children}
      </div>
    );
  }

  async withdraw(index) {
    const accounts = await this.web3.eth.getAccounts();
    const estimatedGas = await this.state.campaignContract.methods
      .withdrawFromProposal(index)
      .estimateGas({ from: accounts[0] });
    await this.state.campaignContract.methods.withdrawFromProposal(index).send({
      from: accounts[0],
      gas: estimatedGas,
    });
    await this.getContractInfo();
    await this.props.updateCampaignInfo();
  }

  async vote(index, tokenVoteContract) {
    const accounts = await this.web3.eth.getAccounts();
    const estimatedGas = await tokenVoteContract.methods
      .vote(index)
      .estimateGas({ from: accounts[0] });
    await tokenVoteContract.methods.vote(index).send({
      from: accounts[0],
      gas: estimatedGas,
    });
    await this.props.updateCampaignInfo();
    await this.getContractInfo();
  }
}
