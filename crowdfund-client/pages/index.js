import Head from "next/head";
import Layout from "../components/layout";
import CampaignComponent from "../components/campaign";
import Crowdfund from "../../erc20/build/contracts/Crowdfund.json";
import { advanceBlockAndSetTime } from "ganache-time-traveler";

import "tailwindcss/tailwind.css";
import Web3 from "web3";
import React from "react";

export default class Home extends React.Component {
  web3;
  crowdfundContract;
  accounts;
  TokenFactoryContract;
  timeMachine = require("ganache-time-traveler");

  constructor(props) {
    super(props);
    this.web3 = new Web3(Web3.givenProvider || "http://localhost:9545");
    this.state = {
      accounts: [],
      campaignAddresses: [],
      campaignAmount: 0,
      campaignName: "",
    };
  }

  async componentDidMount() {
    this.accounts = await this.web3.eth.getAccounts();
    this.crowdfundContract = new this.web3.eth.Contract(
      Crowdfund.abi,
      "0x402f96AA58dF4ab34009a3D0eF34Ec6F0C3bAfE6",
      {
        from: this.accounts[0], // default from address
        gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
      }
    );
    this.setState({ accounts: this.accounts });
    this.getCampaigns();

    // console.log(await crowdfundContract.methods.getNumberOfCampaigns().call());
  }

  render() {
    Date.prototype.addDays = function (days) {
      var date = new Date(this.valueOf());
      date.setDate(date.getDate() + days);
      return date;
    };

    let campaignsComponents;
    if (this.state.campaignAddresses.length) {
      campaignsComponents = this.state.campaignAddresses.map((address, i) => {
        return (
          <CampaignComponent key={i} campaignAddr={address}></CampaignComponent>
        );
      });
    } else {
      campaignsComponents = (
        <div className="p-4 lg:w-1/3">There are no campaigns yet</div>
      );
    }

    return (
      <Layout>
        <div className="container px-5 py-24 mx-auto">
          <Head>
            <title>Crowdfund</title>
            <meta
              name="description"
              content="Crowdfunding on the blockchain done by Lucas Foo"
            />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <div className="flex flex-col text-center w-full mb-20">
            <div>hi {this.state.accounts[0]}</div>
            <form
              className="lg:w-1/2 md:w-2/3 mx-auto p-2 w-1/2"
              autoComplete="off"
            >
              <div className="relative">
                <label className="leading-7 text-sm text-gray-600">
                  Name:
                  <input
                    className="w-full bg-gray-100 bg-opacity-50 rounded border border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
                    type="text"
                    name="name"
                    value={this.state.value}
                    onChange={(event) => this.handleCampaignNameChange(event)}
                  />
                </label>
              </div>
              <div className="relative">
                <label className="leading-7 text-sm text-gray-600">
                  Amount:
                  <input
                    type="number"
                    name="amount"
                    onChange={(event) => this.handleCampaignAmountChange(event)}
                    className="w-full bg-gray-100 bg-opacity-50 rounded border border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
                  />
                  Ether
                </label>
              </div>
            </form>
            <button className="btn " onClick={() => this.createCampaign()}>
              Start a new campaign
            </button>
          </div>
          <div className="flex flex-wrap -m-4">{campaignsComponents}</div>
        </div>
      </Layout>
    );
  }

  handleCampaignNameChange(event) {
    this.setState({ campaignName: event.target.value });
  }

  handleCampaignAmountChange(event) {
    this.setState({ campaignAmount: event.target.value });
  }

  async createCampaign() {
    const estimatedGas = await this.crowdfundContract.methods
      .createCampaign(
        this.state.campaignName,
        this.web3.utils.toWei(this.state.campaignAmount.toString())
      )
      .estimateGas({ from: this.state.accounts[0], gasPrice: 20000000000 });
    console.log("est gas", estimatedGas);
    console.log(this.state.campaignAmount.toString());
    await this.crowdfundContract.methods
      .createCampaign(
        this.state.campaignName,
        this.web3.utils.toWei(this.state.campaignAmount)
      )
      .send({
        from: this.state.accounts[0],
        gasPrice: 20000000000,
        gas: estimatedGas,
      })
      .then(console.log)
      .catch(console.log);
    this.getCampaigns();
  }

  async getCampaigns() {
    const noOfCampaigns = await this.crowdfundContract.methods
      .getNumberOfCampaigns()
      .call();
    const addresses = [];
    for (let i = 0; i < noOfCampaigns; i++) {
      const campaignAddr = await this.crowdfundContract.methods
        .campaigns(i)
        .call();
      addresses.push(campaignAddr);
    }
    console.log(addresses);
    this.setState({ campaignAddresses: addresses });
    return addresses;
  }
}
