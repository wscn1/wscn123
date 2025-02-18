let currentImageData = null;
let allImages = [];
let activeTag = null;

function scanFolder() {
    const folderPath = document.getElementById('folderPath').value;
    if (!folderPath) {
        alert('请输入文件夹路径');
        return;
    }

    fetch('/scan_folders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder_path: folderPath })
    })
    .then(response => response.json())
    .then(data => {
        displayImages(data);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('扫描文件夹时出错');
    });
}

function displayImages(images) {
    allImages = images;
    updateTagStats(images);
    renderFilteredImages(images);
}

function renderFilteredImages(images) {
    const container = document.getElementById('imageContainer');
    container.innerHTML = '';

    const filteredImages = activeTag 
        ? images.filter(img => img.annotation.includes(activeTag))
        : images;

    filteredImages.forEach(imageData => {
        const div = document.createElement('div');
        div.className = 'image-item';
        
        const img = document.createElement('img');
        img.src = `/thumbnail${imageData.image_path}`;
        img.alt = imageData.image_path.split('/').pop();
        img.loading = 'lazy'; // 添加延迟加载
        
        // 添加加载错误处理
        img.onerror = () => {
            console.error('缩略图加载失败:', imageData.image_path);
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666">加载失败</text></svg>';
        };
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'image-name';
        nameLabel.textContent = imageData.image_path.split('/').pop();
        
        div.appendChild(img);
        div.appendChild(nameLabel);
        div.onclick = () => showPreview(imageData);
        container.appendChild(div);
    });
}

function showPreview(imageData) {
    currentImageData = imageData;
    const previewImage = document.getElementById('previewImage');
    
    // 显示加载状态
    previewImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666">加载中...</text></svg>';
    
    // 预加载图片
    const img = new Image();
    img.src = `/image${imageData.image_path}`;
    
    img.onload = () => {
        previewImage.src = `/image${imageData.image_path}`;
    };
    
    img.onerror = () => {
        console.error('预览图加载失败:', imageData.image_path);
        previewImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666">加载失败</text></svg>';
    };
    
    document.getElementById('annotation').value = imageData.annotation;
}

function updateTagStats(images) {
    const tagCounts = {};
    images.forEach(img => {
        const tags = img.annotation.split(',')  // 改用逗号分隔
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const statsContainer = document.getElementById('tagStats');
    statsContainer.innerHTML = '';

    Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([tag, count]) => {
            const tagElement = document.createElement('div');
            tagElement.className = `tag-item ${tag === activeTag ? 'active' : ''}`;
            tagElement.innerHTML = `
                <span>${tag}</span>
                <span class="tag-count">${count}</span>
                <span class="tag-delete" title="删除此标注">×</span>
            `;
            
            // 点击标签筛选
            tagElement.querySelector('span:first-child').onclick = (e) => {
                e.stopPropagation();
                filterByTag(tag);
            };
            
            // 点击删除按钮删除标注
            tagElement.querySelector('.tag-delete').onclick = (e) => {
                e.stopPropagation();
                deleteBatchAnnotation(tag);
            };
            
            statsContainer.appendChild(tagElement);
        });
}

// 添加新的删除函数
function deleteBatchAnnotation(tagToDelete) {
    if (confirm(`确定要删除所有图片中的标注"${tagToDelete}"吗？`)) {
        allImages.forEach(imageData => {
            const tags = imageData.annotation.split(',')  // 改用逗号分隔
                .map(tag => tag.trim())
                .filter(tag => tag !== tagToDelete);
            
            const newAnnotation = tags.join(',');  // 用逗号重新连接

            fetch('/save_annotation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    txt_path: imageData.txt_path,
                    content: newAnnotation
                })
            });

            imageData.annotation = newAnnotation;
        });

        // 更新界面
        updateTagStats(allImages);
        if (currentImageData) {
            showPreview(currentImageData);
        }
        if (activeTag === tagToDelete) {
            activeTag = null;
        }
        renderFilteredImages(allImages);
        alert('标注删除完成');
    }
}

function filterByTag(tag) {
    activeTag = activeTag === tag ? null : tag;
    renderFilteredImages(allImages);
    updateTagStats(allImages);
}

// 添加防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 修改保存函数
const debouncedSave = debounce((content, path) => {
    fetch('/save_annotation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            txt_path: path,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('保存成功');
        } else {
            alert('保存失败: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('保存时出错');
    });
}, 500);

// 修改批量添加函数中的保存逻辑
function addBatchAnnotation() {
    const content = document.getElementById('batchAnnotation').value.trim();
    if (!content) {
        alert('请输入要添加的标注内容');
        return;
    }

    const position = document.getElementById('insertPosition').value;
    const confirmMsg = `确定要将"${content}"添加到所有图片的${position === 'start' ? '开头' : '结尾'}吗？`;
    
    if (confirm(confirmMsg)) {
        allImages.forEach(imageData => {
            const currentAnnotation = imageData.annotation.trim();
            const newAnnotation = position === 'start'
                ? currentAnnotation ? `${content},${currentAnnotation}` : content
                : currentAnnotation ? `${currentAnnotation},${content}` : content;

            fetch('/save_annotation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    txt_path: imageData.txt_path,
                    content: newAnnotation
                })
            });

            imageData.annotation = newAnnotation;
        });

        updateTagStats(allImages);
        if (currentImageData) {
            showPreview(currentImageData);
        }
        alert('批量添加完成');
    }
}

function showPreview(imageData) {
    currentImageData = imageData;
    const previewImage = document.getElementById('previewImage');
    
    // 修正：使用正确的图片路径格式
    previewImage.src = `/image${imageData.image_path}`;
    document.getElementById('annotation').value = imageData.annotation;
    
    previewImage.onerror = () => {
        console.error('图片加载失败:', imageData.image_path);
        alert('图片加载失败');
        previewImage.src = '';
    };
}

function saveAnnotation() {
    if (!currentImageData) {
        alert('请先选择一张图片');
        return;
    }

    const content = document.getElementById('annotation').value;
    
    fetch('/save_annotation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            txt_path: currentImageData.txt_path,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('保存成功');
        } else {
            alert('保存失败: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('保存时出错');
    });
}