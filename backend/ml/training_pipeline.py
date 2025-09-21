"""
ML Training Pipeline for Lavinth Dust Attack Detection
Implements ensemble of XGBoost, LSTM, and Graph Neural Networks
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, Any
import logging
import joblib

# ML Libraries
import xgboost as xgb
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import IsolationForest
import optuna

# Deep Learning
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# Graph Neural Networks
try:
    import dgl
    import dgl.nn.pytorch as dglnn
    DGL_AVAILABLE = True
except ImportError:
    DGL_AVAILABLE = False
    logging.warning("DGL not available. Graph neural network features disabled.")

# Local imports
from feature_engineering import FeatureEngineer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LSTMModel(nn.Module):
    """LSTM model for temporal sequence analysis"""
    
    def __init__(self, input_size: int, hidden_size: int = 64, num_layers: int = 2, 
                 dropout: float = 0.2, output_size: int = 1):
        super(LSTMModel, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True
        )
        
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_size,
            num_heads=8,
            dropout=dropout,
            batch_first=True
        )
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, output_size),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        # LSTM forward pass
        lstm_out, (hidden, cell) = self.lstm(x)
        
        # Apply attention mechanism
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        
        # Use the last output for classification
        output = self.classifier(attn_out[:, -1, :])
        
        return output

class GraphNeuralNetwork(nn.Module):
    """Graph Neural Network for network analysis"""
    
    def __init__(self, input_size: int, hidden_size: int = 64, output_size: int = 1):
        super(GraphNeuralNetwork, self).__init__()
        
        if not DGL_AVAILABLE:
            raise ImportError("DGL is required for Graph Neural Network")
            
        self.conv1 = dglnn.GraphConv(input_size, hidden_size)
        self.conv2 = dglnn.GraphConv(hidden_size, hidden_size)
        self.conv3 = dglnn.GraphConv(hidden_size, hidden_size // 2)
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size // 2, hidden_size // 4),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_size // 4, output_size),
            nn.Sigmoid()
        )
        
    def forward(self, g, features):
        h = torch.relu(self.conv1(g, features))
        h = torch.relu(self.conv2(g, h))
        h = torch.relu(self.conv3(g, h))
        
        # Global pooling
        g.ndata['h'] = h
        pooled = dgl.mean_nodes(g, 'h')
        
        return self.classifier(pooled)

class EnsembleModel:
    """Ensemble model combining XGBoost, LSTM, and GNN"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or self._get_default_config()
        
        # Individual models
        self.xgb_model = None
        self.lstm_model = None
        self.gnn_model = None
        self.isolation_forest = None
        
        # Meta-model for ensemble
        self.meta_model = None
        
        # Preprocessing
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
        # Feature engineering
        self.feature_engineer = FeatureEngineer()
        
        # Model metadata
        self.feature_columns = []
        self.model_weights = {'xgb': 0.4, 'lstm': 0.3, 'gnn': 0.2, 'isolation': 0.1}
        
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration for the ensemble model"""
        return {
            'xgb_params': {
                'objective': 'binary:logistic',
                'eval_metric': 'auc',
                'max_depth': 6,
                'learning_rate': 0.1,
                'n_estimators': 100,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
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
            },
            'gnn_params': {
                'hidden_size': 64,
                'batch_size': 32,
                'epochs': 50,
                'learning_rate': 0.001
            },
            'ensemble_params': {
                'cv_folds': 5,
                'test_size': 0.2,
                'validation_size': 0.2
            }
        }
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare data for training"""
        logger.info("Preparing data for training...")
        
        # Extract comprehensive features
        features_df = self.feature_engineer.extract_all_features(df)
        
        # Create labels (you'll need to define your labeling strategy)
        labels = self._create_labels(df)
        
        # Remove non-feature columns
        feature_columns = [col for col in features_df.columns 
                          if col not in ['signature', 'timestamp', 'sender', 'recipient']]
        
        X = features_df[feature_columns]
        y = labels
        
        # Handle missing values
        X = X.fillna(0)
        
        # Store feature columns for later use
        self.feature_columns = feature_columns
        
        logger.info(f"Prepared {X.shape[0]} samples with {X.shape[1]} features")
        return X, y
    
    def _create_labels(self, df: pd.DataFrame) -> pd.Series:
        """Create training labels from existing detection results"""
        # Combine existing detection flags with confidence weighting
        labels = pd.Series(0, index=df.index)
        
        # High confidence positive labels
        if 'is_potential_dust' in df.columns:
            dust_mask = df['is_potential_dust']
            labels[dust_mask] = 1
            
        if 'is_potential_poisoning' in df.columns:
            poison_mask = df['is_potential_poisoning']
            labels[poison_mask] = 1
        
        # Use risk scores if available
        if 'risk_score' in df.columns:
            high_risk_mask = df['risk_score'] > 0.7
            labels[high_risk_mask] = 1
        
        logger.info(f"Created labels: {labels.sum()} positive, {(labels == 0).sum()} negative")
        return labels
    
    def train(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Train the ensemble model"""
        logger.info("Starting ensemble model training...")
        
        # Time-based split to prevent data leakage
        train_idx, val_idx, test_idx = self._time_based_split(X, y)
        
        X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
        X_test, y_test = X.iloc[test_idx], y.iloc[test_idx]
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train individual models
        results = {}
        
        # 1. Train XGBoost
        logger.info("Training XGBoost model...")
        xgb_results = self._train_xgboost(X_train, y_train, X_val, y_val)
        results['xgb'] = xgb_results
        
        # 2. Train LSTM
        logger.info("Training LSTM model...")
        lstm_results = self._train_lstm(X_train_scaled, y_train, X_val_scaled, y_val)
        results['lstm'] = lstm_results
        
        # 3. Train GNN (if available)
        if DGL_AVAILABLE:
            logger.info("Training Graph Neural Network...")
            gnn_results = self._train_gnn(X_train_scaled, y_train, X_val_scaled, y_val)
            results['gnn'] = gnn_results
        
        # 4. Train Isolation Forest
        logger.info("Training Isolation Forest...")
        iso_results = self._train_isolation_forest(X_train_scaled)
        results['isolation_forest'] = iso_results
        
        # 5. Train meta-model for ensemble
        logger.info("Training ensemble meta-model...")
        ensemble_results = self._train_ensemble(X_val_scaled, y_val)
        results['ensemble'] = ensemble_results
        
        # Final evaluation on test set
        test_results = self._evaluate_ensemble(X_test_scaled, y_test)
        results['test_performance'] = test_results
        
        logger.info("Ensemble training completed!")
        return results
    
    def _time_based_split(self, X: pd.DataFrame, y: pd.Series) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Create time-based train/validation/test split"""
        n_samples = len(X)
        
        # 60% train, 20% validation, 20% test
        train_end = int(0.6 * n_samples)
        val_end = int(0.8 * n_samples)
        
        train_idx = np.arange(0, train_end)
        val_idx = np.arange(train_end, val_end)
        test_idx = np.arange(val_end, n_samples)
        
        return train_idx, val_idx, test_idx
    
    def _train_xgboost(self, X_train: pd.DataFrame, y_train: pd.Series,
                      X_val: pd.DataFrame, y_val: pd.Series) -> Dict[str, Any]:
        """Train XGBoost model with or without hyperparameter optimization"""
        
        # Check if hyperparameter tuning is enabled
        enable_tuning = self.config.get('enable_hyperparameter_tuning', True)
        
        if not enable_tuning:
            # Simple training without hyperparameter optimization
            params = self.config.get('xgb_params', {
                'objective': 'binary:logistic',
                'eval_metric': 'auc',
                'max_depth': 6,
                'learning_rate': 0.1,
                'n_estimators': 100,
                'random_state': 42
            })
            
            self.xgb_model = xgb.XGBClassifier(**params)
            self.xgb_model.fit(X_train, y_train)
            
            # Evaluate
            y_pred_proba = self.xgb_model.predict_proba(X_val)[:, 1]
            auc_score = roc_auc_score(y_val, y_pred_proba)
            
            return {
                'model': self.xgb_model,
                'params': params,
                'validation_auc': auc_score,
                'feature_importance': dict(zip(X_train.columns, self.xgb_model.feature_importances_))
            }
        
        # Hyperparameter optimization (original code)
        def objective(trial):
            params = {
                'objective': 'binary:logistic',
                'eval_metric': 'auc',
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'n_estimators': trial.suggest_int('n_estimators', 50, 300),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'random_state': 42
            }
            
            model = xgb.XGBClassifier(**params)
            # Note: early_stopping_rounds is not supported in newer XGBoost versions
            model.fit(X_train, y_train)
            
            y_pred_proba = model.predict_proba(X_val)[:, 1]
            return roc_auc_score(y_val, y_pred_proba)
        
        # Hyperparameter optimization
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=20)
        
        # Train final model with best parameters
        best_params = study.best_params
        best_params.update({
            'objective': 'binary:logistic',
            'eval_metric': 'auc',
            'random_state': 42
        })
        
        self.xgb_model = xgb.XGBClassifier(**best_params)
        self.xgb_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred_proba = self.xgb_model.predict_proba(X_val)[:, 1]
        auc_score = roc_auc_score(y_val, y_pred_proba)
        
        return {
            'model': self.xgb_model,
            'best_params': best_params,
            'validation_auc': auc_score,
            'feature_importance': dict(zip(X_train.columns, self.xgb_model.feature_importances_))
        }
    
    def _train_lstm(self, X_train: np.ndarray, y_train: pd.Series,
                   X_val: np.ndarray, y_val: pd.Series) -> Dict[str, Any]:
        """Train LSTM model for temporal patterns"""
        
        # Get LSTM parameters with defaults
        lstm_params = self.config.get('lstm_params', {})
        sequence_length = lstm_params.get('sequence_length', 10)
        
        # Check if we have enough data for sequences
        if len(X_train) < sequence_length or len(X_val) < sequence_length:
            logger.warning(f"Not enough data for LSTM sequences (need at least {sequence_length} samples)")
            # Return a dummy result
            return {
                'model': None,
                'validation_auc': 0.5,
                'best_val_loss': 1.0
            }
        
        # Prepare sequence data
        X_train_seq = self._prepare_sequences(X_train, sequence_length)
        X_val_seq = self._prepare_sequences(X_val, sequence_length)
        
        # Adjust labels to match sequence length (remove first sequence_length-1 samples)
        y_train_seq = y_train.iloc[sequence_length-1:].reset_index(drop=True)
        y_val_seq = y_val.iloc[sequence_length-1:].reset_index(drop=True)
        
        # Convert to PyTorch tensors
        X_train_tensor = torch.FloatTensor(X_train_seq)
        y_train_tensor = torch.FloatTensor(y_train_seq.values).unsqueeze(1)
        X_val_tensor = torch.FloatTensor(X_val_seq)
        y_val_tensor = torch.FloatTensor(y_val_seq.values).unsqueeze(1)
        
        # Create data loaders
        train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
        val_dataset = TensorDataset(X_val_tensor, y_val_tensor)
        
        batch_size = lstm_params.get('batch_size', 32)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size)
        
        # Initialize model
        input_size = X_train_seq.shape[2]
        hidden_size = lstm_params.get('hidden_size', 64)
        num_layers = lstm_params.get('num_layers', 2)
        dropout = lstm_params.get('dropout', 0.2)
        
        self.lstm_model = LSTMModel(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout
        )
        
        # Training setup
        criterion = nn.BCELoss()
        learning_rate = lstm_params.get('learning_rate', 0.001)
        optimizer = optim.Adam(self.lstm_model.parameters(), lr=learning_rate)
        
        # Training loop
        best_val_loss = float('inf')
        patience = 10
        patience_counter = 0
        epochs = lstm_params.get('epochs', 50)
        
        for epoch in range(epochs):
            # Training
            self.lstm_model.train()
            train_loss = 0
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = self.lstm_model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                train_loss += loss.item()
            
            # Validation
            self.lstm_model.eval()
            val_loss = 0
            val_predictions = []
            val_targets = []
            
            with torch.no_grad():
                for batch_X, batch_y in val_loader:
                    outputs = self.lstm_model(batch_X)
                    loss = criterion(outputs, batch_y)
                    val_loss += loss.item()
                    
                    val_predictions.extend(outputs.cpu().numpy())
                    val_targets.extend(batch_y.cpu().numpy())
            
            val_loss /= len(val_loader)
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                # Save best model
                torch.save(self.lstm_model.state_dict(), 'best_lstm_model.pth')
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break
        
        # Load best model
        self.lstm_model.load_state_dict(torch.load('best_lstm_model.pth'))
        
        # Calculate validation AUC
        val_auc = roc_auc_score(val_targets, val_predictions)
        
        return {
            'model': self.lstm_model,
            'validation_auc': val_auc,
            'best_val_loss': best_val_loss
        }
    
    def _prepare_sequences(self, X: np.ndarray, sequence_length: int) -> np.ndarray:
        """Prepare sequences for LSTM training"""
        sequences = []
        for i in range(len(X) - sequence_length + 1):
            sequences.append(X[i:i + sequence_length])
        return np.array(sequences)
    
    def _train_gnn(self, X_train: np.ndarray, y_train: pd.Series,
                  X_val: np.ndarray, y_val: pd.Series) -> Dict[str, Any]:
        """Train Graph Neural Network (placeholder - requires graph construction)"""
        if not DGL_AVAILABLE:
            return {'model': None, 'validation_auc': 0.0}
        
        # This is a simplified placeholder
        # In practice, you'd need to construct graphs from transaction data
        logger.info("GNN training placeholder - requires graph construction from transaction data")
        
        return {
            'model': None,
            'validation_auc': 0.0,
            'note': 'GNN training requires graph construction from transaction relationships'
        }
    
    def _train_isolation_forest(self, X_train: np.ndarray) -> Dict[str, Any]:
        """Train Isolation Forest for anomaly detection"""
        self.isolation_forest = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_jobs=-1
        )
        
        self.isolation_forest.fit(X_train)
        
        # Calculate anomaly scores
        anomaly_scores = self.isolation_forest.decision_function(X_train)
        
        return {
            'model': self.isolation_forest,
            'anomaly_score_mean': np.mean(anomaly_scores),
            'anomaly_score_std': np.std(anomaly_scores)
        }
    
    def _train_ensemble(self, X_val: np.ndarray, y_val: pd.Series) -> Dict[str, Any]:
        """Train meta-model for ensemble combination"""
        # Get predictions from individual models
        ensemble_features = []
        
        # XGBoost predictions
        if self.xgb_model:
            xgb_pred = self.xgb_model.predict_proba(X_val)[:, 1]
            ensemble_features.append(xgb_pred)
        
        # LSTM predictions
        if self.lstm_model:
            try:
                sequence_length = self.config.get('lstm_params', {}).get('sequence_length', 10)
                X_val_seq = self._prepare_sequences(X_val, sequence_length)
                
                if len(X_val_seq) > 0:
                    X_val_tensor = torch.FloatTensor(X_val_seq)
                    
                    self.lstm_model.eval()
                    with torch.no_grad():
                        lstm_pred = self.lstm_model(X_val_tensor).squeeze().numpy()
                    
                    # Pad predictions to match original length
                    padded_pred = np.zeros(len(X_val))
                    padded_pred[:len(lstm_pred)] = lstm_pred
                    ensemble_features.append(padded_pred)
                else:
                    # Not enough data for sequences, use zeros
                    ensemble_features.append(np.zeros(len(X_val)))
            except Exception as e:
                logger.warning(f"LSTM prediction failed: {e}")
                ensemble_features.append(np.zeros(len(X_val)))
        
        # Isolation Forest predictions
        if self.isolation_forest:
            try:
                iso_scores = self.isolation_forest.decision_function(X_val)
                # Normalize to 0-1 range
                iso_min, iso_max = iso_scores.min(), iso_scores.max()
                if iso_max > iso_min:
                    iso_scores = (iso_scores - iso_min) / (iso_max - iso_min)
                else:
                    iso_scores = np.zeros_like(iso_scores)
                ensemble_features.append(iso_scores)
            except Exception as e:
                logger.warning(f"Isolation Forest prediction failed: {e}")
                ensemble_features.append(np.zeros(len(X_val)))
        
        # Combine predictions using weighted average
        if ensemble_features:
            try:
                # Ensure all predictions have the same length
                min_length = min(len(pred) for pred in ensemble_features)
                ensemble_features = [pred[:min_length] for pred in ensemble_features]
                y_val_trimmed = y_val.iloc[:min_length]
                
                # Stack predictions and compute weighted average
                predictions_array = np.column_stack(ensemble_features)
                active_models = ['xgb', 'lstm', 'isolation'][:len(ensemble_features)]
                weights = [self.model_weights.get(model, 1.0) for model in active_models]
                
                ensemble_pred = np.average(predictions_array, axis=1, weights=weights)
                ensemble_auc = roc_auc_score(y_val_trimmed, ensemble_pred)
            except Exception as e:
                logger.error(f"Ensemble combination failed: {e}")
                ensemble_auc = 0.0
        else:
            ensemble_auc = 0.0
        
        return {
            'validation_auc': ensemble_auc,
            'model_weights': self.model_weights,
            'num_models': len(ensemble_features)
        }
    
    def _evaluate_ensemble(self, X_test: np.ndarray, y_test: pd.Series) -> Dict[str, Any]:
        """Evaluate ensemble model on test set"""
        predictions = self.predict_proba(X_test)
        
        test_auc = roc_auc_score(y_test, predictions)
        
        # Binary predictions for classification report
        binary_pred = (predictions > 0.5).astype(int)
        
        return {
            'test_auc': test_auc,
            'classification_report': classification_report(y_test, binary_pred, output_dict=True),
            'confusion_matrix': confusion_matrix(y_test, binary_pred).tolist()
        }
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Make ensemble predictions"""
        if isinstance(X, pd.DataFrame):
            X = X.values
        
        predictions = []
        weights = []
        
        # XGBoost predictions
        if self.xgb_model:
            xgb_pred = self.xgb_model.predict_proba(X)[:, 1]
            predictions.append(xgb_pred)
            weights.append(self.model_weights['xgb'])
        
        # LSTM predictions
        if self.lstm_model:
            try:
                sequence_length = self.config.get('lstm_params', {}).get('sequence_length', 10)
                X_seq = self._prepare_sequences(X, sequence_length)
                
                if len(X_seq) > 0:
                    X_tensor = torch.FloatTensor(X_seq)
                    
                    self.lstm_model.eval()
                    with torch.no_grad():
                        lstm_pred = self.lstm_model(X_tensor).squeeze().numpy()
                    
                    # Pad predictions to match original length
                    padded_pred = np.zeros(len(X))
                    padded_pred[:len(lstm_pred)] = lstm_pred
                    predictions.append(padded_pred)
                else:
                    # Not enough data for sequences, use zeros
                    predictions.append(np.zeros(len(X)))
            except Exception as e:
                logger.warning(f"LSTM prediction failed: {e}")
                predictions.append(np.zeros(len(X)))
        
        # Isolation Forest predictions
        if self.isolation_forest:
            try:
                iso_scores = self.isolation_forest.decision_function(X)
                # Normalize to 0-1 range
                iso_min, iso_max = iso_scores.min(), iso_scores.max()
                if iso_max > iso_min:
                    iso_scores = (iso_scores - iso_min) / (iso_max - iso_min)
                else:
                    iso_scores = np.zeros_like(iso_scores)
                predictions.append(iso_scores)
            except Exception as e:
                logger.warning(f"Isolation Forest prediction failed: {e}")
                predictions.append(np.zeros(len(X)))
        
        if predictions:
            try:
                # Ensure all predictions have the same length
                min_length = min(len(pred) for pred in predictions)
                predictions = [pred[:min_length] for pred in predictions]
                
                # Stack predictions and compute weighted average
                predictions_array = np.column_stack(predictions)
                active_models = ['xgb', 'lstm', 'isolation'][:len(predictions)]
                weights = [self.model_weights.get(model, 1.0) for model in active_models]
                
                ensemble_pred = np.average(predictions_array, axis=1, weights=weights)
                return ensemble_pred
            except Exception as e:
                logger.error(f"Ensemble prediction failed: {e}")
                return np.zeros(len(X))
        else:
            return np.zeros(len(X))
    
    def save_model(self, filepath: str):
        """Save the trained ensemble model"""
        model_data = {
            'config': self.config,
            'feature_columns': self.feature_columns,
            'model_weights': self.model_weights,
            'scaler': self.scaler
        }
        
        # Save XGBoost model
        if self.xgb_model:
            xgb_path = filepath.replace('.joblib', '_xgb.json')
            self.xgb_model.save_model(xgb_path)
            model_data['xgb_path'] = xgb_path
        
        # Save LSTM model
        if self.lstm_model:
            lstm_path = filepath.replace('.joblib', '_lstm.pth')
            torch.save(self.lstm_model.state_dict(), lstm_path)
            model_data['lstm_path'] = lstm_path
        
        # Save Isolation Forest
        if self.isolation_forest:
            iso_path = filepath.replace('.joblib', '_isolation.joblib')
            joblib.dump(self.isolation_forest, iso_path)
            model_data['isolation_path'] = iso_path
        
        # Save main model data
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load a trained ensemble model"""
        model_data = joblib.load(filepath)
        
        self.config = model_data['config']
        self.feature_columns = model_data['feature_columns']
        self.model_weights = model_data['model_weights']
        self.scaler = model_data['scaler']
        
        # Load XGBoost model
        if 'xgb_path' in model_data:
            self.xgb_model = xgb.XGBClassifier()
            self.xgb_model.load_model(model_data['xgb_path'])
        
        # Load LSTM model
        if 'lstm_path' in model_data:
            input_size = len(self.feature_columns)
            self.lstm_model = LSTMModel(
                input_size=input_size,
                hidden_size=self.config['lstm_params']['hidden_size'],
                num_layers=self.config['lstm_params']['num_layers'],
                dropout=self.config['lstm_params']['dropout']
            )
            self.lstm_model.load_state_dict(torch.load(model_data['lstm_path']))
            self.lstm_model.eval()
        
        # Load Isolation Forest
        if 'isolation_path' in model_data:
            self.isolation_forest = joblib.load(model_data['isolation_path'])
        
        logger.info(f"Model loaded from {filepath}")

def main():
    """Main training pipeline"""
    # This would be called from your main training script
    logger.info("ML Training Pipeline initialized")
    
    # Example usage:
    # model = EnsembleModel()
    # X, y = model.prepare_data(transaction_df)
    # results = model.train(X, y)
    # model.save_model('lavinth_ensemble_model.joblib')
    
    print("Training pipeline ready!")

if __name__ == "__main__":
    main()
