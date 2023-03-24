import { ethers } from "ethers";
import { erc20_abi, claim_abi, multicall_abi } from "./abis.js";
import chalk from "chalk";
let pasta = `done by @Zetsubouq 0x5c29C60e14643c6f04Bcf767170b4e785CB5F4D3`

// any rpc you can find... (https://...)
// should be AS QUCK AS POSSIBLE
let subscribe_rpc = "https://....";

let subscribe_provider = new ethers.providers.JsonRpcProvider(subscribe_rpc, 42161);

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
    "your_rpc_https://...",
    "another_rpc_https://...",
]


let amountToClaim = [];
let currentNonce = [];

let claimContract = new ethers.Contract("0x67a24CE4321aB3aF51c2D0a4801c3E111D88C9d9", claim_abi);
let token = new ethers.Contract("0x912CE59144191C1204E64559FE8253a0e49E6548", erc20_abi);
let multicall = new ethers.Contract("0x842eC2c7D803033Edf55E478F461FC547Bc54EB2", multicall_abi, subscribe_provider);

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
async function sendClaim(rpc, prv_key, current_nonce, to_addr, claimableAmount) {
    let provider = new ethers.providers.JsonRpcProvider(rpc, 42161);
    let wallet = new ethers.Wallet(prv_key, provider);
    
    try {
        let claimTx = claimContract.connect(wallet).claim()
    console.log(await claimTx)
    } catch(error) {
        console.log(chalk.red("error on claim occured"));
        console.log(chalk.red("wallet: ", wallet.address));
        console.log(error.reason);
    }
    await new Promise(r => setTimeout(r, 30));
    try {
        let transferTx = token.connect(wallet).transfer(to_addr, claimableAmount);
        console.log(await transferTx)
    }  catch(error) {
        console.log(chalk.red("error on transfer occured.."));
        console.log(chalk.red("wallet: ", wallet.address));
        console.log(error);
    }
}

async function sendTransfer(rpc, prv_key, current_nonce, to_addr, claimableAmount) {
    let provider = new ethers.providers.JsonRpcProvider(rpc, 42161);
    let wallet = new ethers.Wallet(prv_key, provider);

    try {
        let transferTx = token.connect(wallet).transfer(to_addr, claimableAmount, {
            gasLimit: "2000000",// 5kk in case gas on L1 is expensive.. Read about arbitrums 2D fees to learn more
            gasPrice: "6000000000", // 1kkk = 1 gwei in case network is  overloaded
        // MAX GAS USED TO CLAIM = 0.005 eth ~= 9$
        });
        console.log(await transferTx)
    }  catch(error) {
        console.log(chalk.red("error on transfer occured.."));
        console.log(chalk.red("wallet: ", wallet.address));
        console.log(error);
    }
    
    
}
async function sendMeMoneyBitch() {
    for (let i = 0; i < prv_key_array.length; i++) {
        if (amountToClaim == 0) {
            let claimableAmount = await token.connect(wallet).balanceOf(wallet.address);
                console.log("tokens have been already claimed, transferring now")
            await sendTransfer(rpc_array[i % rpc_array.length], prv_key_array[i], currentNonce[i], destination_address_array[i % destination_address_array.length], claimableAmount);
        } else {
        await sendClaim(rpc_array[i % rpc_array.length], prv_key_array[i], currentNonce[i], destination_address_array[i % destination_address_array.length], amountToClaim[i]);
        console.log("tokens are not claimed yet, need to claim and transfer")
    }
    }
}
async function waitTs() {
    for (let i = 0; i >= 0; i++) {
        if(Date.now() >= 1679574000000) { // some time before claiming peroid
            for (let j = 0; j >= 0; j++) {
                let BN = await multicall.getL1BlockNumber();
                if ((BN).gte("16890400")) { // get L1BlockNumber from arbi
                    await sendMeMoneyBitch();
                    console.log("job's done. If no error was printed, everything completed");
                } else {
                    console.log(BN.toString())
                    console.log("block not synced");
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }
    }
}

console.log(chalk.green(pasta));
await prepareToClaim(rpc_array[0]);
waitTs();
