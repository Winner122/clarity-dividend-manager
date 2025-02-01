import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Test multi-token dividend distribution",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Add supported tokens
        let tokenBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'add-supported-token', [
                types.ascii("STX")
            ], deployer.address),
            Tx.contractCall('dividend-manager', 'add-supported-token', [
                types.ascii("USDA")
            ], deployer.address)
        ]);
        
        tokenBlock.receipts.forEach(receipt => {
            receipt.result.expectOk();
        });
        
        let block = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'issue-shares', [
                types.uint(1000),
                types.principal(wallet1.address)
            ], deployer.address),
            Tx.contractCall('dividend-manager', 'issue-shares', [
                types.uint(2000),
                types.principal(wallet2.address)
            ], deployer.address)
        ]);
        
        block.receipts.forEach(receipt => {
            receipt.result.expectOk();
        });

        // Declare dividends in multiple tokens
        let dividendBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'declare-dividends', [
                types.uint(3000),
                types.uint(1),
                types.ascii("STX")
            ], deployer.address),
            Tx.contractCall('dividend-manager', 'declare-dividends', [
                types.uint(6000),
                types.uint(1),
                types.ascii("USDA") 
            ], deployer.address)
        ]);
        
        dividendBlock.receipts.forEach(receipt => {
            receipt.result.expectOk();
        });
        
        // Test dividend claims for both tokens
        let claimBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'claim-dividends', [
                types.uint(1),
                types.ascii("STX")
            ], wallet1.address),
            Tx.contractCall('dividend-manager', 'claim-dividends', [
                types.uint(1),
                types.ascii("USDA")
            ], wallet1.address)
        ]);
        
        claimBlock.receipts.forEach(receipt => {
            receipt.result.expectOk();
        });
        
        // Verify claimed status for multiple tokens
        let statusBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'is-dividend-claimed', [
                types.principal(wallet1.address),
                types.uint(1),
                types.ascii("STX")
            ], deployer.address),
            Tx.contractCall('dividend-manager', 'is-dividend-claimed', [
                types.principal(wallet1.address),
                types.uint(1),
                types.ascii("USDA")
            ], deployer.address)
        ]);
        
        statusBlock.receipts.forEach(receipt => {
            assertEquals(receipt.result.expectOk(), true);
        });

        // Test unsupported token
        let invalidBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'declare-dividends', [
                types.uint(1000),
                types.uint(1),
                types.ascii("INVALID")
            ], deployer.address)
        ]);

        invalidBlock.receipts[0].result.expectErr(types.uint(106)); // err-invalid-token
    }
});
