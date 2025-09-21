"""
Model Evaluation and Validation for Lavinth ML Pipeline
Comprehensive evaluation metrics and validation framework
"""

import pandas as pd
import numpy as np
from typing import Dict, Any
import logging
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# ML evaluation libraries
from sklearn.metrics import (
    confusion_matrix, roc_auc_score, 
    precision_recall_curve, roc_curve, average_precision_score,
    precision_score, recall_score, f1_score, accuracy_score
)
from sklearn.model_selection import cross_val_score, StratifiedKFold

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelEvaluator:
    """
    Comprehensive model evaluation and validation
    """
    
    def __init__(self, output_dir: str = "evaluation_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        self.plots_dir = self.output_dir / "plots"
        self.plots_dir.mkdir(exist_ok=True)
        
        self.reports_dir = self.output_dir / "reports"
        self.reports_dir.mkdir(exist_ok=True)
    
    def evaluate_model(self, model, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """
        Comprehensive model evaluation
        
        Args:
            model: Trained model with predict_proba method
            X: Feature matrix
            y: True labels
            
        Returns:
            Dictionary with comprehensive evaluation results
        """
        logger.info("Starting comprehensive model evaluation...")
        
        evaluation_results = {
            'timestamp': datetime.now().isoformat(),
            'data_info': {
                'n_samples': len(X),
                'n_features': X.shape[1] if hasattr(X, 'shape') else len(X.columns),
                'positive_ratio': y.mean(),
                'class_distribution': y.value_counts().to_dict()
            }
        }
        
        try:
            # Get predictions
            y_pred_proba = model.predict_proba(X)
            y_pred = (y_pred_proba > 0.5).astype(int)
            
            # Basic metrics
            evaluation_results['basic_metrics'] = self._calculate_basic_metrics(y, y_pred, y_pred_proba)
            
            # Threshold analysis
            evaluation_results['threshold_analysis'] = self._analyze_thresholds(y, y_pred_proba)
            
            # Cross-validation
            evaluation_results['cross_validation'] = self._cross_validation_analysis(model, X, y)
            
            # Feature importance (if available)
            evaluation_results['feature_importance'] = self._analyze_feature_importance(model, X)
            
            # Performance by segments
            evaluation_results['segment_analysis'] = self._segment_performance_analysis(
                model, X, y, y_pred_proba
            )
            
            # Temporal stability (if timestamp available)
            if 'timestamp' in X.columns:
                evaluation_results['temporal_stability'] = self._temporal_stability_analysis(
                    model, X, y
                )
            
            # Generate visualizations
            evaluation_results['visualizations'] = self._generate_visualizations(
                y, y_pred, y_pred_proba
            )
            
            # Model comparison (if multiple models)
            if hasattr(model, 'xgb_model') and hasattr(model, 'lstm_model'):
                evaluation_results['model_comparison'] = self._compare_individual_models(
                    model, X, y
                )
            
            logger.info("Model evaluation completed successfully")
            
        except Exception as e:
            logger.error(f"Model evaluation failed: {e}")
            evaluation_results['error'] = str(e)
        
        return evaluation_results
    
    def _calculate_basic_metrics(self, y_true: pd.Series, y_pred: np.ndarray, 
                               y_pred_proba: np.ndarray) -> Dict[str, float]:
        """Calculate basic classification metrics"""
        metrics = {
            'accuracy': accuracy_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred, zero_division=0),
            'recall': recall_score(y_true, y_pred, zero_division=0),
            'f1_score': f1_score(y_true, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y_true, y_pred_proba),
            'average_precision': average_precision_score(y_true, y_pred_proba)
        }
        
        # Additional metrics
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        
        metrics.update({
            'true_positives': int(tp),
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'specificity': tn / (tn + fp) if (tn + fp) > 0 else 0,
            'false_positive_rate': fp / (fp + tn) if (fp + tn) > 0 else 0,
            'false_negative_rate': fn / (fn + tp) if (fn + tp) > 0 else 0
        })
        
        return metrics
    
    def _analyze_thresholds(self, y_true: pd.Series, y_pred_proba: np.ndarray) -> Dict[str, Any]:
        """Analyze performance across different probability thresholds"""
        thresholds = np.arange(0.1, 1.0, 0.1)
        threshold_results = []
        
        for threshold in thresholds:
            y_pred_thresh = (y_pred_proba > threshold).astype(int)
            
            if len(np.unique(y_pred_thresh)) > 1:  # Avoid division by zero
                precision = precision_score(y_true, y_pred_thresh, zero_division=0)
                recall = recall_score(y_true, y_pred_thresh, zero_division=0)
                f1 = f1_score(y_true, y_pred_thresh, zero_division=0)
            else:
                precision = recall = f1 = 0
            
            threshold_results.append({
                'threshold': float(threshold),
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'predictions_positive': int(y_pred_thresh.sum())
            })
        
        # Find optimal threshold (maximize F1)
        best_threshold = max(threshold_results, key=lambda x: x['f1_score'])
        
        return {
            'threshold_analysis': threshold_results,
            'optimal_threshold': best_threshold,
            'recommended_threshold': best_threshold['threshold']
        }
    
    def _cross_validation_analysis(self, model, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Perform cross-validation analysis"""
        try:
            # Use StratifiedKFold for balanced splits
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            
            # Cross-validation scores
            cv_scores = {
                'accuracy': cross_val_score(model, X, y, cv=cv, scoring='accuracy'),
                'precision': cross_val_score(model, X, y, cv=cv, scoring='precision', n_jobs=-1),
                'recall': cross_val_score(model, X, y, cv=cv, scoring='recall', n_jobs=-1),
                'f1': cross_val_score(model, X, y, cv=cv, scoring='f1', n_jobs=-1),
                'roc_auc': cross_val_score(model, X, y, cv=cv, scoring='roc_auc', n_jobs=-1)
            }
            
            # Calculate statistics
            cv_statistics = {}
            for metric, scores in cv_scores.items():
                cv_statistics[metric] = {
                    'mean': float(scores.mean()),
                    'std': float(scores.std()),
                    'min': float(scores.min()),
                    'max': float(scores.max()),
                    'scores': scores.tolist()
                }
            
            return {
                'cv_statistics': cv_statistics,
                'stability_score': np.mean([stats['std'] for stats in cv_statistics.values()])
            }
            
        except Exception as e:
            logger.warning(f"Cross-validation analysis failed: {e}")
            return {'error': str(e)}
    
    def _analyze_feature_importance(self, model, X: pd.DataFrame) -> Dict[str, Any]:
        """Analyze feature importance"""
        try:
            feature_importance = {}
            
            # XGBoost feature importance
            if hasattr(model, 'xgb_model') and model.xgb_model is not None:
                xgb_importance = model.xgb_model.feature_importances_
                feature_names = model.feature_columns or X.columns
                
                xgb_features = dict(zip(feature_names, xgb_importance))
                # Sort by importance
                xgb_features = dict(sorted(xgb_features.items(), key=lambda x: x[1], reverse=True))
                
                feature_importance['xgboost'] = {
                    'top_10': dict(list(xgb_features.items())[:10]),
                    'all_features': xgb_features
                }
            
            # Feature groups analysis
            if hasattr(model, 'feature_engineer'):
                feature_groups = model.feature_engineer.get_feature_importance_groups()
                group_importance = {}
                
                for group_name, group_features in feature_groups.items():
                    if 'xgboost' in feature_importance:
                        group_score = sum(
                            feature_importance['xgboost']['all_features'].get(feat, 0)
                            for feat in group_features
                            if feat in feature_importance['xgboost']['all_features']
                        )
                        group_importance[group_name] = group_score
                
                feature_importance['feature_groups'] = group_importance
            
            return feature_importance
            
        except Exception as e:
            logger.warning(f"Feature importance analysis failed: {e}")
            return {'error': str(e)}
    
    def _segment_performance_analysis(self, model, X: pd.DataFrame, y: pd.Series, 
                                    y_pred_proba: np.ndarray) -> Dict[str, Any]:
        """Analyze performance across different data segments"""
        try:
            segment_analysis = {}
            
            # Performance by amount ranges (if amount feature exists)
            amount_cols = [col for col in X.columns if 'amount' in col.lower()]
            if amount_cols:
                amount_col = amount_cols[0]
                amount_quartiles = X[amount_col].quantile([0.25, 0.5, 0.75])
                
                segments = {
                    'low_amount': X[amount_col] <= amount_quartiles[0.25],
                    'medium_amount': (X[amount_col] > amount_quartiles[0.25]) & (X[amount_col] <= amount_quartiles[0.75]),
                    'high_amount': X[amount_col] > amount_quartiles[0.75]
                }
                
                for segment_name, mask in segments.items():
                    if mask.sum() > 10:  # Minimum samples for meaningful analysis
                        y_seg = y[mask]
                        y_pred_seg = (y_pred_proba[mask] > 0.5).astype(int)
                        
                        segment_analysis[segment_name] = {
                            'n_samples': int(mask.sum()),
                            'positive_ratio': float(y_seg.mean()),
                            'precision': precision_score(y_seg, y_pred_seg, zero_division=0),
                            'recall': recall_score(y_seg, y_pred_seg, zero_division=0),
                            'f1_score': f1_score(y_seg, y_pred_seg, zero_division=0)
                        }
            
            # Performance by time of day (if hour feature exists)
            hour_cols = [col for col in X.columns if 'hour' in col.lower()]
            if hour_cols:
                hour_col = hour_cols[0]
                
                time_segments = {
                    'night': (X[hour_col] >= 0) & (X[hour_col] < 6),
                    'morning': (X[hour_col] >= 6) & (X[hour_col] < 12),
                    'afternoon': (X[hour_col] >= 12) & (X[hour_col] < 18),
                    'evening': (X[hour_col] >= 18) & (X[hour_col] < 24)
                }
                
                for segment_name, mask in time_segments.items():
                    if mask.sum() > 10:
                        y_seg = y[mask]
                        y_pred_seg = (y_pred_proba[mask] > 0.5).astype(int)
                        
                        segment_analysis[f'time_{segment_name}'] = {
                            'n_samples': int(mask.sum()),
                            'positive_ratio': float(y_seg.mean()),
                            'precision': precision_score(y_seg, y_pred_seg, zero_division=0),
                            'recall': recall_score(y_seg, y_pred_seg, zero_division=0),
                            'f1_score': f1_score(y_seg, y_pred_seg, zero_division=0)
                        }
            
            return segment_analysis
            
        except Exception as e:
            logger.warning(f"Segment analysis failed: {e}")
            return {'error': str(e)}
    
    def _temporal_stability_analysis(self, model, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Analyze model performance stability over time"""
        try:
            if 'timestamp' not in X.columns:
                return {'error': 'No timestamp column available'}
            
            # Sort by timestamp
            X_sorted = X.sort_values('timestamp')
            y_sorted = y.loc[X_sorted.index]
            
            # Split into time windows
            n_windows = 5
            window_size = len(X_sorted) // n_windows
            
            temporal_results = []
            
            for i in range(n_windows):
                start_idx = i * window_size
                end_idx = (i + 1) * window_size if i < n_windows - 1 else len(X_sorted)
                
                X_window = X_sorted.iloc[start_idx:end_idx]
                y_window = y_sorted.iloc[start_idx:end_idx]
                
                if len(X_window) > 10 and y_window.sum() > 0:
                    y_pred_window = model.predict_proba(X_window.drop('timestamp', axis=1))
                    y_pred_binary = (y_pred_window > 0.5).astype(int)
                    
                    window_metrics = {
                        'window': i + 1,
                        'start_time': X_window['timestamp'].min().isoformat(),
                        'end_time': X_window['timestamp'].max().isoformat(),
                        'n_samples': len(X_window),
                        'positive_ratio': float(y_window.mean()),
                        'precision': precision_score(y_window, y_pred_binary, zero_division=0),
                        'recall': recall_score(y_window, y_pred_binary, zero_division=0),
                        'f1_score': f1_score(y_window, y_pred_binary, zero_division=0),
                        'roc_auc': roc_auc_score(y_window, y_pred_window)
                    }
                    
                    temporal_results.append(window_metrics)
            
            # Calculate stability metrics
            if temporal_results:
                f1_scores = [r['f1_score'] for r in temporal_results]
                auc_scores = [r['roc_auc'] for r in temporal_results]
                
                stability_metrics = {
                    'f1_stability': {
                        'mean': np.mean(f1_scores),
                        'std': np.std(f1_scores),
                        'coefficient_of_variation': np.std(f1_scores) / np.mean(f1_scores) if np.mean(f1_scores) > 0 else 0
                    },
                    'auc_stability': {
                        'mean': np.mean(auc_scores),
                        'std': np.std(auc_scores),
                        'coefficient_of_variation': np.std(auc_scores) / np.mean(auc_scores) if np.mean(auc_scores) > 0 else 0
                    }
                }
            else:
                stability_metrics = {}
            
            return {
                'temporal_windows': temporal_results,
                'stability_metrics': stability_metrics
            }
            
        except Exception as e:
            logger.warning(f"Temporal stability analysis failed: {e}")
            return {'error': str(e)}
    
    def _compare_individual_models(self, ensemble_model, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Compare performance of individual models in ensemble"""
        try:
            comparison_results = {}
            
            # XGBoost performance
            if hasattr(ensemble_model, 'xgb_model') and ensemble_model.xgb_model is not None:
                xgb_pred_proba = ensemble_model.xgb_model.predict_proba(X)[:, 1]
                xgb_pred = (xgb_pred_proba > 0.5).astype(int)
                
                comparison_results['xgboost'] = {
                    'precision': precision_score(y, xgb_pred, zero_division=0),
                    'recall': recall_score(y, xgb_pred, zero_division=0),
                    'f1_score': f1_score(y, xgb_pred, zero_division=0),
                    'roc_auc': roc_auc_score(y, xgb_pred_proba)
                }
            
            # LSTM performance (if available)
            if hasattr(ensemble_model, 'lstm_model') and ensemble_model.lstm_model is not None:
                try:
                    # This would require sequence preparation
                    # Placeholder for LSTM evaluation
                    comparison_results['lstm'] = {
                        'note': 'LSTM evaluation requires sequence preparation'
                    }
                except Exception as e:
                    comparison_results['lstm'] = {'error': str(e)}
            
            # Isolation Forest performance
            if hasattr(ensemble_model, 'isolation_forest') and ensemble_model.isolation_forest is not None:
                iso_scores = ensemble_model.isolation_forest.decision_function(X)
                # Convert to probabilities (higher score = less anomalous = lower dust probability)
                iso_proba = 1 - ((iso_scores - iso_scores.min()) / (iso_scores.max() - iso_scores.min()))
                iso_pred = (iso_proba > 0.5).astype(int)
                
                comparison_results['isolation_forest'] = {
                    'precision': precision_score(y, iso_pred, zero_division=0),
                    'recall': recall_score(y, iso_pred, zero_division=0),
                    'f1_score': f1_score(y, iso_pred, zero_division=0),
                    'roc_auc': roc_auc_score(y, iso_proba)
                }
            
            # Ensemble performance
            ensemble_pred_proba = ensemble_model.predict_proba(X)
            ensemble_pred = (ensemble_pred_proba > 0.5).astype(int)
            
            comparison_results['ensemble'] = {
                'precision': precision_score(y, ensemble_pred, zero_division=0),
                'recall': recall_score(y, ensemble_pred, zero_division=0),
                'f1_score': f1_score(y, ensemble_pred, zero_division=0),
                'roc_auc': roc_auc_score(y, ensemble_pred_proba)
            }
            
            return comparison_results
            
        except Exception as e:
            logger.warning(f"Model comparison failed: {e}")
            return {'error': str(e)}
    
    def _generate_visualizations(self, y_true: pd.Series, y_pred: np.ndarray, 
                               y_pred_proba: np.ndarray) -> Dict[str, str]:
        """Generate evaluation visualizations"""
        try:
            visualization_paths = {}
            
            # Set style
            plt.style.use('default')
            sns.set_palette("husl")
            
            # 1. Confusion Matrix
            plt.figure(figsize=(8, 6))
            cm = confusion_matrix(y_true, y_pred)
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
            plt.title('Confusion Matrix')
            plt.ylabel('True Label')
            plt.xlabel('Predicted Label')
            
            cm_path = self.plots_dir / 'confusion_matrix.png'
            plt.savefig(cm_path, dpi=300, bbox_inches='tight')
            plt.close()
            visualization_paths['confusion_matrix'] = str(cm_path)
            
            # 2. ROC Curve
            plt.figure(figsize=(8, 6))
            fpr, tpr, _ = roc_curve(y_true, y_pred_proba)
            auc_score = roc_auc_score(y_true, y_pred_proba)
            
            plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {auc_score:.3f})')
            plt.plot([0, 1], [0, 1], 'k--', label='Random')
            plt.xlabel('False Positive Rate')
            plt.ylabel('True Positive Rate')
            plt.title('ROC Curve')
            plt.legend()
            plt.grid(True, alpha=0.3)
            
            roc_path = self.plots_dir / 'roc_curve.png'
            plt.savefig(roc_path, dpi=300, bbox_inches='tight')
            plt.close()
            visualization_paths['roc_curve'] = str(roc_path)
            
            # 3. Precision-Recall Curve
            plt.figure(figsize=(8, 6))
            precision, recall, _ = precision_recall_curve(y_true, y_pred_proba)
            ap_score = average_precision_score(y_true, y_pred_proba)
            
            plt.plot(recall, precision, label=f'PR Curve (AP = {ap_score:.3f})')
            plt.xlabel('Recall')
            plt.ylabel('Precision')
            plt.title('Precision-Recall Curve')
            plt.legend()
            plt.grid(True, alpha=0.3)
            
            pr_path = self.plots_dir / 'precision_recall_curve.png'
            plt.savefig(pr_path, dpi=300, bbox_inches='tight')
            plt.close()
            visualization_paths['precision_recall_curve'] = str(pr_path)
            
            # 4. Prediction Distribution
            plt.figure(figsize=(10, 6))
            
            plt.subplot(1, 2, 1)
            plt.hist(y_pred_proba[y_true == 0], bins=50, alpha=0.7, label='Negative', density=True)
            plt.hist(y_pred_proba[y_true == 1], bins=50, alpha=0.7, label='Positive', density=True)
            plt.xlabel('Predicted Probability')
            plt.ylabel('Density')
            plt.title('Prediction Distribution')
            plt.legend()
            
            plt.subplot(1, 2, 2)
            plt.boxplot([y_pred_proba[y_true == 0], y_pred_proba[y_true == 1]], 
                       labels=['Negative', 'Positive'])
            plt.ylabel('Predicted Probability')
            plt.title('Prediction Distribution by Class')
            
            dist_path = self.plots_dir / 'prediction_distribution.png'
            plt.savefig(dist_path, dpi=300, bbox_inches='tight')
            plt.close()
            visualization_paths['prediction_distribution'] = str(dist_path)
            
            return visualization_paths
            
        except Exception as e:
            logger.warning(f"Visualization generation failed: {e}")
            return {'error': str(e)}
    
    def generate_evaluation_report(self, evaluation_results: Dict[str, Any]) -> str:
        """Generate a comprehensive evaluation report"""
        report_path = self.reports_dir / f"evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        html_content = self._create_html_report(evaluation_results)
        
        with open(report_path, 'w') as f:
            f.write(html_content)
        
        logger.info(f"Evaluation report generated: {report_path}")
        return str(report_path)
    
    def _create_html_report(self, results: Dict[str, Any]) -> str:
        """Create HTML evaluation report"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lavinth ML Model Evaluation Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .section {{ margin: 20px 0; }}
                .metric {{ display: inline-block; margin: 10px; padding: 10px; background-color: #e8f4f8; border-radius: 5px; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .good {{ color: green; font-weight: bold; }}
                .warning {{ color: orange; font-weight: bold; }}
                .bad {{ color: red; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🤖 Lavinth ML Model Evaluation Report</h1>
                <p><strong>Generated:</strong> {results.get('timestamp', 'Unknown')}</p>
                <p><strong>Dataset:</strong> {results.get('data_info', {}).get('n_samples', 'Unknown')} samples, 
                   {results.get('data_info', {}).get('n_features', 'Unknown')} features</p>
            </div>
        """
        
        # Basic metrics section
        if 'basic_metrics' in results:
            metrics = results['basic_metrics']
            html += f"""
            <div class="section">
                <h2>📊 Performance Metrics</h2>
                <div class="metric">
                    <strong>Accuracy:</strong> {metrics.get('accuracy', 0):.3f}
                </div>
                <div class="metric">
                    <strong>Precision:</strong> {metrics.get('precision', 0):.3f}
                </div>
                <div class="metric">
                    <strong>Recall:</strong> {metrics.get('recall', 0):.3f}
                </div>
                <div class="metric">
                    <strong>F1-Score:</strong> {metrics.get('f1_score', 0):.3f}
                </div>
                <div class="metric">
                    <strong>ROC-AUC:</strong> {metrics.get('roc_auc', 0):.3f}
                </div>
            </div>
            """
        
        # Add more sections as needed...
        
        html += """
        </body>
        </html>
        """
        
        return html

def main():
    """Example usage of model evaluator"""
    evaluator = ModelEvaluator()
    print("Model evaluator initialized!")
    print(f"Output directory: {evaluator.output_dir}")

if __name__ == "__main__":
    main()
