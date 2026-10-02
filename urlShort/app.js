/**
 * ShortLink Studio (urlShort) - Smart OpenAPI URL Shortener Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const body = document.body;
  const root = document.documentElement;
  const shortenForm = document.getElementById('shortenForm');
  const urlInput = document.getElementById('urlInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const shortenBtn = document.getElementById('shortenBtn');
  const shortenBtnText = document.getElementById('shortenBtnText');
  const shortenBtnIcon = document.getElementById('shortenBtnIcon');
  const resultDisplaySection = document.getElementById('resultDisplaySection');
  const resultCard = document.getElementById('resultCard');
  const ratioBadge = document.getElementById('ratioBadge');
  const originalUrlDisplay = document.getElementById('originalUrlDisplay');
  const shortUrlOutput = document.getElementById('shortUrlOutput');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyIcon = document.getElementById('copyIcon');
  const visitUrlBtn = document.getElementById('visitUrlBtn');
  const openInQrBtn = document.getElementById('openInQrBtn');
  const resetShortenerBtn = document.getElementById('resetShortenerBtn');
  const quickSuggests = document.getElementById('quickSuggests');
  const historyCard = document.getElementById('historyCard');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  let currentShortUrl = '';
  let currentOriginalUrl = '';
  let isShortening = false;
  let toastTimer = null;

  // Mouse Coordinates for Dynamic Radiant Glow
  const mouse = {
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    currentX: window.innerWidth / 2,
    currentY: window.innerHeight / 2,
    isHovering: false,
    autoTimer: 0
  };

  // Initialize
  initEventListeners();
  initInteractiveGradients();
  loadHistory();
  checkUrlQueryParams();

  /**
   * Interactive Mouse Gradient & Illumination Controller
   */
  function initInteractiveGradients() {
    window.addEventListener('mousemove', (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovering = true;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.isHovering = true;
      }
    }, { passive: true });

    function updateGradientLoop() {
      const lerpSpeed = 0.08;
      
      if (!mouse.isHovering) {
        mouse.autoTimer += 0.015;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        mouse.targetX = centerX + Math.sin(mouse.autoTimer) * (window.innerWidth * 0.25);
        mouse.targetY = centerY + Math.cos(mouse.autoTimer * 0.8) * (window.innerHeight * 0.2);
      }

      mouse.currentX += (mouse.targetX - mouse.currentX) * lerpSpeed;
      mouse.currentY += (mouse.targetY - mouse.currentY) * lerpSpeed;

      const pctX = (mouse.currentX / window.innerWidth) * 100;
      const pctY = (mouse.currentY / window.innerHeight) * 100;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const deltaX = mouse.currentX - centerX;
      const deltaY = mouse.currentY - centerY;
      let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      const hueShift = Math.sin((pctX + pctY) * 0.03) * 15;

      root.style.setProperty('--glow-x', `${pctX.toFixed(2)}%`);
      root.style.setProperty('--glow-y', `${pctY.toFixed(2)}%`);
      root.style.setProperty('--mouse-x', `${pctX.toFixed(2)}%`);
      root.style.setProperty('--mouse-y', `${pctY.toFixed(2)}%`);
      root.style.setProperty('--mouse-deg', `${angle.toFixed(1)}deg`);
      root.style.setProperty('--hue-shift', `${hueShift.toFixed(1)}deg`);

      requestAnimationFrame(updateGradientLoop);
    }

    requestAnimationFrame(updateGradientLoop);
  }

  /**
   * Event Listeners Registration
   */
  function initEventListeners() {
    // Requirement 3-2: Input validation & button disabled toggle
    urlInput.addEventListener('input', () => {
      const val = urlInput.value.trim();
      const hasValue = val.length > 0;
      
      // Toggle clear button
      clearInputBtn.style.display = hasValue ? 'flex' : 'none';
      
      // Enable / Disable '단축하기' button based on input content
      shortenBtn.disabled = !hasValue || isShortening;
    });

    // Clear input button
    clearInputBtn.addEventListener('click', () => {
      urlInput.value = '';
      clearInputBtn.style.display = 'none';
      shortenBtn.disabled = true;
      urlInput.focus();
    });

    // Form submit ('단축하기' 클릭 또는 Enter)
    shortenForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!shortenBtn.disabled && !isShortening) {
        handleShortenUrl();
      }
    });

    // Quick Suggestion Chips
    if (quickSuggests) {
      quickSuggests.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.suggest-tag');
        if (targetBtn) {
          const sampleUrl = targetBtn.dataset.url;
          urlInput.value = sampleUrl;
          clearInputBtn.style.display = 'flex';
          shortenBtn.disabled = false;
          handleShortenUrl();
        }
      });
    }

    // Requirement 3-4: '복사' 버튼 클릭 시 자동 복사 및 '복사하였습니다' 알림
    copyBtn.addEventListener('click', () => {
      handleCopyShortUrl();
    });

    // Click on Read-Only Output Box also selects & allows copy
    shortUrlOutput.addEventListener('click', () => {
      shortUrlOutput.select();
    });

    // Open in QR Generator shortcut
    openInQrBtn.addEventListener('click', () => {
      if (currentShortUrl) {
        window.location.href = `../url2qr/index.html?url=${encodeURIComponent(currentShortUrl)}`;
      }
    });

    // Reset button in result card
    resetShortenerBtn.addEventListener('click', () => {
      resetToInitialState();
    });

    // Clear History Button
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        if (confirm('최근 단축 기록을 모두 삭제하시겠습니까?')) {
          localStorage.removeItem('shortlink_history');
          renderHistory([]);
          showToast('단축 기록이 모두 삭제되었습니다.', 'info');
        }
      });
    }
  }

  /**
   * Requirement 3-3: OpenAPI URL Shortening Request & Display Logic
   */
  async function handleShortenUrl() {
    let rawUrl = urlInput.value.trim();

    if (!rawUrl) {
      showToast('단축할 URL을 입력해주세요.', 'warning');
      shakeElement(urlInput.parentElement);
      urlInput.focus();
      return;
    }

    // Auto prepend https:// if user entered domain without protocol
    if (!/^[a-zA-Z]+:\/\//i.test(rawUrl) && /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
      urlInput.value = rawUrl;
    }

    // Basic URL validation
    try {
      new URL(rawUrl);
    } catch {
      showToast('올바른 URL 형식(예: https://example.com)을 입력해주세요.', 'warning');
      shakeElement(urlInput.parentElement);
      return;
    }

    currentOriginalUrl = rawUrl;

    // Set Loading UI State
    setLoadingState(true);

    try {
      // Call Multi-Engine OpenAPI Shortener
      const shortUrl = await requestOpenApiShorten(rawUrl);

      if (!shortUrl) {
        throw new Error('단축 URL 생성에 실패했습니다.');
      }

      currentShortUrl = shortUrl;

      // Populate Read-Only Output Box
      shortUrlOutput.value = currentShortUrl;
      originalUrlDisplay.textContent = currentOriginalUrl;
      originalUrlDisplay.title = currentOriginalUrl;
      visitUrlBtn.href = currentShortUrl;

      // Calculate length reduction percentage
      calculateAndDisplayReduction(currentOriginalUrl, currentShortUrl);

      // Save to local history
      saveToHistory(currentOriginalUrl, currentShortUrl);

      // Transition UI to Generated State
      transitionToGeneratedState();

      showToast('URL이 성공적으로 단축되었습니다!', 'success');
    } catch (err) {
      console.error('URL Shortening Failed:', err);
      showToast(err.message || '단축 요청 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Multi-Tier OpenAPI Shortening Engine
   * 1st: is.gd JSONP (Fast, 100% CORS-proof)
   * 2nd: v.gd JSONP (High reliability fallback)
   * 3rd: TinyURL API / Spoo.me
   */
  async function requestOpenApiShorten(longUrl) {
    // Engine 1: is.gd JSONP
    try {
      const res = await callIsGdJsonp(longUrl);
      if (res && res.startsWith('http')) return res;
    } catch (e) {
      console.warn('is.gd Engine 1 failed:', e.message);
    }

    // Engine 2: v.gd JSONP
    try {
      const res = await callVGdJsonp(longUrl);
      if (res && res.startsWith('http')) return res;
    } catch (e) {
      console.warn('v.gd Engine 2 failed:', e.message);
    }

    // Engine 3: Spoo.me API / TinyURL fallback
    try {
      const res = await callSpooMe(longUrl);
      if (res && res.startsWith('http')) return res;
    } catch (e) {
      console.warn('Spoo.me Engine 3 failed:', e.message);
    }

    // Engine 4: TinyURL plain
    try {
      const res = await callTinyUrl(longUrl);
      if (res && res.startsWith('http')) return res;
    } catch (e) {
      console.warn('TinyURL Engine 4 failed:', e.message);
    }

    throw new Error('단축 OpenAPI 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  /**
   * is.gd JSONP Request
   */
  function callIsGdJsonp(longUrl) {
    return new Promise((resolve, reject) => {
      const callbackName = 'isgd_callback_' + Math.floor(Math.random() * 1000000);
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('is.gd 요청 시간 초과'));
      }, 7000);

      window[callbackName] = function(data) {
        cleanup();
        if (data && data.shorturl) {
          resolve(data.shorturl);
        } else if (data && data.errormessage) {
          reject(new Error(data.errormessage));
        } else {
          reject(new Error('is.gd 응답 데이터 오류'));
        }
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://is.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(longUrl)}`;
      script.onerror = function() {
        cleanup();
        reject(new Error('is.gd 스크립트 로드 실패'));
      };

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        const el = document.getElementById(callbackName);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }

      document.body.appendChild(script);
    });
  }

  /**
   * v.gd JSONP Request
   */
  function callVGdJsonp(longUrl) {
    return new Promise((resolve, reject) => {
      const callbackName = 'vgd_callback_' + Math.floor(Math.random() * 1000000);
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('v.gd 요청 시간 초과'));
      }, 7000);

      window[callbackName] = function(data) {
        cleanup();
        if (data && data.shorturl) {
          resolve(data.shorturl);
        } else if (data && data.errormessage) {
          reject(new Error(data.errormessage));
        } else {
          reject(new Error('v.gd 응답 데이터 오류'));
        }
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://v.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(longUrl)}`;
      script.onerror = function() {
        cleanup();
        reject(new Error('v.gd 스크립트 로드 실패'));
      };

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        const el = document.getElementById(callbackName);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }

      document.body.appendChild(script);
    });
  }

  /**
   * Spoo.me API Request
   */
  async function callSpooMe(longUrl) {
    const res = await fetch('https://spoo.me/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'url=' + encodeURIComponent(longUrl)
    });
    const data = await res.json();
    if (data && data.short_url) {
      return data.short_url;
    }
    throw new Error('Spoo.me 응답 오류');
  }

  /**
   * TinyURL API Request
   */
  async function callTinyUrl(longUrl) {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    const text = await res.text();
    if (text && text.startsWith('http')) {
      return text.trim();
    }
    throw new Error('TinyURL 응답 오류');
  }

  /**
   * Requirement 3-4: Clipboard Copy Handler with '복사하였습니다' Notification
   */
  async function handleCopyShortUrl() {
    const textToCopy = shortUrlOutput.value.trim();
    if (!textToCopy) {
      showToast('복사할 단축 URL이 없습니다.', 'warning');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        shortUrlOutput.select();
        document.execCommand('copy');
      }

      // Requirement 3-4: '복사하였습니다' 알림창 / 토스트
      showToast('복사하였습니다', 'success');

      // Visual feedback on copy button
      copyBtn.classList.add('copied');
      copyBtnText.textContent = '복사 완료!';
      copyIcon.className = 'fa-solid fa-check';

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtnText.textContent = '복사';
        copyIcon.className = 'fa-regular fa-copy';
      }, 2200);

    } catch (err) {
      console.error('Clipboard copy failed:', err);
      // Fallback selection
      shortUrlOutput.select();
      showToast('복사에 실패했습니다. 텍스트를 직접 복사해주세요.', 'warning');
    }
  }

  /**
   * Loading state helper
   */
  function setLoadingState(loading) {
    isShortening = loading;
    shortenBtn.disabled = loading;

    if (loading) {
      shortenBtnText.textContent = '단축 중...';
      shortenBtnIcon.className = 'fa-solid fa-spinner fa-spin btn-icon';
    } else {
      shortenBtnText.textContent = body.classList.contains('generated-state') ? '다시 단축' : '단축하기';
      shortenBtnIcon.className = 'fa-solid fa-bolt btn-icon';
    }
  }

  /**
   * Calculate and show reduction ratio
   */
  function calculateAndDisplayReduction(orig, short) {
    const origLen = orig.length;
    const shortLen = short.length;
    
    if (origLen > shortLen) {
      const savedPct = Math.round(((origLen - shortLen) / origLen) * 100);
      ratioBadge.textContent = `-${savedPct}% 절감 (${origLen}자 → ${shortLen}자)`;
      ratioBadge.style.display = 'inline-block';
    } else {
      ratioBadge.textContent = `${shortLen}자 변환 완료`;
      ratioBadge.style.display = 'inline-block';
    }
  }

  /**
   * Transition UI: Move Input to Bottom Dock, Show Result Card
   */
  function transitionToGeneratedState() {
    if (body.classList.contains('initial-state')) {
      body.classList.remove('initial-state');
      body.classList.add('generated-state');
    }
    shortenBtnText.textContent = '다시 단축';
  }

  /**
   * Reset UI to initial center state
   */
  function resetToInitialState() {
    body.classList.remove('generated-state');
    body.classList.add('initial-state');
    urlInput.value = '';
    clearInputBtn.style.display = 'none';
    shortenBtn.disabled = true;
    currentShortUrl = '';
    currentOriginalUrl = '';
    shortUrlOutput.value = '';
    urlInput.focus();
    shortenBtnText.textContent = '단축하기';
  }

  /**
   * Local History Management
   */
  function saveToHistory(originalUrl, shortUrl) {
    try {
      let history = JSON.parse(localStorage.getItem('shortlink_history') || '[]');
      
      // Deduplicate if already top
      history = history.filter(item => item.shortUrl !== shortUrl);
      
      history.unshift({
        originalUrl,
        shortUrl,
        date: new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      // Keep up to 8 items
      if (history.length > 8) history = history.slice(0, 8);

      localStorage.setItem('shortlink_history', JSON.stringify(history));
      renderHistory(history);
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  function loadHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('shortlink_history') || '[]');
      renderHistory(history);
    } catch {
      renderHistory([]);
    }
  }

  function renderHistory(items) {
    if (!historyCard || !historyList) return;

    if (!items || items.length === 0) {
      historyCard.style.display = 'none';
      historyList.innerHTML = '';
      return;
    }

    historyCard.style.display = 'block';
    historyList.innerHTML = '';

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <div class="history-info">
          <a href="${item.shortUrl}" target="_blank" rel="noopener noreferrer" class="history-short-url">${item.shortUrl}</a>
          <span class="history-orig-url" title="${item.originalUrl}">${item.originalUrl}</span>
        </div>
        <div class="history-item-actions">
          <button type="button" class="history-quick-copy" title="클립보드에 복사" data-url="${item.shortUrl}">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      `;

      // Copy event listener for history item
      const copyBtnItem = li.querySelector('.history-quick-copy');
      copyBtnItem.addEventListener('click', async () => {
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(item.shortUrl);
          }
          showToast('복사하였습니다', 'success');
          copyBtnItem.innerHTML = '<i class="fa-solid fa-check"></i>';
          setTimeout(() => {
            copyBtnItem.innerHTML = '<i class="fa-regular fa-copy"></i>';
          }, 1500);
        } catch {
          showToast('복사 실패', 'warning');
        }
      });

      historyList.appendChild(li);
    });
  }

  /**
   * Check if page was loaded with ?url=... parameter
   */
  function checkUrlQueryParams() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const passedUrl = urlParams.get('url');
      if (passedUrl && passedUrl.trim()) {
        urlInput.value = decodeURIComponent(passedUrl.trim());
        clearInputBtn.style.display = 'flex';
        shortenBtn.disabled = false;
        setTimeout(() => {
          handleShortenUrl();
        }, 150);
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }

  /**
   * Toast Notification Controller
   */
  function showToast(message, type = 'success') {
    clearTimeout(toastTimer);

    toastMessage.textContent = message;
    const icon = toast.querySelector('.toast-icon');

    if (type === 'success') {
      icon.className = 'toast-icon fa-solid fa-circle-check';
      icon.style.color = '#10b981';
    } else if (type === 'warning') {
      icon.className = 'toast-icon fa-solid fa-triangle-exclamation';
      icon.style.color = '#f59e0b';
    } else if (type === 'info') {
      icon.className = 'toast-icon fa-solid fa-circle-info';
      icon.style.color = '#3b82f6';
    } else {
      icon.className = 'toast-icon fa-solid fa-circle-xmark';
      icon.style.color = '#ef4444';
    }

    toast.classList.add('show');

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  /**
   * Shake animation for input validation feedback
   */
  function shakeElement(el) {
    if (!el) return;
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ], {
      duration: 350,
      easing: 'ease-in-out'
    });
  }
});
