/**
 * LIVE SOCIAL PROOF & URGENCY BAR LOGIC - REFIXED
 */

console.log('Social Proof Script Loaded');

function initSocialProofApp() {
    console.log('Initializing Social Proof & Urgency Bar...');
    initUrgencyBar();
    initSocialProof();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialProofApp);
} else {
    initSocialProofApp();
}

// --- URGENCY BAR ---
function initUrgencyBar() {
    const countdownElement = document.getElementById('urgency-countdown');
    if (!countdownElement) {
        console.warn('Urgency countdown element not found');
        return;
    }

    let totalSeconds = 41 * 3600 + 45 * 60;

    function updateCountdown() {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        countdownElement.textContent = `${hours}h ${minutes}m ${seconds}s restantes`;

        if (totalSeconds > 0) {
            totalSeconds--;
        } else {
            clearInterval(countdownInterval);
            countdownElement.textContent = "Última oportunidad";
        }
    }

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
}

// --- SOCIAL PROOF POP-UPS ---
function initSocialProof() {
    const container = document.getElementById('social-proof-container');
    if (!container) {
        console.error('Social proof container NOT found in DOM');
        return;
    }

    const names = ["Carlos", "María", "Eduardo", "Lucía", "Andrés", "Valeria", "Ricardo", "Sofía", "Jorge", "Elena", "Fernando", "Isabel", "Miguel", "Beatriz", "Raul"];
    const cities = ["Guadalajara", "CDMX", "Monterrey", "Zapopan", "Querétaro", "Puebla", "Mérida", "Cancún", "León", "Tijuana", "Toluca", "Chihuahua"];
    const amounts = [50, 100, 150, 200, 300, 500, 1000];
    const messages = [
        "Salvó cirugía de Thor 🔥",
        "Garantizó 1 semana de croquetas 🦴",
        "Ayudó con vacunas de Kira 💉",
        "Donó para el refugio 🐾",
        "Apoyó urgencia de rescate 🚑",
        "Contribuyó con medicinas vitales 💊",
        "Envió amor a los peludos ❤️"
    ];

    function showPopup() {
        console.log('Triggering Social Proof Popup');
        const name = names[Math.floor(Math.random() * names.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const time = Math.floor(Math.random() * 45) + 5;

        const popup = document.createElement('div');
        popup.className = 'social-proof-popup';
        popup.innerHTML = `
            <div class="popup-icon">🐾</div>
            <div class="popup-content">
                <p class="popup-text">¡<strong>${name}</strong> de <strong>${city}</strong> donó <strong>$${amount} MXN</strong> hace ${time}s!</p>
                <p class="popup-subtext">${message}</p>
            </div>
            <button class="popup-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(popup);

        // Auto-remove
        setTimeout(() => {
            popup.classList.add('out');
            setTimeout(() => popup.remove(), 500);
        }, 7000);
    }

    // Trigger FIRST notification after 2 seconds instead of 10
    setTimeout(() => {
        showPopup();
        // Continue cycle
        setInterval(showPopup, 25000 + Math.random() * 15000);
    }, 2000);
}
