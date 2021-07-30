import React from "react";
import Web3 from "web3";
import moment from "moment";
import Campaign from "../../erc20/build/contracts/Campaign.json";
import MyToken from "../../erc20/build/contracts/MyToken.json";
import ProposalComponent from "../components/proposals";

export default class CampaignComponent extends React.Component {
  web3 = new Web3(Web3.givenProvider || "http://localhost:9545");
  name;
  proposals;

  constructor(props) {
    super(props);
    this.proposals = React.createRef();
    this.state = {
      campaignContract: undefined,
      tokenContract: undefined,
      campaignName: "",
      goal: "0",
      funded: "0",
      owner: "",
      tokenAddress: "",
      tokenBalance: 0,
      pendingWithdrawal: "0",
      endDate: 0,
      accounts: [],
      isOpen: true,
      date: new Date(),
      canClose: false,
      pledgeAmount: 0,
    };
  }
  async componentDidMount() {
    await this.getContractInfo();
    this.timerID = setInterval(() => {
      this.setState({
        date: new Date(),
      });
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  getContractInfo = async () => {
    console.log(await this.web3.eth.net.getNetworkType());

    console.log(this.props.campaignAddr);
    const accounts = await this.web3.eth.getAccounts();
    const campaignContract = new this.web3.eth.Contract(
      Campaign.abi,
      this.props.campaignAddr,
      {
        from: accounts[0], // default from address
        gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
      }
    );

    const name = await campaignContract.methods.campaignName().call();
    const goal = await campaignContract.methods.goalAmt().call();
    console.log(goal);
    const funded = await this.web3.eth.getBalance(this.props.campaignAddr);
    const owner = await campaignContract.methods.owner().call();
    const tokenAddress = await campaignContract.methods.campaignToken().call();
    const endDate = await campaignContract.methods.endTime().call();
    const isOpen = await campaignContract.methods.isOpen().call();

    const pendingWithdrawal = await campaignContract.methods
      .pendingWithdrawals(accounts[0])
      .call();

    const tokenContract = new this.web3.eth.Contract(
      MyToken.abi,
      tokenAddress,
      {
        from: accounts[0], // default from address
        gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
      }
    );
    const tokenBalance = await tokenContract.methods
      .balanceOf(accounts[0])
      .call();

    const canClose =
      new Date() > new Date(endDate * 1000) &&
      accounts[0] == owner &&
      isOpen &&
      funded >= goal;
    console.log(canClose);

    this.setState({
      campaignName: name,
      tokenContract: tokenContract,
      goal: goal,
      owner: owner,
      tokenAddress: tokenAddress,
      pendingWithdrawal: pendingWithdrawal,
      tokenBalance: tokenBalance,
      funded: funded,
      campaignContract: campaignContract,
      endDate: endDate,
      accounts: accounts,
      isOpen: isOpen,
      canClose: canClose,
    });
  };

  render() {
    if (
      new Date(this.state.endDate * 1000) > new Date() ||
      this.state.funded > 0
    ) {
      return (
        <div className="p-4 lg:w-1/3">
          <div className="h-full bg-gray-100 bg-opacity-75 px-8 pt-16 pb-24 rounded-lg overflow-hidden text-center relative">
            <div className="sm:text-3xl text-2xl font-medium title-font mb-4 text-gray-900">
              {this.state.campaignName}
            </div>
            <div>
              Goal Amount: {this.web3.utils.fromWei(this.state.goal)} Ether
            </div>
            {this.state.isOpen ? (
              <div>
                Amount funded: {this.web3.utils.fromWei(this.state.funded)}{" "}
                Ether
              </div>
            ) : (
              <div>
                Amount left in contract:{" "}
                {this.web3.utils.fromWei(this.state.funded)} Ether
              </div>
            )}
            Status:{" "}
            {this.state.isOpen
              ? new Date() < new Date(this.state.endDate * 1000)
                ? "Open"
                : this.state.goal > this.state.funded
                ? "Campaign Failed"
                : "Awaiting Lock"
              : "Closed"}
            <div>
              <div>Campaing Address: {this.props.campaignAddr}</div>
              Ends on: {moment(new Date(this.state.endDate * 1000)).toString()}
            </div>
            {new Date() < new Date(this.state.endDate * 1000) ? (
              <div>
                {" "}
                Time left:{" "}
                {moment
                  .duration(
                    moment(new Date(this.state.endDate * 1000)).diff(
                      this.state.date
                    )
                  )
                  .humanize()}
              </div>
            ) : (
              <div></div>
            )}
            <div>Requester: {this.state.owner}</div>
            <div>Token Address: {this.state.tokenAddress}</div>
            <div>
              Pending Withdrawals:{" "}
              {this.web3.utils.fromWei(this.state.pendingWithdrawal)} Ether
            </div>
            <div>Token balance: {this.state.tokenBalance} Contract Tokens</div>
            {new Date() > new Date(this.state.endDate * 1000) ? (
              <div></div>
            ) : (
              <div>
                <form
                  className="lg:w-1/2 md:w-2/3 mx-auto p-2 w-1/2"
                  autoComplete="off"
                >
                  <label className="leading-7 text-sm text-gray-600">
                    Pledge Amount:
                    <input
                      type="number"
                      step="0.001"
                      name="amount"
                      onChange={(event) => this.handlePledgeAmountChange(event)}
                      className="w-full bg-gray-100 bg-opacity-50 rounded border border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
                    />
                    Ether
                  </label>
                </form>
                <button className="btn" onClick={() => this.pledge()}>
                  Pledge
                </button>
              </div>
            )}
            {this.state.isOpen &&
            this.state.tokenBalance > 0 &&
            (this.state.date < new Date(this.state.endDate * 1000)
              ? true
              : this.state.goal > this.state.funded) ? (
              <button className="btn" onClick={() => this.unpledge()}>
                Unpledge
              </button>
            ) : (
              <div></div>
            )}
            {this.web3.utils.fromWei(this.state.pendingWithdrawal) != 0 ? (
              <button className="btn" onClick={() => this.withdraw()}>
                Withdraw
              </button>
            ) : (
              <div></div>
            )}
            {this.state.canClose ? (
              <button className="btn" onClick={() => this.close()}>
                Lock
              </button>
            ) : (
              <div></div>
            )}
            {this.state.owner == this.state.accounts[0] &&
            !this.state.isOpen ? (
              <button
                className="btn"
                onClick={() => this.createWithdrawProposal()}
              >
                Create withdraw Proposal
              </button>
            ) : (
              <div></div>
            )}
            <ProposalComponent
              ref={this.proposals}
              owner={this.state.owner}
              campaignAddr={this.props.campaignAddr}
              updateCampaignInfo={this.getContractInfo}
            ></ProposalComponent>
            {this.props.children}
          </div>
        </div>
      );
    } else {
      return <div>{this.props.children}</div>;
    }
  }

  async pledge() {
    console.log(this.state.pledgeAmount);
    const accounts = await this.web3.eth.getAccounts();
    console.log(accounts[0]);
    const estimatedGas = await this.state.campaignContract.methods
      .pledge()
      .estimateGas({
        from: accounts[0],
        value: this.web3.utils.toWei(this.state.pledgeAmount.toString()),
      });
    const res = await this.state.campaignContract.methods.pledge().send({
      from: accounts[0],
      gas: estimatedGas,
      value: this.web3.utils.toWei(this.state.pledgeAmount.toString()),
    });
    console.log(res);
    await this.getContractInfo();
  }

  async close() {
    const accounts = await this.web3.eth.getAccounts();
    console.log(accounts[0]);
    const estimatedGas = await this.state.campaignContract.methods
      .closeCampaign()
      .estimateGas({ from: accounts[0] });
    const res = await this.state.campaignContract.methods.closeCampaign().send({
      from: accounts[0],
      gas: estimatedGas,
    });
    console.log(res);
    await this.getContractInfo();
  }

  async createWithdrawProposal() {
    const accounts = await this.web3.eth.getAccounts();
    console.log(accounts[0]);
    const estimatedGas = await this.state.campaignContract.methods
      .initiateWithdrawProposal(this.web3.utils.toWei("1"), "withdraw proposal")
      .estimateGas({ from: accounts[0] });
    const res = await this.state.campaignContract.methods
      .initiateWithdrawProposal(this.web3.utils.toWei("1"), "withdraw proposal")
      .send({
        from: accounts[0],
        gas: estimatedGas,
      });
    console.log(res);
    await this.proposals.current.getContractInfo();
  }

  async unpledge() {
    await this.approveReturnTokens();
    const accounts = await this.web3.eth.getAccounts();
    const estimatedGas = await this.state.campaignContract.methods
      .unpledge()
      .estimateGas({ from: accounts[0] });
    await this.state.campaignContract.methods.unpledge().send({
      from: accounts[0],
      gas: estimatedGas,
    });
    await this.getContractInfo();
  }

  async withdraw() {
    const accounts = await this.web3.eth.getAccounts();
    const estimatedGas = await this.state.campaignContract.methods
      .withdraw()
      .estimateGas({ from: accounts[0] });
    await this.state.campaignContract.methods.withdraw().send({
      from: accounts[0],
      gas: estimatedGas,
    });
    await this.getContractInfo();
  }

  async approveReturnTokens() {
    const accounts = await this.web3.eth.getAccounts();
    const balance = await this.state.tokenContract.methods
      .balanceOf(accounts[0])
      .call();
    console.log(this.props.campaignAddr);
    const estimatedGas = await this.state.tokenContract.methods
      .approve(this.props.campaignAddr, balance)
      .estimateGas({ from: accounts[0] });
    await this.state.tokenContract.methods
      .approve(this.props.campaignAddr, balance)
      .send({
        from: accounts[0],
        gas: estimatedGas,
      });
    console.log(
      await this.state.tokenContract.methods.balanceOf(accounts[0]).call()
    );
    await this.getContractInfo();
  }

  handlePledgeAmountChange(event) {
    this.setState({ pledgeAmount: event.target.value });
  }
}
