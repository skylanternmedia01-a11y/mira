import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calculateEstimate } from '../lib/estimateEngine'

const STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const PROPERTY_TYPES = ['House', 'Unit/Apartment', 'Townhouse', 'Villa', 'Duplex', 'Commercial']
const YEAR_RANGES = ['Pre-1985', '1985-1992', '1993-2000', '2001-2010', '2011-2017', '2018-present']
const CONSTRUCTION_TYPES = [
  'Brick veneer',
  'Double brick',
  'Timber frame',
  'Concrete/rendered',
  'Steel frame',
  "Don't know",
]
const RENOVATION_OPTIONS = [
  'No',
  'Yes minor cosmetic',
  'Yes major renovation',
  "Don't know",
]
const QUALITY_OPTIONS = [
  { value: 'Basic', desc: 'Builder-grade, older fittings' },
  { value: 'Standard', desc: 'Mid-range, functional finishes' },
  { value: 'Premium', desc: 'Stone benchtops, quality fixtures' },
  { value: 'Luxury', desc: 'High-end designer finishes' },
]
const FLOORING_OPTIONS = ['Carpet', 'Timber/Laminate', 'Tiles', 'Mixed', "Don't know"]
const AIRCON_OPTIONS = ['None', 'Split system', 'Ducted', "Don't know"]

const INITIAL_FORM = {
  // Step 1
  property_address: '',
  property_state: '',
  property_type: '',
  bedrooms: '',
  bathrooms: '',
  floor_area_sqm: '',
  is_rented: '',
  // Step 2
  year_built: '',
  construction_type: '',
  renovated: '',
  renovation_year: '',
  renovation_cost: '',
  // Step 3
  kitchen_quality: '',
  bathroom_quality: '',
  flooring_type: '',
  air_conditioning: '',
  has_pool: false,
  has_solar: false,
  has_alarm: false,
  has_garage_door: false,
  has_built_in_wardrobes: false,
  has_dishwasher: false,
  has_blinds: false,
  // Step 4
  investor_name: '',
  investor_email: '',
  investor_phone: '',
  referral_code: '',
  agree_terms: false,
  agree_marketing: false,
}

const TOTAL_STEPS = 4

function ProgressBar({ step }) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex justify-between mb-2 text-sm font-medium">
        {['Property', 'Construction', 'Features', 'Your details'].map((label, i) => (
          <span
            key={label}
            className={i + 1 <= step ? 'text-teal' : 'text-gray-400'}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-teal h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  )
}

function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-navy mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Input({ id, type = 'text', value, onChange, placeholder, required, helper }) {
  return (
    <div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal"
      />
      {helper && <p className="mt-1 text-xs text-gray-400">{helper}</p>}
    </div>
  )
}

function Select({ id, value, onChange, options, placeholder, required }) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal bg-white"
    >
      <option value="">{placeholder || 'Select...'}</option>
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        return (
          <option key={val} value={val}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

function Checkbox({ id, checked, onChange, children }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-teal w-4 h-4"
      />
      <span className="text-sm text-gray-600">{children}</span>
    </label>
  )
}

export default function EstimateForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: val }))
    setError('')
  }

  function validateStep() {
    switch (step) {
      case 1:
        if (!form.property_address || !form.property_state || !form.property_type || !form.bedrooms || !form.bathrooms || !form.is_rented) {
          setError('Please fill in all required fields.')
          return false
        }
        break
      case 2:
        if (!form.year_built || !form.construction_type || !form.renovated) {
          setError('Please fill in all required fields.')
          return false
        }
        if ((form.renovated === 'Yes minor cosmetic' || form.renovated === 'Yes major renovation') && !form.renovation_year) {
          setError('Please enter the approximate renovation year.')
          return false
        }
        break
      case 3:
        if (!form.kitchen_quality || !form.bathroom_quality || !form.flooring_type || !form.air_conditioning) {
          setError('Please fill in all required fields.')
          return false
        }
        break
      case 4:
        if (!form.investor_name || !form.investor_email || !form.investor_phone) {
          setError('Please fill in all required fields.')
          return false
        }
        if (!form.agree_terms) {
          setError('You must agree to the terms to continue.')
          return false
        }
        break
    }
    return true
  }

  function handleNext() {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1))
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateStep()) return

    setLoading(true)
    setError('')

    try {
      const propertyData = {
        property_address: form.property_address,
        property_state: form.property_state,
        property_type: form.property_type,
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
        floor_area_sqm: form.floor_area_sqm ? parseInt(form.floor_area_sqm) : null,
        is_rented: form.is_rented === 'Yes',
        year_built: form.year_built,
        construction_type: form.construction_type,
        renovated: form.renovated,
        renovation_year: form.renovation_year || null,
        renovation_cost: form.renovation_cost ? parseInt(form.renovation_cost) : null,
        kitchen_quality: form.kitchen_quality,
        bathroom_quality: form.bathroom_quality,
        flooring_type: form.flooring_type,
        air_conditioning: form.air_conditioning,
        has_pool: form.has_pool,
        has_solar: form.has_solar,
        has_alarm: form.has_alarm,
        has_garage_door: form.has_garage_door,
        has_built_in_wardrobes: form.has_built_in_wardrobes,
        has_dishwasher: form.has_dishwasher,
        has_blinds: form.has_blinds,
      }

      const estimate = calculateEstimate(propertyData)

      const briefRecord = {
        ...propertyData,
        investor_name: form.investor_name,
        investor_email: form.investor_email,
        investor_phone: form.investor_phone,
        referral_code: form.referral_code || null,
        status: 'estimate_only',
        ai_estimate: estimate,
      }

      const { data, error: dbError } = await supabase
        .from('briefs')
        .insert([briefRecord])
        .select()

      if (dbError) {
        console.error('Supabase insert error:', dbError)
      }

      const briefId = data?.[0]?.id || `EST-${Date.now()}`

      sessionStorage.setItem(
        'depau_estimate',
        JSON.stringify({ estimate, property: propertyData, briefId, investor: { name: form.investor_name, email: form.investor_email, phone: form.investor_phone, referral_code: form.referral_code } })
      )

      navigate('/estimate/results')
    } catch (err) {
      console.error('Submit error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const showRenovationDetails = form.renovated === 'Yes minor cosmetic' || form.renovated === 'Yes major renovation'

  return (
    <section className="bg-bg-light min-h-screen py-10 sm:py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy text-center mb-2">
          Get Your Free Depreciation Estimate
        </h1>
        <p className="text-gray-500 text-center text-sm mb-8">
          Takes under 3 minutes. No cost, no obligation.
        </p>

        <ProgressBar step={step} />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-navy mb-4">Property basics</h2>

              <div>
                <Label htmlFor="property_address" required>Property address</Label>
                <Input
                  id="property_address"
                  value={form.property_address}
                  onChange={set('property_address')}
                  placeholder="e.g. 12 Smith St, Brisbane QLD 4000"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="property_state" required>State</Label>
                  <Select
                    id="property_state"
                    value={form.property_state}
                    onChange={set('property_state')}
                    options={STATES}
                    placeholder="Select state"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="property_type" required>Property type</Label>
                  <Select
                    id="property_type"
                    value={form.property_type}
                    onChange={set('property_type')}
                    options={PROPERTY_TYPES}
                    placeholder="Select type"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bedrooms" required>Bedrooms</Label>
                  <Select
                    id="bedrooms"
                    value={form.bedrooms}
                    onChange={set('bedrooms')}
                    options={['1', '2', '3', '4', '5', '6+']}
                    placeholder="Select"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms" required>Bathrooms</Label>
                  <Select
                    id="bathrooms"
                    value={form.bathrooms}
                    onChange={set('bathrooms')}
                    options={['1', '2', '3', '4+']}
                    placeholder="Select"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="floor_area_sqm">Floor area (sqm)</Label>
                  <Input
                    id="floor_area_sqm"
                    type="number"
                    value={form.floor_area_sqm}
                    onChange={set('floor_area_sqm')}
                    placeholder="Optional"
                    helper="Leave blank and we'll estimate based on bedrooms"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="is_rented" required>Is the property currently rented or available for rent?</Label>
                <Select
                  id="is_rented"
                  value={form.is_rented}
                  onChange={set('is_rented')}
                  options={['Yes', 'No']}
                  placeholder="Select"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-navy mb-4">Age &amp; construction</h2>

              <div>
                <Label htmlFor="year_built" required>Year built (approximate)</Label>
                <Select
                  id="year_built"
                  value={form.year_built}
                  onChange={set('year_built')}
                  options={YEAR_RANGES}
                  placeholder="Select range"
                  required
                />
              </div>

              <div>
                <Label htmlFor="construction_type" required>Construction type</Label>
                <Select
                  id="construction_type"
                  value={form.construction_type}
                  onChange={set('construction_type')}
                  options={CONSTRUCTION_TYPES}
                  placeholder="Select type"
                  required
                />
              </div>

              <div>
                <Label htmlFor="renovated" required>Has the property been renovated?</Label>
                <Select
                  id="renovated"
                  value={form.renovated}
                  onChange={set('renovated')}
                  options={RENOVATION_OPTIONS}
                  placeholder="Select"
                  required
                />
              </div>

              {showRenovationDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-teal">
                  <div>
                    <Label htmlFor="renovation_year" required>Renovation year (approx.)</Label>
                    <Input
                      id="renovation_year"
                      value={form.renovation_year}
                      onChange={set('renovation_year')}
                      placeholder="e.g. 2019"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="renovation_cost">Renovation cost ($)</Label>
                    <Input
                      id="renovation_cost"
                      type="number"
                      value={form.renovation_cost}
                      onChange={set('renovation_cost')}
                      placeholder="Optional"
                      helper="We'll estimate if you're not sure"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-navy mb-4">Fixtures &amp; quality</h2>

              <div>
                <Label htmlFor="kitchen_quality" required>Kitchen quality</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, kitchen_quality: opt.value }))}
                      className={`border rounded-md px-3 py-3 text-center text-sm cursor-pointer transition-colors ${
                        form.kitchen_quality === opt.value
                          ? 'border-teal bg-teal/10 text-teal font-medium'
                          : 'border-gray-300 hover:border-gray-400 text-gray-600'
                      }`}
                    >
                      <span className="block font-medium">{opt.value}</span>
                      <span className="block text-xs mt-0.5 text-gray-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="bathroom_quality" required>Bathroom quality</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, bathroom_quality: opt.value }))}
                      className={`border rounded-md px-3 py-3 text-center text-sm cursor-pointer transition-colors ${
                        form.bathroom_quality === opt.value
                          ? 'border-teal bg-teal/10 text-teal font-medium'
                          : 'border-gray-300 hover:border-gray-400 text-gray-600'
                      }`}
                    >
                      <span className="block font-medium">{opt.value}</span>
                      <span className="block text-xs mt-0.5 text-gray-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flooring_type" required>Main flooring type</Label>
                  <Select
                    id="flooring_type"
                    value={form.flooring_type}
                    onChange={set('flooring_type')}
                    options={FLOORING_OPTIONS}
                    placeholder="Select"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="air_conditioning" required>Air conditioning</Label>
                  <Select
                    id="air_conditioning"
                    value={form.air_conditioning}
                    onChange={set('air_conditioning')}
                    options={AIRCON_OPTIONS}
                    placeholder="Select"
                    required
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-navy mb-3">Additional features</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Checkbox id="has_pool" checked={form.has_pool} onChange={set('has_pool')}>
                    Swimming pool
                  </Checkbox>
                  <Checkbox id="has_solar" checked={form.has_solar} onChange={set('has_solar')}>
                    Solar panels
                  </Checkbox>
                  <Checkbox id="has_alarm" checked={form.has_alarm} onChange={set('has_alarm')}>
                    Security alarm system
                  </Checkbox>
                  <Checkbox id="has_garage_door" checked={form.has_garage_door} onChange={set('has_garage_door')}>
                    Automatic garage door
                  </Checkbox>
                  <Checkbox id="has_built_in_wardrobes" checked={form.has_built_in_wardrobes} onChange={set('has_built_in_wardrobes')}>
                    Built-in wardrobes
                  </Checkbox>
                  <Checkbox id="has_dishwasher" checked={form.has_dishwasher} onChange={set('has_dishwasher')}>
                    Dishwasher
                  </Checkbox>
                  <Checkbox id="has_blinds" checked={form.has_blinds} onChange={set('has_blinds')}>
                    Blinds / curtains
                  </Checkbox>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-navy mb-4">Your details</h2>

              <div>
                <Label htmlFor="investor_name" required>Full name</Label>
                <Input
                  id="investor_name"
                  value={form.investor_name}
                  onChange={set('investor_name')}
                  placeholder="Jane Smith"
                  required
                />
              </div>

              <div>
                <Label htmlFor="investor_email" required>Email address</Label>
                <Input
                  id="investor_email"
                  type="email"
                  value={form.investor_email}
                  onChange={set('investor_email')}
                  placeholder="jane@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="investor_phone" required>Phone number</Label>
                <Input
                  id="investor_phone"
                  type="tel"
                  value={form.investor_phone}
                  onChange={set('investor_phone')}
                  placeholder="0400 000 000"
                  required
                />
              </div>

              <div>
                <Label htmlFor="referral_code">Referral code</Label>
                <Input
                  id="referral_code"
                  value={form.referral_code}
                  onChange={set('referral_code')}
                  placeholder="Optional"
                  helper="Were you referred by an accountant?"
                />
              </div>

              <div className="space-y-3 pt-2">
                <Checkbox id="agree_terms" checked={form.agree_terms} onChange={set('agree_terms')}>
                  I understand this is an indicative estimate only and agree to the terms of use and privacy policy.
                </Checkbox>
                <Checkbox id="agree_marketing" checked={form.agree_marketing} onChange={set('agree_marketing')}>
                  I agree to receive occasional updates and tips about property depreciation (optional).
                </Checkbox>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between items-center">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-gray-500 hover:text-navy font-medium cursor-pointer"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-teal text-white font-semibold px-8 py-3 rounded-lg hover:bg-teal-dark transition-colors cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="bg-success text-white font-semibold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Calculating...' : 'Get My Free Estimate'}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
