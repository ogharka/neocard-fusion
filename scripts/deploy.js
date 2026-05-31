const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // 1. Deploy NeoCard
  console.log("Deploying NeoCard...");
  const NeoCard = await ethers.getContractFactory("NeoCard");
  const neoCard = await NeoCard.deploy(deployer.address);
  await neoCard.waitForDeployment();
  const neoCardAddress = await neoCard.getAddress();
  console.log("NeoCard deployed to:", neoCardAddress);

  // 2. Deploy NeoCardFusion
  console.log("\nDeploying NeoCardFusion...");
  const NeoCardFusion = await ethers.getContractFactory("NeoCardFusion");
  const fusion = await NeoCardFusion.deploy(neoCardAddress, deployer.address);
  await fusion.waitForDeployment();
  const fusionAddress = await fusion.getAddress();
  console.log("NeoCardFusion deployed to:", fusionAddress);

  // 3. Wire them up — grant FusionFactory role to NeoCardFusion
  console.log("\nSetting fusion factory on NeoCard...");
  const tx = await neoCard.setFusionFactory(fusionAddress);
  await tx.wait();
  console.log("Done.");

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
