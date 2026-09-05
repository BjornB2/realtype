import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages, Moon, RotateCcw, Settings2, Sun, X } from 'lucide-react';
import { makeWords, type Language } from './content';
import { browserLanguage, messages, type Messages } from './i18n';
import { createEngine, finishEngine, getStats, type EngineState, type WordResult, typeKey } from './engine';

type Mode = 'time' | 'words';
type Theme = 'auto' | 'light' | 'dark';
const durationOptions = [15, 30, 60, 120];
const wordOptions = [10, 25, 50, 100, 250, 500];

function saved<T extends string>(key: string, fallback: T): T {
  return (localStorage.getItem(key) as T | null) ?? fallback;
}

export default function App() {
  const initialLanguage = browserLanguage();
  const [locale, setLocale] = useState<Language>(() => saved('realtype-locale', initialLanguage));
  const [textLanguage, setTextLanguage] = useState<Language>(() => saved('realtype-text-language', initialLanguage));
  const [theme, setTheme] = useState<Theme>(() => saved('realtype-theme', 'auto'));
  const [mode, setMode] = useState<Mode>('time');
  const [duration, setDuration] = useState(60);
  const [wordCount, setWordCount] = useState(50);
  const [customCount, setCustomCount] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [engine, setEngine] = useState<EngineState>(() => createEngine(makeWords(initialLanguage, 500)));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const t = messages[locale];
  const effectiveCount = mode === 'words' ? Math.min(500, Math.max(1, Number(customCount) || wordCount)) : 500;

  const reset = (fresh = false) => {
    setEngine(createEngine(makeWords(textLanguage, effectiveCount, fresh ? Math.random : () => .5)));
    setTick(Date.now());
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    localStorage.setItem('realtype-locale', locale);
    document.documentElement.lang = locale;
    document.title = locale === 'nl' ? 'RealType — typ zoals je echt typt' : 'RealType — type the way you really type';
  }, [locale]);
  useEffect(() => { localStorage.setItem('realtype-text-language', textLanguage); reset(); }, [textLanguage, mode, duration, wordCount, customCount]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    localStorage.setItem('realtype-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (engine.status !== 'running') return;
    const timer = window.setInterval(() => setTick(Date.now()), 100);
    return () => clearInterval(timer);
  }, [engine.status]);
  useEffect(() => {
    if (mode === 'time' && engine.status === 'running' && engine.startedAt && tick - engine.startedAt >= duration * 1000) {
      setEngine(current => finishEngine(current, current.startedAt! + duration * 1000));
    }
  }, [tick, duration, mode, engine.status, engine.startedAt]);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [engine.index]);

  const stats = getStats(engine, tick);
  const remaining = mode === 'time' ? Math.max(0, Math.ceil((duration * 1000 - stats.elapsedMs) / 1000)) : Math.max(0, effectiveCount - engine.results.length);
  const testLabel = mode === 'time' ? `${duration} ${t.seconds}` : `${effectiveCount} ${t.words.toLowerCase()}`;

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Tab' || event.key === 'Enter') return;
    event.preventDefault();
    setEngine(current => typeKey(current, event.key));
  };

  return <main className="shell">
    <header className="topbar">
      <button className="brand" onClick={() => reset(true)} aria-label="RealType"><span>R</span><span className="brand-name">realtype</span></button>
      <p className="tagline">{t.tagline}</p>
      <div className="header-actions">
        <ThemeButton theme={theme} setTheme={setTheme} label={t.theme} />
        <button className={`icon-button ${settingsOpen ? 'selected' : ''}`} aria-label={t.settings} aria-expanded={settingsOpen} onClick={e => { e.stopPropagation(); setSettingsOpen(v => !v); }}><Settings2 size={18}/></button>
      </div>
    </header>

    {settingsOpen && <Settings locale={locale} textLanguage={textLanguage} mode={mode} duration={duration} wordCount={wordCount} customCount={customCount} setLocale={setLocale} setTextLanguage={setTextLanguage} setMode={setMode} setDuration={setDuration} setWordCount={setWordCount} setCustomCount={setCustomCount} close={() => setSettingsOpen(false)} />}

    <section className="workspace">
      <div className="eyebrow"><Languages size={13}/>{textLanguage === 'nl' ? 'NEDERLANDS' : 'ENGLISH'}<i/> {testLabel.toUpperCase()}</div>
      <div className="stats" aria-live="polite">
        <Metric value={remaining} label={mode === 'time' ? 'sec' : t.words.toLowerCase()} />
        <Metric value={stats.wpm} label={t.wpm} />
        <Metric value={`${stats.accuracy}%`} label={t.accuracy} />
        <Metric value={stats.cpm} label={t.cpm} subtle />
      </div>

      <div className={`text-panel ${engine.status === 'running' ? 'is-running' : ''}`} onClick={() => inputRef.current?.focus()} onKeyDown={() => inputRef.current?.focus()} role="button" tabIndex={-1}>
        <textarea ref={inputRef} className="capture-input" onKeyDown={onKeyDown} aria-label={t.start} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <div className="passage" aria-hidden="true">
          {engine.words.map((word, index) => <Word key={`${index}-${word}`} word={word} index={index} engine={engine} activeRef={index === engine.index ? activeRef : undefined}/>) }
        </div>
        <div className="typed-line">
          <span>{t.typed}</span>
          <strong>{engine.current || <em>{t.start}</em>}{engine.pendingSpace && <span className="pending-space">·</span>}</strong>
          {engine.pendingSpace && <small>{t.ready}</small>}
        </div>
      </div>
      <button className="restart" onClick={e => { e.stopPropagation(); reset(true); }}><RotateCcw size={15}/>{t.newText}</button>
    </section>

    {engine.status === 'finished' && <Results stats={stats} t={t} reset={() => reset(true)} />}
    <footer>{t.privacy}</footer>
  </main>;
}

function Metric({ value, label, subtle = false }: { value: string | number; label: string; subtle?: boolean }) {
  return <div className={subtle ? 'subtle' : ''}><strong>{value}</strong><span>{label}</span></div>;
}

function Word({ word, index, engine, activeRef }: { word: string; index: number; engine: EngineState; activeRef?: React.Ref<HTMLSpanElement> }) {
  const result: WordResult | undefined = engine.results[index];
  const isActive = index === engine.index && engine.status !== 'finished';
  const typed = result?.typed ?? (isActive ? engine.current : '');
  const committed = Boolean(result);
  return <span ref={activeRef} className={`word ${isActive ? 'active' : ''} ${typed.length > word.length ? 'has-overflow' : ''} ${committed ? (typed === word ? 'word-correct' : 'word-wrong') : ''}`}>
    {word.split('').map((letter, position) => {
      const input = typed[position];
      const state = input == null ? (committed ? 'missing' : '') : input === letter ? 'correct' : 'incorrect';
      const cursor = isActive && position === typed.length && !engine.pendingSpace;
      return <span key={position} className={`letter ${state} ${cursor ? 'cursor' : ''}`}>{letter}</span>;
    })}
    {isActive && typed.length === word.length && !engine.pendingSpace && <span className="end-cursor"/>}
    {typed.length > word.length && <span className="extra" aria-hidden="true">{typed.slice(word.length)}</span>}
  </span>;
}

function ThemeButton({ theme, setTheme, label }: { theme: Theme; setTheme: (v: Theme) => void; label: string }) {
  const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : undefined;
  return <button className="icon-button theme-button" aria-label={`${label}: ${theme}`} onClick={e => { e.stopPropagation(); setTheme(next[theme]); }} title={`${label}: ${theme}`}>{Icon ? <Icon size={18}/> : <span className="auto-theme"><Sun/><Moon/></span>}</button>;
}

type SettingsProps = { locale:Language;textLanguage:Language;mode:Mode;duration:number;wordCount:number;customCount:string;setLocale:(v:Language)=>void;setTextLanguage:(v:Language)=>void;setMode:(v:Mode)=>void;setDuration:(v:number)=>void;setWordCount:(v:number)=>void;setCustomCount:(v:string)=>void;close:()=>void };
function Settings(p: SettingsProps) {
  const t = messages[p.locale];
  return <aside className="settings-panel" aria-label={t.settings}>
    <div className="settings-title"><strong>{t.settings}</strong><button onClick={p.close} aria-label="Close"><X size={17}/></button></div>
    <Setting label={t.interfaceLanguage}><Segment options={[['nl','Nederlands'],['en','English']]} value={p.locale} setValue={v => p.setLocale(v as Language)}/></Setting>
    <Setting label={t.textLanguage}><Segment options={[['nl','Nederlands'],['en','English']]} value={p.textLanguage} setValue={v => p.setTextLanguage(v as Language)}/></Setting>
    <Setting label={t.mode}><Segment options={[['time',t.time],['words',t.words]]} value={p.mode} setValue={v => p.setMode(v as Mode)}/></Setting>
    {p.mode === 'time' ? <Setting label={t.duration}><Segment options={durationOptions.map(n => [String(n), `${n}s`])} value={String(p.duration)} setValue={v => p.setDuration(Number(v))}/></Setting> : <Setting label={t.wordCount}>
      <div className="word-options">{wordOptions.map(n => <button className={!p.customCount && p.wordCount === n ? 'active' : ''} onClick={() => { p.setCustomCount(''); p.setWordCount(n); }} key={n}>{n}</button>)}<label><input type="number" min="1" max="500" placeholder={t.custom} value={p.customCount} onChange={e => p.setCustomCount(e.target.value.replace(/\D/g,'').slice(0,3))}/><ChevronDown size={13}/></label></div>
    </Setting>}
  </aside>;
}
function Setting({ label, children }: { label:string; children:React.ReactNode }) { return <div className="setting"><label>{label}</label>{children}</div>; }
function Segment({ options, value, setValue }: { options:(string[])[];value:string;setValue:(v:string)=>void }) { return <div className="segments">{options.map(([key,label]) => <button className={value === key ? 'active' : ''} onClick={() => setValue(key)} key={key}>{value === key && <Check size={12}/>} {label}</button>)}</div>; }
function Results({ stats, t, reset }: { stats:ReturnType<typeof getStats>;t:Messages;reset:()=>void }) { return <div className="result-backdrop"><dialog open className="result-card" aria-labelledby="result-title"><div className="result-check"><Check/></div><span>{t.completed}</span><h2 id="result-title">{t.result}</h2><div className="result-main"><strong>{stats.wpm}</strong><span>{t.wpm}</span></div><div className="result-grid"><Metric value={stats.cpm} label={t.cpm}/><Metric value={`${stats.accuracy}%`} label={t.accuracy}/><Metric value={stats.correctWords} label={t.correctWords}/><Metric value={stats.incorrectWords} label={t.incorrectWords}/></div><button className="primary-button" onClick={reset}><RotateCcw size={16}/>{t.again}</button></dialog></div>; }
