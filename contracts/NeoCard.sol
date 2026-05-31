// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NeoCard
 * @notice Dynamic NFT representing a user's IOPn loyalty passport.
 *         Stores NeoPoints, badge count, and tier — all of which evolve
 *         through participation and fusion.
 *
 * Tiers (mirrors IOPn ecosystem):
 *   0 = Starter
 *   1 = Bronze
 *   2 = Silver
 *   3 = Gold
 *   4 = Platinum
 *   5 = Elite
 */
contract NeoCard is ERC721, ERC721Enumerable, Ownable {

    // ─── Storage ──────────────────────────────────────────────────────────────

    struct CardData {
        uint256 neoPoints;   // Combined Pure + Earned NeoPoints
        uint256 badgeCount;  // Total badges held on this card
        uint8   tier;        // 0–5, auto-calculated from neoPoints
        uint256 mintedAt;    // Block timestamp when originally minted
    }

    uint256 private _nextTokenId;

    mapping(uint256 => CardData) public cards;

    /// @notice Only the FusionFactory contract can mint fused cards or burn
    address public fusionFactory;

    // ─── Tier thresholds (NeoPoints required) ─────────────────────────────────
    uint256 public constant TIER_BRONZE   = 1_000;
    uint256 public constant TIER_SILVER   = 5_000;
    uint256 public constant TIER_GOLD     = 15_000;
    uint256 public constant TIER_PLATINUM = 50_000;
    uint256 public constant TIER_ELITE    = 100_000;

    // ─── Events ───────────────────────────────────────────────────────────────
    event CardMinted(address indexed to, uint256 indexed tokenId, uint256 neoPoints, uint256 badgeCount);
    event CardBurned(uint256 indexed tokenId);
    event FusionFactorySet(address indexed factory);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error NotFusionFactory();
    error NotTokenOwner();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address initialOwner)
        ERC721("IOPn NeoCard", "NEOCARD")
        Ownable(initialOwner)
    {}

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Set the fusion factory address (only callable by owner)
    function setFusionFactory(address factory) external onlyOwner {
        fusionFactory = factory;
        emit FusionFactorySet(factory);
    }

    // ─── Mint ─────────────────────────────────────────────────────────────────

    /**
     * @notice Mint a new NeoCard. Called by owner (for initial distribution)
     *         or by the FusionFactory (for fused cards).
     */
    function mint(
        address to,
        uint256 neoPoints,
        uint256 badgeCount
    ) external returns (uint256 tokenId) {
        if (msg.sender != owner() && msg.sender != fusionFactory) {
            revert NotFusionFactory();
        }

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        cards[tokenId] = CardData({
            neoPoints:  neoPoints,
            badgeCount: badgeCount,
            tier:       _calcTier(neoPoints),
            mintedAt:   block.timestamp
        });

        emit CardMinted(to, tokenId, neoPoints, badgeCount);
    }

    // ─── Burn ─────────────────────────────────────────────────────────────────

    /**
     * @notice Burn a card. Only callable by the FusionFactory or the token owner.
     */
    function burn(uint256 tokenId) external {
        if (msg.sender != fusionFactory && msg.sender != ownerOf(tokenId)) {
            revert NotTokenOwner();
        }
        delete cards[tokenId];
        _burn(tokenId);
        emit CardBurned(tokenId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getCardData(uint256 tokenId) external view returns (CardData memory) {
        return cards[tokenId];
    }

    function tierOf(uint256 tokenId) external view returns (uint8) {
        return cards[tokenId].tier;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _calcTier(uint256 points) internal pure returns (uint8) {
        if (points >= TIER_ELITE)    return 5;
        if (points >= TIER_PLATINUM) return 4;
        if (points >= TIER_GOLD)     return 3;
        if (points >= TIER_SILVER)   return 2;
        if (points >= TIER_BRONZE)   return 1;
        return 0;
    }

    // ─── Overrides required by Solidity ───────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
