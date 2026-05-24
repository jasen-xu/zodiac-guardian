// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadGuardianDetails();
});

// 加载守护神详情
function loadGuardianDetails() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const zodiacId = urlParams.get('id');
    
    // 查找对应的生肖数据
    const zodiac = zodiacData.find(z => z.id === zodiacId);
    
    if (!zodiac) {
        alert('未找到该生肖守护神');
        window.location.href = 'index.html';
        return;
    }
    
    // 更新页面标题
    document.title = `${zodiac.name} - ${zodiac.guardian} | 十二生肖守护神`;
    
    // 更新页面内容 - 分两列显示
    const blessingText = zodiac.blessing;
    const descriptionText = zodiac.description;
    
    // 将祝福文字分成两列
    const blessingHalf = Math.ceil(blessingText.length / 2);
    document.getElementById('blessingCol1').textContent = blessingText.substring(0, blessingHalf);
    document.getElementById('blessingCol2').textContent = blessingText.substring(blessingHalf);
    
    // 将说明文字分成两列
    const descHalf = Math.ceil(descriptionText.length / 2);
    document.getElementById('descriptionCol1').textContent = descriptionText.substring(0, descHalf);
    document.getElementById('descriptionCol2').textContent = descriptionText.substring(descHalf);
    
    // 设置图片
    const imgElement = document.getElementById('guardianImage');
    imgElement.src = zodiac.image;
    imgElement.alt = `${zodiac.guardian} - ${zodiac.name}之守护神`;
    
    // 图片加载失败时显示提示
    imgElement.onerror = function() {
        alert('图片加载失败，请检查图片文件是否存在');
    };
    
    // 设置音频并自动播放
    const audioPlayer = document.getElementById('audioPlayer');
    const audioSource = document.getElementById('audioSource');
    audioSource.src = zodiac.audio;
    audioPlayer.load();
    
    // 尝试自动播放
    audioPlayer.play().catch(function(error) {
        console.log('自动播放被浏览器阻止，需要用户交互后才能播放:', error);
    });
}
