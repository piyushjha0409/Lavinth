#!/usr/bin/env python3
"""
Main Training Script for Lavinth ML Model
Orchestrates the complete training pipeline
"""

import asyncio
import argparse
import logging
import json
import os
from datetime import datetime
from pathlib import Path
import sys
import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from data_loader import DataLoader, DataValidator
from feature_engineering import FeatureEngineer, FeatureConfig
from training_pipeline import EnsembleModel
from model_evaluation import ModelEvaluator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TrainingOrchestrator:
    """
    Orchestrates the complete ML training pipeline
    """
    
    def __init__(self, config_path: str = None):
        self.config = self._load_config(config_path)
        self.data_loader = DataLoader()
        self.feature_engineer = FeatureEngineer(FeatureConfig())
        self.model = EnsembleModel(self.config.get('model_config'))
        self.evaluator = ModelEvaluator()
        
        # Create output directories
        self.output_dir = Path(self.config.get('output_dir', 'ml_output'))
        self.output_dir.mkdir(exist_ok=True)
        
        self.models_dir = self.output_dir / 'models'
        self.models_dir.mkdir(exist_ok=True)
        
        self.reports_dir = self.output_dir / 'reports'
        self.reports_dir.mkdir(exist_ok=True)
    
    def _load_config(self, config_path: str) -> dict:
        """Load training configuration"""
        default_config = {
            'data_config': {
                'days_back': 30,
                'min_samples': 1000,
                'balance_ratio': 0.3,
                'validation_split': 0.2,
                'test_split': 0.2
            },
            'feature_config': {
                'time_windows': ['1h', '6h', '24h', '7d'],
                'sequence_length': 10,
                'min_sequence_length': 3
            },
            'model_config': {
                'xgb_params': {
                    'objective': 'binary:logistic',
                    'eval_metric': 'auc',
                    'max_depth': 6,
                    'learning_rate': 0.1,
                    'n_estimators': 100,
                    'random_state': 42
                },
                'lstm_params': {
                    'hidden_size': 64,
                    'num_layers': 2,
                    'dropout': 0.2,
                    'sequence_length': 10,
                    'batch_size': 32,
                    'epochs': 50,
                    'learning_rate': 0.001
                }
            },
            'output_dir': 'ml_output',
            'save_intermediate': True,
            'enable_hyperparameter_tuning': True
        }
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with default config
                default_config.update(user_config)
        
        return default_config
    
    async def run_training_pipeline(self) -> dict:
        """Run the complete training pipeline"""
        logger.info("Starting Lavinth ML training pipeline...")
        
        pipeline_results = {
            'start_time': datetime.now().isoformat(),
            'config': self.config,
            'stages': {}
        }
        
        try:
            # Stage 1: Data Loading and Validation
            logger.info("Stage 1: Loading and validating data...")
            data_results = await self._stage_data_loading()
            pipeline_results['stages']['data_loading'] = data_results
            
            if not data_results['success']:
                raise Exception("Data loading failed")
            
            # Stage 2: Feature Engineering
            logger.info("Stage 2: Feature engineering...")
            feature_results = await self._stage_feature_engineering(data_results['data'])
            pipeline_results['stages']['feature_engineering'] = feature_results
            
            if not feature_results['success']:
                raise Exception("Feature engineering failed")
            
            # Stage 3: Model Training
            logger.info("Stage 3: Model training...")
            training_results = await self._stage_model_training(
                feature_results['features'], 
                feature_results['labels']
            )
            pipeline_results['stages']['model_training'] = training_results
            
            if not training_results['success']:
                raise Exception("Model training failed")
            
            # Stage 4: Model Evaluation
            logger.info("Stage 4: Model evaluation...")
            evaluation_results = await self._stage_model_evaluation(
                feature_results['features'],
                feature_results['labels']
            )
            pipeline_results['stages']['model_evaluation'] = evaluation_results
            
            # Stage 5: Model Saving
            logger.info("Stage 5: Saving model...")
            save_results = await self._stage_model_saving()
            pipeline_results['stages']['model_saving'] = save_results
            
            pipeline_results['success'] = True
            pipeline_results['end_time'] = datetime.now().isoformat()
            
            logger.info("Training pipeline completed successfully!")
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")
            pipeline_results['success'] = False
            pipeline_results['error'] = str(e)
            pipeline_results['end_time'] = datetime.now().isoformat()
        
        # Save pipeline results
        results_path = self.reports_dir / f"training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_path, 'w') as f:
            json.dump(pipeline_results, f, indent=2, default=str)
        
        return pipeline_results
    
    async def _stage_data_loading(self) -> dict:
        """Stage 1: Load and validate training data"""
        try:
            # Get data statistics first
            stats = await self.data_loader.get_data_statistics()
            logger.info(f"Database statistics: {stats}")
            
            # Load training data
            data_config = self.config['data_config']
            training_data = await self.data_loader.load_training_data(
                days_back=data_config['days_back'],
                min_samples=data_config['min_samples'],
                balance_ratio=data_config['balance_ratio']
            )
            
            if training_data.empty:
                return {
                    'success': False,
                    'error': 'No training data loaded',
                    'statistics': stats
                }
            
            # Validate data quality
            validator = DataValidator()
            validation_results = validator.validate_training_data(training_data)
            
            # Save training data if configured
            if self.config.get('save_intermediate', False):
                data_path = self.output_dir / 'training_data.parquet'
                self.data_loader.save_training_data(training_data, str(data_path))
            
            return {
                'success': validation_results['is_valid'],
                'data': training_data,
                'validation_results': validation_results,
                'statistics': stats,
                'data_shape': training_data.shape
            }
            
        except Exception as e:
            logger.error(f"Data loading stage failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _stage_feature_engineering(self, data: 'pd.DataFrame') -> dict:
        """Stage 2: Extract features from raw data"""
        try:
            # Extract features
            features_df = self.feature_engineer.extract_all_features(data)
            
            # Create labels
            labels = self._create_training_labels(data)
            
            # Remove non-feature columns
            feature_columns = [col for col in features_df.columns 
                             if col not in ['signature', 'timestamp', 'sender', 'recipient']]
            
            X = features_df[feature_columns].fillna(0)
            y = labels
            
            # Feature statistics
            feature_stats = {
                'total_features': len(feature_columns),
                'feature_groups': self.feature_engineer.get_feature_importance_groups(),
                'missing_values': X.isnull().sum().to_dict(),
                'feature_ranges': {
                    col: {'min': float(X[col].min()), 'max': float(X[col].max())}
                    for col in X.select_dtypes(include=[np.number]).columns
                }
            }
            
            # Save features if configured
            if self.config.get('save_intermediate', False):
                features_path = self.output_dir / 'features.parquet'
                X.to_parquet(features_path, index=False)
                
                labels_path = self.output_dir / 'labels.parquet'
                y.to_frame('label').to_parquet(labels_path, index=False)
            
            return {
                'success': True,
                'features': X,
                'labels': y,
                'feature_columns': feature_columns,
                'feature_statistics': feature_stats
            }
            
        except Exception as e:
            logger.error(f"Feature engineering stage failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_training_labels(self, data: 'pd.DataFrame') -> 'pd.Series':
        """Create training labels from existing detection results"""
        import pandas as pd
        
        labels = pd.Series(0, index=data.index)
        
        # High confidence positive labels
        if 'is_potential_dust' in data.columns:
            dust_mask = data['is_potential_dust']
            labels[dust_mask] = 1
            
        if 'is_potential_poisoning' in data.columns:
            poison_mask = data['is_potential_poisoning']
            labels[poison_mask] = 1
        
        # Use risk scores if available
        if 'risk_score' in data.columns:
            high_risk_mask = data['risk_score'] > 0.7
            labels[high_risk_mask] = 1
        
        logger.info(f"Created labels: {labels.sum()} positive, {(labels == 0).sum()} negative")
        return labels
    
    async def _stage_model_training(self, X: 'pd.DataFrame', y: 'pd.Series') -> dict:
        """Stage 3: Train the ensemble model"""
        try:
            # Prepare data for training
            X_prepared, y_prepared = self.model.prepare_data_from_features(X, y)
            
            # Train the model
            training_results = self.model.train(X_prepared, y_prepared)
            
            return {
                'success': True,
                'training_results': training_results,
                'model_weights': self.model.model_weights
            }
            
        except Exception as e:
            logger.error(f"Model training stage failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _stage_model_evaluation(self, X: 'pd.DataFrame', y: 'pd.Series') -> dict:
        """Stage 4: Evaluate the trained model"""
        try:
            # Comprehensive model evaluation
            evaluation_results = self.evaluator.evaluate_model(self.model, X, y)
            
            # Generate evaluation report
            report_path = self.reports_dir / f"evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_path, 'w') as f:
                json.dump(evaluation_results, f, indent=2, default=str)
            
            return {
                'success': True,
                'evaluation_results': evaluation_results,
                'report_path': str(report_path)
            }
            
        except Exception as e:
            logger.error(f"Model evaluation stage failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _stage_model_saving(self) -> dict:
        """Stage 5: Save the trained model"""
        try:
            # Save the ensemble model
            model_path = self.models_dir / f"lavinth_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
            self.model.save_model(str(model_path))
            
            # Save model metadata
            metadata = {
                'model_path': str(model_path),
                'training_time': datetime.now().isoformat(),
                'feature_columns': self.model.feature_columns,
                'model_weights': self.model.model_weights,
                'config': self.config
            }
            
            metadata_path = self.models_dir / f"model_metadata_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2, default=str)
            
            return {
                'success': True,
                'model_path': str(model_path),
                'metadata_path': str(metadata_path)
            }
            
        except Exception as e:
            logger.error(f"Model saving stage failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Add the missing method to EnsembleModel
class ExtendedEnsembleModel(EnsembleModel):
    """Extended ensemble model with additional utility methods"""
    
    def prepare_data_from_features(self, X: 'pd.DataFrame', y: 'pd.Series') -> tuple:
        """Prepare already extracted features for training"""
        # Store feature columns
        self.feature_columns = list(X.columns)
        
        # Handle missing values
        X_clean = X.fillna(0)
        
        return X_clean, y

def main():
    """Main training function"""
    parser = argparse.ArgumentParser(description='Train Lavinth ML Model')
    parser.add_argument('--config', type=str, help='Path to configuration file')
    parser.add_argument('--output-dir', type=str, default='ml_output', help='Output directory')
    parser.add_argument('--days-back', type=int, default=30, help='Days of data to use for training')
    parser.add_argument('--min-samples', type=int, default=1000, help='Minimum number of samples')
    parser.add_argument('--dry-run', action='store_true', help='Run without training (data validation only)')
    
    args = parser.parse_args()
    
    # Override config with command line arguments
    config_overrides = {
        'output_dir': args.output_dir,
        'data_config': {
            'days_back': args.days_back,
            'min_samples': args.min_samples
        }
    }
    
    # Create orchestrator
    orchestrator = TrainingOrchestrator(args.config)
    
    # Apply command line overrides
    orchestrator.config.update(config_overrides)
    
    # Replace model with extended version
    orchestrator.model = ExtendedEnsembleModel(orchestrator.config.get('model_config'))
    
    if args.dry_run:
        logger.info("Running in dry-run mode (validation only)")
        # Run only data loading and validation
        async def dry_run():
            data_results = await orchestrator._stage_data_loading()
            print(f"Data validation results: {data_results}")
        
        asyncio.run(dry_run())
    else:
        # Run full training pipeline
        results = asyncio.run(orchestrator.run_training_pipeline())
        
        if results['success']:
            print("✅ Training completed successfully!")
            print(f"📊 Results saved to: {orchestrator.reports_dir}")
            print(f"🤖 Model saved to: {orchestrator.models_dir}")
        else:
            print("❌ Training failed!")
            print(f"Error: {results.get('error', 'Unknown error')}")
            sys.exit(1)

if __name__ == "__main__":
    main()
