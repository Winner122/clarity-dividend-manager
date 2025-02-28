// [Previous test content remains...]

Clarinet.test({
  name: "Test batch dividend claims and deadline functionality",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Set claim deadline
    let deadlineBlock = chain.mineBlock([
      Tx.contractCall('dividend-manager', 'set-claim-deadline', [
        types.uint(1000)
      ], deployer.address)
    ]);
    
    deadlineBlock.receipts[0].result.expectOk();
    
    // Test batch claims
    let batchBlock = chain.mineBlock([
      Tx.contractCall('dividend-manager', 'batch-claim-dividends', [
        types.list([types.uint(1), types.uint(2), types.uint(3)]),
        types.ascii("STX")
      ], wallet1.address)
    ]);
    
    batchBlock.receipts[0].result.expectOk();
    
    // Test deadline enforcement
    chain.mineEmptyBlockUntil(1001);
    
    let lateBlock = chain.mineBlock([
      Tx.contractCall('dividend-manager', 'claim-dividends', [
        types.uint(4),
        types.ascii("STX")
      ], wallet1.address)
    ]);
    
    lateBlock.receipts[0].result.expectErr(types.uint(107)); // err-deadline-passed
  }
});
