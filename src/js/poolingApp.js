import { addressesMainnet } from './addresses.js';
// import CoinbaseWalletSDK from "@coinbase/wallet-sdk";
import "./wallet-sdk-bundle.js";
import boxArrowImage from "/images/FontAwesome/arrow-up-right-from-square-solid.svg";
import boxArrowImageGray from "/images/FontAwesome/arrow-up-right-from-square-solid-gray.svg";

import erc20ABI from '../ABI/ERC20.json';
import poolingABI from '../ABI/Devcon_Offset_Pool_0xb6A5D547d0A325Ffa0357E2698eB76E165b606BA.json';

"use strict";

// Unpkg imports
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const CoinbaseWalletSDK = window.CoinbaseWalletSDK;
// const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;
let signer;

const addresses = addressesMainnet;

const tokenDecimals = {
  BCT: 18,
  NCT: 18,
  MATIC: 18,
  USDC: 6,
  WETH: 18,
  WMATIC: 18
};

class BigNumber {

  constructor(bigNumberOrString, decimals = 18) {
    this.decimals = decimals
    if (typeof bigNumberOrString === "string") {
      this.string = bigNumberOrString;
    } else if (bigNumberOrString._isBigNumber) {
      this.string = parseFloat(ethers.utils.formatUnits(bigNumberOrString, decimals));
    } else if (typeof bigNumberOrString === "number") {
      this.string = parseFloat(bigNumberOrString).toFixed(decimals);
    } else {
      throw "Unexpected type whilst creating BigNumber: " + typeof bigNumberOrString;
    }
  }

  asString() {
    return this.string;
  }

  asStringLimitedLength(digits = 4) {
    let precision = parseFloat(this.string).toPrecision(digits)
    let fixed = parseFloat(this.string).toFixed(digits - 1)
    // console.log("precision: ", precision, precision.length)
    // console.log("fixed: ", fixed, fixed.length)

    if (precision.length < fixed.length) {
      return precision;
    } else {
      return fixed;
    }
  }

  asBigNumber() {
    return ethers.utils.parseUnits(this.string, this.decimals);
  }

  asFloat() {
    return parseFloat(this.string);
  }
}

// Globals
// const poapEventId = "62477";
// const poapBaseUrl = "https://127.0.0.1:8000/";
const poapEventId = "71937";
const poapBaseUrl = "https://poap.discarbon.earth/";

const poapGetRemainingCodeCountEndpoint = "getRemainingCodeCount/";
const poapMintEndpoint = "mintWithEligibilityTimeout/";
const poapWaitForMintEndpoint = "waitForMintWithTimeout/";
const poapGetCollectorStatusEndpoint = "getCollectorStatus/";
var poapCollectorStatus = "unknown";


import { airports } from './airports_selected.js'

let airportsList = airports.map(value => {
  return value[0]
});

/**
 * Setup the orchestra
 */
function init() {
  // Set initial values
  window.eventEmission = new BigNumber("0.3", tokenDecimals[18]);
  window.carbonToOffset = new BigNumber("0.0", tokenDecimals[18]);
  window.flightEmission = new BigNumber("0.0", tokenDecimals[18]);
  window.flightDistance = 0;
  window.paymentToken = "MATIC";
  window.paymentAmount = new BigNumber("0.0", tokenDecimals[paymentToken]);
  updateTotalEmission();

  // console.log("Initializing");
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        rpc: {
          137: "https://polygon-rpc.com",
          1: "https://eth-rpc.gateway.pokt.network"
        },
      },
    },

    coinbasewallet: {
      package: CoinbaseWalletSDK,
      options: {
        appName: "disCarbon: Devcon Offset",
        rpc: {
          137: "https://polygon-rpc.com",
        },
      },
    },
  };

  web3Modal = new Web3Modal({
    network: "matic", // optional
    networkID: 137,
    cacheProvider: false, // choose every time
    providerOptions, // required
    disableInjectedProvider: false, // For MetaMask / Brave / Opera.
  });
  disableOffsetButton();
  disableMintPoapButton();
  // console.log("Web3Modal instance is", web3Modal);
  getPoapRemainingEventCodeCount();

  // set event emission value
  var fieldCarbonToOffset = document.getElementById("event-emission");
  fieldCarbonToOffset.innerHTML = window.eventEmission.asStringLimitedLength(3) + " tCO<sub>2</sub>";
  updateUIvalues();

  let poapEventLink = document.getElementById("poapEvent-link");
  poapEventLink.removeAttribute("disabled");
  poapEventLink.setAttribute("href", "https://poap.gallery/event/" + poapEventId);

  let mainContractLink = document.getElementById("contract-link");
  // let faqContractLink = document.getElementById("faq-contract-link");
  // updateContractLink(mainContractLink);
  // updateContractLink(faqContractLink);
  // showNotification("Approval sent", "https://polygonscan.com/tx/", "info")
  // showNotification("Approved", "https://polygonscan.com/tx/", "success")
  // showNotification("Approval sent", null, "info")
  // showNotification("Approved", "https://polygonscan.com/tx/", "success")

}

function updateContractLink(contractLink) {
  contractLink.removeAttribute("disabled");
  contractLink.setAttribute("href", "https://polygonscan.com/address/" + addresses['pooling']);
  let shortAddress = shortenAddress(addresses['pooling']);
  contractLink.innerHTML = "Contract: " + shortAddress;
}


function showNotification(message, link, type) {
  let backgroundColor = "#66cc8a";
  let timer = -1;
  let hasCloseButton = true;
  if (type == "info") {
    backgroundColor = "#dcdcdc";
    timer = 10000;
    hasCloseButton = false;
  }

  if (link) {  // Add link symbol if a link is supplied
    message += "&nbsp<img src=" + boxArrowImage + " width='15' style='position: relative; top: -2px;' class='inline'/>&nbsp&nbsp"
  }

  Toastify({
    text: message,
    duration: timer,
    destination: link,
    newWindow: true,
    close: hasCloseButton,
    gravity: "bottom", // `top` or `bottom`
    position: "right", // `left`, `center` or `right`
    stopOnFocus: true, // Prevents dismissing of toast on hover
    escapeMarkup: false,
    style: {
      background: backgroundColor,
      "border-radius": "10px",
      color: "black",
    },
  }).showToast();
}

async function createContractObject() {
  // console.log("in create Contract Object")
  // let jsonFile = "./Pooling_" + addresses["pooling"] + ".json";
  // var poolingABI = await $.getJSON(jsonFile);
  window.pooling = new ethers.Contract(addresses["pooling"], poolingABI, window.provider);
  window.poolingWithSigner = window.pooling.connect(window.signer);
  // console.log("contract created")
}

/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
async function fetchAccountData() {
  // calculate carbon emission
  await calculateFlightDistance();
  updateUIvalues();

  // Display fully loaded UI for wallet data
  document.querySelector("#connect-button-div").style.display = "none";
  document.querySelector("#disconnect-button-div").style.display = "block";
}

function updateTotalEmission() {
  let participants = parseFloat(document.getElementById("passengers").value);
  window.carbonToOffset = new BigNumber(participants * (window.flightEmission.asFloat() + window.eventEmission.asFloat()));

}

async function updateUIvalues() {

  // if (window.flightDistance > 0) {
  var fieldDistance = document.getElementById("distance");
  fieldDistance.innerHTML = window.flightDistance.toFixed(0) + " km";
  // } else {
  //   var fieldDistance = document.getElementById("distance");
  //   fieldDistance.innerHTML = "--.-- km";
  // }
  var fieldFlightEmission = document.getElementById("flight-emission");
  // if (window.flightEmission.asFloat() > 0) {
  fieldFlightEmission.innerHTML = window.flightEmission.asStringLimitedLength(3) + " tCO<sub>2</sub>";
  // } else {
  //   fieldFlightEmission.value = "--.-- tCO<sub>2</sub>";
  // }

  var fieldCarbonToOffset = document.getElementById("carbon-to-offset");
  // if (window.carbonToOffset.asFloat() > 0) {
  //   fieldCarbonToOffset.innerHTML = window.carbonToOffset.asString(4) + " tCO<sub>2</sub>";
  // } else {
  //   fieldCarbonToOffset.value = "--.-- tCO<sub>2</sub>";
  // }

  if (window.isConnected && (window.carbonToOffset.asFloat())) {
    await updatePaymentFields();
  }

  updateChart();
}

/**
 * Fetch account data for UI when
 * - User switches accounts in wallet
 * - User switches networks in wallet
 * - User connects wallet initially
 */
async function refreshAccountData() {

  document.querySelector("#connect-button-div").style.display = "block";
  document.querySelector("#disconnect-button-div").style.display = "none";

  document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
  await fetchAccountData(window.provider);
  document.querySelector("#btn-connect").removeAttribute("disabled")
}

async function updateBalance() {
  switch (window.paymentToken) {
    case "MATIC":
      window.balance = await getMaticBalance();
      window.allowance = window.balance;
      break;
    case "USDC":
    case "DAI":
    case "WMATIC":
    case "WETH":
    case "NCT":
      await createErc20Contract();
      window.balance = await getErc20Balance();
      window.allowance = await getErc20Allowance();
      break;
    default:
      console.log("Unsupported token! ", window.paymentToken);
  }
  updateBalanceField();
  // console.log("allowance:", window.allowance.asString());
}

async function updatePaymentFields() {
  window.paymentToken = await document.querySelector("#list-payment-tokens").value;
  if (window.isConnected !== true) {
    console.log("skipping update of payment costs; wallet not connected")
    return;
  }
  await updateBalance();
  if (window.carbonToOffset.asFloat() < 0.001) {
    console.log("No carbon emission to offset. Skipping calculation.")
    window.paymentAmount = new BigNumber("0.0");
  } else {
    switch (window.paymentToken) {
      case "MATIC":
      case "USDC":
      case "DAI":
      case "WMATIC":
      case "WETH":
      case "NCT":
        await calculateRequiredAmountForOffset();
        break;
      default:
        console.log("Unsupported token! ", window.paymentToken);
        // TODO: better error message propagation in UI
        var fieldpaymentAmount = document.getElementById("payment-amount");
        fieldpaymentAmount.value = "unsupported token";
    }
  }
  connectedMyPoapsButton();
  updateApproveButton();
  updateOffsetButton();
  updatePaymentAmountField();
}

function updateApproveButton() {
  if (window.paymentToken === "MATIC") {
    hideApproveButton();
  } else {
    showApproveButton();
    if (window.balance.asFloat() < window.paymentAmount.asFloat()) {
      disableApproveButton();
    } else {
      enableApproveButton();
    }
  }
}

function updateOffsetButton() {
  // console.log("update offset button - balance: ", window.balance.asFloat(), "paymentAmount: ", window.paymentAmount.asFloat())
  if (window.paymentAmount.asFloat() === 0) {
    // console.log("disable offset button - paymentAmount is 0")
    disableOffsetButton();
    return
  }
  if (window.balance.asFloat() < window.paymentAmount.asFloat()) {
    // console.log("disable offset button - insufficient balance")
    disableOffsetButton();
    return;
  }
  if (window.allowance.asFloat() < window.paymentAmount.asFloat()) {
    // console.log("disable offset button - insufficient allowance approved")
    disableOffsetButton();
    return;
  }
  // console.log("enable offset button")
  enableOffsetButton();
}

async function updateMintPoapButton() {
  getCollectorStatusMintPoapButton();
  const state = await getPoapCollectorStatus();
  console.log("updateMintPoapButton:", state.status);
  // Save as global to help with updating state post "Send"
  poapCollectorStatus = state.status;


  if (state.status === "is_eligible") {
    // enableMintPoapButton();
    return state;
  }
  if (state.status === "has_collected") {
    collectedMintPoapButton();
    return state;
  }
  if (state.status === "is_not_eligible") {
    disableMintPoapButton();
    return state;
  }
}

function showApproveButton() {
  let approveButton = document.getElementById("btn-approve");
  approveButton.setAttribute("style", "display:true");
}

function hideApproveButton() {
  let approveButton = document.getElementById("btn-approve");
  approveButton.setAttribute("style", "display:none");
}

function disableApproveButton() {
  let approveButton = document.getElementById("btn-approve");
  approveButton.setAttribute("disabled", "disabled");
}

function enableApproveButton() {
  let approveButton = document.getElementById("btn-approve");
  approveButton.removeAttribute("disabled");
}

function busyApproveButton() {
  let approveButton = document.getElementById("btn-approve");
  approveButton.innerHTML = "";
  approveButton.classList.add("loading");
}

function readyApproveButton() {
  let approveButton = document.getElementById("btn-approve");
  approveButton.classList.remove("loading");
  approveButton.innerHTML = "Approve";
}

function disableOffsetButton() {
  let offsetButton = document.getElementById("btn-offset");
  offsetButton.setAttribute("disabled", "disabled");
}

function enableOffsetButton() {
  let offsetButton = document.getElementById("btn-offset");
  offsetButton.removeAttribute("disabled");
}

function busyOffsetButton() {
  let offsetButton = document.getElementById("btn-offset");
  offsetButton.innerHTML = "";
  offsetButton.classList.add("loading");
}

function readyOffsetButton() {
  let offsetButton = document.getElementById("btn-offset");
  offsetButton.classList.remove("loading");
  offsetButton.innerHTML = "Send";
}

function disableMintPoapButton() {
  let mintPoapButton = document.getElementById("btn-mintPoap");
  mintPoapButton.setAttribute("disabled", "disabled");
  mintPoapButton.classList.remove("loading");
  mintPoapButton.innerHTML = "Mint POAP";
}

function collectedMintPoapButton() {
  let mintPoapButton = document.getElementById("btn-mintPoap");
  mintPoapButton.setAttribute("disabled", "disabled");
  mintPoapButton.classList.remove("loading");
  mintPoapButton.innerHTML = "Collected";
  // https://app.poap.xyz/token/631422
}

function enableMintPoapButton() {
  let mintPoapButton = document.getElementById("btn-mintPoap");
  mintPoapButton.removeAttribute("disabled");
  mintPoapButton.classList.remove("loading");
  mintPoapButton.innerHTML = "Mint POAP";
}

function busyMintPoapButton() {
  let mintPoapButton = document.getElementById("btn-mintPoap");
  mintPoapButton.innerHTML = "Minting";
  mintPoapButton.classList.add("loading");
}

function getCollectorStatusMintPoapButton() {
  let mintPoapButton = document.getElementById("btn-mintPoap");
  mintPoapButton.innerHTML = "";
  mintPoapButton.classList.add("loading");
}

function successfulMintPoapButton() {
  let mintPoapButton = document.getElementById("btn-mintPoap");
  mintPoapButton.setAttribute("disabled", "disabled");
  mintPoapButton.classList.remove("loading");
  mintPoapButton.innerHTML = "POAP Minted!";
}

function readyMintPoapButton() {
  let mintPoapButton = document.getElementById("btn-mintPoap");
  mintPoapButton.classList.remove("loading");
  mintPoapButton.innerHTML = "Mint POAP";
}

async function connectedMyPoapsButton() {
  const address = await window.signer.getAddress();
  let myPoapsLink = document.getElementById("myPoaps-link");
  myPoapsLink.removeAttribute("disabled");
  myPoapsLink.setAttribute("href", "https://app.poap.xyz/scan/" + address);
  let myPoapsLinkImg = document.getElementById("my-poaps-link-img");
  myPoapsLinkImg.setAttribute("src", boxArrowImage)
}

function disconnectedMyPoapsButton() {
  let myPoapsLink = document.getElementById("myPoaps-link");
  myPoapsLink.setAttribute("disabled", "");
  myPoapsLink.setAttribute("href", "https://app.poap.xyz/scan/");
  let myPoapsLinkImg = document.getElementById("my-poaps-link-img");
  myPoapsLinkImg.setAttribute("src", boxArrowImageGray)
}

function updatePaymentAmountField() {
  var paymentAmountField = document.getElementById("payment-amount");
  if (window.paymentAmount.asFloat() > 0.002) {
    paymentAmountField.innerHTML = window.paymentAmount.asStringLimitedLength(4);
  } else {
    paymentAmountField.innerHTML = window.paymentAmount.asStringLimitedLength(5);
  }
}

function updateBalanceField() {
  var balanceField = document.getElementById("balance");
  balanceField.innerHTML = "Balance: " + window.balance.asStringLimitedLength(4) + " " + window.paymentToken;
}

async function calculateRequiredAmountForOffset() {
  if (window.paymentToken === "NCT") {
    window.paymentAmount = new BigNumber(window.carbonToOffset.asBigNumber(), tokenDecimals[window.paymentToken]);
  } else if (window.paymentToken === "MATIC") {
    let amount = await window.pooling
      .calculateNeededAmount(addresses['WMATIC'], window.carbonToOffset.asBigNumber());
    amount = new BigNumber(amount, tokenDecimals[window.paymentToken]);
    window.paymentAmount = new BigNumber(1.01 * amount.asFloat(), tokenDecimals[window.paymentToken]);
  } else {
    let amount = await window.pooling
      .calculateNeededAmount(addresses[window.paymentToken], window.carbonToOffset.asBigNumber());
    window.paymentAmount = new BigNumber(amount, tokenDecimals[window.paymentToken]);
  }
}

async function getMaticBalance() {
  let balance = await window.provider.getBalance(window.signer.getAddress());
  return new BigNumber(balance, tokenDecimals["MATIC"]);
}

async function createErc20Contract() {
  // let jsonFile = "./ERC20.json";
  // var erc20ABI = await $.getJSON(jsonFile);
  // console.log("erc20ABI: ", erc20ABI)
  window.erc20Contract = new ethers.Contract(addresses[window.paymentToken], erc20ABI, window.provider);
}

async function getErc20Balance() {
  let balance = await window.erc20Contract.balanceOf(window.signer.getAddress());
  return new BigNumber(balance, tokenDecimals[window.paymentToken]);
}

async function getErc20Allowance() {
  let allowance = await window.erc20Contract.allowance(window.signer.getAddress(), addresses["pooling"]);
  return new BigNumber(allowance, 18);
  // TODO: understand if we're doing it wrong or why usdc doesn't seem to respect it's 6 decimals when calling allowance()? I.e., why not
  // return new BigNumber(allowance, tokenDecimals[window.paymentToken]);
}

async function approveErc20() {
  busyApproveButton();
  // use a slightly higher approval allowance to allow a small price change between approve and offset
  const approvalAmount = new BigNumber(1.01 * window.paymentAmount.asFloat(), tokenDecimals[window.paymentToken]);
  // console.log("Estimated cost: ", window.paymentAmount.asFloat())
  // console.log("Approval amount: ", approvalAmount.asBigNumber(), "decimals: ", tokenDecimals[window.paymentToken])
  // console.log("Approval amount string: ", approvalAmount.asString(), "decimals: ", tokenDecimals[window.paymentToken])
  // console.log("Approval amount float: ", approvalAmount.asFloat(), "decimals: ", tokenDecimals[window.paymentToken])
  try {
    // const erc20WithSigner = window.erc20Contract.connect(window.signer);
    const transaction = await erc20WithSigner.approve(addresses["pooling"], approvalAmount.asBigNumber());
    showNotification("Approval sent", "https://polygonscan.com/tx/" + transaction.hash, "info")
    await transaction.wait();
    showNotification("Approved", "https://polygonscan.com/tx/" + transaction.hash, "success")
    readyApproveButton();
    enableOffsetButton();
  } catch (e) {
    readyApproveButton();
    throw e;
  }
}

async function doAutoOffset() {
  if (window.isConnected !== true) {
    console.log("skipping auto offset costs; wallet not connected")
    return;
  }
  switch (window.paymentToken) {
    case "MATIC":
      await doAutoOffsetUsingETH();
      break;
    case "USDC":
    case "DAI":
    case "WMATIC":
    case "WETH":
    case "NCT":
      await doAutoOffsetUsingToken();
      break;
    default: console.log("Unsupported token! ", window.paymentToken);
  }
  await updateBalance();
}

async function doAutoOffsetUsingETH() {
  // Update matic value before sending txn to account for any price change
  // (an outdated value can lead to gas estimation error)
  await calculateRequiredAmountForOffset();
  busyOffsetButton();
  try {
    // const transaction = await window.poolingWithSigner
      // .participateWithMatic(window.carbonToOffset.asBigNumber(), { value: window.paymentAmount.asBigNumber(), gasLimit: 400000 });
    showNotification("Transaction sent", "https://polygonscan.com/tx/" + transaction.hash, "info")
    await transaction.wait();
    showNotification("Transaction Succeeded", "https://polygonscan.com/tx/" + transaction.hash, "success")
    readyOffsetButton();
    if (poapCollectorStatus === "has_collected") {
      return;
    }
    // enableMintPoapButton();
  } catch (e) {
    readyOffsetButton();
    throw e;
  }
}

async function doAutoOffsetUsingToken() {
  // Update token amount before sending txn to account for any price change
  // (an outdated value can lead to gas estimation error)
  await calculateRequiredAmountForOffset();
  busyOffsetButton();
  try {
    // const transaction = await window.poolingWithSigner
    //   .participateWithToken(addresses[window.paymentToken], window.carbonToOffset.asBigNumber(), { gasLimit: 400000 });
    showNotification("Transaction sent", "https://polygonscan.com/tx/" + transaction.hash, "info")
    await transaction.wait();
    showNotification("Transaction Succeeded", "https://polygonscan.com/tx/" + transaction.hash, "success")
    readyOffsetButton();
    if (poapCollectorStatus === "has_collected") {
      return;
    }
    // enableMintPoapButton();
  } catch (e) {
    readyOffsetButton();
    throw e;
  }
}

async function getPoapRemainingEventCodeCount() {
  const url = poapBaseUrl + poapGetRemainingCodeCountEndpoint + poapEventId;
  console.log("Getting POAP number of remaining codes:", url)
  var response;
  try {
    response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        'Accept': 'application/json',
      },
    });

  } catch (e) {
    console.log("Exception retrieving remaining code count:", e);
    return;
  }
  const codeCountResponse = await response.json();
  if (codeCountResponse.success === false) {
    console.log("Getting remaining code count failed, message", codeCountResponse.message);
    return;
  }
  console.log("Remaining codes:", codeCountResponse.count);
}

async function getPoapCollectorStatus() {
  const address = await window.signer.getAddress()
  const url = poapBaseUrl + poapGetCollectorStatusEndpoint + poapEventId + "/" + address;
  console.log("Getting POAP collector status", url)
  var response;
  try {
    response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        'Accept': 'application/json',
      },
    });

  } catch (e) {
    // TODO
    // throw e;
    return { success: false }
  }
  const getCollectorStatusResponse = await response.json();
  return {
    status: getCollectorStatusResponse.collector_status,
    success: getCollectorStatusResponse.success
  }
}

async function mintPoap() {
  busyMintPoapButton();
  const address = await window.signer.getAddress();
  const url = poapBaseUrl + poapMintEndpoint + poapEventId + "/" + address;
  console.log("Minting POAP:", url);
  var mintResponse;
  showNotification("Checking POAP eligibility", null, "info");
  try {
    const response = await fetch(url, { mode: 'cors' });
    mintResponse = await response.json();
  } catch (e) {
    document.getElementById("poap-mint-error-modal").checked = true;
    document.getElementById("poap-mint-error").innerHTML = e;
    setTimeout(() => { updateMintPoapButton(); }, 4000);
    return;
  }
  if (mintResponse.success === false) {
    document.getElementById("poap-mint-error-modal").checked = true;
    document.getElementById("poap-mint-error").innerHTML = mintResponse.message;
    setTimeout(() => { updateMintPoapButton(); }, 4000);
    return;
  }
  showNotification("Minting POAP...", null, "info");
  let waitForMintResponse = await waitForPoapMintTxn(mintResponse.uid);
  if (waitForMintResponse.success === true) {
    showNotification("POAP minted", "https://gnosisscan.io/tx/" + waitForMintResponse.tx_hash, "success")
    successfulMintPoapButton();
    return;
  }
  // If waitForPoapMint fails get the current collector status and reflect it in the button
  showNotification("Verifying POAP mint...", null, "info");
  // Getting state with exp backoff would be better than a fixed delay!
  var collectorState = await new Promise(resolve => setTimeout(() => resolve(updateMintPoapButton()), 30000));
  // Show that mint successful, even if we don't get the mint tx hash
  if (collectorState.status === "has_collected") {
    showNotification("POAP minted", null, "success")
  }
}

async function waitForPoapMintTxn(uid) {
  const url = poapBaseUrl + poapWaitForMintEndpoint + poapEventId + "/" + uid;
  console.log("Waiting for POAP mint tx:", url);
  var waitForMintResponse;
  try {
    const response = await fetch(url, { mode: 'cors' });
    waitForMintResponse = await response.json();
  } catch (e) {
    // no modal: error unlikely to impact user; poap is likely to have minted
    console.log(poapWaitForMintEndpoint, "exception during request:", e)
    return {"success": false};
  }
  if (waitForMintResponse.success === false) {
    console.log(poapWaitForMintEndpoint, "request unsuccessful:", waitForMintResponse.message);
  }
  return waitForMintResponse;
}

/**
 * Creates Locations from Latitude Longitude. Usage: let pointA = new Location(x.xx, x.xx)
 */
function Location(latitude, longitude) {
  this.latitude = latitude;
  this.longitude = longitude;
}


/**
 * transforms an angle from dgrees to radians
 */
function toRad(angle) {
  return angle * Math.PI / 180;
}

/**
 * Calculates the distance on the earth surface given by two points Start and Destination
 * https://en.wikipedia.org/wiki/Great-circle_distance#Formulas Vyncenty formula
 */
function calcGeodesicDistance(start, destination) {
  const earthRadius = 6371.009; // km mean earth radius (spherical approximation)

  // Calculate temporary elements of the formula:

  let deltaLambda = (destination.longitude - start.longitude);

  let A = Math.pow(
    Math.cos(toRad(destination.latitude)) *
    Math.sin(toRad(deltaLambda))
    , 2);

  let B = Math.pow(
    Math.cos(toRad(start.latitude)) * Math.sin(toRad(destination.latitude)) -
    Math.sin(toRad(start.latitude)) * Math.cos(toRad(destination.latitude)) *
    Math.cos(toRad(deltaLambda))
    , 2);

  let C = Math.sin(toRad(start.latitude)) * Math.sin(toRad(destination.latitude)) +
    Math.cos(toRad(start.latitude)) * Math.cos(toRad(destination.latitude)) *
    Math.cos(toRad(deltaLambda));

  // Vyncenty formula:
  let deltaSigma = Math.atan2(Math.sqrt(A + B), C);
  let distance = earthRadius * deltaSigma;
  return distance;
}

/**
 * Check the correct network id is used.
 */
async function isCorrectChainId(chainId) {
  // console.log("chainId: ", chainId)
  // if (chainId !== 80001) {
  if (chainId !== 137) {
    document.getElementById("Network-Warning-Modal").checked = true;
    return false;
  } else {
    document.querySelector("#btn-connect").removeAttribute("disabled")
    await updateAccountInHeader();
    return true;
  }
}

function shortenAddress(address) {
  const num = 4;
  let shortAddress = address.slice(0, num + 2) + "...";
  if (window.innerWidth > 640) {
    shortAddress += address.slice(-num);
  }
  return shortAddress
}
/**
 * Update account in header upon connect
 */
async function updateAccountInHeader() {
  let address = await window.signer.getAddress()
  let shortAddress = shortenAddress(address)
  // console.log("address: ", address)
  // console.log("shortAddress: ", shortAddress)
  // console.log("polygon link : ", "https://polygonscan.com/address/" + address)
  const addressWithLink =
    document.querySelector('#account-link').setAttribute("href", "https://polygonscan.com/address/" + address);
  document.querySelector('#account-link').innerHTML = shortAddress;
  document.querySelector("#account-button-div").style.display = "block";
}

/**
 * Connect wallet button pressed.
 */
async function onConnect() {

  console.log("Opening a dialog", web3Modal);

  let instance
  try {
    instance = await web3Modal.connect();
    window.provider = new ethers.providers.Web3Provider(instance, "any");
    window.signer = window.provider.getSigner();
  } catch (e) {
    // document.getElementById("Metamask-Warning-Modal").checked = true;
    console.log("Could not get a wallet connection", e)
    return;
  }

  window.carbonToOffset = carbonToOffset;
  window.paymentAmount = paymentAmount;

  let correctChainId
  const { chainId } = await window.provider.getNetwork();
  correctChainId = await isCorrectChainId(chainId);

  if (correctChainId === true) {
    finalizeConnect();
  }
  else {
    return;
  }
}


async function finalizeConnect() {


  window.isConnected = true;
  await createContractObject();

  var el = document.getElementById("btn-offset");
  if (el.addEventListener) el.addEventListener("click", doAutoOffset, false);
  else if (el.attachEvent) el.attachEvent("onclick", doAutoOffset);

  var btnApprove = document.getElementById("btn-approve");
  if (btnApprove.addEventListener) btnApprove.addEventListener("click", approveErc20, false);
  else if (btnApprove.attachEvent) btnApprove.attachEvent("onclick", approveErc20);

  var btnMintPoap = document.getElementById("btn-mintPoap");
  if (btnMintPoap.addEventListener) btnMintPoap.addEventListener("click", mintPoap, false);
  else if (btnMintPoap.attachEvent) btnMintPoap.attachEvent("onclick", mintPoap);

  // Subscribe to accounts change
  window.provider.provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
    updateAccountInHeader();
    console.log("accounts Changed");
  });

  // Subscribe to chainId change
  window.provider.provider.on("chainChanged", (chainId) => {
    console.log("chain Changed", chainId);
    isCorrectChainId(parseInt(chainId, 16))
  });

  updateAccountInHeader();
  await refreshAccountData();
  // await handleManuallyEnteredTCO2();
  await updatePaymentFields();
  updateMintPoapButton();
}

async function switchToPolygon() {

  await window.provider.provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: toHex(137) }],
  });

  document.getElementById("Network-Warning-Modal").checked = false;
  finalizeConnect();
}

/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {

  document.getElementById("Network-Warning-Modal").checked = false;

  console.log("Killing the wallet connection", window.provider);

  // TODO: Which providers have close method?
  if (window.provider.provider.close) {
    await window.provider.provider.close();
    await web3Modal.clearCachedProvider();
    window.provider = null;
  }
  await web3Modal.clearCachedProvider();
  window.provider = null;

  // Set the UI back to the initial state
  document.querySelector("#connect-button-div").style.display = "block";
  document.querySelector("#disconnect-button-div").style.display = "none";
  document.querySelector('#account-link').innerHTML = "";
  document.querySelector("#account-button-div").style.display = "hidden";
  document.getElementById("payment-amount").innerHTML = "&emsp;--.--";
  window.paymentAmount = new BigNumber("0.0")
  document.getElementById("balance").innerHTML = "User balance: --.--";
  disableMintPoapButton();
  disconnectedMyPoapsButton();
  disableOffsetButton();
  window.isConnected = false;
}

function updatePassengerField() {
  let passengers = document.getElementById("passengers").value;
  if (parseFloat(passengers)) {
    passengers = parseFloat(passengers);
  } else {
    passengers = 1;
  }
  passengers = passengers + " participant";
  if (parseFloat(passengers) > 1) {
    passengers += "s";
  }
  document.getElementById("passengers").value = passengers
  calculateFlightDistance();
}

function decrement(e) {
  const btn = e.target.parentNode.parentElement.querySelector(
    'button[data-action="decrement"]'
  );
  const target = btn.nextElementSibling;
  let value = parseFloat(target.value);
  if (value > 1) {
    value--;
  }
  target.value = value;
  updatePassengerField();
}

function increment(e) {
  const btn = e.target.parentNode.parentElement.querySelector(
    'button[data-action="decrement"]'
  );
  const target = btn.nextElementSibling;
  let value = parseFloat(target.value);
  value++;
  target.value = value;
  updatePassengerField();
}

const decrementButtons = document.querySelectorAll(
  `button[data-action="decrement"]`
);

const incrementButtons = document.querySelectorAll(
  `button[data-action="increment"]`
);

decrementButtons.forEach(btn => {
  btn.addEventListener("click", decrement);
});

incrementButtons.forEach(btn => {
  btn.addEventListener("click", increment);
});

/**
 * Find Latitude and Longitude from airport name
 */
async function findLatLong(airportName) {
  let result = await airports.find(element => element[0] == airportName)

  let location;
  if (result) {
    return new Location(result[1], result[2]);
  } else {
    return undefined
  }

}

/**
 * Get flight distance from the two airport input fields
 */
async function calculateFlightDistance() {

  let startName = document.getElementById('start').value
  let startLocation;
  if (startName) {
    startLocation = await findLatLong(startName)
  }

  let destinationName = "BOG, El Dorado International Airport, Bogota, Colombia"; //document.getElementById('destination').value
  let destinationLocation = new Location(4.70159, -74.1469);  // hard code Bogota International Airport coorrdinates
  // if (destinationName) {
  //   destinationLocation = await findLatLong(destinationName)
  // }

  if (startLocation && destinationLocation) {
    window.flightDistance = calcGeodesicDistance(startLocation, destinationLocation)
    calculateCarbonEmission();
  } else {
    window.flightDistance = 0;
    calculateCarbonEmission();
    await updatePaymentFields();
    updateUIvalues();
  }
}

/**
 * get carbon emission from distance and other fields
 */
async function calculateCarbonEmission() {
  // Formula follows myclimate estimation calculator
  // emission parameters (short distance)
  let emShort = {
    a: 0,
    b: 2.714,
    c: 1166.52,
    S: 153.51,
    PLF: 0.82,
    DC: 95,
    CF: 0.07,
    CW: {
      economy: 0.96,
      business: 1.26,
      first: 2.4,
    },
    EF: 3.15,
    M: 2,
    P: 0.54,
    AF: 0.00038,
    A: 11.68
  }
  // emission parameters (long distance)
  let emLong = {
    a: 0.0001,
    b: 7.104,
    c: 5044.93,
    S: 280.21,
    PLF: 0.82,
    DC: 95,
    CF: 0.23,
    CW: {
      economy: 0.8,
      business: 1.54,
      first: 2.4,
    },
    EF: 3.15,
    M: 2,
    P: 0.54,
    AF: 0.00038,
    A: 11.68
  }

  let emission = 0;
  if (window.flightDistance == 0) {
    // do nothing
  } else if (window.flightDistance < 1500) {  // short distance
    emission = singleEmissionCalc(emShort);
  } else if (window.flightDistance > 2500) {  // long distance
    emission = singleEmissionCalc(emLong);
  } else {  // intermediate distance (interpolation)
    let shortEM = singleEmissionCalc(emShort);
    let longEM = singleEmissionCalc(emLong);
    let longDistFactor = (window.flightDistance - 1500) / 1000; // 0@1500km, 1@2500km
    emission = (1 - longDistFactor) * shortEM + longDistFactor * longEM; //interpolation
  }

  // multiplier for round trip
  emission *= 2;

  window.flightEmission = new BigNumber(emission, tokenDecimals["NCT"]);
  updateTotalEmission();
  await updatePaymentFields();
  updateUIvalues();
}

/**
* calculates CO2 emission for an emission parameter set (em)
*/
function singleEmissionCalc(em) {

  let flightclass = document.getElementById("flightclass").value;
  let emission = 0;
  let d = window.flightDistance + em.DC;
  emission = ((em.a * d * d + em.b * d + em.c) / (em.S * em.PLF)) *
    (1 - em.CF) *
    em.CW[flightclass] *
    (em.EF * em.M + em.P) +
    em.AF * d +
    em.A;
  emission = (emission / 1000).toFixed(3); // from kg to tonnes
  return emission
}

function toHex(num) {
  const val = Number(num);
  return "0x" + val.toString(16);
};

tippy('#mint-tooltip', {
  content: 'Send at least 0.30 NCT (or equiv.) to the community offset contract to collect the POAP.',
});

tippy('#smart-contract-tooltip', {
  content: 'Deployed smart contract',
});

tippy('#pool-tooltip', {
  content: 'Community offset pool address',
});

// async function handleManuallyEnteredTCO2() {
//   let TCO2 = parseFloat(document.getElementById("carbon-to-offset").value);
//   if (TCO2 && TCO2 > 0) {
//     window.carbonToOffset = new BigNumber(TCO2, tokenDecimals["NCT"]);
//   }
//   updateUIvalues();
// }

/**
 * Make autocomplete list for airports
 */
$(function () {
  $("#start").autocomplete({
    maxShowItems: 6,
    source: airportsList,
    minLength: 2,
    select: function (event, ui) {
      // somehow this needs to be set manually here, otherwise the UI will
      // not update properly. (For the other jQuery it works without it...)
      let startField = document.getElementById("start");
      startField.value = ui.item.value;
      calculateFlightDistance();
    }
  }).focus(function () {
    $(this).autocomplete('search', $(this).val())
  }).autocomplete("instance")._renderItem = function (ul, item) {
    return $("<li>")
      .append('<div style="font-size:20px;">' + item.label.split(",")[1] + "<br>" +
        '<span style="font-size:16px;"><b>' + item.label.split(",")[0] + "</b>, " +
        item.label.split(",")[2] + ", " +
        item.label.split(",")[3] +
        "</small></div>")
      .appendTo(ul);
  };
});

// $(function () {
//   $("#destination").autocomplete({
//     maxShowItems: 6,
//     source: airportsList,
//     minLength: 2,
//     select: function (event, ui) { calculateFlightDistance() }
//   }).focus(function () {
//     $(this).autocomplete('search', $(this).val())
//   }).autocomplete("instance")._renderItem = function (ul, item) {
//     return $("<li>")
//       .append('<div style="font-size:20px;">' + item.label.split(",")[1] + "<br>" +
//         '<span style="font-size:16px;"><b>' + item.label.split(",")[0] + "</b>, " +
//         item.label.split(",")[2] + ", " +
//         item.label.split(",")[3] +
//         "</span></div>")
//       .appendTo(ul);
//   };
// });

/**
 * Main entry point.
 */

async function updateChart() {
  var xValues = ["Flight", "Accommodation", "Catering", "Event Infrastructure"];

  let accommodation = 0.2;  // Emission in TCO2
  let catering = 0.06;
  let eventInfrastructure = 0.04;

  let participants = parseFloat(document.getElementById("passengers").value);

  var yValues = [
    window.flightEmission.asFloat() * participants,
    accommodation * participants,
    catering * participants,
    eventInfrastructure * participants];
  var barColors = [
    "#0077B6",
    "#00B4D8",
    "#90E0EF",
    "#CAF0F8",
  ];
  const data = {
    labels: xValues,
    datasets: [{
      backgroundColor: barColors,
      data: yValues,
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label;
            let value = context.formattedValue;

            if (!label)
              label = 'Unknown'

            let sum = 0;
            let dataArr = context.chart.data.datasets[0].data;
            dataArr.map(data => {
              sum += Number(data);
            });

            let percentage = (value * 100 / sum).toFixed(0) + '%';
            return label + ": " + percentage;
          }
        }
      }
    }]
  }

  const config = {
    type: "doughnut",
    data: data,
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Your Emission'
        },
        legend: {
          display: false,
        }
      },
      cutout: "85",
      animation: {
        animateRotate: true
      }
    }
  }
  if (window.emissionChart) {
    emissionChart.destroy();
  }

  window.emissionChart = new Chart(document.getElementById('EmissionChart'), config);

  // emissionChart.label(false);

}

const centerDoughnutPlugin = {
  id: "annotateDoughnutCenter",
  beforeDraw: (chart) => {
    let width = chart.width;
    let height = chart.height;
    let ctx = chart.ctx;

    ctx.restore();
    let fontSize = (height / 160).toFixed(2);
    ctx.font = fontSize + "em sans-serif";
    ctx.textBaseline = "middle";

    let text = window.carbonToOffset.asStringLimitedLength(3) + " tCO2";
    let textX = Math.round((width - ctx.measureText(text).width) / 2);
    let textY = (height) / 1.65;
    ctx.fillText(text, textX, textY);

    textX = Math.round((width - ctx.measureText("Total").width) / 2);
    ctx.fillText("Total", textX, textY - 35);
    ctx.save();
  },
};

// Register Donut Plugin
Chart.register(centerDoughnutPlugin);


window.addEventListener('load', async () => {
  init();
  document.querySelector("#btn-connect").addEventListener("click", onConnect);
  document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
  document.querySelector("#network-modal-button").addEventListener("click", onDisconnect);
  document.querySelector('#switch-to-polygon-button').addEventListener("click", switchToPolygon);
  document.querySelector("#list-payment-tokens").addEventListener("change", updateUIvalues);
  // document.querySelector("#roundtrip").addEventListener("click", calculateFlightDistance);
  document.querySelector('#flightclass').addEventListener("change", calculateFlightDistance);
  // document.querySelector('#carbon-to-offset').addEventListener("change", handleManuallyEnteredTCO2);
  document.querySelector('#passengers').addEventListener("change", updatePassengerField);
  document.querySelector('#start').addEventListener("change", calculateFlightDistance);
  // document.querySelector('#destination').addEventListener("change", calculateFlightDistance);
  updateChart();
});
