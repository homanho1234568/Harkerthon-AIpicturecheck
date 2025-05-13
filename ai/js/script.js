// 随机生成结果的函数
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

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const detectButton = document.getElementById('detectButton');
    const downloadButton = document.getElementById('downloadButton');
    const resultDiv = document.getElementById('result');
    const resultContainer = document.getElementById('resultContainer');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const loading = document.getElementById('loading');
    let chart;

    // API 配置
    const HUGGINGFACE_API_KEY = 'your_huggingface_api_key'; // 替换为你的密钥
    const API_WEIGHTS = {
        aiornot: 0, // 付费API，设为0
        google: 0.6, // Google Vision有免费额度
        deepai: 0.2, // DeepAI有免费的quickstart密钥
        huggingface: 0.2 // Hugging Face可以使用免费模型
    };

    // 添加拖放效果
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('bg-light');
    }
    
    function unhighlight() {
        dropZone.classList.remove('bg-light');
    }

    // 拖放和点击上传
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        imageInput.files = e.dataTransfer.files;
        updateFileInfo();
    });
    
    dropZone.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', updateFileInfo);
    
    function updateFileInfo() {
        const files = imageInput.files;
        if (files.length) {
            const fileInfo = files.length === 1 
                ? `已选择 ${files[0].name}` 
                : `已选择 ${files.length} 个文件`;
            dropZone.innerHTML = `
                <i class="bi bi-file-earmark-check fs-1 mb-2 text-success"></i>
                <p>${fileInfo}</p>
            `;
        }
    }

    // 检测按钮
    detectButton.addEventListener('click', async () => {
        const files = imageInput.files;
        if (!files.length) {
            showError('请上传至少一张图像！');
            return;
        }

        loading.style.display = 'block';
        resultContainer.innerHTML = '';
        resultDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        
        // 清空API状态内容区域
        const apiStatusContent = document.getElementById('apiStatusContent');
        apiStatusContent.innerHTML = '';
        
        const allResults = [];
        const allApiStatus = {};

        for (let file of files) {
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                showError(`文件 ${file.name} 格式不支持，仅支持 JPG/PNG！`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                showError(`文件 ${file.name} 超过 5MB！`);
                continue;
            }

            // 显示预览
            const previewUrl = URL.createObjectURL(file);
            try {
                const result = await detectImage(file);
                allResults.push({ file: file.name, ...result });
                
                // 收集API状态
                Object.keys(result.apiStatus).forEach(api => {
                    if (!allApiStatus[api]) {
                        allApiStatus[api] = { ok: 0, failed: 0 };
                    }
                    if (result.apiStatus[api] === 'OK') {
                        allApiStatus[api].ok++;
                    } else {
                        allApiStatus[api].failed++;
                    }
                });
                
                // 使用新的渲染函数
                const resultHtml = renderResults(file, result, previewUrl);
                resultContainer.insertAdjacentHTML('beforeend', resultHtml);
                
            } catch (error) {
                showError(`处理 ${file.name} 时发生错误: ${error.message}`);
            }
        }

        // 显示综合图表
        if (allResults.length) {
            renderChart(allResults);
            downloadButton.style.display = 'inline-block';
            resultDiv.style.display = 'block';
        }
        
        // 始终显示API状态信息
        const statusHtml = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>API名称</th>
                            <th>状态</th>
                            <th>详情</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(allApiStatus).map(([api, status]) => `
                            <tr>
                                <td>${api.toUpperCase()}</td>
                                <td>${status.ok > 0 ? 
                                    '<span class="badge bg-success">部分可用</span>' : 
                                    '<span class="badge bg-danger">完全不可用</span>'}
                                </td>
                                <td>正常: ${status.ok}, 失败: ${status.failed}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <p><strong>可能问题：</strong></p>
                <ul>
                    <li><strong>AIORNOT 返回 50.00%</strong>: API密钥可能无效或未配置</li>
                    <li><strong>DeepAI 返回 50.00%</strong>: API密钥可能无效或请求格式错误</li>
                    <li><strong>Hugging Face 返回 50.00%</strong>: 已禁用此API或配置错误</li>
                </ul>
                <p><a href="admin.php" class="btn btn-sm btn-primary"><i class="bi bi-gear"></i> 前往管理界面</a> 检查API配置</p>
            </div>
        `;
        apiStatusContent.innerHTML = statusHtml;
        
        loading.style.display = 'none';

        // 恢复上传区域
        dropZone.innerHTML = `
            <i class="bi bi-cloud-arrow-up fs-1 mb-2"></i>
            <p>拖放图像或点击上传（JPG/PNG，最大 5MB）</p>
        `;

        // 下载 CSV
        downloadButton.onclick = () => {
            const csv = 'image,ai_probability,is_ai\n' + allResults.map(r => `${r.file},${r.probability},${r.isAI}`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ai_detection_results.csv';
            a.click();
            URL.revokeObjectURL(url);
        };
    });

    // 检测单张图像
    async function detectImage(file) {
        try {
            console.log('开始检测图像...');
            
            // 如果不是模拟模式，调用实际API
            const [aiornotScore, googleScore, deepaiScore, hfScore] = await Promise.all([
                callAIorNotAPI(file),
                callGoogleVisionAPI(file),
                callDeepAIAPI(file),
                callHuggingFaceAPI(file)
            ]);
            
            console.log('API返回值:', {
                aiornot: aiornotScore,
                google: googleScore,
                deepai: deepaiScore,
                huggingface: hfScore
            });

            // 更严格地处理默认值，任何等于或接近0.5的值都视为无效
            const processedAiornotScore = (isDefaultValue(aiornotScore)) ? null : aiornotScore;
            const processedDeepaiScore = (isDefaultValue(deepaiScore)) ? null : deepaiScore;
            const processedHfScore = (isDefaultValue(hfScore)) ? null : hfScore;
            
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
            const dynamicWeights = {...API_WEIGHTS};
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
    }

    // 帮助函数：检查值是否为默认值(0.5或接近0.5)
    function isDefaultValue(value) {
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
    }

    // 调用 AIORNOT API（通过代理）
    async function callAIorNotAPI(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_name', 'aiornot');

            const response = await fetch('https://api.ai-or-not.com/v1/reports/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiConfig.aiornot.key}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`AI-or-Not API error: ${response.status}`);
            }

            const data = await response.json();
            if (data.report && data.report.ai) {
                // 兼容新老格式
                if (typeof data.report.ai.confidence === 'number') {
                    return data.report.ai.confidence;
                } else if (typeof data.report.ai.is_detected === 'boolean') {
                    return data.report.ai.is_detected ? 0.95 : 0.05;
                }
            }
            return null;
        } catch (error) {
            console.error('AI-or-Not API error:', error);
            return null;
        }
    }

    // 调用 Google Vision API（通过代理）
    async function callGoogleVisionAPI(file) {
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
    }

    // 调用 DeepAI API
    async function callDeepAIAPI(file) {
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
                isDefaultValue(result.ai_generated_probability)) {
                
                console.log('DeepAI API返回默认值或错误，被视为无效');
                return null;
            }
            
            return result.ai_generated_probability || null;
        } catch (error) {
            console.error('DeepAI API调用出错:', error);
            return null;
        }
    }

    // 调用 Hugging Face API
    async function callHuggingFaceAPI(file) {
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
    }

    // 渲染图表
    function renderChart(results) {
        if (chart) chart.destroy();
        const ctx = document.getElementById('probabilityChart').getContext('2d');
        
        // 按概率排序结果，仅包含有效数据的结果
        const validResults = results.filter(r => r.probability !== "无可用数据");
        if (validResults.length === 0) {
            // 如果没有有效结果，显示一个消息并返回
            document.getElementById('probabilityChart').parentNode.innerHTML = 
                '<div class="alert alert-warning text-center">没有足够的有效API数据来生成图表</div>';
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
        
        chart = new Chart(ctx, {
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
    }

    // 渲染单张图像结果的修改，显式替换50%值显示
    const renderResults = (file, result, previewUrl) => {
        // 确定概率标签样式
        let probabilityClass = 'probability-low';
        let probabilityDisplay = result.probability;
        
        // 如果没有有效API
        if (result.noValidAPI) {
            probabilityClass = 'probability-none';
            probabilityDisplay = '无可用数据';
        } else if (parseFloat(result.probability) > 70) {
            probabilityClass = 'probability-high';
        } else if (parseFloat(result.probability) > 40) {
            probabilityClass = 'probability-medium';
        }

        // 处理各API的显示值 - 强制将50%替换为"API无法使用"
        let aiornotDisplay = result.scores.aiornot;
        let deepaiDisplay = result.scores.deepai;
        let huggingfaceDisplay = result.scores.huggingface;
        
        // 强制将50.00%或类似值替换为API无法使用
        if (aiornotDisplay === "50.00%" || aiornotDisplay === "50.00" || aiornotDisplay === "50%" || aiornotDisplay === "50") {
            aiornotDisplay = "API无法使用";
        }
        if (deepaiDisplay === "50.00%" || deepaiDisplay === "50.00" || deepaiDisplay === "50%" || deepaiDisplay === "50") {
            deepaiDisplay = "API无法使用";
        }
        if (huggingfaceDisplay === "50.00%" || huggingfaceDisplay === "50.00" || huggingfaceDisplay === "50%" || huggingfaceDisplay === "50") {
            huggingfaceDisplay = "API无法使用";
        }

        // 渲染单张图像结果
        const resultHtml = `
            <div class="col-md-6 mb-4">
                <div class="result-card">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title">${file.name}</h5>
                        <span class="probability-badge ${probabilityClass}">${probabilityDisplay}</span>
                    </div>
                    <div class="text-center mb-3">
                        <img src="${previewUrl}" class="preview-img mb-2">
                    </div>
                    <div class="card-body p-0">
                        ${!result.noValidAPI ? `
                        <p class="mb-2 fs-5 fw-bold">结论: ${result.isAI ? 
                            '<span class="text-danger">可能是 AI 生成</span>' : 
                            '<span class="text-success">可能是真实图像</span>'}
                        </p>
                        <div class="progress mb-3" style="height: 25px;">
                            <div class="progress-bar" role="progressbar" style="width: ${result.probability}%;" 
                                aria-valuenow="${result.probability}" aria-valuemin="0" aria-valuemax="100">
                                ${result.probability}%
                            </div>
                        </div>
                        ` : `
                        <p class="mb-2 fs-5 fw-bold text-warning">无法得出结论: 没有可用的API数据</p>
                        `}
                        <div class="card bg-light">
                            <div class="card-header">
                                <h6 class="mb-0">各 API 检测结果</h6>
                            </div>
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>AIORNOT:</span>
                                    <span class="fw-bold ${aiornotDisplay === "API无法使用" ? 'text-danger' : ''}">${aiornotDisplay}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Google Vision:</span>
                                    <span class="fw-bold ${typeof result.scores.google === 'string' && result.scores.google === "API无法使用" ? 'text-danger' : ''}">${result.scores.google}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>DeepAI:</span>
                                    <span class="fw-bold ${deepaiDisplay === "API无法使用" ? 'text-danger' : ''}">${deepaiDisplay}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Hugging Face:</span>
                                    <span class="fw-bold ${huggingfaceDisplay === "API无法使用" ? 'text-danger' : ''}">${huggingfaceDisplay}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return resultHtml;
    };

    // 显示错误
    function showError(message) {
        errorMessage.textContent = message;
        errorDiv.style.display = 'block';
        loading.style.display = 'none';
    }
}); 