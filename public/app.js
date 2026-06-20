(function() {
    "use strict";

    let appState = {
        xp: 0,
        co2SavedToday: 0.0,
        activeHabits: [],
        profile: {
            electricityBill: 80,
            cleanEnergy: 20,
            heatingFuel: 'gas',
            commuteDistance: 150,
            carType: 'gasoline',
            transitDistance: 30,
            flights: 6,
            diet: 'mediumMeat',
            localFood: 30,
            wasteRecycling: 'some',
            spending: 200,
            hasCalculated: false,
            goalReduction: 20
        },
        offsetPercent: 0, // 0 to 100
        selectedCountry: 'US',
        history: []
    };

    // Carbon Conversion Factors
    const factors = {
        electricityRate: 0.15,
        electricityCo2: 0.385,
        heatingEmissions: {
            electricity: 600,
            gas: 1800,
            oil: 2600,
            lpg: 2000,
            none: 0
        },
        carCo2: {
            gasoline: 0.170,
            diesel: 0.171,
            hybrid: 0.101,
            electric: 0.047,
            none: 0
        },
        transitCo2: 0.06,
        flightCo2: 90,
        dietBase: {
            heavyMeat: 2900,
            mediumMeat: 2200,
            lowMeat: 1700,
            vegetarian: 1400,
            vegan: 1100
        },
        wasteBase: {
            none: 500,
            some: 250,
            all: 80
        },
        spendingCo2: 0.12,
        publicServices: 500
    };

    // Core Habits List
    const habitsData = [
        { id: 'ledBulbs', name: 'Switch to LED Lighting', impact: 'Medium', saving: 0.25, icon: '💡', desc: 'Replace halogen bulbs with energy-efficient LEDs.' },
        { id: 'compost', name: 'Compost Organic Waste', impact: 'Low', saving: 0.15, icon: '🍎', desc: 'Compost scraps to prevent methane emissions in landfills.' },
        { id: 'lineDry', name: 'Line Dry Clothes', impact: 'Medium', saving: 0.20, icon: '👕', desc: 'Avoid electric dryer usage by air drying.' },
        { id: 'meatlessDays', name: 'Practice Meatless Mondays', impact: 'Medium', saving: 0.35, icon: '🥦', desc: 'Eat plant-based meals at least one day a week.' },
        { id: 'thermostat', name: 'Optimized Thermostat (2°C offset)', impact: 'Medium', saving: 0.30, icon: '🌡️', desc: 'Keep home 2°C warmer in summer, cooler in winter.' },
        { id: 'noPlastic', name: 'Zero Single-use Plastic', impact: 'Low', saving: 0.10, icon: '🥤', desc: 'Carry reusable bottles, bags, and cups.' },
        { id: 'carpool', name: 'Commute via Carpool/Rideshare', impact: 'High', saving: 0.60, icon: '👥', desc: 'Share your commute with others to halve fuel emissions.' },
        { id: 'solarPanels', name: 'Install Solar Panels', impact: 'High', saving: 1.50, icon: '☀️', desc: 'Use clean solar power for household electricity.' }
    ];

    // Badges List
    const badgesData = [
        { id: 'starter', name: 'Eco Starter', icon: '🌱', desc: 'Calculate your initial carbon footprint.' },
        { id: 'carbonCutter', name: 'Carbon Cutter', icon: '✂️', desc: 'Maintain a carbon footprint under 4.0 Tons.' },
        { id: 'parisTarget', name: 'Paris Champion', icon: '🏆', desc: 'Achieve the 2030 Paris Target of under 2.0 Tons!' },
        { id: 'actionHero', name: 'Action Hero', icon: '🦸', desc: 'Reach level 2 by logging eco actions.' },
        { id: 'habitGreen', name: 'Habitual Green', icon: '🌿', desc: 'Activate at least 3 core green habits.' },
        { id: 'habitChamp', name: 'Habit Champion', icon: '👑', desc: 'Activate 6 or more core green habits.' },
        { id: 'climateProtector', name: 'Climate Protector', icon: '🛡️', desc: 'Reach level 4 by actively saving carbon.' },
        { id: 'wasteMaster', name: 'Waste Master', icon: '♻️', desc: 'Implement strict waste recycling habits.' }
    ];

    // Quick Action Savings Mapping
    const quickActions = {
        transit: { name: 'Commuted via Transit', co2: 5.2, xp: 25, icon: '🚌' },
        meal: { name: 'Plant-based Meal', co2: 3.1, xp: 15, icon: '🥗' },
        unplug: { name: 'Unplugged Devices', co2: 0.5, xp: 10, icon: '🔌' },
        recycle: { name: 'Sorted Waste', co2: 0.8, xp: 10, icon: '♻️' }
    };

    // National Per-capita Averages (Tons CO2e / year)
    const countryAverages = {
        US: 16.0,
        DE: 7.9,
        UK: 5.2,
        CN: 7.4,
        IN: 1.9,
        GL: 4.5
    };

    // Chart.js instances
    let breakdownChart = null;
    let comparisonChart = null;

    // Confetti Particle System variables
    let confettiCanvas = null;
    let confettiCtx = null;
    let confettiParticles = [];
    let isConfettiRunning = false;

    // Audio Context for sound synthesis
    let audioCtx = null;

    // Initial Load & Event Binding
    document.addEventListener('DOMContentLoaded', () => {
        loadState();
        initUI();
        setupTabNavigation();
        setupKeyboardTabs();
        setupSliders();
        setupCalculatorForm();
        setupQuickLogger();
        setupOffsetSimulator();
        renderHabitsList();
        initConfetti();
        updateDashboard();
    });

    // Load state from LocalStorage
    function loadState() {
        const saved = localStorage.getItem('ecopulse_state');
        if (saved) {
            try {
                appState = JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing saved state, resetting...", e);
            }
        }
    }

    // Save state to LocalStorage
    function saveState() {
        localStorage.setItem('ecopulse_state', JSON.stringify(appState));
    }

    // Sound Effects Synthesizer (Web Audio API)
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playTabSound() {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.06);
        
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
    }

    function playPopSound() {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    function playChimeSound() {
        initAudio();
        if (!audioCtx) return;
        
        const playTone = (freq, time, dur) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.06, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
            osc.start(time);
            osc.stop(time + dur);
        };
        
        const t = audioCtx.currentTime;
        playTone(523.25, t, 0.12);     // C5
        playTone(659.25, t + 0.08, 0.12); // E5
        playTone(783.99, t + 0.16, 0.18); // G5
        playTone(1046.50, t + 0.28, 0.3); // C6
    }

// Confetti Particle System
function initConfetti() {
    confettiCanvas = document.getElementById('confetti-canvas');
    if (confettiCanvas) {
        confettiCtx = confettiCanvas.getContext('2d');
        resizeConfettiCanvas();
        window.addEventListener('resize', resizeConfettiCanvas);
    }
}

function resizeConfettiCanvas() {
    if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
}

class ConfettiParticle {
    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2 + 50;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 4; // Upward bias
        this.radius = Math.random() * 3 + 4;
        this.color = `hsl(${Math.random() * 360}, 85%, 60%)`;
        this.gravity = 0.22;
        this.friction = 0.97;
        this.opacity = 1.0;
        this.decay = Math.random() * 0.015 + 0.008;
    }
    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.opacity -= this.decay;
    }
    draw() {
        confettiCtx.save();
        confettiCtx.globalAlpha = this.opacity;
        confettiCtx.fillStyle = this.color;
        confettiCtx.beginPath();
        confettiCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        confettiCtx.fill();
        confettiCtx.restore();
    }
}

function triggerConfetti() {
    if (!confettiCanvas) initConfetti();
    playChimeSound();
    
    // Spawn 130 particles
    for (let i = 0; i < 130; i++) {
        confettiParticles.push(new ConfettiParticle());
    }
    
    if (!isConfettiRunning) {
        isConfettiRunning = true;
        animateConfetti();
    }
}

function animateConfetti() {
    if (confettiParticles.length === 0) {
        isConfettiRunning = false;
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        return;
    }
    
    requestAnimationFrame(animateConfetti);
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.update();
        if (p.opacity <= 0 || p.y > window.innerHeight) {
            confettiParticles.splice(i, 1);
        } else {
            p.draw();
        }
    }
}

// Setup static UI elements
function initUI() {
    // Populate form values from state
    document.getElementById('electricity-bill').value = appState.profile.electricityBill;
    document.getElementById('clean-energy').value = appState.profile.cleanEnergy;
    document.getElementById('heating-fuel').value = appState.profile.heatingFuel;
    
    document.getElementById('commute-distance').value = appState.profile.commuteDistance;
    document.getElementById('car-type').value = appState.profile.carType;
    document.getElementById('transit-distance').value = appState.profile.transitDistance;
    document.getElementById('flights').value = appState.profile.flights;
    
    // Diet radio buttons
    document.querySelectorAll('input[name="diet"]').forEach(radio => {
        if (radio.value === appState.profile.diet) {
            radio.checked = true;
            radio.closest('.radio-card').classList.add('active');
        } else {
            radio.closest('.radio-card').classList.remove('active');
        }
    });
    
    document.getElementById('local-food').value = appState.profile.localFood;
    document.getElementById('waste-recycling').value = appState.profile.wasteRecycling;
    document.getElementById('spending').value = appState.profile.spending;
    
    // Setup Country selector
    document.getElementById('country-select').value = appState.selectedCountry;
    
    // Setup Offset slider
    document.getElementById('offset-slider').value = appState.offsetPercent;
    
    // Setup Goal slider
    document.getElementById('goal-slider').value = appState.profile.goalReduction;
    
    // Update labels display
    updateSliderLabelDisplays();
    updateProfileWidget();
}

// Setup Sliders display updates
function setupSliders() {
    const sliders = [
        { id: 'electricity-bill', displayId: 'electricity-bill-display', prefix: '$', suffix: '' },
        { id: 'clean-energy', displayId: 'clean-energy-display', prefix: '', suffix: '%' },
        { id: 'commute-distance', displayId: 'commute-distance-display', prefix: '', suffix: ' km' },
        { id: 'transit-distance', displayId: 'transit-distance-display', prefix: '', suffix: ' km' },
        { id: 'flights', displayId: 'flights-display', prefix: '', suffix: ' hours' },
        { id: 'local-food', displayId: 'local-food-display', prefix: '', suffix: '%' },
        { id: 'spending', displayId: 'spending-display', prefix: '$', suffix: '' }
    ];
    
    sliders.forEach(slider => {
        const input = document.getElementById(slider.id);
        const display = document.getElementById(slider.displayId);
        
        input.addEventListener('input', () => {
            display.textContent = `${slider.prefix}${input.value}${slider.suffix}`;
        });
    });
    
    // Goal Slider Listener
    const goalSlider = document.getElementById('goal-slider');
    const goalDisplay = document.getElementById('goal-percent-display');
    goalSlider.addEventListener('input', () => {
        appState.profile.goalReduction = parseInt(goalSlider.value);
        goalDisplay.textContent = `${appState.profile.goalReduction}%`;
        updateGoalTracker();
    });
}

function updateSliderLabelDisplays() {
    document.getElementById('electricity-bill-display').textContent = `$${appState.profile.electricityBill}`;
    document.getElementById('clean-energy-display').textContent = `${appState.profile.cleanEnergy}%`;
    document.getElementById('commute-distance-display').textContent = `${appState.profile.commuteDistance} km`;
    document.getElementById('transit-distance-display').textContent = `${appState.profile.transitDistance} km`;
    document.getElementById('flights-display').textContent = `${appState.profile.flights} hours`;
    document.getElementById('local-food-display').textContent = `${appState.profile.localFood}%`;
    document.getElementById('spending-display').textContent = `$${appState.profile.spending}`;
    document.getElementById('goal-percent-display').textContent = `${appState.profile.goalReduction}%`;
}

// Tab navigation handler
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabTitle = document.getElementById('tab-title');
    const tabSubtitle = document.getElementById('tab-subtitle');
    
    const tabDetails = {
        dashboard: {
            title: "Dashboard",
            subtitle: "Welcome back, Eco Hero! Here is your sustainability summary."
        },
        calculator: {
            title: "Footprint Calculator",
            subtitle: "Update your lifestyle parameters to compute your baseline carbon footprint."
        },
        habits: {
            title: "Actions & Habits Logger",
            subtitle: "Commit to positive habits and log daily activities to save carbon."
        },
        insights: {
            title: "Insights & Badges",
            subtitle: "Understand your global impact and view your carbon-reduction achievements."
        }
    };
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            
            navItems.forEach(i => {
                i.classList.remove('active');
                i.setAttribute('aria-selected', 'false');
            });
            tabContents.forEach(c => c.classList.remove('active'));
            
            item.classList.add('active');
            item.setAttribute('aria-selected', 'true');
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            tabTitle.textContent = tabDetails[tab].title;
            tabSubtitle.textContent = tabDetails[tab].subtitle;
            
            playTabSound();
            
            if (tab === 'dashboard') {
                updateDashboard();
            } else if (tab === 'habits') {
                renderHistoryLog();
            } else if (tab === 'insights') {
                renderInsightsAndBadges();
            }
        });
    });
}

// Keyboard Navigation for sidebar tabs (WAI-ARIA compliance)
function setupKeyboardTabs() {
    const navMenu = document.querySelector('.nav-menu');
    const tabs = Array.from(document.querySelectorAll('.nav-item'));
    
    navMenu.addEventListener('keydown', (e) => {
        const activeIndex = tabs.findIndex(t => t.classList.contains('active'));
        let newIndex = -1;
        
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            newIndex = (activeIndex + 1) % tabs.length;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            newIndex = (activeIndex - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
            newIndex = 0;
        } else if (e.key === 'End') {
            newIndex = tabs.length - 1;
        }
        
        if (newIndex !== -1) {
            e.preventDefault();
            tabs[newIndex].focus();
            tabs[newIndex].click();
        }
    });
}

// Step-by-step calculator form handler
function setupCalculatorForm() {
    const steps = document.querySelectorAll('.calc-step');
    const indicators = document.querySelectorAll('.step-indicator');
    
    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStepId = btn.getAttribute('data-next');
            steps.forEach(s => s.classList.remove('active'));
            indicators.forEach(i => i.classList.remove('active'));
            document.getElementById(`step-${nextStepId}`).classList.add('active');
            document.querySelector(`.step-indicator[data-step="${nextStepId}"]`).classList.add('active');
            playTabSound();
        });
    });
    
    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prevStepId = btn.getAttribute('data-prev');
            steps.forEach(s => s.classList.remove('active'));
            indicators.forEach(i => i.classList.remove('active'));
            document.getElementById(`step-${prevStepId}`).classList.add('active');
            document.querySelector(`.step-indicator[data-step="${prevStepId}"]`).classList.add('active');
            playTabSound();
        });
    });
    
    const dietCards = document.querySelectorAll('.radio-card');
    dietCards.forEach(card => {
        card.addEventListener('click', () => {
            dietCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;
            playPopSound();
        });
    });
    
    document.getElementById('btn-save-calc').addEventListener('click', () => {
        appState.profile.electricityBill = parseInt(document.getElementById('electricity-bill').value);
        appState.profile.cleanEnergy = parseInt(document.getElementById('clean-energy').value);
        appState.profile.heatingFuel = document.getElementById('heating-fuel').value;
        appState.profile.commuteDistance = parseInt(document.getElementById('commute-distance').value);
        appState.profile.carType = document.getElementById('car-type').value;
        appState.profile.transitDistance = parseInt(document.getElementById('transit-distance').value);
        appState.profile.flights = parseInt(document.getElementById('flights').value);
        appState.profile.diet = document.querySelector('input[name="diet"]:checked').value;
        appState.profile.localFood = parseInt(document.getElementById('local-food').value);
        appState.profile.wasteRecycling = document.getElementById('waste-recycling').value;
        appState.profile.spending = parseInt(document.getElementById('spending').value);
        
        const firstCalculation = !appState.profile.hasCalculated;
        appState.profile.hasCalculated = true;
        
        if (firstCalculation) {
            awardXP(50);
            logAction("Initial Footprint Calculated", 0, 50);
            setTimeout(triggerConfetti, 400);
        } else {
            logAction("Updated Carbon Footprint Profile", 0, 0);
            playPopSound();
        }
        
        saveState();
        updateDashboard();
        document.querySelector('.nav-item[data-tab="dashboard"]').click();
        alert("Recalculation complete! Your profile has been updated.");
    });
}

// Setup Carbon Offset Simulator and Country Comparison Dropdowns
function setupOffsetSimulator() {
    const offsetSlider = document.getElementById('offset-slider');
    const offsetDisplay = document.getElementById('offset-percent-display');
    
    offsetSlider.addEventListener('input', () => {
        appState.offsetPercent = parseInt(offsetSlider.value);
        offsetDisplay.textContent = `${appState.offsetPercent}%`;
        renderOffsetCalculations();
        updateComparisonChart();
    });
    
    document.getElementById('country-select').addEventListener('change', (e) => {
        appState.selectedCountry = e.target.value;
        saveState();
        playTabSound();
        updateComparisonChart();
    });
}

// Calculate the final carbon footprint
function calculateFootprint() {
    const p = appState.profile;
    const annualElectricityKwh = (p.electricityBill * 12) / factors.electricityRate;
    const electricityEmissions = (annualElectricityKwh * factors.electricityCo2 * (1 - p.cleanEnergy / 100)) / 1000;
    const heatingEmissions = factors.heatingEmissions[p.heatingFuel] / 1000;
    const homeEmissions = electricityEmissions + heatingEmissions;
    const carEmissions = (p.commuteDistance * 52 * factors.carCo2[p.carType]) / 1000;
    const transitEmissions = (p.transitDistance * 52 * factors.transitCo2) / 1000;
    const flightEmissions = (p.flights * factors.flightCo2) / 1000;
    const transportEmissions = carEmissions + transitEmissions + flightEmissions;
    const dietBaseEmissions = factors.dietBase[p.diet];
    const dietOrganicDiscount = 1 - (0.15 * p.localFood) / 100;
    const dietEmissions = (dietBaseEmissions * dietOrganicDiscount) / 1000;
    const wasteEmissions = factors.wasteBase[p.wasteRecycling] / 1000;
    const spendingEmissions = (p.spending * 12 * factors.spendingCo2) / 1000;
    const wasteAndConsumption = wasteEmissions + spendingEmissions;
    const publicShare = factors.publicServices / 1000;
    const totalGross = homeEmissions + transportEmissions + dietEmissions + wasteAndConsumption + publicShare;
    let habitsSavings = 0.0;
    habitsData.forEach(habit => {
        if (appState.activeHabits.includes(habit.id)) {
            habitsSavings += habit.saving;
        }
    });
    const finalScore = Math.max(0.1, totalGross - habitsSavings);
    return {
        total: finalScore,
        gross: totalGross,
        energy: homeEmissions,
        transport: transportEmissions,
        diet: dietEmissions,
        waste: wasteAndConsumption + publicShare,
        habitsSavings: habitsSavings
    };
}

function updateGoalTracker() {
    const scores = calculateFootprint();
    const currentScore = scores.total;
    const targetScore = scores.gross * (1 - appState.profile.goalReduction / 100);
    
    document.getElementById('goal-current-val').textContent = `${currentScore.toFixed(1)} Tons`;
    document.getElementById('goal-target-val').textContent = `${targetScore.toFixed(1)} Tons`;
    
    const statusMsg = document.getElementById('goal-status-msg');
    
    if (currentScore <= targetScore) {
        statusMsg.textContent = "🎉 Goal Achieved! Outstanding sustainability efforts!";
        statusMsg.className = "goal-status-box achieved";
    } else {
        const diff = currentScore - targetScore;
        statusMsg.textContent = `Reduce footprint by ${diff.toFixed(1)} Tons to meet target`;
        statusMsg.className = "goal-status-box behind";
    }
}

// Update the dashboard values and visualizations
function updateDashboard() {
    const scores = calculateFootprint();
    document.getElementById('dashboard-co2-val').textContent = scores.total.toFixed(1);
    
    const percentage = Math.round((scores.total / 2.0) * 100);
    const comparePercentageEl = document.getElementById('user-compare-percentage');
    comparePercentageEl.textContent = `${percentage}%`;
    if (scores.total <= 2.0) {
        comparePercentageEl.style.color = 'var(--accent)';
    } else if (scores.total > 4.5) {
        comparePercentageEl.style.color = 'var(--color-danger)';
    } else {
        comparePercentageEl.style.color = 'var(--color-transport)';
    }
    
    const gaugeFill = document.getElementById('dashboard-gauge-fill');
    const scoreVal = Math.min(10, scores.total);
    const offset = 251.2 - (scoreVal / 10) * 251.2;
    gaugeFill.style.strokeDashoffset = offset;
    
    if (scores.total <= 2.0) {
        gaugeFill.style.stroke = 'var(--accent)';
    } else if (scores.total <= 4.5) {
        gaugeFill.style.stroke = 'var(--color-transport)';
    } else {
        gaugeFill.style.stroke = 'var(--color-danger)';
    }
    
    renderBreakdownChart(scores);
    updateGoalTracker();
    
    document.getElementById('header-saved-co2').textContent = `${appState.co2SavedToday.toFixed(1)} kg`;
    document.getElementById('header-active-habits').textContent = appState.activeHabits.length;
    
    generateRecommendations(scores);
    updateProfileWidget();
}

function renderBreakdownChart(scores) {
    const ctx = document.getElementById('breakdown-chart').getContext('2d');
    if (breakdownChart) { breakdownChart.destroy(); }
    breakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Home Energy', 'Transportation', 'Diet & Food', 'Waste & Goods'],
            datasets: [{
                data: [
                    parseFloat(scores.energy.toFixed(2)),
                    parseFloat(scores.transport.toFixed(2)),
                    parseFloat(scores.diet.toFixed(2)),
                    parseFloat(scores.waste.toFixed(2))
                ],
                backgroundColor: ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'],
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9CA3AF',
                        font: { family: 'Outfit', size: 11 },
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#9CA3AF',
                    bodyFont: { family: 'Outfit' },
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) { return ` ${context.label}: ${context.raw} Tons CO2e`; }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function generateRecommendations(scores) {
    const container = document.getElementById('dashboard-recommendations');
    container.innerHTML = '';
    
    const categories = [
        { name: 'energy', value: scores.energy, icon: '🏠', actions: [
            { title: 'Switch to LED Lighting', desc: 'Replace halogen bulbs with energy-efficient LEDs.', saving: 'Saves 0.25T/yr', habitId: 'ledBulbs' },
            { title: 'Lower your Thermostat', desc: 'Lower heating by 2°C or raise cooling by 2°C to reduce fossil heat.', saving: 'Saves 0.30T/yr', habitId: 'thermostat' }
        ]},
        { name: 'transport', value: scores.transport, icon: '🚗', actions: [
            { title: 'Share your Commute', desc: 'Carpooling twice a week removes significant personal tailpipe emissions.', saving: 'Saves 0.60T/yr', habitId: 'carpool' },
            { title: 'Switch to EV or Transit', desc: 'Utilizing trains or standard electric vehicles greatly minimizes travel footprint.', saving: 'Saves up to 1.50T/yr', habitId: 'transitDistance' }
        ]},
        { name: 'diet', value: scores.diet, icon: '🥗', actions: [
            { title: 'Eat Plant-Based', desc: 'Embracing Meatless Mondays or plant alternatives cuts agriculture emissions.', saving: 'Saves 0.35T/yr', habitId: 'meatlessDays' },
            { title: 'Buy Local and Organic', desc: 'Buying food with low air miles reduces supply chain logistics emissions.', saving: 'Saves up to 0.40T/yr', habitId: 'localFood' }
        ]}
    ];
    
    categories.sort((a, b) => b.value - a.value);
    
    let added = 0;
    categories.forEach(cat => {
        cat.actions.forEach(action => {
            const alreadyActive = appState.activeHabits.includes(action.habitId);
            if (!alreadyActive && added < 2) {
                const card = document.createElement('div');
                card.className = 'rec-card';
                
                const icon = document.createElement('div');
                icon.className = 'rec-icon';
                icon.textContent = cat.icon;
                
                const details = document.createElement('div');
                details.className = 'rec-details';
                
                const title = document.createElement('span');
                title.className = 'rec-title';
                title.textContent = action.title;
                
                const desc = document.createElement('span');
                desc.className = 'rec-desc';
                desc.textContent = action.desc;
                
                const saving = document.createElement('span');
                saving.className = 'rec-saving';
                saving.textContent = action.saving;
                
                details.appendChild(title);
                details.appendChild(desc);
                details.appendChild(saving);
                
                card.appendChild(icon);
                card.appendChild(details);
                container.appendChild(card);
                added++;
            }
        });
    });
    
    if (added === 0) {
        const card = document.createElement('div');
        card.className = 'rec-card';
        card.style.gridColumn = 'span 2';
        card.style.justifyContent = 'center';
        card.style.padding = '2rem';
        
        const icon = document.createElement('div');
        icon.className = 'rec-icon';
        icon.textContent = '🏆';
        
        const details = document.createElement('div');
        details.className = 'rec-details';
        details.style.alignItems = 'center';
        details.style.textAlign = 'center';
        
        const title = document.createElement('span');
        title.className = 'rec-title';
        title.textContent = 'Eco Champion Status!';
        
        const desc = document.createElement('span');
        desc.className = 'rec-desc';
        desc.textContent = 'You have activated all recommended habits! Keep maintaining your green lifestyle.';
        
        details.appendChild(title);
        details.appendChild(desc);
        
        card.appendChild(icon);
        card.appendChild(details);
        container.appendChild(card);
    }
}

function setupQuickLogger() {
    document.querySelectorAll('.quick-log-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const actionKey = btn.getAttribute('data-action');
            const action = quickActions[actionKey];
            if (action) {
                appState.co2SavedToday += action.co2;
                awardXP(action.xp);
                logAction(`Logged: ${action.name}`, action.co2, action.xp);
                const oldLevel = Math.floor((appState.xp - action.xp) / 100) + 1;
                const newLevel = Math.floor(appState.xp / 100) + 1;
                saveState();
                updateDashboard();
                if (newLevel > oldLevel) {
                    triggerConfetti();
                    alert(`🌟 LEVEL UP! You reached Level ${newLevel}!\nLogged: ${action.icon} ${action.name}!\nSaved: ${action.co2} kg CO2e.`);
                } else {
                    playPopSound();
                    alert(`Successfully logged: ${action.icon} ${action.name}!\nSaved: ${action.co2} kg CO2e | Earned: +${action.xp} XP`);
                }
            }
        });
    });
}

function renderHabitsList() {
    const list = document.getElementById('habits-toggle-list');
    list.innerHTML = '';
    habitsData.forEach(habit => {
        const item = document.createElement('div');
        item.className = 'habit-item';
        
        const isChecked = appState.activeHabits.includes(habit.id);
        const impactClass = habit.impact === 'High' ? 'impact-high' : (habit.impact === 'Medium' ? 'impact-med' : 'impact-low');
        
        const details = document.createElement('div');
        details.className = 'habit-details';
        
        const name = document.createElement('span');
        name.className = 'habit-name';
        name.textContent = `${habit.icon} ${habit.name}`;
        
        const impact = document.createElement('span');
        impact.className = 'habit-impact';
        impact.textContent = 'Impact: ';
        
        const impactSpan = document.createElement('span');
        impactSpan.className = impactClass;
        impactSpan.textContent = habit.impact;
        
        const impactText = document.createTextNode(` (Saves ${(habit.saving * 1000).toFixed(0)} kg CO2e/yr)`);
        
        impact.appendChild(impactSpan);
        impact.appendChild(impactText);
        details.appendChild(name);
        details.appendChild(impact);
        
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'habit-toggle-switch';
        toggleLabel.setAttribute('for', `chk-${habit.id}`);
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `chk-${habit.id}`;
        input.checked = isChecked;
        input.setAttribute('data-habit', habit.id);
        
        const slider = document.createElement('span');
        slider.className = 'toggle-slider';
        
        toggleLabel.appendChild(input);
        toggleLabel.appendChild(slider);
        
        item.appendChild(details);
        item.appendChild(toggleLabel);
        list.appendChild(item);
        
        input.addEventListener('change', (e) => {
            const habitId = e.target.getAttribute('data-habit');
            if (e.target.checked) {
                if (!appState.activeHabits.includes(habitId)) {
                    appState.activeHabits.push(habitId);
                    awardXP(20);
                    logAction(`Adopted Habit: ${habit.name}`, habit.saving * 1000, 20);
                    const oldLevel = Math.floor((appState.xp - 20) / 100) + 1;
                    const newLevel = Math.floor(appState.xp / 100) + 1;
                    if (newLevel > oldLevel) { triggerConfetti(); } else { playPopSound(); }
                }
            } else {
                appState.activeHabits = appState.activeHabits.filter(id => id !== habitId);
                logAction(`Removed Habit: ${habit.name}`, 0, 0);
                playPopSound();
            }
            saveState();
            updateDashboard();
        });
    });
}

function renderInsightsAndBadges() {
    const scores = calculateFootprint();
    const earths = Math.max(0.5, scores.total / 2.0);
    const earthsDisplay = document.getElementById('earth-share-value');
    earthsDisplay.textContent = earths.toFixed(1);
    const earthVisualEl = document.querySelector('.earth-visual');
    if (earths > 3.0) {
        earthsDisplay.style.color = 'var(--color-danger)';
        earthVisualEl.textContent = '🔥';
    } else if (earths <= 1.0) {
        earthsDisplay.style.color = 'var(--accent)';
        earthVisualEl.textContent = '🌿';
    } else {
        earthsDisplay.style.color = 'var(--color-transport)';
        earthVisualEl.textContent = '🌍';
    }
    const adviceContainer = document.getElementById('personalized-advice');
    adviceContainer.innerHTML = '';
    
    function addAdvice(titleText, bodyText, type = '') {
        const item = document.createElement('div');
        item.className = `advice-item ${type}`.trim();
        const title = document.createElement('div');
        title.className = 'advice-title';
        title.textContent = titleText;
        const body = document.createElement('div');
        body.className = 'advice-text';
        body.textContent = bodyText;
        item.appendChild(title);
        item.appendChild(body);
        adviceContainer.appendChild(item);
    }
    
    const maxVal = Math.max(scores.energy, scores.transport, scores.diet, scores.waste);
    if (maxVal === scores.transport && scores.transport > 1.5) {
        addAdvice('High Transit Emissions', 'Transportation represents your single largest carbon output. Swapping vehicle trips for public transit or carpooling could reduce your score by over 1.2 Tons annually.', 'warning');
    }
    if (maxVal === scores.energy && scores.energy > 1.5) {
        addAdvice('Heavy Home Energy Demand', 'Your home energy bills contribute significantly to greenhouse gases. Consider purchasing green tariffs from your utility or setting thermostats to a 2°C offset to reduce emissions.', 'warning');
    }
    if (scores.total > 2.0) {
        addAdvice('Road to Paris Accord', 'To meet standard global targets, seek to reduce emissions below 2.0 Metric Tons. Adopting green dietary options or rooftop solar are high-impact steps.', 'info');
    } else {
        addAdvice('Paris Target Aligned!', 'Fantastic job! Your footprint is under the sustainable 2.0 Tons limit. Log daily actions to continuously offset remaining public shares.');
    }
    renderOffsetCalculations();
    updateComparisonChart();
    renderBadgesList(scores);
}

function renderOffsetCalculations() {
    const scores = calculateFootprint();
    const pct = appState.offsetPercent;
    const offsetTons = scores.total * (pct / 100);
    const netFootprint = Math.max(0.0, scores.total - offsetTons);
    const offsetCost = offsetTons * 15.0;
    const treesNeeded = Math.round((offsetTons * 1000) / 22);
    document.getElementById('offset-cost-display').textContent = `$${offsetCost.toFixed(2)} / yr`;
    document.getElementById('offset-trees-display').textContent = `${treesNeeded.toLocaleString()} Trees`;
    const netFootprintEl = document.getElementById('offset-net-val');
    netFootprintEl.textContent = `${netFootprint.toFixed(1)} Tons`;
    const badgeEl = document.getElementById('offset-status-badge');
    if (netFootprint === 0) {
        netFootprintEl.style.color = 'var(--accent)';
        badgeEl.textContent = 'Net-Zero Certified';
        badgeEl.style.color = 'var(--accent)';
    } else if (netFootprint <= 2.0) {
        netFootprintEl.style.color = 'var(--accent)';
        badgeEl.textContent = 'Paris Target Aligned';
        badgeEl.style.color = 'var(--accent)';
    } else {
        netFootprintEl.style.color = 'var(--color-danger)';
        badgeEl.textContent = 'Climate Active';
        badgeEl.style.color = 'var(--text-muted)';
    }
}

function updateComparisonChart() {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    const scores = calculateFootprint();
    const offsetTons = scores.total * (appState.offsetPercent / 100);
    const netFootprint = Math.max(0.0, scores.total - offsetTons);
    const countryKey = appState.selectedCountry;
    const countryAvg = countryAverages[countryKey];
    if (comparisonChart) { comparisonChart.destroy(); }
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Your Gross Footprint', 'Your Net Footprint (Offset)', `Country Average (${countryKey})`, 'Paris 2030 Target'],
            datasets: [{
                label: 'Tons CO2e / Year',
                data: [
                    parseFloat(scores.total.toFixed(2)),
                    parseFloat(netFootprint.toFixed(2)),
                    parseFloat(countryAvg.toFixed(2)),
                    2.0
                ],
                backgroundColor: [
                    'rgba(245, 158, 11, 0.75)',
                    'rgba(16, 185, 129, 0.85)',
                    'rgba(59, 130, 246, 0.75)',
                    'rgba(239, 68, 68, 0.4)'
                ],
                borderColor: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444'],
                borderWidth: 1.5,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1e293b', bodyFont: { family: 'Outfit' } }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF', font: { family: 'Outfit' } },
                    title: { display: true, text: 'Metric Tons CO2e / Year', color: '#9CA3AF', font: { family: 'Outfit' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF', font: { family: 'Outfit', size: 10 } }
                }
            }
        }
    });
}

function renderBadgesList(scores) {
    const container = document.getElementById('badges-container');
    container.innerHTML = '';
    const offsetTons = scores.total * (appState.offsetPercent / 100);
    const netFootprint = Math.max(0.0, scores.total - offsetTons);
    const levels = {
        starter: appState.profile.hasCalculated,
        carbonCutter: appState.profile.hasCalculated && netFootprint <= 4.0,
        parisTarget: appState.profile.hasCalculated && netFootprint <= 2.0,
        actionHero: appState.xp >= 100,
        habitGreen: appState.activeHabits.length >= 3,
        habitChamp: appState.activeHabits.length >= 6,
        climateProtector: appState.xp >= 300,
        wasteMaster: appState.profile.wasteRecycling === 'all'
    };
    badgesData.forEach(badge => {
        const item = document.createElement('div');
        const isUnlocked = levels[badge.id];
        item.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
        
        const icon = document.createElement('div');
        icon.className = 'badge-icon';
        icon.textContent = isUnlocked ? badge.icon : '🔒';
        
        const name = document.createElement('span');
        name.className = 'badge-name';
        name.textContent = badge.name;
        
        const desc = document.createElement('span');
        desc.className = 'badge-desc';
        desc.textContent = badge.desc;
        
        item.appendChild(icon);
        item.appendChild(name);
        item.appendChild(desc);
        container.appendChild(item);
    });
}

function renderHistoryLog() {
    const tbody = document.getElementById('history-log-body');
    tbody.innerHTML = '';
    if (appState.history.length === 0) {
        const row = document.createElement('tr');
        row.className = 'empty-row';
        const td = document.createElement('td');
        td.colSpan = 4;
        td.textContent = 'No actions logged today yet. Log an action to begin!';
        row.appendChild(td);
        tbody.appendChild(row);
        return;
    }
    const reversedHistory = [...appState.history].reverse().slice(0, 10);
    reversedHistory.forEach(log => {
        const row = document.createElement('tr');
        const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const co2SavedStr = log.co2Saved > 0 ? `${log.co2Saved.toFixed(1)} kg` : '-';
        const xpStr = log.xpEarned > 0 ? `+${log.xpEarned} XP` : '-';
        
        const tdDate = document.createElement('td');
        tdDate.textContent = dateStr;
        const tdAction = document.createElement('td');
        tdAction.textContent = log.action;
        const tdCo2 = document.createElement('td');
        tdCo2.className = 'history-co2-saved';
        tdCo2.textContent = co2SavedStr;
        const tdXp = document.createElement('td');
        tdXp.className = 'history-xp';
        tdXp.textContent = xpStr;
        
        row.appendChild(tdDate);
        row.appendChild(tdAction);
        row.appendChild(tdCo2);
        row.appendChild(tdXp);
        tbody.appendChild(row);
    });
}

function logAction(action, co2Saved, xpEarned) {
    appState.history.push({
        timestamp: new Date().toISOString(),
        action: action,
        co2Saved: co2Saved,
        xpEarned: xpEarned
    });
}

function awardXP(amount) {
    appState.xp += amount;
    updateProfileWidget();
}

function updateProfileWidget() {
    const currentLevel = Math.floor(appState.xp / 100) + 1;
    const currentXpInLevel = appState.xp % 100;
    document.getElementById('profile-level').textContent = `Level ${currentLevel}`;
    document.getElementById('profile-xp').textContent = currentXpInLevel;
    document.getElementById('profile-xp-bar').style.width = `${currentXpInLevel}%`;
}
})();
