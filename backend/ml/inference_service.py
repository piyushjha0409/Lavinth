#!/usr/bin/env python3
"""
ML Inference Service for Lavinth
Provides real-time predictions for the TypeScript detection pipeline
"""

import argparse
import json
import sys
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any
import joblib
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.ERROR)  # Only show errors to avoid cluttering output
logger = logging.getLogger(__name__)

class InferenceService:
    """
    Real-time ML inference service for Lavinth dust detection
    """
    
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.feature_columns = []
        self.scaler = None
        self.model_metadata = {}
        
        self.load_model()
    
    def load_model(self):
        """Load the trained model and metadata"""
        try:
            # Load main model data
            model_data = joblib.load(self.model_path)
            
            # Extract components
            self.feature_columns = model_data.get('feature_columns', [])
            self.scaler = model_data.get('scaler')
            self.model_metadata = model_data.get('config', {})
            
            # Load individual models
            self.xgb_model = None
            self.lstm_model = None
            self.isolation_forest = None
            
            # Load XGBoost model
            if 'xgb_path' in model_data:
                try:
                    import xgboost as xgb
                    self.xgb_model = xgb.XGBClassifier()
                    self.xgb_model.load_model(model_data['xgb_path'])
                except Exception as e:
                    logger.error(f"Failed to load XGBoost model: {e}")
            
            # Load LSTM model
            if 'lstm_path' in model_data:
                try:
                    import torch
                    import torch.nn as nn
                    
                    # Define LSTM model class (simplified version)
                    class LSTMModel(nn.Module):
                        def __init__(self, input_size, hidden_size=64, num_layers=2, dropout=0.2):
                            super(LSTMModel, self).__init__()
                            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, 
                                              dropout=dropout, batch_first=True)
                            self.attention = nn.MultiheadAttention(hidden_size, 8, dropout=dropout, batch_first=True)
                            self.classifier = nn.Sequential(
                                nn.Linear(hidden_size, hidden_size // 2),
                                nn.ReLU(),
                                nn.Dropout(dropout),
                                nn.Linear(hidden_size // 2, 1),
                                nn.Sigmoid()
                            )
                        
                        def forward(self, x):
                            lstm_out, _ = self.lstm(x)
                            attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
                            return self.classifier(attn_out[:, -1, :])
                    
                    input_size = len(self.feature_columns)
                    self.lstm_model = LSTMModel(input_size)
                    self.lstm_model.load_state_dict(torch.load(model_data['lstm_path'], map_location='cpu'))
                    self.lstm_model.eval()
                except Exception as e:
                    logger.error(f"Failed to load LSTM model: {e}")
            
            # Load Isolation Forest
            if 'isolation_path' in model_data:
                try:
                    self.isolation_forest = joblib.load(model_data['isolation_path'])
                except Exception as e:
                    logger.error(f"Failed to load Isolation Forest: {e}")
            
            # Set model weights
            self.model_weights = model_data.get('model_weights', {
                'xgb': 0.4, 'lstm': 0.3, 'gnn': 0.2, 'isolation': 0.1
            })
            
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def extract_features(self, transaction_data: Dict[str, Any]) -> pd.DataFrame:
        """Extract features from transaction data"""
        try:
            # Create DataFrame from transaction
            df = pd.DataFrame([transaction_data])
            
            # Convert timestamp
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Basic feature extraction (simplified version)
            features = pd.DataFrame(index=df.index)
            
            # Amount-based features
            features['amount_log'] = np.log1p(df['amount'])
            features['amount_normalized'] = df['amount'] / 0.001  # Normalize by typical dust threshold
            features['is_dust_amount'] = (df['amount'] < 0.001).astype(int)
            features['is_micro_amount'] = (df['amount'] < 0.0001).astype(int)
            
            # Fee-based features
            features['fee_log'] = np.log1p(df['fee'])
            features['fee_ratio'] = df['fee'] / (df['amount'] + 1e-10)
            features['fee_normalized'] = df['fee'] / 0.000005  # Normalize by typical fee
            
            # Success rate
            features['is_successful'] = df['success'].astype(int)
            
            # Memo features
            features['has_memo'] = df['memo_content'].notna().astype(int)
            features['memo_length'] = df['memo_content'].fillna('').str.len()
            
            # Token type features
            features['is_sol_transfer'] = (df['token_type'] == 'SOL').astype(int)
            features['is_token_transfer'] = (df['token_type'] != 'SOL').astype(int)
            
            # Time features
            features['hour'] = df['timestamp'].dt.hour
            features['day_of_week'] = df['timestamp'].dt.dayofweek
            features['is_weekend'] = (df['timestamp'].dt.dayofweek >= 5).astype(int)
            features['is_night'] = ((df['timestamp'].dt.hour >= 22) | 
                                   (df['timestamp'].dt.hour <= 6)).astype(int)
            
            # Cyclical encoding
            features['hour_sin'] = np.sin(2 * np.pi * features['hour'] / 24)
            features['hour_cos'] = np.cos(2 * np.pi * features['hour'] / 24)
            features['day_sin'] = np.sin(2 * np.pi * features['day_of_week'] / 7)
            features['day_cos'] = np.cos(2 * np.pi * features['day_of_week'] / 7)
            
            # Risk features (if available)
            features['existing_risk_score'] = df.get('risk_score', 0)
            features['is_potential_dust'] = df.get('is_potential_dust', False).astype(int)
            features['is_potential_poisoning'] = df.get('is_potential_poisoning', False).astype(int)
            
            # Fill missing features with zeros for features not computed in real-time
            for col in self.feature_columns:
                if col not in features.columns:
                    features[col] = 0
            
            # Select only the features used in training
            if self.feature_columns:
                features = features.reindex(columns=self.feature_columns, fill_value=0)
            
            return features
            
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            # Return empty DataFrame with correct columns
            return pd.DataFrame(columns=self.feature_columns).fillna(0)
    
    def predict(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction for a single transaction"""
        try:
            # Extract features
            features_df = self.extract_features(transaction_data)
            
            if features_df.empty:
                return self._create_error_response("Feature extraction failed")
            
            # Scale features if scaler is available
            if self.scaler is not None:
                try:
                    features_scaled = self.scaler.transform(features_df)
                except Exception as e:
                    logger.warning(f"Feature scaling failed: {e}")
                    features_scaled = features_df.values
            else:
                features_scaled = features_df.values
            
            # Get predictions from individual models
            predictions = []
            weights = []
            model_scores = {}
            
            # XGBoost prediction
            if self.xgb_model is not None:
                try:
                    xgb_pred = self.xgb_model.predict_proba(features_df)[:, 1][0]
                    predictions.append(xgb_pred)
                    weights.append(self.model_weights.get('xgb', 0.4))
                    model_scores['xgboost'] = float(xgb_pred)
                except Exception as e:
                    logger.warning(f"XGBoost prediction failed: {e}")
            
            # LSTM prediction (simplified - would need sequence preparation in full implementation)
            if self.lstm_model is not None:
                try:
                    import torch
                    # For single transaction, create a simple sequence
                    features_tensor = torch.FloatTensor(features_scaled).unsqueeze(0).unsqueeze(0)
                    
                    with torch.no_grad():
                        lstm_pred = self.lstm_model(features_tensor).item()
                    
                    predictions.append(lstm_pred)
                    weights.append(self.model_weights.get('lstm', 0.3))
                    model_scores['lstm'] = float(lstm_pred)
                except Exception as e:
                    logger.warning(f"LSTM prediction failed: {e}")
            
            # Isolation Forest prediction
            if self.isolation_forest is not None:
                try:
                    iso_score = self.isolation_forest.decision_function(features_scaled)[0]
                    # Convert to probability (higher score = less anomalous = lower dust probability)
                    iso_prob = 1 / (1 + np.exp(iso_score))  # Sigmoid transformation
                    
                    predictions.append(iso_prob)
                    weights.append(self.model_weights.get('isolation', 0.1))
                    model_scores['isolation_forest'] = float(iso_prob)
                except Exception as e:
                    logger.warning(f"Isolation Forest prediction failed: {e}")
            
            # Ensemble prediction
            if predictions:
                ensemble_score = np.average(predictions, weights=weights)
                confidence = self._calculate_confidence(predictions, weights)
            else:
                ensemble_score = 0.5  # Neutral prediction if no models available
                confidence = 0.1  # Low confidence
            
            # Determine attacker vs victim score (simplified heuristic)
            # In practice, you might have separate models or more sophisticated logic
            if ensemble_score > 0.5:
                attacker_score = ensemble_score
                victim_score = max(0, ensemble_score - 0.2)  # Slightly lower victim score
            else:
                attacker_score = ensemble_score
                victim_score = ensemble_score
            
            # Create response
            response = {
                'attackerScore': float(attacker_score),
                'victimScore': float(victim_score),
                'confidence': float(confidence),
                'modelVersion': self.model_metadata.get('version', '1.0'),
                'features': {col: float(val) for col, val in zip(features_df.columns, features_df.iloc[0])},
                'modelScores': model_scores,
                'ensembleScore': float(ensemble_score)
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return self._create_error_response(str(e))
    
    def _calculate_confidence(self, predictions: list, weights: list) -> float:
        """Calculate prediction confidence based on model agreement"""
        if len(predictions) <= 1:
            return 0.5
        
        # Calculate weighted variance
        weighted_mean = np.average(predictions, weights=weights)
        weighted_variance = np.average((predictions - weighted_mean) ** 2, weights=weights)
        
        # Convert variance to confidence (lower variance = higher confidence)
        confidence = 1 / (1 + 4 * weighted_variance)  # Scale to 0-1 range
        
        # Boost confidence if models agree
        agreement_bonus = 0
        if all(abs(p - weighted_mean) < 0.1 for p in predictions):
            agreement_bonus = 0.2
        elif all(abs(p - weighted_mean) < 0.2 for p in predictions):
            agreement_bonus = 0.1
        
        return min(1.0, confidence + agreement_bonus)
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create error response"""
        return {
            'attackerScore': 0.5,
            'victimScore': 0.5,
            'confidence': 0.1,
            'modelVersion': 'error',
            'features': {},
            'error': error_message
        }

def main():
    """Main inference function"""
    parser = argparse.ArgumentParser(description='Lavinth ML Inference Service')
    parser.add_argument('--model-path', required=True, help='Path to trained model')
    parser.add_argument('--input', required=True, help='JSON input data')
    parser.add_argument('--output-format', default='json', choices=['json'], help='Output format')
    
    args = parser.parse_args()
    
    try:
        # Parse input data
        transaction_data = json.loads(args.input)
        
        # Initialize inference service
        service = InferenceService(args.model_path)
        
        # Make prediction
        result = service.predict(transaction_data)
        
        # Output result
        print(json.dumps(result))
        
    except Exception as e:
        # Output error in JSON format
        error_response = {
            'attackerScore': 0.5,
            'victimScore': 0.5,
            'confidence': 0.1,
            'modelVersion': 'error',
            'features': {},
            'error': str(e)
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()
