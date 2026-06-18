// State Management
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
        hasCalculated: false
    },
    history: []
};

// Carbon Conversion Factors (all values converted to Metric Tons / year where applicable)
const factors = {
    electricityRate: 0.15, // $ per kWh
    electricityCo2: 0.385, // kg CO2e per kWh
    heatingEmissions: {
        electricity: 600, // kg CO2e/year
        gas: 1800,
        oil: 2600,
        lpg: 2000,
        none: 0
    },
    carCo2: {
        gasoline: 0.170, // kg CO2e/km
        diesel: 0.171,
        hybrid: 0.101,
        electric: 0.047,
        none: 0
    },
    transitCo2: 0.06, // kg CO2e/km
    flightCo2: 90,    // kg CO2e/hour
    dietBase: {
        heavyMeat: 2900,  // kg CO2e/year
        mediumMeat: 2200,
        lowMeat: 1700,
        vegetarian: 1400,
        vegan: 1100
    },
    wasteBase: {
        none: 500, // kg CO2e/year
        some: 250,
        all: 80
    },
    spendingCo2: 0.12, // kg CO2e per dollar spent
    publicServices: 500 // kg CO2e/year baseline public infrastructure share
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

// Initial Load & Event Binding
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initUI();
    setupTabNavigation();
    setupSliders();
    setupCalculatorForm();
    setupQuickLogger();
    renderHabitsList();
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
}

function updateSliderLabelDisplays() {
    document.getElementById('electricity-bill-display').textContent = `$${appState.profile.electricityBill}`;
    document.getElementById('clean-energy-display').textContent = `${appState.profile.cleanEnergy}%`;
    document.getElementById('commute-distance-display').textContent = `${appState.profile.commuteDistance} km`;
    document.getElementById('transit-distance-display').textContent = `${appState.profile.transitDistance} km`;
    document.getElementById('flights-display').textContent = `${appState.profile.flights} hours`;
    document.getElementById('local-food-display').textContent = `${appState.profile.localFood}%`;
    document.getElementById('spending-display').textContent = `$${appState.profile.spending}`;
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
            
            navItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            tabTitle.textContent = tabDetails[tab].title;
            tabSubtitle.textContent = tabDetails[tab].subtitle;
            
            // Re-render subelements if changing tabs
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

// Step-by-step calculator form handler
function setupCalculatorForm() {
    const steps = document.querySelectorAll('.calc-step');
    const indicators = document.querySelectorAll('.step-indicator');
    
    // Multi-step Next buttons
    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStepId = btn.getAttribute('data-next');
            
            steps.forEach(s => s.classList.remove('active'));
            indicators.forEach(i => i.classList.remove('active'));
            
            document.getElementById(`step-${nextStepId}`).classList.add('active');
            document.querySelector(`.step-indicator[data-step="${nextStepId}"]`).classList.add('active');
        });
    });
    
    // Back buttons
    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prevStepId = btn.getAttribute('data-prev');
            
            steps.forEach(s => s.classList.remove('active'));
            indicators.forEach(i => i.classList.remove('active'));
            
            document.getElementById(`step-${prevStepId}`).classList.add('active');
            document.querySelector(`.step-indicator[data-step="${prevStepId}"]`).classList.add('active');
        });
    });
    
    // Diet option radio button card visual styling
    const dietCards = document.querySelectorAll('.radio-card');
    dietCards.forEach(card => {
        card.addEventListener('click', () => {
            dietCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;
        });
    });
    
    // Save Calculation Button
    document.getElementById('btn-save-calc').addEventListener('click', () => {
        // Collect all inputs
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
        appState.profile.hasCalculated = true;
        
        // Add completion XP if first calculation
        const firstTime = !appState.history.some(h => h.action.includes('Calculation'));
        if (firstTime) {
            awardXP(50);
            logAction("Initial Footprint Calculated", 0, 50);
        } else {
            logAction("Updated Carbon Footprint Profile", 0, 0);
        }
        
        saveState();
        updateDashboard();
        
        // Switch tab to Dashboard
        document.querySelector('.nav-item[data-tab="dashboard"]').click();
        
        // Alert user
        alert("Your carbon footprint profile has been recalculated and saved successfully!");
    });
}

// Calculate the final carbon footprint
function calculateFootprint() {
    const p = appState.profile;
    
    // 1. Home Energy (Tons CO2e/year)
    // Avg Electricity usage: monthly bill / rate. (e.g. $80 bill / $0.15/kWh = 533 kWh/month * 12 = 6400 kWh/year)
    const annualElectricityKwh = (p.electricityBill * 12) / factors.electricityRate;
    const electricityEmissions = (annualElectricityKwh * factors.electricityCo2 * (1 - p.cleanEnergy / 100)) / 1000;
    
    const heatingEmissions = factors.heatingEmissions[p.heatingFuel] / 1000;
    const homeEmissions = electricityEmissions + heatingEmissions;
    
    // 2. Transport (Tons CO2e/year)
    const carEmissions = (p.commuteDistance * 52 * factors.carCo2[p.carType]) / 1000;
    const transitEmissions = (p.transitDistance * 52 * factors.transitCo2) / 1000;
    const flightEmissions = (p.flights * factors.flightCo2) / 1000;
    const transportEmissions = carEmissions + transitEmissions + flightEmissions;
    
    // 3. Diet (Tons CO2e/year)
    // Diet baseline multiplier reduces based on local/organic share (up to 15% discount)
    const dietBaseEmissions = factors.dietBase[p.diet];
    const dietOrganicDiscount = 1 - (0.15 * p.localFood) / 100;
    const dietEmissions = (dietBaseEmissions * dietOrganicDiscount) / 1000;
    
    // 4. Waste & Consumption (Tons CO2e/year)
    const wasteEmissions = factors.wasteBase[p.wasteRecycling] / 1000;
    const spendingEmissions = (p.spending * 12 * factors.spendingCo2) / 1000;
    const wasteAndConsumption = wasteEmissions + spendingEmissions;
    
    // Baseline Infrastructural Emissions (constant share)
    const publicShare = factors.publicServices / 1000;
    
    // Total gross emissions
    const totalGross = homeEmissions + transportEmissions + dietEmissions + wasteAndConsumption + publicShare;
    
    // Habits offset calculations
    let habitsSavings = 0.0;
    habitsData.forEach(habit => {
        if (appState.activeHabits.includes(habit.id)) {
            // Apply habit discount directly to emissions (High/Med/Low savings in tons)
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
        waste: wasteAndConsumption,
        publicShare: publicShare,
        habitsSavings: habitsSavings
    };
}

// Update the dashboard values and visualizations
function updateDashboard() {
    const scores = calculateFootprint();
    
    // 1. Text elements
    document.getElementById('dashboard-co2-val').textContent = scores.total.toFixed(1);
    
    // Compare against Paris 2030 target of 2.0 Tons
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
    
    // 2. Radial Gauge Animation
    const gaugeFill = document.getElementById('dashboard-gauge-fill');
    // Radial gauge circumference is 2 * pi * 40 = 251.2
    // Scale 0 to 10 Tons CO2e
    const scoreVal = Math.min(10, scores.total);
    const offset = 251.2 - (scoreVal / 10) * 251.2;
    gaugeFill.style.strokeDashoffset = offset;
    
    // Dynamic color for gauge
    if (scores.total <= 2.0) {
        gaugeFill.style.stroke = 'var(--accent)'; // Emerald
    } else if (scores.total <= 4.5) {
        gaugeFill.style.stroke = 'var(--color-transport)'; // Amber
    } else {
        gaugeFill.style.stroke = 'var(--color-danger)'; // Red
    }
    
    // 3. Category Progress Bars
    const maxVal = Math.max(scores.energy, scores.transport, scores.diet, scores.waste, 0.5);
    
    document.getElementById('breakdown-energy-val').textContent = `${scores.energy.toFixed(1)} Tons`;
    document.getElementById('breakdown-energy-bar').style.width = `${(scores.energy / maxVal) * 100}%`;
    
    document.getElementById('breakdown-transport-val').textContent = `${scores.transport.toFixed(1)} Tons`;
    document.getElementById('breakdown-transport-bar').style.width = `${(scores.transport / maxVal) * 100}%`;
    
    document.getElementById('breakdown-diet-val').textContent = `${scores.diet.toFixed(1)} Tons`;
    document.getElementById('breakdown-diet-bar').style.width = `${(scores.diet / maxVal) * 100}%`;
    
    document.getElementById('breakdown-waste-val').textContent = `${(scores.waste + scores.publicShare).toFixed(1)} Tons`;
    document.getElementById('breakdown-waste-bar').style.width = `${((scores.waste + scores.publicShare) / maxVal) * 100}%`;
    
    // 4. Update Header indicators
    document.getElementById('header-saved-co2').textContent = `${appState.co2SavedToday.toFixed(1)} kg`;
    document.getElementById('header-active-habits').textContent = appState.activeHabits.length;
    
    // 5. Generate tailored recommendations
    generateRecommendations(scores);
    updateProfileWidget();
}

// Generates recommended actions dynamically based on highest emission categories
function generateRecommendations(scores) {
    const container = document.getElementById('dashboard-recommendations');
    container.innerHTML = '';
    
    // Determine highest source
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
    
    // Sort descending
    categories.sort((a, b) => b.value - a.value);
    
    // Grab recommendations
    let added = 0;
    categories.forEach(cat => {
        cat.actions.forEach(action => {
            // Check if habit is already enabled
            const alreadyActive = appState.activeHabits.includes(action.habitId);
            if (!alreadyActive && added < 2) {
                const card = document.createElement('div');
                card.className = 'rec-card';
                card.innerHTML = `
                    <div class="rec-icon">${cat.icon}</div>
                    <div class="rec-details">
                        <span class="rec-title">${action.title}</span>
                        <span class="rec-desc">${action.desc}</span>
                        <span class="rec-saving">${action.saving}</span>
                    </div>
                `;
                container.appendChild(card);
                added++;
            }
        });
    });
    
    if (added === 0) {
        container.innerHTML = `
            <div class="rec-card" style="grid-column: span 2; justify-content: center; padding: 2rem;">
                <div class="rec-icon">🏆</div>
                <div class="rec-details" style="align-items: center; text-align: center;">
                    <span class="rec-title">Eco Champion Status!</span>
                    <span class="rec-desc">You have activated all recommended habits! Keep maintaining your green lifestyle.</span>
                </div>
            </div>
        `;
    }
}

// Setup Quick Logger panel clicks
function setupQuickLogger() {
    document.querySelectorAll('.quick-log-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const actionKey = btn.getAttribute('data-action');
            const action = quickActions[actionKey];
            
            if (action) {
                appState.co2SavedToday += action.co2;
                awardXP(action.xp);
                logAction(`Logged: ${action.name}`, action.co2, action.xp);
                
                saveState();
                updateDashboard();
                
                // Show floating success badge or simple alert
                alert(`Successfully logged: ${action.icon} ${action.name}!\nSaved: ${action.co2} kg CO2e | Earned: +${action.xp} XP`);
            }
        });
    });
}

// Render dynamic habits toggles list
function renderHabitsList() {
    const list = document.getElementById('habits-toggle-list');
    list.innerHTML = '';
    
    habitsData.forEach(habit => {
        const item = document.createElement('div');
        item.className = 'habit-item';
        
        const isChecked = appState.activeHabits.includes(habit.id) ? 'checked' : '';
        const impactClass = habit.impact === 'High' ? 'impact-high' : (habit.impact === 'Medium' ? 'impact-med' : 'impact-low');
        
        item.innerHTML = `
            <div class="habit-details">
                <span class="habit-name">${habit.icon} ${habit.name}</span>
                <span class="habit-impact">Impact: <span class="${impactClass}">${habit.impact}</span> (Saves ${(habit.saving * 1000).toFixed(0)} kg CO2e/yr)</span>
            </div>
            <label class="habit-toggle-switch">
                <input type="checkbox" id="chk-${habit.id}" ${isChecked} data-habit="${habit.id}">
                <span class="toggle-slider"></span>
            </label>
        `;
        
        list.appendChild(item);
        
        // Toggle handler
        document.getElementById(`chk-${habit.id}`).addEventListener('change', (e) => {
            const habitId = e.target.getAttribute('data-habit');
            if (e.target.checked) {
                if (!appState.activeHabits.includes(habitId)) {
                    appState.activeHabits.push(habitId);
                    awardXP(20);
                    logAction(`Adopted Habit: ${habit.name}`, habit.saving * 1000, 20);
                }
            } else {
                appState.activeHabits = appState.activeHabits.filter(id => id !== habitId);
                logAction(`Removed Habit: ${habit.name}`, 0, 0);
            }
            saveState();
            updateDashboard();
        });
    });
}

// Render insights and badges page elements
function renderInsightsAndBadges() {
    const scores = calculateFootprint();
    
    // 1. Earth Simulator
    // Standard sustainable biocapacity threshold = 2.0 Tons per human
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
    
    // 2. Personalized text advice
    const adviceContainer = document.getElementById('personalized-advice');
    adviceContainer.innerHTML = '';
    
    const maxVal = Math.max(scores.energy, scores.transport, scores.diet, scores.waste);
    
    if (maxVal === scores.transport && scores.transport > 1.5) {
        adviceContainer.innerHTML += `
            <div class="advice-item warning">
                <div class="advice-title">High Transit Emissions</div>
                <div class="advice-text">Transportation represents your single largest carbon output. Swapping vehicle trips for public transit or carpooling could reduce your score by over 1.2 Tons annually.</div>
            </div>
        `;
    }
    
    if (maxVal === scores.energy && scores.energy > 1.5) {
        adviceContainer.innerHTML += `
            <div class="advice-item warning">
                <div class="advice-title">Heavy Home Energy Demand</div>
                <div class="advice-text">Your home energy bills contribute significantly to greenhouse gases. Consider purchasing green tariffs from your utility or setting thermostats to a 2°C offset to reduce emissions.</div>
            </div>
        `;
    }
    
    if (scores.total > 2.0) {
        adviceContainer.innerHTML += `
            <div class="advice-item info">
                <div class="advice-title">Road to Paris Accord</div>
                <div class="advice-text">To meet standard global targets, seek to reduce emissions below 2.0 Metric Tons. Adopting green dietary options or rooftop solar are high-impact steps.</div>
            </div>
        `;
    } else {
        adviceContainer.innerHTML += `
            <div class="advice-item">
                <div class="advice-title">Paris Target Aligned!</div>
                <div class="advice-text">Fantastic job! Your footprint is under the sustainable 2.0 Tons limit. Log daily actions to continuously offset remaining public shares.</div>
            </div>
        `;
    }
    
    if (appState.activeHabits.length < 3) {
        adviceContainer.innerHTML += `
            <div class="advice-item info">
                <div class="advice-title">Habit Building</div>
                <div class="advice-text">Habits provide a static reduction in your baseline calculation. Enable at least 3 habits in the Habits tab to automatically slice off a Ton of CO2.</div>
            </div>
        `;
    }
    
    // 3. Badges grid rendering
    renderBadgesList(scores);
}

// Render Badges grid and evaluate logic
function renderBadgesList(scores) {
    const container = document.getElementById('badges-container');
    container.innerHTML = '';
    
    const levels = {
        starter: appState.profile.hasCalculated,
        carbonCutter: appState.profile.hasCalculated && scores.total <= 4.0,
        parisTarget: appState.profile.hasCalculated && scores.total <= 2.0,
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
        
        item.innerHTML = `
            <div class="badge-icon">${isUnlocked ? badge.icon : '🔒'}</div>
            <span class="badge-name">${badge.name}</span>
            <span class="badge-desc">${badge.desc}</span>
        `;
        
        container.appendChild(item);
    });
}

// Render daily logs table
function renderHistoryLog() {
    const tbody = document.getElementById('history-log-body');
    tbody.innerHTML = '';
    
    if (appState.history.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No actions logged today yet. Log an action to begin!</td></tr>`;
        return;
    }
    
    // Render logs (most recent first)
    const reversedHistory = [...appState.history].reverse().slice(0, 10);
    reversedHistory.forEach(log => {
        const row = document.createElement('tr');
        
        const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const co2SavedStr = log.co2Saved > 0 ? `${log.co2Saved.toFixed(1)} kg` : '-';
        const xpStr = log.xpEarned > 0 ? `+${log.xpEarned} XP` : '-';
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${log.action}</td>
            <td class="history-co2-saved">${co2SavedStr}</td>
            <td class="history-xp">${xpStr}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Helper to log user action
function logAction(action, co2Saved, xpEarned) {
    appState.history.push({
        timestamp: new Date().toISOString(),
        action: action,
        co2Saved: co2Saved,
        xpEarned: xpEarned
    });
}

// Award XP and calculate Level
function awardXP(amount) {
    appState.xp += amount;
    updateProfileWidget();
}

// Update Level display and Level progress bars
function updateProfileWidget() {
    const currentLevel = Math.floor(appState.xp / 100) + 1;
    const currentXpInLevel = appState.xp % 100;
    
    document.getElementById('profile-level').textContent = `Level ${currentLevel}`;
    document.getElementById('profile-xp').textContent = currentXpInLevel;
    document.getElementById('profile-xp-bar').style.width = `${currentXpInLevel}%`;
}
