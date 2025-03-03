Clarinet.test({
  name: "Test enhanced dividend manager functionality",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Test claim amount preview
    let previewBlock = chain.mineBlock([
      Tx.contractCall('dividend-manager', 'get-claimable-amount', [
        types.uint(1),
        types.ascii("STX")
      ], wallet1.address)
    ]);
    
    previewBlock.receipts[0].result.expectOk();
    
    // Test batch size limit
    let largeBatchBlock = chain.mineBlock([
      Tx.contractCall('dividend-manager', 'batch-claim-dividends', [
        types.list(Array(21).fill(types.uint(1))),
        types.ascii("STX")
      ], wallet1.address)
    ]);
    
    largeBatchBlock.receipts[0].result.expectErr(types.uint(109));
    
    // Previous tests remain...
    // [Previous test content]
  }
});
