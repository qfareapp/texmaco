import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft,
  ChevronRight, Expand, Eye, EyeOff, Globe2, Mail, Menu, MousePointer2,
  MessageCircle, Minimize, Newspaper, Pause, Play, RotateCcw, Send, ShieldCheck,
  TrainFront, Volume2, VolumeX, X,
} from 'lucide-react';
import { publicApi } from './api';
import { railDomains, segments as defaultSegments, slides as defaultSlides } from './data/slides';

const LOCKED_FROM = 6;
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919147369654';

async function enterImmersiveFullscreen() {
  const root = document.documentElement;
  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
  const requestFullscreen = root.requestFullscreen || root.webkitRequestFullscreen;
  try {
    if (!fullscreenElement && requestFullscreen) await requestFullscreen.call(root);
  } catch {
    return false;
  }
  if (screen.orientation?.lock) {
    try { await screen.orientation.lock('landscape'); return true; }
    catch { /* Some mobile browsers require the user to rotate the device. */ }
  }
  return window.matchMedia('(orientation: landscape)').matches;
}

async function exitImmersiveFullscreen() {
  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
  const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
  if (!fullscreenElement || !exitFullscreen) return false;

  try { screen.orientation?.unlock?.(); }
  catch { /* Exiting fullscreen should still work if orientation unlock is denied. */ }

  try {
    await exitFullscreen.call(document);
    return true;
  } catch {
    return false;
  }
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Texmaco Rail & Engineering">
      <img className="brand-logo" src="/assets/texmaco-logo.png" alt="Texmaco Rail & Engineering Ltd." draggable="false" />
    </div>
  );
}

function Welcome({ onEnter, onStartMusic }) {
  const [starting, setStarting] = useState(false);

  const enter = (fullscreen) => {
    setStarting(true);
    if (fullscreen) {
      // Some mobile browsers keep orientation.lock() pending while the first
      // fullscreen transition is in progress. Do not delay mounting the
      // brochure on that browser-controlled promise or the faded welcome
      // screen can remain visible as a blank page.
      void enterImmersiveFullscreen();
      onStartMusic();
    }
    window.setTimeout(onEnter, 260);
  };

  return (
    <main className={`welcome ${starting ? 'welcome--leaving' : ''}`}>
      <div className="welcome-grid" />
      <div className="welcome-orbit welcome-orbit--one" />
      <div className="welcome-orbit welcome-orbit--two" />
      <header className="welcome-header">
        <Brand />
        <span className="edition">Corporate profile · 2026</span>
      </header>

      <section className="welcome-copy">
        <span className="kicker"><span /> An immersive digital brochure</span>
        <h1>Engineering<br /><em>the way forward.</em></h1>
        <p>Discover the scale, precision and purpose behind one of India’s leading mobility engineering companies.</p>
      </section>

      <div className="welcome-train" aria-hidden="true">
        <span className="train-light" /><span className="train-window w1" /><span className="train-window w2" />
        <span className="train-line" /><span className="rail-line r1" /><span className="rail-line r2" />
      </div>

      <section className="experience-card">
        <div className="experience-icon"><Expand size={22} /></div>
        <div>
          <span>Best experienced in</span>
          <strong>Fullscreen landscape</strong>
          <small>Turn your phone sideways for the full experience.</small>
        </div>
        <button onClick={() => enter(true)}>
          Enter experience <ArrowUpRight size={18} />
        </button>
        <button className="text-button" onClick={() => enter(false)}>Continue in browser</button>
      </section>

      <footer className="welcome-footer">
        <span>Scroll, swipe or use arrow keys to explore</span>
        <MousePointer2 size={15} />
      </footer>
    </main>
  );
}

function SlideArtwork({ slide }) {
  if (slide.image) return <img className="slide-image" src={slide.image} alt={slide.title} />;

  return (
    <div className={`art art--${slide.visual}`} aria-hidden="true">
      <div className="art-sun" />
      <div className="art-horizon" />
      <div className="art-structure"><i /><i /><i /><i /><i /></div>
      <div className="art-train">
        <span className="art-cab"><i /><i /></span>
        <span className="art-car"><i /><i /><i /></span>
        <span className="art-car art-car--two"><i /><i /><i /></span>
      </div>
      <div className="art-tracks"><i /><i /><i /></div>
      {slide.visual === 'map' || slide.visual === 'global' ? (
        <div className="map-points"><i /><i /><i /><i /><i /><i /></div>
      ) : null}
      {slide.visual === 'engineering' ? <div className="gear"><span>360°</span></div> : null}
      {slide.visual === 'people' ? <div className="people"><i /><i /><i /></div> : null}
    </div>
  );
}

function Slide({ slide, active, index }) {
  const isDocument = Boolean(slide.image);
  return (
    <article className={`slide slide--${slide.tone || 'document'} ${isDocument ? 'slide--document' : ''} ${active ? 'slide--active' : ''}`} aria-hidden={!active}>
      <SlideArtwork slide={slide} />
      {!isDocument && <>
        <div className="slide-wash" />
        <div className="slide-content">
          <div className="slide-eyebrow"><span>{String(index + 1).padStart(2, '0')}</span>{slide.eyebrow}</div>
          <h2>{slide.title}</h2>
          <p>{slide.copy}</p>
          <div className="slide-stat"><strong>{slide.stat}</strong><span>{slide.statLabel}</span></div>
        </div>
        <div className="slide-index">{String(index + 1).padStart(2, '0')}</div>
      </>}
    </article>
  );
}

function Sidebar({ current, open, onToggle, onNavigate, unlocked, slides, segments }) {
  const activeSegment = slides[current].segment;
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar-top">
        <Brand compact={!open} />
        <button className="icon-button sidebar-toggle" onClick={onToggle} aria-label={open ? 'Hide chapters' : 'Show chapters'}>
          {open ? <ChevronLeft /> : <Menu />}
        </button>
      </div>
      <div className="chapters-label">{open ? 'Explore' : '—'}</div>
      <nav aria-label="Brochure chapters">
        {segments.map((segment) => {
          const firstIndex = slides.findIndex((slide) => slide.segment === segment.id);
          const isLocked = firstIndex >= LOCKED_FROM && !unlocked;
          return (
            <button
              key={segment.id}
              className={activeSegment === segment.id ? 'active' : ''}
              onClick={() => onNavigate(firstIndex)}
              title={!open ? segment.label : undefined}
            >
              <span className="nav-number">{segment.number}</span>
              {open && <span className="nav-label">{segment.label}</span>}
              {open && isLocked && <span className="nav-lock">•</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        {open && <span>{unlocked ? 'Full brochure unlocked' : 'Preview access'}</span>}
        <div className="access-dot"><span className={unlocked ? 'unlocked' : ''} /></div>
      </div>
    </aside>
  );
}

function AccessGate({ onClose, onSuccess }) {
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ name: '', company: '', domain: '', email: '', phone: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sentCode, setSentCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef([]);
  const successTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(successTimer.current), []);

  const keepFieldVisible = (event) => {
    const field = event.target;
    if (!field.matches('input, select, textarea')) return;
    void exitImmersiveFullscreen();
    window.setTimeout(() => field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }), 280);
  };

  const update = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const submitDetails = async (event) => {
    event.preventDefault();
    const validEmail = /^\S+@\S+\.\S+$/.test(form.email);
    const validPhone = form.phone.replace(/\D/g, '').length >= 8;
    if (!form.name || !form.company || !form.domain || !validEmail || !validPhone) {
      setError('Please complete all fields with valid contact details.');
      return;
    }
    setBusy(true); setError('');
    try {
      const result = await publicApi.requestOtp(form);
      setSentCode(result.demoOtp || '');
      setStep('otp');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const changeOtp = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp]; next[index] = value; setOtp(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };
  const verify = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await publicApi.verifyOtp(form.email, otp.join(''));
      sessionStorage.setItem('texmaco-brochure-access', result.accessToken);
      sessionStorage.setItem('texmaco-brochure-lead', JSON.stringify(result.lead));
      setStep('success');
      successTimer.current = window.setTimeout(onSuccess, 2400);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Unlock full brochure">
      <div className="gate-panel">
        {step !== 'success' && <button className="icon-button gate-close" onClick={onClose} aria-label="Close"><X /></button>}
        <div className="gate-brand"><Brand /></div>
        <div className="gate-progress">
          <span className="done"><Check size={12} /></span><i className={step !== 'details' ? 'done' : ''} />
          <span className={step !== 'details' ? 'done' : ''}>{step === 'success' ? <Check size={12} /> : '2'}</span>
        </div>

        {step === 'details' ? (
          <>
            <div className="gate-heading">
              <span>Continue the journey</span>
              <h3>Unlock the full brochure</h3>
              <p>Tell us a little about yourself to explore our complete capabilities.</p>
            </div>
            <form onSubmit={submitDetails} onFocusCapture={keepFieldVisible} className="lead-form">
              <label><span>Your name</span><input name="name" value={form.name} onChange={update} placeholder="e.g. Arjun Mehta" /></label>
              <label><span>Company name</span><input name="company" value={form.company} onChange={update} placeholder="Your organisation" /></label>
              <label className="full"><span>Area of interest</span><select name="domain" value={form.domain} onChange={update}><option value="">Select a rail domain</option>{railDomains.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Work email</span><input name="email" type="email" value={form.email} onChange={update} placeholder="you@company.com" /></label>
              <label><span>Phone number</span><input name="phone" type="tel" value={form.phone} onChange={update} placeholder="+91 98765 43210" /></label>
              {error && <p className="form-error full">{error}</p>}
              <button className="primary-button full" type="submit" disabled={busy}>{busy ? 'Sending…' : <>Send verification code <ArrowRight size={17} /></>}</button>
            </form>
            <p className="privacy"><ShieldCheck size={14} /> Your details are secure and will only be used to respond to your interest.</p>
          </>
        ) : step === 'otp' ? (
          <>
            <div className="gate-heading otp-heading">
              <div className="mail-orbit"><Mail /></div>
              <span>One quick step</span>
              <h3>Check your inbox</h3>
              <p>Enter the 6-digit verification code sent to <strong>{form.email}</strong>.</p>
            </div>
            <form onSubmit={verify} onFocusCapture={keepFieldVisible} className="otp-form">
              <div className="otp-fields">
                {otp.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node; }} value={digit} onChange={(event) => changeOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !digit && index) refs.current[index - 1]?.focus(); }} inputMode="numeric" maxLength="1" aria-label={`Digit ${index + 1}`} />)}
              </div>
              {sentCode && <div className="demo-code">Development verification code: <strong>{sentCode}</strong></div>}
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Verifying…' : <>Verify &amp; continue <ArrowRight size={17} /></>}</button>
              <button className="resend" type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const result = await publicApi.requestOtp(form); setSentCode(result.demoOtp || ''); setOtp(['','','','','','']); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>Resend code</button>
            </form>
          </>
        ) : (
          <div className="unlock-success" role="status" aria-live="assertive">
            <div className="unlock-celebration">
              <span><Check /></span>
              <i /><i /><i /><i /><i /><i />
            </div>
            <span className="unlock-kicker">Access confirmed</span>
            <h3>You have successfully unlocked the full brochure</h3>
            <p>Welcome to the complete Texmaco experience.</p>
            <div className="unlock-loader"><i /></div>
          </div>
        )}
      </div>
      <div className="gate-preview">
        <div className="preview-art"><TrainFront /><span /><span /><span /></div>
        <div><span>Beyond the preview</span><strong>Six more stories of<br />engineering excellence.</strong></div>
      </div>
    </div>
  );
}

function WhatsAppChat({ slide, segmentLabel }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const continueOnWhatsApp = (event) => {
    event.preventDefault();
    const message = query.trim();
    if (!message) return;
    let visitor = null;
    try { visitor = JSON.parse(sessionStorage.getItem('texmaco-brochure-lead')); } catch { /* Optional visitor context. */ }
    const context = [
      'Hello Texmaco team,',
      '',
      message,
      '',
      `Brochure section: ${segmentLabel || 'General enquiry'}`,
      `Slide: ${slide?.title || 'Texmaco brochure'}`,
      visitor?.name ? `Name: ${visitor.name}` : '',
      visitor?.email ? `Email: ${visitor.email}` : '',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(context)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`whatsapp-widget ${open ? 'whatsapp-widget--open' : ''}`} onClick={(event) => event.stopPropagation()}>
      {open && <section className="whatsapp-card" aria-label="Connect with Texmaco on WhatsApp">
        <header>
          <div className="whatsapp-avatar"><MessageCircle /></div>
          <div><strong>Connect with us</strong><span><i /> Typically replies on WhatsApp</span></div>
          <button onClick={() => setOpen(false)} aria-label="Close chat"><X /></button>
        </header>
        <div className="whatsapp-body">
          <span className="chat-date">Texmaco Rail &amp; Engineering</span>
          <div className="agent-message"><strong>Hello! 👋</strong><p>Have a question about our capabilities? Leave your enquiry below and continue the conversation securely on WhatsApp.</p><time>Now</time></div>
        </div>
        <form onSubmit={continueOnWhatsApp}>
          <label htmlFor="whatsapp-query">Your enquiry</label>
          <textarea id="whatsapp-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type your question here…" rows="3" />
          <button type="submit" disabled={!query.trim()}><Send /> Continue on WhatsApp</button>
          <small>You’ll be redirected to WhatsApp to send this message.</small>
        </form>
      </section>}
      <button className="whatsapp-fab" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close WhatsApp enquiry' : 'Connect with us on WhatsApp'}>
        {open ? <X /> : <MessageCircle />}
        {!open && <span>Connect with us</span>}
      </button>
    </div>
  );
}

function FeaturedVideo({ video }) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  if ((!video?.url && !video?.embedUrl) || !video.active) return null;
  const requestVideoFullscreen = async () => {
    const nativeVideo = videoRef.current;
    if (!document.fullscreenEnabled && nativeVideo?.webkitEnterFullscreen) {
      try { nativeVideo.webkitEnterFullscreen(); return; }
      catch { /* Continue with the fullscreen overlay fallback. */ }
    }

    const modal = modalRef.current;
    const requestFullscreen = modal?.requestFullscreen || modal?.webkitRequestFullscreen;
    if (requestFullscreen && (document.fullscreenElement || document.webkitFullscreenElement) !== modal) {
      try { await requestFullscreen.call(modal); }
      catch { /* The viewport-filling overlay remains available as a fallback. */ }
    }
    if (screen.orientation?.lock) {
      try { await screen.orientation.lock('landscape'); }
      catch { /* iOS and some embedded browsers do not expose orientation lock. */ }
    }
  };
  const close = () => {
    videoRef.current?.pause();
    try { screen.orientation?.unlock?.(); } catch { /* Orientation may not be locked. */ }
    if ((document.fullscreenElement || document.webkitFullscreenElement) === modalRef.current) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      const exitResult = exitFullscreen?.call(document);
      exitResult?.catch?.(() => {});
    }
    setOpen(false);
  };
  const launch = (event) => {
    event.stopPropagation();
    flushSync(() => setOpen(true));
    void requestVideoFullscreen();
    window.setTimeout(() => {
      const playResult = videoRef.current?.play();
      playResult?.catch?.(() => {});
    }, 0);
  };

  return <>
    <button className="video-invite" onClick={launch}>
      <span className="video-invite-rings"><i /><i /><Play /></span>
      <span><small>Inside Texmaco</small><strong>Watch Texmaco Video</strong></span>
    </button>
    {open && <div ref={modalRef} className="video-modal" onClick={close} role="dialog" aria-modal="true" aria-label={video.title || 'Texmaco video'}>
      <section onClick={(event) => event.stopPropagation()}>
        <header><div><span>Featured film</span><h2>{video.title || 'Discover Texmaco'}</h2>{video.description && <p>{video.description}</p>}</div><div className="video-modal-actions"><button onClick={() => void requestVideoFullscreen()} aria-label="View video fullscreen"><Expand /></button><button onClick={close} aria-label="Close video"><X /></button></div></header>
        <div className="video-frame">{video.embedUrl
          ? <iframe src={video.embedUrl} title={video.title || 'Texmaco video'} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen />
          : <video ref={videoRef} src={video.url} controls autoPlay playsInline preload="metadata">Your browser does not support embedded video.</video>}
        </div>
      </section>
    </div>}
  </>;
}

function Brochure({ musicMuted, onToggleMusic, onStartMusic, onStopMusic }) {
  const [slides, setSlides] = useState(defaultSlides);
  const [segments, setSegments] = useState(defaultSegments);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [current, setCurrent] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(() => Boolean(sessionStorage.getItem('texmaco-brochure-access')));
  const [autoplay, setAutoplay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement || document.webkitFullscreenElement));
  const [chromeVisible, setChromeVisible] = useState(true);
  const touchStart = useRef(null);
  const wheelLock = useRef(false);
  const didSwipe = useRef(false);

  useEffect(() => {
    publicApi.brochure().then((data) => {
      if (data.slides?.length) {
        setSlides(data.slides);
        if (data.segments?.length) setSegments(data.segments.map((segment, index) => ({ ...segment, number: String(index + 1).padStart(2, '0') })));
      }
      setFeaturedVideo(data.featuredVideo || null);
    }).catch(() => { /* Keep the bundled preview when the API is unavailable. */ });
  }, []);

  useEffect(() => {
    const updateFullscreen = () => {
      const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(active);
      if (!active) { setChromeVisible(true); onStopMusic(); }
    };
    document.addEventListener('fullscreenchange', updateFullscreen);
    document.addEventListener('webkitfullscreenchange', updateFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      document.removeEventListener('webkitfullscreenchange', updateFullscreen);
    };
  }, [onStopMusic]);

  const navigate = useCallback((target) => {
    const next = Math.max(0, Math.min(slides.length - 1, target));
    if (next >= LOCKED_FROM && !unlocked) { setGateOpen(true); return; }
    setCurrent(next);
  }, [unlocked, slides.length]);

  useEffect(() => {
    const keydown = (event) => {
      if (gateOpen) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); navigate(current + 1); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); navigate(current - 1); }
      if (event.key.toLowerCase() === 'm') setSidebarOpen((value) => !value);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [current, gateOpen, navigate]);

  useEffect(() => {
    if (!autoplay || gateOpen) return undefined;
    const timer = window.setInterval(() => {
      if (current === slides.length - 1) setAutoplay(false); else navigate(current + 1);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoplay, current, gateOpen, navigate]);

  const onWheel = (event) => {
    if (wheelLock.current || gateOpen || Math.abs(event.deltaY) < 20) return;
    wheelLock.current = true;
    navigate(current + (event.deltaY > 0 ? 1 : -1));
    window.setTimeout(() => { wheelLock.current = false; }, 650);
  };
  const pointerDown = (event) => { touchStart.current = { x: event.clientX, y: event.clientY }; };
  const pointerUp = (event) => {
    if (!touchStart.current || gateOpen) return;
    const dx = event.clientX - touchStart.current.x;
    const dy = event.clientY - touchStart.current.y;
    didSwipe.current = Math.max(Math.abs(dx), Math.abs(dy)) > 45;
    if (didSwipe.current) navigate(current + ((dx < 0 || dy < 0) ? 1 : -1));
    touchStart.current = null;
  };

  const toggleChrome = (event) => {
    if (!isFullscreen || gateOpen) return;
    if (didSwipe.current) { didSwipe.current = false; return; }
    if (event.target.closest('button, a, input, select, textarea, label, aside')) return;
    setChromeVisible((value) => !value);
  };

  return (
    <main data-slide={current} className={`brochure ${isFullscreen && !chromeVisible ? 'brochure--chrome-hidden' : ''}`} onWheel={onWheel} onPointerDown={pointerDown} onPointerUp={pointerUp}>
      <Sidebar current={current} open={sidebarOpen} onToggle={() => setSidebarOpen((value) => !value)} onNavigate={navigate} unlocked={unlocked} slides={slides} segments={segments} />
      <section onClick={toggleChrome} className={`stage ${sidebarOpen && chromeVisible ? 'stage--rail-open' : ''} ${slides[current]?.image ? 'stage--document' : ''}`}>
        {slides.map((slide, index) => <Slide key={slide._id || slide.id} slide={slide} index={index} active={current === index} />)}
        <header className="stage-header">
          {!sidebarOpen && <button className="icon-button floating-menu" onClick={() => setSidebarOpen(true)} aria-label="Show chapters"><Menu /></button>}
          <span className="chapter-name">{segments.find((item) => item.id === slides[current].segment)?.label}</span>
          <div className="header-actions">
            <button className="quiet-button" onClick={() => setAutoplay((value) => !value)}>{autoplay ? <Pause size={15} /> : <Play size={15} />}{autoplay ? 'Pause' : 'Autoplay'}</button>
            <button className="quiet-button music-button" onClick={onToggleMusic} aria-label={musicMuted ? 'Unmute background music' : 'Mute background music'}>{musicMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}<span>{musicMuted ? 'Unmute' : 'Mute'}</span></button>
            <button className="news-button" onClick={() => window.location.assign('/news')}><span><i /></span><Newspaper /><b>Recent news</b></button>
            <button
              className="icon-button"
              onClick={() => {
                if (isFullscreen) void exitImmersiveFullscreen();
                else { void enterImmersiveFullscreen(); onStartMusic(); }
              }}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen landscape'}
            >
              {isFullscreen ? <Minimize /> : <Expand />}
            </button>
          </div>
        </header>
        <footer className="stage-footer">
          <button className="round-arrow" onClick={() => navigate(current - 1)} disabled={current === 0} aria-label="Previous slide"><ArrowLeft /></button>
          <div className="progress-wrap">
            <span>{String(current + 1).padStart(2, '0')}</span>
            <div className="progress-track"><i style={{ width: `${((current + 1) / slides.length) * 100}%` }} /></div>
            <span>{String(slides.length).padStart(2, '0')}</span>
          </div>
          <button className="round-arrow next" onClick={() => navigate(current + 1)} disabled={current === slides.length - 1} aria-label="Next slide"><ArrowRight /></button>
        </footer>
        <div className="swipe-hint"><ArrowLeft size={14} /> swipe to explore <ArrowRight size={14} /></div>
        <FeaturedVideo video={featuredVideo} />
        <WhatsAppChat slide={slides[current]} segmentLabel={segments.find((item) => item.id === slides[current].segment)?.label} />
        {isFullscreen && <div className="rotate-device-hint"><RotateCcw /><strong>Rotate your phone</strong><span>Landscape gives you the complete brochure view.</span></div>}
      </section>
      {gateOpen && <AccessGate onClose={() => setGateOpen(false)} onSuccess={() => { setUnlocked(true); setGateOpen(false); setCurrent(LOCKED_FROM); }} />}
    </main>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [musicMuted, setMusicMuted] = useState(() => sessionStorage.getItem('texmaco-music-muted') === 'true');
  const musicRef = useRef(null);
  const startMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.volume = .28;
    audio.muted = musicMuted;
    const playResult = audio.play();
    playResult?.catch?.(() => { /* The next direct tap can retry playback. */ });
  }, [musicMuted]);
  const stopMusic = useCallback(() => { musicRef.current?.pause(); }, []);
  const toggleMusic = useCallback(() => {
    setMusicMuted((value) => {
      const next = !value;
      sessionStorage.setItem('texmaco-music-muted', String(next));
      if (musicRef.current) {
        musicRef.current.muted = next;
        if (!next && (document.fullscreenElement || document.webkitFullscreenElement)) {
          const playResult = musicRef.current.play();
          playResult?.catch?.(() => {});
        }
      }
      return next;
    });
  }, []);

  return <>
    <audio ref={musicRef} src="/assets/texmaco-background-music.mp3" loop preload="auto" muted={musicMuted} />
    {entered
      ? <Brochure musicMuted={musicMuted} onToggleMusic={toggleMusic} onStartMusic={startMusic} onStopMusic={stopMusic} />
      : <Welcome onEnter={() => setEntered(true)} onStartMusic={startMusic} />}
  </>;
}
