# NeoCard Fusion Factory

> Built on IOPn — merge two NeoCard NFTs into one upgraded card, combining loyalty points, badges, and tier progression.

---

## What It Does

The **NeoCard Fusion Factory** is a smart contract system for the IOPn ecosystem. It lets users:

1. **Fuse** two NeoCard NFTs they own
2. The two originals are **burned**
3. A new, upgraded NeoCard is **minted** with the combined NeoPoints + badges + a fusion bonus

This extends IOPn's official NeoCard merge mechanic (described in the [IOPn docs](https://iopn.gitbook.io/iopn/the-neocard-your-loyalty-passport)) with a fully on-chain, trustless implementation.

---

## Contracts

| Contract | Description |
|---|---|
| `NeoCard.sol` | ERC-721 NFT. Stores NeoPoints, badge count, and tier per token. |
| `NeoCardFusion.sol` | Fusion logic. Burns two cards, mints one upgraded card with combined stats + bonus. |

### NeoCard Tiers

| Tier | Name | NeoPoints Required |
|---|---|---|
| 0 | Starter | 0 |
| 1 | Bronze | 1,000 |
| 2 | Silver | 5,000 |
| 3 | Gold | 15,000 |
| 4 | Platinum | 50,000 |
| 5 | Elite | 100,000 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/neocard-fusion.git
cd neocard-fusion
npm install
```

### Compile

```bash
npm run compile
```

### Test

```bash
npm test
```

All 14 tests should pass, covering minting, burning, fusion, tier calculation, previews, and admin controls.

### Run locally

```bash
# Terminal 1 — start a local node
npm run node

# Terminal 2 — deploy to it
npm run deploy:local
```

---

## Deploy to OPN Testnet

1. Copy `.env.example` to `.env` and fill in your private key and RPC URL:

```bash
cp .env.example .env
```

2. Deploy:

```bash
npm run deploy:testnet
```

Contract addresses are saved to `deployed-addresses.json` after deployment.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "feat: NeoCard Fusion Factory initial implementation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/neocard-fusion.git
git push -u origin main
```

---

## How Fusion Works (Technical)

```
User calls fuse(tokenA, tokenB)
  ├── Validates: caller owns both, tokenA ≠ tokenB
  ├── Reads: CardData from tokenA and tokenB
  ├── Burns: tokenA and tokenB
  ├── Mints: new card with
  │     neoPoints  = pointsA + pointsB + fusionBonus
  │     badgeCount = badgesA + badgesB
  │     tier       = auto-calculated
  └── Emits: Fused event
```

You can also call `previewFusion(tokenA, tokenB)` to see the result without executing.

---

## Security

- `ReentrancyGuard` on all state-changing fusion calls
- Only `owner` or registered `fusionFactory` can mint/burn NeoCards
- Custom errors for gas-efficient reverts

---

## License

MIT
