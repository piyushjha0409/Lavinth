/**
 * Lavinth SDK Quick Start
 *
 * This example demonstrates basic usage of the Lavinth SDK
 * for wallet security operations without React.
 */

import { Lavinth, LavinthError } from '@lavinth/sdk';

async function main() {
  // =============================================================================
  // Initialize the SDK
  // =============================================================================

  const lavinth = new Lavinth({
    apiKey: 'your-api-key-here',
    baseUrl: 'https://api.lavinth.io', // or your self-hosted backend
    timeout: 30000,
    retries: 3,
  });

  const walletAddress = 'YOUR_WALLET_ADDRESS';

  try {
    // =============================================================================
    // 1. Get Security Profile
    // =============================================================================

    console.log('Fetching security profile...');
    const profile = await shield.getSecurityProfile(walletAddress);

    console.log('Security Profile:', {
      riskLevel: profile.riskLevel,
      riskScore: profile.riskScore,
      threats: profile.threatMetrics,
    });

    // =============================================================================
    // 2. Check for Compromise
    // =============================================================================

    console.log('\nAnalyzing for compromise...');
    const analysis = await shield.analyzeCompromise(walletAddress);

    if (analysis.isCompromised) {
      console.log('⚠️ WALLET MAY BE COMPROMISED!');
      console.log('Risk Score:', analysis.riskScore);
      console.log('Indicators:', analysis.indicators.map((i) => i.type).join(', '));
      console.log('Alerts:', analysis.alerts.length);

      // Handle alerts
      for (const alert of analysis.alerts) {
        console.log(`  - [${alert.severity}] ${alert.type}: ${alert.description}`);
      }
    } else {
      console.log('✅ No compromise detected');
    }

    // =============================================================================
    // 3. Scan Token Approvals
    // =============================================================================

    console.log('\nScanning token approvals...');
    const approvals = await shield.getApprovals(walletAddress);

    console.log(`Found ${approvals.length} approvals`);

    const highRisk = approvals.filter(
      (a) => a.riskLevel === 'critical' || a.riskLevel === 'high'
    );

    if (highRisk.length > 0) {
      console.log(`⚠️ ${highRisk.length} high-risk approvals found!`);

      for (const approval of highRisk) {
        console.log(`  - ${approval.tokenSymbol}: ${approval.spenderLabel || approval.spenderAddress}`);
        console.log(`    Risk: ${approval.riskLevel}, Unlimited: ${approval.isUnlimited}`);
      }

      // =============================================================================
      // 4. Emergency Revocation (if compromised)
      // =============================================================================

      if (analysis.isCompromised) {
        console.log('\n🚨 Initiating emergency revocation...');

        const revocationResult = await shield.emergencyRevoke(walletAddress);

        console.log('Session ID:', revocationResult.sessionId);
        console.log('Transactions to sign:', revocationResult.transactions.length);

        // In a real app, you would sign and submit these transactions
        for (const tx of revocationResult.transactions) {
          console.log(`  - Revoke ${tx.tokenSymbol} approval to ${tx.spenderAddress.slice(0, 8)}...`);
          // const signature = await wallet.signTransaction(tx.serializedTransaction);
          // await connection.sendRawTransaction(signature);
        }
      }
    }

    // =============================================================================
    // 5. Start Fund Tracing (if funds were stolen)
    // =============================================================================

    const stolenAmount = 10.5; // Example: 10.5 SOL stolen

    console.log('\nStarting fund trace...');
    const trace = await shield.startFundTrace(walletAddress, stolenAmount);

    console.log('Trace ID:', trace.traceId);
    console.log('Status:', trace.status);
    console.log('Hops found:', trace.hops.length);

    // Check if funds hit an exchange
    const exchangeHops = trace.hops.filter((h) => h.entityType === 'exchange');

    if (exchangeHops.length > 0) {
      console.log('\n💰 Funds detected at exchanges!');

      for (const hop of exchangeHops) {
        console.log(`  - ${hop.entityLabel}: ${hop.amount} ${trace.tokenSymbol || 'SOL'}`);

        // =============================================================================
        // 6. Create Freeze Request
        // =============================================================================

        console.log(`\nCreating freeze request for ${hop.entityLabel}...`);

        const freezeRequest = await shield.createFreezeRequest({
          traceId: trace.traceId,
          exchangeName: hop.entityLabel || 'Unknown',
          depositAddress: hop.address,
          depositSignature: hop.transactionSignature || '',
          amount: hop.amount,
          victimWallet: walletAddress,
        });

        console.log('Request ID:', freezeRequest.requestId);
        console.log('Status:', freezeRequest.status);
        console.log('Priority:', freezeRequest.priority);

        // Generate evidence package
        const evidence = await shield.generateEvidencePackage(
          freezeRequest.requestId,
          trace.traceId,
          walletAddress,
          'Funds were stolen via malicious approval exploit'
        );

        console.log('\nEvidence package generated:', evidence.evidenceId);
        console.log('Includes:');
        console.log('  - Blockchain evidence:', evidence.blockchainEvidence.length, 'items');
        console.log('  - Chain of custody:', evidence.chainOfCustody.length, 'hops');
        console.log('  - Verifiable hash:', evidence.verificationHash);

        // Generate email template
        const email = await shield.generateFreezeRequestEmail(freezeRequest.requestId);

        console.log('\nEmail template ready:');
        console.log('  To:', email.recipientEmail);
        console.log('  Subject:', email.subject);
      }
    }

    // =============================================================================
    // 7. Generate Recovery Report
    // =============================================================================

    console.log('\nGenerating recovery report...');
    const report = await shield.generateRecoveryReport(trace.traceId);

    console.log('Recovery Probability:', report.recoveryProbability + '%');
    console.log('Recommendations:');
    for (const rec of report.recommendations.slice(0, 3)) {
      console.log(`  - [${rec.priority}] ${rec.action}`);
    }

    // =============================================================================
    // Summary
    // =============================================================================

    console.log('\n========================================');
    console.log('SECURITY SUMMARY');
    console.log('========================================');
    console.log(`Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`);
    console.log(`Risk Level: ${profile.riskLevel}`);
    console.log(`Compromised: ${analysis.isCompromised ? 'YES' : 'No'}`);
    console.log(`High-Risk Approvals: ${highRisk.length}`);
    console.log(`Funds Traced: ${trace.totalAmount} ${trace.tokenSymbol || 'SOL'}`);
    console.log(`Recovery Probability: ${report.recoveryProbability}%`);

  } catch (error) {
    if (error instanceof LavinthError) {
      console.error(`Lavinth Error [${error.code}]:`, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

main();
