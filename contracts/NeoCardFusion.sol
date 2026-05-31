// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./NeoCard.sol";

/**
 * @title NeoCardFusion
 * @notice Fusion Factory for IOPn NeoCards.
 *
 * How it works:
 *   1. User calls `fuse(tokenA, tokenB)` owning both cards.
 *   2. Contract reads points + badges from both cards.
 *   3. Both cards are burned.
 *   4. A new NeoCard is minted to the caller with:
 *        - neoPoints  = pointsA + pointsB  (+ fusion bonus)
 *        - badgeCount = badgeA  + badgeB
 *        - tier       = auto-calculated by NeoCard._calcTier()
 *
 * Fusion Bonus:
 *   Each fusion earns a configurable bonus on top of combined points,
 *   rewarding users for committing cards to the fusion process.
 */
contract NeoCardFusion is Ownable, ReentrancyGuard {

    // ─── State ────────────────────────────────────────────────────────────────

    NeoCard public immutable neoCard;

    /// @notice Flat NeoPoints bonus added to every fusion
    uint256 public fusionBonus = 500;

    /// @notice Total fusions performed (global counter)
    uint256 public totalFusions;

    /// @notice Per-address fusion count
    mapping(address => uint256) public fusionCount;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Fused(
        address indexed user,
        uint256 indexed burnedA,
        uint256 indexed burnedB,
        uint256 mintedTokenId,
        uint256 totalPoints,
        uint256 totalBadges,
        uint8   newTier
    );

    event FusionBonusUpdated(uint256 oldBonus, uint256 newBonus);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOwnerOfBothCards();
    error CannotFuseSameCard();
    error FusionFactoryNotSet();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address neoCardAddress, address initialOwner)
        Ownable(initialOwner)
    {
        neoCard = NeoCard(neoCardAddress);
    }

    // ─── Core: Fuse ───────────────────────────────────────────────────────────

    /**
     * @notice Fuse two NeoCards into one upgraded card.
     * @param tokenA First NeoCard token ID (will be burned)
     * @param tokenB Second NeoCard token ID (will be burned)
     * @return newTokenId The token ID of the newly minted fused card
     */
    function fuse(uint256 tokenA, uint256 tokenB)
        external
        nonReentrant
        returns (uint256 newTokenId)
    {
        // Validate
        if (tokenA == tokenB) revert CannotFuseSameCard();

        address caller = msg.sender;
        if (neoCard.ownerOf(tokenA) != caller || neoCard.ownerOf(tokenB) != caller) {
            revert NotOwnerOfBothCards();
        }

        // Read card data before burning
        NeoCard.CardData memory dataA = neoCard.getCardData(tokenA);
        NeoCard.CardData memory dataB = neoCard.getCardData(tokenB);

        // Combine stats
        uint256 mergedPoints = dataA.neoPoints + dataB.neoPoints + fusionBonus;
        uint256 mergedBadges = dataA.badgeCount + dataB.badgeCount;

        // Burn both cards
        neoCard.burn(tokenA);
        neoCard.burn(tokenB);

        // Mint fused card
        newTokenId = neoCard.mint(caller, mergedPoints, mergedBadges);

        // Track
        totalFusions++;
        fusionCount[caller]++;

        uint8 newTier = neoCard.tierOf(newTokenId);

        emit Fused(caller, tokenA, tokenB, newTokenId, mergedPoints, mergedBadges, newTier);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Preview what a fusion would produce without executing it.
     */
    function previewFusion(uint256 tokenA, uint256 tokenB)
        external
        view
        returns (
            uint256 mergedPoints,
            uint256 mergedBadges,
            uint8   projectedTier
        )
    {
        NeoCard.CardData memory dataA = neoCard.getCardData(tokenA);
        NeoCard.CardData memory dataB = neoCard.getCardData(tokenB);

        mergedPoints  = dataA.neoPoints + dataB.neoPoints + fusionBonus;
        mergedBadges  = dataA.badgeCount + dataB.badgeCount;
        projectedTier = _calcTier(mergedPoints);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Update the fusion bonus (owner only)
    function setFusionBonus(uint256 newBonus) external onlyOwner {
        emit FusionBonusUpdated(fusionBonus, newBonus);
        fusionBonus = newBonus;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _calcTier(uint256 points) internal pure returns (uint8) {
        if (points >= 100_000) return 5;
        if (points >= 50_000)  return 4;
        if (points >= 15_000)  return 3;
        if (points >= 5_000)   return 2;
        if (points >= 1_000)   return 1;
        return 0;
    }
}
