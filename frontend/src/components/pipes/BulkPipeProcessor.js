import React, { useState } from 'react';
import { ocrAPI } from '../../utils/api';
import './BulkPipeProcessor.css';

const BulkPipeProcessor = () => {
    const [formData, setFormData] = useState({
        batchNumber: '',
        manufacturingDate: '',
        sizeType: '', // Added size preselector
        defaultColorGrade: 'A' // Added default color grade
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Size options for bulk processing
    const sizeOptions = [
        { value: '4 inch', label: '4 inch' },
        { value: '6 inch', label: '6 inch' },
        { value: '8 inch', label: '8 inch' },
        { value: '10 inch', label: '10 inch' },
        { value: '12 inch', label: '12 inch' },
        { value: '16 inch', label: '16 inch' },
        { value: '20 inch', label: '20 inch' }
    ];

    // Color grade options
    const colorGradeOptions = [
        { value: 'A', label: 'Grade A (Excellent)' },
        { value: 'B', label: 'Grade B (Good)' },
        { value: 'C', label: 'Grade C (Fair)' },
        { value: 'D', label: 'Grade D (Poor)' }
    ];

    const generateBatchNumber = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const batchNumber = `BATCH_${timestamp}_${random}`;
        setFormData(prev => ({ ...prev, batchNumber }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const clearForm = () => {
        setFormData({
            batchNumber: '',
            manufacturingDate: '',
            sizeType: '',
            defaultColorGrade: 'A'
        });
        setImageFile(null);
        setImagePreview(null);
        setResult(null);
        setError(null);
    };

    const processBulkPipes = async () => {
        if (!imageFile) {
            setError('Please select an image to process');
            return;
        }

        if (!formData.batchNumber) {
            setError('Please enter or generate a batch number');
            return;
        }

        if (!formData.sizeType) {
            setError('Please select the pipe size for this batch');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            // Convert image to base64
            const base64Image = imagePreview;
            
            const response = await ocrAPI.processBulkPipes({
                imageUrl: base64Image,
                batchNumber: formData.batchNumber,
                manufacturingDate: formData.manufacturingDate || new Date().toISOString(),
                sizeType: formData.sizeType, // Pass selected size
                defaultColorGrade: formData.defaultColorGrade // Pass default color grade
            });

            // Axios returns { data, status, headers, ... }
            setResult(response?.data || null);
            console.log('Bulk processing result:', response?.data);
        } catch (err) {
            setError(err.message || 'Failed to process bulk pipes');
            console.error('Bulk processing error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bulk-pipe-processor">
            <div className="bulk-pipe-header">
                <h2>AI-Powered Bulk Pipe Processing</h2>
                <p>Upload an image of your pipe manufacturing data and let AI extract all pipe information automatically</p>
            </div>

            <div className="bulk-pipe-form">
                <div className="form-section">
                    <h3>Batch Information</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="batchNumber">Batch Number</label>
                            <div className="input-with-button">
                                <input
                                    type="text"
                                    id="batchNumber"
                                    name="batchNumber"
                                    value={formData.batchNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter batch number or generate one"
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="generate-btn"
                                    onClick={generateBatchNumber}
                                >
                                    Generate
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="manufacturingDate">Manufacturing Date</label>
                            <input
                                type="date"
                                id="manufacturingDate"
                                name="manufacturingDate"
                                value={formData.manufacturingDate}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* New Size and Grade Preselector Section */}
                <div className="form-section">
                    <h3>Batch Specifications</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="sizeType">Pipe Size (All pipes in this batch)</label>
                            <select
                                id="sizeType"
                                name="sizeType"
                                value={formData.sizeType}
                                onChange={handleInputChange}
                                required
                                className="size-select"
                            >
                                <option value="">Select pipe size</option>
                                {sizeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <small className="form-help">
                                Since bulk processing typically involves pipes of the same size, 
                                select the size for all pipes in this batch
                            </small>
                        </div>
                        <div className="form-group">
                            <label htmlFor="defaultColorGrade">Default Color Grade</label>
                            <select
                                id="defaultColorGrade"
                                name="defaultColorGrade"
                                value={formData.defaultColorGrade}
                                onChange={handleInputChange}
                                className="grade-select"
                            >
                                {colorGradeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <small className="form-help">
                                Default grade if not specified in the image. 
                                Can be overridden by OCR data
                            </small>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Upload Manufacturing Data Image</h3>
                    <div className="image-upload-area">
                        {!imagePreview ? (
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="file-input"
                                    id="imageUpload"
                                />
                                <label htmlFor="imageUpload" style={{ cursor: 'pointer' }}>
                                    <p>📷 Click to upload or drag and drop</p>
                                    <p style={{ fontSize: '0.9em', color: '#666' }}>
                                        Supported formats: JPEG, PNG, GIF
                                    </p>
                                    <p style={{ fontSize: '0.9em', color: '#888', marginTop: '10px' }}>
                                        <strong>Tip:</strong> Ensure the image contains clear pipe data with SNO, MTR, Weight, and Grade information
                                    </p>
                                </label>
                            </div>
                        ) : (
                            <div className="image-preview">
                                <img src={imagePreview} alt="Preview" />
                                <button 
                                    type="button" 
                                    className="remove-image-btn"
                                    onClick={removeImage}
                                >
                                    Remove Image
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <h4>Error</h4>
                        <p>{error}</p>
                    </div>
                )}

                <div className="form-actions">
                    <button
                        type="button"
                        className="process-btn"
                        onClick={processBulkPipes}
                        disabled={isProcessing || !imageFile || !formData.batchNumber || !formData.sizeType}
                    >
                        {isProcessing ? 'Processing...' : 'Process Bulk Pipes with AI'}
                    </button>
                    <button
                        type="button"
                        className="clear-btn"
                        onClick={clearForm}
                        disabled={isProcessing}
                    >
                        Clear Form
                    </button>
                </div>
            </div>

            {result && (
                <div className="result-section">
                    <h3>Processing Results</h3>
                    
                    <div className="result-summary">
                        <div className="summary-item">
                            <span className="label">Total Pipes Detected</span>
                            <span className="value">{result.totalPipes ?? 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Successfully Saved</span>
                            <span className="value success">{result.savedPipes ?? 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Errors</span>
                            <span className="value error">{result.errors ?? 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">AI Service Used</span>
                            <span className="value">{Array.isArray(result.aiServicesUsed) && result.aiServicesUsed.length > 0 ? result.aiServicesUsed.join(', ') : 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Batch Size</span>
                            <span className="value">{formData.sizeType}</span>
                        </div>
                    </div>

                    {Array.isArray(result.savedPipesData) && result.savedPipesData.length > 0 && (
                        <div className="saved-pipes">
                            <h4>Successfully Saved Pipes</h4>
                            <div className="pipes-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Serial Number</th>
                                            <th>Color Grade</th>
                                            <th>Size Type</th>
                                            <th>Length (MTR)</th>
                                            <th>Weight</th>
                                            <th>Price</th>
                                            <th>Batch Number</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.savedPipesData.map((pipe, index) => (
                                            <tr key={index}>
                                                <td>{pipe.serialNumber}</td>
                                                <td>{pipe.colorGrade}</td>
                                                <td>{pipe.sizeType}</td>
                                                <td>{pipe.length}</td>
                                                <td>{pipe.weight}</td>
                                                <td>${pipe.price}</td>
                                                <td>{pipe.batchNumber}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {Array.isArray(result.errorDetails) && result.errorDetails.length > 0 && (
                        <div className="error-details">
                            <h4>Processing Errors</h4>
                            <ul>
                                {result.errorDetails.map((error, index) => (
                                    <li key={index}>
                                        <strong>Serial Number {error.serialNumber}:</strong> {error.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="ocr-details">
                        <h4>OCR Processing Details</h4>
                        <div className="ocr-text">
                            <h5>Raw OCR Text</h5>
                            <pre>{result.rawText || ''}</pre>
                        </div>
                        <div className="ocr-text">
                            <h5>Corrected Text</h5>
                            <pre>{result.correctedText || ''}</pre>
                        </div>
                        <div className="ocr-text">
                            <h5>Confidence Score</h5>
                            <pre>{typeof result.confidence === 'number' ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A'}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkPipeProcessor;
