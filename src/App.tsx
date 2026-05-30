import React, { useMemo, useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, CalendarDays, Dumbbell, Footprints, HeartPulse, Scale, ShieldAlert, Utensils, Droplets, Moon, CheckCircle2, Clock, Pill, ListTodo, BookOpen, ChevronDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

const goals = [
  { label: "Start", value: "90 kg", icon: Scale },
  { label: "Wzrost", value: "187 cm", icon: Activity },
  { label: "Cel do 1 września", value: "78-82 kg", icon: CalendarDays },
  { label: "Tempo", value: "0,7-1,0 kg / tydz.", icon: CheckCircle2 }
]

const dailyRules = [
  { title: "Kalorie", value: "1800-2000 kcal", detail: "Nie schodź niżej bez lekarza, szczególnie na Ozempicu.", icon: Utensils },
  { title: "Białko", value: "160-190 g", detail: "Każdy posiłek ma mieć solidne źródło białka.", icon: Activity },
  { title: "Kroki", value: "12 000-16 000", detail: "To jest główne spalanie poza dietą.", icon: Footprints },
  { title: "Woda", value: "10-14 szklanek", detail: "1 szklanka = 250 ml. Baza to 11 szklanek, więcej przy biegu i upale.", icon: Droplets },
  { title: "Sen", value: "7-8 h", detail: "Bez snu głód rośnie, a trening siada.", icon: Moon },
  { title: "Zakazy", value: "0 alkoholu", detail: "Zero słodkich napojów, fast foodów i podjadania.", icon: ShieldAlert }
]

const daySchedule = [
  { time: "07:00", title: "Pobudka", text: "Waga po toalecie, szklanka wody, 5 minut światła dziennego." },
  { time: "08:00", title: "Śniadanie", text: "Białko + owoc + mała porcja węgli. Dobry moment na kreatynę." },
  { time: "10:30", title: "Ruch", text: "20-30 minut spaceru albo część kroków z dnia." },
  { time: "12:30", title: "Obiad", text: "Największy posiłek. Białko, warzywa, ryż albo ziemniaki." },
  { time: "16:30", title: "Mały posiłek", text: "Skyr, twaróg, shake białkowy albo jaja. Ma pomóc dobić białko." },
  { time: "18:00", title: "Trening", text: "Hantle albo bieg. Nie trenuj zaraz po dużym posiłku." },
  { time: "20:00", title: "Kolacja", text: "Białko + warzywa. Lżej, bez tłustego jedzenia na noc." },
  { time: "22:15", title: "Wyciszenie", text: "Ekrany niżej, ciemniejsze światło, przygotowanie posiłków na jutro." },
  { time: "23:00", title: "Sen", text: "Cel: 7-8 godzin. Bez snu redukcja będzie cięższa." }
]

const timingRules = [
  "Gdy wstajesz o 09:00, przesuń cały plan o 2 godziny.",
  "Ostatni większy posiłek jedz 2-3 godziny przed snem.",
  "Przy nudnościach po Ozempicu jedz mniejsze porcje i wolniej.",
  "Nie rób treningu po dużym, tłustym posiłku.",
  "Kawę trzymaj najlepiej do 14:00-15:00, żeby nie rozwalić snu."
]

const hydrationPlan = [
  { time: "07:00", amount: "2 szklanki", text: "Po przebudzeniu. To daje 500 ml na start dnia." },
  { time: "08:00-12:30", amount: "3 szklanki", text: "Popijaj między śniadaniem a obiadem." },
  { time: "12:30-16:30", amount: "2 szklanki", text: "Jedna do obiadu, jedna po obiedzie." },
  { time: "16:30-19:00", amount: "2 szklanki", text: "Przed treningiem i w trakcie. Przy biegu dodaj jedną." },
  { time: "20:00-22:15", amount: "2 szklanki", text: "Do kolacji i wieczorem. Nie pij litra tuż przed snem." }
]

const waterRules = [
  "Baza: 11 szklanek dziennie, czyli około 2,75 l.",
  "Dzień z biegiem: dodaj 2-3 szklanki.",
  "Upał albo mocne pocenie: dodaj 2-4 szklanki.",
  "Mocz ma być jasnożółty. Ciemny mocz to sygnał, że pijesz za mało.",
  "Nie pij wszystkiego naraz. Rozbij wodę na cały dzień."
]

const trackerChecks = [
  "Waga wpisana",
  "Kalorie wpisane",
  "Białko wpisane",
  "Woda uzupełniona",
  "Kroki wpisane",
  "Trening zrobiony",
  "Bieg albo spacer zrobiony",
  "Kreatyna wzięta",
  "Bez alkoholu",
  "Bez fast foodów",
  "Sen zaplanowany"
]

type DailyLog = {
  wakeTime: string
  sleepTime: string
  weight: string
  waist: string
  waterGlasses: number
  kcal: string
  protein: string
  steps: string
  workout: string
  run: string
  mood: string
  notes: string
  checks: Record<string, boolean>
}

const createDefaultDailyLog = (): DailyLog => ({
  wakeTime: "",
  sleepTime: "",
  weight: "",
  waist: "",
  waterGlasses: 0,
  kcal: "",
  protein: "",
  steps: "",
  workout: "",
  run: "",
  mood: "",
  notes: "",
  checks: trackerChecks.reduce((acc, item) => ({ ...acc, [item]: false }), {} as Record<string, boolean>)
})

const calculateCompletion = (log: DailyLog) => {
  const checkedPoints = Object.values(log.checks || {}).filter(Boolean).length
  const filledMetrics = [log.wakeTime, log.sleepTime, log.weight, log.kcal, log.protein, log.steps].filter(Boolean).length
  const waterPoint = log.waterGlasses >= 11 ? 1 : 0
  return Math.round(((checkedPoints + filledMetrics + waterPoint) / (trackerChecks.length + 7)) * 100)
}

function MetricInput({ label, value, type = "text", suffix, placeholder, onChange }: { label: string; value: string; type?: string; suffix?: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-2xl bg-zinc-100 p-4">
      <span className="text-sm font-medium text-zinc-600">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base font-semibold outline-none transition focus:border-zinc-900"
        />
        {suffix && <span className="text-sm font-semibold text-zinc-500">{suffix}</span>}
      </div>
    </label>
  )
}

function CustomSelect({ label, value, options, onChange }: { label: string; value: string; options: {value: string, label: string}[]; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-2xl bg-zinc-100 p-4">
      <span className="text-sm font-medium text-zinc-600">{label}</span>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-zinc-300 bg-white px-3 py-2 pr-10 text-base font-semibold text-zinc-900 outline-none transition focus:border-zinc-900"
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500">
          <ChevronDown size={18} />
        </div>
      </div>
    </label>
  )
}

const supplements = [
  { name: "Kreatyna", dose: "3-5 g dziennie", when: "Rano ze śniadaniem albo po treningu", note: "Bez fazy ładowania. Pij wodę. Priorytet to regularność." },
  { name: "Ashwagandha", dose: "Opcjonalnie 300 mg", when: "Wieczorem po kolacji", note: "Nie zaczynaj w dniu podbicia dawki Ozempicu. Odstaw przy bólu brzucha, senności, wysypce albo złym samopoczuciu." }
]

const week = [
  { day: "Poniedziałek", main: "Trening A", extra: "12k kroków" },
  { day: "Wtorek", main: "Bieg 5-7 km", extra: "spokojne tempo" },
  { day: "Środa", main: "Trening B", extra: "12k kroków" },
  { day: "Czwartek", main: "Kroki", extra: "14k-16k kroków" },
  { day: "Piątek", main: "Trening A", extra: "12k kroków" },
  { day: "Sobota", main: "Bieg 7-10 km", extra: "albo długi spacer" },
  { day: "Niedziela", main: "Trening B albo spacer", extra: "regeneracja aktywna" }
]

const workoutA = [
  "Goblet squat, 4 x 10-20",
  "Rumuński martwy ciąg z hantlami, 4 x 8-15",
  "Wyciskanie hantli na podłodze, 4 x 8-15",
  "Wiosłowanie hantlą jednorącz, 4 x 10-20 na stronę",
  "Wyciskanie hantli nad głowę, 3 x 8-15",
  "Plank, 3 x 45-90 s"
]

const workoutB = [
  "Bułgarskie przysiady, 4 x 8-15 na nogę",
  "Hip thrust z hantlem, 4 x 12-25",
  "Pompki, 4 serie blisko upadku",
  "Wiosłowanie hantlami w opadzie, 4 x 10-20",
  "Uginanie ramion z hantlami, 3 x 10-20",
  "Francuskie wyciskanie albo pompki wąsko, 3 x 10-20",
  "Unoszenie nóg leżąc, 3 x 10-20"
]

const meals = [
  { name: "Śniadanie", text: "Skyr 300 g, owoc, 30 g płatków" },
  { name: "Obiad", text: "200-250 g kurczaka, ryby, indyka albo tofu, 300-500 g warzyw, ryż albo ziemniaki" },
  { name: "Kolacja", text: "Twaróg, jaja albo tuńczyk, warzywa, mała porcja węgli" },
  { name: "Ratunek", text: "Shake białkowy, gdy brakuje białka" }
]

const checklist = [
  "Kalorie wpisane",
  "160 g białka dobite",
  "12k kroków zrobione",
  "Woda wypita",
  "Bez alkoholu",
  "Bez fast foodów",
  "Sen minimum 7 h"
]

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full bg-zinc-900"
      />
    </div>
  )
}

function SectionTitle({ icon: Icon, title, subtitle, darkTheme }: { icon: any; title: string; subtitle?: string; darkTheme?: boolean }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className={`rounded-2xl p-2 ${darkTheme ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"}`}>
        <Icon size={20} />
      </div>
      <div>
        <h2 className={`text-xl font-semibold tracking-tight ${darkTheme ? "text-white" : "text-zinc-950"}`}>{title}</h2>
        {subtitle && <p className={`text-sm ${darkTheme ? "text-zinc-400" : "text-zinc-600"}`}>{subtitle}</p>}
      </div>
    </div>
  )
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 ${
        active ? "bg-zinc-900 text-white shadow-md scale-105" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function DateStrip({ selectedDate, onSelect, monthData, startDate }: { selectedDate: string, onSelect: (d: string) => void, monthData: Record<string, number>, startDate: string }) {
  const dates = useMemo(() => {
    const list = []
    const start = new Date(startDate)
    // Generujemy dni od wybranej daty startu aż do końca planu (np. 123 dni)
    for (let i = 0; i <= 123; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      list.push(d.toISOString().slice(0, 10))
    }
    return list
  }, [startDate])

  const daysOfWeek = ["Niedz", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"]
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (containerRef.current) {
      const selectedEl = containerRef.current.querySelector('[data-selected="true"]')
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [selectedDate])

  return (
    <div className="flex w-full overflow-x-auto pb-4 pt-2 [&::-webkit-scrollbar]:hidden" ref={containerRef} style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-3 px-2">
        {dates.map((dateStr) => {
          const dateObj = new Date(dateStr)
          const dayName = daysOfWeek[dateObj.getDay()]
          const dayNum = dateObj.getDate()
          const isSelected = dateStr === selectedDate
          const completion = monthData[dateStr] || 0
          
          let ringClass = "border-transparent"
          if (completion > 80) ringClass = "border-emerald-500"
          else if (completion > 40) ringClass = "border-amber-400"
          else if (completion > 0) ringClass = "border-zinc-300"
          else if (dateStr < new Date().toISOString().slice(0, 10)) ringClass = "border-zinc-200/60"

          return (
            <button
              key={dateStr}
              data-selected={isSelected}
              onClick={() => onSelect(dateStr)}
              className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 transition-all ${
                isSelected 
                  ? "bg-zinc-900 text-white shadow-lg border-zinc-900 scale-105" 
                  : `bg-white text-zinc-600 hover:bg-zinc-50 ${ringClass}`
              }`}
            >
              <span className={`text-xs font-medium uppercase tracking-wider ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                {dayName}
              </span>
              <span className={`mt-1 text-xl font-bold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                {dayNum}
              </span>
              <div className="mt-2 h-1.5 w-1.5 rounded-full" 
                   style={{ backgroundColor: completion > 80 ? '#10b981' : completion > 40 ? '#fbbf24' : completion > 0 ? '#d4d4d8' : 'transparent' }} 
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

type TabType = 'dziennik' | 'plan' | 'wiedza'

export default function PlanRedukcjiDoWrzesnia() {
  const getToday = () => new Date().toISOString().slice(0, 10)

  const [activeTab, setActiveTab] = useState<TabType>('dziennik')
  const [checked, setChecked] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(getToday)
  const [dailyLog, setDailyLog] = useState<DailyLog>(createDefaultDailyLog())
  const [monthData, setMonthData] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  const [planStartDate, setPlanStartDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('planStartDate') || '2026-05-30'
    }
    return '2026-05-30'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('planStartDate', planStartDate)
    }
  }, [planStartDate])

  // Fetch all recent data for the calendar strip
  useEffect(() => {
    const fetchMonthData = async () => {
      const { data } = await supabase
        .from('daily_logs')
        .select('date, data')
        .order('date', { ascending: false })
        .limit(30)
      
      if (data) {
        const summary: Record<string, number> = {}
        data.forEach((row: any) => {
          summary[row.date] = calculateCompletion({
            ...createDefaultDailyLog(),
            ...row.data,
            checks: { ...createDefaultDailyLog().checks, ...(row.data.checks || {}) }
          })
        })
        setMonthData(summary)
      }
    }
    fetchMonthData()
  }, [])

  // Fetch selected day from Supabase
  useEffect(() => {
    let active = true
    const fetchLog = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('daily_logs')
        .select('data')
        .eq('date', selectedDate)
        .single()
      
      if (active) {
        if (data && data.data) {
          setDailyLog({
            ...createDefaultDailyLog(),
            ...data.data,
            checks: {
              ...createDefaultDailyLog().checks,
              ...(data.data.checks || {})
            }
          })
        } else {
          setDailyLog(createDefaultDailyLog())
        }
        setIsLoading(false)
      }
    }
    fetchLog()
    return () => { active = false }
  }, [selectedDate])

  // Save to Supabase (debounced)
  useEffect(() => {
    if (isLoading) return
    
    const handler = setTimeout(async () => {
      await supabase
        .from('daily_logs')
        .upsert({ date: selectedDate, data: dailyLog })
      
      // Update local month summary immediately so the calendar dot updates
      setMonthData(prev => ({
        ...prev,
        [selectedDate]: calculateCompletion(dailyLog)
      }))
    }, 1000)

    return () => clearTimeout(handler)
  }, [selectedDate, dailyLog, isLoading])

  const completion = useMemo(() => Math.round((checked.length / checklist.length) * 100), [checked])
  const dailyCompletion = useMemo(() => calculateCompletion(dailyLog), [dailyLog])

  const updateDailyLog = (field: keyof DailyLog, value: string | number) => {
    setDailyLog((current) => ({ ...current, [field]: value }))
  }

  const changeDate = (date: string) => {
    setSelectedDate(date)
  }

  const toggleDailyCheck = (item: string) => {
    setDailyLog((current) => ({
      ...current,
      checks: {
        ...current.checks,
        [item]: !current.checks[item]
      }
    }))
  }

  const setWaterGlasses = (next: number) => {
    setDailyLog((current) => ({ ...current, waterGlasses: Math.max(0, Math.min(24, next)) }))
  }

  const resetDailyLog = () => {
    setDailyLog(createDefaultDailyLog())
  }

  const toggle = (item: string) => {
    setChecked((current) =>
      current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
    )
  }

  // --- RENDER FUNCTIONS FOR EACH TAB ---

  const renderDziennik = () => (
    <motion.div
      key="dziennik"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-zinc-950 p-6 text-white shadow-xl md:p-8"
      >
        <div className="grid gap-6 md:grid-cols-[1.4fr_0.6fr] md:items-end">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-zinc-400">Plan redukcji</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Brzuch do września</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              Twój dziennik. Trzymaj dyscyplinę, kontroluj miskę i postępy!
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
            <div className="text-sm text-zinc-300">Najważniejsza zasada</div>
            <div className="mt-2 text-2xl font-bold">Rygor, nie głodówka</div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Ozempic zmniejsza apetyt. Priorytet to białko, woda, sen i trening oporowy.
            </p>
          </div>
        </div>
      </motion.header>

      {/* Date Strip Calendar */}
      <DateStrip selectedDate={selectedDate} onSelect={changeDate} monthData={monthData} startDate={planStartDate} />

      <Card className="rounded-3xl border-0 shadow-md mt-2">
        <CardContent className="p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <SectionTitle icon={ListTodo} title="Dziennik dnia" subtitle="Automatyczny zapis w chmurze." />
            {/* Native date input removed in favor of DateStrip */}
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Wypełnienie dziennika</span>
              <span className="font-semibold">{dailyCompletion}%</span>
            </div>
            <ProgressBar value={dailyCompletion} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricInput label="O której wstałem" type="time" value={dailyLog.wakeTime} onChange={(value) => updateDailyLog("wakeTime", value)} />
            <MetricInput label="O której idę spać" type="time" value={dailyLog.sleepTime} onChange={(value) => updateDailyLog("sleepTime", value)} />
            <MetricInput label="Waga rano" type="number" suffix="kg" placeholder="90.0" value={dailyLog.weight} onChange={(value) => updateDailyLog("weight", value)} />
            <MetricInput label="Pas" type="number" suffix="cm" placeholder="np. 96" value={dailyLog.waist} onChange={(value) => updateDailyLog("waist", value)} />
            <MetricInput label="Kalorie" type="number" suffix="kcal" placeholder="1800" value={dailyLog.kcal} onChange={(value) => updateDailyLog("kcal", value)} />
            <MetricInput label="Białko" type="number" suffix="g" placeholder="180" value={dailyLog.protein} onChange={(value) => updateDailyLog("protein", value)} />
            <MetricInput label="Kroki" type="number" suffix="kroków" placeholder="12000" value={dailyLog.steps} onChange={(value) => updateDailyLog("steps", value)} />
            <label className="block rounded-2xl bg-zinc-100 p-4">
              <span className="text-sm font-medium text-zinc-600">Woda</span>
              <div className="mt-2 flex items-center gap-2">
                <Button variant="ghost" className="rounded-xl bg-white px-3" onClick={() => setWaterGlasses(dailyLog.waterGlasses - 1)}>-</Button>
                <div className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-center text-base font-bold">{dailyLog.waterGlasses} szkl.</div>
                <Button variant="ghost" className="rounded-xl bg-white px-3" onClick={() => setWaterGlasses(dailyLog.waterGlasses + 1)}>+</Button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Cel bazowy: 11 szklanek.</p>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <CustomSelect
              label="Trening hantlami"
              value={dailyLog.workout}
              onChange={(val) => updateDailyLog("workout", val)}
              options={[
                { value: "", label: "Nie wybrano" },
                { value: "A", label: "Trening A" },
                { value: "B", label: "Trening B" },
                { value: "odpoczynek", label: "Odpoczynek" }
              ]}
            />
            <label className="block rounded-2xl bg-zinc-100 p-4">
              <span className="text-sm font-medium text-zinc-600">Bieg albo spacer</span>
              <input
                value={dailyLog.run}
                placeholder="np. bieg 6 km albo spacer 60 min"
                onChange={(event) => updateDailyLog("run", event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base font-semibold outline-none transition focus:border-zinc-900"
              />
            </label>
            <CustomSelect
              label="Samopoczucie"
              value={dailyLog.mood}
              onChange={(val) => updateDailyLog("mood", val)}
              options={[
                { value: "", label: "Nie wybrano" },
                { value: "super", label: "Super" },
                { value: "ok", label: "OK" },
                { value: "slabo", label: "Słabo" },
                { value: "nudnosci", label: "Nudności" },
                { value: "brak energii", label: "Brak energii" }
              ]}
            />
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {trackerChecks.map((item) => {
              const active = dailyLog.checks[item]
              return (
                <Button
                  key={item}
                  variant="ghost"
                  onClick={() => toggleDailyCheck(item)}
                  className={`h-auto justify-start rounded-2xl p-3 text-left text-sm ${active ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white" : "bg-zinc-100 hover:bg-zinc-200"}`}
                >
                  <CheckCircle2 size={16} className="mr-2 shrink-0" />
                  {item}
                </Button>
              )
            })}
          </div>

          <label className="mt-4 block rounded-2xl bg-zinc-100 p-4">
            <span className="text-sm font-medium text-zinc-600">Notatki</span>
            <textarea
              value={dailyLog.notes}
              placeholder="np. głód 3/10, nudności po obiedzie, dobry trening, mało snu"
              onChange={(event) => updateDailyLog("notes", event.target.value)}
              className="mt-2 min-h-[110px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-medium outline-none transition focus:border-zinc-900"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-zinc-950 p-4 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold">Szybki odczyt dnia</div>
              <p className="mt-1 text-sm text-zinc-300">{dailyLog.weight || "brak wagi"} kg, {dailyLog.kcal || "brak kcal"} kcal, {dailyLog.protein || "brak białka"} g białka, {dailyLog.waterGlasses} szklanek wody.</p>
            </div>
            <Button variant="ghost" onClick={resetDailyLog} className="rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200">Wyczyść dzień</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {goals.map(({ label, value, icon: Icon }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card className="rounded-3xl border-0 shadow-md h-full">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <Icon className="mb-4 text-zinc-700" size={24} />
                <div>
                  <div className="text-sm text-zinc-500">{label}</div>
                  <div className="mt-1 text-2xl font-bold text-zinc-950">{value}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )

  const renderPlan = () => (
    <motion.div
      key="plan"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={CalendarDays} title="Tydzień treningowy" subtitle="4 treningi hantlami, 2 biegi, dużo kroków." />
            <div className="space-y-3">
              {week.map((item) => (
                <div key={item.day} className="grid grid-cols-[110px_1fr] gap-3 rounded-2xl bg-zinc-100 p-4 md:grid-cols-[140px_1fr_1fr]">
                  <div className="font-semibold">{item.day}</div>
                  <div>{item.main}</div>
                  <div className="text-sm text-zinc-600">{item.extra}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={CheckCircle2} title="Checklist na dziś" subtitle="Sprawdź swoje cele codzienne." />
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Wykonanie dnia</span>
                <span className="font-semibold">{completion}%</span>
              </div>
              <ProgressBar value={completion} />
            </div>
            <div className="space-y-2">
              {checklist.map((item) => {
                const active = checked.includes(item)
                return (
                  <Button
                    key={item}
                    variant="ghost"
                    onClick={() => toggle(item)}
                    className={`h-auto w-full justify-start rounded-2xl p-4 text-left ${active ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white" : "bg-zinc-100 hover:bg-zinc-200"}`}
                  >
                    <CheckCircle2 size={18} className="mr-3 shrink-0" />
                    {item}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={Dumbbell} title="Trening A" subtitle="Rób z zapasem 1-2 powtórzeń." />
            <ol className="space-y-3">
              {workoutA.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-2xl bg-zinc-100 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">{index + 1}</span>
                  <span className="leading-7">{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={Dumbbell} title="Trening B" subtitle="Nogi jednostronnie, pompki i dużo wiosłowania." />
            <ol className="space-y-3">
              {workoutB.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-2xl bg-zinc-100 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">{index + 1}</span>
                  <span className="leading-7">{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-0 shadow-md">
        <CardContent className="p-6">
          <SectionTitle icon={Utensils} title="Prosty jadłospis" subtitle="Powtarzalność wygrywa z kombinowaniem." />
          <div className="grid gap-3 md:grid-cols-2">
            {meals.map((meal) => (
              <div key={meal.name} className="rounded-2xl bg-zinc-100 p-5">
                <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{meal.name}</div>
                <p className="mt-2 text-lg font-medium leading-7">{meal.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-zinc-950 p-5 text-white">
            <div className="text-lg font-bold">Reguła progresu</div>
            <p className="mt-2 leading-7 text-zinc-300">
              Gdy zrobisz górny zakres we wszystkich seriach, zwiększ ciężar. Gdy hantle są za lekkie, zwolnij ruch, dodaj pauzę albo przejdź na ćwiczenia jednonóż.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderZasady = () => (
    <motion.div
      key="wiedza"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card className="rounded-3xl border-0 shadow-md">
        <CardContent className="p-6">
          <SectionTitle icon={CalendarDays} title="Ustawienia planu" subtitle="Wybierz, od kiedy zaczynasz redukcję." />
          <label className="block rounded-2xl bg-zinc-100 p-4">
            <span className="text-sm font-medium text-zinc-600">Data startu</span>
            <input
              type="date"
              value={planStartDate}
              onChange={(event) => setPlanStartDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-semibold outline-none transition focus:border-zinc-900"
            />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={Clock} title="Godziny dnia" subtitle="Domyślny rytm. Przesuń całość, jeśli wstajesz później albo wcześniej." />
            <div className="space-y-3">
              {daySchedule.map((item) => (
                <div key={item.time} className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl bg-zinc-100 p-4">
                  <div className="font-mono text-sm font-bold text-zinc-700">{item.time}</div>
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={Pill} title="Suplementy i timing" subtitle="Nie zastępują kalorii, białka, kroków ani snu." />
            <div className="space-y-3">
              {supplements.map((item) => (
                <div key={item.name} className="rounded-2xl bg-zinc-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-bold">{item.name}</div>
                    <div className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">{item.dose}</div>
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-700">{item.when}</div>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-zinc-950 p-4 text-white">
              <div className="font-semibold">Zasady godzin</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                {timingRules.map((rule) => <li key={rule}>• {rule}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-0 shadow-md">
        <CardContent className="p-6">
          <SectionTitle icon={Droplets} title="Woda w szklankach" subtitle="1 szklanka = 250 ml. Cel bazowy: 11 szklanek dziennie." />
          <div className="grid gap-3 md:grid-cols-5">
            {hydrationPlan.map((item) => (
              <div key={item.time} className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-mono text-sm font-bold text-zinc-700">{item.time}</div>
                <div className="mt-2 text-lg font-bold">{item.amount}</div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-zinc-950 p-4 text-white">
            <div className="font-semibold">Zasady nawodnienia</div>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300 md:grid-cols-2">
              {waterRules.map((rule) => <li key={rule}>• {rule}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-md">
        <CardContent className="p-6">
          <SectionTitle icon={Utensils} title="Codzienne zasady" subtitle="Trzymasz je codziennie, także w weekend." />
          <div className="grid gap-3 sm:grid-cols-2">
            {dailyRules.map(({ title, value, detail, icon: Icon }) => (
              <div key={title} className="rounded-2xl bg-zinc-100 p-4">
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-zinc-700" />
                  <span className="text-sm font-medium text-zinc-600">{title}</span>
                </div>
                <div className="mt-2 text-xl font-bold">{value}</div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={Scale} title="Kontrola wyniku" subtitle="Nie oceniaj dnia. Oceniaj średnią tygodniową." />
            <div className="space-y-3">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-semibold">Codziennie rano</div>
                <p className="mt-1 text-zinc-600">Waga po toalecie, bez ubrań.</p>
              </div>
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-semibold">Raz w tygodniu</div>
                <p className="mt-1 text-zinc-600">Średnia wagi z 7 dni, pas na wysokości pępka, zdjęcie przód i bok.</p>
              </div>
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-semibold">Brak spadku przez 14 dni</div>
                <p className="mt-1 text-zinc-600">Odejmij 150 kcal dziennie albo dodaj 3000 kroków dziennie.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-zinc-950 text-white shadow-md">
          <CardContent className="p-6">
            <SectionTitle icon={HeartPulse} title="Ozempic i bezpieczeństwo" subtitle="Trzymaj redukcję ostro, ale rozsądnie." darkTheme />
            <div className="space-y-3 text-zinc-300">
              <p className="leading-7">Nie zmieniaj dawki samodzielnie. Nie łącz głodówki, sauny, folii i mocnego cardio.</p>
              <p className="leading-7">Pilny kontakt z lekarzem: silny ból brzucha, uporczywe wymioty, omdlenia, mało moczu, mocne odwodnienie, ból brzucha promieniujący do pleców.</p>
              <p className="leading-7">Najostrzejsza wersja planu: 1800-2000 kcal, 160-190 g białka, hantle 4 razy w tygodniu, bieganie 2 razy w tygodniu, 12k-16k kroków, zero alkoholu.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-200 text-zinc-950 pb-28">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dziennik' && renderDziennik()}
          {activeTab === 'plan' && renderPlan()}
          {activeTab === 'wiedza' && renderZasady()}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none">
        <div className="pointer-events-auto flex gap-2 rounded-3xl bg-white/70 p-2 backdrop-blur-xl shadow-lg border border-white/50">
          <NavButton active={activeTab === 'dziennik'} onClick={() => setActiveTab('dziennik')} icon={ListTodo} label="Dziennik" />
          <NavButton active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} icon={Dumbbell} label="Trening & Dieta" />
          <NavButton active={activeTab === 'wiedza'} onClick={() => setActiveTab('wiedza')} icon={BookOpen} label="Baza Wiedzy" />
        </div>
      </div>
    </div>
  )
}
