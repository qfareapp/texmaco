import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronLeft, ChevronRight, Clapperboard, Cloud,
  Eye, EyeOff, FileImage, GripVertical, ImagePlus, LayoutDashboard, LoaderCircle, LogOut,
  Link2, Menu, Newspaper, Pencil, Play, Plus, RefreshCw, Search, Tags, Trash2, Upload, Users, X,
} from 'lucide-react';
import { createAdminApi, loginAdmin } from './api';
import './admin.css';

function AdminLogo() {
  return <div className="admin-logo"><img src="/assets/texmaco-logo.png" alt="Texmaco Rail & Engineering Ltd." /></div>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await loginAdmin(email, password); onLogin(data.token); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <main className="admin-login">
      <div className="login-visual"><div className="login-lines" /><div className="login-engine"><span /><span /><i /></div><div className="login-statement"><span>Content management</span><h1>Shape the<br />journey.</h1><p>Manage every chapter of the Texmaco digital experience.</p></div></div>
      <div className="login-form-wrap">
        <AdminLogo />
        <form onSubmit={submit} className="admin-login-form">
          <div><span>Secure access</span><h2>Welcome back</h2><p>Sign in to manage your digital brochure.</p></div>
          <label><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@texmaco.in" required /></label>
          <label><span>Password</span><div className="password-field"><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button></div></label>
          {error && <p className="admin-error">{error}</p>}
          <button className="admin-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Sign in to studio'}</button>
        </form>
        <small className="login-footer">Protected administration · Texmaco Rail &amp; Engineering</small>
      </div>
    </main>
  );
}

function Sidebar({ page, setPage, onLogout, collapsed, setCollapsed }) {
  const links = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'slides', label: 'Brochure slides', icon: FileImage },
    { id: 'segments', label: 'Navigation tabs', icon: Tags },
    { id: 'video', label: 'Featured video', icon: Clapperboard },
    { id: 'news', label: 'Recent news', icon: Newspaper },
    { id: 'leads', label: 'Visitor leads', icon: Users },
  ];
  return <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="admin-sidebar-head"><AdminLogo /><button onClick={() => setCollapsed(!collapsed)}>{collapsed ? <Menu /> : <ChevronLeft />}</button></div>
    <span className="workspace-label">{collapsed ? '—' : 'Workspace'}</span>
    <nav>{links.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)} title={label}><Icon /><span>{label}</span></button>)}</nav>
    <div className="admin-user"><div>TA</div><span><strong>Texmaco Admin</strong><small>Content manager</small></span><button onClick={onLogout} title="Sign out"><LogOut /></button></div>
  </aside>;
}

function Header({ title, subtitle, onRefresh, refreshing }) {
  return <header className="admin-header"><div><span>Brochure studio</span><h1>{title}</h1><p>{subtitle}</p></div><div className="admin-header-actions"><a href="/" target="_blank">View live brochure <ChevronRight /></a><button onClick={onRefresh} title="Refresh"><RefreshCw className={refreshing ? 'spin' : ''} /></button></div></header>;
}

function Overview({ stats, setPage }) {
  const cards = [
    { value: stats.slides ?? '—', label: 'Brochure slides', detail: 'Published and draft', icon: FileImage, color: 'orange', page: 'slides' },
    { value: stats.segments ?? '—', label: 'Navigation tabs', detail: 'Active chapters', icon: Tags, color: 'blue', page: 'segments' },
    { value: stats.news ?? '—', label: 'News articles', detail: 'Published and draft', icon: Newspaper, color: 'orange', page: 'news' },
    { value: stats.verifiedLeads ?? '—', label: 'Verified visitors', detail: `${stats.totalLeads || 0} total enquiries`, icon: Users, color: 'green', page: 'leads' },
  ];
  return <div className="overview-page">
    <section className="stat-grid">{cards.map(({ icon: Icon, ...card }) => <button key={card.label} onClick={() => setPage(card.page)} className={`stat-card ${card.color}`}><div><Icon /></div><span>{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small><ChevronRight className="stat-arrow" /></button>)}</section>
    <section className="getting-started"><div className="start-copy"><span>Quick start</span><h2>Bring your brochure to life</h2><p>Upload each brochure image in sequence, assign it to a navigation tab, and publish when ready.</p><button onClick={() => setPage('slides')}><ImagePlus /> Add your first slide</button></div><div className="step-list"><div><span>01</span><p><strong>Set up navigation</strong>Rename the tabs visitors use to jump between sections.</p></div><div><span>02</span><p><strong>Upload slide images</strong>Add each high-resolution image individually to Cloudinary.</p></div><div><span>03</span><p><strong>Review new visitors</strong>See everyone who completes email verification.</p></div></div></section>
  </div>;
}

const blankSlide = { title: '', eyebrow: '', segment: '', copy: '', stat: '', statLabel: '', active: true, imageFile: null };

function SlideEditor({ slide, segments, onClose, onSaved, onManageTabs, api }) {
  const [form, setForm] = useState(slide ? { ...slide, imageFile: null } : { ...blankSlide, segment: segments[0]?.slug || '' });
  const [preview, setPreview] = useState(slide?.image || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const change = (e) => setForm((value) => ({ ...value, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const chooseImage = (e) => { const file = e.target.files[0]; if (!file) return; setForm((v) => ({ ...v, imageFile: file })); setPreview(URL.createObjectURL(file)); };
  const submit = async (e) => {
    e.preventDefault(); if (!slide && !form.imageFile) { setError('Please choose an image.'); return; }
    setBusy(true); setError('');
    const body = new FormData();
    ['title','eyebrow','segment','copy','stat','statLabel'].forEach((key) => body.append(key, form[key] || ''));
    body.append('active', String(form.active)); if (form.imageFile) body.append('image', form.imageFile);
    try { if (slide) await api.updateSlide(slide._id, body); else await api.createSlide(body); onSaved(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="admin-modal"><div className="editor-panel"><div className="editor-head"><div><span>{slide ? 'Edit slide' : 'New slide'}</span><h2>{slide ? 'Update brochure content' : 'Add a brochure image'}</h2></div><button onClick={onClose}><X /></button></div><form onSubmit={submit}>
    <label className={`image-drop ${preview ? 'has-image' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={chooseImage} /><div>{preview ? <img src={preview} alt="Slide preview" /> : <><Upload /><strong>Choose a brochure image</strong><span>JPG, PNG, WebP or AVIF · Max 15 MB</span></>}</div>{preview && <span className="replace-label"><Pencil /> Replace image</span>}</label>
    <div className="editor-fields"><label><span>Slide title *</span><input name="title" value={form.title} onChange={change} required placeholder="Built to move nations." /></label><label className="segment-select-field"><span>Navigation tab *</span><select name="segment" value={form.segment} onChange={change} required>{segments.map((s) => <option key={s._id} value={s.slug}>{s.label}</option>)}</select><button type="button" className="manage-tabs-link" onClick={onManageTabs}><Tags /> Add, rename or remove tabs</button></label><label><span>Small heading</span><input name="eyebrow" value={form.eyebrow} onChange={change} placeholder="Texmaco Rail & Engineering" /></label><label><span>Highlight</span><input name="stat" value={form.stat} onChange={change} placeholder="70+" /></label><label className="wide"><span>Description</span><textarea name="copy" value={form.copy} onChange={change} rows="3" placeholder="Supporting brochure copy..." /></label><label><span>Highlight caption</span><input name="statLabel" value={form.statLabel} onChange={change} placeholder="years of excellence" /></label><label className="publish-toggle"><input type="checkbox" name="active" checked={form.active} onChange={change} /><i /><span><strong>Published</strong>Visible in the live brochure</span></label></div>
    {error && <p className="admin-error">{error}</p>}<div className="editor-actions"><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <><Cloud /> {slide ? 'Save changes' : 'Upload slide'}</>}</button></div>
  </form></div></div>;
}

function SlidesPage({ slides, segments, reload, api, onManageTabs }) {
  const [editing, setEditing] = useState(undefined);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [orderedSlides, setOrderedSlides] = useState(slides);
  const [draggedId, setDraggedId] = useState('');
  const [dragOverId, setDragOverId] = useState('');
  const [orderMessage, setOrderMessage] = useState('');

  useEffect(() => setOrderedSlides(slides), [slides]);

  const saveOrder = async (nextSlides, previousSlides) => {
    setOrderedSlides(nextSlides);
    setBusy(true);
    setOrderMessage('Saving slide order…');
    try {
      await api.reorderSlides(nextSlides.map((slide) => slide._id));
      setOrderMessage('Slide order saved.');
      await reload();
    } catch (error) {
      setOrderedSlides(previousSlides);
      setOrderMessage(error.message);
    } finally {
      setBusy(false);
      window.setTimeout(() => setOrderMessage(''), 2400);
    }
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= orderedSlides.length || busy) return;
    const previous = [...orderedSlides];
    const reordered = [...orderedSlides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    void saveOrder(reordered, previous);
  };

  const dropSlide = (targetId) => {
    if (!draggedId || draggedId === targetId || busy) {
      setDraggedId(''); setDragOverId(''); return;
    }
    const previous = [...orderedSlides];
    const reordered = [...orderedSlides];
    const fromIndex = reordered.findIndex((slide) => slide._id === draggedId);
    const targetIndex = reordered.findIndex((slide) => slide._id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const [movedSlide] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, movedSlide);
    setDraggedId(''); setDragOverId('');
    void saveOrder(reordered, previous);
  };

  const remove = async () => { setBusy(true); try { await api.deleteSlide(confirm._id); setConfirm(null); await reload(); } finally { setBusy(false); } };
  return <div className="slides-page"><div className="page-tools"><div><strong>{orderedSlides.length} slides</strong><span>Drag the handle or use the arrows to change slide order</span></div><button className="admin-primary" onClick={() => setEditing(null)}><Plus /> Add slide</button></div>
    {orderMessage && <div className={`slide-order-message ${orderMessage.includes('saved') ? 'success' : ''}`}>{orderMessage}</div>}
    {!orderedSlides.length ? <div className="empty-state"><div><ImagePlus /></div><h2>No slides uploaded yet</h2><p>Add the first image from your Texmaco brochure. It will be securely stored in Cloudinary.</p><button className="admin-primary" onClick={() => setEditing(null)}><Plus /> Add first slide</button></div> : <div className={`slide-admin-list ${busy ? 'is-saving' : ''}`}>{orderedSlides.map((slide,index)=><article
      key={slide._id}
      className={`${draggedId === slide._id ? 'dragging' : ''} ${dragOverId === slide._id ? 'drag-over' : ''}`}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (draggedId !== slide._id) setDragOverId(slide._id); }}
      onDrop={(event) => { event.preventDefault(); dropSlide(slide._id); }}
    ><div className="order-buttons"><div
      className="drag-handle"
      draggable={!busy}
      title="Drag to reorder"
      onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', slide._id); setDraggedId(slide._id); }}
      onDragEnd={() => { setDraggedId(''); setDragOverId(''); }}
    ><GripVertical /></div><button onClick={()=>move(index,-1)} disabled={!index||busy} title="Move slide up"><ArrowUp /></button><span>{String(index+1).padStart(2,'0')}</span><button onClick={()=>move(index,1)} disabled={index===orderedSlides.length-1||busy} title="Move slide down"><ArrowDown /></button></div><img src={slide.image} alt="" /><div className="slide-row-copy"><span>{segments.find((s)=>s.slug===slide.segment)?.label||slide.segment}</span><h3>{slide.title}</h3><p>{slide.copy||'No description added.'}</p></div><div className={`status-pill ${slide.active?'live':'draft'}`}><i />{slide.active?'Live':'Hidden'}</div><div className="row-actions"><button onClick={()=>setEditing(slide)} title="Edit"><Pencil /></button><button className="delete" onClick={()=>setConfirm(slide)} title="Delete"><Trash2 /></button></div></article>)}</div>}
    {editing !== undefined && <SlideEditor slide={editing} segments={segments} api={api} onManageTabs={() => { setEditing(undefined); onManageTabs(); }} onClose={()=>setEditing(undefined)} onSaved={async()=>{setEditing(undefined);await reload();}} />}
    {confirm && <div className="confirm-backdrop"><div className="confirm-box"><div><Trash2 /></div><h3>Delete this slide?</h3><p>The image “{confirm.title}” will also be removed from Cloudinary. This cannot be undone.</p><footer><button onClick={()=>setConfirm(null)}>Cancel</button><button onClick={remove} disabled={busy}>Delete permanently</button></footer></div></div>}
  </div>;
}

function SegmentsPage({ segments, reload, api }) {
  const [values,setValues]=useState({}); const [newLabel,setNewLabel]=useState(''); const [busy,setBusy]=useState(''); const [message,setMessage]=useState('');
  useEffect(()=>setValues(Object.fromEntries(segments.map((s)=>[s._id,s.label]))),[segments]);
  const save=async(segment)=>{setBusy(segment._id);setMessage('');try{await api.updateSegment(segment._id,values[segment._id]);setMessage('Navigation tab updated.');await reload();}catch(e){setMessage(e.message)}finally{setBusy('')}};
  const add=async(e)=>{e.preventDefault();if(!newLabel)return;setBusy('new');try{await api.createSegment({label:newLabel});setNewLabel('');await reload();}catch(err){setMessage(err.message)}finally{setBusy('')}};
  const remove=async(segment)=>{if(!window.confirm(`Remove the “${segment.label}” navigation tab?`))return;setBusy(segment._id);setMessage('');try{await api.deleteSegment(segment._id);setMessage('Navigation tab removed.');await reload();}catch(err){setMessage(err.message)}finally{setBusy('')}};
  return <div className="segments-page"><div className="segment-explainer"><Tags /><div><h2>Navigation tabs</h2><p>These labels appear in the collapsible left navigation of the public brochure. Add, rename or remove tabs here. A tab assigned to a slide must be reassigned before it can be removed.</p></div></div><div className="segment-list"><div className="segment-list-head"><span>Order</span><span>Tab name</span><span>Identifier</span><span>Actions</span></div>{segments.map((segment,index)=><div className="segment-row" key={segment._id}><strong>{String(index+1).padStart(2,'0')}</strong><input value={values[segment._id]??''} onChange={(e)=>setValues({...values,[segment._id]:e.target.value})}/><code>{segment.slug}</code><div className="segment-actions"><button disabled={busy===segment._id||values[segment._id]===segment.label} onClick={()=>save(segment)}>{busy===segment._id?<LoaderCircle className="spin"/>:<Check/>} Save</button><button className="remove-segment" disabled={busy===segment._id} onClick={()=>remove(segment)} title={`Remove ${segment.label}`}><Trash2/></button></div></div>)}</div><form className="add-segment" onSubmit={add}><div><strong>Add another navigation tab</strong><span>Create a new section for future slides.</span></div><input value={newLabel} onChange={(e)=>setNewLabel(e.target.value)} placeholder="e.g. Innovation"/><button disabled={busy==='new'||!newLabel}><Plus/>Add tab</button></form>{message&&<div className="toast-message">{message}</div>}</div>;
}

function VideoPage({ video, reload, api }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(video?.url || '');
  const [mode, setMode] = useState(video?.sourceType === 'youtube' || video?.sourceType === 'drive' ? 'link' : 'upload');
  const [externalUrl, setExternalUrl] = useState(video?.externalUrl || '');
  const [title, setTitle] = useState(video?.title || 'Discover Texmaco');
  const [description, setDescription] = useState(video?.description || '');
  const [active, setActive] = useState(video?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

  useEffect(() => {
    setPreview(video?.url || ''); setTitle(video?.title || 'Discover Texmaco');
    setDescription(video?.description || ''); setActive(video?.active ?? true);
    setExternalUrl(video?.externalUrl || '');
    setMode(video?.sourceType === 'youtube' || video?.sourceType === 'drive' ? 'link' : 'upload');
  }, [video]);

  const selectVideo = (event) => {
    const selected = event.target.files[0];
    if (!selected) return;
    setFile(selected); setPreview(URL.createObjectURL(selected)); setMessage('');
  };
  const upload = async (event) => {
    event.preventDefault();
    if (!file) { setMessage('Choose an MP4, WebM or MOV file first.'); return; }
    const body = new FormData(); body.append('video', file); body.append('title', title);
    body.append('description', description); body.append('active', String(active));
    setBusy(true); setUploadProgress(0); setUploadStage('uploading'); setMessage('Keep this window open until the upload finishes.');
    try {
      await api.uploadVideo(body, (percent) => { setUploadProgress(percent); if (percent >= 100) setUploadStage('cloudinary'); });
      setFile(null); setUploadProgress(100); setMessage('Featured video uploaded successfully.'); await reload();
    }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); setUploadStage(''); }
  };
  const saveLink = async (event) => {
    event.preventDefault();
    if (!externalUrl.trim()) { setMessage('Paste a YouTube or Google Drive video link first.'); return; }
    setBusy(true); setMessage('');
    try {
      await api.updateVideo({ title, description, active, externalUrl: externalUrl.trim() });
      setFile(null); setPreview(''); setMessage('External video link saved successfully.'); await reload();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const saveDetails = async () => {
    setBusy(true); setMessage('');
    try { await api.updateVideo({ title, description, active }); setMessage('Video settings updated.'); await reload(); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Remove the featured video from the brochure?')) return;
    setBusy(true); setMessage('');
    try { await api.deleteVideo(); setFile(null); setPreview(''); setMessage('Featured video removed.'); await reload(); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };

  const hasVideo = Boolean(video?.url || video?.embedUrl);
  const savedLinkPreview = Boolean(video?.embedUrl && externalUrl === video.externalUrl);

  return <div className="video-admin-page">
    <section className="video-admin-intro"><div><span><Clapperboard /> Featured media</span><h2>Give visitors the full Texmaco story.</h2><p>Upload a video to Cloudinary or connect one from YouTube or Google Drive. The brochure launches it in an immersive fullscreen player.</p></div><div className="video-spec"><strong>Two options</strong><span>Cloudinary · Up to 400 MB</span><span>YouTube or public Google Drive link</span></div></section>
    <div className="video-source-tabs"><button className={mode === 'upload' ? 'active' : ''} onClick={() => { setMode('upload'); setMessage(''); }}><Cloud /> Upload video</button><button className={mode === 'link' ? 'active' : ''} onClick={() => { setMode('link'); setMessage(''); }}><Link2 /> Add video link</button></div>
    <form className="video-admin-card" onSubmit={mode === 'upload' ? upload : saveLink}>
      <div className="video-preview">
        {mode === 'upload' ? <>
          {preview ? <video src={preview} controls preload="metadata" /> : <label><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={selectVideo} /><span><Upload /><strong>Choose your Texmaco video</strong><small>MP4, WebM or MOV · Up to 400 MB</small></span></label>}
          {preview && <label className="replace-video"><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={selectVideo} /><Pencil /> Choose another video</label>}
        </> : savedLinkPreview ? <iframe src={video.embedUrl.replace('autoplay=1', 'autoplay=0')} title="External video preview" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <div className="video-link-placeholder"><Link2 /><strong>Connect an external video</strong><span>Paste a YouTube link or a Google Drive sharing link.</span><small>For Drive, set access to “Anyone with the link”.</small></div>}
      </div>
      <div className="video-fields">
        {mode === 'link' && <label><span>YouTube or Google Drive link</span><input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://youtu.be/... or https://drive.google.com/file/d/..." required /></label>}
        <label><span>Video title</span><input value={title} onChange={(e)=>setTitle(e.target.value)} maxLength="120" placeholder="Discover Texmaco" /></label>
        <label><span>Short description</span><textarea value={description} onChange={(e)=>setDescription(e.target.value)} maxLength="240" rows="3" placeholder="Engineering a stronger tomorrow." /></label>
        <label className="publish-toggle"><input type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)} /><i /><span><strong>Show on brochure</strong>Display the animated video button</span></label>
        {uploadStage && <div className={`video-upload-progress ${uploadStage === 'cloudinary' ? 'processing' : ''}`}><div><span>{uploadStage === 'cloudinary' ? 'Processing in Cloudinary' : 'Uploading video'}</span><strong>{uploadStage === 'cloudinary' ? 'Please wait…' : `${uploadProgress}%`}</strong></div><div className="video-progress-track"><i style={{ width: `${uploadProgress}%` }} /></div><small>{uploadStage === 'cloudinary' ? 'Cloudinary is receiving and preparing the video. Large files can take several minutes.' : 'Transferring the selected file to the secure upload server.'}</small></div>}
        {message && <p className="video-message">{message}</p>}
        <div className="video-actions">{hasVideo && <button type="button" className="remove-video" onClick={remove} disabled={busy}><Trash2 /> Remove</button>}<button type="button" onClick={saveDetails} disabled={busy || !hasVideo}>Save details</button><button className="admin-primary" disabled={busy || (mode === 'upload' ? !file : !externalUrl.trim())}>{busy ? <LoaderCircle className="spin" /> : mode === 'upload' ? <><Cloud /> {video?.url ? 'Replace video' : 'Upload video'}</> : <><Link2 /> Save video link</>}</button></div>
      </div>
    </form>
  </div>;
}

const blankNews = {
  headline: '', gist: '', sourceName: '', sourceUrl: '',
  publishedAt: new Date().toISOString().slice(0, 10), active: true, imageFile: null,
};

function NewsEditor({ article, api, onClose, onSaved }) {
  const initial = article
    ? { ...article, publishedAt: new Date(article.publishedAt).toISOString().slice(0, 10), imageFile: null }
    : blankNews;
  const [form, setForm] = useState(initial);
  const [preview, setPreview] = useState(article?.image || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = (event) => setForm((value) => ({
    ...value,
    [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
  }));
  const chooseImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setForm((value) => ({ ...value, imageFile: file }));
    setPreview(URL.createObjectURL(file));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!article && !form.imageFile) { setError('Please choose an article image.'); return; }
    setBusy(true); setError('');
    const body = new FormData();
    ['headline', 'gist', 'sourceName', 'sourceUrl', 'publishedAt'].forEach((key) => body.append(key, form[key] || ''));
    body.append('active', String(form.active));
    if (form.imageFile) body.append('image', form.imageFile);
    try {
      if (article) await api.updateNews(article._id, body);
      else await api.createNews(body);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return <div className="admin-modal"><div className="editor-panel"><div className="editor-head"><div><span>{article ? 'Edit story' : 'New story'}</span><h2>{article ? 'Update news article' : 'Publish a news article'}</h2></div><button onClick={onClose}><X /></button></div><form onSubmit={submit}>
    <label className={`image-drop ${preview ? 'has-image' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={chooseImage} /><div>{preview ? <img src={preview} alt="Article preview" /> : <><Upload /><strong>Choose the article image</strong><span>JPG, PNG, WebP or AVIF · Max 15 MB</span></>}</div>{preview && <span className="replace-label"><Pencil /> Replace image</span>}</label>
    <div className="editor-fields">
      <label className="wide"><span>Headline *</span><input name="headline" value={form.headline} onChange={change} maxLength="240" required placeholder="Enter the published headline" /></label>
      <label><span>Publication/source *</span><input name="sourceName" value={form.sourceName} onChange={change} maxLength="120" required placeholder="e.g. The Economic Times" /></label>
      <label><span>Published date *</span><input name="publishedAt" type="date" value={form.publishedAt} onChange={change} required /></label>
      <label className="wide"><span>Original article link *</span><input name="sourceUrl" type="url" value={form.sourceUrl} onChange={change} required placeholder="https://publication.com/article" /></label>
      <label className="wide"><span>Short gist *</span><textarea name="gist" value={form.gist} onChange={change} maxLength="700" rows="5" required placeholder="Summarise the article in a few concise sentences." /></label>
      <label className="publish-toggle"><input type="checkbox" name="active" checked={form.active} onChange={change} /><i /><span><strong>Published</strong>Visible in the public newsroom</span></label>
    </div>
    {error && <p className="admin-error">{error}</p>}
    <div className="editor-actions"><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <><Cloud /> {article ? 'Save article' : 'Publish article'}</>}</button></div>
  </form></div></div>;
}

function NewsAdminPage({ articles, reload, api }) {
  const [editing, setEditing] = useState(undefined);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try { await api.deleteNews(confirm._id); setConfirm(null); await reload(); }
    finally { setBusy(false); }
  };

  return <div className="news-admin-page">
    <div className="page-tools"><div><strong>{articles.length} news article{articles.length === 1 ? '' : 's'}</strong><span>Manage newsroom stories and their original sources</span></div><div className="news-admin-tools"><a href="/news" target="_blank" rel="noreferrer">View newsroom <ChevronRight /></a><button className="admin-primary" onClick={() => setEditing(null)}><Plus /> Add article</button></div></div>
    {!articles.length ? <div className="empty-state"><div><Newspaper /></div><h2>No news articles yet</h2><p>Add recent Texmaco coverage with an image, short gist and link to the original publication.</p><button className="admin-primary" onClick={() => setEditing(null)}><Plus /> Add first article</button></div>
      : <div className="news-admin-list">{articles.map((article) => <article key={article._id}>
        <img src={article.image} alt="" />
        <div className="news-admin-copy"><div><span>{article.sourceName}</span><time>{new Date(article.publishedAt).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</time></div><h3>{article.headline}</h3><p>{article.gist}</p><a href={article.sourceUrl} target="_blank" rel="noreferrer">Open original source <ChevronRight /></a></div>
        <div className={`status-pill ${article.active ? 'live' : 'draft'}`}><i />{article.active ? 'Live' : 'Hidden'}</div>
        <div className="row-actions"><button onClick={() => setEditing(article)} title="Edit"><Pencil /></button><button className="delete" onClick={() => setConfirm(article)} title="Delete"><Trash2 /></button></div>
      </article>)}</div>}
    {editing !== undefined && <NewsEditor article={editing} api={api} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); await reload(); }} />}
    {confirm && <div className="confirm-backdrop"><div className="confirm-box"><div><Trash2 /></div><h3>Delete this article?</h3><p>The story “{confirm.headline}” and its image will be removed from the newsroom and Cloudinary.</p><footer><button onClick={() => setConfirm(null)}>Cancel</button><button onClick={remove} disabled={busy}>Delete permanently</button></footer></div></div>}
  </div>;
}

function LeadsPage({ api }) {
  const [data,setData]=useState({items:[],total:0,page:1,pages:1});const[search,setSearch]=useState('');const[query,setQuery]=useState('');const[busy,setBusy]=useState(true);
  const load=useCallback(async(page=1)=>{setBusy(true);try{setData(await api.leads(query,page));}finally{setBusy(false)}},[api,query]);
  useEffect(()=>{load();},[load]);
  return <div className="leads-page"><div className="leads-tools"><div className="search-box"><Search/><input value={search} onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter')setQuery(search)}} placeholder="Search name, company, email or domain"/><button onClick={()=>setQuery(search)}>Search</button></div><span>{data.total} verified visitor{data.total===1?'':'s'}</span></div><div className="lead-table"><div className="lead-table-head"><span>Visitor</span><span>Company</span><span>Area of interest</span><span>Phone</span><span>Verified</span></div>{busy?<div className="table-loading"><LoaderCircle className="spin"/>Loading visitors…</div>:!data.items.length?<div className="table-empty"><Users/><strong>No verified visitors yet</strong><span>Visitors appear here after completing email verification.</span></div>:data.items.map((lead)=><div className="lead-row" key={lead._id}><div><i>{lead.name.slice(0,2).toUpperCase()}</i><span><strong>{lead.name}</strong><a href={`mailto:${lead.email}`}>{lead.email}</a></span></div><span>{lead.company}</span><span>{lead.domain}</span><a href={`tel:${lead.phone}`}>{lead.phone}</a><time>{new Date(lead.verifiedAt).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</time></div>)}</div>{data.pages>1&&<div className="pagination"><button disabled={data.page<=1} onClick={()=>load(data.page-1)}><ChevronLeft/></button><span>Page {data.page} of {data.pages}</span><button disabled={data.page>=data.pages} onClick={()=>load(data.page+1)}><ChevronRight/></button></div>}</div>;
}

function Dashboard({ token, onLogout }) {
  const api = useMemo(() => createAdminApi(token), [token]);
  const [page, setPage] = useState('overview');
  const [stats, setStats] = useState({});
  const [slides, setSlides] = useState([]);
  const [segments, setSegments] = useState([]);
  const [video, setVideo] = useState(null);
  const [news, setNews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [slideData, segmentData, dashboardData, videoData, newsData] = await Promise.all([
        api.slides(), api.segments(), api.dashboard(), api.video(), api.news(),
      ]);
      setSlides(slideData); setSegments(segmentData); setStats(dashboardData); setVideo(videoData); setNews(newsData);
    } catch (error) { if (error.status === 401) onLogout(); }
    finally { setRefreshing(false); }
  }, [api, onLogout]);
  useEffect(() => { load(); }, [load]);
  const pages = {
    overview: ['Studio overview', 'Everything you need to manage the brochure experience.'],
    slides: ['Brochure slides', 'Upload, arrange and publish your brochure images.'],
    segments: ['Navigation tabs', 'Control the chapter names shown to every visitor.'],
    video: ['Featured video', 'Upload and control the corporate video invitation.'],
    news: ['Recent news', 'Publish coverage and connect visitors to the original news source.'],
    leads: ['Visitor leads', 'Verified people who unlocked the complete brochure.'],
  };
  return <main className="admin-shell"><Sidebar page={page} setPage={setPage} onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed}/><section className={`admin-main ${collapsed ? 'wide' : ''}`}><Header title={pages[page][0]} subtitle={pages[page][1]} onRefresh={load} refreshing={refreshing}/><div className="admin-content">
    {page === 'overview' && <Overview stats={stats} setPage={setPage} />}
    {page === 'slides' && <SlidesPage slides={slides} segments={segments} reload={load} api={api} onManageTabs={() => setPage('segments')} />}
    {page === 'segments' && <SegmentsPage segments={segments} reload={load} api={api} />}
    {page === 'video' && <VideoPage video={video} reload={load} api={api} />}
    {page === 'news' && <NewsAdminPage articles={news} reload={load} api={api} />}
    {page === 'leads' && <LeadsPage api={api} />}
  </div></section></main>;
}

export default function AdminApp(){const[token,setToken]=useState(()=>sessionStorage.getItem('texmaco-admin-token'));const logout=useCallback(()=>{sessionStorage.removeItem('texmaco-admin-token');setToken('')},[]);if(!token)return <Login onLogin={(value)=>{sessionStorage.setItem('texmaco-admin-token',value);setToken(value)}}/>;return <Dashboard token={token} onLogout={logout}/>}
