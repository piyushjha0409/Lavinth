# 🤖 Lavinth ML Model Implementation

## Quick Start Guide

### 1. Setup Environment

```bash
# Create Python virtual environment
python3 -m venv lavinth_ml_env
source lavinth_ml_env/bin/activate  # On Windows: lavinth_ml_env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Train Your First Model

```bash
# Basic training with default settings
python train_model.py --days-back 30 --min-samples 1000

# Training with custom configuration
python train_model.py --config config.json --output-dir ./models

# Dry run (validation only)
python train_model.py --dry-run
```

### 3. Test Model Integration

```bash
# Test inference service
python inference_service.py --model-path ./ml_output/models/lavinth_model_latest.joblib --input '{"signature":"test","timestamp":"2024-01-01T00:00:00Z","sender":"test","recipient":"test","amount":0.0001,"fee":0.000005,"success":true,"token_type":"SOL","memo_content":""}'
```

---

## 📁 File Structure

```
ml/
├── README.md                    # This file
├── requirements.txt             # Python dependencies
├── train_model.py              # Main training script
├── feature_engineering.py      # Feature extraction pipeline
├── training_pipeline.py        # ML model training
├── model_evaluation.py         # Model evaluation and validation
├── data_loader.py              # Database integration
├── inference_service.py        # Real-time inference
├── ml_integration.ts           # TypeScript integration
└── config/
    └── default_config.json     # Default configuration
```

---

## 🚀 Training Pipeline

### Step 1: Data Preparation
The system automatically:
- Loads transaction data from your PostgreSQL database
- Validates data quality and completeness
- Balances the dataset for optimal training
- Splits data temporally to prevent leakage

### Step 2: Feature Engineering
Extracts 100+ features including:
- **Transaction features**: Amount, fees, timing patterns
- **Address behavior**: Transaction frequency, recipient patterns
- **Network features**: Graph centrality, community detection
- **Temporal patterns**: Regularity, burst detection, seasonality
- **Risk indicators**: Anomaly scores, existing risk flags

### Step 3: Model Training
Trains an ensemble of:
- **XGBoost**: Primary model for structured features
- **LSTM**: Temporal sequence analysis
- **Isolation Forest**: Anomaly detection
- **Meta-model**: Combines individual predictions

### Step 4: Evaluation & Validation
Comprehensive evaluation including:
- Cross-validation with time-series splits
- Performance metrics (Precision, Recall, F1, AUC)
- Feature importance analysis
- Temporal stability testing
- Visualization generation

---

## ⚙️ Configuration

### Basic Configuration (`config.json`)

```json
{
  "data_config": {
    "days_back": 30,
    "min_samples": 1000,
    "balance_ratio": 0.3
  },
  "model_config": {
    "xgb_params": {
      "max_depth": 6,
      "learning_rate": 0.1,
      "n_estimators": 100
    },
    "lstm_params": {
      "hidden_size": 64,
      "num_layers": 2,
      "epochs": 50
    }
  },
  "output_dir": "ml_output"
}
```

### Environment Variables

```bash
# Database connection (required)
export DATABASE_URL="postgresql://user:password@localhost:5432/lavinth"

# Optional: Python path for inference
export PYTHON_PATH="/path/to/python3"

# Optional: Model storage path
export MODEL_PATH="./models"
```

---

## 📊 Model Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Precision** | >95% | TBD | 🎯 |
| **Recall** | >90% | TBD | 🎯 |
| **F1-Score** | >92% | TBD | 🎯 |
| **Inference Time** | <100ms | TBD | 🎯 |
| **False Positive Rate** | <5% | TBD | 🎯 |

---

## 🔧 Integration with Existing System

### TypeScript Integration

The ML model integrates seamlessly with your existing detection pipeline:

```typescript
import { mlIntegration } from './ml/ml_integration';

// Enhanced detection with ML
const result = await mlIntegration.enhancedDustDetection(transaction, ruleBasedResult);

console.log({
  isDust: result.isDust,
  confidence: result.confidence,
  method: result.method, // 'rule-based' | 'ml-enhanced' | 'ml-only'
  mlPrediction: result.mlPrediction
});
```

### Shadow Mode Testing

The system supports shadow mode for safe deployment:
- ML predictions run alongside existing rules
- Discrepancies are logged for analysis
- No impact on production decisions
- Gradual confidence building

```typescript
// Get shadow mode statistics
const stats = mlIntegration.getShadowModeStatistics();
console.log(`Agreement rate: ${stats.agreementRate * 100}%`);
```

---

## 📈 Monitoring & Maintenance

### Performance Monitoring

```bash
# Check model performance
python -c "
from ml_integration import mlIntegration
stats = mlIntegration.getShadowModeStatistics()
print(f'Agreement rate: {stats.agreementRate:.2%}')
print(f'Total predictions: {stats.totalPredictions}')
"
```

### Model Retraining

```bash
# Automated retraining (recommended weekly)
python train_model.py --incremental --days-back 7

# Full retraining (recommended monthly)
python train_model.py --full-retrain --days-back 30
```

### Data Quality Checks

```bash
# Validate training data
python data_loader.py --validate --days-back 7

# Export shadow mode results for analysis
python -c "
from ml_integration import mlIntegration
results = mlIntegration.exportShadowModeResults()
import json
with open('shadow_results.json', 'w') as f:
    json.dump(results, f, indent=2)
"
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Model Loading Fails**
```bash
# Check model file exists
ls -la ./ml_output/models/

# Verify Python dependencies
pip list | grep -E "(xgboost|torch|sklearn)"

# Test inference service directly
python inference_service.py --model-path ./path/to/model.joblib --input '{...}'
```

**2. Low Performance**
```bash
# Check data quality
python data_loader.py --validate --days-back 30

# Analyze feature importance
python -c "
import joblib
model = joblib.load('./ml_output/models/lavinth_model_latest.joblib')
print('Top features:', list(model.get('feature_importance', {}).items())[:10])
"
```

**3. Integration Issues**
```bash
# Test TypeScript integration
npm run test -- --grep "ML Integration"

# Check shadow mode logs
tail -f training.log | grep "Shadow mode"
```

### Performance Optimization

**For Training:**
- Use GPU for LSTM training: `export CUDA_VISIBLE_DEVICES=0`
- Increase batch size: Modify `batch_size` in config
- Parallel processing: Set `n_jobs=-1` in XGBoost params

**For Inference:**
- Enable model caching: Set `enableCache=true`
- Batch predictions: Use `batchPredict()` for multiple transactions
- Reduce timeout: Lower `timeout` in config for faster failover

---

## 🔄 Deployment Workflow

### Development → Staging → Production

1. **Development**
   ```bash
   # Train and validate model
   python train_model.py --dry-run
   python train_model.py --days-back 7
   ```

2. **Staging**
   ```bash
   # Enable shadow mode
   export ENABLE_SHADOW_MODE=true
   
   # Deploy with monitoring
   npm run start:staging
   ```

3. **Production**
   ```bash
   # Gradual rollout
   export ML_CONFIDENCE_THRESHOLD=0.8  # Conservative start
   
   # Monitor and adjust
   # Gradually lower threshold as confidence builds
   ```

---

## 📚 Advanced Usage

### Custom Feature Engineering

```python
from feature_engineering import FeatureEngineer, FeatureConfig

# Custom configuration
config = FeatureConfig(
    time_windows=['1h', '6h', '24h'],
    sequence_length=20,
    min_samples=10
)

engineer = FeatureEngineer(config)
features = engineer.extract_all_features(transaction_df)
```

### Hyperparameter Tuning

```python
from training_pipeline import EnsembleModel
import optuna

def objective(trial):
    config = {
        'xgb_params': {
            'max_depth': trial.suggest_int('max_depth', 3, 10),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
        }
    }
    
    model = EnsembleModel(config)
    results = model.train(X, y)
    return results['test_performance']['test_auc']

study = optuna.create_study(direction='maximize')
study.optimize(objective, n_trials=50)
```

### Model Interpretability

```python
from model_evaluation import ModelEvaluator

evaluator = ModelEvaluator()
results = evaluator.evaluate_model(model, X_test, y_test)

# Feature importance
print("Top 10 features:")
for feature, importance in results['feature_importance']['xgboost']['top_10'].items():
    print(f"  {feature}: {importance:.3f}")

# Generate SHAP explanations (if available)
# evaluator.generate_shap_explanations(model, X_test.sample(100))
```

---

## 🤝 Contributing

### Adding New Features

1. **Feature Engineering**: Add new features in `feature_engineering.py`
2. **Model Types**: Extend `training_pipeline.py` with new models
3. **Evaluation Metrics**: Add metrics in `model_evaluation.py`
4. **Integration**: Update `ml_integration.ts` for new capabilities

### Testing

```bash
# Run all tests
python -m pytest tests/

# Test specific component
python -m pytest tests/test_feature_engineering.py

# Integration tests
npm test -- --grep "ML"
```

---

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review logs in `training.log`
3. Validate data quality with `data_loader.py --validate`
4. Test individual components in isolation

**Remember**: The ML system is designed to enhance, not replace, your existing rule-based detection. Start with shadow mode and gradually increase confidence thresholds as the system proves itself.

---

*Happy ML training! 🚀*
