# Comic Sans Agent - Eliza Bot Extension

A Twitter bot that detects Comic Sans in images and rewards users with $COMICSANS tokens on Base network.

## Key Features Added

### 1. Comic Sans Detection
- Added Python script (`src/scripts/comic_sans_detector.py`) for font detection
- Uses OCR and font comparison to detect Comic Sans in images
- Added Comic Sans font file (`assets/fonts/comic.ttf`) for reference
- Integrated with Node.js through `src/utils/detectComicSans.js`

### 2. Token Rewards System
- Added wallet handling functionality (`src/utils/walletHandler.js`)
- Integrates with Base network for $COMICSANS token transfers
- Uses ethers.js for blockchain interactions
- Includes fallback RPC URLs for better reliability
- Handles gas estimation and transaction timeouts

### 3. State Management
- Implemented `pendingWalletRequests` Map to track user interactions
- Stores user ID, image URL, and claim status
- Prevents double claims for the same image
- Cleans up unclaimed requests after one hour

### 4. Character Configuration
Added custom character configuration (`characters/comicsans.character.json`):
- Comic Sans-specific personality
- Wallet configuration for Base network
- Token contract details
- Custom responses for detection results

### 5. Twitter Interaction Flow
1. User tags bot with image
2. Bot detects Comic Sans
3. Bot asks for wallet address
4. User replies to original tweet with wallet
5. Bot validates and sends tokens
6. Bot confirms transaction

### 6. Security Features
- Wallet address validation
- Transaction timeout handling
- Rate limiting for Twitter API
- Error handling for failed transactions
- Network fallback mechanisms

## Environment Variables 
bash
BASE_WALLET_PK=your_private_key
BASE_RPC_URL=https://mainnet.base.org

## Token Contract
- Network: Base
- Contract: 0x00Ef6220B7e28E890a5A265D82589e072564Cc57
- Standard: ERC20

## Dependencies Added
- ethers.js for blockchain interactions
- Python dependencies for font detection
- OCR libraries for text recognition

## Performance Optimizations
- Reduced polling interval for faster responses
- Added RPC fallbacks for better reliability
- Optimized image processing