const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  // Owner = OWNER_ADDRESS env var (your main wallet) or falls back to deployer
  // ethers.getAddress() checksums it and bypasses ENS resolution on custom networks
  const ownerAddress = ethers.getAddress(process.env.OWNER_ADDRESS || deployer.address);

  console.log("Deploy wallet:  ", deployer.address);
  console.log("Contract owner: ", ownerAddress);
  if (ownerAddress === deployer.address) {
    console.warn("⚠️  No OWNER_ADDRESS set — deployer is also the owner.");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deploy wallet balance:", ethers.formatEther(balance), "OPN\n");

  // 1. Deploy NeoCard — deployer is temporary owner so it can wire things up
  console.log("Deploying NeoCard...");
  const NeoCard = await ethers.getContractFactory("NeoCard");
  const neoCard = await NeoCard.deploy(deployer.address);
  await neoCard.waitForDeployment();
  const neoCardAddress = await neoCard.getAddress();
  console.log("NeoCard deployed to:", neoCardAddress);

  // 2. Deploy NeoCardFusion — deployer is temporary owner
  console.log("\nDeploying NeoCardFusion...");
  const NeoCardFusion = await ethers.getContractFactory("NeoCardFusion");
  const fusion = await NeoCardFusion.deploy(neoCardAddress, deployer.address);
  await fusion.waitForDeployment();
  const fusionAddress = await fusion.getAddress();
  console.log("NeoCardFusion deployed to:", fusionAddress);

  // 3. Wire — deployer owns both contracts so this works
  console.log("\nSetting fusion factory on NeoCard...");
  const tx = await neoCard.setFusionFactory(fusionAddress);
  await tx.wait();
  console.log("Done.");

  // 4. Transfer ownership of both contracts to main wallet
  if (ownerAddress !== deployer.address) {
    console.log("\nTransferring ownership to main wallet...");
    const tx1 = await neoCard.transferOwnership(ownerAddress);
    await tx1.wait();
    console.log("NeoCard ownership transferred.");
    const tx2 = await fusion.transferOwnership(ownerAddress);
    await tx2.wait();
    console.log("NeoCardFusion ownership transferred.");
  }

  console.log("\n=== Deployment Summary ===");
  console.log(`NeoCard:       ${neoCardAddress}`);
  console.log(`NeoCardFusion: ${fusionAddress}`);
  console.log("==========================\n");

  // Save addresses for use in tests / frontend
  const fs = require("fs");
  const addresses = { NeoCard: neoCardAddress, NeoCardFusion: fusionAddress };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("Addresses saved to deployed-addresses.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
