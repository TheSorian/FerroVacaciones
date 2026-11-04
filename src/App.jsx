import React, { useState, useEffect, useMemo } from 'react'
import './App.css'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function formatDateFull(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const weekday = dt.toLocaleDateString('es-ES', { weekday: 'long' })
  const monthName = MONTH_NAMES[m - 1]
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${d} de ${monthName} de ${y}`
}

function getDatesInRange(startStr, endStr, skipWeekends, skipHolidays, holidayMap) {
  if (!startStr || !endStr) return []
  const dates = []
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  if (start > end) return []

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    const dayOfWeek = dt.getDay() // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = !!holidayMap[dateStr]

    if (skipWeekends && isWeekend) continue
    if (skipHolidays && isHoliday) continue
    dates.push(dateStr)
  }
  return dates
}

export default function App() {
  const [year, setYear] = useState(2026)
  const [availableYears, setAvailableYears] = useState([2026, 2027])
  const [view, setView] = useState('annual') // 'annual', 'month', 'list'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState({})
  const [holidays, setHolidays] = useState([])
  const [holidaysMeta, setHolidaysMeta] = useState({
    status: 'Oficial',
    isOfficial: true,
    source: 'BOCM y Ayuntamiento de Madrid',
    url: null
  })
  const [loading, setLoading] = useState(true)
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [pinnedCategories, setPinnedCategories] = useState([])

  const handleTogglePinCategory = (name) => {
    setPinnedCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )
  }

  const activeHighlightCategories = useMemo(() => {
    const set = new Set(pinnedCategories)
    if (hoveredCategory) {
      set.add(hoveredCategory)
    }
    return Array.from(set)
  }, [pinnedCategories, hoveredCategory])

  const hasCategoryFilter = activeHighlightCategories.length > 0

  // Count illuminated days for pinned categories
  const pinnedDaysStats = useMemo(() => {
    if (pinnedCategories.length === 0) {
      return { countDays: 0, totalDaysUsed: 0, formattedUsed: '0d' }
    }
    let countDays = 0
    let totalDaysUsed = 0

    Object.values(records).forEach(rec => {
      if (rec && pinnedCategories.includes(rec.category)) {
        countDays += 1
        totalDaysUsed += (rec.fraction ?? 1.0)
      }
    })

    const formattedUsed = totalDaysUsed % 1 === 0 ? `${totalDaysUsed}d` : `${totalDaysUsed.toFixed(1).replace(/\.0$/, '')}d`
    return { countDays, totalDaysUsed, formattedUsed }
  }, [records, pinnedCategories])

  const hoveredDaysCount = useMemo(() => {
    if (!hoveredCategory) return 0
    let count = 0
    Object.values(records).forEach(rec => {
      if (rec && rec.category === hoveredCategory) {
        count += 1
      }
    })
    return count
  }, [records, hoveredCategory])
  
  // Selection Modes
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [barPositionOverride, setBarPositionOverride] = useState(null)
  const [barMinimized, setBarMinimized] = useState(false)
  const effectiveBarPosition = barPositionOverride || (view === 'month' ? 'top' : 'bottom')
  
  // Current date (Hoy)
  const todayStr = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])
  
  // Modals
  const [quickPickerDay, setQuickPickerDay] = useState(null) // day for quick 1-click category popup
  const [modalDay, setModalDay] = useState(null) // day for advanced details (fraction, notes)
  const [modalType, setModalType] = useState('full') // 'full' (8h) or 'partial' (horas sueltas)
  const [modalCategory, setModalCategory] = useState('')
  const [modalHours, setModalHours] = useState(4.0)
  const [modalNote, setModalNote] = useState('')

  // Synchronize modal state whenever modalDay changes
  useEffect(() => {
    if (modalDay) {
      const isPartial = modalDay.initialMode === 'partial' || (modalDay.record && modalDay.record.fraction < 1.0)
      setModalType(isPartial ? 'partial' : 'full')

      const allowedPartialCats = year === 2026 ? ['Comp RJ', 'Historicos RJ'] : ['Comp RJ']
      let cat = modalDay.record?.category || ''
      if (isPartial) {
        if (!allowedPartialCats.includes(cat)) {
          cat = allowedPartialCats[0]
        }
      }
      setModalCategory(cat)

      const currentHours = modalDay.record?.fraction ? Math.round(modalDay.record.fraction * 8 * 10) / 10 : 4.0
      setModalHours(currentHours)
      setModalNote(modalDay.record?.note || '')
    }
  }, [modalDay, year])

  const handleToggleModalType = (newType) => {
    setModalType(newType)
    const allowedPartialCats = year === 2026 ? ['Comp RJ', 'Historicos RJ'] : ['Comp RJ']
    if (newType === 'partial') {
      if (!allowedPartialCats.includes(modalCategory)) {
        setModalCategory(allowedPartialCats[0])
      }
    }
  }

  const [editTotalsModal, setEditTotalsModal] = useState(false)
  const [newYearModal, setNewYearModal] = useState(false)
  const [newYearInput, setNewYearInput] = useState(2027)
  const [newYearCarryOver, setNewYearCarryOver] = useState(true)
  const [holidaysModal, setHolidaysModal] = useState(false)
  
  // Range selection modal state
  const [rangeModalOpen, setRangeModalOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState('2026-08-03')
  const [rangeEnd, setRangeEnd] = useState('2026-08-14')
  const [rangeCategory, setRangeCategory] = useState('Vacaciones')
  const [rangeSkipWeekends, setRangeSkipWeekends] = useState(true)
  const [rangeSkipHolidays, setRangeSkipHolidays] = useState(true)

  const [toasts, setToasts] = useState([])

  const showToast = (message, icon = '✓') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, icon }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }

  // Load Initial Data
  const fetchData = async (targetYear = year) => {
    try {
      setLoading(true)
      const [sumRes, recRes, holRes, yearsRes] = await Promise.all([
        fetch(`/api/summary?year=${targetYear}`).then(r => r.json()),
        fetch(`/api/records?year=${targetYear}`).then(r => r.json()),
        fetch(`/api/holidays?year=${targetYear}`).then(r => r.json()),
        fetch('/api/years').then(r => r.json())
      ])
      setSummary(sumRes)
      setRecords(recRes)

      const holList = Array.isArray(holRes) ? holRes : (holRes?.holidays || [])
      setHolidays(holList)
      if (holRes && !Array.isArray(holRes)) {
        setHolidaysMeta({
          status: holRes.status || 'Oficial',
          isOfficial: holRes.isOfficial !== false,
          source: holRes.source || '',
          url: holRes.url || null
        })
      } else if (sumRes?.holidaysStatus) {
        setHolidaysMeta({
          status: sumRes.holidaysStatus,
          isOfficial: sumRes.isOfficialHolidays !== false,
          source: sumRes.holidaysSource || '',
          url: sumRes.holidaysUrl || null
        })
      }

      if (Array.isArray(yearsRes) && yearsRes.length > 0) {
        setAvailableYears(yearsRes)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      showToast('Error conectando con la base de datos', '⚠️')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Change Year Handler
  const handleYearChange = (newYear) => {
    setYear(newYear)
    setSelectedDates([])
    setQuickPickerDay(null)
    setModalDay(null)
    setRangeStart(`${newYear}-08-03`)
    setRangeEnd(`${newYear}-08-14`)
    fetchData(newYear)
    showToast(`Año ${newYear} cargado`, '📅')
  }

  // Sync official Madrid holidays
  const handleSyncHolidays = async () => {
    try {
      const res = await fetch('/api/holidays/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year })
      })
      const data = await res.json()
      if (data.ok) {
        setHolidays(data.holidays)
        setSummary(data.summary)
        if (data.status) {
          setHolidaysMeta({
            status: data.status,
            isOfficial: data.isOfficial !== false,
            source: data.source || '',
            url: data.url || null
          })
        }
        showToast(`Festivos de Madrid para ${year} actualizados (${data.holidays.length} festivos, ${data.status.toLowerCase()})`, '✨')
      }
    } catch (err) {
      showToast('Error al actualizar festivos de Madrid', '⚠️')
    }
  }

  // Create New Year
  const handleCreateYear = async (e) => {
    e.preventDefault()
    const targetYear = parseInt(newYearInput, 10)
    if (!targetYear || targetYear < 2020 || targetYear > 2050) {
      showToast('Año no válido', '⚠️')
      return
    }

    try {
      const res = await fetch('/api/years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: targetYear,
          copy_from: year,
          carry_over: newYearCarryOver
        })
      })
      const data = await res.json()
      if (data.ok) {
        setAvailableYears(data.years)
        setNewYearModal(false)
        handleYearChange(targetYear)
        showToast(`Año ${targetYear} generado con festivos oficiales de Madrid!`, '🎉')
      }
    } catch (err) {
      showToast('Error al crear el nuevo año', '⚠️')
    }
  }

  // Delete Year Handler
  const handleDeleteYear = async (yearToDelete) => {
    if (yearToDelete === 2026) {
      showToast('El año 2026 es el año base y no se puede borrar', '⚠️')
      return
    }
    if (!window.confirm(`¿Seguro que deseas eliminar por completo el año ${yearToDelete}? Se borrarán sus datos y festivos.`)) {
      return
    }
    try {
      const res = await fetch(`/api/years/${yearToDelete}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        setAvailableYears(data.years)
        const nextYear = data.years.includes(year) ? year : data.years[0] || 2026
        handleYearChange(nextYear)
        showToast(`Año ${yearToDelete} eliminado correctamente`, '🗑️')
      } else {
        showToast(data.error || 'Error al eliminar el año', '⚠️')
      }
    } catch (err) {
      showToast('Error de conexión al eliminar el año', '⚠️')
    }
  }

  // Lookup map for holidays
  const holidayMap = useMemo(() => {
    const map = {}
    holidays.forEach(h => {
      map[h.date] = h
    })
    return map
  }, [holidays])

  // Category Color Map
  const categoryColorMap = useMemo(() => {
    if (!summary || !summary.categories) return {}
    const map = {}
    summary.categories.forEach(c => {
      map[c.name] = c.color
    })
    return map
  }, [summary])

  // Category date restrictions
  // 1. Vacaciones del año anterior (ej. "Vacaciones 2025" o "Vacaciones 2026"): hasta el 31 de marzo
  // 2. RJ: hasta el 30 de noviembre (en diciembre solo se permiten el 24 y el 31 de diciembre)
  const isCategoryAllowedOnDate = (catName, dateStr) => {
    if (!catName || !dateStr) return true
    const parts = dateStr.split('-')
    if (parts.length < 3) return true
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)

    if (/^Vacaciones \d{4}$/.test(catName)) {
      if (month > 3 || (month === 3 && day > 31)) {
        return false
      }
    }

    if (catName === 'RJ') {
      if (month === 12 && day !== 24 && day !== 31) {
        return false
      }
      if (month > 12) {
        return false
      }
    }

    return true
  }

  const getCategoryRestrictionReason = (catName, dateStr) => {
    if (!isCategoryAllowedOnDate(catName, dateStr)) {
      if (/^Vacaciones \d{4}$/.test(catName)) {
        return 'Solo disponible hasta el 31 de marzo'
      }
      if (catName === 'RJ') {
        return 'Solo disponible hasta el 30 de noviembre (salvo 24 y 31 dic)'
      }
    }
    return null
  }

  const getCategoryDateRestriction = (catName) => {
    if (/^Vacaciones \d{4}$/.test(catName)) {
      return 'Hasta 31 mar'
    }
    if (catName === 'RJ') {
      return 'Hasta 30 nov (exc. 24 y 31 dic)'
    }
    return null
  }

  const getCategoryQuickPickerRestriction = (catName, dateStr) => {
    if (!isCategoryAllowedOnDate(catName, dateStr)) {
      if (/^Vacaciones \d{4}$/.test(catName)) {
        return 'Hasta el 31 de marzo'
      }
      if (catName === 'RJ') {
        return 'Hasta 30 nov (salvo 24/31 dic)'
      }
    }
    return null
  }

  // Day Click Handler: routes to multi-select or quick picker
  const handleDayClick = (item) => {
    if (!item) return
    if (multiSelectMode) {
      if (selectedDates.includes(item.date)) {
        setSelectedDates(selectedDates.filter(d => d !== item.date))
      } else {
        setSelectedDates([...selectedDates, item.date])
      }
    } else {
      setQuickPickerDay(item)
    }
  }

  // Quick Assign single day category
  const handleAssignCategory = async (dateStr, category) => {
    if (category && !isCategoryAllowedOnDate(category, dateStr)) {
      const reason = getCategoryRestrictionReason(category, dateStr)
      showToast(reason || 'Fecha no permitida para esta categoría', '⚠️')
      return
    }
    const currentRec = records[dateStr]
    const previousRecords = { ...records }
    const updatedRecords = { ...records }

    if (category) {
      updatedRecords[dateStr] = {
        category,
        fraction: currentRec?.fraction || 1.0,
        note: currentRec?.note || ''
      }
    } else {
      delete updatedRecords[dateStr]
    }
    setRecords(updatedRecords)
    setQuickPickerDay(null)

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          category: category || null,
          fraction: currentRec?.fraction || 1.0,
          note: currentRec?.note || '',
          year
        })
      })
      const data = await res.json()
      if (data.ok) {
        setSummary(data.summary)
        setRecords(data.records)
        const dayFormatted = dateStr.split('-').slice(1).reverse().join('/')
        if (category) {
          showToast(`${dayFormatted} asignado a ${category}`)
        } else {
          showToast(`${dayFormatted} desmarcado`)
        }
        if (data.autoPlacedCompRj && data.autoPlacedCompRj.length > 0) {
          const placedStr = data.autoPlacedCompRj.map(d => d.split('-').slice(1).reverse().join('/')).join(', ')
          setTimeout(() => {
            showToast(`🏖️ Semana estival completa: añadido Comp RJ el ${placedStr}`, '✨')
          }, 350)
        }
      } else {
        setRecords(previousRecords)
      }
    } catch (e) {
      setRecords(previousRecords)
      showToast('Error al guardar en base de datos', '⚠️')
    }
  }

  // Bulk Assign selected days
  const handleBulkAssign = async (category) => {
    if (selectedDates.length === 0 || bulkLoading) return
    if (category) {
      const invalidDates = selectedDates.filter(d => !isCategoryAllowedOnDate(category, d))
      if (invalidDates.length > 0) {
        const reason = category === 'RJ'
          ? 'Los días de RJ solo se pueden usar hasta el 30 de noviembre (salvo 24 y 31 dic)'
          : `Los días de '${category}' solo se pueden utilizar hasta el 31 de marzo`
        showToast(reason, '⚠️')
        return
      }
    }
    const count = selectedDates.length
    const targetDates = [...selectedDates]
    setBulkLoading(true)

    // Optimistic UI update so user gets instant response
    const previousRecords = { ...records }
    const updatedRecords = { ...records }
    targetDates.forEach(date => {
      if (category) {
        updatedRecords[date] = {
          category,
          fraction: records[date]?.fraction || 1.0,
          note: records[date]?.note || ''
        }
      } else {
        delete updatedRecords[date]
      }
    })
    setRecords(updatedRecords)
    setSelectedDates([])
    setMultiSelectMode(false)

    const recordsToUpdate = targetDates.map(date => ({
      date,
      category: category || null,
      fraction: 1.0,
      note: ''
    }))

    try {
      const res = await fetch('/api/records/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: recordsToUpdate,
          year: Number(year) || 2026
        })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSummary(data.summary)
        setRecords(data.records)
        if (category) {
          showToast(`${count} días asignados a ${category} con éxito!`, '🎉')
        } else {
          showToast(`${count} días desmarcados con éxito!`, '🧹')
        }
        if (data.autoPlacedCompRj && data.autoPlacedCompRj.length > 0) {
          const placedStr = data.autoPlacedCompRj.map(d => d.split('-').slice(1).reverse().join('/')).join(', ')
          setTimeout(() => {
            showToast(`🏖️ Semana estival completa: añadido Comp RJ el ${placedStr}`, '✨')
          }, 350)
        }
      } else {
        setRecords(previousRecords)
        showToast(data.error || 'Error en la asignación múltiple', '⚠️')
      }
    } catch (e) {
      console.error('Error in handleBulkAssign:', e)
      setRecords(previousRecords)
      showToast('Error en la asignación múltiple', '⚠️')
    } finally {
      setBulkLoading(false)
    }
  }

  // Apply Date Range
  const handleApplyRange = async () => {
    if (!rangeStart || !rangeEnd) {
      showToast('Indica fechas de inicio y fin', '⚠️')
      return
    }
    const dates = getDatesInRange(rangeStart, rangeEnd, rangeSkipWeekends, rangeSkipHolidays, holidayMap)
    if (dates.length === 0) {
      showToast('No hay días laborables en el rango seleccionado', '⚠️')
      return
    }

    if (rangeCategory) {
      const invalid = dates.filter(d => !isCategoryAllowedOnDate(rangeCategory, d))
      if (invalid.length > 0) {
        const reason = rangeCategory === 'RJ'
          ? 'Los días de RJ solo se pueden usar hasta el 30 de noviembre (salvo 24 y 31 dic)'
          : `Los días de '${rangeCategory}' solo se pueden utilizar hasta el 31 de marzo`
        showToast(reason, '⚠️')
        return
      }
    }

    const recordsToUpdate = dates.map(date => ({
      date,
      category: rangeCategory || null,
      fraction: 1.0,
      note: ''
    }))

    try {
      const res = await fetch('/api/records/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: recordsToUpdate,
          year: Number(year) || 2026
        })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSummary(data.summary)
        setRecords(data.records)
        setRangeModalOpen(false)
        showToast(`${dates.length} días asignados a ${rangeCategory || 'laborable'}!`, '🎉')
        if (data.autoPlacedCompRj && data.autoPlacedCompRj.length > 0) {
          const placedStr = data.autoPlacedCompRj.map(d => d.split('-').slice(1).reverse().join('/')).join(', ')
          setTimeout(() => {
            showToast(`🏖️ Semana estival completa: añadido Comp RJ el ${placedStr}`, '✨')
          }, 350)
        }
      } else {
        showToast(data.error || 'Error al aplicar rango', '⚠️')
      }
    } catch (e) {
      console.error('Error in handleApplyRange:', e)
      showToast('Error al aplicar rango', '⚠️')
    }
  }

  // Save changes from advanced detailed modal (fractions, notes)
  const handleSaveModalRecord = async (dateStr, category, fraction, note) => {
    if (category && !isCategoryAllowedOnDate(category, dateStr)) {
      const reason = getCategoryRestrictionReason(category, dateStr)
      showToast(reason || 'Fecha no permitida para esta categoría', '⚠️')
      return
    }
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          category: category || null,
          fraction: parseFloat(fraction) || 1.0,
          note,
          year
        })
      })
      const data = await res.json()
      if (data.ok) {
        setSummary(data.summary)
        setRecords(data.records)
        setModalDay(null)
        showToast('Guardado correctamente')
        if (data.autoPlacedCompRj && data.autoPlacedCompRj.length > 0) {
          const placedStr = data.autoPlacedCompRj.map(d => d.split('-').slice(1).reverse().join('/')).join(', ')
          setTimeout(() => {
            showToast(`🏖️ Semana estival completa: añadido Comp RJ el ${placedStr}`, '✨')
          }, 350)
        }
      }
    } catch (e) {
      showToast('Error al actualizar el día', '⚠️')
    }
  }

  // Reset to default clean template
  const handleResetExcel = async () => {
    if (!window.confirm('¿Seguro que deseas reiniciar los datos a la plantilla oficial limpia de FerroVacaciones? Se perderán las modificaciones no guardadas.')) {
      return
    }
    try {
      const res = await fetch('/api/reset-from-excel', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSummary(data.summary)
        setRecords(data.records)
        setSelectedDates([])
        showToast('Base de datos restaurada desde Excel con éxito', '🔄')
      }
    } catch (e) {
      showToast('Error al reiniciar datos', '⚠️')
    }
  }

  // Update Category total
  const handleSaveCategoryTotal = async (name, total) => {
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: parseFloat(total), year })
      })
      const data = await res.json()
      if (data.ok) {
        setSummary(data.summary)
        showToast(`Cupo de ${name} actualizado`)
      }
    } catch (e) {
      showToast('Error al actualizar cupo', '⚠️')
    }
  }

  // Generate calendar days for a month
  const getMonthDays = (m) => {
    const days = []
    const firstDay = new Date(year, m, 1)
    const startDayIndex = (firstDay.getDay() + 6) % 7 // Monday = 0, Sunday = 6
    for (let i = 0; i < startDayIndex; i++) {
      days.push(null)
    }
    const totalDays = new Date(year, m + 1, 0).getDate()
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(m + 1).padStart(2, '0')
      const dayStr = String(d).padStart(2, '0')
      const dateStr = `${year}-${monthStr}-${dayStr}`
      const dayOfWeek = (startDayIndex + (d - 1)) % 7
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
      const holiday = holidayMap[dateStr]
      const record = records[dateStr]
      days.push({
        date: dateStr,
        day: d,
        month: m,
        isWeekend,
        holiday,
        record
      })
    }
    while (days.length % 7 !== 0) {
      days.push(null)
    }
    return days
  }

  // Calculate streaks / consecutive free days
  const streaksInfo = useMemo(() => {
    let maxStreak = 0
    let currentStreak = 0
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
      const m = dt.getMonth()
      const d = dt.getDate()
      const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
      const isHoliday = !!holidayMap[dateStr]
      const isBooked = !!records[dateStr]

      if (isWeekend || isHoliday || isBooked) {
        currentStreak++
        if (currentStreak > maxStreak) maxStreak = currentStreak
      } else {
        currentStreak = 0
      }
    }
    return { maxStreak }
  }, [year, records, holidayMap])

  // Count preview for range modal
  const rangePreviewCount = useMemo(() => {
    if (!rangeModalOpen) return 0
    return getDatesInRange(rangeStart, rangeEnd, rangeSkipWeekends, rangeSkipHolidays, holidayMap).length
  }, [rangeModalOpen, rangeStart, rangeEnd, rangeSkipWeekends, rangeSkipHolidays, holidayMap])

  const saturdayHolidaysCount = useMemo(() => {
    return holidays.filter(h => h.isSaturday).length
  }, [holidays])

  return (
    <div className="app-wrapper">
      {/* TOP HEADER */}
      <header className="top-header">
        <div className="brand-group">
          <div className="brand-icon">🏖️</div>
          <div className="brand-text">
            <div className="brand-title-row">
              <h1>FerroVacaciones</h1>
              <div className="year-selector-group">
                <button
                  type="button"
                  className="year-nav-btn"
                  onClick={() => {
                    const sorted = [...availableYears].sort((a, b) => a - b)
                    const currentIndex = sorted.indexOf(year)
                    if (currentIndex > 0) {
                      handleYearChange(sorted[currentIndex - 1])
                    } else {
                      handleYearChange(year - 1)
                    }
                  }}
                  title="Año anterior"
                >
                  ◀
                </button>
                <select
                  className="year-select"
                  value={year}
                  onChange={e => handleYearChange(parseInt(e.target.value, 10))}
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                  {!availableYears.includes(year) && (
                    <option value={year}>{year}</option>
                  )}
                </select>
                <button
                  type="button"
                  className="year-nav-btn"
                  onClick={() => {
                    const sorted = [...availableYears].sort((a, b) => a - b)
                    const currentIndex = sorted.indexOf(year)
                    if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
                      handleYearChange(sorted[currentIndex + 1])
                    } else {
                      handleYearChange(year + 1)
                    }
                  }}
                  title="Año siguiente"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                className="btn-new-year"
                onClick={() => {
                  const maxYear = Math.max(...availableYears, year)
                  setNewYearInput(maxYear + 1)
                  setNewYearModal(true)
                }}
                title="Generar o abrir un nuevo año con festivos oficiales de Madrid"
              >
                + Nuevo Año
              </button>
              {year !== 2026 && (
                <button
                  type="button"
                  className="btn-del-year"
                  onClick={() => handleDeleteYear(year)}
                  title={`Eliminar el año ${year} y sus festivos`}
                >
                  🗑️ Borrar {year}
                </button>
              )}
              <span className="badge-city">Madrid</span>
            </div>
            <div className="brand-sub">
              <span className="db-pill">
                <span className="pulse-dot" /> Base de datos SQLite activa
              </span>
              <span>· Gestión y Cuadrante de Vacaciones</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* View selector */}
          <div className="view-selector">
            <button
              className={`view-btn ${view === 'annual' ? 'active' : ''}`}
              onClick={() => setView('annual')}
              title="Vista Anual (12 meses)"
            >
              📅 Anual
            </button>
            <button
              className={`view-btn ${view === 'month' ? 'active' : ''}`}
              onClick={() => setView('month')}
              title="Vista Mensual detallada"
            >
              🗓️ Mes
            </button>
            <button
              className={`view-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="Listado de días planificados"
            >
              📋 Agenda
            </button>
          </div>

          {/* Action buttons */}
          <div className="action-buttons-group">
            <a
              href={`/api/export?year=${year}`}
              className="btn-action btn-export"
              download
              title="Descargar cuadrante en formato Excel (.xlsx)"
            >
              📊 Exportar
            </a>
            <button
              className="btn-action"
              onClick={() => setEditTotalsModal(true)}
              title="Ajustar días totales por categoría"
            >
              ⚙️ Cupos
            </button>
          </div>
        </div>
      </header>

      {/* METRICS ROW */}
      {summary && (
        <section className="stats-grid">
          <div className="stat-card highlight">
            <div className="stat-title">
              <span>Total Disponibles</span>
              <span>📆</span>
            </div>
            <div className="stat-num">{summary.totalFormatted}</div>
            <div className="stat-sub">{summary.total} días computables</div>
          </div>

          <div className="stat-card">
            <div className="stat-title">
              <span>Días Planificados</span>
              <span>✓</span>
            </div>
            <div className="stat-num" style={{ color: '#60a5fa' }}>
              {summary.usedFormatted}
            </div>
            <div className="stat-sub">{summary.daysMarked} fechas registradas</div>
          </div>

          <div className="stat-card">
            <div className="stat-title">
              <span>Restantes</span>
              <span>⏳</span>
            </div>
            <div
              className="stat-num"
              style={{ color: summary.remaining < 0 ? '#ef4444' : '#34d399' }}
            >
              {summary.remainingFormatted}
            </div>
            <div className="stat-sub">
              {summary.remaining < 0 ? '¡Exceso de días!' : 'Pendientes de asignar'}
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setHolidaysModal(true)}
            title="Ver los 14 festivos de Madrid para este año"
          >
            <div className="stat-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Festivos Madrid</span>
                <span className={`badge-status ${(summary?.isOfficialHolidays ?? holidaysMeta.isOfficial) ? 'status-official' : 'status-estimated'}`}>
                  {(summary?.isOfficialHolidays ?? holidaysMeta.isOfficial) ? '🟢 Oficial' : '🟡 Estimado'}
                </span>
              </div>
              <button
                type="button"
                className="btn-sync-holidays"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSyncHolidays()
                }}
                title="Actualizar festivos desde el calendario laboral de Madrid"
              >
                🔄
              </button>
            </div>
            <div className="stat-num" style={{ color: '#f87171' }}>
              {summary.holidaysCount} <span style={{ fontSize: 13, color: '#94a3b8' }}>ver lista ↗</span>
            </div>
            <div className="stat-sub">
              {saturdayHolidaysCount > 0
                ? `${saturdayHolidaysCount} en sábado (recuperables)`
                : 'Ninguno en sábado'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">
              <span>Mayor Periodo Libre</span>
              <span>🚀</span>

            </div>
            <div className="stat-num" style={{ color: '#fbbf24' }}>
              {streaksInfo.maxStreak} <span style={{ fontSize: 16 }}>días</span>
            </div>
            <div className="stat-sub">Racha consecutiva máx.</div>
          </div>
        </section>
      )}

      {/* CATEGORIES OVERVIEW BAR */}
      <section className="palette-section">
        <div className="palette-header">
          <div className="palette-title">
            <span>📊 Estado de Categorías:</span>
          </div>
          <div className="palette-actions">
            <span className="palette-hint">
              {pinnedCategories.length > 0 ? (
                <span className="palette-status-line">
                  <span>
                    📌 <strong>{pinnedCategories.length}</strong> {pinnedCategories.length === 1 ? 'categoría iluminada' : 'categorías iluminadas'}
                  </span>
                  <span className="palette-stat-pill">
                    📅 <strong>{pinnedDaysStats.countDays}</strong> {pinnedDaysStats.countDays === 1 ? 'día iluminado' : 'días iluminados'}
                    {pinnedDaysStats.totalDaysUsed !== pinnedDaysStats.countDays && ` (${pinnedDaysStats.formattedUsed})`}
                  </span>
                </span>
              ) : hoveredCategory ? (
                <span className="palette-status-line">
                  <span>
                    💡 Resaltando <strong>{hoveredCategory}</strong>:
                  </span>
                  <span className="palette-stat-pill">
                    📅 <strong>{hoveredDaysCount}</strong> {hoveredDaysCount === 1 ? 'día' : 'días'}
                  </span>
                  <span style={{ opacity: 0.7 }}>(haz clic para fijar)</span>
                </span>
              ) : (
                '💡 Haz clic en una o varias categorías para fijarlas iluminadas (o pasa el ratón)'
              )}
            </span>
            {pinnedCategories.length > 0 && (
              <button
                type="button"
                className="palette-clear-btn"
                onClick={() => setPinnedCategories([])}
                title="Quitar filtro de categorías fijadas"
              >
                ✕ Limpiar filtro
              </button>
            )}
          </div>
        </div>

        <div className="palette-chips">
          {summary && summary.categories.map(cat => {
            const pct = cat.total > 0 ? Math.min(100, Math.round((cat.used / cat.total) * 100)) : 0
            const isPinned = pinnedCategories.includes(cat.name)
            return (
              <div
                key={cat.name}
                className={`chip-tool ${isPinned ? 'pinned' : ''}`}
                style={isPinned ? {
                  borderColor: cat.color,
                  boxShadow: `0 0 12px ${cat.color}77, inset 0 0 8px ${cat.color}22`,
                  backgroundColor: '#1e293b'
                } : {}}
                onClick={() => handleTogglePinCategory(cat.name)}
                onMouseEnter={() => setHoveredCategory(cat.name)}
                onMouseLeave={() => setHoveredCategory(null)}
                title={`${cat.name}: ${cat.usedFormatted} de ${cat.totalFormatted} consumidos (${cat.remainingFormatted} restantes) · Clic para ${isPinned ? 'desfijar' : 'fijar iluminado'}`}
              >
                <div className="chip-dot" style={{ backgroundColor: cat.color }} />
                <div className="chip-info">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span className="chip-name">{cat.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {getCategoryDateRestriction(cat.name) && (
                        <span className="chip-restriction-badge" title={`Límite de disfrute: ${getCategoryDateRestriction(cat.name)}`}>
                          ⏰ {getCategoryDateRestriction(cat.name)}
                        </span>
                      )}
                      {isPinned && <span className="chip-pin-badge" title="Fijado">📌</span>}
                    </div>
                  </div>
                  <span className="chip-count">
                    <strong>{cat.usedFormatted}</strong> / {cat.totalFormatted}
                  </span>
                  <div className="chip-progress-bar">
                    <div
                      className="chip-progress-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.used > cat.total ? '#ef4444' : cat.color
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* SELECTION MODE TOOLBAR */}
      <section className="mode-toolbar">
        <div className="mode-toolbar-left">
          <button
            className={`mode-btn ${!multiSelectMode ? 'active' : ''}`}
            onClick={() => {
              setMultiSelectMode(false)
              setSelectedDates([])
            }}
            title="Haz clic en un día individual para elegir su tipo en un menú rápido"
          >
            👆 Modo Individual
          </button>

          <button
            className={`mode-btn ${multiSelectMode ? 'active' : ''}`}
            onClick={() => {
              setMultiSelectMode(!multiSelectMode)
              if (multiSelectMode) setSelectedDates([])
            }}
            title="Activar selección de varios días simultáneos"
          >
            ☑️ Seleccionar Varios {selectedDates.length > 0 && `(${selectedDates.length})`}
          </button>

          <button
            className="mode-btn btn-range"
            onClick={() => setRangeModalOpen(true)}
            title="Seleccionar un rango de fechas continuo (ej. vacaciones de verano)"
          >
            📅 Rango de Fechas
          </button>
        </div>

        <div className="mode-toolbar-hint">
          {multiSelectMode
            ? `📌 Toca los días que quieras marcar (${selectedDates.length} seleccionados)`
            : `💡 Haz clic en cualquier día para elegir directamente su categoría`
          }
        </div>
      </section>

      {/* VIEW: ANNUAL 12 MONTHS */}
      {view === 'annual' && (
        <section className="annual-grid">
          {MONTH_NAMES.map((name, mIdx) => {
            const days = getMonthDays(mIdx)
            const monthBookedCount = days.filter(d => d && d.record).length

            return (
              <div key={name} className="month-box">
                <div className="month-header">
                  <span className="month-title">{name}</span>
                  {monthBookedCount > 0 && (
                    <span className="month-stats-badge">
                      {monthBookedCount} {monthBookedCount === 1 ? 'día' : 'días'}
                    </span>
                  )}
                </div>

                <div className="calendar-table">
                  <div className="weekdays-row">
                    {WEEK_DAYS.map((w, idx) => (
                      <div
                        key={w}
                        className={`weekday-col ${idx >= 5 ? 'weekend' : ''}`}
                      >
                        {w}
                      </div>
                    ))}
                  </div>

                  <div className="days-grid">
                    {days.map((item, dIdx) => {
                      if (!item) {
                        return <div key={`empty-${dIdx}`} className="day-cell empty" />
                      }

                      const { date, day, isWeekend, holiday, record } = item
                      const isToday = date === todayStr
                      const isMarked = !!record
                      const catName = record ? record.category : null
                      const catColor = catName ? categoryColorMap[catName] || '#3b82f6' : null

                      // Highlight effect (hover and pinned)
                      const isDimmed = hasCategoryFilter && (!catName || !activeHighlightCategories.includes(catName))
                      const isHighlighted = hasCategoryFilter && catName && activeHighlightCategories.includes(catName)
                      const isSelectedMulti = selectedDates.includes(date)

                      const tooltip = isToday
                        ? `📍 ¡HOY! (${day} ${name}) · ${holiday ? `Festivo: ${holiday.name}` : ''}${isMarked ? `${catName}${record.note ? ` (${record.note})` : ''}` : 'Laborable'}`
                        : holiday
                        ? `${day} ${name} · Festivo: ${holiday.name}${isMarked ? ` (${catName})` : ''}`
                        : isMarked
                        ? `${day} ${name} · ${catName}${record.note ? ` (${record.note})` : ''}`
                        : `${day} ${name}`

                      const isPartial = record && record.fraction < 1.0
                      const partialHours = isPartial ? Math.round(record.fraction * 8 * 10) / 10 : null

                      return (
                        <div
                          key={date}
                          className={`day-cell 
                            ${isWeekend ? 'weekend' : ''} 
                            ${holiday ? 'holiday' : ''} 
                            ${isMarked ? 'marked' : ''}
                            ${isToday ? 'is-today' : ''}
                            ${isPartial ? 'partial-day' : ''}
                            ${record?.note ? 'has-note' : ''}
                            ${isDimmed ? 'dimmed' : ''}
                            ${isHighlighted ? 'highlighted' : ''}
                            ${isSelectedMulti ? 'selected-multi' : ''}
                          `}
                          style={isMarked ? { backgroundColor: catColor } : {}}
                          onClick={() => handleDayClick(item)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setModalDay(item)
                          }}
                          onDoubleClick={() => setModalDay(item)}
                          title={tooltip}
                        >
                          {isToday && <span className="today-marker" title="Hoy">HOY</span>}
                          <span>{day}</span>
                          {isPartial && (
                            <span className="partial-badge">{partialHours}h</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* VIEW: MONTH DETAILED */}
      {view === 'month' && (
        <section className={`month-view-container ${selectedDates.length > 0 && effectiveBarPosition === 'bottom' ? 'has-bottom-bar' : ''}`}>
          <div className="month-nav-bar">
            <button
              className="month-nav-btn"
              onClick={() => setSelectedMonth(m => (m === 0 ? 11 : m - 1))}
              title="Mes anterior"
            >
              ◀
            </button>
            <div className="current-month-heading">
              {MONTH_NAMES[selectedMonth]} {year}
            </div>
            <button
              className="month-nav-btn"
              onClick={() => setSelectedMonth(m => (m === 11 ? 0 : m + 1))}
              title="Mes siguiente"
            >
              ▶
            </button>
          </div>

          <div className="weekdays-row" style={{ marginBottom: 10 }}>
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(
              (w, i) => (
                <div
                  key={w}
                  className={`weekday-col ${i >= 5 ? 'weekend' : ''}`}
                >
                  <span className="day-name-full">{w}</span>
                  <span className="day-name-short">{WEEK_DAYS[i]}</span>
                </div>
              )
            )}
          </div>

          <div className="month-view-grid">
            {getMonthDays(selectedMonth).map((item, dIdx) => {
              if (!item) {
                return (
                  <div
                    key={`empty-m-${dIdx}`}
                    style={{ background: 'transparent', minHeight: 85 }}
                  />
                )
              }
              const { date, day, isWeekend, holiday, record } = item
              const isToday = date === todayStr
              const catName = record ? record.category : null
              const catColor = catName ? categoryColorMap[catName] || '#3b82f6' : null
              const isSelectedMulti = selectedDates.includes(date)
              const isDimmed = hasCategoryFilter && (!catName || !activeHighlightCategories.includes(catName))
              const isHighlighted = hasCategoryFilter && catName && activeHighlightCategories.includes(catName)

              return (
                <div
                  key={date}
                  className={`month-view-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'is-today' : ''} ${isDimmed ? 'dimmed' : ''} ${isHighlighted ? 'highlighted' : ''} ${isSelectedMulti ? 'selected-multi' : ''}`}
                  onClick={() => handleDayClick(item)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setModalDay(item)
                  }}
                  onDoubleClick={() => setModalDay(item)}
                  style={
                    record
                      ? {
                          borderLeft: `4px solid ${catColor}`,
                          backgroundColor: 'rgba(30, 41, 59, 0.9)'
                        }
                      : {}
                  }
                >
                  <div className="cell-top">
                    <span className="day-number">
                      {day}
                      {isToday && <span className="month-today-badge">HOY</span>}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isSelectedMulti && (
                        <span className="month-selected-badge" title="Seleccionado">✓</span>
                      )}
                      <button
                        className="cell-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalDay(item)
                        }}
                        title="Editar notas o detalles"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>

                  <div className="cell-body">
                    {holiday && (
                      <div className="holiday-tag" title={holiday.name}>
                        ★ {holiday.name}
                      </div>
                    )}
                    {record && (
                      <div
                        className="category-tag"
                        style={{ backgroundColor: catColor, marginTop: 4 }}
                      >
                        {catName} {record.fraction < 1 ? `(${Math.round(record.fraction * 8 * 10) / 10}h)` : ''}
                      </div>
                    )}
                    {record?.note && (
                      <div className="note-preview">💬 {record.note}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* VIEW: LIST / AGENDA */}
      {view === 'list' && (
        <section className="list-view-container">
          {MONTH_NAMES.map((monthName, mIdx) => {
            const daysInMonth = getMonthDays(mIdx).filter(d => d && (d.record || d.holiday))
            if (daysInMonth.length === 0) return null

            return (
              <div key={monthName} className="list-month-card">
                <div className="list-month-title">
                  <span>{monthName} {year}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    {daysInMonth.filter(d => d.record).length} días marcados
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th style={{ width: 100 }}>Fecha</th>
                        <th style={{ width: 140 }}>Día</th>
                        <th style={{ width: 180 }}>Tipo</th>
                        <th>Notas / Festivo</th>
                        <th style={{ width: 80, textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysInMonth.map(({ date, day, holiday, record }) => {
                        const dtObj = new Date(year, mIdx, day)
                        const dayName = dtObj.toLocaleDateString('es-ES', { weekday: 'long' })
                        const catName = record ? record.category : null
                        const catColor = catName ? categoryColorMap[catName] : null
                        const isToday = date === todayStr
                        const isDimmed = hasCategoryFilter && (!catName || !activeHighlightCategories.includes(catName))
                        const isHighlighted = hasCategoryFilter && catName && activeHighlightCategories.includes(catName)

                        return (
                          <tr key={date} className={`${isToday ? 'row-today' : ''} ${isDimmed ? 'row-dimmed' : ''} ${isHighlighted ? 'row-highlighted' : ''}`}>
                            <td style={{ fontWeight: 600 }}>
                              {date}
                              {isToday && <span className="list-today-badge">HOY</span>}
                            </td>
                            <td style={{ textTransform: 'capitalize', color: '#94a3b8' }}>
                              {dayName}
                            </td>
                            <td>
                              {record ? (
                                <span
                                  className="category-tag"
                                  style={{ backgroundColor: catColor, padding: '3px 8px' }}
                                >
                                  {catName} {record.fraction < 1 ? `(${Math.round(record.fraction * 8 * 10) / 10}h)` : ''}
                                </span>
                              ) : (
                                <span style={{ color: '#f87171', fontWeight: 600 }}>
                                  Festivo oficial
                                </span>
                              )}
                            </td>
                            <td>
                              {holiday && (
                                <div style={{ color: '#f87171', fontSize: 12 }}>
                                  ★ {holiday.name}
                                </div>
                              )}
                              {record?.note && (
                                <div style={{ color: '#cbd5e1', fontSize: 12 }}>
                                  {record.note}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn-action"
                                style={{ padding: '2px 8px', fontSize: 11 }}
                                onClick={() => setModalDay({ date, day, month: mIdx, holiday, record })}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* QUICK DAY PICKER (1-CLICK CATEGORY SELECTOR) */}
      {quickPickerDay && (
        <div className="modal-overlay" onClick={() => setQuickPickerDay(null)}>
          <div className="quick-picker-card" onClick={e => e.stopPropagation()}>
            <div className="quick-picker-header">
              <div>
                <div className="quick-picker-date">
                  {formatDateFull(quickPickerDay.date)}
                </div>
                {quickPickerDay.holiday && (
                  <div className="quick-picker-holiday">
                    ★ Festivo: {quickPickerDay.holiday.name}
                  </div>
                )}
                {quickPickerDay.record ? (
                  <div className="quick-picker-current">
                    Asignado: <strong>{quickPickerDay.record.category}</strong>
                    {quickPickerDay.record.fraction < 1 && ` (${quickPickerDay.record.fraction}d)`}
                    {quickPickerDay.record.note && ` · "${quickPickerDay.record.note}"`}
                  </div>
                ) : (
                  <div className="quick-picker-current">Día laborable sin marcar</div>
                )}
              </div>
              <button className="modal-close" onClick={() => setQuickPickerDay(null)}>✕</button>
            </div>

            <div className="quick-picker-grid">
              {summary && summary.categories.map(cat => {
                const isAllowed = isCategoryAllowedOnDate(cat.name, quickPickerDay.date)
                const restrictionReason = getCategoryRestrictionReason(cat.name, quickPickerDay.date)
                return (
                  <button
                    key={cat.name}
                    disabled={!isAllowed}
                    className={`quick-cat-btn ${quickPickerDay.record?.category === cat.name ? 'current' : ''} ${!isAllowed ? 'disabled-restriction' : ''}`}
                    onClick={() => isAllowed && handleAssignCategory(quickPickerDay.date, cat.name)}
                    title={restrictionReason ? `${cat.name}: ${restrictionReason}` : `Asignar ${cat.name}`}
                  >
                    <div className="chip-dot" style={{ backgroundColor: cat.color }} />
                    <div className="quick-cat-text">
                      <div className="quick-cat-header-row">
                        <span className="quick-cat-name">{cat.name}</span>
                        {!isAllowed && (
                          <span className="restriction-badge-small">⏰ Fuera de plazo</span>
                        )}
                      </div>
                      <span className="quick-cat-rem">
                        {getCategoryQuickPickerRestriction(cat.name, quickPickerDay.date) || `${cat.remainingFormatted} rest. (${cat.usedFormatted}/${cat.totalFormatted})`}
                      </span>
                    </div>
                  </button>
                )
              })}

              {quickPickerDay.record && (
                <button
                  className="quick-cat-btn unmark-btn"
                  onClick={() => handleAssignCategory(quickPickerDay.date, null)}
                >
                  <span style={{ fontSize: 16 }}>🧹</span>
                  <div className="quick-cat-text">
                    <span className="quick-cat-name">Desmarcar día</span>
                    <span className="quick-cat-rem">Dejar como laborable</span>
                  </div>
                </button>
              )}
            </div>

            <div className="quick-picker-footer">
              <button
                className="btn-link"
                onClick={() => {
                  const day = quickPickerDay
                  setQuickPickerDay(null)
                  setModalDay({ ...day, initialMode: 'partial' })
                }}
              >
                ⏱️ Asignar horas sueltas (Comp RJ{year === 2026 ? ' / Históricos RJ' : ''})...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BAR FOR MULTI-SELECT MODE */}
      {selectedDates.length > 0 && (
        <div className={`floating-multi-bar position-${effectiveBarPosition} ${barMinimized ? 'is-minimized' : ''}`}>
          <div className="multi-bar-header">
            <div
              className="multi-bar-info"
              style={{ cursor: 'pointer' }}
              onClick={() => setBarMinimized(!barMinimized)}
              title={barMinimized ? "Clic para desplegar opciones" : "Clic para minimizar"}
            >
              <span>📌 Seleccionados:</span>
              <span className="multi-bar-badge">{selectedDates.length} {selectedDates.length === 1 ? 'día' : 'días'}</span>
            </div>

            <div className="multi-bar-controls">
              <button
                className="multi-bar-icon-btn"
                disabled={bulkLoading}
                onClick={() => setBarPositionOverride(effectiveBarPosition === 'top' ? 'bottom' : 'top')}
                title={effectiveBarPosition === 'top' ? "Mover barra a la parte inferior" : "Mover barra a la parte superior"}
              >
                <span>{effectiveBarPosition === 'top' ? '⬇️' : '⬆️'}</span>
                <span>{effectiveBarPosition === 'top' ? 'Abajo' : 'Arriba'}</span>
              </button>
              <button
                className={`multi-bar-icon-btn ${barMinimized ? 'multi-bar-btn-primary' : ''}`}
                disabled={bulkLoading}
                onClick={() => setBarMinimized(!barMinimized)}
                title={barMinimized ? "Desplegar opciones de tipo de día" : "Minimizar panel"}
              >
                <span>{barMinimized ? '➕' : '➖'}</span>
                <span>{barMinimized ? 'Elegir tipo' : 'Minimizar'}</span>
              </button>
            </div>
          </div>

          {!barMinimized && (
            <div className="multi-bar-actions">
              {summary && summary.categories.map(cat => {
                const invalidDates = selectedDates.filter(d => !isCategoryAllowedOnDate(cat.name, d))
                const isAllowed = invalidDates.length === 0
                return (
                  <button
                    key={cat.name}
                    className={`multi-cat-chip ${!isAllowed ? 'chip-restricted' : ''}`}
                    disabled={bulkLoading || !isAllowed}
                    onClick={() => {
                      if (!isAllowed) {
                        showToast(cat.name === 'RJ'
                          ? 'Los días de RJ solo se pueden usar hasta el 30 de noviembre (salvo 24 y 31 dic)'
                          : `Los días de '${cat.name}' solo se pueden utilizar hasta el 31 de marzo`, '⚠️')
                        return
                      }
                      handleBulkAssign(cat.name)
                    }}
                    title={!isAllowed
                      ? (cat.name === 'RJ'
                          ? 'No permitido: RJ solo hasta el 30 nov (salvo 24 y 31 dic)'
                          : `${cat.name} solo disponible hasta el 31 de marzo`)
                      : `Asignar ${cat.name} a los ${selectedDates.length} días seleccionados`}
                  >
                    <div className="chip-dot" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                    {!isAllowed && <span style={{ fontSize: 10, opacity: 0.8 }} title="Restricción de fecha">⏰</span>}
                  </button>
                )
              })}

              <button
                className="multi-cat-chip"
                style={{ borderColor: '#ef4444', color: '#fca5a5' }}
                disabled={bulkLoading}
                onClick={() => handleBulkAssign(null)}
                title="Desmarcar todos los días seleccionados"
              >
                🧹 Desmarcar
              </button>

              <button
                className="multi-bar-close"
                disabled={bulkLoading}
                onClick={() => setSelectedDates([])}
                title="Limpiar selección"
              >
                ✕ Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* RANGE SELECTION MODAL */}
      {rangeModalOpen && (
        <div className="modal-overlay" onClick={() => setRangeModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📅 Marcar Rango de Fechas</div>
              <button className="modal-close" onClick={() => setRangeModalOpen(false)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              Selecciona un periodo continuo para asignarlo de golpe (ej. vacaciones de verano o navidad).
            </p>

            <div className="form-group">
              <label className="form-label">Desde</label>
              <input
                type="date"
                value={rangeStart}
                onChange={e => setRangeStart(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                value={rangeEnd}
                onChange={e => setRangeEnd(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de descanso</label>
              <select
                value={rangeCategory}
                onChange={e => setRangeCategory(e.target.value)}
                className="form-select"
              >
                {summary && summary.categories.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.remainingFormatted} restantes)
                  </option>
                ))}
                <option value="">-- Desmarcar / Dejar laborables --</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rangeSkipWeekends}
                  onChange={e => setRangeSkipWeekends(e.target.checked)}
                />
                <span>Omitir fines de semana (Sábados y Domingos)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rangeSkipHolidays}
                  onChange={e => setRangeSkipHolidays(e.target.checked)}
                />
                <span>Omitir festivos oficiales de Madrid</span>
              </label>
            </div>

            <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 18 }}>
              🎯 Se asignarán <strong>{rangePreviewCount} días</strong> a <strong>{rangeCategory || 'Laborable'}</strong>.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-action"
                onClick={() => setRangeModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleApplyRange}
              >
                Asignar a los {rangePreviewCount} días
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED DAY DETAIL MODAL */}
      {modalDay && (
        <div className="modal-overlay" onClick={() => setModalDay(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {modalDay.day} de {MONTH_NAMES[modalDay.month]} {year}
              </div>
              <button className="modal-close" onClick={() => setModalDay(null)}>
                ✕
              </button>
            </div>

            {modalDay.holiday && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  color: '#fca5a5',
                  marginBottom: 16,
                  fontSize: 13
                }}
              >
                ★ Festivo: <strong>{modalDay.holiday.name}</strong>
              </div>
            )}

            <form
              onSubmit={e => {
                e.preventDefault()
                const fraction = modalType === 'partial' ? (parseFloat(modalHours) / 8.0) : 1.0
                handleSaveModalRecord(
                  modalDay.date,
                  modalCategory || null,
                  fraction,
                  modalNote
                )
              }}
            >
              {/* Selector de modo: Día completo vs Horas sueltas */}
              <div className="modal-type-tabs">
                <button
                  type="button"
                  className={`modal-type-tab ${modalType === 'full' ? 'active' : ''}`}
                  onClick={() => handleToggleModalType('full')}
                >
                  ☀️ Día completo (8h)
                </button>
                <button
                  type="button"
                  className={`modal-type-tab ${modalType === 'partial' ? 'active' : ''}`}
                  onClick={() => handleToggleModalType('partial')}
                >
                  ⏱️ Horas sueltas / Incompleto
                </button>
              </div>

              {/* Categoría asignada */}
              <div className="form-group">
                <label className="form-label">
                  Categoría asignada {modalType === 'partial' ? '(Solo Comp RJ' + (year === 2026 ? ' e Históricos RJ' : '') + ')' : ''}
                </label>
                <select
                  value={modalCategory}
                  onChange={e => setModalCategory(e.target.value)}
                  className="form-select"
                >
                  {modalType === 'full' && (
                    <option value="">-- Ninguna (Libre / Laborable) --</option>
                  )}
                  {modalType === 'full'
                    ? (summary && summary.categories.map(c => {
                        const isAllowed = isCategoryAllowedOnDate(c.name, modalDay.date)
                        const reason = getCategoryRestrictionReason(c.name, modalDay.date)
                        return (
                          <option key={c.name} value={c.name} disabled={!isAllowed}>
                            {c.name} ({c.usedFormatted} de {c.totalFormatted}) {!isAllowed ? `[${reason}]` : ''}
                          </option>
                        )
                      }))
                    : ((year === 2026 ? ['Comp RJ', 'Historicos RJ'] : ['Comp RJ']).map(name => {
                        const catObj = summary?.categories?.find(c => c.name === name)
                        return (
                          <option key={name} value={name}>
                            {name} {catObj ? `(${catObj.remainingFormatted} restantes)` : ''}
                          </option>
                        )
                      }))
                  }
                </select>
                {modalType === 'partial' && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    ℹ️ Las horas sueltas solo pueden disfrutarse con <strong>Comp RJ</strong>
                    {year === 2026 ? ' o Históricos RJ' : ''}.
                  </div>
                )}
              </div>

              {/* Elección de número de horas (solo en modo Horas sueltas) */}
              {modalType === 'partial' && (
                <div className="form-group">
                  <label className="form-label">Número de horas a disfrutar</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="7.5"
                      value={modalHours}
                      onChange={e => setModalHours(parseFloat(e.target.value) || 0.5)}
                      className="form-input"
                      style={{ width: 110, fontWeight: 700, fontSize: 15 }}
                      required
                    />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>horas</span>
                  </div>

                  <div className="hours-quick-grid">
                    {[1.5, 2.0, 4.0, 5.0].map(h => (
                      <button
                        key={h}
                        type="button"
                        className={`hours-btn ${modalHours === h ? 'active' : ''}`}
                        onClick={() => setModalHours(h)}
                      >
                        {h} h
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 8, background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: 6 }}>
                    🎯 Se consumirán <strong>{modalHours} horas</strong> ({(Math.round((modalHours / 8.0) * 10000) / 10000)} días) de <strong>{modalCategory}</strong>.
                  </div>
                </div>
              )}

              {/* Notas */}
              <div className="form-group">
                <label className="form-label">Notas o motivos (opcional)</label>
                <textarea
                  value={modalNote}
                  onChange={e => setModalNote(e.target.value)}
                  placeholder="Ej: Salida 4h antes, cita médica, puente..."
                  className="form-textarea"
                />
              </div>

              <div className="modal-actions">
                {modalDay.record && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => {
                      handleSaveModalRecord(modalDay.date, null, 1.0, '')
                    }}
                  >
                    Desmarcar
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TOTALS MODAL */}
      {editTotalsModal && summary && (
        <div className="modal-overlay" onClick={() => setEditTotalsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">⚙️ Ajustar Cupos de Categorías</div>
              <button className="modal-close" onClick={() => setEditTotalsModal(false)}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              Modifica los días anuales asignados por Recursos Humanos o convenio.
            </p>

            <div className="cupos-list">
              {summary.categories.map(cat => (
                <div key={cat.name} className="cupos-row">
                  <div className="cupos-label-group">
                    <div
                      className="chip-dot"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="cupos-name">{cat.name}</span>
                  </div>

                  <div className="cupos-input-group">
                    <input
                      type="number"
                      step="0.001"
                      defaultValue={cat.total}
                      className="cupos-input"
                      onBlur={(e) => handleSaveCategoryTotal(cat.name, e.target.value)}
                    />
                    <span className="cupos-unit">días</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                className="btn-primary"
                onClick={() => setEditTotalsModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW YEAR MODAL */}
      {newYearModal && (
        <div className="modal-overlay" onClick={() => setNewYearModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✨ Generar Nuevo Año</div>
              <button className="modal-close" onClick={() => setNewYearModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateYear}>
              <div className="info-banner">
                🗓️ <strong>Generación Automática:</strong> Se calcularán los <strong>14 festivos oficiales de Madrid capital</strong> (nacionales, autonómicos y locales: San Isidro y La Almudena) con traslados de domingos y cómputo de festivos en sábado para fijar los días compensatorios.
              </div>

              <div className="form-group">
                <label className="form-label">Año a planificar</label>
                <input
                  type="number"
                  min="2020"
                  max="2050"
                  value={newYearInput}
                  onChange={e => setNewYearInput(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={newYearCarryOver}
                    onChange={e => setNewYearCarryOver(e.target.checked)}
                  />
                  <span>
                    Traspasar días pendientes de {year} (Vacaciones {year}, RJ pendientes)
                  </span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setNewYearModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Generar año {newYearInput}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOLIDAYS MODAL */}
      {holidaysModal && (
        <div className="modal-overlay" onClick={() => setHolidaysModal(false)}>
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="modal-title">⭐ Calendario Laboral Madrid {year}</div>
                  <span className={`badge-status ${(summary?.isOfficialHolidays ?? holidaysMeta.isOfficial) ? 'status-official' : 'status-estimated'}`}>
                    {(summary?.isOfficialHolidays ?? holidaysMeta.isOfficial) ? '🟢 Oficial' : '🟡 Estimado'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  14 festivos (9 nacionales, 3 de la CAM y 2 de Madrid capital)
                </div>
              </div>
              <button className="modal-close" onClick={() => setHolidaysModal(false)}>
                ✕
              </button>
            </div>

            <div className={`holidays-meta-card ${(summary?.isOfficialHolidays ?? holidaysMeta.isOfficial) ? 'official' : 'estimated'}`}>
              <div className="holidays-meta-info">
                <div className="holidays-meta-title">
                  {(summary?.isOfficialHolidays ?? holidaysMeta.isOfficial) ? (
                    <span>✅ <strong>Calendario Oficial Publicado</strong></span>
                  ) : (
                    <span>🟡 <strong>Calendario Estimado</strong> (Pendiente de publicación en BOCM)</span>
                  )}
                </div>
                <div className="holidays-meta-source">
                  <span><strong>Fuente:</strong> {summary?.holidaysSource || holidaysMeta.source}</span>
                  {(summary?.holidaysUrl || holidaysMeta.url) && (
                    <a
                      href={summary?.holidaysUrl || holidaysMeta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="holidays-source-link"
                    >
                      Ver publicación oficial madrid.es ↗
                    </a>
                  )}
                </div>
                <div className="holidays-meta-desc">
                  {(summary?.isOfficialHolidays ?? holidaysMeta.isOfficial)
                    ? `Días festivos oficiales fijados por la Comunidad de Madrid y el Ayuntamiento de Madrid para el municipio de Madrid.`
                    : `Estimación normativa basada en Estatuto de los Trabajadores, cómputo pascual y fiestas tradicionales (San Isidro y Almudena). Se actualizará automáticamente a oficial cuando el BOCM lo ratifique.`
                  }
                </div>
              </div>
              <div className="holidays-meta-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                  onClick={handleSyncHolidays}
                  title="Volver a consultar y sincronizar festivos de Madrid"
                >
                  🔄 Actualizar
                </button>
              </div>
            </div>

            <div className="info-banner" style={{ marginTop: 4, marginBottom: 14 }}>
              📌 Los festivos en sábado generan derecho a días recuperables ({saturdayHolidaysCount} en {year}).
            </div>

            <div className="modal-body-scroll">
              <table className="holidays-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Día</th>
                    <th>Denominación oficial</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map(h => {
                    const [y, m, d] = h.date.split('-').map(Number)
                    const dt = new Date(y, m - 1, d)
                    const weekday = dt.toLocaleDateString('es-ES', { weekday: 'long' })
                    const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
                    return (
                      <tr key={h.date}>
                        <td style={{ fontWeight: 600 }}>{formattedDate}</td>
                        <td className="badge-weekday">
                          {weekday.charAt(0).toUpperCase() + weekday.slice(1)}
                        </td>
                        <td style={{ color: '#fff' }}>
                          {h.name}
                          {h.source && (
                            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>
                              {h.source}
                            </span>
                          )}
                        </td>
                        <td>
                          {h.isSaturday ? (
                            <span className="badge-sat">⚠️ En Sábado (+1 cupo)</span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: 11 }}>Laborable libre</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setHolidaysModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span>{t.icon}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
