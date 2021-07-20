import React from "react";
import Web3 from "web3";

export default class Layout extends React.Component {
  componentDidMount() {
    if (typeof window.ethereum !== 'undefined') {
      console.log('MetaMask is installed!');
      ethereum.request({ method: 'eth_requestAccounts' });
    }
  }

  render() {
    return <div>{this.props.children}</div>;
  }
}
