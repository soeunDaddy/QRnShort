/**
 * QR Studio (URL2QR) - Smart QR Code Generator & Interactive Gradient Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const body = document.body;
  const root = document.documentElement;
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const submitBtn = document.getElementById('submitBtn');
  const qrcodeContainer = document.getElementById('qrcode');
  const qrCard = document.getElementById('qrCard');
  const displayUrl = document.getElementById('displayUrl');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const downloadJpgBtn = document.getElementById('downloadJpgBtn');
  const quickSuggests = document.getElementById('quickSuggests');
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  let currentQrInstance = null;
  let currentQrData = '';
  let toastTimer = null;

  // Mouse Interactive Coordinates with Smooth Lerp Animation
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

  /**
   * Interactive Mouse Gradient & Ambient Illumination Controller
   */
  function initInteractiveGradients() {
    window.addEventListener('mousemove', (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovering = true;
    });

    // Touch device support
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.isHovering = true;
      }
    }, { passive: true });

    // Smooth Animation Frame Loop
    function updateGradientLoop() {
      // Linear Interpolation for butter-smooth movement
      const lerpSpeed = 0.08;
      
      if (!mouse.isHovering) {
        // Subtle ambient drifting if no mouse movement
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

      // Compute dynamic gradient angle based on cursor relative to screen center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const deltaX = mouse.currentX - centerX;
      const deltaY = mouse.currentY - centerY;
      let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      // Dynamic color hue shift based on position (Warm Gold -> Amber -> Sunburst Peach)
      const hueShift = Math.sin((pctX + pctY) * 0.03) * 15;

      // Update CSS Variables on Root
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

  function initEventListeners() {
    // Form Submit (Enter or Click)
    urlForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGenerate();
    });

    // Clear Button in Input
    urlInput.addEventListener('input', () => {
      clearInputBtn.style.display = urlInput.value.trim() ? 'flex' : 'none';
    });

    clearInputBtn.addEventListener('click', () => {
      urlInput.value = '';
      clearInputBtn.style.display = 'none';
      urlInput.focus();
    });

    // Quick Suggestion Chips
    if (quickSuggests) {
      quickSuggests.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.suggest-tag');
        if (targetBtn) {
          const sampleUrl = targetBtn.dataset.url;
          urlInput.value = sampleUrl;
          clearInputBtn.style.display = 'flex';
          handleGenerate();
        }
      });
    }

    // QR Card Click -> JPG Download
    qrCard.addEventListener('click', (e) => {
      // If user clicked sub-buttons like "copy url", don't trigger download immediately
      if (e.target.closest('#copyUrlBtn') || e.target.closest('#displayUrl')) {
        return;
      }
      downloadQrAsJpg();
    });

    // Download Button Click
    downloadJpgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadQrAsJpg();
    });

    // Copy URL Button Click
    copyUrlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(currentQrData);
    });

    // Display URL Click -> Open in New Tab
    displayUrl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentQrData.startsWith('http://') || currentQrData.startsWith('https://')) {
        window.open(currentQrData, '_blank', 'noopener,noreferrer');
      } else {
        copyToClipboard(currentQrData);
      }
    });

    // Check URL Query Parameters (e.g., from URL Shortener 'QR코드 생성' button)
    checkUrlQueryParams();
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
        setTimeout(() => {
          handleGenerate();
        }, 150);
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }

  /**
   * QR Code Generation Logic
   */
  function handleGenerate() {
    let rawValue = urlInput.value.trim();

    if (!rawValue) {
      showToast('생성할 URL 또는 텍스트를 입력해주세요.', 'warning');
      shakeElement(urlInput.parentElement);
      urlInput.focus();
      return;
    }

    // Auto prepend https:// if looks like a domain (e.g., naver.com)
    if (!/^[a-zA-Z]+:\/\//i.test(rawValue) && /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(rawValue)) {
      rawValue = 'https://' + rawValue;
      urlInput.value = rawValue;
    }

    currentQrData = rawValue;

    // Clear previous QR code content
    qrcodeContainer.innerHTML = '';

    try {
      // Check if QRCode library is loaded
      if (typeof QRCode !== 'undefined') {
        currentQrInstance = new QRCode(qrcodeContainer, {
          text: currentQrData,
          width: 512,
          height: 512,
          colorDark: "#1e293b",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } else {
        // Fallback: Using lightweight external QR API
        createFallbackQr(currentQrData);
      }

      // Update Display URL in Card
      displayUrl.textContent = currentQrData;
      displayUrl.title = currentQrData;

      // Animate Transition to Generated State
      transitionToGeneratedState();
      
      showToast('QR 코드가 성공적으로 생성되었습니다!', 'success');
    } catch (err) {
      console.error('QR Generation failed:', err);
      showToast('QR 코드 생성 중 오류가 발생했습니다.', 'error');
    }
  }

  /**
   * Fallback QR code generator if external CDN is unreachable
   */
  function createFallbackQr(text) {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}&margin=10`;
    img.alt = 'QR Code';
    img.style.width = '220px';
    img.style.height = '220px';
    qrcodeContainer.appendChild(img);
  }

  /**
   * Transition UI: Move Input to Bottom Dock, Show Center QR Card
   */
  function transitionToGeneratedState() {
    if (body.classList.contains('initial-state')) {
      body.classList.remove('initial-state');
      body.classList.add('generated-state');
    }

    // Update submit button text to "변경"
    submitBtn.querySelector('.btn-text').textContent = '생성';
  }

  /**
   * Reset UI to initial center state
   */
  function resetToInitialState() {
    body.classList.remove('generated-state');
    body.classList.add('initial-state');
    urlInput.value = '';
    clearInputBtn.style.display = 'none';
    currentQrData = '';
    qrcodeContainer.innerHTML = '';
    urlInput.focus();
    submitBtn.querySelector('.btn-text').textContent = '확인';
  }

  /**
   * Convert QR to High-Quality JPG with Clean White Padding & Download
   */
  function downloadQrAsJpg() {
    if (!currentQrData) return;

    // Get the generated canvas or img element
    const canvas = qrcodeContainer.querySelector('canvas');
    const img = qrcodeContainer.querySelector('img');

    if (!canvas && !img) {
      showToast('다운로드할 QR 코드가 없습니다.', 'error');
      return;
    }

    // Create high-res export canvas (1000 x 1000 for crystal-clear JPG print/display)
    const exportCanvas = document.createElement('canvas');
    const size = 1000;
    const padding = 100; // Crisp White border padding
    exportCanvas.width = size;
    exportCanvas.height = size;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Fill crisp pure white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // 2. Draw the QR code in center
    const drawSize = size - (padding * 2);

    const performExport = () => {
      try {
        // High quality JPEG output
        const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

        // Sanitize domain name for filename
        let fileSlug = 'qrcode';
        try {
          if (currentQrData.startsWith('http')) {
            const parsed = new URL(currentQrData);
            fileSlug = parsed.hostname.replace(/[^a-zA-Z0-9]/g, '_');
          } else {
            fileSlug = currentQrData.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
          }
        } catch {
          fileSlug = 'qrcode';
        }

        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `${fileSlug}_${timestamp}.jpg`;

        // Trigger Download Anchor
        const downloadLink = document.createElement('a');
        downloadLink.href = jpgDataUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        showToast(`'${filename}' JPG 다운로드 완료!`, 'success');

        // Micro click bounce on QR wrapper
        const qrWrapper = document.getElementById('qrWrapper');
        if (qrWrapper) {
          qrWrapper.style.transform = 'scale(0.96)';
          setTimeout(() => {
            qrWrapper.style.transform = 'scale(1)';
          }, 150);
        }
      } catch (err) {
        console.error('Download export failed:', err);
        showToast('JPG 변환 중 오류가 발생했습니다.', 'error');
      }
    };

    if (canvas) {
      ctx.drawImage(canvas, padding, padding, drawSize, drawSize);
      performExport();
    } else if (img && img.complete) {
      ctx.drawImage(img, padding, padding, drawSize, drawSize);
      performExport();
    } else if (img) {
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, padding, padding, drawSize, drawSize);
        performExport();
      };
    }
  }

  /**
   * Clipboard Copy Helper
   */
  async function copyToClipboard(text) {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      showToast('URL이 클립보드에 복사되었습니다!', 'success');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      showToast('클립보드 복사에 실패했습니다.', 'warning');
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
