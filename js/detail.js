// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const zodiacId = urlParams.get('id');

    if (zodiacId) {
        // 有 id 参数 → 显示详情页
        showDetailPage(zodiacId);
    } else {
        // 无 id 参数 → 显示列表页
        showListPage();
    }
});

// 显示生肖选择列表页
function showListPage() {
    const listPage = document.getElementById('guardianListPage');
    const detailPage = document.getElementById('guardianDetailPage');
    listPage.style.display = 'block';
    detailPage.style.display = 'none';
    document.title = '生肖守护神 - 易道';

    const grid = document.getElementById('guardianZodiacGrid');
    zodiacData.forEach((zodiac, index) => {
        const card = document.createElement('a');
        card.href = `guardian.html?id=${zodiac.id}`;
        card.className = 'guardian-zodiac-card';
        card.style.animationDelay = `${index * 0.06}s`;

        card.innerHTML = `
            <div class="guardian-zodiac-image">
                <img src="${zodiac.image}" alt="生肖${zodiac.name}" onerror="this.style.display='none';this.parentNode.querySelector('.zodiac-fallback').style.display='flex';">
                <div class="zodiac-fallback">${zodiac.name}</div>
            </div>
            <div class="guardian-zodiac-info">
                <div class="guardian-zodiac-name">生肖${zodiac.name}</div>
                <div class="guardian-zodiac-guardian">${zodiac.guardian}</div>
                <div class="guardian-zodiac-blessing">${zodiac.blessing}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// 显示守护神详情页
function showDetailPage(zodiacId) {
    const listPage = document.getElementById('guardianListPage');
    const detailPage = document.getElementById('guardianDetailPage');
    listPage.style.display = 'none';
    detailPage.style.display = 'block';

    const zodiac = zodiacData.find(z => z.id === zodiacId);

    if (!zodiac) {
        if (typeof Toast !== 'undefined') Toast.warning('未找到该生肖守护神'); else alert('未找到该生肖守护神');
        window.location.href = 'guardian.html';
        return;
    }

    document.title = `${zodiac.name} - ${zodiac.guardian} | 生肖守护神`;

    // 更新祝福文字 - 分两列
    const blessingText = zodiac.blessing;
    const blessingHalf = Math.ceil(blessingText.length / 2);
    document.getElementById('blessingCol1').textContent = blessingText.substring(0, blessingHalf);
    document.getElementById('blessingCol2').textContent = blessingText.substring(blessingHalf);

    // 更新说明文字 - 分两列
    const descriptionText = zodiac.description;
    const descHalf = Math.ceil(descriptionText.length / 2);
    document.getElementById('descriptionCol1').textContent = descriptionText.substring(0, descHalf);
    document.getElementById('descriptionCol2').textContent = descriptionText.substring(descHalf);

    // 设置图片
    const imgElement = document.getElementById('guardianImage');
    imgElement.src = zodiac.image;
    imgElement.alt = `${zodiac.guardian} - ${zodiac.name}之守护神`;
    imgElement.onerror = function() {
        if (typeof Toast !== 'undefined') Toast.error('图片加载失败，请检查图片文件是否存在'); else alert('图片加载失败，请检查图片文件是否存在');
    };

    // 设置模糊背景图
    const bgElement = document.getElementById('guardianBg');
    if (bgElement) {
        bgElement.src = zodiac.image;
    }

    // 设置音频并自动播放
    const audioPlayer = document.getElementById('audioPlayer');
    const audioSource = document.getElementById('audioSource');
    audioSource.src = zodiac.audio;
    audioPlayer.load();

    // 生肖羊印章按钮（点击播放视频）
    const sealBtn = document.getElementById('sealBtn');
    if (sealBtn) {
        sealBtn.style.display = (zodiacId === 'goat') ? 'block' : 'none';
    }

    // 生肖羊视频播放（暂时禁用自动播放）
    /*
    const videoMap = {
        'goat': (typeof CDN_MEDIA !== 'undefined' ? CDN_MEDIA : '') + '/images/dairulai-goat.mp4'
    };

    if (videoMap[zodiacId]) {
        playGuardianVideo(videoMap[zodiacId], audioPlayer);
    } else {
    */
        audioPlayer.play().catch(function(error) {
            console.log('自动播放被浏览器阻止，需要用户交互后才能播放:', error);
        });
    // }
}

// 点击印章按钮播放视频
function playSealVideo() {
    const overlay = document.getElementById('videoOverlay');
    const video = document.getElementById('guardianVideo');
    const source = video.querySelector('source');

    overlay.style.height = window.innerHeight + 'px';
    overlay.style.display = 'flex';
    source.src = (typeof CDN_MEDIA !== 'undefined' ? CDN_MEDIA : '') + '/images/dairulai-goat.mp4';
    video.load();

    video.addEventListener('ended', function onEnded() {
        video.removeEventListener('ended', onEnded);
        hideVideoOverlay();
    });

    video.play().catch(function(error) {
        console.log('视频播放被阻止:', error);
        hideVideoOverlay();
    });
}

// 播放守护神视频
function playGuardianVideo(videoSrc, audioPlayer) {
    const overlay = document.getElementById('videoOverlay');
    const video = document.getElementById('guardianVideo');
    const source = video.querySelector('source');

    // 动态设置高度兑底
    overlay.style.height = window.innerHeight + 'px';
    window.addEventListener('resize', function() {
        overlay.style.height = window.innerHeight + 'px';
    });

    overlay.style.display = 'flex';
    source.src = videoSrc;
    video.load();

    video.addEventListener('ended', function onEnded() {
        video.removeEventListener('ended', onEnded);
        hideVideoOverlay();
        // 视频结束后延迟5秒播放音频
        setTimeout(function() {
            audioPlayer.play().catch(function(error) {
                console.log('音频自动播放被阻止:', error);
            });
        }, 5000);
    });

    video.play().catch(function(error) {
        console.log('视频自动播放被阻止:', error);
        hideVideoOverlay();
        audioPlayer.play().catch(function(e) {
            console.log('音频自动播放被阻止:', e);
        });
    });
}

// 隐藏视频层
function hideVideoOverlay() {
    const overlay = document.getElementById('videoOverlay');
    overlay.classList.add('video-fade-out');
    setTimeout(function() {
        overlay.style.display = 'none';
        overlay.classList.remove('video-fade-out');
    }, 500);
}

// 跳过视频
function skipVideo() {
    const video = document.getElementById('guardianVideo');
    video.pause();
    hideVideoOverlay();
    // 跳过后延迟5秒播放音频
    const audioPlayer = document.getElementById('audioPlayer');
    setTimeout(function() {
        audioPlayer.play().catch(function(error) {
            console.log('音频自动播放被阻止:', error);
        });
    }, 5000);
}
