const currentYear = new Date().getFullYear()

const yearMidpoints = {
  'Pre-1985': 1978,
  '1985-1992': 1988,
  '1993-2000': 1996,
  '2001-2010': 2005,
  '2011-2017': 2014,
  '2018-present': 2021,
}

const estimatedSqm = {
  House: { 1: 70, 2: 100, 3: 140, 4: 190, 5: 240, 6: 300 },
  'Unit/Apartment': { 1: 55, 2: 75, 3: 100, 4: 130, 5: 150, 6: 170 },
  Townhouse: { 1: 65, 2: 90, 3: 120, 4: 160, 5: 200, 6: 230 },
  Villa: { 1: 60, 2: 85, 3: 115, 4: 150, 5: 180, 6: 210 },
  Duplex: { 1: 65, 2: 90, 3: 120, 4: 160, 5: 200, 6: 230 },
  Commercial: { 1: 80, 2: 120, 3: 180, 4: 250, 5: 350, 6: 500 },
}

const constructionCostPerSqm = {
  House: { basic: 1400, standard: 1900, premium: 2600, luxury: 3500 },
  'Unit/Apartment': { basic: 1800, standard: 2400, premium: 3200, luxury: 4200 },
  Townhouse: { basic: 1500, standard: 2100, premium: 2800, luxury: 3800 },
  Villa: { basic: 1400, standard: 1900, premium: 2600, luxury: 3500 },
  Duplex: { basic: 1500, standard: 2100, premium: 2800, luxury: 3800 },
  Commercial: { basic: 1200, standard: 1800, premium: 2500, luxury: 3500 },
}

const plantEquipmentBase = {
  new: { basic: 15000, standard: 25000, premium: 40000, luxury: 65000 },
  recent: { basic: 10000, standard: 18000, premium: 30000, luxury: 50000 },
  mid: { basic: 5000, standard: 10000, premium: 18000, luxury: 30000 },
  old: { basic: 2000, standard: 5000, premium: 10000, luxury: 18000 },
}

const additionalPlant = {
  pool: 15000,
  solar: 8000,
  alarm: 3000,
  garageDoor: 1500,
  builtInWardrobes: 3000,
  dishwasher: 1200,
  blindsCurtains: 2500,
  aircon_split: 3000,
  aircon_ducted: 12000,
}

const qualityMap = { Basic: 1, Standard: 2, Premium: 3, Luxury: 4 }

function getQualityTier(kitchenQuality, bathroomQuality) {
  const avg = (qualityMap[kitchenQuality] + qualityMap[bathroomQuality]) / 2
  if (avg <= 1.5) return 'basic'
  if (avg <= 2.5) return 'standard'
  if (avg <= 3.5) return 'premium'
  return 'luxury'
}

function getAgeCategory(age) {
  if (age <= 5) return 'new'
  if (age <= 10) return 'recent'
  if (age <= 20) return 'mid'
  return 'old'
}

export function calculateEstimate(property) {
  const yearBuilt = yearMidpoints[property.year_built] || 2000
  const propertyAge = currentYear - yearBuilt
  const qualityTier = getQualityTier(
    property.kitchen_quality || 'Standard',
    property.bathroom_quality || 'Standard'
  )
  const ageCategory = getAgeCategory(propertyAge)
  const bedrooms = Math.min(property.bedrooms || 3, 6)

  // Floor area
  const sqmLookup = estimatedSqm[property.property_type] || estimatedSqm.House
  const sqm = property.floor_area_sqm || sqmLookup[bedrooms] || 140
  const sqmSource = property.floor_area_sqm ? 'provided' : 'estimated'

  // Division 43 — Capital Works
  const costPerSqm =
    (constructionCostPerSqm[property.property_type] || constructionCostPerSqm.House)[qualityTier]
  const constructionCost = sqm * costPerSqm

  let div43Rate = 0
  let div43Annual = 0
  let remainingDiv43Years = 0

  if (yearBuilt >= 1987) {
    div43Rate = 0.025
    remainingDiv43Years = 40 - propertyAge
    if (remainingDiv43Years > 0) {
      div43Annual = Math.round(constructionCost * div43Rate)
    }
  } else if (yearBuilt >= 1985) {
    div43Rate = 0.04
    remainingDiv43Years = 25 - propertyAge
    if (remainingDiv43Years > 0) {
      div43Annual = Math.round(constructionCost * div43Rate)
    }
  }
  // Pre-1985: $0

  if (remainingDiv43Years < 0) {
    remainingDiv43Years = 0
    div43Annual = 0
  }

  // Division 40 — Plant & Equipment
  let plantTotal =
    (plantEquipmentBase[ageCategory] || plantEquipmentBase.old)[qualityTier]

  // Additional items
  if (property.has_pool) plantTotal += additionalPlant.pool
  if (property.has_solar) plantTotal += additionalPlant.solar
  if (property.has_alarm) plantTotal += additionalPlant.alarm
  if (property.has_garage_door) plantTotal += additionalPlant.garageDoor
  if (property.has_built_in_wardrobes) plantTotal += additionalPlant.builtInWardrobes
  if (property.has_dishwasher) plantTotal += additionalPlant.dishwasher
  if (property.has_blinds) plantTotal += additionalPlant.blindsCurtains

  if (property.air_conditioning === 'Split system') {
    plantTotal += additionalPlant.aircon_split
  } else if (property.air_conditioning === 'Ducted') {
    plantTotal += additionalPlant.aircon_ducted
  }

  // Renovation additions
  let renoDiv43Addition = 0
  let renoDiv40Addition = 0
  if (
    property.renovated === 'Yes minor cosmetic' ||
    property.renovated === 'Yes major renovation'
  ) {
    const renoCost = property.renovation_cost || (property.renovated === 'Yes major renovation' ? 50000 : 15000)
    const renoYear = property.renovation_year ? parseInt(property.renovation_year) : currentYear - 3
    const renoAge = currentYear - renoYear

    // 60% capital works, 40% plant & equipment
    if (renoAge < 40) {
      renoDiv43Addition = Math.round(renoCost * 0.6 * 0.025)
    }
    renoDiv40Addition = Math.round(renoCost * 0.4)
    plantTotal += renoDiv40Addition
  }

  div43Annual += renoDiv43Addition

  // First-year Div 40 claim ≈ 25% of remaining P&E pool (diminishing value)
  const div40FirstYear = Math.round(plantTotal * 0.25)

  const totalFirstYear = div43Annual + div40FirstYear

  // 5-year and 10-year projections
  // Div 43 is straight-line, Div 40 diminishes
  let total5Year = 0
  let total10Year = 0
  let remainingPool = plantTotal

  for (let year = 1; year <= 10; year++) {
    const yearDiv43 = year <= remainingDiv43Years ? div43Annual : 0
    const yearDiv40 = Math.round(remainingPool * 0.25)
    remainingPool -= yearDiv40

    const yearTotal = yearDiv43 + yearDiv40
    if (year <= 5) total5Year += yearTotal
    total10Year += yearTotal
  }

  // Extract suburb from address
  const suburb = extractSuburb(property.property_address, property.property_state)

  return {
    division43_annual: div43Annual,
    division40_firstYear: div40FirstYear,
    total_firstYear: totalFirstYear,
    total_5year: total5Year,
    total_10year: total10Year,
    construction_cost_estimate: Math.round(constructionCost),
    plant_equipment_total: plantTotal,
    remaining_div43_years: remainingDiv43Years,
    property_age_years: propertyAge,
    quality_tier: qualityTier,
    rate_applied: div43Rate,
    sqm_used: sqm,
    sqm_source: sqmSource,
    notes: `Estimate based on ${qualityTier} quality ${property.bedrooms || 3}-bed ${property.property_type?.toLowerCase() || 'house'} built ~${yearBuilt}, ${sqm}sqm ${sqmSource} floor area, ${suburb} ${property.property_state}.`,
  }
}

function extractSuburb(address, state) {
  if (!address) return ''
  // Try to extract suburb — simple heuristic: last part before state/postcode
  const parts = address.split(',').map((s) => s.trim())
  if (parts.length >= 2) return parts[parts.length - 1]
  return parts[0]
}
