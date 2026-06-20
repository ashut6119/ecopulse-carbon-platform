import test from 'node:test';
import assert from 'node:assert';

// Carbon Conversion Factors duplicate (matching factors inside app.js)
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

// Recreate the pure math calculation function for testing
function runTestCalculation(profile, activeHabits = []) {
  // 1. Energy
  const annualElectricityKwh = (profile.electricityBill * 12) / factors.electricityRate;
  const electricityEmissions = (annualElectricityKwh * factors.electricityCo2 * (1 - profile.cleanEnergy / 100)) / 1000;
  const heatingEmissions = factors.heatingEmissions[profile.heatingFuel] / 1000;
  const homeEmissions = electricityEmissions + heatingEmissions;
  
  // 2. Transport
  const carEmissions = (profile.commuteDistance * 52 * factors.carCo2[profile.carType]) / 1000;
  const transitEmissions = (profile.transitDistance * 52 * factors.transitCo2) / 1000;
  const flightEmissions = (profile.flights * factors.flightCo2) / 1000;
  const transportEmissions = carEmissions + transitEmissions + flightEmissions;
  
  // 3. Diet
  const dietBaseEmissions = factors.dietBase[profile.diet];
  const dietOrganicDiscount = 1 - (0.15 * profile.localFood) / 100;
  const dietEmissions = (dietBaseEmissions * dietOrganicDiscount) / 1000;
  
  // 4. Waste & Consumption
  const wasteEmissions = factors.wasteBase[profile.wasteRecycling] / 1000;
  const spendingEmissions = (profile.spending * 12 * factors.spendingCo2) / 1000;
  const wasteAndConsumption = wasteEmissions + spendingEmissions;
  
  const publicShare = factors.publicServices / 1000;
  
  const totalGross = homeEmissions + transportEmissions + dietEmissions + wasteAndConsumption + publicShare;
  
  // Habits discount
  let habitsSavings = 0.0;
  const habitsSavingsMap = {
    ledBulbs: 0.25,
    compost: 0.15,
    lineDry: 0.20,
    meatlessDays: 0.35,
    thermostat: 0.30,
    noPlastic: 0.10,
    carpool: 0.60,
    solarPanels: 1.50
  };
  
  activeHabits.forEach(h => {
    if (habitsSavingsMap[h]) {
      habitsSavings += habitsSavingsMap[h];
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

test('EcoPulse Carbon Calculator Math Tests', async (t) => {
  await t.test('calculates correct home energy emissions', () => {
    const profile = {
      electricityBill: 80,
      cleanEnergy: 20,
      heatingFuel: 'gas',
      commuteDistance: 0,
      carType: 'none',
      transitDistance: 0,
      flights: 0,
      diet: 'vegan',
      localFood: 0,
      wasteRecycling: 'all',
      spending: 0
    };
    const res = runTestCalculation(profile);
    assert.deepStrictEqual(parseFloat(res.energy.toFixed(4)), 3.7712);
  });

  await t.test('calculates transport emissions correctly', () => {
    const profile = {
      electricityBill: 0,
      cleanEnergy: 0,
      heatingFuel: 'none',
      commuteDistance: 100,
      carType: 'gasoline',
      transitDistance: 50,
      flights: 5,
      diet: 'vegan',
      localFood: 0,
      wasteRecycling: 'all',
      spending: 0
    };
    const res = runTestCalculation(profile);
    assert.deepStrictEqual(parseFloat(res.transport.toFixed(4)), 1.4900);
  });

  await t.test('applies organic diet discounts correctly', () => {
    const profile = {
      electricityBill: 0,
      cleanEnergy: 0,
      heatingFuel: 'none',
      commuteDistance: 0,
      carType: 'none',
      transitDistance: 0,
      flights: 0,
      diet: 'vegan',
      localFood: 40,
      wasteRecycling: 'all',
      spending: 0
    };
    const res = runTestCalculation(profile);
    assert.deepStrictEqual(parseFloat(res.diet.toFixed(4)), 1.0340);
  });

  await t.test('applies active habits offsets correctly', () => {
    const profile = {
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
      spending: 200
    };
    
    const grossRes = runTestCalculation(profile, []);
    const netRes = runTestCalculation(profile, ['ledBulbs', 'compost', 'carpool']);
    assert.deepStrictEqual(parseFloat((grossRes.total - netRes.total).toFixed(4)), 1.0000);
  });
});
