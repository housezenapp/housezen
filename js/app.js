function initializeApp() {
    setupPriorityButtons();

    document.getElementById('incidentForm').onsubmit = handleSubmit;

    setTimeout(() => {
        initializeAuth();
        checkInstallation();
    }, 500);
}

window.onload = initializeApp;
//hola