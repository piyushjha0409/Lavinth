#!/usr/bin/env python3
"""
Test script to verify ensemble training fixes
"""

import os
import asyncio
import sys
from pathlib import Path

# Set up environment
os.environ['DATABASE_URL'] = "postgresql://lavinth-db_owner:npg_PUiFChkf82ty@ep-winter-moon-a1qzoiqe-pooler.ap-southeast-1.aws.neon.tech/lavinth-db?sslmode=require"

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from train_model import TrainingOrchestrator

async def test_ensemble_training():
    """Test the ensemble training with fixes"""
    print("🚀 Testing Lavinth ML Ensemble Training")
    print("=" * 50)
    
    try:
        # Create orchestrator with default config
        orchestrator = TrainingOrchestrator()
        
        # Override some settings for testing
        orchestrator.config['data_config']['days_back'] = 7
        orchestrator.config['data_config']['min_samples'] = 1000
        
        print("📊 Stage 1: Data loading...")
        data_results = await orchestrator._stage_data_loading()
        
        if not data_results['success']:
            print(f"❌ Data loading failed: {data_results.get('error', 'Unknown error')}")
            return
            
        print(f"✅ Data loaded: {data_results['data_shape']}")
        
        print("\n🔧 Stage 2: Feature engineering...")
        feature_results = await orchestrator._stage_feature_engineering(data_results['data'])
        
        if not feature_results['success']:
            print(f"❌ Feature engineering failed: {feature_results.get('error', 'Unknown error')}")
            return
            
        print(f"✅ Features extracted: {feature_results['features'].shape}")
        
        print("\n🤖 Stage 3: Model training...")
        training_results = await orchestrator._stage_model_training(
            feature_results['features'], 
            feature_results['labels']
        )
        
        if training_results['success']:
            print("✅ Model training completed successfully!")
            print(f"   XGBoost AUC: {training_results.get('results', {}).get('xgb', {}).get('validation_auc', 'N/A')}")
            print(f"   LSTM AUC: {training_results.get('results', {}).get('lstm', {}).get('validation_auc', 'N/A')}")
            print(f"   Ensemble AUC: {training_results.get('results', {}).get('ensemble', {}).get('validation_auc', 'N/A')}")
        else:
            print(f"❌ Model training failed: {training_results.get('error', 'Unknown error')}")
        
        print("\n🎯 Test completed!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ensemble_training())
