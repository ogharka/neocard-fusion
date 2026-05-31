const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NeoCard + NeoCardFusion", function () {
  let neoCard, fusion;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy NeoCard
    const NeoCard = await ethers.getContractFactory("NeoCard");
    neoCard = await NeoCard.deploy(owner.address);
    await neoCard.waitForDeployment();

    // Deploy NeoCardFusion
    const NeoCardFusion = await ethers.getContractFactory("NeoCardFusion");
    fusion = await NeoCardFusion.deploy(await neoCard.getAddress(), owner.address);
    await fusion.waitForDeployment();

    // Wire up
    await neoCard.setFusionFactory(await fusion.getAddress());
  });

  // ─── NeoCard: Minting ──────────────────────────────────────────────────────

  describe("NeoCard minting", function () {
    it("owner can mint a card", async function () {
      await neoCard.mint(alice.address, 2000, 3);
      expect(await neoCard.balanceOf(alice.address)).to.equal(1);
    });

    it("minted card has correct data", async function () {
      await neoCard.mint(alice.address, 5000, 5);
      const data = await neoCard.getCardData(0);
      expect(data.neoPoints).to.equal(5000);
      expect(data.badgeCount).to.equal(5);
      expect(data.tier).to.equal(2); // Silver
    });

    it("tier is correctly assigned at mint", async function () {
      await neoCard.mint(alice.address, 0, 0);       // Starter
      await neoCard.mint(alice.address, 1000, 0);    // Bronze
      await neoCard.mint(alice.address, 5000, 0);    // Silver
      await neoCard.mint(alice.address, 15000, 0);   // Gold
      await neoCard.mint(alice.address, 50000, 0);   // Platinum
      await neoCard.mint(alice.address, 100000, 0);  // Elite

      const tiers = await Promise.all([0, 1, 2, 3, 4, 5].map((id) => neoCard.tierOf(id)));
      expect(tiers.map(Number)).to.deep.equal([0, 1, 2, 3, 4, 5]);
    });

    it("random address cannot mint", async function () {
      await expect(
        neoCard.connect(alice).mint(alice.address, 1000, 1)
      ).to.be.revertedWithCustomError(neoCard, "NotFusionFactory");
    });
  });

  // ─── NeoCard: Burning ─────────────────────────────────────────────────────

  describe("NeoCard burning", function () {
    it("owner of card can burn it", async function () {
      await neoCard.mint(alice.address, 1000, 2);
      await neoCard.connect(alice).burn(0);
      expect(await neoCard.balanceOf(alice.address)).to.equal(0);
    });

    it("non-owner cannot burn card", async function () {
      await neoCard.mint(alice.address, 1000, 2);
      await expect(
        neoCard.connect(bob).burn(0)
      ).to.be.revertedWithCustomError(neoCard, "NotTokenOwner");
    });
  });

  // ─── NeoCardFusion: Core ──────────────────────────────────────────────────

  describe("Fusion", function () {
    beforeEach(async function () {
      // Mint two cards for alice
      await neoCard.mint(alice.address, 3000, 4);  // token 0
      await neoCard.mint(alice.address, 2000, 3);  // token 1
    });

    it("fuses two cards into one", async function () {
      await fusion.connect(alice).fuse(0, 1);
      // Both originals burned
      expect(await neoCard.balanceOf(alice.address)).to.equal(1);
    });

    it("fused card has combined points + bonus", async function () {
      const bonus = await fusion.fusionBonus();
      await fusion.connect(alice).fuse(0, 1);

      const newTokenId = 2; // next token after 0,1
      const data = await neoCard.getCardData(newTokenId);

      expect(data.neoPoints).to.equal(3000n + 2000n + bonus);
      expect(data.badgeCount).to.equal(7); // 4 + 3
    });

    it("fused card tier is upgraded correctly", async function () {
      // 3000 + 2000 + 500 bonus = 5500 → Silver (tier 2)
      await fusion.connect(alice).fuse(0, 1);
      expect(await neoCard.tierOf(2)).to.equal(2);
    });

    it("emits Fused event", async function () {
      await expect(fusion.connect(alice).fuse(0, 1))
        .to.emit(fusion, "Fused")
        .withArgs(alice.address, 0, 1, 2, 3000n + 2000n + 500n, 7, 2);
    });

    it("increments fusion counters", async function () {
      await fusion.connect(alice).fuse(0, 1);
      expect(await fusion.totalFusions()).to.equal(1);
      expect(await fusion.fusionCount(alice.address)).to.equal(1);
    });

    it("reverts if caller doesn't own both cards", async function () {
      await neoCard.mint(bob.address, 500, 1); // token 2 — owned by bob
      await expect(
        fusion.connect(alice).fuse(0, 2)
      ).to.be.revertedWithCustomError(fusion, "NotOwnerOfBothCards");
    });

    it("reverts if same card passed twice", async function () {
      await expect(
        fusion.connect(alice).fuse(0, 0)
      ).to.be.revertedWithCustomError(fusion, "CannotFuseSameCard");
    });
  });

  // ─── NeoCardFusion: Preview ───────────────────────────────────────────────

  describe("previewFusion", function () {
    it("returns correct preview without mutating state", async function () {
      await neoCard.mint(alice.address, 4000, 2); // token 0
      await neoCard.mint(alice.address, 6000, 5); // token 1

      const [points, badges, tier] = await fusion.previewFusion(0, 1);
      // 4000 + 6000 + 500 = 10500 → still Silver (>5000) ... no, 10500 < 15000 → Silver
      expect(points).to.equal(10500n);
      expect(badges).to.equal(7n);
      expect(tier).to.equal(2); // Silver

      // Cards still exist
      expect(await neoCard.balanceOf(alice.address)).to.equal(2);
    });
  });

  // ─── Admin ────────────────────────────────────────────────────────────────

  describe("Admin: fusionBonus", function () {
    it("owner can update fusion bonus", async function () {
      await expect(fusion.setFusionBonus(1000))
        .to.emit(fusion, "FusionBonusUpdated")
        .withArgs(500, 1000);
      expect(await fusion.fusionBonus()).to.equal(1000);
    });

    it("non-owner cannot update bonus", async function () {
      await expect(
        fusion.connect(alice).setFusionBonus(0)
      ).to.be.revertedWithCustomError(fusion, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Multi-fusion chain ───────────────────────────────────────────────────

  describe("Multi-fusion chain", function () {
    it("supports chaining multiple fusions to reach Elite tier", async function () {
      // Mint 4 cards with 25000 points each
      for (let i = 0; i < 4; i++) {
        await neoCard.mint(alice.address, 25_000, 10);
      }
      // First fusion: tokens 0+1 → token 4  (50000 + 500 bonus = 50500 → Platinum)
      await fusion.connect(alice).fuse(0, 1);
      // Second fusion: tokens 2+3 → token 5  (50500 → Platinum)
      await fusion.connect(alice).fuse(2, 3);
      // Third fusion: tokens 4+5 → token 6  (101000+ → Elite)
      await fusion.connect(alice).fuse(4, 5);

      expect(await neoCard.tierOf(6)).to.equal(5); // Elite
      expect(await fusion.totalFusions()).to.equal(3);
    });
  });
});
