import { useEffect, useRef, useState } from 'react';
import { Check, Languages, Moon, RotateCcw, Sun } from 'lucide-react';
import { makeWords, type Language } from './content';
import { browserLanguage, messages, type Messages } from './i18n';
import { alignWord, createEngine, finishEngine, getSpeedRank, getStats, type EngineState, type WordResult, typeKey } from './engine';

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
  const [textLanguageMode, setTextLanguageMode] = useState<'auto' | Language>(() => saved('realtype-text-language-mode', 'auto'));
  const [theme, setTheme] = useState<Theme>(() => saved('realtype-theme', 'auto'));
  const [mode, setMode] = useState<Mode>('time');
  const [duration, setDuration] = useState(60);
  const [wordCount, setWordCount] = useState(50);
  const [customCount, setCustomCount] = useState('');
  const [tick, setTick] = useState(0);
  const [engine, setEngine] = useState<EngineState>(() => createEngine(makeWords(initialLanguage, 500)));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const t = messages[locale];
  const textLanguage: Language = textLanguageMode === 'auto' ? locale : textLanguageMode;
  const effectiveCount = mode === 'words' ? Math.min(500, Math.max(1, Number(customCount) || wordCount)) : 500;

  const reset = (_fresh = false) => {
    setEngine(current => {
      const previousOpening = current.words.slice(0, 8).join(' ');
      let words = makeWords(textLanguage, effectiveCount);
      for (let attempt = 0; attempt < 5 && words.slice(0, 8).join(' ') === previousOpening; attempt++) {
        words = makeWords(textLanguage, effectiveCount);
      }
      return createEngine(words);
    });
    setTick(Date.now());
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const restartSameText = () => {
    setEngine(current => createEngine(current.words));
    setTick(Date.now());
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    localStorage.setItem('realtype-locale', locale);
    document.documentElement.lang = locale;
    document.title = locale === 'nl' ? 'RealType — typ zoals je echt typt' : 'RealType — type the way you really type';
  }, [locale]);
  useEffect(() => { localStorage.setItem('realtype-text-language-mode', textLanguageMode); reset(); }, [textLanguage, textLanguageMode, mode, duration, wordCount, customCount]); // eslint-disable-line react-hooks/exhaustive-deps
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
        <label className="locale-picker" aria-label={t.interfaceLanguage}>
          <span aria-hidden="true">{locale === 'nl' ? '🇳🇱' : '🇬🇧'}</span>
          <select value={locale} onChange={e => setLocale(e.target.value as Language)} aria-label={t.interfaceLanguage}>
            <option value="nl">🇳🇱 Nederlands</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </label>
        <ThemeButton theme={theme} setTheme={setTheme} label={t.theme} />
      </div>
    </header>

    <section className="workspace">
      <div className="eyebrow"><Languages size={13}/>{textLanguage === 'nl' ? 'NEDERLANDS' : 'ENGLISH'}<i/> {testLabel.toUpperCase()}</div>
      <Settings locale={locale} textLanguageMode={textLanguageMode} mode={mode} duration={duration} wordCount={wordCount} customCount={customCount} setTextLanguageMode={setTextLanguageMode} setMode={setMode} setDuration={setDuration} setWordCount={setWordCount} setCustomCount={setCustomCount} />
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
      <div className="test-actions">
        <button className="restart restart-primary" onClick={e => { e.stopPropagation(); restartSameText(); }}><RotateCcw size={15}/>{t.restart}</button>
        <button className="restart" onClick={e => { e.stopPropagation(); reset(true); }}>{t.newText}</button>
      </div>
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
  const alignment = alignWord(typed, word, committed);
  return <span ref={activeRef} className={`word ${isActive ? 'active' : ''} ${alignment.extras ? 'has-overflow' : ''} ${committed ? (typed === word ? 'word-correct' : 'word-wrong') : ''}`}>
    {word.split('').map((letter, position) => {
      const state = alignment.states[position];
      const cursor = isActive && position === alignment.cursor && !engine.pendingSpace;
      const extraCount = alignment.extraPositions.filter(at => at === position).length;
      return <span key={position} className={`letter ${state} ${cursor ? 'cursor' : ''}`}>{extraCount > 0 && <span className="extra-marker" aria-hidden="true" data-count={extraCount}/>}<>{letter}</></span>;
    })}
    {alignment.extraPositions.includes(word.length) && <span className="extra-marker end-extra" aria-hidden="true" data-count={alignment.extraPositions.filter(at => at === word.length).length}/>} 
    {isActive && alignment.cursor === word.length && !engine.pendingSpace && <span className="end-cursor"/>}
    {typed.length > word.length && <span className="extra" aria-hidden="true">{typed.slice(word.length)}</span>}
  </span>;
}

function ThemeButton({ theme, setTheme, label }: { theme: Theme; setTheme: (v: Theme) => void; label: string }) {
  const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : undefined;
  return <button className="icon-button theme-button" aria-label={`${label}: ${theme}`} onClick={e => { e.stopPropagation(); setTheme(next[theme]); }} title={`${label}: ${theme}`}>{Icon ? <Icon size={18}/> : <span className="auto-theme"><Sun/><Moon/></span>}</button>;
}

type SettingsProps = { locale:Language;textLanguageMode:'auto'|Language;mode:Mode;duration:number;wordCount:number;customCount:string;setTextLanguageMode:(v:'auto'|Language)=>void;setMode:(v:Mode)=>void;setDuration:(v:number)=>void;setWordCount:(v:number)=>void;setCustomCount:(v:string)=>void };
function Settings(p: SettingsProps) {
  const t = messages[p.locale];
  return <aside className="settings-bar" aria-label={t.settings}>
    <SelectSetting label={t.textLanguage} value={p.textLanguageMode} onChange={v => p.setTextLanguageMode(v as 'auto'|Language)} options={[['auto',`${t.auto} (${p.locale === 'nl' ? 'Nederlands' : 'English'})`],['nl','Nederlands'],['en','English']]} />
    <Setting label={t.mode}><Segment options={[['time',t.time],['words',t.words]]} value={p.mode} setValue={v => p.setMode(v as Mode)}/></Setting>
    {p.mode === 'time'
      ? <SelectSetting label={t.duration} value={String(p.duration)} onChange={v => p.setDuration(Number(v))} options={durationOptions.map(n => [String(n), `${n} ${t.seconds}`])}/>
      : <SelectSetting label={t.wordCount} value={p.customCount ? 'custom' : String(p.wordCount)} onChange={v => { if (v === 'custom') p.setCustomCount(String(p.wordCount)); else { p.setCustomCount(''); p.setWordCount(Number(v)); } }} options={[...wordOptions.map(n => [String(n), String(n)]), ['custom',t.custom]]}/>
    }
    {p.mode === 'words' && p.customCount && <label className="custom-count"><span>{t.wordCount}</span><input aria-label={t.wordCount} type="number" min="1" max="500" value={p.customCount} onChange={e => p.setCustomCount(String(Math.min(500, Math.max(1, Number(e.target.value) || 1))))}/></label>}
  </aside>;
}
function Setting({ label, children }: { label:string; children:React.ReactNode }) { return <div className="setting"><label>{label}</label>{children}</div>; }
function SelectSetting({ label, value, onChange, options }: {label:string;value:string;onChange:(v:string)=>void;options:string[][]}) { return <label className="select-setting"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(([key,text]) => <option value={key} key={key}>{text}</option>)}</select></label>; }
function Segment({ options, value, setValue }: { options:(string[])[];value:string;setValue:(v:string)=>void }) { return <div className="segments">{options.map(([key,label]) => <button className={value === key ? 'active' : ''} onClick={() => setValue(key)} key={key}>{value === key && <Check size={12}/>} {label}</button>)}</div>; }
function Results({ stats, t, reset }: { stats:ReturnType<typeof getStats>;t:Messages;reset:()=>void }) { const rank = t[getSpeedRank(stats.wpm) as keyof Messages]; return <div className="result-backdrop"><dialog open className="result-card" aria-labelledby="result-title"><div className="result-check"><Check/></div><span>{t.completed}</span><h2 id="result-title">{t.result}</h2><div className="result-main"><strong>{stats.wpm}</strong><span>{t.wpm}</span><div className="speed-rank">{t.speedRank}: <b>{rank}</b></div></div><div className="result-grid"><Metric value={stats.cpm} label={t.cpm}/><Metric value={`${stats.accuracy}%`} label={t.accuracy}/><Metric value={stats.correctWords} label={t.correctWords}/><Metric value={stats.incorrectWords} label={t.incorrectWords}/></div><button className="primary-button" onClick={reset}><RotateCcw size={16}/>{t.again}</button></dialog></div>; }
