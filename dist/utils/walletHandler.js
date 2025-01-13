import { ethers } from 'ethers';
import { elizaLogger } from '@ai16z/eliza';
// Comic Sans token contract details
const TOKEN_CONTRACT_ADDRESS = "0x00Ef6220B7e28E890a5A265D82589e072564Cc57";
const TOKEN_ABI = [
    // Standard ERC20 functions we need
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];
// Base network configuration
const BASE_NETWORK = {
    chainId: 8453,
    name: 'Base',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
    }
};
// List of fallback RPC URLs
const BASE_RPC_URLS = [
    'https://mainnet.base.org',
    'https://1rpc.io/base',
    'https://base.blockpi.network/v1/rpc/public'
];
export const handleWalletReply = async (text, runtime) => {
    try {
        // Extract address from text
        const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
        if (!addressMatch) {
            return {
                isValid: false,
                message: "That doesn't look like a valid Base wallet address. Please send a valid Base wallet address starting with 0x!"
            };
        }
        const address = addressMatch[0];
        if (!ethers.utils.isAddress(address)) {
            return {
                isValid: false,
                message: "That address doesn't look valid. Please send a valid Base wallet address!"
            };
        }
        // Get wallet config from character settings
        const walletConfig = runtime.character.wallet;
        const BOT_PRIVATE_KEY = process.env[walletConfig.privateKey.replace('process.env.', '')];
        let RPC_URL = process.env[walletConfig.rpcUrl.replace('process.env.', '')];
        const REWARD_AMOUNT = ethers.utils.parseUnits(walletConfig.rewardAmount, 18);
        // If no RPC URL provided, use fallbacks
        if (!RPC_URL) {
            RPC_URL = BASE_RPC_URLS[0];
        }
        // Create provider with network configuration
        const provider = new ethers.providers.StaticJsonRpcProvider(RPC_URL, {
            chainId: BASE_NETWORK.chainId,
            name: BASE_NETWORK.name,
            ...BASE_NETWORK
        });
        // Test provider connection
        try {
            await provider.getNetwork();
        }
        catch (providerError) {
            // Try fallback RPC URLs if main one fails
            for (const fallbackUrl of BASE_RPC_URLS) {
                if (fallbackUrl !== RPC_URL) {
                    try {
                        provider._setProvider(new ethers.providers.JsonRpcProvider(fallbackUrl));
                        await provider.getNetwork();
                        elizaLogger.log("🔄 Using fallback RPC:", fallbackUrl);
                        break;
                    }
                    catch (fallbackError) {
                        continue;
                    }
                }
            }
        }
        // Create wallet and wait for it to be ready
        const wallet = new ethers.Wallet(BOT_PRIVATE_KEY, provider);
        await wallet.provider.ready;
        // Log network info for debugging
        elizaLogger.log("🌐 Network info:", {
            network: await wallet.provider.getNetwork(),
            chainId: BASE_NETWORK.chainId,
            rpcUrl: RPC_URL
        });
        // Create contract instance
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, wallet);
        // Send tokens with gas limit and price
        const tx = await tokenContract.transfer(address, REWARD_AMOUNT, {
            gasLimit: 100000, // Adjust as needed
            gasPrice: await provider.getGasPrice()
        });
        // Wait for transaction with timeout
        const receipt = await Promise.race([
            tx.wait(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Transaction timeout")), 30000))
        ]);
        elizaLogger.log("✅ Transaction successful:", {
            hash: receipt.transactionHash,
            blockNumber: receipt.blockNumber
        });
        return {
            isValid: true,
            message: `🎉 Congratulations! I've sent you ${ethers.utils.formatUnits(REWARD_AMOUNT, 18)} $COMICSANS tokens! Check your wallet on Base: https://basescan.org/tx/${receipt.transactionHash}`,
            txHash: receipt.transactionHash
        };
    }
    catch (error) {
        elizaLogger.error("❌ Error sending tokens:", {
            error,
            message: error.message,
            code: error.code,
            reason: error.reason
        });
        return {
            isValid: false,
            message: "Oops! Something went wrong while sending the tokens. Please make sure you're using a valid Base wallet address and try again!",
            error
        };
    }
};
