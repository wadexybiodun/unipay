(function () {
  'use strict';

  // ===== STATE =====
  const STATE_KEY = 'unipay_state';

  function getState() {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* ignore */ }
    }
    return {
      balance: { eth: 1.42, arb: 0.86, base: 0.33, matic: 124.50 },
      transactions: [],
      walletCreated: false,
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'
    };
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  let state = getState();

  function generateTxId() {
    return '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  function formatAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return d.toLocaleDateString();
  }

  function usdify(amount, token) {
    const prices = { ETH: 3420, USDC: 1, MATIC: 0.58 };
    const p = prices[token] || 1;
    return '$' + (amount * p).toFixed(2);
  }

  // ===== TOAST =====
  function showToast(msg, type) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast visible ' + (type || '');
    clearTimeout(t._hide);
    t._hide = setTimeout(function () { t.classList.remove('visible'); }, 3000);
  }

  // ===== NAVIGATION =====
  document.addEventListener('DOMContentLoaded', function () {
    // Mobile nav toggle
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
      });
    }

    // Sidebar active state
    var currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === currentPath) a.classList.add('active');
    });

    // Init page
    initPage();

    // Demo route animation on landing
    if (document.getElementById('demoRoute')) {
      animateDemoRoute();
    }
  });

  function initPage() {
    var page = window.location.pathname.split('/').pop();

    if (page === 'login.html') {
      initLogin();
    }
    if (page === 'app.html') {
      initDashboard();
    }
    if (page === 'send.html') {
      initSend();
    }
    if (page === 'receive.html') {
      initReceive();
    }
    if (page === 'transactions.html') {
      initTransactions();
    }
  }

  // ===== LANDING PAGE DEMO ROUTE =====
  function animateDemoRoute() {
    var steps = document.querySelectorAll('#demoRoute .route-step');
    var lines = document.querySelectorAll('#demoRoute .route-line');
    var idx = 0;

    function tick() {
      steps.forEach(function (s, i) {
        s.classList.toggle('active', i <= idx);
        s.classList.toggle('completed', i < idx);
        var dot = s.querySelector('.route-dot');
        if (dot) {
          dot.classList.toggle('active', i <= idx);
          dot.classList.toggle('completed', i < idx);
        }
      });
      lines.forEach(function (l, i) {
        l.classList.toggle('active', i < idx);
        l.classList.toggle('completed', i < idx - 1);
      });
      idx = (idx + 1) % (steps.length + 1);
    }

    tick();
    setInterval(tick, 2000);
  }

  // ===== LOGIN =====
  function initLogin() {
    // If wallet already created, show a banner instead of step 4
    var banner = document.getElementById('continueBanner');
    if (state.walletCreated && banner) {
      banner.style.display = 'block';
    }
  }

  var loginStep = 1;
  function showStep(n) {
    loginStep = n;
    for (var i = 1; i <= 4; i++) {
      var el = document.getElementById('loginStep' + i);
      if (el) el.style.display = i === n ? 'block' : 'none';
    }
  }

  window.sendOtp = function () {
    var email = document.getElementById('loginEmail');
    if (!email || !email.value || !email.value.includes('@')) {
      showToast('Please enter a valid email', 'error');
      return;
    }

    var btn = document.getElementById('sendOtpBtn');
    btn.disabled = true;
    btn.textContent = 'Sending OTP...';

    // Generate 6-digit OTP
    var otp = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem('unipay_otp', otp);
    sessionStorage.setItem('unipay_email', email.value);

    document.getElementById('otpEmailDisplay').textContent = email.value;

    function showOtpStep(demoOtp) {
      showStep(2);
      if (demoOtp) {
        var demoBox = document.getElementById('otpDemoBox');
        var demoCode = document.getElementById('otpDemoCode');
        if (demoBox) demoBox.style.display = 'block';
        if (demoCode) demoCode.textContent = demoOtp;
      }
      var first = document.querySelector('.otp-input');
      if (first) first.focus();
    }

    // Call PHP backend to send OTP email
    fetch('send-otp.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=' + encodeURIComponent(email.value) + '&otp=' + encodeURIComponent(otp)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      btn.disabled = false;
      btn.textContent = 'Continue with Email';
      if (data.success) {
        showToast('OTP sent to ' + email.value, 'success');
        showOtpStep();
      } else if (data.demo_otp) {
        showToast('📧 Email unavailable — using demo code', 'success');
        showOtpStep(data.demo_otp);
      } else {
        showToast('⚠️ ' + (data.message || 'Failed to send OTP'), 'error');
      }
    })
    .catch(function () {
      btn.disabled = false;
      btn.textContent = 'Continue with Email';
      showToast('📧 Email server unreachable — using demo code', 'success');
      showOtpStep(otp);
    });
  };

  window.socialLogin = function (provider) {
    showToast('Signing in with ' + provider + '...', 'success');
    setTimeout(function () {
      showStep(3);
      animateWalletCreation();
    }, 800);
  };

  // OTP input handling
  document.addEventListener('input', function (e) {
    if (e.target.classList.contains('otp-input')) {
      var val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('otp-input')) {
        e.target.nextElementSibling.focus();
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && e.target.classList.contains('otp-input') && !e.target.value) {
      var prev = e.target.previousElementSibling;
      if (prev && prev.classList.contains('otp-input')) {
        prev.focus();
      }
    }
  });

  window.verifyOtp = function () {
    var inputs = document.querySelectorAll('.otp-input');
    var code = '';
    inputs.forEach(function (inp) { code += inp.value; });
    if (code.length < 6) {
      showToast('Enter the full 6-digit code', 'error');
      return;
    }

    var email = sessionStorage.getItem('unipay_email');
    var btn = document.querySelector('#loginStep2 .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

    fetch('verify-otp.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=' + encodeURIComponent(email || '') + '&otp=' + encodeURIComponent(code)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (btn) { btn.disabled = false; btn.textContent = 'Verify Code'; }
      if (data.success) {
        sessionStorage.removeItem('unipay_otp');
        showStep(3);
        animateWalletCreation();
      } else {
        // Fallback: check against sessionStorage OTP
        var storedOtp = sessionStorage.getItem('unipay_otp');
        if (storedOtp === code) {
          sessionStorage.removeItem('unipay_otp');
          showStep(3);
          animateWalletCreation();
        } else {
          showToast('Invalid OTP code. Please try again.', 'error');
        }
      }
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Verify Code'; }
      // Fallback: check against sessionStorage OTP
      var storedOtp = sessionStorage.getItem('unipay_otp');
      if (storedOtp === code) {
        sessionStorage.removeItem('unipay_otp');
        showStep(3);
        animateWalletCreation();
      } else {
        showToast('Invalid OTP code. Please try again.', 'error');
      }
    });
  };

  window.resetLogin = function () {
    showStep(1);
  };

  window.passkeyLogin = function () {
    showToast('🔑 Passkey authentication simulated', 'success');
    setTimeout(function () {
      showStep(3);
      animateWalletCreation();
    }, 500);
  };

  function animateWalletCreation() {
    var bar = document.getElementById('walletProgress');
    var status = document.getElementById('walletStatus');
    var messages = [
      'Initializing...',
      'Deploying smart contract...',
      'Configuring cross-chain routers...',
      'Syncing with Ethereum...',
      'Syncing with Arbitrum...',
      'Syncing with Base...',
      'Finalizing Smart Wallet...'
    ];
    var i = 0;
    var interval = setInterval(function () {
      i++;
      var pct = Math.min(100, Math.round((i / messages.length) * 100));
      if (bar) bar.style.width = pct + '%';
      if (status && messages[i]) status.textContent = messages[i];
      if (i >= messages.length) {
        clearInterval(interval);
        if (bar) bar.style.width = '100%';
        if (status) status.textContent = 'Wallet ready!';
        state.walletCreated = true;
        saveState();
        setTimeout(function () { showStep(4); }, 500);
      }
    }, 600);
  }

  window.enterApp = function () {
    window.location.href = 'app.html';
  };

  // ===== DASHBOARD =====
  function initDashboard() {
    updateBalanceDisplay();
    renderRecentActivity();
    initAI();
  }

  function updateBalanceDisplay() {
    var total = state.balance.eth * 3420 + state.balance.arb * 3420 + state.balance.base * 3420 + state.balance.matic * 0.58;
    var balEl = document.getElementById('totalBalance');
    if (balEl) {
      animateNumber(balEl, total, '$');
    }
    setText('ethBalance', state.balance.eth.toFixed(4));
    setText('arbBalance', state.balance.arb.toFixed(4));
    setText('baseBalance', state.balance.base.toFixed(4));
    setText('polyBalance', state.balance.matic.toFixed(2));
  }

  function animateNumber(el, target, prefix) {
    var start = 0;
    var duration = 800;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var current = start + (target - start) * easeOutCubic(progress);
      el.textContent = prefix + current.toFixed(2);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toFixed(2);
    }
    requestAnimationFrame(step);
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function renderRecentActivity() {
    var container = document.getElementById('recentActivity');
    if (!container) return;
    var txs = state.transactions.slice(-5).reverse();
    if (txs.length === 0) {
      container.innerHTML =
        '<div style="text-align:center; padding:32px; color:var(--text-muted); font-size:14px;" id="noActivity">' +
        'No recent transactions. Send your first payment!' +
        '</div>';
      return;
    }
    container.innerHTML = txs.map(function (tx) {
      var isSend = tx.type === 'send';
      var dotClass = isSend ? 'send' : 'receive';
      var arrow = isSend ? '↑' : '↓';
      var amtClass = isSend ? 'negative' : 'positive';
      var sign = isSend ? '-' : '+';
      return (
        '<div class="activity-item">' +
        '<div class="activity-dot ' + dotClass + '">' + arrow + '</div>' +
        '<div class="activity-info">' +
        '<div class="activity-title">' + (isSend ? 'Sent ' + tx.token : 'Received ' + tx.token) + '</div>' +
        '<div class="activity-desc">' + formatAddress(tx.to || tx.from) + ' · ' + formatTime(tx.timestamp) + '</div>' +
        '</div>' +
        '<div class="activity-amount">' +
        '<div class="amount ' + amtClass + '">' + sign + tx.amount + ' ' + tx.token + '</div>' +
        '<span class="status-' + tx.status + '">' + tx.status.charAt(0).toUpperCase() + tx.status.slice(1) + '</span>' +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  // ===== SEND =====
  var selectedToken = 'ETH';
  var selectedTokenName = 'Ethereum (ETH)';
  var selectedTokenColor = '#627EEA';

  function initSend() {
    // Reset form
    var amt = document.getElementById('sendAmount');
    var rec = document.getElementById('sendRecipient');
    if (amt) amt.value = '';
    if (rec) rec.value = '';
    updateFeeEstimate();
  }

  window.toggleTokenDropdown = function () {
    var dd = document.getElementById('tokenDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  };

  window.selectToken = function (sym, name, color) {
    selectedToken = sym;
    selectedTokenName = name;
    selectedTokenColor = color;
    var el = document.getElementById('selectedToken');
    if (el) el.textContent = name;
    var icon = document.querySelector('.token-selector .token-icon');
    if (icon) {
      icon.textContent = sym;
      icon.style.background = 'rgba(' + hexToRgb(color) + ',0.15)';
      icon.style.color = color;
    }
    var dd = document.getElementById('tokenDropdown');
    if (dd) dd.style.display = 'none';
    updateFeeEstimate();
  };

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  }

  document.addEventListener('click', function (e) {
    var dd = document.getElementById('tokenDropdown');
    if (dd && !e.target.closest('.token-selector') && !e.target.closest('#tokenDropdown')) {
      dd.style.display = 'none';
    }
  });

  // Amount -> USD update
  document.addEventListener('input', function (e) {
    if (e.target.id === 'sendAmount') {
      var usdEl = document.getElementById('sendUsd');
      if (usdEl) {
        var val = parseFloat(e.target.value) || 0;
        usdEl.textContent = usdify(val, selectedToken);
      }
      updateFeeEstimate();
    }
  });

  function updateFeeEstimate() {
    var amt = parseFloat(document.getElementById('sendAmount')?.value) || 0;
    var fee = (0.0001 + Math.random() * 0.0003).toFixed(4);
    var routes = [
      'Ethereum → Arbitrum',
      'Ethereum → Base → Arbitrum',
      'Ethereum → Polygon → Base',
      'Optimism → Base → Arbitrum'
    ];
    var route = routes[Math.floor(Math.random() * routes.length)];
    setText('routeEstimate', route);
    setText('feeEstimate', '~$' + (amt * 0.001 + 0.15).toFixed(2));
    var arrival = (10 + Math.floor(Math.random() * 20)) + ' seconds';
    setText('arrivalEstimate', arrival);
  }

  window.initiateSend = function () {
    var recipient = document.getElementById('sendRecipient');
    var amount = document.getElementById('sendAmount');

    if (!recipient || !recipient.value.trim()) {
      showToast('Enter a recipient address', 'error');
      return;
    }
    var amt = parseFloat(amount?.value);
    if (!amt || amt <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }

    var overlay = document.getElementById('routingOverlay');
    if (overlay) overlay.classList.add('active');

    document.getElementById('routingContent').style.display = 'block';
    document.getElementById('routingSuccess').style.display = 'none';

    animateRouting(function () {
      // Complete
      executeTransaction(recipient.value.trim(), amt, selectedToken);
      document.getElementById('routingContent').style.display = 'none';
      document.getElementById('routingSuccess').style.display = 'block';
      document.getElementById('successAmount').textContent = amt + ' ' + selectedToken;
      document.getElementById('successRoute').textContent = document.getElementById('routeEstimate')?.textContent || 'Ethereum → Arbitrum';
      document.getElementById('successFee').textContent = document.getElementById('feeEstimate')?.textContent || '~$0.42';
      document.getElementById('successTxId').textContent = generateTxId();
    });
  };

  function animateRouting(callback) {
    var nodes = [
      document.getElementById('routeEthereum'),
      document.getElementById('routeBase'),
      document.getElementById('routeArbitrum'),
      document.getElementById('routeDelivered')
    ];
    var arrows = [
      document.getElementById('arrow1'),
      document.getElementById('arrow2'),
      document.getElementById('arrow3')
    ];
    var bar = document.getElementById('routingProgress');
    var status = document.getElementById('routingStatus');

    var statuses = [
      'Analyzing blockchain paths...',
      'Routing through Ethereum...',
      'Bridging to Base...',
      'Routing to Arbitrum...',
      'Confirming delivery...'
    ];

    var idx = 0;
    var interval = setInterval(function () {
      idx++;
      var pct = Math.min(100, Math.round((idx / (nodes.length + 1)) * 100));
      if (bar) bar.style.width = pct + '%';
      if (status && statuses[idx]) status.textContent = statuses[idx];

      nodes.forEach(function (n, i) {
        if (!n) return;
        n.classList.toggle('active', i === idx - 1);
        n.classList.toggle('completed', i < idx - 1);
      });
      arrows.forEach(function (a, i) {
        if (!a) return;
        a.classList.toggle('active', i < idx - 1);
      });

      if (idx >= nodes.length + 1) {
        clearInterval(interval);
        if (bar) bar.style.width = '100%';
        if (status) status.textContent = '✓ Delivered successfully!';
        setTimeout(callback, 600);
      }
    }, 800);
  }

  function executeTransaction(to, amount, token) {
    var tx = {
      id: generateTxId(),
      type: 'send',
      to: to,
      from: state.address,
      amount: amount,
      token: token,
      status: 'completed',
      timestamp: Date.now(),
      route: document.getElementById('routeEstimate')?.textContent || 'Ethereum → Arbitrum',
      fee: document.getElementById('feeEstimate')?.textContent || '~$0.42'
    };

    state.transactions.push(tx);

    // Reduce balance
    if (token === 'ETH') {
      state.balance.eth = Math.max(0, state.balance.eth - amount * 0.7);
      state.balance.arb = Math.max(0, state.balance.arb - amount * 0.2);
      state.balance.base = Math.max(0, state.balance.base - amount * 0.1);
    } else if (token === 'USDC') {
      // Simulate USDC subtraction from eth balance
      state.balance.eth = Math.max(0, state.balance.eth - amount * 0.0003);
    } else if (token === 'MATIC') {
      state.balance.matic = Math.max(0, state.balance.matic - amount);
    }

    saveState();
  }

  window.closeRouting = function () {
    var overlay = document.getElementById('routingOverlay');
    if (overlay) overlay.classList.remove('active');
  };

  // ===== RECEIVE =====
  function initReceive() {
    var addrEl = document.getElementById('receiveAddress');
    if (addrEl) addrEl.textContent = state.address;
    generateQR(state.address);
  }

  function generateQR(data) {
    var canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var size = 200;
    canvas.width = size;
    canvas.height = size;
    var cellSize = size / 25;

    // Simple QR-like pattern (visual only)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw finder patterns
    function drawFinder(x, y) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
    }

    drawFinder(0, 0);
    drawFinder(size - 7 * cellSize, 0);
    drawFinder(0, size - 7 * cellSize);

    // Generate data pattern from the address string
    ctx.fillStyle = '#000000';
    var hash = 0;
    for (var i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0;
    }
    var rng = pseudoRandom(hash);

    for (var row = 0; row < 25; row++) {
      for (var col = 0; col < 25; col++) {
        // Skip finder patterns and timing patterns
        if ((row < 7 && col < 7) ||
            (row < 7 && col >= size / cellSize - 7) ||
            (row >= size / cellSize - 7 && col < 7) ||
            row === 6 || col === 6) continue;
        if (rng() > 0.5) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  function pseudoRandom(seed) {
    return function () {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff);
    };
  }

  window.copyAddress = function () {
    var addr = state.address;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(function () {
        showToast('Address copied to clipboard', 'success');
      });
    } else {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = addr;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Address copied to clipboard', 'success');
    }
  };

  window.shareAddress = function () {
    if (navigator.share) {
      navigator.share({
        title: 'UniPay Address',
        text: 'Send crypto to my UniPay address: ' + state.address
      }).catch(function () { /* ignore */ });
    } else {
      copyAddress();
    }
  };

  // ===== TRANSACTIONS =====
  var currentFilter = 'all';

  function initTransactions() {
    renderTransactions('all');
  }

  window.filterTx = function (filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTransactions(filter);
  };

  function renderTransactions(filter) {
    var container = document.getElementById('transactionList');
    if (!container) return;

    var txs = state.transactions;
    if (filter !== 'all') {
      txs = txs.filter(function (t) { return t.status === filter; });
    }

    if (txs.length === 0) {
      container.innerHTML =
        '<div style="text-align:center; padding:48px; color:var(--text-muted);" id="noTx">' +
        '<p style="font-size:18px; margin-bottom:8px;">' +
        (filter === 'all' ? 'No transactions yet' : 'No ' + filter + ' transactions') +
        '</p>' +
        '<p style="font-size:14px;">Send your first cross-chain payment to see it here.</p>' +
        '</div>';
      return;
    }

    container.innerHTML = txs.slice().reverse().map(function (tx) {
      var isSend = tx.type === 'send';
      var icon = isSend ? '↑' : '↓';
      var iconClass = isSend ? 'send' : 'receive';
      var sign = isSend ? '-' : '+';
      var amtClass = isSend ? 'negative' : 'positive';

      return (
        '<div class="tx-item">' +
        '<div class="tx-header">' +
        '<div class="tx-left">' +
        '<div class="tx-icon ' + iconClass + '" style="background:rgba(' + (isSend ? '239,68,68' : '16,185,129') + ',0.15);color:' + (isSend ? '#EF4444' : '#10B981') + ';">' + icon + '</div>' +
        '<div class="tx-info">' +
        '<h4>' + (isSend ? 'Sent ' + tx.token : 'Received ' + tx.token) + '</h4>' +
        '<p>' + formatAddress(isSend ? tx.to : tx.from) + ' · ' + formatTime(tx.timestamp) + '</p>' +
        '</div>' +
        '</div>' +
        '<div class="tx-amount">' +
        '<div class="amount ' + amtClass + '">' + sign + tx.amount + ' ' + tx.token + '</div>' +
        '<span class="status-' + tx.status + '" style="font-size:11px;padding:2px 8px;border-radius:50px;display:inline-block;margin-top:4px;">' +
        tx.status.charAt(0).toUpperCase() + tx.status.slice(1) +
        '</span>' +
        '</div>' +
        '</div>' +
        '<div class="tx-route">' +
        (tx.route ? tx.route.split('→').map(function (s) { return '<span>' + s.trim() + '</span>'; }).join('<span class="arrow">→</span>') : '') +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  // ===== AI ASSISTANT =====
  function initAI() {
    var input = document.getElementById('aiInput');
    if (input && !input.dataset.aiInit) {
      input.dataset.aiInit = '1';
    }
  }

  window.aiProcess = function () {
    var input = document.getElementById('aiInput');
    var response = document.getElementById('aiResponse');
    if (!input || !response) return;

    var text = input.value.trim();
    if (!text) {
      showToast('Type a command for the AI assistant', 'error');
      return;
    }

    // Parse: "Send X AMOUNT to NAME"
    var pattern = /send\s+([\d.]+)\s*(\w+)\s+to\s+(.+)/i;
    var match = text.match(pattern);

    if (match) {
      var amt = parseFloat(match[1]);
      var token = match[2].toUpperCase();
      var name = match[3].trim();

      if (['ETH', 'USDC', 'MATIC'].indexOf(token) === -1) token = 'ETH';

      response.className = 'ai-response visible';
      response.innerHTML =
        '<div style="margin-bottom:12px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></span>' +
        '<span style="font-size:14px;">Parsing command...</span>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-muted);">' +
        'Detected: Send <strong>' + amt + ' ' + token + '</strong> to <strong>' + name + '</strong>' +
        '</div>' +
        '</div>' +
        '<div id="aiProgress" style="margin-bottom:12px;">' +
        '<div class="routing-progress" style="height:4px;"><div class="routing-progress-bar" style="width:0%;" id="aiBar"></div></div>' +
        '</div>' +
        '<div id="aiResult" style="display:none;">' +
        '<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius-sm);padding:12px;font-size:13px;">' +
        '✅ Sent ' + amt + ' ' + token + ' to ' + name + ' via <strong>Smart Route</strong> (Ethereum → Arbitrum)' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="window.location=\'transactions.html\'">View Transaction</button>' +
        '</div>';

      // Animate the AI progress bar
      var aiBar = document.getElementById('aiBar');
      var step = 0;
      var aiInterval = setInterval(function () {
        step++;
        if (aiBar) aiBar.style.width = Math.min(100, step * 25) + '%';
        if (step >= 4) {
          clearInterval(aiInterval);
          if (aiBar) aiBar.style.width = '100%';
          setTimeout(function () {
            document.getElementById('aiProgress').style.display = 'none';
            document.getElementById('aiResult').style.display = 'block';

            // Execute the transaction
            executeTransaction('0x' + name.toLowerCase().replace(/\s/g, '') + '...', amt, token);
            // Update dashboard balance if we're on app.html
            updateBalanceDisplay();
            renderRecentActivity();
          }, 500);
        }
      }, 400);
    } else {
      // Unknown command
      response.className = 'ai-response visible';
      response.innerHTML =
        '<div style="padding:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm);font-size:13px;">' +
        'I didn\'t understand that command. Try: <strong>"Send 0.02 ETH to John"</strong>' +
        '</div>';
    }

    input.value = '';
  };

  // ===== QUICK SEND MODAL =====
  window.openSendModal = function () {
    var modal = document.getElementById('sendModal');
    if (modal) modal.classList.add('active');
  };

  window.closeSendModal = function () {
    var modal = document.getElementById('sendModal');
    if (modal) modal.classList.remove('active');
  };

  window.quickSend = function () {
    var rec = document.getElementById('modalRecipient');
    var amt = document.getElementById('modalAmount');
    var tok = document.getElementById('modalToken');

    if (!rec?.value || !amt?.value || parseFloat(amt.value) <= 0) {
      showToast('Fill in all fields', 'error');
      return;
    }

    closeSendModal();

    // Trigger routing animation on send page if we're there
    var overlay = document.getElementById('routingOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.getElementById('routingContent').style.display = 'block';
      document.getElementById('routingSuccess').style.display = 'none';
      animateRouting(function () {
        executeTransaction(rec.value, parseFloat(amt.value), tok?.value || 'ETH');
        document.getElementById('routingContent').style.display = 'none';
        document.getElementById('routingSuccess').style.display = 'block';
        document.getElementById('successAmount').textContent = amt.value + ' ' + (tok?.value || 'ETH');
        document.getElementById('successRoute').textContent = 'Ethereum → Arbitrum';
        document.getElementById('successFee').textContent = '~$' + (parseFloat(amt.value) * 0.001 + 0.15).toFixed(2);
        document.getElementById('successTxId').textContent = generateTxId();
      });
    }
  };

  // ===== INIT SEED TRANSACTIONS =====
  if (state.transactions.length === 0) {
    state.transactions.push({
      id: generateTxId(),
      type: 'receive',
      to: state.address,
      from: '0x1234...abcd',
      amount: 0.05,
      token: 'ETH',
      status: 'completed',
      timestamp: Date.now() - 3600000 * 2,
      route: 'Ethereum → Base',
      fee: '~$0.32'
    });
    state.transactions.push({
      id: generateTxId(),
      type: 'send',
      to: '0xabcd...ef01',
      from: state.address,
      amount: 100,
      token: 'USDC',
      status: 'completed',
      timestamp: Date.now() - 3600000 * 24,
      route: 'Ethereum → Arbitrum → Base',
      fee: '~$0.89'
    });
    state.transactions.push({
      id: generateTxId(),
      type: 'send',
      to: '0x9876...5432',
      from: state.address,
      amount: 0.12,
      token: 'ETH',
      status: 'routed',
      timestamp: Date.now() - 1800000,
      route: 'Ethereum → Base → Optimism',
      fee: '~$0.51'
    });
    saveState();
  }

})();
