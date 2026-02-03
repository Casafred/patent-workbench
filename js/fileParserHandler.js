/**
 * File Parser Handler
 * 
 * Handles file upload and parsing using ZhipuAI's File Parser API.
 * Supports multiple file formats and parsing services (Lite, Expert, Prime).
 */

class FileParserHandler {
    constructor() {
        this.currentTask = null;
        this.pollingInterval = null;
        
        // Supported file types and their MIME types
        this.supportedTypes = {
            // 文档格式
            'application/pdf': { ext: 'PDF', maxSize: 100 * 1024 * 1024 },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'DOCX', maxSize: 50 * 1024 * 1024 },
            'application/msword': { ext: 'DOC', maxSize: 50 * 1024 * 1024 },
            'application/vnd.ms-excel': { ext: 'XLS', maxSize: 10 * 1024 * 1024 },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'XLSX', maxSize: 10 * 1024 * 1024 },
            'application/vnd.ms-powerpoint': { ext: 'PPT', maxSize: 50 * 1024 * 1024 },
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'PPTX', maxSize: 50 * 1024 * 1024 },
            'text/plain': { ext: 'TXT', maxSize: 50 * 1024 * 1024 },
            'text/markdown': { ext: 'MD', maxSize: 50 * 1024 * 1024 },
            'text/csv': { ext: 'CSV', maxSize: 10 * 1024 * 1024 },
            'text/html': { ext: 'HTML', maxSize: 50 * 1024 * 1024 },
            'application/epub+zip': { ext: 'EPUB', maxSize: 50 * 1024 * 1024 },
            // 图片格式
            'image/png': { ext: 'PNG', maxSize: 20 * 1024 * 1024 },
            'image/jpeg': { ext: 'JPG', maxSize: 20 * 1024 * 1024 },
            'image/bmp': { ext: 'BMP', maxSize: 20 * 1024 * 1024 },
            'image/gif': { ext: 'GIF', maxSize: 20 * 1024 * 1024 },
            'image/webp': { ext: 'WEBP', maxSize: 20 * 1024 * 1024 },
            'image/heic': { ext: 'HEIC', maxSize: 20 * 1024 * 1024 },
            'application/postscript': { ext: 'EPS', maxSize: 20 * 1024 * 1024 },
            'image/tiff': { ext: 'TIFF', maxSize: 20 * 1024 * 1024 },
            'image/heif': { ext: 'HEIF', maxSize: 20 * 1024 * 1024 },
            'image/jp2': { ext: 'JP2', maxSize: 20 * 1024 * 1024 }
        };
    }
    
    /**
     * Handle file upload and parsing
     * @param {File} file - File object
     * @param {string} toolType - Parsing service type (lite, expert, prime)
     * @returns {Promise<Object>} Parsing result
     */
    async handleFileUpload(file, toolType = 'lite') {
        try {
            // 1. Validate file
            this.validateFile(file);
            
            // 2. Show upload progress
            this.showUploadProgress(file.name);
            
            // 3. Create parsing task
            const taskResult = await this.createParserTask(file, toolType);
            
            // 4. Poll for result
            const parseResult = await this.pollParserResult(taskResult.task_id);
            
            // 5. Show completion
            this.showParseComplete(file.name, parseResult.content);
            
            return parseResult;
            
        } catch (error) {
            this.showError(error.message);
            throw error;
        }
    }
    
    /**
     * Create parsing task
     * @param {File} file - File object
     * @param {string} toolType - Parsing service type
     * @returns {Promise<Object>} Task creation result
     */
    async createParserTask(file, toolType) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tool_type', toolType);
        
        try {
            // apiCall 已经解包了 response.data，所以直接使用返回值
            const data = await apiCall('/files/parser/create', formData, 'POST');
            
            if (!data || !data.task_id) {
                console.error('Invalid response from parser API:', data);
                throw new Error('服务器返回无效响应，请稍后重试');
            }
            
            return data;
        } catch (error) {
            console.error('Create parser task error:', error);
            
            // 提取详细的错误信息
            let errorMessage = '创建解析任务失败';
            
            if (error.message) {
                // 如果错误消息已经是中文的详细信息，直接使用
                if (error.message.includes('API调用失败') || 
                    error.message.includes('创建解析任务失败') ||
                    error.message.includes('不支持的文件类型') ||
                    error.message.includes('文件大小超过限制')) {
                    errorMessage = error.message;
                }
                // 处理特定的英文错误
                else if (error.message.includes('API key')) {
                    errorMessage = 'API Key配置错误，请检查设置';
                } else if (error.message.includes('Unsupported file type')) {
                    errorMessage = '不支持的文件类型';
                } else if (error.message.includes('exceeds limit')) {
                    errorMessage = '文件大小超过限制';
                } else if (error.message.includes('timeout')) {
                    errorMessage = '请求超时，请检查网络连接';
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = '网络错误，请检查连接';
                } else {
                    // 其他错误，显示原始消息
                    errorMessage = `创建解析任务失败: ${error.message}`;
                }
            }
            
            throw new Error(errorMessage);
        }
    }
    
    /**
     * Poll for parsing result
     * @param {string} taskId - Task ID
     * @param {number} maxAttempts - Maximum polling attempts
     * @returns {Promise<Object>} Parsing result
     */
    async pollParserResult(taskId, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            // apiCall 已经解包了 response.data，所以直接使用返回值
            const data = await apiCall(
                `/files/parser/result/${taskId}?format_type=text&poll=false`,
                undefined,
                'GET'
            );
            
            if (!data) {
                throw new Error('Failed to get parsing result');
            }
            
            if (data.status === 'succeeded') {
                return data;
            } else if (data.status === 'failed') {
                throw new Error(data.error || 'Parsing failed');
            }
            
            // Update progress
            this.updateProgress(i + 1, maxAttempts);
            
            // Wait 2 seconds before next poll
            await this.sleep(2000);
        }
        
        throw new Error('解析超时，请稍后重试');
    }
    
    /**
     * Validate file
     * @param {File} file - File object
     * @throws {Error} If validation fails
     */
    validateFile(file) {
        if (!file) {
            throw new Error('请选择文件');
        }
        
        // Check file type
        const fileInfo = this.supportedTypes[file.type];
        if (!fileInfo) {
            throw new Error(`不支持的文件类型: ${file.type}`);
        }
        
        // Check file size
        if (file.size > fileInfo.maxSize) {
            const maxSizeMB = (fileInfo.maxSize / (1024 * 1024)).toFixed(0);
            throw new Error(`文件大小超过限制: ${maxSizeMB}MB`);
        }
        
        // Check if file is empty
        if (file.size === 0) {
            throw new Error('文件为空');
        }
    }
    
    /**
     * Show upload progress
     * @param {string} filename - File name
     */
    showUploadProgress(filename) {
        console.log(`Uploading file: ${filename}`);
        
        // Update UI if chatFileStatusArea exists
        if (typeof chatFileStatusArea !== 'undefined') {
            chatFileStatusArea.style.display = 'flex';
            chatFileStatusArea.innerHTML = `
                <div class="file-info">
                    <div class="file-processing-spinner"></div>
                    <span>正在上传文件: ${this.escapeHtml(filename)}...</span>
                </div>
            `;
        }
    }
    
    /**
     * Update progress
     * @param {number} current - Current attempt
     * @param {number} total - Total attempts
     */
    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        console.log(`Parsing progress: ${percentage}%`);
        
        // Update UI if chatFileStatusArea exists
        if (typeof chatFileStatusArea !== 'undefined') {
            chatFileStatusArea.innerHTML = `
                <div class="file-info">
                    <div class="file-processing-spinner"></div>
                    <span>正在解析文件... ${percentage}%</span>
                </div>
            `;
        }
    }
    
    /**
     * Show parse complete
     * @param {string} filename - File name
     * @param {string} content - Parsed content
     */
    showParseComplete(filename, content) {
        console.log(`Parsing complete: ${filename}`);
        console.log(`Content length: ${content.length} characters`);
        
        // Update UI if chatFileStatusArea exists
        if (typeof chatFileStatusArea !== 'undefined') {
            chatFileStatusArea.innerHTML = `
                <div class="file-info">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px; color: var(--primary-color);">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                    </svg>
                    <span>已附加文件:</span>
                    <span class="filename" title="${this.escapeHtml(filename)}">${this.escapeHtml(filename)}</span>
                </div>
                <button class="file-remove-btn" onclick="removeActiveFile()" title="移除文件">&times;</button>
            `;
        }
    }
    
    /**
     * Show error
     * @param {string} message - Error message
     */
    showError(message) {
        console.error(`File parser error: ${message}`);
        
        // Update UI if chatFileStatusArea exists
        if (typeof chatFileStatusArea !== 'undefined') {
            chatFileStatusArea.style.display = 'flex';
            chatFileStatusArea.innerHTML = `
                <div class="file-info" style="color: var(--error-color, #dc3545);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px;">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                    </svg>
                    <span>${this.escapeHtml(message)}</span>
                </div>
                <button class="file-remove-btn" onclick="removeActiveFile()" title="关闭">&times;</button>
            `;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Cancel current parsing task
     */
    cancelParsing() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.currentTask = null;
        console.log('Parsing cancelled');
    }
    
    /**
     * Get max file size for file type
     * @param {string} mimeType - MIME type
     * @returns {number} Max size in bytes
     */
    getMaxFileSize(mimeType) {
        const fileInfo = this.supportedTypes[mimeType];
        return fileInfo ? fileInfo.maxSize : 50 * 1024 * 1024; // Default 50MB
    }
    
    /**
     * Check if file type is supported
     * @param {string} mimeType - MIME type
     * @returns {boolean}
     */
    isFileTypeSupported(mimeType) {
        return mimeType in this.supportedTypes;
    }
    
    /**
     * Get supported file extensions
     * @returns {string[]} Array of supported extensions
     */
    getSupportedExtensions() {
        return Object.values(this.supportedTypes).map(info => info.ext);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileParserHandler;
}
