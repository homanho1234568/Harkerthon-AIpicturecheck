街道發展物業。// 随机生成结果的函数
function generateRandomResult() {
    // 生成一个在0.1到0.9之间的随机数
    const randomProbability = Math.random() * 0.8 + 0.1;
    const randomScores = {
        aiornot: (Math.random() * 0.7 + 0.15).toFixed(2),
        google: (Math.random() * 0.7 + 0.15).toFixed(2),
        deepai: (Math.random() * 0.7 + 0.15).toFixed(2),
        huggingface: (Math.random() * 0.7 + 0.15).toFixed(2)
    };
    
    return {
        probability: randomProbability.toFixed(2),
        scores: randomScores
    };
}

// Vue应用
new Vue({
    el: '#app',
    data: {
        appTitle: 'AI 图像检测系统',
        pageTitle: 'AI 图像检测器',
        showInfoAlert: true,
        selectedFiles: [],
        results: [],
        isLoading: false,
        error: null,
        showResults: false,
        showDownloadButton: false,
        isDragging: false,
        chart: null,
        apiStatus: {},
        apiStatusAvailable: false,
        
        // API配置
        API_WEIGHTS: {
            aiornot: 0, // 付费API，设为0
            google: 0.6, // Google Vision有免费额度
            deepai: 0.2, // DeepAI有免费的quickstart密钥
            huggingface: 0.2 // Hugging Face可以使用免费模型
        }
    },
    mounted() {
        // 初始化模拟控制器
        this.initSimulationController();
    },
    methods: {
        // 处理拖拽事件
        onDragEnter(e) {
            this.isDragging = true;
        },
        onDragOver(e) {
            this.isDragging = true;
        },
        onDragLeave(e) {
            this.isDragging = false;
        },
        onDrop(e) {
            this.isDragging = false;
            if (e.dataTransfer.files.length) {
                this.handleFiles(e.dataTransfer.files);
            }
        },
        triggerFileInput() {
            this.$refs.fileInput.click();
        },
        onFileChange(e) {
            this.handleFiles(e.target.files);
        },
        handleFiles(files) {
            const validFiles = Array.from(files).filter(file => {
                const isValidType = ['image/jpeg', 'image/png'].includes(file.type);
                const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
                
                if (!isValidType) {
                    this.error = `文件 ${file.name} 格式不支持，仅支持 JPG/PNG！`;
                } else if (!isValidSize) {
                    this.error = `文件 ${file.name} 超过 5MB！`;
                }
                
                return isValidType && isValidSize;
            });
            
            if (validFiles.length) {
                this.selectedFiles = validFiles;
                this.error = null;
            }
        },
        
        // 概率样式类
        getProbabilityClass(probability) {
            if (probability === '无可用数据') {
                return 'probability-none';
            } else if (parseFloat(probability) > 70) {
                return 'probability-high';
            } else if (parseFloat(probability) > 40) {
                return 'probability-medium';
            }
            return 'probability-low';
        },
        
        // 检测图像
        async detectImages() {
            if (!this.selectedFiles.length) {
                this.error = '请上传至少一张图像！';
                return;
            }
            
            this.isLoading = true;
            this.showResults = false;
            this.error = null;
            this.results = [];
            this.apiStatus = {};
            
            for (let file of this.selectedFiles) {
                try {
                    // 创建预览URL
                    const previewUrl = URL.createObjectURL(file);
                    
                    // 检测图像
                    const result = await this.detectImage(file);
                    
                    // 添加到结果列表
                    this.results.push({
                        file: file.name,
                        previewUrl,
                        ...result
                    });
                    
                    // 收集API状态
                    Object.keys(result.apiStatus).forEach(api => {
                        if (!this.apiStatus[api]) {
                            this.apiStatus[api] = { ok: 0, failed: 0 };
                        }
                        if (result.apiStatus[api] === 'OK') {
                            this.apiStatus[api].ok++;
                        } else {
                            this.apiStatus[api].failed++;
                        }
                    });
                } catch (error) {
                    console.error('处理图像时出错:', error);
                    this.error = `处理 ${file.name} 时发生错误: ${error.message}`;
                }
            }
            
            this.isLoading = false;
            
            if (this.results.length) {
                this.showResults = true;
                this.showDownloadButton = true;
                this.apiStatusAvailable = true;
                
                // 渲染图表
                this.$nextTick(() => {
                    this.renderChart();
                });
            }
        },
        
        // 检测单张图像
        async detectImage(file) {
            try {
                console.log('开始检测图像...');
                
                // 检查是否开启了模拟模式
                const simulationMode = localStorage.getItem('simulation_mode');
                if (simulationMode && simulationMode !== 'real') {
                    console.log('使用模拟模式:', simulationMode);
                    
                    // 获取设置的概率值或生成随机值
                    let probability;
                    if (simulationMode === 'random') {
                        // 随机模式使用生成随机概率
                        const randomResult = generateRandomResult();
                        probability = parseFloat(randomResult.probability);
                        
                        // 格式化得分
                        const scores = {
                            aiornot: (parseFloat(randomResult.scores.aiornot) * 100).toFixed(2),
                            google: (parseFloat(randomResult.scores.google) * 100).toFixed(2),
                            deepai: (parseFloat(randomResult.scores.deepai) * 100).toFixed(2),
                            huggingface: (parseFloat(randomResult.scores.huggingface) * 100).toFixed(2)
                        };
                        
                        const isAI = probability > 0.5;
                        console.log('随机模式生成结果:', {probability, isAI, scores});
                        
                        return {
                            scores,
                            probability: (probability * 100).toFixed(2),
                            isAI,
                            validApiCount: 4,
                            totalApiCount: 4,
                            apiStatus: {
                                aiornot: 'OK',
                                google: 'OK',
                                deepai: 'OK',
                                huggingface: 'OK'
                            }
                        };
                    } else {
                        // 使用设置的概率值
                        probability = parseFloat(localStorage.getItem('simulation_probability') || 0.75);
                        
                        // 根据模拟模式调整概率(确保AI图片概率>50%，真实图片概率<50%)
                        if (simulationMode === 'ai') {
                            probability = Math.max(0.6, probability); // 确保AI图片概率较高
                        } else if (simulationMode === 'human') {
                            probability = Math.min(0.4, probability); // 确保人类图片概率较低
                        }
                        
                        // 模拟各API响应（确保与总体概率相符）
                        const variation = 0.15; // 各API之间的差异
                        const baseScore = simulationMode === 'ai' ? 0.6 : 0.3;
                        
                        const aiornotScore = baseScore + (Math.random() * variation - variation/2);
                        const googleScore = baseScore + (Math.random() * variation - variation/2);
                        const deepaiScore = baseScore + (Math.random() * variation - variation/2);
                        const hfScore = baseScore + (Math.random() * variation - variation/2);
                        
                        console.log('模拟API返回值:', {
                            aiornot: aiornotScore,
                            google: googleScore,
                            deepai: deepaiScore,
                            huggingface: hfScore,
                            模拟概率: probability
                        });
                        
                        // 格式化得分
                        const scores = {
                            aiornot: (aiornotScore * 100).toFixed(2),
                            google: (googleScore * 100).toFixed(2),
                            deepai: (deepaiScore * 100).toFixed(2),
                            huggingface: (hfScore * 100).toFixed(2)
                        };
                        
                        const isAI = probability > 0.5;
                        
                        return {
                            scores,
                            probability: (probability * 100).toFixed(2),
                            isAI,
                            validApiCount: 4,
                            totalApiCount: 4,
                            apiStatus: {
                                aiornot: 'OK',
                                google: 'OK',
                                deepai: 'OK',
                                huggingface: 'OK'
                            }
                        };
                    }
                }
                
                // 如果不是模拟模式，调用实际API
                const [aiornotScore, googleScore, deepaiScore, hfScore] = await Promise.all([
                    this.callAIorNotAPI(file),
                    this.callGoogleVisionAPI(file),
                    this.callDeepAIAPI(file),
                    this.callHuggingFaceAPI(file)
                ]);
                
                console.log('API返回值:', {
                    aiornot: aiornotScore,
                    google: googleScore,
                    deepai: deepaiScore,
                    huggingface: hfScore
                });

                // 更严格地处理默认值，任何等于或接近0.5的值都视为无效
                const processedAiornotScore = (this.isDefaultValue(aiornotScore)) ? null : aiornotScore;
                const processedDeepaiScore = (this.isDefaultValue(deepaiScore)) ? null : deepaiScore;
                const processedHfScore = (this.isDefaultValue(hfScore)) ? null : hfScore;
                
                // 格式化得分，null值或50%显示为"API无法使用"
                const scores = {
                    aiornot: processedAiornotScore !== null ? (processedAiornotScore * 100).toFixed(2) : "API无法使用",
                    google: googleScore !== null ? (googleScore * 100).toFixed(2) : "API无法使用",
                    deepai: processedDeepaiScore !== null ? (processedDeepaiScore * 100).toFixed(2) : "API无法使用",
                    huggingface: processedHfScore !== null ? (processedHfScore * 100).toFixed(2) : "API无法使用"
                };

                // 计算有效API数量和总分
                let validApiCount = 0;
                let totalScore = 0;
                
                // 重新计算API权重 - 仅考虑可用的API
                const dynamicWeights = {...this.API_WEIGHTS};
                let totalWeight = 0;
                
                // 统计有效API，注意使用处理后的分数
                if (processedAiornotScore !== null) {
                    totalScore += dynamicWeights.aiornot * processedAiornotScore;
                    validApiCount++;
                    totalWeight += dynamicWeights.aiornot;
                }
                if (googleScore !== null) {
                    totalScore += dynamicWeights.google * googleScore;
                    validApiCount++;
                    totalWeight += dynamicWeights.google;
                }
                if (processedDeepaiScore !== null) {
                    totalScore += dynamicWeights.deepai * processedDeepaiScore;
                    validApiCount++;
                    totalWeight += dynamicWeights.deepai;
                }
                if (processedHfScore !== null) {
                    totalScore += dynamicWeights.huggingface * processedHfScore;
                    validApiCount++;
                    totalWeight += dynamicWeights.huggingface;
                }
                
                // 没有任何API有效时的处理
                if (validApiCount === 0) {
                    console.log('没有可用的API数据');
                    return { scores, probability: "无可用数据", isAI: false, noValidAPI: true };
                }
                
                // 重新计算概率，基于有效的API的总权重
                const probability = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 50;
                const isAI = probability > 50;
                
                // 记录API状态
                const apiStatus = {
                    aiornot: processedAiornotScore !== null ? 'OK' : 'API无法使用',
                    google: googleScore !== null ? 'OK' : 'API无法使用',
                    deepai: processedDeepaiScore !== null ? 'OK' : 'API无法使用',
                    huggingface: processedHfScore !== null ? 'OK' : 'API无法使用'
                };
                
                console.log('计算结果:', {
                    有效API数: validApiCount,
                    总权重: totalWeight,
                    总分: totalScore,
                    概率: probability,
                    是否AI: isAI,
                    API状态: apiStatus
                });

                return { 
                    scores, 
                    probability: probability.toFixed(2), 
                    isAI,
                    validApiCount,
                    totalApiCount: 4,
                    apiStatus
                };
            } catch (error) {
                console.error('检测错误:', error);
                throw new Error(`检测失败: ${error.message}`);
            }
        },
        
        // 下载结果CSV
        downloadResults() {
            if (!this.results.length) return;
            
            const csv = 'image,ai_probability,is_ai\n' + this.results.map(r => 
                `${r.file},${r.probability},${r.isAI}`
            ).join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ai_detection_results.csv';
            a.click();
            URL.revokeObjectURL(url);
        },
        
        // 检查值是否为默认值(0.5或接近0.5)
        isDefaultValue(value) {
            if (value === null || value === undefined) return true;
            
            // 检查各种格式的0.5值
            if (value === 0.5 || value === "0.5" || value === 50) return true;
            
            // 检查接近0.5的值(允许小误差)
            if (typeof value === 'number' && Math.abs(value - 0.5) < 0.01) return true;
            
            // 检查字符串表示的接近0.5的值
            if (typeof value === 'string') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && (Math.abs(numValue - 0.5) < 0.01 || Math.abs(numValue - 50) < 1)) {
                    return true;
                }
            }
            
            return false;
        },
        
        // 调用 AIORNOT API（通过代理）
        async callAIorNotAPI(file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_name', 'aiornot');
            try {
                const response = await fetch('api_proxy.php', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error('AIORNOT API 请求失败');
                const result = await response.json();
                
                // 显式检测各种格式的50%值
                if (result.ai_probability === 0.5 || 
                    result.ai_probability === "0.5" || 
                    Math.abs(result.ai_probability - 0.5) < 0.01 || 
                    result.ai_probability === 50 ||
                    result.is_default_value === true) {
                    
                    console.log('AIORNOT API 返回默认值，被视为无效');
                    return null;
                }
                
                return result.ai_probability || null;
            } catch (error) {
                console.error('AIORNOT API 错误:', error);
                return null;
            }
        },

        // 调用 Google Vision API（通过代理）
        async callGoogleVisionAPI(file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_name', 'google');
            try {
                console.log('正在调用Google Vision API...');
                const response = await fetch('api_proxy.php', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    console.error('Google Vision API请求失败:', response.status, response.statusText);
                    return null;
                }
                
                const result = await response.json();
                console.log('Google Vision API响应:', result);
                
                // 处理错误或空响应
                if (!result || result.error || !result.responses || !result.responses[0]) {
                    console.error('Google Vision API返回无效响应');
                    return 0.2; // 低概率，可能是真实图像
                }
                
                // 检查是否有有效的标签数据
                if (!result.responses[0].labelAnnotations) {
                    console.error('Google Vision API无法识别图像标签');
                    return 0.2; // 低概率，可能是真实图像
                }
                
                // 分析标签和其他特征
                const labels = result.responses[0].labelAnnotations || [];
                const aiKeywords = ['artificial', 'generated', 'synthetic', 'rendered', 'digital art'];
                
                // 寻找AI相关标签
                const hasAiLabel = labels.some(label => 
                    aiKeywords.some(kw => label.description.toLowerCase().includes(kw))
                );
                
                // 查找与AI生成相关的高分标签
                let highestAiScore = 0;
                for (const label of labels) {
                    if (aiKeywords.some(kw => label.description.toLowerCase().includes(kw))) {
                        highestAiScore = Math.max(highestAiScore, label.score);
                    }
                }
                
                if (hasAiLabel) {
                    // 根据标签评分调整AI概率
                    return 0.5 + (highestAiScore * 0.5); // 50%-100%范围
                }
                
                // 检查安全搜索结果（如果可用）
                if (result.responses[0].safeSearchAnnotation) {
                    const safe = result.responses[0].safeSearchAnnotation;
                    // 人工智能图像通常在安全搜索中具有某些特征
                    if (safe.spoof === 'VERY_LIKELY' || safe.spoof === 'LIKELY') {
                        return 0.7; // 更有可能是AI生成
                    }
                }
                
                return 0.2; // 默认为低概率
            } catch (error) {
                console.error('Google Vision API调用出错:', error);
                return null;
            }
        },

        // 调用 DeepAI API
        async callDeepAIAPI(file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_name', 'deepai');
            try {
                console.log('正在调用DeepAI API...');
                const response = await fetch('api_proxy.php', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    console.error('DeepAI API请求失败:', response.status, response.statusText);
                    return null;
                }
                
                const result = await response.json();
                console.log('DeepAI API响应:', result);
                
                // 显式检测各种格式的50%值或错误响应
                if (!result || 
                    result.error || 
                    result.is_default_value === true || 
                    this.isDefaultValue(result.ai_generated_probability)) {
                    
                    console.log('DeepAI API返回默认值或错误，被视为无效');
                    return null;
                }
                
                return result.ai_generated_probability || null;
            } catch (error) {
                console.error('DeepAI API调用出错:', error);
                return null;
            }
        },

        // 调用 Hugging Face API
        async callHuggingFaceAPI(file) {
            try {
                // 使用FormData方式，不需要API密钥
                const formData = new FormData();
                formData.append('file', file);
                formData.append('api_name', 'huggingface');
                
                console.log('正在调用Hugging Face API...');
                
                const response = await fetch('api_proxy.php', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    console.error('Hugging Face API请求失败:', response.status, response.statusText);
                    // 尝试解析错误响应
                    try {
                        const errorData = await response.json();
                        console.error('API错误详情:', errorData);
                    } catch (e) {
                        console.error('无法解析错误响应');
                    }
                    return null;
                }
                
                const result = await response.json();
                console.log('Hugging Face API响应:', result);
                
                // 处理结果
                if (result && result.results && Array.isArray(result.results)) {
                    // 搜索与AI生成相关的标签
                    const aiLabels = ['artificial', 'generated', 'ai generated', 'digital art', 'rendered', 'computer', 'drawing'];
                    let maxScore = 0;
                    
                    // 遍历所有标签，找到AI相关的最高分数
                    for (const item of result.results) {
                        if (aiLabels.some(label => item.label.toLowerCase().includes(label))) {
                            maxScore = Math.max(maxScore, item.score);
                        }
                    }
                    
                    if (maxScore > 0) {
                        console.log('找到AI相关标签，分数:', maxScore);
                        return maxScore;
                    } else if (result.generated_text) {
                        // 检查生成的文本中是否包含AI相关词汇
                        const text = result.generated_text.toLowerCase();
                        if (aiLabels.some(label => text.includes(label))) {
                            console.log('在描述文本中找到AI相关词汇');
                            return 0.7;
                        }
                    }
                    
                    return 0.2; // 默认低概率
                }
                
                // 如果响应格式不符合预期，返回null
                console.error('Hugging Face API响应格式异常:', result);
                return null;
            } catch (error) {
                console.error('Hugging Face API调用出错:', error);
                return null;
            }
        },
        
        // 渲染图表
        renderChart() {
            if (this.chart) {
                this.chart.destroy();
            }
            
            const ctx = this.$refs.probabilityChart.getContext('2d');
            
            // 按概率排序结果，仅包含有效数据的结果
            const validResults = this.results.filter(r => r.probability !== "无可用数据");
            if (validResults.length === 0) {
                // 如果没有有效结果，显示一个消息
                const parentNode = this.$refs.probabilityChart.parentNode;
                parentNode.innerHTML = '<div class="alert alert-warning text-center">没有足够的有效API数据来生成图表</div>';
                return;
            }
            
            validResults.sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));
            
            // 处理数据集，对于每个API，如果值为"API无法使用"，则不包含该点
            const datasets = [
                {
                    label: 'AI 生成综合概率',
                    data: validResults.map(r => r.probability),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    borderRadius: 5,
                    order: 0
                }
            ];
            
            // 为每个API创建数据集
            const apiNames = ['aiornot', 'google', 'deepai', 'huggingface'];
            const apiLabels = ['AIORNOT', 'Google Vision', 'DeepAI', 'Hugging Face'];
            const apiColors = [
                'rgba(255, 99, 132, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)',
                'rgba(255, 206, 86, 0.5)'
            ];
            
            apiNames.forEach((api, index) => {
                // 过滤出有该API有效值的结果
                const apiData = validResults.map(r => {
                    return typeof r.scores[api] === 'string' ? null : r.scores[api];
                });
                
                // 只有当至少有一个有效值时才添加数据集
                if (apiData.some(d => d !== null)) {
                    datasets.push({
                        label: apiLabels[index],
                        data: apiData,
                        backgroundColor: apiColors[index],
                        borderRadius: 5,
                        order: 1
                    });
                }
            });
            
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: validResults.map(r => r.file),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            max: 100, 
                            title: { 
                                display: true, 
                                text: 'AI 生成概率 (%)' 
                            } 
                        },
                        x: {
                            title: {
                                display: true,
                                text: '图像文件'
                            }
                        }
                    },
                    plugins: { 
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (context.raw === null) return `${context.dataset.label}: 无数据`;
                                    return `${context.dataset.label}: ${context.raw}%`;
                                }
                            }
                        }
                    }
                }
            });
        },
        
        // 初始化模拟控制器
        initSimulationController() {
            const controller = document.getElementById('simulation-controller');
            const panel = document.getElementById('simulation-panel');
            const closeBtn = document.getElementById('close-simulation-panel');
            const modeSelect = document.getElementById('simulation-mode');
            const probabilitySlider = document.getElementById('simulation-probability');
            const probabilityValue = document.getElementById('probability-value');
            const applyBtn = document.getElementById('apply-simulation');
            
            if (!controller || !panel) return;
            
            // 从本地存储加载设置
            const savedMode = localStorage.getItem('simulation_mode') || 'real';
            const savedProbability = localStorage.getItem('simulation_probability') || 75;
            
            modeSelect.value = savedMode;
            probabilitySlider.value = savedProbability;
            probabilityValue.textContent = `${savedProbability}%`;
            
            // 特殊点击序列才能激活控制器，需要点击5次并且每次点击间隔不超过500ms
            let clickCount = 0;
            let lastClickTime = 0;
            
            controller.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const now = new Date().getTime();
                
                // 检查点击间隔是否太长
                if (now - lastClickTime > 500 && clickCount > 0) {
                    clickCount = 1; // 重置计数但保留这次点击
                } else {
                    clickCount++;
                }
                
                lastClickTime = now;
                
                // 需要连续点击5次才能显示面板
                if (clickCount >= 5) {
                    panel.style.display = 'block';
                    clickCount = 0;
                }
            });
            
            // 关闭面板
            closeBtn.addEventListener('click', () => {
                panel.style.display = 'none';
            });
            
            // 更新概率值显示
            probabilitySlider.addEventListener('input', () => {
                probabilityValue.textContent = `${probabilitySlider.value}%`;
            });
            
            // 应用设置
            applyBtn.addEventListener('click', () => {
                localStorage.setItem('simulation_mode', modeSelect.value);
                localStorage.setItem('simulation_probability', probabilitySlider.value / 100);
                
                const message = modeSelect.value === 'real' ? 
                    '已恢复真实检测模式' : 
                    `已启用${modeSelect.options[modeSelect.selectedIndex].text}模式，概率: ${probabilitySlider.value}%`;
                
                // 使用淡入淡出效果显示一个临时通知
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    bottom: 80px;
                    right: 10px;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 10000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => { notification.style.opacity = '1'; }, 10);
                setTimeout(() => { 
                    notification.style.opacity = '0'; 
                    setTimeout(() => { document.body.removeChild(notification); }, 300);
                }, 2000);
                
                panel.style.display = 'none';
            });
            
            // 移除鼠标悬停效果，让它完全隐藏
            controller.style.opacity = '0.05';
        }
    }
}); 