(function () {
  const IDLE_LIMIT = 10 * 60 * 1000;
  const WARNING_AT = 9 * 60 * 1000;
  const STORAGE_KEY = 'yankun-admin-last-activity';

  window.startYanKunIdleSession = async function (client, freshLogin) {
    // Los módulos embebidos no deben duplicar el modal ni el temporizador de sesión,
    // pero sí informar al dashboard cuando hay actividad dentro del iframe.
    if (window.self !== window.top) {
      let lastParentNotice = 0;
      function notifyParentActivity() {
        const now = Date.now();
        if (now - lastParentNotice < 1000) return;
        lastParentNotice = now;
        try {
          window.parent.postMessage({ type: 'yankun-admin-activity', at: now }, window.location.origin);
        } catch (_) {}
      }
      ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input', 'change'].forEach(function (eventName) {
        document.addEventListener(eventName, notifyParentActivity, { passive: true });
      });
      return true;
    }

    const previousActivity = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (!freshLogin && previousActivity && Date.now() - previousActivity >= IDLE_LIMIT) {
      localStorage.removeItem(STORAGE_KEY);
      await client.auth.signOut();
      return false;
    }

    if (freshLogin || !previousActivity) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    let warningVisible = false;
    let expired = false;
    let checkTimer = null;
    let warningTimer = null;
    let modal = null;
    let countdown = null;

    function closeWarning() {
      warningVisible = false;
      if (warningTimer) {
        clearInterval(warningTimer);
        warningTimer = null;
      }
      if (modal) modal.hidden = true;
    }

    async function expireSession() {
      if (expired) return;
      expired = true;
      if (checkTimer) clearInterval(checkTimer);
      if (warningTimer) clearInterval(warningTimer);
      localStorage.removeItem(STORAGE_KEY);
      await client.auth.signOut();
      window.location.href = 'admin.html?session-expired=1';
    }

    function showWarning() {
      if (warningVisible || expired) return;
      warningVisible = true;
      modal.hidden = false;
      function updateCountdown() {
        const last = Number(localStorage.getItem(STORAGE_KEY) || Date.now());
        const remaining = Math.max(0, Math.ceil((IDLE_LIMIT - (Date.now() - last)) / 1000));
        countdown.textContent = String(remaining);
        if (remaining <= 0) expireSession();
      }
      updateCountdown();
      warningTimer = setInterval(updateCountdown, 250);
    }

    function checkActivity() {
      if (expired) return;
      const last = Number(localStorage.getItem(STORAGE_KEY) || Date.now());
      const elapsed = Date.now() - last;
      if (elapsed >= IDLE_LIMIT) {
        expireSession();
      } else if (elapsed >= WARNING_AT) {
        showWarning();
      } else if (warningVisible) {
        closeWarning();
      }
    }

    const style = document.createElement('style');
    style.textContent = `
      .yk-session-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:#080a0dcc;backdrop-filter:blur(5px)}
      .yk-session-overlay[hidden]{display:none}
      .yk-session-dialog{width:min(100%,430px);padding:26px;border:1px solid #80515a;border-radius:16px;background:#1b1e25;color:#e8e8ee;box-shadow:0 24px 80px #000b;font-family:Arial,sans-serif;text-align:center}
      .yk-session-icon{width:46px;height:46px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:#39252c;color:#ffb3b6;font-size:23px}
      .yk-session-dialog h2{margin:0 0 10px;font-size:21px}
      .yk-session-dialog p{margin:0;color:#b7bac4;font-size:13px;line-height:1.65}
      .yk-session-count{margin:16px 0;color:#ffb3b6;font-size:28px;font-weight:800}
      .yk-session-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:18px}
      .yk-session-actions button{border-radius:8px;padding:11px 15px;font-size:12px;font-weight:800;cursor:pointer}
      .yk-session-continue{border:0;background:#e11d48;color:white}
      .yk-session-logout{border:1px solid #454954;background:#252a32;color:#e5e7eb}
    `;
    document.head.appendChild(style);
    modal = document.createElement('div');
    modal.className = 'yk-session-overlay';
    modal.hidden = true;
    modal.innerHTML = '<section class="yk-session-dialog" role="alertdialog" aria-modal="true" aria-labelledby="yk-session-title"><div class="yk-session-icon" aria-hidden="true">◷</div><h2 id="yk-session-title">¿Seguís ahí?</h2><p>Por seguridad, vamos a cerrar tu sesión por inactividad. Si todavía estás trabajando, confirmá para continuar. Podés aprovechar este minuto para guardar cualquier cambio pendiente.</p><div class="yk-session-count"><span id="yk-session-countdown">60</span> segundos</div><div class="yk-session-actions"><button type="button" class="yk-session-continue" id="yk-session-continue">Seguir trabajando</button><button type="button" class="yk-session-logout" id="yk-session-logout">Cerrar sesión</button></div></section>';
    document.body.appendChild(modal);
    countdown = modal.querySelector('#yk-session-countdown');
    modal.querySelector('#yk-session-continue').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      closeWarning();
    });
    modal.querySelector('#yk-session-logout').addEventListener('click', expireSession);

    let lastWrite = Number(localStorage.getItem(STORAGE_KEY) || Date.now());
    function registerActivity() {
      if (warningVisible || expired) return;
      const now = Date.now();
      if (now - lastWrite < 4000) return;
      lastWrite = now;
      localStorage.setItem(STORAGE_KEY, String(now));
    }
    ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'input', 'change'].forEach(function (eventName) {
      document.addEventListener(eventName, registerActivity, { passive: true });
    });

    // Solo se acepta actividad del iframe de módulos perteneciente al mismo origen.
    window.addEventListener('message', function (event) {
      const frame = document.getElementById('moduleFrame');
      if (event.origin !== window.location.origin ||
          !frame ||
          frame.contentWindow !== event.source ||
          event.data?.type !== 'yankun-admin-activity') return;
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, String(now));
      lastWrite = now;
      if (warningVisible) closeWarning();
    });
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY && event.newValue) {
        lastWrite = Number(event.newValue);
        checkActivity();
      }
    });
    checkTimer = setInterval(checkActivity, 1000);
    checkActivity();
    return true;
  };
})();