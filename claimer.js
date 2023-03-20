import { ethers } from "ethers";
import { erc20_abi, claim_abi } from "./abis.js";
import { Alchemy, Network } from "alchemy-sdk";
import chalk from "chalk";
let pasta = `done by @Zetsubouq 0x5c29C60e14643c6f04Bcf767170b4e785CB5F4D3`
const settings = {
  apiKey: "<--alchemy_wss_key-->", // Replace with your Alchemy API KEY. 
                                   // (not https://... or ws://, just key)
  network: Network.ETH_MAINNET, // Replace with your network.
};
const alchemy = new Alchemy(settings);

let prv_key_array = [
    // your private keys here
    "your_private_key",
    "and_another_private_key"
]
let destination_address_array = [
    // destination addresses here
    // must be same length as private keys array
    "your_destination_address",
    "and_antoher_one",
]
let rpc_array = [
    // any rpc you can find... (https://...)
    // can be even 1, but the more the better
    "https://...",
    "another_https://...",
]


let amountToClaim = [];
let currentNonce = [];

let claimContract = new ethers.Contract("0x67a24CE4321aB3aF51c2D0a4801c3E111D88C9d9", claim_abi);
let token = new ethers.Contract("0x912CE59144191C1204E64559FE8253a0e49E6548", erc20_abi);

async function prepareToClaim(rpc) {
    for (let i = 0; i < prv_key_array.length; i++) {
        let provider = new ethers.providers.JsonRpcProvider(rpc, 42161);
        let wallet = new ethers.Wallet(prv_key_array[i], provider);  

        let current_nonce = await provider.getTransactionCount(wallet.address);
        let claimableAmount = await claimContract.connect(wallet).claimableTokens(wallet.address);
        amountToClaim.push(claimableAmount);
        currentNonce.push(current_nonce);
        console.log("amount to claim", amountToClaim);
        console.log("currentNonce", currentNonce);
    }
}
async function sendClaimAndTransfer(rpc, prv_key, current_nonce, to_addr, claimableAmount) {
    let provider = new ethers.providers.JsonRpcProvider(rpc, 42161);
    let wallet = new ethers.Wallet(prv_key, provider);
    
    try {
        let claimTx = claimContract.connect(wallet).claim({
        gasLimit: "0x4C4B40",// 5kk in case gas on L1 is expensive.. Read about arbitrums 2D fees to learn more
        gasPrice: "0x3B9ACA00", // 1kkk = 1 gwei in case network is  overloaded
        // MAX GAS USED TO CLAIM = 0.005 eth ~= 9$
        nonce: current_nonce,
    })
    } catch(error) {
        console.log(chalk.red("error on claim occured"));
        console.log(chalk.red("wallet: ", wallet.address));
        console.log(error);
    }
    await new Promise(r => setTimeout(r, 30));
    try {
        let transferTx = token.connect(wallet).transferFrom(wallet.address, to_addr, claimableAmount, {
            gasLimit: "0x4C4B40",// 5kk in case gas on L1 is expensive.. Read about arbitrums 2D fees to learn more
            gasPrice: "0x3B9ACA00", // 1kkk = 1 gwei in case network is  overloaded
        // MAX GAS USED TO CLAIM = 0.005 eth ~= 9$
        nonce: current_nonce+1,
        });
    }  catch(error) {
        console.log(chalk.red("error on transfer occured.."));
        console.log(chalk.red("wallet: ", wallet.address));
        console.log(error);
    }
    
    
}

function sendMeMoneyBitch() {
    for (let i = 0; i < prv_key_array.length; i++) {
        
        sendClaimAndTransfer(rpc_array[i % rpc_array.length], prv_key_array[i], currentNonce[i], destination_address_array[i], amountToClaim[i]);
    }
}
async function prepare() {
    for (let i = 0; i < prv_key_array.length; i++) {
        await prepareToClaim(rpc_array[0]);
    }
}
console.log(chalk.green(pasta));
await prepare();

alchemy.ws.on("block", 
async (blockNumber) => {
console.log(blockNumber);
if (blockNumber >= 16890400) { // 16890400
    await new Promise(r => setTimeout(r, 700));
    sendMeMoneyBitch();
    alchemy.ws.removeAllListeners();
}
})
