function showToast(text) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').innerText = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector(`[data-path="${pageId}"]`);
    if (nav) nav.classList.add('active');

    if (pageId === 'incidencias') {
        renderIncidents();
    }

    if (document.getElementById('sidebar').classList.contains('active')) {
        toggleMenu();
    }

    window.scrollTo(0, 0);
}

function goToProfile() {
    document.getElementById('setup-modal').style.display = 'none';
    showPage('profile');
}

function dismissInstallBanner() {
    document.getElementById('install-banner').style.display = 'none';
    sessionStorage.setItem('installBannerDismissed', 'true');
}

function checkInstallation() {
    const dismissed = sessionStorage.getItem('installBannerDismissed');
    if (dismissed) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const banner = document.getElementById('install-banner');
    const instructions = document.getElementById('install-instructions');

    if (!isStandalone && isMobile) {
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isiOS) {
            banner.style.display = 'flex';
            instructions.innerHTML = 'Pulsa <strong>Compartir</strong> <i class="fa-solid fa-arrow-up-from-bracket"></i> y luego <strong>"Añadir a pantalla de inicio"</strong>.';
        } else {
            banner.style.display = 'flex';
            instructions.innerHTML = 'Pulsa los <strong>tres puntos</strong> <i class="fa-solid fa-ellipsis-vertical"></i> y elige <strong>"Agregar a pantalla de inicio"</strong>.';
        }
    }
}
